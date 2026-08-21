import { NextRequest, NextResponse } from 'next/server';
import { searchBookPrices } from '@/lib/tavily';
import { getCached, setCache, supabase } from '@/lib/supabase';
import { normalizeSearchQuery } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawQuery: string = (body.query || '').trim();
    const forceRefresh: boolean = body.forceRefresh === true;

    if (!rawQuery || rawQuery.length < 2) {
      return NextResponse.json(
        { error: 'Введіть назву книжки' },
        { status: 400 }
      );
    }

    // Step 1: AI Normalization of the query
    const query = await normalizeSearchQuery(rawQuery);

    // If forceRefresh: delete stale cache entry first
    if (forceRefresh) {
      await supabase
        .from('price_cache')
        .delete()
        .eq('query', query.toLowerCase().trim());
    }

    // Check cache (skipped if forceRefresh deleted it)
    const cached = await getCached(query);
    if (cached) {
      return NextResponse.json({ ...cached, fromCache: true });
    }

    // Live fetch
    const result = await searchBookPrices(query);
    await setCache(query, result);

    return NextResponse.json({ ...result, fromCache: false });
  } catch (err) {
    console.error('[/api/search]', err);
    return NextResponse.json(
      { error: 'Не вдалось отримати ціни. Спробуйте пізніше.' },
      { status: 500 }
    );
  }
}
