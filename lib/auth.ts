import { NextRequest } from 'next/server';
import { supabaseAdmin } from './supabase-server';

export type AppRole = 'free' | 'plus' | 'admin';

export async function requireUser(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  return error ? null : user;
}

export async function getRole(userId: string): Promise<AppRole> {
  const { data } = await supabaseAdmin.from('profiles').select('role').eq('id', userId).single();
  return data?.role === 'admin' || data?.role === 'plus' ? data.role : 'free';
}

export async function requireAdmin(request: NextRequest) {
  const user = await requireUser(request);
  if (!user || await getRole(user.id) !== 'admin') return null;
  return user;
}
