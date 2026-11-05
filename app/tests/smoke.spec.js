// =============================================================================
// Smoke test (T2-12 / S2-4) - rychla kontrola, ze kazdy typ stranky vobec funguje.
// -----------------------------------------------------------------------------
// Pre kazdy typ stranky: HTTP 200, neprazdny <title> a <h1>, ziadna chyba v konzole
// a ziadna chybna poziadavka na vlastny server (rozbity JS/CSS/data/obrazok).
// Spusti sa cez:  npm run test:smoke   (v CI pred plnou E2E sadou)
// Podrobne scenare su v ostatnych *.spec.js; sem patri len "zije to?".
// =============================================================================
import { test, expect } from '@playwright/test';

const PAGES = [
  ['úvodná stránka', '/'],
  ['zoznam trás', '/trasy/'],
  ['detail trasy', '/trasy/cesta-marie/'],
  ['stránka miesta', '/miesta/devin/'],
  ['stránka vrcholu', '/vrcholy/rysy/'],
  ['EN úvod', '/en/'],
  ['EN zoznam trás', '/en/trails/'],
  ['EN detail trasy', '/en/trails/cesta-marie/'],
  ['EN miesto', '/en/places/devin/'],
  ['EN vrchol', '/en/peaks/rysy/'],
];

test.describe('@smoke stránky', () => {
  for (const [name, url] of PAGES) {
    test(`${name} (${url}) sa načíta bez chýb`, async ({ page, baseURL }) => {
      const problems = [];
      page.on('pageerror', (err) => problems.push(`JS výnimka: ${err.message}`));
      page.on('console', (msg) => {
        if (msg.type() === 'error') problems.push(`console.error: ${msg.text()}`);
      });
      // Len vlastný server - externé dlaždice mapy nás tu nezaujímajú.
      page.on('response', (res) => {
        if (res.url().startsWith(baseURL) && res.status() >= 400) problems.push(`${res.status()} ${res.url()}`);
      });
      page.on('requestfailed', (req) => {
        if (req.url().startsWith(baseURL)) problems.push(`zlyhala požiadavka ${req.url()}`);
      });

      const res = await page.goto(url, { waitUntil: 'load' });
      expect(res?.status(), 'HTTP status').toBe(200);
      await expect(page).toHaveTitle(/\S/);
      await expect(page.locator('h1').first()).toBeVisible();
      await page.waitForLoadState('networkidle');
      expect(problems, 'chyby na stránke').toEqual([]);
    });
  }
});

test.describe('@smoke technické súbory', () => {
  test('neexistujúca stránka vráti 404', async ({ request }) => {
    expect((await request.get('/neexistuje-smoke/')).status()).toBe(404);
  });

  for (const [url, type, body] of [
    ['/sitemap.xml', /xml/, '<urlset'],
    ['/robots.txt', /text\/plain/, 'Sitemap:'],
    ['/manifest.webmanifest', /json/, '"name"'],
    ['/data/paths.json', /json/, '"slug"'],
  ]) {
    test(`${url} je dostupný`, async ({ request }) => {
      const res = await request.get(url);
      expect(res.status()).toBe(200);
      expect(res.headers()['content-type']).toMatch(type);
      expect(await res.text()).toContain(body);
    });
  }
});
