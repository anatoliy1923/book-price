import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { guard } from '@/lib/api';
function response(body: Record<string, unknown>, token?: string) { const value = NextResponse.json(body); if (token) value.cookies.set('book_price_session', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7 }); return value; }
export async function POST(request: NextRequest) {
  const blocked = await guard(request, 'auth-sign-in', 5); if (blocked) return blocked;
  const body = await request.json(); const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''; const password = typeof body.password === 'string' ? body.password : '';
  if (!email || !password) return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
  const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password });
  if (error || !data.session) return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
  return response({ authenticated: true }, data.session.access_token);
}
