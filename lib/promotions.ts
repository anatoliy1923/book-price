import { GoogleGenAI } from '@google/genai';

const tavilyKeys = (process.env.TAVILY_API_KEYS || process.env.TAVILY_API_KEY || '').split(',').map((value) => value.trim()).filter(Boolean);
const geminiKeys = (process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || '').split(',').map((value) => value.trim()).filter(Boolean);
const models = (process.env.GEMINI_MODELS || 'gemini-2.5-flash,gemini-3.5-flash-lite').split(',').map((value) => value.trim()).filter(Boolean);
const lookback = process.env.PROMOTIONS_TIME_RANGE === 'week' ? 'week' : 'month';

export interface Promo { store:string; title:string; description:string; url:string; kind:'promotion'|'event'|'news'; source:'official'|'social'; }
export interface PromotionSnapshot { promos: Promo[]; checkedAt: string; sourceCount: number; }
type Evidence = { id:number; store:string; url:string; text:string; source:'official'|'social'; publishedAt?:string };

const stores = [
  { name: 'Vivat', domains: ['vivat.ua'], urls: ['https://vivat.ua/', 'https://vivat.ua/actions/'] },
  { name: 'КСД', domains: ['ksd.ua'], urls: ['https://ksd.ua/', 'https://ksd.ua/actions'] },
  { name: 'Readeat', domains: ['readeat.com.ua'], urls: ['https://readeat.com.ua/'] },
  { name: 'Лабораторія', domains: ['laboratoria.pro'], urls: ['https://laboratoria.pro/'] },
  { name: 'Сенс', domains: ['sens.in.ua'], urls: ['https://sens.in.ua/', 'https://sens.in.ua/sales/'] },
  { name: 'Megogo Books', domains: ['megogo.net'], urls: ['https://megogo.net/ua/books'] },
];
const officialDomains = stores.flatMap((store) => store.domains);
const socialDomains = ['instagram.com', 'facebook.com', 't.me'];
const activeTerms = /акці|знижк|розпродаж|промокод|безкоштовн.{0,12}доставк|1\s*\+\s*1|передзамов|зустріч.{0,20}автор|презентаці|книжков.{0,20}(поді|фест|клуб)|новинк/i;
const staleTerms = /акці[яї].{0,40}(заверш|закінч)|закінчил|минул(?:а|ий|ого)|торішн|202[0-5]/i;

