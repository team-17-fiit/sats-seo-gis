// =============================================================================
// Validátor štruktúrovaných dát JSON-LD (T3-04, K19 "100 % Rich Results pass").
// -----------------------------------------------------------------------------
// Google Rich Results Test nemá verejné API, preto CI overuje to isté, čo by overil človek:
//  1) slovník schema.org (ako validator.schema.org): typ existuje, vlastnosť existuje a patrí
//     k danému typu (domainIncludes vrátane nadtypov), hodnota má povolený typ (rangeIncludes),
//     žiadne prázdne hodnoty (null, ""), URL sú absolútne;
//  2) pravidlá Google pre typy s rich výsledkom, ktoré web používa – BreadcrumbList
//     (https://developers.google.com/search/docs/appearance/structured-data/breadcrumb).
// Ostatné typy (TouristTrip, TouristAttraction, Mountain) Google ako rich výsledok nezobrazuje;
// pre ne platí bod 1 a obsahové pravidlá stránky v audit.mjs (url = canonical, geo v SR, ...).
// =============================================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
let vocabCache = null;

/** Kompaktný slovník schema.org (vyrába build-schemaorg-vocab.mjs). */
export function loadVocab() {
  vocabCache ??= JSON.parse(fs.readFileSync(path.join(here, 'schemaorg-vocab.json'), 'utf8'));
  return vocabCache;
}

/**
 * "Pending" typy a vlastnosti schema.org, ktoré tím vedome používa – varovanie sa pre ne nehlási.
 * Rozhodnutie 19. 11. 2026: trasa ostáva TouristTrip + itinerary (zoradené zastávky), nie
 * TouristAttraction + SportsActivityLocation z dokumentácie 5.6.1 (docs/audits/2026-11-19-seo-audit.md).
 */
export const ACCEPTED_PENDING = new Set(['TouristTrip', 'itinerary']);

const arr = (v) => (Array.isArray(v) ? v : [v]);
const SCHEMA_PREFIX = /^https?:\/\/schema\.org\/?/;
const stripPrefix = (t) => String(t).replace(SCHEMA_PREFIX, '').replace(/^schema:/, '');

/** Všetky nadtypy typu vrátane neho samého (Mountain -> Landform, Place, Thing). */
export function ancestors(type, vocab = loadVocab()) {
  const out = new Set();
  const stack = [type];
  while (stack.length) {
    const t = stack.pop();
    if (out.has(t)) continue;
    out.add(t);
    for (const s of vocab.types[t]?.sub ?? []) stack.push(s);
  }
  return out;
}

function typesOf(node) {
  return arr(node['@type'] ?? []).map(stripPrefix);
}

const TEXTUAL = new Set(['Text', 'URL', 'Date', 'DateTime', 'Time', 'CssSelectorType', 'XPathType', 'PronounceableText']);
const NUMERIC = new Set(['Number', 'Integer', 'Float']);
const ABSOLUTE_URL = /^https?:\/\/[^\s/]+\.[^\s]*$|^https?:\/\/localhost(:\d+)?(\/\S*)?$/;

/** Rozsah vlastnosti rozbalený o podtypy dátových typov (Text -> URL, Number -> Integer). */
function rangeInfo(range, vocab) {
  const dataTypes = range.filter((r) => [...ancestors(r, vocab)].some((a) => vocab.types[a]?.dataType) || TEXTUAL.has(r) || NUMERIC.has(r) || r === 'Boolean');
  return { range, dataTypes };
}

/**
 * Overí jeden JSON-LD dokument proti slovníku schema.org.
 * Vracia zoznam nálezov { level: 'error' | 'warn', path, message }.
 */
