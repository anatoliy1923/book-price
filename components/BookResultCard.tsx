'use client';

import { useState } from 'react';
import type { BookSearchResult } from '@/lib/tavily';
import PriceRow from './PriceRow';

interface BookResultCardProps {
  result: BookSearchResult;
  isWatched: boolean;
  onToggleWatch: () => void;
  onRefresh: () => void;
  refreshing?: boolean;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);

  if (minutes < 1) return 'щойно';
  if (minutes < 60) return `${minutes} хв тому`;
  if (hours < 24) return `${hours} год тому`;
  return `${Math.floor(hours / 24)} дн тому`;
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="20" height="24" viewBox="0 0 18 22" fill="none" className="transition-transform active:scale-90">
      {filled ? (
        <path d="M3 1h12a2 2 0 0 1 2 2v17l-8-4-8 4V3a2 2 0 0 1 2-2z" fill="#E3A857" />
      ) : (
        <path d="M3 1h12a2 2 0 0 1 2 2v17l-8-4-8 4V3a2 2 0 0 1 2-2z" stroke="#13543A" strokeWidth="1.5" strokeLinejoin="round" />
      )}
    </svg>
  );
}

export default function BookResultCard({
  result,
  isWatched,
  onToggleWatch,
  onRefresh,
  refreshing,
}: BookResultCardProps) {
  const availablePrices = result.prices
    .filter((p) => p.available && p.price !== null)
    .map((p) => p.price as number);
  const bestPrice = availablePrices.length > 0 ? Math.min(...availablePrices) : null;

  return (
    <div className="mb-5 border-y border-vivat-light bg-white px-4 py-5 sm:rounded-2xl sm:border sm:p-6">
      {/* Header */}
      <div className="flex justify-between items-start gap-4 mb-4">
        <div>
          <h2 className="font-book text-[26px] font-bold leading-[1.04] tracking-[-0.035em] text-foreground">
            {result.title}
          </h2>
          {result.author && (
            <p className="text-[15px] text-gray-500">
              {result.author}
            </p>
          )}
        </div>
        <button
          onClick={onToggleWatch}
          className="p-1 -m-1"
          aria-label={isWatched ? 'Видалити з відстеження' : 'Додати до відстеження'}
        >
          <BookmarkIcon filled={isWatched} />
        </button>
      </div>

      <div className="h-px bg-vivat-light my-4" />

      {/* Prices List */}
      {result.prices.length === 0 ? (
        <p className="text-[15px] text-gray-500 my-4">
          Жодної ціни не знайдено
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          {result.prices.map((price, idx) => (
            <PriceRow
              key={`${price.domain}-${idx}`}
              item={price}
              isBest={price.price === bestPrice && bestPrice !== null}
            />
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-vivat-light">
        <div className="flex flex-wrap justify-between gap-x-4 gap-y-2 items-center">
          <span className="text-[13px] text-gray-400">
            Оновлено {timeAgo(result.cachedAt)}
          </span>
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className={`text-[13px] font-medium transition-colors ${
              refreshing ? 'text-gray-400 cursor-default' : 'text-vivat hover:text-vivat-dark'
            }`}
          >
            {refreshing ? 'Оновлення...' : 'Оновити'}
          </button>
        </div>

      </div>
    </div>
  );
}
