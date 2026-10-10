import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { buildTradersData, TRADERS, VALUABLES } from './build-traders-data.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('traders data pipeline builds data/traders.json and client bundle', () => {
  const result = buildTradersData();
  assert.ok(result);
  assert.equal(result.traders.length, 3);
  assert.equal(result.valuables.length, 4);

  const jsonContent = JSON.parse(readFileSync(path.join(ROOT, 'data', 'traders.json'), 'utf8'));
  assert.equal(jsonContent.traders.length, 3);
  assert.equal(jsonContent.valuables.length, 4);

  const clientCode = readFileSync(path.join(ROOT, 'apps', 'traders', 'data', 'data.js'), 'utf8');
  const context = { globalThis: {} };
  vm.createContext(context);
  vm.runInContext(clientCode, context);
  assert.ok(context.globalThis.VC_TRADERS_DATA);
  assert.equal(context.globalThis.VC_TRADERS_DATA.traders.length, 3);
});

test('all three traders are present with valid biomes and descriptions', () => {
  const haldor = TRADERS.find((t) => t.id === 'haldor');
  const hildir = TRADERS.find((t) => t.id === 'hildir');
  const bogWitch = TRADERS.find((t) => t.id === 'bog-witch');

  assert.ok(haldor, 'Haldor must exist');
  assert.equal(haldor.biome, 'black-forest');
  assert.ok(haldor.description.length > 20, 'Haldor has detailed description');
  assert.ok(haldor.mapIconTip.length > 10, 'Haldor has map icon discovery tip');

  assert.ok(hildir, 'Hildir must exist');
  assert.equal(hildir.biome, 'meadows');
  assert.ok(hildir.description.length > 20, 'Hildir has detailed description');
  assert.ok(hildir.mapIconTip.length > 10, 'Hildir has map icon discovery tip');

  assert.ok(bogWitch, 'The Bog Witch must exist');
  assert.equal(bogWitch.biome, 'swamp');
  assert.ok(bogWitch.description.length > 20, 'Bog Witch has detailed description');
  assert.ok(bogWitch.mapIconTip.length > 10, 'Bog Witch has map icon discovery tip');
});

const trader = (id) => TRADERS.find((t) => t.id === id);
const item = (traderId, id) => trader(traderId).items.find((i) => i.id === id);

test('item counts match the wiki Sells/Trading tables', () => {
  assert.equal(trader('haldor').items.length, 11);
  assert.equal(trader('hildir').items.length, 38);
  assert.equal(trader('bog-witch').items.length, 20);
  for (const t of TRADERS) {
    const ids = t.items.map((i) => i.id);
    assert.equal(new Set(ids).size, ids.length, `${t.id} has unique item ids`);
  }
});

test('Haldor prices, quantities and unlocks come from the wiki', () => {
  const belt = item('haldor', 'megingjord');
  assert.equal(belt.price, 950);
  assert.equal(belt.unlockedBy, null);
  assert.match(belt.description, /150/);

  const bait = item('haldor', 'fishing-bait');
  assert.equal(bait.quantity, 20);
  assert.equal(bait.price, 10);

  const flesh = item('haldor', 'ymir-flesh');
  assert.equal(flesh.price, 120);
  assert.equal(flesh.unlockedBy.type, 'boss');
  assert.equal(flesh.unlockedBy.id, 'the-elder');

  const stone = item('haldor', 'thunder-stone');
  assert.equal(stone.price, 50);
  assert.equal(stone.unlockedBy.id, 'the-elder');
  assert.equal(item('haldor', 'thunderstone'), undefined);

  assert.equal(item('haldor', 'egg').price, 1500);
  assert.equal(item('haldor', 'egg').unlockedBy.id, 'yagluth');

  const hoops = item('haldor', 'barrel-hoops');
  assert.equal(hoops.quantity, 3);
  assert.equal(hoops.price, 100);
  assert.equal(item('haldor', 'wider-pockets').price, 1000);
  assert.equal(item('haldor', 'wider-pockets').unlockedBy.id, 'moder');
  assert.equal(item('haldor', 'deeper-pockets').price, 2000);
  assert.equal(item('haldor', 'deeper-pockets').unlockedBy.id, 'the-queen');
});

test('Hildir prices and chests come from the wiki', () => {
  assert.equal(item('hildir', 'barber-kit').price, 600);
  assert.equal(item('hildir', 'barber-kit').unlockedBy, null);
  assert.equal(item('hildir', 'iron-pit').price, 75);
  assert.equal(item('hildir', 'iron-pit').unlockedBy, null);
  assert.equal(item('hildir', 'fireworks'), undefined);
  assert.equal(item('hildir', 'basic-fireworks').price, 50);
  assert.equal(item('hildir', 'basic-fireworks').unlockedBy.chest, 'bronze');

  assert.equal(item('hildir', 'fur-cap-brown').price, 200);
  assert.equal(item('hildir', 'fur-cap-grey').price, 300);
  assert.equal(item('hildir', 'fur-cap-grey').unlockedBy.chest, 'bronze');
  assert.equal(item('hildir', 'harvest-dress').price, 550);
  assert.equal(item('hildir', 'cape-tunic-blue').price, 450);
  assert.equal(item('hildir', 'extravagant-cap-green').unlockedBy.chest, 'silver');
  assert.equal(item('hildir', 'extravagant-cap-orange').unlockedBy.chest, 'bronze');
  assert.equal(item('hildir', 'simple-cap-red').unlockedBy, null);
});

