import { extractBookData } from './gemini';

const TAVILY_API_KEY = process.env.TAVILY_API_KEY!;
const BASE_URL = 'https://api.tavily.com';

const KNOWN_STORES: Record<string, string> = {
  'yakaboo.ua': 'Yakaboo',
  'bookchef.ua': 'BookChef',
  'book.ua': 'Book.ua',
  'vivat.ua': 'Vivat',
  'bookovid.com': 'Bookovid',
  'readeat.com.ua': 'Readeat',
  'nashformat.ua': 'Nash Format',
  'rozetka.com.ua': 'Rozetka',
  'folio.com.ua': 'Folio',
  'ababahalamaha.com.ua': 'Абабагаламага',
  'knigolub.com.ua': 'Кнігалюб',
  'book-ye.com.ua': 'Книгарня Є',
  'ksd.ua': 'КСД',
  'knygarnya.com': 'Книгарня',
  'balka-book.com': 'Balka Book',
  'zhatka.com.ua': 'Жатка',
  'lavkababuin.com': 'Лавка Бабуїн',
  'sens.in.ua': 'Сенс',
  'starylev.com.ua': 'Видавництво Старого Лева'
};

const JUNK_DOMAINS = [
  'wikipedia.org', 'youtube.com', 'goodreads.com', 'prom.ua', 'olx.ua', 
  'facebook.com', 'instagram.com', 'tiktok.com', 'pinterest.com', 'shafa.ua', 'izi.ua'
];

export interface BookPrice {
  store: string;
  domain: string;
  price: number | null;
  oldPrice: number | null;
  discount: number | null;
  url: string;
  available: boolean;
  parsedBy: 'gemini' | 'regex' | 'none';
}

export interface BookSearchResult {
  query: string;
  title: string;
  author: string;
  prices: BookPrice[];
  cachedAt: string;
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return '';
  }
}

// Perform a broad search on Tavily (like Google)
async function fetchBroadSearch(searchQuery: string): Promise<Array<{url: string, content: string}>> {
  try {
    const res = await fetch(`${BASE_URL}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query: searchQuery,
        search_depth: 'basic',
        max_results: 15,
      }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.results || [];
  } catch {
    return [];
  }
}

// Extract full page HTML via Tavily Extract
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
  // Step 1: Do 2 broad searches to cast a wide net across the Ukrainian web
  const searchResults = await Promise.all([
    fetchBroadSearch(`${query} купити книга`),
    fetchBroadSearch(`${query} ціна грн`)
  ]);

  const allFound = [...searchResults[0], ...searchResults[1]];

  // Step 2: Group by domain, filter junk, prefer product pages
  const domainMap = new Map<string, {url: string, snippet: string}>();

  for (const item of allFound) {
    const domain = getDomain(item.url);
    if (!domain || JUNK_DOMAINS.includes(domain)) continue;
    // Only accept .ua domains or explicitly known bookstores
    if (!domain.endsWith('.ua') && !KNOWN_STORES[domain]) continue;

    const isProduct = !item.url.includes('/search') && !item.url.includes('/catalog') && !item.url.includes('/category');

    if (!domainMap.has(domain)) {
      domainMap.set(domain, { url: item.url, snippet: item.content });
    } else if (isProduct && domainMap.get(domain)?.url.includes('/search')) {
      // Upgrade from search page to product page if found
      domainMap.set(domain, { url: item.url, snippet: item.content });
    }
  }

  // Take top 12 unique domains to process
  const topStores = Array.from(domainMap.entries()).slice(0, 12).map(([domain, data]) => ({
    domain,
    name: KNOWN_STORES[domain] || domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1),
    url: data.url,
    snippet: data.snippet
  }));

  // Step 3: Extract full HTML in parallel
  const pageContents = await Promise.allSettled(
    topStores.map(async (store) => {
      const fullHtml = await extractPage(store.url);
      return { ...store, content: fullHtml || store.snippet };
    })
  );

  // Step 4: Feed to Gemini
  const prices: BookPrice[] = [];
  let detectedTitle = '';
  let detectedAuthor = '';

  const geminiResults = await Promise.allSettled(
    pageContents.map(async (r) => {
      if (r.status !== 'fulfilled') return null;
      const { name, domain, url, content, snippet } = r.value;

      const geminiData = await extractBookData(content, query, snippet);

      if (geminiData) {
        if (!geminiData.isCorrectBook) return null;
        return {
          store: name, domain, url,
          price: geminiData.price, oldPrice: geminiData.oldPrice,
          discount: geminiData.discount, available: geminiData.available,
          title: geminiData.title, author: geminiData.author,
          parsedBy: 'gemini' as const,
        };
      }

      const parsed = regexParsePrice(content);
      return { store: name, domain, url, ...parsed, title: '', author: '', parsedBy: 'regex' as const };
    })
  );

  for (const r of geminiResults) {
    if (r.status !== 'fulfilled' || !r.value) continue;
    const { store, domain, url, price, oldPrice, discount, available, title, author, parsedBy } = r.value;
    if (!detectedTitle && title) detectedTitle = title;
    if (!detectedAuthor && author) detectedAuthor = author;

    prices.push({ store, domain, url, price, oldPrice, discount, available, parsedBy });
  }

  // Step 5: Sort
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
