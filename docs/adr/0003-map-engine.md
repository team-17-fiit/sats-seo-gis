# ADR-0003: Mapa – MapLibre GL JS za rozhraním MapAdapter, PMTiles

- **Stav:** prijaté
- **Dátum:** 2026-10-30
- **Rozhoduje:** tím SATS-SEO-GIS

## Kontext

Mapa je najťažší prvok stránky a najčastejšia príčina zlého LCP/CLS. Potrebujeme vektorové štýly,
offline balíček a žiadne poplatky za request.

## Zvažované možnosti

| | MapLibre + PMTiles | Leaflet + raster | Komerčné API |
|---|---|---|---|
| JS (gzip) | ~210 kB | ~42 kB | ~250 kB |
| Vektorové štýly | áno | nie | áno |
| Offline | jeden súbor, range requesty | veľa PNG | licencia zakazuje |
| Náklady | len hosting | tile server | za request |

## Rozhodnutie

MapLibre GL JS. Aplikácia **nikdy** neimportuje MapLibre priamo – iba rozhranie `MapAdapter`
(`app/src/lib/map/MapAdapter.ts`). Implementácie:

- `MapLibreAdapter` – keď je WebGL a používateľ nemá `saveData`,
- `StaticImageAdapter` – bez WebGL: statický obsah s pevným pomerom strán (CLS = 0),
- `FakeMapAdapter` – unit testy.

Dlaždice: dočasne OpenFreeMap štýl; v 3-3Z vlastné PMTiles (tippecanoe, z5–z15) z PostGIS.

## Dôsledky

- (+) Výmena za Leaflet/native shell bez zásahu do stránok.
- (+) MapLibre sa sťahuje až po interakcii (dynamický import) – neovplyvní LCP.
- (−) Dlaždice odvodené z OSM sú ODbL (share-alike) – nemiešať do nich dáta partnerov.
