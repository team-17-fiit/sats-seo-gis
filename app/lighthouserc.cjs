// =============================================================================
// Lighthouse CI - DESKTOP profil (prahy kvality)
// -----------------------------------------------------------------------------
// Spusti sa cez:  npm run lhci   (v priecinku app/, po npm run build)
// .cjs namiesto .json, aby sa dali pisat komentare (package.json ma "type":"module").
// =============================================================================
module.exports = {
  ci: {
    collect: {
      // Server, ktory Lighthouse spusti sam. Servíruje hotovy build z dist/.
      startServerCommand: 'npm run preview',
      // Text vo vystupe servera, podla ktoreho vie, ze uz bezi.
      startServerReadyPattern: 'Local',
      url: ['http://localhost:4173/'],
      // 3 behy a medián - jeden beh je kolisavy.
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
