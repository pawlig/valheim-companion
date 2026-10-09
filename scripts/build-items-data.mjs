// Build script for Items Compendium dataset and inverted index (VC-39, VC-40b, VC-40c).
//
// Merges every game dataset and raw wiki extracts into one complete catalog:
//   data/items.json      base materials, drops, valuables, summoning items
//   data/weapons.json    weapons, shields, ammo, bombs, tools (171)
//   data/armor.json      armor sets and pieces (113)
//   apps/provisions      cooked foods (99) and meads (21)
//   data/comfort.json    comfort furniture (76)
//   data/stations.json   crafting stations & extensions (23)
//   data/traders.json    trader merchandise (38)
//   data/creatures.json  all 70+ trophies & 240 monster drops
//   data/raw/*.json      all wiki infoboxes (structures, tools, seeds, accessories...)
//
// Output: data/items-compendium.json + apps/items/data/data.js (VC_ITEMS_DATA).
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { parseAllInfoboxes, cleanText, slug as baseSlug, parseMaterialList } from './wiki/wikitext.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = path.join(ROOT, 'data');
const APPS_DIR = path.join(ROOT, 'apps');

function loadJson(relPath) {
  return JSON.parse(readFileSync(path.join(DATA_DIR, relPath), 'utf8'));
}

function slug(s) {
  return baseSlug(s);
}

const BIOME_TIERS = {
  meadows: 1,
  'black-forest': 2,
  swamp: 3,
  ocean: 3,
  mountain: 4,
  plains: 5,
  mistlands: 6,
  ashlands: 7,
  'deep-north': 8,
};

function inferBiome(text) {
  if (!text) return null;
  const s = String(text).toLowerCase();
  if (s.includes('deep north')) return 'deep-north';
  if (s.includes('ashland')) return 'ashlands';
  if (s.includes('mistland')) return 'mistlands';
  if (/\bplains?\b/.test(s)) return 'plains';
  if (s.includes('mountain')) return 'mountain';
  if (s.includes('swamp')) return 'swamp';
  if (s.includes('ocean')) return 'ocean';
  if (s.includes('black forest')) return 'black-forest';
  if (/\bmeadows?\b/.test(s)) return 'meadows';
  return null;
}

// Index all existing images across app folders
const IMAGE_INDEX = new Map();
const IMAGE_APP_ROOTS = ['smithy', 'provisions', 'comfort', 'bestiary', 'traders', 'progress'];

for (const app of IMAGE_APP_ROOTS) {
  const dir = path.join(APPS_DIR, app, 'img');
  if (!existsSync(dir)) continue;
  function walk(d, rel) {
    for (const f of readdirSync(d)) {
      const p = path.join(d, f);
      const sub = rel ? `${rel}/${f}` : f;
      if (statSync(p).isDirectory()) {
        walk(p, sub);
      } else {
        const lower = f.toLowerCase();
        if (!IMAGE_INDEX.has(lower)) IMAGE_INDEX.set(lower, `../${app}/img/${sub}`);
        const base = slug(lower.replace(/\.[^.]+$/, ''));
        if (!IMAGE_INDEX.has(base)) IMAGE_INDEX.set(base, `../${app}/img/${sub}`);
      }
    }
  }
  walk(dir, '');
}

// Also index items from damage-calculator public assets
const damageCalcDir = path.join(APPS_DIR, 'damage-calculator', 'public', 'items');
if (existsSync(damageCalcDir)) {
  for (const f of readdirSync(damageCalcDir)) {
    if (/\.(png|webp|jpg)$/i.test(f)) {
      const lower = f.toLowerCase();
      const base = slug(lower.replace(/\.[^.]+$/, ''));
      if (!IMAGE_INDEX.has(lower)) IMAGE_INDEX.set(lower, `../damage-calculator/items/${f}`);
      if (!IMAGE_INDEX.has(base)) IMAGE_INDEX.set(base, `../damage-calculator/items/${f}`);
    }
  }
}

function resolveImage(raw, itemId) {
  if (!raw && !itemId) return null;
  if (raw && raw.startsWith('../')) {
    return existsSync(path.join(APPS_DIR, raw.replace('../', ''))) ? raw : null;
  }
  if (raw) {
    const rawLower = path.basename(raw).toLowerCase();
    if (IMAGE_INDEX.has(rawLower)) return IMAGE_INDEX.get(rawLower);
    const rawSlug = slug(rawLower.replace(/\.[^.]+$/, ''));
    if (IMAGE_INDEX.has(rawSlug)) return IMAGE_INDEX.get(rawSlug);
  }
  if (itemId && IMAGE_INDEX.has(itemId)) return IMAGE_INDEX.get(itemId);
  return null;
}

