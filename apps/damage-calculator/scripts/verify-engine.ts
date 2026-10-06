/**
 * Engine sanity checks against hand-computed values from the wiki.
 * Run with: npm run verify:engine
 */

import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { BIOMES, BIOME_ORDER, BOSS_BIOME, isReached, type BiomeId } from "../src/data/biomes";
import { GUIDE_NOTES } from "../src/data/guide-notes";
import { MATERIAL_BIOME, STATION_BIOME, normalizeName } from "../src/data/materials";
import {
  bowCycleSeconds,
  bowDrawSeconds,
  crossbowCycleSeconds,
  crossbowReloadSeconds,
  hasSecondaryAttack,
  primaryProfileFor,
  secondaryProfileFor,
} from "../src/data/attack-profiles";
import {
  DEFAULT_BACKSTAB,
  backstabMultiplier,
  calculate,
  skillFactor,
} from "../src/lib/damage";
import { buildGuideStep, lockedFor, qualityFor } from "../src/lib/guide";
import {
  ALL_DAMAGE_TYPES,
  type Ammo,
  type Creature,
  type DamageType,
  type RecipeBook,
  type Weapon,
} from "../src/lib/types";
import {
  parseViewQuery,
  viewSearch,
  type ViewState,
} from "../src/lib/view-url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const load = <T>(file: string): T =>
  JSON.parse(readFileSync(join(ROOT, "src", "data", file), "utf8")) as T;

const weapons = load<Weapon[]>("weapons.json");
const ammo = load<Ammo[]>("ammo.json");
const bosses = load<Creature[]>("bosses.json");
const enemies = load<Creature[]>("enemies.json");

const weapon = (name: string) => {
  const w = weapons.find((x) => x.name.toLowerCase() === name.toLowerCase());
  if (!w) throw new Error(`weapon not found: ${name}`);
  return w;
};
const boss = (name: string) => {
  const b = bosses.find((x) => x.name.toLowerCase() === name.toLowerCase());
  if (!b) throw new Error(`boss not found: ${name}`);
  return b;
};
const creature = (name: string) => {
  const c = enemies.find((x) => x.name.toLowerCase() === name.toLowerCase());
  if (!c) throw new Error(`creature not found: ${name}`);
  return c;
};
const ammoItem = (name: string) => {
  const a = ammo.find((x) => x.name.toLowerCase() === name.toLowerCase());
  if (!a) throw new Error(`ammo not found: ${name}`);
  return a;
};

let failures = 0;
const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps;

/** Strings print bare; everything else is JSON, so a failed object or array
 *  comparison shows what actually differed instead of "[object Object]". */
const show = (value: unknown) =>
  typeof value === "string" ? value : JSON.stringify(value);

function check(label: string, actual: unknown, expected: unknown) {
  const ok = typeof actual === "number" && typeof expected === "number"
    ? near(actual, expected)
    : JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) {
    failures++;
    console.error(`FAIL  ${label}\n        expected ${show(expected)}\n        actual   ${show(actual)}`);
  } else {
    console.log(`ok    ${label}  =>  ${show(actual)}`);
  }
}

/* --- skill factor curve (Damage mechanics page) --- */
check("skillFactor(0,'min')", skillFactor(0, "min"), 0.25);
check("skillFactor(0,'max')", skillFactor(0, "max"), 0.55);
check("skillFactor(0,'avg')", skillFactor(0, "avg"), 0.4);
check("skillFactor(75,'max')", skillFactor(75, "max"), 1.0);
check("skillFactor(100,'min')", skillFactor(100, "min"), 0.85);
check("skillFactor(100,'avg')", skillFactor(100, "avg"), 0.925);

/* --- resistance interactions --- */
// Frostner Q1 vs Bonemass (weak blunt x1.5, weak frost x1.5, neutral spirit x1)
// 35*1.5 + 40*1.5 + 20*1 = 132.5
check(
  "Frostner Q1 vs Bonemass",
  calculate({
    weapon: weapon("Frostner"),
    quality: 1,
    target: boss("Bonemass"),
    skillLevel: 100,
    skillMode: "max",
    attack: "primary",
  }).perHit,
  132.5,
);

// Frostner Q4 vs Bonemass: blunt 35, frost 58, spirit 20
// 35*1.5 + 58*1.5 + 20 = 159.5
check(
  "Frostner Q4 vs Bonemass",
  calculate({
    weapon: weapon("Frostner"),
    quality: 4,
    target: boss("Bonemass"),
    skillLevel: 100,
    skillMode: "max",
    attack: "primary",
  }).perHit,
  159.5,
);

