"""ŠOP SR chránené územia (T2-08): parsovanie INSPIRE GeoJSON bez DB + názov územia pri POI v DB."""

import json

import psycopg
import pytest

from pipelines.common import FIXTURES_DIR
from pipelines.load_sopsr import parse

SAMPLE = json.loads((FIXTURES_DIR / "sopsr" / "sample.geojson").read_text(encoding="utf-8"))


def test_parse_reads_inspire_id_and_name():
    rows = parse(SAMPLE)
    assert [(i, n) for i, n, _ in rows] == [
        ("IDENTIFIERID_fixture-tanap", "Tatransky narodny park"),
        ("IDENTIFIERID_fixture-ihla", "Hricovska skalna ihla"),  # mená ako zoznam, orezané medzery
    ]
    assert rows[0][2]["type"] == "Polygon"


def test_parse_skips_areas_without_name():
    assert "IDENTIFIERID_fixture-noname" not in [i for i, _, _ in parse(SAMPLE)]


@pytest.mark.db
def test_poi_page_shows_protected_area(db_url):
    # beží po `make data-fixtures`; Rysy z OSM vzorky leží v územnom polygóne TANAP z vzorky
    with psycopg.connect(db_url) as conn, conn.cursor() as cur:
        cur.execute("SELECT count(*) FROM canonical.protected_area")
        assert cur.fetchone()[0] == 2
        cur.execute("SELECT protected_area FROM marts.mart_poi_pages WHERE wikidata_id = 'Q1033473'")
        assert cur.fetchone() == ("Tatransky narodny park",)