const STATION_NAME_OVERRIDES = {
  workbench: 'Workbench',
  forge: 'Forge',
  stonecutter: 'Stonecutter',
  cauldron: 'Cauldron',
  fermenter: 'Fermenter',
  smelter: 'Smelter',
  'blast-furnace': 'Blast Furnace',
  'black-forge': 'Black Forge',
  'galdr-table': 'Galdr Table',
  'artisan-table': 'Artisan Table',
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
  const provFoodIds = new Set(provFood.map((f) => f.id));
  const provMeadIds = new Set(provMeads.map((m) => m.id));

  // Load raw wiki pages from cache
  const rawFiles = existsSync(path.join(DATA_DIR, 'raw'))
    ? readdirSync(path.join(DATA_DIR, 'raw')).filter((f) => f.endsWith('.json'))
    : [];
  const wikiPages = new Map();
  for (const file of rawFiles) {
    try {
      const data = JSON.parse(readFileSync(path.join(DATA_DIR, 'raw', file), 'utf8'));
      if (!data.query?.pages) continue;
      for (const page of Object.values(data.query.pages)) {
        if (page.title && page.revisions && !page.title.startsWith('File:')) {
          const wt = page.revisions[0]?.slots?.main?.content || page.revisions[0]?.['*'];
          if (wt && !wikiPages.has(page.title)) {
            wikiPages.set(page.title, { title: page.title, wt });
          }
        }
      }
    } catch {
      // Ignore malformed cache entry
    }
  }

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
    'swamp-key',
    'crypt-key',
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

  const EXCLUDED_IDS = new Set([
    'none',
    'copper-deposit',
    'ancient-metal-stack',
    'crow-trophy-currently-no-trophy',
    'gull-trophy-currently-no-trophy',
    'eikthyr-power',
    'the-elder-power',
    'bonemass-power',
    'moder-power',
    'yagluth-power',
    'the-queen-s-power',
    'cheat-sword',
    'cheat-sledge',
    'cape-test',
    't-w-i-g',
    'trailership',
    'pathen',
  ]);

  const WEAPON_MISC_IDS = new Set([
    'staff-of-protection',
    'dead-raiser',
    'spirit-caller',
    'voidcaller',
    'basalt-bomb',
    'explosive-payload',
    'grausten-payload',
    'bloodgold-payload',
    'bloodgold-missile',
    'black-metal-missile',
    'wooden-missile',
    'neckstabber',
    'torch',
    'sparkler',
    'salvaged-lantern',
  ]);

  const WEAPON_TOOL_IDS = new Set([
    'antler-pickaxe',
    'bronze-pickaxe',
    'iron-pickaxe',
    'black-metal-pickaxe',
    'fishing-rod',
    'hammer',
    'hoe',
    'cultivator',
    'butcher-knife',
    'tankard',
    'horn-of-celebration',
    'dvergr-tankard',
    'battering-ram',
    'catapult',
    'scythe',
    'snow-shovel',
    'mead-horn-of-odin',
    'serving-tray',
    'grappling-hook',
  ]);

  const ACCESSORY_IDS = new Set([
    'heart-of-the-forest',
    'bronze-pendant',
    'iron-brooch',
    'nimble-anklet',
    'wolf-sight',
    'crystal-heart',
    'fins-of-destiny',
    'bracelets-of-the-brave',
    'evasion-mantle',
    'resounding-shackle',
    'pulsating-earrings',
    'witch-crown',
  ]);

  const INGREDIENT_MISC_IDS = new Set([
    'bread-dough',
    'coral-cod',
    'ivy-seeds',
    'timberwood-cone',
  ]);

  const BUILDING_MISC_IDS = new Set([
    'cartography-table',
    'archery-target',
    'rustic-drawbridge',
    'timberwood-drawbridge',
    'portal-stone',
    'windmill',
    'green-pots',
    'roundpole-fence',
    'roundpole-gate',
    'stone-fence',
    'ivy',
  ]);

  const registry = new Map();
  const order = [];

  function ensure(id, defaults) {
    if (!id || EXCLUDED_IDS.has(id) || id.toLowerCase() === 'none') return null;
    let rec = registry.get(id);
    if (!rec) {
      rec = defaults;
      registry.set(id, rec);
      order.push(id);
    }
    return rec;
  }

  function categorize(id, name, rawType) {
    if (EXCLUDED_IDS.has(id)) return null;
    const nameLower = (name || '').toLowerCase();
    const typeLower = (rawType || '').toLowerCase();

    if (id.startsWith('cast-') || id.startsWith('mould-') || nameLower.startsWith('cast') || nameLower.startsWith('mould') || typeLower === 'cast' || typeLower === 'mould') {
      return 'building';
    }
    if (id.endsWith('-stack') || id.endsWith('-pile') || nameLower.endsWith(' stack') || nameLower.endsWith(' pile') || id === 'pile-of-skulls') {
      return 'building';
    }
    if (BUILDING_MISC_IDS.has(id)) return 'building';
    if (provFoodIds.has(id)) return 'food';
    if (provMeadIds.has(id)) return 'mead';
    if (id.endsWith('-trophy') || id.includes('trophy') || nameLower.includes('trophy')) return 'trophy';
    if (summonIds.has(id) || nameLower.includes('totem') || nameLower.includes('sealbreaker') || id.includes('key')) return 'summoning';
    if (metalOres.has(id) || id.endsWith('-ore') || id.endsWith('-ingot') || id.endsWith('-scrap')) return 'metal';
    if (WEAPON_TOOL_IDS.has(id) || typeLower === 'tool' || nameLower.includes('pickaxe') || nameLower.includes('saddle') || id.includes('saddle') || id === 'wishbone') return 'tool';
    if (typeLower.includes('shield') || nameLower.includes('shield') || nameLower.includes('buckler')) return 'shield';
    if (WEAPON_MISC_IDS.has(id) || typeLower.includes('weapon') || typeLower.includes('sword') || typeLower.includes('bow') || typeLower.includes('spear') || typeLower.includes('axe') || typeLower.includes('mace') || typeLower.includes('polearm') || typeLower.includes('dagger') || typeLower.includes('club') || typeLower.includes('staff') || typeLower.includes('crossbow') || typeLower.includes('arrow') || typeLower.includes('missile') || typeLower.includes('bolt') || typeLower === 'fists') return 'weapon';
    if (ACCESSORY_IDS.has(id) || typeLower.includes('armor') || typeLower.includes('helmet') || typeLower.includes('cape') || typeLower.includes('cuirass') || typeLower.includes('greaves') || typeLower.includes('legs') || typeLower.includes('chest') || typeLower.includes('head') || typeLower === 'accessory' || typeLower === 'trinket') return 'armor';
    if (id.includes('idol') || nameLower.includes('idol') || ['amber', 'amber-pearl', 'ruby', 'silver-necklace', 'coins', 'ymir-flesh', 'barber-kit'].includes(id) || typeLower === 'valuable') return 'valuable';
    if (INGREDIENT_MISC_IDS.has(id) || nameLower.includes('seed') || nameLower.includes('cone') || nameLower.includes('acorn') || nameLower.includes('mushroom') || nameLower.includes('berry') || nameLower.includes('meat') || nameLower.includes('fish') || nameLower.includes('dandelion') || nameLower.includes('thistle') || nameLower.includes('carrot') || nameLower.includes('turnip') || nameLower.includes('onion') || nameLower.includes('barley') || nameLower.includes('flax') || nameLower.includes('cloudberry') || nameLower.includes('magecap') || nameLower.includes('jotun puffs') || typeLower === 'food' || typeLower === 'seed') return 'food-ingredient';
    if (typeLower.includes('structure') || typeLower.includes('station') || typeLower.includes('building') || typeLower.includes('furniture') || typeLower.includes('crafting') || typeLower.includes('defense') || typeLower === 'misc' || typeLower === 'transport' || typeLower === 'boat') return 'building';
    return 'drop';
  }

  // --- 1. Base materials from items.json -------------------------------
  for (const it of items) {
    const provEntry = provItemsById.get(it.id);
    const category = provFoodIds.has(it.id) ? 'food' : categorize(it.id, it.name, it.category);
    let teleportable = true;
    if (it.teleportable === false || provEntry?.teleportable === false || metalOres.has(it.id) || category === 'metal' || it.id === 'dragon-egg') {
      teleportable = false;
    }

    const recipeSource = it.recipe || provEntry?.recipe || null;
    const rec = {
      id: it.id,
      name: it.name,
      image: resolveImage(it.image, it.id),
      biome: it.biome ?? null,
      tier: it.tier ?? (it.biome ? BIOME_TIERS[it.biome] : null),
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
      usedIn: null,
      crossLinks: (category === 'weapon' || category === 'shield') ? { smithy: `/smithy/#item=${it.id}` } : {},
    };

    if (recipeSource) {
      rec.recipe = {
        station: recipeSource.station || null,
        stationLevel: recipeSource.stationLevel || 1,
        yields: recipeSource.yields || 1,
        materials: (recipeSource.materials || []).map((m) => ({
          item: m.item || slug(m.name),
          name: m.name || m.item,
          amount: m.amount || 1,
        })),
      };
      rec.station = rec.recipe.station ? { name: rec.recipe.station, level: rec.recipe.stationLevel || 1 } : null;
    }

    ensure(it.id, rec);
  }

  // --- 2. Weapons, shields and tools from weapons.json ------------------
  for (const w of weapons) {
    let category = 'weapon';
    if ((w.type || '').includes('Shield')) category = 'shield';
    else if (WEAPON_TOOL_IDS.has(w.id) || (w.type || '').toLowerCase().includes('pickaxe')) category = 'tool';

    const level1 = (w.levels || [])[0] || {};
    const mats = (level1.materials || []).map((m) => ({
      item: m.item || slug(m.name),
      name: m.name || m.item,
      amount: m.amount || 1,
    }));
    const existing = registry.get(w.id);

    const record = {
      id: w.id,
      name: w.name,
      image: resolveImage(w.image, w.id),
      biome: w.biome ?? null,
      tier: w.tier ?? (w.biome ? BIOME_TIERS[w.biome] : null),
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
        mats.length > 0
          ? {
              station: w.station || null,
              stationLevel: level1.stationLevel || w.stationLevel || 1,
              yields: 1,
              materials: mats,
            }
          : null,
      station: w.station ? { name: w.station, level: level1.stationLevel || w.stationLevel || 1 } : null,
      sources: existing ? existing.sources : { creatures: [], locations: [], traders: [], raw: [] },
      usedIn: null,
      crossLinks: { smithy: `/smithy/#item=${w.id}` },
    };

    if (existing) {
      Object.assign(existing, {
        category,
        stats: record.stats,
        recipe: record.recipe || existing.recipe,
        station: record.station || existing.station,
        description: record.description || existing.description,
        wiki: record.wiki || existing.wiki,
        crossLinks: { ...existing.crossLinks, smithy: `/smithy/#item=${w.id}` },
      });
      if (!existing.image) existing.image = record.image;
    } else {
      ensure(w.id, record);
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
        name: m.name || m.item,
        amount: m.amount || 1,
      }));
      const existing = registry.get(piece.id);

      const record = {
        id: piece.id,
        name: piece.name,
        image: resolveImage(piece.image, piece.id),
        biome: entry.biome ?? null,
        tier: entry.tier ?? (entry.biome ? BIOME_TIERS[entry.biome] : null),
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
        sources: existing ? existing.sources : { creatures: [], locations: [], traders: [], raw: [] },
        usedIn: null,
        crossLinks: {
          smithy: isSet ? `/smithy/#set=${entry.id}` : `/smithy/#item=${piece.id}`,
        },
      };

      if (existing) {
        Object.assign(existing, {
          category: 'armor',
          stats: record.stats,
          recipe: record.recipe || existing.recipe,
          station: record.station || existing.station,
          crossLinks: { ...existing.crossLinks, ...record.crossLinks },
        });
        if (!existing.image) existing.image = record.image;
      } else {
        ensure(piece.id, record);
      }
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
    const mats = (f.materials || []).map((m) => ({
      item: m.item || slug(m.name),
      name: m.name || m.item,
      amount: m.amount || 1,
    }));
    const recipe = mats.length > 0 ? {
      station: provStationNames.get(f.station) || prettyStationName(f.station) || 'Cauldron',
      stationLevel: f.stationLevel || 1,
      yields: f.yields || 1,
      materials: mats,
    } : null;

    if (existing) {
      existing.category = 'food';
      existing.stats = stats;
      if (recipe) existing.recipe = recipe;
      existing.station = recipe ? { name: recipe.station, level: recipe.stationLevel } : existing.station;
      existing.crossLinks.provisions = `/provisions/#item=${f.id}`;
      if (!existing.image) existing.image = resolveImage(f.image, f.id);
    } else {
      ensure(f.id, {
        id: f.id,
        name: f.name,
        image: resolveImage(f.image, f.id),
        biome: f.biome ?? null,
        tier: f.tier ?? (f.biome ? BIOME_TIERS[f.biome] : null),
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
    }
  }

  for (const md of provMeads) {
    const baseMats = (md.base?.materials || []).map((m) => ({
      item: m.item || slug(m.name),
      name: m.name || m.item,
      amount: m.amount || 1,
    }));
    const recipe = baseMats.length > 0 ? {
      station: provStationNames.get(md.base.station) || prettyStationName(md.base.station) || 'Cauldron',
      stationLevel: md.base.stationLevel || 1,
      yields: md.yields || null,
      materials: baseMats,
    } : null;
    const existing = registry.get(md.id);

    const stats = {
      effect: md.effect?.text || null,
      duration: md.duration ?? null,
      cooldown: md.cooldown ?? null,
      fermenterTime: md.fermenterTime ?? null,
    };

    if (existing) {
      existing.category = 'mead';
      existing.stats = stats;
      if (recipe) existing.recipe = recipe;
      existing.station = recipe ? { name: recipe.station, level: recipe.stationLevel } : existing.station;
      existing.crossLinks.provisions = `/provisions/#item=${md.id}`;
      if (!existing.image) existing.image = resolveImage(md.image, md.id);
    } else {
      ensure(md.id, {
        id: md.id,
        name: md.name,
        image: resolveImage(md.image, md.id),
        biome: md.biome ?? null,
        tier: md.tier ?? (md.biome ? BIOME_TIERS[md.biome] : null),
        category: 'mead',
        teleportable: true,
        stack: null,
        weight: null,
        wiki: md.wiki || null,
        names: md.names || {},
        description: null,
        stats,
        recipe,
        station: recipe ? { name: recipe.station, level: recipe.stationLevel } : null,
        sources: { creatures: [], locations: [], traders: [], raw: [] },
        usedIn: null,
        crossLinks: { provisions: `/provisions/#item=${md.id}` },
      });
    }
  }

  // --- 5. Comfort furniture from comfort.json ---------------------------
  for (const cp of comfort.pieces || []) {
    const mats = (cp.materials || []).map((m) => ({
      item: m.item || slug(m.name),
      name: m.name || m.item,
      amount: m.amount || 1,
    }));
    const recipe = mats.length > 0 ? {
      station: prettyStationName(cp.station) || 'Workbench',
      stationLevel: 1,
      yields: 1,
      materials: mats,
    } : null;
    const existing = registry.get(cp.id);

    if (existing) {
      existing.stats = { comfort: cp.comfort ?? null, furniture: cp.category || null, seasonal: Boolean(cp.seasonal) };
      if (recipe && !existing.recipe) existing.recipe = recipe;
      existing.crossLinks.comfort = `/comfort/#item=${cp.id}`;
      if (!existing.image) existing.image = resolveImage(cp.image, cp.id);
    } else {
      ensure(cp.id, {
        id: cp.id,
        name: cp.name,
        image: resolveImage(cp.image, cp.id),
        biome: cp.biome ?? null,
        tier: cp.tier ?? (cp.biome ? BIOME_TIERS[cp.biome] : null),
        category: 'building',
        teleportable: true,
        stack: null,
        weight: null,
        wiki: cp.wiki || null,
        names: cp.names || {},
        description: null,
        stats: { comfort: cp.comfort ?? null, furniture: cp.category || null, seasonal: Boolean(cp.seasonal) },
        recipe,
        station: recipe ? { name: recipe.station, level: 1 } : null,
        sources: { creatures: [], locations: [], traders: [], raw: [] },
        usedIn: null,
        crossLinks: { comfort: `/comfort/#item=${cp.id}` },
      });
    }
  }

  // --- 6. Crafting Stations from stations.json -------------------------
  for (const st of stations) {
    const mats = (st.materials || []).map((m) => ({
      item: m.item || slug(m.name),
      name: m.name || m.item,
      amount: m.amount || 1,
    }));
    const existing = registry.get(st.id);

    if (existing) {
      if (mats.length > 0 && !existing.recipe) {
        existing.recipe = { station: null, stationLevel: 1, yields: 1, materials: mats };
      }
      if (st.names) existing.names = { ...existing.names, ...st.names };
      if (!existing.biome && st.biome) {
        existing.biome = st.biome;
        existing.tier = BIOME_TIERS[st.biome] ?? null;
      }
    } else {
      ensure(st.id, {
        id: st.id,
        name: st.name,
        image: resolveImage(st.image, st.id),
        biome: st.biome || null,
        tier: st.biome ? BIOME_TIERS[st.biome] : null,
        category: 'building',
        teleportable: true,
        stack: null,
        weight: null,
        wiki: st.wiki || null,
        names: st.names || {},
        description: null,
        stats: null,
        recipe: mats.length > 0 ? { station: null, stationLevel: 1, yields: 1, materials: mats } : null,
        station: null,
        sources: { creatures: [], locations: [], traders: [], raw: [] },
        usedIn: null,
        crossLinks: {},
      });
    }
  }

  // --- 7. Trader merchandise from traders.json ---------------------------
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
        if (!existing.sources.traders.some((t) => t.id === trader.id)) {
          existing.sources.traders.push(traderSource);
        }
        existing.crossLinks.traders = `/traders/#trader=${trader.id}`;
        if (!existing.image) existing.image = resolveImage(trItem.image, trItem.id);
        if (trItem.description && !existing.description) existing.description = trItem.description;
      } else {
        const cat = WEAPON_TOOL_IDS.has(trItem.id) ? 'tool' : 'valuable';
        ensure(trItem.id, {
          id: trItem.id,
          name: trItem.name,
          image: resolveImage(trItem.image, trItem.id),
          biome: trItem.biome || trader.biome || null,
          tier: trItem.tier ?? (trItem.biome ? BIOME_TIERS[trItem.biome] : null),
          category: cat,
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
      }
    }
  }

  // --- 8. Creature drops & trophies from creatures.json -----------------
  for (const c of creatures) {
    const cBiome = c.biomes?.[0] || null;
    const cTier = cBiome ? BIOME_TIERS[cBiome] : null;
    const cSource = { id: c.id, name: c.name, biome: cBiome };

    // Trophy
    if (c.trophy?.name) {
      const trId = slug(c.trophy.name);
      const existing = registry.get(trId);

      if (existing) {
        existing.category = 'trophy';
        if (!existing.sources.creatures.some((x) => x.id === c.id)) {
          existing.sources.creatures.push(cSource);
        }
        if (!existing.image) existing.image = resolveImage(c.trophy.image || `${trId}.png`, trId);
        if (!existing.biome && cBiome) {
          existing.biome = cBiome;
          existing.tier = cTier;
        }
      } else {
        ensure(trId, {
          id: trId,
          name: c.trophy.name,
          image: resolveImage(c.trophy.image || `${trId}.png`, trId),
          biome: cBiome,
          tier: cTier,
          category: 'trophy',
          teleportable: true,
          stack: 20,
          weight: 2,
          wiki: null,
          names: {},
          description: null,
          stats: null,
          recipe: null,
          station: null,
          sources: { creatures: [cSource], locations: [], traders: [], raw: [{ text: `Dropped by ${c.name}`, kind: 'creature', creatureId: c.id }] },
          usedIn: null,
          crossLinks: {},
        });
      }
    }

    // Creature drops
    for (const d of c.drops || []) {
      const clean = d.replace(/\s*x\d+/i, '').replace(/\s*\(.*?\)/g, '').trim();
      if (!clean) continue;
      const dId = slug(clean);
      const existing = registry.get(dId);

      if (existing) {
        if (!existing.sources.creatures.some((x) => x.id === c.id)) {
          existing.sources.creatures.push(cSource);
        }
        if (!existing.biome && cBiome) {
          existing.biome = cBiome;
          existing.tier = cTier;
        }
      } else {
        let dCat = 'drop';
        if (summonIds.has(dId) || dId.includes('key')) dCat = 'summoning';
        else if (metalOres.has(dId)) dCat = 'metal';
        else if (WEAPON_TOOL_IDS.has(dId) || dId === 'wishbone') dCat = 'tool';

        ensure(dId, {
          id: dId,
          name: clean,
          image: resolveImage(null, dId),
          biome: cBiome,
          tier: cTier,
          category: dCat,
          teleportable: !metalOres.has(dId) && dCat !== 'metal' && dId !== 'dragon-egg',
          stack: null,
          weight: null,
          wiki: null,
          names: {},
          description: null,
          stats: null,
          recipe: null,
          station: null,
          sources: { creatures: [cSource], locations: [], traders: [], raw: [{ text: `Dropped by ${c.name}`, kind: 'creature', creatureId: c.id }] },
          usedIn: null,
          crossLinks: {},
        });
      }
    }
  }

  // --- 9. Ingest all raw wiki infoboxes ---------------------------------
  const TEMPLATE_PRIORITY = ['item', 'structure', 'trinket', 'weapon', 'armor'];
  for (const [title, { wt }] of wikiPages.entries()) {
    if (/\{\{removed\}\}/i.test(wt)) continue;
    for (const t of TEMPLATE_PRIORITY) {
      const boxes = parseAllInfoboxes(wt, t);
      for (const b of boxes) {
        const name = cleanText(b.title || title).trim();
        if (!name || name.toLowerCase() === 'n/a' || name.toLowerCase() === 'none') continue;
        const id = slug(name);
        if (!id || EXCLUDED_IDS.has(id)) continue;

        const existing = registry.get(id);
        const bBiome = inferBiome(b.biome || b.location || b.source);
        const bTier = bBiome ? BIOME_TIERS[bBiome] : null;

        const rawMats = parseMaterialList(b.materials || b['materials 1']);
        const recipe = rawMats.length > 0 ? {
          station: cleanText(b.source || b.station || '').replace(/\[\[|\]\]/g, '').split('|')[0].trim() || null,
          stationLevel: parseInt(b['crafting level'] || b['repair level'] || '1', 10) || 1,
          yields: parseInt(b.yields || '1', 10) || 1,
          materials: rawMats.map((m) => ({ item: slug(m.name), name: m.name, amount: m.amount || 1 })),
        } : null;

        const cat = categorize(id, name, b.type || t);
        if (!cat) continue;
        const weight = b.weight ? parseFloat(cleanText(b.weight)) : null;
        const stack = b.stack ? parseInt(cleanText(b.stack), 10) : null;
        const teleportable = (b.teleport || '').toLowerCase() !== 'no' && !metalOres.has(id) && cat !== 'metal' && id !== 'dragon-egg';
        const wikiUrl = `https://valheim.weirdgloop.org/w/${encodeURIComponent(title.replace(/ /g, '_'))}`;

        if (existing) {
          if (!existing.recipe && recipe) existing.recipe = recipe;
          if (!existing.image) existing.image = resolveImage(b.image, id);
          if (existing.weight == null && !isNaN(weight)) existing.weight = weight;
          if (existing.stack == null && !isNaN(stack)) existing.stack = stack;
          if (!existing.wiki) existing.wiki = wikiUrl;
          if (!existing.description && b.description) existing.description = cleanText(b.description);
          if (!existing.biome && bBiome) {
            existing.biome = bBiome;
            existing.tier = bTier;
          }
        } else {
          ensure(id, {
            id,
            name,
            image: resolveImage(b.image, id),
            biome: bBiome,
            tier: bTier,
            category: cat,
            teleportable,
            stack: isNaN(stack) ? null : stack,
            weight: isNaN(weight) ? null : weight,
            wiki: wikiUrl,
            names: {},
            description: b.description ? cleanText(b.description) : null,
            stats: null,
            recipe,
            station: recipe?.station ? { name: recipe.station, level: recipe.stationLevel || 1 } : null,
            sources: {
              creatures: [],
              locations: b.source ? [{ text: cleanText(b.source), kind: 'location' }] : [],
              traders: [],
              raw: b.source ? [{ text: cleanText(b.source) }] : [],
            },
            usedIn: null,
            crossLinks: cat === 'weapon' || cat === 'shield' || cat === 'armor' ? { smithy: `/smithy/#item=${id}` } : {},
          });
        }
      }
    }
  }

  // Top-level station resolution for all recipes
  for (const rec of registry.values()) {
    if (rec.station || !rec.recipe) continue;
    rec.station = rec.recipe.station
      ? { name: rec.recipe.station, level: rec.recipe.stationLevel || 1 }
      : null;
  }

  // Explicit and inferred biomes for stacks, idols, tools, and components
  const ITEM_EXPLICIT_BIOMES = {
    'wood-stack': 'meadows',
    'stone-pile': 'meadows',
    'flint-pile': 'meadows',
    'bone-stack': 'meadows',
    'coal-pile': 'meadows',
    'finewood-stack': 'meadows',
    'corewood-stack': 'black-forest',
    'copper-stack': 'black-forest',
    'tin-stack': 'black-forest',
    'bronze-stack': 'black-forest',
    'coin-pile': 'black-forest',
    'coin-stack': 'black-forest',
    'iron-stack': 'swamp',
    'silver-stack': 'mountain',
    'obsidian-pile': 'mountain',
    'black-metal-stack': 'plains',
    'yggdrasil-wood-stack': 'mistlands',
    'black-marble-pile': 'mistlands',
    'ashwood-stack': 'ashlands',
    'grausten-pile': 'ashlands',
    'flametal-stack': 'ashlands',
    'bloodgold-stack': 'ashlands',
    'pile-of-skulls': 'swamp',
    'timberwood-stack': 'ashlands',
    'heart-of-the-forest': 'meadows',
    'wooden-protection-idol': 'meadows',
    'wooden-battle-idol': 'meadows',
    'queen-bee': 'meadows',
    'neckstabber': 'meadows',
    'roundpole-fence': 'meadows',
    'roundpole-gate': 'meadows',
    'bronze-pendant': 'black-forest',
    'bronze-protection-idol': 'black-forest',
    'bronze-battle-idol': 'black-forest',
    'thunder-stone': 'black-forest',
    'thunderstone': 'black-forest',
    'sharpening-stone': 'black-forest',
    'cartography-table': 'black-forest',
    'stone-fence': 'meadows',
    'iron-brooch': 'swamp',
    'iron-protection-idol': 'swamp',
    'iron-battle-idol': 'swamp',
    'wolf-sight': 'mountain',
    'crystal-heart': 'mountain',
    'silver-protection-idol': 'mountain',
    'silver-battle-idol': 'mountain',
    'snow-shovel': 'mountain',
    'nimble-anklet': 'plains',
    'evasion-mantle': 'plains',
    'black-metal-protection-idol': 'plains',
    'black-metal-battle-idol': 'plains',
    'fins-of-destiny': 'mistlands',
    'bracelets-of-the-brave': 'mistlands',
    'black-marble-protection-idol': 'mistlands',
    'black-marble-battle-idol': 'mistlands',
    'staff-of-protection': 'mistlands',
    'dead-raiser': 'mistlands',
    'dvergr-extractor': 'mistlands',
    'mechanical-spring': 'mistlands',
    'ectoplasm': 'mistlands',
    'hooded-lantern': 'mistlands',
    'hook': 'mistlands',
    'grappling-hook': 'mistlands',
    'resounding-shackle': 'ashlands',
    'pulsating-earrings': 'ashlands',
    'witch-crown': 'ashlands',
    'flametal-protection-idol': 'ashlands',
    'flametal-battle-idol': 'ashlands',
    'bloodgold-protection-idol': 'ashlands',
    'bloodgold-battle-idol': 'ashlands',
    'jormundling': 'ashlands',
    'voidcaller': 'ashlands',
    'spirit-caller': 'ashlands',
    'basalt-bomb': 'ashlands',
    'ceramic-plate': 'ashlands',
    'molten-core': 'ashlands',
    'asksvin-egg': 'ashlands',
    'candle-wick': 'ashlands',
    'scythe-handle': 'ashlands',
    'barrel-hoops': 'ashlands',
    'corked-vial': 'ashlands',
    'grausten-payload': 'ashlands',
    'explosive-payload': 'ashlands',
    'bloodgold-payload': 'ashlands',
    'bloodgold-missile': 'ashlands',
    'black-metal-missile': 'plains',
    'wooden-missile': 'meadows',
    'torch': 'meadows',
    'sparkler': 'meadows',
    'salvaged-lantern': 'mistlands',
    'rustic-drawbridge': 'meadows',
    'timberwood-drawbridge': 'ashlands',
    'portal-stone': 'ashlands',
    'green-pots': 'ashlands',
    'ivy-seeds': 'ashlands',
    'timberwood-cone': 'ashlands',
    'bread-dough': 'plains',
    'coral-cod': 'ocean',
    'charred-cogwheel': 'ashlands',
    'majestic-carapace': 'mistlands',
    'torn-spirit': 'plains',
    'hildir-s-bronze-chest': 'plains',
    'zil-trophy': 'plains',
    'thungr-trophy': 'plains',
    'dvergr-tankard': 'mistlands',
    'tankard': 'meadows',
    'horn-of-celebration': 'meadows',
    'mead-horn-of-odin': 'meadows',
    'butcher-knife': 'meadows',
    'serving-tray': 'meadows',
    'scythe': 'plains',
    'curious-axe-head': 'ashlands',
    'mysterious-axe-head': 'ashlands',
    'wisp': 'mistlands',
    'crown-of-roots': 'swamp',
    'dverger-circlet': 'black-forest',
    'yule-hat': 'black-forest',
    'blue-mushroom': 'mistlands',
    'carved-chair': 'meadows',
    'moose-hide-carpet': 'deep-north',
    'iron-shield': 'swamp',
    'knight-shield': 'swamp',
    'acorns': 'meadows',
    'beech-seeds': 'meadows',
    'birch-seeds': 'meadows',
    'iron-ore': 'swamp',
    'ivy': 'meadows',
    'scrap-bronze': 'black-forest',
    'copper-scrap': 'black-forest',
    'amber': 'black-forest',
    'ruby': 'black-forest',
    'silver-necklace': 'black-forest',
    'ancient-coin': 'black-forest',
    'basic-fireworks': 'black-forest',
    'mould-spirit-caller': 'ashlands',
    'hildir-s-chests': 'plains',
  };

  const STATION_BIOMES = {
    'workbench': 'meadows',
    'forge': 'black-forest',
    'smelter': 'black-forest',
    'charcoal-kiln': 'black-forest',
    'stonecutter': 'swamp',
    'cauldron': 'black-forest',
    'fermenter': 'black-forest',
    'artisan-table': 'plains',
    'blast-furnace': 'plains',
    'windmill': 'plains',
    'spinning-wheel': 'plains',
    'black-forge': 'mistlands',
    'galdr-table': 'mistlands',
    'sap-extractor': 'mistlands',
    'eitr-refinery': 'mistlands',
  };

  for (const rec of registry.values()) {
    if (ITEM_EXPLICIT_BIOMES[rec.id]) {
      rec.biome = ITEM_EXPLICIT_BIOMES[rec.id];
      rec.tier = BIOME_TIERS[rec.biome] ?? null;
    }
    if (!rec.biome && (rec.id.startsWith('beaded-') || rec.id.startsWith('cape-tunic-') || rec.id.startsWith('extravagant-cap-') || rec.id.startsWith('fur-cap-') || rec.id.startsWith('harvest-') || rec.id.startsWith('shawl-dress-') || rec.id.startsWith('simple-') || rec.id.startsWith('tied-headscarf-') || rec.id.startsWith('twisted-headscarf-') || rec.id === 'straw-hat' || rec.id === 'headband')) {
      rec.biome = 'plains';
      rec.tier = 5;
    }
    if (!rec.biome && rec.recipe?.station) {
      const sKey = slug(rec.recipe.station);
      if (STATION_BIOMES[sKey]) {
        rec.biome = STATION_BIOMES[sKey];
        rec.tier = BIOME_TIERS[rec.biome] ?? null;
      }
    }
    if (!rec.biome && rec.recipe?.materials?.length > 0) {
      let maxTier = 0;
      let maxBiome = null;
      for (const m of rec.recipe.materials) {
        const mat = registry.get(m.item);
        if (mat?.biome && (BIOME_TIERS[mat.biome] || 0) > maxTier) {
          maxTier = BIOME_TIERS[mat.biome];
          maxBiome = mat.biome;
        }
      }
      if (maxBiome) {
        rec.biome = maxBiome;
        rec.tier = BIOME_TIERS[rec.biome] ?? null;
      }
    }
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
    crafting: new Map(),
  });
  const usedInMaps = new Map();
  for (const id of registry.keys()) usedInMaps.set(id, emptyUsedIn());

  function resolveMaterial(mItem, mName) {
    return registry.get(mItem) || registry.get(slug(mName)) || null;
  }

  function addUsedIn(materialId, group, entry) {
    const map = usedInMaps.get(materialId);
    if (map && map[group]) map[group].set(entry.id, entry);
  }

  // Weapons
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

  // Armor
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

  // Meads
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

  // Craft stations and general structures
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

  // Registry item recipes (structures, building pieces, tools, metals, components, ammo)
  for (const rec of registry.values()) {
    if (!rec.recipe || !rec.recipe.materials) continue;
    // Don't duplicate foods and meads which were already handled with rich metadata
    if (rec.category === 'food' || rec.category === 'mead') continue;

    let group = 'crafting';
    if (rec.category === 'building') group = 'stations';
    else if (rec.category === 'weapon' || rec.category === 'shield') group = 'weapons';
    else if (rec.category === 'armor') group = 'armor';

    for (const m of rec.recipe.materials) {
      const mat = resolveMaterial(m.item, m.name);
      if (mat) {
        addUsedIn(mat.id, group, {
          id: rec.id,
          name: rec.name,
          level: rec.recipe.stationLevel || 1,
          biome: rec.biome ?? null,
          itemId: rec.id,
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
        crafting: Array.from(maps.crafting.values()),
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
  return outputData;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  buildItemsData();
}
