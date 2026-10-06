// Builds apps/armourer/data/data.js from data/*.json for the Armourer frontend.
// Follows docs/DATA-SCHEMA.md § apps/armourer/data/data.js.

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = path.join(REPO_ROOT, 'data');
const ARMOURER_DATA_DIR = path.join(REPO_ROOT, 'apps', 'armourer', 'data');

export function buildArmourerBundle() {
  const biomesPath = path.join(DATA_DIR, 'biomes.json');
  const armorPath = path.join(DATA_DIR, 'armor.json');
  const itemsPath = path.join(DATA_DIR, 'items.json');

  if (!existsSync(biomesPath)) throw new Error('Missing data/biomes.json');
  if (!existsSync(armorPath)) throw new Error('Missing data/armor.json');
  if (!existsSync(itemsPath)) throw new Error('Missing data/items.json');

  // Biome images live in the Bestiary; point to them from /armourer/.
  const biomes = JSON.parse(readFileSync(biomesPath, 'utf8')).map((b) => ({
    ...b,
    image: b.image ? `../bestiary/${b.image}` : null,
  }));
  const armor = JSON.parse(readFileSync(armorPath, 'utf8'));
  const itemsList = JSON.parse(readFileSync(itemsPath, 'utf8'));

  const items = {};
  for (const item of itemsList) {
    items[item.id] = item;
  }

  const stationsPath = path.join(DATA_DIR, 'stations.json');
  const stations = existsSync(stationsPath) ? JSON.parse(readFileSync(stationsPath, 'utf8')) : [];

  const weaponsPath = path.join(DATA_DIR, 'weapons.json');
  const weapons = existsSync(weaponsPath)
    ? JSON.parse(readFileSync(weaponsPath, 'utf8')).map((w) => ({
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

  // Timestamp of last fetch: use mtime of data/armor.json
  let generatedAt;
  try {
    const stat = statSync(armorPath);
    generatedAt = stat.mtime.toISOString();
  } catch {
    generatedAt = new Date().toISOString();
  }

  return {
    generatedAt,
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
  console.log('building apps/armourer/data/data.js…');
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
    armor: bundle.armor.flatMap(entry => entry.pieces),
    sets: bundle.armor,
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
  console.log(`done: built apps/armourer/data/data.js (${(content.length / 1024).toFixed(1)} kB)`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    main();
  } catch (err) {
    console.error('Fatal error in build-armourer-data:', err.message);
    process.exit(1);
  }
}
