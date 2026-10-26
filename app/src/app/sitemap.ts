// Automatická sitemap.xml: úvodná stránka + všetky vrcholy.
import type { MetadataRoute } from 'next';
import { getPeaks } from '@/lib/peaks';
import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-static'; // nutné pri output: 'export'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/` },
    ...getPeaks().map((p) => ({ url: `${SITE_URL}/vrcholy/${p.slug}/` })),
  ];
}
