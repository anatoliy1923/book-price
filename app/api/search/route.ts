import { NextRequest, NextResponse } from 'next/server';
import { searchBookPrices } from '@/lib/tavily';
import { getCached, setCache, supabase } from '@/lib/supabase';
import { normalizeSearchQuery } from '@/lib/gemini';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawQuery: string = (body.query || '').trim();
    const specificStore: string = (body.store || '').trim();
    const forceRefresh: boolean = body.forceRefresh === true;

    if (!rawQuery || rawQuery.length < 2) {
      return NextResponse.json(
        { error: 'Введіть назву книжки' },
        { status: 400 }
      );
    }

    // Step 1: AI Normalization of the query and store
    const { query, storeDomain, storeName } = await normalizeSearchQuery(rawQuery, specificStore);

    // If forceRefresh: delete stale cache entry first
    // We append the storeDomain to the cache key logic to avoid caching general searches over specific ones
    const cacheKey = (query + (storeDomain ? `:${storeDomain}` : '')).toLowerCase().trim();

    if (forceRefresh) {
      await supabase
        .from('price_cache')
        .delete()
        .eq('query', cacheKey);
    }

    // Check cache (skipped if forceRefresh deleted it)
    const cached = await getCached(cacheKey);
    if (cached) {
      return NextResponse.json({ ...cached, fromCache: true });
    }

    // Live fetch
    const result = await searchBookPrices(query, storeDomain, storeName);
    result.query = cacheKey; // Ensure the frontend gets the right cache key
    
    await setCache(cacheKey, result);

    return NextResponse.json({ ...result, fromCache: false });
  } catch (err) {
    console.error('[/api/search]', err);
    return NextResponse.json(
      { error: 'Не вдалось отримати ціни. Спробуйте пізніше.' },
      { status: 500 }
    );
  }
}
