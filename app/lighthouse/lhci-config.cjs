// =============================================================================
// Spoločná konfigurácia Lighthouse CI pre desktop aj mobil (T3-14 / S3-5).
// -----------------------------------------------------------------------------
// - meria každý typ stránky (nie len úvod): úvod, zoznam trás, najdlhšia trasa (najťažšie HTML),
//   miesto, vrchol a anglickú trasu – dokumentácia 5.7.2: "budgety sa kontrolujú pre každú URL",
// - desktop: 3 behy na URL, metriky CWV = najhorší z 3 behov (dokumentácia 5.7.2: x75 troch behov
//   = maximum), skóre kategórií = medián,
// - mobil: 5 behov na URL a medián (dokumentácia, obr. 5.8: "3 runs, median"). Simulované mobilné
//   metriky na zdieľanom CI stroji kolíšu (TBT tej istej stránky 107–596 ms), najhorší beh by bránu
//   robil náhodnou. TBT na mobile je zatiaľ len varovanie – pozri docs/methodology/performance-budgets.md,
//   časť "Známe nedostatky".
// - čísla budgetov sú v lighthouse/budgets.cjs (zdieľa ich aj Playwright tests/budgets.spec.js).
// =============================================================================
const { BUDGETS } = require('./budgets.cjs');

const BASE = 'http://localhost:4173';
const URLS = ['/', '/trasy/', '/trasy/hlavna-os/', '/miesta/devin/', '/vrcholy/rysy/', '/en/trails/cesta-marie/'];

const kb = (n) => n * 1024;

function makeConfig({ preset, outputDir, numberOfRuns = 3, cwvAggregation = 'pessimistic', tbtLevel = 'error' }) {
  const median = { aggregationMethod: 'median' };
  const worst = { aggregationMethod: cwvAggregation };
  return {
    ci: {
      collect: {
        startServerCommand: 'npm run preview',
        startServerReadyPattern: 'Accepting connections',
        url: URLS.map((u) => BASE + u),
        numberOfRuns,
        settings: preset ? { preset } : {}, // bez preset = mobil (Moto G Power, Slow 4G, CPU 4×)
      },
      assert: {
        assertions: {
          // K1, K2 – všetky štyri kategórie sú brána (≥ 80)
          'categories:performance': ['error', { minScore: BUDGETS.minScore, ...median }],
          'categories:accessibility': ['error', { minScore: BUDGETS.minScore, ...median }],
          'categories:best-practices': ['error', { minScore: BUDGETS.minScore, ...median }],
          'categories:seo': ['error', { minScore: BUDGETS.minScore, ...median }],
          // K3, K4 – Core Web Vitals (TBT = laboratórna náhrada INP)
          'largest-contentful-paint': ['error', { maxNumericValue: BUDGETS.lcp, ...worst }],
          'cumulative-layout-shift': ['error', { maxNumericValue: BUDGETS.cls, ...worst }],
          'total-blocking-time': [tbtLevel, { maxNumericValue: BUDGETS.tbt, ...worst }],
          'first-contentful-paint': ['error', { maxNumericValue: BUDGETS.fcp, ...worst }],
          // veľkostné budgety (prenesené bajty, gzip)
          'resource-summary:script:size': ['error', { maxNumericValue: kb(BUDGETS.scriptKb), ...worst }],
          'resource-summary:document:size': ['error', { maxNumericValue: kb(BUDGETS.documentKb), ...worst }],
          'resource-summary:total:size': ['error', { maxNumericValue: kb(BUDGETS.totalKb), ...worst }],
          'resource-summary:total:count': ['error', { maxNumericValue: BUDGETS.requests, ...worst }],
          'resource-summary:third-party:count': ['error', { maxNumericValue: BUDGETS.thirdParty, ...worst }],
          // žiadne chyby v konzole (napr. 404 na favicon) a žiadne nekomprimované texty
          'errors-in-console': ['error', { maxLength: 0, ...worst }],
          'uses-text-compression': ['error', { minScore: 1, ...worst }],
        },
      },
      upload: { target: 'filesystem', outputDir },
    },
  };
}

module.exports = { makeConfig, URLS };
