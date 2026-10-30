"""Integračné testy nad PostGIS (spúšťajú sa v CI jobe data-contract po `make data-fixtures`).

Lokálne: TEST_DATABASE_URL=postgresql://satsgis:satsgis@localhost:5432/satsgis pytest -m db
"""

import pytest

from app.repositories.postgis_repo import PostgisPoiRepository

pytestmark = pytest.mark.db


@pytest.fixture
def repo(db_url):
    return PostgisPoiRepository(db_url)


def test_ping(repo):
    assert repo.ping() == "ok"


def test_seven_paths_with_stops(repo):
    paths = repo.list_paths()
    assert len(paths) == 7
    assert all(p.stop_count > 0 for p in paths)


def test_path_detail_matches_file_repository(repo, file_repo):
    db = repo.get_path("cesta-marie")
    fs = file_repo.get_path("cesta-marie")
    assert [s.slug for s in db.stops] == [s.slug for s in fs.stops]


def test_pois_near_uses_geography_distance(repo):
    hits = repo.pois_near(48.1737, 16.9783, 3000, 10)
    assert hits[0].slug == "devin"
    assert hits[0].distance_m < 1


def test_candidates_are_not_public(repo):
    slugs = {p.slug for p in repo.list_pois(None, 500)}
    assert "sastin-bazilika-sedembolestnej-panny-marie" not in slugs
