"""staging -> canonical: normalizácia, dedup, validácia, licenčná brána (kroky 4–6, kap. 6.1).

    python -m pipelines.promote

- OSM POI s menom a v rozsahu SR -> canonical.poi (status approved/candidate podľa quality score).
  Ak je do 150 m kurátorská zastávka rovnakej kategórie, len sa k nej doplní osm_id/wikidata (dedup).
- rurAllure DS1 -> canonical.poi so statusom 'candidate' (licencia čaká na overenie).
- OSM trasy a rurAllure DS6 -> canonical.route.
- Čo neprejde, ide do quarantine.rejected_row s dôvodom.
- OSM trasy -> podtrasy a úseky; úseky našich trás medzi zastávkami dostanú geometriu OSM trasy.
- Nakoniec prepočíta odbočky poi_path(role='detour') do 2 km od trás.
"""

from __future__ import annotations

import json

from .common import connect, in_slovakia_bbox, slugify, source_ids
from .network import route_between
from .quality import PUBLISH_THRESHOLD, quality_score, tier_for

DEDUP_RADIUS_M = 150
DETOUR_RADIUS_M = 2000
ROUTE_BUFFER_DEG = 0.0003  # ~30 m: úsek našej trasy do tejto vzdialenosti od OSM trasy ide po nej


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
               tags->>'opening_hours', ST_X(geom), ST_Y(geom)
        FROM staging.osm_poi
        """
    )
    inserted = matched = rejected = 0
    for osm_type, osm_id, name, name_en, category, wikidata, ele, website, opening_hours, lon, lat in cur.fetchall():
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
                   elevation_m = COALESCE(elevation_m, %s), opening_hours = COALESCE(opening_hours, %s),
                   updated_at = now() WHERE id = %s""",
                (wikidata, elevation, opening_hours, existing[0]),
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
                   elevation_m = COALESCE(elevation_m, %s), opening_hours = COALESCE(opening_hours, %s),
                   updated_at = now() WHERE id = %s""",
                (key, wikidata, elevation, opening_hours, hit[0]),
            )
            matched += 1
            continue

        score = quality_score(
            {
                "name_sk": name,
                "name_en": name_en,
                "wikidata": wikidata,
                "image": None,  # obrázok dopĺňa až load_wikidata
                "opening_hours": opening_hours,
                "description": None,
                "licence_clear": licence_clear,
            }
        )
        status = "approved" if score >= PUBLISH_THRESHOLD else "candidate"
        slug = _unique_slug(cur, slugify(name), key)
        cur.execute(
            """
            INSERT INTO canonical.poi (slug, name_sk, name_en, category, tier, status, quality_score,
                                       elevation_m, osm_id, wikidata_id, website, opening_hours, geom,
                                       source_id, licence_id, fetched_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    ST_SetSRID(ST_MakePoint(%s, %s), 4326), %s, %s, now())
            ON CONFLICT (osm_id) WHERE osm_id IS NOT NULL DO UPDATE SET
              name_sk = EXCLUDED.name_sk, name_en = EXCLUDED.name_en, category = EXCLUDED.category,
              quality_score = EXCLUDED.quality_score, wikidata_id = EXCLUDED.wikidata_id,
              elevation_m = EXCLUDED.elevation_m, website = EXCLUDED.website,
              opening_hours = EXCLUDED.opening_hours, geom = EXCLUDED.geom,
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
                opening_hours,
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
        SELECT osm_id, name, route, network, ref, colour,
               CASE WHEN geom IS NULL OR ST_IsEmpty(geom) THEN NULL ELSE ST_Multi(geom) END, %s, %s
        FROM staging.osm_route
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


def link_sub_routes(cur) -> int:
    """route > sub-route: podľa členstva relácií v OSM nastaví parent_id (T2-06)."""
    cur.execute("SELECT to_regclass('staging.osm_route_member') IS NOT NULL")
    if not cur.fetchone()[0]:
        return 0
    cur.execute("UPDATE canonical.route SET parent_id = NULL WHERE parent_id IS NOT NULL")
    cur.execute(
        """
        UPDATE canonical.route child SET parent_id = parent.id
        FROM staging.osm_route_member m
        JOIN canonical.route parent ON parent.osm_relation_id = m.osm_id
        WHERE child.osm_relation_id = m.member_id AND child.id <> parent.id
        """
    )
    return cur.rowcount


