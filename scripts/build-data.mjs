// Builds data/data.js from data/*.json for the frontend.
// Follows docs/DATA-SCHEMA.md lines 163-178.
//
// Validates that every weapon id referenced in recommendations exists in weapons.json,
// and every creature id in biomes.json exists in creatures.json. Exits with code 1 on mismatch.

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = path.join(REPO_ROOT, 'data');
const BESTIARY_DATA_DIR = path.join(REPO_ROOT, 'apps', 'bestiary', 'data');

const DAMAGE_TYPES = [
  'blunt',
  'slash',
  'pierce',
  'chop',
  'pickaxe',
  'fire',
  'frost',
  'lightning',
  'poison',
  'spirit',
];

const MOD_TIERS = {
  veryweak: 2,
  weak: 1.5,
  slightlyweak: 1.25,
  neutral: 1,
  slightlyresistant: 0.75,
  resistant: 0.5,
  veryresistant: 0.25,
  immune: 0,
};

export function buildDataBundle() {
  const biomesPath = path.join(DATA_DIR, 'biomes.json');
  const creaturesPath = path.join(DATA_DIR, 'creatures.json');
  const weaponsPath = path.join(DATA_DIR, 'weapons.json');
  const recommendationsPath = path.join(DATA_DIR, 'recommendations.json');

  const biomes = JSON.parse(readFileSync(biomesPath, 'utf8'));
  const creaturesList = JSON.parse(readFileSync(creaturesPath, 'utf8'));
  const weaponsList = JSON.parse(readFileSync(weaponsPath, 'utf8'));
  const recommendations = JSON.parse(readFileSync(recommendationsPath, 'utf8'));

  const creatures = {};
  for (const c of creaturesList) creatures[c.id] = c;

  const weapons = {};
  for (const w of weaponsList) weapons[w.id] = w;

  // Validation 1: verify every creature referenced in biomes exists in creatures
  const missingCreatures = [];
  for (const biome of biomes) {
    for (const [section, list] of Object.entries(biome.creatures ?? {})) {
      if (Array.isArray(list)) {
        for (const cId of list) {
          if (!creatures[cId]) {
            missingCreatures.push(`${biome.id}.${section}: ${cId}`);
          }
        }
      }
    }
  }
  if (missingCreatures.length > 0) {
    console.error('Validation error: missing creatures referenced in biomes:');
    for (const m of missingCreatures) console.error(`  - ${m}`);
    throw new Error(`Validation failed: ${missingCreatures.length} missing creatures`);
  }

  // Validation 2: verify every weapon referenced in recommendations exists in weapons
  const missingWeapons = [];
  for (const [key, rec] of Object.entries(recommendations)) {
    for (const item of rec.melee ?? []) {
      if (item.weapon && !weapons[item.weapon]) {
        missingWeapons.push(`${key}.melee: ${item.weapon}`);
      }
    }
    if (rec.bow?.weapon && !weapons[rec.bow.weapon]) {
      missingWeapons.push(`${key}.bow: ${rec.bow.weapon}`);
    }
    for (const item of rec.arrows ?? []) {
      if (item.weapon && !weapons[item.weapon]) {
        missingWeapons.push(`${key}.arrows: ${item.weapon}`);
      }
    }
    if (rec.crossbow?.weapon && !weapons[rec.crossbow.weapon]) {
      missingWeapons.push(`${key}.crossbow: ${rec.crossbow.weapon}`);
    }
    for (const item of rec.bolts ?? []) {
      if (item.weapon && !weapons[item.weapon]) {
        missingWeapons.push(`${key}.bolts: ${item.weapon}`);
      }
    }
    if (rec.magic?.weapon && !weapons[rec.magic.weapon]) {
      missingWeapons.push(`${key}.magic: ${rec.magic.weapon}`);
    }
    if (rec.bomb?.weapon && !weapons[rec.bomb.weapon]) {
      missingWeapons.push(`${key}.bomb: ${rec.bomb.weapon}`);
    }
  }
  if (missingWeapons.length > 0) {
    console.error('Validation error: missing weapons referenced in recommendations:');
    for (const m of missingWeapons) console.error(`  - ${m}`);
    throw new Error(`Validation failed: ${missingWeapons.length} missing weapons`);
  }

  // Timestamp of last fetch: use mtime of data/creatures.json or data/report.md
  let generatedAt;
  try {
    const stat = statSync(creaturesPath);
    generatedAt = stat.mtime.toISOString();
  } catch {
    generatedAt = new Date().toISOString();
  }

  // Attack profiles and weapon quality from damage calculator (VC-11)
  const attackProfilesPath = path.join(DATA_DIR, 'attack-profiles.json');
  const weaponQualityPath = path.join(DATA_DIR, 'weapon-quality.json');
  const attackProfiles = existsSync(attackProfilesPath)
    ? JSON.parse(readFileSync(attackProfilesPath, 'utf8'))
    : null;
  const weaponQuality = existsSync(weaponQualityPath)
    ? JSON.parse(readFileSync(weaponQualityPath, 'utf8'))
    : null;

  return {
    generatedAt,
    source: {
      name: 'Valheim Wiki',
      url: 'https://valheim.weirdgloop.org',
      license: 'CC BY-SA 4.0',
    },
    damageTypes: DAMAGE_TYPES,
    modTiers: MOD_TIERS,
    biomes,
    creatures,
    weapons,
    attackProfiles,
    weaponQuality,
  };
}

export function main() {
  console.log('building apps/bestiary/data/data.js…');
  const bundle = buildDataBundle();
  mkdirSync(BESTIARY_DATA_DIR, { recursive: true });
  const outputPath = path.join(BESTIARY_DATA_DIR, 'data.js');
  const content = `window.VC_DATA = ${JSON.stringify(bundle, null, 2)};\n`;
  if (!existsSync(outputPath) || readFileSync(outputPath, 'utf8') !== content) {
    writeFileSync(outputPath, content, 'utf8');
  }
  console.log(`done: built apps/bestiary/data/data.js (${(content.length / 1024).toFixed(1)} kB)`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    main();
  } catch (err) {
    console.error('Fatal error in build-data:', err.message);
    process.exit(1);
  }
}
