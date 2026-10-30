// Úvodná stránka: hlavička, mapa (načíta sa po kliknutí), tematické trasy a zoznam vrcholov.
// Zoznamy sú v HTML už pri builde, takže ich vidia aj vyhľadávače bez JavaScriptu.
import Link from 'next/link';
import MapLoader from '@/components/MapLoader';
import Stripes from '@/components/Stripes';
import type { FeatureCollection, PointFeature } from '@/lib/map';
import { getPaths } from '@/lib/paths';
import { getPeaks } from '@/lib/peaks';

export default function HomePage() {
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
    <>
      <header className="top">
        <Stripes />
        <h1>Slovensko pešo a na bicykli</h1>
        <p>Vrcholy, trasy a útulne na jednom mieste.</p>
        <nav className="nav" aria-label="Hlavná navigácia">
          <Link href="/trasy/">Tematické trasy</Link>
        </nav>
      </header>
      <main>
        <section id="map-section" aria-label="Mapa vrcholov">
          <MapLoader label="Mapa vrcholov" layers={[{ id: 'peaks', kind: 'points', color: '#c62828', data: peakLayer }]} />
        </section>
        <section className="paths-teaser">
          <h2>Tematické trasy</h2>
          <ul id="home-path-list">
            {paths.map((p) => (
              <li key={p.slug}>
                <span className="swatch" style={{ background: p.colour }} aria-hidden="true" />
                <Link href={`/trasy/${p.slug}/`}>{p.name_sk}</Link>
                {` – ${p.stops.length} zastávok`}
              </li>
            ))}
          </ul>
        </section>
        <section className="peaks">
          <h2>Najvyššie vrcholy</h2>
          <ul id="peak-list">
            {peaks.map((p) => (
              <li key={p.slug}>
                <Link href={`/vrcholy/${p.slug}/`}>{p.name}</Link>
                {` – ${p.elevation} m`}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}
