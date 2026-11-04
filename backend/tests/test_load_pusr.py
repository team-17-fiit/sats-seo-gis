"""PÚSR pamiatkové územia (T2-08): parsovanie PAMIS GeoJSON bez DB + názov územia pri POI v DB."""

import json

import psycopg
import pytest

from pipelines.common import FIXTURES_DIR
from pipelines.load_pusr import LAYERS, parse


def sample(kind: str) -> dict:
    return json.loads((FIXTURES_DIR / "pusr" / LAYERS[kind]).read_text(encoding="utf-8"))


def test_parse_reads_id_and_name_per_layer():
    rows = parse(sample("reservation"), "reservation")
    assert [(i, n) for i, n, _ in rows] == [("reservation:2", "Pamiatková rezervácia Banská Štiavnica")]
    assert rows[0][2]["type"] == "MultiPolygon"


def test_parse_skips_areas_without_name():
    assert [i for i, _, _ in parse(sample("zone"), "zone")] == ["zone:1"]


@pytest.mark.db
def test_poi_page_shows_smallest_heritage_area(db_url):
    # beží po `make data-fixtures`; zastávka Banská Štiavnica leží v rezervácii aj v lokalite UNESCO
    with psycopg.connect(db_url) as conn, conn.cursor() as cur:
        cur.execute("SELECT kind, count(*) FROM canonical.heritage_area GROUP BY kind ORDER BY kind")
        assert cur.fetchall() == [("reservation", 1), ("unesco", 1), ("zone", 1)]
        cur.execute("SELECT heritage_area FROM marts.mart_poi_pages WHERE slug = 'banska-stiavnica'")
        assert cur.fetchone() == ("Pamiatková rezervácia Banská Štiavnica",)
