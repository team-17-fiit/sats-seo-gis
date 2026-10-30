// MapAdapter – šev medzi UI a mapovou knižnicou (ADR-0003, listing 5.1 dokumentácie).
// Stránky a komponenty importujú LEN tieto typy a createMap(), nikdy nie maplibre-gl priamo.

export type LngLat = [lon: number, lat: number];

export type PointFeature = {
  type: 'Feature';
  properties: { id: string; name: string; label?: string };
  geometry: { type: 'Point'; coordinates: LngLat };
};

export type LineFeature = {
  type: 'Feature';
  properties: { id: string; name: string };
  geometry: { type: 'LineString'; coordinates: LngLat[] };
};

export type FeatureCollection<F> = { type: 'FeatureCollection'; features: F[] };

export type LayerSpec =
  | { id: string; kind: 'points'; color: string; data: FeatureCollection<PointFeature> | string }
  | { id: string; kind: 'line'; color: string; data: FeatureCollection<LineFeature> };

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
