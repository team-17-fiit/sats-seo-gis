#!/usr/bin/env node
// =============================================================================
// Lokálny server pre zbuildovaný web (out/) – správa sa ako GitHub Pages (T3-14).
// -----------------------------------------------------------------------------
// Prečo nie `serve`: Chromiu neposielal gzip, takže Lighthouse a E2E merali nekomprimovanú
// veľkosť JS (~360 kB namiesto ~110 kB) – budgety by nesedeli s produkciou ani s dokumentáciou
// (Table 5.2 uvádza veľkosti v gzip). Tento server:
//   - komprimuje textové súbory gzipom (ako GitHub Pages),
//   - /cesta  -> 301 na /cesta/ (trailingSlash), /cesta/ -> /cesta/index.html,
//   - neexistujúca adresa -> 404.html so stavom 404,
//   - nepustí požiadavku mimo out/ (path traversal).
// Spustenie: npm run preview   (port 4173, iný: --port 5000 alebo PORT=5000)
// =============================================================================
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import zlib from 'node:zlib';

const args = process.argv.slice(2);
const argPort = args.includes('--port') ? Number(args[args.indexOf('--port') + 1]) : undefined;
const PORT = argPort ?? Number(process.env.PORT ?? 4173);
const ROOT = path.resolve(args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--port') ?? 'out');

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.geojson': 'application/geo+json', '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.pbf': 'application/x-protobuf',
};
const COMPRESSIBLE = /^(text\/|application\/(json|geo\+json|xml|manifest\+json)|image\/svg)/;
const gzCache = new Map();

if (!fs.existsSync(ROOT)) {
  console.error(`Priečinok ${ROOT} neexistuje – spusti najprv npm run build`);
  process.exit(1);
}

function resolveFile(urlPath) {
  const rel = path.normalize(decodeURIComponent(urlPath)).replace(/^([/\\])+/, '');
  const full = path.join(ROOT, rel);
  if (full !== ROOT && !full.startsWith(ROOT + path.sep)) return { status: 403 };
  if (urlPath.endsWith('/')) {
    const index = path.join(full, 'index.html');
    return fs.existsSync(index) ? { file: index } : { status: 404 };
  }
  if (fs.existsSync(full) && fs.statSync(full).isFile()) return { file: full };
  if (fs.existsSync(full) && fs.statSync(full).isDirectory()) return { redirect: `${urlPath}/` };
  if (fs.existsSync(`${full}.html`)) return { file: `${full}.html` };
  return { status: 404 };
}

function send(req, res, file, status = 200) {
  const type = TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream';
  let body = fs.readFileSync(file);
  const headers = { 'Content-Type': type, 'Cache-Control': 'no-cache', Vary: 'Accept-Encoding' };
  if (COMPRESSIBLE.test(type) && /\bgzip\b/.test(req.headers['accept-encoding'] ?? '') && body.length > 1024) {
    const key = `${file}:${fs.statSync(file).mtimeMs}`;
    if (!gzCache.has(key)) gzCache.set(key, zlib.gzipSync(body, { level: 9 }));
    body = gzCache.get(key);
    headers['Content-Encoding'] = 'gzip';
  }
  headers['Content-Length'] = body.length;
  res.writeHead(status, headers);
  res.end(req.method === 'HEAD' ? undefined : body);
}

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405).end();
    return;
  }
  const url = new URL(req.url ?? '/', 'http://localhost');
  const r = resolveFile(url.pathname);
  if (r.redirect) {
    res.writeHead(301, { Location: r.redirect + url.search }).end();
    return;
  }
  if (r.file) return send(req, res, r.file);
  const notFound = path.join(ROOT, '404.html');
  if (r.status === 404 && fs.existsSync(notFound)) return send(req, res, notFound, 404);
  res.writeHead(r.status ?? 500).end();
});

server.listen(PORT, () => {
  // Text, podľa ktorého Lighthouse CI a Playwright poznajú, že server beží (startServerReadyPattern).
  console.log(`Accepting connections at http://localhost:${PORT} (${path.relative(process.cwd(), ROOT) || '.'})`);
});
