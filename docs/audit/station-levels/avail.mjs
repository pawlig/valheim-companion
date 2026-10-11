// VC-44 analysis (§ 3.2): for every craftable weapon / shield / tool / ammo /
// armor piece and every quality, compute the earliest biome where it can be
// crafted = max(biome of all materials up to that quality, biome where the
// station reaches the required level) and compare with the biome the
// companion shows today (weapons[].biome, armor[].biome).
//
// Station level -> earliest biome (order from data/biomes.json) is the table
// from ROZBOR-STATION-LEVELS.md § 2 (derived from upgrades.mjs output).
//
// Excluded (listed in the "skipped" section of the output):
//   - weapons whose station is not a levelled crafting station
//     ("Always available", "Player crafting menu": Bare Fists, Club, Stone Axe)
//   - armor sets with kind "cosmetic" (Hildir's clothes, no recipe)
//   - armor pieces with no materials on any level (trader / boss-drop items)
// Included: everything else, incl. kind "special" pieces with a recipe
// (Cape of Oden, Hood of Oden, Midsummer Crown, Pointy Hat).
// Since VC-45c the script also compares its own computation with the
// `levels[q].availableFrom` / `availableTier` / `unreachable` written by the
// fetchers and prints "N differences" (must be 0).
//
// Usage: node docs/audit/station-levels/avail.mjs
// Writes early-and-unreachable.md and early-and-unreachable.json next to this script.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT, HERE } from './cache.mjs';

const J = (p) => JSON.parse(readFileSync(path.join(ROOT, p), 'utf8'));
const weapons = J('data/weapons.json');
const armor = J('data/armor.json');
const items = J('data/items.json');
const comp = J('data/items-compendium.json').items;
const biomes = J('data/biomes.json');
const ORD = Object.fromEntries(biomes.map((b) => [b.id, b.order]));
const NAME = Object.fromEntries(biomes.map((b) => [b.order, b.id]));

// Station level -> biome comes from data/stations.json (levels[].biome, maxLevel; VC-45a),
// the same file the fetchers use. Since VC-45b weapons/armor carry canonical station
// names (Frost Foundry is `finishedAt`), so no re-attribution is needed any more.
const stations = J('data/stations.json');
const STATION = Object.fromEntries(stations.filter((st) => st.levels?.length).map((st) =>
  [st.name, Object.fromEntries(st.levels.map((l) => [l.level, ORD[l.biome]]))]));
const MAX = Object.fromEntries(stations.filter((st) => st.levels?.length).map((st) => [st.name, st.maxLevel]));

// Canonical names pass through; null / unknown stations are skipped by analyze().
function normStation(s) {
  return s ? s.trim() : null;
}
const itemsById = new Map(items.map((i) => [i.id, i]));
const compById = new Map(comp.map((i) => [i.id, i]));
function matOrder(id) {
  const b = itemsById.get(id)?.biome ?? compById.get(id)?.biome ?? null;
  return b ? ORD[b] : null;
}

