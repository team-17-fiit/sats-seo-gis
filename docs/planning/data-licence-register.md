# Licenčný register dát (US-11)

*Zodpovedá: člen C (dáta) · založené v šprinte 1-1Z · strojová verzia: `data/db/migrations/002_seed_licences.sql`*

Pravidlo: **každý riadok** v kanonickej DB odkazuje na `source_id` a `licence_id`. Zdroj, ktorý tu nie je,
sa nesmie importovať (licenčná brána v `pipelines.promote` a v CI dátovom kontrakte).

## Licencie

| `licence.code` | Názov | Povinnosti | Share-alike | Smie do PMTiles s OSM |
|---|---|---|---|---|
| `ODbL-1.0` | Open Database License 1.0 | atribúcia „© OpenStreetMap contributors“, odvodená DB pod ODbL | áno | áno |
| `CC-BY-4.0` | Creative Commons Attribution 4.0 | atribúcia, uviesť zmeny | nie | áno (atribúcia) |
| `CC0-1.0` | Public Domain Dedication | žiadne (atribúcia vítaná) | nie | áno |
| `PD` | Public domain | žiadne | nie | áno |
| `PROPRIETARY` | Partnerské dáta (LOI) | podľa zmluvy, nezverejňovať | – | **nie** |

## Zdroje

| `source.code` | Zdroj | Licencia | Použitie | Tabuľky | Aktualizácia | Stav |
|---|---|---|---|---|---|---|
| `osm` | OpenStreetMap – Geofabrik extrakt SR | ODbL-1.0 | POI, trasy `route=*`, geometria | `staging.osm_poi`, `staging.osm_route` | týždenne | ✅ ingest skript |
| `naturalearth` | Natural Earth 1:10m admin 0/1 | PD | hranica SR, kraje (rozsah pre validáciu) | `admin_area` | pri zmene | ✅ ingest skript |
| `geonames` | GeoNames dump `SK` | CC-BY-4.0 | sídla, georeferencie, vyhľadávanie | `geonames_place` | štvrťročne | ✅ ingest skript |
| `rurallure_ds1` | rurAllure DS1 – POI pútnických trás | CC-BY-4.0 ⚠ | doplnkové POI (pilot B) | `staging.rurallure_ds1` | pri zmene | ✅ import (fixture) |
| `rurallure_ds6` | rurAllure DS6 – GPX/GeoJSON trasy | CC-BY-4.0 ⚠ | geometria pútnických trás | `staging.rurallure_ds6` | pri zmene | ✅ import (fixture) |
| `wikidata` | Wikidata SPARQL | CC0-1.0 | dedičstvo, obrázky, preklady | – | týždenne | ⏳ šprint 2-2Z |
| `natura2000` | EEA Natura 2000 | CC-BY-4.0 | chránené územia | – | ročne | ⏳ backlog |
| `team_curated` | Kurátorské dáta tímu (`data/seed/paths.json`, `peaks.geojson`) | CC-BY-4.0 | 7 trás, zastávky, vrcholy | `path`, `poi`, `poi_path` | priebežne | ✅ seed |
| `openfreemap` | OpenFreeMap štýl „liberty“ (dlaždice z OSM) | ODbL-1.0 | podkladová mapa do 3-3Z | – (runtime) | – | ✅ dočasné |

⚠ = licenciu konkrétneho datasetu treba **overiť na jeho Zenodo zázname** a doplniť DOI do `data/SOURCES.md`
pred prvým zverejnením. Kým nie je overená, riadky z DS1/DS6 ostávajú v `staging` (status `candidate`).

## Pravidlá oddelenia

1. Tabuľky odvodené z OSM (ODbL) sa držia oddelene od CC BY obsahu; export do PMTiles obsahuje iba ODbL + PD + CC0/CC BY s atribúciou.
2. `PROPRIETARY` dáta partnerov nikdy nejdú do verejných dlaždíc ani SSG stránok.
3. Atribúcie sa zobrazujú v pätičke mapy a na stránke `/o-projekte/` (šprint 2).

## História

| Dátum | Zmena | Kto |
|---|---|---|
| 2026-10-30 | založenie registra, 9 zdrojov, 5 licencií | tím |
