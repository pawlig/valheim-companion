import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import vm from 'node:vm';
import { buildSearchIndex } from './build-search-index.mjs';

function normalizeSearchText(str) {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function searchItems(index, query, openBiomes = new Set()) {
  const normQuery = normalizeSearchText(query);
  if (!normQuery) {
    return { groups: {}, lockedCount: 0, totalMatches: 0 };
  }

  const matches = [];
  for (const item of index) {
    const normName = normalizeSearchText(item.name);
    let matched = normName.includes(normQuery);

    if (!matched && item.names) {
      for (const localName of Object.values(item.names)) {
        if (normalizeSearchText(localName).includes(normQuery)) {
          matched = true;
          break;
        }
      }
    }

    if (matched) {
      matches.push(item);
    }
  }

  let lockedCount = 0;
  const groups = {};

  for (const item of matches) {
    const isLocked = item.biome && !openBiomes.has(item.biome);
    if (isLocked) {
      lockedCount++;
    } else {
      if (!groups[item.type]) {
        groups[item.type] = [];
      }
      if (groups[item.type].length < 8) {
        groups[item.type].push(item);
      }
    }
  }

  return {
    groups,
    lockedCount,
    totalMatches: matches.length,
  };
}

test('search text normalization strips diacritics and normalizes case', () => {
  assert.equal(normalizeSearchText('Šedý Trpaslík'), 'sedy trpaslik');
  assert.equal(normalizeSearchText('Écorce Ancienne'), 'ecorce ancienne');
  assert.equal(normalizeSearchText('Flügellos'), 'flugellos');
  assert.equal(normalizeSearchText('  Troll SET  '), 'troll set');
  assert.equal(normalizeSearchText(''), '');
  assert.equal(normalizeSearchText(null), '');
});

test('search index builds valid bundle under 150 kB with required fields', () => {
  const items = buildSearchIndex();
  assert.ok(Array.isArray(items));
  assert.ok(items.length > 500, `Expected > 500 items, got ${items.length}`);

  const stat = statSync('apps/hub/data/search.js');
  assert.ok(stat.size < 150 * 1024, `search.js size ${stat.size} bytes should be < 150 kB`);

  const sandbox = {};
  vm.runInNewContext(readFileSync('apps/hub/data/search.js', 'utf8'), sandbox);
  assert.ok(Array.isArray(sandbox.VC_SEARCH_INDEX));
  assert.equal(sandbox.VC_SEARCH_INDEX.length, items.length);

  for (const item of items) {
    assert.ok(['creature', 'weapon', 'armor', 'material', 'food'].includes(item.type));
    assert.ok(typeof item.name === 'string' && item.name.length > 0);
    assert.ok(typeof item.names === 'object' && item.names !== null);
    assert.ok(item.biome === null || typeof item.biome === 'string');
    assert.ok(typeof item.order === 'number');
    assert.ok(typeof item.url === 'string' && (item.url.startsWith('/bestiary/') || item.url.startsWith('/armourer/')));
    assert.ok(item.image === null || typeof item.image === 'string');
  }
});

test('search finds creatures by English and localized names without diacritics', () => {
  const sandbox = {};
  vm.runInNewContext(readFileSync('apps/hub/data/search.js', 'utf8'), sandbox);
  const index = sandbox.VC_SEARCH_INDEX;

  const enResult = searchItems(index, 'greydwarf', new Set(['meadows', 'black-forest']));
  assert.ok(enResult.groups.creature.some(c => c.name === 'Greydwarf'));

  const csResult = searchItems(index, 'sedy trpaslik', new Set(['meadows', 'black-forest']));
  assert.ok(csResult.groups.creature.some(c => c.name === 'Greydwarf'));

  const csDiacriticResult = searchItems(index, 'šedý trpaslík', new Set(['meadows', 'black-forest']));
  assert.ok(csDiacriticResult.groups.creature.some(c => c.name === 'Greydwarf'));
});

test('search results are capped at max 8 items per type group', () => {
  const sandbox = {};
  vm.runInNewContext(readFileSync('apps/hub/data/search.js', 'utf8'), sandbox);
  const index = sandbox.VC_SEARCH_INDEX;

  const allBiomes = new Set(['meadows', 'black-forest', 'ocean', 'swamp', 'mountain', 'plains', 'mistlands', 'ashlands', 'deep-north']);
  const result = searchItems(index, 'e', allBiomes);

  for (const [type, list] of Object.entries(result.groups)) {
    assert.ok(list.length <= 8, `Group ${type} should have <= 8 items, had ${list.length}`);
  }
});

test('spoilers hide locked biomes and count remaining matches', () => {
  const sandbox = {};
  vm.runInNewContext(readFileSync('apps/hub/data/search.js', 'utf8'), sandbox);
  const index = sandbox.VC_SEARCH_INDEX;

  // Search for Bonemaw Serpent when only meadows is open
  const meadowsOnly = new Set(['meadows']);
  const lockedResult = searchItems(index, 'bonemaw', meadowsOnly);
  assert.equal(lockedResult.groups.creature, undefined);
  assert.ok(lockedResult.lockedCount >= 1);

  // Search when ashlands is revealed
  const ashlandsOpen = new Set(['meadows', 'ashlands']);
  const unlockedResult = searchItems(index, 'bonemaw', ashlandsOpen);
  assert.ok(unlockedResult.groups.creature?.some(c => c.name.includes('Bonemaw')));
  assert.equal(unlockedResult.lockedCount, 0);
});

test('deep links route correctly to bestiary and armourer', () => {
  const sandbox = {};
  vm.runInNewContext(readFileSync('apps/hub/data/search.js', 'utf8'), sandbox);
  const index = sandbox.VC_SEARCH_INDEX;

  const creature = index.find(item => item.type === 'creature' && item.name === 'Eikthyr');
  assert.equal(creature.url, '/bestiary/#c=eikthyr');

  const set = index.find(item => item.type === 'armor' && item.name === 'Troll Set');
  assert.equal(set.url, '/armourer/#set=troll-set');

  const piece = index.find(item => item.type === 'armor' && item.name.toLowerCase() === 'troll leather helmet');
  assert.equal(piece.url, '/armourer/#item=troll-leather-helmet');

  const weapon = index.find(item => item.type === 'weapon' && item.name === 'Abyssal Harpoon');
  assert.equal(weapon.url, '/armourer/#item=abyssal-harpoon');
});
