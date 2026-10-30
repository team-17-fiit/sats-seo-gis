from typing import Annotated

from fastapi import APIRouter, HTTPException, Query

from ...models import Poi, PoiNear
from ...repositories import Repo

router = APIRouter(prefix="/pois", tags=["pois"])


def _parse_near(near: str) -> tuple[float, float]:
    try:
        lat_s, lon_s = near.split(",")
        lat, lon = float(lat_s), float(lon_s)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="near musí byť 'lat,lon', napr. 48.14,17.10") from exc
    if not (-90 <= lat <= 90 and -180 <= lon <= 180):
        raise HTTPException(status_code=422, detail="súradnice mimo rozsahu")
    return lat, lon


@router.get(
    "",
    response_model=list[PoiNear] | list[Poi],
    summary="POI – zoznam alebo POI v okolí bodu (?near=lat,lon&r=2000)",
)
def list_pois(
    repo: Repo,
    near: Annotated[str | None, Query(description="lat,lon v WGS84")] = None,
    r: Annotated[float, Query(gt=0, le=50_000, description="polomer v metroch")] = 2000,
    category: str | None = None,
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
):
    if near:
        lat, lon = _parse_near(near)
        hits = repo.pois_near(lat, lon, r, limit)
        return [h for h in hits if category in (None, h.category)]
    return repo.list_pois(category, limit)


@router.get("/{slug}", response_model=Poi, summary="Detail POI")
def get_poi(slug: str, repo: Repo) -> Poi:
    poi = repo.get_poi(slug)
    if poi is None:
        raise HTTPException(status_code=404, detail=f"POI '{slug}' neexistuje")
    return poi
