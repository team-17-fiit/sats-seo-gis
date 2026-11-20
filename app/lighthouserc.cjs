// =============================================================================
// Lighthouse CI – DESKTOP profil (T3-14). Spúšťa sa v CI pri každom PR.
// -----------------------------------------------------------------------------
// Spustenie:  npm run lhci   (v priečinku app/, po npm run build)
// URL, prahy a budgety sú v lighthouse/lhci-config.cjs a lighthouse/budgets.cjs.
// =============================================================================
const { makeConfig } = require('./lighthouse/lhci-config.cjs');

module.exports = makeConfig({ preset: 'desktop', outputDir: '.lighthouseci' });
