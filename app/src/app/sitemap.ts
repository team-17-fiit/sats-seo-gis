// Automatická sitemap.xml: úvodná stránka, trasy, miesta (T1) a vrcholy.
import type { MetadataRoute } from 'next';
import { getPaths } from '@/lib/paths';
import { getPeaks } from '@/lib/peaks';
import { getPois } from '@/lib/pois';
import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-static'; // nutné pri output: 'export'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/` },
    { url: `${SITE_URL}/trasy/` },
    ...getPaths().map((p) => ({ url: `${SITE_URL}/trasy/${p.slug}/` })),
    ...getPois().map((p) => ({ url: `${SITE_URL}/miesta/${p.slug}/` })),
    ...getPeaks().map((p) => ({ url: `${SITE_URL}/vrcholy/${p.slug}/` })),
  ];
}
