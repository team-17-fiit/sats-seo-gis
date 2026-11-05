"""Geodátové kontroly exportu pre web (T2-11): app/public/data/paths.json, pois.json, peaks.geojson.

Dopĺňa SQL kontrakty v data/db/checks.sql (tie bežia nad DB). Tu sa kontroluje to, čo naozaj
ide na web – bez DB, takže to beží aj v `backend-lint-unit` a pred zápisom v `export_static`.

    python -m pipelines.geocheck            # kontrola súborov v app/public/data, exit 1 pri chybe

Úroveň `error` zhodí beh, `warn` sa len vypíše (dáta treba skontrolovať, ale nie sú rozbité).
"""

from __future__ import annotations

import json
import sys
from dataclasses import dataclass
from pathlib import Path

from .common import APP_DATA_DIR, in_slovakia_bbox
from .network import distance_m

GAP_M = 50  # max. medzera medzi koncom úseku a začiatkom ďalšieho / zastávkou
STOP_TO_LINE_M = 200  # zastávka musí byť takto blízko čiary svojej trasy
DUPLICATE_M = 50  # rovnaký názov bližšie ako toto = pravdepodobne duplicitné miesto
LENGTH_TOLERANCE = 0.25  # dĺžka trasy z geometrie vs. length_km (len varovanie)
ELEVATION_RANGE = (90, 2660)  # najnižší bod SR ~94 m (Klin nad Bodrogom), najvyšší 2655 m (Gerlach)

Coord = list[float]  # [lon, lat]


@dataclass(frozen=True)
class Issue:
    level: str  # "error" | "warn"
    code: str
    where: str
    detail: str

    def __str__(self) -> str:
        mark = "✗" if self.level == "error" else "⚠"
        return f"  {mark} {self.code} [{self.where}]: {self.detail}"


def _pt(lon: float, lat: float) -> tuple[float, float]:
    return (lon, lat)


def _bad_coord(c) -> bool:
    """Bod mimo SR alebo s prehodeným lat/lon (prehodené súradnice SR padnú mimo bbox)."""
    return not (isinstance(c, list | tuple) and len(c) >= 2 and in_slovakia_bbox(c[0], c[1]))


def _point_to_segment_m(p: Coord, a: Coord, b: Coord) -> float:
    """Vzdialenosť bodu od úsečky a-b v metroch (lokálna rovinná projekcia)."""
    import math

    k = math.cos(math.radians(p[1])) * 111_320
    ax, ay = (a[0] - p[0]) * k, (a[1] - p[1]) * 111_320
    bx, by = (b[0] - p[0]) * k, (b[1] - p[1]) * 111_320
    dx, dy = bx - ax, by - ay
    seg2 = dx * dx + dy * dy
    t = 0.0 if seg2 == 0 else max(0.0, min(1.0, -(ax * dx + ay * dy) / seg2))
    return math.hypot(ax + t * dx, ay + t * dy)


def _distance_to_lines_m(p: Coord, lines: list[list[Coord]]) -> float:
    best = float("inf")
    for line in lines:
        if len(line) == 1:
            best = min(best, distance_m(_pt(*p[:2]), _pt(*line[0][:2])))
        for a, b in zip(line, line[1:], strict=False):
            best = min(best, _point_to_segment_m(p, a, b))
    return best


def _line_length_km(line: list[Coord]) -> float:
    return sum(distance_m(_pt(*a[:2]), _pt(*b[:2])) for a, b in zip(line, line[1:], strict=False)) / 1000


