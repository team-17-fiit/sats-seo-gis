// Zlučovanie blízkych bodov (clustering, T2-02) – čisté funkcie bez DOM a bez MapLibre.
// MapLibre zlučuje body sám (GeoJSON source s `cluster: true`); tu sú len spoločné nastavenia
// a jednoduchý algoritmus pre statický náhľad (StaticImageAdapter), aby sa oba adaptéry správali rovnako.
import type { ClusterSpec } from './types';

export type ClusterOptions = { radius: number; maxZoom: number };

/** Polomer zlučovania v pixeloch a zoom, od ktorého sa body už nezlučujú. */
export const CLUSTER_DEFAULTS: ClusterOptions = { radius: 50, maxZoom: 14 };

/** `cluster` z LayerSpec → konkrétne nastavenia, alebo null, ak vrstva nezlučuje. */
export function resolveClusterOptions(cluster: ClusterSpec | undefined): ClusterOptions | null {
  if (!cluster) return null;
  if (cluster === true) return { ...CLUSTER_DEFAULTS };
  return { ...CLUSTER_DEFAULTS, ...cluster };
}

export type ScreenPoint = { id: string; x: number; y: number; label: string; unesco?: boolean };
export type Cluster = { x: number; y: number; count: number; members: ScreenPoint[] };

/**
 * Hladné zlučovanie v súradniciach obrazovky: bod sa pridá do prvého zhluku, ktorého ťažisko
 * je bližšie ako `radius`, inak založí nový. Poradie výstupu = poradie vstupu (stabilné testy a SVG).
 * Pre desiatky až stovky bodov statického náhľadu stačí O(n·k).
 */
export function clusterPoints(points: ScreenPoint[], radius: number): Cluster[] {
  const clusters: Cluster[] = [];
  for (const p of points) {
    const hit = clusters.find((c) => Math.hypot(c.x - p.x, c.y - p.y) < radius);
    if (!hit) {
      clusters.push({ x: p.x, y: p.y, count: 1, members: [p] });
      continue;
    }
    hit.members.push(p);
    hit.count = hit.members.length;
    hit.x = round(hit.members.reduce((s, m) => s + m.x, 0) / hit.count);
    hit.y = round(hit.members.reduce((s, m) => s + m.y, 0) / hit.count);
  }
  return clusters;
}

const round = (n: number) => Math.round(n * 10) / 10;
