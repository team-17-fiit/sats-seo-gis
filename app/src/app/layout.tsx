// Koreňové rozloženie: <html lang="sk">, spoločné SEO meta a JSON-LD pre celý web.
import type { Metadata, Viewport } from 'next';
import './globals.css';
import JsonLd from '@/components/JsonLd';
import { SITE_NAME, SITE_URL } from '@/lib/site';

const DESCRIPTION =
  'Interaktívna mapa najvyšších vrcholov Slovenska pre turistov a horolezcov. Rýchla, prehľadná a otvorená.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Aktívny turizmus na Slovensku – mapa vrcholov a trás',
    template: `%s | ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Aktívny turizmus na Slovensku',
    description: 'Interaktívna mapa vrcholov a trás.',
    type: 'website',
    locale: 'sk_SK',
    siteName: SITE_NAME,
  },
};

export const viewport: Viewport = { themeColor: '#1f4d3a' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sk">
      <body>
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: SITE_NAME,
            url: SITE_URL,
            inLanguage: 'sk',
            description: 'Mapa aktívneho turizmu na Slovensku',
          }}
        />
        {children}
      </body>
    </html>
  );
}