def check_paths(paths: list[dict]) -> list[Issue]:
    issues: list[Issue] = []
    seen: set[str] = set()
    for path in paths:
        slug = path.get("slug", "?")
        if slug in seen:
            issues.append(Issue("error", "path_duplicate_slug", slug, "slug trasy sa opakuje"))
        seen.add(slug)

        stops = path.get("stops") or []
        if len(stops) < 2:
            issues.append(Issue("error", "path_too_few_stops", slug, f"{len(stops)} zastávok, treba aspoň 2"))
        seqs = [s.get("seq") for s in stops]
        if seqs != list(range(1, len(stops) + 1)):
            issues.append(Issue("error", "path_stop_seq_invalid", slug, f"poradie zastávok {seqs} nie je 1..n"))
        for s in stops:
            if _bad_coord([s.get("lon"), s.get("lat")]):
                issues.append(
                    Issue(
                        "error",
                        "stop_outside_slovakia",
                        f"{slug}/{s.get('slug')}",
                        f"lat={s.get('lat')}, lon={s.get('lon')}",
                    )
                )

        segments = path.get("segments") or []
        if not segments:
            continue  # trasa bez geometrie = web kreslí priamky; to nie je chyba dát
        if len(segments) > max(len(stops) - 1, 0):
            issues.append(
                Issue("error", "path_too_many_segments", slug, f"{len(segments)} úsekov na {len(stops)} zastávok")
            )
        for i, line in enumerate(segments, start=1):
            if len(line) < 2:
                issues.append(Issue("error", "segment_degenerate", f"{slug}#{i}", f"{len(line)} bodov"))
            bad = [c for c in line if _bad_coord(c)]
            if bad:
                issues.append(
                    Issue(
                        "error", "segment_outside_slovakia", f"{slug}#{i}", f"{len(bad)} bodov mimo SR, napr. {bad[0]}"
                    )
                )
        if any(len(line) < 2 for line in segments) or any(_bad_coord(c) for line in segments for c in line):
            continue  # ďalšie merania by nad rozbitou geometriou nedávali zmysel

        for i, (a, b) in enumerate(zip(segments, segments[1:], strict=False), start=1):
            gap = distance_m(_pt(*a[-1][:2]), _pt(*b[0][:2]))
            if gap > GAP_M:
                issues.append(
                    Issue("error", "segment_gap", f"{slug}#{i}->{i + 1}", f"medzera {gap:.0f} m (limit {GAP_M} m)")
                )
        if stops:
            first, last = stops[0], stops[-1]
            d0 = distance_m(_pt(first["lon"], first["lat"]), _pt(*segments[0][0][:2]))
            d1 = distance_m(_pt(last["lon"], last["lat"]), _pt(*segments[-1][-1][:2]))
            if d0 > GAP_M or d1 > GAP_M:
                issues.append(
                    Issue(
                        "error",
                        "path_ends_off_stops",
                        slug,
                        f"začiatok {d0:.0f} m od 1. zastávky, koniec {d1:.0f} m od poslednej (limit {GAP_M} m)",
                    )
                )
        for s in stops:
            d = _distance_to_lines_m([s["lon"], s["lat"]], segments)
            if d > STOP_TO_LINE_M:
                issues.append(
                    Issue(
                        "error",
                        "stop_far_from_path",
                        f"{slug}/{s.get('slug')}",
                        f"{d:.0f} m od čiary trasy (limit {STOP_TO_LINE_M} m)",
                    )
                )

        declared = path.get("length_km")
        if declared:
            measured = sum(_line_length_km(line) for line in segments)
            if abs(measured - float(declared)) > LENGTH_TOLERANCE * float(declared):
                issues.append(
                    Issue(
                        "warn",
                        "path_length_mismatch",
                        slug,
                        f"geometria {measured:.0f} km vs. length_km {float(declared):.0f} km",
                    )
                )
    return issues


def check_pois(pois: list[dict]) -> list[Issue]:
    issues: list[Issue] = []
    seen: set[str] = set()
    lo, hi = ELEVATION_RANGE
    for p in pois:
        slug = p.get("slug", "?")
        if slug in seen:
            issues.append(Issue("error", "poi_duplicate_slug", slug, "slug miesta sa opakuje"))
        seen.add(slug)
        if _bad_coord([p.get("lon"), p.get("lat")]):
            issues.append(Issue("error", "poi_outside_slovakia", slug, f"lat={p.get('lat')}, lon={p.get('lon')}"))
        ele = p.get("elevation_m")
        if ele is not None and not lo <= float(ele) <= hi:
            issues.append(Issue("warn", "poi_elevation_implausible", slug, f"{ele} m mimo {lo}–{hi} m"))

    named = [p for p in pois if p.get("name_sk") and not _bad_coord([p.get("lon"), p.get("lat")])]
    for i, a in enumerate(named):
        for b in named[i + 1 :]:
            if a["name_sk"].strip().lower() != b["name_sk"].strip().lower():
                continue
            d = distance_m(_pt(a["lon"], a["lat"]), _pt(b["lon"], b["lat"]))
            if d <= DUPLICATE_M:
                issues.append(
                    Issue(
                        "warn", "poi_duplicate_nearby", f"{a['slug']}={b['slug']}", f"rovnaký názov, {d:.0f} m od seba"
                    )
                )
    return issues


def check_peaks(geojson: dict) -> list[Issue]:
    issues: list[Issue] = []
    for f in geojson.get("features", []):
        name = (f.get("properties") or {}).get("name", "?")
        geom = f.get("geometry") or {}
        if geom.get("type") != "Point" or _bad_coord(geom.get("coordinates")):
            issues.append(Issue("error", "peak_invalid_point", name, f"{geom.get('type')} {geom.get('coordinates')}"))
    return issues


def check_export(paths: list[dict], pois: list[dict], peaks: dict | None = None) -> list[Issue]:
    issues = check_paths(paths) + check_pois(pois)
    if peaks is not None:
        issues += check_peaks(peaks)
    return issues


def report(issues: list[Issue]) -> int:
    """Vypíše nálezy, vráti počet chýb (varovania sa nerátajú)."""
    for issue in issues:
        print(issue)
    errors = sum(i.level == "error" for i in issues)
    warns = len(issues) - errors
    print(f"Geokontrola exportu: {errors} chýb, {warns} varovaní")
    return errors


def _load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def main(data_dir: Path = APP_DATA_DIR) -> None:
    peaks_file = data_dir / "peaks.geojson"
    issues = check_export(
        _load(data_dir / "paths.json"),
        _load(data_dir / "pois.json"),
        _load(peaks_file) if peaks_file.exists() else None,
    )
    if report(issues):
        sys.exit(1)


if __name__ == "__main__":
    main()
