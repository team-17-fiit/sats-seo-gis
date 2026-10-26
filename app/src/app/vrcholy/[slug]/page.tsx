// Podstránka jedného vrcholu, generovaná pri builde z peaks.geojson (SSG).
// Každý vrchol = vlastná crawlovateľná URL /vrcholy/<slug>/ so schema.org dátami.
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import JsonLd from '@/components/JsonLd';
import Stripes from '@/components/Stripes';
import { getPeak, getPeaks } from '@/lib/peaks';
import { SITE_URL } from '@/lib/site';

export const dynamicParams = false; // iné adresy ako vygenerované vrátia 404

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getPeaks().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const peak = getPeak(slug);
  if (!peak) return {};
  const title = `${peak.name} (${peak.elevation} m)`;
  const description = `Vrchol ${peak.name} s výškou ${peak.elevation} m n. m. Poloha, súradnice a odkaz na mapu.`;
  return {
    title,
    description,
    alternates: { canonical: `/vrcholy/${peak.slug}/` },
    openGraph: { title, description, type: 'article' },
  };
}

export default async function PeakPage({ params }: Props) {
  const { slug } = await params;
  const peak = getPeak(slug);
  if (!peak) notFound();

  const osm = `https://www.openstreetmap.org/?mlat=${peak.lat}&mlon=${peak.lon}#map=14/${peak.lat}/${peak.lon}`;

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Mountain',
          name: peak.name,
          url: `${SITE_URL}/vrcholy/${peak.slug}/`,
          geo: {
            '@type': 'GeoCoordinates',
            latitude: peak.lat,
            longitude: peak.lon,
            elevation: peak.elevation,
          },
          containedInPlace: { '@type': 'Country', name: 'Slovensko' },
        }}
      />
      <header className="top">
        <Stripes />
        <p><Link href="/">← Späť na mapu</Link></p>
        <h1>{peak.name}</h1>
      </header>
      <main>
        <section className="peak-detail">
          <dl>
            <dt>Výška</dt>
            <dd>{peak.elevation} m n. m.</dd>
            <dt>Súradnice</dt>
            <dd>{peak.lat.toFixed(4)} °N, {peak.lon.toFixed(4)} °E (približné)</dd>
          </dl>
          <p>
            <a href={osm} rel="noopener noreferrer">Zobraziť na OpenStreetMap</a>
          </p>
        </section>
      </main>
    </>
  );
}
