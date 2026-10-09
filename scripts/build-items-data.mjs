// Build script for Items Compendium dataset and inverted index (VC-39, VC-40b).
//
// Merges every game dataset into one unified catalog:
//   data/items.json     base materials, drops, trophies, valuables, summoning items
//   data/weapons.json   weapons, shields, ammo, bombs, pickaxes (171)
//   data/armor.json     armor sets and single pieces (113 pieces)
//   apps/provisions     cooked foods (99) and meads (21) with stats and recipes
//   data/comfort.json   comfort furniture (76)
//   data/traders.json   trader merchandise (38, merged or added as valuables)
//
// Output: data/items-compendium.json + apps/items/data/data.js (VC_ITEMS_DATA).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = path.join(ROOT, 'data');
const APPS_DIR = path.join(ROOT, 'apps');

function loadJson(relPath) {
  return JSON.parse(readFileSync(path.join(DATA_DIR, relPath), 'utf8'));
}

function slug(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// App folders that may hold the image for a dataset-relative path like
// "img/weapons/iron-sword.png". The first existing file wins, so the bundle
// never points at missing images.
const IMAGE_APP_ROOTS = ['smithy', 'provisions', 'comfort', 'bestiary', 'traders'];
const missingImages = [];

function resolveImage(raw, preferredApp) {
  if (!raw) return null;
  if (raw.startsWith('../')) {
    return existsSync(path.join(APPS_DIR, raw.replace('../', ''))) ? raw : null;
  }
  const roots = preferredApp
    ? [preferredApp, ...IMAGE_APP_ROOTS.filter((r) => r !== preferredApp)]
    : IMAGE_APP_ROOTS;
  for (const app of roots) {
    const rel = `../${app}/${raw}`;
    if (existsSync(path.join(APPS_DIR, app, raw))) return rel;
  }
  missingImages.push(raw);
  return null;
}

// Pretty display names for station ids used by the comfort dataset.
const STATION_NAME_OVERRIDES = {
  workbench: 'Workbench',
  forge: 'Forge',
  'stonecutter': 'Stonecutter',
};

function prettyStationName(raw) {
  if (!raw) return null;
  const id = String(raw).toLowerCase();
  if (STATION_NAME_OVERRIDES[id]) return STATION_NAME_OVERRIDES[id];
  return String(raw)
    .split(/[\s-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function buildItemsData() {
  const items = loadJson('items.json');
  const weapons = loadJson('weapons.json');
  const armor = loadJson('armor.json');
  const comfort = loadJson('comfort.json');
  const expedition = loadJson('expedition.json');
  const creatures = loadJson('creatures.json');
  const stations = loadJson('stations.json');
  const traders = loadJson('traders.json');

  // Load provisions data via VM
  const provContext = { window: {}, globalThis: {} };
  provContext.globalThis.window = provContext.window;
  vm.createContext(provContext);
  const provCode = readFileSync(path.join(APPS_DIR, 'provisions', 'data', 'data.js'), 'utf8');
  vm.runInContext(provCode, provContext);
  const provData = provContext.window.VPR_DATA || {};
  const provFood = provData.food || [];
  const provMeads = provData.meads || [];
  const provItemsById = new Map(Object.entries(provData.items || {}));
  const provStationNames = new Map((provData.stations || []).map((s) => [s.id, s.name]));

  const itemById = new Map(items.map((it) => [it.id, it]));
  const itemByName = new Map(items.map((it) => [it.name.toLowerCase(), it]));

  const summonIds = new Set([
    'ancient-seed',
    'withered-bone',
    'dragon-egg',
    'fuling-totem',
    'sealbreaker',
    'bell',
    'malicious-blood',
    'bell-fragment',
    'sealbreaker-fragment',
  ]);

  const nonTeleportableMetals = new Set([
    'copper',
    'copper-ore',
    'copper-scrap',
    'tin',
    'tin-ore',
    'bronze',
    'bronze-nails',
    'scrap-bronze',
    'iron',
    'iron-ore',
    'scrap-iron',
    'iron-nails',
    'iron-pit',
    'silver',
    'silver-ore',
    'black-metal',
    'black-metal-scrap',
    'flametal',
    'flametal-ore',
    'bloodgold',
    'petrified-tissue',
    'dragon-egg',
  ]);

  const metalOres = new Set([
    'copper',
    'copper-ore',
    'copper-scrap',
    'tin',
    'tin-ore',
    'bronze',
    'bronze-nails',
    'scrap-bronze',
    'iron',
    'iron-ore',
    'scrap-iron',
    'iron-nails',
    'iron-pit',
    'silver',
    'silver-ore',
    'black-metal',
    'black-metal-scrap',
    'flametal',
    'flametal-ore',
    'bloodgold',
  ]);

  // Tools that live in the weapon tables (building Hammer/Hoe/Cultivator are
  // not craftable weapons and are not part of the smithing datasets).
  const WEAPON_TOOL_IDS = new Set([
    'antler-pickaxe',
    'bronze-pickaxe',
    'iron-pickaxe',
    'black-metal-pickaxe',
    'fishing-rod',
  ]);

  function determineCategory(item) {
    const id = item.id;
    const nameLower = (item.name || '').toLowerCase();

    // 1. Trophies
    if (id.endsWith('-trophy') || id.includes('trophy') || nameLower.includes('trophy')) {
      return 'trophy';
    }

    // 2. Boss Summoning
    if (summonIds.has(id) || (item.addedBy === 'expedition' && id !== 'portal')) {
      return 'summoning';
    }

    // 3. Metals & Ores
    if (
      metalOres.has(id) ||
      id.endsWith('-ore') ||
      (id.includes('-scrap') && (id.includes('copper') || id.includes('metal'))) ||
      id === 'scrap-bronze' ||
      id === 'scrap-iron'
    ) {
      return 'metal';
    }

    // 4. Valuables & Traders
    if (
      ['amber', 'amber-pearl', 'ruby', 'silver-necklace', 'coins', 'ymir-flesh', 'barber-kit'].includes(id) ||
      (item.sources || []).some((s) => s.kind === 'npc' && !item.provisions)
    ) {
      return 'valuable';
    }

    // 5. Food Ingredients
    if (item.provisions || item.category === 'food' || (item.sources || []).some((s) => s.kind === 'npc' && item.provisions)) {
      return 'food-ingredient';
    }

    // 6. Monster Drops
    const hasCreatureSource =
      (item.sources || []).some((s) => s.kind === 'creature') ||
      creatures.some((c) =>
        (c.drops || []).some((d) => {
          const clean = d.replace(/\s*x\d+/i, '').replace(/\s*\(.*?\)/g, '').trim().toLowerCase();
          return clean === nameLower || slug(clean) === id;
        })
      );
    if (hasCreatureSource) {
      return 'drop';
    }

    // 7. Building & Crafting
    return 'building';
  }

  // -----------------------------------------------------------------------
  // Unified registry: id -> compendium record. Records are created from
  // data/items.json first, then enriched/reclassified by the other datasets.
  // -----------------------------------------------------------------------
  const registry = new Map();
  const order = [];

  function ensure(id, defaults) {
    let rec = registry.get(id);
    if (!rec) {
      rec = defaults;
      registry.set(id, rec);
      order.push(id);
    }
    return rec;
  }

  // --- 1. Base materials from items.json -------------------------------
  const provFoodIds = new Set(provFood.map((f) => f.id));
  for (const it of items) {
    const provEntry = provItemsById.get(it.id);
    // Only eatable dishes become "food"; raw ingredients keep their own category.
    const category = provFoodIds.has(it.id) ? 'food' : determineCategory(it);

    let teleportable = true;
    if (it.teleportable === false || provEntry?.teleportable === false || nonTeleportableMetals.has(it.id) || category === 'metal') {
      teleportable = false;
    }

    const recipeSource = it.recipe || provEntry?.recipe || null;

    registry.set(it.id, {
      id: it.id,
      name: it.name,
      image: resolveImage(it.image, 'smithy'),
      biome: it.biome ?? null,
      tier: it.tier ?? null,
      category,
      teleportable,
      stack: it.stack ?? provEntry?.stack ?? null,
      weight: it.weight ?? provEntry?.weight ?? null,
      wiki: it.wiki || provEntry?.wiki || null,
      names: it.names || {},
      description: it.description || provEntry?.description || null,
      stats: null,
      recipe: null,
      station: null,
      sources: {
        creatures: [],
        locations: (it.sources || []).filter((s) => s.kind === 'location' || s.kind === 'other'),
        traders: [],
        raw: it.sources || [],
      },
      usedIn: null, // filled once all recipes are known
      crossLinks: {},
    });
    order.push(it.id);

    if (recipeSource) {
      const rec = registry.get(it.id);
      rec.recipe = {
        station: recipeSource.station || null,
        stationLevel: recipeSource.stationLevel || 1,
        yields: recipeSource.yields || 1,
        materials: (recipeSource.materials || []).map((m) => ({
          item: m.item || slug(m.name),
          name: m.name || itemById.get(m.item)?.name || m.item,
          amount: m.amount || 1,
        })),
      };
    }
  }

  // --- 2. Weapons, shields, ammo and tools from weapons.json ------------
  function weaponCategory(w) {
    if ((w.type || '').includes('Shield')) return 'shield';
    if (WEAPON_TOOL_IDS.has(w.id) || (w.type || '').toLowerCase().includes('pickaxe')) return 'tool';
    return 'weapon';
  }

  for (const w of weapons) {
    const category = weaponCategory(w);
    const level1 = (w.levels || [])[0] || {};
    const base = registry.get(w.id);

    const record = {
      id: w.id,
      name: w.name,
      image: resolveImage(w.image, 'bestiary'),
      biome: w.biome ?? null,
      tier: w.tier ?? null,
      category,
      teleportable: true,
      stack: w.quantity ?? null,
      weight: null,
      wiki: w.wiki || null,
      names: w.names || {},
      description: w.description || null,
      stats: {
        damage: w.damage || null,
        damageMax: w.damageMax || null,
        stamina: w.stamina ?? null,
        blockArmor: w.blockArmor ?? null,
        skill: w.skill || null,
        hands: w.hands || null,
        maxQuality: w.maxQuality ?? 1,
      },
      recipe:
        level1.materials && level1.materials.length
          ? {
              station: w.station || null,
              stationLevel: level1.stationLevel || w.stationLevel || 1,
              yields: 1,
              materials: level1.materials.map((m) => ({
                item: m.item || slug(m.name),
                name: m.name || itemById.get(m.item)?.name || m.item,
                amount: m.amount || 1,
              })),
            }
          : null,
      station: w.station ? { name: w.station, level: level1.stationLevel || w.stationLevel || 1 } : null,
      sources: base
        ? base.sources
        : {
            creatures: [],
            locations: [],
            traders: [],
            raw: [],
          },
      usedIn: null,
      crossLinks: { smithy: `/smithy/#item=${w.id}` },
    };

    if (base) {
      // Weapons already catalogued in items.json keep their collected sources.
      Object.assign(base, {
        image: record.image || base.image,
        category,
        stats: record.stats,
        recipe: record.recipe || base.recipe,
        station: record.station,
        description: record.description || base.description,
        wiki: record.wiki || base.wiki,
        crossLinks: { ...base.crossLinks, smithy: `/smithy/#item=${w.id}` },
      });
    } else {
      registry.set(w.id, record);
      order.push(w.id);
    }
  }

  // --- 3. Armor pieces from armor.json ----------------------------------
  for (const entry of armor) {
    const isSet = entry.kind === 'set';
    for (const piece of entry.pieces || []) {
      const level1 = (piece.levels || [])[0] || {};
      const lastLevel = (piece.levels || [])[(piece.levels || []).length - 1] || {};
      const mats = (level1.materials || []).map((m) => ({
        item: m.item || slug(m.name),
        name: m.name || itemById.get(m.item)?.name || registry.get(m.item)?.name || m.item,
        amount: m.amount || 1,
      }));

      registry.set(piece.id, {
        id: piece.id,
        name: piece.name,
        image: resolveImage(piece.image, 'smithy'),
        biome: entry.biome ?? null,
        tier: entry.tier ?? null,
        category: 'armor',
        teleportable: true,
        stack: null,
        weight: piece.weight ?? null,
        wiki: piece.wiki || entry.wiki || null,
        names: entry.names || {},
        description: piece.description || entry.description || null,
        stats: {
          slot: piece.slot || null,
          armor: level1.armor ?? null,
          armorMax: lastLevel.armor ?? null,
          durability: level1.durability ?? null,
          movementSpeed: piece.movementSpeed ?? 0,
          resistances: piece.resistances || [],
          setBonus: entry.setBonus || null,
          maxQuality: (piece.levels || []).length || 1,
        },
        recipe:
          mats.length > 0
            ? {
                station: piece.station || null,
                stationLevel: level1.stationLevel || 1,
                yields: 1,
                materials: mats,
              }
            : null,
        station: piece.station
          ? {
              name: piece.station,
              level: level1.stationLevel || 1,
              set: isSet ? entry.id : null,
              setName: isSet ? entry.name : null,
            }
          : null,
        sources: { creatures: [], locations: [], traders: [], raw: [] },
        usedIn: null,
        crossLinks: {
          smithy: isSet ? `/smithy/#set=${entry.id}` : `/smithy/#item=${piece.id}`,
        },
      });
      order.push(piece.id);
    }
  }

  // --- 4. Foods and meads from provisions --------------------------------
  for (const f of provFood) {
    const existing = registry.get(f.id);
    const stats = {
      health: f.health ?? null,
      stamina: f.stamina ?? null,
      eitr: f.eitr ?? null,
      duration: f.duration ?? null,
      healing: f.healing?.amount ?? null,
      isFeast: Boolean(f.isFeast),
      servings: f.servings ?? null,
    };
    const recipe = f.materials
      ? {
          station: provStationNames.get(f.station) || prettyStationName(f.station),
          stationLevel: f.stationLevel || 1,
          yields: f.yields || 1,
          materials: f.materials.map((m) => ({
            item: m.item || slug(m.name),
            name: m.name || itemById.get(m.item)?.name || registry.get(m.item)?.name || m.item,
            amount: m.amount || 1,
          })),
        }
      : null;

    if (existing) {
      existing.category = 'food';
      existing.stats = stats;
      if (recipe) existing.recipe = recipe;
      existing.station = recipe ? { name: recipe.station, level: recipe.stationLevel } : existing.station;
      existing.crossLinks.provisions = `/provisions/#item=${f.id}`;
      if (!existing.image) existing.image = resolveImage(f.image, 'provisions');
    } else {
      registry.set(f.id, {
        id: f.id,
        name: f.name,
        image: resolveImage(f.image, 'provisions'),
        biome: f.biome ?? null,
        tier: f.tier ?? null,
        category: 'food',
        teleportable: true,
        stack: null,
        weight: null,
        wiki: f.wiki || null,
        names: f.names || {},
        description: null,
        stats,
        recipe,
        station: recipe ? { name: recipe.station, level: recipe.stationLevel } : null,
        sources: { creatures: [], locations: [], traders: [], raw: [] },
        usedIn: null,
        crossLinks: { provisions: `/provisions/#item=${f.id}` },
      });
      order.push(f.id);
    }
  }

  for (const md of provMeads) {
    const baseMaterials = md.base?.materials || [];
    const recipe = baseMaterials.length
      ? {
          station: provStationNames.get(md.base.station) || prettyStationName(md.base.station),
          stationLevel: md.base.stationLevel || 1,
          yields: md.yields || null,
          materials: baseMaterials.map((m) => ({
            item: m.item || slug(m.name),
            name: m.name || itemById.get(m.item)?.name || registry.get(m.item)?.name || m.item,
            amount: m.amount || 1,
          })),
        }
      : null;

    registry.set(md.id, {
      id: md.id,
      name: md.name,
      image: resolveImage(md.image, 'provisions'),
      biome: md.biome ?? null,
      tier: md.tier ?? null,
      category: 'mead',
      teleportable: true,
      stack: null,
      weight: null,
      wiki: md.wiki || null,
      names: md.names || {},
      description: null,
      stats: {
        effect: md.effect?.text || null,
        duration: md.duration ?? null,
        cooldown: md.cooldown ?? null,
        fermenterTime: md.fermenterTime ?? null,
      },
      recipe,
      station: recipe ? { name: recipe.station, level: recipe.stationLevel } : null,
      sources: { creatures: [], locations: [], traders: [], raw: [] },
      usedIn: null,
      crossLinks: { provisions: `/provisions/#item=${md.id}` },
    });
    order.push(md.id);
  }

  // --- 5. Comfort furniture from comfort.json ---------------------------
  for (const cp of comfort.pieces || []) {
    const recipe = cp.materials
      ? {
          station: prettyStationName(cp.station),
          stationLevel: 1,
          yields: 1,
          materials: cp.materials.map((m) => ({
            item: m.item || slug(m.name),
            name: m.name || itemById.get(m.item)?.name || registry.get(m.item)?.name || m.item,
            amount: m.amount || 1,
          })),
        }
      : null;

    registry.set(cp.id, {
      id: cp.id,
      name: cp.name,
      image: resolveImage(cp.image, 'comfort'),
      biome: cp.biome ?? null,
      tier: cp.tier ?? null,
      category: 'building',
      teleportable: true,
      stack: null,
      weight: null,
      wiki: cp.wiki || null,
      names: cp.names || {},
      description: null,
      stats: {
        comfort: cp.comfort ?? null,
        furniture: cp.category || null,
        seasonal: Boolean(cp.seasonal),
      },
      recipe,
      station: recipe ? { name: recipe.station, level: 1 } : null,
      sources: { creatures: [], locations: [], traders: [], raw: [] },
      usedIn: null,
      crossLinks: { comfort: `/comfort/#item=${cp.id}` },
    });
    order.push(cp.id);
  }

  // --- 6. Trader merchandise from traders.json ---------------------------
  for (const trader of traders.traders || []) {
    for (const trItem of trader.items || []) {
      const traderSource = {
        id: trader.id,
        name: trader.name,
        price: trItem.price ?? null,
        unlockedBy: trItem.unlockedBy || null,
      };
      const existing = registry.get(trItem.id);
      if (existing) {
        existing.sources.traders.push(traderSource);
        existing.crossLinks.traders = `/traders/#trader=${trader.id}`;
        if (!existing.image) existing.image = resolveImage(trItem.image, 'traders');
        if (trItem.description && !existing.description) existing.description = trItem.description;
      } else {
        const category = WEAPON_TOOL_IDS.has(trItem.id) ? 'tool' : 'valuable';
        registry.set(trItem.id, {
          id: trItem.id,
          name: trItem.name,
          image: resolveImage(trItem.image, 'traders'),
          biome: trItem.biome || trader.biome || null,
          tier: trItem.tier ?? null,
          category,
          teleportable: true,
          stack: trItem.stack ?? null,
          weight: null,
          wiki: trItem.wiki || null,
          names: {},
          description: trItem.description || null,
          stats: null,
          recipe: null,
          station: null,
          sources: {
            creatures: [],
            locations: [],
            traders: [traderSource],
            raw: [{ text: `Sold by ${trader.name}`, kind: 'npc' }],
          },
          usedIn: null,
          crossLinks: { traders: `/traders/#trader=${trader.id}` },
        });
        order.push(trItem.id);
      }
    }
  }

  // -----------------------------------------------------------------------
  // Enrichment: creature sources, recipes from base materials
  // -----------------------------------------------------------------------

  // Creature drops -> sources.creatures (only for records that exist)
  for (const it of items) {
    const rec = registry.get(it.id);
    if (!rec) continue;
    const creatureMap = new Map();
    for (const src of it.sources || []) {
      if (src.kind === 'creature' && src.creatureId) {
        const c = creatures.find((cr) => cr.id === src.creatureId);
        if (c) {
          creatureMap.set(c.id, { id: c.id, name: c.name, biome: c.biomes?.[0] ?? null });
        }
      }
    }
    for (const c of creatures) {
      const drops = [...(c.drops || [])];
      if (c.trophy?.name) drops.push(c.trophy.name);
      for (const d of drops) {
        const raw = d.trim();
        const clean = raw.replace(/\s*x\d+/i, '').replace(/\s*\(.*?\)/g, '').trim().toLowerCase();
        const matched = itemByName.get(clean) || itemById.get(slug(clean)) || itemByName.get(raw.toLowerCase());
        if (matched && matched.id === it.id) {
          creatureMap.set(c.id, { id: c.id, name: c.name, biome: c.biomes?.[0] ?? null });
        }
      }
    }
    rec.sources.creatures = Array.from(creatureMap.values());
  }

  // Derive top-level station for base-material recipes (smelting etc.)
  for (const rec of registry.values()) {
    if (rec.station || !rec.recipe) continue;
    rec.station = rec.recipe.station
      ? { name: rec.recipe.station, level: rec.recipe.stationLevel || 1 }
      : null;
  }

  // -----------------------------------------------------------------------
  // Inverted index: which recipes use each item as a material
  // -----------------------------------------------------------------------
  const emptyUsedIn = () => ({
    weapons: new Map(),
    armor: new Map(),
    food: new Map(),
    meads: new Map(),
    comfort: new Map(),
    expedition: new Map(),
    stations: new Map(),
  });
  const usedInMaps = new Map();
  for (const id of registry.keys()) usedInMaps.set(id, emptyUsedIn());

  function resolveMaterial(mItem, mName) {
    return registry.get(mItem) || itemById.get(mItem) || itemByName.get((mName || '').toLowerCase()) || null;
  }

  function addUsedIn(materialId, group, entry) {
    const map = usedInMaps.get(materialId);
    if (map) map[group].set(entry.id, entry);
  }

  // Weapons (all quality levels, matching the smithy bill of materials)
  for (const w of weapons) {
    const wMats = [...(w.levels?.[0]?.materials || w.materials || [])];
    for (const lvl of w.levels || []) {
      if (lvl.materials) wMats.push(...lvl.materials);
    }
    for (const m of wMats) {
      const mat = resolveMaterial(m.item || slug(m.name), m.name);
      if (mat) {
        addUsedIn(mat.id, 'weapons', { id: w.id, name: w.name, biome: w.biome ?? null, itemId: w.id });
      }
    }
  }

  // Armor pieces
  for (const entry of armor) {
    const isSet = entry.kind === 'set';
    for (const piece of entry.pieces || []) {
      for (const lvl of piece.levels || []) {
        for (const m of lvl.materials || []) {
          const mat = resolveMaterial(m.item || slug(m.name), m.name);
          if (mat) {
            addUsedIn(mat.id, 'armor', {
              id: piece.id,
              name: piece.name,
              set: isSet ? entry.id : null,
              biome: entry.biome ?? null,
              itemId: piece.id,
            });
          }
        }
      }
    }
  }

  // Foods
  for (const f of provFood) {
    for (const m of f.materials || []) {
      const mat = resolveMaterial(m.item || slug(m.name), m.name);
      if (mat) {
        addUsedIn(mat.id, 'food', {
          id: f.id,
          name: f.name,
          isFeast: Boolean(f.isFeast),
          biome: f.biome ?? null,
          itemId: f.id,
        });
      }
    }
  }

  // Meads: base materials and the mead base item itself
  for (const md of provMeads) {
    for (const m of md.base?.materials || []) {
      const mat = resolveMaterial(m.item || slug(m.name), m.name);
      if (mat) {
        addUsedIn(mat.id, 'meads', { id: md.id, name: md.name, biome: md.biome ?? null, itemId: md.id });
      }
    }
    const baseMat = resolveMaterial(md.base?.item, md.base?.name);
    if (baseMat) {
      addUsedIn(baseMat.id, 'meads', { id: md.id, name: md.name, biome: md.biome ?? null, itemId: md.id });
    }
  }

  // Comfort furniture
  for (const cp of comfort.pieces || []) {
    for (const m of cp.materials || []) {
      const mat = resolveMaterial(m.item || slug(m.name), m.name);
      if (mat) {
        addUsedIn(mat.id, 'comfort', {
          id: cp.id,
          name: cp.name,
          comfort: cp.comfort ?? 1,
          biome: cp.biome ?? null,
          itemId: cp.id,
        });
      }
    }
  }

  // Boss summoning items
  for (const boss of expedition) {
    for (const s of boss.summonItems || []) {
      const sItem = s.id || slug(s.name);
      const mat = resolveMaterial(sItem, s.name);
      if (mat) {
        addUsedIn(mat.id, 'expedition', {
          id: boss.id,
          bossId: boss.id,
          bossName: boss.name,
          biome: boss.biome ?? null,
        });
      }
    }
  }

  // Craft stations
  for (const st of stations) {
    for (const m of st.materials || []) {
      const mat = resolveMaterial(m.item || slug(m.name), m.name);
      if (mat) {
        addUsedIn(mat.id, 'stations', {
          id: st.id,
          name: st.name,
          level: st.level ?? 1,
          biome: st.biome ?? null,
        });
      }
    }
  }

  // -----------------------------------------------------------------------
  // Final records in stable insertion order
  // -----------------------------------------------------------------------
  const compendiumItems = order.map((id) => {
    const rec = registry.get(id);
    const maps = usedInMaps.get(id);
    return {
      ...rec,
      sources: {
        ...rec.sources,
        creatures: rec.sources.creatures || [],
      },
      usedIn: {
        weapons: Array.from(maps.weapons.values()),
        armor: Array.from(maps.armor.values()),
        food: Array.from(maps.food.values()),
        meads: Array.from(maps.meads.values()),
        comfort: Array.from(maps.comfort.values()),
        expedition: Array.from(maps.expedition.values()),
        stations: Array.from(maps.stations.values()),
      },
    };
  });

  const outputData = {
    items: compendiumItems,
  };

  // 1. data/items-compendium.json
  const compendiumJsonPath = path.join(DATA_DIR, 'items-compendium.json');
  writeFileSync(compendiumJsonPath, JSON.stringify(outputData, null, 2) + '\n', 'utf8');

  // 2. apps/items/data/data.js
  const appsItemsDataDir = path.join(APPS_DIR, 'items', 'data');
  mkdirSync(appsItemsDataDir, { recursive: true });
  const clientBundlePath = path.join(appsItemsDataDir, 'data.js');
  const bundleContent = `globalThis.VC_ITEMS_DATA = ${JSON.stringify(outputData, null, 2)};\n`;
  writeFileSync(clientBundlePath, bundleContent, 'utf8');

  const categoryCounts = {};
  for (const it of compendiumItems) categoryCounts[it.category] = (categoryCounts[it.category] || 0) + 1;

  console.log(`Successfully built Items Compendium: ${compendiumItems.length} items.`);
  console.log(`  categories: ${JSON.stringify(categoryCounts)}`);
  if (missingImages.length > 0) {
    const unique = [...new Set(missingImages)];
    console.log(`  ⚠ missing images (${unique.length}): ${unique.slice(0, 12).join(', ')}${unique.length > 12 ? ', …' : ''}`);
  }
  return outputData;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  buildItemsData();
}
