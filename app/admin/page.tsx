'use client';
import { useEffect, useState } from 'react';

type Role = 'free' | 'plus' | 'admin';
type User = { id:string; email:string; role:Role; created_at:string };
type Account = {
  authenticated: boolean;
  username: string;
  email: string | null;
  role: Role;
  createdAt: string | null;
  quota: { dailyUsed: number; dailyLimit: number; monthlyUsed: number; monthlyLimit: number };
};

const roleLabels: Record<Role, string> = { free: 'Free', plus: 'Plus', admin: 'Admin' };
const roleStyles: Record<Role, string> = {
  free: 'bg-vivat-light text-vivat-dark',
  plus: 'bg-amber-100 text-amber-900',
  admin: 'bg-vivat text-white',
};

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const percent = Math.min(100, Math.round((used / Math.max(limit, 1)) * 100));
  return <div className="min-w-0"><div className="mb-2 flex items-baseline justify-between gap-3 text-sm"><span className="text-gray-500">{label}</span><span className="shrink-0 font-semibold text-vivat-dark">{used} / {limit}</span></div><div className="h-2 overflow-hidden rounded-full bg-vivat-light"><div className="h-full rounded-full bg-vivat transition-[width] duration-500" style={{ width: `${percent}%` }} /></div></div>;
}

export default function AdminPage() {
  const [account, setAccount] = useState<Account | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState('');
  const [signingOut, setSigningOut] = useState(false);
  const load = async () => {
    const session = await fetch('/api/auth/session');
    const data = await session.json() as Account;
    if (!session.ok || !data.authenticated) { setError('Не вдалося завантажити дані акаунта.'); return; }
    setAccount(data);
    if (data.role === 'admin') { const usersResponse = await fetch('/api/admin/users'); if (usersResponse.ok) setUsers(await usersResponse.json()); }
  };
  useEffect(() => { load().catch(() => setError('Перевірте підʼєднання до інтернету.')); }, []);
  const update = async (userId: string, role: Role) => { const res = await fetch('/api/admin/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, role }) }); if (res.ok) setUsers((list) => list.map((user) => user.id === userId ? { ...user, role } : user)); };
  const signOut = async () => { setSigningOut(true); await fetch('/api/auth/sign-out', { method: 'POST' }); window.location.assign('/'); };
  if (error) return <p className="rounded-2xl border border-red-100 bg-red-50 p-4 text-red-600">{error}</p>;
  if (!account) return <p className="text-gray-400">Завантаження кабінету…</p>;
  return <div className="animate-in fade-in duration-500"><div className="mb-7 flex flex-wrap items-start justify-between gap-4"><div><p className="mb-2 text-sm font-semibold uppercase tracking-wide text-vivat-accent">Ваш простір</p><h1 className="text-[32px] font-bold tracking-tight text-vivat-dark">Кабінет</h1></div><button type="button" onClick={signOut} disabled={signingOut} className="rounded-xl border border-vivat-light bg-white px-4 py-2.5 text-sm font-semibold text-vivat-dark transition hover:bg-vivat-light disabled:opacity-60">{signingOut ? 'Вихід…' : 'Вийти'}</button></div><section className="mb-5 overflow-hidden rounded-2xl border border-vivat-light bg-white shadow-soft"><div className="flex min-w-0 flex-wrap items-center justify-between gap-4 border-b border-vivat-light bg-vivat-light/50 p-5"><div className="min-w-0"><p className="truncate text-lg font-semibold text-vivat-dark">{account.username}</p><p className="truncate text-sm text-gray-500">{account.email}</p></div><span className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ${roleStyles[account.role]}`}>{roleLabels[account.role]}</span></div><dl className="grid gap-4 p-5 sm:grid-cols-2"><div><dt className="text-xs font-medium uppercase tracking-wide text-gray-400">Імʼя користувача</dt><dd className="mt-1 break-words font-medium text-vivat-dark">{account.username}</dd></div><div><dt className="text-xs font-medium uppercase tracking-wide text-gray-400">З нами з</dt><dd className="mt-1 font-medium text-vivat-dark">{account.createdAt ? new Date(account.createdAt).toLocaleDateString('uk-UA', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}</dd></div></dl></section><section className="mb-8 rounded-2xl border border-vivat-light bg-white p-5 shadow-soft"><div className="mb-5"><h2 className="font-semibold text-vivat-dark">Ліміт пошуку</h2><p className="mt-1 text-sm text-gray-500">Живі пошуки захищають сервіс від перевантаження.</p></div><div className="space-y-5"><UsageBar label="Сьогодні" used={account.quota.dailyUsed} limit={account.quota.dailyLimit} /><UsageBar label="Цього місяця" used={account.quota.monthlyUsed} limit={account.quota.monthlyLimit} /></div></section>{account.role === 'admin' && <section className="border-t border-vivat-light pt-7"><div className="mb-5"><p className="text-sm font-semibold uppercase tracking-wide text-vivat-accent">Адміністрування</p><h2 className="mt-1 text-2xl font-bold tracking-tight text-vivat-dark">Акаунти та рівні</h2></div><div className="space-y-3">{users.map((user) => <div key={user.id} className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-2xl border border-vivat-light bg-white p-4"><div className="min-w-0"><p className="break-all font-medium text-vivat-dark">{user.email}</p><p className="mt-1 text-xs text-gray-400">Створено {new Date(user.created_at).toLocaleDateString('uk-UA')}</p></div><select aria-label={`Рівень для ${user.email}`} value={user.role} onChange={(e) => update(user.id, e.target.value as Role)} className="shrink-0 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-vivat-dark outline-none focus:border-vivat"><option value="free">Free</option><option value="plus">Plus</option><option value="admin">Admin</option></select></div>)}</div></section>}</div>;
}
