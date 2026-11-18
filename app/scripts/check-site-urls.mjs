import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const PLACEHOLDER_HOSTS = ['example.com', 'example.org', 'localhost', '127.0.0.1'];
const ENTITIES = { amp: '&', quot: '"', '#x27': "'", '#39': "'", lt: '<', gt: '>' };

export const normalizeSiteUrl = (value) => (value ?? '').replace(/\/$/, '');

export function siteUrlProblems(siteUrl) {
  if (!siteUrl) return ['NEXT_PUBLIC_SITE_URL nie je nastavená'];
  if (!URL.canParse(siteUrl)) return [`NEXT_PUBLIC_SITE_URL nie je platná URL: ${siteUrl}`];
  const url = new URL(siteUrl);
  const problems = [];
  if (url.protocol !== 'https:') problems.push(`NEXT_PUBLIC_SITE_URL musí začínať https:// (je ${siteUrl})`);
  if (PLACEHOLDER_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))) {
    problems.push(`NEXT_PUBLIC_SITE_URL je zástupná adresa ${siteUrl}`);
  }
  if (url.search || url.hash) problems.push(`NEXT_PUBLIC_SITE_URL nesmie obsahovať ? ani # (je ${siteUrl})`);
  return problems;
}

const decode = (text) => text.replace(/&(amp|quot|#x27|#39|lt|gt);/g, (_, name) => ENTITIES[name]);

function attributes(tag) {
  const result = {};
  for (const [, name, value] of tag.matchAll(/([\w:.-]+)="([^"]*)"/g)) result[name.toLowerCase()] = decode(value);
  return result;
}

function strings(value) {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === 'object') return Object.values(value).flatMap(strings);
  return [];
}

export function readHead(html) {
  const links = [...html.matchAll(/<link\b[^>]*>/g)].map(([tag]) => attributes(tag));
  const metas = [...html.matchAll(/<meta\b[^>]*>/g)].map(([tag]) => attributes(tag));
  const meta = (key) => metas.filter((m) => m.property === key || m.name === key).map((m) => m.content ?? '');
  const jsonLd = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(
    ([, body]) => JSON.parse(body),
  );
  return {
    canonical: links.filter((link) => link.rel === 'canonical').map((link) => link.href),
    alternates: links.filter((link) => link.rel === 'alternate' && link.hreflang).map((link) => link.href),
    noindex: meta('robots').some((content) => /noindex/i.test(content)),
    ogUrl: meta('og:url'),
    images: [...meta('og:image'), ...meta('twitter:image')],
    verification: { google: meta('google-site-verification'), bing: meta('msvalidate.01') },
    jsonLdUrls: jsonLd.flatMap(strings).filter((value) => /^https?:\/\//.test(value)),
  };
}

function htmlFiles(dir, root = dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '_next' ? [] : htmlFiles(full, root);
    return entry.name.endsWith('.html') ? [path.relative(root, full).split(path.sep).join('/')] : [];
  });
}

export function pageUrl(siteUrl, file) {
  if (file === 'index.html') return `${siteUrl}/`;
  if (file.endsWith('/index.html')) return `${siteUrl}/${file.slice(0, -'index.html'.length)}`;
  return `${siteUrl}/${file}`;
}

const isFile = (file) => existsSync(file) && statSync(file).isFile();

export function checkSite({ outDir, siteUrl, production = false, verification = {} }) {
  const problems = siteUrlProblems(siteUrl);
  if (!URL.canParse(siteUrl) || (production && problems.length)) return { errors: problems, pages: 0 };

  const errors = [];
  const prefix = `${siteUrl}/`;
  const { origin } = new URL(siteUrl);
  const read = (file) => readFileSync(path.join(outDir, file), 'utf8');
  const has = (file) => isFile(path.join(outDir, file));
  const target = (where, what, url) => {
    if (!url.startsWith(prefix)) {
      errors.push(`${where}: ${what} ${url} nezačína na ${prefix}`);
      return;
    }
    const rest = decodeURI(url.slice(siteUrl.length).split(/[?#]/)[0]);
    if (!has(rest.endsWith('/') ? `${rest}index.html` : rest)) errors.push(`${where}: ${what} ${url} nemá súbor vo výstupe`);
  };

  const pages = new Set();
  for (const file of htmlFiles(outDir)) {
    const html = read(file);
    if (production && html.includes('example.com')) errors.push(`${file}: obsahuje example.com`);
    const head = readHead(html);
    head.alternates.forEach((url) => target(file, 'hreflang', url));
    head.images.forEach((url) => target(file, 'obrázok', url));
    head.jsonLdUrls.filter((url) => url.startsWith(origin)).forEach((url) => target(file, 'JSON-LD', url));
    if (head.noindex) continue;
    const expected = pageUrl(siteUrl, file);
    if (head.canonical.length !== 1) errors.push(`${file}: má ${head.canonical.length} canonical`);
    else if (head.canonical[0] !== expected) errors.push(`${file}: canonical ${head.canonical[0]} namiesto ${expected}`);
    if (head.ogUrl.length !== 1 || head.ogUrl[0] !== expected) {
      errors.push(`${file}: og:url ${head.ogUrl.join(', ') || 'chýba'} namiesto ${expected}`);
    }
    pages.add(expected);
  }

  if (!has('sitemap.xml')) errors.push('chýba sitemap.xml');
  else {
    const xml = read('sitemap.xml');
    const locs = [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map(([, url]) => decode(url.trim()));
    const listed = new Set(locs);
    locs.forEach((url) => target('sitemap.xml', 'loc', url));
    [...xml.matchAll(/<xhtml:link\b[^>]*>/g)].forEach(([tag]) => target('sitemap.xml', 'hreflang', attributes(tag).href ?? ''));
    if (listed.size !== locs.length) errors.push('sitemap.xml: obsahuje duplicitné URL');
    for (const url of pages) if (!listed.has(url)) errors.push(`sitemap.xml: chýba ${url}`);
    for (const url of listed) if (!pages.has(url)) errors.push(`sitemap.xml: ${url} nie je indexovateľná stránka`);
  }

  const sitemapLine = `Sitemap: ${siteUrl}/sitemap.xml`;
  if (!has('robots.txt')) errors.push('chýba robots.txt');
  else if (!read('robots.txt').split(/\r?\n/).includes(sitemapLine)) errors.push(`robots.txt: chýba riadok ${sitemapLine}`);

  const home = has('index.html') ? readHead(read('index.html')) : undefined;
  for (const [name, token] of Object.entries(verification)) {
    if (token && !home?.verification[name]?.includes(token)) errors.push(`index.html: chýba overovací meta tag ${name}`);
  }

  if (pages.size === 0) errors.push('nenašla sa žiadna indexovateľná stránka');
  return { errors, pages: pages.size };
}

function main() {
  const args = process.argv.slice(2);
  const production = args.includes('--production');
  const outDir = path.resolve(args.find((arg) => !arg.startsWith('--')) ?? 'out');
  const siteUrl = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL ?? (production ? '' : 'https://example.com'));
  const verification = {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim(),
    bing: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION?.trim(),
  };
  const { errors, pages } = checkSite({ outDir, siteUrl, production, verification });
  if (errors.length) {
    console.error(`Kontrola URL zlyhala (${errors.length}):`);
    errors.slice(0, 50).forEach((error) => console.error(`  ${error}`));
    if (errors.length > 50) console.error(`  … a ďalších ${errors.length - 50}`);
    process.exit(1);
  }
  console.log(`OK: ${pages} stránok, canonical, hreflang, og, JSON-LD, sitemap a robots smerujú na ${siteUrl}/`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
