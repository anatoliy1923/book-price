'use client';

import { useState, useEffect } from 'react';
import type { WatchlistItem } from '@/lib/supabase';
import { authHeaders } from '@/lib/client-auth';

function formatPrice(price: number | null): string {
  if (!price) return '—';
  return price.toLocaleString('uk-UA') + ' грн';
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'ніколи';
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(hours / 24);
  if (hours < 1) return 'щойно';
  if (hours < 24) return `${hours} год тому`;
  return `${days} дн тому`;
}

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    authHeaders().then((headers) => fetch('/api/watchlist', { headers }))
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setItems(data);
        else setError('Помилка завантаження');
      })
      .catch(() => setError('Перевірте підʼєднання до інтернету'))
      .finally(() => setLoading(false));
  }, []);

  const handleRemove = async (id: string) => {
    await fetch(`/api/watchlist/${id}`, { method: 'DELETE', headers: await authHeaders() });
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div>
      <h1
        style={{
          margin: '0 0 32px',
          fontSize: '34px',
          fontWeight: 700,
          letterSpacing: '-0.5px',
          color: '#1D1D1F',
        }}
      >
        Відстеження
      </h1>

      {loading && (
        <p style={{ fontSize: '15px', color: '#AEAEB2' }}>Завантаження...</p>
      )}

      {error && (
        <p style={{ fontSize: '15px', color: '#FF3B30' }}>{error}</p>
      )}

      {!loading && !error && items.length === 0 && (
        <div style={{ marginTop: '48px', textAlign: 'center' }}>
          <p style={{ fontSize: '15px', color: '#6E6E73', margin: '0 0 8px' }}>
            Немає відстежуваних книжок
          </p>
          <p style={{ fontSize: '13px', color: '#AEAEB2', margin: 0 }}>
            Знайдіть книжку та збережіть її для відстеження цін
          </p>
        </div>
      )}

      {items.length > 0 && (
        <div>
          {items.map((item, index) => (
            <div key={item.id}>
              {index > 0 && (
                <div
                  style={{
                    height: '1px',
                    background: '#F5F5F7',
                    margin: '0 0 0 0',
                  }}
                />
              )}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '14px 0',
                  borderBottom: '1px solid #F5F5F7',
                }}
              >
                {/* Book info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '15px',
                      fontWeight: 500,
                      color: '#1D1D1F',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.title}
                  </p>
                  {item.author && (
                    <p
                      style={{
                        margin: '2px 0 0',
                        fontSize: '13px',
                        color: '#6E6E73',
                      }}
                    >
                      {item.author}
                    </p>
                  )}
                  <p
                    style={{
                      margin: '4px 0 0',
                      fontSize: '13px',
                      color: '#AEAEB2',
                    }}
                  >
                    Перевірено {timeAgo(item.last_checked)}
                  </p>
                </div>

                {/* Price */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '15px',
                      fontWeight: 500,
                      color: '#1D1D1F',
                    }}
                  >
                    {formatPrice(item.last_price)}
                  </p>
                  <p
                    style={{
                      margin: '2px 0 0',
                      fontSize: '13px',
                      color: '#AEAEB2',
                    }}
                  >
                    найкраща
                  </p>
                </div>

                {/* Remove button */}
                <button
                  onClick={() => handleRemove(item.id)}
                  title="Прибрати"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    color: '#AEAEB2',
                    lineHeight: 0,
                    flexShrink: 0,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M12 4L4 12M4 4l8 8"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))}

          <p
            style={{
              marginTop: '24px',
              fontSize: '13px',
              color: '#AEAEB2',
              textAlign: 'center',
            }}
          >
            Ціни оновлюються автоматично щодня о 9:00
          </p>
        </div>
      )}
    </div>
  );
}
