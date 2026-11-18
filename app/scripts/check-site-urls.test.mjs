import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { checkSite, pageUrl, readHead, siteUrlProblems } from './check-site-urls.mjs';

const SITE = 'https://team-17-fiit.github.io/sats-seo-gis';
const dirs = [];

afterEach(() => dirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true })));

function page(url, { head = '', noindex = false, websiteUrl = `${SITE}/` } = {}) {
  return [
    '<!DOCTYPE html><html lang="sk"><head>',
    noindex ? '<meta name="robots" content="noindex"/>' : '',
    `<link rel="canonical" href="${url}"/>`,
    `<link rel="alternate" hrefLang="sk" href="${SITE}/"/>`,
    `<link rel="alternate" hrefLang="en" href="${SITE}/en/"/>`,
    `<meta property="og:url" content="${url}"/>`,
    `<meta property="og:image" content="${SITE}/og/index.png"/>`,
    `<meta name="twitter:image" content="${SITE}/og/index.png"/>`,
    head,
    '</head><body>',
    `<script type="application/ld+json">{"@type":"WebSite","url":"${websiteUrl}","sameAs":"https://www.wikidata.org/wiki/Q214"}</script>`,
    '</body></html>',
  ].join('');
}

function site(files = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), 'check-site-urls-'));
  dirs.push(dir);
  const all = {
    'index.html': page(`${SITE}/`),
    'en/index.html': page(`${SITE}/en/`),
    '404.html': page(`${SITE}/`, { noindex: true }),
    '_next/static/x.html': '<html></html>',
    'og/index.png': 'png',
    'sitemap.xml': [
      '<urlset>',
      `<url><loc>${SITE}/</loc><xhtml:link rel="alternate" hreflang="en" href="${SITE}/en/" /></url>`,
      `<url><loc>${SITE}/en/</loc></url>`,
      '</urlset>',
    ].join(''),
    'robots.txt': `User-Agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`,
    ...files,
  };
  for (const [name, content] of Object.entries(all)) {
    if (content === null) continue;
    mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    writeFileSync(path.join(dir, name), content);
  }
  return dir;
}

const errorsFor = (files, options = {}) =>
  checkSite({ outDir: site(files), siteUrl: SITE, production: true, ...options }).errors.join('\n');

describe('siteUrlProblems', () => {
  it('prijme verejnú https adresu', () => {
    expect(siteUrlProblems(SITE)).toEqual([]);
    expect(siteUrlProblems('https://mapa.example.sk')).toEqual([]);
  });

  it.each([
    '',
    'nie-je-url',
    'https://example.com',
    'http://team-17-fiit.github.io/sats-seo-gis',
    'http://localhost:3000',
    `${SITE}?ref=1`,
  ])('odmietne %j', (value) => {
    expect(siteUrlProblems(value)).not.toEqual([]);
  });
});

describe('pageUrl', () => {
  it('z cesty súboru vo výstupe urobí kanonickú URL s lomkou na konci', () => {
    expect(pageUrl(SITE, 'index.html')).toBe(`${SITE}/`);
    expect(pageUrl(SITE, 'en/trails/index.html')).toBe(`${SITE}/en/trails/`);
    expect(pageUrl(SITE, '404.html')).toBe(`${SITE}/404.html`);
  });
});

describe('readHead', () => {
  it('prečíta canonical, hreflang, og, overovacie tagy a URL z JSON-LD', () => {
    const head = readHead(
      page(`${SITE}/?a=1&amp;b=2`, {
        head: '<meta name="google-site-verification" content="g"/><meta name="msvalidate.01" content="b"/>',
      }),
    );
    expect(head.canonical).toEqual([`${SITE}/?a=1&b=2`]);
    expect(head.alternates).toEqual([`${SITE}/`, `${SITE}/en/`]);
    expect(head.images).toEqual([`${SITE}/og/index.png`, `${SITE}/og/index.png`]);
    expect(head.verification).toEqual({ google: ['g'], bing: ['b'] });
    expect(head.jsonLdUrls).toEqual([`${SITE}/`, 'https://www.wikidata.org/wiki/Q214']);
    expect(head.noindex).toBe(false);
  });
});

describe('checkSite', () => {
  it('správny web prejde a noindex stránka nemusí byť v sitemap', () => {
    expect(checkSite({ outDir: site(), siteUrl: SITE, production: true })).toEqual({ errors: [], pages: 2 });
  });

  it('v produkcii odmietne zástupnú adresu ešte pred kontrolou súborov', () => {
    const { errors } = checkSite({ outDir: site(), siteUrl: 'https://example.com', production: true });
    expect(errors).toEqual(['NEXT_PUBLIC_SITE_URL je zástupná adresa https://example.com']);
  });

  it('odhalí canonical a og:url na inej doméne', () => {
    const errors = errorsFor({ 'en/index.html': page('https://example.com/en/') });
    expect(errors).toMatch(/en\/index\.html: canonical https:\/\/example\.com\/en\//);
    expect(errors).toMatch(/og:url/);
    expect(errors).toMatch(/obsahuje example\.com/);
  });

  it('odhalí stránku, ktorá chýba v sitemap', () => {
    expect(errorsFor({ 'trasy/index.html': page(`${SITE}/trasy/`) })).toMatch(/sitemap\.xml: chýba .*\/trasy\//);
  });

  it('odhalí URL v sitemap, ku ktorej nie je stránka', () => {
    const sitemap = `<urlset><url><loc>${SITE}/</loc></url><url><loc>${SITE}/en/</loc></url><url><loc>${SITE}/zmazana/</loc></url></urlset>`;
    expect(errorsFor({ 'sitemap.xml': sitemap })).toMatch(/zmazana\/ nemá súbor/);
  });

  it('odhalí chýbajúci náhľadový obrázok', () => {
    expect(errorsFor({ 'og/index.png': null })).toMatch(/obrázok .*og\/index\.png nemá súbor/);
  });

  it('odhalí URL v JSON-LD, ktorá nesedí s kanonickou adresou', () => {
    expect(errorsFor({ 'index.html': page(`${SITE}/`, { websiteUrl: SITE }) })).toMatch(/JSON-LD/);
  });

  it('odhalí robots.txt bez odkazu na sitemap', () => {
    expect(errorsFor({ 'robots.txt': 'User-Agent: *\nAllow: /\n' })).toMatch(/robots\.txt: chýba riadok Sitemap/);
  });

  it('overí overovacie meta tagy na úvodnej stránke', () => {
    expect(errorsFor({}, { verification: { google: 'g-token' } })).toMatch(/google/);
    const home = page(`${SITE}/`, { head: '<meta name="google-site-verification" content="g-token"/>' });
    expect(errorsFor({ 'index.html': home }, { verification: { google: 'g-token', bing: '' } })).toBe('');
  });
});
