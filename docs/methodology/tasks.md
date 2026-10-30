# Metodika práce s úlohami (Príloha D, draft v0.1)

**Účel:** jednotné story a subtasky, aby plánovanie, export a hodnotenie fungovali.
**Roly a nástroje:** Scrum Master; **GitHub Projects** (hierarchia Epic > Feature > Story > Task).

## Pravidlá

1. **Story** = hodnota pre používateľa: „Ako … chcem … aby …“, body 1–13 (Fibonacci), jeden zodpovedný riešiteľ.
2. **Subtask** ≤ 1 deň, má riešiteľa a stav `To do → In progress → Review → Testing → Done` (príp. `Cancelled`).
3. Čas sa loguje na subtask (vstup do projektového denníka a `data/sprints.csv`).
4. Identifikátory: story `US-n` / `Sn-m`, task `Tn-mm` (n = číslo šprintu).
5. Story, ktorá nie je akceptovaná, sa presúva do ďalšieho šprintu s dôvodom.
6. Šprint = 2 týždne; plánovanie v pondelok 1. týždňa, review + retro v piatok 2. týždňa.

## Board (GitHub Projects)

Stĺpce: `Backlog`, `To do`, `In progress`, `Review`, `Testing`, `Done`.
Polia: `Sprint` (iteration), `Points`, `Estimate (h)`, `Logged (h)`, `Module`, `Owner`.

## Dôkaz použitia

Exporty úloh (Príloha Q), `data/sprints.csv`, burndown v kapitole 10.
