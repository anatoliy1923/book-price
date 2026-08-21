'use client';
import { createClient } from '@supabase/supabase-js';
export const browserSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
export async function authHeaders(): Promise<Record<string, string>> { const { data } = await browserSupabase.auth.getSession(); return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {}; }
