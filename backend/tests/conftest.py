import os

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.repositories import get_repository
from app.repositories.file_repo import FilePoiRepository


@pytest.fixture
def file_repo() -> FilePoiRepository:
    return FilePoiRepository()


@pytest.fixture
def client(file_repo) -> TestClient:
    """API nad súborovým repozitárom – bez siete a bez DB (metodika testovania, pravidlo 5)."""
    app = create_app()
    app.dependency_overrides[get_repository] = lambda: file_repo
    return TestClient(app)


@pytest.fixture
def db_url() -> str:
    url = os.environ.get("TEST_DATABASE_URL")
    if not url:
        pytest.skip("TEST_DATABASE_URL nie je nastavená – DB test preskočený")
    return url
