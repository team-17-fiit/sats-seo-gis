"""Rozhranie úložiska POI a trás."""

from __future__ import annotations

from typing import Protocol

from ..models import PathDetail, PathSummary, Poi, PoiNear


class PoiRepository(Protocol):
    name: str

    def ping(self) -> str:
        """'ok' alebo popis chyby – pre /health."""
        ...

    def list_paths(self) -> list[PathSummary]: ...

    def get_path(self, slug: str) -> PathDetail | None: ...

    def list_pois(self, category: str | None, limit: int) -> list[Poi]: ...

    def get_poi(self, slug: str) -> Poi | None: ...

    def pois_near(self, lat: float, lon: float, radius_m: float, limit: int) -> list[PoiNear]: ...
