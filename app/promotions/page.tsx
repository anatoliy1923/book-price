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

  const fetchPromos = async (force: boolean = false) => {
    try {
      if (force) setRefreshing(true);
      const res = await fetch(`/api/promotions${force ? '?force=true' : ''}`, { headers: await authHeaders() });
      const data = await res.json();
      if (data.promos) {
        setPromos(data.promos);
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
      <div className="flex justify-between items-start mb-2">
        <h1 className="text-[32px] md:text-[36px] font-bold tracking-tight text-vivat-dark">
          Акції та знижки
        </h1>
        <button
          onClick={() => fetchPromos(true)}
          disabled={loading || refreshing}
          className={`text-[13px] bg-vivat-light text-vivat-dark px-3 py-2 rounded-xl transition-all font-medium flex items-center gap-2 ${
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
      
      <p className="text-[15px] text-gray-500 mb-8 max-w-sm">
        Зібрані актуальні пропозиції з твоїх улюблених книгарень: Megogo, Readeat, КСД, Лабораторія, Vivat, Сенс. (Включаючи Instagram/Telegram).
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
              className="block bg-white rounded-2xl p-5 shadow-soft transition-all duration-300 hover:shadow-md border border-vivat-light group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 px-3 py-1 bg-vivat-accent/10 text-vivat-accent font-medium text-[11px] rounded-bl-xl uppercase tracking-wider">
                {promo.store}
              </div>
              <h2 className="text-[19px] font-semibold text-foreground leading-tight tracking-tight mb-2 pr-16 group-hover:text-vivat transition-colors">
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
    </div>
  );
}
