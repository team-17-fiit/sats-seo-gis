# Roly a podiel práce

*Podklad pre kontrolný bod KB1 (S3-6, úloha T3-17) · stav k 19. 11. 2026 · zdroje: Plane, GitHub, zápisnice*

## Zmena zloženia tímu

Na stretnutí 3. 11. 2026 (zapisovateľ Vlastislav Pokorný) tím zaznamenal, že **Jan Porubský ukončil spoluprácu**.
Jeho oblasť – **partneri a zdroje dát** – preberá **Matúš Plško**. Od 3. 11. má tím šesť členov.

Rozpracované úlohy Jana Porubského zo šprintu 2-2Z dokončili:

| Úloha | Dokončil | Dôkaz |
|---|---|---|
| S2-3 obohatenie miest z Wikidata (+ T2-05, T2-07, T2-08) | Leon Radó | PR #25 |
| T1-17 DOI a licencia rurAllure DS1/DS6 | Vlastislav Pokorný | PR #20 |

## Roly

V šprinte 1-1Z boli riešitelia v Plane označení písmenami A–G. Oblasť každého člena vychádza z úloh, ktoré mu sú v Plane pridelené, a z jeho PR na GitHube.

| Člen | V 1-1Z | Rola a oblasť práce | Story a úlohy |
|---|---|---|---|
| Matúš Plško | G | **Scrum Master:** Plane, plánovanie, review a retrospektívy šprintov, zápisnice, dokumentácia ku kontrolným bodom; od 3. 11. aj partneri a zdroje dát | T1-13, T1-15, T1-20, T2-16, S3-6, T3-20 |
| Matúš Vrábel | B | repozitár a architektúra (ADR), import OSM a model trás, nasadenie webu, vlastné mapové dlaždice | T1-01, T1-11, T1-18, T2-06, S3-2, S3-3 |
| Nikolas Kristin | A | SEO stránky: statické stránky trás a miest, SK/EN a hreflang, štruktúrované dáta, náhľady pri zdieľaní, Search Console | US-1a, US-1b, S2-6, S3-1, T3-06, T3-24 |
| Leon Radó | F | interaktívna mapa (MapLibre), obohatenie dát (Wikidata, ŠOP, PÚSR, Wikimedia Commons), export vrstiev pre dlaždice; v 1-1Z motivačný dokument a metodiky | US-2, S2-3, S3-4, T3-07, T1-04, T1-14 |
| Vlastislav Pokorný | D | CI a kvalita: testy (Playwright, Lighthouse), kontroly geodát, ochrana `main`, výkonnostné budgety, SEO audit | US-18, S2-4, T2-11, T1-19, S3-5, S3-7 |
| Richard Pukáč | E | tímový web, dizajn (tokeny, svetlá/tmavá téma), anglické texty, prvky stránky miesta | S1-4, S2-5, T2-15, T3-03, T3-13, T3-19, T3-23 |
| Jan Porubský (do 3. 11.) | C | zdroje dát a licencie: licenčný register, import OSM, Natural Earth, GeoNames a rurAllure | S1-3, US-11, T1-03, T1-05 – T1-08 |

## Podiel práce podľa Plane

- **Body** = body hotových story, ktorých je člen riešiteľom.
- **Hodiny** = súčet *odhadov* hotových úloh (`odhad: n h` v popise úlohy). Skutočný čas sa v Plane nezapisuje (pri všetkých položkách `0h 0m`), preto ide o odhad, nie o odpracovaný čas.
- Úlohy 1-1Z sú priradené podľa písmen A–G, úlohy Jana Porubského zo šprintu 2-2Z tomu, kto ich dokončil (tabuľka vyššie).
- Šprint 3-3Z beží do 22. 11.; „rozpracované“ sú položky v stave Todo alebo Review k 19. 11.

| Člen | 1-1Z body / h | 2-2Z body / h | 3-3Z hotové body / h | 3-3Z rozpracované body / h | Hotové h spolu | Podiel na hotových h | Podiel vrátane rozpracovaných |
|---|---|---|---|---|---|---|---|
| Matúš Plško | 0 / 0 | 0 / 5 | 0 / 0 | 5 / 20 | 5 | 2,5 % | 9,1 % |
| Matúš Vrábel | 0 / 12 | 0 / 10 | 0 / 12 | 11 / 10 | 34 | 16,7 % | 16,0 % |
| Nikolas Kristin | 5 / 8 | 8 / 18 | 5 / 15 | 5 / 4 | 41 | 20,2 % | 16,4 % |
| Leon Radó | 0 / 4 | 13 / 41 | 0 / 14 | 5 / 0 | 59 | 29,1 % | 21,5 % |
| Vlastislav Pokorný | 5 / 8 | 3 / 13 | 0 / 0 | 8 / 23 | 21 | 10,3 % | 16,0 % |
| Richard Pukáč | 0 / 0 | 1 / 15 | 5 / 0 | 0 / 15 | 15 | 7,4 % | 10,9 % |
| Jan Porubský | 10 / 28 | – | – | – | 28 | 13,8 % | 10,2 % |
| **Spolu** | **20 / 60** | **25 / 102** | **10 / 41** | **34 / 72** | **203** | 100 % | 100 % |

Podiel vrátane rozpracovaných počíta s 275 h (203 h hotových + 72 h rozpracovaných v 3-3Z); súčet percent je zaokrúhlený.
Story S2-5 (Richard Pukáč) a US-1a2 (Nikolas Kristin) sa uzavreli v 3-3Z, preto sú ich body v stĺpci 3-3Z.

## Podiel práce podľa GitHubu

Zmergované pull requesty podľa autora a commity v `main` bez merge commitov, podľa dátumu v šprinte.

| Člen | PR 1-1Z | PR 2-2Z | PR 3-3Z | Commity 1-1Z | Commity 2-2Z | Commity 3-3Z |
|---|---|---|---|---|---|---|
| Matúš Plško | 0 | 3 | 0 | 0 | 3 | 0 |
| Matúš Vrábel | 0 | 8 | 2 | 4 | 28 | 2 |
| Nikolas Kristin | 0 | 2 | 3 | 0 | 2 | 3 |
| Leon Radó | 0 | 1 | 4 | 0 | 1 | 4 |
| Vlastislav Pokorný | 0 | 5 | 0 | 0 | 6 | 0 |
| Richard Pukáč | 0 | 2 | 0 | 0 | 2 | 0 |

Kód úloh šprintu 1-1Z (schéma, ETL, CI, kostra webu) sa do `main` dostal 30. 10. cez PR #2 (Matúš Vrábel), ktorý dopĺňal chýbajúce položky po konci šprintu – preto má väčšina commitov 2-2Z jedného autora. Dokumentácia mimo repozitára (motivačný dokument, tímový web pred 8. 11.) v tabuľke nie je.
