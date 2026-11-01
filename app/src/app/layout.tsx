// Koreňové rozloženie: <html lang="sk">, spoločné SEO meta a JSON-LD pre celý web.
import type { Metadata, Viewport } from 'next';
import './globals.css';
import JsonLd from '@/components/JsonLd';
import ThemeToggle from '@/components/ThemeToggle';
import { SITE_NAME, SITE_URL } from '@/lib/site';

const DESCRIPTION =
  'Interaktívna mapa vrcholov a tematických trás Slovenska pre turistov a cyklistov. Rýchla, prehľadná a otvorená.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Aktívny turizmus na Slovensku – mapa vrcholov a trás',
    template: `%s | ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  alternates: { canonical: '/' },
  icons: { apple: '/icons/icon-192.png' },
  appleWebApp: { capable: true, title: 'SATS-GIS', statusBarStyle: 'default' },
  openGraph: {
    title: 'Aktívny turizmus na Slovensku',
    description: 'Interaktívna mapa vrcholov a trás.',
    type: 'website',
    locale: 'sk_SK',
    siteName: SITE_NAME,
  },
};

const THEME_INIT = `try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;

export const viewport: Viewport = { themeColor: '#1f4d3a' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sk" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body>
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: SITE_NAME,
            url: SITE_URL,
            inLanguage: ['sk', 'en'],
            description: 'Mapa aktívneho turizmu na Slovensku',
          }}
        />
        {children}
        <ThemeToggle />
      </body>
    </html>
  );
}
