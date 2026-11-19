// =============================================================================
// SEO audit vygenerovaného webu (S3-7: T3-21, T3-22).
// -----------------------------------------------------------------------------
// Číta statický export (out/) presne tak, ako ho dostane crawler – bez JavaScriptu – a kontroluje
// KAŽDÚ stránku (nie vzorku). HTML sa parsuje parse5 (cez cheerio), teda rovnakým algoritmom
// ako v prehliadači. Pravidlá sú opísané v docs/methodology/seo-checks.md.
//
// Výstup: zoznam nálezov { level: 'error'|'warn', rule, url, message }.
// 'error' = blokuje merge (CI padne), 'warn' = vypíše sa, opraví sa podľa priority.
// =============================================================================
import fs from 'node:fs';
import path from 'node:path';
import { load } from 'cheerio';

// ---------------------------------------------------------------- limity (dokumentované v seo-checks.md)
export const LIMITS = {
  // Google skracuje titulok vo výsledkoch podľa šírky (~600 px ≈ 55–60 znakov).
  titleMin: 15, titleWarn: 60, titleMax: 70,
  // Snippet má ~150–160 znakov; kratší opis Google často nahradí vlastným výrezom textu.
  descMin: 70, descWarn: 160, descMax: 200,
  ogWidth: 1200, ogHeight: 630,
};

export const LOCALES = ['sk', 'en'];
const OG_LOCALE = { sk: 'sk_SK', en: 'en_GB' };
const PLACEHOLDER_HOSTS = ['example.com', 'example.org', 'localhost', '127.0.0.1'];

/** Druh stránky a jazyk podľa cesty (zrkadlí app/src/lib/i18n.ts). */
export function classify(urlPath) {
  const p = urlPath;
  const en = p === '/en/' || p.startsWith('/en/');
  const locale = en ? 'en' : 'sk';
  const rest = en ? p.slice(3) : p;
  const seg = rest.split('/').filter(Boolean);
  const sections = en
    ? { trails: 'trails', places: 'places', peaks: 'peaks' }
    : { trails: 'trasy', places: 'miesta', peaks: 'vrcholy' };
  if (seg.length === 0) return { locale, kind: 'home' };
  if (seg[0] === sections.trails) return seg.length === 1 ? { locale, kind: 'trails' } : { locale, kind: 'trail', slug: seg[1] };
  if (seg[0] === sections.places && seg.length === 2) return { locale, kind: 'place', slug: seg[1] };
  if (seg[0] === sections.peaks && seg.length === 2) return { locale, kind: 'peak', slug: seg[1] };
  return { locale, kind: 'other' };
}

const norm = (s) => (s ?? '').replace(/\s+/g, ' ').trim();

