"""PoiRepository – šev medzi API a úložiskom (ADR-0004).

API závisí len od rozhrania; konkrétnu implementáciu vyberá premenná REPOSITORY.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Annotated

from fastapi import Depends

from ..settings import get_settings
from .base import PoiRepository


@lru_cache
def get_repository() -> PoiRepository:
    settings = get_settings()
    if settings.repository == "postgis":
        from .postgis_repo import PostgisPoiRepository

        return PostgisPoiRepository(settings.database_url)
    from .file_repo import FilePoiRepository

    return FilePoiRepository()


# Typ pre FastAPI dependency injection: def endpoint(repo: Repo)
Repo = Annotated[PoiRepository, Depends(get_repository)]

__all__ = ["PoiRepository", "Repo", "get_repository"]
