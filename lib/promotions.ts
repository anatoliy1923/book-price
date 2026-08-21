import { GoogleGenAI } from '@google/genai';

const TAVILY_API_KEY = (process.env.TAVILY_API_KEYS || process.env.TAVILY_API_KEY || '').split(',')[0]?.trim();
const GEMINI_API_KEY = (process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || '').split(',')[0]?.trim();
const GEMINI_MODEL = (process.env.GEMINI_MODELS || 'gemini-2.5-flash').split(',')[0].trim();

export interface Promo {
  store: string;
  title: string;
  description: string;
  url: string;
}

const OFFICIAL_URLS = [
  'https://vivat.ua/',
  'https://vivat.ua/actions/',
  'https://ksd.ua/',
  'https://ksd.ua/actions',
  'https://readeat.com.ua/',
  'https://laboratoria.pro/',
  'https://sens.in.ua/',
  'https://sens.in.ua/sales/',
  'https://megogo.net/ua/books'
];

export async function fetchPromotions(): Promise<Promo[]> {
  if (!TAVILY_API_KEY || !GEMINI_API_KEY) return [];

  const socialDomains = ['instagram.com', 'facebook.com', 't.me'];
  
  try {
    const [extractRes, socialRes] = await Promise.all([
      // 1. Пряме сканування головних сторінок та сторінок акцій (Extract) - РЕАЛЬНИЙ ЧАС
      fetch(`https://api.tavily.com/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: TAVILY_API_KEY,
          urls: OFFICIAL_URLS
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
          max_results: 10,
          include_domains: socialDomains
        })
      })
    ]);

    const extractData = extractRes.ok ? await extractRes.json() : { results: [] };
    const socialData = socialRes.ok ? await socialRes.json() : { results: [] };
    
    // Форматуємо дані для ШІ
    const extractedTexts = (extractData.results || []).map((r: any) => `URL: ${r.url}\nВМІСТ:\n${(r.raw_content || r.content || '').substring(0, 3000)}`);
    const socialSnippets = (socialData.results || []).map((r: any) => `URL: ${r.url}\nСНІПЕТ:\n${r.content}`);

    const combinedInfo = `
=== ОФІЦІЙНІ САЙТИ (СЬОГОДНІ) ===
${extractedTexts.join('\n\n')}

=== СОЦМЕРЕЖІ ===
${socialSnippets.join('\n\n')}
`;

    const client = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const prompt = `Ти аналізатор акцій українських книгарень.
Я надав тобі сирий текст з головних сторінок книгарень прямо зараз (ОФІЦІЙНІ САЙТИ), а також результати пошуку по їхніх соцмережах.

Твоя задача: знайти ГЛОБАЛЬНІ акції (наприклад "1+1=3", "-35% на все через закриття", "Безкоштовна доставка", "Знижки на всі комікси" тощо).
ОБОВ'ЯЗКОВО звертай увагу на банери та повідомлення про знижки в тексті офіційних сайтів!
Пропускай звичайні поодинокі знижки на одну конкретну книгу. Якщо акцій немає, поверни пустий масив.

ДАНІ:
${combinedInfo}

Поверни масив JSON у форматі:
[
  {
    "store": "Назва магазину (Megogo, Readeat, КСД, Лабораторія, Vivat або Сенс)",
    "title": "Коротка назва акції (напр. -35% на все)",
    "description": "Опис акції (1-2 речення). Вкажи деталі.",
    "url": "URL сторінки акції (візьми з URL джерела)"
  }
]
Поверни ТІЛЬКИ валідний JSON масив. Без розмітки маркдаун.`;

    const aiRes = await client.models.generateContent({
      model: GEMINI_MODEL,
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
