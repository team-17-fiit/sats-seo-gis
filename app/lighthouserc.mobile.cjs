// =============================================================================
// Lighthouse CI – MOBILNÝ profil (T3-14). Lighthouse default = emulovaný mobil, Slow 4G, CPU 4×.
// -----------------------------------------------------------------------------
// Spustenie:  npm run lhci:mobile
// Rovnaké budgety ako desktop: cieľ Z3 v dokumentácii je LCP ≤ 2,5 s a CLS ≤ 0,1 NA MOBILE (K3, K4),
// preto je mobil v CI brána (error). 5 behov, medián; TBT len varovanie (kolíše, pozri lhci-config.cjs).
// =============================================================================
const { makeConfig } = require('./lighthouse/lhci-config.cjs');

module.exports = makeConfig({ outputDir: '.lighthouseci-mobile', numberOfRuns: 5, cwvAggregation: 'median', tbtLevel: 'warn' });
