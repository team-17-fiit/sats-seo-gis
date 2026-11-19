# Metodika testovania (Príloha E, draft v0.2)

**Účel:** každá story je pokrytá testami; kvalita sa meria, nie tvrdí.
**Roly a nástroje:** test manažér; Vitest, pytest, Playwright, Lighthouse CI, axe-core, vlastná SEO kontrola, k6.

## Úrovne testov

| Úroveň | Nástroj | Čo dokazuje | Brána v CI | Kde |
|---|---|---|---|---|
| Unit (frontend) | Vitest | logika knižníc, adaptéry (MapAdapter) | 100 % pass | `app/src/**/*.test.ts` |
| Unit (backend) | pytest | API, repozitáre, ETL transformácie | 100 % pass | `backend/tests/` |
| Kontrakt dát | SQL + pytest | schéma, platná geometria, licencie | žiadna neznáma licencia | `data/db/checks.sql` |
| Geodáta (T2-11) | SQL + Python | nadväznosť úsekov (≤ 50 m), zastávky pri trase (≤ 200 m), poradie zastávok, súradnice v SR / prehodené lat-lon; varovania: duplicity, nadmorská výška, dĺžka trasy | 0 chýb (`check`), varovania (`warn`) len vypíše | `data/db/checks.sql`, `backend/pipelines/geocheck.py` (export pre web, aj v `export_static`) |
| **SEO (T3-21, T3-22)** | vlastný audit nad `out/` (parse5) | každá stránka: unikátny title a description, práve 1 H1, poradie nadpisov, canonical, hreflang (vzájomný), alt texty, Open Graph, funkčné odkazy, sitemap = web, robots.txt | 0 chýb (`error`) | `app/scripts/seo/`, pravidlá v [seo-checks.md](seo-checks.md) |
| **Štruktúrované dáta (T3-04, K19)** | ten istý audit + slovník schema.org | JSON-LD platný voči schema.org, BreadcrumbList podľa pravidiel Google, url = canonical, názov = H1, geo v SR | 0 chýb na 100 % stránok | `app/scripts/seo/jsonld.mjs` |
| E2E | Playwright | používateľské scenáre mobil + desktop | 100 % (K7) | `app/tests/` |
| **Prístupnosť (T3-15, K17)** | axe-core v Playwright + vlastné testy | WCAG 2.2 AA na každej stránke zo sitemap, tmavá téma, mobil, načítaná mapa; klávesnica, viditeľný fokus, reflow 320 px, text 200 %, reduced motion | 0 porušení WCAG A/AA, 0 serious/critical best-practice | `app/tests/a11y.spec.js` |
| Výkon | LHCI, k6 | CWV budgety, p95 API | K1–K4 | `app/lighthouserc*.cjs` |

## Spustenie lokálne (v `app/`)

```bash
npm run build          # statický web do out/
npm run test:seo       # SEO kontrola všetkých stránok
npm run test:e2e       # Playwright
```

## Pravidlá

1. Unit test pre každú službu; názov testu opisuje správanie.
2. Jeden E2E scenár na user story; mobilný aj desktop profil.
3. Budgety: LCP 2,5 s, CLS 0,1, TBT 200 ms, Lighthouse ≥ 80.
4. Červená brána blokuje merge; nestabilný test sa opraví v rámci šprintu.
5. Unit testy nesmú potrebovať sieť ani databázu (repozitáre sa podvrhnú – `FilePoiRepository`, `FakeMapAdapter`).
6. **Kontrola musí vedieť zlyhať.** Každé SEO pravidlo má unit test, ktorý mu podstrčí chybnú stránku
   (`scripts/seo/audit.test.mjs`); a11y sada má „kontrolu kontroly“, ktorá do stránky vloží známe chyby
   a overí, že ich axe a test fokusu nájdu. Test, ktorý nikdy nespadne, nič nedokazuje.
7. Kontroluje sa celý web, nie vzorka: SEO audit a axe prechádzajú všetky stránky zo sitemap.
