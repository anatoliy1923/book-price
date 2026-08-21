import { GoogleGenAI } from '@google/genai';

const TAVILY_API_KEY = process.env.TAVILY_API_KEY!;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;

export interface Promo {
  store: string;
  title: string;
  description: string;
  url: string;
}

const PROMO_STORES = [
  { name: 'Megogo', domain: 'megogo.net' },
  { name: 'Readeat', domain: 'readeat.com.ua' },
  { name: 'КСД', domain: 'ksd.ua' },
  { name: 'Лабораторія', domain: 'laboratoria.pro' },
  { name: 'Vivat', domain: 'vivat.ua' },
  { name: 'Сенс', domain: 'sens.in.ua' }
];

export async function fetchPromotions(): Promise<Promo[]> {
  if (!TAVILY_API_KEY || !GEMINI_API_KEY) return [];

  const storeDomains = PROMO_STORES.map(s => s.domain);
  const socialDomains = ['instagram.com', 'facebook.com', 't.me'];
  
  try {
    const [storeRes, socialRes] = await Promise.all([
      // 1. Пошук по офіційних сайтах
      fetch(`https://api.tavily.com/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: TAVILY_API_KEY,
          query: "акції знижки 1+1 розпродаж",
          search_depth: "basic",
          max_results: 15,
          include_domains: storeDomains
        })
      }),
      // 2. Пошук по соцмережах (Instagram, FB, Telegram) для цих магазинів
      fetch(`https://api.tavily.com/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: TAVILY_API_KEY,
          query: "акція знижка 1+1 розпродаж (Megogo OR Readeat OR КСД OR Лабораторія OR Vivat OR Сенс книгарня)",
          search_depth: "basic",
          max_results: 15,
          include_domains: socialDomains
        })
      })
    ]);

    const storeData = storeRes.ok ? await storeRes.json() : { results: [] };
    const socialData = socialRes.ok ? await socialRes.json() : { results: [] };
    
    const results = [...(storeData.results || []), ...(socialData.results || [])];

    if (!results.length) return [];

    const client = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const prompt = `Ти аналізатор акцій українських книгарень.
Ось результати пошуку з офіційних сайтів та соцмереж (Instagram, FB, Telegram).
Твоя задача: знайти ГЛОБАЛЬНІ акції (наприклад "1+1=3", "-20% на всі комікси", "Безкоштовна доставка", "Свято" тощо).
Пропускай звичайні поодинокі знижки на одну конкретну книгу. Якщо акцій немає, поверни пустий масив.

Результати пошуку:
${JSON.stringify(results.map((r: any) => ({ url: r.url, snippet: r.content })), null, 2)}

Поверни масив JSON у форматі:
[
  {
    "store": "Назва магазину (Megogo, Readeat, КСД, Лабораторія, Vivat або Сенс)",
    "title": "Коротка назва акції",
    "description": "Опис акції (1-2 речення). Якщо це з соцмереж, вкажи це.",
    "url": "URL сторінки акції або поста"
  }
]
Поверни ТІЛЬКИ валідний JSON масив. Без розмітки маркдаун.`;

    const aiRes = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { temperature: 0.1, responseMimeType: 'application/json' }
    });

    const text = aiRes.text?.trim() || '[]';
    return JSON.parse(text);
  } catch (err) {
    console.error('Failed to fetch promotions', err);
    return [];
  }
}
