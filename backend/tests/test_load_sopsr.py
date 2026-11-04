"""ŠOP SR chránené územia (T2-08): parsovanie GeoJSON z WFS ŠOP SR bez DB + názov územia pri POI v DB."""

import json

import psycopg
import pytest

from pipelines.common import FIXTURES_DIR
from pipelines.load_sopsr import LAYERS, parse


def sample(kind: str) -> dict:
    return json.loads((FIXTURES_DIR / "sopsr" / LAYERS[kind]).read_text(encoding="utf-8"))


def test_parse_reads_id_and_name_per_layer():
    rows = parse(sample("vchu"), "vchu")
    assert [(i, n) for i, n, _ in rows] == [("vchu:1001", "NP Tatranský národný park")]
    assert rows[0][2]["type"] == "MultiPolygon"


def test_parse_strips_names_and_skips_areas_without_name():
    assert [(i, n) for i, n, _ in parse(sample("mchu"), "mchu")] == [("mchu:842", "NPP Starý hrad")]


@pytest.mark.db
def test_poi_page_shows_protected_area(db_url):
    # beží po `make data-fixtures`; Rysy z OSM vzorky leží vo VCHÚ polygóne zo vzorky
    with psycopg.connect(db_url) as conn, conn.cursor() as cur:
        cur.execute("SELECT kind, count(*) FROM canonical.protected_area GROUP BY kind ORDER BY kind")
        assert cur.fetchall() == [("mchu", 1), ("vchu", 1)]
        cur.execute("SELECT protected_area FROM marts.mart_poi_pages WHERE wikidata_id = 'Q1033473'")
        assert cur.fetchone() == ("NP Tatranský národný park",)
