'use client';

import { useState, useCallback, useEffect } from 'react';
import SearchBar from '@/components/SearchBar';
import BookResultCard from '@/components/BookResultCard';
import Skeleton from '@/components/Skeleton';
import type { BookSearchResult } from '@/lib/tavily';
import { authHeaders } from '@/lib/client-auth';

type WatchedMap = Record<string, boolean>;

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [result, setResult] = useState<(BookSearchResult & { fromCache?: boolean, _storeInput?: string }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [watched, setWatched] = useState<WatchedMap>({});
  
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [pushEnabled, setPushEnabled] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.register('/sw.js').then(reg => {
        reg.pushManager.getSubscription().then(sub => {
          if (sub) setPushEnabled(true);
        });
      });
    }
  }, []);

  const subscribeToPush = async () => {
    if (!VAPID_PUBLIC_KEY) {
      alert("VAPID ключ не налаштовано!");
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });
        
        await fetch('/api/subscribe', {
          method: 'POST',
          body: JSON.stringify(sub), headers: { 'Content-Type': 'application/json', ...(await authHeaders()) }
        });
        
        setPushEnabled(true);
        alert("Сповіщення успішно увімкнено!");
      }
    } catch (e) {
      console.error(e);
      alert("Не вдалось увімкнути сповіщення.");
    }
  };

  const doSearch = useCallback(async (query: string, store: string = '', forceRefresh = false) => {
    setError(null);
    if (forceRefresh) setRefreshing(true);
    else setLoading(true);

    setProgress(15);
    setStatusText('Нормалізація запиту через ШІ...');

    const texts = [
      'Шукаємо в книгарнях...',
      'Завантажуємо сторінки...',
      'ШІ перевіряє наявність та ціни...',
      'Формуємо результати...'
    ];
    let step = 0;
    const interval = setInterval(() => {
      setProgress(p => (p < 90 ? p + Math.random() * 10 : p));
      step++;
      if (step < texts.length) setStatusText(texts[step]);
    }, 2500);

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        body: JSON.stringify({ query, store, forceRefresh }), headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Сталася помилка');
        return;
      }

      setResult({ ...data, _storeInput: store });
    } catch {
      setError('Перевірте підʼєднання до інтернету');
    } finally {
      clearInterval(interval);
      setProgress(100);
      setTimeout(() => {
        setProgress(0);
        setLoading(false);
        setRefreshing(false);
        setStatusText('');
      }, 400);
    }
  }, []);

  const handleSearch = (query: string, store: string) => {
    setResult(null);
    doSearch(query, store);
  };

  const handleRefresh = () => {
    if (result) doSearch(result.query, result._storeInput || '', true);
  };

  const handleToggleWatch = async () => {
    if (!result) return;
    const key = result.query;
    const isWatched = watched[key];
    setWatched((prev) => ({ ...prev, [key]: !isWatched }));

    try {
      if (isWatched) {
        await fetch('/api/watchlist', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
          body: JSON.stringify({ query: result.query }),
        });
      } else {
        const prices = result.prices.filter((p) => p.price !== null && p.available);
        const bestPrice = prices.length > 0 ? Math.min(...prices.map((p) => p.price!)) : null;

        await fetch('/api/watchlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
          body: JSON.stringify({
            title: result.title,
            author: result.author,
            query: result.query,
            last_price: bestPrice,
          }),
        });
      }
    } catch {
      setWatched((prev) => ({ ...prev, [key]: isWatched }));
    }
  };

  return (
    <div className="animate-in fade-in duration-500">
      {progress > 0 && (
        <div
          className="fixed top-0 left-0 h-[3px] bg-vivat-accent z-[9999] transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      )}

      <div className="flex justify-between items-start gap-3 border-b border-vivat-light pb-6">
        <div><p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-vivat-accent">Порівняння цін</p><h1 className="font-book text-[40px] leading-none tracking-[-0.05em] text-vivat-dark sm:text-[46px]">Знайти книжку</h1></div>
        {typeof window !== 'undefined' && 'PushManager' in window && !pushEnabled && (
          <button 
            onClick={subscribeToPush}
            className="shrink-0 rounded-lg border border-vivat-light bg-white px-3 py-2 text-[12px] font-semibold text-vivat-dark transition hover:bg-vivat-light"
          >
            Увімкнути сповіщення
          </button>
        )}
      </div>

      <p className="mb-8 mt-5 max-w-md text-[15px] leading-6 text-gray-500">
        Введіть назву або автора. Ми зберемо актуальні пропозиції українських книгарень в одному списку.
      </p>

      <SearchBar onSearch={handleSearch} loading={loading} />

      {loading && (
        <div className="mt-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
          {statusText && (
            <p className="mb-4 text-[15px] text-vivat font-medium flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-vivat/30 border-t-vivat rounded-full animate-spin"></span>
              {statusText}
            </p>
          )}
          <Skeleton count={2} />
        </div>
      )}

      {error && !loading && (
        <div className="mt-6 border-l-2 border-red-500 bg-red-50/60 p-4">
          <p className="text-[15px] text-red-600 font-medium">{error}</p>
        </div>
      )}

      {!loading && result && (
        <div className="mt-6 animate-in slide-in-from-bottom-4 fade-in duration-500">
          <BookResultCard
            result={result}
            isWatched={!!watched[result.query]}
            onToggleWatch={handleToggleWatch}
            onRefresh={handleRefresh}
            refreshing={refreshing}
          />
        </div>
      )}

    </div>
  );
}
