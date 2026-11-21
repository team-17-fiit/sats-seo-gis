// Štýl mapy (T3-10): farby miest podľa skupiny kategórií a farba vrcholov.
// Jeden zdroj pravdy pre MapLibre, statický náhľad aj legendu pod mapou.
// Farby sa nesmú biť s farbami trás (paths.json: červená, fialová, oranžová, modrá, zelená, svetlomodrá,
// hnedá) ani s jantárovým okrajom UNESCO – kontroluje to style.test.ts.

export type PoiGroupId = 'heritage' | 'towns' | 'nature' | 'other';

export type PoiGroup = { id: PoiGroupId; color: string; categories: readonly string[] };

export const POI_GROUPS: readonly PoiGroup[] = [
  // hrady, kostoly, kláštory
  { id: 'heritage', color: '#ad1457', categories: ['castle', 'church', 'monastery'] },
  // mestá, obce, múzeá a galérie
  { id: 'towns', color: '#546e7a', categories: ['town', 'village', 'museum'] },
  // prírodné miesta
  { id: 'nature', color: '#00796b', categories: ['nature', 'cave', 'gorge', 'lake', 'viewpoint', 'trailhead', 'peak'] },
  // kúpele, vinárstva, vodné diela, prístavy a všetko ostatné
  { id: 'other', color: '#827717', categories: ['spa', 'winery', 'dam', 'port'] },
];

const OTHER = POI_GROUPS[POI_GROUPS.length - 1];

/** Vrcholy (Najvyššie vrcholy) – tmavé, aby sa nepliedli s červenou trasou Hlavná os. */
export const PEAK_COLOR = '#212121';

/** Skupina miesta podľa kategórie; neznáma kategória patrí do „ostatné“. */
export function poiGroupOf(category: string | null | undefined): PoiGroup {
  return POI_GROUPS.find((g) => category && g.categories.includes(category)) ?? OTHER;
}

/** MapLibre výraz pre farbu kruhu miesta podľa vlastnosti `category` (vrstva `pois` v PMTiles). */
export function poiColorExpression(): unknown[] {
  const pairs = POI_GROUPS.flatMap((g) => g.categories.flatMap((c) => [c, g.color]));
  return ['match', ['get', 'category'], ...pairs, OTHER.color];
}
