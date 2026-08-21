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
1. Determine if this webpage is about the book the user searched for
2. Extract structured pricing data

IMPORTANT RULES:
- "isCorrectBook" must be true ONLY if the page is clearly about the searched book (matching title AND/OR author)
- If the page shows a different book entirely, set isCorrectBook to false
- Prices must be in Ukrainian hryvnias (грн / ₴)
- "price" is the current selling price (the one user would pay today)
- "oldPrice" is the crossed-out / was-price (before discount)
- "discount" is the percentage off (integer, e.g. 29 for 29%)
- "available" is false only if explicitly stated as out of stock
- Return ONLY valid JSON, no explanation, no markdown

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

export async function extractBookData(
  pageContent: string,
  searchQuery: string
): Promise<GeminiBookData | null> {
  const client = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  // Truncate content to avoid token waste — first 4000 chars usually have the price
  const truncated = pageContent.slice(0, 4000);

  const userMessage = `Search query: "${searchQuery}"

Webpage content:
${truncated}

Extract the book data as JSON.`;

  // Try each model in the fallback chain
  for (const modelId of MODEL_CHAIN) {
    try {
      const response = await client.models.generateContent({
        model: modelId,
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        config: {
          systemInstruction: SYSTEM_PROMPT,
          temperature: 0,
          thinkingConfig: { thinkingBudget: 0 }, // Disable thinking for speed/cost
        },
      });

      const text = response.text?.trim() || '';

      // Strip markdown code fences if present
      const json = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

      const parsed = JSON.parse(json) as GeminiBookData;

      // Basic validation
      if (typeof parsed.isCorrectBook !== 'boolean') continue;

      return parsed;
    } catch (err) {
      // Log and try next model
      console.warn(`[gemini] Model ${modelId} failed:`, err instanceof Error ? err.message : err);
      continue;
    }
  }

  // All models failed — return null, caller will fall back to regex parsing
  console.error('[gemini] All models failed for query:', searchQuery);
  return null;
}
