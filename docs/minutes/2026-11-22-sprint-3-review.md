# Šprint 3-3Z – review a retrospektíva

- **Šprint:** 3-3Z (9. 11. – 22. 11. 2026)
- **Cieľ:** SEO (náhľady pri zdieľaní, drobčeková navigácia, verejná adresa), vlastné mapové dlaždice, údaje z Wikidata na webe, budgety v CI, dokumentácia ku kontrolnému bodu KB1
- **Dátum stretnutia:** 2026-11-22 (nedeľa) · **Dátum zápisu:** 2026-11-26
- **Prítomní:** Leon Radó, Matúš Plško, Matúš Vrábel, Nikolas Kristin, Richard Pukáč, Vlastislav Pokorný · **Zapisovateľ:** Matúš Plško

## 1. User stories

Plánované: 9 story, 44 bodov (7 nových za 34 bodov + S2-5 a US-1a2 prenesené z 2-2Z). Akceptované: 9 story, 44 bodov.

| ID | Story | Body | Riešiteľ | Stav | Dôkaz v repozitári |
|---|---|---|---|---|---|
| S2-5 | dizajnové tokeny (prenesené z 2-2Z) | 5 | Richard Pukáč | hotové 15. 11. | PR #14: `app/src/app/globals.css`, `ThemeToggle.tsx` |
| US-1a2 | SSG stránky všetkých 7 trás (prenesené z 2-2Z) | 5 | Nikolas Kristin | hotové 15. 11. | `app/src/app/(sk)/trasy/`, `app/src/app/(en)/` |
| S3-1 | SEO: náhľady pri zdieľaní a drobčeková navigácia | 5 | Nikolas Kristin | hotové 22. 11. | PR #29, #30, #45, #41 |
| S3-2 | web nasadený na verejnej adrese | 3 | Matúš Vrábel | hotové 19. 11. | PR #33, #36: `.github/workflows/deploy.yml` |
| S3-3 | vlastné mapové dlaždice PMTiles | 8 | Matúš Vrábel | hotové 21. 11., zúžený rozsah (vlastná podkladová mapa presunutá do 4-4Z) | PR #32, #34, #51, #52: `backend/pipelines/build_tiles.py`, `app/src/lib/map/` |
| S3-4 | údaje z Wikidata na stránkach miest | 5 | Leon Radó | hotové 19. 11., znovu otvorené 20. 11., hotové 21. 11. | PR #35, #46, #50 |
| S3-5 | výkonnostné budgety a prístupnosť v CI | 5 | Vlastislav Pokorný | hotové 19. 11. | PR #43, #44, #48: `app/lighthouse/budgets.cjs`, `app/tests/a11y.spec.js` |
| S3-6 | dokumentácia ku kontrolnému bodu KB1 | 5 | Matúš Plško | hotové 22. 11. | PR #37, #38, dokumentácia v Overleafe |
| S3-7 | kontrola SEO všetkých stránok | 3 | Vlastislav Pokorný | hotové 19. 11. | PR #39–#42, #48: `docs/audits/2026-11-19-seo-audit.md` |

**Zúžený rozsah S3-3 (rozhodnutie 21. 11.):** mapa na úvodnej stránke kreslí trasy a miesta z vlastného `sats.pmtiles`, podkladová mapa zostáva z OpenFreeMap. Vlastná podkladová mapa, dlaždice z celej databázy a mapy na stránkach trás a miest sú v 4-4Z ako S4-1 a S4-2 (SATSS-87 až 89).

## 2. Úlohy

