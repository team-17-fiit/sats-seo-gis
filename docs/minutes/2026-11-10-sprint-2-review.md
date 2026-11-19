# Šprint 2-2Z – review a retrospektíva

- **Šprint:** 2-2Z (26. 10. – 8. 11. 2026)
- **Cieľ:** stránky trás a miest pre vyhľadávače (SSG, SK/EN, hreflang), interaktívna mapa, obohatenie dát z Wikidata, smoke testy v CI
- **Dátum stretnutia:** 2026-11-10 · **Dátum zápisu:** 2026-11-19
- **Prítomní:** Leon Rado, Matus Plsko, Matus Vrabel, Nikolas Kristin, Richard Pukac, Vlastislav Pokorny · **Zapisovateľ:** Matus Plsko

## 1. User stories

Plánované: 7 story, 30 bodov. Akceptované v 2-2Z: 6 story, 25 bodov. Presunuté do 3-3Z: S2-5 (5 bodov).

| ID | Story | Body | Riešiteľ | Stav | Dôkaz v repozitári |
|---|---|---|---|---|---|
| S1-4 | projektový web online (prenesené z 1-1Z) | 1 | Richard Pukac | hotové 8. 11. | PR #27: `docs/site.json`, `scripts/sync-site.mjs`, `.github/workflows/sync-site.yml` |
| S2-3 | obohatenie miest z Wikidata (+ ŠOP, PÚSR) | 5 | Leon Rado | hotové, zmergované 9. 11. (deň po konci šprintu) | PR #25: `backend/pipelines/load_wikidata.py`, `load_sopsr.py`, `load_pusr.py` |
| S2-4 | Playwright smoke test | 3 | Vlastislav Pokorny | hotové | PR #22, #24: `app/tests/smoke.spec.js`, job `quality-gate` v `ci.yml` |
| S2-5 | dizajnové tokeny | 5 | Richard Pukac | neuzavretá do konca šprintu, presunutá do 3-3Z (úloha T2-13 hotová) | PR #14: `app/src/app/globals.css`, `ThemeToggle.tsx` |
| S2-6 | hreflang a sitemap | 3 | Nikolas Kristin | hotové | PR #11: `app/src/app/en/`, `app/tests/hreflang.spec.js` |
| US-1b | SSG stránky pre T1 miesta | 5 | Nikolas Kristin | hotové | PR #9: `app/src/app/miesta/[slug]/page.tsx`, `app/tests/pois.spec.js` |
| US-2 | interaktívna mapa trás | 8 | Leon Rado | hotové | PR #16: `app/src/lib/map/cluster.ts`, `MapLoader.tsx`, `app/tests/map.spec.js` |

## 2. Úlohy

