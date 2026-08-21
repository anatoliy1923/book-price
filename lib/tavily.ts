import { extractBookBatch } from './gemini';

const keys = (process.env.TAVILY_API_KEYS || process.env.TAVILY_API_KEY || '').split(',').map((v) => v.trim()).filter(Boolean);
const stores: Record<string, string> = { 'yakaboo.ua':'Yakaboo', 'bookchef.ua':'BookChef', 'book.ua':'Book.ua', 'vivat.ua':'Vivat', 'bookovid.com':'Bookovid', 'readeat.com.ua':'Readeat', 'nashformat.ua':'Nash Format', 'rozetka.com.ua':'Rozetka', 'folio.com.ua':'Folio', 'book-ye.com.ua':'Книгарня Є', 'ksd.ua':'КСД', 'balka-book.com':'Balka Book', 'sens.in.ua':'Сенс', 'starylev.com.ua':'Видавництво Старого Лева' };
const junk = new Set(['wikipedia.org','youtube.com','goodreads.com','prom.ua','olx.ua','facebook.com','instagram.com','tiktok.com','pinterest.com','shafa.ua','izi.ua']);
export interface BookPrice { store:string; domain:string; price:number|null; oldPrice:number|null; discount:number|null; url:string; available:boolean; parsedBy:'gemini'|'regex'|'none'; }
export interface BookSearchResult { query:string; title:string; author:string; prices:BookPrice[]; cachedAt:string; }
function apiKey() { if (!keys[0]) throw new Error('Tavily is not configured'); return keys[0]; }
function domain(url:string) { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; } }
async function call(endpoint:'search'|'extract', body:Record<string, unknown>) {
  const response = await fetch(`https://api.tavily.com/${endpoint}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({api_key:apiKey(), ...body}), signal:AbortSignal.timeout(25_000) });
  if (!response.ok) throw new Error(`Tavily ${endpoint} failed (${response.status})`);
  return response.json();
}
function regexParse(content:string) { const values=[...content.matchAll(/([0-9]{2,4})\s*(грн|₴|uah)/gi)].map((m)=>Number(m[1])).filter((v)=>v>=50&&v<=5000).sort((a,b)=>a-b); return {price:values[0]||null,oldPrice:null,discount:null,available:!/немає в наявності|відсутній|закінчився|out of stock/i.test(content)}; }

export async function searchBookPrices(query:string, specificStoreDomain:string|null=null, specificStoreName:string|null=null):Promise<BookSearchResult> {
  const queries=[`${query} купити книга`, `${query} ціна грн`]; if (specificStoreName) queries.push(`${query} купити ${specificStoreName}`);
  const found=(await Promise.all(queries.map((q,i)=>call('search',{query:q,search_depth:'basic',max_results:12,...(i===2&&specificStoreDomain?{include_domains:[specificStoreDomain]}:{})}).catch(()=>({results:[]}))))).flatMap((r)=>r.results||[]);
  const unique=new Map<string,{url:string;snippet:string}>();
  for (const item of found) { const host=domain(item.url); if (!host||junk.has(host)||(!host.endsWith('.ua')&&!stores[host]&&host!==specificStoreDomain)||unique.has(host)) continue; unique.set(host,{url:item.url,snippet:item.content||''}); }
  const selected=[...unique.entries()].slice(0,12).map(([host,value])=>({domain:host,url:value.url,snippet:value.snippet,store:stores[host]||(host===specificStoreDomain?specificStoreName||host:host.split('.')[0])}));
  const extracted=selected.length?await call('extract',{urls:selected.map((v)=>v.url),extract_depth:'basic'}).catch(()=>({results:[]})):{results:[]};
  const text=new Map<string,string>((extracted.results||[]).map((r:{url:string;raw_content?:string;content?:string})=>[r.url,r.raw_content||r.content||'']));
  const pages=selected.map((store)=>({...store,content:text.get(store.url)||store.snippet})); const parsed=await extractBookBatch(pages,query);
  const prices:BookPrice[]=pages.map((store,index):BookPrice=>{ const ai=parsed[index]; const fallback=regexParse(store.content); return ai&&ai.isCorrectBook?{store:store.store,domain:store.domain,url:store.url,price:ai.price,oldPrice:ai.oldPrice,discount:ai.discount,available:ai.available,parsedBy:'gemini'}:{store:store.store,domain:store.domain,url:store.url,...fallback,parsedBy:'regex'}; }).filter((v)=>v.price!==null||v.available);
  prices.sort((a,b)=>Number(b.available)-Number(a.available)||(a.price??Infinity)-(b.price??Infinity)); const first=parsed.find((v)=>v?.isCorrectBook);
  return {query,title:first?.title||query,author:first?.author||'',prices,cachedAt:new Date().toISOString()};
}