| ID | Úloha | Story | Riešiteľ | h | Stav | PR |
|---|---|---|---|---|---|---|
| T2-16 | sprint review + retro šprintu 2 | WP1 | Matúš Plško | 2 | hotové | #37 |
| T3-01 | og:image a og:url pre všetky typy stránok | S3-1 | Nikolas Kristin | 6 | hotové | #30 |
| T3-02 | BreadcrumbList JSON-LD pre trasy, miesta a vrcholy | S3-1 | Nikolas Kristin | 5 | hotové | #29 |
| T3-03 | favicon a ikony PWA | S3-1 | Richard Pukáč | 3 | hotové | #45 |
| T3-04 | kontrola Rich Results pre všetky typy stránok (K19) | S3-1 | Vlastislav Pokorný | 3 | hotové | #41 |
| T3-05 | automatické nasadenie statického webu z main | S3-2 | Matúš Vrábel | 6 | hotové | #33 |
| T3-06 | ostrá doména v canonical, sitemap a robots + Search Console | S3-2 | Nikolas Kristin | 4 | hotové | #36 |
| T3-07 | export vrstiev z PostGIS pre dlaždice | S3-3 | Leon Radó | 5 | hotové | #32 |
| T3-08 | generovanie PMTiles cez tippecanoe (`make tiles`) | S3-3 | Matúš Vrábel | 6 | hotové | #34 |
| T3-09 | MapLibre: trasy a miesta z vlastných PMTiles | S3-3 | Matúš Vrábel | 6 | hotové | #51 |
| T3-10 | štýl mapy: farby trás, miest a vrcholov | S3-3 | Matúš Vrábel | 4 | hotové | #52 |
| T3-11 | export image, opening_hours a protected_area do `pois.json` | S3-4 | Leon Radó | 4 | hotové | #35, #50 |
| T3-12 | autor a licencia obrázkov z Wikimedia Commons | S3-4 | Leon Radó | 5 | hotové | #35 |
| T3-13 | obrázok, opis a chránené územie na stránke miesta | S3-4 | Richard Pukáč | 6 | hotové | #46 |
| T3-14 | budgety LCP, CLS a veľkosť JS v Lighthouse CI | S3-5 | Vlastislav Pokorný | 5 | hotové | #44, #48 |
| T3-15 | axe-core v E2E testoch | S3-5 | Vlastislav Pokorný | 5 | hotové | #43, #48 |
| T3-16 | šprinty 1–3 v dokumentácii | S3-6 | Matúš Plško | 6 | hotové | Overleaf |
| T3-17 | roly a podiel práce po zmene zloženia tímu | S3-6 | Matúš Plško | 3 | hotové | #38 |
| T3-18 | kapitoly 5.1 Mapa a 5.2 Dáta | S3-6 | Matúš Plško (text Matúš Vrábel) | 6 | hotové | Overleaf |
| T3-19 | zápisnice a export úloh na tímovom webe | S3-6 | Richard Pukáč | 3 | hotové | – |
| T3-20 | sprint review + retro + export 3-3Z | WP1 | Matúš Plško | 3 | hotové | tento zápis |
| T3-21 | SEO audit všetkých typov stránok | S3-7 | Vlastislav Pokorný | 5 | hotové | #42 |
| T3-22 | automatický SEO test v CI | S3-7 | Vlastislav Pokorný | 5 | hotové | #40, #48 |
| T3-23 | kontrola interných odkazov a sitemap | S3-7 | Richard Pukáč | 3 | hotové | – |
| T3-24 | oprava nájdených SEO chýb | S3-7 | Vlastislav Pokorný | 4 | hotové | #39 |

Cyklus 3-3Z v Plane má 34 položiek, všetky v stave Done ([export](exports/2026-11-26-plane-cycle-3-3Z.csv)).
Odhad úloh spolu 113 h; odpracovaný čas sa v Plane nezapisuje (export má `0h 0m`), v dokumentácii je z projektového denníka (116 h).

## 3. KPI na konci šprintu (merané, nie odhadované)

Zdroj: posledný beh CI na `main` v šprinte – `CI` beh 44931782035 (commit `172c9d1`, 2026-11-21).

