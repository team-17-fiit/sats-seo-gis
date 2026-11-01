"""marts -> app/public/data/paths.json (vstup pre SSG stránky trás).

    python -m pipelines.export_static              # z PostGIS (marts.mart_path_pages)
    python -m pipelines.export_static --from-seed  # bez DB, priamo z data/seed/paths.json

Výstup má v oboch režimoch rovnaký tvar, takže frontend nevie (a nemusí vedieť), odkiaľ dáta sú.
"""

from __future__ import annotations

import argparse
import json

from .common import APP_DATA_DIR, connect
from .seed_paths import load_seed

OUTPUT = APP_DATA_DIR / "paths.json"


def from_seed() -> list[dict]:
    seed = load_seed()
    pois = {p["slug"]: p for p in seed["pois"]}
    out = []
    for path in seed["paths"]:
        stops = []
        for seq, slug in enumerate(path["stops"], start=1):
            p = pois[slug]
            stops.append(
                {
                    "slug": slug,
                    "name_sk": p["name_sk"],
                    "name_en": p.get("name_en"),
                    "category": p["category"],
                    "unesco": bool(p.get("unesco")),
                    "seq": seq,
                    "lat": p["lat"],
                    "lon": p["lon"],
                }
            )
        out.append(
            {
                "slug": path["slug"],
                "name_sk": path["name_sk"],
                "name_en": path["name_en"],
                "theme": path["theme"],
                "pilot_code": path["pilot"],
                "difficulty": path["difficulty"],
                "length_km": path.get("length_km"),
                "colour": path["colour"],
                "mark": path.get("mark"),
                "summary_sk": path.get("summary_sk"),
                "summary_en": path.get("summary_en"),
                "stops": stops,
                "licence": seed["_meta"]["licence"],
            }
        )
    return out


def from_db() -> list[dict]:
    with connect() as conn, conn.cursor() as cur:
        cur.execute(
            """SELECT slug, name_sk, name_en, theme, pilot_code, difficulty, length_km, colour, mark,
                      summary_sk, summary_en, stops, licence, segments
               FROM marts.mart_path_pages ORDER BY slug"""
        )
        cols = [d.name for d in cur.description]
        rows = [dict(zip(cols, r, strict=True)) for r in cur.fetchall()]
    for r in rows:
        r["length_km"] = float(r["length_km"]) if r["length_km"] is not None else None
    return rows


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--from-seed", action="store_true")
    args = parser.parse_args()
    paths = from_seed() if args.from_seed else from_db()
    order = {p["slug"]: i for i, p in enumerate(load_seed()["paths"])}
    paths.sort(key=lambda p: order.get(p["slug"], len(order)))
    APP_DATA_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(paths, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"Export: {len(paths)} trás -> {OUTPUT.relative_to(OUTPUT.parents[3])}")


if __name__ == "__main__":
    main()
