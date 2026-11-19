// =============================================================================
// Výkonnostné budgety v E2E (T3-14 / S3-5; K3, K4; dokumentácia 5.1.4).
// -----------------------------------------------------------------------------
// "Playwright E2E testy otvoria každú stránku trasy na mobilnom profile a overia budgety:
//  LCP ≤ 2,5 s, CLS ≤ 0,1, žiadne chyby v konzole." Navyše to, čo Lighthouse CI nevidí:
//  - CLS a chyby PO kliknutí na "Zobraziť mapu" (mapa je ostrov, Lighthouse na ňu neklikne),
//  - veľkosť JS (gzip) pred mapou a po načítaní MapLibre (Table 5.2: MapLibre ≈ 210 kB gzip).
// Mobilný profil = Pixel 7 + spomalenie CPU 4× + sieť "Slow 4G" (150 ms RTT, 1,6 Mbit/s),
// rovnaké ako mobilný Lighthouse. Beží len v Chromiu (CDP).
// Spustenie: npm run test:budgets
// =============================================================================
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { test, expect } from '@playwright/test';
import { BUDGETS } from '../lighthouse/budgets.cjs';

const OUT = path.resolve('out');
const gzCache = new Map();
/**
 * Veľkosť JS po gzip spočítaná zo súborov v out/ (nie z bajtov na sieti): niektoré stanice majú
 * bezpečnostný softvér, ktorý lokálnu prevádzku dekomprimuje, a meranie by tak záviselo od počítača.
 * Takto je výsledok rovnaký lokálne aj v CI a zodpovedá tomu, čo pošle GitHub Pages (gzip).
 */
function gzipKb(urls, baseURL) {
  let bytes = 0;
  for (const u of new Set(urls)) {
    if (!u.startsWith(baseURL)) continue; // cudzí JS nemáme (kontroluje Lighthouse: third-party = 0)
    const file = path.join(OUT, decodeURIComponent(new URL(u).pathname));
    if (!gzCache.has(file)) gzCache.set(file, fs.existsSync(file) ? zlib.gzipSync(fs.readFileSync(file), { level: 9 }).length : 0);
    bytes += gzCache.get(file);
  }
  return bytes / 1024;
}

const TRAILS = ['hlavna-os', 'malokarpatska-vinna-cesta', 'povazska-hradna-cesta', 'cesta-marie', 'medvedi-chodnik', 'cyklotrasa-ev6-ev13-vah', 'okruh-muzei-a-galerii'];
const PAGES = [
  ...TRAILS.flatMap((s) => [`/trasy/${s}/`, `/en/trails/${s}/`]),
  '/', '/en/', '/trasy/', '/miesta/devin/', '/vrcholy/rysy/',
];

test.use({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.625 });
test.skip(({ browserName }) => browserName !== 'chromium', 'meranie cez CDP je len v Chromiu');

/**
 * Zapne mobilné spomalenie a meranie LCP/CLS (PerformanceObserver, buffered) ešte pred načítaním stránky.
 * Vracia zoznam načítaných JS súborov (pre budget veľkosti).
 */
async function mobileProfile(page) {
  const cdp = await page.context().newCDPSession(page);
  const net = { js: [] };
  page.on('response', (r) => { if (/\.js(\?|$)/.test(r.url()) && r.ok()) net.js.push(r.url().split('?')[0]); });
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8,
  });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.addInitScript(() => {
    window.__perf = { lcp: 0, cls: 0, shifts: [] };
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) window.__perf.lcp = e.startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) {
        if (e.hadRecentInput) continue; // posun po kliknutí používateľa sa do CLS nepočíta (definícia CLS)
        window.__perf.cls += e.value;
        window.__perf.shifts.push({ value: e.value, nodes: e.sources?.map((s) => s.node?.nodeName + (s.node?.id ? '#' + s.node.id : '')) });
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
  return net;
}

