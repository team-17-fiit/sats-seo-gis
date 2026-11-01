// Zoznam všetkých stránok webu pre sitemap.xml (T2-14). Každá položka existuje v každom jazyku.
import { languageAlternates, LOCALES, pagePath, type PageKind } from './i18n';
import { getPaths } from './paths';
import { getPeaks } from './peaks';
import { getPois } from './pois';

export type SitemapEntry = { url: string; alternates: { languages: Record<string, string> } };

/** Všetky stránky ako dvojice (druh, slug) – rovnaké pre každý jazyk. */
export function allPages(): { kind: PageKind; slug?: string }[] {
  return [
    { kind: 'home' },
    { kind: 'trails' },
    ...getPaths().map((p) => ({ kind: 'trail' as const, slug: p.slug })),
    ...getPois().map((p) => ({ kind: 'place' as const, slug: p.slug })),
    ...getPeaks().map((p) => ({ kind: 'peak' as const, slug: p.slug })),
  ];
}

/** Adresa každej jazykovej verzie + jej alternatívy (hreflang), vrátane seba samej a x-default. */
export function sitemapEntries(siteUrl: string): SitemapEntry[] {
  return allPages().flatMap(({ kind, slug }) => {
    const languages = languageAlternates(kind, slug, siteUrl);
    return LOCALES.map((locale) => ({ url: siteUrl + pagePath(locale, kind, slug), alternates: { languages } }));
  });
}
