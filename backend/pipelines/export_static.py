"""marts -> app/public/data/paths.json + app/public/data/geom/<slug>.json (vstup pre SSG stránky trás).

    python -m pipelines.export_static              # z PostGIS (marts.mart_path_pages, mart_path_geom)
    python -m pipelines.export_static --from-seed  # bez DB, priamo z data/seed/paths.json

Výstup má v oboch režimoch rovnaký tvar, takže frontend nevie (a nemusí vedieť), odkiaľ dáta sú.
Geometria je v samostatnom súbore na trasu (jeden LineString feature na etapu), aby sa nevkladala
do HTML stránky; mapa si ju stiahne až po kliknutí na "Zobraziť interaktívnu mapu".
Zo seedu sú etapy priamky medzi zastávkami (geometry_routed = false).
"""

from __future__ import annotations

import argparse
import json

from .common import APP_DATA_DIR, connect
from .seed_paths import load_seed

OUTPUT = APP_DATA_DIR / "paths.json"
GEOM_DIR = APP_DATA_DIR / "geom"


def leg_feature(slug: str, seq: int, from_slug: str, to_slug: str, length_km, routed: bool, geometry: dict) -> dict:
    return {
        "type": "Feature",
        "properties": {
            "id": f"{slug}-{seq}",
            "name": f"Etapa {seq}",
            "seq": seq,
            "from": from_slug,
            "to": to_slug,
            "length_km": length_km,
            "routed": routed,
        },
        "geometry": geometry,
    }


def from_seed() -> tuple[list[dict], dict[str, list[dict]]]:
    seed = load_seed()
    pois = {p["slug"]: p for p in seed["pois"]}
    out = []
    geoms: dict[str, list[dict]] = {}
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
                "geometry_routed": False,
            }
        )
        geoms[path["slug"]] = [
            leg_feature(
                path["slug"],
                seq,
                a["slug"],
                b["slug"],
                None,
                False,
                {"type": "LineString", "coordinates": [[a["lon"], a["lat"]], [b["lon"], b["lat"]]]},
            )
            for seq, (a, b) in enumerate(zip(stops, stops[1:], strict=False), start=1)
        ]
    return out, geoms


def from_db() -> tuple[list[dict], dict[str, list[dict]]]:
    with connect() as conn, conn.cursor() as cur:
        cur.execute(
            """SELECT slug, name_sk, name_en, theme, pilot_code, difficulty, length_km, colour, mark,
                      summary_sk, summary_en, stops, licence
               FROM marts.mart_path_pages ORDER BY slug"""
        )
        cols = [d.name for d in cur.description]
        rows = [dict(zip(cols, r, strict=True)) for r in cur.fetchall()]
        cur.execute(
            """SELECT slug, seq, from_slug, to_slug, length_km, routed, geometry
               FROM marts.mart_path_geom ORDER BY slug, seq"""
        )
        geoms: dict[str, list[dict]] = {}
        for slug, seq, from_slug, to_slug, km, routed, geometry in cur.fetchall():
            km = float(km) if km is not None else None
            geoms.setdefault(slug, []).append(leg_feature(slug, seq, from_slug, to_slug, km, routed, geometry))
    for r in rows:
        r["length_km"] = float(r["length_km"]) if r["length_km"] is not None else None
        legs = geoms.get(r["slug"], [])
        r["geometry_routed"] = bool(legs) and all(f["properties"]["routed"] for f in legs)
    return rows, geoms


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--from-seed", action="store_true")
    args = parser.parse_args()
    paths, geoms = from_seed() if args.from_seed else from_db()
    order = {p["slug"]: i for i, p in enumerate(load_seed()["paths"])}
    paths.sort(key=lambda p: order.get(p["slug"], len(order)))
    APP_DATA_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(paths, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    GEOM_DIR.mkdir(exist_ok=True)
    for old in GEOM_DIR.glob("*.json"):
        old.unlink()  # zmazané trasy nesmú ostať visieť
    for p in paths:
        licence = "ODbL-1.0" if p["geometry_routed"] else p["licence"]
        fc = {"type": "FeatureCollection", "licence": licence, "features": geoms.get(p["slug"], [])}
        (GEOM_DIR / f"{p['slug']}.json").write_text(json.dumps(fc, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Export: {len(paths)} trás -> {OUTPUT.relative_to(OUTPUT.parents[3])}")


if __name__ == "__main__":
    main()
