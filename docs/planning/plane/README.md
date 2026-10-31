# Úlohy v Plane

Úlohy tímu riadime v [Plane](https://plane.so). Táto stránka sa dá skopírovať aj do Plane ako Page.

## Jednorazové nastavenie (robí Scrum Master)

1. **Projekt:** v Plane vytvor projekt `SATS-SEO-GIS` a pozvi všetkých členov tímu (e-mailom).
2. **Stavy** (Project settings → States): nechaj predvolené `Backlog`, `Todo`, `In Progress`, `Done`, `Cancelled`
   a pridaj **`Review`** (za In Progress) a **`Testing`** (za Review).
3. **Body** (Project settings → Estimates): zapni odhady typu **Points** so škálou `1, 2, 3, 5, 8, 13`.
4. **Cykly** (Cycles = šprinty): vytvor presne s týmito názvami:

   | Názov | Od | Do |
   |---|---|---|
   | `1-1Z` | 2026-10-12 | 2026-10-25 |
   | `2-2Z` | 2026-10-26 | 2026-11-08 |

   Import cykly nevytvára – ak názov nesedí, úloha ostane mimo cyklu.
5. **Import** (potrebuješ rolu Workspace Admin): Workspace settings → Imports → **CSV** → Import → vyber projekt `SATS-SEO-GIS` → súbor [`plane-import.csv`](plane-import.csv).
6. **Riešitelia:** po importe priraď ľudí – v popise každej úlohy je `Riešiteľ: A–G` podľa rolí v dokumentácii.

## Čo je v importe (47 položiek)

| Cyklus | Obsah |
|---|---|
| `1-1Z` | hotové story a úlohy prvého šprintu (stav Done) – kvôli histórii a velocity |
| `2-2Z` | **9 úloh, ktoré z 1. šprintu chýbajú** (T1-04, T1-12, T1-13, T1-15 až T1-20) s termínom **4. 11.** |
| `2-2Z` | plán 2. šprintu: 6 story (27 bodov) a ich úlohy T2-xx |

**Štítky:** `story`, `web`, `api`, `dáta`, `seo`, `ci`, `docs`, `pm`. Story majú body, úlohy majú odhad hodín v popise.

## Ako s tým pracujeme

1. **Plánovanie** (pondelok 1. týždňa): vyberieme story do cyklu, každú rozdelíme na úlohy **≤ 1 deň**.
2. **Počas šprintu:** úlohu si priradíš, presunieš do `In Progress`, po otvorení PR do `Review`.
   Do názvu vetvy a PR daj ID úlohy, napr. `feature/T2-10-stranka-miesta`.
3. **Hotovo:** po merge PR presuň do `Done` (podľa [Definition of Done](../../methodology/definition-of-done.md)).
4. **Koniec šprintu** (piatok 2. týždňa): review + retro, export cyklu (Cycles → … → export) do zápisnice
   v `docs/minutes/`, nehotové story presunieme do ďalšieho cyklu s dôvodom.

## Zmena plánu

Úlohy sa ďalej menia priamo v Plane. CSV slúži len na prvé naplnenie – po importe ho už neupravuj.
