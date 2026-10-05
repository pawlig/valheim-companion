// Calculates deterministic weapon recommendations per biome and creature
// following docs/ANALYZA.md § 4, § 5 and docs/DATA-SCHEMA.md.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = path.join(REPO_ROOT, 'data');

export const DAMAGE_TYPES = [
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

export const COMBAT_DAMAGE_TYPES = [
  'blunt',
  'slash',
  'pierce',
  'fire',
  'frost',
  'lightning',
  'poison',
  'spirit',
];

export const MOD_TIERS = {
  veryweak: 2,
  weak: 1.5,
  slightlyweak: 1.25,
  neutral: 1,
  slightlyresistant: 0.75,
  resistant: 0.5,
  veryresistant: 0.25,
  immune: 0,
};

const MELEE_CATEGORIES = [
  'sword',
  'axe',
  'club',
  'spear',
  'polearm',
  'knife',
  'battleaxe',
  'sledge',
  'fists',
  'pickaxe',
];

const byCodepoint = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

export function capitalize(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Effective numeric damage multipliers per ANALYZA § 4.
export function effectiveModifiers(creature) {
  const mods = {};
  for (const dt of DAMAGE_TYPES) {
    if (['spirit', 'chop', 'pickaxe'].includes(dt)) {
      mods[dt] = 0;
    } else {
      mods[dt] = 1;
    }
  }
  for (const [k, v] of Object.entries(creature?.modifiers ?? {})) {
    if (DAMAGE_TYPES.includes(k)) {
      if (typeof v === 'number') {
        mods[k] = v;
      } else if (MOD_TIERS[v] != null) {
        mods[k] = MOD_TIERS[v];
      }
    }
  }
  return mods;
}

// Effective score for direct damage: Σ (dmg[type] * mod[type]), rounded to integer.
export function score(damage, mods) {
  let s = 0;
  for (const [dt, val] of Object.entries(damage ?? {})) {
    s += (val || 0) * (mods?.[dt] ?? 1);
  }
  return Math.round(s);
}

export function rawDamage(damage, mods) {
  let r = 0;
  for (const [dt, val] of Object.entries(damage ?? {})) {
    if ((dt === 'chop' || dt === 'pickaxe') && mods && (mods[dt] ?? 0) === 0) {
      continue;
    }
    r += val || 0;
  }
  return Math.round(r);
}

// Effective score for launcher + ammo:
// (launcher.pierce + ammo.pierce) * mod.pierce + Σ (ammo/launcher elements * mod)
export function rangedScore(launcher, ammo, mods) {
  const launcherPierce = launcher?.damageMax?.pierce ?? 0;
  const ammoPierce = ammo?.damageMax?.pierce ?? 0;
  let total = (launcherPierce + ammoPierce) * (mods?.pierce ?? 1);

  for (const dt of DAMAGE_TYPES) {
    if (dt === 'pierce') continue;
    const aVal = ammo?.damageMax?.[dt] ?? 0;
    const lVal = launcher?.damageMax?.[dt] ?? 0;
    total += (aVal + lVal) * (mods?.[dt] ?? 1);
  }
  return Math.round(total);
}

export function rangedRaw(launcher, ammo, mods) {
  const launcherPierce = launcher?.damageMax?.pierce ?? 0;
  const ammoPierce = ammo?.damageMax?.pierce ?? 0;
  let total = launcherPierce + ammoPierce;

  for (const dt of DAMAGE_TYPES) {
    if (dt === 'pierce') continue;
    if ((dt === 'chop' || dt === 'pickaxe') && mods && (mods[dt] ?? 0) === 0) {
      continue;
    }
    total += (ammo?.damageMax?.[dt] ?? 0) + (launcher?.damageMax?.[dt] ?? 0);
  }
  return Math.round(total);
}

export function buildNotes(damage, mods) {
  const notes = [];
  for (const [dt, val] of Object.entries(damage ?? {})) {
    if ((dt === 'chop' || dt === 'pickaxe') && (mods?.[dt] ?? 0) === 0) {
      continue;
    }
    if (val > 0 && mods?.[dt] != null && mods[dt] !== 1) {
      notes.push({ mult: mods[dt], text: `\u00d7${mods[dt]} ${capitalize(dt)}` });
    }
  }
  notes.sort((a, b) => b.mult - a.mult || byCodepoint(a.text, b.text));
  return notes.map((n) => n.text);
}

export function buildCombinedRangedDamage(launcher, ammo) {
  const combined = { pierce: (launcher?.damageMax?.pierce ?? 0) + (ammo?.damageMax?.pierce ?? 0) };
  for (const dt of DAMAGE_TYPES) {
    if (dt === 'pierce') continue;
    const val = (ammo?.damageMax?.[dt] ?? 0) + (launcher?.damageMax?.[dt] ?? 0);
    if (val > 0) combined[dt] = val;
  }
  return combined;
}

// Recommends weapons for one (creature, biome) pair according to DATA-SCHEMA.
export function recommendFor(creature, biome, weapons) {
  const gearTier = biome.gearTier;
  const mods = effectiveModifiers(creature);

  // Eligible weapons: tier <= biome.gearTier and tier != null
  const candidates = weapons.filter((w) => w.tier != null && w.tier <= gearTier);

  // 1. Melee: top 3 from distinct categories
  const meleeCandidates = candidates.filter((w) => {
    if (!MELEE_CATEGORIES.includes(w.category)) return false;
    if (w.category === 'pickaxe' && (mods.pickaxe ?? 0) <= 0) return false;
    return true;
  });

  const scoredMelee = meleeCandidates.map((w) => {
    const s = score(w.damageMax, mods);
    const r = rawDamage(w.damageMax, mods);
    const notes = buildNotes(w.damageMax, mods);
    return { weapon: w.id, name: w.name, category: w.category, tier: w.tier, score: s, raw: r, notes };
  });

  scoredMelee.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.tier !== b.tier) return a.tier - b.tier;
    return byCodepoint(a.name, b.name);
  });

  const melee = [];
  const usedCats = new Set();
  for (const m of scoredMelee) {
    if (!usedCats.has(m.category)) {
      usedCats.add(m.category);
      melee.push({ weapon: m.weapon, score: m.score, raw: m.raw, notes: m.notes });
      if (melee.length === 3) break;
    }
  }

  // 2. Bow + top 3 arrows
  const bows = candidates.filter((w) => w.category === 'bow');
  let bowObj = null;
  let arrowList = [];
  if (bows.length > 0) {
    const scoredBows = bows.map((b) => {
      const bowPierce = b.damageMax?.pierce ?? 0;
      const s = Math.round(bowPierce * (mods.pierce ?? 1));
      return { weapon: b.id, name: b.name, tier: b.tier, score: s, rawWeapon: b };
    });
    scoredBows.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.tier !== b.tier) return a.tier - b.tier;
      return byCodepoint(a.name, b.name);
    });
    const bestBow = scoredBows[0];
    bowObj = { weapon: bestBow.weapon, score: bestBow.score };

    const arrows = candidates.filter((w) => w.category === 'arrow');
    const scoredArrows = arrows.map((a) => {
      const s = rangedScore(bestBow.rawWeapon, a, mods);
      const combinedDmg = buildCombinedRangedDamage(bestBow.rawWeapon, a);
      const r = rawDamage(combinedDmg, mods);
      const notes = buildNotes(combinedDmg, mods);
      return { weapon: a.id, name: a.name, tier: a.tier, score: s, raw: r, notes };
    });
    scoredArrows.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.tier !== b.tier) return a.tier - b.tier;
      return byCodepoint(a.name, b.name);
    });
    const effectiveArrows = scoredArrows.filter((a) => a.score >= 0.5 * a.raw);
    arrowList = effectiveArrows.slice(0, 3).map((a) => ({ weapon: a.weapon, score: a.score, raw: a.raw, notes: a.notes }));
  }

  // 3. Crossbow + top 2 bolts
  const crossbows = candidates.filter((w) => w.category === 'crossbow');
  let crossbowObj = null;
  let boltList = [];
  if (crossbows.length > 0) {
    const scoredCrossbows = crossbows.map((c) => {
      const cPierce = c.damageMax?.pierce ?? 0;
      const s = Math.round(cPierce * (mods.pierce ?? 1));
      return { weapon: c.id, name: c.name, tier: c.tier, score: s, rawWeapon: c };
    });
    scoredCrossbows.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.tier !== b.tier) return a.tier - b.tier;
      return byCodepoint(a.name, b.name);
    });
    const bestCrossbow = scoredCrossbows[0];
    crossbowObj = { weapon: bestCrossbow.weapon, score: bestCrossbow.score };

    const bolts = candidates.filter((w) => w.category === 'bolt');
    const scoredBolts = bolts.map((b) => {
      const s = rangedScore(bestCrossbow.rawWeapon, b, mods);
      const combinedDmg = buildCombinedRangedDamage(bestCrossbow.rawWeapon, b);
      const r = rawDamage(combinedDmg, mods);
      const notes = buildNotes(combinedDmg, mods);
      return { weapon: b.id, name: b.name, tier: b.tier, score: s, raw: r, notes };
    });
    scoredBolts.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.tier !== b.tier) return a.tier - b.tier;
      return byCodepoint(a.name, b.name);
    });
    const effectiveBolts = scoredBolts.filter((b) => b.score >= 0.5 * b.raw);
    boltList = effectiveBolts.slice(0, 2).map((b) => ({ weapon: b.weapon, score: b.score, raw: b.raw, notes: b.notes }));
  }

  // 4. Magic top 1
  const magics = candidates.filter((w) => w.category === 'magic');
  let magicObj = null;
  if (magics.length > 0) {
    const scoredMagic = magics.map((m) => {
      const s = score(m.damageMax, mods);
      const r = rawDamage(m.damageMax, mods);
      const notes = buildNotes(m.damageMax, mods);
      return { weapon: m.id, name: m.name, tier: m.tier, score: s, raw: r, notes };
    });
    scoredMagic.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.tier !== b.tier) return a.tier - b.tier;
      return byCodepoint(a.name, b.name);
    });
    const effectiveMagic = scoredMagic.filter((m) => m.score >= 0.5 * m.raw);
    if (effectiveMagic.length > 0) {
      magicObj = { weapon: effectiveMagic[0].weapon, score: effectiveMagic[0].score, raw: effectiveMagic[0].raw, notes: effectiveMagic[0].notes };
    }
  }

  // 5. Bomb top 1
  const bombs = candidates.filter((w) => w.category === 'bomb');
  let bombObj = null;
  if (bombs.length > 0) {
    const scoredBombs = bombs.map((b) => {
      const s = score(b.damageMax, mods);
      const r = rawDamage(b.damageMax, mods);
      const notes = buildNotes(b.damageMax, mods);
      return { weapon: b.id, name: b.name, tier: b.tier, score: s, raw: r, notes };
    });
    scoredBombs.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.tier !== b.tier) return a.tier - b.tier;
      return byCodepoint(a.name, b.name);
    });
    const effectiveBombs = scoredBombs.filter((b) => b.score >= 0.5 * b.raw);
    if (effectiveBombs.length > 0) {
      bombObj = { weapon: effectiveBombs[0].weapon, score: effectiveBombs[0].score, raw: effectiveBombs[0].raw, notes: effectiveBombs[0].notes };
    }
  }

  // 6. Avoid: combat damage types with mult <= 0.5 present on candidate weapons
  const candidateDamageTypes = new Set();
  for (const c of candidates) {
    for (const [dt, val] of Object.entries(c.damageMax ?? {})) {
      if (val > 0) candidateDamageTypes.add(dt);
    }
  }
  const avoid = [];
  for (const dt of COMBAT_DAMAGE_TYPES) {
    if (mods[dt] <= 0.5 && candidateDamageTypes.has(dt)) {
      avoid.push({ type: dt, mult: mods[dt] });
    }
  }
  avoid.sort((a, b) => a.mult - b.mult || byCodepoint(a.type, b.type));

  // 7. Tip
  let bestWeakType = null;
  let maxWeakMult = 1;
  for (const dt of DAMAGE_TYPES) {
    if (mods[dt] > maxWeakMult && mods[dt] > 1) {
      maxWeakMult = mods[dt];
      bestWeakType = dt;
    }
  }

  let tipPrefix = '';
  if (bestWeakType) {
    let bestWeaponName = null;
    let bestWeaponScore = -1;

    for (const w of candidates) {
      if (w.damageMax?.[bestWeakType] > 0) {
        let s = 0;
        if (w.category === 'arrow' && bowObj) {
          const bowWeapon = weapons.find((x) => x.id === bowObj.weapon);
          s = rangedScore(bowWeapon, w, mods);
        } else if (w.category === 'bolt' && crossbowObj) {
          const cWeapon = weapons.find((x) => x.id === crossbowObj.weapon);
          s = rangedScore(cWeapon, w, mods);
        } else {
          s = score(w.damageMax, mods);
        }
        if (s > bestWeaponScore) {
          bestWeaponScore = s;
          bestWeaponName = w.name;
        }
      }
    }

    if (bestWeaponName) {
      const weaknessLabel = maxWeakMult === 2 ? 'Very weak' : 'Weak';
      tipPrefix = `${weaknessLabel} to ${capitalize(bestWeakType)} (\u00d7${maxWeakMult}): ${bestWeaponName} hits for ${bestWeaponScore} effective.`;
    }
  }

  if (!tipPrefix) {
    const topMelee = scoredMelee[0];
    if (topMelee) {
      tipPrefix = `No elemental weakness \u2014 best raw option: ${topMelee.name} (${topMelee.score}).`;
    } else {
      tipPrefix = `No recommended weapons found for this biome.`;
    }
  }

  // Immunities check
  const immuneTypes = COMBAT_DAMAGE_TYPES.filter((t) => creature?.modifiers?.[t] === 'immune');
  let immuneSuffix = '';
  if (immuneTypes.length > 0) {
    immuneSuffix = ` Immune to ${immuneTypes.map(capitalize).join(', ')}.`;
  }

  const tip = tipPrefix + immuneSuffix;

  return {
    gearTier,
    modifiers: mods,
    melee,
    bow: bowObj,
    arrows: arrowList,
    crossbow: crossbowObj,
    bolts: boltList,
    magic: magicObj,
    bomb: bombObj,
    avoid,
    tip,
  };
}

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
      recommendations[key] = recommendFor(creature, biome, weapons);
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