| KPI | 2-2Z | 3-3Z | Ako zmerané |
|---|---|---|---|
| K7 funkčná kvalita | 36 pytest + 42 Vitest, 15 smoke + 23 E2E | **85 pytest (23 preskočených) + 201 Vitest**, **15 smoke + 138 E2E** (vrátane axe-core a budgetov), 0 zlyhaní | joby `backend-lint-unit`, `app-lint-unit`, `quality-gate` |
| K1–K4 Lighthouse / CWV | prahy splnené na úvodnej stránke | prahy splnené na **6 typoch stránok**, desktop 3 behy a mobil 5 behov; budgety LCP ≤ 2,5 s, CLS ≤ 0,1, JS ≤ 125 kB | `lighthouse`, `app/lighthouse/budgets.cjs` |
| JS po načítaní mapy | – | 318 kB (budget ≤ 360 kB), posun po načítaní mapy CLS 0,008 | `app/tests/budgets.spec.js` |
| JS first load | 103 kB zdieľané, 108 kB úvod | 103 kB zdieľané, 107–108 kB na stránku (bez zmeny) | `next build` |
| K17 prístupnosť | – | axe-core na všetkých stránkach v E2E, WCAG 2.2 AA, 0 zlyhaní | `app/tests/a11y.spec.js` |
| K19 štruktúrované dáta | JSON-LD na všetkých typoch stránok | + BreadcrumbList, kontrola Rich Results a SEO kontrola produkčného buildu pri nasadení | `npm run test:seo`, `deploy.yml` |
| K5 indexovateľnosť | – | web verejne na https://team-17-fiit.github.io/sats-seo-gis/, overenie Search Console | workflow `Deploy` |

## 4. Retrospektíva

**Čo fungovalo**
- Všetkých 9 story (44 bodov) je akceptovaných, vrátane dvoch prenesených z 2-2Z.
- Review PR je rýchlejšie: väčšina PR bola zmergovaná v ten istý deň (napr. #39–#44 do hodiny).
- Workflow `Sync site content` už vytvára PR sám (#47), akcia z 2-2Z je splnená.
- Web je verejne nasadený a CI stráži nielen skóre, ale aj LCP, CLS, veľkosť JS a prístupnosť.

**Čo nefungovalo**
- Nové story sa uzavreli až v druhom týždni (S3-2, S3-5, S3-7 19. 11., S3-3 a S3-4 21. 11., S3-1 a S3-6 22. 11.), burndown dosiahol nulu až v posledný deň.
- Niektoré PR čakali dlho: #30 (T3-01) 7 dní, #32 (T3-07) 6 dní, #50 (S3-4) 2 dni.
- Posledné merge šprintu boli v sobotu 21. 11. (#50, #51, #52), nie v piatok 2. týždňa.
- S3-4 bola uzavretá pred overením na webe (fotky sa nezobrazovali, lebo `pois.json` nebol obnovený) a musela sa znovu otvoriť.
- Odpracovaný čas sa v Plane stále nezapisuje.
- Rozsah S3-3 sa musel zúžiť; vlastná podkladová mapa bola podcenená.

**Plnenie akcií z 2-2Z**

| Akcia | Stav |
|---|---|
| Review PR do 24 h, posledný merge najneskôr v piatok 2. týždňa | čiastočne: väčšina PR v ten istý deň, výnimky #30, #32, #50; posledné merge v sobotu 21. 11. |
| Story uzavrieť v Plane hneď po merge jej poslednej úlohy | čiastočne: S3-1 uzavretá 22. 11., hoci posledná úloha bola hotová 19. 11. |
| Zapisovať odpracovaný čas k úlohám v Plane | nesplnené (export `0h 0m`) |
| Povoliť GitHub Actions vytváranie PR alebo upraviť `sync-site.yml` | splnené (#47) |
| Review a retro 3-3Z naplánovať na piatok 2. týždňa | nesplnené: review bolo v nedeľu 22. 11., v posledný deň šprintu |

**Akcie do 4-4Z**

| Akcia | Zodpovedný | Termín |
|---|---|---|
| Story uzavrieť až po overení na nasadenom webe (Definition of Done) | riešiteľ story | priebežne |
| Rozsah mapových úloh zúžiť už pri plánovaní, nie počas šprintu | Matúš Vrábel | 2026-11-23 |
| Zapisovať odpracovaný čas k úlohám v Plane | celý tím | priebežne |
| Posledný merge šprintu najneskôr v piatok 2. týždňa, review a retro 4-4Z v piatok 4. 12. | celý tím, Matúš Plško | 2026-12-04 |
