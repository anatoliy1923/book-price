import type { BookSearchResult } from './tavily';
import { supabaseAdmin } from './supabase-server';

export type WatchlistItem = {
  id: string;
  title: string;
  author: string | null;
  query: string;
  last_price: number | null;
  last_checked: string | null;
  added_at: string;
};

export type PriceCacheRow = {
  id: string;
  query: string;
  results: BookSearchResult;
  updated_at: string;
};

// Cache TTL in milliseconds (4 hours)
export const CACHE_TTL_MS = 4 * 60 * 60 * 1000;

export async function getCached(
  query: string
): Promise<BookSearchResult | null> {
  const { data, error } = await supabaseAdmin
    .from('price_cache')
    .select('*')
    .eq('query', query.toLowerCase().trim())
    .single();

  if (error || !data) return null;

  const age = Date.now() - new Date(data.updated_at).getTime();
  if (age > CACHE_TTL_MS) return null;

  return data.results as BookSearchResult;
}

export async function setCache(
  query: string,
  results: BookSearchResult
): Promise<void> {
  await supabaseAdmin.from('price_cache').upsert(
    {
      query: query.toLowerCase().trim(),
      results,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'query' }
  );
}
