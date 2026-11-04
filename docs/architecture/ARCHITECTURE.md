# Architektúra SATS-SEO-GIS

Stručne: **dáta → databáza → API a web.** Nič viac zatiaľ netreba.

```mermaid
flowchart LR
  ZDROJE["Zdroje dát<br/>OSM, GeoNames, rurAllure,<br/>naše trasy (paths.json)"]
  DB[("Databáza<br/>PostgreSQL + PostGIS")]
  API["API<br/>FastAPI · backend/"]
  WEB["Web<br/>Next.js · app/"]

  ZDROJE -- "import (backend/pipelines)" --> DB
  DB --> API
  API -- "doplnkové dáta" --> WEB
  DB -- "export pri builde" --> WEB
```

## Tri časti

| Časť | Priečinok | Čo robí | Technológia |
|---|---|---|---|
| **Web** | `app/` | stránky trás a vrcholov, mapa | React, Next.js, MapLibre |
| **API** | `backend/app/` | vracia trasy a miesta ako JSON (`/api/v1/...`) | Python, FastAPI |
| **Dáta** | `backend/pipelines/`, `data/` | stiahne a vyčistí dáta, uloží ich do DB | Python, PostgreSQL + PostGIS |

**Prečo web nečaká na API:** stránky sa vygenerujú vopred (pri `npm run build`) ako hotové HTML.
Vyhľadávač ich tak vidí celé a načítajú sa rýchlo – to je hlavná požiadavka zadania (SEO).
API pridáva len doplnky, napr. „miesta v okolí“.

**Prečo to beží aj bez databázy:** API vie čítať dáta zo súboru `data/seed/paths.json`
(`REPOSITORY=file`). Na bežný vývoj teda databázu nepotrebuješ.

## Databáza – najdôležitejšie tabuľky

| Tabuľka | Čo obsahuje |
|---|---|
| `path` | 7 tematických trás (názov, farba, obťažnosť) |
| `poi` | miesta – hrady, vrcholy, kostoly… (poloha, kategória) |
| `poi_path` | ktoré miesto je na ktorej trase a v akom poradí |
| `source`, `licence` | odkiaľ dáta sú a pod akou licenciou – **každé miesto ich musí mať** |
| `route`, `route_segment` | trasa z OSM (napr. EuroVelo) > podtrasa (`parent_id`) > úseky s geometriou |

Ostatné tabuľky (hranice krajov, GeoNames) sú pomocné. Celá schéma: `data/db/migrations/`.

## Ako sa dáta dostanú do databázy

1. **Načítanie** – skripty v `backend/pipelines/` (`load_osm`, `load_geonames`, `load_rurallure`, `load_sopsr`, `seed_paths`) uložia surové dáta.
2. **Kontrola** – `promote` zahodí duplicity a zlé riadky (bez mena, mimo Slovenska, bez licencie) do karantény
   a úseky našich trás medzi zastávkami povedie po sieti ciest a chodníkov z OSM (najkratšia cesta, `pipelines/network.py`).
3. **Wikidata** – `load_wikidata` doplní miestam s Wikidata ID opis SK/EN, obrázok, web a príznak UNESCO.
4. **Overenie** – `validate` skontroluje, že je všetko v poriadku.
5. **Export** – `export_static` zapíše trasy do `app/public/data/paths.json`, odkiaľ ich berie web.

## Spustenie s databázou (Git Bash, voliteľné)

Potrebuješ navyše [Docker Desktop](https://www.docker.com/products/docker-desktop/). Bez databázy stačí návod v [README](../../README.md).

```bash
docker compose up -d db                 # databáza na localhost:5432

cd backend
export DATABASE_URL=postgresql://satsgis:satsgis@localhost:5432/satsgis
python -m pipelines.migrate             # vytvorí tabuľky
python -m pipelines.seed_paths          # 7 trás a ich zastávky
python -m pipelines.load_rurallure --fixture
python -m pipelines.promote
python -m pipelines.validate            # všetky riadky musia mať ✓

REPOSITORY=postgis python -m uvicorn app.main:app --reload --port 8000
```

Import celého OSM (`load_osm`) potrebuje navyše program `osm2pgsql` – zatiaľ ho netreba, beží automaticky v CI.

## Čo je hotové a čo príde

| Teraz (šprint 1) | Neskôr |
|---|---|
| databáza, import dát na vzorkách, 7 trás | celé dáta OSM, Wikidata (šprint 2) |
| API: trasy, miesta, miesta v okolí | stránky jednotlivých miest, angličtina (šprint 2–3) |
| web: zoznam a detail trás, mapa po kliknutí | vlastné mapové dlaždice, offline režim (šprint 3–4) |
| CI: kontrola kódu a testy pri každom PR | kvízy, body, AI (letný semester) |

Rozhodnutia a ich dôvody sú v [docs/adr/](../adr/README.md).
