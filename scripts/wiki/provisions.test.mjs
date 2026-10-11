import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTemplates } from './wikitext.mjs';
import { parseFood, parseMead, parseFeasts, parseProvisionsStation, parseCauldronUpgrades, categoryRecursive } from './fetch-provisions.mjs';

const stew = `{{infobox item
| title = Serpent Stew
| image = Serpent stew.png
| id = SerpentStew
| type = Food
| source = [[Cauldron]] (level 2)
| materials =
* [[Mushroom]] x1
* [[Cooked Serpent Meat]] x1
* [[Honey]] x2
| health = 80
| stamina = 26
| duration = 1800
| healing = 4 hp/tick
}}`;
test('pasted Serpent Stew preserves stats, station and ingredient amounts', () => {
  const f = parseFood('Serpent Stew', parseTemplates(stew, 'infobox item')[0]);
  assert.equal(f.id, 'serpent-stew');
  assert.equal(f.name, 'Serpent Stew');
  assert.equal(f.health, 80);
  assert.equal(f.stamina, 26);
  assert.equal(f.eitr, 0);
  assert.equal(f.duration, 1800);
  assert.deepEqual(f.healing, { amount: 4, interval: null });
  assert.equal(f.station, 'cauldron');
  assert.equal(f.stationLevel, 2);
  assert.equal(f.yields, 1);
  assert.equal(f.isFeast, false);
  assert.deepEqual(f.materials, [{ item: 'mushroom', amount: 1 }, { item: 'cooked-serpent-meat', amount: 1 }, { item: 'honey', amount: 2 }]);
});
test('batch yields, raw food, explicit healing intervals and oven stations', () => {
  const f = parseFood('Test', { type: 'Food', source: '[[Oven]]', quantity: '4', healing: '3 hp/tick every 10 seconds' });
  assert.equal(f.yields, 4);
  assert.equal(f.station, 'oven');
  assert.equal(f.healing.interval, 10);
  assert.equal(parseFood('Berry', { type: 'Food' }).station, 'none');
  assert.equal(parseFood('Meat', { type: 'Food', source: '[[Iron Cooking Station]]' }).station, 'iron-cooking-station');
});
test('tabber selects drink and base separately and parses resistance', () => {
  const m = parseMead('Frost Resistance Mead', `{{infobox item|type=Mead|duration=600|cooldown=600|quantity=6|effect=Resistant (0.5x) VS [[Frost]]}}
{{infobox item|type=Mead Base|title=Mead Base: Frost Resistance|source=[[Mead Ketill]]|materials=* [[Honey]] x10}}`);
  assert.equal(m.duration, 600);
  assert.equal(m.cooldown, 600);
  assert.equal(m.yields, 6);
  assert.deepEqual(m.effect.resistances, [{ type: 'frost', multiplier: 0.5 }]);
  assert.equal(m.base.station, 'mead-ketill');
  assert.equal(m.base.stationLevel, 1);
  assert.deepEqual(m.base.materials, [{ item: 'honey', amount: 10 }]);
  assert.equal(parseMead('Honey', '{{infobox item|type=Material}}'), null);
});
test('feast table preserves portions, recipe and duration', () => {
  const [f] = parseFeasts(`Once placed, the feast has 10 servings, and each serving lasts 50 minutes.
{| class="wikitable"
! Name !! Icon !! Health !! Stamina !! Eitr !! Healing !! Materials !! Raw materials
|-
| [[Feast Test]] || [[File:Test.png]] || 35 || 35 || || 2 || * [[Honey]] x2 || * [[Honey]] x2
|}`);
  assert.equal(f.servings, 10);
  assert.equal(f.duration, 3000);
  assert.equal(f.isFeast, true);
  assert.equal(f.station, 'food-preparation-table');
  assert.deepEqual(f.materials, [{ item: 'honey', amount: 2 }]);
});
test('station preserves building materials, unlock and fermentation time', () => {
  const s = parseProvisionsStation('Fermenter', '{{infobox structure|source=[[Forge]]|materials=* [[Finewood]] x30}} A fermenter cycle takes 2,400 seconds.');
  assert.equal(s.secondsPerBatch, 2400);
  assert.equal(s.unlock.station, 'Forge');
  assert.deepEqual(s.materials, [{ item: 'finewood', amount: 30 }]);
});
test('recursive categories handle pagination, duplicates and category cycles', async () => {
  let count = 0;
  const client = { request: async p => {
    count++;
    if (p.cmtitle === 'Category:Child') return { query: { categorymembers: [{ ns: 14, title: 'Category:Food' }, { ns: 0, title: 'Berry' }] } };
    if (p.cmcontinue) return { query: { categorymembers: [{ ns: 0, title: 'Meat' }] } };
    return { query: { categorymembers: [{ ns: 14, title: 'Category:Child' }, { ns: 0, title: 'Berry' }] }, continue: { cmcontinue: 'next', continue: '-||' } };
  } };
  assert.deepEqual(await categoryRecursive('Food', client), ['Berry', 'Meat']);
  assert.equal(count, 3);
});

