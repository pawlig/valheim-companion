import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildArmourerBundle, hasCraftingCost, filterSmithyArmor } from './build-armourer-data.mjs';

test('Smithy keeps an item if any quality has a crafting cost', () => {
  assert.equal(hasCraftingCost({ levels: [{ materials: [] }, { materials: [{ item: 'wood', amount: 1 }] }] }), true);
  assert.equal(hasCraftingCost({ levels: [{ materials: [] }, {}] }), false);
  assert.equal(hasCraftingCost({}), false);
});

test('Smithy removes free crafting pieces and empty sets but keeps auxiliary sections', () => {
  const free = { id: 'free', levels: [{ materials: [] }] };
  const paid = { id: 'paid', levels: [{ materials: [{ item: 'wood', amount: 1 }] }] };
  const entries = [
    { id: 'mixed', biome: 'meadows', kind: 'set', pieces: [free, paid] },
    { id: 'empty', biome: 'meadows', kind: 'single', pieces: [free] },
    { id: 'cosmetic', biome: 'meadows', kind: 'cosmetic', pieces: [free] },
    { id: 'special', biome: 'meadows', kind: 'special', pieces: [free] },
    { id: 'trader', biome: null, kind: 'single', pieces: [free] },
  ];
  const filtered = filterSmithyArmor(entries);
  assert.deepEqual(filtered.map(entry => entry.id), ['mixed', 'cosmetic', 'special', 'trader']);
  assert.deepEqual(filtered[0].pieces, [paid]);
  assert.equal(entries[0].pieces.length, 2);
});

test('Smithy excludes Bare Fists while the Bestiary source retains it', () => {
  const source = JSON.parse(readFileSync('data/weapons.json', 'utf8'));
  const bundle = buildArmourerBundle();
  assert.ok(source.some(weapon => weapon.id === 'bare-fists'));
  assert.ok(!bundle.weapons.some(weapon => weapon.id === 'bare-fists'));
  assert.ok(bundle.weapons.every(hasCraftingCost));
  assert.ok(bundle.armor.filter(entry => entry.biome && !['cosmetic', 'special'].includes(entry.kind)).every(entry => entry.pieces.every(hasCraftingCost)));
  for (const entry of JSON.parse(readFileSync('data/armor.json', 'utf8'))) {
    if (!entry.biome || ['cosmetic', 'special'].includes(entry.kind)) {
      // The bundle adds the optional `traders` field to pieces a trader sells; everything else is unchanged.
      const built = bundle.armor.find(item => item.id === entry.id);
      assert.deepEqual({ ...built, pieces: built.pieces.map(({ traders, ...piece }) => piece) }, entry);
    }
  }
});
