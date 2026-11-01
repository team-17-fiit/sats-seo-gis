"""Model trasa > podtrasa > úsek (T2-06). Beží v CI jobe data-contract po `make data-fixtures`.

Lokálne: TEST_DATABASE_URL=postgresql://satsgis:satsgis@localhost:5432/satsgis pytest -m db
"""

import psycopg
import pytest

pytestmark = pytest.mark.db


@pytest.fixture
def cur(db_url):
    with psycopg.connect(db_url) as conn, conn.cursor() as c:
        yield c


def test_sub_routes_point_to_parent(cur):
    cur.execute(
        """SELECT c.osm_relation_id FROM canonical.route c
           JOIN canonical.route p ON p.id = c.parent_id
           WHERE p.osm_relation_id = 6100 ORDER BY c.osm_relation_id"""
    )
    assert [r[0] for r in cur.fetchall()] == [6001, 6002]


def test_parent_route_without_own_ways_has_no_geometry(cur):
    cur.execute("SELECT geom IS NULL, parent_id FROM canonical.route WHERE osm_relation_id = 6100")
    assert cur.fetchone() == (True, None)


def test_connected_ways_merge_into_one_segment(cur):
    # relácia 6001 = dve na seba nadväzujúce cesty -> jeden súvislý úsek
    cur.execute(
        """SELECT s.seq, ST_NPoints(s.geom) FROM canonical.route_segment s
           JOIN canonical.route r ON r.id = s.route_id WHERE r.osm_relation_id = 6001"""
    )
    assert cur.fetchall() == [(1, 3)]


def test_every_route_with_geometry_has_valid_segments(cur):
    cur.execute(
        """SELECT count(*) FROM canonical.route r
           WHERE r.geom IS NOT NULL
             AND NOT EXISTS (SELECT 1 FROM canonical.route_segment s WHERE s.route_id = r.id)"""
    )
    assert cur.fetchone()[0] == 0
    cur.execute("SELECT count(*) FROM canonical.route_segment WHERE NOT ST_IsValid(geom)")
    assert cur.fetchone()[0] == 0