const rows = [], skipped = [], anomalies = [];
const differences = [];
function analyze(kind, name, id, setName, station0, levels, displayBiome) {
  const station = normStation(station0);
  if (!levels?.length) { skipped.push(`${kind} ${name}: no levels`); return; }
  if (!STATION[station]) { skipped.push(`${kind} ${name}: station "${station0}"`); return; }
  const dispOrd = displayBiome ? ORD[displayBiome] : null;
  for (let i = 1; i < levels.length; i++) {
    if (levels[i].stationLevel !== levels[i - 1].stationLevel + 1) {
      anomalies.push(`${kind} ${setName ? setName + ' / ' : ''}${name}: stationLevel ${levels.map((l) => l.stationLevel).join('/')}`);
      break;
    }
  }
  let cumMat = 0; const qs = [];
  for (const l of levels) {
    for (const m of l.materials ?? []) { const o = matOrder(m.item); if (o != null && o > cumMat) cumMat = o; }
    const unreachable = l.stationLevel > MAX[station];
    const stOrd = unreachable ? null : STATION[station][l.stationLevel];
    const avail = unreachable ? null : Math.max(cumMat, stOrd);
    const stored = { availableFrom: l.availableFrom, availableTier: l.availableTier, unreachable: l.unreachable === true };
    const computed = { availableFrom: unreachable ? null : NAME[avail], availableTier: unreachable ? null : avail, unreachable };
    if (JSON.stringify(stored) !== JSON.stringify(computed)) {
      differences.push(`${kind} ${setName ? setName + ' / ' : ''}${name} Q${l.quality}: computed ${JSON.stringify(computed)} vs data ${JSON.stringify(stored)}`);
    }
    qs.push({ q: l.quality, stationLevel: l.stationLevel, matOrd: cumMat, stOrd, avail, unreachable,
      gapEarly: avail != null && dispOrd != null && avail > dispOrd,
      gapLate: avail != null && dispOrd != null && avail < dispOrd });
  }
  rows.push({ kind, name, id, set: setName, station, station0, display: displayBiome, dispOrd, qs });
}

const kindOf = (w) => w.category === 'shield' ? 'shield' : w.category === 'pickaxe' ? 'tool' : ['arrow', 'bolt', 'bomb'].includes(w.category) ? 'ammo' : 'weapon';
for (const w of weapons) analyze(kindOf(w), w.name, w.id, null, w.station, w.levels, w.biome);
for (const s of armor) {
  if (s.kind === 'cosmetic') { skipped.push(`armor set ${s.name}: kind cosmetic (${s.pieces.length} pieces)`); continue; }
  for (const p of s.pieces) {
    if (!(p.levels ?? []).some((l) => (l.materials ?? []).length)) { skipped.push(`armor ${s.name} / ${p.name}: no materials (${p.station})`); continue; }
    analyze('armor', p.name, p.id, s.name, p.station, p.levels, s.biome);
  }
}

// ---- totals
const count = (pred) => rows.reduce((n, r) => n + r.qs.filter(pred).length, 0);
const tot = { items: rows.length, quals: count(() => true) };
const early = rows.filter((r) => r.qs.some((q) => q.gapEarly));
const earlyQ = count((q) => q.gapEarly);
const q1early = rows.filter((r) => r.qs[0].gapEarly);
const unreach = rows.filter((r) => r.qs.some((q) => q.unreachable));
const unreachQ = count((q) => q.unreachable);
const late = rows.filter((r) => r.qs[0].gapLate);
console.log('analyzed', tot, '| items with >=1 quality shown too early', early.length, '| qualities shown too early', earlyQ,
  '| Q1 too early', q1early.length, '| unreachable (level>max) items', unreach.length, 'quals', unreachQ,
  '| Q1 shown later than available', late.length, '| differences vs data availableFrom', differences.length);
console.log(`${differences.length} differences`);
for (const d of differences) console.log('  ' + d);
const byKind = {};
for (const r of rows) {
  const k = byKind[r.kind] ?? (byKind[r.kind] = { items: 0, quals: 0, early: 0, earlyQ: 0, unreach: 0, unreachQ: 0 });
  k.items++; k.quals += r.qs.length;
  if (r.qs.some((q) => q.gapEarly)) k.early++; k.earlyQ += r.qs.filter((q) => q.gapEarly).length;
  if (r.qs.some((q) => q.unreachable)) k.unreach++; k.unreachQ += r.qs.filter((q) => q.unreachable).length;
}
console.log('by kind', JSON.stringify(byKind));
const byStation = {}; for (const r of rows) for (const q of r.qs) if (q.gapEarly) byStation[r.station] = (byStation[r.station] || 0) + 1;
console.log('early by station', JSON.stringify(byStation));
const trans = {}; for (const r of rows) for (const q of r.qs) if (q.gapEarly) { const k = `${r.display}→${NAME[q.avail]}`; trans[k] = (trans[k] || 0) + 1; }
console.log('shown→actual', JSON.stringify(trans));
console.log('Q1 too early:', q1early.map((r) => `${r.name} (${r.station0}, shown ${r.display}, actual ${NAME[r.qs[0].avail]})`).join('; '));
console.log('Q1 later than available:', late.map((r) => `${r.set ? r.set + ' / ' : ''}${r.name} (shown ${r.display}, available ${NAME[r.qs[0].avail]})`).join('; '));
console.log('anomalies (non +1 sequences):', anomalies.length, '\n' + anomalies.join('\n'));
console.log('skipped:', skipped.length, '\n' + skipped.join('\n'));