// Porcupine Q1 vs Bonemass: blunt 50 x1.5 = 75, pierce 45 x0.25 = 11.25
check(
  "Porcupine Q1 vs Bonemass",
  calculate({
    weapon: weapon("Porcupine"),
    quality: 1,
    target: boss("Bonemass"),
    skillLevel: 100,
    skillMode: "max",
    attack: "primary",
  }).perHit,
  86.25,
);

// Immunity zeroes a damage type: Fader is immune to fire.
// Dyrnwyn Q1 = slash 145 (neutral x1) + fire 10 (immune x0) = 145
check(
  "Dyrnwyn Q1 vs Fader (fire immune)",
  calculate({
    weapon: weapon("Dyrnwyn"),
    quality: 1,
    target: boss("Fader"),
    skillLevel: 100,
    skillMode: "max",
    attack: "primary",
  }).perHit,
  145,
);

// Very weak = x2: The Elder is very weak to fire.
// Staff of Embers Q1 = blunt 120 x1 + fire 120 x2 = 360
check(
  "Staff of Embers Q1 vs The Elder",
  calculate({
    weapon: weapon("Staff of Embers"),
    quality: 1,
    target: boss("The Elder"),
    skillLevel: 100,
    skillMode: "max",
    attack: "primary",
  }).perHit,
  360,
);

/* --- bows combine weapon + ammo --- */
// Finewood Bow Q1 pierce 32 + Wood arrow pierce 22 = 54 vs Eikthyr (neutral)
check(
  "Finewood Bow + Wood arrow vs Eikthyr",
  calculate({
    weapon: weapon("Finewood Bow"),
    quality: 1,
    ammo: ammoItem("Wood arrow"),
    target: boss("Eikthyr"),
    skillLevel: 100,
    skillMode: "max",
    attack: "primary",
  }).perHit,
  54,
);

/* --- attack timing: cycle DPS from the wiki's attack-speed tables --- */
// Club primary is a 3-hit combo with weights 1+1+2 over a 2.46 s cycle
// (wiki Clubs, retrieved 2026-10-05). Eikthyr hunter: skill 100 max, 55/hit.
const eikthyrClub = calculate({
  weapon: weapon("Iron mace"),
  quality: 1,
  target: boss("Eikthyr"),
  skillLevel: 100,
  skillMode: "max",
  attack: "primary",
});
check("Iron mace Q1 vs Eikthyr perHit", eikthyrClub.perHit, 55);
check("Iron mace Q1 vs Eikthyr cycle damage", eikthyrClub.cycleDamage, 4 * 55);
check("Iron mace Q1 vs Eikthyr cycle time", eikthyrClub.cycleSeconds, 2.46);
check(
  "Iron mace Q1 vs Eikthyr dps",
  eikthyrClub.dps,
  (4 * 55) / 2.46,
);
check(
  "Iron mace Q1 vs Eikthyr ttk (averaged cycle)",
  eikthyrClub.ttk,
  500 / ((4 * 55) / 2.46),
);
check("Iron mace Q1 ttk method", eikthyrClub.ttkMethod, "averaged");
check("Iron mace Q1 events per cycle", eikthyrClub.eventCount, 3);

/* --- combo shapes are per weapon class, not one universal rule --- */
check(
  "Bare fists: 2-hit chain with a double second punch",
  primaryProfileFor(weapon("Bare fists")).comboMults,
  [1, 2],
);
/* The fist class used to be scraped as Bare Fists only: the wiki files the
 * rest under Category:Unarmed, which the scraper did not follow. */
check("fist weapon count", weapons.filter((w) => w.cls === "fists").length, 7);
check(
  "crafted fist weapons share the unarmed combo",
  primaryProfileFor(weapon("Flesh Rippers")).comboMults,
  [1, 2],
);
check(
  "Flesh Rippers: slashing claws, per-quality table",
  weapon("Flesh Rippers").damage.slash,
  [60, 64, 68, 72],
);
// The Deep North knucklechains publish their table under "Upgrading", so this
// also guards the heading the scraper has to recognise.
check(
  "Nord Knucklechains: blunt body with a scaling slash",
  [weapon("Nord Knucklechains").damage.blunt, weapon("Nord Knucklechains").damage.slash],
  [
    [114, 114, 114, 114],
    [0, 8, 16, 24],
  ],);

/* --- backstab bonus (wiki Weapons page, "Backstab") --- */
/* The class rule is the fallback; a value the item publishes in its own
 * infobox wins. Values below are exactly what the wiki states. */
