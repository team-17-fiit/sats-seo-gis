// Podstránka jedného vrcholu, generovaná pri builde z peaks.geojson (SSG).
// Každý vrchol = vlastná crawlovateľná URL v každom jazyku so schema.org dátami.
import type { Metadata } from 'next';
import Link from 'next/link';
import JsonLd from '@/components/JsonLd';
import LangSwitch from '@/components/LangSwitch';
import LocaleRoot from '@/components/LocaleRoot';
import Stripes from '@/components/Stripes';
import { alternatesFor, pagePath, T, type Locale } from '@/lib/i18n';
import { socialMetadata } from '@/lib/og';
import { breadcrumbJsonLd, peakCrumbs } from '@/lib/breadcrumbs';
import { alternatesFor, OG_LOCALE, pagePath, T, type Locale } from '@/lib/i18n';
import { getPeak, type Peak } from '@/lib/peaks';
import { SITE_URL } from '@/lib/site';

export function peakMetadata(locale: Locale, slug: string): Metadata {
  const peak = getPeak(slug);
  if (!peak) return {};
  const title = `${peak.name} (${peak.elevation} m)`;
  const description = T[locale].peakDescription(peak.name, peak.elevation);
  return {
    title,
    description,
    alternates: alternatesFor(locale, 'peak', peak.slug),
    ...socialMetadata(locale, 'peak', peak.slug, title, description, 'article'),
  };
}

export default function PeakView({ locale, peak }: { locale: Locale; peak: Peak }) {
  const t = T[locale];
  const osm = `https://www.openstreetmap.org/?mlat=${peak.lat}&mlon=${peak.lon}#map=14/${peak.lat}/${peak.lon}`;

  return (
    <LocaleRoot locale={locale}>
      <JsonLd data={breadcrumbJsonLd(peakCrumbs(locale, { slug: peak.slug, name: peak.name }), SITE_URL)} />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Mountain',
          name: peak.name,
          url: SITE_URL + pagePath(locale, 'peak', peak.slug),
          inLanguage: locale,
          geo: {
            '@type': 'GeoCoordinates',
            latitude: peak.lat,
            longitude: peak.lon,
            elevation: peak.elevation,
          },
          containedInPlace: { '@type': 'Country', name: t.country },
        }}
      />
      <header className="top">
        <Stripes />
        <p><Link href={pagePath(locale, 'home')}>{t.backToMap}</Link></p>
        <LangSwitch locale={locale} kind="peak" slug={peak.slug} />
        <h1>{peak.name}</h1>
      </header>
      <main>
        <section className="peak-detail">
          <dl>
            <dt>{t.elevation}</dt>
            <dd>{t.elevationValue(peak.elevation)}</dd>
            <dt>{t.coordinates}</dt>
            <dd>{peak.lat.toFixed(4)} °N, {peak.lon.toFixed(4)} °E {t.approx}</dd>
          </dl>
          <p>
            <a href={osm} rel="noopener noreferrer">{t.showOnOsm}</a>
          </p>
        </section>
      </main>
    </LocaleRoot>
  );
}
