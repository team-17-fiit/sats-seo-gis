// =============================================================================
// Playwright - konfiguracia E2E testov
// -----------------------------------------------------------------------------
// Spusti sa cez:  npm run test:e2e            (vsetky projekty)
//                 npm run test:e2e -- --project=desktop   (len jeden)
// Testy su v app/tests/. Kazdy "project" je ine zariadenie/prehliadac.
// =============================================================================
import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests',
  // V CI zopakuje nestabilny test 1x, lokalne nie.
  retries: isCI ? 1 : 0,
  reporter: isCI ? [['html', { open: 'never' }], ['list']] : 'list',

  // Aplikacia, ktoru testy otvaraju. Lokalne ju zbuilduje a spusti samo;
  // v CI uz je zbuilena predchadzajucim krokom, takze sa len spusti.
  webServer: {
    command: isCI ? 'npm run preview' : 'npm run build && npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !isCI,
  },
  use: { baseURL: 'http://localhost:4173' },

  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },   // default v CI
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },  // len heavy-gis.yml
    { name: 'webkit',  use: { ...devices['Desktop Safari'] } },   // len heavy-gis.yml
    { name: 'mobile',  use: { ...devices['Pixel 7'] } },          // len heavy-gis.yml
  ],
});
