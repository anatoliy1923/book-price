import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code'); if (!code) return NextResponse.redirect(new URL('/?auth=confirmation-failed', request.url));
  const { data, error } = await supabaseAdmin.auth.exchangeCodeForSession(code);
  if (error || !data.session) return NextResponse.redirect(new URL('/?auth=confirmation-failed', request.url));
  const response = NextResponse.redirect(new URL('/', request.url)); response.cookies.set('book_price_session', data.session.access_token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7 }); return response;
}
