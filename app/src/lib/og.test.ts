import { describe, expect, it } from 'vitest';
import { LOCALES, pagePath } from './i18n';
import { keepShortWordsWithNext, OG_IMAGE_SIZE, ogAlt, ogCard, ogImagePath, ogImageRoutes, socialMetadata } from './og';
import { SITE_NAME, SITE_URL } from './site';
import { allPages } from './sitemap';

const FONT_CHARS = /^[\u0020-\u007E\u00A0-\u017F\u2013\u2014\u2018-\u201E\u2022\u2026\u2032\u2033\u20AC\u203A\u2039]*$/;

describe('og image paths', () => {
  it('maps every page to a clean .png path in its language', () => {
    expect(ogImagePath('sk', 'home')).toBe('/og/index.png');
    expect(ogImagePath('en', 'home')).toBe('/og/en.png');
    expect(ogImagePath('sk', 'trails')).toBe('/og/trasy.png');
    expect(ogImagePath('sk', 'place', 'devin')).toBe('/og/miesta/devin.png');
    expect(ogImagePath('en', 'place', 'devin')).toBe('/og/en/places/devin.png');
    expect(ogImagePath('en', 'peak', 'rysy')).toBe('/og/en/peaks/rysy.png');
  });

  it('generates one unique image for every page in every language', () => {
    const routes = ogImageRoutes();
    expect(routes).toHaveLength(allPages().length * LOCALES.length);
    expect(new Set(routes.map((r) => r.path.join('/'))).size).toBe(routes.length);
  });
});

describe('og cards', () => {
  it('describe the page in its language', () => {
    expect(ogCard('sk', 'peak', 'rysy')).toMatchObject({ eyebrow: 'Vrchol', title: 'Rysy', detail: '2503 m n. m.' });
    expect(ogCard('en', 'peak', 'rysy').detail).toBe('2503 m a.s.l.');
    expect(ogCard('sk', 'place', 'devin').detail).toBe('Na trase Hlavná os Slovenska');
    expect(ogCard('en', 'place', 'devin').title).toBe('Devín castle and Danube confluence');
    expect(ogCard('sk', 'trail', 'cesta-marie').eyebrow).toBe('Tematická trasa');
  });

  it('use only characters the bundled font can draw', () => {
    for (const { locale, kind, slug } of ogImageRoutes()) {
      const c = ogCard(locale, kind, slug);
      for (const text of [c.eyebrow, c.title, c.detail, SITE_NAME]) expect(text, `${locale} ${kind} ${slug}`).toMatch(FONT_CHARS);
    }
  });

  it('keeps one-letter prepositions on the same line as the next word', () => {
    const nbsp = String.fromCharCode(160);
    expect(keepShortWordsWithNext('Devín a sútok Dunaja s Moravou')).toBe(`Devín a${nbsp}sútok Dunaja s${nbsp}Moravou`);
    expect(keepShortWordsWithNext('Hrad v Bojniciach')).toBe(`Hrad v${nbsp}Bojniciach`);
  });

  it('every image has a non-empty, unique alt text', () => {
    const alts = ogImageRoutes().map((r) => ogAlt(ogCard(r.locale, r.kind, r.slug)));
    expect(alts.every((a) => a.length > 10)).toBe(true);
    expect(new Set(alts).size).toBe(alts.length);
  });
});

describe('social metadata', () => {
  const meta = socialMetadata('en', 'place', 'devin', 'Devín', 'Castle.', 'article');
  const og = meta.openGraph as Record<string, unknown>;
  const twitter = meta.twitter as Record<string, unknown>;

  it('og:url is the canonical URL and og:image an absolute 1200×630 PNG', () => {
    expect(og.url).toBe(SITE_URL + pagePath('en', 'place', 'devin'));
    expect(og.images).toEqual([
      expect.objectContaining({ url: `${SITE_URL}/og/en/places/devin.png`, ...OG_IMAGE_SIZE, type: 'image/png' }),
    ]);
  });

  it('includes site name, locale with alternate and a large Twitter card', () => {
    expect(og).toMatchObject({ siteName: SITE_NAME, locale: 'en_GB', alternateLocale: ['sk_SK'], type: 'article' });
    expect(twitter).toMatchObject({ card: 'summary_large_image', title: 'Devín', description: 'Castle.' });
  });
});