def build_route_segments(cur) -> int:
    """sub-route > segment: geometriu trasy rozdelí na súvislé čiary v poradí (T2-06)."""
    cur.execute("TRUNCATE canonical.route_segment")
    cur.execute(
        """
        INSERT INTO canonical.route_segment (route_id, seq, geom)
        SELECT r.id, row_number() OVER (PARTITION BY r.id ORDER BY d.path), d.geom
        FROM canonical.route r,
             LATERAL ST_Dump(ST_LineMerge(r.geom)) d
        WHERE r.geom IS NOT NULL
          AND GeometryType(d.geom) = 'LINESTRING' AND ST_NPoints(d.geom) >= 2 AND ST_IsValid(d.geom)
        """
    )
    return cur.rowcount


def build_path_geometry(cur) -> int:
    """Úseky našich trás (medzi dvoma zastávkami) povedie po sieti ciest a chodníkov z OSM
    (najkratšia cesta, pipelines.network). Kde sa cesta nenájde, ostane priamka. Naplní aj
    route_path: aký podiel našej trasy ide po ktorej OSM trase."""
    cur.execute("SELECT to_regclass('staging.osm_way') IS NOT NULL")
    if not cur.fetchone()[0]:
        return 0  # starý import bez siete ciest -> spusti znova load_osm
    osm_src, osm_lic = source_ids(cur, "osm")
    cur.execute(
        """
        SELECT ps.id, ST_X(pa.geom), ST_Y(pa.geom), ST_X(pb.geom), ST_Y(pb.geom)
        FROM canonical.path_segment ps
        JOIN canonical.poi_path a ON a.path_id = ps.path_id AND a.seq = ps.seq AND a.role = 'stop'
        JOIN canonical.poi_path b ON b.path_id = ps.path_id AND b.seq = ps.seq + 1 AND b.role = 'stop'
        JOIN canonical.poi pa ON pa.id = a.poi_id
        JOIN canonical.poi pb ON pb.id = b.poi_id
        ORDER BY ps.path_id, ps.seq
        """
    )
    n = 0
    for segment_id, ax, ay, bx, by in cur.fetchall():
        line = route_between(cur, (ax, ay), (bx, by))
        if not line:
            continue
        cur.execute(
            """UPDATE canonical.path_segment
               SET geom = ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326), surface = 'osm', source_id = %s, licence_id = %s
               WHERE id = %s""",
            (json.dumps({"type": "LineString", "coordinates": line}), osm_src, osm_lic, segment_id),
        )
        n += 1
    cur.execute("DELETE FROM canonical.route_path")
    cur.execute(
        """
        WITH pts AS (  -- body na našich úsekoch každých ~200 m
            SELECT row_number() OVER () AS id, s.path_id, ST_LineInterpolatePoint(s.geom, i::float8 / k.n) AS geom
            FROM canonical.path_segment s,
                 LATERAL (SELECT greatest(1, ceil(ST_Length(s.geom::geography) / 200))::int AS n) k,
                 LATERAL generate_series(0, k.n) i
        ), total AS (SELECT path_id, count(*) AS n FROM pts GROUP BY path_id)
        INSERT INTO canonical.route_path (route_id, path_id, share_pct)
        SELECT rs.route_id, p.path_id, round(100.0 * count(DISTINCT p.id) / t.n, 2)
        FROM pts p
        JOIN canonical.route_segment rs ON ST_DWithin(rs.geom, p.geom, %(buf)s)
        JOIN total t ON t.path_id = p.path_id
        GROUP BY rs.route_id, p.path_id, t.n
        HAVING 100.0 * count(DISTINCT p.id) / t.n >= 1
        """,
        {"buf": ROUTE_BUFFER_DEG},
    )
    return n


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
            print(f"Podtrasy: {link_sub_routes(cur)}, úseky trás: {build_route_segments(cur)}")
            print(f"Úseky našich trás po OSM cestách a chodníkoch: {build_path_geometry(cur)}")
        print(f"Odbočky do {DETOUR_RADIUS_M / 1000:.0f} km: {link_detours(cur)}")
        conn.commit()


if __name__ == "__main__":
    main()
