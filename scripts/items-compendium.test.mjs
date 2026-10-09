import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_PATH = path.join(ROOT, 'data', 'items-compendium.json');
const CLIENT_BUNDLE_PATH = path.join(ROOT, 'apps', 'items', 'data', 'data.js');

const VALID_CATEGORIES = new Set([
  'material',
  'metal',
  'weapon',
  'shield',
  'armor',
  'ammo',
  'tool',
  'food',
  'ingredient',
  'mead',
  'drop',
  'trophy',
  'building',
  'valuable',
  'summoning',
]);

describe('Items Compendium Data & Inverted Index', () => {
  assert.ok(existsSync(DATA_PATH), 'data/items-compendium.json must exist');
  const compendium = JSON.parse(readFileSync(DATA_PATH, 'utf8'));
  const items = compendium.items;
  const itemsById = new Map(items.map((i) => [i.id, i]));

  it('1. Compendium contains the full game catalog (>= 1,000 items)', () => {
    assert.ok(Array.isArray(items), 'compendium.items should be an array');
    assert.ok(items.length >= 1000, `Expected >= 1000 items, got ${items.length}`);
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

  it('3. Item ids are unique', () => {
    assert.equal(items.length, itemsById.size, 'Duplicate ids found in compendium');
  });

  it('4. Every item has required schema properties (id, name, category, sources, usedIn, crossLinks)', () => {
    for (const item of items) {
      assert.ok(item.id, `Item must have an id: ${JSON.stringify(item)}`);
      assert.ok(item.name, `Item ${item.id} must have a name`);
      assert.ok(
        VALID_CATEGORIES.has(item.category),
        `Item ${item.id} has invalid category: ${item.category}`
      );
      assert.ok(item.sources, `Item ${item.id} must have sources`);
      assert.ok(item.usedIn, `Item ${item.id} must have usedIn`);
      assert.ok(item.crossLinks && typeof item.crossLinks === 'object', `Item ${item.id} must have crossLinks`);
    }
  });

  it('5. Every item has a valid biome (string or null) and tier (number or null)', () => {
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

  it('6. Every image path is resolved to an existing app (starts with ../) or null', () => {
    for (const item of items) {
      assert.ok(
        item.image === null || item.image.startsWith('../'),
        `Item ${item.id} has unresolved image path: ${item.image}`
      );
    }
  });

  it('7. Iron has weapons in usedIn.weapons', () => {
    const iron = itemsById.get('iron');
    assert.ok(iron, 'Iron must exist in items compendium');
    assert.ok(
      Array.isArray(iron.usedIn.weapons) && iron.usedIn.weapons.length > 0,
      'Iron must have weapons in usedIn.weapons'
    );
  });

  it('8. Iron has armor in usedIn.armor', () => {
    const iron = itemsById.get('iron');
    assert.ok(
      Array.isArray(iron.usedIn.armor) && iron.usedIn.armor.length > 0,
      'Iron must have armor in usedIn.armor'
    );
  });

  it('9. Iron has stations in usedIn.stations (Stonecutter)', () => {
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

  it('10. Iron has comfort furniture in usedIn.comfort (Hot Tub)', () => {
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

  it('11. Deer Hide has creature deer in sources.creatures', () => {
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

  it('12. Ancient Seed has boss the-elder in usedIn.expedition', () => {
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

  it('13. Bronze recipe contains copper and tin (top-level recipe)', () => {
    const bronze = itemsById.get('bronze');
    assert.ok(bronze, 'Bronze must exist');
    assert.ok(bronze.recipe, 'Bronze must have a top-level recipe');
    const materials = bronze.recipe.materials;
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

  it('14. Teleportable is false for metals and ores', () => {
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

  it('15. Teleportable is true for standard materials', () => {
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

  it('16. Food ingredients and meads are properly indexed in usedIn', () => {
    const honey = itemsById.get('honey');
    assert.ok(honey, 'Honey must exist');
    assert.ok(
      honey.usedIn.food.length > 0 || honey.usedIn.meads.length > 0,
      'Honey must be used in food or meads'
    );
  });

  // --- VC-40b: full catalog coverage --------------------------------

  it('17. Weapon catalog: 80+ weapons, shields and tools with Smithy cross-links', () => {
    const weapons = items.filter((i) => i.category === 'weapon');
    const shields = items.filter((i) => i.category === 'shield');
    const tools = items.filter((i) => i.category === 'tool');
    assert.ok(weapons.length >= 80, `Expected 80+ weapons, got ${weapons.length}`);
    assert.ok(shields.length >= 15, `Expected 15+ shields, got ${shields.length}`);
    assert.ok(tools.length >= 4, `Expected 4+ tools (pickaxes), got ${tools.length}`);
    for (const w of [...weapons, ...shields]) {
      assert.ok(
        w.crossLinks && typeof w.crossLinks.smithy === 'string' && w.crossLinks.smithy.includes('/smithy/'),
        `Weapon/shield ${w.id} must link to Smithy`
      );
    }
    for (const tool of tools) {
      // Pickaxes are smithed; Fishing Rod is sold by Haldor; building tools & boss drops are self-contained.
      if (['antler-pickaxe', 'bronze-pickaxe', 'iron-pickaxe', 'black-metal-pickaxe'].includes(tool.id)) {
        assert.ok(tool.crossLinks?.smithy, `Pickaxe ${tool.id} must link to Smithy`);
      } else if (tool.id === 'fishing-rod' || tool.id === 'fishing-bait') {
        assert.ok(tool.crossLinks?.traders, `Tool ${tool.id} must link to Trader Ledger`);
      }
    }
  });

  it('18. iron-sword is a weapon crafted at Forge with Iron, Wood and Leather Scraps', () => {
    const is = itemsById.get('iron-sword');
    assert.ok(is, 'iron-sword must exist');
    assert.equal(is.category, 'weapon');
    assert.ok(is.station, 'iron-sword must have a crafting station');
    assert.equal(is.station.name, 'Forge');
    assert.ok(is.station.level >= 1, 'iron-sword station level must be set');
    const mats = is.recipe?.materials || [];
    assert.ok(mats.some((m) => m.item === 'iron'), 'iron-sword recipe must contain Iron');
    assert.ok(mats.some((m) => m.item === 'wood'), 'iron-sword recipe must contain Wood');
    assert.ok(is.crossLinks.smithy === '/smithy/#item=iron-sword', 'iron-sword must link to Smithy');
  });

  it('19. Armor catalog: 100+ pieces with recipes and Smithy cross-links', () => {
    const armor = items.filter((i) => i.category === 'armor');
    assert.ok(armor.length >= 100, `Expected 100+ armor pieces, got ${armor.length}`);
    const withRecipe = armor.filter((a) => a.recipe && a.recipe.materials.length > 0);
    assert.ok(withRecipe.length >= 60, `Expected 60+ armor recipes, got ${withRecipe.length}`);
    for (const a of armor) {
      if (a.id === 'wishbone' || a.sources?.traders?.length > 0 || a.crossLinks?.traders) continue;
      assert.ok(
        a.crossLinks && typeof a.crossLinks.smithy === 'string',
        `Armor ${a.id} must link to Smithy`
      );
    }
  });

  it('20. root-harnesk is armor with Root, Ancient Bark and Deer Hide', () => {
    const rh = itemsById.get('root-harnesk');
    assert.ok(rh, 'root-harnesk must exist');
    assert.equal(rh.category, 'armor');
    const mats = rh.recipe?.materials || [];
    assert.ok(mats.some((m) => m.item === 'root'), 'root-harnesk must contain Root');
    assert.ok(mats.some((m) => m.item === 'ancient-bark'), 'root-harnesk must contain Elder Bark (Ancient Bark)');
    assert.ok(mats.some((m) => m.item === 'deer-hide'), 'root-harnesk must contain Deer Hide');
    assert.ok(rh.crossLinks.smithy.includes('/smithy/'), 'root-harnesk must link to Smithy');
  });

  it('21. Food catalog: 90+ foods with stats and Provisions cross-links', () => {
    const food = items.filter((i) => i.category === 'food');
    assert.ok(food.length >= 90, `Expected 90+ foods, got ${food.length}`);
    for (const f of food) {
      assert.ok(
        f.crossLinks && typeof f.crossLinks.provisions === 'string' && f.crossLinks.provisions.includes('/provisions/'),
        `Food ${f.id} must link to Provisions`
      );
    }
  });

  it('22. sausages is food made of Entrails, Boar Meat and Thistle at Cauldron level 2', () => {
    const s = itemsById.get('sausages');
    assert.ok(s, 'sausages must exist');
    assert.equal(s.category, 'food');
    assert.equal(s.recipe.station, 'Cauldron');
    assert.ok(s.recipe.stationLevel >= 2, 'sausages need Cauldron level 2');
    const mats = s.recipe.materials;
    assert.ok(mats.some((m) => m.item === 'entrails'), 'sausages must contain Entrails');
    assert.ok(mats.some((m) => ['boar-meat', 'raw-meat'].includes(m.item)), 'sausages must contain meat');
    assert.ok(mats.some((m) => m.item === 'thistle'), 'sausages must contain Thistle');
    assert.ok(s.stats && s.stats.health > 0, 'sausages must carry food stats');
  });

  it('23. Mead catalog: 20+ meads with Provisions cross-links', () => {
    const meads = items.filter((i) => i.category === 'mead');
    assert.ok(meads.length >= 20, `Expected 20+ meads, got ${meads.length}`);
    for (const m of meads) {
      assert.ok(
        m.crossLinks && typeof m.crossLinks.provisions === 'string',
        `Mead ${m.id} must link to Provisions`
      );
    }
  });

  it('24. Comfort furniture: 70+ pieces with Comfort Planner cross-links', () => {
    const comfort = items.filter((i) => i.category === 'building' && i.crossLinks && i.crossLinks.comfort);
    assert.ok(comfort.length >= 70, `Expected 70+ comfort pieces, got ${comfort.length}`);
    const throne = itemsById.get('antler-throne');
    assert.ok(throne, 'antler-throne must exist');
    assert.ok(throne.stats && throne.stats.comfort >= 1, 'antler-throne must have comfort value');
  });

  it('25. Trader merchandise: items carry trader source and Trader Ledger cross-link', () => {
    const megingjord = itemsById.get('megingjord');
    assert.ok(megingjord, 'megingjord must exist');
    assert.ok(megingjord.sources.traders.length > 0, 'megingjord must be sold by a trader');
    assert.equal(megingjord.sources.traders[0].id, 'haldor');
    assert.ok(
      megingjord.crossLinks.traders === '/traders/#trader=haldor',
      'megingjord must link to Trader Ledger'
    );
    const ymirFlesh = itemsById.get('ymir-flesh');
    assert.ok(ymirFlesh?.sources.traders?.some((tr) => tr.id === 'haldor'), 'ymir-flesh must be sold by Haldor');
    assert.ok(ymirFlesh.crossLinks.traders, 'ymir-flesh must link to Trader Ledger');
  });

  it('26. copper is indexed in weapon and station recipes (direct uses)', () => {
    const copper = itemsById.get('copper');
    assert.ok(copper, 'copper must exist');
    assert.ok(
      copper.usedIn.weapons.some((w) => w.id === 'copper-knife'),
      'copper must be used in Copper Knife'
    );
    assert.ok(
      copper.usedIn.stations.length > 0,
      'copper must be used in stations (Forge/Smelter)'
    );
    const bronze = itemsById.get('bronze');
    assert.ok(
      bronze.usedIn.weapons.length > 0 && bronze.usedIn.armor.length > 0,
      'bronze must be used in both weapons and armor'
    );
  });

  it('27. frost-arrow exists as craftable ammunition', () => {
    const fa = itemsById.get('frost-arrow');
    assert.ok(fa, 'frost-arrow must exist');
    assert.equal(fa.category, 'ammo', 'frost-arrow is ammunition category');
    assert.ok(fa.recipe && fa.recipe.materials.length > 0, 'frost-arrow must have a recipe');
    assert.ok(fa.crossLinks.smithy.includes('/smithy/'), 'frost-arrow must link to Smithy');
  });

  it('28. usedIn entries reference compendium items where applicable (itemId links)', () => {
    const iron = itemsById.get('iron');
    const linked = iron.usedIn.weapons.filter((w) => w.itemId && itemsById.has(w.itemId));
    assert.ok(
      linked.length === iron.usedIn.weapons.length,
      'Every weapon in iron.usedIn must reference a compendium item'
    );
  });

  it('29. Boss summoning items are categorized as summoning', () => {
    for (const id of ['ancient-seed', 'withered-bone', 'dragon-egg', 'fuling-totem', 'sealbreaker']) {
      const it = itemsById.get(id);
      assert.ok(it, `${id} must exist`);
      assert.equal(it.category, 'summoning', `${id} must be summoning`);
    }
  });

  it('30. Dragon Egg cannot be teleported', () => {
    const egg = itemsById.get('dragon-egg');
    assert.ok(egg, 'dragon-egg must exist');
    assert.equal(egg.teleportable, false, 'dragon-egg must not be teleportable');
  });

  it('31. Key missing items exist: Queen Bee, Wishbone, Hammer, Cart, Smelter, Seeds', () => {
    for (const key of ['queen-bee', 'wishbone', 'hammer', 'cart', 'smelter', 'carrot-seeds', 'turnip-seeds', 'swamp-key', 'lox-saddle']) {
      assert.ok(itemsById.has(key), `Key item ${key} must exist in items compendium`);
    }
  });

  it('32. Trophy catalog has 60+ creature trophies with Bestiary creature sources', () => {
    const trophies = items.filter((i) => i.category === 'trophy');
    assert.ok(trophies.length >= 60, `Expected 60+ trophies, got ${trophies.length}`);
    const trollTrophy = itemsById.get('troll-trophy');
    assert.ok(trollTrophy, 'troll-trophy must exist');
    assert.ok(trollTrophy.sources.creatures.length > 0, 'troll-trophy must have creature source');
    const abomTrophy = itemsById.get('abomination-trophy');
    assert.ok(abomTrophy, 'abomination-trophy must exist');
    assert.ok(abomTrophy.sources.creatures.length > 0, 'abomination-trophy must have creature source');
  });

  it('33. Crafting stations and building structures are present (Smelter, Cart, Chests)', () => {
    const smelter = itemsById.get('smelter');
    assert.ok(smelter, 'smelter must exist');
    assert.equal(smelter.category, 'building');
    const cart = itemsById.get('cart');
    assert.ok(cart, 'cart must exist');
    assert.equal(cart.category, 'building');
  });

  it('34. Queen Bee is indexed and used in Beehive', () => {
    const qb = itemsById.get('queen-bee');
    assert.ok(qb, 'queen-bee must exist');
    assert.ok(
      qb.usedIn.stations.some((s) => s.id === 'beehive' || s.name.toLowerCase().includes('bee')),
      'queen-bee must be used in Beehive'
    );
  });

  it('35. Stacks & piles have accurate biomes and building category', () => {
    const copperStack = itemsById.get('copper-stack');
    assert.ok(copperStack, 'copper-stack must exist');
    assert.equal(copperStack.category, 'building');
    assert.equal(copperStack.biome, 'black-forest');
    assert.equal(copperStack.tier, 2);

    const woodStack = itemsById.get('wood-stack');
    assert.ok(woodStack, 'wood-stack must exist');
    assert.equal(woodStack.category, 'building');
    assert.equal(woodStack.biome, 'meadows');

    const ironStack = itemsById.get('iron-stack');
    assert.ok(ironStack, 'iron-stack must exist');
    assert.equal(ironStack.category, 'building');
    assert.equal(ironStack.biome, 'swamp');
  });

  it('36. Magic staves and payloads are categorized as weapons with valid biomes', () => {
    const staff = itemsById.get('staff-of-protection');
    assert.ok(staff, 'staff-of-protection must exist');
    assert.equal(staff.category, 'weapon');
    assert.equal(staff.biome, 'mistlands');

    const deadRaiser = itemsById.get('dead-raiser');
    assert.ok(deadRaiser, 'dead-raiser must exist');
    assert.equal(deadRaiser.category, 'weapon');
    assert.equal(deadRaiser.biome, 'mistlands');

    const bomb = itemsById.get('basalt-bomb');
    assert.ok(bomb, 'basalt-bomb must exist');
    assert.equal(bomb.category, 'weapon');
    assert.equal(bomb.biome, 'ashlands');
  });

  it('37. Metals are indexed in usedIn.crafting for craftable products', () => {
    const copper = itemsById.get('copper');
    assert.ok(copper, 'copper must exist');
    assert.ok(copper.usedIn.crafting.some((c) => c.id === 'bronze'), 'copper must have bronze in usedIn.crafting');

    const tin = itemsById.get('tin');
    assert.ok(tin, 'tin must exist');
    assert.ok(tin.usedIn.crafting.some((c) => c.id === 'bronze'), 'tin must have bronze in usedIn.crafting');

    const iron = itemsById.get('iron');
    assert.ok(iron, 'iron must exist');
    assert.ok(iron.usedIn.crafting.some((c) => c.id === 'iron-nails'), 'iron must have iron-nails in usedIn.crafting');
  });

  it('38. Debug items and non-items are excluded from compendium', () => {
    for (const bad of ['none', 'copper-deposit', 'ancient-metal-stack', 'cheat-sword', 'cheat-sledge', 'cape-test', 't-w-i-g']) {
      assert.ok(!itemsById.has(bad), `Junk/debug item ${bad} must not exist in compendium`);
    }
  });

  it('39. 100% of items have a valid non-null biome and tier', () => {
    const nullBiomes = items.filter((i) => !i.biome || i.tier == null);
    assert.equal(nullBiomes.length, 0, `Expected 0 items with null biome, found ${nullBiomes.length}`);
  });

  it('40. All 15 clean categories are populated with realistic item counts', () => {
    const counts = {};
    for (const item of items) {
      counts[item.category] = (counts[item.category] || 0) + 1;
    }
    assert.ok(counts.material >= 80, `Expected >= 80 materials, got ${counts.material}`);
    assert.ok(counts.metal >= 15, `Expected >= 15 metals, got ${counts.metal}`);
    assert.ok(counts.weapon >= 80, `Expected >= 80 weapons, got ${counts.weapon}`);
    assert.ok(counts.shield >= 25, `Expected >= 25 shields, got ${counts.shield}`);
    assert.ok(counts.armor >= 130, `Expected >= 130 armors, got ${counts.armor}`);
    assert.ok(counts.ammo >= 20, `Expected >= 20 ammo items, got ${counts.ammo}`);
    assert.ok(counts.tool >= 20, `Expected >= 20 tools, got ${counts.tool}`);
    assert.ok(counts.food >= 90, `Expected >= 90 foods, got ${counts.food}`);
    assert.ok(counts.ingredient >= 50, `Expected >= 50 ingredients, got ${counts.ingredient}`);
    assert.ok(counts.mead >= 20, `Expected >= 20 meads, got ${counts.mead}`);
    assert.ok(counts.drop >= 90, `Expected >= 90 monster drops, got ${counts.drop}`);
    assert.ok(counts.trophy >= 60, `Expected >= 60 trophies, got ${counts.trophy}`);
    assert.ok(counts.building >= 180, `Expected >= 180 building pieces, got ${counts.building}`);
    assert.ok(counts.valuable >= 25, `Expected >= 25 valuables, got ${counts.valuable}`);
    assert.ok(counts.summoning >= 10, `Expected >= 10 summoning items, got ${counts.summoning}`);
  });

  it('41. All 9 Fishing Baits are present in the compendium with recipes and biomes', () => {
    const baits = [
      'fishing-bait', 'mossy-fishing-bait', 'sticky-fishing-bait', 'cold-fishing-bait',
      'heavy-fishing-bait', 'misty-fishing-bait', 'hot-fishing-bait', 'frosty-fishing-bait',
      'stingy-fishing-bait',
    ];
    for (const b of baits) {
      const it = itemsById.get(b);
      assert.ok(it, `Fishing bait ${b} must exist in compendium`);
      assert.equal(it.category, 'tool', `${b} should be categorized as tool`);
      assert.ok(it.biome, `${b} must have a biome`);
      assert.ok(it.recipe || it.sources?.traders?.length > 0, `${b} must have a recipe or trader source`);
    }
  });

  it('42. Basic building materials are categorized as material (not monster drop)', () => {
    const matIds = ['wood', 'stone', 'flint', 'finewood', 'corewood', 'ancient-bark', 'black-marble', 'tar', 'coal', 'iron-nails'];
    for (const id of matIds) {
      const it = itemsById.get(id);
      assert.ok(it, `Material ${id} must exist`);
      assert.equal(it.category, 'material', `${id} must be material, not drop`);
    }
  });

  it('43. Crops and cooking ingredients are categorized as ingredient (not drop or mead)', () => {
    const ingIds = ['barley', 'turnip', 'bread-dough', 'boar-meat', 'dandelion', 'thistle', 'neck-tail', 'barley-flour', 'flax'];
    for (const id of ingIds) {
      const it = itemsById.get(id);
      assert.ok(it, `Ingredient ${id} must exist`);
      assert.equal(it.category, 'ingredient', `${id} must be ingredient`);
    }
  });

  it('44. Iron Nails is teleportable material and not non-teleportable metal', () => {
    const nails = itemsById.get('iron-nails');
    assert.ok(nails, 'iron-nails must exist');
    assert.equal(nails.category, 'material');
    assert.equal(nails.teleportable, true, 'iron-nails must be teleportable');
  });
});
