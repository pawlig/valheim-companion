import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const context = vm.createContext({});
context.window = context;
for (const file of ['apps/provisions/data/data.js', 'apps/provisions/assets/advisor.js', 'apps/provisions/assets/planner.js', 'apps/smithy/data/data.js', 'apps/items/data/data.js', 'apps/hub/data/search.js']) {
  vm.runInContext(readFileSync(file, 'utf8'), context);
}
const { VPPlanner: planner, VPR_DATA: data, VA_DATA: smithy, VC_ITEMS_DATA: itemsData } = context;
const target = (id, biomes) => JSON.parse(JSON.stringify(planner.itemTarget(id, data, biomes)));

test('Provisions item links target food, mead or their locked biome without changing progress', () => {
  const biomes = ['meadows'];
  assert.deepEqual(target('raspberries', biomes), { kind: 'card', id: 'raspberries' });
  assert.deepEqual(target('oats', biomes), { kind: 'locked-biome', id: 'deep-north' });
  assert.deepEqual(target('carrot', biomes), { kind: 'locked-biome', id: 'black-forest' });
  assert.deepEqual(target('oats', ['deep-north']), { kind: 'card', id: 'oats' });
  const mead = data.meads.find(item => item.id === 'poison-resistance-mead');
  const biome = context.VPAdvisor.availableBiome(mead);
  assert.deepEqual(target(mead.id, []), { kind: 'locked-biome', id: biome });
  assert.deepEqual(target(mead.id, [biome]), { kind: 'card', id: mead.id });
  assert.deepEqual(target('missing-item', biomes), { kind: 'none', id: null });
  assert.deepEqual(target('"[]', biomes), { kind: 'none', id: null });
  assert.deepEqual(biomes, ['meadows']);
});

test('every material search URL targets Items Compendium and resolves to an item in VC_ITEMS_DATA', () => {
  const itemIds = new Set(itemsData.items.map(item => item.id));
  const materials = context.VC_SEARCH_INDEX.filter(item => item.type === 'material');
  assert.ok(materials.length > 50, 'material count in search index');
  for (const m of materials) {
    assert.ok(m.url.startsWith('/items/#item='), `URL ${m.url} should start with /items/#item=`);
    const id = decodeURIComponent(m.url.split('=')[1]);
    assert.ok(itemIds.has(id), `Target item ${id} should exist in VC_ITEMS_DATA`);
  }
});

