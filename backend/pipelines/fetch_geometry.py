"""Skutočná geometria trás z OSM cez verejný BRouter -> app/public/data/geom/<slug>.json.

    python -m pipelines.fetch_geometry

Pre každú dvojicu po sebe idúcich zastávok sa opýta BRouteru (brouter.de, nad OSM), kadiaľ vedie cesta,
a uloží jeden GeoJSON súbor na trasu (jedna čiara na úsek medzi zastávkami). Súbory sa commitujú do gitu
ako paths.json; skript stačí spustiť znova, keď sa zmenia zastávky. Geometria je © OpenStreetMap (ODbL).
"""

from __future__ import annotations

import json
import time
import urllib.parse
import urllib.request

from .common import APP_DATA_DIR
from .seed_paths import load_seed

BROUTER_URL = "https://brouter.de/brouter"
GEOM_DIR = APP_DATA_DIR / "geom"
# téma trasy -> profil BRouteru (turistický profil uprednostňuje značené chodníky)
PROFILE = {"cycling": "trekking", "museums": "car-fast"}
DEFAULT_PROFILE = "hiking-mountain"


def route(a: dict, b: dict, profile: str) -> list[list[float]]:
    """Čiara [[lon, lat], …] zo zastávky a do zastávky b."""
    query = urllib.parse.urlencode(
        {"lonlats": f"{a['lon']},{a['lat']}|{b['lon']},{b['lat']}", "profile": profile, "format": "geojson"}
    )
    with urllib.request.urlopen(f"{BROUTER_URL}?{query}", timeout=120) as r:
        coords = json.load(r)["features"][0]["geometry"]["coordinates"]
    # BRouter pridáva výšku, tú nepotrebujeme; 5 desatinných miest = presnosť ~1 m, menší súbor
    return [[round(lon, 5), round(lat, 5)] for lon, lat, *_ in coords]


def main() -> None:
    seed = load_seed()
    pois = {p["slug"]: p for p in seed["pois"]}
    GEOM_DIR.mkdir(exist_ok=True)
    for path in seed["paths"]:
        profile = PROFILE.get(path["theme"], DEFAULT_PROFILE)
        features = []
        for seq, (a, b) in enumerate(zip(path["stops"], path["stops"][1:], strict=False), start=1):
            coords = route(pois[a], pois[b], profile)
            features.append(
                {
                    "type": "Feature",
                    "properties": {"seq": seq, "from": a, "to": b},
                    "geometry": {"type": "LineString", "coordinates": coords},
                }
            )
            time.sleep(1)  # verejný server – nezahlcovať
        out = GEOM_DIR / f"{path['slug']}.json"
        out.write_text(json.dumps({"type": "FeatureCollection", "features": features}) + "\n", encoding="utf-8")
        print(f"  ✓ {path['slug']}: {len(features)} úsekov ({profile})")


if __name__ == "__main__":
    main()
