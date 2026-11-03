// MapLibre GL JS implementácia MapAdapter. Jediné miesto v aplikácii, ktoré importuje maplibre-gl.
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { LayerSpec, LngLat, MapAdapter, MapOptions, Unsubscribe } from './types';

// Dočasný podklad (OSM, ODbL) – v šprinte 3-3Z ho nahradia vlastné PMTiles.
export const DEFAULT_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

export class MapLibreAdapter implements MapAdapter {
  readonly kind = 'maplibre' as const;
  private map: maplibregl.Map | null = null;
  private pending: LayerSpec[] = [];
  // Vlastný príznak namiesto map.loaded(): to vráti false hneď po addSource (načítavajú sa dáta),
  // takže druhá vrstva by skončila v `pending` navždy – 'load' sa už znova nespustí.
  private styleReady = false;
  private pointLayers: string[] = [];
  private clickHandlers = new Set<(id: string) => void>();

  mount(el: HTMLElement, opts: MapOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const map = new maplibregl.Map({
          container: el,
          style: opts.style ?? DEFAULT_STYLE,
          center: opts.center,
          zoom: opts.zoom,
          attributionControl: { compact: true },
        });
        map.addControl(new maplibregl.NavigationControl());
        this.map = map;
        map.on('load', () => {
          this.styleReady = true;
          this.pending.forEach((spec) => this.applyLayer(spec));
          this.pending = [];
          resolve();
        });
        map.on('error', (e) => {
          if (!map.loaded()) reject(e.error);
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  setView(center: LngLat, zoom: number): void {
    this.map?.jumpTo({ center, zoom });
  }

  addLayer(spec: LayerSpec): void {
    if (this.map && this.styleReady) this.applyLayer(spec);
    else this.pending.push(spec);
  }

  onPoiClick(cb: (id: string) => void): Unsubscribe {
    this.clickHandlers.add(cb);
    return () => this.clickHandlers.delete(cb);
  }

  destroy(): void {
    this.map?.remove();
    this.map = null;
    this.styleReady = false;
    this.clickHandlers.clear();
  }

  private applyLayer(spec: LayerSpec): void {
    const map = this.map;
    if (!map) return;
    map.addSource(spec.id, { type: 'geojson', data: spec.data as never });

    if (spec.kind === 'line') {
      map.addLayer({
        id: spec.id,
        type: 'line',
        source: spec.id,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': spec.color, 'line-width': 4, 'line-opacity': 0.85 },
      });
      return;
    }

    map.addLayer({
      id: spec.id,
      type: 'circle',
      source: spec.id,
      paint: {
        'circle-radius': 7,
        'circle-color': spec.color,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#fff',
      },
    });
    this.pointLayers.push(spec.id);

    map.on('click', spec.id, (e) => {
      const props = e.features?.[0]?.properties as { id?: string; name?: string; label?: string } | undefined;
      if (!props) return;
      new maplibregl.Popup().setLngLat(e.lngLat).setText(props.label ?? props.name ?? '').addTo(map);
      if (props.id) this.clickHandlers.forEach((cb) => cb(props.id as string));
    });
    map.on('mouseenter', spec.id, () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', spec.id, () => { map.getCanvas().style.cursor = ''; });
  }
}
