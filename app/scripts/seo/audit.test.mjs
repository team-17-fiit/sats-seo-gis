// Unit testy SEO auditu (T3-22) a validátora JSON-LD (T3-04).
// Princíp: test nad správnym miniwebom musí prejsť s 0 chybami a KAŽDÁ jednotlivá pokazená
// vlastnosť musí vyvolať konkrétne pravidlo. Tak vieme, že kontrola v CI nie je len "zelená vždy".
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { auditSite, classify, extractPage, listPages, pngSize } from './audit.mjs';
import { checkBreadcrumb, validateJsonLd } from './jsonld.mjs';

const SITE = 'https://tura.sk';

// ----------------------------------------------------------------------------- miniweb
const PATHS = {
  sk: { home: '/', trails: '/trasy/', trail: '/trasy/t1/', place: '/miesta/p1/', peak: '/vrcholy/v1/' },
  en: { home: '/en/', trails: '/en/trails/', trail: '/en/trails/t1/', place: '/en/places/p1/', peak: '/en/peaks/v1/' },
};
const TEXT = {
  sk: {
    home: ['Aktívny turizmus na Slovensku – mapa trás', 'Slovensko pešo'],
    trails: ['Tematické trasy po Slovensku', 'Tematické trasy'],
    trail: ['Cesta Márie', 'Cesta Márie'],
    place: ['Devínsky hrad', 'Devínsky hrad'],
    peak: ['Rysy – vrchol, 2503 m n. m.', 'Rysy'],
  },
  en: {
    home: ['Active tourism in Slovakia – map of trails', 'Slovakia on foot'],
    trails: ['Thematic trails across Slovakia', 'Thematic trails'],
    trail: ['Way of Mary', 'Way of Mary'],
    place: ['Devín castle', 'Devín castle'],
    peak: ['Rysy – peak, 2503 m a.s.l.', 'Rysy'],
  },
};
const other = (l) => (l === 'sk' ? 'en' : 'sk');
const crumbsFor = (l, kind) => {
  const c = [[TEXT[l].home[1] === 'Slovensko pešo' ? 'Domov' : 'Home', PATHS[l].home]];
  if (kind === 'trails' || kind === 'trail' || kind === 'place') c.push([TEXT[l].trails[1], PATHS[l].trails]);
  if (kind === 'trail') c.push([TEXT[l].trail[1], PATHS[l].trail]);
  if (kind === 'place') c.push([TEXT[l].place[1], PATHS[l].place]);
  if (kind === 'peak') c.push([TEXT[l].peak[1], PATHS[l].peak]);
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: c.map(([name, p], i) => ({ '@type': 'ListItem', position: i + 1, name, item: SITE + p })),
  };
};
// funkcia, nie objekt: test, ktorý súradnice pokazí, nesmie zmeniť dáta ostatným testom
const geo = () => ({ '@type': 'GeoCoordinates', latitude: 48.17, longitude: 16.98 });
function mainEntity(l, kind) {
  const url = SITE + PATHS[l][kind];
  const name = TEXT[l][kind][1];
  switch (kind) {
    case 'home':
      return { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Túra', url: `${SITE}/`, inLanguage: l };
    case 'trails':
      return {
        '@context': 'https://schema.org', '@type': 'ItemList', name, url,
        itemListElement: [{ '@type': 'ListItem', position: 1, url: SITE + PATHS[l].trail, name: TEXT[l].trail[1] }],
      };
    case 'trail':
      return {
        '@context': 'https://schema.org', '@type': 'TouristTrip', name, url, description: 'Púť.',
        itinerary: {
          '@type': 'ItemList',
          itemListElement: [{ '@type': 'ListItem', position: 1, item: { '@type': 'TouristAttraction', name: TEXT[l].place[1], url: SITE + PATHS[l].place, geo: geo() } }],
        },
      };
    case 'place':
      return { '@context': 'https://schema.org', '@type': ['TouristAttraction', 'LandmarksOrHistoricalBuildings'], name, url, geo: geo(), sameAs: 'https://www.wikidata.org/wiki/Q1' };
    case 'peak':
      return { '@context': 'https://schema.org', '@type': 'Mountain', name, url, geo: { ...geo(), latitude: 49.18, longitude: 20.09, elevation: 2503 } };
  }
}

/** HTML jednej stránky; `o` umožní pokaziť ľubovoľnú časť. */
function pageHtml(l, kind, o = {}) {
  const url = SITE + PATHS[l][kind];
  const [title, h1] = TEXT[l][kind];
  const desc = o.desc ?? `${title}: podrobný opis stránky pre vyhľadávače, ktorý má dostatočnú dĺžku aj obsah (${l}/${kind}).`;
  const og = SITE + `/og${PATHS[l][kind] === '/' ? '/index' : PATHS[l][kind].slice(0, -1)}.png`;
  const ld = o.jsonld ?? [JSON.stringify(mainEntity('sk', 'home')), ...(kind === 'home' ? [] : [JSON.stringify(crumbsFor(l, kind))]), ...(kind === 'home' ? [] : [JSON.stringify(mainEntity(l, kind))])];
  const alternates = o.alternates ?? [
    ['sk', SITE + PATHS.sk[kind]],
    ['en', SITE + PATHS.en[kind]],
    ['x-default', SITE + PATHS.sk[kind]],
  ];
  const links = o.links ?? [
    `<a href="${PATHS[other(l)][kind]}" hrefLang="${other(l)}">${l === 'sk' ? 'English' : 'Slovensky'}</a>`,
    `<a href="${PATHS[l].trails}">${TEXT[l].trails[1]}</a>`,
    kind === 'trails' ? `<h2><a href="${PATHS[l].trail}">${TEXT[l].trail[1]}</a></h2>` : '',
  ];
  return `<!DOCTYPE html><html lang="${o.lang ?? l}"><head><meta charSet="utf-8"/>
<meta name="viewport" content="${o.viewport ?? 'width=device-width, initial-scale=1'}"/>
${o.iconTag ?? '<link rel="icon" href="/icons/icon.png"/>'}
${o.titleTag ?? `<title>${title} | Túra</title>`}
${o.descTag ?? `<meta name="description" content="${desc}"/>`}
${o.robots ? `<meta name="robots" content="${o.robots}"/>` : ''}
${o.canonicalTag ?? `<link rel="canonical" href="${o.canonical ?? url}"/>`}
${alternates.map(([h, href]) => `<link rel="alternate" hrefLang="${h}" href="${href}"/>`).join('\n')}
<meta property="og:title" content="${title}"/><meta property="og:description" content="${desc}"/>
<meta property="og:url" content="${o.ogUrl ?? url}"/><meta property="og:site_name" content="Túra"/>
<meta property="og:locale" content="${l === 'sk' ? 'sk_SK' : 'en_GB'}"/><meta property="og:type" content="website"/>
<meta property="og:image" content="${o.ogImage ?? og}"/><meta property="og:image:width" content="1200"/><meta property="og:image:height" content="630"/>
<meta property="og:image:alt" content="${title}"/><meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:image" content="${og}"/><meta name="twitter:image:alt" content="${title}"/>
</head><body>${ld.map((j) => `<script type="application/ld+json">${j}</script>`).join('')}
<header>${o.h1Tag ?? `<h1>${h1}</h1>`}${o.extraHeader ?? ''}</header>
<main id="main">${links.join(' ')}${o.body ?? ''}</main></body></html>`;
}

function png(w, h) {
  const b = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b, 0);
  b.writeUInt32BE(13, 8);
  b.write('IHDR', 12, 'ascii');
  b.writeUInt32BE(w, 16);
  b.writeUInt32BE(h, 20);
  return b;
}

