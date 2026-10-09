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

test('Megingjörd is sold by Haldor for 950 coins and has carry weight description', () => {
  const haldor = TRADERS.find((t) => t.id === 'haldor');
  const belt = haldor.items.find((item) => item.id === 'megingjord');
  assert.ok(belt, 'Megingjörd exists in Haldor inventory');
  assert.equal(belt.price, 950);
  assert.equal(belt.unlockedBy, null);
  assert.match(belt.description, /150/);
});

test('Ymir Flesh is sold by Haldor for 120 coins with smithing references', () => {
  const haldor = TRADERS.find((t) => t.id === 'haldor');
  const flesh = haldor.items.find((item) => item.id === 'ymir-flesh');
  assert.ok(flesh, 'Ymir Flesh exists in Haldor inventory');
  assert.equal(flesh.price, 120);
  assert.match(flesh.description, /Frostner/i);
});

test('Thunderstone requires The Elder and Egg requires Yagluth', () => {
  const haldor = TRADERS.find((t) => t.id === 'haldor');
  const thunderstone = haldor.items.find((item) => item.id === 'thunderstone');
  assert.ok(thunderstone, 'Thunderstone exists');
  assert.equal(thunderstone.price, 50);
  assert.equal(thunderstone.unlockedBy?.id, 'the-elder');
  assert.equal(thunderstone.unlockedBy?.name, 'The Elder');

  const egg = haldor.items.find((item) => item.id === 'egg');
  assert.ok(egg, 'Egg exists');
  assert.equal(egg.price, 1500);
  assert.equal(egg.unlockedBy?.id, 'yagluth');
  assert.equal(egg.unlockedBy?.name, 'Yagluth');
});

test('Hildir base inventory contains Barber Kit, Iron Pit, and Fireworks', () => {
  const hildir = TRADERS.find((t) => t.id === 'hildir');
  const barber = hildir.items.find((item) => item.id === 'barber-kit');
  const ironPit = hildir.items.find((item) => item.id === 'iron-pit');
  const fireworks = hildir.items.find((item) => item.id === 'fireworks');

  assert.ok(barber, 'Barber Kit exists');
  assert.equal(barber.price, 250);
  assert.equal(barber.unlockedBy, null);

  assert.ok(ironPit, 'Iron Pit exists');
  assert.equal(ironPit.price, 250);
  assert.equal(ironPit.unlockedBy, null);

  assert.ok(fireworks, 'Fireworks exists');
  assert.equal(fireworks.price, 100);
  assert.equal(fireworks.unlockedBy, null);
});

test("Hildir's chest unlock items correspond to the three minibosses", () => {
  const hildir = TRADERS.find((t) => t.id === 'hildir');

  // Brass Chest -> Brenna
  const brassItems = hildir.items.filter((item) => item.unlockedBy?.chest === 'brass');
  assert.ok(brassItems.length >= 2, 'At least 2 items unlocked by brass chest');
  for (const item of brassItems) {
    assert.equal(item.unlockedBy.boss, 'brenna');
    assert.equal(item.unlockedBy.bossName, 'Brenna');
    assert.equal(item.unlockedBy.location, 'Smouldering Tomb');
  }
  assert.ok(brassItems.some((it) => it.id.includes('fur-cap')));
  assert.ok(brassItems.some((it) => it.id === 'harvest-dress' || it.id === 'harvest-tunic'));

  // Silver Chest -> Geirrhafa
  const silverItems = hildir.items.filter((item) => item.unlockedBy?.chest === 'silver');
  assert.ok(silverItems.length >= 2, 'At least 2 items unlocked by silver chest');
  for (const item of silverItems) {
    assert.equal(item.unlockedBy.boss, 'geirrhafa');
    assert.equal(item.unlockedBy.bossName, 'Geirrhafa');
    assert.equal(item.unlockedBy.location, 'Howling Cavern');
  }
  assert.ok(silverItems.some((it) => it.id === 'cape-tunic'));
  assert.ok(silverItems.some((it) => it.id === 'extravagant-cap'));

  // Bronze Chest -> Zil & Thungr
  const bronzeItems = hildir.items.filter((item) => item.unlockedBy?.chest === 'bronze');
  assert.ok(bronzeItems.length >= 2, 'At least 2 items unlocked by bronze chest');
  for (const item of bronzeItems) {
    assert.equal(item.unlockedBy.boss, 'zil-thungr');
    assert.equal(item.unlockedBy.bossName, 'Zil & Thungr');
    assert.equal(item.unlockedBy.location, 'Sealed Tower');
  }
  assert.ok(bronzeItems.some((it) => it.id === 'beaded-dress'));
  assert.ok(bronzeItems.some((it) => it.id === 'beaded-tunic'));
});

test('Bog Witch has Love Potion, potions, and herbs/spices', () => {
  const bogWitch = TRADERS.find((t) => t.id === 'bog-witch');
  const lovePotion = bogWitch.items.find((item) => item.id === 'love-potion');
  assert.ok(lovePotion, 'Love potion exists');
  assert.equal(lovePotion.price, 150);
  assert.equal(lovePotion.unlockedBy, null);

  const potionIds = [
    'anti-sting-concoction',
    'lightfoot-mead',
    'tonic-of-ratatosk',
    'draught-of-vananidir',
    'brew-of-animal-whispers',
  ];
  for (const pId of potionIds) {
    const potion = bogWitch.items.find((item) => item.id === pId);
    assert.ok(potion, `Potion ${pId} exists in Bog Witch stock`);
    assert.equal(potion.price, 100);
    assert.equal(potion.unlockedBy, null);
  }

  const seaweed = bogWitch.items.find((item) => item.id === 'fresh-seaweed');
  assert.ok(seaweed, 'Fresh Seaweed exists');
  assert.equal(seaweed.price, 30);

  const woodlandHerbs = bogWitch.items.find((item) => item.id === 'woodland-herb-blend');
  assert.ok(woodlandHerbs, 'Woodland Herb Blend exists');
  assert.equal(woodlandHerbs.unlockedBy?.id, 'the-elder');
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

test('all merchandise items have id, name, price, description, biome and unlockedBy fields', () => {
  for (const trader of TRADERS) {
    assert.ok(trader.items.length > 0, `${trader.id} has merchandise`);
    for (const item of trader.items) {
      assert.equal(typeof item.id, 'string', `${item.id} has id`);
      assert.equal(typeof item.name, 'string', `${item.name} has name`);
      assert.equal(typeof item.price, 'number', `${item.id} has numeric price`);
      assert.ok(item.price > 0, `${item.id} price is positive`);
      assert.equal(typeof item.description, 'string', `${item.id} has description`);
      assert.ok(item.description.length > 10, `${item.id} description is substantive`);
      assert.equal(typeof item.biome, 'string', `${item.id} has biome`);
      assert.ok(item.unlockedBy === null || typeof item.unlockedBy === 'object');
    }
  }
});
