// Jazykové verzie webu (T2-14, S2-6). Slovenčina je predvolená a jej adresy sa nemenia;
// angličtina má vlastné adresy pod /en/ s anglickými segmentmi (lepšie pre vyhľadávanie v EN).
//   sk: /            /trasy/   /trasy/<slug>/       /miesta/<slug>/       /vrcholy/<slug>/
//   en: /en/         /en/trails/ /en/trails/<slug>/  /en/places/<slug>/    /en/peaks/<slug>/
// Next.js pri `output: 'export'` nepodporuje vstavané i18n routovanie, preto je mapovanie tu.

export type Locale = 'sk' | 'en';
export const LOCALES: Locale[] = ['sk', 'en'];
export const DEFAULT_LOCALE: Locale = 'sk';

/** Druh stránky – rovnaký obsah má v každom jazyku inú adresu. */
export type PageKind = 'home' | 'trails' | 'trail' | 'place' | 'peak';

const BASE: Record<Locale, Record<PageKind, string>> = {
  sk: { home: '/', trails: '/trasy/', trail: '/trasy/', place: '/miesta/', peak: '/vrcholy/' },
  en: { home: '/en/', trails: '/en/trails/', trail: '/en/trails/', place: '/en/places/', peak: '/en/peaks/' },
};

/** Hodnoty atribútu hreflang (BCP 47). */
export const HREFLANG: Record<Locale, string> = { sk: 'sk', en: 'en' };

/** Relatívna adresa stránky v danom jazyku (vždy s koncovou lomkou – trailingSlash: true). */
export function pagePath(locale: Locale, kind: PageKind, slug?: string): string {
  const base = BASE[locale][kind];
  return slug ? `${base}${slug}/` : base;
}

/** Mapa hreflang -> adresa pre všetky jazykové verzie + x-default (slovenčina). */
export function languageAlternates(kind: PageKind, slug?: string, siteUrl = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const l of LOCALES) out[HREFLANG[l]] = siteUrl + pagePath(l, kind, slug);
  out['x-default'] = siteUrl + pagePath(DEFAULT_LOCALE, kind, slug);
  return out;
}

/** Hodnota `alternates` pre Next.js Metadata: canonical + <link rel="alternate" hreflang>. */
export function alternatesFor(locale: Locale, kind: PageKind, slug?: string) {
  return { canonical: pagePath(locale, kind, slug), languages: languageAlternates(kind, slug) };
}

export const OG_LOCALE: Record<Locale, string> = { sk: 'sk_SK', en: 'en_GB' };

/** Texty rozhrania. Dátové texty (názvy, opisy) idú z dát – name_en, summary_en, description_en. */
const sk = {
  langName: 'Slovensky',
  switchTo: 'English',
  homeTitle: 'Slovenské mapy – aktívny turizmus, vrcholy a trasy',
  homeDescription:
    'Interaktívna mapa vrcholov a tematických trás Slovenska pre turistov a cyklistov. Rýchla, prehľadná a otvorená.',
  homeH1: 'Slovensko pešo a na bicykli',
  homeLead: 'Vrcholy, trasy a útulne na jednom mieste.',
  mainNav: 'Hlavná navigácia',
  peaksMap: 'Mapa vrcholov',
  trailsHeading: 'Tematické trasy',
  stops: (n: number) => `${n} zastávok`,
  peaksHeading: 'Najvyššie vrcholy',
  trailsTitle: 'Tematické trasy po Slovensku',
  trailsDescription:
    'Sedem tematických trás: hlavná os Slovenska, vínna cesta, hrady na Váhu, Cesta Márie, divočina, cyklotrasy EuroVelo a múzeá.',
  trailsLead: 'Každá trasa je zoradený zoznam zastávok s jednou témou, farbou a pilotnou vlnou.',
  home: '← Domov',
  allTrails: '← Všetky trasy',
  backToMap: '← Späť na mapu',
  difficultyWord: 'obťažnosť',
  pilot: 'Pilot',
  length: 'Dĺžka',
  difficulty: 'Obťažnosť',
  waymark: 'Značenie',
  trailMap: (name: string) => `Mapa trasy ${name}`,
  trailMapAria: 'Mapa trasy',
  trailGeometryNote: 'Čiara ide po cestách a chodníkoch z OpenStreetMap; kde sa cesta nenájde, spája zastávky priamo.',
  stopsHeading: 'Zastávky',
  unescoTitle: 'Svetové dedičstvo UNESCO',
  nearby: (name: string) => `V okolí: ${name}`,
  dataTeam: (licence: string) => `Dáta: tím SATS-SEO-GIS (${licence}). Podklad mapy © OpenStreetMap contributors.`,
  dataBy: (by: string, licence: string) => `Dáta: ${by} (${licence}). Podklad mapy © OpenStreetMap contributors.`,
  team: 'tím SATS-SEO-GIS',
  trailDescription: (summary: string, stops: number, difficulty: string) =>
    `${summary} ${stops} zastávok, obťažnosť ${difficulty}.`,
  type: 'Typ',
  elevation: 'Výška',
  elevationValue: (m: number) => `${m} m n. m.`,
  coordinates: 'Súradnice',
  approx: '(približné)',
  placeMap: (name: string) => `Mapa: ${name}`,
  placeMapAria: 'Mapa miesta',
  onTrails: 'Na trasách',
  showOnOsm: 'Zobraziť na OpenStreetMap',
  country: 'Slovensko',
  peakDescription: (name: string, m: number) =>
    `Vrchol ${name} s výškou ${m} m n. m. Poloha, súradnice a odkaz na mapu.`,
  placeFallback: (name: string, category: string, unesco: boolean, trails: string[]) =>
    [`${name} – ${category} na Slovensku${unesco ? ', pamiatka UNESCO' : ''}`,
      ...(trails.length ? [`Zastávka na trase ${trails.join(', ')}`] : [])].join('. ') + '.',
  mapLoad: 'Zobraziť interaktívnu mapu',
  mapLoading: 'Načítavam mapu…',
  mapError: 'Mapu sa nepodarilo načítať – skúsiť znova',
  mapLegend: 'Legenda',
};

