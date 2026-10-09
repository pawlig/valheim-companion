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
    assert.ok(['creature', 'weapon', 'armor', 'material', 'food', 'comfort'].includes(item.type));
    assert.ok(typeof item.name === 'string' && item.name.length > 0);
    assert.ok(typeof item.names === 'object' && item.names !== null);
    assert.ok(item.biome === null || typeof item.biome === 'string');
    assert.ok(typeof item.order === 'number');
    assert.ok(typeof item.url === 'string' && (item.url.startsWith('/bestiary/') || item.url.startsWith('/smithy/') || item.url.startsWith('/provisions/') || item.url.startsWith('/comfort/') || item.url.startsWith('/items/')));
    assert.ok(item.image === null || typeof item.image === 'string');
  }
});

test('search matches English game names only (no localized names)', () => {
  const sandbox = {};
  vm.runInNewContext(readFileSync('apps/hub/data/search.js', 'utf8'), sandbox);
  const index = sandbox.VC_SEARCH_INDEX;

  const enResult = searchItems(index, 'greydwarf', new Set(['meadows', 'black-forest']));
  assert.ok(enResult.groups.creature.some(c => c.name === 'Greydwarf'));

  const csResult = searchItems(index, 'sedy trpaslik', new Set(['meadows', 'black-forest']));
  assert.ok(!(csResult.groups.creature || []).some(c => c.name === 'Greydwarf'));
  assert.ok(index.every(item => Object.keys(item.names || {}).length === 0));
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

test('deep links route correctly to bestiary, smithy and provisions', () => {
  const sandbox = {};
  vm.runInNewContext(readFileSync('apps/hub/data/search.js', 'utf8'), sandbox);
  const index = sandbox.VC_SEARCH_INDEX;

  const creature = index.find(item => item.type === 'creature' && item.name === 'Eikthyr');
  assert.equal(creature.url, '/bestiary/#c=eikthyr');

  const set = index.find(item => item.type === 'armor' && item.name === 'Troll Set');
  assert.equal(set.url, '/smithy/#set=troll-set');

  const piece = index.find(item => item.type === 'armor' && item.name.toLowerCase() === 'troll leather hood');
  assert.equal(piece.url, '/smithy/#item=troll-leather-hood');

  const weapon = index.find(item => item.type === 'weapon' && item.name === 'Abyssal Harpoon');
  assert.equal(weapon.url, '/smithy/#item=abyssal-harpoon');

  const food = JSON.parse(readFileSync('data/food.json', 'utf8'));
  assert.ok(food.length > 0);
  for (const provision of food) {
    const entry = index.find(item => item.type === 'food' && item.name === provision.name);
    assert.ok(entry, `${provision.name} must be searchable`);
    assert.equal(entry.url, `/provisions/#item=${encodeURIComponent(provision.id)}`);
  }
});

test('hub message catalog covers all 13 languages with zero missing translations', () => {
  const catalog = JSON.parse(readFileSync('apps/hub/locales/messages.json', 'utf8'));
  const languages = JSON.parse(readFileSync('shared/i18n/languages.json', 'utf8')).map(l => l.code);
  assert.equal(languages.length, 13);

  for (const [source, entries] of Object.entries(catalog)) {
    const tokens = value => [...value.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();
    for (const lang of languages) {
      assert.ok(entries[lang], `hub: ${lang}: ${source}`);
      for (const text of typeof entries[lang] === 'string' ? [entries[lang]] : Object.values(entries[lang])) {
        assert.ok(text.trim(), `hub: ${lang}: ${source}`);
        assert.deepEqual(tokens(text), tokens(source), `hub: ${lang}: ${source}`);
      }
    }
  }

  const bundle = vm.createContext({});
  vm.runInNewContext(readFileSync('apps/hub/locales/messages.js', 'utf8'), bundle);
  assert.equal(JSON.stringify(bundle.VC_MESSAGES), JSON.stringify(catalog));
});


test('search uses Provisions acquisition biomes for every food and material', () => {
  const context = vm.createContext({});
  context.window = context;
  for (const file of ['apps/provisions/data/data.js', 'apps/provisions/assets/advisor.js']) {
    vm.runInContext(readFileSync(file, 'utf8'), context);
  }
  const index = buildSearchIndex();
  const definitions = { food: context.VPR_DATA.food, material: Object.values(context.VPR_DATA.items) };
  const mismatches = [];
  for (const entry of index.filter(item => definitions[item.type])) {
    const id = decodeURIComponent(entry.url.split('=')[1]);
    const definition = definitions[entry.type].find(item => item.id === id);
    assert.ok(definition, entry.url);
    if (entry.biome !== (context.VPAdvisor.availableBiome(definition) || null)) mismatches.push(entry.url);
  }
  assert.deepEqual(mismatches, []);
  for (const type of ['food', 'material']) {
    assert.equal(index.find(item => item.type === type && item.name === 'Oats').biome, 'deep-north');

  }
  assert.ok(index.filter(item => item.url.endsWith('=bukeperries')).length);
  for (const item of index.filter(item => item.url.endsWith('=bukeperries'))) assert.equal(item.biome, 'black-forest');
});

test('armor search names are unique and single-piece sets retain the set link', () => {
  const armor = buildSearchIndex().filter(item => item.type === 'armor');
  const groups = new Map();
  for (const item of armor) {
    const key = item.name.trim().toLowerCase();
    groups.set(key, [...(groups.get(key) || []), item.url]);
  }
  const duplicates = [...groups].filter(([, urls]) => urls.length > 1);
  assert.deepEqual(duplicates, [], 'Duplicate armor names: ' + JSON.stringify(duplicates));
  const hats = armor.filter(item => item.name === 'Yule Hat');
  assert.equal(hats.length, 1);
  assert.equal(hats[0].url, '/smithy/#set=yule-hat');
});


test('every Smithy item search link targets visible gear or an item', () => {
  const index = buildSearchIndex();
  const context = vm.createContext({});
  context.window = context;
  vm.runInContext(readFileSync('apps/smithy/data/data.js', 'utf8'), context);
  const smithy = context.VA_DATA;
  const items = JSON.parse(readFileSync('data/items.json', 'utf8'));
  const targets = new Set([
    ...smithy.weapons.map(weapon => weapon.id),
    ...smithy.armor.flatMap(set => set.pieces.map(piece => piece.id)),
    ...Object.values(items).map(item => item.id),
  ]);
  const missing = index.filter(item => item.url.startsWith('/smithy/#item=') &&
    !targets.has(decodeURIComponent(item.url.split('=')[1])));
  assert.deepEqual(missing, [], 'Smithy links without a target: ' + JSON.stringify(missing));
  const visibleWeapons = new Set(smithy.weapons.map(weapon => weapon.id));
  for (const item of index.filter(item => item.type === 'weapon')) {
    assert.ok(visibleWeapons.has(decodeURIComponent(item.url.split('=')[1])), item.url);
  }
});
