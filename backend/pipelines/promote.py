"""staging -> canonical: normalizácia, dedup, validácia, licenčná brána (kroky 4–6, kap. 6.1).

    python -m pipelines.promote

- OSM POI s menom a v rozsahu SR -> canonical.poi (status approved/candidate podľa quality score).
  Ak je do 150 m kurátorská zastávka rovnakej kategórie, len sa k nej doplní osm_id/wikidata (dedup).
- rurAllure DS1 -> canonical.poi so statusom 'candidate' (licencia čaká na overenie).
- OSM trasy a rurAllure DS6 -> canonical.route.
- Čo neprejde, ide do quarantine.rejected_row s dôvodom.
- Nakoniec prepočíta odbočky poi_path(role='detour') do 2 km od trás.
"""

from __future__ import annotations

import json

from .common import connect, in_slovakia_bbox, slugify, source_ids
from .quality import PUBLISH_THRESHOLD, quality_score, tier_for

DEDUP_RADIUS_M = 150
DETOUR_RADIUS_M = 2000


def reject(cur, source: str, ext_id: str | None, reason: str, payload: dict) -> None:
    cur.execute(
        "INSERT INTO quarantine.rejected_row (source_code, ext_id, reason, payload) VALUES (%s, %s, %s, %s)",
        (source, ext_id, reason, json.dumps(payload, default=str)),
    )


def _unique_slug(cur, base: str, suffix: str) -> str:
    slug = base or suffix
    cur.execute("SELECT 1 FROM canonical.poi WHERE slug = %s", (slug,))
    return f"{slug}-{suffix}" if cur.fetchone() else slug


def promote_osm(cur) -> tuple[int, int, int]:
    src_id, lic_id = source_ids(cur, "osm")
    cur.execute("SELECT public_ok FROM canonical.licence WHERE id = %s", (lic_id,))
    licence_clear = cur.fetchone()[0]
    cur.execute(
        """
        SELECT osm_type, osm_id, name, name_en, category, wikidata, ele, website,
               ST_X(geom), ST_Y(geom)
        FROM staging.osm_poi
        """
    )
    inserted = matched = rejected = 0
    for osm_type, osm_id, name, name_en, category, wikidata, ele, website, lon, lat in cur.fetchall():
        key = f"{osm_type.lower()}{osm_id}"
        payload = {"osm_id": key, "name": name, "category": category}
        if not name:
            rejected += 1
            reject(cur, "osm", key, "missing name", payload)
            continue
        if not in_slovakia_bbox(lon, lat):
            rejected += 1
            reject(cur, "osm", key, "outside Slovakia bbox", payload)
            continue
        if wikidata and not (wikidata.startswith("Q") and wikidata[1:].isdigit()):
            wikidata = None
        elevation = int(float(ele)) if ele and ele.replace(".", "", 1).isdigit() else None

        # už spárovaný z predošlého behu -> len aktualizuj (idempotencia)
        cur.execute("SELECT id, source_id FROM canonical.poi WHERE osm_id = %s", (key,))
        existing = cur.fetchone()
        if existing and existing[1] != src_id:
            cur.execute(
                """UPDATE canonical.poi SET wikidata_id = COALESCE(wikidata_id, %s),
                   elevation_m = COALESCE(elevation_m, %s), updated_at = now() WHERE id = %s""",
                (wikidata, elevation, existing[0]),
            )
            matched += 1
            continue

        # dedup: POI z iného zdroja rovnakej kategórie v okolí (kurátorský má prednosť)
        cur.execute(
            """
            SELECT id FROM canonical.poi
            WHERE osm_id IS NULL AND category = %s AND status <> 'candidate'
              AND ST_DWithin(geom::geography, ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography, %s)
            ORDER BY geom <-> ST_SetSRID(ST_MakePoint(%s, %s), 4326) LIMIT 1
            """,
            (category, lon, lat, DEDUP_RADIUS_M, lon, lat),
        )
        hit = cur.fetchone()
        if hit and not existing:
            cur.execute(
                """UPDATE canonical.poi SET osm_id = %s, wikidata_id = COALESCE(wikidata_id, %s),
                   elevation_m = COALESCE(elevation_m, %s), updated_at = now() WHERE id = %s""",
                (key, wikidata, elevation, hit[0]),
            )
            matched += 1
            continue

        score = quality_score(
            {
                "name_sk": name,
                "name_en": name_en,
                "wikidata": wikidata,
                "description": None,
                "website": website,
                "licence_clear": licence_clear,
            }
        )
        status = "approved" if score >= PUBLISH_THRESHOLD else "candidate"
        slug = _unique_slug(cur, slugify(name), key)
        cur.execute(
            """
            INSERT INTO canonical.poi (slug, name_sk, name_en, category, tier, status, quality_score,
                                       elevation_m, osm_id, wikidata_id, website, geom,
                                       source_id, licence_id, fetched_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    ST_SetSRID(ST_MakePoint(%s, %s), 4326), %s, %s, now())
            ON CONFLICT (osm_id) WHERE osm_id IS NOT NULL DO UPDATE SET
              name_sk = EXCLUDED.name_sk, name_en = EXCLUDED.name_en, category = EXCLUDED.category,
              quality_score = EXCLUDED.quality_score, wikidata_id = EXCLUDED.wikidata_id,
              elevation_m = EXCLUDED.elevation_m, website = EXCLUDED.website, geom = EXCLUDED.geom,
              updated_at = now()
            """,
            (
                slug,
                name,
                name_en,
                category,
                tier_for(category, bool(wikidata)),
                status,
                score,
                elevation,
                key,
                wikidata,
                website,
                lon,
                lat,
                src_id,
                lic_id,
            ),
        )
        inserted += 1
    return inserted, matched, rejected


