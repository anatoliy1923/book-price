import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';
import { audit, guard } from '@/lib/api';

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req); if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  const [{ data: profiles, error: profileError }, { data: authData, error: authError }] = await Promise.all([
    supabaseAdmin.from('profiles').select('id,email,role,created_at').limit(200),
    supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 }),
  ]);
  if (profileError || authError) return NextResponse.json({ error: 'Failed to load accounts' }, { status: 500 });

  const profileIds = new Set((profiles || []).map((profile) => profile.id));
  const missingProfiles = (authData.users || []).flatMap((user) => user.email && !profileIds.has(user.id) ? [{ id: user.id, email: user.email }] : []);
  if (missingProfiles.length) {
    // This is a safe, one-way backfill for users created before the auth trigger existed.
    await supabaseAdmin.from('profiles').upsert(missingProfiles, { onConflict: 'id', ignoreDuplicates: true });
    await audit(admin.id, 'admin.profiles_backfilled', req, { count: missingProfiles.length });
  }

  const profileById = new Map((profiles || []).map((profile) => [profile.id, profile]));
  const users = (authData.users || []).flatMap((user) => {
    if (!user.email) return [];
    const profile = profileById.get(user.id);
    return [{ id: user.id, email: user.email, role: profile?.role === 'plus' || profile?.role === 'admin' ? profile.role : 'free', created_at: profile?.created_at || user.created_at }];
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return NextResponse.json(users);
}
export async function PATCH(req: NextRequest) {
  const blocked = await guard(req, 'admin-users', 20); if (blocked) return blocked;
  const admin = await requireAdmin(req); if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  const body = await req.json(); const role = body.role;
  if (typeof body.userId !== 'string' || !['free','plus','admin'].includes(role)) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  const { error } = await supabaseAdmin.from('profiles').update({ role, updated_at: new Date().toISOString() }).eq('id', body.userId);
  if (error) return NextResponse.json({ error: 'Failed' }, { status: 500 });
  await audit(admin.id, 'admin.role_changed', req, { targetUserId: body.userId, role });
  return NextResponse.json({ success: true });
}
