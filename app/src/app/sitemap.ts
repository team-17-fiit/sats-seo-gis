// Automatická sitemap.xml (T2-14): každá stránka v slovenčine aj angličtine, pri každej adrese
// zoznam jazykových verzií (<xhtml:link rel="alternate" hreflang>) vrátane x-default (slovenčina).
import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';
import { sitemapEntries } from '@/lib/sitemap';

export const dynamic = 'force-static'; // nutné pri output: 'export'

export default function sitemap(): MetadataRoute.Sitemap {
  return sitemapEntries(SITE_URL);
}
