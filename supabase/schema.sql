-- Price cache: stores Tavily results for 4 hours to save API credits
CREATE TABLE IF NOT EXISTS price_cache (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  query TEXT NOT NULL,
  results JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS price_cache_query_idx ON price_cache (lower(trim(query)));
CREATE INDEX IF NOT EXISTS price_cache_updated_idx ON price_cache (updated_at);

-- Watchlist: books to monitor daily
CREATE TABLE IF NOT EXISTS watchlist (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT,
  query TEXT NOT NULL,
  last_price NUMERIC,
  last_checked TIMESTAMPTZ,
  added_at TIMESTAMPTZ DEFAULT NOW()
);
