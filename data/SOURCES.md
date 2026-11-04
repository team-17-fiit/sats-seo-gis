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
| `sopsr_vchu`, `sopsr_mchu` | `sopsr_chranene_uzemia_vchu.geojson`, `sopsr_chranene_uzemia_mchu.geojson` | WFS ŠOP SR https://www.sopsr.sk/geoserver/chranene_objekty/ows (vrstvy `chranene_uzemia_vchu`, `chranene_uzemia_mchu`; vyžaduje popisný User-Agent) | 32 + 1 177 území |
| `pusr_pr`, `pusr_pz`, `pusr_skd` | `pusr_pamiatkove_rezervacie.geojson`, `pusr_pamiatkove_zony.geojson`, `pusr_svetove_kulturne_dedicstvo.geojson` | PÚSR PAMIS WFS https://gis.pamiatky.sk/project/f11bc94e12c291e6794b04d66ec0613c/ (vrstvy `pamis_pamiatkove_rezervacie`, `pamis_pamiatkove_zony`, `pamis_svetove_kulturne_dedicstvo`) | 28 + 83 + 6 území |
| `wikidata` | `wikidata-sk-heritage.json` | SPARQL https://query.wikidata.org/sparql – sťahuje `python -m pipelines.load_wikidata` (nie `fetch`) | podľa počtu POI |
| `rurallure_ds1` | `rurallure_ds1.csv` | Zenodo – doplniť DOI záznamu DS1 | – |
| `rurallure_ds6` | `rurallure_ds6/*.gpx`, `*.geojson` | Zenodo – doplniť DOI záznamu DS6 | – |

Kým nie sú doplnené DOI rurAllure, importy bežia nad vzorkami v `data/fixtures/`.

## Overené SHA256 (dataset freeze)

| Súbor | SHA256 | Dátum |
|---|---|---|
| – | – | – |
