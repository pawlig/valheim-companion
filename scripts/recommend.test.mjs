import test from 'node:test';
import assert from 'node:assert/strict';

import {
  effectiveModifiers,
  score,
  rawDamage,
  buildNotes,
  rangedScore,
  recommendFor,
  skillFactor,
  effectiveSkill,
  weaponDamage,
  perHit,
  creatureHp,
  DEFAULT_PLAYER,
  DIFFICULTY,
  SET_BONUSES,
} from './recommend.mjs';

test('score: weapon with fire 10 against veryweak fire (mult 2) scores 20', () => {
  const damage = { fire: 10 };
  const mods = { fire: 2 };
  assert.equal(score(damage, mods), 20);
});

test('effectiveModifiers: spirit defaults to 0 when not specified', () => {
  const creature = { modifiers: {} };
  const mods = effectiveModifiers(creature);
  assert.equal(mods.spirit, 0);
});

test('effectiveModifiers: blunt, slash, pierce default to 1', () => {
  const creature = { modifiers: {} };
  const mods = effectiveModifiers(creature);
  assert.equal(mods.blunt, 1);
  assert.equal(mods.slash, 1);
  assert.equal(mods.pierce, 1);
});

test('effectiveModifiers: chop and pickaxe default to 0', () => {
  const creature = { modifiers: {} };
  const mods = effectiveModifiers(creature);
  assert.equal(mods.chop, 0);
  assert.equal(mods.pickaxe, 0);
});

test('effectiveModifiers: applies ModTier strings correctly', () => {
  const creature = {
    modifiers: {
      fire: 'veryweak',
      frost: 'weak',
      lightning: 'neutral',
      poison: 'resistant',
      blunt: 'veryresistant',
      spirit: 'immune',
    },
  };
  const mods = effectiveModifiers(creature);
  assert.equal(mods.fire, 2);
  assert.equal(mods.frost, 1.5);
  assert.equal(mods.lightning, 1);
  assert.equal(mods.poison, 0.5);
  assert.equal(mods.blunt, 0.25);
  assert.equal(mods.spirit, 0);
});

test('tier filter: recommendFor does not recommend weapons of higher tier than biome.gearTier', () => {
  const creature = { id: 'test-creature', modifiers: {} };
  const biome = { id: 'meadows', gearTier: 1 };
  const weapons = [
    {
      id: 'club',
      name: 'Club',
      category: 'club',
      tier: 1,
      damageMax: { blunt: 12 },
    },
    {
      id: 'bronze-mace',
      name: 'Bronze Mace',
      category: 'club',
      tier: 2,
      damageMax: { blunt: 35 },
    },
    {
      id: 'iron-mace',
      name: 'Iron Mace',
      category: 'club',
      tier: 3,
      damageMax: { blunt: 55 },
    },
  ];

  const rec = recommendFor(creature, biome, weapons);
  assert.equal(rec.melee.length, 1);
  assert.equal(rec.melee[0].weapon, 'club');
});

test('melee diversity: top 3 melee weapons come from distinct categories', () => {
  const creature = { id: 'test-creature', modifiers: {} };
  const biome = { id: 'black-forest', gearTier: 2 };
  const weapons = [
    { id: 'sword-1', name: 'Sword A', category: 'sword', tier: 2, damageMax: { slash: 50 } },
    { id: 'sword-2', name: 'Sword B', category: 'sword', tier: 2, damageMax: { slash: 45 } },
    { id: 'club-1', name: 'Club A', category: 'club', tier: 2, damageMax: { blunt: 40 } },
    { id: 'spear-1', name: 'Spear A', category: 'spear', tier: 2, damageMax: { pierce: 35 } },
    { id: 'axe-1', name: 'Axe A', category: 'axe', tier: 2, damageMax: { slash: 30 } },
  ];

  const rec = recommendFor(creature, biome, weapons);
  assert.equal(rec.melee.length, 3);
  const categories = rec.melee.map((m) => weapons.find((w) => w.id === m.weapon).category);
  const uniqueCats = new Set(categories);
  assert.equal(uniqueCats.size, 3);
  assert.deepEqual(categories, ['sword', 'club', 'spear']);
});

