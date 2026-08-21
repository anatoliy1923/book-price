import { NextRequest, NextResponse } from 'next/server';
import { fetchPromotions } from '@/lib/promotions';
import { supabase } from '@/lib/supabase';

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    const force = req.nextUrl.searchParams.get('force') === 'true';
    const CACHE_KEY = '__GLOBAL_PROMOS__';
    
    // Check cache
    if (!force) {
      const { data: cached } = await supabase
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
    await supabase.from('price_cache').delete().eq('query', CACHE_KEY);
    await supabase.from('price_cache').insert({ query: CACHE_KEY, results: promos });

    return NextResponse.json({ promos });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
