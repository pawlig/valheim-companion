import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// VC-45c, Pavel VC44/Q-7: the biome of a material must not depend on which
// catalog is read. Fix the source (scripts/wiki/materials.mjs + data/overrides.json);
// the compendium inherits it.
const load = (name) => JSON.parse(readFileSync(new URL(`../data/${name}.json`, import.meta.url), 'utf8'));
const items = new Map(load('items').map((item) => [item.id, item]));
const compendium = new Map(load('items-compendium').items.map((item) => [item.id, item]));

const used = new Set();
for (const weapon of load('weapons')) for (const level of weapon.levels) for (const m of level.materials) used.add(m.item);
for (const set of load('armor')) for (const piece of set.pieces) for (const level of piece.levels) for (const m of level.materials) used.add(m.item);
const foods = load('food');
const stations = load('stations');
for (const station of stations) {
  for (const m of station.materials ?? []) used.add(m.item);
  for (const id of station.unlock?.materials ?? []) used.add(id);
}
for (const food of foods) for (const m of food.materials ?? []) used.add(m.item);
for (const mead of load('meads')) for (const m of mead.base?.materials ?? []) used.add(m.item);

// Named exceptions (id -> why), kept only while the id is still missing or still differs. Empty since VC-45c2.
const KNOWN_OPEN = new Set();


test('items.json and the compendium agree on the biome of every material used in a weapon, armor, station, food or mead recipe', () => {
  assert.ok(used.size > 100);
  const mismatches = [];
  for (const id of used) {
    const item = items.get(id);
    const entry = compendium.get(id);
    if (KNOWN_OPEN.has(id)) {
      // An exception must stay necessary: it is still missing somewhere or still differs.
      assert.ok(!item || !entry || item.biome !== entry.biome, `${id} no longer needs the exception: drop it from KNOWN_OPEN`);
      continue;
    }
    if (!item || !entry) {
      mismatches.push(`${id}: missing in ${!item ? 'items.json' : 'the compendium'}`);
      continue;
    }
    if (item.biome !== entry.biome) mismatches.push(`${id}: items.json ${item.biome} != compendium ${entry.biome}`);
  }
  assert.deepEqual(mismatches, []);
});

test('the materials VC-45c added to items.json exist', () => {
  for (const id of ['sharpening-stone', 'mechanical-spring', 'asksvin-trophy']) assert.ok(items.has(id), id);
});

// Foods without a biome in food.json (console-only): the compendium keeps the biome of the item itself.
const FOOD_WITHOUT_BIOME = new Set(['blue-mushroom']);

test('the compendium takes the biome of every food from data/food.json', () => {
  assert.ok(foods.length > 50);
  const mismatches = [];
  for (const food of foods) {
    const entry = compendium.get(food.id);
    if (FOOD_WITHOUT_BIOME.has(food.id)) {
      assert.equal(food.biome, null, `${food.id} now has a biome in food.json: drop it from FOOD_WITHOUT_BIOME`);
      continue;
    }
    if (!entry) mismatches.push(`${food.id}: missing in the compendium`);
    else if (entry.biome !== food.biome) mismatches.push(`${food.id}: food.json ${food.biome} != compendium ${entry.biome}`);
  }
  assert.deepEqual(mismatches, []);
});

test('the materials VC-45c2 fixed have the biome of their unlock condition', () => {
  const expected = {
    'fiery-spice-powder': 'ashlands', 'woodland-herb-blend': 'black-forest', 'mountain-peak-pepper-powder': 'mountain',
    'herbs-of-the-hidden-hills': 'mistlands', 'grasslands-herbalist-harvest': 'plains', 'seafarer-s-herbs': 'ocean',
    egg: 'plains', 'majestic-carapace': 'mistlands',
  };
  for (const [id, biome] of Object.entries(expected)) {
    assert.equal(items.get(id)?.biome, biome, `items.json ${id}`);
    assert.equal(compendium.get(id)?.biome, biome, `compendium ${id}`);
  }
});
