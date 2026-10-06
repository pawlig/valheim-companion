// Tests for armor infobox, material list and quality table parsers
// over valheim.weirdgloop.org samples.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseAllInfoboxes,
  parseMaterialList,
  parseQualityTables,
  cleanText,
} from './wikitext.mjs';
import {
  resolvePieceName,
  parseTrophySource,
  parseConversionRecipe,
  resolveRecipeBiomes,
} from './fetch-armor.mjs';
import { buildArmourerBundle } from '../build-armourer-data.mjs';
import { statSync } from 'node:fs';
import path from 'node:path';

const SAMPLE_IRON_ARMOR = `{{InfoboxTabber
|Head|{{infobox armor
| title          = Iron Helmet
| image          = Iron helmet.png
| id             = HelmetIron
| type           = Head
| source         = [[Forge]]
| weight         = 3.0
| durability     = 1000
| crafting level = 1
| armor          = 14
| materials 1    = 
* 20 [[Iron]]
* 2 [[Deer Hide]]
| materials 2    = 
* 5 [[Iron]]
| materials 3    = 
* 10 [[Iron]]
| materials 4    = 
* 20 [[Iron]]
| movement speed = 
| set pieces     = 
}}
|Chest|{{infobox armor
| title          = Iron Scale Mail
| type           = Chest
| armor          = 14
| movement speed = -5%
| materials 1    = 
* 20 [[Iron]]
* 2 [[Deer Hide]]
}}
}}
=== Quality 2 ===
Durability per piece: 1200
{|class="wikitable" style="text-align:center;"
! colspan="2" | Armor piece !! Armor !! Upgrade cost<br>(Total cost) !! Weight !! Movement<br> speed !! Forge level<br> crafting !! Forge level<br> repairing
|-
| rowspan="1" colspan="2" | {{Item Link|Iron Helmet|size=64|nolink=1}}
| 16 || 5 (25) [[Iron]]<br>(2) [[Deer Hide]] || 3 || || 2 || 1
|-
| rowspan="1" colspan="2" | '''Full set''' 
| 48 || 15 (75) [[Iron]]<br>(6) [[Deer Hide]] || 33 || -10% || 3 || 2
|}`;

const SAMPLE_TROLL_SET = `{{infobox armor
| title          = Troll Leather Helmet
| materials 1    = 
* 5 [[Troll Hide]]
* 3 [[Bone Fragments]]
| armor          = 6
| set pieces     = Troll Set (4 pieces)
| set effect     = [[Sneaky]]
* Sneak skill +15
}}`;

const SAMPLE_PROTECTOR_ARMOR = `{{InfoboxTabber
|Armor|
{{InfoboxTabber
|Head|{{infobox armor
| title          = Helmet of the Protector
| type           = Head
| source         = [[Frost Foundry]]
| armor          = 44
| materials 1    = 
* [[Cast Helmet of the Protector]] x1
* [[Liquid Frost]] x5 (Fuel)
| materials 2    = 
* [[Bloodgold]] x15
* [[Moose Hide]] x3
| movement speed = 0%
}}
}}
}}`;

const SAMPLE_FENRIS = `{{infobox armor
| title          = Fenris Hood
| movement speed = +3%
| set pieces     = Fenris Set (3 pieces)
| set effect     = [[Fenris blessing]]
* [[Fists (skill)|Fists]] +15
* Resistant (0.5x) VS [[Fire]]
}}`;

test('parseAllInfoboxes finds multiple blocks in {{InfoboxTabber}}', () => {
  const boxes = parseAllInfoboxes(SAMPLE_IRON_ARMOR, 'armor');
  assert.equal(boxes.length, 2, 'should find both Head and Chest armor infoboxes');

  const [head, chest] = boxes;
  assert.equal(head.title, 'Iron Helmet');
  assert.equal(head.type, 'Head');
  assert.equal(head.id, 'HelmetIron');
  assert.equal(head.source, '[[Forge]]');
  assert.equal(head.armor, '14');
  assert.equal(head.durability, '1000');
  assert.equal(head['crafting level'], '1');

  assert.equal(chest.title, 'Iron Scale Mail');
  assert.equal(chest.type, 'Chest');
  assert.equal(chest.armor, '14');
  assert.equal(chest['movement speed'], '-5%');
});

