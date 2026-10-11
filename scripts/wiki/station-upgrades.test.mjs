import test from 'node:test';
import assert from 'node:assert/strict';
import { readCachedPages } from './api.mjs';
import { parseStationUpgrades, createStationProgression, CRAFTING_STATION_PAGES } from './station-upgrades.mjs';
import { mergeStations } from './fetch-stations.mjs';
import { BIOMES } from './biomes.mjs';

const progression = createStationProgression();

test('Black Forge cache has five extensions and both recipe formats parse amounts', () => {
  const wt = readCachedPages(['Black Forge']).get('Black Forge');
  const extensions = parseStationUpgrades('Black Forge', wt);
  assert.deepEqual(extensions.map(e => e.name), ['Black Forge Cooler', 'Vice', 'Metal Cutter', 'Gem Cutter', "Smith's Aprons"]);
  assert.deepEqual(extensions[1].materials, [
    { item: 'iron', amount: 5 }, { item: 'copper', amount: 8 }, { item: 'mechanical-spring', amount: 2 },
  ]);
  const templateRecipes = wt.replace(/(\d+) \[\[([^\]]+)\]\]/g, '{{Item link|$2|$1}}');
  assert.deepEqual(parseStationUpgrades('Black Forge', templateRecipes), extensions);
  const result = progression('Black Forge');
  assert.equal(result.upgrades.find(e => e.id === 'vice').biome, 'mistlands');
  assert.equal(result.upgrades.find(e => e.id === 'metal-cutter').biome, 'ashlands');
  assert.equal(result.upgrades.find(e => e.id === 'smith-s-aprons').biome, 'deep-north');
});

test('cached progression matches all six accepted biome rows', () => {
  const expected = {
    Workbench: [3, 4, 4, 4, 5, 5, 5, 5, 5],
    Forge: [0, 3, 3, 7, 7, 7, 7, 7, 7],
    'Black Forge': [0, 0, 0, 0, 0, 0, 3, 5, 6],
    'Galdr Table': [0, 0, 0, 0, 0, 0, 3, 4, 5],
    Cauldron: [0, 2, 2, 2, 3, 4, 5, 6, 7],
    'Artisan Table': [0, 0, 0, 0, 1, 1, 2, 2, 2],
  };
  let count = 0;
  for (const [title, values] of Object.entries(expected)) {
    const { station, upgrades } = progression(title);
    count += upgrades.length;
    assert.equal(station.maxLevel, values.at(-1), title);
    assert.deepEqual(BIOMES.map(b => station.levels.filter(l => l.tier <= b.order).at(-1)?.level ?? 0), values, title);
    assert.deepEqual(station.levels.map(l => l.level), Array.from({ length: station.maxLevel }, (_, i) => i + 1));
    for (const upgrade of upgrades) {
      assert.equal(upgrade.upgrades, station.id);
      assert.ok(upgrade.biome);
      assert.equal(station.levels[upgrade.progressionLevel - 1].upgrade, upgrade.id);
    }
  }
  assert.equal(count, 26);
});

test('Grinding Wheel requires the Iron-gated Stonecutter despite catalog biome', () => {
  assert.equal(progression('Forge').upgrades.find(e => e.id === 'grinding-wheel').biome, 'swamp');
  assert.equal(progression('Stonecutter').station.maxLevel, 1);
  assert.equal(progression('Stonecutter').station.biome, 'swamp');
});

test('extension ownership preserves foreign records and repeated merge is a no-op', () => {
  const crafting = CRAFTING_STATION_PAGES.map(progression);
  const fresh = [...crafting.flatMap(s => s.upgrades), ...crafting.map(s => s.station)];
  const cauldron = { id: 'cauldron', type: 'provisions', sentinel: true };
  const first = mergeStations([cauldron], fresh);
  assert.deepEqual(first.at(-1), cauldron);
  assert.deepEqual(mergeStations(first, fresh), first);
});
