// Adresa nasadenej stránky. Používa sa pre canonical, Open Graph a sitemap.
// Nastav v CI/hostingu cez premennú NEXT_PUBLIC_SITE_URL, kým nemáte doménu, ostáva placeholder.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://example.com').replace(/\/$/, '');
export const SITE_NAME = 'SATS-SEO-GIS';

// Podcesta, na ktorej web beží (napr. '/sats-seo-gis' na GitHub Pages). Lokálne a v CI je prázdna.
// Next.js ňou automaticky prefixuje <Link> a /_next/; ručné cesty (manifest, ikony) ju musia pridať samy.
export const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH ?? '').replace(/\/$/, '');
export const withBasePath = (path: string): string => `${BASE_PATH}${path}`;

// Vlastné dlaždice PMTiles (T3-09): vyrába ich workflow Deploy a nastaví NEXT_PUBLIC_TILES=1.
// Lokálne a v CI súbor nie je, mapa vtedy kreslí len vrstvy z JSON ako doteraz.
export const TILES_URL = process.env.NEXT_PUBLIC_TILES === '1' ? withBasePath('/tiles/sats.pmtiles') : null;

export type SiteVerification = { google?: string; other?: Record<string, string> };

export function siteVerification(google?: string, bing?: string): SiteVerification | undefined {
  const googleToken = google?.trim();
  const bingToken = bing?.trim();
  if (!googleToken && !bingToken) return undefined;
  return {
    ...(googleToken ? { google: googleToken } : {}),
    ...(bingToken ? { other: { 'msvalidate.01': bingToken } } : {}),
  };
}

export const SITE_VERIFICATION = siteVerification(
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION,
);
