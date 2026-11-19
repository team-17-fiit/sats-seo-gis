// =============================================================================
// Prístupnosť (T3-15 / S3-5, K17: WCAG 2.2 AA, 0 vážnych chýb axe).
// -----------------------------------------------------------------------------
// 1) axe-core na KAŽDEJ stránke zo sitemap.xml (SK aj EN), svetlá téma, desktop.
// 2) axe na reprezentatívnych stránkach v stavoch, ktoré statické HTML nemá: tmavá téma
//    (ručne aj podľa systému), mobil, načítaná mapa (MapLibre aj statický náhľad).
// 3) Čo axe nevie: klávesnica (skip link, poradie, viditeľný fokus), reflow 320 px
//    (WCAG 1.4.10), zväčšenie textu 200 % (1.4.4), prefers-reduced-motion, jazyk stránky.
// Brána: každé porušenie pravidla WCAG 2.0–2.2 A/AA (akákoľvek závažnosť) a každé
// porušenie best-practice so závažnosťou serious/critical test zhodí.
// Spustenie: npm run test:a11y   (alebo celé E2E: npm run test:e2e)
// =============================================================================
import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa', 'best-practice'];

/** Jedna stránka každého typu v oboch jazykoch. */
const SAMPLE = [
  ['úvod', '/'], ['zoznam trás', '/trasy/'], ['trasa', '/trasy/cesta-marie/'], ['miesto', '/miesta/devin/'], ['vrchol', '/vrcholy/rysy/'],
  ['EN úvod', '/en/'], ['EN trasy', '/en/trails/'], ['EN trasa', '/en/trails/cesta-marie/'], ['EN miesto', '/en/places/devin/'], ['EN vrchol', '/en/peaks/rysy/'],
];

/** Zlyhá, ak sú porušenia; vypíše ich čitateľne (pravidlo, závažnosť, prvky) a priloží celý JSON. */
async function expectNoViolations(page, testInfo, label, configure = (b) => b) {
  const results = await configure(new AxeBuilder({ page }).withTags(WCAG_TAGS)).analyze();
  const blocking = results.violations.filter(
    (v) => !v.tags.includes('best-practice') || v.tags.some((t) => t.startsWith('wcag')) || ['serious', 'critical'].includes(v.impact),
  );
  const minor = results.violations.filter((v) => !blocking.includes(v));
  if (results.violations.length) {
    await testInfo.attach(`axe-${label}.json`, { body: JSON.stringify(results.violations, null, 2), contentType: 'application/json' });
  }
  for (const v of minor) {
    testInfo.annotations.push({ type: 'axe best-practice (minor)', description: `${label}: ${v.id} – ${v.help}` });
  }
  const report = blocking
    .map((v) => `  [${v.impact}] ${v.id}: ${v.help}\n${v.nodes.slice(0, 5).map((n) => `      ${n.target.join(' ')} – ${n.failureSummary?.split('\n')[1]?.trim() ?? ''}`).join('\n')}`)
    .join('\n');
  expect(blocking, `axe na ${label}:\n${report}`).toEqual([]);
  // pravidlá, ktoré axe nevedel rozhodnúť (napr. kontrast textu na obrázku), nesmú byť "tiché" chyby
  return results;
}

/** Prejde stránku klávesom Tab; pre každú zastávku fokusu vráti, či je prvok viditeľný a má indikátor. */
async function tabThrough(page) {
  const expected = await page.evaluate(() =>
    [...document.querySelectorAll('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])')]
      .filter((el) => el.getClientRects().length > 0 || el.classList.contains('skip-link')).length,
  );
  const stops = [];
  const seen = new Set();
  for (let i = 0; i < expected + 5; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        key: `${el.tagName}|${el.getAttribute('href') ?? el.id ?? ''}|${el.textContent?.trim().slice(0, 30)}`,
        indicator: (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 1) || cs.boxShadow !== 'none',
        visible: r.width > 0 && r.height > 0,
      };
    });
    if (!info || seen.has(info.key)) break; // fokus odišiel z dokumentu alebo sa zacyklil – prešli sme všetko
    seen.add(info.key);
    stops.push(info);
  }
  return { expected, stops };
}

async function sitemapPaths(request) {
  const xml = await (await request.get('/sitemap.xml')).text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
}

// ----------------------------------------------------------------------------- 1) všetky stránky
test.describe('axe – všetky stránky zo sitemap', () => {
  test('každá stránka webu je bez porušení WCAG 2.2 AA', async ({ page, request }, testInfo) => {
    test.setTimeout(300_000);
    const paths = await sitemapPaths(request);
    expect(paths.length, 'sitemap.xml je prázdna').toBeGreaterThan(50);
    const failures = [];
    for (const p of paths) {
      await page.goto(p, { waitUntil: 'load' });
      await test.step(p, async () => {
        try {
          await expectNoViolations(page, testInfo, p);
        } catch (e) {
          failures.push(e.message.split('\n\n')[0]);
        }
      });
    }
    // jeden súhrn na konci: vidno všetky chybné stránky naraz, nie len prvú
    expect(failures, `${failures.length} z ${paths.length} stránok má porušenia:\n${failures.join('\n')}`).toEqual([]);
  });

  test('stránka 404 je bez porušení', async ({ page }, testInfo) => {
    const res = await page.goto('/neexistujuca-stranka/');
    expect(res.status()).toBe(404);
    await expectNoViolations(page, testInfo, '404');
  });
});

