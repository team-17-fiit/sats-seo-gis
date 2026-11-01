"""Najkratšia cesta po sieti ciest a chodníkov z OSM (staging.osm_way) medzi dvoma zastávkami.

Bez ďalších knižníc: sieť sa načíta len v koridore okolo spojnice zastávok a prejde Dijkstrovým
algoritmom (heapq). Uzly siete sú spoločné body ciest (rovnaké súradnice = rovnaký OSM uzol).
"""

from __future__ import annotations

import heapq
import json
import math

SNAP_M = 1500  # zastávka (stred obce, hrad…) musí byť do 1,5 km od siete
CORRIDORS = (0.3, 0.7)  # šírka koridoru ako podiel vzdialenosti zastávok; pri neúspechu širší
MIN_CORRIDOR_M = 3000
# Hlavným cestám sa trasa radšej vyhne (autá); ostatné cesty a chodníky sú rovnocenné.
COST = {"primary": 2.0, "primary_link": 2.0, "secondary": 1.5, "secondary_link": 1.5}

Point = tuple[float, float]  # (lon, lat)


def distance_m(a: Point, b: Point) -> float:
    """Vzdialenosť v metroch (rovinná aproximácia, na desiatky km stačí)."""
    k = math.cos(math.radians((a[1] + b[1]) / 2))
    return math.hypot((a[0] - b[0]) * k, a[1] - b[1]) * 111_320


def load_graph(cur, a: Point, b: Point, width_m: float) -> dict[Point, list[tuple[Point, float]]]:
    """Cesty v koridore okolo spojnice a-b -> graf {uzol: [(sused, cena), …]}."""
    width_deg = width_m / 74_000  # 1° dĺžky ≈ 74 km na Slovensku -> koridor skôr širší ako užší
    cur.execute(
        """SELECT highway, ST_AsGeoJSON(geom, 6) FROM staging.osm_way
           WHERE ST_DWithin(geom, ST_MakeLine(ST_SetSRID(ST_MakePoint(%s, %s), 4326),
                                              ST_SetSRID(ST_MakePoint(%s, %s), 4326)), %s)""",
        (a[0], a[1], b[0], b[1], width_deg),
    )
    graph: dict[Point, list[tuple[Point, float]]] = {}
    for highway, geojson in cur.fetchall():
        factor = COST.get(highway, 1.0)
        coords = [tuple(c) for c in json.loads(geojson)["coordinates"]]
        for u, v in zip(coords, coords[1:], strict=False):
            cost = distance_m(u, v) * factor
            graph.setdefault(u, []).append((v, cost))
            graph.setdefault(v, []).append((u, cost))
    return graph


def shortest_path(graph: dict[Point, list[tuple[Point, float]]], a: Point, b: Point) -> list[Point] | None:
    """Dijkstra zo všetkých uzlov pri zastávke a do ktoréhokoľvek uzla pri zastávke b.

    Viac štartov aj cieľov (do SNAP_M, cena = vzdialenosť k zastávke) rieši aj to, že najbližší
    uzol môže byť na odtrhnutom kúsku cesty (nádvorie hradu, parkovisko)."""
    targets = {n: distance_m(n, b) for n in graph if distance_m(n, b) <= SNAP_M}
    if not targets:
        return None
    dist: dict[Point, float] = {}
    prev: dict[Point, Point] = {}
    heap = [(distance_m(n, a), n) for n in graph if distance_m(n, a) <= SNAP_M]
    for d, n in heap:
        dist[n] = d
    heapq.heapify(heap)
    best, best_node = math.inf, None
    while heap:
        d, u = heapq.heappop(heap)
        if d > dist.get(u, math.inf):
            continue
        if d >= best:
            break
        if u in targets and d + targets[u] < best:
            best, best_node = d + targets[u], u
        for v, cost in graph[u]:
            nd = d + cost
            if nd < dist.get(v, math.inf):
                dist[v], prev[v] = nd, u
                heapq.heappush(heap, (nd, v))
    if best_node is None:
        return None
    line = [best_node]
    while line[-1] in prev:
        line.append(prev[line[-1]])
    line.reverse()
    return line if len(line) >= 2 else None


def route_between(cur, a: Point, b: Point) -> list[Point] | None:
    """Čiara po OSM sieti z a do b, alebo None (vtedy ostane priamka)."""
    straight = distance_m(a, b)
    for share in CORRIDORS:
        graph = load_graph(cur, a, b, max(MIN_CORRIDOR_M, straight * share))
        line = shortest_path(graph, a, b)
        if line:
            return [a, *line, b]  # napojenie na zastávky, aby na seba úseky nadväzovali
    return None
