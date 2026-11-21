// Miesta (POI) tieru T1 pre SSG stránky /miesta/<slug>/ (T2-10, US-1b).
// Zdroj: public/data/pois.json, ktorý vyrába `python -m pipelines.export_static` (z PostGIS alebo --from-seed).
// Číta sa len pri builde. Polia opisu, výšky a Wikidata sú zatiaľ prázdne – doplní ich T2-05 / T2-07.
import { poiGroupOf } from './map/style';
import fs from 'node:fs';
import path from 'node:path';
import { pagePath, pick, T, type Locale } from './i18n';
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
  /** Doplnené z DB (T3-11): obrázok z Wikimedia Commons (URL), otváracie hodiny (syntax OSM),
   *  chránené územie ŠOP SR a pamiatkové územie PÚSR, v ktorom miesto leží. Chýbajú pri exporte zo seedu. */
  image?: string | null;
  opening_hours?: string | null;
  protected_area?: string | null;
  heritage_area?: string | null;
  /** Autor a licencia obrázka z Wikimedia Commons (T3-12) – potrebné na atribúciu, keď sa obrázok zobrazí. */
  image_author?: string | null;
  image_licence?: string | null;
  image_licence_url?: string | null;
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

export const CATEGORY_EN: Record<string, string> = {
  castle: 'castle',
  town: 'town',
  village: 'village',
  church: 'church',
  monastery: 'monastery',
  museum: 'museum',
  nature: 'nature site',
  lake: 'lake',
  gorge: 'gorge',
  cave: 'cave',
  spa: 'spa',
  winery: 'winery',
  viewpoint: 'viewpoint',
  dam: 'reservoir',
  port: 'port',
  trailhead: 'trailhead',
  peak: 'peak',
};

export function categorySk(category: string): string {
  return CATEGORY_SK[category] ?? category;
}

export function categoryLabel(category: string, locale: Locale = 'sk'): string {
  return (locale === 'en' ? CATEGORY_EN : CATEGORY_SK)[category] ?? category;
}

/** Názov miesta v jazyku stránky (náhrada za slovenčinu, ak preklad chýba). */
export function poiName(p: Poi, locale: Locale = 'sk'): string {
  return pick(locale, p.name_sk, p.name_en);
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

/** Meta description: kurátorský opis, ak je dosť dlhý, inak veta poskladaná z faktov (s krátkym opisom na začiatku). */
export function poiDescription(p: Poi, pathNames: string[] = [], locale: Locale = 'sk'): string {
  const curated = locale === 'en' ? p.description_en : p.description_sk;
  if (curated && curated.length >= DESCRIPTION_MIN) return curated;
  const t = T[locale];
  // Krátky opis z Wikidata („hrad na Slovensku“) by SEO kontrola odmietla (dĺžka, duplicita) – ide pred vetu z faktov.
  const lead = curated ? `${curated[0].toUpperCase()}${curated.slice(1)}. ` : '';
  const build = (shown: number) =>
    lead + t.placeFallback(poiName(p, locale), categoryLabel(p.category, locale), p.unesco, pathNames.slice(0, shown), pathNames.length - shown);
  // Miesto na veľa trasách: vymenujeme len toľko trás, aby opis neprekročil 160 znakov (Google ho inak skráti);
  // ak sa nezmestí ani jedna, veta o trasách vypadne (trasy sú na stránke v zozname „Na trasách“).
  let shown = pathNames.length;
  while (shown > 0 && build(shown).length > DESCRIPTION_MAX) shown--;
  const base = build(shown);
  // Krátky opis Google často nahradí náhodným výrezom stránky (SEO audit T3-21) – doplníme, čo stránka ponúka.
  return base.length < FALLBACK_MIN ? `${base} ${t.placeMore}` : base;
}

/** Najkratšia description, ktorú SEO kontrola pripustí (description-length). */
export const DESCRIPTION_MIN = 70;
/** Pod túto dĺžku sa poskladaný opis miesta doplní o vetu o obsahu stránky. */
export const FALLBACK_MIN = 100;
/** Dĺžka, nad ktorú Google meta description skracuje (SEO kontrola: description-length). */
export const DESCRIPTION_MAX = 160;

export function poiToGeoJSON(p: Poi, locale: Locale = 'sk'): FeatureCollection<PointFeature> {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { id: p.slug, name: poiName(p, locale), color: poiGroupOf(p.category).color },
        geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
      },
    ],
  };
}

export type PoiImage = {
  /** Náhľad v rozumnej veľkosti (Special:FilePath s width), vždy cez https. */
  src: string;
  /** Stránka súboru na Wikimedia Commons (zdroj, plná atribúcia). */
  page: string;
  author: string | null;
  licence: string | null;
  licenceUrl: string | null;
};

// 500 px (štandardná veľkosť náhľadu Commons): 960 px má ~230 kB a na mobile (Slow 4G) prekročí LCP budget.
const IMAGE_WIDTH = 500;

/** Obrázok miesta z Wikimedia Commons (T3-13) alebo null, ak ho miesto nemá alebo URL nie je z Commons. */
export function poiImage(p: Poi, width = IMAGE_WIDTH): PoiImage | null {
  if (!p.image || !URL.canParse(p.image)) return null;
  const url = new URL(p.image);
  const marker = '/wiki/Special:FilePath/';
  if (!/(^|\.)wikimedia\.org$/.test(url.hostname) || !url.pathname.startsWith(marker)) return null;
  const file = decodeURIComponent(url.pathname.slice(marker.length));
  const encoded = encodeURIComponent(file.replace(/ /g, '_'));
  return {
    src: `https://commons.wikimedia.org${marker}${encoded}?width=${width}`,
    page: `https://commons.wikimedia.org/wiki/File:${encoded}`,
    author: p.image_author ?? null,
    licence: p.image_licence ?? null,
    licenceUrl: p.image_licence_url ?? null,
  };
}

/** JSON-LD stránky miesta (schema.org). Čistá funkcia, aby sa dala testovať bez buildu.
 *  Jazyk stránky nesie <html lang> a hreflang – inLanguage na Place schema.org nepovoľuje. */
/** `paths` nesú názov trasy už v jazyku stránky (name_sk = zobrazený názov). */
export function poiJsonLd(p: Poi, siteUrl: string, paths: { slug: string; name_sk: string }[] = [], locale: Locale = 'sk') {
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': schemaTypes(p.category),
    name: poiName(p, locale),
    description: poiDescription(p, paths.map((x) => x.name_sk), locale),
    url: siteUrl + pagePath(locale, 'place', p.slug),
    geo: {
      '@type': 'GeoCoordinates',
      latitude: p.lat,
      longitude: p.lon,
      ...(p.elevation_m != null ? { elevation: p.elevation_m } : {}),
    },
    containedInPlace: { '@type': 'Country', name: T[locale].country },
    isAccessibleForFree: true,
  };
  const other = locale === 'en' ? p.name_sk : p.name_en;
  if (other && other !== data.name) data.alternateName = other;
  if (p.wikidata_id) data.sameAs = `https://www.wikidata.org/wiki/${p.wikidata_id}`;
  const image = poiImage(p);
  if (image) data.image = image.src;
  // Väzbu miesto -> trasa nesie TouristTrip.itinerary na stránke trasy. Opačný smer (subjectOf)
  // schema.org nepovoľuje: subjectOf očakáva CreativeWork/Event, TouristTrip je Intangible.
  return data;
}
