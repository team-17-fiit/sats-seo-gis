// E2E: stránky miest T1 (T2-10 / US-1b).
import { test, expect } from '@playwright/test';

test('zastávka v detaile trasy vedie na stránku miesta a späť na trasu', async ({ page }) => {
  await page.goto('/trasy/malokarpatska-vinna-cesta/');
  await page.locator('#stop-list > li a').first().click();
  await expect(page).toHaveURL(/\/miesta\/[a-z0-9-]+\/$/);
  await expect(page.locator('#poi-paths a', { hasText: 'Malokarpatská vínna cesta' })).toBeVisible();
});

test('foto miesta sa z Wikimedia stiahne až po kliknutí (pri načítaní žiadna tretia strana)', async ({ page }) => {
  const requests = [];
  await page.route(/wikimedia\.org/, (route) => {
    requests.push(route.request().url());
    return route.fulfill({ status: 200, contentType: 'image/jpeg', body: '' });
  });
  await page.goto('/miesta/oravsky-hrad/');
  await page.waitForLoadState('networkidle');
  expect(requests).toEqual([]);
  await page.locator('.place-image summary').click();
  await expect.poll(() => requests.length).toBeGreaterThan(0);
});

test.describe('bez JavaScriptu (pohľad crawlera)', () => {
  test.use({ javaScriptEnabled: false });

  test('stránka miesta má canonical a JSON-LD TouristAttraction', async ({ request }) => {
    const html = await (await request.get('/miesta/devin/')).text();
    expect(html).toMatch(/<link rel="canonical" href="[^"]+\/miesta\/devin\/"/);
    expect(html).toContain('"@type":["TouristAttraction"');
  });

  test('stránka miesta ukazuje obohatené údaje (foto, územia, otváracie hodiny)', async ({ request }) => {
    const html = await (await request.get('/miesta/oravsky-hrad/')).text();
    expect(html).toContain('class="place-image"');
    for (const label of ['Chránené územie', 'Pamiatkové územie', 'Otváracie hodiny']) {
      expect(html).toContain(`<dt>${label}</dt>`);
    }
  });

  test('sitemap obsahuje miesta', async ({ request }) => {
    const xml = await (await request.get('/sitemap.xml')).text();
    expect(xml).toContain('/miesta/devin/');
  });

  test('neexistujúce miesto vráti 404', async ({ request }) => {
    expect((await request.get('/miesta/neexistuje/')).status()).toBe(404);
  });
});
