import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireUser } from '@/lib/auth';
import { guard } from '@/lib/api';

export async function POST(req: NextRequest) {
  try {
    const blocked = await guard(req, 'subscribe', 5); if (blocked) return blocked;
    const user = await requireUser(req); if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const subscription = await req.json();

    if (!subscription || typeof subscription.endpoint !== 'string' || subscription.endpoint.length > 2048) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
    }

    await supabaseAdmin.from('push_subscriptions').delete().eq('user_id', user.id).eq('subscription->>endpoint', subscription.endpoint);
    const { error } = await supabaseAdmin.from('push_subscriptions').insert([{ subscription, user_id: user.id }]);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[/api/subscribe]', err);
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
  }
}
