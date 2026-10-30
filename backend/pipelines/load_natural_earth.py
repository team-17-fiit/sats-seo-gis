"""Natural Earth admin 0/1 -> canonical.admin_area (T1-06).

Načíta GeoJSON (bez GDAL), vyberie Slovensko (admin 0) a jeho kraje (admin 1).

    python -m pipelines.load_natural_earth
    python -m pipelines.load_natural_earth --fixture
"""

from __future__ import annotations

import argparse
import json
import sys

from .common import FIXTURES_DIR, RAW_DIR, connect, mark_fetched, source_ids


def slovak_features(collection: dict, level: int) -> list[tuple[str, str, dict]]:
    """Vráti [(code, name, geometry)] pre SR (level 0) alebo jej kraje (level 1)."""
    out = []
    for f in collection.get("features", []):
        p = {k.lower(): v for k, v in (f.get("properties") or {}).items()}
        if level == 0 and p.get("iso_a2") == "SK" and not str(p.get("iso_3166_2", "SK")).startswith("SK-"):
            out.append(("SK", p.get("name") or "Slovakia", f["geometry"]))
        elif level == 1 and str(p.get("iso_3166_2", "")).startswith("SK-"):
            out.append((p["iso_3166_2"], p.get("name") or p["iso_3166_2"], f["geometry"]))
    return out


def load(cur, path, level: int) -> int:
    src_id, lic_id = source_ids(cur, "naturalearth")
    rows = slovak_features(json.loads(path.read_text(encoding="utf-8")), level)
    for code, name, geom in rows:
        cur.execute(
            """
            INSERT INTO canonical.admin_area (code, name, level, geom, source_id, licence_id)
            VALUES (%s, %s, %s, ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326)), %s, %s)
            ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, geom = EXCLUDED.geom
            """,
            (code, name, level, json.dumps(geom), src_id, lic_id),
        )
    return len(rows)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--fixture", action="store_true")
    args = parser.parse_args()

    if args.fixture:
        inputs = [(FIXTURES_DIR / "naturalearth" / "admin_sample.geojson", 0)]
    else:
        inputs = [
            (RAW_DIR / "ne_10m_admin_0_countries.geojson", 0),
            (RAW_DIR / "ne_10m_admin_1_states_provinces.geojson", 1),
        ]
        missing = [str(p) for p, _ in inputs if not p.exists()]
        if missing:
            sys.exit(f"Chýba: {missing}. Spusť `make fetch` alebo použi --fixture.")

    with connect() as conn, conn.cursor() as cur:
        total = sum(load(cur, path, level) for path, level in inputs)
        mark_fetched(cur, "naturalearth")
        conn.commit()
    print(f"Natural Earth: {total} oblastí")


if __name__ == "__main__":
    main()
