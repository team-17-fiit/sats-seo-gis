import { describe, expect, it } from 'vitest';
import { breadcrumbJsonLd, peakCrumbs, placeCrumbs, trailCrumbs, trailsCrumbs } from './breadcrumbs';

const SITE = 'https://x.sk';
const urls = (c: { path: string }[]) => c.map((x) => x.path);

describe('breadcrumbs (T3-02)', () => {
  it('trail: Home › Trails › trail, in both languages', () => {
    expect(trailCrumbs('sk', { slug: 'cesta-marie', name: 'Cesta Márie' })).toEqual([
      { name: 'Domov', path: '/' },
      { name: 'Tematické trasy', path: '/trasy/' },
      { name: 'Cesta Márie', path: '/trasy/cesta-marie/' },
    ]);
    expect(urls(trailCrumbs('en', { slug: 'cesta-marie', name: 'Way of Mary' }))).toEqual([
      '/en/', '/en/trails/', '/en/trails/cesta-marie/',
    ]);
  });

  it('place: goes through its main trail, or straight to the overview without one', () => {
    const withTrail = placeCrumbs('en', { slug: 'devin', name: 'Devín' }, { slug: 'hlavna-os', name: 'Main spine' });
    expect(urls(withTrail)).toEqual(['/en/', '/en/trails/', '/en/trails/hlavna-os/', '/en/places/devin/']);
    expect(withTrail.map((c) => c.name)).toEqual(['Home', 'Thematic trails', 'Main spine', 'Devín']);
    expect(urls(placeCrumbs('sk', { slug: 'devin', name: 'Devín' }))).toEqual(['/', '/trasy/', '/miesta/devin/']);
  });

  it('peak: Home › peak', () => {
    expect(urls(peakCrumbs('sk', { slug: 'rysy', name: 'Rysy' }))).toEqual(['/', '/vrcholy/rysy/']);
  });

  it('every trail of crumbs has at least two items (Google requirement)', () => {
    expect(trailsCrumbs('sk').length).toBeGreaterThanOrEqual(2);
    expect(peakCrumbs('en', { slug: 'rysy', name: 'Rysy' }).length).toBeGreaterThanOrEqual(2);
  });

  it('JSON-LD has positions 1..n and absolute item URLs', () => {
    const ld = breadcrumbJsonLd(trailCrumbs('sk', { slug: 'cesta-marie', name: 'Cesta Márie' }), SITE);
    expect(ld['@type']).toBe('BreadcrumbList');
    expect(ld.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Domov', item: 'https://x.sk/' },
      { '@type': 'ListItem', position: 2, name: 'Tematické trasy', item: 'https://x.sk/trasy/' },
      { '@type': 'ListItem', position: 3, name: 'Cesta Márie', item: 'https://x.sk/trasy/cesta-marie/' },
    ]);
  });
});
