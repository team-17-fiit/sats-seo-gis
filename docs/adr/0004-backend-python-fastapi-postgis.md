# ADR-0004: Backend a dáta – Python 3.12 + FastAPI + PostgreSQL 16/PostGIS

- **Stav:** prijaté
- **Dátum:** 2026-10-30
- **Rozhoduje:** tím SATS-SEO-GIS

## Kontext

Potrebujeme (a) ETL zo zdrojov OSM, Natural Earth, GeoNames, rurAllure, Wikidata a (b) REST API `/api/v1`
(cesty, POI v okolí, neskôr check-in a quiz). Šablóna dokumentácie počíta s Node/Rust API.
Dátová časť tímu pracuje v Pythone (pandas, osmium), frontend v TypeScripte.

## Zvažované možnosti

1. Node (Express/Fastify) – rovnaký jazyk ako frontend, ale ETL by bol v inom jazyku.
2. Rust (axum) – výkon, ale vysoká vstupná bariéra pre tím.
3. **Python + FastAPI** – jeden jazyk pre ETL aj API, automatické OpenAPI 3.1 (`/docs`), pydantic modely.
4. Go / PHP – žiadna výhoda pre ETL.

Databáza: **PostgreSQL 16 + PostGIS 3** (priestorové indexy, `ST_DWithin`, MVT pre Martin/PMTiles) – bez alternatívy.

## Rozhodnutie

Možnosť 3. Prístup k dátam cez rozhranie `PoiRepository` s dvoma implementáciami:
`PostgisPoiRepository` (produkcia) a `FilePoiRepository` (unit testy, lokálny beh bez Dockeru).
Výber cez premennú `REPOSITORY=postgis|file`.

## Dôsledky

- (+) OpenAPI dokumentácia zadarmo (príloha K), zdieľané modely ETL ↔ API.
- (+) API sa dá spustiť aj bez databázy – nováčik má kostru na localhoste za minútu.
- (−) Dva jazyky v repozitári (TS + Python) – dva lint/test joby v CI.
- (−) Pri záťaži 70k users/min (príloha Z-B) bude API za cache; prepis do Rustu sa zváži až podľa meraní (k6).
