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

export type PluralForms = { one: string; few?: string; other: string };

const PLURAL_RULES: Record<Locale, Intl.PluralRules> = {
  sk: new Intl.PluralRules('sk'),
  en: new Intl.PluralRules('en'),
};

export function plural(locale: Locale, n: number, forms: PluralForms): string {
  const category = PLURAL_RULES[locale].select(n);
  const word = category === 'one' ? forms.one : category === 'few' ? (forms.few ?? forms.other) : forms.other;
  return `${n} ${word}`;
}

const SK_STOPS: PluralForms = { one: 'zastávka', few: 'zastávky', other: 'zastávok' };
const SK_TRAILS: PluralForms = { one: 'trasa', few: 'trasy', other: 'trás' };
const SK_THEMATIC_TRAILS: PluralForms = { one: 'tematická trasa', few: 'tematické trasy', other: 'tematických trás' };
const SK_PLACES: PluralForms = { one: 'miesto', few: 'miesta', other: 'miest' };
const SK_PEAKS: PluralForms = { one: 'vrchol', few: 'vrcholy', other: 'vrcholov' };
const EN_STOPS: PluralForms = { one: 'stop', other: 'stops' };
const EN_TRAILS: PluralForms = { one: 'trail', other: 'trails' };
const EN_THEMATIC_TRAILS: PluralForms = { one: 'thematic trail', other: 'thematic trails' };
const EN_PLACES: PluralForms = { one: 'place', other: 'places' };
const EN_PEAKS: PluralForms = { one: 'peak', other: 'peaks' };

/** „A, B a C“ / „A, B a ďalších 2“ – zoznam trás v slovenskej vete. */
function listSk(items: string[], more: number): string {
  const tail = more > 0 ? (more === 1 ? 'jednej ďalšej' : `ďalších ${more}`) : null;
  const all = tail ? [...items, tail] : items;
  return all.length === 1 ? all[0] : `${all.slice(0, -1).join(', ')} a ${all[all.length - 1]}`;
}

