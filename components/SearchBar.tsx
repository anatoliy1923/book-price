'use client';

import { useState } from 'react';

interface SearchBarProps {
  onSearch: (q: string, store: string) => void;
  loading: boolean;
}

export default function SearchBar({ onSearch, loading }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [store, setStore] = useState('');
  const [showStore, setShowStore] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length > 1) {
      onSearch(query.trim(), store.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full mb-6 relative">
      <div className="relative group">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Назва книжки або автор..."
          disabled={loading}
          className="h-14 w-full border border-vivat-light bg-white pl-5 pr-14 text-[16px] shadow-[0_8px_24px_-18px_rgba(10,66,45,0.45)] outline-none transition-all placeholder:text-gray-400 focus:border-vivat disabled:opacity-50 sm:rounded-xl"
        />
        <button
          type="submit"
          disabled={loading || query.trim().length < 2}
          className="absolute bottom-2 right-2 top-2 flex w-10 items-center justify-center rounded-lg bg-vivat text-white transition-colors hover:bg-vivat-dark disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </button>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setShowStore(!showStore)}
          className="inline-flex w-max max-w-full items-center gap-1 text-left text-[13px] leading-5 text-gray-500 transition-colors hover:text-vivat"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${showStore ? 'rotate-90' : ''}`}>
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
          Шукати в конкретному магазині
        </button>

        {showStore && (
          <div className="animate-in fade-in slide-in-from-top-1 duration-200">
            <input
              type="text"
              value={store}
              onChange={(e) => setStore(e.target.value)}
              placeholder="Напр. Сенс, Megogo, Vivat..."
              disabled={loading}
              className="h-11 w-full border border-vivat-light bg-white px-4 text-[15px] outline-none transition-all placeholder:text-gray-400 focus:border-vivat disabled:opacity-50 sm:rounded-lg"
            />
          </div>
        )}
      </div>
    </form>
  );
}
