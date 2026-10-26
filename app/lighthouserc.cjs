// =============================================================================
// Lighthouse CI - DESKTOP profil (prahy kvality)
// -----------------------------------------------------------------------------
// Spusti sa cez:  npm run lhci   (v priecinku app/, po npm run build)
// Meria zbuilovany staticky web z out/ servirovany cez `npm run preview` (serve).
// =============================================================================
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run preview',
      // Text vo vystupe servera, podla ktoreho vie, ze uz bezi.
      startServerReadyPattern: 'Accepting connections',
      url: ['http://localhost:4173/'],
      numberOfRuns: 3,
      settings: { preset: 'desktop' },
    },
    assert: {
      assertions: {
        // "error" = padne CI, "warn" = len upozornenie.
        'categories:performance':   ['error', { minScore: 0.8 }],
        'categories:seo':           ['error', { minScore: 0.8 }],
        'categories:accessibility': ['warn',  { minScore: 0.8 }],
        // Core Web Vitals: LCP <= 2,5 s, CLS <= 0,1; TBT je laboratorna nahrada INP.
        'largest-contentful-paint': ['warn',  { maxNumericValue: 2500 }],
        'cumulative-layout-shift':  ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time':      ['warn',  { maxNumericValue: 200 }],
      },
    },
    upload: { target: 'filesystem', outputDir: '.lighthouseci' },
  },
};
