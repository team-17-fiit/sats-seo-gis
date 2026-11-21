// MapAdapter – šev medzi UI a mapovou knižnicou (ADR-0003, listing 5.1 dokumentácie).
// Stránky a komponenty importujú LEN tieto typy a createMap(), nikdy nie maplibre-gl priamo.

export type LngLat = [lon: number, lat: number];

export type PointFeature = {
  type: 'Feature';
  /**
   * `unesco` = zastávka ⋆ zo Zoznamu svetového dedičstva (kap. 4.6) – kreslí sa zvýraznená.
   * `color` = farba bodu podľa skupiny kategórie (T3-10); bez nej sa použije farba vrstvy.
   */
  properties: { id: string; name: string; label?: string; unesco?: boolean; color?: string };
  geometry: { type: 'Point'; coordinates: LngLat };
};

export type LineFeature = {
  type: 'Feature';
  properties: { id: string; name: string };
  geometry: { type: 'LineString'; coordinates: LngLat[] };
};

/** Okraj UNESCO zastávky – rovnaký v MapLibre aj v statickom náhľade (= --color-focus). */
export const UNESCO_COLOR = '#ffb300';

export type FeatureCollection<F> = { type: 'FeatureCollection'; features: F[] };

/**
 * Zlučovanie blízkych bodov pri oddialení (T2-02). `true` = predvolené nastavenia (CLUSTER_DEFAULTS
 * v cluster.ts); `radius` je v pixeloch, `maxZoom` je posledný zoom, na ktorom sa ešte zlučuje.
 */
export type ClusterSpec = boolean | { radius?: number; maxZoom?: number };

/**
 * Vlastné vektorové dlaždice PMTiles (T3-09, ADR-0003) s vrstvami `paths` (čiary trás vo farbe `colour`)
 * a `pois` (miesta, `tier` 1–3, `unesco`). `url` je cesta k súboru .pmtiles na tom istom webe.
 * Vlastnosti prvkov sú rovnaké ako v marts.mart_tiles (migrácia 010).
 */
export type TilesLayerSpec = { id: string; kind: 'tiles'; url: string; color: string };

export type LayerSpec =
  | { id: string; kind: 'points'; color: string; data: FeatureCollection<PointFeature> | string; cluster?: ClusterSpec }
  | { id: string; kind: 'line'; color: string; data: FeatureCollection<LineFeature> }
  | TilesLayerSpec;

export type MapOptions = {
  center: LngLat;
  zoom: number;
  /** URL štýlu podkladovej mapy (MapLibre). Static adapter ho ignoruje. */
  style?: string;
};

export type Unsubscribe = () => void;

export interface MapAdapter {
  /** Názov implementácie – pre testy a data-atribút v DOM. */
  readonly kind: 'maplibre' | 'static' | 'fake';
  mount(el: HTMLElement, opts: MapOptions): Promise<void>;
  setView(center: LngLat, zoom: number): void;
  addLayer(spec: LayerSpec): void;
  onPoiClick(cb: (id: string) => void): Unsubscribe;
  destroy(): void;
}
