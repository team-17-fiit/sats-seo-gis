"""FilePoiRepository – číta data/seed/paths.json. Pre unit testy a beh bez Dockeru."""

from __future__ import annotations

import json
import math
from pathlib import Path

from ..models import PathDetail, PathSummary, Poi, PoiNear, Stop

SEED = Path(__file__).resolve().parents[3] / "data" / "seed" / "paths.json"
EARTH_RADIUS_M = 6_371_008.8


def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * EARTH_RADIUS_M * math.asin(math.sqrt(a))


class FilePoiRepository:
    name = "file"

    def __init__(self, seed_path: Path = SEED):
        data = json.loads(seed_path.read_text(encoding="utf-8"))
        self._licence = data["_meta"]["licence"]
        self._source = data["_meta"]["source"]
        self._raw_pois = {p["slug"]: p for p in data["pois"]}
        self._raw_paths = data["paths"]
        self._paths_of: dict[str, list[str]] = {}
        for path in self._raw_paths:
            for stop in path["stops"]:
                self._paths_of.setdefault(stop, []).append(path["slug"])

    def ping(self) -> str:
        return "ok"

    def _poi(self, raw: dict) -> Poi:
        return Poi(
            slug=raw["slug"],
            name_sk=raw["name_sk"],
            name_en=raw.get("name_en"),
            category=raw["category"],
            tier=1,
            unesco=bool(raw.get("unesco")),
            lat=raw["lat"],
            lon=raw["lon"],
            source=self._source,
            licence=self._licence,
            paths=sorted(self._paths_of.get(raw["slug"], [])),
        )

    def _summary(self, p: dict) -> dict:
        return {
            "slug": p["slug"],
            "name_sk": p["name_sk"],
            "name_en": p["name_en"],
            "theme": p["theme"],
            "pilot_code": p["pilot"],
            "difficulty": p["difficulty"],
            "length_km": p.get("length_km"),
            "colour": p["colour"],
            "stop_count": len(p["stops"]),
        }

    def list_paths(self) -> list[PathSummary]:
        return [PathSummary(**self._summary(p)) for p in self._raw_paths]

    def get_path(self, slug: str) -> PathDetail | None:
        p = next((x for x in self._raw_paths if x["slug"] == slug), None)
        if p is None:
            return None
        stops = []
        for seq, s in enumerate(p["stops"], start=1):
            raw = self._raw_pois[s]
            stops.append(
                Stop(
                    slug=s,
                    name_sk=raw["name_sk"],
                    name_en=raw.get("name_en"),
                    category=raw["category"],
                    unesco=bool(raw.get("unesco")),
                    seq=seq,
                    lat=raw["lat"],
                    lon=raw["lon"],
                )
            )
        return PathDetail(
            **self._summary(p),
            mark=p.get("mark"),
            summary_sk=p.get("summary_sk"),
            summary_en=p.get("summary_en"),
            licence=self._licence,
            stops=stops,
        )

    def list_pois(self, category: str | None, limit: int) -> list[Poi]:
        pois = [self._poi(r) for r in self._raw_pois.values() if category in (None, r["category"])]
        return sorted(pois, key=lambda p: p.slug)[:limit]

    def get_poi(self, slug: str) -> Poi | None:
        raw = self._raw_pois.get(slug)
        return self._poi(raw) if raw else None

    def pois_near(self, lat: float, lon: float, radius_m: float, limit: int) -> list[PoiNear]:
        hits = []
        for raw in self._raw_pois.values():
            d = haversine_m(lat, lon, raw["lat"], raw["lon"])
            if d <= radius_m:
                hits.append(PoiNear(**self._poi(raw).model_dump(), distance_m=round(d, 1)))
        return sorted(hits, key=lambda p: p.distance_m)[:limit]
