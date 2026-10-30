def test_health_reports_repository(client):
    r = client.get("/api/v1/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["repository"] == "file"


def test_lists_all_seven_paths(client):
    r = client.get("/api/v1/paths")
    assert r.status_code == 200
    slugs = [p["slug"] for p in r.json()]
    assert len(slugs) == 7
    assert "cesta-marie" in slugs


def test_path_detail_has_ordered_stops(client):
    r = client.get("/api/v1/paths/malokarpatska-vinna-cesta")
    assert r.status_code == 200
    path = r.json()
    assert path["pilot_code"] == "A"
    assert [s["seq"] for s in path["stops"]] == list(range(1, len(path["stops"]) + 1))
    assert path["stops"][0]["slug"] == "bratislava-start"
    assert path["stop_count"] == 8


def test_unknown_path_returns_404(client):
    assert client.get("/api/v1/paths/neexistuje").status_code == 404


def test_pois_near_point_are_sorted_by_distance(client):
    # Devín: v okruhu 3 km je len hrad Devín
    r = client.get("/api/v1/pois", params={"near": "48.1737,16.9783", "r": 3000})
    assert r.status_code == 200
    hits = r.json()
    assert hits[0]["slug"] == "devin"
    assert hits[0]["distance_m"] < 1
    assert all(a["distance_m"] <= b["distance_m"] for a, b in zip(hits, hits[1:], strict=False))


def test_pois_near_rejects_bad_coordinates(client):
    assert client.get("/api/v1/pois", params={"near": "abc"}).status_code == 422
    assert client.get("/api/v1/pois", params={"near": "120,17"}).status_code == 422


def test_poi_detail_lists_its_paths(client):
    r = client.get("/api/v1/pois/piestany-kupele")
    assert r.status_code == 200
    poi = r.json()
    assert poi["licence"] == "CC-BY-4.0"
    assert {"hlavna-os", "malokarpatska-vinna-cesta", "povazska-hradna-cesta"} <= set(poi["paths"])


def test_openapi_documents_v1_endpoints(client):
    spec = client.get("/openapi.json").json()
    assert {"/api/v1/health", "/api/v1/paths", "/api/v1/paths/{slug}", "/api/v1/pois"} <= set(spec["paths"])
