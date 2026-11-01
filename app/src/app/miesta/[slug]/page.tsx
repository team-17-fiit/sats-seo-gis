// Stránka miesta (SSG, T2-10): každé miesto tieru T1 má vlastnú crawlovateľnú URL /miesta/<slug>/
// s canonical adresou a štruktúrovanými dátami schema.org (TouristAttraction + konkrétny typ).
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import JsonLd from '@/components/JsonLd';
import MapLoader from '@/components/MapLoader';
import NearbyPois from '@/components/NearbyPois';
import Stripes from '@/components/Stripes';
import { getPath } from '@/lib/paths';
import { categorySk, getPoi, getPois, poiDescription, poiJsonLd, poiToGeoJSON, type Poi } from '@/lib/pois';
import { SITE_URL } from '@/lib/site';

export const dynamicParams = false; // iné adresy ako vygenerované vrátia 404

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getPois().map((p) => ({ slug: p.slug }));
}

function pathsOf(p: Poi) {
  return p.paths.flatMap((slug) => {
    const path = getPath(slug);
    return path ? [{ slug: path.slug, name_sk: path.name_sk, colour: path.colour }] : [];
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = getPoi(slug);
  if (!p) return {};
  const description = poiDescription(p, pathsOf(p).map((x) => x.name_sk));
  return {
    title: p.name_sk,
    description,
    alternates: { canonical: `/miesta/${p.slug}/` },
    openGraph: { title: p.name_sk, description, type: 'article' },
  };
}

export default async function PoiPage({ params }: Props) {
  const { slug } = await params;
  const p = getPoi(slug);
  if (!p) notFound();
  const paths = pathsOf(p);
  const osm = `https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lon}#map=15/${p.lat}/${p.lon}`;

  return (
    <>
      <JsonLd data={poiJsonLd(p, SITE_URL, paths)} />
      <header className="top">
        <Stripes />
        <p>
          {paths[0] ? <Link href={`/trasy/${paths[0].slug}/`}>← {paths[0].name_sk}</Link> : <Link href="/trasy/">← Všetky trasy</Link>}
        </p>
        <h1>{p.name_sk}</h1>
        {p.name_en && p.name_en !== p.name_sk && <p lang="en" className="muted">{p.name_en}</p>}
      </header>
      <main>
        <p>{poiDescription(p, paths.map((x) => x.name_sk))}</p>

        <dl className="facts">
          <dt>Typ</dt>
          <dd>
            {categorySk(p.category)}
            {p.unesco && <span className="badge" title="Svetové dedičstvo UNESCO">UNESCO</span>}
          </dd>
          {p.elevation_m != null && (<><dt>Výška</dt><dd>{p.elevation_m} m n. m.</dd></>)}
          <dt>Súradnice</dt>
          <dd>{p.lat.toFixed(4)} °N, {p.lon.toFixed(4)} °E (približné)</dd>
        </dl>

        <section aria-label="Mapa miesta">
          <MapLoader
            label={`Mapa: ${p.name_sk}`}
            center={[p.lon, p.lat]}
            zoom={13}
            layers={[{ id: 'poi', kind: 'points', color: paths[0]?.colour ?? '#1f4d3a', data: poiToGeoJSON(p) }]}
          />
        </section>

        {paths.length > 0 && (
          <section>
            <h2>Na trasách</h2>
            <ul className="path-links" id="poi-paths">
              {paths.map((x) => (
                <li key={x.slug}>
                  <span className="swatch" style={{ background: x.colour }} aria-hidden="true" />
                  <Link href={`/trasy/${x.slug}/`}>{x.name_sk}</Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <NearbyPois lat={p.lat} lon={p.lon} title={`V okolí: ${p.name_sk}`} />

        <p>
          <a href={osm} rel="noopener noreferrer">Zobraziť na OpenStreetMap</a>
          {p.wikidata_id && (<> · <a href={`https://www.wikidata.org/wiki/${p.wikidata_id}`} rel="noopener noreferrer">Wikidata</a></>)}
        </p>
        <p className="note">
          Dáta: {p.attribution ?? 'tím SATS-SEO-GIS'} ({p.licence}). Podklad mapy © OpenStreetMap contributors.
        </p>
      </main>
    </>
  );
}
