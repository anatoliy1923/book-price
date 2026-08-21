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

// Bookmark icon SVG
function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="18" height="22" viewBox="0 0 18 22" fill="none">
      {filled ? (
        <path
          d="M3 1h12a2 2 0 0 1 2 2v17l-8-4-8 4V3a2 2 0 0 1 2-2z"
          fill="#0071E3"
        />
      ) : (
        <path
          d="M3 1h12a2 2 0 0 1 2 2v17l-8-4-8 4V3a2 2 0 0 1 2-2z"
          stroke="#0071E3"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
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
    <div
      style={{
        background: '#F5F5F7',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '16px',
      }}
    >
      {/* Header: title + bookmark */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '4px',
          gap: '12px',
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: '17px',
              fontWeight: 600,
              color: '#1D1D1F',
              letterSpacing: '-0.2px',
              lineHeight: 1.3,
            }}
          >
            {result.title}
          </h2>
          {result.author && (
            <p
              style={{
                margin: '3px 0 0',
                fontSize: '13px',
                color: '#6E6E73',
              }}
            >
              {result.author}
            </p>
          )}
          {bestPrice !== null && (
            <p
              style={{
                margin: '6px 0 0',
                fontSize: '13px',
                color: '#6E6E73',
              }}
            >
              Найкраща ціна:{' '}
              <span style={{ color: '#1D1D1F', fontWeight: 500 }}>
                {bestPrice.toLocaleString('uk-UA')} грн
              </span>
            </p>
          )}
        </div>
        <button
          onClick={onToggleWatch}
          title={isWatched ? 'Прибрати з відстеження' : 'Додати до відстеження'}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            flexShrink: 0,
            lineHeight: 0,
          }}
        >
          <BookmarkIcon filled={isWatched} />
        </button>
      </div>

      {/* Divider */}
      <div
        style={{
          height: '1px',
          background: '#D2D2D7',
          margin: '16px 0',
        }}
      />

      {/* Price rows */}
      {result.prices.length === 0 ? (
        <p style={{ fontSize: '15px', color: '#6E6E73', margin: 0 }}>
          Жодного результату не знайдено
        </p>
      ) : (
        <div>
          {result.prices.map((item) => (
            <PriceRow
              key={item.domain}
              item={item}
              isBest={item.price === bestPrice && item.available}
            />
          ))}
        </div>
      )}

      {/* Footer: cache timestamp + refresh */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '16px',
          paddingTop: '12px',
          borderTop: '1px solid #D2D2D7',
        }}
      >
        <span style={{ fontSize: '13px', color: '#AEAEB2' }}>
          Оновлено {timeAgo(result.cachedAt)}
        </span>
        <button
          onClick={onRefresh}
          disabled={refreshing}
          style={{
            background: 'none',
            border: 'none',
            cursor: refreshing ? 'default' : 'pointer',
            fontSize: '13px',
            color: refreshing ? '#AEAEB2' : '#0071E3',
            padding: 0,
            fontFamily: 'inherit',
          }}
        >
          {refreshing ? 'Оновлення...' : 'Оновити'}
        </button>
      </div>
    </div>
  );
}
