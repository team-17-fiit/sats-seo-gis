"""Aplikuje SQL migrácie z data/db/migrations v poradí podľa názvu (idempotentné).

python -m pipelines.migrate
"""

from __future__ import annotations

from .common import MIGRATIONS_DIR, connect


def main() -> None:
    files = sorted(MIGRATIONS_DIR.glob("*.sql"))
    with connect() as conn:
        for f in files:
            conn.execute(f.read_text(encoding="utf-8"))
            print(f"  ✓ {f.name}")
        conn.commit()
    print(f"Migrácie aplikované: {len(files)}")


if __name__ == "__main__":
    main()
