"""Verzia 1 REST API. Zmena kontraktu = nová verzia (/api/v2), nie úprava tejto."""

from fastapi import APIRouter

from . import health, paths, pois

router = APIRouter(prefix="/api/v1")
router.include_router(health.router)
router.include_router(paths.router)
router.include_router(pois.router)
