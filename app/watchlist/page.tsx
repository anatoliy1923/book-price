'use client';

import { useState, useEffect } from 'react';
import type { WatchlistItem } from '@/lib/supabase';
import { authHeaders } from '@/lib/client-auth';

function formatPrice(price: number | null): string { return price ? `${price.toLocaleString('uk-UA')} ₴` : '—'; }
function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'ще не перевіряли';
  const hours = Math.floor((Date.now() - new Date(dateStr).getTime()) / 3600000);
  if (hours < 1) return 'щойно';
  if (hours < 24) return `${hours} год тому`;
  return `${Math.floor(hours / 24)} дн тому`;
}

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    authHeaders().then((headers) => fetch('/api/watchlist', { headers })).then((response) => response.json()).then((data) => {
      if (Array.isArray(data)) setItems(data); else setError('Не вдалося завантажити відстеження.');
    }).catch(() => setError('Перевірте підʼєднання до інтернету.')).finally(() => setLoading(false));
  }, []);
  const remove = async (id: string) => { await fetch(`/api/watchlist/${id}`, { method: 'DELETE', headers: await authHeaders() }); setItems((current) => current.filter((item) => item.id !== id)); };

  return <div className="animate-in fade-in duration-500"><div className="border-b border-vivat-light pb-6"><p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-vivat-accent">Збережені книжки</p><h1 className="font-book text-[40px] leading-none tracking-[-0.05em] text-vivat-dark sm:text-[46px]">Відстеження</h1></div><p className="mb-8 mt-5 max-w-md text-[15px] leading-6 text-gray-500">Збережіть книжку після пошуку — ми перевірятимемо, чи змінилася її найкраща ціна.</p>{loading && <p className="text-sm text-gray-400">Завантаження…</p>}{error && <p className="border-l-2 border-red-500 bg-red-50/60 p-4 text-sm text-red-700">{error}</p>}{!loading && !error && items.length === 0 && <div className="border-y border-vivat-light py-8"><p className="font-book text-[25px] font-bold tracking-[-0.03em] text-vivat-dark">Тут поки порожньо</p><p className="mt-2 text-sm leading-6 text-gray-500">Знайдіть книжку та натисніть закладку біля результату.</p></div>}{items.length > 0 && <div className="border-t border-vivat-light">{items.map((item) => <article key={item.id} className="flex min-w-0 items-center gap-3 border-b border-vivat-light py-4"><div className="min-w-0 flex-1"><h2 className="truncate text-[16px] font-semibold text-vivat-dark">{item.title}</h2>{item.author && <p className="mt-0.5 truncate text-sm text-gray-500">{item.author}</p>}<p className="mt-2 text-xs text-gray-400">Перевірено {timeAgo(item.last_checked)}</p></div><div className="shrink-0 text-right"><p className="text-[16px] font-semibold tabular-nums text-foreground">{formatPrice(item.last_price)}</p><p className="mt-0.5 text-xs text-gray-400">найкраща ціна</p></div><button type="button" onClick={() => remove(item.id)} aria-label={`Прибрати «${item.title}»`} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-gray-400 transition hover:bg-vivat-light hover:text-vivat-dark"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg></button></article>)}</div>}{items.length > 0 && <p className="mt-6 text-center text-xs leading-5 text-gray-400">Перевірка цін відбувається щодня.</p>}</div>;
}
