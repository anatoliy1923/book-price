export type EvidencePrice = { price: number; kind: 'structured' | 'visible'; evidence: string };

const shippingPattern = /(?:доставк|shipping|відправлен|кур[’'`]?єр|нова пошта|укрпошта|самовивіз|пакуван|комісі[яї]|service fee|плата за)[^.!?]{0,90}\d{2,5}(?:[.,]\d{1,2})?\s*(?:грн|₴|uah)|\d{2,5}(?:[.,]\d{1,2})?\s*(?:грн|₴|uah)[^.!?]{0,90}(?:доставк|shipping|відправлен|кур[’'`]?єр|нова пошта|укрпошта|самовивіз|пакуван|комісі[яї]|service fee|плата за)/i;
const nonBookPattern = /підписк|membership|подарунк(?:овий)? сертифікат|gift card/i;

function compact(value: string) { return value.replace(/\s+/g, ' ').trim(); }

export function isNonOfferContext(value: string) { return shippingPattern.test(value) || nonBookPattern.test(value); }

export function extractEvidencePrice(content: string): EvidencePrice | null {
  const candidates: Array<EvidencePrice & { score: number }> = [];
  const source = compact(content);
  const patterns: Array<{ regex: RegExp; kind: EvidencePrice['kind']; score: number }> = [
    { regex: /(?:itemprop=["']price["'][^>]{0,120}content=["']|content=["'])(\d{2,5}(?:[.,]\d{1,2})?)(?=["'][^>]{0,120}itemprop=["']price|["'])/gi, kind: 'structured', score: 140 },
    { regex: /["'](?:price|sale_price|final_price)["']\s*[:=]\s*["']?(\d{2,5}(?:[.,]\d{1,2})?)/gi, kind: 'structured', score: 120 },
    { regex: /(\d{2,5}(?:[.,]\d{1,2})?)\s*(?:грн|₴|uah)/gi, kind: 'visible', score: 40 },
  ];
  for (const { regex, kind, score } of patterns) {
    for (const match of source.matchAll(regex)) {
      const price = Number(match[1].replace(',', '.'));
      if (!Number.isFinite(price) || price < 40 || price > 8000) continue;
      const start = Math.max(0, (match.index || 0) - 180);
      const evidence = source.slice(start, Math.min(source.length, (match.index || 0) + match[0].length + 180));
      if (isNonOfferContext(evidence)) continue;
      const hasOfferContext = /offer|product|book|товар|книг|ціна|price|грн|₴/i.test(evidence);
      if (!hasOfferContext) continue;
      candidates.push({ price, kind, evidence, score: score + (/(?:offer|product|book|товар|книг)/i.test(evidence) ? 20 : 0) });
    }
  }
  candidates.sort((a, b) => b.score - a.score || a.price - b.price);
  const best = candidates[0];
  return best ? { price: best.price, kind: best.kind, evidence: best.evidence } : null;
}

export function evidenceIsOnPage(evidence: string | undefined, content: string) {
  if (!evidence || evidence.length < 6 || isNonOfferContext(evidence)) return false;
  return compact(content).toLowerCase().includes(compact(evidence).toLowerCase());
}

export function pricesAgree(first: number, second: number) {
  return Math.abs(first - second) <= Math.max(5, Math.max(first, second) * 0.06);
}
