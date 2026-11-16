import { pagePath, T, type Locale } from './i18n';

export type Crumb = { name: string; path: string };

const home = (locale: Locale): Crumb => ({ name: T[locale].crumbHome, path: pagePath(locale, 'home') });
const trails = (locale: Locale): Crumb => ({ name: T[locale].trailsHeading, path: pagePath(locale, 'trails') });

export function trailsCrumbs(locale: Locale): Crumb[] {
  return [home(locale), trails(locale)];
}

export function trailCrumbs(locale: Locale, trail: { slug: string; name: string }): Crumb[] {
  return [...trailsCrumbs(locale), { name: trail.name, path: pagePath(locale, 'trail', trail.slug) }];
}

export function placeCrumbs(
  locale: Locale,
  place: { slug: string; name: string },
  trail?: { slug: string; name: string },
): Crumb[] {
  const parent = trail ? trailCrumbs(locale, trail) : trailsCrumbs(locale);
  return [...parent, { name: place.name, path: pagePath(locale, 'place', place.slug) }];
}

export function peakCrumbs(locale: Locale, peak: { slug: string; name: string }): Crumb[] {
  return [home(locale), { name: peak.name, path: pagePath(locale, 'peak', peak.slug) }];
}

export function breadcrumbJsonLd(crumbs: Crumb[], siteUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: siteUrl + c.path,
    })),
  };
}
