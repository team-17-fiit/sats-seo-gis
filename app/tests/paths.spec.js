// E2E: tematické trasy (S1-3 / US-1a príprava) a PWA manifest.
import { test, expect } from '@playwright/test';

test('prehľad trás obsahuje 7 trás s odkazmi', async ({ page }) => {
  await page.goto('/trasy/');
  await expect(page.locator('h1')).toHaveText('Tematické trasy');
  await expect(page.locator('#path-list > li')).toHaveCount(7);
});

test('detail trasy má zoradené zastávky a mapu na kliknutie', async ({ page }) => {
  await page.goto('/trasy/malokarpatska-vinna-cesta/');
  await expect(page.locator('h1')).toHaveText('Malokarpatská vínna cesta');
  await expect(page.locator('#stop-list > li')).toHaveCount(8);
  await page.getByRole('button', { name: /Zobraziť interaktívnu mapu/ }).click();
  await expect(page.locator('#map[data-ready="true"]')).toBeAttached({ timeout: 15000 });
});

// T2-01: legenda mapy – farba trasy a značka UNESCO zastávok (kap. 4.6, obr. Z-H.8).
test('mapa trasy má legendu s trasou a UNESCO zastávkami', async ({ page }) => {
  await page.goto('/trasy/cesta-marie/');
  const legend = page.locator('#map-legend');
  await expect(legend).toContainText('Cesta Márie');
  await expect(legend).toContainText('UNESCO');
});

test('statický náhľad zvýrazní UNESCO zastávky', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'connection', { value: { saveData: true }, configurable: true });
  });
  await page.goto('/trasy/povazska-hradna-cesta/');
  await page.getByRole('button', { name: /Zobraziť interaktívnu mapu/ }).click();
  await expect(page.locator('#map[data-ready="true"][data-adapter="static"]')).toBeAttached({ timeout: 15000 });
  await expect(page.locator('#map [data-unesco="true"]')).toHaveCount(1); // Banská Štiavnica
});

test.describe('bez JavaScriptu (pohľad crawlera)', () => {
  test.use({ javaScriptEnabled: false });

  test('detail trasy má canonical a JSON-LD TouristTrip', async ({ request }) => {
    const html = await (await request.get('/trasy/cesta-marie/')).text();
    expect(html).toMatch(/<link rel="canonical" href="[^"]+\/trasy\/cesta-marie\/"/);
    expect(html).toContain('"@type":"TouristTrip"');
  });

  test('sitemap obsahuje trasy', async ({ request }) => {
    const xml = await (await request.get('/sitemap.xml')).text();
    expect(xml).toContain('/trasy/hlavna-os/');
  });
});

test('PWA manifest je dostupný a odkazovaný', async ({ page, request }) => {
  await page.goto('/');
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', /manifest\.webmanifest/);
  const manifest = await (await request.get('/manifest.webmanifest')).json();
  expect(manifest.display).toBe('standalone');
  expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
});
