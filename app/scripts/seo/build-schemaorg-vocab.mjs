// =============================================================================
// Generátor kompaktného slovníka schema.org pre kontrolu JSON-LD (T3-04, K19).
// -----------------------------------------------------------------------------
// Stiahne oficiálny slovník https://schema.org/version/latest/schemaorg-current-https.jsonld
// (alebo prečíta lokálny súbor) a uloží z neho len to, čo validátor potrebuje:
//   types:      typ -> priame nadtypy (rdfs:subClassOf)
//   properties: vlastnosť -> domainIncludes (na ktorých typoch smie byť) + rangeIncludes (hodnoty)
//   enums:      člen enumerácie -> typ enumerácie
// Výsledok (schemaorg-vocab.json) je v gite, aby CI nezáviselo od siete a výsledok bol
// reprodukovateľný. Aktualizácia (raz za čas, napr. pri novej verzii schema.org):
//   node scripts/seo/build-schemaorg-vocab.mjs            (stiahne aktuálnu verziu)
//   node scripts/seo/build-schemaorg-vocab.mjs subor.jsonld
// =============================================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const URL_LATEST = 'https://schema.org/version/latest/schemaorg-current-https.jsonld';
const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, 'schemaorg-vocab.json');

const arr = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
const ids = (v) => arr(v).map((x) => x['@id']).filter((id) => typeof id === 'string' && id.startsWith('schema:')).map((id) => id.slice(7));

async function load(src) {
  if (src) return JSON.parse(fs.readFileSync(src, 'utf8'));
  const res = await fetch(URL_LATEST);
  if (!res.ok) throw new Error(`schema.org: HTTP ${res.status}`);
  return res.json();
}

const raw = await load(process.argv[2]);
const graph = raw['@graph'];
const types = {};
const properties = {};
const enums = {};
const pending = [];

for (const n of graph) {
  const id = n['@id'];
  if (typeof id !== 'string' || !id.startsWith('schema:')) continue;
  const name = id.slice(7);
  // "pending" a "attic" rozšírenia nie sú stabilná časť slovníka – Google ani validátor ich neberú ako záväzné.
  const part = arr(n['schema:isPartOf']).map((x) => x['@id']);
  const isPending = part.some((p) => /pending|attic/.test(p));
  const kinds = arr(n['@type']);
  if (kinds.includes('rdfs:Class') || kinds.includes('schema:DataType')) {
    types[name] = { sub: ids(n['rdfs:subClassOf']) };
    if (kinds.includes('schema:DataType')) types[name].dataType = true;
    if (isPending) types[name].pending = true;
  } else if (kinds.includes('rdf:Property')) {
    properties[name] = { domain: ids(n['schema:domainIncludes']), range: ids(n['schema:rangeIncludes']) };
    const sup = ids(n['schema:supersededBy']);
    if (sup.length) properties[name].supersededBy = sup;
    if (isPending) properties[name].pending = true;
  } else {
    // člen enumerácie, napr. schema:True má @type schema:Boolean
    const t = kinds.filter((k) => k.startsWith('schema:')).map((k) => k.slice(7));
    if (t.length) enums[name] = t;
    if (isPending) pending.push(name);
  }
}

const version = raw['@context']?.schemaVersion ?? graph.find((n) => n['@id'] === 'schema:')?.['schema:schemaVersion'] ?? null;
const out = { source: URL_LATEST, generated: new Date().toISOString().slice(0, 10), version, types, properties, enums };
fs.writeFileSync(OUT, JSON.stringify(out));
console.log(`schema.org slovník: ${Object.keys(types).length} typov, ${Object.keys(properties).length} vlastností -> ${path.relative(process.cwd(), OUT)}`);
