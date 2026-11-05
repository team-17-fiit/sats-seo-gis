"""Dátové kontrakty (data/db/checks.sql) + KPI K10 pokrytie. Exit 1 pri porušení.

python -m pipelines.validate

V checks.sql: '-- check: <názov>' = kontrakt (porušenie zhodí beh), '-- warn: <názov>' = len varovanie.
"""

from __future__ import annotations

import re
import sys

from .common import DATA_DIR, connect

CHECKS_FILE = DATA_DIR / "db" / "checks.sql"
K10_TARGET = 500


def _strip_comments(query: str) -> str:
    lines = [ln for ln in query.splitlines() if not ln.lstrip().startswith("--")]
    return "\n".join(lines).strip().rstrip(";").strip()


def parse_checks(sql: str) -> list[tuple[str, str, str]]:
    """Rozdelí checks.sql na [(názov, SELECT …, 'check'|'warn')] podľa komentárov '-- check|warn: <názov>'."""
    parts = re.split(r"^--\s*(check|warn):\s*(\S+)\s*$", sql, flags=re.MULTILINE)
    return [(parts[i + 1], _strip_comments(parts[i + 2]), parts[i]) for i in range(1, len(parts), 3)]


def main() -> None:
    failures = warnings = 0
    with connect() as conn, conn.cursor() as cur:
        for name, query, level in parse_checks(CHECKS_FILE.read_text(encoding="utf-8")):
            cur.execute(query)
            count = cur.fetchone()[0]
            mark = "✓" if count == 0 else ("✗" if level == "check" else "⚠")
            print(f"  {mark} {name}: {count}")
            failures += count != 0 and level == "check"
            warnings += count != 0 and level == "warn"

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
