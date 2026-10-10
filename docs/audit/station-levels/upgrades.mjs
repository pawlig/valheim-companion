// VC-44 analysis (§ 1): extract station upgrade tables ("== Upgrades ==") from
// the wiki cache and resolve material biomes from data/items.json (fallback
// data/items-compendium.json). Writes upgrades.json next to this script.
// Usage: node docs/audit/station-levels/upgrades.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { loadPages, ROOT, HERE } from './cache.mjs';

const { pages } = loadPages();
const J = (p) => JSON.parse(readFileSync(path.join(ROOT, p), 'utf8'));
const items = J('data/items.json');
const comp = J('data/items-compendium.json').items;
const biomes = J('data/biomes.json');
const order = Object.fromEntries(biomes.map((b) => [b.id, b.order]));
const byName = (arr, n) => arr.find((x) => x.name.toLowerCase() === n.toLowerCase());
function matBiome(n) {
  const i = byName(items, n), c = byName(comp, n);
  return { items: i?.biome ?? null, comp: c?.biome ?? null };
}
const STATIONS = ['Workbench', 'Forge', 'Black Forge', 'Galdr Table', 'Cauldron', 'Artisan Table', 'Stonecutter',
  'Fermenter', 'Spinning Wheel', 'Food Preparation Table', 'Stone Oven', 'Smelter', 'Blast Furnace', 'Charcoal Kiln',
  'Windmill', 'Cooking Station', 'Iron Cooking Station', 'Mead Ketill', 'Eitr Refinery', 'Frost Foundry', 'Frigid Kiln'];

function parseMats(cell) {
  const out = [];
  for (const m of cell.matchAll(/\{\{Item link\|([^|}]+)\|(\d+)\}\}/gi)) out.push({ name: m[1].trim(), amount: +m[2] });
  for (const m of cell.matchAll(/(\d+)\s*\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)) out.push({ name: m[2].trim(), amount: +m[1] });
  for (const m of cell.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]\s*x\s*(\d+)/g)) out.push({ name: m[1].trim(), amount: +m[2] });
  return out;
}
const matsField = (wt) => wt.match(/\|\s*materials\s*=\s*([\s\S]*?)(?=\n\|[a-z ]+=|\n\}\})/i)?.[1] ?? '';

const result = {};
for (const st of STATIONS) {
  const wt = pages[st];
  if (!wt) { result[st] = { missing: true }; continue; }
  // infobox ends either with "\n}}" or (Artisan Table) with "...}}\n\n"
  const ib = wt.match(/\{\{infobox structure[\s\S]*?(?:\n\}\}|\}\}\n\n)/i)?.[0] ?? '';
  const baseMats = parseMats(matsField(ib));
  const sec = wt.match(/==+\s*Upgrades?\s*==+([\s\S]*?)(?=\n==[^=]|$)/i)?.[1];
  const levelTxt = sec?.match(/up to level\s+([^\s,.]+(?:\s+crafting level\|[^}]+\}\})?)/i)?.[1] ?? null;
  const upgrades = [];
  if (sec) {
    for (const r of sec.split(/\n\|-/).slice(1)) {
      if (/sortbottom|Total/.test(r)) continue;
      // name is normally a [[link]]; Artisan Table lists "Artisan Press" as plain text
      const plain = r.split(/\n\|(?!\|)|\|\|/).map((c) => c.trim()).filter((c) => c && !/\[\[File:/.test(c));
      const name = r.match(/\|\s*\[\[(?!File:)([^\]|]+)(?:\|[^\]]*)?\]\]/)?.[1] ?? (plain[0] && !/\[\[/.test(plain[0]) ? plain[0] : null);
      if (!name) continue;
      const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const cells = r.split(/\n\|(?!\|)|\|\|/).filter((c) => !/\[\[File:/.test(c) && c.trim() !== name && !new RegExp('\\[\\[' + esc + '[\\]|]').test(c));
      const mats = parseMats(cells.join('\n'));
      const page = pages[name] || pages[name.replace(/\b\w/g, (c) => c.toUpperCase())] || '';
      const pm = matsField(page);
      upgrades.push({ name, mats, pageMats: pm ? parseMats(pm) : null, pageId: page.match(/\|\s*id\s*=\s*([^\n]+)/)?.[1]?.trim() ?? null, hasPage: !!pages[name] });
    }
  }
  const resolve = (mats) => {
    let best = null; const det = [];
    for (const m of mats) {
      const b = matBiome(m.name); const use = b.items ?? b.comp;
      det.push(`${m.name}:${use ?? '?'}${b.items && b.comp && b.items !== b.comp ? `(items=${b.items},comp=${b.comp})` : ''}`);
      if (use && (best == null || order[use] > order[best])) best = use;
    }
    return { biome: best, det };
  };
  result[st] = { baseMats, base: resolve(baseMats), levelTxt, upgrades: upgrades.map((u) => ({ ...u, res: resolve(u.mats) })) };
}
writeFileSync(path.join(HERE, 'upgrades.json'), JSON.stringify(result, null, 1) + '\n');
for (const [st, r] of Object.entries(result)) {
  if (r.missing) { console.log('#', st, 'MISSING PAGE'); continue; }
  console.log('#', st, '| base:', r.baseMats.map((m) => m.amount + ' ' + m.name).join(', '), '=>', r.base.biome, '| level text:', r.levelTxt, '| upgrades:', r.upgrades.length);
  for (const u of r.upgrades) {
    const same = u.pageMats ? JSON.stringify(u.pageMats.map((m) => m.name + m.amount).sort()) === JSON.stringify(u.mats.map((m) => m.name + m.amount).sort()) : 'n/a';
    console.log('   -', u.name, '[' + u.pageId + ']', u.mats.map((m) => m.amount + ' ' + m.name).join(', '), '=>', u.res.biome, '| page mats same:', same, '|', u.res.det.join(' '));
  }
}
