'use client';

import { FormEvent, ReactNode, useEffect, useState } from 'react';

type Mode = 'sign-in' | 'sign-up';

function signUpError(message: string) {
  const value = message.toLowerCase();
  if (value.includes('email rate limit')) return 'Забагато листів підтвердження. Зачекайте кілька хвилин.';
  if (value.includes('email') && (value.includes('send') || value.includes('smtp'))) return 'Не вдалося надіслати лист підтвердження. Перевірте Email provider / SMTP у Supabase.';
  if (value.includes('password')) return `Пароль відхилено: ${message}`;
  return `Помилка реєстрації: ${message}`;
}

export default function AuthGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState<boolean | null>(null);
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  useEffect(() => { fetch('/api/auth/session').then((response) => response.json()).then((data) => setReady(Boolean(data.authenticated))).catch(() => setReady(false)); }, []);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(''); setNotice('');
    if (mode === 'sign-up' && password.length < 8) { setError('Пароль має містити щонайменше 8 символів.'); return; }
    setPending(true);
    try {
      const response = await fetch(`/api/auth/${mode === 'sign-up' ? 'sign-up' : 'sign-in'}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      const data = await response.json();
      if (!response.ok) { setError(mode === 'sign-up' ? signUpError(data.error || 'Unknown error') : 'Неправильний email або пароль.'); return; }
      if (data.requiresConfirmation) { setNotice('Акаунт створено. Підтвердьте email у листі, щоб увійти.'); return; }
      setReady(true);
    } catch { setError('Не вдалося підключитися. Спробуйте ще раз.'); } finally { setPending(false); }
  };

  if (ready) return <>{children}</>;
  if (ready === null) return <main className="min-h-[calc(100vh-60px)] w-full max-w-[680px] mx-auto px-4 sm:px-5 py-16" />;

  return <main className="flex min-h-[calc(100vh-60px)] w-full min-w-0 max-w-[680px] mx-auto items-center px-4 py-12 sm:px-5 sm:py-16"><section className="w-full min-w-0 border-y border-vivat-light bg-white px-1 py-7 sm:rounded-2xl sm:border sm:p-8 md:p-10"><h1 className="text-[32px] font-bold tracking-tight text-vivat-dark sm:text-[38px]">Порівнюйте ціни на книжки</h1><p className="mt-5 max-w-md text-[15px] leading-6 text-gray-500">Увійдіть, щоб порівнювати пропозиції, відстежувати ціни та зберігати книжки.</p><div className="mt-8 grid grid-cols-2 border-b border-vivat-light">{([{ key: 'sign-in', label: 'Увійти' }, { key: 'sign-up', label: 'Створити акаунт' }] as const).map((tab) => <button type="button" key={tab.key} onClick={() => { setMode(tab.key); setError(''); setNotice(''); }} className={`min-w-0 border-b-2 px-2 pb-3 text-center text-sm font-semibold transition-colors ${mode === tab.key ? 'border-vivat text-vivat-dark' : 'border-transparent text-gray-400 hover:text-vivat'}`}>{tab.label}</button>)}</div><form onSubmit={submit} className="mt-6 space-y-5"><label className="block text-sm font-medium text-vivat-dark">Email<input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 w-full min-w-0 rounded-xl border border-gray-200 bg-background px-4 py-3 outline-none transition focus:border-vivat focus:bg-white" placeholder="you@example.com" /></label><label className="block text-sm font-medium text-vivat-dark">Пароль<input required minLength={mode === 'sign-up' ? 8 : undefined} type="password" autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 w-full min-w-0 rounded-xl border border-gray-200 bg-background px-4 py-3 outline-none transition focus:border-vivat focus:bg-white" placeholder={mode === 'sign-up' ? 'Щонайменше 8 символів' : 'Ваш пароль'} /></label>{error && <p className="break-words border-l-2 border-red-500 pl-3 text-sm leading-5 text-red-700">{error}</p>}{notice && <p className="border-l-2 border-vivat-accent bg-vivat-light/50 p-4 text-sm leading-5 text-vivat-dark">{notice}</p>}<button disabled={pending} className="w-full rounded-xl bg-vivat px-4 py-3 font-semibold text-white transition hover:bg-vivat-dark disabled:opacity-60">{pending ? 'Зачекайте…' : mode === 'sign-up' ? 'Створити акаунт' : 'Увійти'}</button></form><p className="mt-6 text-xs leading-5 text-gray-400">Безкоштовний доступ має ліміт на живі пошуки, щоб сервіс залишався доступним для всіх.</p></section></main>;
}
