"""Model POI s 24 poľami (T2-05). Beží v CI jobe data-contract po `make data-fixtures`.

Lokálne: TEST_DATABASE_URL=postgresql://satsgis:satsgis@localhost:5432/satsgis pytest -m db
"""

import psycopg
import pytest

pytestmark = pytest.mark.db


@pytest.fixture
def cur(db_url):
    with psycopg.connect(db_url) as conn, conn.cursor() as c:
        yield c


def test_poi_model_has_24_fields(cur):
    cur.execute(
        "SELECT count(*) FROM information_schema.columns WHERE table_schema = 'canonical' AND table_name = 'poi'"
    )
    assert cur.fetchone()[0] == 24


def test_opening_hours_come_from_osm(cur):
    cur.execute("SELECT opening_hours FROM canonical.poi WHERE osm_id = 'n1002'")  # Devín vo fixture
    assert cur.fetchone() == ("Tu-Su 10:00-17:00",)


def test_poi_pages_mart_exposes_new_fields(cur):
    cur.execute("SELECT image, opening_hours FROM marts.mart_poi_pages LIMIT 0")
    assert [d.name for d in cur.description] == ["image", "opening_hours"]
