// Deterministic Provisions pipeline. All wiki requests and images use the shared cache client.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { api, addLocalizedNames } from './api.mjs';
import { createStationProgression } from './station-upgrades.mjs';
import { cleanText, parseTemplates, parseInfobox, parseMaterialList, parseWikiTables, parseLinks, slug } from './wikitext.mjs';
import { createMaterialResolver } from './materials.mjs';
import { parseSources, parseConversionRecipe, resolveRecipeBiomes } from './items.mjs';
import { BIOMES } from './biomes.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const load = name => JSON.parse(readFileSync(path.join(ROOT, 'data', name), 'utf8'));
const sortNames = (a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
const wiki = title => `https://valheim.weirdgloop.org/w/${encodeURIComponent(title.replaceAll(' ', '_'))}`;
const number = (value, fallback = null) => {
  const match = cleanText(value ?? '').match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : fallback;
};
const mats = value => parseMaterialList(value).map(m => ({ item: slug(m.name), amount: m.amount, ...(m.fuel ? { fuel: true } : {}) }));
const stationId = value => {
  const text = cleanText(value ?? '').toLowerCase();
  for (const station of ['iron-cooking-station', 'cooking-station', 'cauldron', 'oven', 'food-preparation-table', 'mead-ketill', 'fermenter']) {
    if (text.includes(station.replaceAll('-', ' '))) return station;
  }
  return 'none';
};
export function parseFood(title, box) {
  const name = title;
  const isFeast = cleanText(box.type).toLowerCase() === 'feast';
  return {
    id: slug(name), name, names: {}, wiki: wiki(title), image: `img/food/${slug(name)}.png`,
    health: number(box.health, 0), stamina: number(box.stamina, 0), eitr: number(box.eitr, 0),
    duration: number(box.duration),
    healing: { amount: number(box.healing), interval: number(box.healing?.match(/(?:every|per)\s+(\d+(?:\.\d+)?)\s*s(?:ec)?/i)?.[1]) },
    station: stationId(box.source), stationLevel: number(box.source?.match(/level\s*(\d+)/i)?.[1], number(box['crafting level'], 1)),
    materials: mats(box.materials), yields: number(box.quantity, 1), biome: null, tier: null,
    isFeast, ...(isFeast ? { servings: number(box.uses, 10) } : {}),
  };
}
export function parseMead(title, wt) {
  const boxes = parseTemplates(wt, 'infobox item');
  const box = boxes.find(b => cleanText(b.type).toLowerCase() === 'mead');
  if (!box) return null;
  const baseBox = boxes.find(b => /^(mead|barley wine) base$/i.test(cleanText(b.type)));
  const effects = [box.effect, box['health regen'], box['stamina regen'], box['eitr regen']].filter(Boolean);
  const rawText = effects.length ? effects.map(cleanText).join('; ') : cleanText((wt.match(/==\s*Effect\s*==([\s\S]*?)(?=\n==|$)/i)?.[1] ?? box.description ?? '').split('{|')[0]).trim();
  const text = rawText.replace(/^\s*\*+\s*/gm, '').trim();
  const resistances = [];
  for (const match of text.matchAll(/(Very resistant|Resistan(?:t|ce)|Weak)\s*(?:\((?:x)?([\d.]+)(?:x)?\))?\s*(?:VS\.?|against)\s+([^\n;]+)/gi)) {
    for (const type of match[3].replace(/\s+damage.*$/i, '').split(/,\s*|\s+and\s+/)) {
      const damage = type.trim().toLowerCase();
      if (['fire', 'frost', 'poison', 'slash', 'blunt', 'pierce'].includes(damage)) resistances.push({ type: damage, multiplier: match[2] ? Number(match[2]) : ({ 'very resistant': 0.25, resistant: 0.5, resistance: 0.5, weak: 1.5 })[match[1].toLowerCase()] });
    }
  }
  return {
    id: slug(title), name: title, names: {}, wiki: wiki(title), image: `img/meads/${slug(title)}.png`,
    effect: { text, resistances }, duration: number(box.duration), cooldown: number(box.cooldown),
    base: baseBox ? { item: slug(cleanText(parseMaterialList(box.materials)[0]?.name ?? baseBox.title ?? '')), name: cleanText(baseBox.title ?? parseMaterialList(box.materials)[0]?.name ?? ''), station: stationId(baseBox.source), stationLevel: number(baseBox['crafting level'], number(baseBox.source?.match(/level\s*(\d+)/i)?.[1], 1)), materials: mats(baseBox.materials) } : null,
    fermenterTime: null, yields: number(box.quantity, baseBox ? 6 : number(box['buy quantity'], 1)), biome: null, tier: null,
  };
}
export function parseFeasts(wt) {
  const table = parseWikiTables(wt).find(t => t.headers.some(h => cleanText(h) === 'Raw materials'));
  return (table?.rows ?? []).map(row => {
    const name = cleanText(row[0]);
    return parseFood(name, { type: 'Feast', health: row[2], stamina: row[3], eitr: row[4], healing: `${row[5]} hp/tick`, materials: row[6], source: 'Food Preparation Table', duration: number(wt.match(/each serving lasts (\d+) minutes/i)?.[1]) * 60, uses: number(wt.match(/has (\d+) servings/i)?.[1], 10) });
  });
}
export function parseCauldronUpgrades(wt) {
  const section = wt.match(/==\s*Upgrades\s*==([\s\S]*?)(?=\n==[^=]|$)/i)?.[1] ?? '';
  return (parseWikiTables(section)[0]?.rows ?? [])
    .filter(row => /^\[\[/.test(row[0])).map(row => cleanText(row[0]));
}
export function parseProvisionsStation(title, wt) {
  const box = parseInfobox(wt, 'structure') ?? {};
  const materials = mats(box.materials);
  const source = cleanText(box.source ?? '') || null;
  return { id: slug(title), name: title, names: {}, wiki: wiki(title), type: 'provisions', materials,
    unlock: { station: source, materials: materials.map(m => m.item) },
    ...(title === 'Fermenter' ? { secondsPerBatch: number(wt.match(/cycle takes ([\d,]+) seconds/i)?.[1]?.replaceAll(',', '')) } : {}),
  };
}
export async function categoryRecursive(name, client = api, seen = new Set()) {
  if (seen.has(name)) return [];
  seen.add(name);
  const titles = [];
  let continuation = {};
  do {
    const body = await client.request({ action: 'query', list: 'categorymembers', cmtitle: `Category:${name}`, cmlimit: 500, cmtype: 'page|subcat', format: 'json', formatversion: 2, ...continuation });
    for (const member of body.query?.categorymembers ?? []) {
      if (member.ns === 14) titles.push(...await categoryRecursive(member.title.replace(/^Category:/, ''), client, seen));
      else titles.push(member.title);
    }
    continuation = body.continue ?? {};
  } while (continuation.cmcontinue);
  return [...new Set(titles)].sort();
}
function save(relative, content) {
  const dest = path.join(ROOT, relative);
  mkdirSync(path.dirname(dest), { recursive: true });
  if (!existsSync(dest) || readFileSync(dest, 'utf8') !== content) writeFileSync(dest, content);
}
export async function fetchProvisions() {
  const foodTitles = await categoryRecursive('Food');
  const meadTitles = await categoryRecursive('Mead');
  const stationTitles = ['Cauldron', 'Fermenter', 'Cooking Station', 'Iron Cooking Station', 'Oven', 'Mead Ketill', 'Food Preparation Table'];
  const titles = [...new Set([...foodTitles, ...meadTitles, 'Feast', ...stationTitles])].sort();
  console.log(`Fetching ${foodTitles.length} food category pages, ${meadTitles.length} mead category pages.`);
  const pages = await api.getWikitext(titles);
  Object.assign(pages, await api.getWikitext(['The Bog Witch']));
  const foodById = new Map(parseFeasts(pages.Feast.wikitext).map(f => [f.id, f]));
  const meads = [];
  const imageFiles = new Map();
  const excluded = [];
  for (const title of titles) {
    const wt = pages[title]?.wikitext ?? '';
    const boxes = parseTemplates(wt, 'infobox item');
    const foodBox = boxes.find(b => /^(food|feast)$/i.test(cleanText(b.type)));
    if (foodBox) {
      const boxName = cleanText(foodBox.title ?? pages[title].title);
      const f = parseFood(slug(boxName) === slug(pages[title].title) ? pages[title].title : boxName, foodBox);
      f.wiki = wiki(title);
      if (/unimplemented|console commands/i.test(wt)) f.availability = 'console-only';
      foodById.set(f.id, f);
      imageFiles.set(f.id, cleanText(foodBox.image ?? `${f.name}.png`));
    } else if (foodTitles.includes(title)) excluded.push(title);
    const mead = parseMead(pages[title]?.title ?? title, wt);
    if (mead && !meads.some(m => m.id === mead.id)) {
      meads.push(mead);
      imageFiles.set(mead.id, cleanText(boxes.find(b => cleanText(b.type).toLowerCase() === 'mead').image ?? `${mead.name}.png`));
    }
  }
  const food = [...foodById.values()].sort(sortNames);
  meads.sort(sortNames);
  const upgrades = parseCauldronUpgrades(pages.Cauldron.wikitext);
  Object.assign(pages, await api.getWikitext(upgrades));
  const additions = [...stationTitles, ...upgrades].map(title => parseProvisionsStation(title, pages[title]?.wikitext ?? ''));
  const cauldron = additions.find(s => s.id === 'cauldron');
  const progression = createStationProgression()('Cauldron');
  Object.assign(cauldron, { biome: progression.station.biome, tier: progression.station.tier,
    maxLevel: progression.station.maxLevel, levels: progression.station.levels });
  for (const upgrade of progression.upgrades) Object.assign(additions.find(s => s.id === upgrade.id), {
    upgrades: 'cauldron', biome: upgrade.biome, tier: upgrade.tier,
    stationLevel: 1, levelIncrement: 1, progressionLevel: upgrade.progressionLevel });
  const stations = load('stations.json').filter(station => station.type !== 'provisions');
  const existingStationIds = new Set(stations.map(s => s.id));
  const newStations = additions.filter(s => !existingStationIds.has(s.id));
  await addLocalizedNames(additions);
  stations.push(...newStations);
  const cycle = additions.find(s => s.id === 'fermenter').secondsPerBatch;
  meads.forEach(m => { m.fermenterTime = m.base ? cycle : null; });

  // Fetch recipe dependencies to a fixed point, including food preparations and mead bases.
  Object.assign(pages, await api.getWikitext([...new Set([...food.map(f => f.name), ...meads.map(m => m.name)])].sort()));
  const dependencies = new Set();
  for (const title of titles) {
    for (const box of parseTemplates(pages[title]?.wikitext ?? '', 'infobox item')) {
      for (const m of parseMaterialList(box.materials)) dependencies.add(m.name);
    }
  }
  for (const s of additions) for (const m of s.materials) dependencies.add(m.item.replaceAll('-', ' '));
  const visited = new Set();
  while (true) {
    const batch = [...dependencies].filter(t => !visited.has(t)).sort();
    if (!batch.length) break;
    batch.forEach(t => visited.add(t));
    Object.assign(pages, await api.getWikitext(batch));
    for (const title of batch) {
      for (const box of parseTemplates(pages[title]?.wikitext ?? '', 'infobox item')) {
        for (const m of parseMaterialList(box.materials)) dependencies.add(m.name);
      }
    }
    if (visited.size > 1000) throw new Error('Material graph exceeds safety limit');
  }
  const oldItems = load('items.json').filter(item => !item.provisions);
  const byId = new Map(oldItems.map(item => [item.id, item]));
  const selectBox = (title, page) => {
    const boxes = parseTemplates(page?.wikitext ?? '', 'infobox item');
    if (/^(mead|barley wine) base:/i.test(title)) return boxes.find(b => /^(mead|barley wine) base$/i.test(cleanText(b.type))) ?? {};
    return boxes.find(b => b.title && slug(cleanText(b.title)) === slug(title))
      ?? boxes.find(b => !b.title && slug(page?.title ?? title) === slug(title)) ?? boxes[0] ?? {};
  };
  const canonicalTitle = title => {
    const page = pages[title];
    const box = selectBox(title, page);
    if (/^(mead|barley wine) base:/i.test(title)) return cleanText(box.title ?? title);
    if (box.title && slug(cleanText(box.title)) === slug(title)) return slug(page?.title) === slug(title) ? page.title : cleanText(box.title);
    return page?.title ?? title;
  };
  const canonical = new Map(Object.keys(pages).map(title => [slug(title), slug(canonicalTitle(title))]));
  const creatures = load('creatures.json');
  const creaturesBySlug = new Map(creatures.map(c => [c.id, c]));
  const overrides = load('overrides.json');
  overrides.materials = { ...overrides.materials };
  // Merchant location and boss unlocks are acquisition requirements, not the boss's own biome.
  const merchant = parseWikiTables(pages['The Bog Witch'].wikitext).find(t => t.headers.some(h => cleanText(h) === 'Availability'));
  const trade = new Map();
  for (const row of merchant?.rows ?? []) {
    const title = parseLinks(row[0])[0];
    const bossName = parseLinks(row[3] ?? '').find(name => creatures.some(c => c.name.toLowerCase() === name.toLowerCase() && c.kind === 'boss'));
    const boss = creatures.find(c => c.name.toLowerCase() === bossName?.toLowerCase());
    const bossBiome = BIOMES.findIndex(b => boss?.biomes.includes(b.id));
    const biome = BIOMES[Math.max(BIOMES.findIndex(b => b.id === 'swamp'), bossBiome >= 0 ? Math.min(bossBiome + 1, BIOMES.length - 1) : 0)];
    if (title) trade.set(slug(title), { biome: biome.id, tier: biome.order, ...(boss ? { boss: boss.id } : {}) });
  }
  for (const [title, page] of Object.entries(pages)) {
    const name = canonicalTitle(title);
    const box = parseTemplates(page.wikitext ?? '', 'infobox item').find(b => slug(cleanText(b.title ?? page.title)) === slug(name));
    const bought = trade.get(slug(name));
    if (bought) overrides.materials[name] = { biome: bought.biome, tier: bought.tier };
    else if (box && !parseMaterialList(box.materials).length) {
      const lead = (page.wikitext ?? '').split(/\n==/)[0];
      const biome = parseLinks(lead).map(link => BIOMES.find(b => b.title.toLowerCase() === link.toLowerCase())).find(Boolean);
      if (biome) overrides.materials[name] = { biome: biome.id, tier: biome.order };
    }
  }
  // Raw fish can be obtained from stranded Meadows fish without a station.
  overrides.materials['Raw Fish'] = { biome: 'meadows', tier: 1 };
  const resolve = createMaterialResolver({ overrides, creatures, allPages: pages, parseRecipe: parseMaterialList });
  const newItems = [];
  for (const title of [...dependencies].sort()) {
    const page = pages[title];
    const name = canonicalTitle(title);
    const id = slug(name);
    if (byId.has(id)) continue;
    const boxes = parseTemplates(page?.wikitext ?? '', 'infobox item');
    const box = selectBox(title, page);
    const sources = parseSources(box.source, creaturesBySlug).map(s => ({ ...s, ...(stationId(s.text) !== 'none' ? { kind: 'station' } : {}) }));
    const conversion = parseConversionRecipe(page?.wikitext, name, sources);
    const materials = box.materials ? mats(box.materials) : conversion?.materials.map(m => ({ item: slug(m.name), amount: m.amount })) ?? [];
    for (const m of materials) m.item = canonical.get(m.item) ?? m.item;
    const tier = resolve(name);
    const item = { id, name, provisions: true, image: `../provisions/img/items/${id}.png`, biome: tier.biome, tier: tier.tier, sources,
      recipe: materials.length ? { station: cleanText(box.source ?? conversion?.station ?? '').replace(/\s*\(level.*$/i, '') || null, materials, yields: number(box.quantity, conversion?.yields ?? 1) } : null,
      wiki: wiki(title), ...(trade.has(id) ? { unlock: trade.get(id) } : {}) };
    newItems.push(item); byId.set(id, item);
    imageFiles.set(id, cleanText(box.image ?? `${name}.png`));
  }
  // Crafted products always inherit the maximum ingredient tier, not incidental prose links.
  for (const item of newItems) if (item.recipe) { item.biome = null; item.tier = null; }
  resolveRecipeBiomes([...oldItems, ...newItems]);
  for (const entity of [...food, ...meads]) {
    const materials = entity.base?.materials ?? entity.materials ?? [];
    for (const m of materials) m.item = canonical.get(m.item) ?? m.item;
    const resolved = materials.map(m => byId.get(m.item)).filter(Boolean);
    const highest = resolved.filter(m => m.tier != null).sort((a, b) => b.tier - a.tier)[0];
    const raw = byId.get(entity.id) ?? resolve(entity.name);
    entity.tier = highest?.tier ?? raw?.tier ?? null;
    entity.biome = highest?.biome ?? raw?.biome ?? null;
  }
  await addLocalizedNames([...food, ...meads, ...newItems]);
  // Image queries are identical on cached runs; downloads skip existing files.
  const images = [...food, ...meads, ...newItems];
  const files = [...new Set(images.map(e => imageFiles.get(e.id) ?? `${e.name}.png`))];
  const urls = await api.getImageUrls(files, 128);
  const fallbackFiles = images.filter(e => !urls[imageFiles.get(e.id)]).map(e => `${e.name}.png`);
  const fallbacks = await api.getImageUrls([...new Set(fallbackFiles)], 128);
  for (const entity of images) {
    const relative = entity.image.replace('../provisions/', '');
    const url = urls[imageFiles.get(entity.id) ?? `${entity.name}.png`] ?? fallbacks[`${entity.name}.png`];
    if (url) await api.download(url, path.join(ROOT, 'apps/provisions', relative));
    else entity.image = null;
  }
  for (const [name, records] of [['food', food], ['meads', meads], ['stations', stations], ['items', [...oldItems, ...newItems].sort(sortNames)]]) save(`data/${name}.json`, JSON.stringify(records, null, 2) + '\n');
  save('data/report-provisions.md', renderReport(food, meads, excluded));
  console.log(`Saved ${food.length} foods (${food.filter(f => f.isFeast).length} feasts), ${meads.length} meads, ${newItems.length} new items.`);
  return { food, meads, stations };
}
function renderReport(food, meads, excluded) {
  const missing = list => list.length ? list.map(e => e.name).join(', ') : 'None';
  const lines = ['# Provisions data report', '', 'Source: https://valheim.weirdgloop.org (cached MediaWiki API).', '', `Foods: ${food.length}; feasts: ${food.filter(f => f.isFeast).length}; meads: ${meads.length}.`, '', '| Biome | Food (excluding feasts) | Meads | Feasts |', '|---|---:|---:|---:|'];
  for (const b of [...BIOMES, { id: null }]) lines.push(`| ${b.id ?? 'unresolved'} | ${food.filter(f => f.biome === b.id && !f.isFeast).length} | ${meads.filter(m => m.biome === b.id).length} | ${food.filter(f => f.biome === b.id && f.isFeast).length} |`);
  lines.push('', '## Missing data', '', `- Foods without a crafting station (raw foods are intentional): ${missing(food.filter(f => f.station === 'none'))}.`, `- Foods without tier: ${missing(food.filter(f => f.tier == null))}.`, `- Meads without a base recipe: ${missing(meads.filter(m => !m.base?.materials.length))}.`, `- Missing images: ${missing([...food, ...meads].filter(e => !e.image))}.`, '', '## Open questions', '', '- Current wiki uses Mead Ketill (level 1), not Cauldron, for mead bases. Food Preparation Table is required for feasts. These station IDs extend the original station enum to preserve source accuracy.', '- Healing tick interval is null unless explicitly documented; hp/tick is preserved without inventing an interval.', '- Love Potion is purchased from Bog Witch in batches of five and has no fermentable base.',
    '- Blue mushroom is console-only and has no biome. Existing Smithy item tiers are preserved verbatim; Anglerfish is currently Ashlands-tier in that catalog and consequently Fish n Bread inherits that tier.', '- Feast biome follows the highest ingredient tier, including purchased herbs, rather than the biome theme. Cauldron levels describe a progression sequence; nearby upgrades each add one level and can be built in a different order.', `- Food category pages without an edible Food/Feast infobox are excluded: ${excluded.join(', ')}.`, '');
  return lines.join('\n');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await fetchProvisions();
