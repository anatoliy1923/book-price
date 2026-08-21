const TAVILY_API_KEY = process.env.TAVILY_API_KEY!;
const BASE_URL = 'https://api.tavily.com';

export const STORES = [
  { name: 'Yakaboo', domain: 'yakaboo.ua' },
  { name: 'BookChef', domain: 'bookchef.ua' },
  { name: 'Book.ua', domain: 'book.ua' },
  { name: 'Vivat', domain: 'vivat.ua' },
  { name: 'Bookovid', domain: 'bookovid.com' },
  { name: 'Readeat', domain: 'readeat.com.ua' },
  { name: 'Nash Format', domain: 'nashformat.ua' },
  { name: 'Rozetka', domain: 'rozetka.com.ua' },
  { name: 'Folio', domain: 'folio.com.ua' },
  { name: 'Абабагаламага', domain: 'ababahalamaha.com.ua' },
  { name: 'Кнігалюб', domain: 'knigolub.com.ua' },
];

export interface BookPrice {
  store: string;
  domain: string;
  price: number | null;
  oldPrice: number | null;
  discount: number | null;
  url: string;
  available: boolean;
}

export interface BookSearchResult {
  query: string;
  title: string;
  author: string;
  prices: BookPrice[];
  cachedAt: string;
}

// Search one store — returns best matching URL or null
async function searchOneStore(
  query: string,
  store: { name: string; domain: string }
): Promise<{ url: string; content: string } | null> {
  try {
    const res = await fetch(`${BASE_URL}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query: `${query} книга купити`,
        search_depth: 'basic',
        max_results: 3,
        include_domains: [store.domain],
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const results: Array<{ url: string; content: string; title: string }> =
      data.results || [];

    // Pick the result that looks most like a product page (not a category/search page)
    const product = results.find(
      (r) =>
        !r.url.includes('/search') &&
        !r.url.includes('/catalog') &&
        !r.url.includes('/category') &&
        !r.url.includes('?')
    ) || results[0];

    return product ? { url: product.url, content: product.content || '' } : null;
  } catch {
    return null;
  }
}

// Extract full page content for price parsing
async function extractPage(url: string): Promise<string> {
  try {
    const res = await fetch(`${BASE_URL}/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        urls: [url],
      }),
    });

    if (!res.ok) return '';
    const data = await res.json();
    const result = (data.results || [])[0];
    return result?.raw_content || result?.content || '';
  } catch {
    return '';
  }
}

export async function searchBookPrices(query: string): Promise<BookSearchResult> {
  // 1. Search all stores in parallel
  const storeResults = await Promise.allSettled(
    STORES.map((store) =>
      searchOneStore(query, store).then((r) => ({ store, result: r }))
    )
  );

  // 2. Collect found URLs
  const found: Array<{ store: (typeof STORES)[0]; url: string; content: string }> = [];
  for (const r of storeResults) {
    if (r.status === 'fulfilled' && r.value.result) {
      found.push({
        store: r.value.store,
        url: r.value.result.url,
        content: r.value.result.content,
      });
    }
  }

  // 3. Extract full page content for price parsing (in parallel)
  const extracted = await Promise.allSettled(
    found.map(async (item) => {
      const fullContent = await extractPage(item.url);
      return { ...item, content: fullContent || item.content };
    })
  );

  // 4. Parse prices
  const prices: BookPrice[] = [];
  let detectedTitle = query;
  let detectedAuthor = '';

  for (const r of extracted) {
    if (r.status !== 'fulfilled') continue;
    const { store, url, content } = r.value;
    const parsed = parsePrice(content);

    // Try to extract book title/author from content
    if (detectedTitle === query) {
      const meta = extractBookMeta(content, query);
      if (meta.title) detectedTitle = meta.title;
      if (meta.author) detectedAuthor = meta.author;
    }

    prices.push({
      store: store.name,
      domain: store.domain,
      url,
      ...parsed,
    });
  }

  // 5. Sort: available + has price first, then by price ascending
  prices.sort((a, b) => {
    const aOk = a.available && a.price !== null;
    const bOk = b.available && b.price !== null;
    if (aOk && !bOk) return -1;
    if (!aOk && bOk) return 1;
    if (a.price !== null && b.price !== null) return a.price - b.price;
    return 0;
  });

  return {
    query,
    title: detectedTitle,
    author: detectedAuthor,
    prices,
    cachedAt: new Date().toISOString(),
  };
}

// Price parsing: looks for structured price patterns on Ukrainian e-commerce pages
function parsePrice(content: string): {
  price: number | null;
  oldPrice: number | null;
  discount: number | null;
  available: boolean;
} {
  // Priority: look for "ціна" / "price" context first
  // Pattern: digits optionally separated by space, followed by грн or ₴
  // Matches: "245 грн", "1 245 грн", "1245грн", "245₴"
  const allPrices = extractAllPrices(content);

  // Unavailability check
  const lc = content.toLowerCase();
  const unavailableKw = [
    'немає в наявності',
    'відсутній',
    'немає на складі',
    'out of stock',
    'закінчився',
    'немає товару',
    'нема в наявності',
  ];
  const available = !unavailableKw.some((kw) => lc.includes(kw));

  if (allPrices.length === 0) {
    return { price: null, oldPrice: null, discount: null, available };
  }

  // Strategy: current price is usually the FIRST or MOST PROMINENT price
  // Old price is usually the higher one near "стара ціна" / "було"
  // Use the lowest price as current (best case for user), highest as old if >5% diff
  const sorted = [...allPrices].sort((a, b) => a - b);
  const price = sorted[0];
  const maxP = sorted[sorted.length - 1];

  const oldPrice = maxP > price * 1.05 ? maxP : null;
  const discount = oldPrice
    ? Math.round((1 - price / oldPrice) * 100)
    : null;

  return { price, oldPrice, discount, available };
}

function extractAllPrices(content: string): number[] {
  // Match "1 234 грн", "234грн", "234 ₴", "1234.50 грн"
  const pattern = /(\d[\d\s]{0,6}(?:[.,]\d{1,2})?)\s*(?:грн|₴)/gi;
  const matches = [...content.matchAll(pattern)];
  const prices: number[] = [];

  for (const m of matches) {
    const raw = m[1].replace(/\s/g, '').replace(',', '.');
    const num = parseFloat(raw);
    if (!isNaN(num) && num >= 20 && num <= 15000) {
      prices.push(num);
    }
  }

  // Deduplicate
  return [...new Set(prices)];
}

function extractBookMeta(
  content: string,
  fallback: string
): { title: string; author: string } {
  let title = '';
  let author = '';

  // Look for "Автор:" pattern
  const authorMatch = content.match(/[Аа]втор[:\s]+([^\n,]+)/);
  if (authorMatch) author = authorMatch[1].trim();

  // Look for a likely title: first quoted string or heading
  const quotedMatch = content.match(/«([^»]{3,80})»/);
  if (quotedMatch) title = quotedMatch[1].trim();

  return { title: title || fallback, author };
}
