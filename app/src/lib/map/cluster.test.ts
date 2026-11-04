import { describe, expect, it } from 'vitest';
import { CLUSTER_DEFAULTS, clusterPoints, resolveClusterOptions, type ScreenPoint } from './cluster';

const pt = (id: string, x: number, y: number): ScreenPoint => ({ id, x, y, label: id });

describe('resolveClusterOptions', () => {
  it('returns null when the layer does not cluster', () => {
    expect(resolveClusterOptions(undefined)).toBeNull();
    expect(resolveClusterOptions(false)).toBeNull();
  });
  it('uses the defaults for `true`', () => {
    expect(resolveClusterOptions(true)).toEqual(CLUSTER_DEFAULTS);
  });
  it('overrides only the given fields', () => {
    expect(resolveClusterOptions({ radius: 30 })).toEqual({ radius: 30, maxZoom: CLUSTER_DEFAULTS.maxZoom });
  });
});

describe('clusterPoints', () => {
  it('keeps far-apart points separate, in input order', () => {
    const out = clusterPoints([pt('ba', 0, 0), pt('ke', 500, 0)], 50);
    expect(out.map((c) => c.count)).toEqual([1, 1]);
    expect(out.map((c) => c.members[0].id)).toEqual(['ba', 'ke']);
  });

  it('merges points closer than the radius and places the cluster at their centroid', () => {
    const out = clusterPoints([pt('rysy', 100, 100), pt('gerlach', 120, 100), pt('chleb', 400, 300)], 50);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ x: 110, y: 100, count: 2 });
    expect(out[0].members.map((m) => m.id)).toEqual(['rysy', 'gerlach']);
    expect(out[1].count).toBe(1);
  });

  it('never loses or duplicates a point', () => {
    const pts = Array.from({ length: 40 }, (_, i) => pt(`p${i}`, (i * 37) % 300, (i * 53) % 200));
    const ids = clusterPoints(pts, 40).flatMap((c) => c.members.map((m) => m.id));
    expect(ids.sort()).toEqual(pts.map((p) => p.id).sort());
  });

  it('returns nothing for no points', () => {
    expect(clusterPoints([], 50)).toEqual([]);
  });
});
