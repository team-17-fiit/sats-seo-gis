// Mapa sa načíta až po kliknutí -> MapLibre nezaťažuje LCP/TBT pri úvodnom načítaní.
const btn = document.getElementById('load-map');
const box = document.getElementById('map');

async function loadMap() {
  btn.disabled = true;
  btn.textContent = 'Načítavam mapu…';
  const { default: maplibregl } = await import('maplibre-gl');
  await import('maplibre-gl/dist/maplibre-gl.css');
  btn.remove();

  const map = new maplibregl.Map({
    container: box,
    style: 'https://tiles.openfreemap.org/styles/liberty',
    center: [19.7, 48.7],
    zoom: 6.5,
  });
  map.addControl(new maplibregl.NavigationControl());

  map.on('load', () => {
    map.addSource('peaks', { type: 'geojson', data: '/data/peaks.geojson' });
    map.addLayer({
      id: 'peaks', type: 'circle', source: 'peaks',
      paint: { 'circle-radius': 7, 'circle-color': '#c62828', 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' },
    });
    map.on('click', 'peaks', (e) => {
      const p = e.features[0].properties;
      new maplibregl.Popup().setLngLat(e.lngLat).setText(`${p.name} – ${p.elevation} m`).addTo(map);
    });
    box.dataset.ready = 'true'; // signál pre Playwright
  });
}

btn.addEventListener('click', loadMap);