check("backstab default is 3x", DEFAULT_BACKSTAB, 3);
check("backstab: swords take the 3x default", backstabMultiplier(weapon("Iron Sword")), 3);
check("backstab: knives are 6x", backstabMultiplier(weapon("Flint Knife")), 6);
check(
  "backstab: two-handed clubs are 2x",
  backstabMultiplier(weapon("Iron Sledge")),
  2,
);
check(
  "backstab: Flesh Rippers are named alongside the knives at 6x",
  backstabMultiplier(weapon("Flesh Rippers")),
  6,
);
check(
  "backstab: other fists keep the 3x default",
  backstabMultiplier(weapon("Paws of the Bear")),
  3,
);
check("backstab: infobox wins (Dundr 1x)", backstabMultiplier(weapon("Dundr")), 1);
check(
  "backstab: infobox wins (Explosive Payload 4x)",
  backstabMultiplier(weapon("Explosive Payload")),
  4,
);
check(
  "backstab: Abyssal Harpoon publishes 1x",
  backstabMultiplier(weapon("Abyssal Harpoon")),
  1,
);

/* Backstab boosts the opening hit only: a backstab grants the target five
 * minutes of backstab immunity, so the rest of the combo is normal damage.
 * Flesh Rippers has a [1, 2] combo, so the opening cycle is 6x on the 1x hit
 * and 1x on the 2x hit. */
const rippersPlain = calculate({
  weapon: weapon("Flesh Rippers"),
  quality: 4,
  target: boss("Eikthyr"),
  skillLevel: 100,
  skillMode: "avg",
  attack: "primary",
});
const rippersBackstab = calculate({
  weapon: weapon("Flesh Rippers"),
  quality: 4,
  target: boss("Eikthyr"),
  skillLevel: 100,
  skillMode: "avg",
  attack: "primary",
  backstab: true,
});
check(
  "backstab is off unless asked for",
  [rippersPlain.backstabApplied, rippersPlain.backstabMultiplier],
  [false, 6],
);
check(
  "backstab: the opening hit takes the full bonus",
  rippersBackstab.perHit,
  rippersPlain.perHit * 6,
);
check(
  "backstab: later combo hits are normal damage",
  rippersBackstab.cycleDamage,
  rippersPlain.perHit * 6 + rippersPlain.perHit * 2,
);
check(
  "backstab: the opening cycle drives the DPS",
  rippersBackstab.dps,
  rippersBackstab.cycleDamage / rippersBackstab.cycleSeconds,
);
check(
  "backstab: the opener shortens the kill",
  rippersBackstab.ttk < rippersPlain.ttk,
  true,
);

// Dual axes: 4 swings, 6 hits; the last swing's two hits both deal double.
check(
  "Berserkir Axes: 6 damage events",
  primaryProfileFor(weapon("Berserkir Axes")).comboMults,
  [1, 1, 1, 1, 2, 2],
);
check(
  "Early Axes share the dual-axe combo shape",
  primaryProfileFor(weapon("Early Axes")).comboMults,
  [1, 1, 1, 1, 2, 2],
);
// Spears and sledges have no 3-hit combo at all.
check(
  "Flint Spear: single thrust",
  primaryProfileFor(weapon("Flint Spear")).comboMults,
  [1],
);
check(
  "Iron Sledge: single slam",
  primaryProfileFor(weapon("Iron Sledge")).comboMults,
  [1],
);
check(
  "Flint Spear cycle",
  primaryProfileFor(weapon("Flint Spear")).timing,
  { kind: "fixed", seconds: 0.68 },
);
check(
  "Iron Sledge cycle",
  primaryProfileFor(weapon("Iron Sledge")).timing,
  { kind: "fixed", seconds: 1.7 },
);

/* --- secondaries exist only where the wiki lists them --- */
check("sword has a secondary", hasSecondaryAttack(weapon("Iron Sword")), true);
check(
  "sword secondary is 3x over 1.84 s",
  secondaryProfileFor(weapon("Iron Sword"))?.damageMult,
  3,
);
check(
  "sword secondary cycle",
  secondaryProfileFor(weapon("Iron Sword"))?.timing,
  { kind: "fixed", seconds: 1.84 },
);
check("sledge has no secondary", hasSecondaryAttack(weapon("Iron Sledge")), false);
check("pickaxe has no secondary", hasSecondaryAttack(weapon("Iron Pickaxe")), false);
check(
  "elemental staff has no secondary",
  hasSecondaryAttack(weapon("Staff of Embers")),
  false,
);
check("bow has no secondary", hasSecondaryAttack(weapon("Finewood Bow")), false);
check(
  "crossbow has no secondary",
  hasSecondaryAttack(weapon("Arbalest")),
  false,
);

