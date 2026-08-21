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
  themeColor: '#ffffff',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk">
      <body>
        <header
          style={{
            borderBottom: '1px solid #D2D2D7',
            height: '52px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <nav
            style={{
              width: '100%',
              maxWidth: '680px',
              margin: '0 auto',
              padding: '0 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Link
              href="/"
              style={{
                fontSize: '17px',
                fontWeight: 600,
                color: '#1D1D1F',
                letterSpacing: '-0.2px',
              }}
            >
              Книжки
            </Link>
            <Link
              href="/watchlist"
              style={{
                fontSize: '15px',
                color: '#0071E3',
              }}
            >
              Відстеження
            </Link>
          </nav>
        </header>
        <main
          style={{
            maxWidth: '680px',
            margin: '0 auto',
            padding: '32px 20px 64px',
          }}
        >
          {children}
        </main>
      </body>
    </html>
  );
}
