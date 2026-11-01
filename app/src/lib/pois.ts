// Miesta (POI) tieru T1 pre SSG stránky /miesta/<slug>/ (T2-10, US-1b).
// Zdroj: public/data/pois.json, ktorý vyrába `python -m pipelines.export_static` (z PostGIS alebo --from-seed).
// Číta sa len pri builde. Polia opisu, výšky a Wikidata sú zatiaľ prázdne – doplní ich T2-05 / T2-07.
import fs from 'node:fs';
import path from 'node:path';
import type { FeatureCollection, PointFeature } from './map/types';

export type Poi = {
  slug: string;
  name_sk: string;
  name_en: string | null;
  category: string;
  tier: number;
  unesco: boolean;
  lat: number;
  lon: number;
  elevation_m: number | null;
  wikidata_id: string | null;
  description_sk: string | null;
  description_en: string | null;
  source: string;
  licence: string;
  attribution: string | null;
  /** Slugy trás, na ktorých je miesto zastávkou (v poradí trás zo seedu). */
  paths: string[];
};

export const CATEGORY_SK: Record<string, string> = {
  castle: 'hrad',
  town: 'mesto',
  village: 'obec',
  church: 'kostol',
  monastery: 'kláštor',
  museum: 'múzeum',
  nature: 'príroda',
  lake: 'jazero',
  gorge: 'tiesňava',
  cave: 'jaskyňa',
  spa: 'kúpele',
  winery: 'vinárstvo',
  viewpoint: 'vyhliadka',
  dam: 'vodná nádrž',
  port: 'prístav',
  trailhead: 'východisko trás',
  peak: 'vrchol',
};

export function categorySk(category: string): string {
  return CATEGORY_SK[category] ?? category;
}

/** Konkrétnejší schema.org typ podľa kategórie; TouristAttraction je vždy prvý (dokumentácia, výpis 5.3). */
const SCHEMA_TYPE: Record<string, string> = {
  castle: 'LandmarksOrHistoricalBuildings',
  monastery: 'LandmarksOrHistoricalBuildings',
  church: 'Church',
  museum: 'Museum',
  lake: 'LakeBodyOfWater',
  winery: 'Winery',
  town: 'City',
  peak: 'Mountain',
};

export function schemaTypes(category: string): string[] {
  const extra = SCHEMA_TYPE[category];
  return extra ? ['TouristAttraction', extra] : ['TouristAttraction'];
}

let cache: Poi[] | null = null;

export function parsePois(json: unknown): Poi[] {
  if (!Array.isArray(json)) throw new Error('pois.json musí byť pole miest');
  const seen = new Set<string>();
  for (const p of json as Poi[]) {
    if (seen.has(p.slug)) throw new Error(`duplicitný slug miesta: ${p.slug}`);
    seen.add(p.slug);
  }
  return json as Poi[];
}

export function getPois(): Poi[] {
  if (cache) return cache;
  const file = path.join(process.cwd(), 'public', 'data', 'pois.json');
  cache = parsePois(JSON.parse(fs.readFileSync(file, 'utf8')));
  return cache;
}

export function getPoi(slug: string): Poi | undefined {
  return getPois().find((p) => p.slug === slug);
}

/** Meta description: kurátorský opis, ak existuje, inak veta poskladaná z faktov. */
export function poiDescription(p: Poi, pathNames: string[] = []): string {
  if (p.description_sk) return p.description_sk;
  const parts = [`${p.name_sk} – ${categorySk(p.category)} na Slovensku`];
  if (p.unesco) parts[0] += ', pamiatka UNESCO';
  if (pathNames.length) parts.push(`Zastávka na trase ${pathNames.join(', ')}`);
  return parts.join('. ') + '.';
}

export function poiToGeoJSON(p: Poi): FeatureCollection<PointFeature> {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { id: p.slug, name: p.name_sk },
        geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
      },
    ],
  };
}

/** JSON-LD stránky miesta (schema.org). Čistá funkcia, aby sa dala testovať bez buildu. */
export function poiJsonLd(p: Poi, siteUrl: string, paths: { slug: string; name_sk: string }[] = []) {
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': schemaTypes(p.category),
    name: p.name_sk,
    description: poiDescription(p, paths.map((x) => x.name_sk)),
    url: `${siteUrl}/miesta/${p.slug}/`,
    inLanguage: 'sk-SK',
    geo: {
      '@type': 'GeoCoordinates',
      latitude: p.lat,
      longitude: p.lon,
      ...(p.elevation_m != null ? { elevation: p.elevation_m } : {}),
    },
    containedInPlace: { '@type': 'Country', name: 'Slovensko' },
    isAccessibleForFree: true,
  };
  if (p.name_en) data.alternateName = p.name_en;
  if (p.wikidata_id) data.sameAs = `https://www.wikidata.org/wiki/${p.wikidata_id}`;
  if (paths.length) {
    data.subjectOf = paths.map((x) => ({ '@type': 'TouristTrip', name: x.name_sk, url: `${siteUrl}/trasy/${x.slug}/` }));
  }
  return data;
}