| ID | Úloha | Story | Stav | PR / commit |
|---|---|---|---|---|
| T1-04 | motivačný dokument + plagát | WP1 | hotové už v 1-1Z (do uzavretého cyklu sa nedalo pridať) | mimo repozitára |
| T1-12 | projektový web v1 | S1-4 | hotové | #27 |
| T1-13 | PM nástroj + Definition of Done | WP1 | hotové (členovia pozvaní do Plane) | #18 |
| T1-16 | ochrana vetvy `main` | – | hotové | nastavenie GitHubu |
| T1-17 | DOI a licencia rurAllure DS1/DS6 | S1-3 | hotové | #20 |
| T1-18 | import celého OSM SR, zápis K10 | S1-3 | hotové | #12, #13 |
| T1-19 | Lighthouse baseline K1–K4 z CI | US-18 | hotové | #23 |
| T1-20 | súbor LICENSE (MIT) | – | hotové | #17 |
| T2-01 | MapLibre GL init + štýly | US-2 | hotové | #16 |
| T2-02 | clustering + lazy load | US-2 | hotové | #16 |
| T2-03 | map island wrapper | US-2 | hotové už v 1-1Z | – |
| T2-04 | statická fasáda (CWV-safe) | US-2 | hotové už v 1-1Z | – |
| T2-05 | dátový model POI (24 polí) | S2-3 | hotové | #25 |
| T2-06 | model trasa → podtrasa → úsek | S2-3 | hotové | #10 |
| T2-07 | Wikidata SPARQL fetcher | S2-3 | hotové | #25 |
| T2-08 | obohatenie ŠOP / PÚSR | S2-3 | hotové | #25 |
| T2-09 | šablóna stránky trasy | US-1a | hotové už v 1-1Z | – |
| T2-10 | šablóna stránky T1 miesta | US-1b | hotové | #9 |
| T2-11 | kontroly geodát | WP2 | hotové | #21 |
| T2-12 | Playwright smoke spec | S2-4 | hotové | #22, #24 |
| T2-13 | dizajnové tokeny + téma | S2-5 | hotové | #14 |
| T2-14 | hreflang + sitemap | S2-6 | hotové | #11 |
| T2-15 | EN texty pre hreflang | S2-6 | hotové | bez samostatného PR, texty v `data/seed/paths.json` (#11) |

Cyklus 2-2Z v Plane má 29 položiek, všetky v stave Done ([export](exports/2026-11-19-plane-cycle-2-2Z.csv)). Mimo exportu:
S2-5 a T2-16 (tento zápis) boli 9. 11. presunuté do 3-3Z, T1-15 (zápis zo šprintu 1) bol dokončený 10. 11. mimo cyklu.

## 3. KPI na konci šprintu (merané, nie odhadované)

Zdroj: posledný beh CI na `main` v šprinte – `CI` beh 42492779167 (commit `f82f856`, 2026-11-08).

| KPI | 1-1Z | 2-2Z | Ako zmerané |
|---|---|---|---|
| K7 funkčná kvalita | 19 pytest + 14 Vitest, E2E 3 + 5 | **36 pytest (12 preskočených) + 42 Vitest**, **15 smoke + 23 E2E** (Playwright, desktop), 0 zlyhaní | joby `backend-lint-unit`, `app-lint-unit`, `quality-gate` |
| K1–K4 Lighthouse / CWV | Performance 100, SEO 100, LCP 0,47 s, CLS 0 | prahy splnené (Performance a SEO ≥ 0,8, CLS ≤ 0,1, LCP ≤ 2,5 s; 3 behy, desktop, úvodná stránka) | `quality-gate`, Lighthouse CI; od T1-19 aj nočný beh desktop + mobil (`Nightly metrics`), reporty v artefaktoch |
| Statické stránky | 7 trás + úvod | **112 stránok** (SK aj EN: trasy, miesta, vrcholy) | `next build` |
| JS first load | 103 kB zdieľané, 108 kB úvod | 103 kB zdieľané, 108 kB úvod (bez zmeny) | `next build` |
| K19 štruktúrované dáta | JSON-LD na všetkých typoch stránok | JSON-LD aj na stránkach miest (US-1b), hreflang SK/EN v HTML aj v sitemap | E2E `hreflang.spec.js`, `pois.spec.js` |

## 4. Retrospektíva

**Čo fungovalo**
- Story boli pred šprintom rozdelené na subtasky (akcia z 1-1Z), všetkých 29 položiek cyklu je hotových.
- Malé PR s ID úlohy v názve, `main` zostal zelený: CI na poslednom commite šprintu prešlo vo všetkých štyroch jobch.
- Web, dáta a CI sa robili paralelne bez blokovania – US-2, US-1b, S2-6 a S2-4 boli hotové do 5. 11.

**Čo nefungovalo**
- Pomalé review a merge: PR #25 (S2-3) bol otvorený 5. 11., ale zmergovaný až 9. 11., deň po konci šprintu. Štyri PR (#20–#23) vznikli naraz 4. 11. večer a zmergovali sa za sebou 5. 11. ráno, takže sa tri behy CI zrušili.
- S2-5 sa do konca šprintu neuzavrela, hoci jej úloha T2-13 bola hotová 2. 11. – 5 bodov prešlo do 3-3Z.
- Čas sa v Plane stále nezapisuje (export má pri všetkých položkách `0h 0m`), burndown sa dá kresliť len z bodov.
- Workflow `Sync site content` 8. 11. dvakrát zlyhal: GitHub Actions nemá povolené vytvárať pull requesty.
- Review sa nekonalo v piatok 2. týždňa podľa metodiky, ale až v pondelok 10. 11.

**Plnenie akcií z 1-1Z**

| Akcia | Stav |
|---|---|
| Rozdeliť story na subtasky ≤ 1 deň | splnené |
| Založiť projekt v Plane | splnené (T1-13) |
| Zapnúť ochranu `main` | splnené (T1-16) |
| Doplniť DOI DS1/DS6 | splnené (T1-17) |
| Naimportovať plné OSM dáta, zapísať K10 | splnené (T1-18) |
| Zapísať K1–K4 baseline z CI | splnené (T1-19) |

**Akcie do 3-3Z**

| Akcia | Zodpovedný | Termín |
|---|---|---|
| Review PR do 24 h (metodika code review), posledný merge šprintu najneskôr v piatok 2. týždňa | celý tím | 2026-11-21 |
| Story uzavrieť v Plane hneď po merge jej poslednej úlohy | riešiteľ story | priebežne |
| Zapisovať odpracovaný čas k úlohám v Plane | celý tím | priebežne |
| Povoliť GitHub Actions vytváranie PR alebo upraviť `sync-site.yml` | Richard Pukac | 2026-11-14 |
| Review a retro 3-3Z naplánovať na piatok 2. týždňa | Matus Plsko | 2026-11-21 |
