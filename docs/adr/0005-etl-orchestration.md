# ADR-0005: Orchestrácia ETL – Makefile teraz, Airflow neskôr

- **Stav:** prijaté
- **Dátum:** 2026-10-30
- **Rozhoduje:** tím SATS-SEO-GIS

## Kontext

Kapitola 6 dokumentácie počíta s Apache Airflow (DAG-y na zdroj, retry, SLA). V šprinte 1 nemáme server
a potrebujeme, aby `make data` prešlo na notebooku každého člena.

## Rozhodnutie

Každý krok ETL je samostatný, idempotentný Python modul (`python -m pipelines.<krok>`) s jasným vstupom
a výstupom. Poradie drží `Makefile` (`make data`). Keď bude fakultná VM (najskôr 3-3Z), každý modul sa
obalí ako task v Airflow DAG bez zmeny logiky.

## Dôsledky

- (+) Nulová infraštruktúra navyše, jednoduché ladenie.
- (+) Prechod na Airflow je mechanický (task = modul).
- (−) Žiadne retry/SLA ani história behov, kým nie je Airflow.
