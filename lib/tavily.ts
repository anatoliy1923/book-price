import { GeminiBookData, extractBookData } from './gemini';

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
async function fetchBroadSearch(searchQuery: string, includeDomains?: string[]): Promise<Array<{url: string, content: string}>> {
  try {
    const res = await fetch(`${BASE_URL}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query: searchQuery,
        search_depth: 'basic',
        max_results: 15,
        ...(includeDomains && { include_domains: includeDomains })
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

// Basic regex parser fallback
function regexParsePrice(html: string): { price: number | null; oldPrice: number | null; discount: number | null; available: boolean } {
  const lc = html.toLowerCase();
  const available = !['немає в наявності', 'відсутній', 'закінчився', 'out of stock'].some((kw) => lc.includes(kw));

  const prices: number[] = [];
  const regex = /([0-9]{2,4})\s*(грн|₴|uah|₴)/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const p = parseInt(match[1], 10);
    if (p >= 50 && p <= 5000) prices.push(p);
  }

  if (prices.length === 0) return { price: null, oldPrice: null, discount: null, available };

  prices.sort((a, b) => a - b);
  const price = prices[0];
  let oldPrice = prices.find((p) => p > price && p <= price * 3) || null;
  let discount = null;

  if (oldPrice) {
    discount = Math.round(((oldPrice - price) / oldPrice) * 100);
    if (discount < 1 || discount > 70) {
      oldPrice = null;
      discount = null;
    }
  }

  return { price, oldPrice, discount, available };
}

export async function searchBookPrices(
  query: string,
  specificStoreDomain: string | null = null,
  specificStoreName: string | null = null
): Promise<BookSearchResult> {
  
  const searchPromises = [
    fetchBroadSearch(`${query} купити книга`),
    fetchBroadSearch(`${query} ціна грн`)
  ];

  // If the user requested a specific store, add a 3rd search strictly for it
  if (specificStoreName) {
    searchPromises.push(
      fetchBroadSearch(`${query} купити ${specificStoreName}`, specificStoreDomain ? [specificStoreDomain] : undefined)
    );
  }

  const searchResults = await Promise.all(searchPromises);
  const allFound = searchResults.flat();

  // Step 2: Group by domain, filter junk, prefer product pages
  const domainMap = new Map<string, {url: string, snippet: string}>();

  for (const item of allFound) {
    const domain = getDomain(item.url);
    if (!domain || JUNK_DOMAINS.includes(domain)) continue;
    
    // Accept .ua domains, or explicitly known bookstores, OR the user's specific requested store domain
    if (!domain.endsWith('.ua') && !KNOWN_STORES[domain] && domain !== specificStoreDomain) continue;

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
    name: KNOWN_STORES[domain] || (domain === specificStoreDomain && specificStoreName ? specificStoreName : domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1)),
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
    // If user requested a specific store, it should appear at the top!
    if (specificStoreDomain) {
      if (a.domain === specificStoreDomain && b.domain !== specificStoreDomain) return -1;
      if (a.domain !== specificStoreDomain && b.domain === specificStoreDomain) return 1;
    }

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