test('pickaxe candidacy: pickaxes are excluded when creature pickaxe multiplier is 0', () => {
  const creature = { id: 'boar', modifiers: {} };
  const biome = { id: 'meadows', gearTier: 1 };
  const weapons = [
    { id: 'antler-pickaxe', name: 'Antler Pickaxe', category: 'pickaxe', tier: 1, damageMax: { pickaxe: 20 } },
    { id: 'club', name: 'Club', category: 'club', tier: 1, damageMax: { blunt: 12 } },
  ];

  const rec = recommendFor(creature, biome, weapons);
  const ids = rec.melee.map((m) => m.weapon);
  assert.ok(!ids.includes('antler-pickaxe'));
  assert.ok(ids.includes('club'));
});

test('pickaxe candidacy: pickaxes are included when creature has pickaxe multiplier > 0', () => {
  const golem = { id: 'stone-golem', modifiers: { pickaxe: 'veryweak', blunt: 'neutral', slash: 'resistant' } };
  const biome = { id: 'mountain', gearTier: 4 };
  const weapons = [
    { id: 'bronze-pickaxe', name: 'Bronze Pickaxe', category: 'pickaxe', tier: 2, damageMax: { pickaxe: 37, pierce: 25 } },
    { id: 'iron-sword', name: 'Iron Sword', category: 'sword', tier: 3, damageMax: { slash: 55 } },
  ];

  const rec = recommendFor(golem, biome, weapons);
  assert.equal(rec.melee[0].weapon, 'bronze-pickaxe');
});

test('rangedScore: combines launcher pierce and arrow elements correctly', () => {
  const bow = { damageMax: { pierce: 32 } };
  const arrow = { damageMax: { pierce: 11, fire: 22 } };
  const mods = { pierce: 1, fire: 2 };

  // (32 + 11) * 1 + 22 * 2 = 43 + 44 = 87
  const scoreVal = rangedScore(bow, arrow, mods);
  assert.equal(scoreVal, 87);
});

test('tip formatting: weak elemental generates weakness tip and appends immunity', () => {
  const creature = {
    id: 'greydwarf',
    modifiers: { fire: 'veryweak', spirit: 'immune' },
  };
  const biome = { id: 'black-forest', gearTier: 2 };
  const weapons = [
    { id: 'bronze-sword', name: 'Bronze Sword', category: 'sword', tier: 2, damageMax: { slash: 35 } },
    { id: 'finewood-bow', name: 'Finewood Bow', category: 'bow', tier: 2, damageMax: { pierce: 32 } },
    { id: 'fire-arrow', name: 'Fire Arrow', category: 'arrow', tier: 1, damageMax: { pierce: 11, fire: 22 } },
  ];

  const rec = recommendFor(creature, biome, weapons);
  assert.match(rec.tip, /^Very weak to Fire \(×2\): Fire Arrow hits for 87 effective\./);
  assert.match(rec.tip, /Immune to Spirit\.$/);
});

test('tip formatting: no elemental weakness falls back to best raw melee', () => {
  const creature = { id: 'dummy', modifiers: {} };
  const biome = { id: 'meadows', gearTier: 1 };
  const weapons = [
    { id: 'flint-axe', name: 'Flint Axe', category: 'axe', tier: 1, damageMax: { slash: 20 } },
    { id: 'club', name: 'Club', category: 'club', tier: 1, damageMax: { blunt: 12 } },
  ];

  const rec = recommendFor(creature, biome, weapons);
  assert.equal(rec.tip, 'No elemental weakness — best raw option: Flint Axe (20).');
});

