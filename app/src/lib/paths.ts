// Tematické trasy pre SSG. Zdroj: public/data/paths.json, ktorý vyrába `make export`
// (pipelines.export_static z PostGIS, alebo --from-seed bez DB). Číta sa len pri builde.
import fs from 'node:fs';
import path from 'node:path';
import type { FeatureCollection, LineFeature, PointFeature } from './map/types';

export type Stop = {
  slug: string;
  name_sk: string;
  name_en: string | null;
  category: string;
  unesco: boolean;
  seq: number;
  lat: number;
  lon: number;
};

export type TrailPath = {
  slug: string;
  name_sk: string;
  name_en: string;
  theme: string;
  pilot_code: 'A' | 'B' | 'C';
  difficulty: 'easy' | 'moderate' | 'hard' | 'mixed';
  length_km: number | null;
  colour: string;
  mark: string | null;
  summary_sk: string | null;
  summary_en: string | null;
  stops: Stop[];
  licence: string;
};

export const DIFFICULTY_SK: Record<TrailPath['difficulty'], string> = {
  easy: 'ľahká',
  moderate: 'stredná',
  hard: 'náročná',
  mixed: 'zmiešaná',
};

let cache: TrailPath[] | null = null;

export function parsePaths(json: unknown): TrailPath[] {
  if (!Array.isArray(json)) throw new Error('paths.json musí byť pole trás');
  return (json as TrailPath[]).map((p) => ({ ...p, stops: [...p.stops].sort((a, b) => a.seq - b.seq) }));
}

export function getPaths(): TrailPath[] {
  if (cache) return cache;
  const file = path.join(process.cwd(), 'public', 'data', 'paths.json');
  cache = parsePaths(JSON.parse(fs.readFileSync(file, 'utf8')));
  return cache;
}

export function getPath(slug: string): TrailPath | undefined {
  return getPaths().find((p) => p.slug === slug);
}

export function stopsToGeoJSON(p: TrailPath): FeatureCollection<PointFeature> {
  return {
    type: 'FeatureCollection',
    features: p.stops.map((s) => ({
      type: 'Feature',
      properties: { id: s.slug, name: s.name_sk, label: `${s.seq}. ${s.name_sk}` },
      geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
    })),
  };
}

/** Spojnica zastávok – placeholder geometria, kým nie sú OSM relácie (šprint 2-2Z). */
export function pathLineGeoJSON(p: TrailPath): FeatureCollection<LineFeature> {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { id: p.slug, name: p.name_sk },
        geometry: { type: 'LineString', coordinates: p.stops.map((s) => [s.lon, s.lat]) },
      },
    ],
  };
}

/** Stred a zoom, aby boli vidno všetky zastávky (hrubý odhad bez knižnice). */
export function viewFor(p: TrailPath): { center: [number, number]; zoom: number } {
  const lons = p.stops.map((s) => s.lon);
  const lats = p.stops.map((s) => s.lat);
  const span = Math.max(Math.max(...lons) - Math.min(...lons), (Math.max(...lats) - Math.min(...lats)) * 1.6, 0.05);
  const zoom = Math.max(5.5, Math.min(11, Math.log2(360 / span) - 1.2));
  return {
    center: [(Math.min(...lons) + Math.max(...lons)) / 2, (Math.min(...lats) + Math.max(...lats)) / 2],
    zoom: Math.round(zoom * 10) / 10,
  };
}