export function validateJsonLd(doc, vocab = loadVocab()) {
  const findings = [];
  const err = (p, message) => findings.push({ level: 'error', path: p, message });
  const warn = (p, message) => findings.push({ level: 'warn', path: p, message });

  if (doc === null || typeof doc !== 'object') {
    err('$', 'JSON-LD musí byť objekt alebo pole objektov');
    return findings;
  }

  const roots = Array.isArray(doc) ? doc : doc['@graph'] ? arr(doc['@graph']) : [doc];
  const ctxOf = (n) => n['@context'] ?? (Array.isArray(doc) ? undefined : doc['@context']);
  roots.forEach((node, i) => {
    const p = roots.length > 1 ? `$[${i}]` : '$';
    const ctx = ctxOf(node);
    if (typeof ctx !== 'string' || !SCHEMA_PREFIX.test(ctx)) {
      err(p, `@context musí byť "https://schema.org" (je ${JSON.stringify(ctx)})`);
    } else if (ctx.startsWith('http://')) {
      warn(p, '@context používa http://, odporúča sa https://schema.org');
    }
    validateNode(node, p, true);
  });
  return findings;

  function validateNode(node, p, isRoot = false) {
    if (node === null || typeof node !== 'object' || Array.isArray(node)) {
      err(p, 'očakávaný objekt');
      return [];
    }
    const keys = Object.keys(node).filter((k) => !k.startsWith('@'));
    // Čistý odkaz {"@id": "..."} na uzol definovaný inde je platný.
    if (!node['@type'] && node['@id'] && keys.length === 0) return ['Thing'];
    const types = typesOf(node);
    if (types.length === 0) {
      err(p, `chýba @type${isRoot ? '' : ' vnoreného objektu'}`);
      return [];
    }
    const known = [];
    for (const t of types) {
      const def = vocab.types[t];
      if (!def) err(p, `neznámy typ schema.org "${t}"`);
      else {
        known.push(t);
        if (def.pending && !ACCEPTED_PENDING.has(t)) warn(p, `typ "${t}" je v schema.org zatiaľ "pending" (rozpracovaný)`);
      }
    }
    if (node['@id'] !== undefined && (typeof node['@id'] !== 'string' || !node['@id'])) err(`${p}.@id`, '@id musí byť neprázdny reťazec');
    const nodeAncestors = new Set(known.flatMap((t) => [...ancestors(t, vocab)]));

    for (const key of keys) {
      const kp = `${p}.${key}`;
      const prop = vocab.properties[stripPrefix(key)];
      if (!prop) {
        err(kp, `neznáma vlastnosť schema.org "${key}"`);
        continue;
      }
      if (prop.supersededBy) warn(kp, `vlastnosť "${key}" je zastaraná, nahrádza ju ${prop.supersededBy.join(', ')}`);
      if (prop.pending && !ACCEPTED_PENDING.has(stripPrefix(key))) warn(kp, `vlastnosť "${key}" je v schema.org zatiaľ "pending"`);
      if (known.length && !prop.domain.some((d) => nodeAncestors.has(d))) {
        err(kp, `vlastnosť "${key}" nepatrí k typu ${known.join(' + ')} (povolená pre: ${prop.domain.join(', ')})`);
      }
      const { range, dataTypes } = rangeInfo(prop.range, vocab);
      const values = arr(node[key]);
      if (values.length === 0) err(kp, 'prázdne pole');
      values.forEach((v, i) => checkValue(v, values.length > 1 ? `${kp}[${i}]` : kp, key, range, dataTypes));
    }
    return known;
  }

  function checkValue(v, p, key, range, dataTypes) {
    if (v === null || v === undefined) return err(p, 'hodnota je null – vlastnosť bez hodnoty vynechaj');
    if (typeof v === 'string') {
      if (v.trim() === '') return err(p, 'prázdny reťazec');
      if (v !== v.trim()) warn(p, 'hodnota má medzery na začiatku alebo konci');
      const enumMember = vocab.enums[stripPrefix(v)] && SCHEMA_PREFIX.test(v);
      if (enumMember) {
        const ok = vocab.enums[stripPrefix(v)].some((t) => range.some((r) => ancestors(t, vocab).has(r)));
        if (!ok) err(p, `hodnota ${v} nie je povolená pre "${key}" (očakáva ${range.join(', ')})`);
        return;
      }
      const textual = dataTypes.filter((d) => TEXTUAL.has(d));
      // url, sameAs, ...: jediný povolený typ je URL -> musí byť absolútna
      if (range.length > 0 && range.every((r) => r === 'URL')) {
        if (!ABSOLUTE_URL.test(v)) err(p, `"${key}" musí byť absolútna URL (je "${v}")`);
        return;
      }
      if (/^\/(?!\/)/.test(v) && (range.includes('URL') || textual.length === 0)) {
        return err(p, `relatívna adresa "${v}" – použi absolútnu URL`);
      }
      if (range.includes('Date') && !range.includes('Text') && !/^\d{4}-\d{2}-\d{2}/.test(v)) {
        return err(p, `"${key}" musí byť dátum ISO 8601`);
      }
      // absolútna URL namiesto vnoreného objektu = odkaz na entitu (napr. item v BreadcrumbList) – platné
      if (textual.length === 0 && !ABSOLUTE_URL.test(v)) {
        warn(p, `"${key}" očakáva ${range.join(' / ')}, je uvedený len text`);
      }
      return;
    }
    if (typeof v === 'number') {
      if (!Number.isFinite(v)) return err(p, 'číslo nie je konečné (NaN/Infinity)');
      const numeric = dataTypes.filter((d) => NUMERIC.has(d));
      if (numeric.length === 0) {
        if (dataTypes.includes('Text')) warn(p, `"${key}" očakáva text, je uvedené číslo`);
        else err(p, `"${key}" nepovoľuje číslo (očakáva ${range.join(', ')})`);
        return;
      }
      if (numeric.every((d) => d === 'Integer') && !Number.isInteger(v)) err(p, `"${key}" musí byť celé číslo`);
      return;
    }
    if (typeof v === 'boolean') {
      if (!dataTypes.includes('Boolean')) err(p, `"${key}" nepovoľuje true/false (očakáva ${range.join(', ')})`);
      return;
    }
    if (typeof v === 'object') {
      const types = validateNode(v, p);
      if (!types.length) return;
      // odkaz cez @id: typ nepoznáme, rozsah nevieme overiť
      if (!v['@type']) return;
      const all = new Set(types.flatMap((t) => [...ancestors(t, vocab)]));
      if (!range.some((r) => all.has(r))) {
        err(p, `"${key}" očakáva ${range.join(' / ')}, nie ${types.join(' + ')}`);
      }
      return;
    }
    err(p, `nepodporovaný typ hodnoty ${typeof v}`);
  }
}

