const TAVILY_API_KEY = process.env.TAVILY_API_KEY!;
const BASE_URL = 'https://api.tavily.com';

export const STORES = [
  { name: 'Yakaboo', domain: 'yakaboo.ua' },
  { name: 'BookChef', domain: 'bookchef.ua' },
  { name: 'Book.ua', domain: 'book.ua' },
  { name: 'Vivat', domain: 'vivat.ua' },
  { name: 'Bookovid', domain: 'bookovid.com' },
  { name: 'Readeat', domain: 'readeat.com.ua' },
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

export async function searchBookPrices(query: string): Promise<BookSearchResult> {
  // 1. Search Tavily for the book on Ukrainian bookstores
  const searchRes = await fetch(`${BASE_URL}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: TAVILY_API_KEY,
      query: `${query} купити ціна книга`,
      search_depth: 'basic',
      max_results: 10,
      include_domains: STORES.map((s) => s.domain),
    }),
  });

  if (!searchRes.ok) {
    throw new Error(`Tavily search failed: ${searchRes.status}`);
  }

  const searchData = await searchRes.json();
  const results: Array<{ url: string; title: string; content: string }> =
    searchData.results || [];

  // 2. Group top URL per store
  const storeUrls: Record<string, string> = {};
  for (const result of results) {
    for (const store of STORES) {
      if (result.url.includes(store.domain) && !storeUrls[store.domain]) {
        storeUrls[store.domain] = result.url;
      }
    }
  }

  // 3. Extract prices from found URLs
  const prices: BookPrice[] = [];

  const urlList = Object.values(storeUrls);
  if (urlList.length > 0) {
    const extractRes = await fetch(`${BASE_URL}/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        urls: urlList,
      }),
    });

    if (extractRes.ok) {
      const extractData = await extractRes.json();
      for (const result of extractData.results || []) {
        const store = STORES.find((s) => result.url.includes(s.domain));
        if (!store) continue;

        const parsed = parsePrice(result.raw_content || result.content || '');
        prices.push({
          store: store.name,
          domain: store.domain,
          url: result.url,
          ...parsed,
        });
      }
    }
  }

  // 4. Sort: available first, then by price ascending
  prices.sort((a, b) => {
    if (a.available && !b.available) return -1;
    if (!a.available && b.available) return 1;
    if (a.price !== null && b.price !== null) return a.price - b.price;
    return 0;
  });

  // 5. Extract title/author from first search result
  const firstResult = results[0];
  const rawTitle = firstResult?.title || query;
  const { title, author } = parseBookMeta(rawTitle, query);

  return {
    query,
    title,
    author,
    prices,
    cachedAt: new Date().toISOString(),
  };
}

function parsePrice(content: string): {
  price: number | null;
  oldPrice: number | null;
  discount: number | null;
  available: boolean;
} {
  // Match patterns: "320 грн", "320₴", "1 320 грн"
  const pricePattern = /(\d[\d\s]*(?:[,.]?\d+)?)\s*(?:грн|₴)/gi;
  const matches = [...content.matchAll(pricePattern)];

  const found: number[] = [];
  for (const match of matches) {
    const raw = match[1].replace(/\s/g, '').replace(',', '.');
    const num = parseFloat(raw);
    if (!isNaN(num) && num >= 10 && num <= 15000) {
      found.push(num);
    }
  }

  const uniquePrices = [...new Set(found)].sort((a, b) => a - b);

  const unavailableKw = [
    'немає в наявності',
    'відсутній',
    'немає на складі',
    'out of stock',
    'закінчився',
  ];
  const available = !unavailableKw.some((kw) =>
    content.toLowerCase().includes(kw)
  );

  if (uniquePrices.length === 0) {
    return { price: null, oldPrice: null, discount: null, available };
  }

  const price = uniquePrices[0];
  const maxP = uniquePrices[uniquePrices.length - 1];
  const oldPrice = maxP > price * 1.05 ? maxP : null;
  const discount = oldPrice
    ? Math.round((1 - price / oldPrice) * 100)
    : null;

  return { price, oldPrice, discount, available };
}

function parseBookMeta(
  rawTitle: string,
  fallback: string
): { title: string; author: string } {
  // Common patterns: "Title - Author | Store", "Title by Author"
  const separators = [' | ', ' — ', ' - '];
  let title = rawTitle;
  let author = '';

  for (const sep of separators) {
    if (rawTitle.includes(sep)) {
      const parts = rawTitle.split(sep);
      title = parts[0].trim();
      // Last part might be store name, middle might be author
      if (parts.length > 2) author = parts[1].trim();
      break;
    }
  }

  // Clean up: remove "Купити", "Ціна", store names
  title = title
    .replace(/купити\s*/i, '')
    .replace(/ціна\s*/i, '')
    .trim();

  return { title: title || fallback, author };
}
