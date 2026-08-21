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
        <header className="h-[56px] border-b border-gray-200/60 bg-white/80 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-[680px] mx-auto h-full px-4 sm:px-5 flex justify-between items-center">
            <Link href="/" className="text-[19px] font-bold tracking-tight text-vivat-dark hover:opacity-80 transition-opacity">
              Книжки.
            </Link>
            <div className="hidden sm:flex items-center gap-5">
              <Link href="/promotions" className="text-[15px] font-medium text-vivat hover:text-vivat-dark transition-colors">
                Акції
              </Link>
              <Link href="/watchlist" className="text-[15px] font-medium text-vivat hover:text-vivat-dark transition-colors">
                Відстеження
              </Link>
              <Link href="/admin" className="text-[15px] font-medium text-vivat hover:text-vivat-dark transition-colors">Кабінет</Link>
              <Link href="/feedback" className="text-[15px] font-medium text-vivat hover:text-vivat-dark transition-colors">Допомога</Link>
            </div>
            <MobileNav />
          </div>
        </header>

        <AuthGate><main className="max-w-[680px] mx-auto px-5 py-8 pb-24 min-h-[calc(100vh-56px)]">{children}</main></AuthGate>
        <footer className="max-w-[680px] mx-auto px-5 pb-7 text-center text-[11px] font-medium tracking-wide text-vivat/55">
          Book Price 2.0
        </footer>
      </body>
    </html>
  );
}