/** Chyby v konzole a neúspešné požiadavky na vlastný server. */
function collectErrors(page, baseURL) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(`JS výnimka: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });
  page.on('response', (r) => { if (r.url().startsWith(baseURL) && r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
  return errors;
}

const perf = (page) => page.evaluate(() => window.__perf);

for (const url of PAGES) {
  test(`${url}: LCP ≤ ${BUDGETS.lcp} ms, CLS ≤ ${BUDGETS.cls}, JS ≤ ${BUDGETS.scriptKb} kB, bez chýb (mobil)`, async ({ page, baseURL }) => {
    test.setTimeout(90_000);
    const net = await mobileProfile(page);
    const errors = collectErrors(page, baseURL);
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForLoadState('networkidle');
    const { lcp, cls, shifts } = await perf(page);
    const js = gzipKb(net.js, baseURL);

    console.log(`[budget] ${url} LCP ${Math.round(lcp)} ms · CLS ${cls.toFixed(3)} · JS ${Math.round(js)} kB`);
    expect(lcp, 'LCP sa nepodarilo zmerať').toBeGreaterThan(0);
    expect(lcp, `LCP ${Math.round(lcp)} ms`).toBeLessThanOrEqual(BUDGETS.lcp);
    expect(cls, `CLS ${cls.toFixed(3)}; posuny: ${JSON.stringify(shifts)}`).toBeLessThanOrEqual(BUDGETS.cls);
    expect(js, `JS pri načítaní ${Math.round(js)} kB (gzip)`).toBeLessThanOrEqual(BUDGETS.scriptKb);
    expect(errors).toEqual([]);
    test.info().annotations.push({ type: 'metriky', description: `LCP ${Math.round(lcp)} ms · CLS ${cls.toFixed(3)} · JS ${Math.round(js)} kB` });
  });
}

// Mapa je ostrov: Lighthouse ju nenačíta. Tu sa na tlačidlo naozaj klikne (statický náhľad bez siete
// aj MapLibre) a overí sa, že sa nič neposunie, JS ostane v budgete a nevzniknú chyby.
for (const adapter of ['static', 'maplibre']) {
  for (const url of ['/trasy/cesta-marie/', '/en/', '/miesta/devin/']) {
    test(`${url}: po načítaní mapy (${adapter}) bez posunu, JS ≤ ${BUDGETS.scriptWithMapKb} kB`, async ({ page, baseURL }) => {
      test.setTimeout(120_000);
      if (adapter === 'static') {
        await page.addInitScript(() => Object.defineProperty(navigator, 'connection', { value: { saveData: true }, configurable: true }));
      }
      const net = await mobileProfile(page);
      const errors = collectErrors(page, baseURL);
      await page.goto(url, { waitUntil: 'load' });
      await page.waitForFunction(() => !document.querySelector('#load-map[disabled]'));
      const before = await page.locator('#map').boundingBox();
      const clsBefore = (await perf(page)).cls;
      const jsBefore = gzipKb(net.js, baseURL);

      // programové kliknutie (bez hadRecentInput) = prísnejší test: aj posun "po kliknutí" sa započíta
      await page.evaluate(() => document.querySelector('#load-map').click());
      await expect(page.locator(`#map[data-ready="true"][data-adapter="${adapter}"]`)).toBeAttached({ timeout: 60_000 });
      await page.waitForTimeout(1500); // dlaždice a vrstvy dokreslia
      const after = await page.locator('#map').boundingBox();
      const { cls, shifts } = await perf(page);
      const js = gzipKb(net.js, baseURL);

      console.log(`[budget] ${url} mapa ${adapter}: JS ${Math.round(js)} kB · ΔCLS ${(cls - clsBefore).toFixed(3)}`);
      expect(after, 'kontajner mapy zmenil polohu alebo veľkosť').toEqual(before);
      expect(cls - clsBefore, `posun po načítaní mapy: ${JSON.stringify(shifts)}`).toBeLessThanOrEqual(BUDGETS.cls);
      expect(js, `JS po načítaní mapy ${Math.round(js)} kB (gzip)`).toBeLessThanOrEqual(BUDGETS.scriptWithMapKb);
      if (adapter === 'maplibre') {
        expect(js - jsBefore, `MapLibre pridal ${Math.round(js - jsBefore)} kB (gzip)`).toBeLessThanOrEqual(BUDGETS.mapLibreKb);
      } else {
        expect(js - jsBefore, 'statický náhľad nemá ťahať MapLibre').toBeLessThan(10);
      }
      // chyby siete mimo nášho servera (dlaždice) sa tu nepočítajú – overuje ich map.spec.js
      expect(errors.filter((e) => !/tiles\.openfreemap|openstreetmap/.test(e))).toEqual([]);
      test.info().annotations.push({ type: 'metriky', description: `JS s mapou ${Math.round(js)} kB · ΔCLS ${(cls - clsBefore).toFixed(3)}` });
    });
  }
}
