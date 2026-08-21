import { NextRequest, NextResponse } from 'next/server';
import { fetchPromotions } from '@/lib/promotions';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireUser } from '@/lib/auth';
import { guard } from '@/lib/api';

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    const blocked = await guard(req, 'promotions', 6); if (blocked) return blocked;
    const user = await requireUser(req); if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const force = req.nextUrl.searchParams.get('force') === 'true';
    const CACHE_KEY = '__GLOBAL_PROMOS__';
    
    // Check cache
    if (!force) {
      const { data: cached } = await supabaseAdmin
        .from('price_cache')
        .select('results, updated_at')
        .eq('query', CACHE_KEY)
        .single();

      if (cached) {
        const ageHours = (new Date().getTime() - new Date(cached.updated_at).getTime()) / (1000 * 60 * 60);
        if (ageHours < 12) { // 12 hour cache
          return NextResponse.json({ promos: cached.results });
        }
      }
    }

    // Fetch live
    const promos = await fetchPromotions();

    // Save to cache
    await supabaseAdmin.from('price_cache').upsert({ query: CACHE_KEY, results: promos, updated_at: new Date().toISOString() }, { onConflict: 'query' });

    return NextResponse.json({ promos });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
