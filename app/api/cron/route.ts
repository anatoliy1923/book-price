import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { searchBookPrices } from '@/lib/tavily';
import webpush from 'web-push';

export const maxDuration = 300;

webpush.setVapidDetails(
  'mailto:your-email@example.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
);

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Fetch items that need checking today
    // For simplicity, we fetch all. In a real app we'd filter by 'daily', 'weekly' etc. based on Date.
    const { data: items } = await supabase.from('watchlist').select('*');
    if (!items || items.length === 0) return NextResponse.json({ ok: true, message: 'Empty watchlist' });

    // 2. Fetch all push subscriptions
    const { data: subs } = await supabase.from('push_subscriptions').select('subscription');
    const subscriptions = subs ? subs.map(s => s.subscription) : [];

    let notificationsSent = 0;

    // 3. Check prices sequentially to avoid rate limits
    for (const item of items) {
      try {
        const result = await searchBookPrices(item.query);
        const prices = result.prices.filter((p) => p.price !== null && p.available);
        const bestPrice = prices.length > 0 ? Math.min(...prices.map((p) => p.price!)) : null;

        if (bestPrice !== null) {
          // If price dropped!
          if (item.last_price !== null && bestPrice < item.last_price) {
            
            // Send push notifications
            const payload = JSON.stringify({
              title: '📗 Зниження ціни!',
              body: `"${item.title}" тепер коштує ${bestPrice} грн (було ${item.last_price} грн)`
            });

            for (const sub of subscriptions) {
              try {
                await webpush.sendNotification(sub, payload);
                notificationsSent++;
              } catch (e) {
                console.error('Push error:', e);
              }
            }
          }

          // Update DB
          await supabase
            .from('watchlist')
            .update({ last_price: bestPrice, last_checked: new Date().toISOString() })
            .eq('id', item.id);
        }
      } catch (e) {
        console.error(`Cron error for ${item.query}:`, e);
      }
    }

    return NextResponse.json({ ok: true, checked: items.length, notificationsSent });
  } catch (err) {
    console.error('Cron failed:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