test('cauldron upgrades survive a total footer that replaces table headers', () => {
  const result = parseCauldronUpgrades(`== Upgrades ==
{| class="wikitable"
! Name
! Icon
! Materials
|-
|[[Spice Rack]]
|[[File:Spice Rack.png]]
|{{Item link|Carrot|2}}
|-
|[[Butcher's Table]]
|[[File:Table.png]]
|{{Item link|Silver|2}}
|-
! colspan="2" | Total (Cauldron included)
|{{Item link|Tin|10}}
|}
== Recipes ==`);
  assert.deepEqual(result, ['Spice Rack', "Butcher's Table"]);
});

test('mead effects handle qualitative resistance and x-prefix multipliers', () => {
  const poison = parseMead('Poison Resistance Mead', '{{infobox item|type=Mead|effect=Very resistant vs. [[Poison]]}}');
  assert.deepEqual(poison.effect.resistances, [{ type: 'poison', multiplier: 0.25 }]);
  const berserk = parseMead('Berserkir Mead', '{{infobox item|type=Mead|effect=* Weak (x1.5) against [[Slash]], [[Blunt]] and [[Pierce]] damage}}');
  assert.deepEqual(berserk.effect.resistances, [{ type: 'slash', multiplier: 1.5 }, { type: 'blunt', multiplier: 1.5 }, { type: 'pierce', multiplier: 1.5 }]);
  assert.ok(!berserk.effect.text.includes('*'));
});

test('generated provisions have complete recipes and all six cauldron upgrades', async () => {
  const { readFileSync } = await import('node:fs');
  const load = name => JSON.parse(readFileSync(`data/${name}.json`));
  const food = load('food');
  const meads = load('meads');
  const stations = load('stations');
  const items = load('items');
  const byId = new Map(items.map(item => [item.id, item]));
  assert.equal(food.filter(f => f.isFeast).length, 9);
  assert.equal(stations.find(s => s.id === 'cauldron').maxLevel, 7);
  assert.equal(stations.filter(s => s.upgrades === 'cauldron').length, 6);
  assert.ok(stations.filter(s => s.type === 'provisions').every(s => s.materials.length > 0));
  assert.deepEqual(food.filter(f => f.tier == null).map(f => f.id), ['blue-mushroom']);
  assert.ok(food.filter(f => f.isFeast).every(f => f.servings === 10 && f.duration === 3000));
  assert.equal(food.find(f => f.id === 'whole-roasted-meadow-boar').biome, 'black-forest');
  assert.equal(byId.get('bread-dough').recipe.yields, 2);
  assert.equal(byId.get('unbaked-sweetbread').recipe.yields, 2);
  assert.equal(byId.get('cooked-boar-meat').recipe.materials[0].item, 'boar-meat');
  for (const item of items.filter(i => i.provisions)) {
    for (const material of item.recipe?.materials ?? []) {
      assert.ok(byId.has(material.item), `${item.id}: missing ${material.item}`);
      assert.notEqual(material.item, item.id, `${item.id}: self-referencing recipe`);
    }
  }
  for (const mead of meads.filter(m => m.base)) {
    assert.ok(mead.base.materials.length > 0, mead.id);
    assert.ok(byId.has(mead.base.item), mead.id);
    assert.equal(mead.base.station, 'mead-ketill');
    assert.equal(mead.fermenterTime, 2400);
  }
  assert.equal(meads.find(m => m.id === 'love-potion').yields, 5);
  assert.ok([...food, ...meads].every(e => e.image && e.names && !JSON.stringify(e).includes('[[')));
});