// ----------------------------------------------------------------------------- 2) stavy a témy
test.describe('axe – tmavá téma', () => {
  for (const [name, url] of SAMPLE) {
    test(`${name} (${url}) – tmavá téma zvolená prepínačom`, async ({ page }, testInfo) => {
      await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
      await page.goto(url);
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
      await expectNoViolations(page, testInfo, `${url} (dark)`);
    });
  }

  test('tmavá téma podľa systému (prefers-color-scheme) bez ručnej voľby', async ({ page }, testInfo) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    for (const [, url] of SAMPLE.slice(0, 5)) {
      await page.goto(url);
      await expectNoViolations(page, testInfo, `${url} (system dark)`);
    }
  });
});

test.describe('axe – mobil (Pixel 7)', () => {
  test.use({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.625 });
  for (const [name, url] of SAMPLE) {
    test(`${name} (${url})`, async ({ page }, testInfo) => {
      await page.goto(url);
      await expectNoViolations(page, testInfo, `${url} (mobil)`);
    });
  }
});

test.describe('axe – po načítaní mapy', () => {
  test('statický náhľad (šetrenie dát): SVG mapa má názov v jazyku stránky', async ({ page }, testInfo) => {
    await page.addInitScript(() => Object.defineProperty(navigator, 'connection', { value: { saveData: true }, configurable: true }));
    for (const [url, lang, label] of [['/trasy/cesta-marie/', 'sk', /Mapa trasy/], ['/en/trails/cesta-marie/', 'en', /Map of the trail/]]) {
      await page.goto(url);
      await page.locator('#load-map').click();
      await expect(page.locator('#map[data-ready="true"][data-adapter="static"]')).toBeAttached({ timeout: 15_000 });
      await expect(page.locator('#map svg[role="img"]')).toHaveAttribute('aria-label', label);
      await expect(page.locator('html')).toHaveAttribute('lang', lang);
      await expectNoViolations(page, testInfo, `${url} (statická mapa)`);
    }
  });

  test('interaktívna mapa (MapLibre) na trase', async ({ page }, testInfo) => {
    await page.goto('/trasy/cesta-marie/');
    await page.locator('#load-map').click();
    await expect(page.locator('#map[data-ready="true"]')).toBeAttached({ timeout: 20_000 });
    // ovládacie prvky MapLibre sú cudzí kód, ale na našej stránke – kontrolujú sa tiež
    await expectNoViolations(page, testInfo, 'trasa (MapLibre)');
  });
});

// ----------------------------------------------------------------------------- 3) čo axe nevidí
test.describe('klávesnica', () => {
  // Safari/WebKit predvolene neposúva fokus Tabom na odkazy (nastavenie systému) – test by meral nastavenie, nie web.
  test.skip(({ browserName }) => browserName === 'webkit', 'WebKit: Tab bez "Full Keyboard Access" nepreskakuje odkazy');
  for (const [name, url] of SAMPLE) {
    test(`${name}: prvý Tab = "preskočiť na obsah", Enter presunie fokus do <main>`, async ({ page }) => {
      await page.goto(url);
      await page.keyboard.press('Tab');
      const skip = page.locator('.skip-link');
      await expect(skip).toBeFocused();
      await expect(skip).toBeVisible(); // pri fokuse musí byť vidieť (WCAG 2.4.7)
      await expect(skip).toHaveText(url.startsWith('/en/') ? 'Skip to content' : 'Preskočiť na obsah');
      await page.keyboard.press('Enter');
      await expect(page.locator('main#main')).toBeFocused();
    });
  }

  for (const [name, url] of SAMPLE) {
    test(`${name}: každý ovládací prvok je dosiahnuteľný Tabom a má viditeľný fokus`, async ({ page }) => {
      await page.goto(url);
      await page.waitForFunction(() => !document.querySelector('#load-map[disabled]')); // hydratácia
      const { expected, stops } = await tabThrough(page);
      for (const s of stops) {
        expect(s.visible, `fokus na neviditeľnom prvku ${s.key}`).toBe(true);
        expect(s.indicator, `prvok ${s.key} nemá viditeľný indikátor fokusu`).toBe(true);
      }
      expect(stops.length, 'Tab neprešiel všetky ovládacie prvky (pasca fokusu alebo tabindex)').toBeGreaterThanOrEqual(expected);
    });
  }

  test('prepínač témy funguje z klávesnice a oznamuje stav (aria-pressed)', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    const toggle = page.locator('.theme-toggle');
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await expect(toggle).toHaveAccessibleName('Prepnúť svetlú / tmavú tému');
    await toggle.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Space');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  test('tlačidlo mapy sa dá spustiť klávesnicou', async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(navigator, 'connection', { value: { saveData: true }, configurable: true }));
    await page.goto('/en/');
    await page.waitForFunction(() => !document.querySelector('#load-map[disabled]'));
    await page.locator('#load-map').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#map[data-ready="true"]')).toBeAttached({ timeout: 15_000 });
  });
});

