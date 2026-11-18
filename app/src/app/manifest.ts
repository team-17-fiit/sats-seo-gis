// Web App Manifest (PWA základ, ADR-0002). Service worker a offline balíček prídu v šprinte 4-4Z.
import type { MetadataRoute } from 'next';
import { SITE_NAME, withBasePath } from '@/lib/site';

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} – aktívny turizmus na Slovensku`,
    short_name: 'SATS-GIS',
    description: 'Tematické trasy, vrcholy a miesta na Slovensku.',
    start_url: withBasePath('/'),
    scope: withBasePath('/'),
    display: 'standalone',
    lang: 'sk',
    background_color: '#eef2ee',
    theme_color: '#1f4d3a',
    icons: [
      { src: withBasePath('/icons/icon-192.png'), sizes: '192x192', type: 'image/png' },
      { src: withBasePath('/icons/icon-512.png'), sizes: '512x512', type: 'image/png' },
      { src: withBasePath('/icons/icon-maskable-512.png'), sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
