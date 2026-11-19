#!/usr/bin/env node
// =============================================================================
// SEO kontrola celého webu v CI (T3-22) + štruktúrované dáta (T3-04) + adresy webu a overenie
// Search Console pred nasadením (T3-06, pôvodne scripts/check-site-urls.mjs – zlúčené sem).
// -----------------------------------------------------------------------------
// Spustenie (v app/, po npm run build):
//   npm run test:seo                         # adresa z NEXT_PUBLIC_SITE_URL (inak https://example.com)
//   npm run test:seo -- --production         # navyše zakáže placeholder adresu a http (deploy)
//   npm run check:urls                       # starý názov z T3-06, spustí to isté
//   npm run test:seo -- --out out --report seo-report
// Exit kód 1 = aspoň jedna chyba (error). Varovania (warn) CI nezastavia.
// Report: seo-report/seo-report.json (+ zhrnutie do $GITHUB_STEP_SUMMARY v GitHub Actions).
// =============================================================================
import fs from 'node:fs';
import path from 'node:path';
import { auditSite } from './audit.mjs';

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const outDir = path.resolve(opt('out', 'out'));
const reportDir = path.resolve(opt('report', 'seo-report'));
const siteUrl = opt('site-url', process.env.NEXT_PUBLIC_SITE_URL ?? 'https://example.com');
const basePath = opt('base-path', process.env.NEXT_PUBLIC_BASE_PATH ?? '');
const production = args.includes('--production');
// Overovacie tokeny Search Console / Bing (T3-06) – rovnaké premenné ako pri builde; prázdne = nekontroluje sa.
const verification = {
  google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim(),
  bing: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION?.trim(),
};

const started = Date.now();
const { pages, findings, site } = auditSite({ outDir, siteUrl, basePath, production, verification });
const errors = findings.filter((f) => f.level === 'error');
const warnings = findings.filter((f) => f.level === 'warn');

// ---- výpis zoskupený podľa pravidla (najprv chyby)
const group = (list) => {
  const g = new Map();
  for (const f of list) g.set(f.rule, [...(g.get(f.rule) ?? []), f]);
  return [...g.entries()].sort((a, b) => b[1].length - a[1].length);
};
const MAX_PER_RULE = 15;
for (const [label, list] of [['CHYBY', errors], ['VAROVANIA', warnings]]) {
  if (!list.length) continue;
  console.log(`\n${label} (${list.length})`);
  for (const [rule, items] of group(list)) {
    console.log(`  ${rule} – ${items.length}×`);
    for (const f of items.slice(0, MAX_PER_RULE)) console.log(`    ${f.url}  ${f.message}`);
    if (items.length > MAX_PER_RULE) console.log(`    … a ďalších ${items.length - MAX_PER_RULE} (celý zoznam v reporte)`);
  }
}
const ms = Date.now() - started;
console.log(`\nSEO kontrola: ${pages} stránok (${site}), ${errors.length} chýb, ${warnings.length} varovaní, ${ms} ms`);

// ---- report pre artefakt CI
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(
  path.join(reportDir, 'seo-report.json'),
  JSON.stringify({ site, pages, errors: errors.length, warnings: warnings.length, findings }, null, 2),
);

if (process.env.GITHUB_STEP_SUMMARY) {
  const lines = [
    `### SEO kontrola: ${errors.length ? '❌' : '✅'} ${pages} stránok, ${errors.length} chýb, ${warnings.length} varovaní`,
    '',
    '| úroveň | pravidlo | počet | príklad |',
    '|---|---|---|---|',
    ...group(findings).map(([rule, items]) => `| ${items[0].level} | \`${rule}\` | ${items.length} | ${items[0].url}: ${items[0].message.replace(/\|/g, '\\|').slice(0, 140)} |`),
  ];
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n') + '\n');
}

process.exit(errors.length ? 1 : 0);
