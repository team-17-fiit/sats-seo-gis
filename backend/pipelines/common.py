"""Spoločné pomôcky pre ETL kroky: cesty, pripojenie k DB, proveniencia."""

from __future__ import annotations

import os
import re
import unicodedata
from contextlib import contextmanager
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = REPO_ROOT / "data"
RAW_DIR = DATA_DIR / "raw"
FIXTURES_DIR = DATA_DIR / "fixtures"
MIGRATIONS_DIR = DATA_DIR / "db" / "migrations"
SEED_PATHS = DATA_DIR / "seed" / "paths.json"
APP_DATA_DIR = REPO_ROOT / "app" / "public" / "data"

# Obálka SR + ~10 km buffer; rovnaká ako v data/db/checks.sql
SK_BBOX = (16.6, 47.6, 22.7, 49.7)  # min_lon, min_lat, max_lon, max_lat


def database_url() -> str:
    return os.environ.get("DATABASE_URL", "postgresql://satsgis:satsgis@localhost:5432/satsgis")


@contextmanager
def connect():
    """Pripojenie k PostGIS. psycopg sa importuje lenivo, aby testy bez DB nepotrebovali driver."""
    import psycopg

    with psycopg.connect(database_url()) as conn:
        yield conn


def slugify(text: str) -> str:
    """Rovnaká logika ako app/src/lib/peaks.ts – URL bez diakritiky."""
    text = unicodedata.normalize("NFD", text)
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    text = re.sub(r"[^a-z0-9]+", "-", text.lower())
    return text.strip("-")


def in_slovakia_bbox(lon: float | None, lat: float | None) -> bool:
    if lon is None or lat is None:
        return False
    min_lon, min_lat, max_lon, max_lat = SK_BBOX
    return min_lon <= lon <= max_lon and min_lat <= lat <= max_lat


def source_ids(cur, code: str) -> tuple[int, int]:
    """Vráti (source_id, licence_id). Neznámy zdroj = chyba (licenčná brána)."""
    cur.execute("SELECT id, licence_id FROM canonical.source WHERE code = %s", (code,))
    row = cur.fetchone()
    if row is None:
        raise LookupError(
            f"Zdroj '{code}' nie je v licenčnom registri (canonical.source). "
            "Doplň ho do data/db/migrations/002_seed_licences.sql a docs/planning/data-licence-register.md."
        )
    return row[0], row[1]


def mark_fetched(cur, code: str, sha256: str | None = None) -> None:
    cur.execute(
        "UPDATE canonical.source SET fetched_at = now(), sha256 = COALESCE(%s, sha256) WHERE code = %s",
        (sha256, code),
    )