const dirs = [];
/** Vytvorí miniweb v dočasnom priečinku. `mutate(files)` môže upraviť ktorýkoľvek súbor. */
function makeSite(mutate = () => {}, pageOverrides = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-audit-'));
  dirs.push(dir);
  const files = {};
  const kinds = ['home', 'trails', 'trail', 'place', 'peak'];
  for (const l of ['sk', 'en']) {
    for (const kind of kinds) {
      const p = PATHS[l][kind];
      files[`${p.slice(1)}index.html`] = pageHtml(l, kind, pageOverrides[p] ?? {});
      files[`og${p === '/' ? '/index' : p.slice(0, -1)}.png`] = png(1200, 630);
    }
  }
  files['404.html'] = '<!DOCTYPE html><html lang="sk"><head><meta name="robots" content="noindex"/><title>404</title></head><body><h1>404</h1></body></html>';
  const urls = kinds.flatMap((k) => ['sk', 'en'].map((l) => [k, l]));
  files['sitemap.xml'] = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls
    .map(([k, l]) => `<url><loc>${SITE}${PATHS[l][k]}</loc><xhtml:link rel="alternate" hreflang="sk" href="${SITE}${PATHS.sk[k]}" /><xhtml:link rel="alternate" hreflang="en" href="${SITE}${PATHS.en[k]}" /><xhtml:link rel="alternate" hreflang="x-default" href="${SITE}${PATHS.sk[k]}" /></url>`)
    .join('')}</urlset>`;
  files['icons/icon.png'] = png(192, 192);
  files['robots.txt'] = `User-Agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`;
  mutate(files);
  for (const [rel, content] of Object.entries(files)) {
    if (content === null) continue;
    const full = path.join(dir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  return dir;
}

afterEach(() => {
  while (dirs.length) fs.rmSync(dirs.pop(), { recursive: true, force: true });
});

const run = (dir, opts = {}) => auditSite({ outDir: dir, siteUrl: SITE, ...opts });
const errorRules = (res) => [...new Set(res.findings.filter((f) => f.level === 'error').map((f) => f.rule))].sort();
const errorsOf = (res, rule) => res.findings.filter((f) => f.level === 'error' && f.rule === rule);

// ============================================================================= testy
describe('SEO audit – správny web', () => {
  it('správny miniweb nemá žiadnu chybu', () => {
    const res = run(makeSite());
    expect(res.pages).toBe(10);
    expect(res.findings.filter((f) => f.level === 'error')).toEqual([]);
  });

  it('rozpozná typ a jazyk stránky z adresy', () => {
    expect(classify('/')).toEqual({ locale: 'sk', kind: 'home' });
    expect(classify('/en/trails/')).toEqual({ locale: 'en', kind: 'trails' });
    expect(classify('/trasy/cesta-marie/')).toEqual({ locale: 'sk', kind: 'trail', slug: 'cesta-marie' });
    expect(classify('/en/places/devin/')).toEqual({ locale: 'en', kind: 'place', slug: 'devin' });
    expect(classify('/vrcholy/rysy/')).toEqual({ locale: 'sk', kind: 'peak', slug: 'rysy' });
    expect(classify('/nieco/ine/')).toEqual({ locale: 'sk', kind: 'other' });
  });

  it('číta rozmery PNG zo záhlavia', () => {
    expect(pngSize(png(1200, 630))).toEqual({ width: 1200, height: 630 });
    expect(pngSize(Buffer.from('GIF89a........................'))).toBeNull();
  });

  it('bez buildu (prázdny priečinok) zlyhá, nehlási falošný úspech', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-empty-'));
    dirs.push(dir);
    expect(errorRules(run(dir))).toContain('no-pages');
  });
});

describe('SEO audit – každá chyba sa naozaj zachytí', () => {
  // [popis, prepis stránky /trasy/t1/ alebo funkcia nad súbormi, očakávané pravidlo]
  const T = '/trasy/t1/';
  const cases = [
    ['chýbajúci title', { [T]: { titleTag: '' } }, 'title-missing'],
    ['dva title', { [T]: { titleTag: '<title>Cesta Márie | Túra</title><title>Iný | Túra</title>' } }, 'title-multiple'],
    ['príliš krátky title', { [T]: { titleTag: '<title>Cesta</title>' } }, 'title-length'],
    ['príliš dlhý title', { [T]: { titleTag: `<title>Cesta Márie ${'veľmi '.repeat(12)}dlhý názov | Túra</title>` } }, 'title-length'],
    ['chýbajúca description', { [T]: { descTag: '' } }, 'description-missing'],
    ['krátka description', { [T]: { desc: 'Krátky opis.' } }, 'description-length'],
    ['dlhá description', { [T]: { desc: 'x'.repeat(230) } }, 'description-length'],
    ['žiadny h1', { [T]: { h1Tag: '<p>Cesta Márie</p>' } }, 'h1-count'],
    ['dva h1', { [T]: { extraHeader: '<h1>Druhý</h1>' } }, 'h1-count'],
    ['preskočená úroveň nadpisu', { [T]: { body: '<h3>Zastávky</h3>' } }, 'heading-order'],
    ['chýbajúci canonical', { [T]: { canonicalTag: '' } }, 'canonical-missing'],
    ['relatívny canonical', { [T]: { canonical: '/trasy/t1/' } }, 'canonical-relative'],
    ['canonical na inú stránku', { [T]: { canonical: `${SITE}/trasy/` } }, 'canonical-self'],
    ['zlý jazyk dokumentu', { [T]: { lang: 'en' } }, 'html-lang'],
    ['noindex', { [T]: { robots: 'noindex' } }, 'robots-noindex'],
    ['viewport zakazuje zoom', { [T]: { viewport: 'width=device-width, user-scalable=no' } }, 'viewport-zoom'],
    ['chýba hreflang en', { [T]: { alternates: [['sk', SITE + T], ['x-default', SITE + T]] } }, 'hreflang-missing'],
    ['hreflang na neexistujúcu stránku', { [T]: { alternates: [['sk', SITE + T], ['en', `${SITE}/en/trails/zz/`], ['x-default', SITE + T]] } }, 'hreflang-target'],
    ['x-default nie je slovenčina', { [T]: { alternates: [['sk', SITE + T], ['en', `${SITE}/en/trails/t1/`], ['x-default', `${SITE}/en/trails/t1/`]] } }, 'hreflang-x-default'],
    ['hreflang bez spätného odkazu', { '/en/trails/t1/': { alternates: [['sk', `${SITE}/trasy/`], ['en', `${SITE}/en/trails/t1/`], ['x-default', `${SITE}/trasy/`]] } }, 'hreflang-reciprocal'],
    ['og:url ≠ canonical', { [T]: { ogUrl: `${SITE}/` } }, 'og-url'],
    ['og:image neexistuje', { [T]: { ogImage: `${SITE}/og/chyba.png` } }, 'og-image-missing'],
    ['obrázok bez alt', { [T]: { body: '<img src="/a.png">' } }, 'img-alt-missing'],
    ['alt je názov súboru', { [T]: { body: '<img src="/a.png" alt="foto_123.jpg">' } }, 'img-alt-filename'],
    ['všeobecný alt', { [T]: { body: '<img src="/a.png" alt="obrázok">' } }, 'img-alt-generic'],
    ['obrázok-odkaz bez alt textu', { [T]: { body: '<a href="/trasy/"><img src="/a.png" alt=""></a>' } }, 'img-alt-link'],
    ['SVG mapa bez názvu', { [T]: { body: '<svg role="img"><circle r="1"/></svg>' } }, 'role-img-name'],
    ['nefunkčný interný odkaz', { [T]: { body: '<a href="/trasy/neexistuje/">x</a>' } }, 'link-broken'],
    ['odkaz bez textu', { [T]: { body: '<a href="/trasy/"></a>' } }, 'link-name'],
    ['odkaz do iného jazyka bez hreflang', { [T]: { body: '<a href="/en/trails/">Trails</a>' } }, 'link-locale'],
    ['odkaz bez koncovej lomky', { [T]: { body: '<a href="/trasy">Trasy</a>' } }, 'link-trailing-slash'],
    ['chýba favicon', { [T]: { iconTag: '' } }, 'favicon-missing'],
    ['favicon neexistuje', { [T]: { iconTag: '<link rel="icon" href="/favicon.ico"/>' } }, 'favicon-broken'],
    ['favicon s verziou v adrese, ale bez súboru', { [T]: { iconTag: '<link rel="icon" href="/neexistuje.svg?79f3bddf"/>' } }, 'favicon-broken'],
    ['chýba JSON-LD', { [T]: { jsonld: [] } }, 'jsonld-missing'],
    ['neplatný JSON v JSON-LD', { [T]: { jsonld: ['{"@type": "Thing",}'] } }, 'jsonld-syntax'],
  ];
  for (const [name, overrides, rule] of cases) {
    it(`${name} -> ${rule}`, () => {
      const res = run(makeSite(() => {}, overrides));
      expect(errorRules(res)).toContain(rule);
    });
  }

  it('rovnaký title na dvoch stránkach -> title-duplicate (pri oboch)', () => {
    const res = run(makeSite(() => {}, { '/vrcholy/v1/': { titleTag: '<title>Cesta Márie | Túra</title>' } }));
    expect(errorsOf(res, 'title-duplicate').map((f) => f.url).sort()).toEqual(['/trasy/t1/', '/vrcholy/v1/']);
  });

  it('rovnaká description na dvoch stránkach -> description-duplicate', () => {
    const desc = 'Rovnaký opis dvoch rôznych stránok, ktorý je dosť dlhý na to, aby prešiel kontrolou dĺžky opisu.';
    const res = run(makeSite(() => {}, { '/trasy/t1/': { desc }, '/miesta/p1/': { desc } }));
    expect(errorsOf(res, 'description-duplicate')).toHaveLength(2);
  });

  it('rovnaký h1 v rámci jazyka je chyba, medzi jazykmi nie', () => {
    const res = run(makeSite());
    expect(errorsOf(res, 'h1-duplicate')).toEqual([]); // Rysy je v SK aj EN
    const bad = run(makeSite(() => {}, { '/miesta/p1/': { h1Tag: '<h1>Cesta Márie</h1>' } }));
    expect(errorsOf(bad, 'h1-duplicate').length).toBeGreaterThanOrEqual(2);
  });

  it('ikona s verziou v adrese (/icon.svg?hash, ako ju generuje Next.js) je v poriadku', () => {
    const res = run(makeSite(() => {}, { '/trasy/t1/': { iconTag: '<link rel="icon" href="/icons/icon.png?79f3bddf275a4a5f"/>' } }));
    expect(errorRules(res)).not.toContain('favicon-broken');
  });

  it('og:image s nesprávnymi rozmermi -> og-image-size', () => {
    const res = run(makeSite((f) => { f['og/trasy/t1.png'] = png(800, 600); }));
    expect(errorRules(res)).toContain('og-image-size');
  });

  it('stránka chýba v sitemap -> sitemap-missing-page', () => {
    const res = run(makeSite((f) => { f['sitemap.xml'] = f['sitemap.xml'].replace(/<url><loc>https:\/\/tura\.sk\/vrcholy\/v1\/<\/loc>.*?<\/url>/, ''); }));
    expect(errorsOf(res, 'sitemap-missing-page').map((f) => f.url)).toEqual(['/vrcholy/v1/']);
  });

  it('sitemap odkazuje na neexistujúcu stránku -> sitemap-broken', () => {
    const res = run(makeSite((f) => { f['sitemap.xml'] = f['sitemap.xml'].replace('</urlset>', `<url><loc>${SITE}/trasy/zmazana/</loc></url></urlset>`); }));
    expect(errorRules(res)).toContain('sitemap-broken');
  });

  it('hreflang v sitemap nesedí s HTML -> sitemap-hreflang', () => {
    const res = run(makeSite((f) => { f['sitemap.xml'] = f['sitemap.xml'].replace(`hreflang="en" href="${SITE}/en/peaks/v1/"`, `hreflang="en" href="${SITE}/en/"`); }));
    expect(errorRules(res)).toContain('sitemap-hreflang');
  });

  it('robots.txt bez sitemap alebo so zákazom celého webu', () => {
    expect(errorRules(run(makeSite((f) => { f['robots.txt'] = 'User-Agent: *\nAllow: /\n'; })))).toContain('robots-sitemap');
    expect(errorRules(run(makeSite((f) => { f['robots.txt'] += 'Disallow: /\n'; })))).toContain('robots-disallow-all');
  });

  it('404 bez noindex -> 404-noindex', () => {
    const res = run(makeSite((f) => { f['404.html'] = '<html lang="sk"><head><title>404</title></head><body><h1>404</h1></body></html>'; }));
    expect(errorRules(res)).toContain('404-noindex');
  });

  it('produkčný build s placeholder adresou -> site-url-placeholder', () => {
    const dir = makeSite();
    expect(errorRules(auditSite({ outDir: dir, siteUrl: SITE, production: true }))).not.toContain('site-url-placeholder');
    // rovnaký web, ale tváriaci sa, že beží na example.com: placeholder zakázaný v produkcii
    const res = auditSite({ outDir: dir, siteUrl: 'https://example.com', production: true });
    expect(errorRules(res)).toContain('site-url-placeholder');
  });

  it('basePath (GitHub Pages): odkazy s podcestou sú v poriadku, bez nej chyba', () => {
    const ok = makeSite((f) => {
      for (const k of Object.keys(f)) if (k.endsWith('.html')) f[k] = f[k].replace(/href="\//g, 'href="/sub/');
    });
    expect(errorRules(run(ok, { basePath: '/sub' }))).not.toContain('link-basepath');
    expect(errorRules(run(makeSite(), { basePath: '/sub' }))).toContain('link-basepath');
  });
});

describe('SEO audit – štruktúrované dáta na stránke (T3-04)', () => {
  const T = '/trasy/t1/';
  const ldOf = (l, kind, patch) => {
    const docs = [mainEntity('sk', 'home'), crumbsFor(l, kind), mainEntity(l, kind)];
    patch(docs);
    return docs.map((d) => JSON.stringify(d));
  };
  const cases = [
    ['chýba navigačná cesta', (d) => d.splice(1, 1), 'breadcrumb-count'],
    ['posledná položka navigácie ≠ canonical', (d) => { d[1].itemListElement.at(-1).item = `${SITE}/trasy/`; }, 'breadcrumb-last'],
    ['navigácia nezačína úvodom', (d) => { d[1].itemListElement[0].item = `${SITE}/trasy/`; }, 'breadcrumb-first'],
    ['názov v navigácii ≠ h1', (d) => { d[1].itemListElement.at(-1).name = 'Iný názov'; }, 'breadcrumb-name'],
    ['navigácia s preskočenou pozíciou', (d) => { d[1].itemListElement[1].position = 5; }, 'breadcrumb-google'],
    ['url entity ≠ canonical', (d) => { d[2].url = `${SITE}/trasy/`; }, 'jsonld-url'],
    ['názov entity ≠ h1', (d) => { d[2].name = 'Iná trasa'; }, 'jsonld-name'],
    ['chýba hlavná entita', (d) => d.splice(2, 1), 'jsonld-main-entity'],
    ['zastávka na neexistujúcej stránke', (d) => { d[2].itinerary.itemListElement[0].item.url = `${SITE}/miesta/zz/`; }, 'jsonld-url-broken'],
    ['prehodené lat/lon zastávky', (d) => { Object.assign(d[2].itinerary.itemListElement[0].item.geo, { latitude: 16.98, longitude: 48.17 }); }, 'jsonld-geo'],
    ['zlé poradie zastávok', (d) => { d[2].itinerary.itemListElement[0].position = 0; }, 'jsonld-list-position'],
    ['vlastnosť mimo slovníka schema.org', (d) => { d[2].inLanguage = 'sk'; }, 'jsonld-schema'],
    ['dve WebSite', (d) => d.push(mainEntity('sk', 'home')), 'jsonld-website'],
  ];
  for (const [name, patch, rule] of cases) {
    it(`${name} -> ${rule}`, () => {
      const res = run(makeSite(() => {}, { [T]: { jsonld: ldOf('sk', 'trail', patch) } }));
      expect(errorRules(res)).toContain(rule);
    });
  }

  it('vrchol bez reálnej výšky -> jsonld-geo', () => {
    const ld = ldOf('sk', 'peak', (d) => { d[2].geo.elevation = 0; });
    expect(errorRules(run(makeSite(() => {}, { '/vrcholy/v1/': { jsonld: ld } })))).toContain('jsonld-geo');
  });

  it('počet trás v ItemList ≠ počet trás na stránke -> jsonld-list-count', () => {
    const ld = ldOf('sk', 'trails', (d) => { d[2].itemListElement.push({ '@type': 'ListItem', position: 2, url: `${SITE}/trasy/t1/`, name: 'x' }); });
    expect(errorRules(run(makeSite(() => {}, { '/trasy/': { jsonld: ld } })))).toContain('jsonld-list-count');
  });
});

describe('validateJsonLd – slovník schema.org', () => {
  const errors = (doc) => validateJsonLd(doc).filter((f) => f.level === 'error').map((f) => f.message);
  const ok = { '@context': 'https://schema.org', '@type': 'Mountain', name: 'Rysy', url: 'https://x.sk/vrcholy/rysy/', geo: { '@type': 'GeoCoordinates', latitude: 49.18, longitude: 20.09, elevation: 2503 } };

  it('platný dokument nemá chyby', () => expect(errors(ok)).toEqual([]));
  it('chýbajúci alebo cudzí @context', () => {
    expect(errors({ ...ok, '@context': undefined })[0]).toMatch(/@context/);
    expect(errors({ ...ok, '@context': 'https://example.org' })[0]).toMatch(/@context/);
  });
  it('chýbajúci @type', () => expect(errors({ '@context': 'https://schema.org', name: 'x' })[0]).toMatch(/chýba @type/));
  it('neznámy typ', () => expect(errors({ ...ok, '@type': 'HikingTrail' })[0]).toMatch(/neznámy typ/));
  it('neznáma vlastnosť', () => expect(errors({ ...ok, heightAboveSea: 1 })[0]).toMatch(/neznáma vlastnosť/));
  it('vlastnosť, ktorá k typu nepatrí (inLanguage na Place)', () => expect(errors({ ...ok, inLanguage: 'sk' })[0]).toMatch(/nepatrí k typu Mountain/));
  it('vlastnosť zdedená z nadtypu je povolená (containedInPlace z Place)', () => {
    expect(errors({ ...ok, containedInPlace: { '@type': 'Country', name: 'Slovensko' } })).toEqual([]);
  });
  it('hodnota nesprávneho typu (subjectOf: TouristTrip)', () => {
    expect(errors({ ...ok, subjectOf: { '@type': 'TouristTrip', name: 'x' } })[0]).toMatch(/očakáva CreativeWork/);
  });
  it('null a prázdny reťazec', () => {
    expect(errors({ ...ok, description: null })[0]).toMatch(/null/);
    expect(errors({ ...ok, description: '  ' })[0]).toMatch(/prázdny/);
  });
  it('url musí byť absolútna', () => expect(errors({ ...ok, url: '/vrcholy/rysy/' })[0]).toMatch(/absolútna/));
  it('boolean tam, kde nie je povolený', () => expect(errors({ ...ok, name: true })[0]).toMatch(/true\/false/));
  it('číslo tam, kde nie je povolené', () => expect(errors({ ...ok, geo: 5 })[0]).toMatch(/nepovoľuje číslo/));
  it('position musí byť celé číslo', () => {
    expect(errors({ '@context': 'https://schema.org', '@type': 'ListItem', position: 1.5, name: 'x' })[0]).toMatch(/celé číslo/);
  });
  it('vnorený objekt bez @type', () => expect(errors({ ...ok, geo: { latitude: 1, longitude: 2 } })[0]).toMatch(/chýba @type/));
  it('odkaz cez @id je platný', () => expect(errors({ ...ok, containedInPlace: { '@id': 'https://x.sk/#sk' } })).toEqual([]));
  it('člen enumerácie musí patriť k rozsahu', () => {
    expect(errors({ '@context': 'https://schema.org', '@type': 'Place', name: 'x', isAccessibleForFree: 'https://schema.org/True' })).toEqual([]);
    expect(errors({ '@context': 'https://schema.org', '@type': 'Place', name: 'x', isAccessibleForFree: 'https://schema.org/Monday' })[0]).toMatch(/nie je povolená/);
  });
  it('rozpracovaný (pending) typ je len varovanie', () => {
    const f = validateJsonLd({ '@context': 'https://schema.org', '@type': 'ConferenceEvent', name: 'x' });
    expect(f.filter((x) => x.level === 'error')).toEqual([]);
    expect(f.some((x) => x.level === 'warn' && /pending/.test(x.message))).toBe(true);
  });
  it('vedome prijatý pending typ (TouristTrip + itinerary) nehlási varovanie', () => {
    const f = validateJsonLd({
      '@context': 'https://schema.org', '@type': 'TouristTrip', name: 'x',
      itinerary: { '@type': 'ItemList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'a' }] },
    });
    expect(f).toEqual([]);
  });
  it('@graph aj pole dokumentov', () => {
    expect(errors({ '@context': 'https://schema.org', '@graph': [ok, { '@type': 'Mountain', name: 'Kriváň' }] })).toEqual([]);
    expect(errors([ok, { ...ok, '@type': 'Nič' }]).length).toBe(1);
  });
});

describe('checkBreadcrumb – pravidlá Google', () => {
  const li = (position, name, item) => ({ '@type': 'ListItem', position, name, ...(item ? { item } : {}) });
  const bc = (...items) => ({ '@type': 'BreadcrumbList', itemListElement: items });
  it('platná cesta; posledná položka smie byť bez item', () => {
    expect(checkBreadcrumb(bc(li(1, 'Domov', 'https://x.sk/'), li(2, 'Trasy', 'https://x.sk/trasy/')))).toEqual([]);
    expect(checkBreadcrumb(bc(li(1, 'Domov', 'https://x.sk/'), li(2, 'Trasy')))).toEqual([]);
  });
  it('menej ako 2 položky', () => expect(checkBreadcrumb(bc(li(1, 'Domov', 'https://x.sk/')))[0].message).toMatch(/aspoň 2/));
  it('item chýba v strede cesty', () => {
    expect(checkBreadcrumb(bc(li(1, 'Domov'), li(2, 'Trasy', 'https://x.sk/trasy/'))).map((f) => f.message).join()).toMatch(/chýba item/);
  });
  it('relatívny item, chýbajúci name, zlé pozície', () => {
    const msgs = checkBreadcrumb(bc(li(1, 'Domov', '/'), li(3, '', 'https://x.sk/a/'))).map((f) => f.message).join(' | ');
    expect(msgs).toMatch(/absolútna URL/);
    expect(msgs).toMatch(/chýba name/);
    expect(msgs).toMatch(/pozícia má byť 2/);
  });
});

describe('extractPage', () => {
  it('nevidí <title> vo vnútri SVG ako titulok stránky', () => {
    const p = extractPage('<html lang="sk"><head><title>A</title></head><body><svg role="img"><title>Mapa</title></svg></body></html>', '/');
    expect(p.titles).toEqual(['A']);
    expect(p.titlesInBody).toBe(0);
    expect(p.roleImages[0].name).toBe('Mapa');
  });
});

// ============================================================================= prevzaté z T3-06
// Pôvodne scripts/check-site-urls.test.mjs (kontrola adries webu pred nasadením). Každý jeho prípad
// je tu zachovaný, len nad spoločným miniwebom tohto súboru.
describe('adresy webu a nasadenie (prevzaté z T3-06)', () => {
  const GH = 'https://team-17-fiit.github.io/sats-seo-gis';
  /** Ten istý miniweb, ale nasadený na GitHub Pages s podcestou /sats-seo-gis. */
  const ghSite = (more = () => {}) => makeSite((f) => {
    for (const k of Object.keys(f)) {
      if (typeof f[k] !== 'string') continue;
      f[k] = f[k].replaceAll(SITE, GH).replace(/href="\//g, 'href="/sats-seo-gis/');
    }
    more(f);
  });
  const runGh = (dir, opts = {}) => auditSite({ outDir: dir, siteUrl: GH, basePath: '/sats-seo-gis', production: true, ...opts });
  const siteRules = (res) => errorRules(res).filter((r) => r.startsWith('site-url'));

  it('správny web na GitHub Pages s podcestou prejde aj v produkcii', () => {
    const res = runGh(ghSite());
    expect(res.findings.filter((f) => f.level === 'error').map((f) => `${f.rule} ${f.url} ${f.message}`)).toEqual([]);
    expect(res.pages).toBe(10);
  });

  it('prijme verejnú https adresu', () => {
    const dir = makeSite();
    expect(siteRules(auditSite({ outDir: dir, siteUrl: SITE, production: true }))).toEqual([]);
    expect(siteRules(auditSite({ outDir: dir, siteUrl: 'https://mapa.example.sk', production: true }))).toEqual([]);
  });

  for (const [value, rule] of [
    ['', 'site-url'],
    ['nie-je-url', 'site-url'],
    ['https://example.com', 'site-url-placeholder'],
    [`http://team-17-fiit.github.io/sats-seo-gis`, 'site-url-https'],
    ['http://localhost:3000', 'site-url-placeholder'],
    ['https://127.0.0.1', 'site-url-placeholder'],
    [`${GH}?ref=1`, 'site-url-query'],
  ]) {
    it(`odmietne adresu webu ${JSON.stringify(value)} -> ${rule}`, () => {
      expect(errorRules(auditSite({ outDir: makeSite(), siteUrl: value, production: true }))).toContain(rule);
    });
  }

  it('v produkcii odhalí example.com kdekoľvek v HTML, mimo produkcie nie', () => {
    const dir = ghSite((f) => { f['en/index.html'] = f['en/index.html'].replace('</main>', '<p>viac na https://example.com/</p></main>'); });
    expect(errorsOf(runGh(dir), 'placeholder-in-html').map((f) => f.url)).toEqual(['/en/']);
    expect(errorRules(runGh(dir, { production: false }))).not.toContain('placeholder-in-html');
  });

  it('odhalí canonical a og:url na inej doméne', () => {
    const dir = ghSite((f) => {
      f['en/index.html'] = f['en/index.html']
        .replace(`rel="canonical" href="${GH}/en/"`, 'rel="canonical" href="https://example.com/en/"')
        .replace(`property="og:url" content="${GH}/en/"`, 'property="og:url" content="https://example.com/en/"');
    });
    const rules = errorRules(runGh(dir));
    expect(rules).toEqual(expect.arrayContaining(['canonical-self', 'og-url', 'placeholder-in-html']));
  });

  it('odhalí chýbajúci náhľadový obrázok (og:image aj twitter:image)', () => {
    const dir = ghSite((f) => { f['og/index.png'] = null; });
    expect(errorRules(runGh(dir))).toEqual(expect.arrayContaining(['og-image-missing', 'twitter-image-missing']));
  });

  it('odhalí URL v JSON-LD na našej doméne, ktorá nezačína adresou webu (chýba lomka)', () => {
    const bad = ghSite((f) => { f['index.html'] = f['index.html'].replace(`"url":"${GH}/"`, `"url":"${GH}"`); });
    expect(errorRules(runGh(bad))).toContain('jsonld-url-outside');
    expect(errorRules(runGh(ghSite()))).not.toContain('jsonld-url-outside');
  });

  it('odhalí stránku s noindex, ktorá je v sitemap', () => {
    const res = runGh(ghSite(), {});
    expect(errorRules(res)).not.toContain('sitemap-noindex');
    const dir = ghSite((f) => { f['vrcholy/v1/index.html'] = f['vrcholy/v1/index.html'].replace('<meta charSet', '<meta name="robots" content="noindex"/><meta charSet'); });
    expect(errorRules(runGh(dir))).toEqual(expect.arrayContaining(['sitemap-noindex', 'robots-noindex']));
  });

  it('odhalí hreflang v sitemap, ktorý vedie na neexistujúcu stránku', () => {
    const dir = ghSite((f) => { f['sitemap.xml'] = f['sitemap.xml'].replace(`hreflang="en" href="${GH}/en/peaks/v1/"`, `hreflang="en" href="${GH}/en/zmazana/"`); });
    expect(errorRules(runGh(dir))).toContain('sitemap-hreflang-target');
  });

  it('overí overovacie meta tagy Search Console a Bing na úvodnej stránke', () => {
    const plain = ghSite();
    expect(errorRules(runGh(plain, { verification: { google: 'g-token' } }))).toContain('verification-missing');
    expect(errorRules(runGh(plain, { verification: { google: '', bing: undefined } }))).not.toContain('verification-missing');
    const tagged = ghSite((f) => {
      f['index.html'] = f['index.html'].replace('<meta charSet', '<meta name="google-site-verification" content="g-token"/><meta name="msvalidate.01" content="b-token"/><meta charSet');
    });
    expect(errorRules(runGh(tagged, { verification: { google: 'g-token', bing: 'b-token' } }))).not.toContain('verification-missing');
    expect(errorRules(runGh(tagged, { verification: { bing: 'iny-token' } }))).toContain('verification-missing');
  });

  it('z cesty súboru urobí adresu stránky s lomkou na konci', () => {
    const dir = makeSite();
    const paths = listPages(dir).map((p) => p.urlPath);
    expect(paths).toEqual(expect.arrayContaining(['/', '/en/', '/en/trails/', '/404.html']));
  });

  it('prečíta overovacie tagy a placeholder z hlavičky', () => {
    const p = extractPage('<html><head><meta name="google-site-verification" content="g"/><meta name="msvalidate.01" content="b"/></head><body>https://example.com</body></html>', '/');
    expect(p.verification).toEqual({ google: ['g'], bing: ['b'] });
    expect(p.hasPlaceholder).toBe(true);
  });
});
