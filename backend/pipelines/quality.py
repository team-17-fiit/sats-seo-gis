"""Quality score POI (rovnica 5.1 dokumentácie): Q = 100 * Σ w_j * f_j, Σ w_j = 1.

Čistá funkcia bez DB – používa ju promote aj unit testy.
"""

from __future__ import annotations

WEIGHTS: dict[str, float] = {
    "name_sk": 0.20,
    "name_en": 0.15,
    "wikidata": 0.20,
    "description": 0.15,
    "website": 0.10,
    "licence_clear": 0.20,
}

PUBLISH_THRESHOLD = 40  # pod týmto skóre ostáva POI ako 'candidate'

assert abs(sum(WEIGHTS.values()) - 1.0) < 1e-9


def quality_score(features: dict[str, object]) -> int:
    """features: hodnoty sú truthy/falsy alebo čísla 0..1 (normalizované)."""
    total = 0.0
    for key, weight in WEIGHTS.items():
        value = features.get(key)
        if isinstance(value, bool) or value is None:
            f = 1.0 if value else 0.0
        elif isinstance(value, (int, float)):
            f = min(max(float(value), 0.0), 1.0)
        else:
            f = 1.0 if str(value).strip() else 0.0
        total += weight * f
    return round(100 * total)


def tier_for(category: str, has_wikidata: bool, unesco: bool = False) -> int:
    """T1 flagship (UNESCO), T2 notable (s Wikidata), T3 ostatné / služby."""
    if unesco:
        return 1
    if has_wikidata:
        return 2
    return 3
