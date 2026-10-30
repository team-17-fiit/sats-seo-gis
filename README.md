# SATS-SEO-GIS

Interaktívna mapa aktívneho turizmu na Slovensku – tematické trasy, vrcholy a miesta – s dôrazom na SEO
a Core Web Vitals. Team Project (FIIT STU) nadväzujúci na H2020 projekt rurAllure.

| | |
|---|---|
| Frontend | React + Next.js 15 (statický export), MapLibre GL za `MapAdapter`, PWA manifest |
| API | Python 3.12 + FastAPI, REST `/api/v1`, OpenAPI na `/docs` |
| Dáta | PostgreSQL 16 + PostGIS, ETL v Pythone (osm2pgsql flex, Natural Earth, GeoNames, rurAllure) |
| Kvalita | ESLint, Vitest, ruff, pytest, Playwright, Lighthouse CI, dátové kontrakty – všetko v CI |

Architektúra: [`docs/architecture/ARCHITECTURE.md`](docs/architecture/ARCHITECTURE.md) ·
ADR: [`docs/adr/`](docs/adr/README.md) · Ako prispievať: [`CONTRIBUTING.md`](CONTRIBUTING.md) ·
Metodiky a DoD: [`docs/methodology/`](docs/methodology/README.md) ·
Licencie dát: [`docs/planning/data-licence-register.md`](docs/planning/data-licence-register.md)

## Rýchly štart (bez Dockeru, ~2 minúty)

Kostra beží aj bez databázy – API aj web čítajú kurátorské dáta zo súborov.

```bash
# 1) API – http://localhost:8000/docs
cd backend
pip install -r requirements-dev.txt
REPOSITORY=file uvicorn app.main:app --reload --port 8000

# 2) web – http://localhost:3000  (v druhom termináli)
cd app
npm ci
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
```

Stránky: `/` (mapa + trasy + vrcholy), `/trasy/`, `/trasy/<slug>/`, `/vrcholy/<slug>/`.
API: `/api/v1/health`, `/api/v1/paths`, `/api/v1/paths/{slug}`, `/api/v1/pois?near=48.17,16.98&r=2000`, `/api/v1/pois/{slug}`.

## Plné prostredie s PostGIS

Predpoklady: Docker, Python 3.12, Node 20+, `osm2pgsql` (apt/brew).

```bash
cp .env.example .env
make db               # PostGIS v Dockeri na localhost:5432 (migrácie sa aplikujú pri prvom štarte)
make data-fixtures    # ETL nad malými vzorkami (sekundy) + dátové kontrakty
#   alebo skutočné dáta:
make fetch            # stiahne OSM SR (~350 MB), Natural Earth, GeoNames do data/raw/
make data             # migrate → load_* → seed_paths → promote → validate → export_static
REPOSITORY=postgis make api
make dev
```

`make help` vypíše všetky ciele.

## Testy a kvalita

```bash
make lint             # ruff + ESLint + tsc
make test             # pytest + Vitest (bez DB)
TEST_DATABASE_URL=postgresql://satsgis:satsgis@localhost:5432/satsgis \
  (cd backend && pytest -m db)          # integrácia s PostGIS
cd app && npm run build && npm run test:e2e   # Playwright (najprv: npx playwright install chromium)
cd app && npm run lhci                         # Lighthouse CI (prah 80 %)
```

| Workflow | Kedy | Čo |
|---|---|---|
| `ci.yml` | push/PR do `main` | `app-lint-unit`, `backend-lint-unit`, `data-contract` (PostGIS), `quality-gate` (build, E2E, LHCI) |
| `heavy-gis.yml` | ručne | E2E v 4 prehliadačoch + mobilný Lighthouse |
| `nightly-metrics.yml` | každú noc | Lighthouse meranie pre dashboard |

## Štruktúra repozitára

```
.
├── app/                         # Next.js – web + PWA (localhost:3000)
│   ├── src/app/                 # routy: /, /trasy/, /trasy/[slug]/, /vrcholy/[slug]/, sitemap, robots, manifest
│   ├── src/components/          # MapLoader (mapa na klik), NearbyPois (z API), JsonLd, Stripes
│   ├── src/lib/map/             # MapAdapter + MapLibre / StaticImage / Fake implementácie
│   ├── src/lib/                 # paths.ts, peaks.ts, api.ts, site.ts (+ *.test.ts)
│   ├── public/data/             # paths.json (export z DB), peaks.geojson
│   └── tests/                   # Playwright E2E
├── backend/
│   ├── app/                     # FastAPI: api/v1, repositories (PostGIS | File), models
│   ├── pipelines/               # ETL: fetch, load_osm, load_natural_earth, load_geonames,
│   │                            #      load_rurallure, seed_paths, promote, validate, export_static
│   └── tests/                   # pytest (unit + @db integrácia)
├── data/
│   ├── db/migrations/           # SQL schéma (canonical, staging, quarantine, marts)
│   ├── db/checks.sql            # dátové kontrakty
│   ├── osm/flex.lua             # osm2pgsql flex štýl
│   ├── seed/paths.json          # 7 tematických trás + zastávky
│   ├── fixtures/                # syntetické vzorky každého zdroja
│   ├── raw/ processed/          # mimo git
│   └── SOURCES.md
├── docs/                        # adr/, architecture/, methodology/, minutes/, planning/
├── docker-compose.yml  Makefile  .env.example
└── .github/                     # workflows, šablóny PR a issues
```

> Dva rôzne `data`: `app/public/data/` číta web (build aj prehliadač); `/data/` v koreni je dátová pipeline.
> Pipeline zapisuje výsledok do `app/public/data/` cez `make export`.

## Stav (šprint 1-1Z)

Hotové: schéma a ETL nad fixtures, API kostra, stránky trás, MapAdapter, PWA manifest, CI s lint/unit/kontraktmi.
Ďalej (2-2Z): beh nad plným OSM PBF, Wikidata obohatenie, stránky POI, hreflang, presná geometria trás z OSM.
Detail: [`docs/minutes/2026-10-30-sprint-1-review.md`](docs/minutes/2026-10-30-sprint-1-review.md).

## Licencie

Kód: MIT podľa tab. R.1 dokumentácie (súbor `LICENSE` treba doplniť). Dáta: © OpenStreetMap contributors (ODbL), GeoNames (CC BY 4.0), Natural Earth (public domain),
rurAllure (CC BY 4.0), kurátorské dáta tímu (CC BY 4.0) – pozri licenčný register.
