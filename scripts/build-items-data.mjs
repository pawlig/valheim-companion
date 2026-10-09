// Build script for Items Compendium dataset and inverted index (VC-39).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = path.join(ROOT, 'data');

function loadJson(relPath) {
  return JSON.parse(readFileSync(path.join(DATA_DIR, relPath), 'utf8'));
}

function slug(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function buildItemsData() {
  const items = loadJson('items.json');
  const weapons = loadJson('weapons.json');
  const armor = loadJson('armor.json');
  const comfort = loadJson('comfort.json');
  const expedition = loadJson('expedition.json');
  const creatures = loadJson('creatures.json');
  const stations = loadJson('stations.json');

  // Load provisions data via VM
  const provContext = { window: {}, globalThis: {} };
  provContext.globalThis.window = provContext.window;
  vm.createContext(provContext);
  const provCode = readFileSync(path.join(ROOT, 'apps', 'provisions', 'data', 'data.js'), 'utf8');
  vm.runInContext(provCode, provContext);
  const provData = provContext.window.VPR_DATA || {};
  const provFood = provData.food || [];
  const provMeads = provData.meads || [];

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

  // Pre-calculate creature drops map: itemId -> Array<{ id, name, biome }>
  const itemCreaturesMap = new Map();
  for (const it of items) {
    itemCreaturesMap.set(it.id, new Map());
  }

  // From items.json existing creature sources
  for (const it of items) {
    for (const src of it.sources || []) {
      if (src.kind === 'creature' && src.creatureId) {
        const c = creatures.find((cr) => cr.id === src.creatureId);
        if (c) {
          itemCreaturesMap.get(it.id).set(c.id, {
            id: c.id,
            name: c.name,
            biome: c.biomes?.[0] ?? null,
          });
        }
      }
    }
  }

  // From creatures.json drops & trophies
  for (const c of creatures) {
    const drops = [...(c.drops || [])];
    if (c.trophy?.name) drops.push(c.trophy.name);

    for (const d of drops) {
      const raw = d.trim();
      const clean = raw.replace(/\s*x\d+/i, '').replace(/\s*\(.*?\)/g, '').trim().toLowerCase();
      const cleanSlug = slug(clean);

      const matched = itemByName.get(clean) || itemById.get(cleanSlug) || itemByName.get(raw.toLowerCase()) || itemById.get(slug(raw));
      if (matched && itemCreaturesMap.has(matched.id)) {
        itemCreaturesMap.get(matched.id).set(c.id, {
          id: c.id,
          name: c.name,
          biome: c.biomes?.[0] ?? null,
        });
      }
    }
  }

  // Pre-calculate weapons materials: itemId -> Array<{ id, name, biome }>
  const itemWeaponsMap = new Map();
  for (const it of items) itemWeaponsMap.set(it.id, new Map());

  for (const w of weapons) {
    const wMats = [...(w.materials || [])];
    for (const lvl of w.levels || []) {
      if (lvl.materials) wMats.push(...lvl.materials);
    }
    for (const m of wMats) {
      const mItem = m.item || slug(m.name);
      const mNameLower = (m.name || '').toLowerCase();
      const it = itemById.get(mItem) || itemByName.get(mNameLower);
      if (it && itemWeaponsMap.has(it.id)) {
        itemWeaponsMap.get(it.id).set(w.id, {
          id: w.id,
          name: w.name,
          biome: w.biome ?? null,
        });
      }
    }
  }

  // Pre-calculate armor materials: itemId -> Array<{ id, name, set, biome }>
  const itemArmorMap = new Map();
  for (const it of items) itemArmorMap.set(it.id, new Map());

  for (const entry of armor) {
    const isSet = entry.kind === 'set';
    for (const piece of entry.pieces || []) {
      const pMats = [];
      for (const lvl of piece.levels || []) {
        if (lvl.materials) pMats.push(...lvl.materials);
      }
      for (const m of pMats) {
        const mItem = m.item || slug(m.name);
        const mNameLower = (m.name || '').toLowerCase();
        const it = itemById.get(mItem) || itemByName.get(mNameLower);
        if (it && itemArmorMap.has(it.id)) {
          itemArmorMap.get(it.id).set(piece.id, {
            id: piece.id,
            name: piece.name,
            set: isSet ? entry.id : null,
            biome: entry.biome ?? null,
          });
        }
      }
    }
  }

  // Pre-calculate food materials: itemId -> Array<{ id, name, isFeast, biome }>
  const itemFoodMap = new Map();
  for (const it of items) itemFoodMap.set(it.id, new Map());

  for (const f of provFood) {
    for (const m of f.materials || []) {
      const mItem = m.item || slug(m.name);
      const mNameLower = (m.name || '').toLowerCase();
      const it = itemById.get(mItem) || itemByName.get(mNameLower);
      if (it && itemFoodMap.has(it.id)) {
        itemFoodMap.get(it.id).set(f.id, {
          id: f.id,
          name: f.name,
          isFeast: Boolean(f.isFeast),
          biome: f.biome ?? null,
        });
      }
    }
  }

  // Pre-calculate mead materials: itemId -> Array<{ id, name, biome }>
  const itemMeadsMap = new Map();
  for (const it of items) itemMeadsMap.set(it.id, new Map());

  for (const md of provMeads) {
    const mdMats = md.base?.materials || [];
    for (const m of mdMats) {
      const mItem = m.item || slug(m.name);
      const mNameLower = (m.name || '').toLowerCase();
      const it = itemById.get(mItem) || itemByName.get(mNameLower);
      if (it && itemMeadsMap.has(it.id)) {
        itemMeadsMap.get(it.id).set(md.id, {
          id: md.id,
          name: md.name,
          biome: md.biome ?? null,
        });
      }
    }
  }

  // Pre-calculate comfort materials: itemId -> Array<{ id, name, comfort, biome }>
  const itemComfortMap = new Map();
  for (const it of items) itemComfortMap.set(it.id, new Map());

  for (const cp of comfort.pieces || []) {
    for (const m of cp.materials || []) {
      const mItem = m.item || slug(m.name);
      const mNameLower = (m.name || '').toLowerCase();
      const it = itemById.get(mItem) || itemByName.get(mNameLower);
      if (it && itemComfortMap.has(it.id)) {
        itemComfortMap.get(it.id).set(cp.id, {
          id: cp.id,
          name: cp.name,
          comfort: cp.comfort ?? 1,
          biome: cp.biome ?? null,
        });
      }
    }
  }

  // Pre-calculate expedition summoning items: itemId -> Array<{ bossId, bossName, biome }>
  const itemExpeditionMap = new Map();
  for (const it of items) itemExpeditionMap.set(it.id, new Map());

  for (const boss of expedition) {
    for (const s of boss.summonItems || []) {
      const sItem = s.id || slug(s.name);
      const it = itemById.get(sItem);
      if (it && itemExpeditionMap.has(it.id)) {
        itemExpeditionMap.get(it.id).set(boss.id, {
          bossId: boss.id,
          bossName: boss.name,
          biome: boss.biome ?? null,
        });
      }
    }
  }

  // Pre-calculate stations: itemId -> Array<{ id, name, level, biome }>
  const itemStationsMap = new Map();
  for (const it of items) itemStationsMap.set(it.id, new Map());

  for (const st of stations) {
    const stMats = [...(st.materials || [])];
    for (const m of stMats) {
      const mItem = m.item || slug(m.name);
      const mNameLower = (m.name || '').toLowerCase();
      const it = itemById.get(mItem) || itemByName.get(mNameLower);
      if (it && itemStationsMap.has(it.id)) {
        itemStationsMap.get(it.id).set(st.id, {
          id: st.id,
          name: st.name,
          level: st.level ?? 1,
          biome: st.biome ?? null,
        });
      }
    }
  }

  // Build the enriched items compendium
  const compendiumItems = items.map((it) => {
    const category = determineCategory(it);

    let teleportable = true;
    if (it.teleportable === false || nonTeleportableMetals.has(it.id) || category === 'metal') {
      teleportable = false;
    } else if (it.teleportable === true) {
      teleportable = true;
    }

    const creatureSources = Array.from(itemCreaturesMap.get(it.id).values());
    const locationSources = (it.sources || []).filter((s) => s.kind === 'location' || s.kind === 'other');
    const traderSources = (it.sources || []).filter((s) => s.kind === 'npc');

    let formattedRecipe = null;
    if (it.recipe) {
      formattedRecipe = {
        station: it.recipe.station || null,
        stationLevel: it.recipe.stationLevel || 1,
        yields: it.recipe.yields || 1,
        materials: (it.recipe.materials || []).map((m) => {
          const matItem = itemById.get(m.item);
          return {
            item: m.item,
            name: m.name || matItem?.name || m.item,
            amount: m.amount || 1,
          };
        }),
      };
    }

    return {
      id: it.id,
      name: it.name,
      image: it.image || null,
      biome: it.biome ?? null,
      tier: it.tier ?? null,
      category,
      teleportable,
      stack: it.stack ?? null,
      weight: it.weight ?? null,
      wiki: it.wiki || null,
      names: it.names || {},
      sources: {
        creatures: creatureSources,
        locations: locationSources,
        recipe: formattedRecipe,
        traders: traderSources,
        raw: it.sources || [],
      },
      usedIn: {
        weapons: Array.from(itemWeaponsMap.get(it.id).values()),
        armor: Array.from(itemArmorMap.get(it.id).values()),
        food: Array.from(itemFoodMap.get(it.id).values()),
        meads: Array.from(itemMeadsMap.get(it.id).values()),
        comfort: Array.from(itemComfortMap.get(it.id).values()),
        expedition: Array.from(itemExpeditionMap.get(it.id).values()),
        stations: Array.from(itemStationsMap.get(it.id).values()),
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
  const appsItemsDataDir = path.join(ROOT, 'apps', 'items', 'data');
  mkdirSync(appsItemsDataDir, { recursive: true });
  const clientBundlePath = path.join(appsItemsDataDir, 'data.js');
  const bundleContent = `globalThis.VC_ITEMS_DATA = ${JSON.stringify(outputData, null, 2)};\n`;
  writeFileSync(clientBundlePath, bundleContent, 'utf8');

  console.log(`Successfully built Items Compendium: ${compendiumItems.length} items.`);
  return outputData;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  buildItemsData();
}
