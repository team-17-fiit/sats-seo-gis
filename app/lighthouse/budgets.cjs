// =============================================================================
// Výkonnostné budgety – JEDINÝ zdroj čísel pre Lighthouse CI aj Playwright (T3-14 / S3-5).
// -----------------------------------------------------------------------------
// Ciele z dokumentácie: K1 Performance ≥ 80, K2 SEO/A11y/BP ≥ 80, K3 LCP ≤ 2,5 s a INP ≤ 200 ms
// (v laboratóriu náhradou TBT ≤ 200 ms), K4 CLS ≤ 0,1; Table 5.2: MapLibre ≈ 210 kB gzip.
// Veľkostné budgety = nameraný stav (19. 11. 2026) + rezerva ~15 %; zvýšiť ich smie len
// vedomé rozhodnutie v PR (zdôvodnenie v popise PR), nie "aby CI prešlo".
// Veľkosti sú prenesené bajty s gzip (preview server komprimuje ako GitHub Pages).
// =============================================================================
const BUDGETS = {
  // Core Web Vitals (K3, K4)
  lcp: 2500, // ms
  cls: 0.1,
  tbt: 200, // ms – laboratórna náhrada INP
  fcp: 1800, // ms – "dobrá" hranica FCP podľa web.dev
  // kategórie Lighthouse (K1, K2) – skóre 0–1
  minScore: 0.8,
  // veľkosť (kB, gzip)
  scriptKb: 125, // JS pri načítaní stránky (Next.js runtime + stránka, bez mapy); namerané 105–106 kB
  mapLibreKb: 215, // JS, ktorý pribudne po kliknutí na mapu (MapLibre, Table 5.2: ≈ 210 kB); namerané 203 kB
  scriptWithMapKb: 360, // JS spolu po načítaní interaktívnej mapy; namerané 311 kB
  documentKb: 15, // HTML dokument; najťažší je detail trasy (Cesta Márie 6,7 kB) – geometria trasy nie je v HTML
  totalKb: 200, // všetko pri načítaní stránky
  requests: 25, // počet požiadaviek pri načítaní
  thirdParty: 0, // pri načítaní žiadne cudzie domény (mapa a dlaždice až po kliknutí)
};

module.exports = { BUDGETS };
