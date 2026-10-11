// Build the Comfort Planner package from immutable shared catalog records.
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = name => JSON.parse(readFileSync(path.join(ROOT, 'data', `${name}.json`), 'utf8'));
export function buildComfortData() {
  const comfort = load('comfort');
  const allItems = new Map(load('items').map(i => [i.id, i]));
  const allStations = load('stations');
  const required = new Set();
  function include(id) {
    if (required.has(id)) return;
    const item = allItems.get(id);
    if (!item) throw new Error(`Missing Comfort material: ${id}`);
    required.add(id);
    for (const m of item.recipe?.materials ?? []) include(m.item);
  }
  for (const p of comfort.pieces) for (const m of p.materials) include(m.item);
  // These recipes remain part of Comfort after fetch-stations takes ownership.
  const stationIds = new Set(['artisan-table', 'black-forge', 'forge', 'stonecutter', 'workbench']);
  const stations = allStations.filter(s => stationIds.has(s.id));
  for (const s of stations) for (const m of s.materials ?? []) include(m.item);
  const items = Object.fromEntries([...required].sort().map(id => {
    const item = allItems.get(id);
    const override = load('overrides').comfort?.materials?.[item.name];
    const image = item.image?.startsWith('../comfort/') ? item.image.slice('../comfort/'.length)
      : item.image?.startsWith('../provisions/') ? item.image : item.image ? `../smithy/${item.image}` : null;
    return [id, { ...item, ...(override ? { biome: override.biome, tier: override.tier } : {}),
      ...(id === 'coal' ? { sources: [{ text: 'Overcook meat at a Cooking Station', kind: 'station' }, ...item.sources] } : {}),
      image: image && existsSync(path.resolve(ROOT, 'apps/comfort', image)) ? image : null,
      teleportable: item.teleportable ?? !['copper', 'tin', 'bronze', 'iron', 'silver', 'black-metal', 'flametal', 'copper-ore', 'tin-ore', 'scrap-iron', 'silver-ore', 'black-metal-scrap', 'flametal-ore', 'iron-pit'].includes(id) }];
  }));
  const data = { ...comfort, biomes: load('biomes'), items, stations, tips: load('comfort-tips') };
  for (const p of data.pieces) if (p.image && !existsSync(path.resolve(ROOT, 'apps/comfort', p.image))) throw new Error(`Missing Comfort image: ${p.image}`);
  const references = new Set([...data.pieces, ...Object.values(items)].map(e => e.image).filter(Boolean));
  const prune = dir => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) prune(file);
      else if (!references.has(path.relative(path.join(ROOT, 'apps/comfort'), file))) rmSync(file);
    }
  };
  prune(path.join(ROOT, 'apps/comfort/img'));
  const dest = path.join(ROOT, 'apps/comfort/data/data.js');
  mkdirSync(path.dirname(dest), { recursive: true });
  const content = `window.VCO_DATA = ${JSON.stringify(data, null, 2)};\n`;
  if (!existsSync(dest) || readFileSync(dest, 'utf8') !== content) writeFileSync(dest, content);
  console.log(`Built Comfort Planner: ${data.pieces.length} pieces, ${required.size} materials.`);
  return data;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) buildComfortData();