/* --- Iron Sword's published hit schedule (MaxDPS model, build 25527674) --- */
const ironSword = calculate({
  weapon: weapon("Iron Sword"),
  quality: 1,
  target: boss("Eikthyr"),
  skillLevel: 100,
  skillMode: "max",
  attack: "primary",
});
check(
  "Iron Sword hit times",
  primaryProfileFor(weapon("Iron Sword")).hitTimes,
  [0.455, 1.096, 1.875],
);
check("Iron Sword cycle", ironSword.cycleSeconds, 2.425);
check("Iron Sword dps", ironSword.dps, (4 * 55) / 2.425);
// 500 HP: hits deal 55, 55, 110 each cycle. Two full cycles leave 440, so the
// kill lands on the 2nd hit of cycle 3: 2 × 2.425 + 1.096 = 5.946 s, with the
// remaining 50 overkilled — a scheduled kill, not health / DPS.
check("Iron Sword ttk (scheduled)", ironSword.ttk, 2 * 2.425 + 1.096);
check("Iron Sword ttk method", ironSword.ttkMethod, "scheduled");

/* --- Berserkir Axes: six damage events, scheduled --- */
const berserkir = calculate({
  weapon: weapon("Berserkir Axes"),
  quality: 1,
  target: boss("Eikthyr"),
  skillLevel: 100,
  skillMode: "max",
  attack: "primary",
});
check("Berserkir Axes perHit", berserkir.perHit, 140);
check("Berserkir Axes events per cycle", berserkir.eventCount, 6);
check("Berserkir Axes cycle", berserkir.cycleSeconds, 3.521);
check("Berserkir Axes dps", berserkir.dps, (8 * 140) / 3.521);
// 500 HP: 140 × 4 = 560 on the 4th event, so the kill lands at 1.793 s.
check("Berserkir Axes ttk (scheduled)", berserkir.ttk, 1.793);
check("Berserkir Axes ttk method", berserkir.ttkMethod, "scheduled");

/* --- bow and crossbow timing scale with the relevant skill --- */
check("bow draw at skill 0", bowDrawSeconds(0), 2.5);
check("bow draw at skill 50", bowDrawSeconds(50), 1.5);
check("bow draw at skill 100", bowDrawSeconds(100), 0.5);
check("bow cycle at skill 0", bowCycleSeconds(0), 2.5);
check("bow cycle at skill 50", bowCycleSeconds(50), 1.5);
check("bow cycle reaches the 0.8 s floor at skill 85", bowCycleSeconds(85), 0.8);
check("bow cycle stays at the floor at skill 100", bowCycleSeconds(100), 0.8);
check(
  "bow keeps its full-draw caveat on record",
  Boolean(primaryProfileFor(weapon("Finewood Bow")).note?.includes("full draw")),
  true,
);
check("crossbow reload at skill 0", crossbowReloadSeconds(0), 3.5);
check("crossbow reload at skill 50", crossbowReloadSeconds(50), 2.625);
check("crossbow reload at skill 100", crossbowReloadSeconds(100), 1.75);
check("crossbow cycle at skill 0", crossbowCycleSeconds(0), 5.35);
check("crossbow cycle at skill 50", crossbowCycleSeconds(50), 4.475);
check("crossbow cycle at skill 100", crossbowCycleSeconds(100), 3.6);
check(
  "crossbow keeps the loaded-first-shot caveat on record",
  Boolean(
    primaryProfileFor(weapon("Arbalest")).note?.includes("loaded first shot"),
  ),
  true,
);
const bowLow = calculate({
  weapon: weapon("Finewood Bow"),
  quality: 1,
  ammo: ammoItem("Wood arrow"),
  target: boss("Eikthyr"),
  skillLevel: 0,
  skillMode: "max",
  attack: "primary",
});
const bowHigh = calculate({
  weapon: weapon("Finewood Bow"),
  quality: 1,
  ammo: ammoItem("Wood arrow"),
  target: boss("Eikthyr"),
  skillLevel: 100,
  skillMode: "max",
  attack: "primary",
});
check("bow cycle shortens with skill", bowHigh.cycleSeconds < bowLow.cycleSeconds, true);
check("bow uses the averaged cycle for ttk", bowLow.ttkMethod, "averaged");

