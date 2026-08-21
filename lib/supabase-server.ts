import { createClient, SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | undefined;

function getClient(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) throw new Error('Server database configuration is missing. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel.');
  client = createClient(url, serviceRole, { auth: { autoRefreshToken: false, persistSession: false } });
  return client;
}

/**
 * Server-only Supabase client. The proxy deliberately creates it only when a request
 * uses it, allowing Next/Vercel to collect route configuration during the build.
 */
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, property) {
    const value = Reflect.get(getClient(), property);
    return typeof value === 'function' ? value.bind(getClient()) : value;
  },
});
