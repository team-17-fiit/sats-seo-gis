"""Kurátorské trasy a zastávky (data/seed/paths.json) -> canonical.path, poi, poi_path (S1-3).

    python -m pipelines.seed_paths

Vytvorí aj placeholder `path_segment` (priamky medzi zastávkami, surface='placeholder'),
aby mapa mala čo kresliť. pipelines.promote ich nahradí geometriou OSM trás, kde existuje (T2-06).
"""

from __future__ import annotations

import json

from .common import SEED_PATHS, connect, source_ids
from .quality import quality_score

CURATED_TIER = 1


def load_seed(path=SEED_PATHS) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def validate_seed(seed: dict) -> list[str]:
    """Vráti zoznam chýb (prázdny = OK). Používa sa aj v unit testoch."""
    from .common import in_slovakia_bbox, slugify

    errors = []
    pois = {p["slug"]: p for p in seed["pois"]}
    if len(pois) != len(seed["pois"]):
        errors.append("duplicitný slug POI")
    for p in seed["pois"]:
        if slugify(p["slug"]) != p["slug"]:
            errors.append(f"neplatný slug POI {p['slug']}")
        if not in_slovakia_bbox(p["lon"], p["lat"]):
            errors.append(f"POI {p['slug']} mimo SR")
    for path in seed["paths"]:
        if path["pilot"] not in {"A", "B", "C"}:
            errors.append(f"trasa {path['slug']}: neznámy pilot")
        for stop in path["stops"]:
            if stop not in pois:
                errors.append(f"trasa {path['slug']}: zastávka {stop} nie je v pois")
    return errors


def main() -> None:
    seed = load_seed()
    errors = validate_seed(seed)
    if errors:
        raise SystemExit("Seed je neplatný:\n  " + "\n  ".join(errors))

    with connect() as conn, conn.cursor() as cur:
        src_id, lic_id = source_ids(cur, seed["_meta"]["source"])
        cur.execute("SELECT public_ok FROM canonical.licence WHERE id = %s", (lic_id,))
        licence_clear = cur.fetchone()[0]

        poi_ids: dict[str, int] = {}
        for p in seed["pois"]:
            unesco = bool(p.get("unesco"))
            score = quality_score(
                {
                    "name_sk": p["name_sk"],
                    "name_en": p.get("name_en"),
                    "wikidata": p.get("wikidata"),
                    "image": p.get("image"),
                    "opening_hours": p.get("opening_hours"),
                    "description": p.get("description_sk"),
                    "licence_clear": licence_clear,
                }
            )
            cur.execute(
                """
                INSERT INTO canonical.poi (slug, name_sk, name_en, category, tier, status, quality_score,
                                           unesco, geom, source_id, licence_id, fetched_at)
                VALUES (%s, %s, %s, %s, %s, 'approved', %s, %s,
                        ST_SetSRID(ST_MakePoint(%s, %s), 4326), %s, %s, now())
                ON CONFLICT (slug) DO UPDATE SET
                  name_sk = EXCLUDED.name_sk, name_en = EXCLUDED.name_en, category = EXCLUDED.category,
                  tier = LEAST(canonical.poi.tier, EXCLUDED.tier), unesco = EXCLUDED.unesco,
                  quality_score = GREATEST(canonical.poi.quality_score, EXCLUDED.quality_score),
                  updated_at = now()
                RETURNING id
                """,
                # zastávky kurátorských trás sú vždy T1 (flagship) – nesú story karty
                (
                    p["slug"],
                    p["name_sk"],
                    p.get("name_en"),
                    p["category"],
                    CURATED_TIER,
                    score,
                    unesco,
                    p["lon"],
                    p["lat"],
                    src_id,
                    lic_id,
                ),
            )
            poi_ids[p["slug"]] = cur.fetchone()[0]

        for path in seed["paths"]:
            cur.execute(
                """
                INSERT INTO canonical.path (slug, name_sk, name_en, theme, pilot_code, difficulty, length_km,
                                            colour, mark, summary_sk, summary_en, source_id, licence_id)
                VALUES (%(slug)s, %(name_sk)s, %(name_en)s, %(theme)s, %(pilot)s, %(difficulty)s,
                        %(length_km)s, %(colour)s, %(mark)s, %(summary_sk)s, %(summary_en)s, %(src)s, %(lic)s)
                ON CONFLICT (slug) DO UPDATE SET
                  name_sk = EXCLUDED.name_sk, name_en = EXCLUDED.name_en, theme = EXCLUDED.theme,
                  pilot_code = EXCLUDED.pilot_code, difficulty = EXCLUDED.difficulty,
                  length_km = EXCLUDED.length_km, colour = EXCLUDED.colour, mark = EXCLUDED.mark,
                  summary_sk = EXCLUDED.summary_sk, summary_en = EXCLUDED.summary_en, updated_at = now()
                RETURNING id
                """,
                {**path, "src": src_id, "lic": lic_id},
            )
            path_id = cur.fetchone()[0]

            cur.execute("DELETE FROM canonical.poi_path WHERE path_id = %s AND role = 'stop'", (path_id,))
            for seq, stop in enumerate(path["stops"], start=1):
                cur.execute(
                    """
                    INSERT INTO canonical.poi_path (poi_id, path_id, role, seq, detour_km)
                    VALUES (%s, %s, 'stop', %s, 0)
                    ON CONFLICT (poi_id, path_id) DO UPDATE SET role = 'stop', seq = EXCLUDED.seq
                    """,
                    (poi_ids[stop], path_id, seq),
                )

            # placeholder geometria: priamky medzi po sebe idúcimi zastávkami;
            # pipelines.promote ich potom nahradí úsekmi z OSM trás, kde existujú (T2-06)
            cur.execute("DELETE FROM canonical.path_segment WHERE path_id = %s", (path_id,))
            cur.execute(
                """
                INSERT INTO canonical.path_segment (path_id, seq, surface, geom, source_id, licence_id)
                SELECT pp.path_id, pp.seq, 'placeholder',
                       ST_MakeLine(a.geom, b.geom), %s, %s
                FROM canonical.poi_path pp
                JOIN canonical.poi_path nx ON nx.path_id = pp.path_id AND nx.seq = pp.seq + 1 AND nx.role = 'stop'
                JOIN canonical.poi a ON a.id = pp.poi_id
                JOIN canonical.poi b ON b.id = nx.poi_id
                WHERE pp.path_id = %s AND pp.role = 'stop' AND NOT ST_Equals(a.geom, b.geom)
                ON CONFLICT (path_id, seq) DO NOTHING
                """,
                (src_id, lic_id, path_id),
            )
        conn.commit()
    print(f"Seed: {len(seed['paths'])} trás, {len(seed['pois'])} POI")


if __name__ == "__main__":
    main()
