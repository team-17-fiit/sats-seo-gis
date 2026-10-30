from fastapi import APIRouter, HTTPException

from ...models import PathDetail, PathSummary
from ...repositories import Repo

router = APIRouter(prefix="/paths", tags=["paths"])


@router.get("", response_model=list[PathSummary], summary="Zoznam tematických trás")
def list_paths(repo: Repo) -> list[PathSummary]:
    return repo.list_paths()


@router.get("/{slug}", response_model=PathDetail, summary="Trasa so zastávkami")
def get_path(slug: str, repo: Repo) -> PathDetail:
    path = repo.get_path(slug)
    if path is None:
        raise HTTPException(status_code=404, detail=f"Trasa '{slug}' neexistuje")
    return path
