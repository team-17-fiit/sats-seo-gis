# ADR-0006: Geometria trás – etapy trasované GraphHopperom nad OSM

- **Stav:** navrhnuté
- **Dátum:** 2026-11-01
- **Rozhoduje:** tím SATS-SEO-GIS

## Kontext

Trasy mali geometriu ako priamky medzi zastávkami (`path_segment`, `surface='placeholder'`).
Chceme skutočnú čiaru po cestách a značených chodníkoch. Geometria KST/KČT nie je otvorená (príloha Z-G),
takže zdrojom je OSM (ODbL). Naše trasy sú tematické: idú cez viac OSM relácií, zastávky (hrad, múzeum)
často na relácii neležia a niektoré trasy (okruh múzeí) žiadne diaľkové značenie nemajú.

## Zvažované možnosti

1. **Poskladať trasu z OSM relácií** (`canonical.route`) – presné pri značených trasách, ale diery medzi
   reláciami, zastávky mimo relácie, nutné ručné párovanie a otáčanie ways.
2. **Routovací engine nad OSM (GraphHopper)** – vždy súvislá čiara zo zastávky do zastávky, profil podľa témy,
   značené chodníky sa dajú uprednostniť (`foot_network`).
3. OSRM / Valhalla / BRouter – OSRM nemá vhodný turistický profil, Valhalla a BRouter sú zložitejšie na nasadenie.

## Rozhodnutie

Model **trasa (`path`) → podtrasa/etapa (`path_leg`, medzi dvoma zastávkami) → úsek (`path_segment`)**.
Geometriu etapy počíta GraphHopper (`docker compose up -d graphhopper`, `pipelines.route_legs`) nad tým istým
`slovakia-latest.osm.pbf`. Etapa sa delí na úseky podľa značenia a každý úsek sa spáruje s OSM reláciou
(`osm_relation_id`, `route_path.share_pct`) – relácie teda slúžia na popis, nie na kreslenie.
Web dostáva geometriu ako `app/public/data/geom/<slug>.json` (jeden LineString na etapu), ktorý mapa
stiahne až po kliknutí.

## Dôsledky

- (+) Súvislá čiara pre všetkých 7 trás, aj bez značenia; ručná korekcia cez `via` v seede.
- (+) Prepočítavajú sa len zmenené etapy (`routed_at`), CI beží bez GraphHoppera (priamky).
- (+) HTML stránok sa nezväčšuje; geometria sa sťahuje len s interaktívnou mapou.
- (−) Ďalší kontajner (~2 GB RAM pri importe SR) a prvý import trvá niekoľko minút.
- (−) Odvodená geometria je pod ODbL (share-alike) – atribúcia na stránke trasy.
