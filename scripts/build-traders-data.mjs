// Build script for Trader Ledger dataset (VC-40, rewritten in VC-42a).
// Merchandise is parsed from the "Sells"/"Trading" wikitable on the wiki page of
// each trader (Haldor, Hildir, The Bog Witch), read from the wiki cache in
// data/raw/. Only trader descriptions and the valuables list are literals.
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { api } from './wiki/api.mjs';
import { cleanText, parseWikiTables, slug } from './wiki/wikitext.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = path.join(ROOT, 'data');
const APPS_DIR = path.join(ROOT, 'apps');
const APPS_TRADERS_DATA_DIR = path.join(APPS_DIR, 'traders', 'data');

export const VALUABLES = [
  {
    id: 'amber',
    name: 'Amber',
    value: 5,
    description: 'Petrified golden tree resin found in crypts, troll caves, and sunken chests. Redeemable for 5 coins.',
    image: null,
  },
  {
    id: 'amber-pearl',
    name: 'Amber Pearl',
    value: 10,
    description: 'A polished, lustrous amber gemstone discovered in ancient burial sites. Redeemable for 10 coins.',
    image: '../smithy/img/items/amber-pearl.png',
  },
  {
    id: 'ruby',
    name: 'Ruby',
    value: 20,
    description: 'A precious brilliant crimson stone found in crypt chests and sunken ruins. Redeemable for 20 coins.',
    image: null,
  },
  {
    id: 'silver-necklace',
    name: 'Silver Necklace',
    value: 30,
    description: 'An ancient silver trinket buried with long-forgotten Viking nobility. Redeemable for 30 coins.',
    image: null,
  },
];

const TRADER_META = [
  {
    id: 'haldor',
    name: 'Haldor',
    biome: 'black-forest',
    title: 'The Traveling Merchant',
    description:
      'A cheerful dwarven merchant camping in the Black Forest with his faithful lox, Halstein. Sheltered within a magical rune-inscribed ward where weapons cannot be drawn.',
    mapIconTip:
      'His location is revealed with a money bag icon on the map when you wander within 1500 meters of any of his possible spawning clearings.',
    page: 'Haldor',
  },
  {
    id: 'hildir',
    name: 'Hildir',
    biome: 'meadows',
    title: 'The Wandering Sister',
    description:
      'Haldor’s adventurous sister who set up a camp in the peaceful Meadows with her two woolly lox. Her wagon was ambushed and pillaged by three dangerous minibosses; recover her stolen chests to unlock her full wardrobe.',
    mapIconTip:
      'Her camp appears on the map as a two-tusked shirt/hanger icon when you approach within 3000 to 5000 meters of her location in the Meadows.',
    page: 'Hildir',
  },
  {
    id: 'bog-witch',
    name: 'The Bog Witch',
    biome: 'swamp',
    title: 'The Swampland Alchemist',
    description:
      'A mysterious, cackling crone residing inside an enchanted wooden hut deep in the misty Swamps. She concocts esoteric elixirs, potions, and sells rare culinary seasonings for the grandest feasts.',
    mapIconTip:
      'Her location is marked on the map with a glowing bubbling cauldron icon when you travel within 1500 meters of her swamp clearing.',
    page: 'The Bog Witch',
  },
];

const CHESTS = {
  brass: { boss: 'brenna', bossName: 'Brenna', location: 'Smouldering Tomb' },
  silver: { boss: 'geirrhafa', bossName: 'Geirrhafa', location: 'Howling Cavern' },
  bronze: { boss: 'zil-thungr', bossName: 'Zil & Thungr', location: 'Sealed Tower' },
};

function loadJson(name) {
  return JSON.parse(readFileSync(path.join(DATA_DIR, name), 'utf8'));
}

// Wikitext of the given pages from the wiki cache (data/raw). The cache is keyed
// by the exact query, and the trader pages were fetched in different batches, so
// pages are looked up by title; the build never touches the network.
function readCachedPages(titles) {
  const wanted = new Set(titles);
  const found = new Map();
  for (const file of readdirSync(api.cacheDir).filter((f) => f.endsWith('.json')).sort()) {
    let body;
    try {
      body = JSON.parse(readFileSync(path.join(api.cacheDir, file), 'utf8'));
    } catch {
      continue;
    }
    for (const page of body?.query?.pages ?? []) {
      const wikitext = page.revisions?.[0]?.slots?.main?.content;
      if (wanted.has(page.title) && typeof wikitext === 'string' && !found.has(page.title)) {
        found.set(page.title, wikitext);
      }
    }
    if (found.size === wanted.size) break;
  }
  const missing = titles.filter((t) => !found.has(t));
  if (missing.length) throw new Error(`wiki cache lacks page(s): ${missing.join(', ')}`);
  return found;
}

// Images are looked up in the app image folders by the file name used on the wiki
// or by item id (same rule as the Items Compendium).
function buildImageIndex() {
  const index = new Map();
  const walk = (dir, app, rel) => {
    for (const f of readdirSync(dir).sort()) {
      const full = path.join(dir, f);
      const sub = rel ? `${rel}/${f}` : f;
      if (statSync(full).isDirectory()) {
        walk(full, app, sub);
        continue;
      }
      const url = `../${app}/img/${sub}`;
      const lower = f.toLowerCase();
      if (!index.has(lower)) index.set(lower, url);
      const base = slug(lower.replace(/\.[^.]+$/, ''));
      if (!index.has(base)) index.set(base, url);
    }
  };
  for (const app of ['smithy', 'provisions', 'comfort', 'bestiary', 'traders', 'progress']) {
    const dir = path.join(APPS_DIR, app, 'img');
    if (existsSync(dir)) walk(dir, app, '');
  }
  return index;
}

