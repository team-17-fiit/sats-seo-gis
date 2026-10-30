# Metodika testovania (Príloha E, draft v0.1)

**Účel:** každá story je pokrytá testami; kvalita sa meria, nie tvrdí.
**Roly a nástroje:** test manažér; Vitest, pytest, Playwright, Lighthouse CI, axe-core, k6.

## Úrovne testov

| Úroveň | Nástroj | Čo dokazuje | Brána v CI | Kde |
|---|---|---|---|---|
| Unit (frontend) | Vitest | logika knižníc, adaptéry (MapAdapter) | 100 % pass | `app/src/**/*.test.ts` |
| Unit (backend) | pytest | API, repozitáre, ETL transformácie | 100 % pass | `backend/tests/` |
| Kontrakt dát | SQL + pytest | schéma, platná geometria, licencie | žiadna neznáma licencia | `data/db/checks.sql` |
| E2E | Playwright | používateľské scenáre mobil + desktop | 100 % (K7) | `app/tests/` |
| Výkon | LHCI, k6 | CWV budgety, p95 API | K1–K4 | `app/lighthouserc*.cjs` |
| Prístupnosť | axe-core | WCAG 2.2 AA | K17 | (šprint 4-4Z) |

## Pravidlá

1. Unit test pre každú službu; názov testu opisuje správanie.
2. Jeden E2E scenár na user story; mobilný aj desktop profil.
3. Budgety: LCP 2,5 s, CLS 0,1, TBT 200 ms, Lighthouse ≥ 80.
4. Červená brána blokuje merge; nestabilný test sa opraví v rámci šprintu.
5. Unit testy nesmú potrebovať sieť ani databázu (repozitáre sa podvrhnú – `FilePoiRepository`, `FakeMapAdapter`).
