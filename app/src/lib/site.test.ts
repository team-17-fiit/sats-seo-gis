import { afterEach, describe, expect, it, vi } from 'vitest';

// BASE_PATH sa číta z prostredia pri importe, preto modul načítame znova pre každý prípad.
async function load(basePath?: string) {
  vi.resetModules();
  if (basePath === undefined) vi.stubEnv('NEXT_PUBLIC_BASE_PATH', '');
  else vi.stubEnv('NEXT_PUBLIC_BASE_PATH', basePath);
  return import('./site');
}

afterEach(() => vi.unstubAllEnvs());

describe('withBasePath', () => {
  it('bez podcesty (lokálne a v CI) vráti cestu bez zmeny', async () => {
    const { BASE_PATH, withBasePath } = await load();
    expect(BASE_PATH).toBe('');
    expect(withBasePath('/icons/icon-192.png')).toBe('/icons/icon-192.png');
  });

  it('na GitHub Pages pridá podcestu repozitára', async () => {
    const { withBasePath } = await load('/sats-seo-gis');
    expect(withBasePath('/')).toBe('/sats-seo-gis/');
    expect(withBasePath('/icons/icon-192.png')).toBe('/sats-seo-gis/icons/icon-192.png');
  });

  it('ignoruje lomku na konci podcesty', async () => {
    const { BASE_PATH } = await load('/sats-seo-gis/');
    expect(BASE_PATH).toBe('/sats-seo-gis');
  });
});
