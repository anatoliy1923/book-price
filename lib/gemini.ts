import { GoogleGenAI } from '@google/genai';
import { BookPrice } from './tavily';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export interface GeminiBookData {
  isCorrectBook: boolean;
  price: number | null;
  oldPrice: number | null;
  discount: number | null;
  available: boolean;
  title?: string;
  author?: string;
}

const SYSTEM_PROMPT = `You are a strict data extraction assistant.
Your goal is to parse book product pages and extract pricing.

CRITICAL RULES:
1. "isCorrectBook" = true ONLY if the page is a product page for the searched book.
2. UKRAINIAN STORES USE REACT/VUE. The visible text might say "out of stock" or be missing prices because JS hasn't executed.
3. YOU MUST PRIORITIZE <script type="application/ld+json">, Schema.org/Product, Schema.org/Book, and <meta property="product:price:amount"> tags!
4. If JSON-LD says "InStock", set available=true and extract the price from there, EVEN IF the raw text says "Немає в наявності".
5. Prices must be in Ukrainian hryvnias (грн / ₴). 
6. "price" = current selling price. "oldPrice" = before discount. "discount" = integer percentage (1-70).
7. "available" = true IF JSON-LD says InStock OR there is a "Купити", "В кошик" button.
8. Return ONLY valid JSON, no markdown, no explanation.

JSON schema:
{
  "isCorrectBook": boolean,
  "title": "string or null",
  "author": "string or null",
  "price": number or null,
  "oldPrice": number or null,
  "discount": number or null,
  "available": boolean
}`;

function sanitize(data: Partial<GeminiBookData>): GeminiBookData | null {
  if (data.isCorrectBook === undefined) return null;

  let { price, oldPrice, discount, available } = data;

  if (price !== null && price !== undefined) {
    if (price < 30 || price > 8000) price = null;
  }
  if (oldPrice !== null && oldPrice !== undefined && price !== null) {
    if (oldPrice <= price || oldPrice > price * 3) oldPrice = null;
  }
  if (discount !== null && discount !== undefined) {
    if (discount < 1 || discount > 70) discount = null;
  }
  if (available === undefined) available = false;

  return {
    isCorrectBook: data.isCorrectBook,
    title: data.title,
    author: data.author,
    price: price ?? null,
    oldPrice: oldPrice ?? null,
    discount: discount ?? null,
    available,
  };
}

export async function extractBookData(
  pageContent: string,
  searchQuery: string,
  searchSnippet: string = ''
): Promise<GeminiBookData | null> {
  if (!GEMINI_API_KEY) return null;

  const client = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  const truncated = pageContent.slice(0, 5000);
  const userMessage = `Search query: "${searchQuery}"

Search Engine Snippet (Highly reliable for price):
${searchSnippet}

Webpage content:
${truncated}

Return JSON only.`;

  try {
    const response = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.1,
        responseMimeType: 'application/json',
      },
    });

    const text = response.text?.trim() || '';
    const parsed = JSON.parse(text);
    return sanitize(parsed);
  } catch (err) {
    return null;
  }
}

export async function normalizeSearchQuery(rawQuery: string, specificStore?: string): Promise<{ query: string, storeDomain: string | null, storeName: string | null }> {
  if (!GEMINI_API_KEY) {
    return { query: rawQuery, storeDomain: null, storeName: null };
  }
  
  const client = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  const prompt = `Ти помічник для пошуку книжок.
Запит на книгу: "${rawQuery}"
Специфічний магазин (необов'язково): "${specificStore || ''}"

Твоя задача:
1. Нормалізувати запит на книгу у формат "Назва Автор" (виправити помилки).
2. Якщо вказано специфічний магазин, визначити його офіційний домен (наприклад "мегого букс" -> "megogo.net", "сенс" -> "sens.in.ua", "віват" -> "vivat.ua") та правильну капіталізовану назву. Якщо магазин не вказано, поверни null.

Поверни ЛИШЕ валідний JSON у такому форматі:
{
  "query": "Нормалізований запит",
  "storeDomain": "domain.com",
  "storeName": "Назва магазину"
}
Якщо магазин не вказано, або ти його не знаєш, поверни null для домену та назви.
`;

  try {
    const response = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { temperature: 0.1, responseMimeType: 'application/json' },
    });

    const text = response.text?.trim() || '';
    const parsed = JSON.parse(text);
    
    if (parsed.query && typeof parsed.query === 'string') {
      return {
        query: parsed.query.replace(/["«»]/g, ''),
        storeDomain: parsed.storeDomain || null,
        storeName: parsed.storeName || null
      };
    }
  } catch (err) {
    console.warn('[gemini] Query normalization failed:', err instanceof Error ? err.message : String(err));
  }
  
  return { query: rawQuery, storeDomain: null, storeName: null };
}
