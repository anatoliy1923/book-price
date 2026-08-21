import { NextRequest, NextResponse } from 'next/server';
import { searchBookPrices } from '@/lib/tavily';
import { getCached, setCache, supabase } from '@/lib/supabase';
import { normalizeSearchQuery } from '@/lib/gemini';
import { requireUser, getRole } from '@/lib/auth';
import { consumeSearchQuota } from '@/lib/limits';
import { audit, guard } from '@/lib/api';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const blocked = await guard(req, 'search', 8); if (blocked) return blocked;
    const user = await requireUser(req);
    if (!user) return NextResponse.json({ error: 'Увійдіть, щоб шукати ціни.' }, { status: 401 });
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

    // Cached results are free and never consume a user quota. Forced refresh is intentionally
    // still cache-first: otherwise bots can use it to bypass the shared provider budget.
    const cached = await getCached(cacheKey);
    if (cached) {
      return NextResponse.json({ ...cached, fromCache: true });
    }

    const quota = await consumeSearchQuota(user.id, await getRole(user.id));
    if (!quota.allowed) return NextResponse.json({ error: 'Ліміт живих пошуків вичерпано. Спробуйте після оновлення ліміту.', quota }, { status: 429 });
    const result = await searchBookPrices(query, storeDomain, storeName);
    result.query = cacheKey; // Ensure the frontend gets the right cache key
    
    await setCache(cacheKey, result);

    await audit(user.id, 'search.live', req, { forceRefresh, quotaRemaining: quota.remaining });
    return NextResponse.json({ ...result, fromCache: false, quota });
  } catch (err) {
    console.error('[/api/search]', err);
    return NextResponse.json(
      { error: 'Не вдалось отримати ціни. Спробуйте пізніше.' },
      { status: 500 }
    );
  }
}