/** Vytiahne z HTML všetko, čo SEO pravidlá potrebujú. Čistá funkcia – testuje sa bez buildu. */
export function extractPage(html, urlPath) {
  const $ = load(html);
  const meta = (sel) => $(sel).map((_, el) => $(el).attr('content') ?? '').get();
  const jsonld = $('script[type="application/ld+json"]').map((_, el) => {
    const text = $(el).text();
    try {
      return { ok: true, data: JSON.parse(text) };
    } catch (e) {
      return { ok: false, error: e.message, text: text.slice(0, 80) };
    }
  }).get();

  const headings = $('h1,h2,h3,h4,h5,h6').map((_, el) => ({ level: Number(el.tagName.slice(1)), text: norm($(el).text()) })).get();

  const images = $('img, input[type="image"], area').map((_, el) => ({
    tag: el.tagName,
    src: $(el).attr('src') ?? $(el).attr('href') ?? '',
    alt: $(el).attr('alt'),
    hidden: $(el).attr('aria-hidden') === 'true' || $(el).attr('role') === 'presentation' || $(el).attr('role') === 'none',
    inLink: $(el).closest('a').length > 0,
  })).get();

  // Prvky s rolou obrázka (napr. SVG statickej mapy) musia mať prístupný názov.
  const roleImages = $('[role="img"], svg:not([aria-hidden="true"])').map((_, el) => ({
    tag: el.tagName,
    name: norm($(el).attr('aria-label') || '') || ($(el).attr('aria-labelledby') ? 'labelledby' : '') || norm($(el).children('title').first().text()),
    role: $(el).attr('role') ?? null,
  })).get();

  const links = $('a[href]').map((_, el) => ({
    href: $(el).attr('href'),
    text: norm($(el).text()) || norm($(el).attr('aria-label')) || norm($(el).find('img[alt]').attr('alt')),
    hreflang: $(el).attr('hreflang') ?? $(el).attr('hrefLang') ?? null,
  })).get();

  return {
    urlPath,
    lang: $('html').attr('lang') ?? null,
    titles: $('head title').map((_, el) => norm($(el).text())).get(),
    titlesInBody: $('body title').filter((_, el) => $(el).closest('svg').length === 0).length,
    descriptions: meta('meta[name="description"]').map(norm),
    robots: meta('meta[name="robots"], meta[name="googlebot"]').map((s) => s.toLowerCase()),
    // overovacie meta tagy Search Console / Bing Webmaster (T3-06)
    verification: { google: meta('meta[name="google-site-verification"]'), bing: meta('meta[name="msvalidate.01"]') },
    hasPlaceholder: /example\.(com|org)/.test(html),
    viewport: meta('meta[name="viewport"]')[0] ?? null,
    charset: $('meta[charset], meta[charSet]').length > 0,
    icons: $('link[rel~="icon"]').map((_, el) => $(el).attr('href')).get(),
    canonicals: $('link[rel="canonical"]').map((_, el) => $(el).attr('href')).get(),
    alternates: $('link[rel="alternate"][hreflang], link[rel="alternate"][hrefLang]').map((_, el) => ({
      hreflang: $(el).attr('hreflang') ?? $(el).attr('hrefLang'),
      href: $(el).attr('href'),
    })).get(),
    og: Object.fromEntries(
      ['og:title', 'og:description', 'og:url', 'og:type', 'og:image', 'og:image:alt', 'og:image:width', 'og:image:height', 'og:locale', 'og:site_name']
        .map((k) => [k, meta(`meta[property="${k}"]`)]),
    ),
    twitter: Object.fromEntries(['twitter:card', 'twitter:title', 'twitter:image', 'twitter:image:alt'].map((k) => [k, meta(`meta[name="${k}"]`)])),
    h1: headings.filter((h) => h.level === 1).map((h) => h.text),
    headings,
    images,
    roleImages,
    links,
    jsonld,
    mainCount: $('main').length,
  };
}

/** Všetky reťazce, ktoré vyzerajú ako URL, kdekoľvek v JSON-LD dokumente. */
export function collectUrls(doc, out = []) {
  if (typeof doc === 'string') {
    if (/^https?:\/\//.test(doc)) out.push(doc);
  } else if (Array.isArray(doc)) doc.forEach((d) => collectUrls(d, out));
  else if (doc && typeof doc === 'object') {
    for (const [k, v] of Object.entries(doc)) if (k !== '@context') collectUrls(v, out);
  }
  return out;
}

/** Rozmery PNG zo záhlavia IHDR (bajty 16–23) – overí, že og:image naozaj má 1200×630. */
export function pngSize(buf) {
  if (buf.length < 24 || buf.toString('ascii', 1, 4) !== 'PNG') return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

/** Zoznam HTML stránok v out/ -> { urlPath, file } (index.html -> /cesta/). */
export function listPages(outDir) {
  const pages = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name !== '_next') walk(full);
      } else if (e.name.endsWith('.html')) {
        const rel = '/' + path.relative(outDir, full).split(path.sep).join('/');
        const urlPath = rel.endsWith('/index.html') ? rel.slice(0, -'index.html'.length) : rel;
        pages.push({ urlPath: urlPath === '' ? '/' : urlPath, file: full });
      }
    }
  };
  walk(outDir);
  return pages.sort((a, b) => a.urlPath.localeCompare(b.urlPath));
}

