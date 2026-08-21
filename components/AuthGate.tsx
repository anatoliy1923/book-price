'use client';
import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { browserSupabase } from '@/lib/client-auth';

type Mode = 'sign-in' | 'sign-up';

function signUpError(message: string) {
  const value = message.toLowerCase();
  if (value.includes('signup is disabled')) return 'Реєстрацію вимкнено в налаштуваннях Supabase Auth.';
  if (value.includes('email rate limit')) return 'Забагато листів підтвердження. Зачекайте кілька хвилин.';
  if (value.includes('email') && (value.includes('send') || value.includes('smtp'))) return 'Supabase не зміг надіслати лист підтвердження. Перевірте Email provider / SMTP у Supabase.';
  if (value.includes('password')) return `Пароль відхилено Supabase: ${message}`;
  return `Помилка реєстрації: ${message}`;
}

export default function AuthGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    browserSupabase.auth.getSession().then(({ data }) => setReady(Boolean(data.session)));
    const { data: listener } = browserSupabase.auth.onAuthStateChange((_event, session) => setReady(Boolean(session)));
    return () => listener.subscription.unsubscribe();
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(''); setNotice('');
    if (mode === 'sign-up' && password.length < 8) { setError('Пароль має містити щонайменше 8 символів.'); return; }
    const result = mode === 'sign-up'
      ? await browserSupabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/` } })
      : await browserSupabase.auth.signInWithPassword({ email, password });
    if (result.error) { setError(mode === 'sign-in' ? 'Неправильний email або пароль.' : signUpError(result.error.message)); return; }
    if (mode === 'sign-up' && !result.data.session) setNotice('Акаунт створено. Підтвердьте email у листі, щоб увійти.');
  };

  if (ready) return <>{children}</>;
  return <main className="max-w-[680px] mx-auto px-5 py-16 min-h-[calc(100vh-56px)] flex items-center"><section className="w-full bg-white rounded-2xl shadow-soft border border-vivat-light p-7 md:p-10"><p className="text-vivat-accent text-sm font-semibold tracking-wide uppercase mb-3">Безпечний доступ</p><h1 className="text-[32px] font-bold tracking-tight text-vivat-dark mb-3">Порівнюйте ціни на книжки</h1><p className="text-gray-500 mb-6">Створіть безкоштовний акаунт або увійдіть. Дані доступу обробляє Supabase Auth; пароль не зберігається в застосунку.</p><div className="grid grid-cols-2 gap-2 mb-6">{([{ key: 'sign-in', label: 'Увійти' }, { key: 'sign-up', label: 'Реєстрація' }] as const).map((tab) => <button type="button" key={tab.key} onClick={() => { setMode(tab.key); setError(''); setNotice(''); }} className={`rounded-xl px-3 py-2 font-medium ${mode === tab.key ? 'bg-vivat text-white' : 'bg-vivat-light text-vivat-dark'}`}>{tab.label}</button>)}</div><form onSubmit={submit} className="space-y-4"><label className="block text-sm font-medium text-vivat-dark">Email<input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-vivat" placeholder="you@example.com" /></label><label className="block text-sm font-medium text-vivat-dark">Пароль<input required minLength={mode === 'sign-up' ? 8 : undefined} type="password" autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-vivat" placeholder={mode === 'sign-up' ? 'Щонайменше 8 символів' : 'Ваш пароль'} /></label>{error && <p className="text-sm text-red-600">{error}</p>}{notice && <p className="rounded-xl bg-vivat-light p-4 text-sm text-vivat-dark">{notice}</p>}<button className="w-full rounded-xl bg-vivat px-4 py-3 font-semibold text-white transition hover:bg-vivat-dark">{mode === 'sign-up' ? 'Створити акаунт' : 'Увійти'}</button></form><p className="mt-6 text-xs text-gray-400">Безкоштовний доступ має обмеження на живі пошуки, щоб сервіс залишався доступним усім.</p></section></main>;
}
