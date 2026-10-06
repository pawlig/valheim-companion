/**
 * Export shared weapon quality, attack profiles and parity fixtures
 * from the damage calculator to root data/ (VC-11).
 *
 * Run with: npm run export:shared
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  ATTACK_PROFILES,
  BOW_DRAW_BASE,
  BOW_DRAW_PER_SKILL,
  BOW_MIN_INTERVAL,
  CROSSBOW_FIRING,
  CROSSBOW_READYING,
  CROSSBOW_RELOAD_BASE,
  CROSSBOW_RELOAD_PER_SKILL,
  hasSecondaryAttack,
  primaryProfileFor,
  secondaryProfileFor,
  type AttackKind,
} from "../src/data/attack-profiles";
import { backstabMultiplier, calculate } from "../src/lib/damage";
import { ammoItems, bosses, enemies, recipes, weapons } from "../src/lib/data";
import type { Ammo, Creature, DamageType, Weapon } from "../src/lib/types";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const OUT_DIR = join(ROOT, "data");

mkdirSync(OUT_DIR, { recursive: true });

/* ------------------------------------------------------------------ *
 * 1. weapon-quality.json
 * { "<slug>": { "<typ>": [q1, q2, q3, q4] } }
 * Excludes chop, pickaxe, pure; only qualities the weapon actually has.
 * ------------------------------------------------------------------ */

function getMaxQuality(item: Weapon | Ammo): number {
  if ("kind" in item) {
    // Ammo cannot be upgraded
    return 1;
  }
  const w = item as Weapon;
  if (w.consumable || w.slug === "bare-fists") {
    return 1;
  }
  const r = recipes[w.slug];
  if (!r) return 1;
  const isUpgradable = r.qualities.slice(1).some((q) => q && q.length > 0);
  return isUpgradable ? 4 : 1;
}

const weaponQuality: Record<string, Partial<Record<DamageType, number[]>>> = {};

const COMBAT_TYPES: DamageType[] = [
  "blunt",
  "pierce",
  "slash",
  "fire",
  "frost",
  "lightning",
  "poison",
  "spirit",
];

for (const item of [...weapons, ...ammoItems]) {
  const maxQ = getMaxQuality(item);
  const dmgMap: Partial<Record<DamageType, number[]>> = {};

  for (const dt of COMBAT_TYPES) {
    const rawArr = item.damage?.[dt];
    if (rawArr && Array.isArray(rawArr)) {
      const sliced = rawArr.slice(0, maxQ);
      if (sliced.some((v) => v > 0)) {
        dmgMap[dt] = sliced;
      }
    }
  }

  if (Object.keys(dmgMap).length > 0) {
    weaponQuality[item.slug] = dmgMap;
  }
}

writeFileSync(
  join(OUT_DIR, "weapon-quality.json"),
  JSON.stringify(weaponQuality, null, 2) + "\n",
  "utf8",
);
console.log("Wrote data/weapon-quality.json");

/* ------------------------------------------------------------------ *
 * 2. attack-profiles.json
 * For each weapon: primary, secondary (or null), skillScaled
 * Global: bow and crossbow timing constants
 * ------------------------------------------------------------------ */

export interface ExportedAttackProfile {
  comboMults: number[];
  cycle: {
    kind: "fixed" | "bow" | "crossbow";
    seconds?: number;
  };
  damageMult: number;
  confidence: string;
}

export interface ExportedWeaponTiming {
  primary: ExportedAttackProfile;
  secondary: ExportedAttackProfile | null;
  skillScaled: boolean;
}

const exportedWeapons: Record<string, ExportedWeaponTiming> = {};

for (const w of weapons) {
  const primary = primaryProfileFor(w);
  const sec = hasSecondaryAttack(w) ? secondaryProfileFor(w) : null;

  const primaryExport: ExportedAttackProfile = {
    comboMults: primary.comboMults,
    cycle: primary.timing,
    damageMult: primary.damageMult,
    confidence: primary.confidence,
  };

  const secondaryExport: ExportedAttackProfile | null = sec
    ? {
        comboMults: sec.comboMults,
        cycle: sec.timing,
        damageMult: sec.damageMult,
        confidence: sec.confidence,
      }
    : null;

  exportedWeapons[w.slug] = {
    primary: primaryExport,
    secondary: secondaryExport,
    skillScaled: w.skillScaled !== false,
  };
}

