"""GeoNames dump SK -> canonical.geonames_place (T1-06).

Formát: TSV s 19 stĺpcami (https://download.geonames.org/export/dump/readme.txt).

    python -m pipelines.load_geonames
    python -m pipelines.load_geonames --fixture
"""

from __future__ import annotations

import argparse
import csv
import io
import sys
import zipfile
from collections.abc import Iterable, Iterator

from .common import FIXTURES_DIR, RAW_DIR, connect, in_slovakia_bbox, mark_fetched, source_ids

# P = sídla, T = hory/vrchy, H = vody, L = oblasti/parky, S = stavby
FEATURE_CLASSES = {"P", "T", "H", "L", "S"}


def _int(value: str) -> int | None:
    return int(value) if value.strip().lstrip("-").isdigit() else None


def parse(lines: Iterable[str]) -> Iterator[dict]:
    reader = csv.reader(lines, delimiter="\t", quoting=csv.QUOTE_NONE)
    for row in reader:
        if len(row) < 19 or row[6] not in FEATURE_CLASSES:
            continue
        lat, lon = float(row[4]), float(row[5])
        if not in_slovakia_bbox(lon, lat):
            continue
        yield {
            "geonameid": int(row[0]),
            "name": row[1],
            "asciiname": row[2],
            "lat": lat,
            "lon": lon,
            "feature_class": row[6],
            "feature_code": row[7],
            "admin1": row[10] or None,
            "population": _int(row[14]),
            "elevation": _int(row[15]) if row[15] else _int(row[16]),
        }


def read_lines(path) -> Iterable[str]:
    if path.suffix == ".zip":
        with zipfile.ZipFile(path) as zf:
            return io.TextIOWrapper(zf.open("SK.txt"), encoding="utf-8").read().splitlines()
    return path.read_text(encoding="utf-8").splitlines()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--fixture", action="store_true")
    args = parser.parse_args()
    path = FIXTURES_DIR / "geonames" / "SK.txt" if args.fixture else RAW_DIR / "SK.zip"
    if not path.exists():
        sys.exit(f"Chýba {path}. Spusť `make fetch` alebo použi --fixture.")

    rows = list(parse(read_lines(path)))
    with connect() as conn, conn.cursor() as cur:
        src_id, lic_id = source_ids(cur, "geonames")
        cur.executemany(
            """
            INSERT INTO canonical.geonames_place
              (geonameid, name, asciiname, feature_class, feature_code, admin1, population, elevation,
               geom, source_id, licence_id)
            VALUES (%(geonameid)s, %(name)s, %(asciiname)s, %(feature_class)s, %(feature_code)s,
                    %(admin1)s, %(population)s, %(elevation)s,
                    ST_SetSRID(ST_MakePoint(%(lon)s, %(lat)s), 4326), %(src)s, %(lic)s)
            ON CONFLICT (geonameid) DO UPDATE SET
              name = EXCLUDED.name, population = EXCLUDED.population, geom = EXCLUDED.geom
            """,
            [{**r, "src": src_id, "lic": lic_id} for r in rows],
        )
        mark_fetched(cur, "geonames")
        conn.commit()
    print(f"GeoNames: {len(rows)} miest")


if __name__ == "__main__":
    main()