/**
 * Pravidlá Google pre navigačnú cestu (BreadcrumbList) + naše doplnky:
 * aspoň 2 položky, pozície 1..n bez medzier, každá položka má name a item (URL),
 * posledná položka môže item vynechať. Vracia nálezy ako validateJsonLd.
 */
export function checkBreadcrumb(doc) {
  const findings = [];
  const err = (p, message) => findings.push({ level: 'error', path: p, message });
  const list = arr(doc.itemListElement ?? []);
  if (list.length < 2) err('$.itemListElement', `BreadcrumbList potrebuje aspoň 2 položky (má ${list.length})`);
  list.forEach((li, i) => {
    const p = `$.itemListElement[${i}]`;
    if (!li || typeof li !== 'object') return err(p, 'položka musí byť ListItem');
    if (stripPrefix(li['@type']) !== 'ListItem') err(p, `@type musí byť ListItem (je ${JSON.stringify(li['@type'])})`);
    if (li.position !== i + 1) err(`${p}.position`, `pozícia má byť ${i + 1} (je ${JSON.stringify(li.position)})`);
    const item = li.item;
    const itemUrl = typeof item === 'string' ? item : item && typeof item === 'object' ? item['@id'] ?? item.url : undefined;
    const name = li.name ?? (item && typeof item === 'object' ? item.name : undefined);
    if (typeof name !== 'string' || !name.trim()) err(`${p}.name`, 'chýba name');
    const isLast = i === list.length - 1;
    if (itemUrl === undefined) {
      if (!isLast) err(`${p}.item`, 'chýba item (URL) – povinné pre všetky položky okrem poslednej');
    } else if (typeof itemUrl !== 'string' || !ABSOLUTE_URL.test(itemUrl)) {
      err(`${p}.item`, `item musí byť absolútna URL (je ${JSON.stringify(itemUrl)})`);
    }
  });
  return findings;
}

/** URL položiek navigačnej cesty v poradí (pre kontrolu existencie stránok). */
export function breadcrumbUrls(doc) {
  return arr(doc.itemListElement ?? []).map((li) => {
    const item = li?.item;
    return typeof item === 'string' ? item : item?.['@id'] ?? item?.url;
  });
}

/** Rozbalí JSON-LD dokument na uzly najvyššej úrovne (pole, @graph alebo jeden objekt). */
export function topNodes(doc) {
  if (Array.isArray(doc)) return doc;
  if (doc && doc['@graph']) return arr(doc['@graph']);
  return doc ? [doc] : [];
}

/** Či uzol (alebo niektorý jeho typ) je daného typu, vrátane podtypov. */
export function isA(node, type, vocab = loadVocab()) {
  return typesOf(node).some((t) => ancestors(t, vocab).has(type));
}
