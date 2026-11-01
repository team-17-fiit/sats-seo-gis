import { describe, expect, it } from 'vitest';
import { getPaths } from './paths';
import {
  categoryLabel, categorySk, getPoi, getPois, parsePois, poiDescription, poiJsonLd, poiName, poiToGeoJSON, schemaTypes,
  type Poi,
} from './pois';

const sample: Poi = {
  slug: 'devin', name_sk: 'Devín', name_en: 'Devín castle', category: 'castle', tier: 1, unesco: false,
  lat: 48.17, lon: 16.98, elevation_m: null, wikidata_id: null, description_sk: null, description_en: null,
  source: 'team_curated', licence: 'CC-BY-4.0', attribution: null, paths: ['hlavna-os'],
};

describe('pois data', () => {
  // vyžaduje app/public/data/pois.json (python -m pipelines.export_static --from-seed)
  it('every stop of every path has its own T1 place page', () => {
    const slugs = new Set(getPois().map((p) => p.slug));
    for (const path of getPaths()) for (const s of path.stops) expect(slugs.has(s.slug)).toBe(true);
    expect(getPois().every((p) => p.tier === 1)).toBe(true);
  });

  it('back-links each place to the paths it lies on', () => {
    const p = getPoi('devin');
    expect(p?.paths).toContain('hlavna-os');
  });

  it('rejects non-array input and duplicate slugs', () => {
    expect(() => parsePois({})).toThrow();
    expect(() => parsePois([sample, sample])).toThrow(/duplicitný/);
  });
});

describe('pois helpers', () => {
  it('translates categories and falls back to the code', () => {
    expect(categorySk('castle')).toBe('hrad');
    expect(categorySk('unknown-kind')).toBe('unknown-kind');
  });

  it('always puts TouristAttraction first in schema.org types', () => {
    expect(schemaTypes('church')).toEqual(['TouristAttraction', 'Church']);
    expect(schemaTypes('gorge')).toEqual(['TouristAttraction']);
  });

  it('prefers curated description, otherwise builds one from facts', () => {
    expect(poiDescription({ ...sample, description_sk: 'Opis.' })).toBe('Opis.');
    expect(poiDescription({ ...sample, unesco: true }, ['Hlavná os'])).toBe(
      'Devín – hrad na Slovensku, pamiatka UNESCO. Zastávka na trase Hlavná os.',
    );
  });

  it('builds GeoJSON in lon,lat order', () => {
    expect(poiToGeoJSON(sample).features[0].geometry.coordinates).toEqual([16.98, 48.17]);
  });

  it('builds JSON-LD with canonical url, geo and optional sameAs', () => {
    const ld = poiJsonLd(sample, 'https://x.sk', [{ slug: 'hlavna-os', name_sk: 'Hlavná os' }]);
    expect(ld.url).toBe('https://x.sk/miesta/devin/');
    expect(ld['@type']).toEqual(['TouristAttraction', 'LandmarksOrHistoricalBuildings']);
    expect(ld.geo).toMatchObject({ latitude: 48.17, longitude: 16.98 });
    expect(ld.sameAs).toBeUndefined();
    expect(poiJsonLd({ ...sample, wikidata_id: 'Q1' }, 'https://x.sk').sameAs).toBe('https://www.wikidata.org/wiki/Q1');
  });
});

describe('pois in English', () => {
  it('uses English names, categories and fallback description', () => {
    expect(poiName(sample, 'en')).toBe('Devín castle');
    expect(poiName({ ...sample, name_en: null }, 'en')).toBe('Devín');
    expect(categoryLabel('dam', 'en')).toBe('reservoir');
    expect(poiDescription(sample, ['Main corridor spine'], 'en')).toBe(
      'Devín castle – castle in Slovakia. A stop on the Main corridor spine trail.',
    );
  });

  it('builds English JSON-LD with /en/ URLs and the Slovak name as alternateName', () => {
    const ld = poiJsonLd(sample, 'https://x.sk', [{ slug: 'hlavna-os', name_sk: 'Main corridor spine' }], 'en');
    expect(ld.url).toBe('https://x.sk/en/places/devin/');
    expect(ld.inLanguage).toBe('en');
    expect(ld.name).toBe('Devín castle');
    expect(ld.alternateName).toBe('Devín');
    expect(ld.subjectOf).toEqual([{ '@type': 'TouristTrip', name: 'Main corridor spine', url: 'https://x.sk/en/trails/hlavna-os/' }]);
  });
});
