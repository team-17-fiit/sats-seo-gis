// Stránka 404 (404.html). Pri dvoch root layoutoch ((sk), (en)) ju Next.js generuje z tohto súboru
// (experimental.globalNotFound). Je dvojjazyčná, nemá canonical a nesmie sa indexovať.
import type { Metadata } from 'next';
import '@/app/globals.css';
import Link from 'next/link';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = {
  title: `Stránka sa nenašla / Page not found | ${SITE_NAME}`,
  robots: { index: false, follow: true },
};

export default function GlobalNotFound() {
  return (
    <html lang="sk">
      <body>
        <header className="top">
          <h1>Stránka sa nenašla</h1>
          <p lang="en">Page not found</p>
        </header>
        <main id="main">
          <p>
            <Link href="/">Prejsť na úvodnú stránku</Link>
            {' · '}
            <Link href="/en/" lang="en" hrefLang="en">Go to the home page</Link>
          </p>
        </main>
      </body>
    </html>
  );
}
