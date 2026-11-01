// E2E: anglická verzia webu a prepojenie SK/EN cez hreflang (T2-14 / S2-6).
import { test, expect } from '@playwright/test';

const PAIRS = [
  ['/', '/en/'],
  ['/trasy/', '/en/trails/'],
  ['/trasy/cesta-marie/', '/en/trails/cesta-marie/'],
  ['/miesta/devin/', '/en/places/devin/'],
  ['/vrcholy/rysy/', '/en/peaks/rysy/'],
];

const alternate = (lang, path) => new RegExp(`<link rel="alternate" hrefLang="${lang}" href="[^"]*${path.replace(/\//g, '\\/')}"`, 'i');

test.describe('bez JavaScriptu (pohľad crawlera)', () => {
  test.use({ javaScriptEnabled: false });

  for (const [sk, en] of PAIRS) {
    test(`${sk} a ${en} na seba navzájom odkazujú cez hreflang`, async ({ request }) => {
      for (const url of [sk, en]) {
        const html = await (await request.get(url)).text();
        expect(html).toMatch(alternate('sk', sk));
        expect(html).toMatch(alternate('en', en));
        expect(html).toMatch(alternate('x-default', sk));
        expect(html).toMatch(new RegExp(`<link rel="canonical" href="[^"]*${url.replace(/\//g, '\\/')}"`));
      }
    });
  }

  test('sitemap obsahuje SK aj EN adresy s hreflang alternatívami', async ({ request }) => {
    const xml = await (await request.get('/sitemap.xml')).text();
    expect(xml).toContain('/en/places/devin/</loc>');
    expect(xml).toMatch(/<xhtml:link rel="alternate" hreflang="en" href="[^"]+\/en\/trails\/hlavna-os\/"/);
    expect(xml).toMatch(/<xhtml:link rel="alternate" hreflang="x-default" href="[^"]+\/trasy\/hlavna-os\/"/);
  });

  test('anglická stránka má anglický obsah a lang="en"', async ({ page }) => {
    await page.goto('/en/trails/malokarpatska-vinna-cesta/');
    await expect(page.locator('div[lang="en"] h1')).toHaveText('Small-Carpathian wine trail');
    await expect(page.locator('#stop-list > li')).toHaveCount(8);
    await expect(page.locator('#stop-list a').first()).toHaveAttribute('href', /^\/en\/places\//);
  });
});

test('prepínač jazyka vedie na rovnakú stránku v druhom jazyku', async ({ page }) => {
  await page.goto('/miesta/devin/');
  await page.locator('#lang-switch').click();
  await expect(page).toHaveURL(/\/en\/places\/devin\/$/);
  await page.locator('#lang-switch').click();
  await expect(page).toHaveURL(/\/miesta\/devin\/$/);
});
