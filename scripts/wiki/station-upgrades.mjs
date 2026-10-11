// Station recipes and progression from committed catalogs and cached wiki pages.
// Wiki access stays cache-only, including extension construction prerequisites.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { api, addLocalizedNames, readCachedPages } from './api.mjs';
import { cleanText, parseInfobox, parseLinks, parseMaterialList, parseWikiTables, slug } from './wikitext.mjs';
import { createMaterialResolver } from './materials.mjs';

export const CRAFTING_STATION_PAGES = [
  'Artisan Table', 'Black Forge', 'Forge', 'Stonecutter', 'Workbench', 'Galdr Table',
];
const wiki = title => `https://valheim.weirdgloop.org/w/${encodeURIComponent(title.replaceAll(' ', '_'))}`;
const recipe = value => parseMaterialList(String(value ?? '').replace(/\{\{\s*Item link\|([^|}]+)\|(\d+)\}\}/gi, '$2 [[$1]]'));

export async function addStationLocalizedNames(stations, client = api) {
  // Group pages and section links do not name the individual station.
  await addLocalizedNames(stations, {
    getLangLinks: titles => client.getLangLinks(titles, { excludeRedirects: true, excludeFragments: true }),
  });
}

export function parseStationUpgrades(title, wikitext) {
  const section = wikitext.match(/^==\s*Upgrades\s*==\s*$([\s\S]*?)(?=^==[^=]|$(?![\s\S]))/mi)?.[1] ?? '';
  // A totals row has its own headers; remove it before the shared table parser.
  const table = parseWikiTables(section.replace(/\|-\s*class="sortbottom"[\s\S]*?\|}/g, '|}'))[0];
  if (!table) return [];
  const nameColumn = table.headers.findIndex(h => cleanText(h) === 'Name');
  const materialsColumn = table.headers.findIndex(h => cleanText(h) === 'Materials');
  if (nameColumn < 0 || materialsColumn < 0) throw new Error(`Invalid upgrades table: ${title}`);
  return table.rows.map(row => {
    // The Galdr table uses a lowercase link to the canonical cached page.
    const name = cleanText(row[nameColumn]).replace(/^Feathery wreath$/, 'Feathery Wreath');
    const materials = recipe(row[materialsColumn]).map(m => ({ item: slug(m.name), amount: m.amount }));
    if (!name || !materials.length) throw new Error(`Missing upgrade recipe: ${title} / ${name}`);
    return { id: slug(name), name, names: {}, wiki: wiki(name), type: 'upgrade',
      upgrades: slug(title), materials };
  });
}

