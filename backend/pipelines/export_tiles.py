"""Export vrstiev z PostGIS pre generovanie dlaždíc (T3-07).

marts.mart_tiles -> data/processed/tiles/<vrstva>.geojsonl (GeoJSON po riadkoch, vstup pre tippecanoe).
Súbory sú build artefakty (kap. 6.4, pravidlo 5): nie sú v gite, rovnaká DB dá rovnaké súbory.
Dlaždice z nich (tippecanoe -> PMTiles z5–z15, kap. 5.1.3) vyrába samostatný krok.

    python -m pipelines.export_tiles                # z PostGIS (marts.mart_tiles)
    python -m pipelines.export_tiles --from-static  # bez DB, z app/public/data (nasadenie na GitHub Pages)

Režim --from-static dá rovnaký tvar prvkov ako DB, len s obsahom webu (trasy a miesta T1).
"""

from __future__ import annotations

import argparse
import json
from contextlib import ExitStack

from .common import DATA_DIR, REPO_ROOT, connect

OUT_DIR = DATA_DIR / "processed" / "tiles"
STATIC_DIR = REPO_ROOT / "app" / "public" / "data"
LAYERS = ("paths", "pois")
# od akého zoomu sa POI zobrazí podľa tieru (T1 flagship hneď, T3 služby až zblízka); rozsah z5–z15
MINZOOM = {1: 5, 2: 9, 3: 12}


def feature(props: dict, licence: str, tier: int | None, geometry: dict) -> dict:
    """Jeden GeoJSON prvok; licencia ide do vlastností kvôli atribúcii, tier určuje minzoom pre tippecanoe."""
    out = {"type": "Feature", "properties": {**props, "licence": licence}, "geometry": geometry}
    if tier is not None:
        out["tippecanoe"] = {"minzoom": MINZOOM[tier]}
    return out


def write_layers(rows, out_dir=OUT_DIR) -> dict[str, int]:
    """rows: (layer, props, licence, tier, geojson) zoradené podľa vrstvy a id. Vráti počet prvkov na vrstvu."""
    out_dir.mkdir(parents=True, exist_ok=True)
    counts = dict.fromkeys(LAYERS, 0)
    with ExitStack() as stack:
        files = {
            layer: stack.enter_context(open(out_dir / f"{layer}.geojsonl", "w", encoding="utf-8", newline="\n"))
            for layer in LAYERS
        }
        for layer, props, licence, tier, geojson in rows:
            line = json.dumps(feature(props, licence, tier, json.loads(geojson)), ensure_ascii=False, sort_keys=True)
            files[layer].write(line + "\n")
            counts[layer] += 1
    return counts


def static_rows(paths: list[dict], pois: list[dict]) -> list[tuple]:
    """Riadky v tvare marts.mart_tiles z exportu webu (paths.json, pois.json) – vlastnosti ako v migrácii 010."""
    rows = []
    for p in sorted(paths, key=lambda x: x["slug"]):
        props = {k: p.get(k) for k in ("slug", "name_sk", "name_en", "colour", "theme")}
        for segment in p.get("segments") or []:
            if len(segment) >= 2:
                line = {"type": "LineString", "coordinates": segment}
                rows.append(("paths", props, p.get("licence") or "CC-BY-4.0", None, json.dumps(line)))
    for q in sorted(pois, key=lambda x: x["slug"]):
        props = {k: q.get(k) for k in ("slug", "name_sk", "name_en", "category", "tier", "unesco")}
        point = {"type": "Point", "coordinates": [q["lon"], q["lat"]]}
        rows.append(("pois", props, q.get("licence") or "CC-BY-4.0", q.get("tier") or 1, json.dumps(point)))
    return rows


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--from-static", action="store_true", help="bez DB, z app/public/data")
    args = parser.parse_args()

    if args.from_static:
        paths = json.loads((STATIC_DIR / "paths.json").read_text(encoding="utf-8"))
        pois = json.loads((STATIC_DIR / "pois.json").read_text(encoding="utf-8"))
        counts = write_layers(static_rows(paths, pois))
    else:
        with connect() as conn, conn.cursor() as cur:
            cur.execute(
                """SELECT layer, props, licence, tier, ST_AsGeoJSON(geom, 6)
                   FROM marts.mart_tiles ORDER BY layer, feature_id"""
            )
            counts = write_layers(cur)
    print("Dlaždice – export vrstiev:", ", ".join(f"{k} {v}" for k, v in counts.items()), f"-> {OUT_DIR}")


if __name__ == "__main__":
    main()
