# Metodika code review (Príloha G, draft v0.1)

**Účel:** zdieľať znalosti a zachytiť chyby pred mergom.
**Roly a nástroje:** vývojový manažér; GitHub Pull Requests.

## Pravidlá

1. Každý PR má aspoň 1 schválenie od iného člena tímu.
2. Review do 24 h v pracovné dni; PR nad ~400 riadkov sa rozdelí.
3. Reviewer kontroluje: správnosť, testy, čitateľnosť, licencie dát, výkon (veľkosť JS balíka, LCP), bezpečnosť (žiadne tajomstvá).
4. Komentáre konkrétne a vecné; „nit:“ = drobnosť, neblokuje.
5. Autor rieši všetky blokujúce komentáre, potom squash merge.

## Dôkaz použitia

História PR na GitHube.
