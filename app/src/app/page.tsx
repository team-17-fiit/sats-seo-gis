// Úvodná stránka: hlavička, mapa (načíta sa po kliknutí) a zoznam vrcholov s odkazmi na podstránky.
// Zoznam je v HTML už pri builde, takže ho vidia aj vyhľadávače bez JavaScriptu.
import Link from 'next/link';
import MapLoader from '@/components/MapLoader';
import Stripes from '@/components/Stripes';
import { getPeaks } from '@/lib/peaks';

export default function HomePage() {
  const peaks = getPeaks();
  return (
    <>
      <header className="top">
        <Stripes />
        <h1>Slovensko pešo a na bicykli</h1>
        <p>Vrcholy, trasy a útulne na jednom mieste.</p>
      </header>
      <main>
        <section id="map-section" aria-label="Mapa vrcholov">
          <MapLoader />
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
