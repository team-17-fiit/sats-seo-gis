# SATS-SEO-GIS

Mapa aktívneho turizmu na Slovensku. Team Project FIIT STU.

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

Stop: `Ctrl+C` v termináli.

## Testy

```bash
cd backend && python -m pytest                # API a dáta
cd app && npm run lint && npm run test:unit   # web
```

## Nasadenie

Po každom zmergovaní do `main` sa web sám nasadí na **https://team-17-fiit.github.io/sats-seo-gis/**
(workflow `.github/workflows/deploy.yml`). Ručne: **Actions → Deploy → Run workflow**.

Pred nasadením beží `npm run test:seo -- --production` (starý názov `npm run check:urls` funguje tiež):
nasadenie sa zastaví, ak by canonical, hreflang, og:image, JSON-LD, sitemap alebo robots.txt ukazovali inam
ako na adresu webu, ak by adresa bola zástupná (`example.com`) alebo ak chýba overovací meta tag Search Console.
Tá istá kontrola overí aj celé SEO stránok – pravidlá v
[docs/methodology/seo-checks.md](docs/methodology/seo-checks.md). Lokálne po `npm run build` stačí `npm run test:seo`.

Premenné repozitára (**Settings → Secrets and variables → Actions → Variables**):

| Premenná | Načo |
|---|---|
| `SITE_URL` | vlastná doména, napr. `https://mapa.example.sk` (bez nej beží web na GitHub Pages) |
| `GOOGLE_SITE_VERIFICATION` | hodnota `content` z meta tagu Google Search Console |
| `BING_SITE_VERIFICATION` | hodnota `content` z meta tagu `msvalidate.01` (Bing Webmaster Tools) |

### Google Search Console a Bing

1. Search Console → **Pridať vlastníctvo → Predpona webovej adresy** → adresa webu (s lomkou na konci)
   → overenie **Značka HTML**. Skopíruj iba hodnotu `content`.
2. Ulož ju do premennej `GOOGLE_SITE_VERIFICATION`, spusti **Actions → Deploy → Run workflow**
   a po nasadení klikni v Search Console na **Overiť**. Premennú nemaž, Google overenie priebežne kontroluje.
3. **Sitemapy** → odošli `sitemap.xml`. **Kontrola webovej adresy** → úvodná stránka → **Požiadať o indexovanie**.
4. Bing Webmaster Tools → **Import zo Search Console** (alebo meta tag cez `BING_SITE_VERIFICATION`).

Pri prechode na vlastnú doménu: nastav `SITE_URL`, doménu v **Settings → Pages → Custom domain**,
v Search Console pridaj nové vlastníctvo a odošli sitemap znova. Stará adresa github.io presmeruje na novú.

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

Hlavné súbory:

- `app/src/app/` – stránky webu
- `backend/app/` – API
- `data/seed/paths.json` – trasy a ich zastávky

Celý repozitár:

| Priečinok | Obsah |
|---|---|
| `app/` | web – stránky `/trasy/`, `/vrcholy/`, mapa |
| `backend/app/` | REST API `/api/v1` |
| `backend/pipelines/` | import dát (OSM, GeoNames, rurAllure …) |
| `data/` | databázová schéma, 7 trás (`data/seed/paths.json`) |
| `docs/` | architektúra, ADR, metodiky, zápisnice |

Viac: [architektúra](docs/architecture/ARCHITECTURE.md) · [Pravidlá zmien](CONTRIBUTING.md) · [Definition of Done](docs/methodology/definition-of-done.md)

Plné prostredie s databázou (Docker + PostGIS, import skutočných dát) je opísané v [architektúre](docs/architecture/ARCHITECTURE.md).
