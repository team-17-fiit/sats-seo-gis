import { describe, expect, it } from 'vitest';
import { chooseAdapter } from './createMap';
import { FakeMapAdapter } from './fakeMapAdapter';
import { project, SK_BOUNDS } from './staticImageAdapter';

describe('chooseAdapter', () => {
  it('uses MapLibre when WebGL is available and data saver is off', () => {
    expect(chooseAdapter({ webgl: true, saveData: false })).toBe('maplibre');
  });
  it('falls back to the static map without WebGL', () => {
    expect(chooseAdapter({ webgl: false, saveData: false })).toBe('static');
  });
  it('respects the data saver even with WebGL', () => {
    expect(chooseAdapter({ webgl: true, saveData: true })).toBe('static');
  });
});

describe('FakeMapAdapter', () => {
  it('records mount, layers and view changes', async () => {
    const map = new FakeMapAdapter();
    await map.mount({} as HTMLElement, { center: [19.7, 48.7], zoom: 7 });
    map.addLayer({ id: 'x', kind: 'points', color: '#000', data: { type: 'FeatureCollection', features: [] } });
    map.setView([17.1, 48.1], 10);
    expect(map.mounted?.zoom).toBe(7);
    expect(map.layers.map((l) => l.id)).toEqual(['x']);
    expect(map.view).toEqual({ center: [17.1, 48.1], zoom: 10 });
  });

  it('passes the cluster option through to the adapter', () => {
    const map = new FakeMapAdapter();
    map.addLayer({ id: 'peaks', kind: 'points', color: '#000', data: { type: 'FeatureCollection', features: [] }, cluster: true });
    expect(map.layers[0]).toMatchObject({ id: 'peaks', cluster: true });
  });

  it('delivers POI clicks until unsubscribed', () => {
    const map = new FakeMapAdapter();
    const seen: string[] = [];
    const off = map.onPoiClick((id) => seen.push(id));
    map.click('devin');
    off();
    map.click('rysy');
    expect(seen).toEqual(['devin']);
  });
});

describe('static projection', () => {
  it('maps the bounds corners to the SVG corners (y grows downwards)', () => {
    expect(project(SK_BOUNDS[0], SK_BOUNDS, 1000, 600)).toEqual([0, 600]);
    expect(project(SK_BOUNDS[1], SK_BOUNDS, 1000, 600)).toEqual([1000, 0]);
  });
  it('places Bratislava west of Košice', () => {
    const [xBa] = project([17.107, 48.148], SK_BOUNDS);
    const [xKe] = project([21.258, 48.716], SK_BOUNDS);
    expect(xBa).toBeLessThan(xKe);
  });
});
