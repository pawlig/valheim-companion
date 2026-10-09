import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_PATH = path.join(ROOT, 'data', 'items-compendium.json');
const CLIENT_BUNDLE_PATH = path.join(ROOT, 'apps', 'items', 'data', 'data.js');

describe('Items Compendium Data & Inverted Index', () => {
  assert.ok(existsSync(DATA_PATH), 'data/items-compendium.json must exist');
  const compendium = JSON.parse(readFileSync(DATA_PATH, 'utf8'));
  const items = compendium.items;
  const itemsById = new Map(items.map((i) => [i.id, i]));

  it('1. Compendium contains > 200 items', () => {
    assert.ok(Array.isArray(items), 'compendium.items should be an array');
    assert.ok(items.length > 200, `Expected > 200 items, got ${items.length}`);
  });

  it('2. Client bundle apps/items/data/data.js exists and exports globalThis.VC_ITEMS_DATA', () => {
    assert.ok(existsSync(CLIENT_BUNDLE_PATH), 'apps/items/data/data.js must exist');
    const code = readFileSync(CLIENT_BUNDLE_PATH, 'utf8');
    const ctx = { globalThis: {} };
    ctx.globalThis.globalThis = ctx.globalThis;
    vm.createContext(ctx);
    vm.runInContext(code, ctx);
    assert.ok(ctx.globalThis.VC_ITEMS_DATA, 'VC_ITEMS_DATA should be defined on globalThis');
    assert.equal(ctx.globalThis.VC_ITEMS_DATA.items.length, items.length);
  });

  it('3. Every item has required schema properties (id, name, category, sources, usedIn)', () => {
    const validCategories = new Set([
      'metal',
      'drop',
      'trophy',
      'food-ingredient',
      'building',
      'valuable',
      'summoning',
    ]);
    for (const item of items) {
      assert.ok(item.id, `Item must have an id: ${JSON.stringify(item)}`);
      assert.ok(item.name, `Item ${item.id} must have a name`);
      assert.ok(
        validCategories.has(item.category),
        `Item ${item.id} has invalid category: ${item.category}`
      );
      assert.ok(item.sources, `Item ${item.id} must have sources`);
      assert.ok(item.usedIn, `Item ${item.id} must have usedIn`);
    }
  });

  it('4. Every item has a valid biome (string or null) and tier (number or null)', () => {
    for (const item of items) {
      assert.ok(
        item.biome === null || typeof item.biome === 'string',
        `Item ${item.id} has invalid biome: ${item.biome}`
      );
      assert.ok(
        item.tier === null || typeof item.tier === 'number',
        `Item ${item.id} has invalid tier: ${item.tier}`
      );
    }
  });

  it('5. Iron has weapons in usedIn.weapons', () => {
    const iron = itemsById.get('iron');
    assert.ok(iron, 'Iron must exist in items compendium');
    assert.ok(
      Array.isArray(iron.usedIn.weapons) && iron.usedIn.weapons.length > 0,
      'Iron must have weapons in usedIn.weapons'
    );
  });

  it('6. Iron has armor in usedIn.armor', () => {
    const iron = itemsById.get('iron');
    assert.ok(
      Array.isArray(iron.usedIn.armor) && iron.usedIn.armor.length > 0,
      'Iron must have armor in usedIn.armor'
    );
  });

  it('7. Iron has stations in usedIn.stations', () => {
    const iron = itemsById.get('iron');
    assert.ok(
      Array.isArray(iron.usedIn.stations) && iron.usedIn.stations.length > 0,
      'Iron must have stations in usedIn.stations'
    );
    assert.ok(
      iron.usedIn.stations.some((s) => s.id === 'stonecutter'),
      'Iron must be used in Stonecutter'
    );
  });

  it('8. Iron has comfort furniture in usedIn.comfort', () => {
    const iron = itemsById.get('iron');
    assert.ok(
      Array.isArray(iron.usedIn.comfort) && iron.usedIn.comfort.length > 0,
      'Iron must have comfort furniture in usedIn.comfort'
    );
    assert.ok(
      iron.usedIn.comfort.some((c) => c.id === 'hot-tub'),
      'Iron must be used in Hot Tub'
    );
  });

  it('9. Deer Hide has creature deer in sources.creatures', () => {
    const deerHide = itemsById.get('deer-hide');
    assert.ok(deerHide, 'Deer Hide must exist');
    assert.ok(
      Array.isArray(deerHide.sources.creatures),
      'sources.creatures must be an array'
    );
    const deer = deerHide.sources.creatures.find((c) => c.id === 'deer');
    assert.ok(deer, 'Deer Hide must have creature deer in sources.creatures');
    assert.equal(deer.name, 'Deer');
  });

  it('10. Ancient Seed has boss the-elder in usedIn.expedition', () => {
    const seed = itemsById.get('ancient-seed');
    assert.ok(seed, 'Ancient Seed must exist');
    assert.ok(
      Array.isArray(seed.usedIn.expedition),
      'usedIn.expedition must be an array'
    );
    const elder = seed.usedIn.expedition.find(
      (b) => b.bossId === 'the-elder' || b.id === 'the-elder'
    );
    assert.ok(elder, 'Ancient Seed must have the-elder in usedIn.expedition');
  });

  it('11. Bronze has copper and tin in sources.recipe', () => {
    const bronze = itemsById.get('bronze');
    assert.ok(bronze, 'Bronze must exist');
    assert.ok(bronze.sources.recipe, 'Bronze must have a recipe');
    const materials = bronze.sources.recipe.materials;
    assert.ok(Array.isArray(materials), 'recipe.materials must be an array');
    const hasCopper = materials.some(
      (m) => m.item === 'copper' || (m.name && m.name.toLowerCase().includes('copper'))
    );
    const hasTin = materials.some(
      (m) => m.item === 'tin' || (m.name && m.name.toLowerCase().includes('tin'))
    );
    assert.ok(hasCopper, 'Bronze recipe must contain copper');
    assert.ok(hasTin, 'Bronze recipe must contain tin');
  });

  it('12. Teleportable is false for metals and ores', () => {
    const metals = ['copper', 'tin', 'bronze', 'iron', 'silver', 'black-metal', 'flametal', 'copper-ore', 'tin-ore', 'iron-ore', 'scrap-iron'];
    for (const mId of metals) {
      const it = itemsById.get(mId);
      if (it) {
        assert.equal(
          it.teleportable,
          false,
          `Metal/ore ${mId} must have teleportable: false`
        );
      }
    }
  });

  it('13. Teleportable is true for standard materials', () => {
    const normalItems = ['wood', 'stone', 'deer-hide', 'leather-scraps'];
    for (const normId of normalItems) {
      const it = itemsById.get(normId);
      if (it) {
        assert.equal(
          it.teleportable,
          true,
          `Standard material ${normId} should have teleportable: true`
        );
      }
    }
  });

  it('14. Food ingredients and meads are properly indexed in usedIn', () => {
    const honey = itemsById.get('honey');
    assert.ok(honey, 'Honey must exist');
    assert.ok(
      honey.usedIn.food.length > 0 || honey.usedIn.meads.length > 0,
      'Honey must be used in food or meads'
    );
  });
});
