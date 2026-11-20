import { describe, expect, it } from 'vitest';
import { alternatesFor, languageAlternates, LOCALES, pagePath, pick, plural, T } from './i18n';
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

describe('plural', () => {
  it.each([
    [1, '1 zastávka', '1 trasa', '1 miesto', '1 vrchol'],
    [2, '2 zastávky', '2 trasy', '2 miesta', '2 vrcholy'],
    [4, '4 zastávky', '4 trasy', '4 miesta', '4 vrcholy'],
    [5, '5 zastávok', '5 trás', '5 miest', '5 vrcholov'],
    [0, '0 zastávok', '0 trás', '0 miest', '0 vrcholov'],
    [21, '21 zastávok', '21 trás', '21 miest', '21 vrcholov'],
  ])('Slovak %i', (n, stops, trails, places, peaks) => {
    expect(T.sk.stops(n)).toBe(stops);
    expect(T.sk.ogTrails(n, n)).toBe(`${trails} · ${stops} po celom Slovensku`);
    expect(T.sk.ogHome(n, n, n)).toContain(`${places} · ${peaks}`);
  });

  it.each([
    [1, '1 stop', '1 trail', '1 place', '1 peak'],
    [2, '2 stops', '2 trails', '2 places', '2 peaks'],
    [5, '5 stops', '5 trails', '5 places', '5 peaks'],
    [0, '0 stops', '0 trails', '0 places', '0 peaks'],
  ])('English %i', (n, stops, trails, places, peaks) => {
    expect(T.en.stops(n)).toBe(stops);
    expect(T.en.ogTrails(n, n)).toBe(`${trails} · ${stops} across Slovakia`);
    expect(T.en.ogHome(n, n, n)).toContain(`${places} · ${peaks}`);
  });

  it('declines the adjective in the home trail count too', () => {
    expect(T.sk.ogHome(1, 2, 5)).toBe('1 tematická trasa · 2 miesta · 5 vrcholov');
    expect(T.sk.ogHome(3, 1, 0)).toBe('3 tematické trasy · 1 miesto · 0 vrcholov');
    expect(T.sk.ogHome(7, 38, 6)).toBe('7 tematických trás · 38 miest · 6 vrcholov');
    expect(T.en.ogHome(1, 1, 1)).toBe('1 thematic trail · 1 place · 1 peak');
  });

  it('uses the right form in the trail description and preview image', () => {
    expect(T.sk.trailDescription('Opis.', 1, 'ľahká')).toBe('Opis. 1 zastávka, obťažnosť ľahká.');
    expect(T.sk.trailDescription('Opis.', 3, 'stredná')).toBe('Opis. 3 zastávky, obťažnosť stredná.');
    expect(T.sk.trailDescription('Opis.', 9, 'náročná')).toBe('Opis. 9 zastávok, obťažnosť náročná.');
    expect(T.en.trailDescription('Summary.', 1, 'easy')).toBe('Summary. 1 stop, easy difficulty.');
    expect(T.sk.ogTrailFacts(12, 2, 'ľahká')).toBe('~12 km · 2 zastávky · obťažnosť ľahká');
    expect(T.en.ogTrailFacts(null, 1, 'easy')).toBe('1 stop · easy difficulty');
  });

  it('falls back to other when there is no few form', () => {
    expect(plural('sk', 3, { one: 'kus', other: 'kusov' })).toBe('3 kusov');
    expect(plural('en', 3, { one: 'item', other: 'items' })).toBe('3 items');
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