function sellsTable(wikitext, page) {
  const table = parseWikiTables(wikitext).find((t) => {
    const h = t.headers.map((x) => cleanText(x).toLowerCase());
    return h.includes('name') && h.includes('cost') && h.includes('availability');
  });
  if (!table) throw new Error(`no Sells/Trading table on wiki page ${page}`);
  const headers = table.headers.map((x) => cleanText(x).toLowerCase());
  const col = (name) => headers.indexOf(name);
  return { rows: table.rows, name: col('name'), icon: col('icon'), cost: col('cost'), availability: col('availability'), description: col('item use/description') };
}

// "[[Fishing Bait|Fishing bait x20]]", "[[Love Potion]] x5", "[[Inventory#Expansions|Wider Pockets]]".
function parseNameCell(cell) {
  const m = /\[\[([^\]|]+)(?:\|([^\]]*))?\]\]\s*(.*)$/s.exec(cell);
  if (!m) throw new Error(`unparseable name cell: ${cell}`);
  const [, target, display, rest] = m;
  const shown = (display ?? target).trim();
  const qty = /\bx(\d+)\s*$/i.exec(shown)?.[1] ?? /^x(\d+)/i.exec(rest.trim())?.[1];
  const name = target.includes('#') ? shown.replace(/\s*\bx\d+\s*$/i, '').trim() : target.trim();
  return { name, quantity: qty ? Number(qty) : 1 };
}

function parseAvailability(cell, trader, creaturesById) {
  const text = cleanText(cell).trim();
  if (/^always$/i.test(text)) return null;
  const chest = /Hildir'?s (brass|silver|bronze) chest/i.exec(cell);
  if (chest) {
    const kind = chest[1].toLowerCase();
    const c = CHESTS[kind];
    const boss = creaturesById.get(c.boss);
    return {
      type: 'chest',
      chest: kind,
      boss: c.boss,
      bossName: c.bossName,
      location: c.location,
      biome: boss?.biomes?.[0] ?? null,
      text: `Requires returning Hildir's ${kind} chest (${c.bossName})`,
    };
  }
  const m = /After (defeating|killing)\s+(?:an?\s+)?\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/i.exec(cell);
  if (!m) throw new Error(`${trader}: unknown availability "${text}"`);
  const name = m[2].trim();
  const id = slug(name);
  const creature = creaturesById.get(id);
  const verb = m[1].toLowerCase();
  const type = creature?.kind === 'boss' ? 'boss' : 'creature';
  const article = /\ban?\s+\[\[/i.test(cell) ? (/\ban\s+\[\[/i.test(cell) ? 'an ' : 'a ') : '';
  return {
    type,
    id,
    name: creature?.name ?? name,
    biome: creature?.biomes?.[0] ?? null,
    text: `Requires ${verb} ${article}${creature?.name ?? name}`,
  };
}

function buildTraders() {
  const creatures = loadJson('creatures.json');
  const creatureList = Array.isArray(creatures) ? creatures : creatures.creatures;
  const creaturesById = new Map(creatureList.map((c) => [c.id, c]));
  const pages = readCachedPages(TRADER_META.map((t) => t.page));
  const images = buildImageIndex();

  return TRADER_META.map(({ page, ...meta }) => {
    const table = sellsTable(pages.get(page), page);
    const items = table.rows.map((row) => {
      const { name, quantity } = parseNameCell(row[table.name]);
      const id = slug(name);
      const price = Number(/Item Link\|Coins\|(\d+)/i.exec(row[table.cost])?.[1]);
      if (!Number.isFinite(price) || price <= 0) throw new Error(`${page}: no coin price for ${name}`);
      const unlockedBy = parseAvailability(row[table.availability], page, creaturesById);
      const file = /\[\[File:([^\]|]+)/i.exec(row[table.icon] ?? '')?.[1]?.trim().replaceAll('_', ' ');
      const image =
        (file && images.get(file.toLowerCase())) ||
        (file && images.get(slug(file.replace(/\.[^.]+$/, '')))) ||
        images.get(id) ||
        null;
      return {
        id,
        name,
        quantity,
        price,
        description: cleanText(row[table.description] ?? '').replace(/\s+/g, ' ').trim(),
        unlockedBy,
        image,
        biome: unlockedBy?.biome ?? meta.biome,
      };
    });
    return { ...meta, items };
  });
}

export const TRADERS = buildTraders();

// Minimal biome list for client-side progress lookups (VCProgress.revealedBiomes).
function buildBiomes() {
  const biomes = loadJson('biomes.json');
  return biomes.map((b) => ({ id: b.id, order: b.order, creatures: { boss: b.creatures?.boss ?? [] } }));
}

export function buildTradersData() {
  const outputData = {
    traders: TRADERS,
    valuables: VALUABLES,
    biomes: buildBiomes(),
  };

  // 1. data/traders.json
  mkdirSync(DATA_DIR, { recursive: true });
  const tradersJsonPath = path.join(DATA_DIR, 'traders.json');
  writeFileSync(tradersJsonPath, JSON.stringify(outputData, null, 2) + '\n', 'utf8');

  // 2. apps/traders/data/data.js
  mkdirSync(APPS_TRADERS_DATA_DIR, { recursive: true });
  const clientBundlePath = path.join(APPS_TRADERS_DATA_DIR, 'data.js');
  const clientBundleContent = `globalThis.VC_TRADERS_DATA = ${JSON.stringify(outputData, null, 2)};\n`;
  writeFileSync(clientBundlePath, clientBundleContent, 'utf8');

  console.log(`Successfully built Trader Ledger: ${TRADERS.length} traders, ${VALUABLES.length} valuables.`);
  return outputData;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  buildTradersData();
}