/** "A, B and C" – trail list in an English sentence. */
function listEn(items: string[]): string {
  return items.length === 1 ? items[0] : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** Texty rozhrania. Dátové texty (názvy, opisy) idú z dát – name_en, summary_en, description_en. */
const sk = {
  langName: 'Slovensky',
  switchTo: 'English',
  skipToContent: 'Preskočiť na obsah',
  toggleTheme: 'Prepnúť svetlú / tmavú tému',
  homeTitle: 'Aktívny turizmus na Slovensku – mapa vrcholov a trás',
  homeDescription:
    'Interaktívna mapa vrcholov a tematických trás Slovenska pre turistov a cyklistov. Rýchla, prehľadná a otvorená.',
  homeH1: 'Slovensko pešo a na bicykli',
  homeLead: 'Vrcholy, trasy a útulne na jednom mieste.',
  mainNav: 'Hlavná navigácia',
  peaksMap: 'Mapa vrcholov',
  trailsHeading: 'Tematické trasy',
  stops: (n: number) => plural('sk', n, SK_STOPS),
  peaksHeading: 'Najvyššie vrcholy',
  trailsTitle: 'Tematické trasy po Slovensku',
  trailsDescription:
    'Sedem tematických trás: hlavná os Slovenska, vínna cesta, hrady na Váhu, Cesta Márie, divočina, cyklotrasy EuroVelo a múzeá.',
  trailsLead: 'Každá trasa je zoradený zoznam zastávok s jednou témou, farbou a pilotnou vlnou.',
  home: '← Domov',
  crumbHome: 'Domov',
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
    `${summary} ${plural('sk', stops, SK_STOPS)}, obťažnosť ${difficulty}.`,
  type: 'Typ',
  elevation: 'Výška',
  elevationValue: (m: number) => `${m} m n. m.`,
  coordinates: 'Súradnice',
  protectedArea: 'Chránené územie',
  heritageArea: 'Pamiatkové územie',
  openingHours: 'Otváracie hodiny',
  photo: 'Foto',
  approx: '(približné)',
  placeMap: (name: string) => `Mapa: ${name}`,
  placeMapAria: 'Mapa miesta',
  onTrails: 'Na trasách',
  showOnOsm: 'Zobraziť na OpenStreetMap',
  country: 'Slovensko',
  ogTrail: 'Tematická trasa',
  ogPeak: 'Vrchol',
  ogOnTrail: (trail: string) => `Na trase ${trail}`,
  ogHome: (trails: number, places: number, peaks: number) =>
    [plural('sk', trails, SK_THEMATIC_TRAILS), plural('sk', places, SK_PLACES), plural('sk', peaks, SK_PEAKS)].join(' · '),
  ogTrails: (trails: number, stops: number) =>
    `${plural('sk', trails, SK_TRAILS)} · ${plural('sk', stops, SK_STOPS)} po celom Slovensku`,
  ogTrailFacts: (km: number | null, stops: number, difficulty: string) =>
    [km ? `~${km} km` : null, plural('sk', stops, SK_STOPS), `obťažnosť ${difficulty}`].filter(Boolean).join(' · '),
  ogElevation: (m: number) => `${m} m n. m.`,
  peakTitle: (name: string, m: number) => `${name} – vrchol, ${m} m n. m.`,
  peakDescription: (name: string, m: number) =>
    `${name} – vrchol s výškou ${m} m n. m. na Slovensku. Poloha na mape, GPS súradnice a odkaz na OpenStreetMap.`,
  placeTitleWithCategory: (name: string, category: string) => `${name} – ${category}`,
  placeMore: 'Poloha na mape, súradnice a súvisiace trasy.',
  /** `more` = počet ďalších trás, ktoré sa do opisu nezmestili (meta description ≤ 160 znakov). */
  placeFallback: (name: string, category: string, unesco: boolean, trails: string[], more = 0) =>
    [`${name} – ${category} na Slovensku${unesco ? ', pamiatka UNESCO' : ''}`,
      ...(trails.length ? [trails.length + more === 1 ? `Zastávka na trase ${trails[0]}` : `Zastávka na trasách ${listSk(trails, more)}`] : [])].join('. ') + '.',
  mapLoad: 'Zobraziť interaktívnu mapu',
  mapLoading: 'Načítavam mapu…',
  mapError: 'Mapu sa nepodarilo načítať – skúsiť znova',
  mapLegend: 'Legenda',
};

export type Dict = typeof sk;

const en: Dict = {
  langName: 'English',
  switchTo: 'Slovensky',
  skipToContent: 'Skip to content',
  toggleTheme: 'Switch light / dark theme',
  homeTitle: 'Active tourism in Slovakia – map of peaks and trails',
  homeDescription:
    'Interactive map of peaks and thematic trails in Slovakia for hikers and cyclists. Fast, clear and open.',
  homeH1: 'Slovakia on foot and by bike',
  homeLead: 'Peaks, trails and shelters in one place.',
  mainNav: 'Main navigation',
  peaksMap: 'Map of peaks',
  trailsHeading: 'Thematic trails',
  stops: (n: number) => plural('en', n, EN_STOPS),
  peaksHeading: 'Highest peaks',
  trailsTitle: 'Thematic trails across Slovakia',
  trailsDescription:
    'Seven thematic trails: the main spine of Slovakia, the wine route, castles along the Váh, the Way of Mary, wilderness, EuroVelo cycle routes and museums.',
  trailsLead: 'Each trail is an ordered list of stops with one theme, colour and pilot wave.',
  home: '← Home',
  crumbHome: 'Home',
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
    `${summary} ${plural('en', stops, EN_STOPS)}, ${difficulty} difficulty.`,
  type: 'Type',
  elevation: 'Elevation',
  elevationValue: (m: number) => `${m} m a.s.l.`,
  coordinates: 'Coordinates',
  protectedArea: 'Protected area',
  heritageArea: 'Heritage area',
  openingHours: 'Opening hours',
  photo: 'Photo',
  approx: '(approximate)',
  placeMap: (name: string) => `Map: ${name}`,
  placeMapAria: 'Map of the place',
  onTrails: 'On the trails',
  showOnOsm: 'Show on OpenStreetMap',
  country: 'Slovakia',
  ogTrail: 'Thematic trail',
  ogPeak: 'Peak',
  ogOnTrail: (trail: string) => `On the ${trail} trail`,
  ogHome: (trails: number, places: number, peaks: number) =>
    [plural('en', trails, EN_THEMATIC_TRAILS), plural('en', places, EN_PLACES), plural('en', peaks, EN_PEAKS)].join(' · '),
  ogTrails: (trails: number, stops: number) =>
    `${plural('en', trails, EN_TRAILS)} · ${plural('en', stops, EN_STOPS)} across Slovakia`,
  ogTrailFacts: (km: number | null, stops: number, difficulty: string) =>
    [km ? `~${km} km` : null, plural('en', stops, EN_STOPS), `${difficulty} difficulty`].filter(Boolean).join(' · '),
  ogElevation: (m: number) => `${m} m a.s.l.`,
  peakTitle: (name: string, m: number) => `${name} – peak, ${m} m a.s.l.`,
  peakDescription: (name: string, m: number) =>
    `${name}, a peak in Slovakia ${m} m above sea level. Location on the map, GPS coordinates and a link to OpenStreetMap.`,
  placeTitleWithCategory: (name: string, category: string) => `${name} – ${category} in Slovakia`,
  placeMore: 'Location on the map, coordinates and related trails.',
  placeFallback: (name: string, category: string, unesco: boolean, trails: string[], more = 0) =>
    [`${name} – ${category} in Slovakia${unesco ? ', UNESCO World Heritage site' : ''}`,
      ...(trails.length ? [`A stop on the ${listEn(trails)} trail${trails.length > 1 ? 's' : ''}${more ? ` and ${more} more` : ''}`] : [])].join('. ') + '.',
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
