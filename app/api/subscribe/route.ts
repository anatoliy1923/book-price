import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const subscription = await req.json();

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
    }

    // Upsert the subscription (in a real app we'd use upsert, but here we just insert and ignore duplicates if we had a unique constraint. Since it's personal, we just insert).
    // Let's delete existing exact matches first to prevent spam
    await supabase.from('push_subscriptions').delete().eq('subscription->>endpoint', subscription.endpoint);
    
    const { error } = await supabase.from('push_subscriptions').insert([{ subscription }]);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[/api/subscribe]', err);
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
  }
}