/* --- unresolved timings stay labelled, never silently promoted --- */
check(
  "bomb timing stays an estimate",
  primaryProfileFor(weapon("Ooze bomb")).confidence,
  "estimate",
);
check(
  "catapult timing stays an estimate",
  primaryProfileFor(weapon("Explosive Payload")).confidence,
  "estimate",
);
check(
  "ballista cycle is the structure cooldown",
  primaryProfileFor(weapon("Wooden missile")).timing,
  { kind: "fixed", seconds: 2 },
);
check(
  "ballista warm-up is kept separate from the cycle",
  primaryProfileFor(weapon("Wooden missile")).warmupSeconds,
  1,
);
check(
  "Dundr uses its published 1.9 s reload",
  primaryProfileFor(weapon("Dundr")).timing,
  { kind: "fixed", seconds: 1.9 },
);
check(
  "crossbow model keeps the wiki 6 s conflict on record",
  primaryProfileFor(weapon("Arbalest")).alternates?.[0]?.seconds,
  6,
);
check(
  "axe keeps the model's slower cycle on record",
  primaryProfileFor(weapon("Flint Axe")).alternates?.[0]?.seconds,
  2.879,
);
check(
  "club keeps the self-contradicting stage breakdown out of the math",
  primaryProfileFor(weapon("Iron Mace")).timing,
  { kind: "fixed", seconds: 2.46 },
);

/* --- Deep North content, checked against the wiki infoboxes --- */
// Nord Sword: slash 170 with +10 per level.
check(
  "Nord Sword Q1 vs Eikthyr (neutral slash)",
  calculate({
    weapon: weapon("Nord Sword"),
    quality: 1,
    target: boss("Eikthyr"),
    skillLevel: 100,
    skillMode: "max",
    attack: "primary",
  }).perHit,
  170,
);
check(
  "Nord Sword Q4 vs Eikthyr (neutral slash)",
  calculate({
    weapon: weapon("Nord Sword"),
    quality: 4,
    target: boss("Eikthyr"),
    skillLevel: 100,
    skillMode: "max",
    attack: "primary",
  }).perHit,
  200,
);

// Echo Spike: fire 50 (Bonemass very resistant x0.25) + frost 50 (weak x1.5)
// 12.5 + 75 = 87.5
check(
  "Echo Spike Q1 vs Bonemass",
  calculate({
    weapon: weapon("Echo Spike"),
    quality: 1,
    target: boss("Bonemass"),
    skillLevel: 100,
    skillMode: "max",
    attack: "primary",
  }).perHit,
  87.5,
);

// Ballista ammo and thrown bombs scale with no weapon skill, so a level-0
// character must deal exactly the listed damage.
check(
  "Black metal missile ignores the weapon skill",
  calculate({
    weapon: weapon("Black metal missile"),
    quality: 1,
    target: boss("Eikthyr"),
    skillLevel: 0,
    skillMode: "min",
    attack: "primary",
  }).perHit,
  120,
);

// Creatures without an explicit modifier are immune to pickaxe damage
// (Damage#Pickaxe), so only the physical component of a pickaxe counts.
check(
  "Iron Pickaxe Q1 vs Eikthyr counts pierce only",
  calculate({
    weapon: weapon("Iron Pickaxe"),
    quality: 1,
    target: boss("Eikthyr"),
    skillLevel: 100,
    skillMode: "max",
    attack: "primary",
  }).perHit,
  33,
);

// Terrain damage counts only against targets that publish an explicit
// modifier for it: Stone Golem is very weak to pickaxe, so there the pickaxe
// component counts too — pierce 33 x0.5 (resistant) + pickaxe 33 x2 = 82.5.
check(
  "Iron Pickaxe Q1 vs Stone Golem counts pickaxe x2",
  calculate({
    weapon: weapon("Iron Pickaxe"),
    quality: 1,
    target: creature("Stone Golem"),
    skillLevel: 100,
    skillMode: "max",
    attack: "primary",
  }).perHit,
  82.5,
);

// Troll lists no chop modifier, so an axe's chop component stays terrain
// damage against it: slash 60 x1 = 60.
check(
  "Iron Axe Q1 vs Troll ignores chop",
  calculate({
    weapon: weapon("Iron Axe"),
    quality: 1,
    target: creature("Troll"),
    skillLevel: 100,
    skillMode: "max",
    attack: "primary",
  }).perHit,
  60,
);

// Kvastur is explicitly weak to chop: slash 60 x1 + chop 50 x1.5 = 135.
check(
  "Iron Axe Q1 vs Kvastur counts chop x1.5",
  calculate({
    weapon: weapon("Iron Axe"),
    quality: 1,
    target: creature("Kvastur"),
    skillLevel: 100,
    skillMode: "max",
    attack: "primary",
  }).perHit,
  135,
);

// Catapult ammo is pure terrain damage and therefore does nothing to a boss.
check(
  "Explosive Payload deals no creature damage",
  calculate({
    weapon: weapon("Explosive Payload"),
    quality: 1,
    target: boss("Eikthyr"),
    skillLevel: 100,
    skillMode: "max",
    attack: "primary",
  }).perHit,
  0,
);

// The eighth and final boss: three phases, 10,000 + 7,000 + 30,000 HP.
const kall = boss("Kall Fimbulbringer");
check("Kall Fimbulbringer health", kall.health, 47000);
check("Kall Fimbulbringer phases", kall.healthPhases, [10000, 7000, 30000]);

