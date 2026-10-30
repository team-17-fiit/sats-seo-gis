"""Dátové kontrakty (data/db/checks.sql) + KPI K10 pokrytie. Exit 1 pri porušení.

python -m pipelines.validate
"""

from __future__ import annotations

import re
import sys

from .common import DATA_DIR, connect

CHECKS_FILE = DATA_DIR / "db" / "checks.sql"
K10_TARGET = 500


def parse_checks(sql: str) -> list[tuple[str, str]]:
    """Rozdelí checks.sql na [(názov, SELECT …)] podľa komentárov '-- check: <názov>'."""
    parts = re.split(r"^--\s*check:\s*(\S+)\s*$", sql, flags=re.MULTILINE)
    return [(parts[i], parts[i + 1].strip().rstrip(";")) for i in range(1, len(parts), 2)]


def main() -> None:
    failures = 0
    with connect() as conn, conn.cursor() as cur:
        for name, query in parse_checks(CHECKS_FILE.read_text(encoding="utf-8")):
            cur.execute(query)
            count = cur.fetchone()[0]
            mark = "✓" if count == 0 else "✗"
            print(f"  {mark} {name}: {count}")
            failures += count != 0

        cur.execute("SELECT count(*) FROM canonical.poi WHERE status IN ('approved', 'published')")
        k10 = cur.fetchone()[0]
        cur.execute("SELECT count(*) FROM canonical.path")
        paths = cur.fetchone()[0]
        cur.execute("SELECT count(*) FROM quarantine.rejected_row")
        quarantined = cur.fetchone()[0]
    print(f"\nK10 pokrytie: {k10} schválených POI (cieľ ≥ {K10_TARGET}), {paths} trás, karanténa {quarantined}")
    if failures:
        sys.exit(f"{failures} kontrakt(ov) porušených")


if __name__ == "__main__":
    main()
