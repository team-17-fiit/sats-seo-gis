"""FastAPI aplikácia.

uvicorn app.main:app --reload --port 8000     # z priečinka backend/
http://localhost:8000/docs                    # OpenAPI dokumentácia (príloha K)
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import __version__
from .api.v1 import router as v1_router
from .settings import get_settings


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="SATS-SEO-GIS API",
        version=__version__,
        description="Trasy a POI aktívneho turizmu na Slovensku. Dáta: © OpenStreetMap contributors (ODbL), "
        "GeoNames (CC BY 4.0), rurAllure (CC BY 4.0), tím SATS-SEO-GIS (CC BY 4.0).",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_methods=["GET"],
        allow_headers=["*"],
    )
    app.include_router(v1_router)

    @app.get("/", include_in_schema=False)
    def root() -> dict:
        return {"name": "SATS-SEO-GIS API", "version": __version__, "docs": "/docs", "api": "/api/v1"}

    return app


app = create_app()
