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

describe('siteVerification', () => {
  it('bez tokenov nevráti nič, aby sa nevypísal prázdny meta tag', async () => {
    const { siteVerification } = await load();
    expect(siteVerification(undefined, '  ')).toBeUndefined();
  });

  it('Google token dá do google, Bing token do msvalidate.01', async () => {
    const { siteVerification } = await load();
    expect(siteVerification(' g-token ', 'b-token')).toEqual({
      google: 'g-token',
      other: { 'msvalidate.01': 'b-token' },
    });
  });

  it('stačí iba jeden z tokenov', async () => {
    const { siteVerification } = await load();
    expect(siteVerification('g-token')).toEqual({ google: 'g-token' });
    expect(siteVerification('', 'b-token')).toEqual({ other: { 'msvalidate.01': 'b-token' } });
  });

  it('číta tokeny z prostredia', async () => {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION', 'z-env');
    vi.stubEnv('NEXT_PUBLIC_BING_SITE_VERIFICATION', '');
    const { SITE_VERIFICATION } = await import('./site');
    expect(SITE_VERIFICATION).toEqual({ google: 'z-env' });
  });
});

describe('TILES_URL', () => {
  it('bez vyrobených dlaždíc (lokálne, CI) je null – mapa kreslí len JSON vrstvy', async () => {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_TILES', '');
    const { TILES_URL } = await import('./site');
    expect(TILES_URL).toBeNull();
  });

  it('pri nasadení ukazuje na súbor pod podcestou webu', async () => {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_TILES', '1');
    vi.stubEnv('NEXT_PUBLIC_BASE_PATH', '/sats-seo-gis');
    const { TILES_URL } = await import('./site');
    expect(TILES_URL).toBe('/sats-seo-gis/tiles/sats.pmtiles');
  });
});
