// Načítanie vrcholov z public/data/peaks.geojson v čase buildu (len na serveri/pri generovaní).
// Z jedného zdroja dát vzniká: zoznam na úvodnej stránke, vrstva na mape aj podstránky vrcholov.
import fs from 'node:fs';
import path from 'node:path';

export type Peak = {
  slug: string;
  name: string;
  elevation: number; // m n. m.
  lat: number;
  lon: number;
};

export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // odstráni diakritiku
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

let cache: Peak[] | null = null;

export function getPeaks(): Peak[] {
  if (cache) return cache;
  const file = path.join(process.cwd(), 'public', 'data', 'peaks.geojson');
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  const used = new Set<string>();
  const peaks: Peak[] = [];

  for (const f of json.features ?? []) {
    const name = f?.properties?.name;
    const coords = f?.geometry?.coordinates;
    if (typeof name !== 'string' || f?.geometry?.type !== 'Point' || !Array.isArray(coords)) continue;
    let slug = slugify(name);
    for (let i = 2; used.has(slug); i++) slug = `${slugify(name)}-${i}`;
    used.add(slug);
    peaks.push({
      slug,
      name,
      elevation: Number(f.properties.elevation),
      lon: Number(coords[0]),
      lat: Number(coords[1]),
    });
  }
  cache = peaks.sort((a, b) => b.elevation - a.elevation);
  return cache;
}

export function getPeak(slug: string): Peak | undefined {
  return getPeaks().find((p) => p.slug === slug);
}
