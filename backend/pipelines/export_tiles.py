"""Export vrstiev z PostGIS pre generovanie dlaždíc (T3-07).

marts.mart_tiles -> data/processed/tiles/<vrstva>.geojsonl (GeoJSON po riadkoch, vstup pre tippecanoe).
Súbory sú build artefakty (kap. 6.4, pravidlo 5): nie sú v gite, rovnaká DB dá rovnaké súbory.
Dlaždice z nich (tippecanoe -> PMTiles z5–z15, kap. 5.1.3) vyrába samostatný krok.

    python -m pipelines.export_tiles
"""

from __future__ import annotations

import json
from contextlib import ExitStack

from .common import DATA_DIR, connect

OUT_DIR = DATA_DIR / "processed" / "tiles"
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


def main() -> None:
    with connect() as conn, conn.cursor() as cur:
        cur.execute(
            """SELECT layer, props, licence, tier, ST_AsGeoJSON(geom, 6)
               FROM marts.mart_tiles ORDER BY layer, feature_id"""
        )
        counts = write_layers(cur)
    print("Dlaždice – export vrstiev:", ", ".join(f"{k} {v}" for k, v in counts.items()), f"-> {OUT_DIR}")


if __name__ == "__main__":
    main()
