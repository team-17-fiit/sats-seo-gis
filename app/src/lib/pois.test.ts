import { describe, expect, it } from 'vitest';
import { validateJsonLd } from '../../scripts/seo/jsonld.mjs';
import { getPaths } from './paths';
import {
  DESCRIPTION_MAX, FALLBACK_MIN, categoryLabel, categorySk, getPoi, getPois, parsePois, poiDescription, poiImage, poiJsonLd,
  poiName, poiToGeoJSON, schemaTypes,
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
    const curated = 'Zrúcanina hradu nad sútokom Moravy a Dunaja, jeden z najstarších hradov na Slovensku.';
    expect(poiDescription({ ...sample, description_sk: curated })).toBe(curated);
    // krátky opis z Wikidata ide pred vetu z faktov
    expect(poiDescription({ ...sample, description_sk: 'zrúcanina hradu' }, ['Hlavná os'])).toBe(
      'Zrúcanina hradu. Devín – hrad na Slovensku. Zastávka na trase Hlavná os. Poloha na mape, súradnice a súvisiace trasy.',
    );
    expect(poiDescription({ ...sample, unesco: true }, ['Hlavná os'])).toBe(
      'Devín – hrad na Slovensku, pamiatka UNESCO. Zastávka na trase Hlavná os. Poloha na mape, súradnice a súvisiace trasy.',
    );
  });

  it('extends a short generated description (SEO audit: min. 70 characters)', () => {
    const long = ['Malokarpatská vínna cesta', 'Cesta Márie', 'Považská hradná cesta'];
    const short = poiDescription(sample);
    expect(short.length).toBeGreaterThanOrEqual(70);
    expect(short.endsWith('Poloha na mape, súradnice a súvisiace trasy.')).toBe(true);
    // dosť dlhý opis z faktov sa už nedopĺňa
    const plain = poiDescription({ ...sample, unesco: true }, long);
    expect(plain.length).toBeGreaterThanOrEqual(FALLBACK_MIN);
    expect(plain).not.toContain('Poloha na mape');
  });

  it('uses plural for several trails and lists only as many as fit into 160 characters', () => {
    const trails = ['Hlavná os Slovenska', 'Malokarpatská vínna cesta', 'Považská hradná cesta', 'Cyklotrasa EV6 · EV13 · Váh'];
    const two = poiDescription(sample, trails.slice(0, 2));
    expect(two).toContain('Zastávka na trasách Hlavná os Slovenska a Malokarpatská vínna cesta.');
    const long = { ...sample, name_sk: 'Piešťany – Kúpeľný ostrov', category: 'spa' };
    const d = poiDescription(long, trails);
    expect(d.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
    expect(d).toMatch(/Zastávka na trasách .+ a (jednej ďalšej|ďalších \d)\.$/);
    // každá vymenovaná trasa je celá – žiadne odseknuté slovo
    expect(trails.filter((t) => d.includes(t)).length).toBeGreaterThanOrEqual(1);
  });

  it('English: "… trails and N more" when the list does not fit', () => {
    const trails = ['Small-Carpathian wine trail', 'Pilgrimage – Way of Mary', 'Bicycle – EV6 · EV13 · Váh', 'Museums and galleries loop'];
    const d = poiDescription({ ...sample, name_en: 'Bratislava – trailhead', category: 'trailhead' }, trails, 'en');
    expect(d.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
    expect(d).toMatch(/A stop on the .+ trails? and \d more\.$/);
    expect(poiDescription(sample, ['A', 'B'], 'en')).toContain('A stop on the A and B trails.');
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
      'Devín castle – castle in Slovakia. A stop on the Main corridor spine trail. Location on the map, coordinates and related trails.',
    );
  });

  it('builds English JSON-LD with /en/ URLs and the Slovak name as alternateName', () => {
    const ld = poiJsonLd(sample, 'https://x.sk', [{ slug: 'hlavna-os', name_sk: 'Main corridor spine' }], 'en');
    expect(ld.url).toBe('https://x.sk/en/places/devin/');
    expect(ld.name).toBe('Devín castle');
    expect(ld.alternateName).toBe('Devín');
  });

  it('produces JSON-LD that is valid against the schema.org vocabulary (T3-04)', () => {
    for (const locale of ['sk', 'en'] as const) {
      for (const category of ['castle', 'church', 'museum', 'lake', 'winery', 'town', 'peak', 'gorge']) {
        const ld = poiJsonLd({ ...sample, category, wikidata_id: 'Q1', elevation_m: 212 }, 'https://x.sk', [{ slug: 'hlavna-os', name_sk: 'Hlavná os' }], locale);
        expect(validateJsonLd(ld).filter((f: { level: string }) => f.level === 'error'), `${locale}/${category}`).toEqual([]);
      }
    }
  });
});

describe('poi image (T3-13)', () => {
  const withImage: Poi = {
    ...sample,
    image: 'http://commons.wikimedia.org/wiki/Special:FilePath/Hrad%20Dev%C3%ADn.jpg',
    image_author: 'Ján Novák',
    image_licence: 'CC BY-SA 4.0',
    image_licence_url: 'https://creativecommons.org/licenses/by-sa/4.0',
  };

  it('builds an https thumbnail and the Commons file page', () => {
    expect(poiImage(withImage)).toEqual({
      src: 'https://commons.wikimedia.org/wiki/Special:FilePath/Hrad_Dev%C3%ADn.jpg?width=500',
      page: 'https://commons.wikimedia.org/wiki/File:Hrad_Dev%C3%ADn.jpg',
      author: 'Ján Novák',
      licence: 'CC BY-SA 4.0',
      licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    });
  });

  it('ignores missing and non-Commons images', () => {
    expect(poiImage(sample)).toBeNull();
    expect(poiImage({ ...sample, image: 'https://example.com/a.jpg' })).toBeNull();
    expect(poiImage({ ...sample, image: 'not a url' })).toBeNull();
  });

  it('adds the image to JSON-LD only when there is one', () => {
    expect(poiJsonLd(withImage, 'https://x.sk').image).toBe(poiImage(withImage)?.src);
    expect(poiJsonLd(sample, 'https://x.sk')).not.toHaveProperty('image');
  });
});
