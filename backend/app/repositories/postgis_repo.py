"""PostgisPoiRepository – produkčné úložisko nad marts.* a canonical.* (PostGIS)."""

from __future__ import annotations

from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from ..models import PathDetail, PathSummary, Poi, PoiNear, Stop

_POI_COLUMNS = """
    p.slug, p.name_sk, p.name_en, p.category, p.tier, p.unesco,
    ST_Y(p.geom) AS lat, ST_X(p.geom) AS lon, s.code AS source, l.code AS licence,
    ARRAY(SELECT pa.slug FROM canonical.poi_path pp JOIN canonical.path pa ON pa.id = pp.path_id
          WHERE pp.poi_id = p.id ORDER BY pa.slug) AS paths
"""
_POI_FROM = """
    FROM canonical.poi p
    JOIN canonical.source s ON s.id = p.source_id
    JOIN canonical.licence l ON l.id = p.licence_id
    WHERE l.public_ok AND p.status IN ('approved', 'published')
"""


class PostgisPoiRepository:
    name = "postgis"

    def __init__(self, dsn: str):
        self._pool = ConnectionPool(dsn, min_size=1, max_size=5, open=False, kwargs={"row_factory": dict_row})

    def _query(self, sql: str, params: dict | tuple = ()) -> list[dict]:
        if self._pool.closed:
            self._pool.open(wait=True, timeout=5)
        with self._pool.connection() as conn:
            return conn.execute(sql, params).fetchall()

    def ping(self) -> str:
        try:
            self._query("SELECT 1")
            return "ok"
        except Exception as exc:  # noqa: BLE001 – health má vrátiť dôvod, nie spadnúť
            return f"error: {exc.__class__.__name__}"

    def list_paths(self) -> list[PathSummary]:
        rows = self._query(
            """SELECT slug, name_sk, name_en, theme, pilot_code, difficulty, length_km, colour,
                      json_array_length(stops) AS stop_count
               FROM marts.mart_path_pages ORDER BY slug"""
        )
        return [PathSummary(**r) for r in rows]

    def get_path(self, slug: str) -> PathDetail | None:
        rows = self._query(
            """SELECT slug, name_sk, name_en, theme, pilot_code, difficulty, length_km, colour, mark,
                      summary_sk, summary_en, licence, stops, json_array_length(stops) AS stop_count
               FROM marts.mart_path_pages WHERE slug = %s""",
            (slug,),
        )
        if not rows:
            return None
        row = rows[0]
        row["stops"] = [Stop(**s) for s in row["stops"]]
        return PathDetail(**row)

    def list_pois(self, category: str | None, limit: int) -> list[Poi]:
        rows = self._query(
            f"SELECT {_POI_COLUMNS} {_POI_FROM} AND (%(cat)s::text IS NULL OR p.category = %(cat)s) "
            "ORDER BY p.tier, p.slug LIMIT %(limit)s",
            {"cat": category, "limit": limit},
        )
        return [Poi(**r) for r in rows]

    def get_poi(self, slug: str) -> Poi | None:
        rows = self._query(f"SELECT {_POI_COLUMNS} {_POI_FROM} AND p.slug = %s", (slug,))
        return Poi(**rows[0]) if rows else None

    def pois_near(self, lat: float, lon: float, radius_m: float, limit: int) -> list[PoiNear]:
        rows = self._query(
            f"""SELECT {_POI_COLUMNS},
                       round(ST_Distance(p.geom::geography, pt.g)::numeric, 1)::float AS distance_m
                FROM (SELECT ST_SetSRID(ST_MakePoint(%(lon)s, %(lat)s), 4326)::geography AS g) pt,
                     canonical.poi p
                JOIN canonical.source s ON s.id = p.source_id
                JOIN canonical.licence l ON l.id = p.licence_id
                WHERE l.public_ok AND p.status IN ('approved', 'published')
                  AND ST_DWithin(p.geom::geography, pt.g, %(r)s)
                ORDER BY distance_m LIMIT %(limit)s""",
            {"lat": lat, "lon": lon, "r": radius_m, "limit": limit},
        )
        return [PoiNear(**r) for r in rows]
