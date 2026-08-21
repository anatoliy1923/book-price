import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { guard } from '@/lib/api';
export async function POST(request: NextRequest) {
  const blocked = await guard(request, 'auth-sign-up', 3); if (blocked) return blocked;
  const body = await request.json(); const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''; const password = typeof body.password === 'string' ? body.password : '';
  if (!email || password.length < 8) return NextResponse.json({ error: 'Use a valid email and a password of at least 8 characters.' }, { status: 400 });
  const callback = new URL('/api/auth/callback', request.url).toString();
  const { data, error } = await supabaseAdmin.auth.signUp({ email, password, options: { emailRedirectTo: callback } });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const response = NextResponse.json({ requiresConfirmation: !data.session });
  if (data.session) response.cookies.set('book_price_session', data.session.access_token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7 });
  return response;
}