const attackProfiles = {
  weapons: exportedWeapons,
  ...exportedWeapons,
  bow: {
    drawBase: BOW_DRAW_BASE,
    drawPerSkill: BOW_DRAW_PER_SKILL,
    minInterval: BOW_MIN_INTERVAL,
  },
  crossbow: {
    reloadBase: CROSSBOW_RELOAD_BASE,
    reloadPerSkill: CROSSBOW_RELOAD_PER_SKILL,
    readying: CROSSBOW_READYING,
    firing: CROSSBOW_FIRING,
  },
};

writeFileSync(
  join(OUT_DIR, "attack-profiles.json"),
  JSON.stringify(attackProfiles, null, 2) + "\n",
  "utf8",
);
console.log("Wrote data/attack-profiles.json");

/* ------------------------------------------------------------------ *
 * 3. parity-fixtures.json
 * Grid of calculate() results for parity tests:
 *  13 weapons x 6 targets x 3 skills x 2 qualities x 2 attacks x 2 backstabs
 * ------------------------------------------------------------------ */

const GRID_WEAPONS: { weaponSlug: string; ammoSlug?: string }[] = [
  { weaponSlug: "krom" },
  { weaponSlug: "mistwalker" },
  { weaponSlug: "iron-sledge" },
  { weaponSlug: "iron-atgeir" },
  { weaponSlug: "copper-knife" },
  { weaponSlug: "flesh-rippers" },
  { weaponSlug: "huntsman-bow", ammoSlug: "fire-arrow" },
  { weaponSlug: "arbalest", ammoSlug: "iron-bolt" },
  { weaponSlug: "bronze-sword" },
  { weaponSlug: "frostner" },
  { weaponSlug: "nord-greatsword" },
  { weaponSlug: "staff-of-embers" },
  // Exercises the explicit pickaxe weakness: Stone Golem counts pickaxe x2,
  // every other grid target ignores the pickaxe component.
  { weaponSlug: "iron-pickaxe" },
];

const GRID_TARGET_SLUGS = [
  "greydwarf",
  "troll",
  "draugr",
  "stone-golem",
  "seeker-soldier",
  "kall-fimbulbringer",
];

const SKILL_LEVELS = [0, 50, 100];
const QUALITY_MODES = ["1", "max"] as const;
const ATTACK_KINDS: AttackKind[] = ["primary", "secondary"];
const BACKSTAB_OPTIONS = [false, true];

const allTargets: Creature[] = [...enemies, ...bosses];

interface ParityFixtureEntry {
  inputs: {
    weapon: string;
    ammo: string | null;
    target: string;
    skillLevel: number;
    quality: number;
    qualityMode: "1" | "max";
    attack: AttackKind;
    backstab: boolean;
  };
  perHit: number;
  openingPerHit: number;
  cycleSeconds: number;
  dps: number;
  timeToKill: number;
}

const parityFixtures: ParityFixtureEntry[] = [];

for (const { weaponSlug, ammoSlug } of GRID_WEAPONS) {
  const w = weapons.find((x) => x.slug === weaponSlug);
  if (!w) throw new Error(`Weapon not found: ${weaponSlug}`);
  const a = ammoSlug
    ? ammoItems.find((x) => x.slug === ammoSlug) ?? null
    : null;
  const maxQ = getMaxQuality(w);

  for (const targetSlug of GRID_TARGET_SLUGS) {
    const t = allTargets.find((x) => x.slug === targetSlug);
    if (!t) throw new Error(`Target not found: ${targetSlug}`);

    for (const skillLevel of SKILL_LEVELS) {
      for (const qMode of QUALITY_MODES) {
        const quality = qMode === "max" ? maxQ : 1;

        for (const attack of ATTACK_KINDS) {
          for (const backstab of BACKSTAB_OPTIONS) {
            const res = calculate({
              weapon: w,
              quality,
              ammo: a,
              target: t,
              skillLevel,
              skillMode: "avg",
              attack,
              backstab,
            });

            const bsMult = backstabMultiplier(w);
            const openingMult = backstab ? bsMult : 1;
            const steadyPerHit =
              openingMult === 1 ? res.perHit : res.perHit / openingMult;

            parityFixtures.push({
              inputs: {
                weapon: weaponSlug,
                ammo: ammoSlug ?? null,
                target: targetSlug,
                skillLevel,
                quality,
                qualityMode: qMode,
                attack,
                backstab,
              },
              perHit: steadyPerHit,
              openingPerHit: res.perHit,
              cycleSeconds: res.cycleSeconds,
              dps: res.dps,
              timeToKill: res.ttk,
            });
          }
        }
      }
    }
  }
}

writeFileSync(
  join(OUT_DIR, "parity-fixtures.json"),
  JSON.stringify(parityFixtures, null, 2) + "\n",
  "utf8",
);
console.log(`Wrote data/parity-fixtures.json (${parityFixtures.length} entries)`);
