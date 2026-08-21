import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRole) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required on the server');
}

/** Server-only client. Never import this module from a Client Component. */
export const supabaseAdmin = createClient(url, serviceRole, {
  auth: { autoRefreshToken: false, persistSession: false },
});
