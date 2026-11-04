"""ŠOP SR chránené územia (INSPIRE Protected Sites) -> canonical.protected_area (T2-08).

Vstup: GeoJSON z WFS ps:ProtectedSite (stiahne `python -m pipelines.fetch --only sopsr`).
Licencia CC BY-SA 4.0 (zdroj 'sopsr', migrácia 008).

    python -m pipelines.load_sopsr
    python -m pipelines.load_sopsr --fixture
"""

from __future__ import annotations

import argparse
import json
import sys

from .common import FIXTURES_DIR, RAW_DIR, connect, mark_fetched, source_ids

RAW_FILE = "sopsr_protected_sites.geojson"


def _first(value):
    """INSPIRE vlastnosť môže byť objekt alebo zoznam objektov – berieme prvý."""
    return value[0] if isinstance(value, list) and value else value


def parse(collection: dict) -> list[tuple[str, str, dict]]:
    """Vráti [(inspire_id, name, geometry)]; územia bez mena alebo geometrie preskočí."""
    out = []
    for f in collection.get("features", []):
        p = f.get("properties") or {}
        local_id = (p.get("inspireID") or {}).get("localId")
        name_obj = _first((p.get("siteName") or {}).get("GeographicalName")) or {}
        name = (_first(name_obj.get("spelling")) or {}).get("text")
        if local_id and name and f.get("geometry"):
            out.append((local_id, name.strip(), f["geometry"]))
    return out


def load(cur, path) -> int:
    src_id, lic_id = source_ids(cur, "sopsr")
    rows = parse(json.loads(path.read_text(encoding="utf-8")))
    for inspire_id, name, geom in rows:
        cur.execute(
            """
            INSERT INTO canonical.protected_area (inspire_id, name, geom, source_id, licence_id)
            VALUES (%s, %s, ST_Multi(ST_CollectionExtract(ST_MakeValid(
                      ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326)), 3)), %s, %s)
            ON CONFLICT (inspire_id) DO UPDATE SET name = EXCLUDED.name, geom = EXCLUDED.geom
            """,
            (inspire_id, name, json.dumps(geom), src_id, lic_id),
        )
    return len(rows)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--fixture", action="store_true")
    args = parser.parse_args()

    path = FIXTURES_DIR / "sopsr" / "sample.geojson" if args.fixture else RAW_DIR / RAW_FILE
    if not path.exists():
        sys.exit(f"Chýba: {path}. Spusť `python -m pipelines.fetch --only sopsr` alebo použi --fixture.")

    with connect() as conn, conn.cursor() as cur:
        total = load(cur, path)
        mark_fetched(cur, "sopsr")
        conn.commit()
    print(f"ŠOP SR: {total} chránených území")


if __name__ == "__main__":
    main()
