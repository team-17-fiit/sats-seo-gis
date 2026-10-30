# Ako prispievať

## Postup pri každej zmene

```bash
git checkout main
git pull                                  # aktuálny kód
git checkout -b feature/kratky-popis      # nová vetva
# ... urob zmeny ...
git add .
git commit -m "feat(app): pridaj stránku miesta"
git push -u origin feature/kratky-popis
```

Potom na GitHube otvor **Pull Request** do `main`, počkaj na zelené kontroly a jedno schválenie od kolegu. Merguj tlačidlom **Squash and merge**.

## Pravidlá

1. **Do `main` nikdy priamo** – vždy cez vetvu a Pull Request.
2. **Názov vetvy:** `feature/…` (nová vec), `fix/…` (oprava), `docs/…` (dokumentácia).
3. **Commit správa:** `typ(časť): čo si urobil` – napr. `fix(api): oprav chybu pri prázdnej trase`.
   Typy: `feat`, `fix`, `docs`, `test`, `chore`.
4. **Červené CI = nemerguj.** Oprav chybu a pushni znova.
5. **Žiadne heslá ani API kľúče v kóde.**
6. **Nový zdroj dát** zapíš do [licenčného registra](docs/planning/data-licence-register.md).

## Pred pushom (voliteľné, CI to aj tak skontroluje)

```bash
cd backend && python -m pytest
cd app && npm run lint && npm run test:unit
```

Kedy je úloha hotová: [Definition of Done](docs/methodology/definition-of-done.md).
