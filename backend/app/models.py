"""Pydantic modely odpovedí API – z nich sa generuje OpenAPI 3.1 (/docs, /openapi.json)."""

from __future__ import annotations

from pydantic import BaseModel, Field


class Stop(BaseModel):
    slug: str
    name_sk: str
    name_en: str | None = None
    category: str
    unesco: bool = False
    seq: int
    lat: float
    lon: float


class PathSummary(BaseModel):
    slug: str
    name_sk: str
    name_en: str
    theme: str
    pilot_code: str = Field(description="pilot A/B/C")
    difficulty: str
    length_km: float | None = None
    colour: str
    stop_count: int


class PathDetail(PathSummary):
    mark: str | None = None
    summary_sk: str | None = None
    summary_en: str | None = None
    licence: str
    stops: list[Stop]


class Poi(BaseModel):
    slug: str
    name_sk: str
    name_en: str | None = None
    category: str
    tier: int = Field(ge=1, le=3)
    unesco: bool = False
    lat: float
    lon: float
    source: str
    licence: str
    paths: list[str] = []


class PoiNear(Poi):
    distance_m: float


class Health(BaseModel):
    status: str
    version: str
    repository: str
    database: str
