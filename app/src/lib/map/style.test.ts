import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { UNESCO_COLOR } from './types';
import { PEAK_COLOR, POI_GROUPS, poiColorExpression, poiGroupOf } from './style';

const data = (file: string) => JSON.parse(readFileSync(path.join(process.cwd(), 'public', 'data', file), 'utf8'));
const trailColours: string[] = data('paths.json').map((p: { colour: string }) => p.colour.toLowerCase());

describe('štýl mapy (T3-10)', () => {
  it('každá kategória miest na webe má svoju skupinu (nepadá do „ostatné“ omylom)', () => {
    const categories = new Set<string>(data('pois.json').map((p: { category: string }) => p.category));
    const listed = new Set(POI_GROUPS.flatMap((g) => g.categories));
    for (const c of categories) expect(listed.has(c), c).toBe(true);
  });

  it('kategória patrí do jedinej skupiny', () => {
    const all = POI_GROUPS.flatMap((g) => g.categories);
    expect(new Set(all).size).toBe(all.length);
  });

  it('farby miest a vrcholov sa nebijú s farbami trás, s UNESCO ani medzi sebou', () => {
    const colours = [...POI_GROUPS.map((g) => g.color), PEAK_COLOR].map((c) => c.toLowerCase());
    expect(new Set(colours).size).toBe(colours.length);
    for (const c of colours) {
      expect(trailColours).not.toContain(c);
      expect(c).not.toBe(UNESCO_COLOR.toLowerCase());
    }
  });

  it('neznáma kategória patrí do „ostatné“', () => {
    expect(poiGroupOf('castle').id).toBe('heritage');
    expect(poiGroupOf('ufo').id).toBe('other');
    expect(poiGroupOf(null).id).toBe('other');
  });

  it('MapLibre výraz mapuje kategóriu na farbu skupiny a má predvolenú farbu', () => {
    const expr = poiColorExpression();
    expect(expr.slice(0, 2)).toEqual(['match', ['get', 'category']]);
    expect(expr[expr.indexOf('castle') + 1]).toBe(poiGroupOf('castle').color);
    expect(expr.at(-1)).toBe(poiGroupOf('ufo').color);
  });
});
