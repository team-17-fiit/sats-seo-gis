import { describe, expect, it } from 'vitest';
import { nearUrl } from './api';
import { getPaths, parsePaths, pathLineGeoJSON, stopsToGeoJSON, viewFor, type TrailPath } from './paths';
import { slugify } from './peaks';

const sample: TrailPath = {
  slug: 'test', name_sk: 'Test', name_en: 'Test', theme: 'wine', pilot_code: 'A', difficulty: 'easy',
  length_km: 10, colour: '#7b1fa2', mark: null, summary_sk: null, summary_en: null, licence: 'CC-BY-4.0',
  stops: [
    { slug: 'b', name_sk: 'B', name_en: null, category: 'town', unesco: false, seq: 2, lat: 48.3, lon: 17.3 },
    { slug: 'a', name_sk: 'A', name_en: null, category: 'town', unesco: false, seq: 1, lat: 48.1, lon: 17.1 },
  ],
};

describe('paths data', () => {
  it('exported paths.json contains the seven thematic paths with stops', () => {
    // vyžaduje app/public/data/paths.json (python -m pipelines.export_static --from-seed)
    const paths = getPaths();
    expect(paths).toHaveLength(7);
    expect(paths.every((p) => p.stops.length > 0)).toBe(true);
  });

  it('sorts stops by seq', () => {
    const [p] = parsePaths([sample]);
    expect(p.stops.map((s) => s.slug)).toEqual(['a', 'b']);
  });

  it('rejects non-array input', () => {
    expect(() => parsePaths({})).toThrow();
  });

  it('builds GeoJSON in lon,lat order', () => {
    const [p] = parsePaths([sample]);
    expect(stopsToGeoJSON(p).features[0].geometry.coordinates).toEqual([17.1, 48.1]);
    expect(pathLineGeoJSON(p).features[0].geometry.coordinates).toHaveLength(2);
  });

  it('centres the view between the stops', () => {
    const v = viewFor(parsePaths([sample])[0]);
    expect(v.center[0]).toBeCloseTo(17.2);
    expect(v.center[1]).toBeCloseTo(48.2);
    expect(v.zoom).toBeGreaterThanOrEqual(5.5);
  });
});

describe('helpers', () => {
  it('slugify removes diacritics', () => {
    expect(slugify('Gerlachovský štít')).toBe('gerlachovsky-stit');
  });
  it('builds the /pois?near= API URL', () => {
    expect(nearUrl(48.1, 17.1, 2000, 'http://localhost:8000')).toBe(
      'http://localhost:8000/api/v1/pois?near=48.10000%2C17.10000&r=2000&limit=10',
    );
  });
});
