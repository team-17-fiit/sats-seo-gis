// E2E testy (Playwright). Spúšťajú sa nad zbuildovanou statickou stránkou (out/) na porte 4173.
import { test, expect } from '@playwright/test';

test('stránka má správny titulok a meta description', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Aktívny turizmus/);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.+/);
});

test('mapa sa načíta po kliknutí', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Zobraziť interaktívnu mapu/ }).click();
  await expect(page.locator('#map canvas')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('#map[data-ready="true"]')).toBeAttached({ timeout: 15000 });
});

// Pohľad vyhľadávača: bez JavaScriptu musí byť obsah aj odkazy priamo v HTML.
test.describe('bez JavaScriptu (pohľad crawlera)', () => {
  test.use({ javaScriptEnabled: false });

  test('zoznam vrcholov obsahuje odkazy a podstránka má schema.org', async ({ page }) => {
    await page.goto('/');
    const first = page.locator('#peak-list a').first();
    await expect(first).toBeVisible();
    const href = await first.getAttribute('href');
    await page.goto(href);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    await expect(page.locator('script[type="application/ld+json"]', { hasText: '"Mountain"' })).toHaveCount(1);
  });
});