test('parseAllInfoboxes handles nested {{InfoboxTabber}} (Protector Armor)', () => {
  const boxes = parseAllInfoboxes(SAMPLE_PROTECTOR_ARMOR, 'armor');
  assert.equal(boxes.length, 1, 'should find infobox in nested tabber');
  assert.equal(boxes[0].title, 'Helmet of the Protector');
  assert.equal(boxes[0].type, 'Head');
  assert.equal(boxes[0].source, '[[Frost Foundry]]');
  assert.equal(boxes[0].armor, '44');
  assert.equal(boxes[0]['movement speed'], '0%');
});

test('parseAllInfoboxes handles single infoboxes with set effects', () => {
  const troll = parseAllInfoboxes(SAMPLE_TROLL_SET, 'armor');
  assert.equal(troll.length, 1);
  assert.equal(troll[0].title, 'Troll Leather Helmet');
  assert.equal(troll[0]['set pieces'], 'Troll Set (4 pieces)');
  assert.match(troll[0]['set effect'], /Sneaky/);

  const fenris = parseAllInfoboxes(SAMPLE_FENRIS, 'armor');
  assert.equal(fenris.length, 1);
  assert.equal(fenris[0]['set pieces'], 'Fenris Set (3 pieces)');
  assert.equal(fenris[0]['movement speed'], '+3%');
  assert.match(fenris[0]['set effect'], /Fenris blessing/);
});

test('parseMaterialList parses "* 20 [[Iron]]" format', () => {
  const mats = parseMaterialList('* 20 [[Iron]]\n* 2 [[Deer Hide]]');
  assert.deepEqual(mats, [
    { name: 'Iron', amount: 20, fuel: false },
    { name: 'Deer Hide', amount: 2, fuel: false },
  ]);
});

test('parseMaterialList parses "* [[Bronze]] x2" format', () => {
  const mats = parseMaterialList('* [[Bronze]] x2');
  assert.deepEqual(mats, [
    { name: 'Bronze', amount: 2, fuel: false },
  ]);
});

test('parseMaterialList parses multiple bullet items on one line', () => {
  const mats = parseMaterialList('* [[Copper]] x2 * [[Tin]] x1');
  assert.deepEqual(mats, [
    { name: 'Copper', amount: 2, fuel: false },
    { name: 'Tin', amount: 1, fuel: false },
  ]);
});

test('parseMaterialList parses fuel flag and single items', () => {
  const mats = parseMaterialList('* [[Cast Helmet of the Protector]] x1\n* [[Liquid Frost]] x5 (Fuel)');
  assert.deepEqual(mats, [
    { name: 'Cast Helmet of the Protector', amount: 1, fuel: false },
    { name: 'Liquid Frost', amount: 5, fuel: true },
  ]);

  const single = parseMaterialList('* [[Flax]]');
  assert.deepEqual(single, [
    { name: 'Flax', amount: 1, fuel: false },
  ]);
});

test('parseMaterialList handles Troll Set materials', () => {
  const mats = parseMaterialList('* 5 [[Troll Hide]]\n* 3 [[Bone Fragments]]');
  assert.deepEqual(mats, [
    { name: 'Troll Hide', amount: 5, fuel: false },
    { name: 'Bone Fragments', amount: 3, fuel: false },
  ]);
});

test('parseQualityTables extracts quality, durability, armor, and stationLevel', () => {
  const qTables = parseQualityTables(SAMPLE_IRON_ARMOR);
  assert.ok(qTables.has(2), 'should have quality 2');

  const q2Map = qTables.get(2);
  assert.ok(q2Map.has('Iron Helmet'), 'should contain Iron Helmet');

  const helmet = q2Map.get('Iron Helmet');
  assert.equal(helmet.armor, 16, 'Iron Helmet armor should be 16');
  assert.equal(helmet.durability, 1200, 'durability per piece should be 1200');
  assert.equal(helmet.stationLevel, 2, 'crafting forge level should be 2');

  // Full set row must be skipped
  assert.equal(q2Map.has('Full set'), false, 'Full set row must be skipped');
  assert.equal(q2Map.has('Full Set'), false);
});

