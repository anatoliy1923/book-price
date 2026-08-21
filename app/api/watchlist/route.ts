import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireUser } from '@/lib/auth';
import { guard } from '@/lib/api';

export async function GET(req: NextRequest) {
  const user = await requireUser(req); if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data, error } = await supabaseAdmin
    .from('watchlist')
    .select('*')
    .eq('user_id', user.id)
    .order('added_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  try {
    const blocked = await guard(req, 'watchlist', 12); if (blocked) return blocked;
    const user = await requireUser(req); if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const { title, author, query, last_price } = body;

    if (!title || !query) {
      return NextResponse.json({ error: 'Відсутні обовʼязкові поля' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('watchlist')
      .insert({ title: String(title).slice(0, 300), author: author ? String(author).slice(0, 300) : null, query: String(query).slice(0, 300), last_price: Number.isFinite(last_price) ? last_price : null, user_id: user.id })
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

export async function DELETE(req: NextRequest) {
  const user = await requireUser(req); if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const query = typeof body.query === 'string' ? body.query : '';
  if (!query) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  const { error } = await supabaseAdmin.from('watchlist').delete().eq('user_id', user.id).eq('query', query);
  return error ? NextResponse.json({ error: 'Помилка сервера' }, { status: 500 }) : NextResponse.json({ success: true });
}
