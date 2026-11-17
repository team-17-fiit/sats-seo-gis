"""Dlaždice PMTiles (T3-08): príkaz pre tippecanoe a atribúcia bez nástroja, plný beh len ak je nainštalovaný."""

import json

import pytest

from pipelines.build_tiles import MAX_ZOOM, MIN_ZOOM, attribution, build_command, find_tippecanoe, licences
from pipelines.export_tiles import feature, write_layers

POINT = {"type": "Point", "coordinates": [20.0883, 49.1795]}
LINE = {"type": "LineString", "coordinates": [[17.1, 48.1], [17.2, 48.2]]}


@pytest.fixture
def layers(tmp_path):
    rows = [
        ("paths", {"slug": "cesta-marie", "colour": "#1565c0"}, "CC-BY-4.0", None, json.dumps(LINE)),
        ("pois", {"slug": "rysy", "tier": 2}, "ODbL-1.0", 2, json.dumps(POINT)),
    ]
    write_layers(rows, tmp_path)
    return [tmp_path / "paths.geojsonl", tmp_path / "pois.geojsonl"]


def test_licences_are_collected_from_all_layers(layers):
    assert licences(layers) == ["CC-BY-4.0", "ODbL-1.0"]


def test_attribution_always_credits_openstreetmap():
    assert attribution([]) == "© OpenStreetMap contributors"
    assert "ODbL-1.0" in attribution(["ODbL-1.0"])


def test_command_has_zoom_range_and_one_named_layer_per_file(layers, tmp_path):
    out = tmp_path / "sats.pmtiles"
    cmd = build_command("tippecanoe", layers, out, ["ODbL-1.0"])
    assert cmd[0] == "tippecanoe"
    assert f"--output={out}" in cmd
    assert f"--minimum-zoom={MIN_ZOOM}" in cmd and f"--maximum-zoom={MAX_ZOOM}" in cmd
    assert (MIN_ZOOM, MAX_ZOOM) == (5, 15)
    assert [c for c in cmd if c.startswith("--named-layer=")] == [
        f"--named-layer=paths:{layers[0]}",
        f"--named-layer=pois:{layers[1]}",
    ]


def test_feature_minzoom_reaches_tippecanoe_input(layers):
    poi = json.loads(layers[1].read_text(encoding="utf-8"))
    assert poi == feature({"slug": "rysy", "tier": 2}, "ODbL-1.0", 2, POINT)
    assert poi["tippecanoe"]["minzoom"] >= MIN_ZOOM


@pytest.mark.skipif(not find_tippecanoe(), reason="tippecanoe nie je nainštalované")
def test_tippecanoe_writes_pmtiles(layers, tmp_path):
    import subprocess

    out = tmp_path / "sats.pmtiles"
    subprocess.run(build_command(find_tippecanoe(), layers, out, licences(layers)), check=True)
    assert out.read_bytes()[:7] == b"PMTiles"  # hlavička formátu PMTiles v3
