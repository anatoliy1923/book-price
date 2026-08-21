import { NextRequest, NextResponse } from 'next/server';
import { searchBookPrices } from '@/lib/tavily';
import { getCached, setCache } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query: string = (body.query || '').trim();

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: 'Введіть назву книжки' },
        { status: 400 }
      );
    }

    // Check cache first
    const cached = await getCached(query);
    if (cached) {
      return NextResponse.json({ ...cached, fromCache: true });
    }

    // Live fetch
    const result = await searchBookPrices(query);
    await setCache(query, result);

    return NextResponse.json({ ...result, fromCache: false });
  } catch (err) {
    console.error('[/api/search]', err);
    return NextResponse.json(
      { error: 'Не вдалось отримати ціни. Спробуйте пізніше.' },
      { status: 500 }
    );
  }
}
