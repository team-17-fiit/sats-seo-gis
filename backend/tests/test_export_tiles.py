"""Export vrstiev pre dlaždice (T3-07): tvar GeoJSON prvkov bez DB + obsah marts.mart_tiles v DB."""

import json

import psycopg
import pytest

from pipelines.export_tiles import LAYERS, MINZOOM, feature, write_layers

POINT = {"type": "Point", "coordinates": [20.0883, 49.1795]}
LINE = {"type": "LineString", "coordinates": [[17.1, 48.1], [17.2, 48.2]]}


def test_poi_feature_carries_licence_and_minzoom_by_tier():
    f = feature({"slug": "rysy", "category": "peak", "tier": 2}, "ODbL-1.0", 2, POINT)
    assert f["type"] == "Feature"
    assert f["geometry"] == POINT
    assert f["properties"] == {"slug": "rysy", "category": "peak", "tier": 2, "licence": "ODbL-1.0"}
    assert f["tippecanoe"] == {"minzoom": 9}


def test_path_feature_has_no_minzoom():
    f = feature({"slug": "cesta-marie", "colour": "#1565c0"}, "CC-BY-4.0", None, LINE)
    assert "tippecanoe" not in f
    assert f["properties"]["licence"] == "CC-BY-4.0"


def test_minzoom_stays_within_z5_z15():
    assert set(MINZOOM) == {1, 2, 3}
    assert all(5 <= z <= 15 for z in MINZOOM.values())


def test_write_layers_one_geojson_line_per_feature(tmp_path):
    rows = [
        ("paths", {"slug": "cesta-marie"}, "CC-BY-4.0", None, json.dumps(LINE)),
        ("pois", {"slug": "rysy"}, "ODbL-1.0", 1, json.dumps(POINT)),
        ("pois", {"slug": "šariš"}, "ODbL-1.0", 3, json.dumps(POINT)),
    ]
    assert write_layers(rows, tmp_path) == {"paths": 1, "pois": 2}
    lines = (tmp_path / "pois.geojsonl").read_text(encoding="utf-8").splitlines()
    assert [json.loads(line)["properties"]["slug"] for line in lines] == ["rysy", "šariš"]
    assert sorted(p.name for p in tmp_path.iterdir()) == [f"{layer}.geojsonl" for layer in LAYERS]


@pytest.mark.db
def test_mart_tiles_holds_only_public_content(db_url):
    # beží po `make data-fixtures`; rurAllure kandidáti (licencia neoverená) nesmú ísť do dlaždíc
    with psycopg.connect(db_url) as conn, conn.cursor() as cur:
        cur.execute("SELECT layer, count(*) FROM marts.mart_tiles GROUP BY layer ORDER BY layer")
        counts = dict(cur.fetchall())
        assert counts["paths"] > 0 and counts["pois"] > 0
        cur.execute(
            """SELECT count(*) FROM marts.mart_tiles t JOIN canonical.poi p ON p.slug = t.feature_id
               WHERE t.layer = 'pois' AND p.status NOT IN ('approved', 'published')"""
        )
        assert cur.fetchone()[0] == 0
        cur.execute("SELECT count(*) FROM marts.mart_tiles WHERE licence = 'PROPRIETARY'")
        assert cur.fetchone()[0] == 0
