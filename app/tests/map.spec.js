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
