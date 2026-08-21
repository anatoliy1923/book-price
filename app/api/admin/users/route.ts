import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';
import { audit, guard } from '@/lib/api';

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req); if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  const { data, error } = await supabaseAdmin.from('profiles').select('id,email,role,created_at').order('created_at', { ascending: false }).limit(200);
  return error ? NextResponse.json({ error: 'Failed' }, { status: 500 }) : NextResponse.json(data);
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
