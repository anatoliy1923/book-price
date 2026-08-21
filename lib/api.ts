import { NextRequest, NextResponse } from 'next/server';
import { clientIp, rateLimit } from './limits';

export async function guard(request: NextRequest, action: string, perMinute: number) {
  const ip = clientIp(request.headers);
  const allowed = await rateLimit(`ip:${ip}`, action, 60, perMinute);
  return allowed ? null : NextResponse.json({ error: 'Забагато запитів. Спробуйте через хвилину.' }, { status: 429 });
}

export async function audit(userId: string | null, action: string, request: NextRequest, metadata: Record<string, unknown> = {}) {
  // Logging must never make the customer-facing operation fail.
  try {
    const { supabaseAdmin } = await import('./supabase-server');
    await supabaseAdmin.from('audit_logs').insert({ user_id: userId, action, ip_hash: clientIp(request.headers), metadata });
  } catch { /* intentionally ignored */ }
}
