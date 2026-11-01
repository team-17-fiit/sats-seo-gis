import { describe, expect, it } from 'vitest';
import { alternatesFor, languageAlternates, LOCALES, pagePath, pick, T } from './i18n';
import { getPaths } from './paths';
import { getPeaks } from './peaks';
import { getPois } from './pois';
import { sitemapEntries } from './sitemap';

describe('i18n URLs', () => {
  it('keeps Slovak URLs unchanged and puts English under /en/', () => {
    expect(pagePath('sk', 'home')).toBe('/');
    expect(pagePath('sk', 'trail', 'cesta-marie')).toBe('/trasy/cesta-marie/');
    expect(pagePath('sk', 'place', 'devin')).toBe('/miesta/devin/');
    expect(pagePath('sk', 'peak', 'rysy')).toBe('/vrcholy/rysy/');
    expect(pagePath('en', 'home')).toBe('/en/');
    expect(pagePath('en', 'trails')).toBe('/en/trails/');
    expect(pagePath('en', 'place', 'devin')).toBe('/en/places/devin/');
    expect(pagePath('en', 'peak', 'rysy')).toBe('/en/peaks/rysy/');
  });

  it('lists every language plus x-default (Slovak) as absolute URLs', () => {
    expect(languageAlternates('place', 'devin', 'https://x.sk')).toEqual({
      sk: 'https://x.sk/miesta/devin/',
      en: 'https://x.sk/en/places/devin/',
      'x-default': 'https://x.sk/miesta/devin/',
    });
  });

  it('canonical points to the page itself, alternates are shared by both versions', () => {
    const sk = alternatesFor('sk', 'trail', 'hlavna-os');
    const en = alternatesFor('en', 'trail', 'hlavna-os');
    expect(sk.canonical).toBe('/trasy/hlavna-os/');
    expect(en.canonical).toBe('/en/trails/hlavna-os/');
    expect(sk.languages).toEqual(en.languages);
  });

  it('falls back to Slovak when a translation is missing', () => {
    expect(pick('en', 'Devín', 'Devín castle')).toBe('Devín castle');
    expect(pick('en', 'Devín', null)).toBe('Devín');
    expect(pick('sk', 'Devín', 'Devín castle')).toBe('Devín');
  });

  it('both dictionaries have the same keys', () => {
    expect(Object.keys(T.en).sort()).toEqual(Object.keys(T.sk).sort());
  });
});

describe('sitemap', () => {
  // vyžaduje app/public/data/*.json (python -m pipelines.export_static --from-seed)
  const entries = sitemapEntries('https://x.sk');
  const pages = 2 + getPaths().length + getPois().length + getPeaks().length;

  it('has every page in every language', () => {
    expect(entries).toHaveLength(pages * LOCALES.length);
    expect(new Set(entries.map((e) => e.url)).size).toBe(entries.length);
  });

  it('every URL is listed among its own alternates (hreflang is reciprocal)', () => {
    for (const e of entries) expect(Object.values(e.alternates.languages)).toContain(e.url);
  });

  it('contains Slovak and English place pages', () => {
    const urls = entries.map((e) => e.url);
    expect(urls).toContain('https://x.sk/miesta/devin/');
    expect(urls).toContain('https://x.sk/en/places/devin/');
  });
});
