"""Etapy (path_leg) -> úseky (path_segment) so skutočnou geometriou z OSM cez GraphHopper (šprint 2-2Z).

    docker compose up -d graphhopper      # prvý štart importuje SK PBF (niekoľko minút)
    python -m pipelines.route_legs        # len etapy s routed_at IS NULL (nové alebo zmenené)
    python -m pipelines.route_legs --all  # prepočítať všetky etapy

Pre každú etapu:
1. GraphHopper vráti čiaru po OSM cestách + kde ide po značenom chodníku (foot/bike_network).
2. Čiara sa rozdelí na úseky podľa značenia a uloží do path_segment (method='routed').
3. Úseky sa spárujú s OSM reláciou z canonical.route (osm_relation_id, route_path.share_pct).
Ak GraphHopper nebeží (napr. v CI), etapa dostane priamku (method='placeholder') a skúsi sa znova
pri ďalšom behu. Nakoniec sa prepočítajú odbočky POI do 2 km (link_detours).
"""

from __future__ import annotations

import argparse
import json
import os
import urllib.error
import urllib.request

from .common import connect, source_ids
from .promote import link_detours

GH_URL = os.environ.get("GRAPHHOPPER_URL", "http://localhost:8989")
# GraphHopper path detail, ktorý hovorí, či ide cesta po značenej trase (INTERNATIONAL…LOCAL / MISSING)
NETWORK_DETAIL = {"hike": "foot_network", "bike": "bike_network"}


def graphhopper_up() -> bool:
    try:
        with urllib.request.urlopen(f"{GH_URL}/health", timeout=5) as r:
            return r.status == 200
    except (urllib.error.URLError, OSError):
        return False


def route(points: list[list[float]], profile: str) -> tuple[list, float, list]:
    """Vráti (súradnice [[lon, lat], …], dĺžka v m, intervaly značenia [[od, do, hodnota], …])."""
    detail = NETWORK_DETAIL.get(profile)
    body = {"points": points, "profile": profile, "points_encoded": False, "instructions": False}
    if detail:
        body["details"] = [detail]
    req = urllib.request.Request(
        f"{GH_URL}/route",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=120) as r:
        path = json.load(r)["paths"][0]
    return path["points"]["coordinates"], path["distance"], path.get("details", {}).get(detail, [])


def split_by_network(coords: list, intervals: list) -> list[tuple[str | None, list]]:
    """Rozdelí čiaru etapy na úseky podľa značenia; susedné intervaly s rovnakou hodnotou zlúči."""
    if not intervals:
        return [(None, coords)]
    parts: list[tuple[str | None, list]] = []
    for start, end, value in intervals:
        line = coords[start : end + 1]
        if len(line) < 2:
            continue
        if parts and parts[-1][0] == value:
            parts[-1] = (value, parts[-1][1] + line[1:])
        else:
            parts.append((value, line))
    return parts or [(None, coords)]


INSERT_SEGMENT = """
INSERT INTO canonical.path_segment
    (path_id, leg_id, seq, method, network, geom, length_m, source_id, licence_id)
SELECT %s, %s, %s, %s, %s, g, ST_Length(g::geography), %s, %s
FROM (SELECT ST_RemoveRepeatedPoints(ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326)) AS g) x
WHERE ST_NPoints(g) >= 2
"""

# úsek -> OSM relácia, s ktorou sa prekrýva aspoň z polovice (tolerancia 15 m)
MATCH_RELATIONS = """
UPDATE canonical.path_segment s SET osm_relation_id = best.osm_relation_id
FROM (
    SELECT DISTINCT ON (s.id) s.id AS segment_id, r.osm_relation_id,
           ST_Length(ST_Intersection(s.geom, ST_Buffer(r.geom::geography, 15)::geometry)::geography) AS shared_m
    FROM canonical.path_segment s
    JOIN canonical.route r
      ON r.osm_relation_id IS NOT NULL AND ST_DWithin(s.geom::geography, r.geom::geography, 15)
    WHERE s.method = 'routed'
    ORDER BY s.id, shared_m DESC
) best
WHERE s.id = best.segment_id AND best.shared_m >= 0.5 * s.length_m
"""

# podiel OSM relácie na dĺžke našej trasy
ROUTE_SHARE = """
DELETE FROM canonical.route_path;
INSERT INTO canonical.route_path (route_id, path_id, share_pct)
SELECT r.id, s.path_id, LEAST(100, round((100 * sum(s.length_m) / t.total_m)::numeric, 2))
FROM canonical.path_segment s
JOIN canonical.route r ON r.osm_relation_id = s.osm_relation_id
JOIN (SELECT path_id, sum(length_m) AS total_m FROM canonical.path_segment GROUP BY path_id) t USING (path_id)
GROUP BY r.id, s.path_id, t.total_m
"""


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--all", action="store_true", help="prepočítať aj už vytrasované etapy")
    args = parser.parse_args()

    online = graphhopper_up()
    if not online:
        print(f"GraphHopper nebeží na {GH_URL} – etapy dostanú priamky (docker compose up -d graphhopper)")

    with connect() as conn, conn.cursor() as cur:
        src_id, lic_id = source_ids(cur, "osm")  # geometria je odvodená z OSM -> ODbL
        cur.execute(
            """
            SELECT l.id, l.path_id, l.profile, l.via, ST_X(a.geom), ST_Y(a.geom), ST_X(b.geom), ST_Y(b.geom)
            FROM canonical.path_leg l
            JOIN canonical.poi a ON a.id = l.from_poi_id
            JOIN canonical.poi b ON b.id = l.to_poi_id
            WHERE %s OR l.routed_at IS NULL
            ORDER BY l.path_id, l.seq
            """,
            (args.all,),
        )
        routed = placeholders = 0
        for leg_id, path_id, profile, via, ax, ay, bx, by in cur.fetchall():
            points = [[ax, ay], *(via or []), [bx, by]]
            parts, length_m, method = [(None, points)], None, "placeholder"
            if online:
                try:
                    coords, length_m, intervals = route(points, profile)
                    parts, method = split_by_network(coords, intervals), "routed"
                except (urllib.error.URLError, OSError, KeyError, IndexError, ValueError) as e:
                    print(f"  ! etapa {leg_id} ({profile}): {e} -> priamka")

            cur.execute("DELETE FROM canonical.path_segment WHERE leg_id = %s", (leg_id,))
            for seq, (network, line) in enumerate(parts, start=1):
                geojson = json.dumps({"type": "LineString", "coordinates": line})
                cur.execute(INSERT_SEGMENT, (path_id, leg_id, seq, method, network, src_id, lic_id, geojson))
            cur.execute(
                """UPDATE canonical.path_leg
                   SET length_m = COALESCE(%s, (SELECT sum(length_m) FROM canonical.path_segment WHERE leg_id = %s)),
                       routed_at = CASE WHEN %s THEN now() END
                   WHERE id = %s""",
                (length_m, leg_id, method == "routed", leg_id),
            )
            routed += method == "routed"
            placeholders += method == "placeholder"

        cur.execute("DELETE FROM canonical.path_segment WHERE leg_id IS NULL")  # staré priamky spred 004
        cur.execute(MATCH_RELATIONS)
        cur.execute(ROUTE_SHARE)
        print(f"Etapy: {routed} vytrasovaných, {placeholders} priamok; odbočky do 2 km: {link_detours(cur)}")
        conn.commit()


if __name__ == "__main__":
    main()
