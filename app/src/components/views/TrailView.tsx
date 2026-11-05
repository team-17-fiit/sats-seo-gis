// Detail trasy (SSG): opis, zoradené zastávky, mapa cez MapAdapter, JSON-LD TouristTrip.
import type { Metadata } from 'next';
import Link from 'next/link';
import JsonLd from '@/components/JsonLd';
import LangSwitch from '@/components/LangSwitch';
import LocaleRoot from '@/components/LocaleRoot';
import MapLoader from '@/components/MapLoader';
import NearbyPois from '@/components/NearbyPois';
import Stripes from '@/components/Stripes';
import { alternatesFor, mapTexts, OG_LOCALE, pagePath, pick, T, type Locale } from '@/lib/i18n';
import {
  difficultyLabel, getPath, localizeStops, pathLineGeoJSON, stopsToGeoJSON, trailName, trailSummary, viewFor,
  type TrailPath,
} from '@/lib/paths';
import { SITE_URL } from '@/lib/site';

function description(p: TrailPath, locale: Locale): string {
  const name = trailName(p, locale);
  return T[locale].trailDescription(trailSummary(p, locale) ?? name, p.stops.length, difficultyLabel(p.difficulty, locale));
}

export function trailMetadata(locale: Locale, slug: string): Metadata {
  const p = getPath(slug);
  if (!p) return {};
  const title = trailName(p, locale);
  const desc = description(p, locale);
  return {
    title,
    description: desc,
    alternates: alternatesFor(locale, 'trail', p.slug),
    openGraph: { title, description: desc, type: 'article', locale: OG_LOCALE[locale] },
  };
}

export default function TrailView({ locale, path }: { locale: Locale; path: TrailPath }) {
  const t = T[locale];
  const p = path;
  const view = viewFor(p);
  const name = trailName(p, locale);
  const summary = trailSummary(p, locale);
  const first = p.stops[0];

  return (
    <LocaleRoot locale={locale}>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'TouristTrip',
          name,
          description: summary,
          url: SITE_URL + pagePath(locale, 'trail', p.slug),
          inLanguage: locale,
          touristType: p.theme,
          itinerary: {
            '@type': 'ItemList',
            itemListElement: p.stops.map((s) => ({
              '@type': 'ListItem',
              position: s.seq,
              item: {
                '@type': 'TouristAttraction',
                name: pick(locale, s.name_sk, s.name_en),
                url: SITE_URL + pagePath(locale, 'place', s.slug),
                geo: { '@type': 'GeoCoordinates', latitude: s.lat, longitude: s.lon },
              },
            })),
          },
        }}
      />
      <header className="top">
        <Stripes />
        <p><Link href={pagePath(locale, 'trails')}>{t.allTrails}</Link></p>
        <LangSwitch locale={locale} kind="trail" slug={p.slug} />
        <h1>{name}</h1>
        {summary && <p>{summary}</p>}
      </header>
      <main>
        <dl className="facts">
          {p.length_km && (<><dt>{t.length}</dt><dd>≈ {p.length_km} km</dd></>)}
          <dt>{t.difficulty}</dt><dd>{difficultyLabel(p.difficulty, locale)}</dd>
          {p.mark && (<><dt>{t.waymark}</dt><dd>{p.mark}</dd></>)}
          <dt>{t.pilot}</dt><dd>{p.pilot_code}</dd>
        </dl>

        <section aria-label={t.trailMapAria}>
          <MapLoader
            texts={mapTexts(locale)}
            label={t.trailMap(name)}
            center={view.center}
            zoom={view.zoom}
            layers={[
              { id: 'path-line', kind: 'line', color: p.colour, data: pathLineGeoJSON(p) },
              { id: 'path-stops', kind: 'points', color: p.colour, data: stopsToGeoJSON(localizeStops(p, locale)), cluster: true },
            ]}
            legend={[
              { label: name, color: p.colour },
              ...(p.stops.some((s) => s.unesco) ? [{ label: `⋆ ${t.unescoTitle}`, color: p.colour, unesco: true }] : []),
            ]}
          />
          <p className="note">{t.trailGeometryNote}</p>
        </section>

        <section>
          <h2>{t.stopsHeading}</h2>
          <ol className="stops" id="stop-list">
            {p.stops.map((s) => (
              <li key={s.slug}>
                <Link href={pagePath(locale, 'place', s.slug)}>{pick(locale, s.name_sk, s.name_en)}</Link>
                {s.unesco && <span className="badge" title={t.unescoTitle}>UNESCO</span>}
              </li>
            ))}
          </ol>
        </section>

        <NearbyPois lat={first.lat} lon={first.lon} title={t.nearby(pick(locale, first.name_sk, first.name_en))} />

        <p className="note">{t.dataTeam(p.licence)}</p>
      </main>
    </LocaleRoot>
  );
}
