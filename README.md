# SATS-SEO-GIS

Mapa aktívneho turizmu na Slovensku – tematické trasy, vrcholy a miesta. Team Project FIIT STU.

- **Web:** React + Next.js (`app/`)
- **API:** Python + FastAPI (`backend/`)
- **Dáta:** PostgreSQL + PostGIS (`data/`)

## Potrebuješ

- [Git for Windows](https://git-scm.com/) (obsahuje **Git Bash** – všetky príkazy nižšie sú pre Git Bash)
- [Python 3.12+](https://www.python.org/)
- [Node.js 20+](https://nodejs.org/)

## Spustenie

Otvor **dva** Git Bash terminály v priečinku projektu.

**Terminál 1 – API** → http://localhost:8000/docs

```bash
cd backend
python -m pip install -r requirements-dev.txt   # len prvýkrát
REPOSITORY=file python -m uvicorn app.main:app --reload --port 8000
```

**Terminál 2 – web** → http://localhost:3000

```bash
cd app
npm ci                                           # len prvýkrát
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
```

Zastavenie: `Ctrl+C` v termináli.

## Testy

```bash
cd backend && python -m pytest                # API a dáta
cd app && npm run lint && npm run test:unit   # web
```

## Keď niečo nejde

| Problém | Riešenie |
|---|---|
| `Could not open requirements file` | nie si v `backend/`, alebo nemáš aktuálny kód (`git pull`) |
| `python: command not found` | skús `py` namiesto `python` |
| `address already in use` | API už beží v inom okne – zavri ho |
| `npm ci` → `EPERM` | beží starý web: `taskkill //F //IM node.exe`, potom znova `npm ci` |
| `npm run test:unit` padá na esbuild | raz spusti `npm install-scripts approve esbuild` |
| v prehliadači hláška *hydration … didn't match* | spôsobuje ju rozšírenie (napr. Grammarly), nie projekt – skús anonymné okno |
| `npm audit` hlási zraniteľnosti | ignoruj, **nespúšťaj** `npm audit fix --force` |

## Kde čo je

| Priečinok | Obsah |
|---|---|
| `app/` | web – stránky `/trasy/`, `/vrcholy/`, mapa |
| `backend/app/` | REST API `/api/v1` |
| `backend/pipelines/` | import dát (OSM, GeoNames, rurAllure …) |
| `data/` | databázová schéma, 7 trás (`data/seed/paths.json`) |
| `docs/` | architektúra, ADR, metodiky, zápisnice |

Viac: [architektúra](docs/architecture/ARCHITECTURE.md) · [ako prispievať](CONTRIBUTING.md) · [Definition of Done](docs/methodology/definition-of-done.md)

Plné prostredie s databázou (Docker + PostGIS, import skutočných dát) je opísané v [architektúre, sekcia 7](docs/architecture/ARCHITECTURE.md#7-nasadenie).
