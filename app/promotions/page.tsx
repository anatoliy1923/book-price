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

  const fetchPromos = async (force: boolean = false) => {
    try {
      if (force) setRefreshing(true);
      const res = await fetch(`/api/promotions${force ? '?force=true' : ''}`, { headers: await authHeaders() });
      const data = await res.json();
      if (data.promos) {
        setPromos(data.promos);
        setCheckedAt(data.checkedAt || null);
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
        <div><p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-vivat-accent">Добірка пропозицій</p><h1 className="font-book text-[40px] leading-none tracking-[-0.05em] text-vivat-dark sm:text-[46px]">Акції</h1></div>
        <button
          onClick={() => fetchPromos(true)}
          disabled={loading || refreshing}
          className={`shrink-0 rounded-lg border border-vivat-light bg-white px-3 py-2 text-[13px] font-semibold text-vivat-dark transition-all flex items-center gap-2 ${
            (loading || refreshing) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-vivat/20 active:scale-95'
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={refreshing ? 'animate-spin' : ''}>
            <polyline points="23 4 23 10 17 10"></polyline>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
          </svg>
          {refreshing ? 'Оновлення...' : 'Оновити'}
        </button>
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
            className="group relative block border-y border-vivat-light bg-white p-5 transition-colors hover:bg-vivat-light/35 sm:rounded-2xl sm:border"
            >
              <div className="absolute top-0 right-0 px-3 py-1 bg-vivat-accent/10 text-vivat-accent font-medium text-[11px] rounded-bl-xl uppercase tracking-wider">
                {promo.kind === 'event' ? 'Подія' : promo.kind === 'news' ? 'Новини' : promo.store}
              </div>
              <h2 className="font-book text-[25px] font-bold leading-[1.05] tracking-[-0.03em] text-foreground mb-2 pr-16 group-hover:text-vivat transition-colors">
                {promo.title}
              </h2>
              <p className="text-[15px] text-gray-500 line-clamp-2">
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
      {!loading && !error && checkedAt && <p className="mt-7 text-center text-xs text-gray-400">Перевірено {new Date(checkedAt).toLocaleString('uk-UA', { dateStyle: 'short', timeStyle: 'short' })}. Джерела: офіційні сайти та публічні канали.</p>}
    </div>
  );
}
