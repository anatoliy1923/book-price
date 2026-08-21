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
- "isCorrectBook" = true ONLY if the page is a product page for the searched book (title/author match)
- "isCorrectBook" = false if: it's a category page, search results page, different book, or unrelated content
- Prices must be in Ukrainian hryvnias (грн / ₴), realistic book prices are between 50 and 5000 грн
- "price" = current selling price (what user pays today)
- "oldPrice" = crossed-out price before discount (must be higher than price, but no more than 3x price)
- "discount" = integer percentage, e.g. 29 for 29%. Maximum realistic book discount is 70%.
- "available" = true IF there is a "Купити", "В кошик", "Додати у кошик", or "Придбати" button.
- "available" = false ONLY IF the page EXPLICITLY states "Немає в наявності", "Закінчився", "Очікується", or "Недоступний" for the MAIN product (ignore other books on the page).
- If you cannot find a clear price, set price to null
- Return ONLY valid JSON, no markdown, no explanation

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
