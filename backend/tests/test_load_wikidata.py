"""Wikidata SPARQL fetcher (T2-07): parsovanie vzorky bez siete a bez DB + doplnenie POI v DB."""

import json

import psycopg
import pytest

from pipelines.common import FIXTURES_DIR
from pipelines.load_wikidata import batches, build_query, parse

SAMPLE = json.loads((FIXTURES_DIR / "wikidata" / "sample.json").read_text(encoding="utf-8"))


def test_parse_groups_bindings_by_item_and_keeps_first_value():
    items = parse(SAMPLE)
    assert set(items) == {"Q1033473", "Q392365"}
    rysy = items["Q1033473"]
    assert rysy["description_sk"] == "štít vo Vysokých Tatrách"
    assert rysy["description_en"] == "mountain in the High Tatras"
    assert rysy["image"] == "https://commons.wikimedia.org/wiki/Special:FilePath/Rysy%20fixture.jpg"
    assert rysy["website"] is None
    assert rysy["unesco"] is False
    assert len(rysy["raw"]) == 2


def test_parse_reads_unesco_world_heritage_flag():
    vlkolinec = parse(SAMPLE)["Q392365"]
    assert vlkolinec["unesco"] is True
    assert vlkolinec["website"] == "https://www.vlkolinec.sk/"
    assert vlkolinec["description_en"] is None


def test_query_lists_items_and_requested_properties():
    query = build_query(["Q1", "Q2"])
    assert "VALUES ?item { wd:Q1 wd:Q2 }" in query
    for prop in ("wdt:P18", "wdt:P856", "wdt:P1435 wd:Q9259"):
        assert prop in query


def test_batches_split_by_200():
    assert [len(b) for b in batches([f"Q{i}" for i in range(450)])] == [200, 200, 50]


@pytest.mark.db
def test_enrich_fills_poi_from_fixture(db_url):
    # beží po `make data-fixtures` (CI job data-contract); Rysy z OSM vzorky má wikidata Q1033473
    with psycopg.connect(db_url) as conn, conn.cursor() as cur:
        cur.execute("SELECT count(*) FROM staging.wikidata_item")
        assert cur.fetchone()[0] == 2
        cur.execute("SELECT description_sk, image, tier FROM canonical.poi WHERE wikidata_id = 'Q1033473'")
        description, image, tier = cur.fetchone()
    assert description == "štít vo Vysokých Tatrách"
    assert image == "https://commons.wikimedia.org/wiki/Special:FilePath/Rysy%20fixture.jpg"
    assert tier <= 2
