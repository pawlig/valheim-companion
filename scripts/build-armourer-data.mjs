// Builds apps/smithy/data/data.js from data/*.json for the Smithy frontend.
// Follows docs/DATA-SCHEMA.md § apps/smithy/data/data.js.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { aliasImage } from './image-index.mjs';
import { generatedAt } from './lib/generated-at.mjs';
import { buildTraderIndex, withTraders } from './trader-index.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = path.join(REPO_ROOT, 'data');
const ARMOURER_DATA_DIR = path.join(REPO_ROOT, 'apps', 'smithy', 'data');

export function hasCraftingCost(item) {
  return (item.levels ?? []).some(level => (level.materials ?? []).length > 0);
}

export function filterSmithyArmor(armor) {
  return armor.map(entry => {
    // These entries already live in Cosmetics or DLC & seasonal, not the crafting catalog.
    if (entry.kind === 'cosmetic' || entry.kind === 'special' || !entry.biome) return entry;
    return { ...entry, pieces: entry.pieces.filter(hasCraftingCost) };
  }).filter(entry => entry.pieces.length > 0);
}

export function buildArmourerBundle() {
  const biomesPath = path.join(DATA_DIR, 'biomes.json');
  const armorPath = path.join(DATA_DIR, 'armor.json');
  const itemsPath = path.join(DATA_DIR, 'items.json');

  if (!existsSync(biomesPath)) throw new Error('Missing data/biomes.json');
  if (!existsSync(armorPath)) throw new Error('Missing data/armor.json');
  if (!existsSync(itemsPath)) throw new Error('Missing data/items.json');

  // Biome images live in the Bestiary; point to them from /smithy/.
  const biomes = JSON.parse(readFileSync(biomesPath, 'utf8')).map((b) => ({
    ...b,
    image: b.image ? `../bestiary/${b.image}` : null,
  }));
  const traderIndex = buildTraderIndex(path.join(DATA_DIR, 'traders.json'));
  const armor = filterSmithyArmor(JSON.parse(readFileSync(armorPath, 'utf8')))
    .map(entry => ({ ...entry, pieces: entry.pieces.map(piece => withTraders(piece, traderIndex)) }));
  const itemsList = JSON.parse(readFileSync(itemsPath, 'utf8')).filter(item => !item.comfort);

  const items = {};
  for (const item of itemsList) {
    items[item.id] = withTraders(item.image ? { ...item, image: aliasImage(item.image) } : item, traderIndex);
  }

  const stationsPath = path.join(DATA_DIR, 'stations.json');
  const stations = existsSync(stationsPath) ? JSON.parse(readFileSync(stationsPath, 'utf8')).filter(station => station.type !== 'comfort') : [];

  const weaponsPath = path.join(DATA_DIR, 'weapons.json');
  const weapons = existsSync(weaponsPath)
    ? JSON.parse(readFileSync(weaponsPath, 'utf8')).filter(hasCraftingCost).map((w) => ({
        ...w,
        image: w.image ? `../bestiary/${w.image}` : null,
      }))
    : [];

  // Validate that every material in armor and weapons exists in items
  const missingItems = new Set();
  for (const entry of armor) {
    for (const piece of entry.pieces ?? []) {
      for (const level of piece.levels ?? []) {
        for (const mat of level.materials ?? []) {
          if (!items[mat.item]) {
            missingItems.add(mat.item);
          }
        }
      }
    }
  }
  for (const w of weapons) {
    for (const level of w.levels ?? []) {
      for (const mat of level.materials ?? []) {
        if (!items[mat.item]) {
          missingItems.add(mat.item);
        }
      }
    }
  }

  if (missingItems.size > 0) {
    console.warn(`warning: ${missingItems.size} referenced materials missing from items.json:`, [...missingItems]);
  }

  const generatedAtValue = generatedAt(armorPath, path.join(ARMOURER_DATA_DIR, 'data.js'));

  return {
    generatedAt: generatedAtValue,
    source: {
      name: 'Valheim Wiki',
      url: 'https://valheim.weirdgloop.org',
      license: 'CC BY-SA 4.0',
    },
    biomes,
    armor,
    weapons,
    stations,
    items,
    creatures: Object.fromEntries(JSON.parse(readFileSync(path.join(DATA_DIR, 'creatures.json'), 'utf8')).map(creature => [creature.id, creature])),
  };
}

export function main() {
  console.log('building apps/smithy/data/data.js…');
  const bundle = buildArmourerBundle();
  mkdirSync(ARMOURER_DATA_DIR, { recursive: true });
  const outputPath = path.join(ARMOURER_DATA_DIR, 'data.js');
  const content = `window.VA_DATA = ${JSON.stringify(bundle, null, 2)};\n`;
  if (!existsSync(outputPath) || readFileSync(outputPath, 'utf8') !== content) {
    writeFileSync(outputPath, content, 'utf8');
  }
  const groups = {
    creatures: Object.values(bundle.creatures),
    weapons: JSON.parse(readFileSync(path.join(DATA_DIR, 'weapons.json'), 'utf8')),
    items: Object.values(bundle.items),
    armor: JSON.parse(readFileSync(path.join(DATA_DIR, 'armor.json'), 'utf8')).flatMap(entry => entry.pieces),
    sets: JSON.parse(readFileSync(path.join(DATA_DIR, 'armor.json'), 'utf8')),
    biomes: bundle.biomes,
    stations: bundle.stations,
  };
  const coverage = {};
  for (const lang of ['cs', 'de', 'es', 'fr', 'pt', 'zh', 'hi', 'ar', 'bn', 'ru', 'ja', 'id']) {
    coverage[lang] = {};
    for (const [group, entities] of Object.entries(groups)) {
      const count = entities.filter(entity => entity.names?.[lang]).length;
      coverage[lang][group] = { count, total: entities.length, percent: +(100 * count / entities.length).toFixed(1) };
    }
  }
  const reportPath = path.join(DATA_DIR, 'report-names.json');
  const report = JSON.stringify(coverage, null, 2) + '\n';
  if (!existsSync(reportPath) || readFileSync(reportPath, 'utf8') !== report) writeFileSync(reportPath, report);
  console.log(`done: built apps/smithy/data/data.js (${(content.length / 1024).toFixed(1)} kB)`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    main();
  } catch (err) {
    console.error('Fatal error in build-armourer-data:', err.message);
    process.exit(1);
  }
}