test("Hildir's chest unlock items correspond to the three minibosses", () => {
  const expected = {
    brass: ['brenna', 'Brenna', 'Smouldering Tomb'],
    silver: ['geirrhafa', 'Geirrhafa', 'Howling Cavern'],
    bronze: ['zil-thungr', 'Zil & Thungr', 'Sealed Tower'],
  };
  for (const [chest, [boss, bossName, location]] of Object.entries(expected)) {
    const items = trader('hildir').items.filter((i) => i.unlockedBy?.chest === chest);
    assert.ok(items.length >= 5, `${chest} chest unlocks several items`);
    for (const it of items) {
      assert.equal(it.unlockedBy.type, 'chest');
      assert.equal(it.unlockedBy.boss, boss);
      assert.equal(it.unlockedBy.bossName, bossName);
      assert.equal(it.unlockedBy.location, location);
    }
  }
});

test('Bog Witch sells ingredients, not brewed potions, with wiki quantities and prices', () => {
  const bw = trader('bog-witch');
  for (const id of ['anti-sting-concoction', 'lightfoot-mead', 'tonic-of-ratatosk', 'draught-of-vananidir', 'brew-of-animal-whispers']) {
    assert.equal(item('bog-witch', id), undefined, `${id} is not sold`);
  }
  const love = item('bog-witch', 'love-potion');
  assert.equal(love.quantity, 5);
  assert.equal(love.price, 110);
  assert.equal(love.unlockedBy, null);

  assert.equal(item('bog-witch', 'candle-wick').quantity, 50);
  assert.equal(item('bog-witch', 'scythe-handle').price, 200);
  assert.equal(item('bog-witch', 'scythe-handle').unlockedBy.id, 'moder');
  assert.equal(item('bog-witch', 'ivy-seeds').quantity, 3);
  assert.equal(item('bog-witch', 'serving-tray').price, 140);
  assert.equal(item('bog-witch', 'corked-vial').unlockedBy.id, 'the-elder');
  assert.equal(item('bog-witch', 'toadstool').price, 85);
  assert.equal(item('bog-witch', 'fresh-seaweed').price, 75);
  assert.equal(item('bog-witch', 'woodland-herb-blend').unlockedBy.id, 'the-elder');
  assert.equal(item('bog-witch', 'fiery-spice-powder').unlockedBy.id, 'fader');
  assert.equal(bw.items.filter((i) => i.quantity === 5).length >= 10, true);

  const crown = item('bog-witch', 'crown-of-roots');
  assert.equal(crown.price, 3000);
  assert.equal(crown.unlockedBy.type, 'creature');
  assert.equal(crown.unlockedBy.id, 'writhan');
  assert.equal(crown.unlockedBy.biome, 'swamp');

  const herbs = item('bog-witch', 'seafarer-s-herbs');
  assert.equal(herbs.price, 130);
  assert.equal(herbs.unlockedBy.type, 'creature');
  assert.equal(herbs.unlockedBy.id, 'serpent');
  assert.equal(herbs.unlockedBy.biome, 'ocean');
});

test('client bundle carries the biome list needed for creature unlocks', () => {
  const data = buildTradersData();
  assert.equal(data.biomes.length, 9);
  assert.ok(data.biomes.every((b) => typeof b.order === 'number' && Array.isArray(b.creatures.boss)));
});

test('Valuables have accurate fixed coin values', () => {
  assert.equal(VALUABLES.length, 4);

  const amber = VALUABLES.find((v) => v.id === 'amber');
  assert.ok(amber);
  assert.equal(amber.value, 5);

  const amberPearl = VALUABLES.find((v) => v.id === 'amber-pearl');
  assert.ok(amberPearl);
  assert.equal(amberPearl.value, 10);

  const ruby = VALUABLES.find((v) => v.id === 'ruby');
  assert.ok(ruby);
  assert.equal(ruby.value, 20);

  const silverNecklace = VALUABLES.find((v) => v.id === 'silver-necklace');
  assert.ok(silverNecklace);
  assert.equal(silverNecklace.value, 30);
});

test('all merchandise items have id, name, quantity, price, description, biome and unlockedBy fields', () => {
  for (const trader of TRADERS) {
    assert.ok(trader.items.length > 0, `${trader.id} has merchandise`);
    for (const item of trader.items) {
      assert.equal(typeof item.id, 'string', `${item.id} has id`);
      assert.equal(typeof item.name, 'string', `${item.name} has name`);
      assert.ok(Number.isInteger(item.quantity) && item.quantity >= 1, `${item.id} has quantity`);
      assert.equal(typeof item.price, 'number', `${item.id} has numeric price`);
      assert.ok(item.price > 0, `${item.id} price is positive`);
      assert.equal(typeof item.description, 'string', `${item.id} has description`);
      assert.ok(item.description.length > 10, `${item.id} description is substantive`);
      assert.equal(typeof item.biome, 'string', `${item.id} has biome`);
      assert.ok(item.unlockedBy === null || typeof item.unlockedBy === 'object');
    }
  }
});