test('resolvePieceName falls back to page title on {{PAGENAME}} or empty title', () => {
  assert.equal(resolvePieceName('{{PAGENAME}}', 'Pointy Hat'), 'Pointy Hat');
  assert.equal(resolvePieceName('', 'Pointy Hat'), 'Pointy Hat');
  assert.equal(resolvePieceName(null, 'Pointy Hat'), 'Pointy Hat');
  assert.equal(resolvePieceName('Iron Helmet', 'Iron Helmet'), 'Iron Helmet');
  assert.equal(resolvePieceName('Deer Hide Cape', 'Leather Armor'), 'Deer Hide Cape');
});

test('parseTrophySource finds matching creature for trophy items', () => {
  const creatures = [
    { id: 'wolf', name: 'Wolf', biomes: ['mountain'] },
    { id: 'bear', name: 'Bear', biomes: ['black-forest'] },
  ];
  const bySlug = new Map(creatures.map((c) => [c.id, c]));
  const byName = new Map(creatures.map((c) => [c.name.toLowerCase(), c]));

  const wolfSrc = parseTrophySource('Wolf Trophy', creatures, byName, bySlug);
  assert.deepEqual(wolfSrc, {
    text: 'Wolf',
    kind: 'creature',
    creatureId: 'wolf',
    biomes: ['mountain'],
  });

  const bearSrc = parseTrophySource('Bear Trophy', creatures, byName, bySlug);
  assert.deepEqual(bearSrc, {
    text: 'Bear',
    kind: 'creature',
    creatureId: 'bear',
    biomes: ['black-forest'],
  });

  assert.equal(parseTrophySource('Iron', creatures, byName, bySlug), null);
  assert.equal(parseTrophySource('Unknown Trophy', creatures, byName, bySlug), null);
});

test('parseConversionRecipe extracts input item, amount and station', () => {
  const wt = '* {{Item link|Ice|5}} can be converted to 1 Liquid Frost at a [[Frigid Kiln]] every 30 seconds.';
  const recipe = parseConversionRecipe(wt, 'Liquid Frost', [{ text: 'Frigid Kiln', kind: 'station' }]);
  assert.deepEqual(recipe, {
    station: 'Frigid Kiln',
    materials: [{ name: 'Ice', amount: 5 }],
    yields: 1,
  });
});

test('resolveRecipeBiomes assigns max tier and biome from recipe materials', () => {
  const items = [
    { id: 'ice', name: 'Ice', biome: 'deep-north', tier: 8, recipe: null },
    {
      id: 'liquid-frost',
      name: 'Liquid Frost',
      biome: null,
      tier: null,
      recipe: {
        station: 'Frigid Kiln',
        materials: [{ item: 'ice', amount: 5 }],
        yields: 1,
      },
    },
    {
      id: 'mystery-brew',
      name: 'Mystery Brew',
      biome: null,
      tier: null,
      recipe: {
        station: 'Cauldron',
        materials: [{ item: 'unknown-herb', amount: 1 }],
        yields: 1,
      },
    },
  ];

  resolveRecipeBiomes(items);

  const lf = items.find((i) => i.id === 'liquid-frost');
  assert.equal(lf.biome, 'deep-north');
  assert.equal(lf.tier, 8);

  const mb = items.find((i) => i.id === 'mystery-brew');
  assert.equal(mb.biome, null);
  assert.equal(mb.tier, null);
});

test('buildArmourerBundle uses deterministic generatedAt from data/armor.json mtime', () => {
  const stat = statSync(path.join(process.cwd(), 'data', 'armor.json'));
  const bundle = buildArmourerBundle();
  assert.equal(bundle.generatedAt, stat.mtime.toISOString());
});

