"""rurAllure DS1 (POI, CSV/XLSX) a DS6 (trasy, GPX/GeoJSON) -> staging (T1-08, T1-09).

    python -m pipelines.load_rurallure --fixture
    python -m pipelines.load_rurallure --ds1 data/raw/rurallure_ds1.csv --ds6 data/raw/rurallure_ds6/

Riadky sa ukladajú do staging nezmenené (raw jsonb) – čistenie a licenčná brána sú v pipelines.promote.
"""

from __future__ import annotations

import argparse
import json
import math
import xml.etree.ElementTree as ET
from pathlib import Path

from .common import FIXTURES_DIR, connect, mark_fetched

# Rôzne verzie datasetov pomenúvajú stĺpce rôzne – berieme prvý, ktorý existuje.
COLUMN_ALIASES = {
    "ext_id": ["id", "poi_id", "identifier", "code"],
    "name": ["name", "title", "name_en", "nombre"],
    "category": ["category", "type", "poi_type"],
    "description": ["description", "desc", "summary"],
    "lat": ["latitude", "lat", "y"],
    "lon": ["longitude", "lon", "lng", "x"],
}


def _pick(row: dict, field: str):
    lowered = {str(k).strip().lower(): v for k, v in row.items()}
    for alias in COLUMN_ALIASES[field]:
        value = lowered.get(alias)
        if value is None or (isinstance(value, float) and math.isnan(value)) or value == "":
            continue
        return value
    return None


def _float(value) -> float | None:
    try:
        f = float(value)
    except (TypeError, ValueError):
        return None
    return None if math.isnan(f) else f


def parse_ds1(path: Path) -> list[dict]:
    import pandas as pd

    df = pd.read_excel(path) if path.suffix in {".xlsx", ".xls"} else pd.read_csv(path, dtype=str)
    rows = []
    for i, rec in enumerate(df.to_dict(orient="records")):
        raw = {k: (None if isinstance(v, float) and math.isnan(v) else v) for k, v in rec.items()}
        rows.append(
            {
                "ext_id": str(_pick(rec, "ext_id") or f"row-{i + 1}"),
                "name": _pick(rec, "name"),
                "category": _pick(rec, "category"),
                "description": _pick(rec, "description"),
                "lat": _float(_pick(rec, "lat")),
                "lon": _float(_pick(rec, "lon")),
                "raw": raw,
                "file": path.name,
            }
        )
    return rows


def _gpx_tracks(path: Path) -> list[dict]:
    ns = {"g": "http://www.topografix.com/GPX/1/1"}
    root = ET.parse(path).getroot()
    if not root.tag.endswith("gpx"):
        raise ValueError(f"{path} nie je GPX")
    if root.find("g:trk", ns) is None:  # GPX 1.0 alebo bez namespace
        ns = {"g": root.tag[1:].split("}")[0]} if root.tag.startswith("{") else {"g": ""}
    q = (lambda t: f"g:{t}") if ns["g"] else (lambda t: t)
    out = []
    for i, trk in enumerate(root.findall(q("trk"), ns)):
        name_el = trk.find(q("name"), ns)
        lines = []
        for seg in trk.findall(q("trkseg"), ns):
            pts = [[float(p.get("lon")), float(p.get("lat"))] for p in seg.findall(q("trkpt"), ns)]
            if len(pts) >= 2:
                lines.append(pts)
        if lines:
            name = name_el.text if name_el is not None else None
            out.append(
                {
                    "ext_id": f"{path.stem}-trk{i + 1}",
                    "name": name,
                    "geometry": {"type": "MultiLineString", "coordinates": lines},
                    "raw": {"name": name, "segments": len(lines)},
                    "file": path.name,
                }
            )
    return out


def _geojson_tracks(path: Path) -> list[dict]:
    data = json.loads(path.read_text(encoding="utf-8"))
    features = data.get("features", [data] if data.get("type") == "Feature" else [])
    out = []
    for i, f in enumerate(features):
        geom = f.get("geometry") or {}
        if geom.get("type") == "LineString":
            geom = {"type": "MultiLineString", "coordinates": [geom["coordinates"]]}
        if geom.get("type") != "MultiLineString":
            continue
        props = f.get("properties") or {}
        out.append(
            {
                "ext_id": str(props.get("id") or f"{path.stem}-f{i + 1}"),
                "name": props.get("name"),
                "geometry": geom,
                "raw": props,
                "file": path.name,
            }
        )
    return out


def parse_ds6(path: Path) -> list[dict]:
    files = sorted(path.iterdir()) if path.is_dir() else [path]
    out: list[dict] = []
    for f in files:
        if f.suffix.lower() == ".gpx":
            out += _gpx_tracks(f)
        elif f.suffix.lower() in {".geojson", ".json"}:
            out += _geojson_tracks(f)
    return out


def load_ds1(cur, rows: list[dict]) -> None:
    cur.executemany(
        """
        INSERT INTO staging.rurallure_ds1 (ext_id, name, category, description, lat, lon, raw, file)
        VALUES (%(ext_id)s, %(name)s, %(category)s, %(description)s, %(lat)s, %(lon)s, %(raw)s, %(file)s)
        ON CONFLICT (file, ext_id) DO UPDATE SET
          name = EXCLUDED.name, category = EXCLUDED.category, description = EXCLUDED.description,
          lat = EXCLUDED.lat, lon = EXCLUDED.lon, raw = EXCLUDED.raw, loaded_at = now()
        """,
        [{**r, "raw": json.dumps(r["raw"], default=str)} for r in rows],
    )


def load_ds6(cur, rows: list[dict]) -> None:
    cur.executemany(
        """
        INSERT INTO staging.rurallure_ds6 (ext_id, name, geom, raw, file)
        VALUES (%(ext_id)s, %(name)s, ST_SetSRID(ST_GeomFromGeoJSON(%(geometry)s), 4326), %(raw)s, %(file)s)
        ON CONFLICT (file, ext_id) DO UPDATE SET
          name = EXCLUDED.name, geom = EXCLUDED.geom, raw = EXCLUDED.raw, loaded_at = now()
        """,
        [{**r, "geometry": json.dumps(r["geometry"]), "raw": json.dumps(r["raw"], default=str)} for r in rows],
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--fixture", action="store_true", help="syntetické vzorky z data/fixtures/rurallure")
    parser.add_argument("--ds1", type=Path, help="CSV/XLSX s POI")
    parser.add_argument("--ds6", type=Path, help="GPX/GeoJSON súbor alebo priečinok")
    args = parser.parse_args()

    fx = FIXTURES_DIR / "rurallure"
    ds1 = args.ds1 or (fx / "ds1_sample.csv" if args.fixture else None)
    ds6 = args.ds6 or (fx if args.fixture else None)
    if not ds1 and not ds6:
        parser.error("zadaj --ds1/--ds6 alebo --fixture")

    with connect() as conn, conn.cursor() as cur:
        if ds1:
            rows = parse_ds1(ds1)
            load_ds1(cur, rows)
            mark_fetched(cur, "rurallure_ds1")
            print(f"DS1: {len(rows)} riadkov -> staging.rurallure_ds1")
        if ds6:
            tracks = parse_ds6(ds6)
            load_ds6(cur, tracks)
            mark_fetched(cur, "rurallure_ds6")
            print(f"DS6: {len(tracks)} trás -> staging.rurallure_ds6")
        conn.commit()


if __name__ == "__main__":
    main()
