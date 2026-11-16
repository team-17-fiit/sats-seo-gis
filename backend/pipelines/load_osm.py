"""OSM PBF ingest cez osm2pgsql flex -> staging.osm_poi, staging.osm_route (T1-05).

python -m pipelines.load_osm                      # data/raw/slovakia-latest.osm.pbf
python -m pipelines.load_osm --fixture            # malá vzorka data/fixtures/osm/sample.osm
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys

from .common import DATA_DIR, FIXTURES_DIR, RAW_DIR, connect, database_url, mark_fetched

STYLE = DATA_DIR / "osm" / "flex.lua"


def run_osm2pgsql(input_file) -> None:
    if shutil.which("osm2pgsql") is None:
        sys.exit("osm2pgsql nie je nainštalovaný (apt install osm2pgsql / brew install osm2pgsql).")
    cmd = [
        "osm2pgsql",
        "--create",
        "--output=flex",
        f"--style={STYLE}",
        f"--database={database_url()}",
        # bez --cache: osm2pgsql 2.x ho mimo --slim odmietne; predvolená cache stačí aj pre celé SR
        str(input_file),
    ]
    print("$", " ".join(c if "postgresql://" not in c else "--database=***" for c in cmd))
    subprocess.run(cmd, check=True)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--fixture", action="store_true", help="použiť syntetickú vzorku")
    parser.add_argument("--input", help="vlastný .osm/.pbf súbor")
    args = parser.parse_args()

    if args.input:
        src = args.input
    elif args.fixture:
        src = FIXTURES_DIR / "osm" / "sample.osm"
    else:
        src = RAW_DIR / "slovakia-latest.osm.pbf"
        if not src.exists():
            sys.exit(f"Chýba {src}. Spusť `python -m pipelines.fetch` alebo použi --fixture.")

    run_osm2pgsql(src)
    with connect() as conn, conn.cursor() as cur:
        mark_fetched(cur, "osm")
        cur.execute("SELECT count(*) FROM staging.osm_poi")
        pois = cur.fetchone()[0]
        cur.execute("SELECT count(*) FROM staging.osm_route")
        routes = cur.fetchone()[0]
        conn.commit()
    print(f"OSM staging: {pois} POI, {routes} trás")


if __name__ == "__main__":
    main()
