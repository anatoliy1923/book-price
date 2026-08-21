import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
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
  maximumScale: 1,
  userScalable: false,
  themeColor: '#FDFBF7',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk">
      <body className="antialiased bg-background">
        <header className="h-[56px] border-b border-gray-200/60 bg-white/80 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-[680px] mx-auto h-full px-5 flex justify-between items-center">
            <Link href="/" className="text-[19px] font-bold tracking-tight text-vivat-dark hover:opacity-80 transition-opacity">
              Книжки.
            </Link>
            <Link href="/watchlist" className="text-[15px] font-medium text-vivat hover:text-vivat-dark transition-colors">
              Відстеження
            </Link>
          </div>
        </header>

        <main className="max-w-[680px] mx-auto px-5 py-8 pb-24 min-h-[calc(100vh-56px)]">
          {children}
        </main>
      </body>
    </html>
  );
}
