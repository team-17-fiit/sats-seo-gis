// Aktualizácia docs/site.json (údaje pre tímový web): šprinty, technológie, dokumenty.
// Čísla a odkazy skladá kód (Plane, git, súborový systém). AI píše len krátke texty.
// Spustenie: node scripts/sync-site.mjs [--force]   (v CI cez workflow sync-site.yml)
import { execFileSync, execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";

const OUT = "docs/site.json";
const env = process.env;
const force = process.argv.includes("--force") || env.FORCE === "true";
const repo = env.GITHUB_REPOSITORY || "Matus17/sats-seo-gis";
const sh = (c) => { try { return execSync(c, { encoding: "utf8", maxBuffer: 20e6 }).trim(); } catch { return ""; } };
const read = (p, n = 3000) => (existsSync(p) ? readFileSync(p, "utf8").slice(0, n) : "");
const need = (k) => { if (!env[k]) { console.error(`Chýba premenná ${k}.`); process.exit(1); } return env[k]; };

const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {};

// ---------- 1. Plane: šprinty (deterministicky) ----------
const planeBase = `https://api.plane.so/api/v1/workspaces/${need("PLANE_WORKSPACE")}/projects/${need("PLANE_PROJECT_ID")}`;
const plane = async (path) => {
  const r = await fetch(`${planeBase}/${path}`, { headers: { "X-API-Key": need("PLANE_API_KEY") } });
  if (!r.ok) throw new Error(`Plane ${path}: HTTP ${r.status}`);
  const j = await r.json();
  return Array.isArray(j) ? j : j.results ?? [];
};
const cycles = (await plane("cycles/?per_page=100"))
  .filter((c) => c.start_date && c.end_date)
  .sort((a, b) => a.start_date.localeCompare(b.start_date));
if (!cycles.length) throw new Error("Plane nevrátil žiadne šprinty (cykly).");

const today = new Date().toISOString().slice(0, 10);
const dm = (d) => `${+d.slice(8, 10)}. ${+d.slice(5, 7)}.`;
const sprints = [];
for (const [i, c] of cycles.entries()) {
  let titles = [];
  try {
    titles = (await plane(`cycles/${c.id}/cycle-issues/?per_page=100`))
      .map((x) => x.name ?? x.issue_detail?.name).filter(Boolean).slice(0, 40);
  } catch (e) { console.warn(String(e)); }
  sprints.push({
    n: i + 1,
    range: `${dm(c.start_date)} – ${dm(c.end_date)} ${c.end_date.slice(0, 4)}`,
    status: c.end_date < today ? "hotovo" : c.start_date <= today ? "prebieha" : "plán",
    done: c.completed_issues ?? 0,
    total: c.total_issues ?? 0,
    _description: c.description || "",
    _titles: titles,
  });
}

// ---------- 2. Repozitár: zmeny a vstupy ----------
const srcSha = sh(`git log -1 --format=%H -- . ':!${OUT}'`) || sh("git rev-parse HEAD");
const inputHash = createHash("sha256").update(JSON.stringify({ srcSha, sprints })).digest("hex").slice(0, 16);
if (!force && prev.inputHash === inputHash) { console.log("Bez zmien, nič negenerujem."); process.exit(0); }

const known = prev.sourceSha && sh(`git cat-file -t ${prev.sourceSha}`) === "commit";
const log = known
  ? sh(`git log ${prev.sourceSha}..HEAD --format=%s -n 60 -- . ':!${OUT}'`)
  : sh(`git log --format=%s -n 60 -- . ':!${OUT}'`);
const diffStat = known ? sh(`git diff --stat ${prev.sourceSha} HEAD -- . ':!${OUT}' | tail -40`) : "";

const docsDir = "docs";
const folders = readdirSync(docsDir)
  .filter((f) => statSync(`${docsDir}/${f}`).isDirectory() && f !== "minutes") // zápisnice sú priamo na webe
  .map((f) => ({
    folder: f,
    files: readdirSync(`${docsDir}/${f}`).filter((x) => /\.(md|csv)$/i.test(x)).slice(0, 15)
      .map((x) => `${x}: ${(read(`${docsDir}/${f}/${x}`, 400).split("\n").find((l) => l.trim()) || "").replace(/^#+\s*/, "")}`),
  }))
  .filter((f) => f.files.length);

const context = {
  readme: read("README.md", 2500),
  frontendDeps: JSON.parse(read("app/package.json", 20000) || "{}").dependencies ?? {},
  frontendDevDeps: Object.keys(JSON.parse(read("app/package.json", 20000) || "{}").devDependencies ?? {}),
  backendPyproject: read("backend/pyproject.toml", 2500),
  backendRequirements: read("backend/requirements.txt", 1500),
  adr: folders.find((f) => f.folder === "adr")?.files ?? [],
  docsFolders: folders,
  commitsSinceLastSync: log,
  diffStat,
  sprints: sprints.map(({ n, range, status, done, total, _description, _titles }) => ({ n, range, status, done, total, description: _description, issueTitles: _titles })),
  previousTexts: { tech: prev.tech ?? [], documents: prev.documents ?? [], sprints: (prev.sprints ?? []).map((s) => ({ n: s.n, text: s.text })) },
};

// ---------- 3. AI: iba texty ----------
const prompt = `Aktualizuješ obsah tímového webu k študentskému projektu. Píš po slovensky, vecne, bez marketingu.
Z VSTUPOV nižšie vráť IBA JSON v tvare:
{"tech":[{"area":"...","name":"...","text":"..."}],
 "documents":[{"folder":"...","title":"...","text":"..."}],
 "sprints":[{"n":1,"text":"..."}]}
PRAVIDLÁ:
- Použi len fakty zo vstupov. Nič si nevymýšľaj. Plány nikdy neopisuj ako hotové (napr. offline režim či service worker, ak ešte nie je v kóde).
- tech: 4 až 8 položiek (frontend, mapa, backend, dáta, kvalita...) podľa skutočných závislostí a ADR. Verzie uveď len ak sú vo vstupoch. text max 120 znakov.
- documents: presne jedna položka pre každý priečinok z docsFolders (folder = jeho názov). title max 30 znakov, text max 90 znakov.
- sprints: presne jedna položka pre každý šprint zo vstupu (n). 1 až 2 vety (max 200 znakov): čo sa v šprinte robilo podľa description a issueTitles. Čísla hotových úloh nepíš, doplní ich kód.
- Žiadne osobné údaje ani mená ľudí. Ak sa fakty od previousTexts nezmenili, zachovaj pôvodnú formuláciu.
VSTUPY:
${JSON.stringify(context)}`;

// AI: buď token z predplatného (Claude Code CLI, CLAUDE_CODE_OAUTH_TOKEN), alebo API kľúč (ANTHROPIC_API_KEY).
let raw;
if (env.CLAUDE_CODE_OAUTH_TOKEN) {
  const args = ["-p", "--output-format", "text", "--max-turns", "1"];
  if (env.CLAUDE_MODEL) args.push("--model", env.CLAUDE_MODEL);
  raw = execFileSync("claude", args, { input: prompt, encoding: "utf8", maxBuffer: 20e6, timeout: 240000 });
} else {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": need("ANTHROPIC_API_KEY"), "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: env.ANTHROPIC_MODEL || "claude-sonnet-4-5", max_tokens: 3000, temperature: 0, messages: [{ role: "user", content: prompt }] }),
  });
  if (!res.ok) throw new Error(`Anthropic API: HTTP ${res.status} ${await res.text()}`);
  raw = (await res.json()).content?.[0]?.text ?? "";
}
const ai = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));