const isNotFound = (urlPath) => urlPath === '/404.html' || urlPath === '/404/' || urlPath === '/_not-found/';

/** Parsovanie sitemap.xml: <loc> + <xhtml:link hreflang>. */
export function parseSitemap(xml) {
  const $ = load(xml, { xml: true });
  return $('url').map((_, el) => ({
    loc: norm($(el).children('loc').text()),
    alternates: $(el).children('xhtml\\:link').map((__, l) => ({ hreflang: $(l).attr('hreflang'), href: $(l).attr('href') })).get(),
  })).get();
}

/**
 * Hlavná funkcia: audit celého webu.
 * `verification` = očakávané tokeny overovacích meta tagov ({ google, bing }); prázdne sa nekontrolujú.
 * @param {{ outDir: string, siteUrl: string, basePath?: string, production?: boolean, verification?: { google?: string, bing?: string } }} opts
 */
export function auditSite({ outDir, siteUrl, basePath = '', production = false, verification = {} }) {
  const site = siteUrl.replace(/\/$/, '');
  const base = basePath.replace(/\/$/, '');
  const findings = [];
  const add = (level, rule, url, message) => findings.push({ level, rule, url, message });

  const files = listPages(outDir);
  const pages = files.map(({ urlPath, file }) => ({ ...extractPage(fs.readFileSync(file, 'utf8'), urlPath), ...classify(urlPath), notFound: isNotFound(urlPath) }));
  const byPath = new Map(pages.map((p) => [p.urlPath, p]));
  const indexable = pages.filter((p) => !p.notFound);
  const absUrl = (urlPath) => site + urlPath;
  /** Absolútna URL webu -> cesta v out/ (alebo null, ak je mimo webu). */
  const toPath = (url) => {
    if (typeof url !== 'string' || !url.startsWith(site + '/')) return null;
    return url.slice(site.length).split('#')[0].split('?')[0];
  };
  const origin = (() => { try { return new URL(site).origin; } catch { return ''; } })();
  const sameOrigin = (url) => { try { return new URL(url).origin === origin; } catch { return false; } };
  /** Existuje cieľ (stránka alebo súbor) v out/? */
  const exists = (p) => {
    if (byPath.has(p)) return true;
    const f = path.join(outDir, decodeURIComponent(p));
    return fs.existsSync(f) && fs.statSync(f).isFile();
  };

  // --------------------------------------------------------------------- konfigurácia
  const host = (() => { try { return new URL(site).hostname; } catch { return ''; } })();
  if (!host) add('error', 'site-url', '-', `neplatná adresa webu "${siteUrl}"`);
  if (/[?#]/.test(siteUrl)) add('error', 'site-url-query', '-', `adresa webu nesmie obsahovať ? ani # (${siteUrl})`);
  if (production && PLACEHOLDER_HOSTS.some((h) => host === h || host.endsWith('.' + h))) {
    add('error', 'site-url-placeholder', '-', `produkčný build s placeholder adresou ${site} – nastav NEXT_PUBLIC_SITE_URL (dokumentácia Z-B.8: placeholder URL sú zakázané)`);
  }
  if (production && !site.startsWith('https://')) add('error', 'site-url-https', '-', `produkčná adresa musí byť https (${site})`);
  if (indexable.length === 0) add('error', 'no-pages', '-', `v ${outDir} nie sú žiadne HTML stránky – spusti najprv npm run build`);

  // --------------------------------------------------------------------- stránka po stránke
  for (const pg of pages) {
    const u = pg.urlPath;
    const err = (rule, msg) => add('error', rule, u, msg);
    const warn = (rule, msg) => add('warn', rule, u, msg);

    // ---- 404: nesmie sa indexovať, inak sa nič ďalšie nekontroluje
    if (pg.notFound) {
      if (production && pg.hasPlaceholder) err('placeholder-in-html', 'stránka obsahuje placeholder adresu example.com/org (dokumentácia Z-B.8)');
      if (!pg.robots.some((r) => r.includes('noindex'))) err('404-noindex', 'stránka 404 musí mať <meta name="robots" content="noindex">');
      if (pg.canonicals.length) err('404-canonical', 'stránka 404 nesmie mať canonical');
      continue;
    }
    if (production && pg.hasPlaceholder) err('placeholder-in-html', 'stránka obsahuje placeholder adresu example.com/org (dokumentácia Z-B.8)');
    if (pg.kind === 'other') warn('unknown-page', 'stránka nepatrí do žiadneho známeho typu (úvod, trasy, trasa, miesto, vrchol)');

    // ---- základ dokumentu
    if (pg.lang !== pg.locale) err('html-lang', `<html lang="${pg.lang}"> nezodpovedá jazyku stránky "${pg.locale}"`);
    if (!pg.charset) err('charset', 'chýba <meta charset>');
    if (!pg.viewport || !/width=device-width/.test(pg.viewport)) err('viewport', 'chýba <meta name="viewport" content="width=device-width, ...">');
    if (pg.viewport && /user-scalable\s*=\s*no|maximum-scale\s*=\s*1(\.0)?\b/.test(pg.viewport)) err('viewport-zoom', 'viewport zakazuje zoom (WCAG 1.4.4)');
    if (pg.robots.some((r) => /noindex|none/.test(r))) err('robots-noindex', `indexovateľná stránka má robots "${pg.robots.join(', ')}"`);
    if (pg.robots.some((r) => /nofollow/.test(r))) err('robots-nofollow', 'stránka má nofollow – crawler nenájde podstránky');

    // ---- favicon (bez nej prehliadač skúša /favicon.ico -> 404 a chyba v konzole)
    if (pg.icons.length === 0) err('favicon-missing', 'chýba <link rel="icon">');
    for (const href of pg.icons) {
      const target = base && href.startsWith(base + '/') ? href.slice(base.length) : href;
      if (target.startsWith('/') && !exists(target)) err('favicon-broken', `ikona ${href} neexistuje`);
    }

    // ---- title
    if (pg.titles.length === 0) err('title-missing', 'chýba <title>');
    if (pg.titles.length > 1) err('title-multiple', `${pg.titles.length}× <title> v <head>`);
    if (pg.titlesInBody) err('title-in-body', '<title> mimo <head>');
    const title = pg.titles[0] ?? '';
    if (pg.titles.length && !title) err('title-empty', 'prázdny <title>');
    if (title && title.length < LIMITS.titleMin) err('title-length', `title má ${title.length} znakov (min. ${LIMITS.titleMin}): "${title}"`);
    if (title.length > LIMITS.titleMax) err('title-length', `title má ${title.length} znakov (max. ${LIMITS.titleMax}): "${title}"`);
    else if (title.length > LIMITS.titleWarn) warn('title-length', `title má ${title.length} znakov, Google ho pravdepodobne skráti (> ${LIMITS.titleWarn}): "${title}"`);

    // ---- description
    if (pg.descriptions.length === 0) err('description-missing', 'chýba <meta name="description">');
    if (pg.descriptions.length > 1) err('description-multiple', `${pg.descriptions.length}× meta description`);
    const desc = pg.descriptions[0] ?? '';
    if (pg.descriptions.length && !desc) err('description-empty', 'prázdna meta description');
    if (desc && desc.length < LIMITS.descMin) err('description-length', `description má ${desc.length} znakov (min. ${LIMITS.descMin}): "${desc}"`);
    if (desc.length > LIMITS.descMax) err('description-length', `description má ${desc.length} znakov (max. ${LIMITS.descMax})`);
    else if (desc.length > LIMITS.descWarn) warn('description-length', `description má ${desc.length} znakov, Google ju skráti (> ${LIMITS.descWarn})`);
    if (desc && title && desc.toLowerCase() === title.toLowerCase()) err('description-equals-title', 'description je rovnaká ako title');

    // ---- nadpisy
    if (pg.h1.length !== 1) err('h1-count', `stránka má ${pg.h1.length}× <h1> (má mať práve 1)`);
    if (pg.h1.some((h) => !h)) err('h1-empty', 'prázdny <h1>');
    if (pg.headings.length && pg.headings[0].level !== 1) err('heading-order', `prvý nadpis je <h${pg.headings[0].level}>, má byť <h1>`);
    for (let i = 1; i < pg.headings.length; i++) {
      const prev = pg.headings[i - 1].level;
      const cur = pg.headings[i].level;
      if (cur > prev + 1) err('heading-order', `po <h${prev}> nasleduje <h${cur}> ("${pg.headings[i].text}") – preskočená úroveň`);
    }
    if (pg.headings.some((h) => h.level > 1 && !h.text)) err('heading-empty', 'prázdny nadpis');
    if (pg.h1[0] && title && !title.toLowerCase().includes(pg.h1[0].toLowerCase()) && pg.kind !== 'home') {
      warn('title-h1-mismatch', `title "${title}" neobsahuje text <h1> "${pg.h1[0]}"`);
    }
    if (pg.mainCount !== 1) err('main-landmark', `stránka má ${pg.mainCount}× <main> (má mať práve 1)`);

    // ---- canonical
    const expected = absUrl(u);
    if (pg.canonicals.length === 0) err('canonical-missing', 'chýba <link rel="canonical">');
    if (pg.canonicals.length > 1) err('canonical-multiple', `${pg.canonicals.length}× canonical`);
    const canonical = pg.canonicals[0];
    if (canonical !== undefined) {
      if (!/^https?:\/\//.test(canonical)) err('canonical-relative', `canonical musí byť absolútna URL (je "${canonical}")`);
      else if (canonical !== expected) err('canonical-self', `canonical "${canonical}" neukazuje na samotnú stránku (${expected})`);
      if (/[?#]/.test(canonical)) err('canonical-query', 'canonical obsahuje ? alebo #');
    }

    // ---- hreflang (vzájomné odkazy SK <-> EN + x-default)
    const alt = new Map();
    for (const a of pg.alternates) {
      if (alt.has(a.hreflang)) err('hreflang-duplicate', `hreflang="${a.hreflang}" je uvedený viackrát`);
      alt.set(a.hreflang, a.href);
      if (!/^https?:\/\//.test(a.href ?? '')) err('hreflang-relative', `hreflang="${a.hreflang}" nemá absolútnu URL`);
      if (!/^(x-default|[a-z]{2,3}(-[A-Za-z]{2,4})?)$/.test(a.hreflang ?? '')) err('hreflang-code', `neplatný kód hreflang="${a.hreflang}"`);
    }
    for (const code of [...LOCALES, 'x-default']) if (!alt.has(code)) err('hreflang-missing', `chýba <link rel="alternate" hreflang="${code}">`);
    for (const code of alt.keys()) if (![...LOCALES, 'x-default'].includes(code)) err('hreflang-unexpected', `nečakaný hreflang="${code}"`);
    if (alt.get(pg.locale) && alt.get(pg.locale) !== expected) err('hreflang-self', `hreflang="${pg.locale}" má ukazovať na samotnú stránku (${expected}), ukazuje na ${alt.get(pg.locale)}`);
    if (alt.get('x-default') && alt.get('sk') && alt.get('x-default') !== alt.get('sk')) err('hreflang-x-default', 'x-default musí byť slovenská verzia (predvolený jazyk)');
    for (const [code, href] of alt) {
      if (code === 'x-default') continue;
      const target = toPath(href);
      if (!target || !byPath.has(target)) {
        err('hreflang-target', `hreflang="${code}" ukazuje na neexistujúcu stránku ${href}`);
        continue;
      }
      const other = byPath.get(target);
      if (other.locale !== code) err('hreflang-target-lang', `hreflang="${code}" ukazuje na stránku v jazyku "${other.locale}"`);
      const back = other.alternates.find((a) => a.hreflang === pg.locale)?.href;
      if (back !== expected) err('hreflang-reciprocal', `${href} neodkazuje späť cez hreflang="${pg.locale}" (odkazuje na ${back ?? 'nič'})`);
    }

    // ---- Open Graph / Twitter (náhľad pri zdieľaní)
    const og = (k) => pg.og[k]?.[0];
    for (const k of ['og:title', 'og:description', 'og:url', 'og:type', 'og:image', 'og:image:alt', 'og:locale', 'og:site_name']) {
      if (!og(k)) err('og-missing', `chýba <meta property="${k}">`);
    }
    if (og('og:url') && og('og:url') !== expected) err('og-url', `og:url "${og('og:url')}" ≠ canonical ${expected}`);
    if (og('og:locale') && og('og:locale') !== OG_LOCALE[pg.locale]) err('og-locale', `og:locale "${og('og:locale')}" ≠ ${OG_LOCALE[pg.locale]}`);
    if (og('og:image')) {
      const imgPath = toPath(og('og:image'));
      if (!imgPath) err('og-image-url', `og:image musí byť absolútna URL tohto webu (je ${og('og:image')})`);
      else if (!exists(imgPath)) err('og-image-missing', `og:image ${og('og:image')} neexistuje v builde`);
      else {
        const size = pngSize(fs.readFileSync(path.join(outDir, imgPath)));
        if (!size) err('og-image-format', `og:image ${imgPath} nie je PNG`);
        else if (size.width !== LIMITS.ogWidth || size.height !== LIMITS.ogHeight) err('og-image-size', `og:image má ${size.width}×${size.height}, má mať ${LIMITS.ogWidth}×${LIMITS.ogHeight}`);
        if (og('og:image:width') && Number(og('og:image:width')) !== size?.width) err('og-image-size', 'og:image:width nesedí so skutočným obrázkom');
        if (og('og:image:height') && Number(og('og:image:height')) !== size?.height) err('og-image-size', 'og:image:height nesedí so skutočným obrázkom');
      }
    }
    if (!pg.twitter['twitter:card']?.[0]) err('twitter-card', 'chýba twitter:card');
    for (const img of pg.twitter['twitter:image'] ?? []) {
      const p = toPath(img);
      if (!p) err('twitter-image-url', `twitter:image musí byť absolútna URL tohto webu (je ${img})`);
      else if (!exists(p)) err('twitter-image-missing', `twitter:image ${img} neexistuje v builde`);
    }
    if (pg.twitter['twitter:image']?.[0] && !pg.twitter['twitter:image:alt']?.[0]) err('twitter-image-alt', 'twitter:image nemá alt text');

    // ---- obrázky a alternatívne texty
    for (const img of pg.images) {
      if (img.alt === undefined) {
        err('img-alt-missing', `<${img.tag} src="${img.src}"> nemá atribút alt`);
        continue;
      }
      const alt = norm(img.alt);
      if (!alt && img.inLink) err('img-alt-link', `obrázok v odkaze má prázdny alt (odkaz nemá názov) – ${img.src}`);
      if (alt && /\.(png|jpe?g|webp|gif|svg|avif)$/i.test(alt)) err('img-alt-filename', `alt je názov súboru: "${alt}"`);
      if (alt && /^(image|img|obrázok|foto|photo|picture|obr\.?)$/i.test(alt)) err('img-alt-generic', `alt nič nehovorí: "${alt}"`);
      if (alt.length > 150) warn('img-alt-long', `alt má ${alt.length} znakov – stručnejšie (< 150)`);
    }
    for (const ri of pg.roleImages) {
      if (ri.role === 'img' && !ri.name) err('role-img-name', `<${ri.tag} role="img"> nemá prístupný názov (aria-label)`);
      if (ri.tag === 'svg' && ri.role !== 'img' && ri.role !== 'presentation' && ri.role !== 'none') {
        warn('svg-role', 'inline <svg> bez role="img" alebo aria-hidden="true"');
      }
    }

    // ---- odkazy
    for (const l of pg.links) {
      const href = l.href ?? '';
      if (!l.text) err('link-name', `odkaz ${href} nemá text ani aria-label`);
      if (/^(javascript:|#$)/.test(href)) err('link-href', `odkaz bez cieľa "${href}"`);
      if (/^(https?:)?\/\//.test(href) || /^(mailto|tel):/.test(href) || href.startsWith('#')) continue;
      if (!href.startsWith('/')) { err('link-relative', `relatívny odkaz "${href}" – používaj cesty od koreňa`); continue; }
      if (base && !href.startsWith(base + '/')) { err('link-basepath', `odkaz "${href}" nemá basePath ${base}`); continue; }
      const target = href.slice(base.length).split('#')[0].split('?')[0];
      if (!target.endsWith('/') && byPath.has(target + '/')) { err('link-trailing-slash', `odkaz ${href} bez koncovej lomky (presmerovanie)`); continue; }
      if (!exists(target)) { err('link-broken', `nefunkčný interný odkaz ${href}`); continue; }
      const t = byPath.get(target);
      if (t && t.kind !== 'other' && t.locale !== pg.locale && l.hreflang !== t.locale) {
        err('link-locale', `odkaz ${href} vedie do iného jazyka bez hreflang (len prepínač jazyka smie)`);
      }
    }

    // ---- adresy v štruktúrovaných dátach (T3-06): každá URL tohto webu v JSON-LD existuje a začína adresou webu
    for (const block of pg.jsonld.filter((b) => b.ok)) {
      for (const url of collectUrls(block.data)) {
        const p = toPath(url);
        if (p !== null && !exists(p)) err('jsonld-url-broken', `JSON-LD odkazuje na neexistujúcu adresu ${url}`);
        // adresa na našej doméne, ale mimo adresy webu (napr. bez /sats-seo-gis/ alebo bez koncovej lomky)
        if (p === null && sameOrigin(url) && url !== site + '/') err('jsonld-url-outside', `JSON-LD adresa ${url} nezačína na ${site}/`);
      }
    }

  }

  // --------------------------------------------------------------------- unikátnosť naprieč webom
  const dupes = (getter, rule, what) => {
    const seen = new Map();
    for (const pg of indexable) {
      const v = getter(pg);
      if (!v) continue;
      const key = v.toLowerCase();
      if (!seen.has(key)) seen.set(key, []);
      seen.get(key).push(pg.urlPath);
    }
    for (const [value, urls] of seen) {
      if (urls.length > 1) for (const u of urls) add('error', rule, u, `${what} "${value}" majú aj ${urls.filter((x) => x !== u).join(', ')}`);
    }
  };
  dupes((p) => p.titles[0], 'title-duplicate', 'rovnaký title');
  dupes((p) => p.descriptions[0], 'description-duplicate', 'rovnakú description');
  // Rovnaký H1 je chyba len v rámci jedného jazyka (Rysy sú Rysy aj po anglicky).
  for (const locale of LOCALES) {
    const seen = new Map();
    for (const pg of indexable.filter((p) => p.locale === locale && p.h1[0])) {
      const k = pg.h1[0].toLowerCase();
      seen.set(k, [...(seen.get(k) ?? []), pg.urlPath]);
    }
    for (const [h, urls] of seen) if (urls.length > 1) for (const u of urls) add('error', 'h1-duplicate', u, `rovnaký <h1> "${h}" majú aj ${urls.filter((x) => x !== u).join(', ')}`);
  }

  // --------------------------------------------------------------------- sitemap.xml (diff s webom)
  const smFile = path.join(outDir, 'sitemap.xml');
  if (!fs.existsSync(smFile)) add('error', 'sitemap-missing', '/sitemap.xml', 'chýba sitemap.xml');
  else {
    const entries = parseSitemap(fs.readFileSync(smFile, 'utf8'));
    const locs = new Map();
    for (const e of entries) {
      if (locs.has(e.loc)) add('error', 'sitemap-duplicate', '/sitemap.xml', `adresa ${e.loc} je v sitemap viackrát`);
      locs.set(e.loc, e);
      const p = toPath(e.loc);
      if (!p) { add('error', 'sitemap-foreign', '/sitemap.xml', `${e.loc} nie je adresa tohto webu (${site})`); continue; }
      const pg = byPath.get(p);
      if (!pg) { add('error', 'sitemap-broken', '/sitemap.xml', `${e.loc} neexistuje v builde`); continue; }
      if (pg.notFound) add('error', 'sitemap-404', '/sitemap.xml', `stránka 404 nemá byť v sitemap (${e.loc})`);
      else if (pg.robots.some((r) => /noindex|none/.test(r))) add('error', 'sitemap-noindex', '/sitemap.xml', `${e.loc} má noindex, nemá byť v sitemap`);
      for (const a of e.alternates) {
        const ap = toPath(a.href);
        if (!ap || !byPath.has(ap)) add('error', 'sitemap-hreflang-target', '/sitemap.xml', `hreflang="${a.hreflang}" pri ${e.loc} vedie na neexistujúcu stránku ${a.href}`);
      }
      const fromSitemap = Object.fromEntries(e.alternates.map((a) => [a.hreflang, a.href]));
      const fromPage = Object.fromEntries(pg.alternates.map((a) => [a.hreflang, a.href]));
      if (JSON.stringify(Object.entries(fromSitemap).sort()) !== JSON.stringify(Object.entries(fromPage).sort())) {
        add('error', 'sitemap-hreflang', p, `hreflang v sitemap ${JSON.stringify(fromSitemap)} ≠ hreflang v HTML ${JSON.stringify(fromPage)}`);
      }
    }
    for (const pg of indexable) if (!locs.has(absUrl(pg.urlPath))) add('error', 'sitemap-missing-page', pg.urlPath, 'stránka chýba v sitemap.xml');
  }

  // --------------------------------------------------------------------- robots.txt
  const robotsFile = path.join(outDir, 'robots.txt');
  if (!fs.existsSync(robotsFile)) add('error', 'robots-missing', '/robots.txt', 'chýba robots.txt');
  else {
    const robots = fs.readFileSync(robotsFile, 'utf8');
    if (!robots.split(/\r?\n/).some((l) => l.trim().toLowerCase() === `sitemap: ${site}/sitemap.xml`.toLowerCase())) {
      add('error', 'robots-sitemap', '/robots.txt', `robots.txt neodkazuje na ${site}/sitemap.xml`);
    }
    if (/^\s*disallow:\s*\/\s*$/im.test(robots)) add('error', 'robots-disallow-all', '/robots.txt', 'robots.txt zakazuje celý web (Disallow: /)');
  }

  // --------------------------------------------------------------------- overenie Search Console / Bing (T3-06)
  // Google overuje vlastníctvo na úvodnej stránke; token z premennej prostredia musí byť v jej <head>.
  const home = byPath.get('/');
  for (const [name, token] of Object.entries(verification)) {
    if (!token) continue;
    if (!home?.verification[name]?.includes(token)) {
      add('error', 'verification-missing', '/', `úvodná stránka nemá overovací meta tag ${name === 'google' ? 'google-site-verification' : 'msvalidate.01'} s tokenom z premennej prostredia`);
    }
  }

  return { pages: indexable.length, findings, site };
}