def promote_ds1(cur) -> tuple[int, int]:
    src_id, lic_id = source_ids(cur, "rurallure_ds1")
    cur.execute("SELECT ext_id, name, category, description, lat, lon FROM staging.rurallure_ds1")
    ok = bad = 0
    for ext_id, name, category, description, lat, lon in cur.fetchall():
        payload = {"ext_id": ext_id, "name": name, "lat": lat, "lon": lon}
        if not name:
            bad += 1
            reject(cur, "rurallure_ds1", ext_id, "missing name", payload)
            continue
        if not in_slovakia_bbox(lon, lat):
            bad += 1
            reason = "missing coordinates" if lat is None or lon is None else "outside Slovakia bbox"
            reject(cur, "rurallure_ds1", ext_id, reason, payload)
            continue
        category = (category or "attraction").lower()
        # dedup: už máme ten istý POI (rovnaký zdroj+meno, alebo iný zdroj, rovnaká kategória do 150 m)
        cur.execute(
            """
            SELECT 1 FROM canonical.poi
            WHERE (source_id = %s AND name_sk = %s)
               OR (source_id <> %s AND category = %s AND
                   ST_DWithin(geom::geography, ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography, %s))
            LIMIT 1
            """,
            (src_id, name, src_id, category, lon, lat, DEDUP_RADIUS_M),
        )
        if cur.fetchone():
            continue
        slug = _unique_slug(cur, slugify(name), slugify(ext_id))
        cur.execute(
            """
            INSERT INTO canonical.poi (slug, name_sk, category, tier, status, quality_score,
                                       description_sk, geom, source_id, licence_id, fetched_at)
            VALUES (%s, %s, %s, 3, 'candidate', %s, %s, ST_SetSRID(ST_MakePoint(%s, %s), 4326), %s, %s, now())
            """,
            (
                slug,
                name,
                category,
                quality_score({"name_sk": name, "description": description, "licence_clear": False}),
                description,
                lon,
                lat,
                src_id,
                lic_id,
            ),
        )
        ok += 1
    return ok, bad


def promote_routes(cur) -> int:
    osm_src, osm_lic = source_ids(cur, "osm")
    cur.execute(
        """
        INSERT INTO canonical.route (osm_relation_id, name, route_type, network, ref, colour, geom,
                                     source_id, licence_id)
        SELECT osm_id, name, route, network, ref, colour, ST_Multi(geom), %s, %s
        FROM staging.osm_route WHERE geom IS NOT NULL AND NOT ST_IsEmpty(geom)
        ON CONFLICT (osm_relation_id) DO UPDATE SET
          name = EXCLUDED.name, route_type = EXCLUDED.route_type, network = EXCLUDED.network,
          ref = EXCLUDED.ref, colour = EXCLUDED.colour, geom = EXCLUDED.geom
        """,
        (osm_src, osm_lic),
    )
    n = cur.rowcount
    ds6_src, ds6_lic = source_ids(cur, "rurallure_ds6")
    cur.execute("DELETE FROM canonical.route WHERE source_id = %s", (ds6_src,))
    cur.execute(
        """
        INSERT INTO canonical.route (name, route_type, network, geom, source_id, licence_id)
        SELECT name, 'pilgrimage', 'rurallure', geom, %s, %s FROM staging.rurallure_ds6
        WHERE geom IS NOT NULL
        """,
        (ds6_src, ds6_lic),
    )
    return n + cur.rowcount


def link_detours(cur) -> int:
    """POI do 2 km od segmentov trasy, ktoré nie sú jej zastávkou -> role 'detour'."""
    cur.execute("DELETE FROM canonical.poi_path WHERE role = 'detour'")
    cur.execute(
        """
        INSERT INTO canonical.poi_path (poi_id, path_id, role, detour_km)
        SELECT p.id, s.path_id, 'detour',
               round((min(ST_Distance(p.geom::geography, s.geom::geography)) / 1000)::numeric, 2)
        FROM canonical.poi p
        JOIN canonical.path_segment s
          ON ST_DWithin(p.geom::geography, s.geom::geography, %s)
        WHERE p.status IN ('approved', 'published')
          AND NOT EXISTS (SELECT 1 FROM canonical.poi_path x WHERE x.poi_id = p.id AND x.path_id = s.path_id)
        GROUP BY p.id, s.path_id
        """,
        (DETOUR_RADIUS_M,),
    )
    return cur.rowcount


def main() -> None:
    with connect() as conn, conn.cursor() as cur:
        cur.execute("TRUNCATE quarantine.rejected_row")
        cur.execute("SELECT to_regclass('staging.osm_poi') IS NOT NULL, to_regclass('staging.osm_route') IS NOT NULL")
        has_osm_poi, has_osm_route = cur.fetchone()
        if has_osm_poi:
            ins, match, rej = promote_osm(cur)
            print(f"OSM POI: {ins} vložených/aktualizovaných, {match} spárovaných s kurátorskými, {rej} do karantény")
        else:
            print("OSM POI: staging prázdny (spusti load_osm)")
        ok, bad = promote_ds1(cur)
        print(f"rurAllure DS1: {ok} kandidátov, {bad} do karantény")
        if has_osm_route:
            print(f"Trasy (OSM + DS6): {promote_routes(cur)}")
        print(f"Odbočky do {DETOUR_RADIUS_M / 1000:.0f} km: {link_detours(cur)}")
        conn.commit()


if __name__ == "__main__":
    main()
