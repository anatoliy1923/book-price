import { AppRole } from './auth';
import { supabaseAdmin } from './supabase-server';

const SEARCH_LIMITS: Record<AppRole, { monthly: number; daily: number }> = {
  free: { monthly: 20, daily: 2 },
  plus: { monthly: 60, daily: 5 },
  admin: { monthly: 10_000, daily: 100 },
};

export async function consumeSearchQuota(userId: string, role: AppRole) {
  const limit = SEARCH_LIMITS[role];
  const { data, error } = await supabaseAdmin.rpc('consume_search_quota', {
    p_user_id: userId, p_monthly_limit: limit.monthly, p_daily_limit: limit.daily,
  });
  if (error) throw error;
  return data as { allowed: boolean; remaining: number; reset_at: string };
}

export async function rateLimit(subject: string, action: string, windowSeconds: number, limit: number) {
  const { data, error } = await supabaseAdmin.rpc('consume_rate_limit', {
    p_subject: subject, p_action: action, p_window_seconds: windowSeconds, p_limit: limit,
  });
  if (error) throw error;
  return Boolean(data);
}

export function clientIp(headers: Headers) {
  return headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}
