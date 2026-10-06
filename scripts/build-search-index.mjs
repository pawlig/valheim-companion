// Builds the cross-section search index for Valheim Companion Hub.
// Generates apps/hub/data/search.js (globalThis.VC_SEARCH_INDEX).
// Covers creatures, weapons, armor (sets & pieces), materials, and prepared provisions.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = path.join(REPO_ROOT, 'data');
const HUB_DATA_DIR = path.join(REPO_ROOT, 'apps', 'hub', 'data');
const SEARCH_JS_PATH = path.join(HUB_DATA_DIR, 'search.js');

/**
 * Filter names object: drop empty strings or values matching English name to save index size.
 * @param {Record<string, string>|null|undefined} names
 * @param {string} englishName
 * @returns {Record<string, string>}
 */
function cleanNames(names, englishName) {
  if (!names || typeof names !== 'object') return {};
  const out = {};
  for (const [lang, val] of Object.entries(names)) {
    if (val && typeof val === 'string' && val.trim() && val.trim() !== englishName) {
      out[lang] = val.trim();
    }
  }
  return out;
}

export function buildSearchIndex() {
  console.log('building cross-section search index…');

  const biomesPath = path.join(DATA_DIR, 'biomes.json');
  const biomes = existsSync(biomesPath) ? JSON.parse(readFileSync(biomesPath, 'utf8')) : [];
  const biomeOrder = Object.fromEntries(biomes.map(b => [b.id, b.order]));

  function getEarliestBiome(biomesList) {
    if (!biomesList || !Array.isArray(biomesList) || biomesList.length === 0) {
      return { biome: null, order: 99 };
    }
    let bestBiome = null;
    let bestOrder = 99;
    for (const b of biomesList) {
      const o = biomeOrder[b] ?? 99;
      if (o < bestOrder) {
        bestOrder = o;
        bestBiome = b;
      }
    }
    return { biome: bestBiome, order: bestOrder };
  }

  const index = [];

  // 1. Creatures (/bestiary/#c=<id>)
  const creaturesPath = path.join(DATA_DIR, 'creatures.json');
  if (existsSync(creaturesPath)) {
    const rawCreatures = JSON.parse(readFileSync(creaturesPath, 'utf8'));
    const creaturesList = Array.isArray(rawCreatures) ? rawCreatures : Object.values(rawCreatures);
    for (const c of creaturesList) {
      if (!c || !c.id || !c.name) continue;
      const { biome, order } = getEarliestBiome(c.biomes);
      const img = c.stars?.[0]?.image
        ? `/bestiary/${c.stars[0].image}`
        : (c.image ? `/bestiary/img/creatures/${c.image}` : null);

      index.push({
        type: 'creature',
        name: c.name,
        names: cleanNames(c.names, c.name),
        biome,
        order,
        url: `/bestiary/#c=${encodeURIComponent(c.id)}`,
        image: img,
      });
    }
  }

  // 2. Weapons (/armourer/#item=<id>)
  const weaponsPath = path.join(DATA_DIR, 'weapons.json');
  if (existsSync(weaponsPath)) {
    const rawWeapons = JSON.parse(readFileSync(weaponsPath, 'utf8'));
    const weaponsList = Array.isArray(rawWeapons) ? rawWeapons : Object.values(rawWeapons);
    for (const w of weaponsList) {
      if (!w || !w.id || !w.name) continue;
      const b = w.biome || null;
      const o = b ? (biomeOrder[b] || 99) : 99;
      const img = w.image ? `/bestiary/${w.image}` : null;

      index.push({
        type: 'weapon',
        name: w.name,
        names: cleanNames(w.names, w.name),
        biome: b,
        order: o,
        url: `/armourer/#item=${encodeURIComponent(w.id)}`,
        image: img,
      });
    }
  }

  // 3. Armor Sets & Pieces (/armourer/#set=<id> and /armourer/#item=<id>)
  const armorPath = path.join(DATA_DIR, 'armor.json');
  if (existsSync(armorPath)) {
    const armorSets = JSON.parse(readFileSync(armorPath, 'utf8'));
    for (const a of armorSets) {
      if (!a || !a.id || !a.name) continue;
      const b = a.biome || null;
      const o = b ? (biomeOrder[b] || 99) : 99;
      const pieceWithImg = a.pieces?.find(p => p.slot === 'chest' && p.image) || a.pieces?.find(p => p.image);
      const setImg = pieceWithImg?.image ? `/armourer/${pieceWithImg.image}` : null;

      index.push({
        type: 'armor',
        name: a.name,
        names: cleanNames(a.names, a.name),
        biome: b,
        order: o,
        url: `/armourer/#set=${encodeURIComponent(a.id)}`,
        image: setImg,
      });

      for (const p of (a.pieces || [])) {
        if (!p || !p.id || !p.name) continue;
        const pb = p.biome || b;
        const po = pb ? (biomeOrder[pb] || 99) : 99;
        const pImg = p.image ? `/armourer/${p.image}` : null;

        index.push({
          type: 'armor',
          name: p.name,
          names: cleanNames(p.names, p.name),
          biome: pb,
          order: po,
          url: `/armourer/#item=${encodeURIComponent(p.id)}`,
          image: pImg,
        });
      }
    }
  }

  // 4. Materials / items (/armourer/#item=<id>)
  const itemsPath = path.join(DATA_DIR, 'items.json');
  if (existsSync(itemsPath)) {
    const rawItems = JSON.parse(readFileSync(itemsPath, 'utf8'));
    const itemsList = Array.isArray(rawItems) ? rawItems : Object.values(rawItems);
    for (const it of itemsList) {
      if (!it || !it.id || !it.name) continue;
      const b = it.biome || null;
      const o = b ? (biomeOrder[b] || 99) : 99;
      const itImg = it.image ? `/armourer/${it.image}` : null;

      index.push({
        type: 'material',
        name: it.name,
        names: cleanNames(it.names, it.name),
        biome: b,
        order: o,
        url: `/armourer/#item=${encodeURIComponent(it.id)}`,
        image: itImg,
      });
    }
  }

  // 5. Provisions / Food (prepared place for when provisions data exists)
  const provisionsPath = path.join(DATA_DIR, 'provisions.json');
  const foodPath = path.join(DATA_DIR, 'food.json');
  const foodFilePath = existsSync(provisionsPath) ? provisionsPath : (existsSync(foodPath) ? foodPath : null);
  if (foodFilePath) {
    const rawFood = JSON.parse(readFileSync(foodFilePath, 'utf8'));
    const foodList = Array.isArray(rawFood) ? rawFood : Object.values(rawFood);
    for (const f of foodList) {
      if (!f || !f.id || !f.name) continue;
      const b = f.biome || null;
      const o = b ? (biomeOrder[b] || 99) : 99;
      const fImg = f.image ? `/provisions/${f.image}` : null;

      index.push({
        type: 'food',
        name: f.name,
        names: cleanNames(f.names, f.name),
        biome: b,
        order: o,
        url: `/provisions/#item=${encodeURIComponent(f.id)}`,
        image: fImg,
      });
    }
  }

  // Sort by progression order (order ascending), then alphabetically by English name
  index.sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return a.name.localeCompare(b.name, 'en');
  });

  mkdirSync(HUB_DATA_DIR, { recursive: true });
  const jsContent = `// Generated by scripts/build-search-index.mjs — DO NOT EDIT MANUALLY\nglobalThis.VC_SEARCH_INDEX = ${JSON.stringify(index)};\n`;
  writeFileSync(SEARCH_JS_PATH, jsContent, 'utf8');

  const byteLength = Buffer.byteLength(jsContent, 'utf8');
  console.log(`  -> wrote ${path.relative(REPO_ROOT, SEARCH_JS_PATH)} (${index.length} items, ${(byteLength / 1024).toFixed(1)} kB)`);
  return index;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  buildSearchIndex();
}
