# Definition of Done (DoD)

*Príloha B dokumentácie · verzia v1.0 · platí od šprintu 1-1Z*

**Účel:** zhodnúť sa, kedy je práca hotová, na piatich úrovniach.
**Roly a nástroje:** celý tím; checklist v šablóne PR (`.github/pull_request_template.md`), GitHub Projects.

| Úroveň | Hotovo, keď | Kto overí |
|---|---|---|
| **Task** (≤ 1 deň) | kód zreviewovaný (1 schválenie), unit testy prechádzajú, lint čistý, čas zapísaný v denníku | reviewer |
| **Story** | akceptačné kritériá splnené, E2E scenár existuje a prechádza, dokumentácia/ADR aktualizované, ukážka na review | product owner na sprint review |
| **Feature** | všetky story hotové, Lighthouse brány zelené (≥ 80, CLS ≤ 0,1), prístupnosť bez vážnych axe chýb | test manažér |
| **Epic** | používateľsky otestovaný, story karty a preklady SK/EN skontrolované | product owner |
| **Projekt** | release otagovaný, manuály a e-médium kompletné | vedúci tímu |

## Dátové úlohy (doplnok pre modul 2)

Dátová úloha je hotová, keď navyše:

- každý riadok má vyplnené `source_id` a `licence_id` (licenčná brána prejde),
- geometrie sú platné (`ST_IsValid`), súradnice v rozsahu SR + buffer,
- nový zdroj je v [licenčnom registri](../planning/data-licence-register.md),
- surové súbory nie sú v gite, je zapísaný ich SHA256 v `data/SOURCES.md`.

## Dôkaz použitia

Zaškrtnutý checklist v PR; akceptované story v kapitole 10 (sprint summaries).