/* --- minibosses and regular enemies (Creatures overview page) --- */
// Health is the 0-star value, except where the wiki only publishes the star
// level the creature always spawns at (Lord Reto is a 2-star creature only).
check(
  "Frostner Q1 vs Boar (spirit immune)",
  calculate({
    weapon: weapon("Frostner"),
    quality: 1,
    target: creature("Boar"),
    skillLevel: 100,
    skillMode: "max",
    attack: "primary",
  }).perHit,
  75,
);
// Serpent is immune to fire and weak to frost: Echo Spike 50 x0 + 50 x1.5.
check(
  "Echo Spike Q1 vs Serpent (fire immune, frost weak)",
  calculate({
    weapon: weapon("Echo Spike"),
    quality: 1,
    target: creature("Serpent"),
    skillLevel: 100,
    skillMode: "max",
    attack: "primary",
  }).perHit,
  75,
);
check("Boar health", creature("Boar").health, 10);
check("Serpent health", creature("Serpent").health, 400);
check("Troll health", creature("Troll").health, 600);
check("Stone Golem health", creature("Stone Golem").health, 800);
check("Seeker Soldier health", creature("Seeker Soldier").health, 1500);
check("Barka health", creature("Barka").health, 2200);
check("Bonemaw health", creature("Bonemaw").health, 1100);
check("Ghost is weak to spirit", creature("Ghost").resistances.spirit, "weak");
check(
  "Ghost resists physical damage",
  [
    creature("Ghost").resistances.blunt,
    creature("Ghost").resistances.pierce,
    creature("Ghost").resistances.slash,
  ],
  ["resistant", "resistant", "resistant"],
);
check("Troll is weak to pierce", creature("Troll").resistances.pierce, "weak");

/* --- minibosses (Hildir's Request) --- */
const brenna = creature("Brenna");
const geirrhafa = creature("Geirrhafa");
const zilThungr = creature("Zil & Thungr");
const lordReto = creature("Lord Reto");
check(
  "Brenna is a Black Forest miniboss",
  [brenna.kind, brenna.biome, brenna.health],
  ["miniboss", "black-forest", 1200],
);
check(
  "Geirrhafa is a Mountain miniboss",
  [geirrhafa.kind, geirrhafa.biome, geirrhafa.health],
  ["miniboss", "mountain", 3700],
);
check(
  "Zil & Thungr are a Plains miniboss duo with combined health",
  [zilThungr.kind, zilThungr.biome, zilThungr.health],
  ["miniboss", "plains", 6600],
);
check("Zil & Thungr carry their duo note", Boolean(zilThungr.note), true);
check(
  "Lord Reto is an Ashlands miniboss at its 2-star health",
  [lordReto.kind, lordReto.biome, lordReto.health],
  ["miniboss", "ashlands", 7500],
);

/* --- data integrity --- */
check("weapon count", weapons.length, 141);
check("ammo count", ammo.length, 19);
check("boss count", bosses.length, 8);
check("creature count", enemies.length, 71);
check(
  "miniboss count",
  enemies.filter((e) => e.kind === "miniboss").length,
  4,
);
check(
  "enemy count",
  enemies.filter((e) => e.kind === "enemy").length,
  67,
);
check(
  "every boss has positive health",
  bosses.every((b) => b.health > 0),
  true,
);
check(
  "every creature has positive health",
  enemies.every((e) => e.health > 0),
  true,
);

/* --- availability --- */
const biomeIds = new Set<BiomeId>(BIOMES.map((b) => b.id));
check(
  "every item sits on the biome ladder",
  [...weapons, ...ammo].every((i) => biomeIds.has(i.biome)),
  true,
);
check(
  "every boss sits on its ladder biome",
  bosses.every((b) => BOSS_BIOME[b.slug] === b.biome),
  true,
);
check(
  "every creature sits on the biome ladder",
  enemies.every((e) => biomeIds.has(e.biome)),
  true,
);
check(
  "creature resistances are combat or explicitly listed terrain types",
  enemies.every((e) =>
    Object.keys(e.resistances).every(
      (type) =>
        (ALL_DAMAGE_TYPES as readonly DamageType[]).includes(
          type as DamageType,
        ) && type !== "pure",
    ),
  ),
  true,
);

/* The derivation's whole point is that an item is never placed before its own
 * recipe could be made, so re-run that comparison over the committed data. */
