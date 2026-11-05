"""Geodátové kontroly exportu pre web (T2-11) – bez DB."""

import copy

import pytest

from pipelines import geocheck
from pipelines.common import APP_DATA_DIR


def _path(**over):
    path = {
        "slug": "test",
        "length_km": 2.3,
        "stops": [
            {"slug": "a", "seq": 1, "lat": 48.1000, "lon": 17.1000},
            {"slug": "b", "seq": 2, "lat": 48.1100, "lon": 17.1000},
            {"slug": "c", "seq": 3, "lat": 48.1200, "lon": 17.1000},
        ],
        "segments": [
            [[17.1000, 48.1000], [17.1001, 48.1050], [17.1000, 48.1100]],
            [[17.1000, 48.1100], [17.1000, 48.1200]],
        ],
    }
    path.update(over)
    return path


def _codes(issues, level=None):
    return {i.code for i in issues if level is None or i.level == level}


def test_valid_path_has_no_issues():
    assert geocheck.check_paths([_path()]) == []


def test_committed_export_has_no_errors():
    """Dáta, ktoré naozaj idú na web (app/public/data), musia prejsť bez chýb."""
    if not (APP_DATA_DIR / "paths.json").exists():
        pytest.skip("export app/public/data/paths.json neexistuje")
    issues = geocheck.check_export(
        geocheck._load(APP_DATA_DIR / "paths.json"),
        geocheck._load(APP_DATA_DIR / "pois.json"),
        geocheck._load(APP_DATA_DIR / "peaks.geojson"),
    )
    assert [str(i) for i in issues if i.level == "error"] == []


def test_gap_between_segments_is_error():
    p = _path()
    p["segments"][1][0] = [17.1050, 48.1100]  # ~370 m vedľa konca 1. úseku
    assert "segment_gap" in _codes(geocheck.check_paths([p]), "error")


def test_path_must_start_and_end_at_stops():
    p = _path()
    p["segments"][0][0] = [17.0950, 48.1000]
    assert "path_ends_off_stops" in _codes(geocheck.check_paths([p]), "error")


def test_stop_far_from_line_is_error():
    p = _path()
    p["stops"][1] = {**p["stops"][1], "lon": 17.1100}  # ~740 m východne od čiary
    assert "stop_far_from_path" in _codes(geocheck.check_paths([p]), "error")


def test_swapped_lat_lon_is_detected():
    p = _path()
    p["segments"][1][1] = [48.1200, 17.1000]
    p["stops"][2] = {**p["stops"][2], "lat": 17.1, "lon": 48.12}
    codes = _codes(geocheck.check_paths([p]), "error")
    assert {"segment_outside_slovakia", "stop_outside_slovakia"} <= codes


def test_stop_order_and_degenerate_segment():
    p = _path()
    p["stops"][2] = {**p["stops"][2], "seq": 2}
    p["segments"][1] = [[17.1000, 48.1100]]
    codes = _codes(geocheck.check_paths([p]), "error")
    assert {"path_stop_seq_invalid", "segment_degenerate"} <= codes


def test_too_many_segments_and_duplicate_slug():
    p = _path()
    p["segments"].append(copy.deepcopy(p["segments"][1]))
    codes = _codes(geocheck.check_paths([p, _path()]), "error")
    assert {"path_too_many_segments", "path_duplicate_slug"} <= codes


def test_path_without_segments_is_allowed():
    assert geocheck.check_paths([_path(segments=[])]) == []


def test_length_mismatch_is_only_warning():
    issues = geocheck.check_paths([_path(length_km=10)])
    assert _codes(issues) == {"path_length_mismatch"}
    assert all(i.level == "warn" for i in issues)


def test_poi_checks():
    pois = [
        {"slug": "hrad", "name_sk": "Hrad", "lat": 48.5, "lon": 19.0, "elevation_m": 500},
        {"slug": "hrad-2", "name_sk": "hrad ", "lat": 48.5002, "lon": 19.0, "elevation_m": None},
        {"slug": "stit", "name_sk": "Štít", "lat": 49.1, "lon": 20.1, "elevation_m": 8000},
        {"slug": "prec", "name_sk": "Preč", "lat": 50.5, "lon": 19.0},
    ]
    issues = geocheck.check_pois(pois)
    assert _codes(issues, "warn") == {"poi_duplicate_nearby", "poi_elevation_implausible"}
    assert _codes(issues, "error") == {"poi_outside_slovakia"}


def test_peak_must_be_point_in_slovakia():
    peaks = {"features": [{"properties": {"name": "X"}, "geometry": {"type": "Point", "coordinates": [49.1, 20.1]}}]}
    assert _codes(geocheck.check_peaks(peaks)) == {"peak_invalid_point"}


def test_report_counts_only_errors(capsys):
    issues = [geocheck.Issue("warn", "w", "x", "d"), geocheck.Issue("error", "e", "y", "d")]
    assert geocheck.report(issues) == 1
    assert "1 chýb, 1 varovaní" in capsys.readouterr().out
