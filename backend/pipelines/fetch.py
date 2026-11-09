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

# Popisný User-Agent – ŠOP SR aj Wikidata odmietajú anonymných klientov (aj predvolený Python-urllib)
USER_AGENT = "SATS-SEO-GIS/0.1 (https://github.com/team-17-fiit/sats-seo-gis)"


def _sopsr_wfs(layer: str) -> str:
    """WFS ŠOP SR (chránené územia, CC BY 4.0) – distribúcia datasetu v národnom katalógu otvorených dát."""
    return (
        "https://www.sopsr.sk/geoserver/chranene_objekty/ows?service=WFS&version=2.0.0&request=GetFeature"
        f"&typeNames=chranene_objekty:{layer}&outputFormat=application/json&srsName=EPSG:4326"
    )


def _pusr_wfs(layer: str) -> str:
    """Verejná WFS Pamiatkového úradu SR (pamiatky.sk/online-sluzby/poskytovanie-udajov)."""
    return (
        "https://gis.pamiatky.sk/project/f11bc94e12c291e6794b04d66ec0613c/?SERVICE=WFS&VERSION=1.1.0"
        f"&REQUEST=GetFeature&TYPENAME={layer}&OUTPUTFORMAT=application/vnd.geo%2Bjson&SRSNAME=EPSG:4326"
    )


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
    # ŠOP SR chránené územia – veľkoplošné a maloplošné, GeoJSON v WGS84 (T2-08)
    "sopsr_vchu": (_sopsr_wfs("chranene_uzemia_vchu"), "sopsr_chranene_uzemia_vchu.geojson"),
    "sopsr_mchu": (_sopsr_wfs("chranene_uzemia_mchu"), "sopsr_chranene_uzemia_mchu.geojson"),
    # PÚSR pamiatkové územia – PAMIS WFS, GeoJSON v WGS84 (T2-08)
    "pusr_pr": (_pusr_wfs("pamis_pamiatkove_rezervacie"), "pusr_pamiatkove_rezervacie.geojson"),
    "pusr_pz": (_pusr_wfs("pamis_pamiatkove_zony"), "pusr_pamiatkove_zony.geojson"),
    "pusr_skd": (_pusr_wfs("pamis_svetove_kulturne_dedicstvo"), "pusr_svetove_kulturne_dedicstvo.geojson"),
    # rurAllure DS1/DS6: Zenodo 10.5281/zenodo.7611876 (v2.0, CC BY 4.0) – pozri data/SOURCES.md (T1-17)
    "rurallure_ds1": (
        "https://zenodo.org/api/records/7611876/files/DS1%20POI%20info%20sheets%2003-02-2023.xlsx/content",
        "rurallure_ds1.xlsx",
    ),
    "rurallure_ds6": ("https://zenodo.org/api/records/7611876/files/DS6.zip/content", "rurallure_ds6.zip"),
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
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=120) as resp, open(tmp, "wb") as out:
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
