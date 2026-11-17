"""Vektorové dlaždice PMTiles z exportovaných vrstiev (T3-08, kap. 5.1.3).

data/processed/tiles/<vrstva>.geojsonl (z pipelines.export_tiles) -> data/processed/tiles/sats.pmtiles
cez tippecanoe, zoom z5–z15. Vrstvy v dlaždiciach majú rovnaké mená ako súbory (paths, pois).
Výsledok je build artefakt (nie je v gite, *.pmtiles v .gitignore); rovnaké vstupy dajú rovnaké dlaždice.

    python -m pipelines.build_tiles            # vyžaduje tippecanoe >= 2.17 (výstup .pmtiles)
    TIPPECANOE=/cesta/k/tippecanoe python -m pipelines.build_tiles

tippecanoe nie je pre Windows; v Git Bash ho spusti cez WSL alebo použi CI.
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

from .export_tiles import LAYERS, OUT_DIR

OUTPUT = OUT_DIR / "sats.pmtiles"
MIN_ZOOM, MAX_ZOOM = 5, 15
NAME = "SATS-SEO-GIS"
DESCRIPTION = "Tematické trasy a miesta na Slovensku (vrstvy paths, pois)"


def licences(inputs: list[Path]) -> list[str]:
    """Kódy licencií všetkých prvkov – idú do atribúcie dlaždíc (každý prvok nesie svoju licenciu)."""
    codes: set[str] = set()
    for path in inputs:
        with open(path, encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    codes.add(json.loads(line)["properties"]["licence"])
    return sorted(codes)


def attribution(codes: list[str]) -> str:
    text = "© OpenStreetMap contributors"
    return f"{text} · {NAME} ({', '.join(codes)})" if codes else text


def build_command(binary: str, inputs: list[Path], output: Path, codes: list[str]) -> list[str]:
    """Príkaz pre tippecanoe. Čistá funkcia, aby sa dala testovať bez nainštalovaného tippecanoe."""
    cmd = [
        binary,
        f"--output={output}",
        "--force",
        f"--minimum-zoom={MIN_ZOOM}",
        f"--maximum-zoom={MAX_ZOOM}",
        f"--name={NAME}",
        f"--description={DESCRIPTION}",
        f"--attribution={attribution(codes)}",
        "--read-parallel",  # vstup je GeoJSON po riadkoch
        # body: pri hustých miestach radšej vynechať menej dôležité, než prekročiť limit dlaždice;
        # minzoom POI podľa tieru (T1 z5, T2 z9, T3 z12) nastavuje už export_tiles
        "--drop-densest-as-needed",
        "--extend-zooms-if-still-dropping",
        "--quiet",
    ]
    for path in inputs:
        cmd.append(f"--named-layer={path.stem}:{path}")
    return cmd


def find_tippecanoe() -> str | None:
    return os.environ.get("TIPPECANOE") or shutil.which("tippecanoe")


def main() -> None:
    inputs = [OUT_DIR / f"{layer}.geojsonl" for layer in LAYERS]
    missing = [str(p) for p in inputs if not p.exists()]
    if missing:
        sys.exit(f"Chýba: {missing}. Najprv spusti `python -m pipelines.export_tiles` (make export).")
    binary = find_tippecanoe()
    if not binary:
        sys.exit("tippecanoe nie je nainštalované: https://github.com/felt/tippecanoe#installation (alebo TIPPECANOE=)")

    codes = licences(inputs)
    subprocess.run(build_command(binary, inputs, OUTPUT, codes), check=True)
    print(f"Dlaždice: {OUTPUT} ({OUTPUT.stat().st_size / 1024:.0f} kB, z{MIN_ZOOM}–z{MAX_ZOOM}, licencie {codes})")


if __name__ == "__main__":
    main()
