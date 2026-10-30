"""Extract: stiahne surové zdroje do data/raw/ a zapíše SHA256 (T1-05, T1-06).

python -m pipelines.fetch                 # všetko
python -m pipelines.fetch --only geonames,ne_admin0
"""

from __future__ import annotations

import argparse
import hashlib
import shutil
import urllib.request

from .common import RAW_DIR

SOURCES: dict[str, tuple[str, str]] = {
    # kľúč: (url, cieľový súbor v data/raw)
    "osm": ("https://download.geofabrik.de/europe/slovakia-latest.osm.pbf", "slovakia-latest.osm.pbf"),
    "ne_admin0": (
        "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries.geojson",
        "ne_10m_admin_0_countries.geojson",
    ),
    "ne_admin1": (
        "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson",
        "ne_10m_admin_1_states_provinces.geojson",
    ),
    "geonames": ("https://download.geonames.org/export/dump/SK.zip", "SK.zip"),
    # rurAllure DS1/DS6: doplniť URL zo Zenodo (data/SOURCES.md), dovtedy fixtures
}


def sha256_of(path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def download(key: str) -> str:
    url, name = SOURCES[key]
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    target = RAW_DIR / name
    tmp = target.with_suffix(target.suffix + ".part")
    print(f"↓ {key}: {url}")
    with urllib.request.urlopen(url, timeout=120) as resp, open(tmp, "wb") as out:
        shutil.copyfileobj(resp, out)
    tmp.replace(target)
    digest = sha256_of(target)
    with open(RAW_DIR / "CHECKSUMS.txt", "a", encoding="utf-8") as log:
        log.write(f"{digest}  {name}\n")
    print(f"  ✓ {name} sha256={digest[:16]}…")
    return digest


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--only", help="čiarkou oddelené kľúče: " + ",".join(SOURCES))
    args = parser.parse_args()
    keys = args.only.split(",") if args.only else list(SOURCES)
    for key in keys:
        download(key.strip())


if __name__ == "__main__":
    main()
