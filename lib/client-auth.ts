'use client';

/** Authentication is cookie-based. No Supabase key is shipped to the browser. */
export async function authHeaders(): Promise<Record<string, string>> { return {}; }
