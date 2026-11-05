"""Unit testy ETL bez databázy: parsery, quality score, kontrakt seedu."""

from pipelines.common import FIXTURES_DIR, in_slovakia_bbox, slugify
from pipelines.export_static import from_seed, pois_from_seed
from pipelines.load_geonames import parse as parse_geonames
from pipelines.load_natural_earth import slovak_features
from pipelines.load_rurallure import parse_ds1, parse_ds6
from pipelines.network import shortest_path
from pipelines.quality import WEIGHTS, quality_score, tier_for
from pipelines.seed_paths import load_seed, validate_seed
from pipelines.validate import parse_checks


def test_slugify_strips_diacritics_like_frontend():
    assert slugify("Gerlachovský štít") == "gerlachovsky-stit"
    assert slugify("  Červený Kameň!! ") == "cerveny-kamen"


def test_bbox_rejects_missing_and_foreign_points():
    assert in_slovakia_bbox(17.1, 48.1)
    assert not in_slovakia_bbox(None, 48.1)
    assert not in_slovakia_bbox(12.45, 41.90)  # Rím


def test_quality_score_bounds_and_weights():
    assert abs(sum(WEIGHTS.values()) - 1) < 1e-9
    assert quality_score({}) == 0
    assert quality_score(dict.fromkeys(WEIGHTS, True)) == 100
    assert quality_score({"name_sk": "Devín", "licence_clear": True}) == 40


def test_tier_rules():
    assert tier_for("castle", has_wikidata=False, unesco=True) == 1
    assert tier_for("peak", has_wikidata=True) == 2
    assert tier_for("shelter", has_wikidata=False) == 3


def test_seed_contract_is_valid():
    seed = load_seed()
    assert validate_seed(seed) == []
    assert len(seed["paths"]) == 7
    assert {p["pilot"] for p in seed["paths"]} == {"A", "B", "C"}


def test_seed_validation_detects_missing_stop():
    seed = load_seed()
    seed["paths"][0]["stops"].append("neexistuje")
    assert any("neexistuje" in e for e in validate_seed(seed))


def test_ds1_parser_keeps_bad_rows_for_quarantine():
    rows = parse_ds1(FIXTURES_DIR / "rurallure" / "ds1_sample.csv")
    assert len(rows) == 5
    by_id = {r["ext_id"]: r for r in rows}
    assert by_id["SK-DS1-001"]["lat"] == 48.249
    assert by_id["SK-DS1-004"]["lat"] is None


def test_ds6_parser_reads_gpx_and_geojson():
    tracks = parse_ds6(FIXTURES_DIR / "rurallure")
    assert len(tracks) == 2
    assert all(t["geometry"]["type"] == "MultiLineString" for t in tracks)
    gpx = next(t for t in tracks if t["file"].endswith(".gpx"))
    assert len(gpx["geometry"]["coordinates"][0]) == 3


def test_geonames_parser_filters_to_slovakia():
    lines = (FIXTURES_DIR / "geonames" / "SK.txt").read_text(encoding="utf-8").splitlines()
    rows = list(parse_geonames(lines))
    assert {r["name"] for r in rows} >= {"Bratislava", "Rysy"}
    rysy = next(r for r in rows if r["name"] == "Rysy")
    assert rysy["elevation"] == 2503 and rysy["population"] is None


def test_natural_earth_picks_only_slovakia():
    import json

    data = json.loads((FIXTURES_DIR / "naturalearth" / "admin_sample.geojson").read_text(encoding="utf-8"))
    feats = slovak_features(data, level=0)
    assert [f[0] for f in feats] == ["SK"]


def test_checks_sql_is_parsed():
    from pipelines.validate import CHECKS_FILE

    checks = parse_checks(CHECKS_FILE.read_text(encoding="utf-8"))
    names = [n for n, _, _ in checks]
    assert "poi_without_source_or_licence" in names
    assert "path_segment_gap_over_50m" in names
    assert len(names) == len(set(names))
    assert all(q.lower().startswith("select") for _, q, _ in checks)
    assert all("--" not in q for _, q, _ in checks)
    assert {lvl for _, _, lvl in checks} == {"check", "warn"}


def test_checks_sql_warn_level_is_parsed():
    sql = "-- check: a\nSELECT 1;\n\n-- section comment\n-- warn: b\nSELECT 2;\n"
    assert parse_checks(sql) == [("a", "SELECT 1", "check"), ("b", "SELECT 2", "warn")]


def test_poi_export_covers_every_stop_as_t1():
    pois = {p["slug"]: p for p in pois_from_seed()}
    for path in from_seed():
        for stop in path["stops"]:
            assert stop["slug"] in pois
            assert path["slug"] in pois[stop["slug"]]["paths"]
    assert all(p["tier"] == 1 for p in pois.values())
    assert all(p["licence"] and p["source"] for p in pois.values())  # licenčná brána (US-11)


def _graph(*ways):
    graph = {}
    for cost, coords in ways:
        for u, v in zip(coords, coords[1:], strict=False):
            graph.setdefault(u, []).append((v, cost))
            graph.setdefault(v, []).append((u, cost))
    return graph


def test_shortest_path_goes_along_network_and_prefers_cheaper_way():
    a, b = (17.0, 48.0), (17.02, 48.0)
    graph = _graph(
        (5.0, [a, (17.01, 48.0), b]),  # priamo, ale drahá (hlavná cesta)
        (1.0, [a, (17.01, 48.005), b]),  # obchádzka po chodníku
    )
    assert shortest_path(graph, a, b) == [a, (17.01, 48.005), b]


def test_shortest_path_none_when_stops_are_far_from_network():
    graph = _graph((1.0, [(17.0, 48.0), (17.01, 48.0)]))
    assert shortest_path(graph, (18.0, 49.0), (18.1, 49.0)) is None
