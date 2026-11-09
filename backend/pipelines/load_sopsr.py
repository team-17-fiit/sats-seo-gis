"""ŠOP SR chránené územia (veľkoplošné a maloplošné) -> canonical.protected_area (T2-08).

Vstup: GeoJSON z WFS ŠOP SR (stiahne `python -m pipelines.fetch --only sopsr_vchu,sopsr_mchu`).
Licencia CC BY 4.0 (zdroj 'sopsr', migrácia 008).

    python -m pipelines.load_sopsr
    python -m pipelines.load_sopsr --fixture
"""

from __future__ import annotations

import argparse
import json
import sys

from .common import FIXTURES_DIR, RAW_DIR, connect, mark_fetched, source_ids

# druh územia -> súbor v data/raw (a rovnaký názov vo fixtures)
LAYERS = {
    "vchu": "sopsr_chranene_uzemia_vchu.geojson",
    "mchu": "sopsr_chranene_uzemia_mchu.geojson",
}
FETCH_KEYS = ("sopsr_vchu", "sopsr_mchu")  # kľúče v fetch.SOURCES


def parse(collection: dict, kind: str) -> list[tuple[str, str, dict]]:
    """Vráti [(ext_id, name, geometry)]; územia bez mena alebo geometrie preskočí."""
    out = []
    for f in collection.get("features", []):
        p = f.get("properties") or {}
        name = (p.get("SITETITLE_SK") or "").strip()
        if name and f.get("geometry") and p.get("ID") is not None:
            out.append((f"{kind}:{p['ID']}", name, f["geometry"]))
    return out


def load(cur, path, kind: str) -> int:
    src_id, lic_id = source_ids(cur, "sopsr")
    rows = parse(json.loads(path.read_text(encoding="utf-8")), kind)
    for ext_id, name, geom in rows:
        cur.execute(
            """
            INSERT INTO canonical.protected_area (ext_id, kind, name, geom, source_id, licence_id)
            VALUES (%s, %s, %s, ST_Multi(ST_CollectionExtract(ST_MakeValid(
                      ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326)), 3)), %s, %s)
            ON CONFLICT (ext_id) DO UPDATE SET name = EXCLUDED.name, geom = EXCLUDED.geom
            """,
            (ext_id, kind, name, json.dumps(geom), src_id, lic_id),
        )
    return len(rows)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--fixture", action="store_true")
    args = parser.parse_args()

    base = FIXTURES_DIR / "sopsr" if args.fixture else RAW_DIR
    inputs = [(base / name, kind) for kind, name in LAYERS.items()]
    missing = [str(p) for p, _ in inputs if not p.exists()]
    if missing:
        sys.exit(f"Chýba: {missing}. Spusť `python -m pipelines.fetch --only {','.join(FETCH_KEYS)}` alebo --fixture.")

    with connect() as conn, conn.cursor() as cur:
        total = sum(load(cur, path, kind) for path, kind in inputs)
        mark_fetched(cur, "sopsr")
        conn.commit()
    print(f"ŠOP SR: {total} chránených území")


if __name__ == "__main__":
    main()
