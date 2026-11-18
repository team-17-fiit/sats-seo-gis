"""Export pois.json z DB (T3-11). Beží v CI jobe data-contract po `make data-fixtures`.

Lokálne: TEST_DATABASE_URL=… DATABASE_URL=… pytest -m db
"""

import pytest

from pipelines.export_static import pois_from_db

pytestmark = pytest.mark.db


@pytest.fixture
def pois(db_url, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", db_url)
    return {p["slug"]: p for p in pois_from_db()}


def test_export_has_enriched_fields(pois):
    fields = {"image", "opening_hours", "protected_area", "heritage_area"}
    fields |= {"image_author", "image_licence", "image_licence_url"}  # T3-12
    assert pois and all(fields <= p.keys() for p in pois.values())


def test_export_carries_values_from_the_fixtures(pois):
    # vzorky: Devín má otváracie hodiny z OSM, Štrbské pleso leží v TANAP-e (ŠOP),
    # Banská Štiavnica v pamiatkovej rezervácii (PÚSR)
    assert pois["devin"]["opening_hours"] == "Tu-Su 10:00-17:00"
    assert pois["strbske-pleso"]["protected_area"] == "NP Tatranský národný park"
    assert pois["banska-stiavnica"]["heritage_area"] == "Pamiatková rezervácia Banská Štiavnica"
