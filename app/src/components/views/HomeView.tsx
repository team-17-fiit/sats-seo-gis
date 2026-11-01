// Úvodná stránka: hlavička, mapa (načíta sa po kliknutí), tematické trasy a zoznam vrcholov.
// Zoznamy sú v HTML už pri builde, takže ich vidia aj vyhľadávače bez JavaScriptu.
import type { Metadata } from 'next';
import Link from 'next/link';
import LangSwitch from '@/components/LangSwitch';
import LocaleRoot from '@/components/LocaleRoot';
import MapLoader from '@/components/MapLoader';
import Stripes from '@/components/Stripes';
import { alternatesFor, mapTexts, OG_LOCALE, pagePath, T, type Locale } from '@/lib/i18n';
import type { FeatureCollection, PointFeature } from '@/lib/map';
import { getPaths, trailName } from '@/lib/paths';
import { getPeaks } from '@/lib/peaks';

export function homeMetadata(locale: Locale): Metadata {
  const t = T[locale];
  return {
    title: { absolute: t.homeTitle },
    description: t.homeDescription,
    alternates: alternatesFor(locale, 'home'),
    openGraph: { title: t.homeTitle, description: t.homeDescription, type: 'website', locale: OG_LOCALE[locale] },
  };
}

export default function HomeView({ locale }: { locale: Locale }) {
  const t = T[locale];
  const peaks = getPeaks();
  const paths = getPaths();
  const peakLayer: FeatureCollection<PointFeature> = {
    type: 'FeatureCollection',
    features: peaks.map((p) => ({
      type: 'Feature',
      properties: { id: p.slug, name: p.name, label: `${p.name} – ${p.elevation} m` },
      geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
    })),
  };

  return (
    <LocaleRoot locale={locale}>
      <header className="top">
        <Stripes />
        <LangSwitch locale={locale} kind="home" />
        <h1>{t.homeH1}</h1>
        <p>{t.homeLead}</p>
        <nav className="nav" aria-label={t.mainNav}>
          <Link href={pagePath(locale, 'trails')}>{t.trailsHeading}</Link>
        </nav>
      </header>
      <main>
        <section id="map-section" aria-label={t.peaksMap}>
          <MapLoader texts={mapTexts(locale)} label={t.peaksMap} layers={[{ id: 'peaks', kind: 'points', color: '#c62828', data: peakLayer }]} />
        </section>
        <section className="paths-teaser">
          <h2>{t.trailsHeading}</h2>
          <ul id="home-path-list">
            {paths.map((p) => (
              <li key={p.slug}>
                <span className="swatch" style={{ background: p.colour }} aria-hidden="true" />
                <Link href={pagePath(locale, 'trail', p.slug)}>{trailName(p, locale)}</Link>
                {` – ${t.stops(p.stops.length)}`}
              </li>
            ))}
          </ul>
        </section>
        <section className="peaks">
          <h2>{t.peaksHeading}</h2>
          <ul id="peak-list">
            {peaks.map((p) => (
              <li key={p.slug}>
                <Link href={pagePath(locale, 'peak', p.slug)}>{p.name}</Link>
                {` – ${p.elevation} m`}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </LocaleRoot>
  );
}
