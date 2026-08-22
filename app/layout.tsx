import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import AuthGate from '@/components/AuthGate';
import MobileNav from '@/components/MobileNav';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ціни на книжки',
  description: 'Порівняння цін на книжки в українських магазинах',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Книжки',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  userScalable: true,
  themeColor: '#FDFBF7',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk">
      <body className="antialiased bg-background">
        <header className="h-[60px] border-b border-vivat-light bg-background/95 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-[680px] mx-auto h-full px-4 sm:px-5 flex justify-between items-center">
            <Link href="/" className="font-book text-[23px] font-bold tracking-[-0.04em] text-vivat-dark transition-opacity hover:opacity-70">
              Книжки
            </Link>
            <div className="hidden sm:flex items-center gap-1">
              <Link href="/promotions" className="rounded-lg px-3 py-2 text-[14px] font-medium text-vivat hover:bg-vivat-light hover:text-vivat-dark transition-colors">
                Акції
              </Link>
              <Link href="/watchlist" className="rounded-lg px-3 py-2 text-[14px] font-medium text-vivat hover:bg-vivat-light hover:text-vivat-dark transition-colors">
                Відстеження
              </Link>
              <Link href="/admin" className="rounded-lg px-3 py-2 text-[14px] font-medium text-vivat hover:bg-vivat-light hover:text-vivat-dark transition-colors">Кабінет</Link>
              <Link href="/feedback" className="rounded-lg px-3 py-2 text-[14px] font-medium text-vivat hover:bg-vivat-light hover:text-vivat-dark transition-colors">Допомога</Link>
            </div>
            <MobileNav />
          </div>
        </header>

        <AuthGate><main className="w-full min-w-0 max-w-[680px] mx-auto px-4 sm:px-5 py-10 sm:py-12 pb-24 min-h-[calc(100vh-60px)]">{children}</main></AuthGate>
        <footer className="max-w-[680px] mx-auto px-5 pb-8 text-center text-[11px] font-medium tracking-[0.14em] uppercase text-vivat/55">
          Book Price 2.2
        </footer>
      </body>
    </html>
  );
}
