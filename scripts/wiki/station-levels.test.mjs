import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readCachedPages } from './api.mjs';
import {
  annotateQualities, availableFrom, latestBiome, levelBiome, materialBiomeLookup, maxLevel,
  parseArmorQualityStations, parseUpgradeStation, resolveCraftingStation, stationIdByName,
} from './station-levels.mjs';

const load = (name) => JSON.parse(readFileSync(new URL(`../../data/${name}.json`, import.meta.url), 'utf8'));
const stationNames = load('stations').map((station) => station.name);
const pieces = load('armor').flatMap((set) => set.pieces);
const pages = readCachedPages(['Wolf Armor', 'Flametal Armor', 'Padded Armor', 'Caller Set', 'Nord Sword']);
const levels = (page, slot) => [...parseArmorQualityStations(pages.get(page), slot).values()].map((entry) => entry.level);
const generatedLevels = (id) => pieces.find((piece) => piece.id === id).levels.map((entry) => entry.stationLevel);

test('Drake Helmet uses head levels 1/2/3/4 rather than chest/legs levels', () => {
  assert.deepEqual(levels('Wolf Armor', 'head'), [1, 2, 3, 4]);
  assert.deepEqual(generatedLevels('drake-helmet'), [1, 2, 3, 4]);
  assert.deepEqual(levels('Wolf Armor', 'chest'), [2, 3, 4, 5]);
  assert.deepEqual(levels('Wolf Armor', 'cape'), [2, 3, 4, 5]);
  assert.equal(pieces.find((piece) => piece.id === 'wolf-fur-cape').station, 'Workbench');
});

test('Flametal pieces use station headers 3/4/5/6 rather than weight cells', () => {
  for (const slot of ['head', 'chest', 'legs']) assert.deepEqual(levels('Flametal Armor', slot), [3, 4, 5, 6]);
  for (const id of ['flametal-helmet', 'flametal-breastplate', 'flametal-greaves']) {
    assert.deepEqual(generatedLevels(id), [3, 4, 5, 6]);
  }
});

test('Caller Q1 is Galdr Table 3 (cast), finished at Frost Foundry', () => {
  const quality = parseArmorQualityStations(pages.get('Caller Set'), 'head').get(1);
  assert.deepEqual(quality, { station: 'Galdr Table', level: 3 });
  for (const id of ['headdress-of-the-caller', 'robes-of-the-caller', 'trousers-of-the-caller']) {
    const piece = pieces.find((piece) => piece.id === id);
    assert.equal(piece.station, 'Galdr Table');
    assert.equal(piece.finishedAt, 'Frost Foundry');
    assert.deepEqual(generatedLevels(id), [3, 4, 5, 6]);
  }
});

test('Nord Sword upgrades at Black Forge starting at 4, finished at Frost Foundry', () => {
  const row = parseUpgradeStation(pages.get('Nord Sword'));
  assert.deepEqual(row, { station: 'Black forge', level: 4 });
  assert.deepEqual(resolveCraftingStation('[[Frost Foundry]]', row.station, stationNames), {
    station: 'Black Forge', finishedAt: 'Frost Foundry',
  });
  const sword = load('weapons').find((weapon) => weapon.id === 'nord-sword');
  assert.equal(sword.station, 'Black Forge');
  assert.equal(sword.finishedAt, 'Frost Foundry');
  assert.equal(sword.stationLevel, 4);
  assert.deepEqual(sword.levels.map((level) => level.stationLevel), [4, 5, 6, 7]);
});

test('Linen Cape uses Workbench 1/2/3/4 and Padded chest/legs retain wiki 2/2/3/4', () => {
  assert.deepEqual(levels('Padded Armor', 'cape'), [1, 2, 3, 4]);
  assert.deepEqual(generatedLevels('linen-cape'), [1, 2, 3, 4]);
  assert.equal(pieces.find((piece) => piece.id === 'linen-cape').station, 'Workbench');
  for (const [slot, id] of [['chest', 'padded-cuirass'], ['legs', 'padded-greaves']]) {
    assert.deepEqual(levels('Padded Armor', slot), [2, 2, 3, 4]);
    assert.deepEqual(generatedLevels(id), [2, 2, 3, 4]);
  }
});

test('stations are canonical or null and exactly 27 pieces finish at Frost Foundry', () => {
  const all = [...load('weapons'), ...pieces];
  assert.equal(all.filter((piece) => piece.finishedAt === 'Frost Foundry').length, 27);
  assert.equal(all.filter((piece) => piece.station === 'Frost Foundry').length, 0);
  for (const piece of all) assert.ok(piece.station === null || stationNames.includes(piece.station), piece.id);
  assert.deepEqual(resolveCraftingStation('Black forge', 'Black Forge', stationNames), { station: 'Black Forge' });
  assert.deepEqual(resolveCraftingStation('Hildir', null, stationNames), { station: null });
  const exceptions = all.filter((piece) => piece.levels.some((level, index, array) => index && level.stationLevel !== array[index - 1].stationLevel + 1));
  assert.deepEqual(exceptions.map((piece) => piece.id).sort(), ['padded-cuirass', 'padded-greaves']);
});

