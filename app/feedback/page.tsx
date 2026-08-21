'use client';
import { FormEvent, useState } from 'react';
import { authHeaders } from '@/lib/client-auth';

export default function FeedbackPage() {
  const [message, setMessage] = useState(''); const [state, setState] = useState<'idle'|'sent'|'error'>('idle');
  const submit = async (event: FormEvent) => { event.preventDefault(); setState('idle'); const response = await fetch('/api/bug-reports', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(await authHeaders()) }, body: JSON.stringify({ message, page: window.location.href }) }); if (response.ok) { setMessage(''); setState('sent'); } else setState('error'); };
  return <div className="max-w-lg"><h1 className="text-[32px] font-bold tracking-tight text-vivat-dark mb-2">Повідомити про проблему</h1><p className="text-gray-500 mb-7">Опишіть, що сталося та яку книжку ви шукали. Ми побачимо повідомлення в технічному журналі.</p><form onSubmit={submit} className="space-y-4"><textarea required minLength={10} maxLength={4000} value={message} onChange={(event) => setMessage(event.target.value)} className="w-full min-h-40 rounded-2xl border border-gray-200 p-4 outline-none focus:border-vivat" placeholder="Наприклад: ціна в магазині не збігається..." /><button className="rounded-xl bg-vivat px-5 py-3 font-semibold text-white hover:bg-vivat-dark">Надіслати</button>{state==='sent'&&<p className="text-vivat">Дякуємо, повідомлення надіслано.</p>}{state==='error'&&<p className="text-red-600">Не вдалося надіслати повідомлення.</p>}</form></div>;
}
