// E2E testy (Playwright). Spúšťajú sa nad zbuildovanou statickou stránkou (out/) na porte 4173.
import { test, expect } from '@playwright/test';

test('stránka má správny titulok a meta description', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/^Slovenské mapy – aktívny turizmus/);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.+/);
});

test('mapa sa načíta po kliknutí', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Zobraziť interaktívnu mapu/ }).click();
  await expect(page.locator('#map canvas')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('#map[data-ready="true"]')).toBeAttached({ timeout: 15000 });
});

// T2-02: bez WebGL / pri šetrení dát sa kreslí statický náhľad – blízke body (4 tatranské štíty) sa zlúčia.
test('statický náhľad zlúči blízke vrcholy do zhluku', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'connection', { value: { saveData: true }, configurable: true });
  });
  await page.goto('/');
  await page.getByRole('button', { name: /Zobraziť interaktívnu mapu/ }).click();
  await expect(page.locator('#map[data-ready="true"][data-adapter="static"]')).toBeAttached({ timeout: 15000 });

  const clusters = page.locator('#map [data-cluster-count]');
  await expect(clusters.first()).toBeAttached();
  const counts = await clusters.evaluateAll((els) => els.map((el) => Number(el.getAttribute('data-cluster-count'))));
  const singles = await page.locator('#map circle[data-id]').count();
  expect(counts.every((n) => n > 1)).toBe(true);
  expect(counts.reduce((a, b) => a + b, 0) + singles).toBe(6); // žiadny vrchol sa nestratí
});

// Pohľad vyhľadávača: bez JavaScriptu musí byť obsah aj odkazy priamo v HTML.
test.describe('bez JavaScriptu (pohľad crawlera)', () => {
  test.use({ javaScriptEnabled: false });

  test('zoznam vrcholov obsahuje odkazy a podstránka má schema.org', async ({ page, request }) => {
    await page.goto('/');
    const first = page.locator('#peak-list a').first();
    await expect(first).toBeVisible();
    const href = await first.getAttribute('href');

    // Surové HTML podstránky, tak ako ho dostane crawler (žiadny prehliadač, žiadny JS).
    const html = await (await request.get(href)).text();
    expect(html).toMatch(/<h1>[^<]+<\/h1>/);
    expect(html).toMatch(/<link rel="canonical" href="[^"]+"/);
    expect(html).toContain('"@type":"Mountain"');
  });
});
