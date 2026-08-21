'use client';

import Link from 'next/link';
import { useState } from 'react';

const links = [
  { href: '/promotions', label: 'Акції' },
  { href: '/watchlist', label: 'Відстеження' },
  { href: '/feedback', label: 'Допомога' },
  { href: '/admin', label: 'Адміністрування' },
];

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  return <div className="relative sm:hidden"><button type="button" aria-label="Відкрити меню" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="grid h-11 w-11 place-items-center rounded-xl text-vivat-dark transition hover:bg-vivat-light active:scale-95"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg></button>{open && <nav aria-label="Мобільне меню" className="absolute right-0 top-[52px] z-50 w-56 rounded-2xl border border-vivat-light bg-white p-2 shadow-soft">{links.map((link) => <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="block rounded-xl px-4 py-3 text-[15px] font-medium text-vivat-dark transition hover:bg-vivat-light">{link.label}</Link>)}</nav>}</div>;
}
