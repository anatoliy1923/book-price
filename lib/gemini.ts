import { GoogleGenAI } from '@google/genai';

export interface GeminiBookData { isCorrectBook: boolean; price: number | null; oldPrice: number | null; discount: number | null; available: boolean; title?: string; author?: string; }
const models = (process.env.GEMINI_MODELS || 'gemini-2.5-flash,gemini-3.5-flash-lite').split(',').map((v) => v.trim()).filter(Boolean);
const keys = (process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || '').split(',').map((v) => v.trim()).filter(Boolean);

function sanitize(data: Partial<GeminiBookData>): GeminiBookData | null {
  if (typeof data.isCorrectBook !== 'boolean') return null;
  const price = typeof data.price === 'number' && data.price >= 30 && data.price <= 8000 ? data.price : null;
  const oldPrice = typeof data.oldPrice === 'number' && price !== null && data.oldPrice > price && data.oldPrice <= price * 3 ? data.oldPrice : null;
  const discount = typeof data.discount === 'number' && data.discount >= 1 && data.discount <= 70 ? Math.round(data.discount) : null;
  return { isCorrectBook: data.isCorrectBook, title: data.title, author: data.author, price, oldPrice, discount, available: data.available === true };
}

async function json(prompt: string, instruction?: string): Promise<unknown> {
  if (!keys.length) throw new Error('Gemini is not configured');
  let lastError: unknown;
  // Models are fallbacks for transient/model availability failures, never quota bypasses.
  for (const model of models) {
    try {
      const client = new GoogleGenAI({ apiKey: keys[0] });
      const response = await client.models.generateContent({ model, contents: [{ role: 'user', parts: [{ text: prompt }] }], config: { systemInstruction: instruction, temperature: 0.1, responseMimeType: 'application/json' } });
      return JSON.parse(response.text?.trim() || 'null');
    } catch (error) { lastError = error; }
  }
  throw lastError;
}

export async function extractBookBatch(pages: Array<{ domain: string; content: string; snippet: string }>, searchQuery: string): Promise<Array<GeminiBookData | null>> {
  if (!pages.length || !keys.length) return pages.map(() => null);
  const compact = pages.map((page, id) => ({ id, domain: page.domain, snippet: page.snippet.slice(0, 700), content: page.content.slice(0, 3500) }));
  try {
    const parsed = await json(`Search query: ${JSON.stringify(searchQuery)}\nPages: ${JSON.stringify(compact)}\nReturn an array with exactly ${pages.length} objects in order. Each object has isCorrectBook, title, author, price, oldPrice, discount, available.`, 'Extract book offers. Trust JSON-LD Product/Book and product meta tags before visible text. A page is correct only when it represents the requested book. Prices are UAH. Return JSON only.');
    return Array.isArray(parsed) ? pages.map((_, i) => sanitize(parsed[i] || {})) : pages.map(() => null);
  } catch { return pages.map(() => null); }
}

export async function normalizeSearchQuery(rawQuery: string, specificStore?: string) {
  if (!keys.length) return { query: rawQuery, storeDomain: null, storeName: null };
  try {
    const parsed = await json(`Normalize this Ukrainian book search into title and author. Store request: ${JSON.stringify(specificStore || '')}. Book request: ${JSON.stringify(rawQuery)}. Return {"query":"Title Author","storeDomain":string|null,"storeName":string|null}. Use a store domain only when certain it is official.`);
    if (parsed && typeof parsed === 'object' && typeof (parsed as { query?: unknown }).query === 'string') {
      const value = parsed as { query: string; storeDomain?: unknown; storeName?: unknown };
      return { query: value.query.slice(0, 180).replace(/["«»]/g, ''), storeDomain: typeof value.storeDomain === 'string' ? value.storeDomain : null, storeName: typeof value.storeName === 'string' ? value.storeName : null };
    }
  } catch { /* safe fallback */ }
  return { query: rawQuery, storeDomain: null, storeName: null };
}
