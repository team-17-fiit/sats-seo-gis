# Dátové zdroje – odkazy na stiahnutie

Surové súbory sa sťahujú do `data/raw/` (mimo git) príkazom `python -m pipelines.fetch` (z priečinka `backend/`).
`pipelines.fetch` po stiahnutí zapíše SHA256 do `data/raw/CHECKSUMS.txt`; overené súčty sem prepíšte pri dataset freeze.
Licencie: [docs/planning/data-licence-register.md](../docs/planning/data-licence-register.md).

| Kľúč | Súbor v `data/raw/` | URL | Veľkosť (cca) |
|---|---|---|---|
| `osm` | `slovakia-latest.osm.pbf` | https://download.geofabrik.de/europe/slovakia-latest.osm.pbf | ~350 MB |
| `ne_admin0` | `ne_10m_admin_0_countries.geojson` | https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries.geojson | 24 MB |
| `ne_admin1` | `ne_10m_admin_1_states_provinces.geojson` | https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson | 40 MB |
| `geonames` | `SK.zip` | https://download.geonames.org/export/dump/SK.zip | 1 MB |
| `sopsr` | `sopsr_protected_sites.geojson` | http://inspire.biomonitoring.sk/geoserver/ps/ows?service=WFS&version=2.0.0&request=GetFeature&typeNames=ps:ProtectedSite&outputFormat=application/json | ~1 965 území |
| `wikidata` | `wikidata-sk-heritage.json` | SPARQL https://query.wikidata.org/sparql – sťahuje `python -m pipelines.load_wikidata` (nie `fetch`) | podľa počtu POI |
| `rurallure_ds1` | `rurallure_ds1.csv` | Zenodo – doplniť DOI záznamu DS1 | – |
| `rurallure_ds6` | `rurallure_ds6/*.gpx`, `*.geojson` | Zenodo – doplniť DOI záznamu DS6 | – |

Kým nie sú doplnené DOI rurAllure, importy bežia nad vzorkami v `data/fixtures/`.

## Overené SHA256 (dataset freeze)

| Súbor | SHA256 | Dátum |
|---|---|---|
| – | – | – |