async function tavily(endpoint: 'search'|'extract', body: Record<string, unknown>) {
  let lastError: Error | undefined;
  for (const key of tavilyKeys) {
    const response = await fetch(`https://api.tavily.com/${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ api_key: key, ...body }), signal: AbortSignal.timeout(25_000) });
    if (response.ok) return response.json();
    lastError = new Error(`Tavily ${endpoint} failed (${response.status})`);
    if (![401, 429, 432, 433].includes(response.status)) break;
  }
  throw lastError || new Error('Tavily is not configured');
}

async function json(prompt: string) {
  let lastError: unknown;
  for (const key of geminiKeys) for (const model of models) {
    try {
      const client = new GoogleGenAI({ apiKey: key });
      const response = await client.models.generateContent({ model, contents: [{ role: 'user', parts: [{ text: prompt }] }], config: { temperature: 0.1, responseMimeType: 'application/json' } });
      return JSON.parse(response.text?.trim() || '[]');
    } catch (error) { lastError = error; }
  }
  throw lastError || new Error('Gemini is not configured');
}

function sourceStore(url: string) { const host = new URL(url).hostname.replace(/^www\./, ''); return stores.find((store) => store.domains.some((domain) => host === domain || host.endsWith(`.${domain}`)))?.name || 'Книжкові новини'; }
function clean(value: unknown, max: number) { return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : ''; }

function fallback(evidence: Evidence): Promo | null {
  if (!activeTerms.test(evidence.text) || staleTerms.test(evidence.text)) return null;
  const text = clean(evidence.text, 360); const sentence = text.split(/(?<=[.!?])\s/)[0] || text;
  const kind: Promo['kind'] = /зустріч|презентаці|поді|фест|клуб/i.test(text) ? 'event' : /новинк|передзамов/i.test(text) ? 'news' : 'promotion';
  return { store: evidence.store, title: kind === 'event' ? 'Подія для читачів' : kind === 'news' ? 'Новинки та передзамовлення' : 'Актуальна пропозиція', description: sentence, url: evidence.url, kind, source: evidence.source };
}

function normalize(parsed: unknown, evidence: Evidence[]) {
  if (!Array.isArray(parsed)) return [] as Promo[];
  const seen = new Set<string>();
  return parsed.flatMap((entry): Promo[] => {
    if (!entry || typeof entry !== 'object') return [];
    const value = entry as Record<string, unknown>; const sourceId = typeof value.sourceId === 'number' ? value.sourceId : -1; const source = evidence.find((item) => item.id === sourceId);
    const title = clean(value.title, 100); const description = clean(value.description, 260); const kind = value.kind === 'event' || value.kind === 'news' ? value.kind : 'promotion';
    if (!source || !title || !description || !activeTerms.test(`${title} ${description} ${source.text}`) || staleTerms.test(`${title} ${description} ${source.text}`)) return [];
    const key = `${source.store}:${title.toLowerCase()}`; if (seen.has(key)) return []; seen.add(key);
    return [{ store: source.store, title, description, url: source.url, kind, source: source.source }];
  });
}

export async function fetchPromotions(): Promise<PromotionSnapshot> {
  if (!tavilyKeys.length || !geminiKeys.length) return { promos: [], checkedAt: new Date().toISOString(), sourceCount: 0 };
  try {
    const [homepages, officialSearch, socialSearch, readerSearch] = await Promise.all([
      tavily('extract', { urls: stores.flatMap((store) => store.urls), extract_depth: 'basic' }).catch(() => ({ results: [] })),
      tavily('search', { query: 'акція знижка розпродаж промокод книгарня', include_domains: officialDomains, time_range: lookback, search_depth: 'basic', max_results: 10 }).catch(() => ({ results: [] })),
      tavily('search', { query: '(Vivat OR КСД OR Readeat OR Лабораторія OR Сенс OR Megogo) книгарня акція знижка розпродаж', include_domains: socialDomains, time_range: lookback, search_depth: 'basic', max_results: 10 }).catch(() => ({ results: [] })),
      tavily('search', { query: '(Vivat OR КСД OR Readeat OR Лабораторія OR Сенс OR Megogo) книги зустріч авторів презентація новинки', include_domains: [...officialDomains, ...socialDomains], time_range: lookback, search_depth: 'basic', max_results: 10 }).catch(() => ({ results: [] })),
    ]);
    const direct: Evidence[] = (homepages.results || []).map((result: { url:string; raw_content?:string; content?:string }, index: number) => ({ id: index, store: sourceStore(result.url), url: result.url, text: clean(result.raw_content || result.content || '', 2600), source: 'official' as const }));
    const searchResults = [officialSearch, socialSearch, readerSearch].flatMap((response) => response.results || []) as Array<{ url:string; content?:string; title?:string; published_date?:string }>;
    const seenUrls = new Set(direct.map((item) => item.url));
    const searched: Evidence[] = searchResults.flatMap((result, index) => {
      if (!result.url || seenUrls.has(result.url)) return []; seenUrls.add(result.url);
      const host = new URL(result.url).hostname.replace(/^www\./, ''); const social = socialDomains.some((domain) => host === domain || host.endsWith(`.${domain}`));
      return [{ id: direct.length + index, store: sourceStore(result.url), url: result.url, text: clean(`${result.title || ''}. ${result.content || ''}`, 1200), source: social ? 'social' as const : 'official' as const, publishedAt: result.published_date }];
    });
    const evidence = [...direct, ...searched].filter((item) => item.text.length > 20 && !staleTerms.test(item.text)).slice(0, 24);
    const prompt = `You curate timely Ukrainian book-lover updates. Today is ${new Date().toISOString().slice(0, 10)}. Use ONLY these numbered sources. Return promotions, reader events, or new/pre-order announcements that are current within the source's recent window. Do not report a past campaign, generic store description, single-book markdown, delivery fee, or an unsupported claim. Every result must use its sourceId and quote only facts in that source. Return JSON array: [{"sourceId":number,"kind":"promotion"|"event"|"news","title":string,"description":string}]. Sources: ${JSON.stringify(evidence.map(({ id, store, url, text, source, publishedAt }) => ({ id, store, url, text, source, publishedAt })))} `;
    const promos = normalize(await json(prompt), evidence);
    const fallbackPromos = promos.length ? promos : evidence.map(fallback).filter((item): item is Promo => Boolean(item)).slice(0, 6);
    return { promos: fallbackPromos.slice(0, 10), checkedAt: new Date().toISOString(), sourceCount: evidence.length };
  } catch (error) {
    console.error('Failed to fetch promotions', error);
    return { promos: [], checkedAt: new Date().toISOString(), sourceCount: 0 };
  }
}
