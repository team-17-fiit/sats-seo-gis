// Koreňový HTML dokument pre jeden jazyk. Web má dva root layouty (route groups (sk) a (en)),
// aby <html lang> zodpovedal jazyku stránky (WCAG 3.1.1, správne čítanie čítačkou, signál pre
// vyhľadávače). Canonical a hreflang si nastavuje každá stránka sama (alternatesFor v lib/i18n).
import type { Metadata, Viewport } from 'next';
import '@/app/globals.css';
import JsonLd from '@/components/JsonLd';
import ThemeToggle from '@/components/ThemeToggle';
import { OG_LOCALE, T, type Locale } from '@/lib/i18n';
import { SITE_NAME, SITE_URL, SITE_VERIFICATION } from '@/lib/site';

export function rootMetadata(locale: Locale): Metadata {
  const t = T[locale];
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t.homeTitle, template: `%s | ${SITE_NAME}` },
    description: t.homeDescription,
    // overovacie meta tagy Search Console / Bing Webmaster (T3-06); prázdne = nič sa nevloží
    verification: SITE_VERIFICATION,
    // favicon.ico, icon.svg a apple-icon.png v src/app/ – <link rel="icon"> vloží Next.js sám (T3-03)
    appleWebApp: { capable: true, title: 'SATS-GIS', statusBarStyle: 'default' },
    openGraph: { type: 'website', locale: OG_LOCALE[locale], siteName: SITE_NAME },
  };
}

export const rootViewport: Viewport = { themeColor: '#1f4d3a' };

const THEME_INIT = `try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootDocument({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const t = T[locale];
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body>
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: SITE_NAME,
            url: `${SITE_URL}/`,
            inLanguage: locale,
            description: t.homeDescription,
          }}
        />
        {children}
        <ThemeToggle />
      </body>
    </html>
  );
}
