// =============================================================================
// Lighthouse CI - MOBILNY profil (Lighthouse default = emulovany mobil + throttling)
// -----------------------------------------------------------------------------
// Spusti sa cez:  npm run lhci:mobile
// Prahy su zatial "warn", lebo mobil byva prisnejsi; po optimalizacii prepni na "error".
// =============================================================================
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run preview',
      startServerReadyPattern: 'Accepting connections',
      url: ['http://localhost:4173/'],
      numberOfRuns: 3,
      // bez "preset" = mobilny profil
    },
    assert: {
      assertions: {
        'categories:performance':   ['warn', { minScore: 0.8 }],
        'categories:seo':           ['warn', { minScore: 0.8 }],
        'categories:accessibility': ['warn', { minScore: 0.8 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }],
        'cumulative-layout-shift':  ['warn', { maxNumericValue: 0.1 }],
      },
    },
    upload: { target: 'filesystem', outputDir: '.lighthouseci-mobile' },
  },
};
