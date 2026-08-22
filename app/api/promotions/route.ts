import { NextRequest, NextResponse } from 'next/server';
import { fetchPromotions, PromotionSnapshot } from '@/lib/promotions';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getRole, requireUser } from '@/lib/auth';
import { audit, guard } from '@/lib/api';

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    const blocked = await guard(req, 'promotions', 6); if (blocked) return blocked;
    const user = await requireUser(req); if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const role = await getRole(user.id);
    const force = req.nextUrl.searchParams.get('force') === 'true';
    const CACHE_KEY = '__GLOBAL_PROMOS_V3__';
    
    // Check cache
    if (!force) {
      const { data: cached } = await supabaseAdmin
        .from('price_cache')
        .select('results, updated_at')
        .eq('query', CACHE_KEY)
        .single();

      if (cached) {
        const ageHours = (new Date().getTime() - new Date(cached.updated_at).getTime()) / (1000 * 60 * 60);
        const snapshot = cached.results as PromotionSnapshot;
        // An empty scan is short-lived: it should never hide a newly announced offer all day.
        const ttlHours = Array.isArray(snapshot?.promos) && snapshot.promos.length > 0 ? 8 : 0.5;
        const privileged = role === 'plus' || role === 'admin';
        const forceCooldownHours = 2;
        if ((!force && ageHours < ttlHours) || (force && (!privileged || ageHours < forceCooldownHours))) {
          return NextResponse.json({ ...snapshot, cached: true, canRefresh: privileged, refreshAfter: new Date(new Date(cached.updated_at).getTime() + forceCooldownHours * 3600000).toISOString() });
        }
      }
    }

    // Fetch live
    const snapshot = await fetchPromotions();

    // Save to cache
    await supabaseAdmin.from('price_cache').upsert({ query: CACHE_KEY, results: snapshot, updated_at: new Date().toISOString() }, { onConflict: 'query' });
    await audit(user.id, 'promotions.refresh', req, { role, forced: force, sourceCount: snapshot.sourceCount, promoCount: snapshot.promos.length });
    return NextResponse.json({ ...snapshot, cached: false, canRefresh: role === 'plus' || role === 'admin' });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
