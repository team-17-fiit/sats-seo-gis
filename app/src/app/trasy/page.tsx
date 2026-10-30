// Prehľad 7 tematických trás (SSG). Crawlovateľný zoznam s odkazmi na detail každej trasy.
import type { Metadata } from 'next';
import Link from 'next/link';
import JsonLd from '@/components/JsonLd';
import Stripes from '@/components/Stripes';
import { DIFFICULTY_SK, getPaths } from '@/lib/paths';
import { SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Tematické trasy po Slovensku',
  description:
    'Sedem tematických trás: hlavná os Slovenska, vínna cesta, hrady na Váhu, Cesta Márie, divočina, cyklotrasy EuroVelo a múzeá.',
  alternates: { canonical: '/trasy/' },
};

export default function PathsPage() {
  const paths = getPaths();
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: 'Tematické trasy',
          itemListElement: paths.map((p, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: `${SITE_URL}/trasy/${p.slug}/`,
            name: p.name_sk,
          })),
        }}
      />
      <header className="top">
        <Stripes />
        <p><Link href="/">← Domov</Link></p>
        <h1>Tematické trasy</h1>
        <p>Každá trasa je zoradený zoznam zastávok s jednou témou, farbou a pilotnou vlnou.</p>
      </header>
      <main>
        <ul className="path-list" id="path-list">
          {paths.map((p) => (
            <li key={p.slug} className="path-card" style={{ borderLeftColor: p.colour }}>
              <h2><Link href={`/trasy/${p.slug}/`}>{p.name_sk}</Link></h2>
              <p className="path-meta">
                {p.length_km ? `≈ ${p.length_km} km · ` : ''}
                {p.stops.length} zastávok · obťažnosť {DIFFICULTY_SK[p.difficulty]} · pilot {p.pilot_code}
              </p>
              {p.summary_sk && <p>{p.summary_sk}</p>}
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
