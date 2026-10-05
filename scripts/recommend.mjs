// Calculates deterministic weapon recommendations per biome and creature
// following docs/ANALYZA.md § 4, § 5, § 9 and docs/DATA-SCHEMA.md.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

await import('../apps/bestiary/assets/rank.js');

const {
  DAMAGE_TYPES,
  COMBAT_DAMAGE_TYPES,
  MOD_TIERS,
  MELEE_CATEGORIES,
  SKILLS,
  DIFFICULTY,
  SET_BONUSES,
  DEFAULT_PLAYER,
  skillFactor,
  effectiveSkill,
  weaponDamage,
  effectiveModifiers,
  buildNotes,
  rawDamage,
  score,
  rangedScore,
  perHit,
  creatureHp,
  recommend,
  capitalize,
} = globalThis.VCRank;

export {
  DAMAGE_TYPES,
  COMBAT_DAMAGE_TYPES,
  MOD_TIERS,
  MELEE_CATEGORIES,
  SKILLS,
  DIFFICULTY,
  SET_BONUSES,
  DEFAULT_PLAYER,
  skillFactor,
  effectiveSkill,
  weaponDamage,
  effectiveModifiers,
  buildNotes,
  rawDamage,
  score,
  rangedScore,
  perHit,
  creatureHp,
  recommend,
  recommend as recommendFor,
  capitalize,
};

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = path.join(REPO_ROOT, 'data');
const byCodepoint = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

export async function main() {
  const biomes = JSON.parse(readFileSync(path.join(DATA_DIR, 'biomes.json'), 'utf8'));
  const creatures = JSON.parse(readFileSync(path.join(DATA_DIR, 'creatures.json'), 'utf8'));
  const weapons = JSON.parse(readFileSync(path.join(DATA_DIR, 'weapons.json'), 'utf8'));

  const creatureById = new Map(creatures.map((c) => [c.id, c]));
  const recommendations = {};

  for (const biome of biomes) {
    const allCreatureIds = new Set();
    for (const list of Object.values(biome.creatures ?? {})) {
      if (Array.isArray(list)) {
        for (const id of list) allCreatureIds.add(id);
      }
    }
    const sortedCreatureIds = [...allCreatureIds].sort(byCodepoint);

    for (const cId of sortedCreatureIds) {
      const creature = creatureById.get(cId);
      if (!creature) {
        console.warn(`warning: creature ${cId} in biome ${biome.id} not found in creatures.json`);
        continue;
      }
      const key = `${biome.id}:${cId}`;
      recommendations[key] = recommend(creature, biome, weapons, DEFAULT_PLAYER);
    }
  }

  mkdirSync(DATA_DIR, { recursive: true });
  const dest = path.join(DATA_DIR, 'recommendations.json');
  const content = `${JSON.stringify(recommendations, null, 2)}\n`;
  if (!existsSync(dest) || readFileSync(dest, 'utf8') !== content) {
    writeFileSync(dest, content);
  }
  console.log(`done: computed recommendations for ${Object.keys(recommendations).length} pairs`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((err) => {
    console.error('Fatal error in recommend.mjs:', err);
    process.exit(1);
  });
}
