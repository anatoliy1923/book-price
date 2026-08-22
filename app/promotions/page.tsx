'use client';

import { useState, useEffect } from 'react';
import type { Promo } from '@/lib/promotions';
import Skeleton from '@/components/Skeleton';
import { authHeaders } from '@/lib/client-auth';

export default function PromotionsPage() {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [canRefresh, setCanRefresh] = useState(false);

  const fetchPromos = async (force: boolean = false) => {
    try {
      if (force) setRefreshing(true);
      const res = await fetch(`/api/promotions${force ? '?force=true' : ''}`, { headers: await authHeaders() });
      const data = await res.json();
      if (data.promos) {
        setPromos(data.promos);
        setCheckedAt(data.checkedAt || null);
        setCanRefresh(Boolean(data.canRefresh));
      } else {
        setError('Не вдалося завантажити акції');
      }
    } catch (err) {
      setError('Помилка з\'єднання');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPromos();
  }, []);

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex justify-between items-start gap-4 border-b border-vivat-light pb-6">
        <div className="min-w-0"><p className="mb-2 text-[11px] font-bold uppercase tracking-[0.13em] text-vivat-accent">Добірка пропозицій</p><h1 className="text-[32px] font-bold leading-none tracking-tight text-vivat-dark sm:text-[46px]">Акції</h1></div>
        {canRefresh && <button
          onClick={() => fetchPromos(true)}
          disabled={loading || refreshing}
          className={`shrink-0 rounded-lg border border-vivat-light bg-white px-2.5 py-2 text-[12px] font-semibold text-vivat-dark transition-all flex items-center gap-1.5 sm:px-3 sm:text-[13px] ${
            (loading || refreshing) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-vivat/20 active:scale-95'
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={refreshing ? 'animate-spin' : ''}>
            <polyline points="23 4 23 10 17 10"></polyline>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
          </svg>
          {refreshing ? 'Оновлення...' : 'Оновити'}
        </button>}
      </div>
      
      <p className="mb-8 mt-5 max-w-md text-[15px] leading-6 text-gray-500">
        Актуальні пропозиції Vivat, КСД, Readeat, Лабораторії, Сенсу та Megogo — з сайтів і публічних каналів магазинів.
      </p>

      {(loading || refreshing) && promos.length === 0 && (
        <div className="mt-8">
          <Skeleton count={3} />
        </div>
      )}

      {error && !loading && (
        <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-2xl">
          <p className="text-[15px] text-red-600 font-medium">{error}</p>
        </div>
      )}

      {!loading && !error && promos.length === 0 && (
        <div className="mt-12 text-center text-gray-400">
          <p className="text-[15px]">Наразі глобальних акцій не знайдено.</p>
        </div>
      )}

      {promos.length > 0 && (
        <div className={`grid gap-4 mt-6 transition-opacity duration-300 ${refreshing ? 'opacity-50' : 'opacity-100'}`}>
          {promos.map((promo, idx) => (
            <a
              key={idx}
              href={promo.url}
              target="_blank"
              rel="noopener noreferrer"
            className="group relative block overflow-hidden border-y border-vivat-light bg-white p-4 transition-colors hover:bg-vivat-light/35 sm:rounded-2xl sm:border sm:p-5"
            >
              <div className="absolute right-0 top-0 max-w-[48%] truncate rounded-bl-xl bg-vivat-accent/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.1em] text-vivat-accent sm:max-w-[55%] sm:px-3 sm:text-[11px]">
                {promo.kind === 'event' ? 'Подія' : promo.kind === 'news' ? 'Новини' : promo.store}
              </div>
              <h2 className="mb-2 pr-16 text-[22px] font-bold leading-[1.12] tracking-tight text-foreground transition-colors group-hover:text-vivat sm:text-[25px]">
                {promo.title}
              </h2>
              <p className="line-clamp-3 text-[14px] leading-6 text-gray-500 sm:line-clamp-2 sm:text-[15px]">
                {promo.description}
              </p>
              <div className="mt-4 text-[13px] font-medium text-vivat-accent flex items-center gap-1">
                Перейти до акції
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
            </a>
          ))}
        </div>
      )}
      {!loading && !error && checkedAt && <p className="mt-7 text-center text-xs text-gray-400">Перевірено {new Date(checkedAt).toLocaleString('uk-UA', { dateStyle: 'short', timeStyle: 'short' })}. Джерела: офіційні сайти, публічні канали та перевірені сторінки акцій.</p>}
    </div>
  );
}
