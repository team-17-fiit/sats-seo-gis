# Šprint 1-1Z – review a retrospektíva

- **Šprint:** 1-1Z (12. 10. – 25. 10. 2026)
- **Cieľ:** repozitár, CI kostra, licenčný register a prvý dátový extrakt
- **Dátum zápisu:** 2026-10-30 (chýbajúce položky doplnené dodatočne na začiatku 2-2Z, vetva `chore/sprint-1-skeleton`)
- **Prítomní:** Jan Porubsky, Leon Rado, Matus Plsko, Matus Vrabel, Nikolas Kristin, Richard Pukac, Vlastislav Pokorny · **Zapisovateľ:** Matus Plsko

## 1. User stories

| ID | Story | Body | Riešiteľ | Stav | Dôkaz v repozitári |
|---|---|---|---|---|---|
| S1-3 | OSM extrakt 7 trás v PostGIS | 5 | C | hotové (plný extrakt SR naimportovaný 2026-11-01, T1-18) | `data/db/migrations/`, `backend/pipelines/`, `data/seed/paths.json` |
| S1-4 | projektový web online | 1 | E | mimo tohto repozitára | – |
| US-11 | každý POI riadok má zdroj a licenciu | 5 | C | hotové | `docs/planning/data-licence-register.md`, `NOT NULL source_id/licence_id`, `data/db/checks.sql`, CI job `data-contract` |
| US-18 | CI spúšťa lint a unit testy na každom PR | 5 | D | hotové | `.github/workflows/ci.yml` (`app-lint-unit`, `backend-lint-unit`) |
| US-1a | prvá SSG stránka trasy | 5 | A | hotové v predstihu (Next.js, nie Astro – ADR-0001) | `app/src/app/trasy/[slug]/page.tsx` |

## 2. Úlohy

| ID | Úloha | Story | Stav | Commit |
|---|---|---|---|---|
| T1-01 | repozitár + branch stratégia | US-18 | hotové | `chore(repo): branch strategy…` |
| T1-02 | CI kostra: lint + unit testy | US-18 | hotové | `test(app)…`, `ci: lint and unit tests…` |
| T1-03 | inicializácia licenčného registra | US-11 | hotové | `docs(data): licence register…` |
| T1-04 | motivačný dokument + plagát | WP1 | mimo repozitára | – |
| T1-05 | OSM PBF ingest (osm2pgsql flex) | S1-3 | hotové | `feat(etl)…` |
| T1-06 | Natural Earth + GeoNames | S1-3 | hotové | `feat(etl)…` |
| T1-07 | kanonická schéma PostGIS | S1-3 | hotové | `feat(db)…` |
| T1-08 | rurAllure DS1 import | S1-3 | hotové na vzorke, chýba DOI datasetu | `feat(etl)…` |
| T1-09 | DS6 GPX/GeoJSON import | S1-3 | hotové na vzorke, chýba DOI datasetu | `feat(etl)…` |
| T1-10 | PWA kostra + routing | US-1a | hotové (manifest; service worker v 4-4Z) | `feat(app)…` |
| T1-11 | ADR záznamy | WP3 | hotové (0001–0005) | `docs(architecture)…` |
| T1-12 | projektový web v1 | S1-4 | mimo repozitára | – |
| T1-13 | PM nástroj + Definition of Done | WP1 | DoD hotové; projekt v Plane založený, zostáva pozvať členov tímu (T1-13 v 2-2Z) | `docs(methodology)…` |
| T1-14 | draft metodík | WP1 | hotové | `docs(methodology)…` |
| T1-15 | sprint review + retro + exporty | WP1 | tento zápis; [export cyklu 1-1Z z Plane](exports/2026-11-04-plane-cycle-1-1Z.csv) z 2026-11-04 (15 položiek, bez stĺpca `Subscribers` s e-mailmi; S1-4, T1-04, T1-12, T1-13 a T1-15 boli presunuté do 2-2Z, preto v ňom nie sú) | – |

## 3. KPI – baseline (merané, nie odhadované)

| KPI | Baseline 1-1Z | Ako zmerané | Cieľ |
|---|---|---|---|
| K10 dátové pokrytie | **30 123 schválených POI**, 7 trás, 5 773 OSM trás (263 podtrás); karanténa 31 359 (takmer všetky OSM objekty bez názvu). Na fixtures bolo 39 POI. | plný `slovakia-latest.osm.pbf` (Geofabrik, 347 MB) → `load_osm`, `promote`, `pipelines.validate` (2026-11-01) | ≥ 500 POI ✓ |
| K7 funkčná kvalita | 19 pytest + 14 Vitest unit testov, 0 zlyhaní; E2E 3 + 5 scenárov (Playwright) | lokálne; E2E v CI | 100 % E2E |
| K19 štruktúrované dáta | JSON-LD na všetkých typoch stránok (WebSite, ItemList, TouristTrip, Mountain) | kontrola HTML výstupu `out/` | 100 % Rich Results |
| JS first load | 103 kB zdieľané, 108 kB úvodná stránka; MapLibre mimo úvodného balíka | `next build` | sledovať (TBT) |
| K1–K4 Lighthouse / CWV | **Performance 100, SEO 100**, Accessibility 100, Best Practices 96; **LCP 0,47 s, CLS 0**, TBT 0 ms, FCP 0,23 s (medián 3 behov, úvodná stránka `/`, desktop). Prvý beh na `main` (2026-10-26) prahy splnil, ale reporty sa neuložili (`.lighthouseci` chýbal v artefakte, opravené v T1-19). Mobilný profil zatiaľ nemeraný. | `quality-gate` – Lighthouse CI 12.1.0, beh 41922348305 (2026-11-04) | ≥ 80, LCP ≤ 2,5 s, CLS ≤ 0,1 ✓ |

## 4. Retrospektíva

**Čo fungovalo**
- Rozhodnutie pre Next.js statický export (ADR-0001) – SSG stránky trás boli hotové rýchlo.
- Fixtures pre každý zdroj: celá pipeline beží za pár sekúnd lokálne aj v CI.

**Čo nefungovalo**
- Story neboli pred šprintom rozdelené na ≤ 1-dňové subtasky → plochý burndown.
- Časť položiek (schéma, ETL, CI lint) sa nestihla do konca šprintu a dopĺňala sa dodatočne.
- Chýbajú DOI datasetov rurAllure – import beží len nad vzorkami.

**Akcie do 2-2Z**

| Akcia | Zodpovedný | Termín |
|---|---|---|
| Každú story rozdeliť na subtasky ≤ 1 deň pred plánovaním | Scrum Master (G) | plánovanie 2-2Z |
| Založiť projekt v Plane podľa `docs/methodology/tasks.md` (namiesto GitHub Projects) | G | 2026-11-02 |
| Zapnúť ochranu `main` (required checks) | D | 2026-11-02 |
| ~~Doplniť DOI DS1/DS6 a overiť ich licenciu~~ hotové 2026-11-04 (T1-17): Zenodo 10.5281/zenodo.7611876, CC BY 4.0, zapísané v `data/SOURCES.md` | C | 2026-11-05 |
| ~~Stiahnuť a naimportovať plné OSM dáta, zapísať K10~~ hotové 2026-11-01 (T1-18). Všetkých 53 úsekov našich trás vedie po sieti ciest a chodníkov z OSM (najkratšia cesta medzi zastávkami) | C | 2026-11-06 |
| Zapísať K1–K4 baseline z CI | D | 2026-11-03 |