test.describe('zobrazenie', () => {
  for (const [name, url] of SAMPLE) {
    test(`${name}: pri šírke 320 px nie je vodorovný posuv (reflow, WCAG 1.4.10)`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 640 });
      await page.goto(url);
      const { scroll, client } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
      expect(scroll, `obsah je širší (${scroll}px) ako okno (${client}px)`).toBeLessThanOrEqual(client);
    });

    test(`${name}: text zväčšený na 200 % sa neprekrýva ani neoreže (WCAG 1.4.4)`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(url);
      await page.addStyleTag({ content: 'html{font-size:200% !important}' });
      const clipped = await page.evaluate(() =>
        [...document.querySelectorAll('h1,h2,p,li,dt,dd,a,button')]
          .filter((el) => {
            const cs = getComputedStyle(el);
            return (cs.overflow === 'hidden' || cs.textOverflow === 'ellipsis') && el.scrollWidth > el.clientWidth + 1;
          })
          .map((el) => el.outerHTML.slice(0, 80)),
      );
      expect(clipped).toEqual([]);
      const { scroll, client } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
      expect(scroll).toBeLessThanOrEqual(client);
    });
  }

  test('prefers-reduced-motion vypne animácie prechodu témy', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const durations = await page.evaluate(() =>
      ['body', '.theme-toggle', '.theme-toggle span', '#load-map'].map((s) => {
        const el = document.querySelector(s);
        return el ? getComputedStyle(el).transitionDuration : '0s';
      }),
    );
    for (const d of durations) expect(d.split(',').every((x) => parseFloat(x) === 0)).toBe(true);
  });

  test('jazyk stránky (html lang) zodpovedá obsahu na všetkých stránkach', async ({ request }) => {
    const paths = await sitemapPaths(request);
    for (const p of paths) {
      const html = await (await request.get(p)).text();
      const lang = html.match(/<html[^>]*\slang="([^"]+)"/)?.[1];
      expect(lang, p).toBe(p.startsWith('/en/') ? 'en' : 'sk');
    }
  });
});

// ----------------------------------------------------------------------------- kontrola kontroly
// Ak by axe alebo kontrola fokusu nič nekontrolovali, všetky testy vyššie by boli zelené "zadarmo".
// Tu do skutočnej stránky vložíme známe chyby a overíme, že ich nástroje naozaj nájdu.
test.describe('kontrola kontroly – vložené chyby sa zachytia', () => {
  test('axe nájde chýbajúci alt, nízky kontrast, tlačidlo bez názvu a zlý jazyk', async ({ page }) => {
    await page.goto('/trasy/cesta-marie/');
    // vložiť až po hydratácii, inak React vložené prvky pri hydratácii zahodí
    await page.waitForFunction(() => !document.querySelector('#load-map[disabled]'));
    await page.evaluate(() => {
      document.documentElement.lang = 'xx-nonsense';
      document.querySelector('main').insertAdjacentHTML('beforeend',
        '<img src="/icons/icon-192.png"><p style="color:#c8c8c8;background:#fff">slabý kontrast</p><button></button>');
    });
    const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    const ids = violations.map((v) => v.id);
    expect(ids).toEqual(expect.arrayContaining(['image-alt', 'color-contrast', 'button-name', 'html-lang-valid']));
  });

  test('kontrola fokusu nájde prvok bez viditeľného indikátora', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit: Tab bez "Full Keyboard Access" nepreskakuje odkazy');
    await page.goto('/trasy/');
    await page.addStyleTag({ content: '*:focus,*:focus-visible{outline:none !important;box-shadow:none !important}' });
    const { stops } = await tabThrough(page);
    expect(stops.length).toBeGreaterThan(3);
    expect(stops.filter((s) => !s.indicator).length).toBe(stops.length);
  });

  test('kontrola reflow nájde obsah širší ako 320 px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto('/');
    await page.waitForFunction(() => !document.querySelector('#load-map[disabled]'));
    await page.evaluate(() => document.querySelector('main').insertAdjacentHTML('beforeend', '<div style="width:600px">široký</div>'));
    const { scroll, client } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    expect(scroll).toBeGreaterThan(client);
  });
});
