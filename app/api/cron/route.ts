import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { searchBookPrices } from '@/lib/tavily';

export async function GET(req: NextRequest) {
  // Verify secret to prevent unauthorized access
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: items, error } = await supabase
    .from('watchlist')
    .select('*');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!items || items.length === 0) {
    return NextResponse.json({ checked: 0, priceDrops: [] });
  }

  const priceDrops: Array<{ title: string; oldPrice: number; newPrice: number }> = [];

  for (const item of items) {
    try {
      const result = await searchBookPrices(item.query);
      const availablePrices = result.prices
        .filter((p) => p.available && p.price !== null)
        .map((p) => p.price as number);

      if (availablePrices.length === 0) continue;

      const bestPrice = Math.min(...availablePrices);

      // Check for price drop (more than 5%)
      if (item.last_price && bestPrice < item.last_price * 0.95) {
        priceDrops.push({
          title: item.title,
          oldPrice: item.last_price,
          newPrice: bestPrice,
        });
      }

      // Update last_price and last_checked
      await supabase
        .from('watchlist')
        .update({
          last_price: bestPrice,
          last_checked: new Date().toISOString(),
        })
        .eq('id', item.id);

      // Also update cache
      await supabase.from('price_cache').upsert(
        {
          query: item.query.toLowerCase().trim(),
          results: result,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'query' }
      );
    } catch (err) {
      console.error(`[cron] Failed to check "${item.title}":`, err);
    }
  }

  return NextResponse.json({
    checked: items.length,
    priceDrops,
    timestamp: new Date().toISOString(),
  });
}
