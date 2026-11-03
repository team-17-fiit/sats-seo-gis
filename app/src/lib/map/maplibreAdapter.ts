// MapLibre GL JS implementácia MapAdapter. Jediné miesto v aplikácii, ktoré importuje maplibre-gl.
import maplibregl, { type GeoJSONSource } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { resolveClusterOptions } from './cluster';
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
    const cluster = spec.kind === 'points' ? resolveClusterOptions(spec.cluster) : null;
    map.addSource(spec.id, {
      type: 'geojson',
      data: spec.data as never,
      ...(cluster && { cluster: true, clusterRadius: cluster.radius, clusterMaxZoom: cluster.maxZoom }),
    });

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

    if (cluster) this.addClusterLayers(spec.id, spec.color);

    map.addLayer({
      id: spec.id,
      type: 'circle',
      source: spec.id,
      // pri zlučovaní kreslí táto vrstva len samostatné body; zhluky majú vlastné vrstvy
      ...(cluster && { filter: ['!', ['has', 'point_count']] }),
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

  /** Zhluk = kruh veľkosti podľa počtu bodov + číslo; klik priblíži mapu, kým sa zhluk nerozpadne. */
  private addClusterLayers(sourceId: string, color: string): void {
    const map = this.map;
    if (!map) return;
    const clustersId = `${sourceId}-clusters`;

    map.addLayer({
      id: clustersId,
      type: 'circle',
      source: sourceId,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': color,
        'circle-radius': ['step', ['get', 'point_count'], 14, 10, 18, 50, 24],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#fff',
      },
    });
    map.addLayer({
      id: `${sourceId}-cluster-count`,
      type: 'symbol',
      source: sourceId,
      filter: ['has', 'point_count'],
      layout: {
        'text-field': ['get', 'point_count_abbreviated'],
        // font musí existovať v glyphs aktuálneho štýlu (OpenFreeMap "liberty" má Noto Sans);
        // pri prechode na vlastné PMTiles (3-3Z) skontrolovať
        'text-font': ['Noto Sans Bold'],
        'text-size': 13,
        'text-allow-overlap': true,
      },
      paint: { 'text-color': '#fff' },
    });

    map.on('click', clustersId, async (e) => {
      const feature = e.features?.[0];
      const clusterId = feature?.properties?.cluster_id as number | undefined;
      const source = map.getSource<GeoJSONSource>(sourceId);
      if (!feature || clusterId === undefined || !source) return;
      const zoom = await source.getClusterExpansionZoom(clusterId);
      const center = (feature.geometry as GeoJSON.Point).coordinates as LngLat;
      map.easeTo({ center, zoom });
    });
    map.on('mouseenter', clustersId, () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', clustersId, () => { map.getCanvas().style.cursor = ''; });
  }
}
