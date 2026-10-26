// Vytvorenie mapy (MapLibre GL JS). Tento modul sa importuje dynamicky až po kliknutí na tlačidlo,
// takže ťažký MapLibre nie je v úvodnom JS balíku (LCP/TBT).
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

export function createPeakMap(container: HTMLElement, onReady: () => void): maplibregl.Map {
  const map = new maplibregl.Map({
    container,
    style: 'https://tiles.openfreemap.org/styles/liberty',
    center: [19.7, 48.7],
    zoom: 6.5,
  });
  map.addControl(new maplibregl.NavigationControl());

  map.on('load', () => {
    map.addSource('peaks', { type: 'geojson', data: '/data/peaks.geojson' });
    map.addLayer({
      id: 'peaks',
      type: 'circle',
      source: 'peaks',
      paint: {
        'circle-radius': 7,
        'circle-color': '#c62828',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#fff',
      },
    });
    map.on('click', 'peaks', (e) => {
      const p = e.features?.[0]?.properties;
      if (!p) return;
      new maplibregl.Popup().setLngLat(e.lngLat).setText(`${p.name} – ${p.elevation} m`).addTo(map);
    });
    map.on('mouseenter', 'peaks', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'peaks', () => { map.getCanvas().style.cursor = ''; });
    onReady();
  });
  return map;
}