export type Dict = typeof sk;

const en: Dict = {
  langName: 'English',
  switchTo: 'Slovensky',
  homeTitle: 'Slovenské mapy – active tourism, peaks and trails in Slovakia',
  homeDescription:
    'Interactive map of peaks and thematic trails in Slovakia for hikers and cyclists. Fast, clear and open.',
  homeH1: 'Slovakia on foot and by bike',
  homeLead: 'Peaks, trails and shelters in one place.',
  mainNav: 'Main navigation',
  peaksMap: 'Map of peaks',
  trailsHeading: 'Thematic trails',
  stops: (n: number) => `${n} stops`,
  peaksHeading: 'Highest peaks',
  trailsTitle: 'Thematic trails across Slovakia',
  trailsDescription:
    'Seven thematic trails: the main spine of Slovakia, the wine route, castles along the Váh, the Way of Mary, wilderness, EuroVelo cycle routes and museums.',
  trailsLead: 'Each trail is an ordered list of stops with one theme, colour and pilot wave.',
  home: '← Home',
  allTrails: '← All trails',
  backToMap: '← Back to the map',
  difficultyWord: 'difficulty',
  pilot: 'Pilot',
  length: 'Length',
  difficulty: 'Difficulty',
  waymark: 'Waymarks',
  trailMap: (name: string) => `Map of the trail ${name}`,
  trailMapAria: 'Trail map',
  trailGeometryNote: 'The line follows OpenStreetMap roads and paths; where no way is found, it joins the stops directly.',
  stopsHeading: 'Stops',
  unescoTitle: 'UNESCO World Heritage',
  nearby: (name: string) => `Nearby: ${name}`,
  dataTeam: (licence: string) => `Data: SATS-SEO-GIS team (${licence}). Base map © OpenStreetMap contributors.`,
  dataBy: (by: string, licence: string) => `Data: ${by} (${licence}). Base map © OpenStreetMap contributors.`,
  team: 'SATS-SEO-GIS team',
  trailDescription: (summary: string, stops: number, difficulty: string) =>
    `${summary} ${stops} stops, ${difficulty} difficulty.`,
  type: 'Type',
  elevation: 'Elevation',
  elevationValue: (m: number) => `${m} m a.s.l.`,
  coordinates: 'Coordinates',
  approx: '(approximate)',
  placeMap: (name: string) => `Map: ${name}`,
  placeMapAria: 'Map of the place',
  onTrails: 'On the trails',
  showOnOsm: 'Show on OpenStreetMap',
  country: 'Slovakia',
  peakDescription: (name: string, m: number) =>
    `${name}, a peak ${m} m above sea level. Location, coordinates and a link to the map.`,
  placeFallback: (name: string, category: string, unesco: boolean, trails: string[]) =>
    [`${name} – ${category} in Slovakia${unesco ? ', UNESCO World Heritage site' : ''}`,
      ...(trails.length ? [`A stop on the ${trails.join(', ')} trail${trails.length > 1 ? 's' : ''}`] : [])].join('. ') + '.',
  mapLoad: 'Show interactive map',
  mapLoading: 'Loading the map…',
  mapError: 'The map could not be loaded – try again',
  mapLegend: 'Legend',
};

export const T: Record<Locale, Dict> = { sk, en };

/** Text v jazyku stránky s náhradou za slovenčinu, ak preklad v dátach chýba. */
export function pick(locale: Locale, skText: string, enText: string | null | undefined): string {
  return locale === 'en' && enText ? enText : skText;
}

/** Texty tlačidla mapy pre MapLoader (posielajú sa ako props). */
export function mapTexts(locale: Locale) {
  const t = T[locale];
  return { load: t.mapLoad, loading: t.mapLoading, error: t.mapError, legend: t.mapLegend };
}
