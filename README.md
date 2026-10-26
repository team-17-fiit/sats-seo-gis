# SATS-SEO-GIS

Interaktívna mapa aktívneho turizmu na Slovensku (React + Next.js + MapLibre GL JS) s dôrazom na SEO a Core Web Vitals.
Projekt vzniká v rámci Team Project (FIIT STU) a nadväzuje na H2020 projekt rurAllure.
Architektúra: [`docs/architecture/ARCHITECTURE.md`](docs/architecture/ARCHITECTURE.md),
rozhodnutie o frontende: [`docs/adr/0001-frontend-framework.md`](docs/adr/0001-frontend-framework.md).

**Aktuálny stav:** statický web generovaný pri builde. Úvodná stránka a stránka každého vrcholu
(`/vrcholy/<slug>/`) sú hotové HTML so schema.org dátami, sitemapou a robots.txt. Interaktívna mapa sa
stiahne až po kliknutí na tlačidlo, aby ťažký MapLibre nezhoršoval LCP a TBT.

## Spustenie

```bash
cd app
npm install
npm run dev                        # vývojový server na http://localhost:3000
npm run build && npm run preview   # statický build (out/) na http://localhost:4173
npx playwright install chromium    # jednorazovo
npm run test:e2e                   # E2E testy
npm run lhci                       # Lighthouse CI, desktop (prah 80 %)
npm run lhci:mobile                # Lighthouse CI, mobil
```

Príkazy `dev`, `build`, `preview`, `test:e2e`, `lhci` fungujú aj z koreňa repozitára.
Adresu nasadenej stránky nastav premennou `NEXT_PUBLIC_SITE_URL` (inak je `https://example.com`),
používa sa v canonical, Open Graph a sitemap.

## Štruktúra repozitára

```
.
├── app/                              # frontend (React + Next.js, statický export)
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx            # <html lang="sk">, spoločné meta, JSON-LD WebSite
│   │   │   ├── page.tsx              # úvodná stránka: mapa + zoznam vrcholov s odkazmi
│   │   │   ├── vrcholy/[slug]/page.tsx  # podstránka vrcholu (SSG) + JSON-LD Mountain
│   │   │   ├── sitemap.ts            # generuje sitemap.xml
│   │   │   ├── robots.ts             # generuje robots.txt
│   │   │   └── globals.css           # štýly, svetlý/tmavý režim, pevná výška mapy (bez CLS)
│   │   ├── components/
│   │   │   ├── MapLoader.tsx         # klientsky komponent: tlačidlo + lazy načítanie mapy
│   │   │   ├── Stripes.tsx           # dekoratívne pásiky v hlavičke
│   │   │   └── JsonLd.tsx            # vloženie schema.org dát
│   │   └── lib/
│   │       ├── peaks.ts              # načítanie vrcholov z peaks.geojson pri builde, slug
│   │       ├── peakMap.ts            # MapLibre mapa (importuje sa až po kliknutí)
│   │       └── site.ts               # SITE_URL a názov webu
│   ├── public/data/peaks.geojson     # dáta vrcholov (názov, výška, bod)
│   ├── tests/map.spec.js             # Playwright E2E testy
│   ├── next.config.mjs               # output: 'export', trailingSlash
│   ├── tsconfig.json                 # TypeScript konfigurácia
│   ├── package.json                  # závislosti a npm skripty
│   ├── playwright.config.js          # konfigurácia E2E
│   ├── lighthouserc.cjs              # Lighthouse CI desktop + prahy
│   └── lighthouserc.mobile.cjs       # Lighthouse CI mobil
├── backend/                          # Partner API (fáza 2)
├── data/                             # dátová pipeline (NIE statické súbory aplikácie)
│   ├── raw/  processed/  pipeline/
├── docs/                             # architecture/, adr/, minutes/, planning/
├── .github/workflows/                # ci.yml, heavy-gis.yml, nightly-metrics.yml
├── package.json                      # tenký wrapper: deleguje príkazy do app/
└── README.md
```

> Pozor na dva rôzne `data`: `app/public/data/` sú súbory, ktoré aplikácia číta (pri builde aj v prehliadači),
> kým `/data/` v koreni je pipeline na spracovanie dát. Výsledok pipeline sa exportuje do `app/public/data/`.

## Ako to funguje

1. `next build` prečíta `public/data/peaks.geojson` (`lib/peaks.ts`) a vygeneruje HTML pre úvodnú stránku
   a pre každý vrchol, plus `sitemap.xml` a `robots.txt`. Výstup je v `app/out/`.
2. Prehliadač dostane hotové HTML (rýchly LCP, obsah vidí aj crawler bez JavaScriptu).
3. Kliknutím na tlačidlo sa dynamicky stiahne `lib/peakMap.ts` s MapLibre a vykreslí sa mapa.
4. Nový vrchol pridáš do `peaks.geojson`, po builde má vlastnú stránku aj záznam v sitemape.

## Čo robia súbory (konfigurácia a CI)

| Súbor | Účel |
|---|---|
| `app/next.config.mjs` | Zapína statický export (`out/`) a URL s lomkou na konci. |
| `app/playwright.config.js` | Kde sú testy, ako sa spustí aplikácia a na akých zariadeniach sa testuje. |
| `app/lighthouserc.cjs` | Prahy kvality (desktop): Performance a SEO ≥ 80 % a CLS ≤ 0,1 sú chyby, LCP, TBT a Accessibility varovania. |
| `app/lighthouserc.mobile.cjs` | To isté pre mobil, zatiaľ len varovania. |
| `app/tests/map.spec.js` | Test titulku a description, test načítania mapy po kliknutí, test obsahu bez JavaScriptu (zoznam, odkazy, schema.org). |
| `.github/workflows/ci.yml` | Pri push/PR do `main`: build, E2E (desktop), Lighthouse CI. |
| `.github/workflows/heavy-gis.yml` | Len ručne: E2E v 4 prehliadačoch + mobilný Lighthouse. |
| `.github/workflows/nightly-metrics.yml` | Každú noc: Lighthouse meranie, výsledky ako artefakty. |
| `package.json` (koreň) | Skratky na príkazy v `app/`. |

## Ďalšie kroky

1. Nahradiť `example.com` skutočnou doménou (`NEXT_PUBLIC_SITE_URL`).
2. Nahradiť približné súradnice vrcholov dátami z OSM (`natural=peak`) cez `data/pipeline/`.
3. Web manifest + service worker (PWA, offline).
4. Podstránky pre trasy a ďalšie kategórie POI.
5. PostGIS + PMTiles namiesto externého štýlu OpenFreeMap.
6. PSI API + metrics dashboard.
