'use client';

import { useState, useRef, KeyboardEvent } from 'react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  loading?: boolean;
}

export default function SearchBar({ onSearch, loading }: SearchBarProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    const q = value.trim();
    if (q.length >= 2) onSearch(q);
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKey}
        placeholder="Назва книжки або автор..."
        disabled={loading}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        style={{
          flex: 1,
          height: '48px',
          padding: '0 16px',
          fontSize: '17px',
          color: '#1D1D1F',
          background: '#ffffff',
          border: '1px solid #D2D2D7',
          borderRadius: '10px',
          outline: 'none',
          transition: 'border-color 0.15s',
        }}
        onFocus={(e) => (e.target.style.borderColor = '#0071E3')}
        onBlur={(e) => (e.target.style.borderColor = '#D2D2D7')}
      />
      <button
        onClick={handleSubmit}
        disabled={loading || value.trim().length < 2}
        style={{
          height: '48px',
          padding: '0 20px',
          fontSize: '15px',
          fontWeight: 500,
          color: '#ffffff',
          background: loading ? '#AEAEB2' : '#0071E3',
          border: 'none',
          borderRadius: '10px',
          cursor: loading ? 'default' : 'pointer',
          whiteSpace: 'nowrap',
          transition: 'background 0.15s',
          fontFamily: 'inherit',
        }}
      >
        {loading ? 'Пошук...' : 'Знайти'}
      </button>
    </div>
  );
}