export function createStationProgression() {
  const load = name => JSON.parse(readFileSync(fileURLToPath(new URL(`../../data/${name}.json`, import.meta.url)), 'utf8'));
  const biomes = load('biomes');
  const tierByBiome = new Map(biomes.map(b => [b.id, b.order]));
  const catalog = [...load('items-compendium').items, ...load('items')];
  const localMaterials = Object.fromEntries(catalog.filter(m => m.biome).map(m => [m.name, { biome: m.biome, tier: tierByBiome.get(m.biome) }]));
  // Reuse the existing, wiki-verified early acquisition of Coal until O-3 fixes
  // the shared catalog. This does not rewrite any material records.
  const coal = load('overrides').comfort?.materials?.Coal;
  if (coal) localMaterials.Coal = { biome: coal.biome, tier: tierByBiome.get(coal.biome) };
  const titles = [...CRAFTING_STATION_PAGES, 'Cauldron'];
  const pages = readCachedPages(titles);
  const extensions = new Map(titles.map(t => [t, parseStationUpgrades(t, pages.get(t))]));
  const materialNames = new Map();
  for (const wt of pages.values()) {
    for (const m of recipe(parseInfobox(wt, 'structure')?.materials)) materialNames.set(slug(m.name), m.name);
    const section = wt.match(/^==\s*Upgrades\s*==\s*$([\s\S]*?)(?=^==[^=]|$(?![\s\S]))/mi)?.[1] ?? '';
    for (const table of parseWikiTables(section)) for (const row of table.rows)
      for (const m of recipe(row.at(-1))) materialNames.set(slug(m.name), m.name);
  }
  const extensionTitles = [...extensions.values()].flat().map(e => e.name).filter(t => t !== 'Artisan Press');
  for (const [title, wt] of readCachedPages([...extensionTitles, 'Sharpening Stone', 'Mechanical Spring'])) pages.set(title, wt);
  const resolver = createMaterialResolver({ overrides: { materials: localMaterials },
    creatures: load('creatures'), tierByBiome,
    allPages: Object.fromEntries([...pages].map(([title, wikitext]) => [title, { title, wikitext }])) });
  const stationBiomes = new Map();
  const byId = new Map(titles.map(t => [slug(t), t]));
  const maximum = requirements => {
    if (requirements.some(r => !r?.biome || r.tier == null)) throw new Error('Unresolved station material or prerequisite');
    const best = requirements.reduce((a, b) => b.tier > a.tier ? b : a, { biome: 'meadows', tier: 1 });
    return { biome: best.biome, tier: best.tier };
  };
  const sourceOf = wt => {
    const source = parseInfobox(wt, 'structure')?.source ?? '';
    const sources = parseLinks(source).map(slug).filter(id => id !== 'crafting');
    for (const id of sources) if (!byId.has(id)) throw new Error(`Unknown construction station: ${id}`);
    return sources.reduce((best, id) => !best || stationBiome(id).tier > stationBiome(best).tier ? id : best, null);
  };
  const materialBiome = name => {
    if (!name) throw new Error('Missing station material name');
    const resolved = resolver(name);
    if (!resolved.biome || resolved.tier == null) throw new Error(`Unresolved station material: ${name}`);
    // These manufactured materials also require their production station.
    const productionStation = { 'Sharpening Stone': 'stonecutter', 'Mechanical Spring': 'artisan-table' }[name];
    return productionStation ? maximum([resolved, stationBiome(productionStation)]) : resolved;
  };
  const stationBiome = id => {
    if (stationBiomes.has(id)) return stationBiomes.get(id);
    const title = byId.get(id);
    if (!title) throw new Error(`Unknown construction station: ${id}`);
    const wt = pages.get(title), box = parseInfobox(wt, 'structure');
    const source = sourceOf(wt);
    const result = maximum([...recipe(box.materials).map(m => materialBiome(m.name)), ...(source ? [stationBiome(source)] : [])]);
    stationBiomes.set(id, result);
    return result;
  };
  return title => {
    const id = slug(title), wt = pages.get(title), box = parseInfobox(wt, 'structure');
    if (!box) throw new Error(`Missing cached station: ${title}`);
    const materials = recipe(box.materials).map(m => ({ item: slug(m.name), amount: m.amount }));
    const source = sourceOf(wt), base = stationBiome(id);
    const upgrades = extensions.get(title).map((e, index) => {
      const buildingStation = e.name === 'Artisan Press' ? id : sourceOf(pages.get(e.name));
      const requirement = maximum([base, ...e.materials.map(m => materialBiome(materialNames.get(m.item))),
        ...(buildingStation ? [stationBiome(buildingStation)] : [])]);
      return { ...e, unlock: { station: buildingStation, materials: e.materials.map(m => m.item) },
        ...requirement, stationLevel: 1, levelIncrement: 1, tableOrder: index };
    }).sort((a, b) => a.tier - b.tier || a.tableOrder - b.tableOrder).map((e, index) => {
      const { tableOrder, ...record } = e;
      return { ...record, progressionLevel: index + 2 };
    });
    let requirement = base;
    const levels = [{ level: 1, upgrade: null, ...base }, ...upgrades.map(e => {
      requirement = maximum([requirement, e]);
      return { level: e.progressionLevel, upgrade: e.id, ...requirement };
    })];
    return { station: { id, name: title, names: {}, wiki: wiki(title), type: 'crafting', materials,
      unlock: { station: source, materials: materials.map(m => m.item) }, ...base, maxLevel: levels.length, levels }, upgrades };
  };
}
