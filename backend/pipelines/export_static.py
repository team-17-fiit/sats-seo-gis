"""marts -> app/public/data/paths.json a pois.json (vstup pre SSG stránky trás a miest).

    python -m pipelines.export_static              # z PostGIS (marts.mart_path_pages, mart_poi_pages)
    python -m pipelines.export_static --from-seed  # bez DB, priamo z data/seed/paths.json

Výstup má v oboch režimoch rovnaký tvar, takže frontend nevie (a nemusí vedieť), odkiaľ dáta sú.
pois.json obsahuje len miesta tieru T1 (flagship) – každé dostane vlastnú stránku /miesta/<slug>/ (T2-10).
"""

from __future__ import annotations

import argparse
import json

from .common import APP_DATA_DIR, connect
from .seed_paths import CURATED_TIER, load_seed

OUTPUT = APP_DATA_DIR / "paths.json"
POI_OUTPUT = APP_DATA_DIR / "pois.json"
PAGE_TIER = 1  # stránky miest generujeme len pre T1


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


def pois_from_seed() -> list[dict]:
    """Zastávky kurátorských trás sú vždy T1 (rovnako ako v seed_paths.py)."""
    seed = load_seed()
    paths_of: dict[str, list[str]] = {}
    for path in seed["paths"]:
        for slug in path["stops"]:
            paths_of.setdefault(slug, [])
            if path["slug"] not in paths_of[slug]:
                paths_of[slug].append(path["slug"])
    out = []
    for p in seed["pois"]:
        if p["slug"] not in paths_of:
            continue  # miesto mimo trás nie je kurátorská zastávka -> nie je T1
        out.append(
            {
                "slug": p["slug"],
                "name_sk": p["name_sk"],
                "name_en": p.get("name_en"),
                "category": p["category"],
                "tier": CURATED_TIER,
                "unesco": bool(p.get("unesco")),
                "lat": p["lat"],
                "lon": p["lon"],
                "elevation_m": p.get("elevation_m"),
                "wikidata_id": p.get("wikidata_id"),
                "description_sk": p.get("description_sk"),
                "description_en": p.get("description_en"),
                "source": seed["_meta"]["source"],
                "licence": seed["_meta"]["licence"],
                "attribution": None,
                "paths": paths_of[p["slug"]],
            }
        )
    return out


def from_db() -> list[dict]:
    with connect() as conn, conn.cursor() as cur:
        cur.execute(
            """SELECT slug, name_sk, name_en, theme, pilot_code, difficulty, length_km, colour, mark,
                      summary_sk, summary_en, stops, licence
               FROM marts.mart_path_pages ORDER BY slug"""
        )
        cols = [d.name for d in cur.description]
        rows = [dict(zip(cols, r, strict=True)) for r in cur.fetchall()]
    for r in rows:
        r["length_km"] = float(r["length_km"]) if r["length_km"] is not None else None
    return rows


def pois_from_db() -> list[dict]:
    with connect() as conn, conn.cursor() as cur:
        cur.execute(
            """SELECT slug, name_sk, name_en, category, tier, unesco, lat, lon, elevation_m,
                      wikidata_id, description_sk, description_en, source, licence, attribution, paths
               FROM marts.mart_poi_pages WHERE tier = %s ORDER BY slug""",
            (PAGE_TIER,),
        )
        cols = [d.name for d in cur.description]
        rows = [dict(zip(cols, r, strict=True)) for r in cur.fetchall()]
    for r in rows:
        r["unesco"] = bool(r["unesco"])
        r["paths"] = list(r["paths"] or [])
        if r["elevation_m"] is not None:
            r["elevation_m"] = float(r["elevation_m"])
    return rows


def _write(target, data) -> None:
    target.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--from-seed", action="store_true")
    args = parser.parse_args()
    paths = from_seed() if args.from_seed else from_db()
    pois = pois_from_seed() if args.from_seed else pois_from_db()
    order = {p["slug"]: i for i, p in enumerate(load_seed()["paths"])}
    paths.sort(key=lambda p: order.get(p["slug"], len(order)))
    for p in pois:
        p["paths"].sort(key=lambda s: order.get(s, len(order)))
    APP_DATA_DIR.mkdir(parents=True, exist_ok=True)
    _write(OUTPUT, paths)
    _write(POI_OUTPUT, pois)
    root = OUTPUT.parents[3]
    print(f"Export: {len(paths)} trás -> {OUTPUT.relative_to(root)}")
    print(f"Export: {len(pois)} miest T1 -> {POI_OUTPUT.relative_to(root)}")


if __name__ == "__main__":
    main()
