// Výber implementácie MapAdapter za behu (ADR-0003):
//  - MapLibre, keď prehliadač vie WebGL a používateľ nešetrí dáta,
//  - inak statický náhľad (žiadny ťažký JS, CLS = 0).
import type { MapAdapter } from './types';

type Env = { webgl: boolean; saveData: boolean };

export function supportsWebGL(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

export function detectEnv(): Env {
  const nav = typeof navigator !== 'undefined'
    ? (navigator as Navigator & { connection?: { saveData?: boolean } })
    : undefined;
  return { webgl: supportsWebGL(), saveData: !!nav?.connection?.saveData };
}

export function chooseAdapter(env: Env): 'maplibre' | 'static' {
  return env.webgl && !env.saveData ? 'maplibre' : 'static';
}

export async function createMap(env: Env = detectEnv()): Promise<MapAdapter> {
  if (chooseAdapter(env) === 'maplibre') {
    // dynamický import: MapLibre (~210 kB gzip) nie je v úvodnom balíku
    const { MapLibreAdapter } = await import('./maplibreAdapter');
    return new MapLibreAdapter();
  }
  const { StaticImageAdapter } = await import('./staticImageAdapter');
  return new StaticImageAdapter();
}
