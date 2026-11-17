import { test, expect } from '@playwright/test';

const PAGES = ['/', '/en/', '/trasy/', '/trasy/cesta-marie/', '/en/trails/cesta-marie/', '/miesta/devin/', '/en/places/devin/', '/vrcholy/rysy/', '/en/peaks/rysy/'];

const meta = (html, attr, name) => (html.match(new RegExp(`<meta ${attr}="${name}" content="([^"]*)"`)) || [])[1];

test.describe('bez JavaScriptu (pohľad sociálnych sietí)', () => {
  test.use({ javaScriptEnabled: false });

  for (const url of PAGES) {
    test(`${url} má og:url, og:image a veľkú Twitter kartu`, async ({ request }) => {
      const html = await (await request.get(url)).text();
      const canonical = (html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
      expect(meta(html, 'property', 'og:url')).toBe(canonical);
      expect(meta(html, 'property', 'og:site_name')).toBeTruthy();
      expect(meta(html, 'property', 'og:image:width')).toBe('1200');
      expect(meta(html, 'property', 'og:image:height')).toBe('630');
      expect(meta(html, 'property', 'og:image:alt')).toBeTruthy();
      expect(meta(html, 'name', 'twitter:card')).toBe('summary_large_image');

      const image = new URL(meta(html, 'property', 'og:image')).pathname;
      expect(meta(html, 'name', 'twitter:image')).toContain(image);
      const res = await request.get(image);
      expect(res.status()).toBe(200);
      expect((await res.body()).subarray(1, 4).toString()).toBe('PNG');
    });
  }
});
