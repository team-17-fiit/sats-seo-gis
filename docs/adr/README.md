# Register ADR

Zrkadlí tabuľku Y.2 dokumentácie – pri zmene aktualizovať obe.

| ADR | Rozhodnutie | Stav | Zamietnuté |
|---|---|---|---|
| [0001](0001-frontend-framework.md) | Frontend: React + Next.js (statický export) | prijaté | Vite SPA, vite-react-ssg, Astro |
| [0002](0002-mobile-delivery.md) | Mobil: PWA + TWA + Capacitor | navrhnuté | Expo/RN, Flutter, natívne |
| [0003](0003-map-engine.md) | Mapa: MapLibre GL za MapAdapter, PMTiles | prijaté | Leaflet raster, komerčné API |
| [0004](0004-backend-python-fastapi-postgis.md) | Backend: Python + FastAPI + PostGIS 16 | prijaté | Node, Rust (axum), Go, PHP |
| [0005](0005-etl-orchestration.md) | ETL: Makefile teraz, Airflow neskôr | prijaté | Airflow od 1. šprintu |
| [0006](0006-path-geometry-routing.md) | Geometria trás: etapy cez GraphHopper nad OSM | navrhnuté | skladanie z OSM relácií, OSRM |

Šablóna nového ADR: Stav, Dátum, Kontext, Zvažované možnosti, Rozhodnutie, Dôsledky (+/−).