test('tie-breaking: prefers lower tier, then alphabetical name on score tie', () => {
  const creature = { id: 'dummy', modifiers: {} };
  const biome = { id: 'swamp', gearTier: 3 };
  const weapons = [
    { id: 'sword-t3', name: 'Sword HighTier', category: 'sword', tier: 3, damageMax: { slash: 30 } },
    { id: 'club-t1', name: 'Club LowTier', category: 'club', tier: 1, damageMax: { blunt: 30 } },
    { id: 'spear-t1-b', name: 'Spear B', category: 'spear', tier: 1, damageMax: { pierce: 30 } },
    { id: 'spear-t1-a', name: 'Spear A', category: 'spear', tier: 1, damageMax: { pierce: 30 } },
  ];

  const rec = recommendFor(creature, biome, weapons);
  // Tier 1 weapons win over Tier 3 on equal score 30
  assert.equal(rec.melee[0].weapon, 'club-t1');
  assert.equal(rec.melee[1].weapon, 'spear-t1-a');
  assert.equal(rec.melee[2].weapon, 'sword-t3');
});

test('tool damage: chop and pickaxe excluded from raw and notes when multiplier is 0', () => {
  const draugr = { modifiers: { fire: 'resistant', poison: 'immune' } };
  const mods = effectiveModifiers(draugr);
  const battleaxeDamage = { slash: 70, chop: 40 };

  // rawDamage should exclude chop because mods.chop is 0
  assert.equal(rawDamage(battleaxeDamage, mods), 70);

  // buildNotes should exclude chop because mods.chop is 0
  const notes = buildNotes(battleaxeDamage, mods);
  assert.deepEqual(notes, []);
});

test('tool damage: pickaxe included in raw and notes when multiplier > 0', () => {
  const golem = { modifiers: { pickaxe: 'veryweak', blunt: 'neutral', slash: 'resistant', pierce: 'resistant' } };
  const mods = effectiveModifiers(golem);
  const pickaxeDamage = { pickaxe: 37, pierce: 25 };

  // rawDamage should include pickaxe (37 + 25 = 62)
  assert.equal(rawDamage(pickaxeDamage, mods), 62);

  // buildNotes should include "×2 Pickaxe"
  const notes = buildNotes(pickaxeDamage, mods);
  assert.ok(notes.includes('×2 Pickaxe'));
  assert.ok(notes.includes('×0.5 Pierce'));
});

test('tip formatting: finds pickaxe weakness and excludes chop/pickaxe from immunities', () => {
  const golem = {
    id: 'stone-golem',
    modifiers: {
      pickaxe: 'veryweak',
      blunt: 'neutral',
      slash: 'resistant',
      pierce: 'resistant',
      fire: 'immune',
      frost: 'immune',
      poison: 'immune',
      spirit: 'immune',
    },
  };
  const biome = { id: 'mountain', gearTier: 4 };
  const weapons = [
    {
      id: 'bronze-pickaxe',
      name: 'Bronze Pickaxe',
      category: 'pickaxe',
      tier: 2,
      damageMax: { pickaxe: 37, pierce: 25 },
    },
    {
      id: 'iron-mace',
      name: 'Iron Mace',
      category: 'club',
      tier: 3,
      damageMax: { blunt: 55 },
    },
  ];

  const rec = recommendFor(golem, biome, weapons);
  assert.equal(
    rec.tip,
    'Very weak to Pickaxe (×2): Bronze Pickaxe hits for 87 effective. Immune to Fire, Frost, Poison, Spirit.'
  );
  assert.ok(!rec.tip.includes('Chop'));
  assert.ok(!rec.tip.includes('Immune to Pickaxe'));
});

