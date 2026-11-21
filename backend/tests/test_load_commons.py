"""Autor a licencia obrázkov z Wikimedia Commons (T3-12): parsovanie bez siete a bez DB + údaje v DB."""

import json

import psycopg
import pytest

from pipelines.common import FIXTURES_DIR
from pipelines.load_commons import file_title, parse, plain_text, rows_for

SAMPLE = json.loads((FIXTURES_DIR / "commons" / "sample.json").read_text(encoding="utf-8"))
RYSY = "https://commons.wikimedia.org/wiki/Special:FilePath/Rysy%20fixture.jpg"


def test_file_title_from_image_url():
    assert file_title(RYSY) == "File:Rysy fixture.jpg"
    assert file_title("https://example.org/foto.jpg") is None


def test_plain_text_strips_html_from_artist():
    assert plain_text('<a href="//commons.wikimedia.org/wiki/User:Doko">Doko</a> Ing. Jozef') == "Doko Ing. Jozef"
    assert plain_text("&amp;  ") == "&"
    assert plain_text('was <a href="x">Jurbox</a> at <a href="y">Wikipedia</a>.') == "was Jurbox at Wikipedia."
    assert plain_text('<a href="x">Jojo</a>, <a href="y">en:Jojo_1</a>') == "Jojo, en:Jojo_1"
    assert plain_text("") is None and plain_text(None) is None


def test_parse_reads_author_and_licence_and_skips_missing_files():
    renamed, meta = parse(SAMPLE)
    assert renamed == {"File:Rysy_second.jpg": "File:Rysy second.jpg"}
    assert set(meta) == {"File:Rysy fixture.jpg", "File:Rysy second.jpg"}
    rysy = meta["File:Rysy fixture.jpg"]
    assert rysy["author"] == "Example & Ján Novák"
    assert rysy["licence"] == "CC BY-SA 4.0"
    assert rysy["licence_url"] == "https://creativecommons.org/licenses/by-sa/4.0"
    assert rysy["attribution_required"] is True
    second = meta["File:Rysy second.jpg"]
    assert (second["author"], second["licence_url"], second["attribution_required"]) == (None, None, False)


def test_rows_match_image_urls_including_renamed_titles():
    images = [
        RYSY,
        "https://commons.wikimedia.org/wiki/Special:FilePath/Rysy_second.jpg",
        "https://commons.wikimedia.org/wiki/Special:FilePath/Missing%20fixture.jpg",
    ]
    rows = {r["image"]: r for r in rows_for(images, SAMPLE)}
    assert set(rows) == set(images[:2])  # chýbajúci súbor na Commons -> bez riadku
    assert rows[RYSY]["source_url"] == "https://commons.wikimedia.org/wiki/File:Rysy_fixture.jpg"


@pytest.mark.db
def test_image_author_and_licence_reach_the_poi_mart(db_url):
    # beží po `make data-fixtures`; obrázok Rysov prišiel z Wikidata vzorky (T2-07)
    with psycopg.connect(db_url) as conn, conn.cursor() as cur:
        cur.execute(
            """SELECT i.author, i.licence, i.attribution_required, s.code
               FROM canonical.poi_image i JOIN canonical.source s ON s.id = i.source_id WHERE i.image = %s""",
            (RYSY,),
        )
        assert cur.fetchone() == ("Example & Ján Novák", "CC BY-SA 4.0", True, "wikimedia_commons")
        cur.execute("SELECT image_author, image_licence FROM marts.mart_poi_pages WHERE wikidata_id = 'Q1033473'")
        assert cur.fetchone() == ("Example & Ján Novák", "CC BY-SA 4.0")
