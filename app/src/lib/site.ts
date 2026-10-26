// Adresa nasadenej stránky. Používa sa pre canonical, Open Graph a sitemap.
// Nastav v CI/hostingu cez premennú NEXT_PUBLIC_SITE_URL, kým nemáte doménu, ostáva placeholder.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://example.com').replace(/\/$/, '');
export const SITE_NAME = 'SATS-SEO-GIS';
