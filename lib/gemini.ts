import { GoogleGenAI } from '@google/genai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;

// Fallback model chain: try each in order if the previous fails
const MODEL_CHAIN = [
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
];

const SYSTEM_PROMPT = `You are a precise book data extractor for a Ukrainian book price comparison service.

Given a webpage content and a search query (book name/author), your job is to:
1. Determine if this webpage is a PRODUCT PAGE for the specific book being searched
2. Extract structured pricing data

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
  "title": string,
  "author": string,
  "price": number | null,
  "oldPrice": number | null,
  "discount": number | null,
  "available": boolean
}`;

export interface GeminiBookData {
  isCorrectBook: boolean;
  title: string;
  author: string;
  price: number | null;
  oldPrice: number | null;
  discount: number | null;
  available: boolean;
}

function sanitize(data: GeminiBookData): GeminiBookData {
  // Sanity checks — reject impossible values
  let { price, oldPrice, discount } = data;

  if (price !== null && (price < 30 || price > 8000)) price = null;
  if (oldPrice !== null && price !== null) {
    // Old price must be higher than current and no more than 3x
    if (oldPrice <= price || oldPrice > price * 3) oldPrice = null;
  }
  if (oldPrice === null) discount = null;
  if (discount !== null && (discount < 1 || discount > 70)) discount = null;

  return { ...data, price, oldPrice, discount };
}

export async function extractBookData(
  pageContent: string,
  searchQuery: string
): Promise<GeminiBookData | null> {
  if (!GEMINI_API_KEY) {
    console.warn('[gemini] No API key set');
    return null;
  }

  const client = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  // First 5000 chars usually contain title, price, author
  const truncated = pageContent.slice(0, 5000);

  const userMessage = `Search query: "${searchQuery}"

Webpage content:
${truncated}

Return JSON only.`;

  for (const modelId of MODEL_CHAIN) {
    try {
      const response = await client.models.generateContent({
        model: modelId,
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        config: {
          systemInstruction: SYSTEM_PROMPT,
          temperature: 0,
        },
      });

      const text = response.text?.trim() ?? '';
      if (!text) continue;

      // Strip markdown fences if present
      const json = text
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/, '')
        .trim();

      const parsed = JSON.parse(json) as GeminiBookData;
      if (typeof parsed.isCorrectBook !== 'boolean') continue;

      return sanitize(parsed);
    } catch (err) {
      console.warn(
        `[gemini] ${modelId} failed:`,
        err instanceof Error ? err.message : String(err)
      );
      continue;
    }
  }

  console.error('[gemini] All models failed for query:', searchQuery);
  return null;
}

// Analyzes and normalizes the user's search query for better search accuracy
export async function normalizeSearchQuery(rawQuery: string): Promise<string> {
  if (!GEMINI_API_KEY) return rawQuery;
  const client = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  const prompt = `Ти помічник для пошуку книжок.
Твоя задача — виправити помилки та нормалізувати запит користувача у чистий формат "Назва книжки Автор" українською мовою.
Якщо це лише автор — поверни його повне ім'я (наприклад "камю" -> "Альбер Камю").
Якщо це серія або відома книжка, напиши правильну назву.
Запит: "${rawQuery}"
Поверни ЛИШЕ нормалізований рядок, без лапок, без крапок в кінці і без жодних пояснень.`;

  try {
    const response = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { temperature: 0.1 },
    });

    const text = response.text?.trim().replace(/["«»]/g, '');
    
    // Sanity check: if it's too long or looks like JSON, ignore it
    if (text && text.length > 2 && text.length < 100 && !text.includes('{')) {
      return text;
    }
  } catch (err) {
    console.warn('[gemini] Query normalization failed:', err instanceof Error ? err.message : String(err));
  }
  
  return rawQuery; // fallback to original
}
