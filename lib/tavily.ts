import { extractBookData } from './gemini';

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

// Search one store — returns best matching URL + snippet
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
    const results: Array<{ url: string; content: string }> = data.results || [];

    // Prefer product pages over category/search pages
    const product =
      results.find(
        (r) =>
          !r.url.includes('/search') &&
          !r.url.includes('/catalog') &&
          !r.url.includes('/category') &&
          !/[?&]/.test(r.url.split('/').pop() ?? '')
      ) || results[0];

    return product ? { url: product.url, content: product.content || '' } : null;
  } catch {
    return null;
  }
}

// Extract full page content via Tavily Extract
async function extractPage(url: string): Promise<string> {
  try {
    const res = await fetch(`${BASE_URL}/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: TAVILY_API_KEY, urls: [url] }),
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
  // Step 1: Search all stores in parallel
  const storeSearches = await Promise.allSettled(
    STORES.map((store) =>
      searchOneStore(query, store).then((r) => ({ store, result: r }))
    )
  );

  // Step 2: Collect found URLs
  const found: Array<{ store: (typeof STORES)[0]; url: string; snippet: string }> = [];
  for (const r of storeSearches) {
    if (r.status === 'fulfilled' && r.value.result) {
      found.push({
        store: r.value.store,
        url: r.value.result.url,
        snippet: r.value.result.content,
      });
    }
  }

  // Step 3: Extract full page content for each found URL in parallel
  const pageContents = await Promise.allSettled(
    found.map(async (item) => {
      const full = await extractPage(item.url);
      return { ...item, content: full || item.snippet };
    })
  );

  // Step 4: Use Gemini to verify book identity + extract prices — all in parallel
  const prices: BookPrice[] = [];
  let detectedTitle = '';
  let detectedAuthor = '';

  const geminiResults = await Promise.allSettled(
    pageContents.map(async (r) => {
      if (r.status !== 'fulfilled') return null;
      const { store, url, content } = r.value;

      // Try Gemini first; fall back to regex if Gemini unavailable
      const geminiData = await extractBookData(content, query);

      if (geminiData) {
        // Skip pages that are not about the searched book
        if (!geminiData.isCorrectBook) return null;

        return {
          store,
          url,
          price: geminiData.price,
          oldPrice: geminiData.oldPrice,
          discount: geminiData.discount,
          available: geminiData.available,
          title: geminiData.title,
          author: geminiData.author,
        };
      }

      // Regex fallback
      const parsed = regexParsePrice(content);
      return { store, url, ...parsed, title: '', author: '' };
    })
  );

  for (const r of geminiResults) {
    if (r.status !== 'fulfilled' || !r.value) continue;
    const { store, url, price, oldPrice, discount, available, title, author } = r.value;

    if (!detectedTitle && title) detectedTitle = title;
    if (!detectedAuthor && author) detectedAuthor = author;

    prices.push({
      store: store.name,
      domain: store.domain,
      url,
      price,
      oldPrice,
      discount,
      available,
    });
  }

  // Step 5: Sort — available + has price first, then by price asc
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
    title: detectedTitle || query,
    author: detectedAuthor,
    prices,
    cachedAt: new Date().toISOString(),
  };
}

// Regex fallback when Gemini is unavailable
function regexParsePrice(content: string): {
  price: number | null;
  oldPrice: number | null;
  discount: number | null;
  available: boolean;
} {
  const pattern = /(\d[\d\s]{0,6}(?:[.,]\d{1,2})?)\s*(?:грн|₴)/gi;
  const matches = [...content.matchAll(pattern)];
  const prices: number[] = [];

  for (const m of matches) {
    const num = parseFloat(m[1].replace(/\s/g, '').replace(',', '.'));
    // Realistic book price range
    if (!isNaN(num) && num >= 50 && num <= 5000) prices.push(num);
  }

  const unique = [...new Set(prices)].sort((a, b) => a - b);
  const lc = content.toLowerCase();
  const available = !['немає в наявності', 'відсутній', 'закінчився', 'out of stock'].some(
    (kw) => lc.includes(kw)
  );

  if (unique.length === 0) return { price: null, oldPrice: null, discount: null, available };

  const price = unique[0];
  const max = unique[unique.length - 1];

  // Old price: must be higher but no more than 3x (avoids ISBN/barcode garbage)
  const oldPrice = max > price * 1.05 && max <= price * 3 ? max : null;
  const discount = oldPrice ? Math.round((1 - price / oldPrice) * 100) : null;
  // Discard if discount looks unrealistic
  const validDiscount = discount !== null && discount <= 70 ? discount : null;

  return { price, oldPrice: validDiscount ? oldPrice : null, discount: validDiscount, available };
}
