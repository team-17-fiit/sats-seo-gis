// Detail trasy (SSG): opis, zoradené zastávky, mapa cez MapAdapter, JSON-LD TouristTrip.
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import JsonLd from '@/components/JsonLd';
import MapLoader from '@/components/MapLoader';
import NearbyPois from '@/components/NearbyPois';
import Stripes from '@/components/Stripes';
import { DIFFICULTY_SK, getPath, getPaths, pathGeometryUrl, stopsToGeoJSON, viewFor } from '@/lib/paths';
import { SITE_URL } from '@/lib/site';

export const dynamicParams = false;

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getPaths().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = getPath(slug);
  if (!p) return {};
  const description = `${p.summary_sk ?? p.name_sk} ${p.stops.length} zastávok, obťažnosť ${DIFFICULTY_SK[p.difficulty]}.`;
  return {
    title: p.name_sk,
    description,
    alternates: { canonical: `/trasy/${p.slug}/` },
    openGraph: { title: p.name_sk, description, type: 'article' },
  };
}

export default async function PathPage({ params }: Props) {
  const { slug } = await params;
  const p = getPath(slug);
  if (!p) notFound();
  const view = viewFor(p);

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'TouristTrip',
          name: p.name_sk,
          description: p.summary_sk,
          url: `${SITE_URL}/trasy/${p.slug}/`,
          touristType: p.theme,
          itinerary: {
            '@type': 'ItemList',
            itemListElement: p.stops.map((s) => ({
              '@type': 'ListItem',
              position: s.seq,
              item: {
                '@type': 'TouristAttraction',
                name: s.name_sk,
                geo: { '@type': 'GeoCoordinates', latitude: s.lat, longitude: s.lon },
              },
            })),
          },
        }}
      />
      <header className="top">
        <Stripes />
        <p><Link href="/trasy/">← Všetky trasy</Link></p>
        <h1>{p.name_sk}</h1>
        {p.summary_sk && <p>{p.summary_sk}</p>}
      </header>
      <main>
        <dl className="facts">
          {p.length_km && (<><dt>Dĺžka</dt><dd>≈ {p.length_km} km</dd></>)}
          <dt>Obťažnosť</dt><dd>{DIFFICULTY_SK[p.difficulty]}</dd>
          {p.mark && (<><dt>Značenie</dt><dd>{p.mark}</dd></>)}
          <dt>Pilot</dt><dd>{p.pilot_code}</dd>
        </dl>

        <section aria-label="Mapa trasy">
          <MapLoader
            label={`Mapa trasy ${p.name_sk}`}
            center={view.center}
            zoom={view.zoom}
            layers={[
              { id: 'path-line', kind: 'line', color: p.colour, data: pathGeometryUrl(p) },
              { id: 'path-stops', kind: 'points', color: p.colour, data: stopsToGeoJSON(p) },
            ]}
          />
          <p className="note">
            {p.geometry_routed
              ? 'Trasa vedie po cestách a značených chodníkoch z OpenStreetMap. Geometria © OpenStreetMap contributors (ODbL).'
              : 'Čiara zatiaľ spája zastávky priamo – presná geometria z OSM sa pripravuje.'}
          </p>
        </section>

        <section>
          <h2>Zastávky</h2>
          <ol className="stops" id="stop-list">
            {p.stops.map((s) => (
              <li key={s.slug}>
                {s.name_sk}
                {s.unesco && <span className="badge" title="Svetové dedičstvo UNESCO">UNESCO</span>}
              </li>
            ))}
          </ol>
        </section>

        <NearbyPois lat={p.stops[0].lat} lon={p.stops[0].lon} title={`V okolí: ${p.stops[0].name_sk}`} />

        <p className="note">Dáta: tím SATS-SEO-GIS ({p.licence}). Podklad mapy © OpenStreetMap contributors.</p>
      </main>
    </>
  );
}
