import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const context = vm.createContext({ console });
vm.runInContext(readFileSync('shared/shopping/core.js', 'utf8'), context);
vm.runInContext(readFileSync('apps/smithy/assets/app.js', 'utf8'), context);
const core = context.VCShopping;
const plain = value => JSON.parse(JSON.stringify(value));
const armor = JSON.parse(readFileSync('data/armor.json'));
const items = Object.fromEntries(JSON.parse(readFileSync('data/items.json')).map(item => [item.id, item]));
const iron = armor.find(a => a.id === 'iron-armor');
const definitions = Object.fromEntries(iron.pieces.map(p => [p.id, p]));
const lines = iron.pieces.map(p => ({ pieceId: p.id, have: 0, want: 4 }));

test('Iron Armor Q4 costs 165 Iron and 6 Deer Hide through both shared core and Smithy', () => {
  const result = core.sumMaterials(lines, definitions);
  assert.equal(result.find(m => m.item === 'iron').amount, 165);
  assert.equal(result.find(m => m.item === 'deer-hide').amount, 6);
  const smithy = context.VACart.calculateCartMaterials(lines, { armor, items, biomes: [] }, {});
  assert.equal(smithy.materials.find(m => m.item === 'iron').amount, 165);
  assert.equal(smithy.materials.find(m => m.item === 'deer-hide').amount, 6);
  const expanded = core.breakdown(result, items);
  assert.ok(expanded.steps.some(s => s.text === 'Smelt 165× Iron at Smelter'));
  assert.equal(expanded.materials.find(m => m.item === 'scrap-iron').amount, 165);
});
test('Have/Want consumes only upgrades and repeats quantities without mutation', () => {
  const before = JSON.stringify(definitions);
  const result = core.sumMaterials([{ pieceId: iron.pieces[0].id, have: 1, want: 4, quantity: 2 }], definitions);
  assert.equal(result.find(m => m.item === 'iron').amount, 70);
  assert.equal(JSON.stringify(definitions), before);
  assert.deepEqual(plain(core.sumMaterials([{ pieceId: 'missing' }], definitions)), []);
});
test('batch yields and fuel flags are shared by explicit recipes and product definitions', () => {
  const products = { soup: { materials: [{ item: 'honey', amount: 10 }], yields: 6 } };
  assert.equal(core.sumMaterials([{ item: 'soup', quantity: 3 }], products)[0].amount, 5);
  const result = core.sumMaterials([{ materials: [{ item: 'wood', amount: 2, fuel: true }] }, { item: 'wood', quantity: 3 }], {});
  assert.deepEqual(plain(result), [{ item: 'wood', amount: 5, fuel: true }]);
});
test('cycles, empty recipes and depth limits preserve material demand', () => {
  const catalog = { a: { name: 'A', recipe: { station: 'Forge', materials: [{ item: 'b', amount: 2 }], yields: 1 } }, b: { name: 'B', recipe: { materials: [{ item: 'a', amount: 1 }], yields: 1 } }, empty: { recipe: { materials: [] } } };
  const input = [{ item: 'a', amount: 3 }, { item: 'empty', amount: 1, fuel: true }];
  const before = JSON.stringify({ catalog, input });
  assert.deepEqual(plain(core.breakdown(input, catalog, 0).materials), [{ item: 'a', amount: 3, fuel: false }, { item: 'empty', amount: 1, fuel: true }]);
  assert.equal(core.breakdown(input, catalog, 1).materials[0].item, 'b');
  assert.equal(core.breakdown(input, catalog).materials[0].amount, 6);
  assert.equal(JSON.stringify({ catalog, input }), before);
});
test('shared dependencies aggregate steps without treating a repeated branch as a cycle', () => {
  const catalog = { bronze: { name: 'Bronze', recipe: { station: 'Forge', materials: [{ item: 'copper', amount: 2 }], yields: 1 } }, copper: { name: 'Copper', recipe: { station: 'Smelter', materials: [{ item: 'ore', amount: 1 }], yields: 1 } } };
  const result = core.breakdown([{ item: 'bronze', amount: 2 }, { item: 'copper', amount: 3 }], catalog);
  assert.equal(result.materials[0].amount, 7);
  assert.equal(result.steps.find(s => s.product === 'copper').amount, 7);
});
test('copy format handles fractions and locale numbers without translating game names', () => {
  const list = [{ name: 'Iron', amount: 165 }, { name: 'Honey', amount: 1.5 }];
  assert.equal(core.formatList(list, 'en'), '165× Iron\n1.5× Honey');
  assert.equal(core.formatList(list, 'cs'), '165× Iron\n1,5× Honey');
  assert.equal(core.formatList([], 'invalid_locale'), '');
});
test('cart.addMaterial sums repeated adds and read survives corrupted JSON', () => {
  const store = new Map();
  context.localStorage = { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)) };
  store.set('va.cart', '{broken');
  assert.deepEqual(plain(core.cart.read()), []);
  core.cart.write([]);
  core.cart.addMaterial('iron', 1);
  core.cart.addMaterial('iron', 4);
  core.cart.addMaterial('love-potion', 5);
  const lines = plain(core.cart.read());
  assert.equal(lines.length, 2);
  assert.equal(lines[0].materialId, 'iron');
  assert.equal(lines[0].amount, 5);
  assert.equal(lines[0].setId, null);
  assert.ok(core.cart.hasMaterial('iron') && !core.cart.hasMaterial('wood'));
  delete context.localStorage;
});
test('sumMaterials counts a materialId line as that many units', () => {
  const result = core.sumMaterials([{ id: 'mat_iron_x', materialId: 'iron', amount: 3, setId: null, pieceId: null }], {});
  assert.deepEqual(plain(result), [{ item: 'iron', amount: 3, fuel: false }]);
});
test('a line without pieceId does not break sumMaterials', () => {
  const result = core.sumMaterials([{ id: 'x', pieceId: null, materialId: 'wood', amount: 2 }, { id: 'y', setId: null }], { wood: { name: 'Wood' } });
  assert.deepEqual(plain(result), [{ item: 'wood', amount: 2, fuel: false }, { item: 'y', amount: 1, fuel: false }]);
});