// ---- outputs
const label = (r) => (r.set && r.kind === 'armor' ? r.set + ' / ' : '') + r.name;
const md = [];
md.push('# VC-44: qualities shown too early / above station max', '',
  `Generated by \`docs/audit/station-levels/avail.mjs\` from \`data/weapons.json\`, \`data/armor.json\`, \`data/items.json\`, \`data/items-compendium.json\`, \`data/biomes.json\`.`, '',
  `Analyzed ${tot.items} items / ${tot.quals} qualities. Items with at least one quality shown too early: ${early.length} (${earlyQ} qualities). Items with a quality above the station maximum: ${unreach.length} (${unreachQ} qualities). Q1 shown later than available: ${late.length}.`, '',
  '## Shown too early', '', '| Kind | Item | Station (data) | Shown in | Q | Station level | Available from | Reason |', '|---|---|---|---|---|---|---|---|');
for (const r of rows) for (const q of r.qs) if (q.gapEarly) {
  const reason = q.stOrd > q.matOrd ? `${r.station} level ${q.stationLevel} reachable in ${NAME[q.stOrd]}` : `materials up to ${NAME[q.matOrd]}`;
  md.push(`| ${r.kind} | ${label(r)} | ${r.station0} | ${r.display} | Q${q.q} | ${q.stationLevel} | ${NAME[q.avail]} | ${reason} |`);
}
md.push('', '## Above station maximum ("not yet available")', '', '| Kind | Item | Station (data) | Station (effective) | Shown in | Q | Station level | Max level |', '|---|---|---|---|---|---|---|---|');
for (const r of rows) for (const q of r.qs) if (q.unreachable) md.push(`| ${r.kind} | ${label(r)} | ${r.station0} | ${r.station} | ${r.display} | Q${q.q} | ${q.stationLevel} | ${MAX[r.station]} |`);
md.push('', '## Q1 shown later than available', '', '| Kind | Item | Shown in | Available from |', '|---|---|---|---|');
for (const r of late) md.push(`| ${r.kind} | ${label(r)} | ${r.display} | ${NAME[r.qs[0].avail]} |`);
md.push('', '## Non +1 stationLevel sequences (data anomalies)', '', ...anomalies.map((a) => `- ${a}`));
md.push('', '## Skipped', '', ...skipped.map((s) => `- ${s}`), '');
writeFileSync(path.join(HERE, 'early-and-unreachable.md'), md.join('\n'));
const compact = rows.filter((r) => r.qs.some((q) => q.gapEarly || q.unreachable || q.gapLate)).map((r) => ({
  kind: r.kind, item: label(r), id: r.id, station: r.station0, effectiveStation: r.station, shown: r.display,
  qualities: r.qs.map((q) => ({ q: q.q, stationLevel: q.stationLevel, availableFrom: q.unreachable ? null : NAME[q.avail], unreachable: q.unreachable, shownTooEarly: q.gapEarly, shownTooLate: q.gapLate })),
}));
writeFileSync(path.join(HERE, 'early-and-unreachable.json'), JSON.stringify({ totals: { ...tot, itemsEarly: early.length, qualitiesEarly: earlyQ, itemsUnreachable: unreach.length, qualitiesUnreachable: unreachQ, q1Late: late.length }, byKind, earlyByStation: byStation, shownToActual: trans, items: compact, anomalies, skipped }, null, 1) + '\n');