// ---------- 4. Validácia a zloženie ----------
const str = (v, max) => typeof v === "string" && v.trim() && v.length <= max;
const fail = (m) => { throw new Error(`Neplatný výstup AI: ${m}`); };
if (!Array.isArray(ai.tech) || ai.tech.length < 3 || ai.tech.length > 8) fail("tech");
for (const t of ai.tech) if (!str(t.area, 30) || !str(t.name, 60) || !str(t.text, 200)) fail(`tech ${JSON.stringify(t)}`);
const doc = Object.fromEntries((ai.documents ?? []).map((d) => [d.folder, d]));
const sp = Object.fromEntries((ai.sprints ?? []).map((s) => [s.n, s.text]));

const documents = folders.map(({ folder }) => {
  const d = doc[folder] ?? fail(`chýba dokument ${folder}`);
  if (!str(d.title, 60) || !str(d.text, 160)) fail(`documents ${folder}`);
  return { title: d.title, text: d.text, type: "GitHub", href: `https://github.com/${repo}/tree/main/docs/${folder}` };
});
const finalSprints = sprints.map(({ _description, _titles, ...s }) => {
  if (!str(sp[s.n], 300)) fail(`šprint ${s.n}`);
  return { ...s, text: sp[s.n] };
});

writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), sourceSha: srcSha, inputHash, tech: ai.tech, documents, sprints: finalSprints }, null, 2) + "\n");
console.log(`Zapísané ${OUT}: ${finalSprints.length} šprinty, ${ai.tech.length} technológií, ${documents.length} dokumentov.`);
