// Adresa zdroja pre vlastné dlaždice PMTiles (T3-09). Samostatný modul bez maplibre-gl, aby sa dal testovať.

/** Absolútna adresa pre pmtiles:// – MapLibre relatívnu cestu k súboru nerozlíši od cesty štýlu. */
export function pmtilesSource(url: string, base = typeof location === 'undefined' ? 'http://localhost/' : location.href): string {
  return `pmtiles://${new URL(url, base).href}`;
}