// ---- VC-45c: availability of qualities ----
const stations = load('stations');
const items = load('items');
const biomes = load('biomes');
const materialBiome = materialBiomeLookup(items);
const quality = (piece) => availableFrom(piece.levels, stationIdByName(stations, piece.station), materialBiome, stations, biomes);

test('levelBiome and maxLevel read the levels of data/stations.json', () => {
  assert.equal(maxLevel(stations, 'black-forge'), 6);
  assert.equal(maxLevel(stations, 'nope'), null);
  assert.equal(levelBiome(stations, 'black-forge', 3), 'mistlands');
  assert.equal(levelBiome(stations, 'black-forge', 4), 'ashlands');
  assert.equal(levelBiome(stations, 'black-forge', 7), null);
  assert.equal(levelBiome(stations, 'nope', 1), null);
});

test('Carapace Armor is Mistlands for Q1-Q3 and Ashlands for Q4', () => {
  for (const id of ['carapace-helmet', 'carapace-breastplate', 'carapace-greaves']) {
    const piece = pieces.find((entry) => entry.id === id);
    assert.deepEqual(quality(piece).map((entry) => entry.availableFrom), ['mistlands', 'mistlands', 'mistlands', 'ashlands'], id);
    assert.deepEqual(piece.levels.map((entry) => entry.availableFrom), ['mistlands', 'mistlands', 'mistlands', 'ashlands'], id);
  }
});

test('Bronze Sword Q4 needs Forge 4 (Swamp); Nord Sword Q4 is above Black Forge 6', () => {
  const weapons = load('weapons');
  const bronze = quality(weapons.find((weapon) => weapon.id === 'bronze-sword'));
  assert.deepEqual(bronze.map((entry) => entry.availableFrom), ['black-forest', 'black-forest', 'black-forest', 'swamp']);
  const nord = quality(weapons.find((weapon) => weapon.id === 'nord-sword'));
  assert.deepEqual(nord[3], { availableFrom: null, availableTier: null, unreachable: true });
  assert.equal(nord[0].unreachable, undefined);
  assert.equal(weapons.find((weapon) => weapon.id === 'nord-sword').levels[3].unreachable, true);
});

test('availableFrom fails with the material name when items.json lacks it', () => {
  assert.throws(() => annotateQualities(
    { id: 'x', station: 'Workbench', levels: [{ quality: 1, stationLevel: 1, materials: [{ item: 'no-such-thing' }] }] },
    { stations, materialBiome, biomeOrder: biomes },
  ), /no-such-thing/);
  assert.throws(() => materialBiomeLookup([{ id: 'x', name: 'Unplaced' }])('x'), /Unplaced/);
});

test('latestBiome picks the latest biome and ignores nulls', () => {
  assert.equal(latestBiome(['meadows', null, 'swamp', 'black-forest'], biomes), 'swamp');
  assert.equal(latestBiome([null], biomes), null);
});

test('stored biome/tier equal where Q1 can first be crafted (Q-5)', () => {
  const order = Object.fromEntries(biomes.map((biome) => [biome.id, biome.order]));
  for (const weapon of load('weapons')) {
    if (!weapon.station || !weapon.levels.some((level) => level.materials.length)) continue;
    assert.equal(weapon.biome, weapon.levels[0].availableFrom, weapon.id);
    assert.equal(weapon.tier, order[weapon.biome], weapon.id);
    assert.equal(weapon.availableFrom, weapon.biome, weapon.id);
  }
  for (const set of load('armor')) {
    const withRecipe = set.pieces.filter((piece) => piece.levels[0]?.availableFrom);
    for (const piece of withRecipe) assert.equal(piece.availableFrom, piece.levels[0].availableFrom, piece.id);
    if (withRecipe.length) assert.equal(set.biome, latestBiome(withRecipe.map((piece) => piece.availableFrom), biomes), set.id);
  }
});

test('Cauldron foods: 5 former Meadows dishes now start in Black Forest (Q-9)', () => {
  const food = load('food');
  for (const id of ['boar-jerky', 'carrot-soup', 'minced-meat-sauce', 'onion-soup', 'turnip-stew']) {
    const entry = food.find((dish) => dish.id === id);
    assert.equal(entry.station, 'cauldron');
    assert.equal(entry.availableFrom, 'black-forest', id);
    assert.equal(entry.biome, 'black-forest', id);
  }
  for (const dish of food) assert.equal(dish.biome, dish.availableFrom, dish.id);
});
