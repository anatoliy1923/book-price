'use client';

import { useState, useCallback } from 'react';
import SearchBar from '@/components/SearchBar';
import BookResultCard from '@/components/BookResultCard';
import Skeleton from '@/components/Skeleton';
import type { BookSearchResult } from '@/lib/tavily';

type WatchedMap = Record<string, boolean>;

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [result, setResult] = useState<(BookSearchResult & { fromCache?: boolean }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [watched, setWatched] = useState<WatchedMap>({});

  const doSearch = useCallback(async (query: string, forceRefresh = false) => {
    setError(null);
    if (forceRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, forceRefresh }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Сталася помилка');
        return;
      }

      setResult(data);
    } catch {
      setError('Перевірте підʼєднання до інтернету');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleSearch = (query: string) => {
    setResult(null);
    doSearch(query);
  };

  const handleRefresh = () => {
    if (result) doSearch(result.query, true);
  };

  const handleToggleWatch = async () => {
    if (!result) return;

    const key = result.query;
    const isWatched = watched[key];

    if (isWatched) {
      // Remove from watchlist - would need to store the ID
      // For simplicity, just toggle local state
      setWatched((prev) => ({ ...prev, [key]: false }));
    } else {
      const bestPrice = result.prices
        .filter((p) => p.available && p.price !== null)
        .map((p) => p.price as number)
        .sort((a, b) => a - b)[0] || null;

      try {
        const res = await fetch('/api/watchlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: result.title,
            author: result.author || null,
            query: result.query,
            last_price: bestPrice,
          }),
        });
        if (res.ok) {
          setWatched((prev) => ({ ...prev, [key]: true }));
        }
      } catch {
        // Silently fail
      }
    }
  };

  return (
    <div>
      {/* Page title */}
      <h1
        style={{
          margin: '0 0 24px',
          fontSize: '34px',
          fontWeight: 700,
          letterSpacing: '-0.5px',
          color: '#1D1D1F',
        }}
      >
        Ціни на книжки
      </h1>

      {/* Search */}
      <SearchBar onSearch={handleSearch} loading={loading} />

      {/* Subtitle */}
      <p
        style={{
          margin: '10px 0 32px',
          fontSize: '13px',
          color: '#AEAEB2',
        }}
      >
        Порівнюємо ціни на Yakaboo, BookChef, Book.ua, Vivat та інших
      </p>

      {/* States */}
      {loading && <Skeleton count={2} />}

      {error && !loading && (
        <p
          style={{
            fontSize: '15px',
            color: '#FF3B30',
            marginTop: '24px',
          }}
        >
          {error}
        </p>
      )}

      {result && !loading && (
        <BookResultCard
          result={result}
          isWatched={watched[result.query] || false}
          onToggleWatch={handleToggleWatch}
          onRefresh={handleRefresh}
          refreshing={refreshing}
        />
      )}

      {!result && !loading && !error && (
        <div
          style={{
            marginTop: '64px',
            textAlign: 'center',
            color: '#AEAEB2',
          }}
        >
          <p style={{ fontSize: '15px', margin: 0 }}>
            Введіть назву книжки щоб знайти найкращу ціну
          </p>
        </div>
      )}
    </div>
  );
}
