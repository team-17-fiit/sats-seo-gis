import type { Metadata } from 'next';
import { LOCALES, OG_LOCALE, pagePath, T, type Locale, type PageKind } from './i18n';
import { difficultyLabel, getPath, getPaths, trailName } from './paths';
import { getPeak, getPeaks } from './peaks';
import { categoryLabel, getPoi, getPois, poiName } from './pois';
import { SITE_NAME, SITE_URL } from './site';
import { allPages } from './sitemap';

export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;

const STRIPE_RED = '#c62828';
const FOREST = '#1f4d3a';

export type OgCard = { eyebrow: string; title: string; detail: string; accent: string };

export function ogImagePath(locale: Locale, kind: PageKind, slug?: string): string {
  const segments = pagePath(locale, kind, slug).split('/').filter(Boolean);
  return `/og/${(segments.length ? segments : ['index']).join('/')}.png`;
}

export function ogImageRoutes(): { path: string[]; locale: Locale; kind: PageKind; slug?: string }[] {
  return allPages().flatMap(({ kind, slug }) =>
    LOCALES.map((locale) => ({ path: ogImagePath(locale, kind, slug).slice('/og/'.length).split('/'), locale, kind, slug })),
  );
}

const NBSP = String.fromCharCode(160);

export function keepShortWordsWithNext(text: string): string {
  return text.replace(/(^|\s)([aikosuvzAIKOSUVZ])\s+/g, `$1$2${NBSP}`);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function ogCard(locale: Locale, kind: PageKind, slug?: string): OgCard {
  const t = T[locale];
  if (kind === 'trail' && slug) {
    const p = getPath(slug);
    if (p) {
      return {
        eyebrow: t.ogTrail,
        title: trailName(p, locale),
        detail: t.ogTrailFacts(p.length_km, p.stops.length, difficultyLabel(p.difficulty, locale)),
        accent: p.colour,
      };
    }
  }
  if (kind === 'place' && slug) {
    const p = getPoi(slug);
    if (p) {
      const trail = p.paths.map((s) => getPath(s)).find(Boolean);
      return {
        eyebrow: capitalize(categoryLabel(p.category, locale)) + (p.unesco ? ' · UNESCO' : ''),
        title: poiName(p, locale),
        detail: trail ? t.ogOnTrail(trailName(trail, locale)) : t.country,
        accent: trail?.colour ?? FOREST,
      };
    }
  }
  if (kind === 'peak' && slug) {
    const p = getPeak(slug);
    if (p) return { eyebrow: t.ogPeak, title: p.name, detail: t.ogElevation(p.elevation), accent: STRIPE_RED };
  }
  if (kind === 'trails') {
    const paths = getPaths();
    return {
      eyebrow: t.homeH1,
      title: t.trailsTitle,
      detail: t.ogTrails(paths.length, paths.reduce((n, p) => n + p.stops.length, 0)),
      accent: FOREST,
    };
  }
  return {
    eyebrow: t.homeH1,
    title: t.homeTitle,
    detail: t.ogHome(getPaths().length, getPois().length, getPeaks().length),
    accent: FOREST,
  };
}

export function ogAlt(card: OgCard): string {
  return `${card.title} – ${card.eyebrow}. ${card.detail}`;
}

export function socialMetadata(
  locale: Locale,
  kind: PageKind,
  slug: string | undefined,
  title: string,
  description: string,
  type: 'website' | 'article',
): Pick<Metadata, 'openGraph' | 'twitter'> {
  const other: Locale = locale === 'sk' ? 'en' : 'sk';
  const image = {
    url: SITE_URL + ogImagePath(locale, kind, slug),
    ...OG_IMAGE_SIZE,
    alt: ogAlt(ogCard(locale, kind, slug)),
    type: 'image/png',
  };
  return {
    openGraph: {
      type,
      url: SITE_URL + pagePath(locale, kind, slug),
      title,
      description,
      siteName: SITE_NAME,
      locale: OG_LOCALE[locale],
      alternateLocale: [OG_LOCALE[other]],
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [{ url: image.url, alt: image.alt }],
    },
  };
}
