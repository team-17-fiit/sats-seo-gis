from fastapi import APIRouter

from ... import __version__
from ...models import Health
from ...repositories import Repo

router = APIRouter(tags=["system"])


@router.get("/health", response_model=Health, summary="Stav API a pripojenia k úložisku")
def health(repo: Repo) -> Health:
    db = repo.ping()
    return Health(status="ok" if db == "ok" else "degraded", version=__version__, repository=repo.name, database=db)
