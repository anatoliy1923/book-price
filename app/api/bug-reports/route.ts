import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';
import { guard, audit } from '@/lib/api';
export async function POST(req: NextRequest) {
  const blocked = await guard(req, 'bug-report', 3); if (blocked) return blocked;
  const user = await requireUser(req); if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json(); const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (message.length < 10 || message.length > 4000) return NextResponse.json({ error: 'Опишіть проблему щонайменше десятьма символами.' }, { status: 400 });
  const { error } = await supabaseAdmin.from('bug_reports').insert({ user_id: user.id, message, page: typeof body.page === 'string' ? body.page.slice(0, 500) : null });
  if (error) return NextResponse.json({ error: 'Failed' }, { status: 500 }); await audit(user.id, 'bug_report.created', req); return NextResponse.json({ success: true }, { status: 201 });
}