test('ineffective recommendations: drops magic and bomb when score < 0.5 * raw', () => {
  const fireResistant = {
    id: 'fire-resistant-creature',
    modifiers: { fire: 'veryresistant', blunt: 'veryresistant' },
  };
  const biome = { id: 'ashlands', gearTier: 7 };
  const weapons = [
    {
      id: 'staff-of-embers',
      name: 'Staff of Embers',
      category: 'magic',
      tier: 6,
      damageMax: { blunt: 10, fire: 100 },
    },
    {
      id: 'test-bomb',
      name: 'Heavy Bomb',
      category: 'bomb',
      tier: 6,
      damageMax: { blunt: 100 },
    },
  ];

  const rec = recommendFor(fireResistant, biome, weapons);
  // score for staff: 10*0.25 + 100*0.25 = 2.5 + 25 = 28. raw = 110. 28 < 0.5 * 110 -> null
  assert.equal(rec.magic, null);
  // score for bomb: 100*0.25 = 25. raw = 100. 25 < 50 -> null
  assert.equal(rec.bomb, null);
});

test('ineffective recommendations: filters out arrows and bolts with score < 0.5 * raw', () => {
  const pierceResistant = {
    id: 'bonemass',
    modifiers: { pierce: 'veryresistant' },
  };
  const biome = { id: 'swamp', gearTier: 3 };
  const weapons = [
    {
      id: 'finewood-bow',
      name: 'Finewood Bow',
      category: 'bow',
      tier: 2,
      damageMax: { pierce: 32 },
    },
    {
      id: 'ironhead-arrow',
      name: 'Ironhead Arrow',
      category: 'arrow',
      tier: 3,
      damageMax: { pierce: 42 },
    },
    {
      id: 'arbalest',
      name: 'Arbalest',
      category: 'crossbow',
      tier: 3,
      damageMax: { pierce: 200 },
    },
    {
      id: 'iron-bolt',
      name: 'Iron Bolt',
      category: 'bolt',
      tier: 3,
      damageMax: { pierce: 42 },
    },
  ];

  const rec = recommendFor(pierceResistant, biome, weapons);
  // All arrows and bolts have pierce only, mods.pierce is 0.25, score < 0.5 * raw
  assert.deepEqual(rec.arrows, []);
  assert.deepEqual(rec.bolts, []);
});

test('recommendFor end-to-end: draugr in swamp has battleaxe raw 70 and empty notes', () => {
  const draugr = {
    id: 'draugr',
    modifiers: { fire: 'resistant', poison: 'immune' },
  };
  const biome = { id: 'swamp', gearTier: 3 };
  const weapons = [
    {
      id: 'battleaxe',
      name: 'Battleaxe',
      category: 'battleaxe',
      tier: 3,
      damageMax: { slash: 70, chop: 40 },
    },
  ];

  const rec = recommendFor(draugr, biome, weapons);
  assert.equal(rec.melee[0].weapon, 'battleaxe');
  assert.equal(rec.melee[0].raw, 70);
  assert.deepEqual(rec.melee[0].notes, []);
});

test('skillFactor: exact values at L0, L50, L75, and L100', () => {
  assert.deepEqual(skillFactor(0), { min: 0.25, max: 0.55, avg: 0.40 });
  assert.deepEqual(skillFactor(50), { min: 0.55, max: 0.85, avg: 0.70 });
  assert.deepEqual(skillFactor(75), { min: 0.70, max: 1.0, avg: 0.85 });
  assert.deepEqual(skillFactor(100), { min: 0.85, max: 1.0, avg: 0.925 });
});

test('effectiveSkill: root set raises Bows from 90 to capped 100, not 105', () => {
  const player = { ...DEFAULT_PLAYER, skills: { bows: 90 }, sets: ['root'] };
  assert.equal(effectiveSkill(player, 'bows'), 100);
  assert.notEqual(effectiveSkill(player, 'bows'), 105);
});

test('difficulty: veryhard multiplies player damage by 0.7', () => {
  const creature = { modifiers: {} };
  const weapon = { category: 'sword', skill: 'swords', damage: { slash: 100 } };
  const playerNormal = { ...DEFAULT_PLAYER, difficulty: 'normal' };
  const playerVeryHard = { ...DEFAULT_PLAYER, difficulty: 'veryhard' };
  const hitNormal = perHit(weapon, null, creature, playerNormal);
  const hitVeryHard = perHit(weapon, null, creature, playerVeryHard);
  assert.ok(Math.abs(hitVeryHard.avg / hitNormal.avg - 0.7) < 1e-9);
});

