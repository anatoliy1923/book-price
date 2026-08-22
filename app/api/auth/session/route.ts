import { NextRequest, NextResponse } from 'next/server';
import { getRole, requireUser } from '@/lib/auth';
import { SEARCH_LIMITS } from '@/lib/limits';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ authenticated: false });

  const role = await getRole(user.id);
  const [{ data: profile }, { data: usage }] = await Promise.all([
    supabaseAdmin.from('profiles').select('created_at').eq('id', user.id).maybeSingle(),
    supabaseAdmin.from('search_usage').select('month_count,day_count,month_start').eq('user_id', user.id).maybeSingle(),
  ]);
  const username = typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim()
    ? user.user_metadata.full_name.trim()
    : (user.email || '').split('@')[0] || 'Користувач';
  const limit = SEARCH_LIMITS[role];

  return NextResponse.json({
    authenticated: true,
    email: user.email || null,
    username,
    role,
    createdAt: profile?.created_at || user.created_at || null,
    quota: {
      dailyUsed: usage?.day_count || 0,
      dailyLimit: limit.daily,
      monthlyUsed: usage?.month_count || 0,
      monthlyLimit: limit.monthly,
    },
  });
}
