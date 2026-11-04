# =============================================================================
# SATS-SEO-GIS – skratky pre lokálny vývoj.  `make help` vypíše ciele.
# Predpoklady: Node 20+, Python 3.12+, (voliteľne) Docker, osm2pgsql.
# =============================================================================
SHELL := /bin/bash
PY ?= python3
BACKEND := backend
export DATABASE_URL ?= postgresql://satsgis:satsgis@localhost:5432/satsgis

.PHONY: help install db db-down migrate fetch data data-fixtures export api dev \
        export-seed backend-lint backend-test app-lint app-test test lint

help: ## zoznam cieľov
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-15s\033[0m %s\n",$$1,$$2}'

install: ## nainštaluje závislosti frontendu aj backendu
	npm --prefix app ci
	$(PY) -m pip install -r $(BACKEND)/requirements-dev.txt

# --- databáza -----------------------------------------------------------------
db: ## spustí PostGIS v Dockeri (localhost:5432)
	docker compose up -d db

db-down: ## zastaví kontajnery
	docker compose down

migrate: ## aplikuje SQL migrácie (idempotentné)
	cd $(BACKEND) && $(PY) -m pipelines.migrate

# --- ETL ----------------------------------------------------------------------
fetch: ## stiahne surové dáta do data/raw (OSM ~350 MB)
	cd $(BACKEND) && $(PY) -m pipelines.fetch

data: migrate ## celá pipeline nad skutočnými dátami (po `make fetch`)
	cd $(BACKEND) && $(PY) -m pipelines.load_natural_earth
	cd $(BACKEND) && $(PY) -m pipelines.load_geonames
	cd $(BACKEND) && $(PY) -m pipelines.load_osm
	cd $(BACKEND) && $(PY) -m pipelines.load_rurallure --fixture
	cd $(BACKEND) && $(PY) -m pipelines.load_sopsr
	cd $(BACKEND) && $(PY) -m pipelines.seed_paths
	cd $(BACKEND) && $(PY) -m pipelines.promote
	cd $(BACKEND) && $(PY) -m pipelines.load_wikidata
	cd $(BACKEND) && $(PY) -m pipelines.validate
	cd $(BACKEND) && $(PY) -m pipelines.export_static

data-fixtures: migrate ## celá pipeline nad malými vzorkami (sekundy, aj v CI)
	cd $(BACKEND) && $(PY) -m pipelines.load_natural_earth --fixture
	cd $(BACKEND) && $(PY) -m pipelines.load_geonames --fixture
	cd $(BACKEND) && $(PY) -m pipelines.load_osm --fixture
	cd $(BACKEND) && $(PY) -m pipelines.load_rurallure --fixture
	cd $(BACKEND) && $(PY) -m pipelines.load_sopsr --fixture
	cd $(BACKEND) && $(PY) -m pipelines.seed_paths
	cd $(BACKEND) && $(PY) -m pipelines.promote
	cd $(BACKEND) && $(PY) -m pipelines.load_wikidata --fixture
	cd $(BACKEND) && $(PY) -m pipelines.validate

export: ## zapíše app/public/data/paths.json z DB
	cd $(BACKEND) && $(PY) -m pipelines.export_static

export-seed: ## zapíše app/public/data/paths.json zo seedu (bez DB)
	cd $(BACKEND) && $(PY) -m pipelines.export_static --from-seed

# --- beh ----------------------------------------------------------------------
api: ## API na http://localhost:8000 (REPOSITORY=file|postgis, default file)
	cd $(BACKEND) && REPOSITORY=$${REPOSITORY:-file} $(PY) -m uvicorn app.main:app --reload --port 8000

dev: ## frontend na http://localhost:3000
	npm --prefix app run dev

# --- kvalita ------------------------------------------------------------------
backend-lint: ## ruff
	cd $(BACKEND) && ruff check . && ruff format --check .

backend-test: ## pytest (DB testy sa bez PostGIS preskočia)
	cd $(BACKEND) && pytest -q

app-lint: ## ESLint + TypeScript
	npm --prefix app run lint && npm --prefix app run typecheck

app-test: ## Vitest
	npm --prefix app run test:unit

lint: backend-lint app-lint ## všetky linty
test: backend-test app-test ## všetky unit testy