test('creatureHp: 3 players -> HP x 1.6, 9 players -> HP x 2.2', () => {
  const creature = { stars: [{ star: 0, health: 100 }] };
  const hp1 = creatureHp(creature, 0, 'meadows', { players: 1 });
  const hp3 = creatureHp(creature, 0, 'meadows', { players: 3 });
  const hp9 = creatureHp(creature, 0, 'meadows', { players: 9 });
  assert.equal(hp1, 100);
  assert.equal(hp3, 160);
  assert.equal(hp9, 220);
});

test('sneak: attack with knife having backstab 6 multiplies damage by 6', () => {
  const creature = { modifiers: {} };
  const knife = { category: 'knife', skill: 'knives', backstab: 6, damage: { slash: 50 } };
  const playerNormal = { ...DEFAULT_PLAYER, sneak: false };
  const playerSneak = { ...DEFAULT_PLAYER, sneak: true };
  const hitNormal = perHit(knife, null, creature, playerNormal);
  const hitSneak = perHit(knife, null, creature, playerSneak);
  assert.equal(hitSneak.avg, hitNormal.avg * 6);
});

test('staggered: staggered target doubles damage (x2)', () => {
  const creature = { modifiers: {} };
  const weapon = { category: 'club', skill: 'clubs', damage: { blunt: 50 } };
  const playerNormal = { ...DEFAULT_PLAYER, staggered: false };
  const playerStaggered = { ...DEFAULT_PLAYER, staggered: true };
  const hitNormal = perHit(weapon, null, creature, playerNormal);
  const hitStaggered = perHit(weapon, null, creature, playerStaggered);
  assert.equal(hitStaggered.avg, hitNormal.avg * 2);
});

test('quality: weaponDamage and perHit scale from quality 1 to max', () => {
  const frostner = {
    category: 'club',
    skill: 'clubs',
    maxQuality: 4,
    damage: { blunt: 35, frost: 40, spirit: 20 },
    perLevel: { frost: 6, blunt: 0 },
    damageMax: { blunt: 35, frost: 58, spirit: 20 },
  };
  const d1 = weaponDamage(frostner, 1);
  const dMax = weaponDamage(frostner, 'max');
  assert.equal(d1.frost, 40);
  assert.equal(dMax.frost, 58);

  const creature = { modifiers: {} };
  const player1 = { ...DEFAULT_PLAYER, quality: 1 };
  const playerMax = { ...DEFAULT_PLAYER, quality: 'max' };
  const hit1 = perHit(frostner, null, creature, player1);
  const hitMax = perHit(frostner, null, creature, playerMax);
  assert.equal(hit1.raw, 75);
  assert.equal(hitMax.raw, 93);
  assert.ok(hitMax.avg > hit1.avg);
});

test('Greydwarf against Fire Arrow: ratio of avg at Bows 0 vs 100 is 0.40 / 0.925', () => {
  const greydwarf = {
    modifiers: { fire: 'veryweak', spirit: 'immune' },
  };
  const bow = {
    category: 'bow',
    skill: 'bows',
    maxQuality: 1,
    damage: { pierce: 32 },
  };
  const arrow = {
    category: 'arrow',
    skill: 'bows',
    maxQuality: 1,
    damage: { pierce: 11, fire: 22 },
  };
  const player0 = {
    ...DEFAULT_PLAYER,
    skills: { bows: 0 },
  };
  const player100 = {
    ...DEFAULT_PLAYER,
    skills: { bows: 100 },
  };
  const hit0 = perHit(bow, arrow, greydwarf, player0);
  const hit100 = perHit(bow, arrow, greydwarf, player100);
  assert.ok(Math.abs(hit0.avg / hit100.avg - 0.40 / 0.925) < 1e-9);
});
