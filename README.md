# SATS-SEO-GIS

Interaktívna mapa aktívneho turizmu na Slovensku (MapLibre GL JS + Vite) s dôrazom na SEO a Core Web Vitals.
Mapa sa načíta až po kliknutí, kvôli LCP. Projekt vzniká v rámci Team Project (FIIT STU),
nadväzuje na H2020 projekt rurAllure. Architektúra: [`docs/architecture/ARCHITECTURE.md`](docs/architecture/ARCHITECTURE.md).

## Spustenie

Z koreňa repozitára:

```bash
cd app
npm install
npm run dev                       # vývojový server
npm run build && npm run preview  # produkčný build na http://localhost:4173
npx playwright install chromium   # jednorazovo
npm run test:e2e                  # E2E testy
npm run lhci                      # Lighthouse CI, desktop (prah 80 %)
npm run lhci:mobile               # Lighthouse CI, mobil
```

## Štruktúra repozitára

```
.
├── app/                      # frontend (PWA)
│   ├── src/                  # zdrojový kód aplikácie
│   ├── public/               # statické súbory (ikony, robots.txt, sitemap.xml, ...)
│   ├── tests/                # Playwright E2E testy
│   ├── index.html            # vstupná stránka
│   ├── package.json          # závislosti a npm skripty
│   ├── playwright.config.js  # konfigurácia E2E testov
│   ├── lighthouserc.cjs      # Lighthouse CI: desktop + prahy kvality
│   └── lighthouserc.mobile.cjs  # Lighthouse CI: mobil
├── backend/                  # Partner API (fáza 2)
├── data/
│   ├── raw/                  # surové dáta (OSM extrakt a pod.), NIE v gite
│   ├── processed/            # spracované dáta, NIE v gite
│   └── pipeline/             # skripty na import a spracovanie dát
├── docs/
│   ├── architecture/         # architektúra systému
│   ├── adr/                  # architecture decision records
│   ├── minutes/              # zápisnice zo stretnutí
│   └── planning/             # plánovanie, register licencií dát
├── .github/workflows/        # CI/CD (popis nižšie)
├── package.json              # tenký wrapper: deleguje príkazy do app/
└── README.md
```

## Čo robia jednotlivé súbory

| Súbor | Účel |
|---|---|
| `app/package.json` | Zoznam závislostí (MapLibre, Vite, Playwright, Lighthouse CI) a npm skriptov (`dev`, `build`, `preview`, `test:e2e`, `lhci`, `lhci:mobile`). |
| `app/index.html` | Vstupná stránka aplikácie, obsahuje SEO meta tagy (title, description, canonical). |
| `app/playwright.config.js` | Kde sú testy, ako sa spustí aplikácia pre test a na akých zariadeniach sa testuje (desktop, Firefox, Safari, mobil). |
| `app/lighthouserc.cjs` | Prahy kvality pre desktop: Performance a SEO ≥ 80 % a CLS ≤ 0,1 (chyba), LCP a TBT (varovanie). |
| `app/lighthouserc.mobile.cjs` | To isté pre mobilný profil, zatiaľ len ako varovania. |
| `.github/workflows/ci.yml` | Pri každom pushi a PR do `main`: build, E2E testy, Lighthouse CI. |
| `.github/workflows/heavy-gis.yml` | Len ručne: testy v 4 prehliadačoch a mobilný Lighthouse. |
| `.github/workflows/nightly-metrics.yml` | Každú noc: meranie Lighthouse a uloženie výsledkov pre dashboard. |
| `package.json` (koreň) | Skratky, aby `npm run dev` fungovalo aj z koreňa. |
| `.gitignore` | Čo sa nemá commitovať: `node_modules`, buildy, veľké dáta, reporty. |
| `docs/architecture/ARCHITECTURE.md` | Architektúra systému, diagram a rozhodnutia. |

## Ďalšie kroky

1. Zmeniť `example.com` v `index.html`, `robots.txt`, `sitemap.xml`
2. PostGIS + OSM trasy, PMTiles
3. Podstránky pre trasy (SEO)
4. PSI API + dashboard
5. Rozhodnutie o frontende (Vite alebo Astro) zapísať ako ADR do `docs/adr/`

Poznámka: súradnice vrcholov sú približné, over ich.
