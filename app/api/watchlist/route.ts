import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  const { data, error } = await supabase
    .from('watchlist')
    .select('*')
    .order('added_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, author, query, last_price } = body;

    if (!title || !query) {
      return NextResponse.json({ error: 'Відсутні обовʼязкові поля' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('watchlist')
      .insert({ title, author: author || null, query, last_price: last_price || null })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('[POST /api/watchlist]', err);
    return NextResponse.json({ error: 'Помилка сервера' }, { status: 500 });
  }
}
