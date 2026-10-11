import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readCachedPages } from './api.mjs';
import { parseArmorQualityStations, parseUpgradeStation, resolveCraftingStation } from './station-levels.mjs';

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
