"""Konfigurácia z premenných prostredia (.env). Tajomstvá nikdy v kóde."""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=(".env", "../.env"), extra="ignore")

    repository: Literal["file", "postgis"] = "file"
    database_url: str = "postgresql://satsgis:satsgis@localhost:5432/satsgis"
    cors_origins: str = "http://localhost:3000,http://localhost:4173"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
