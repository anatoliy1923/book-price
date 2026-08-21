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
          className="w-full h-14 pl-5 pr-14 text-[17px] bg-white border border-gray-200 rounded-2xl shadow-sm outline-none transition-all focus:border-vivat focus:ring-4 focus:ring-vivat/10 disabled:opacity-50 placeholder:text-gray-400"
        />
        <button
          type="submit"
          disabled={loading || query.trim().length < 2}
          className="absolute right-2 top-2 bottom-2 w-10 flex items-center justify-center rounded-xl bg-vivat text-white transition-transform active:scale-95 disabled:bg-gray-300 disabled:active:scale-100 disabled:cursor-not-allowed hover:bg-vivat-dark"
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
          className="text-[13px] text-gray-500 hover:text-vivat transition-colors flex items-center gap-1 w-max"
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
              className="w-full h-11 pl-4 pr-4 text-[15px] bg-white/50 border border-gray-200 rounded-xl outline-none transition-all focus:border-vivat focus:bg-white disabled:opacity-50 placeholder:text-gray-400"
            />
          </div>
        )}
      </div>
    </form>
  );
}
