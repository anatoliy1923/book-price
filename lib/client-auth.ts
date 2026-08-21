'use client';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | undefined;
function getClient(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Public Supabase configuration is missing.');
  client = createClient(url, key);
  return client;
}

// Defer creation until the browser uses authentication; Next can then prerender safely.
export const browserSupabase = new Proxy({} as SupabaseClient, {
  get(_target, property) {
    const value = Reflect.get(getClient(), property);
    return typeof value === 'function' ? value.bind(getClient()) : value;
  },
});

export async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await browserSupabase.auth.getSession();
  return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
}
