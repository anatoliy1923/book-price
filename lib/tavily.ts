import { extractBookBatch } from './gemini';
import { evidenceIsOnPage, extractEvidencePrice, isNonOfferContext, pricesAgree } from './offer-validation';

const keys = (process.env.TAVILY_API_KEYS || process.env.TAVILY_API_KEY || '').split(',').map((value) => value.trim()).filter(Boolean);
const stores: Record<string, string> = { 'yakaboo.ua':'Yakaboo', 'bookchef.ua':'BookChef', 'book.ua':'Book.ua', 'vivat.ua':'Vivat', 'bookovid.com':'Bookovid', 'readeat.com.ua':'Readeat', 'nashformat.ua':'Nash Format', 'rozetka.com.ua':'Rozetka', 'folio.com.ua':'Folio', 'book-ye.com.ua':'Книгарня Є', 'ksd.ua':'КСД', 'balka-book.com':'Balka Book', 'sens.in.ua':'Сенс', 'starylev.com.ua':'Видавництво Старого Лева' };
const junk = new Set(['wikipedia.org','youtube.com','goodreads.com','prom.ua','olx.ua','facebook.com','instagram.com','tiktok.com','pinterest.com','shafa.ua','izi.ua']);
const shippingPattern = /вартість доставк|доставк[^.!?]{0,60}\d{2,5}\s*(?:грн|₴|uah)|\d{2,5}\s*(?:грн|₴|uah)[^.!?]{0,60}доставк|shipping.{0,60}\d{2,5}/i;

export interface BookPrice { store:string; domain:string; price:number|null; oldPrice:number|null; discount:number|null; url:string; available:boolean; parsedBy:'gemini'|'structured'|'none'; }
export interface BookSearchResult { query:string; title:string; author:string; prices:BookPrice[]; cachedAt:string; }
type SearchHit = { url:string; content?:string; title?:string; score?:number };
type Candidate = { domain:string; url:string; snippet:string; title:string; store:string; score:number };

function domain(url:string) { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; } }
function safeText(value: string) { return value.replace(/\s+/g, ' ').trim(); }

async function call(endpoint:'search'|'extract', body:Record<string, unknown>) {
  if (!keys.length) throw new Error('Tavily is not configured');
  let lastError: Error | undefined;
  for (const key of keys) {
    const response = await fetch(`https://api.tavily.com/${endpoint}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({api_key:key, ...body}), signal:AbortSignal.timeout(25_000) });
    if (response.ok) return response.json();
    lastError = new Error(`Tavily ${endpoint} failed (${response.status})`);
    // A malformed request or a missing permission will not be fixed by trying another key.
    if (![401, 429, 432, 433].includes(response.status)) break;
  }
  throw lastError || new Error(`Tavily ${endpoint} failed`);
}

function queryTerms(query: string) { return query.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((term) => term.length > 2).slice(0, 8); }
function candidateScore(hit: SearchHit, query: string) {
  const url = hit.url.toLowerCase(); const text = `${hit.title || ''} ${hit.content || ''}`.toLowerCase();
  if (shippingPattern.test(`${url} ${text}`)) return -1000;
  let score = Number(hit.score || 0) * 20;
  score += queryTerms(query).filter((term) => text.includes(term)).length * 12;
  if (/product|book|catalog|tovar|товар|книг|p\d+/i.test(url)) score += 25;
  if (/\d{2,5}\s*(грн|₴|uah)/i.test(text)) score += 8;
  if (/доставка|delivery/i.test(url)) score -= 1000;
  return score;
}

function selectCandidates(results: SearchHit[], query: string, specificStoreDomain: string | null, specificStoreName: string | null) {
  const byDomain = new Map<string, Candidate>();
  for (const hit of results) {
    const host = domain(hit.url);
    if (!host || junk.has(host) || (!host.endsWith('.ua') && !stores[host] && host !== specificStoreDomain)) continue;
    const score = candidateScore(hit, query); if (score < 0) continue;
    const next: Candidate = { domain: host, url: hit.url, snippet: hit.content || '', title: hit.title || '', score, store: stores[host] || (host === specificStoreDomain ? specificStoreName || host : host.split('.')[0]) };
    if (!byDomain.has(host) || byDomain.get(host)!.score < score) byDomain.set(host, next);
  }
  return [...byDomain.values()].sort((a, b) => b.score - a.score).slice(0, 12);
}

function chooseOffer(content: string, ai: Awaited<ReturnType<typeof extractBookBatch>>[number]) {
  const local = extractEvidencePrice(content);
  if (ai?.isCorrectBook && ai.price !== null && evidenceIsOnPage(ai.priceEvidence, content)) {
    if (!local || pricesAgree(ai.price, local.price)) return { price: ai.price, oldPrice: ai.oldPrice, discount: ai.discount, available: ai.available, parsedBy: 'gemini' as const };
  }
  if (local) return { price: local.price, oldPrice: null, discount: null, available: true, parsedBy: 'structured' as const };
  return { price: null, oldPrice: null, discount: null, available: false, parsedBy: 'none' as const };
}

export async function searchBookPrices(query:string, specificStoreDomain:string|null=null, specificStoreName:string|null=null):Promise<BookSearchResult> {
  const queries = [`${query} купити книгу ціна`, `${query} книга ціна грн`];
  if (specificStoreName) queries.push(`${query} купити ${specificStoreName}`);
  const searchResponses = await Promise.all(queries.map((searchQuery, index) => call('search', {
    query: searchQuery, search_depth: 'basic', max_results: 10,
    ...(index === 2 && specificStoreDomain ? { include_domains: [specificStoreDomain] } : {}),
  }).catch(() => ({ results: [] }))));
  const selected = selectCandidates(searchResponses.flatMap((response) => response.results || []) as SearchHit[], query, specificStoreDomain, specificStoreName);
  const extracted = selected.length ? await call('extract', { urls: selected.map((candidate) => candidate.url), extract_depth: 'basic' }).catch(() => ({ results: [] })) : { results: [] };
  const textByUrl = new Map<string, string>((extracted.results || []).map((result: { url:string; raw_content?:string; content?:string }) => [result.url, safeText(result.raw_content || result.content || '')]));
  const pages = selected.map((candidate) => ({ ...candidate, content: textByUrl.get(candidate.url) || safeText(candidate.snippet) }));
  const parsed = await extractBookBatch(pages, query);
  const prices = pages.map((store, index): BookPrice => ({ store: store.store, domain: store.domain, url: store.url, ...chooseOffer(store.content, parsed[index]) })).filter((offer) => offer.price !== null);
  prices.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
  const first = parsed.find((value) => value?.isCorrectBook);
  return { query, title: first?.title || query, author: first?.author || '', prices, cachedAt: new Date().toISOString() };
}
