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
for (const station of load('stations')) for (const m of station.materials ?? []) used.add(m.item);

// Known open mismatches (none since the VC-45c orchestrator fix for sharpening-stone).
const KNOWN_OPEN = new Set();

test('items.json and the compendium agree on the biome of every material used in a weapon, armor or station recipe', () => {
  assert.ok(used.size > 100);
  const mismatches = [];
  for (const id of used) {
    const item = items.get(id);
    const entry = compendium.get(id);
    if (!item || !entry) continue;
    if (KNOWN_OPEN.has(id)) {
      assert.notEqual(item.biome, entry.biome, `${id} no longer differs: drop it from KNOWN_OPEN`);
      continue;
    }
    if (item.biome !== entry.biome) mismatches.push(`${id}: items.json ${item.biome} != compendium ${entry.biome}`);
  }
  assert.deepEqual(mismatches, []);
});

test('the materials VC-45c added to items.json exist', () => {
  for (const id of ['sharpening-stone', 'mechanical-spring', 'asksvin-trophy']) assert.ok(items.has(id), id);
});
