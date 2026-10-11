// Comfort sources, recipes and verified tips from the cached MediaWiki client.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { api, addLocalizedNames } from './api.mjs';
import { cleanText, parseTemplates, parseMaterialList, parseWikiTables, parseLinks, slug } from './wikitext.mjs';
import { createMaterialResolver } from './materials.mjs';
import { parseSources, parseConversionRecipe, resolveRecipeBiomes } from './items.mjs';
import { BIOMES } from './biomes.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const load = name => JSON.parse(readFileSync(path.join(ROOT, 'data', name), 'utf8'));
const wiki = title => `https://valheim.weirdgloop.org/w/${encodeURIComponent(title.replaceAll(' ', '_'))}`;
const sort = (a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
const seasonal = new Set(['maypole', 'yule-tree', 'mistletoe', 'yule-garland', 'yule-wreath', 'jack-o-turnip']);
const number = value => Number(cleanText(value ?? '').match(/\d+(?:\.\d+)?/)?.[0]) || null;
const materials = value => parseMaterialList(value).map(m => ({ item: slug(m.name), amount: m.amount }));
function save(relative, content) {
  const dest = path.join(ROOT, relative);
  mkdirSync(path.dirname(dest), { recursive: true });
  if (!existsSync(dest) || readFileSync(dest, 'utf8') !== content) writeFileSync(dest, content);
}

export function parseComfort(wt) {
  const tables = parseWikiTables(wt);
  const table = tables.find(t => t.headers.some(h => cleanText(h) === 'Category'));
  if (!table) throw new Error('Missing List of comfort sources');
  const categories = [], pieces = [];
  let category = null, notes = '';
  for (const row of table.rows) {
    const itemCell = row.findIndex(cell => /\{\{\s*item link\|/i.test(cell));
    if (itemCell < 0) continue; // Base Comfort is a rule, never a furniture item.
    if (itemCell > 0) {
      category = cleanText(row[0]).trim() || null;
      notes = cleanText(row[itemCell + 2] ?? '').trim();
      if (category && !categories.some(c => c.name === category)) categories.push({ id: slug(category), name: category, notes });
    }
    const comfort = number(row[itemCell + 1]);
    if (!comfort) throw new Error('Missing comfort value');
    for (const match of row[itemCell].matchAll(/\{\{\s*item link\|([^|}]+)/gi)) {
      const name = match[1].trim();
      pieces.push({ id: slug(name), name, category: category ? slug(category) : null, comfort });
    }
  }
  const maxTable = tables.find(t => t.headers.some(h => cleanText(h) === 'Max comfort level'));
  const wikiMaxByBiome = Object.fromEntries((maxTable?.rows ?? []).map(row => [slug(cleanText(row[0])), number(row[1])]));
  // Wiki omits Ocean; its progression shares Black Forest's comfort sources.
  if (wikiMaxByBiome['black-forest']) wikiMaxByBiome.ocean = wikiMaxByBiome['black-forest'];
  return { categories, pieces, wikiMaxByBiome };
}

// Some individual URLs redirect to group tables; some tabbers contain unclosed
// infoboxes. Parse each tab independently and use the documented group recipe.
export function parseStructure(title, wt, stoneTitles = []) {
  const boxes = String(wt ?? '').split(/\n\|-\|\n/).flatMap(part => parseTemplates(part, 'infobox structure'));
  let box = boxes.find(b => slug(cleanText(b.title)) === slug(title)) ?? (boxes.length === 1 ? boxes[0] : null);
  const group = parseWikiTables(String(wt ?? '').replace(/^\|\|/gm, '|')).find(t => t.headers.some(h => cleanText(h) === 'Materials') && t.rows.some(r => slug(r[0].match(/\{\{\s*item link\|([^|}]+)/i)?.[1]) === slug(title)));
  const row = group?.rows.find(r => slug(r[0].match(/\{\{\s*item link\|([^|}]+)/i)?.[1]) === slug(title));
  if (!box && row) {
    const idIndex = group.headers.findIndex(h => cleanText(h) === 'Internal id');
    const comfortIndex = group.headers.findIndex(h => cleanText(h) === 'Comfort');
    box = { materials: row[1], id: row[idIndex], comfort: row[comfortIndex], image: `${title}.png`, source: stoneTitles.includes(title) ? '[[Stonecutter]]' : '[[Workbench]]' };
  }
  if (!box) return { materials: [], station: null, imageFile: `${title}.png`, gameId: null, infoboxComfort: null, recipeSource: 'missing' };
  let rawMaterials = box.materials;
  let gameId = cleanText(box.id ?? '') || null;
  if (/^(Small|Medium|Large) green pot$/i.test(title)) {
    const size = title.split(' ')[0].toLowerCase();
    const index = ['small', 'medium', 'large'].indexOf(size);
    const quantities = [...(rawMaterials?.matchAll(/x(\d+)/g) ?? [])].map(m => Number(m[1]));
    rawMaterials = rawMaterials?.replace(/x\d+, x\d+, x\d+/, `x${quantities[index]}`);
    gameId = box.id?.match(new RegExp(`(\\w+) \\(${size}\\)`))?.[1] ?? null;
  }
  const imageFile = /^\{\{InfoboxGallery/i.test(box.image ?? '') ? `${title}.png` : cleanText((box.image ?? `${title}.png`).replaceAll('{{PAGENAME}}', title));
  const source = parseLinks(box.source ?? '')[0];
  return { materials: materials(rawMaterials), station: source && source !== 'Crafting' ? slug(source) : null,
    imageFile, gameId, infoboxComfort: number(box.comfort), recipeSource: row && !boxes.length ? 'group table' : 'infobox' };
}

export function maximumByBiome(data) {
  return Object.fromEntries(BIOMES.map(b => {
    const categories = new Map();
    let extra = 0;
    for (const p of data.pieces.filter(p => !p.seasonal && p.tier != null && p.tier <= b.order)) {
      if (p.category) categories.set(p.category, Math.max(categories.get(p.category) ?? 0, p.comfort));
      else extra += p.comfort;
    }
    return [b.id, data.rules.base + data.rules.shelter + extra + [...categories.values()].reduce((a, n) => a + n, 0)];
  }));
}

export async function fetchComfort() {
  const pages = await api.getWikitext(['Comfort', 'Resting', 'Rested', 'Hot Tub', 'Stonecutter']);
  const data = parseComfort(pages.Comfort.wikitext);
  const titles = data.pieces.map(p => p.name).sort();
  Object.assign(pages, await api.getWikitext(titles));
  const stoneTitles = [...pages.Stonecutter.wikitext.matchAll(/\{\{\s*item link\|([^|}]+)/gi)].map(m => m[1]);
  const details = new Map(data.pieces.map(p => [p.id, parseStructure(p.name, pages[p.name]?.wikitext, stoneTitles)]));
  const stationTitles = ['Artisan Table', 'Black Forge', 'Forge', 'Stonecutter', 'Workbench'];
  Object.assign(pages, await api.getWikitext(stationTitles));
  const stationDetails = stationTitles.map(title => ({ title: pages[title]?.title ?? title, ...parseStructure(title, pages[title]?.wikitext) }));
  const dependencies = new Set();
  for (const d of [...details.values(), ...stationDetails]) for (const m of d.materials) dependencies.add(m.item.replaceAll('-', ' '));
  const visited = new Set();
  while (true) {
    const batch = [...dependencies].filter(t => !visited.has(t)).sort();
    if (!batch.length) break;
    batch.forEach(t => visited.add(t));
    Object.assign(pages, await api.getWikitext(batch));
    for (const title of batch) {
      const box = parseTemplates(pages[title]?.wikitext ?? '', 'infobox item')[0] ?? parseTemplates(pages[title]?.wikitext ?? '', 'infobox weapon')[0] ?? {};
      for (const m of parseMaterialList(box.materials ?? box['materials 1'])) dependencies.add(m.name);
      // Acquisition location pages let the shared resolver infer their biome.
      for (const link of parseLinks(box.source ?? '')) if (/Tree|Pot|Hildir/i.test(link) && !pages[link]) dependencies.add(link);
    }
    if (visited.size > 500) throw new Error('Comfort dependency graph exceeds safety limit');
  }
  for (const page of Object.values(pages)) if (!pages[page.title]) pages[page.title] = page;
  const originalItems = load('items.json');
  const overrides = load('overrides.json');
  const comfortOverrides = overrides.comfort ?? { materials: {} };
  const localMaterials = Object.fromEntries(originalItems.filter(i => i.tier != null).map(i => [i.name, { tier: i.tier, biome: i.biome }]));
  const resolver = createMaterialResolver({ overrides: { materials: { ...localMaterials, ...comfortOverrides.materials } }, creatures: load('creatures.json'), allPages: pages });
  const creaturesBySlug = new Map(load('creatures.json').map(c => [c.id, c]));
  const byId = new Map(originalItems.map(i => [i.id, i]));
  const additions = [], comfortItems = [];
  for (const title of [...dependencies].sort()) {
    const page = pages[title];
    const name = page?.title ?? title;
    const id = slug(name);
    if (byId.has(id) && !byId.get(id).comfort) continue;
    const wt = page?.wikitext ?? '';
    const box = parseTemplates(wt, 'infobox item')[0] ?? parseTemplates(wt, 'infobox weapon')[0];
    if (!box) continue; // Acquisition-location pages are not materials.
    const sources = parseSources(box.source, creaturesBySlug);
    const conversion = parseConversionRecipe(wt, name, sources);
    const recipeMaterials = materials(box.materials ?? box['materials 1']);
    if (!recipeMaterials.length && conversion) recipeMaterials.push(...conversion.materials.map(m => ({ item: slug(m.name), amount: m.amount })));
    const resolved = resolver(name);
    const item = { id, name, comfort: true, names: {}, image: `../comfort/img/items/${id}.png`, biome: resolved.biome, tier: resolved.tier, sources,
      recipe: recipeMaterials.length ? { station: cleanText(box.source ?? conversion?.station ?? '').replace(/\s*\(level.*$/i, '') || null, materials: recipeMaterials, yields: number(box.quantity) ?? conversion?.yields ?? 1 } : null,
      teleportable: !/^no$/i.test(cleanText(box.teleport ?? '')), wiki: wiki(name) };
    if (!byId.has(id)) additions.push(item);
    comfortItems.push(item); byId.set(id, item);
    details.set('material:' + id, { imageFile: cleanText(box.image ?? `${name}.png`) });
  }
  // Only new records are resolved; existing records are immutable.
  const combined = [...originalItems.filter(i => !i.comfort).map(i => structuredClone(i)), ...comfortItems];
  resolveRecipeBiomes(combined);
  const canonical = new Map(Object.entries(pages).map(([title, page]) => [slug(title), byId.has(slug(title)) ? slug(title) : slug(page.title)]));
  for (const d of [...details.values(), ...stationDetails]) for (const m of d.materials ?? []) m.item = canonical.get(m.item) ?? m.item;
  const tiers = new Map(originalItems.map(i => [i.id, { biome: i.biome, tier: i.tier }]));
  for (const item of comfortItems) tiers.set(item.id, comfortOverrides.materials?.[item.name] ?? { biome: item.biome, tier: item.tier });
  for (const [name, override] of Object.entries(comfortOverrides.materials ?? {})) tiers.set(slug(name), override);
  function highest(mats, station = null) {
    const requirements = [...mats.map(m => tiers.get(m.item)), station ? tiers.get(station) : null].filter(Boolean);
    if (requirements.length !== mats.length + (station ? 1 : 0) || requirements.some(r => r.tier == null)) return { biome: null, tier: null };
    const best = requirements.sort((a, b) => b.tier - a.tier)[0];
    return { biome: best?.biome ?? 'meadows', tier: best?.tier ?? 1 };
  }
  // Station material tiers are obtained by the same shared material resolver.
  for (const s of stationDetails) tiers.set(slug(s.title), resolver(s.title));
  const stations = load('stations.json');
  // Crafting stations are owned by fetch-stations; Comfort only reads them.
  const discrepancies = [], fallbacks = [];
  data.pieces = data.pieces.map(p => {
    const d = details.get(p.id);
    if (d.infoboxComfort != null && d.infoboxComfort !== p.comfort) discrepancies.push(`${p.name}: infobox/group ${d.infoboxComfort}, Comfort table ${p.comfort}; table wins.`);
    if (d.recipeSource !== 'infobox') fallbacks.push(`${p.name}: ${d.recipeSource}.`);
    return { ...p, names: {}, image: `img/pieces/${p.id}.png`, materials: d.materials, station: d.station,
      ...(d.materials.length ? highest(d.materials, d.station) : { biome: null, tier: null }), seasonal: seasonal.has(p.id),
      conditions: { lit: p.category === 'fire', heated: p.id === 'hot-tub', hearthRange8m: p.id === 'hearth' }, gameId: d.gameId, wiki: wiki(p.name) };
  }).sort(sort);
  data.rules = { base: 1, shelter: 1, unshelteredCap: 1, restedBaseMinutes: 7, rangeMeters: 10,
    restedEffects: { healthRegenPercent: 50, staminaRegenPercent: 100, eitrRegenPercent: 100, xpPercent: 50 } };
  await addLocalizedNames([...data.pieces, ...comfortItems]);
  const images = [...data.pieces, ...comfortItems];
  const files = images.map(p => details.get(p.comfort === true ? 'material:' + p.id : p.id)?.imageFile ?? `${p.name}.png`);
  const urls = await api.getImageUrls([...new Set(files)].sort(), 128);
  for (let index = 0; index < images.length; index++) {
    const p = images[index], url = urls[files[index]];
    if (url) await api.download(url, path.join(ROOT, 'apps/comfort', p.image.replace('../comfort/', '')));
    else p.image = null;
  }
  const tips = verifiedTips(pages);
  const maxima = maximumByBiome(data);
  const lines = ['# Comfort data report', '', 'Source: cached MediaWiki API, https://valheim.weirdgloop.org/w/Comfort.', '', `Pieces: ${data.pieces.length}; categories: ${data.categories.length}; seasonal: ${data.pieces.filter(p => p.seasonal).length}.`, '', '## Categories', '', '| Category | Pieces |', '|---|---:|',
    ...data.categories.map(c => `| ${c.name} | ${data.pieces.filter(p => p.category === c.id).length} |`), `| No category | ${data.pieces.filter(p => !p.category).length} |`, '', '## Biomes and maximum (sheltered, no seasonal items)', '', '| Biome | Pieces unlocked here | Computed | Wiki | Difference |', '|---|---:|---:|---:|---:|',
    ...BIOMES.map(b => `| ${b.title} | ${data.pieces.filter(p => p.biome === b.id).length} | ${maxima[b.id]} | ${data.wikiMaxByBiome[b.id]} | ${maxima[b.id] - data.wikiMaxByBiome[b.id]} |`), '', '## Missing data', '',
    `- Without recipe: ${data.pieces.filter(p => !p.materials.length).map(p => p.name).join(', ') || 'None'}.`, `- Without tier: ${data.pieces.filter(p => p.tier == null).map(p => p.name).join(', ') || 'None'}.`,
    `- Missing images: ${images.filter(p => !p.image).map(p => p.name).join(', ') || 'None'}.`, '', '## Table / infobox differences', '', ...(discrepancies.length ? discrepancies.map(s => '- ' + s) : ['- None among explicit infobox values.']), '', '## Comfort-only material overrides', '',
    ...Object.entries(comfortOverrides.materials ?? {}).map(([name, v]) => `- ${name}: ${v.biome}, tier ${v.tier}. ${v.reason}`), '', '## Recipe fallbacks', '', ...fallbacks.map(s => '- ' + s), '', '## Open questions', '',
    '- Many piece URLs redirect to Chairs, Tables, Rugs or Banners, which have group recipe tables instead of individual infoboxes. Those recipes and internal IDs are retained. Workbench is the default furniture station for these group tables; Stonecutter membership is verified against its Usage list.',
    '- Carved Chair and Moose Hide Carpet appear in Comfort, but their redirected group pages omit their recipes and IDs. They remain unresolved and are excluded from recommendations; no recipe or tier was invented.',
    '- Item Stand tabbers have unclosed infoboxes and no internal IDs. Variants are parsed separately; gameId remains null.',
    '- Pots share an infobox with size-dependent costs (3/4/5 Pot Shards); no station is required. Missing comfort fields on Plants, Stands and Ashlands pieces use the authoritative Comfort table.',
    '- Hearth assumes a lit fire within eight meters by default. The planner can disable lit/heated conditions or the eight-meter bonus; general furniture placement within ten meters remains a player responsibility.',
    '- Ocean has no separate wiki maximum row and uses Black Forest. Snow Lantern is Deep North-tier because its documented recipe uses Snowballs from Ice; its durability warning is retained as a condition note.', ''];
  save('data/comfort.json', JSON.stringify(data, null, 2) + '\n');
  // Match the existing pipelines' stable ordering without editing any record.
  const sharedItems = [...originalItems, ...additions].sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
  save('data/items.json', JSON.stringify(sharedItems, null, 2) + '\n');
  save('data/comfort-tips.json', JSON.stringify(tips, null, 2) + '\n');
  save('data/report-comfort.md', lines.join('\n'));
  console.log(`Comfort: ${data.pieces.length} pieces, ${additions.length} new materials, ${stations.length} existing stations. Maxima: ${JSON.stringify(maxima)}`);
  return data;
}

function verifiedTips(pages) {
  const definitions = [
    ['range', 'Comfort', /within ten meters/i, 'Keep furniture within ten meters of your character.'],
    ['shelter', 'Comfort', /capping it at 1/i, 'Without shelter, sitting near a fire caps comfort at one.'],
    ['hearth', 'Comfort', /extra 1 comfort at a range of 8m/i, 'Hearth gives its extra comfort only within eight meters.'],
    ['fire', 'Comfort', /Only provides comfort when lit/i, 'Fires must be lit to provide comfort.'],
    ['tub', 'Hot Tub', /increases the.*Comfort.*by 2 when fueled/i, 'Hot Tub provides comfort only when fueled and heated.'],
    ['categories', 'Comfort', /only the one with the highest comfort/i, 'Only the highest comfort piece in each category counts.'],
    ['dungeon', 'Rested', /entrance hall[\s\S]*10-minute/i, 'A Campfire in a dungeon entrance can restore a ten-minute Rested effect.'],
    ['wet', 'Resting', /cannot be applied if the player is.*Wet.*unless sitting in a.*Hot Tub/i, 'Wet prevents Resting, except while sitting in a Hot Tub.'],
    ['rested', 'Resting', /7 minutes greater than the comfort level/i, 'Rested lasts seven minutes plus your comfort level.'],
    ['wait', 'Resting', /20 uninterrupted seconds/i, 'Rest for twenty uninterrupted seconds, away from hostile creatures, to gain Rested.'],
  ];
  return definitions.map(([id, title, evidence, text]) => {
    if (!evidence.test(pages[title]?.wikitext ?? '')) throw new Error(`Unverified tip: ${id}`);
    const counted = {
      range: ['Keep furniture within {count} meters of your character.', 10],
      shelter: ['Without shelter, sitting near a fire caps comfort at {count}.', 1],
      hearth: ['Hearth gives its extra comfort only within {count} meters.', 8],
      dungeon: ['A Campfire in a dungeon entrance can restore a {count}-minute Rested effect.', 10],
      rested: ['Rested lasts {count} minutes plus your comfort level.', 7],
      wait: ['Rest for {count} uninterrupted seconds, away from hostile creatures, to gain Rested.', 20],
    }[id];
    const biome = { hearth: 'swamp', tub: 'plains', wet: 'plains' }[id] ?? 'meadows';
    return { id, text: counted?.[0] ?? text, ...(counted ? { count: counted[1] } : {}), biome, source: wiki(title) };
  });
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await fetchComfort();