const recipes = load<RecipeBook>("recipes.json");
const stationKey = (station: string) =>
  normalizeName(station).replace(/#.*$/, "").split(",")[0].trim();

const placedAfterItsRecipe = (item: Weapon | Ammo): boolean => {
  const recipe = recipes[item.slug];
  if (!recipe) return true; // dropped/overridden items have no recipe
  const station = STATION_BIOME[stationKey(recipe.station)];
  if (station && BIOME_ORDER[station] > BIOME_ORDER[item.biome]) return false;
  return recipe.qualities.flat().every((material) => {
    const mapped = MATERIAL_BIOME[normalizeName(material.name)];
    return !mapped || BIOME_ORDER[mapped] <= BIOME_ORDER[item.biome];
  });
};
check(
  "no item predates its own recipe",
  [...weapons, ...ammo].every(placedAfterItsRecipe),
  true,
);

/* --- progression guide --- */
// The guide is derived, so re-check what it promises: every step has a gate
// and at least one pick, picks unlock exactly at that step, the ammo they use
// is reachable too, and the ranking is resistance-aware (Bonemass is weak to
// blunt, Moder immune to frost).
const guides = BIOMES.map((entry) => buildGuideStep(entry.id));
check(
  "every step has a gate and a guide pick",
  guides.every((guide) => guide.gate !== null && guide.picks.length > 0),
  true,
);
check(
  "every step has at least one curated note",
  BIOMES.every((entry) => (GUIDE_NOTES[entry.id]?.length ?? 0) > 0),
  true,
);
check(
  "guide picks are first craftable at their step",
  guides.every((guide) =>
    guide.picks.every((pick) => pick.weapon.biome === guide.biome.id),
  ),
  true,
);
check(
  "guide picks always deal creature damage",
  guides.every((guide) => guide.picks.every((pick) => pick.result.perHit > 0)),
  true,
);
check(
  "guide ammo is reachable at the same step",
  guides.every((guide) =>
    guide.picks.every(
      (pick) =>
        pick.ammo === null || isReached(pick.ammo.biome, guide.biome.id),
    ),
  ),
  true,
);
check(
  "swamp guide recommends the Iron Mace (Bonemass is weak to blunt)",
  buildGuideStep("swamp").picks[0].weapon.name,
  "Iron Mace",
);
check(
  "mountain guide does not pick Frostner against frost-immune Moder",
  buildGuideStep("mountain").picks[0].weapon.name !== "Frostner",
  true,
);
// The guide takes the caller's skill settings, so the panel can track the
// page's controls instead of assuming a fixed character.
const lowSkill = buildGuideStep("swamp", { skillLevel: 0, skillMode: "min" });
const highSkill = buildGuideStep("swamp", { skillLevel: 100, skillMode: "max" });
check(
  "guide scores follow the caller's skill level and roll",
  highSkill.picks[0].result.perHit > lowSkill.picks[0].result.perHit,
  true,
);
// Every pick is skill-scaled, so the skill factor is a uniform multiplier and
// the ranking itself must not move with the slider.
check(
  "guide ranking is the same at any skill setting",
  lowSkill.picks.map((pick) => pick.weapon.slug),
  highSkill.picks.map((pick) => pick.weapon.slug),
);
// Upgrade targets and lock reasons are unit-checked, including the paths the
// committed picks do not happen to hit: a weapon with no published upgrade
// table, and a level whose material only exists in a later biome.
check(
  "Abyssal Harpoon has no documented upgrade table",
  qualityFor(weapon("Abyssal Harpoon"), "ocean"),
  { quality: 1, upgradeable: false },
);
check(
  "Iron Mace reaches Q4 at the Swamp step",
  qualityFor(weapon("Iron Mace"), "swamp"),
  { quality: 4, upgradeable: true },
);
check(
  "a later-biome material locks the next level",
  lockedFor(
    {
      station: "Forge",
      stationLevel: 1,
      qualities: [[], [{ name: "Silver", quantity: 5 }]],
    },
    1,
    "black-forest",
  ),
  { level: 2, materials: [{ name: "Silver", quantity: 5, biome: "mountain" }] },
);
check(
  "a reachable material does not lock a level",
  lockedFor(
    {
      station: "Forge",
      stationLevel: 1,
      qualities: [[], [{ name: "Wood", quantity: 5 }]],
    },
    1,
    "black-forest",
  ),
  undefined,
);

/* --- new item classes --- */
const consumables = weapons.filter((w) => w.consumable);
check(
  "consumables exist and carry no weapon skill",
  consumables.length > 0 && consumables.every((w) => w.skillScaled === false),
  true,
);
check(
  "no ordinary weapon is marked skill-free",
  weapons.every((w) => w.consumable || w.skillScaled === undefined),
  true,
);
// Images are downloaded into public/items by the scraper and served locally,
// so assert the file really exists rather than just that a path was recorded.
const imageExists = (image: string) =>
  image.startsWith("/items/") && existsSync(join(ROOT, "public", image));

check(
  "every weapon has a local image and a wiki url",
  weapons.every((w) => imageExists(w.image) && w.wikiUrl.includes("/wiki/")),
  true,
);
check(
  "every ammo type has a local image",
  ammo.every((a) => imageExists(a.image)),
  true,
);
check(
  "every boss has a local image",
  bosses.every((b) => imageExists(b.image)),
  true,
);
check(
  "every creature has a local image and a wiki url",
  enemies.every((e) => imageExists(e.image) && e.wikiUrl.includes("/wiki/")),
  true,
);

/* --- shareable view URL (query-string codec) --- */
/* The codec is the only route a hand-edited or stale link takes into the app,
 * so pin both directions: a full view has to survive encode → parse unchanged,
 * and any value the datasets do not recognise has to be dropped, not trusted. */
/* The defaults a parsed (partial) view is merged over, exactly as page.tsx does
 * before mirroring the state back out. */
const defaultView: ViewState = {
  biome: "meadows",
  target: "eikthyr",
  weapon: null,
  cls: "all",
  level: 4,
  skill: 100,
  roll: "avg",
  attack: "primary",
  backstab: false,
  arrow: null,
  bolt: null,
};

const fullView: ViewState = {
  biome: "ashlands",
  target: "fader",
  weapon: "mistwalker",
  cls: "fists",
  level: 1,
  skill: 50,
  roll: "max",
  attack: "secondary",
  backstab: true,
  arrow: ammoItem("Carapace arrow").slug,
  bolt: ammoItem("Carapace bolt").slug,
};
const fullSearch = viewSearch(fullView);
check(
  "view URL: a full view round-trips through encode and parse",
  viewSearch({ ...defaultView, ...parseViewQuery(fullSearch) }),
  fullSearch,
);
const reparsed = parseViewQuery(fullSearch);
check(
  "view URL: the round-trip keeps every value",
  [
    reparsed.biome,
    reparsed.target,
    reparsed.weapon,
    reparsed.cls,
    reparsed.level,
    reparsed.skill,
    reparsed.roll,
    reparsed.attack,
    reparsed.backstab,
    reparsed.arrow,
    reparsed.bolt,
  ],
  [
    "ashlands",
    "fader",
    "mistwalker",
    "fists",
    1,
    50,
    "max",
    "secondary",
    true,
    ammoItem("Carapace arrow").slug,
    ammoItem("Carapace bolt").slug,
  ],
);

/* Defaults are omitted, so an untouched view stays short and links written
 * before these fields existed keep opening on the same numbers. */
check(
  "view URL: defaults are left out of the query string",
  viewSearch(defaultView),
  "biome=meadows&target=eikthyr",
);
check(
  "view URL: explicit defaults parse back to the same view",
  parseViewQuery(
    "?biome=meadows&target=eikthyr&level=4&skill=100&roll=avg&attack=primary",
  ),
  {
    biome: "meadows",
    target: "eikthyr",
    level: 4,
    skill: 100,
    roll: "avg",
    attack: "primary",
  },
);

/* Rejection: unknown enum values, unknown slugs and out-of-range numbers are
 * all dropped rather than trusted. */
check(
  "view URL: unknown biome, target, weapon and class are dropped",
  parseViewQuery(
    "?biome=atlantis&target=not-a-creature&weapon=not-a-weapon&class=laser",
  ),
  {},
);
check(
  "view URL: unknown roll, attack and ammo are dropped",
  parseViewQuery("?roll=extreme&attack=tertiary&arrow=rocket&bolt=rocket"),
  {},
);
check(
  "view URL: out-of-range level and skill are dropped",
  parseViewQuery("?level=9&skill=101"),
  {},
);
check(
  "view URL: non-numeric level and skill are dropped",
  parseViewQuery("?level=four&skill=half"),
  {},
);
check(
  "view URL: level and skill accept their bounds",
  parseViewQuery("?level=1&skill=0"),
  { level: 1, skill: 0 },
);
check(
  "view URL: class=all and both enemy states are understood",
  [
    parseViewQuery("?class=all").cls,
    parseViewQuery("?state=unalerted").backstab,
    parseViewQuery("?state=alerted").backstab,
  ],
  ["all", true, false],
);
check(
  "view URL: a chosen arrow and bolt are kept by slug",
  parseViewQuery(
    `?arrow=${ammoItem("Carapace arrow").slug}&bolt=${ammoItem("Carapace bolt").slug}`,
  ),
  {
    arrow: ammoItem("Carapace arrow").slug,
    bolt: ammoItem("Carapace bolt").slug,
  },
);

console.log(failures === 0 ? "\nAll engine checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
