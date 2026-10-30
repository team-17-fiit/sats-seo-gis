# Ako prispievať do SATS-SEO-GIS

Platí pre všetkých členov tímu. Pravidlá vychádzajú z dokumentácie projektu
(Kap. 9.5 *Version and configuration management*, Príloha F a G).

## 1. Branch stratégia (trunk-based)

- `main` je **chránená**: žiadny priamy push, merge len cez Pull Request.
- Krátko žijúce vetvy (ideálne ≤ 2 dni), vždy z aktuálneho `main`:

| Prefix | Na čo | Príklad |
|---|---|---|
| `feature/` | nová funkcionalita (user story) | `feature/etl-provenance` |
| `fix/` | oprava chyby | `fix/map-cls` |
| `docs/` | len dokumentácia | `docs/adr-0004-backend` |
| `chore/` | údržba, CI, konfigurácia | `chore/ci-lint` |
| `data/` | zmena dátovej pipeline / schémy | `data/ds6-import` |

- Názov vetvy môže obsahovať ID úlohy: `feature/T1-07-postgis-schema`.
- Merge spôsobom **Squash and merge** po **1 schválení** a **zelených kontrolách CI**.
- Na konci každého šprintu sa `main` otaguje (`v0.1`, `v0.2`, … – CP1 = `v0.3`, CP2 = `v0.5`).

### Odporúčané nastavenie v GitHub (Settings → Branches → `main`)

- Require a pull request before merging, 1 approval
- Require status checks to pass: `app-lint-unit`, `backend-lint-unit`, `quality-gate`
- Require linear history (squash)
- Do not allow bypassing the above settings

## 2. Commity – Conventional Commits 1.0

```
<typ>(<scope>): <krátky popis v rozkazovacom spôsobe>
```

Typy: `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `ci`, `chore`, `build`.
Scope (voliteľný): `app`, `map`, `api`, `db`, `etl`, `seo`, `ci`, `docs`, `adr`.

Príklady:

```
feat(map): add static fallback adapter
fix(api): return 404 for unknown path slug
docs(adr): ADR-0004 backend in Python/FastAPI
data(etl): import rurAllure DS6 tracks
```

`feat` zvyšuje minor verziu, `fix` patch, `BREAKING CHANGE:` v tele commitu major.

## 3. Pull Request

1. Vyplň šablónu PR (checklist Definition of Done – [`docs/methodology/definition-of-done.md`](docs/methodology/definition-of-done.md)).
2. Prepoj PR s úlohou v GitHub Projects (`Closes #123`).
3. Reviewer kontroluje podľa [`docs/methodology/code-review.md`](docs/methodology/code-review.md).
4. Červené CI = žiadny merge. Nestabilný test sa opraví do konca šprintu.

## 4. Lokálne spustenie

Pozri [README](README.md#spustenie). Pred pushom:

```bash
npm run lint && npm run test:unit      # frontend
make backend-lint backend-test         # backend + ETL
```

## 5. Tajomstvá a konfigurácia

API kľúče (PSI, WebPageTest, DB heslá pre server) **nikdy** do repozitára.
Lokálne `.env` (kópia `.env.example`), v CI GitHub Secrets.
