import { test, expect } from '@playwright/test';

async function breadcrumbOf(request, url) {
  const html = await (await request.get(url)).text();
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map((m) => JSON.parse(m[1]));
  const list = blocks.filter((b) => b['@type'] === 'BreadcrumbList');
  expect(list, `práve jeden BreadcrumbList na ${url}`).toHaveLength(1);
  return list[0].itemListElement;
}

const CASES = [
  ['/trasy/cesta-marie/', ['/', '/trasy/', '/trasy/cesta-marie/']],
  ['/en/trails/cesta-marie/', ['/en/', '/en/trails/', '/en/trails/cesta-marie/']],
  ['/miesta/devin/', ['/', '/trasy/', '/trasy/hlavna-os/', '/miesta/devin/']],
  ['/en/places/devin/', ['/en/', '/en/trails/', '/en/trails/hlavna-os/', '/en/places/devin/']],
  ['/vrcholy/rysy/', ['/', '/vrcholy/rysy/']],
  ['/en/peaks/rysy/', ['/en/', '/en/peaks/rysy/']],
];

test.describe('bez JavaScriptu (pohľad crawlera)', () => {
  test.use({ javaScriptEnabled: false });

  for (const [url, path] of CASES) {
    test(`${url} má BreadcrumbList ${path.join(' › ')}`, async ({ request }) => {
      const items = await breadcrumbOf(request, url);
      expect(items.map((i) => i.position)).toEqual(path.map((_, i) => i + 1));
      expect(items.map((i) => new URL(i.item).pathname)).toEqual(path);
      for (const i of items) {
        expect(i.name).toBeTruthy();
        expect((await request.get(new URL(i.item).pathname)).status(), i.item).toBe(200);
      }
    });
  }
});
