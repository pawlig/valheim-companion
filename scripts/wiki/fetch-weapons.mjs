// Fetches weapons and materials from valheim.weirdgloop.org (MediaWiki API) and
// builds data/weapons.json, data/materials.json, data/report-weapons.md plus images
// in img/weapons/.
//
// Follows DATA-SCHEMA.md and docs/ANALYZA.md § 3, § 5. Every API response goes
// through the on-disk cache (api.mjs), ensuring byte-identical results on re-runs.

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { api, MwApi } from './api.mjs';
import { cleanText, parseImage, parseInfobox, parseLinks, parseTemplates, slug } from './wikitext.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DATA_DIR = path.join(REPO_ROOT, 'data');
const WIKI_URL = 'https://valheim.weirdgloop.org';
const WEAPON_IMG_WIDTH = 96;

const abs = (rel) => path.join(REPO_ROOT, 'apps', 'bestiary', rel);
const byCodepoint = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const wikiPageUrl = (title) => `${WIKI_URL}/w/${encodeURIComponent(title.replace(/ /g, '_'))}`;

function lowercaseExceptFirst(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

const DAMAGE_TYPES = ['blunt', 'slash', 'pierce', 'chop', 'pickaxe', 'fire', 'frost', 'lightning', 'poison', 'spirit'];

const BIOMES = [
  { id: 'meadows', tier: 1 },
  { id: 'black-forest', tier: 2 },
  { id: 'swamp', tier: 3 },
  { id: 'ocean', tier: 3 },
  { id: 'mountain', tier: 4 },
  { id: 'plains', tier: 5 },
  { id: 'mistlands', tier: 6 },
  { id: 'ashlands', tier: 7 },
  { id: 'deep-north', tier: 8 },
];
const tierByBiome = new Map(BIOMES.map((b) => [b.id, b.tier]));

const BIOME_KEYWORDS = [
  ['deep north', 'deep-north'],
  ['ashlands', 'ashlands'],
  ['mistlands', 'mistlands'],
  ['plains', 'plains'],
  ['mountains', 'mountain'],
  ['mountain', 'mountain'],
  ['swamp', 'swamp'],
  ['ocean', 'ocean'],
  ['black forest', 'black-forest'],
  ['meadows', 'meadows'],
];

// Baseline material table from docs/ANALYZA.md § 3
const BASE_MATERIAL_TABLE = {
  // tier 1
  Wood: { biome: 'meadows', tier: 1 },
  Stone: { biome: 'meadows', tier: 1 },
  Flint: { biome: 'meadows', tier: 1 },
  'Leather Scraps': { biome: 'meadows', tier: 1 },
  'Deer Hide': { biome: 'meadows', tier: 1 },
  Resin: { biome: 'meadows', tier: 1 },
  Feathers: { biome: 'meadows', tier: 1 },
  'Hard Antler': { biome: 'meadows', tier: 1 },
  Raspberries: { biome: 'meadows', tier: 1 },
  Honey: { biome: 'meadows', tier: 1 },
  // tier 2
  Copper: { biome: 'black-forest', tier: 2 },
  Tin: { biome: 'black-forest', tier: 2 },
  Bronze: { biome: 'black-forest', tier: 2 },
  'Bronze Nails': { biome: 'black-forest', tier: 2 },
  'Core Wood': { biome: 'black-forest', tier: 2 },
  Corewood: { biome: 'black-forest', tier: 2 },
  'Fine Wood': { biome: 'black-forest', tier: 2 },
  Finewood: { biome: 'black-forest', tier: 2 },
  'Bone Fragments': { biome: 'black-forest', tier: 2 },
  'Troll Hide': { biome: 'black-forest', tier: 2 },
  'Greydwarf Eye': { biome: 'black-forest', tier: 2 },
  'Surtling Core': { biome: 'black-forest', tier: 2 },
  'Ancient Seed': { biome: 'black-forest', tier: 2 },
  // tier 3
  Iron: { biome: 'swamp', tier: 3 },
  'Iron Nails': { biome: 'swamp', tier: 3 },
  'Ancient Bark': { biome: 'swamp', tier: 3 },
  'Elder Bark': { biome: 'swamp', tier: 3 },
  Guck: { biome: 'swamp', tier: 3 },
  Ooze: { biome: 'swamp', tier: 3 },
  Entrails: { biome: 'swamp', tier: 3 },
  Bloodbag: { biome: 'swamp', tier: 3 },
  Wishbone: { biome: 'swamp', tier: 3 },
  Root: { biome: 'swamp', tier: 3 },
  'Root (item)': { biome: 'swamp', tier: 3 },
  'Withered Bone': { biome: 'swamp', tier: 3 },
  // tier 3 ocean
  Chitin: { biome: 'ocean', tier: 3 },
  'Serpent Scale': { biome: 'ocean', tier: 3 },
  'Serpent Meat': { biome: 'ocean', tier: 3 },
  // tier 4
  Silver: { biome: 'mountain', tier: 4 },
  Obsidian: { biome: 'mountain', tier: 4 },
  'Wolf Fang': { biome: 'mountain', tier: 4 },
  'Wolf Pelt': { biome: 'mountain', tier: 4 },
  'Wolf Claw': { biome: 'mountain', tier: 4 },
  'Freeze Gland': { biome: 'mountain', tier: 4 },
  'Dragon Tear': { biome: 'mountain', tier: 4 },
  Crystal: { biome: 'mountain', tier: 4 },
  'Fenris Hair': { biome: 'mountain', tier: 4 },
  'Fenris Claw': { biome: 'mountain', tier: 4 },
  'Drake Trophy': { biome: 'mountain', tier: 4 },
  // tier 5
  'Black Metal': { biome: 'plains', tier: 5 },
  'Linen Thread': { biome: 'plains', tier: 5 },
  Linen: { biome: 'plains', tier: 5 },
  Flax: { biome: 'plains', tier: 5 },
  Needle: { biome: 'plains', tier: 5 },
  'Lox Pelt': { biome: 'plains', tier: 5 },
  Barley: { biome: 'plains', tier: 5 },
  Tar: { biome: 'plains', tier: 5 },
  'Torn Spirit': { biome: 'plains', tier: 5 },
  'Yagluth Thing': { biome: 'plains', tier: 5 },
  // tier 6
  Carapace: { biome: 'mistlands', tier: 6 },
  Eitr: { biome: 'mistlands', tier: 6 },
  'Refined Eitr': { biome: 'mistlands', tier: 6 },
  'Black Core': { biome: 'mistlands', tier: 6 },
  'Yggdrasil Wood': { biome: 'mistlands', tier: 6 },
  Mandible: { biome: 'mistlands', tier: 6 },
  Bilebag: { biome: 'mistlands', tier: 6 },
  'Black Marble': { biome: 'mistlands', tier: 6 },
  Jade: { biome: 'mistlands', tier: 6 },
  Sap: { biome: 'mistlands', tier: 6 },
  'Royal Jelly': { biome: 'mistlands', tier: 6 },
  Iolite: { biome: 'mistlands', tier: 6 },
  'Dvergr Extractor': { biome: 'mistlands', tier: 6 },
  'Scale Hide': { biome: 'mistlands', tier: 6 },
  // tier 7
  Flametal: { biome: 'ashlands', tier: 7 },
  'Flametal Ore': { biome: 'ashlands', tier: 7 },
  'Charred Bone': { biome: 'ashlands', tier: 7 },
  Grausten: { biome: 'ashlands', tier: 7 },
  Ashwood: { biome: 'ashlands', tier: 7 },
  'Asksvin Hide': { biome: 'ashlands', tier: 7 },
  'Morgen Sinew': { biome: 'ashlands', tier: 7 },
  'Morgen Heart': { biome: 'ashlands', tier: 7 },
  'Bonemaw Tooth': { biome: 'ashlands', tier: 7 },
  'Celestial Feather': { biome: 'ashlands', tier: 7 },
  Proustite: { biome: 'ashlands', tier: 7 },
  'Proustite Powder': { biome: 'ashlands', tier: 7 },
  'Sulfur Stone': { biome: 'ashlands', tier: 7 },
  Sulfur: { biome: 'ashlands', tier: 7 },
  'Molten Core': { biome: 'ashlands', tier: 7 },
  'Fader Drop': { biome: 'ashlands', tier: 7 },
  'Charred Cogwheel': { biome: 'ashlands', tier: 7 },
  'Bell Fragment': { biome: 'ashlands', tier: 7 },
  'Ceramic Plate': { biome: 'ashlands', tier: 7 },
  // tier 8
  Frostcore: { biome: 'deep-north', tier: 8 },
  Timberwood: { biome: 'deep-north', tier: 8 },
  'Moose Hide': { biome: 'deep-north', tier: 8 },
  'Moose Sinew': { biome: 'deep-north', tier: 8 },
  'Petrified Tissue': { biome: 'deep-north', tier: 8 },
  'Luminous Larva': { biome: 'deep-north', tier: 8 },
  Ice: { biome: 'deep-north', tier: 8 },
};

function determineCategory(typeStr) {
  if (!typeStr) return null;
  const t = typeStr.toLowerCase().replace(/\[\[|\]\]/g, '').trim();
  if (t.includes('shield') || t.includes('buckler')) return 'shield';
  if (t === 'sword' || t === 'sword 1h' || t === 'sword 2h') return 'sword';
  if (t === 'axe 1h' || t === 'axe' || t === 'axe dw') return 'axe';
  if (t === 'axe 2h' || t === 'battleaxe') return 'battleaxe';
  if (t === 'club 1h' || t === 'mace' || t === 'club') return 'club';
  if (t === 'club 2h' || t === 'sledge') return 'sledge';
  if (t === 'spear') return 'spear';
  if (t === 'polearm' || t === 'atgeir') return 'polearm';
  if (t === 'knife' || t === 'dagger' || t === 'knife 2h') return 'knife';
  if (t === 'fist' || t === 'fists') return 'fists';
  if (t === 'pickaxe') return 'pickaxe';
  if (t === 'bow') return 'bow';
  if (t === 'crossbow') return 'crossbow';
  if (t === 'arrow') return 'arrow';
  if (t === 'bolt' || t === 'bolts') return 'bolt';
  if (t === 'magic' || t === 'staff' || t.includes('magic')) return 'magic';
  if (t === 'bomb') return 'bomb';
  return null;
}

function determineHands(category, typeStr, wieldingStr) {
  if (['arrow', 'bolt', 'bomb'].includes(category)) return null;
  const w = (wieldingStr || '').toLowerCase();
  const t = (typeStr || '').toLowerCase();
  if (w.includes('dual') || t.includes('dw')) return '2h';
  if (w.includes('two-handed') || t.includes('2h')) return '2h';
  if (w.includes('one-handed') || t.includes('1h')) return '1h';
  if (['battleaxe', 'sledge', 'polearm', 'bow', 'crossbow', 'magic', 'pickaxe'].includes(category)) return '2h';
  return '1h';
}

function parseRecipe(text) {
  if (!text) return [];
  const lines = text.split('\n');
  const items = [];
  for (const line of lines) {
    const trimmed = line.replace(/^\*+\s*/, '').trim();
    if (!trimmed || trimmed === 'n/a') continue;
    let name = null;
    let amount = 1;
    const endMatch = trimmed.match(/^(.*?)\s*(?:x|\*|\:|\()\s*(\d+)\)?$/i);
    const startMatch = trimmed.match(/^(\d+)\s*(?:x|\*|\:)?\s*(.*?)$/i);
    if (endMatch) {
      name = endMatch[1].trim();
      amount = parseInt(endMatch[2], 10);
    } else if (startMatch) {
      amount = parseInt(startMatch[1], 10);
      name = startMatch[2].trim();
    } else {
      name = trimmed;
    }
    const linkMatch = name.match(/\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/);
    if (linkMatch) {
      name = (linkMatch[2] ?? linkMatch[1]).trim();
    } else {
      name = cleanText(name).trim();
    }
    if (name) {
      items.push({ name, amount });
    }
  }
  return items;
}

async function main() {
  // 1. Load creatures and overrides
  const creatures = JSON.parse(readFileSync(path.join(DATA_DIR, 'creatures.json'), 'utf8'));
  const creatureByName = new Map();
  for (const c of creatures) {
    creatureByName.set(c.name.toLowerCase(), c);
    creatureByName.set(c.name.toLowerCase() + 's', c);
  }

  let overrides = null;
  const overridesPath = path.join(DATA_DIR, 'overrides.json');
  if (existsSync(overridesPath)) {
    try {
      overrides = JSON.parse(readFileSync(overridesPath, 'utf8'));
    } catch (err) {
      console.warn('warning: failed to parse data/overrides.json:', err.message);
    }
  }

  // 2. Fetch category member titles
  const categories = ['Weapons', 'Arrows', 'Bolts', 'Bombs', 'Magic'];
  console.log(`fetching category members for: ${categories.join(', ')}…`);
  const memberTitles = new Set();
  for (const cat of categories) {
    const members = await api.getCategory(cat);
    for (const title of members) memberTitles.add(title);
  }
  const allTitles = [...memberTitles].sort(byCodepoint);
  console.log(`found ${allTitles.length} unique titles across categories`);

  // 3. Fetch wikitext for all pages
  const allPages = await api.getWikitext(allTitles);

  // 4. Parse weapons and apply exclusion rules
  const report = {
    excluded: [],
    weaponsByTier: {},
    unresolvedMaterials: [],
    weaponsWithNullTier: [],
    weaponsWithoutImage: [],
  };

  const parsedWeapons = [];
  const referencedMaterials = new Set();

  for (const title of allTitles) {
    const page = allPages[title];
    if (!page || !page.wikitext) {
      report.excluded.push({ title, reason: 'missing wikitext' });
      continue;
    }
    const wt = page.wikitext;
    const ib = parseInfobox(wt, 'weapon');
    if (!ib) {
      report.excluded.push({ title, reason: 'no {{infobox weapon}} (category/disambiguation page)' });
      continue;
    }

    const weaponSlug = slug(title);
    if (overrides?.exclude?.weapons?.includes(weaponSlug)) {
      report.excluded.push({ title, reason: 'excluded via overrides.json' });
      continue;
    }

    // Exclude cheat weapons
    if (title.toLowerCase().startsWith('cheat') || (ib.id && ib.id.toLowerCase().includes('cheat'))) {
      report.excluded.push({ title, reason: 'cheat weapon' });
      continue;
    }

    // Exclude torches, lanterns
    if (title.toLowerCase() === 'torch' || title.toLowerCase().includes('lantern')) {
      report.excluded.push({ title, reason: 'torch/lantern' });
      continue;
    }

    // Exclude snowball, snow shovel
    if (title.toLowerCase() === 'snowball' || title.toLowerCase() === 'snow shovel') {
      report.excluded.push({ title, reason: 'snowball/snow shovel' });
      continue;
    }

    // Category mapping
    const category = determineCategory(ib.type);
    if (!category || category === 'shield') {
      report.excluded.push({ title, reason: `excluded type (${ib.type ?? 'none'})` });
      continue;
    }

    // Damage calculation and zero direct damage check
    const damage = {};
    let totalDmg = 0;
    for (const dt of DAMAGE_TYPES) {
      if (ib[dt] != null && ib[dt] !== '') {
        const val = parseFloat(ib[dt]);
        if (!Number.isNaN(val) && val > 0) {
          damage[dt] = val;
          totalDmg += val;
        }
      }
    }
    if (totalDmg === 0) {
      report.excluded.push({ title, reason: 'zero direct damage' });
      continue;
    }

    // Recipe parsing
    const recipeText = ib['materials 1'] ?? ib['materials'] ?? '';
    const materials = parseRecipe(recipeText);
    for (const item of materials) referencedMaterials.add(item.name);

    // Max quality: count of "materials N"
    let maxQuality = 1;
    if (['arrow', 'bolt', 'bomb'].includes(category)) {
      maxQuality = 1;
    } else {
      let q = 1;
      while (ib[`materials ${q}`] != null) q += 1;
      maxQuality = Math.max(1, q - 1);
    }

    // Damage per level and damageMax
    const perLevel = {};
    for (const dt of DAMAGE_TYPES) {
      const field = `${dt} per level`;
      if (ib[field] != null && ib[field] !== '') {
        const val = parseFloat(ib[field]);
        if (!Number.isNaN(val)) perLevel[dt] = val;
      }
    }
    const damageMax = {};
    for (const [dt, baseVal] of Object.entries(damage)) {
      const step = perLevel[dt] ?? 0;
      damageMax[dt] = baseVal + step * (maxQuality - 1);
    }

    let imageRaw = ib.image;
    if (imageRaw && typeof imageRaw === 'string') {
      imageRaw = imageRaw.replace(/\{\{PAGENAME\}\}/gi, title);
    }
    if (!imageRaw && wt.includes('tabber')) {
      const tabberMatch = wt.match(/\|\s*image\s*=\s*([^\r\n|}]+)/i);
      if (tabberMatch) {
        imageRaw = tabberMatch[1].trim().replace(/\{\{PAGENAME\}\}/gi, title);
      }
    }
    const imageFile = parseImage(imageRaw);

    parsedWeapons.push({
      id: weaponSlug,
      name: cleanText(title),
      wiki: wikiPageUrl(title),
      gameId: ib.id ? cleanText(ib.id) : null,
      category,
      hands: determineHands(category, ib.type, ib.wielding),
      type: cleanText(ib.type),
      imageFile,
      image: null,
      station: ib.source ? cleanText(ib.source) : null,
      stationLevel: ib['crafting level'] ? parseInt(ib['crafting level'], 10) || null : null,
      maxQuality,
      damage,
      perLevel,
      damageMax,
      stamina: ib.stamina ? parseInt(ib.stamina, 10) || null : null,
      knockback: ib.knockback ? parseInt(ib.knockback, 10) || null : null,
      materials,
      quantity: ib.quantity ? parseInt(ib.quantity, 10) || null : null,
      tier: null,
      biome: null,
      description: cleanText(ib.description || ''),
    });
  }

  // 5. Fetch material pages and secondary source/location pages
  const matList = [...referencedMaterials].sort(byCodepoint);
  console.log(`fetching wiki pages for ${matList.length} materials…`);
  const missingMatTitles = matList.filter((m) => !allPages[m]);
  if (missingMatTitles.length > 0) {
    const fetched = await api.getWikitext(missingMatTitles);
    Object.assign(allPages, fetched);
  }

  const secondaryTitles = new Set();
  for (const m of matList) {
    const wt = allPages[m]?.wikitext;
    if (!wt) continue;
    const links = parseLinks(wt);
    for (const link of links) {
      if (!allPages[link] && !BASE_MATERIAL_TABLE[link]) secondaryTitles.add(link);
    }
  }
  if (secondaryTitles.size > 0) {
    const fetched2 = await api.getWikitext([...secondaryTitles]);
    Object.assign(allPages, fetched2);
  }

  // 6. Material resolution function
  const materialCache = new Map();

  function resolveMaterial(name, depth = 0) {
    if (materialCache.has(name)) return materialCache.get(name);

    // Overrides have absolute precedence
    const override = overrides?.materials?.[name];
    if (override) {
      const res = { name, biome: override.biome, tier: override.tier, how: 'override', note: override.reason ?? 'overrides.json' };
      materialCache.set(name, res);
      return res;
    }

    // Baseline constant table
    if (BASE_MATERIAL_TABLE[name]) {
      const res = { name, biome: BASE_MATERIAL_TABLE[name].biome, tier: BASE_MATERIAL_TABLE[name].tier, how: 'table' };
      materialCache.set(name, res);
      return res;
    }

    // Trophy check
    const trophyMatch = name.match(/^(.+?)\s+Trophy$/i);
    if (trophyMatch) {
      const c = creatureByName.get(trophyMatch[1].toLowerCase());
      if (c && c.biomes[0]) {
        const b = c.biomes[0];
        const res = { name, biome: b, tier: tierByBiome.get(b), how: 'wiki', note: `drops from creature ${c.name}` };
        materialCache.set(name, res);
        return res;
      }
    }

    // Haldor special for Ymir Flesh if not in overrides
    if (name.toLowerCase() === 'ymir flesh') {
      const res = { name, biome: 'swamp', tier: 3, how: 'wiki', note: 'purchased from Haldor after The Elder' };
      materialCache.set(name, res);
      return res;
    }

    const page = allPages[name];
    if (!page || !page.wikitext) {
      const res = { name, biome: null, tier: null, how: 'unresolved', note: 'missing wiki page' };
      materialCache.set(name, res);
      return res;
    }
    const wt = page.wikitext;

    // Find best matching infobox (handling multi-tabbers like Early Axes or Nord weapons)
    const allIb = [
      ...parseTemplates(wt, 'infobox item'),
      ...parseTemplates(wt, 'infobox weapon'),
      ...parseTemplates(wt, 'infobox material'),
      ...parseTemplates(wt, 'infobox structure'),
    ];
    let ib = allIb[0] ?? null;
    for (const cand of allIb) {
      if (cand.title && cleanText(cand.title).toLowerCase().includes(name.toLowerCase())) {
        ib = cand;
        break;
      }
    }

    // Recursive sub-materials check (depth <= 3)
    const matField = ib?.['materials 1'] ?? ib?.['materials'];
    if (matField && depth < 3) {
      const subMats = parseRecipe(matField);
      if (subMats.length > 0) {
        let maxTier = -1;
        let maxBiome = null;
        let hasUnresolved = false;
        for (const sm of subMats) {
          if (sm.name.toLowerCase().includes('mould') || sm.name.toLowerCase() === name.toLowerCase()) continue;
          if (sm.name.toLowerCase().includes('fragment') && name.toLowerCase().includes('fragment')) continue;
          const resolved = resolveMaterial(sm.name, depth + 1);
          if (resolved.tier == null) hasUnresolved = true;
          else if (resolved.tier > maxTier) {
            maxTier = resolved.tier;
            maxBiome = resolved.biome;
          }
        }
        if (!hasUnresolved && maxTier > 0) {
          const res = { name, biome: maxBiome, tier: maxTier, how: 'wiki', note: `crafted from ${subMats.map((s) => s.name).join(', ')}` };
          materialCache.set(name, res);
          return res;
        }
      }
    }

    // Check infobox fields: biome, location, source, drops from
    if (ib) {
      const checkFields = [ib.biome, ib.location, ib.source, ib['drops from']].filter(Boolean);
      const checkText = checkFields.join(' ');
      const links = parseLinks(checkText);
      for (const link of links) {
        const c = creatureByName.get(link.toLowerCase());
        if (c && c.biomes[0]) {
          const b = c.biomes[0];
          const res = { name, biome: b, tier: tierByBiome.get(b), how: 'wiki', note: `linked creature ${c.name}` };
          materialCache.set(name, res);
          return res;
        }
        if (allPages[link]?.wikitext) {
          const structIb = parseInfobox(allPages[link].wikitext, 'location') || parseInfobox(allPages[link].wikitext, 'structure');
          if (structIb) {
            const locText = [structIb.location, structIb.biome].filter(Boolean).join(' ');
            for (const [bName, bId] of BIOME_KEYWORDS) {
              if (locText.toLowerCase().includes(bName)) {
                const res = { name, biome: bId, tier: tierByBiome.get(bId), how: 'wiki', note: `found in ${link} (${bName})` };
                materialCache.set(name, res);
                return res;
              }
            }
            if (structIb.materials && depth < 3) {
              const structMats = parseRecipe(structIb.materials);
              let sMaxTier = -1;
              let sMaxBiome = null;
              for (const sm of structMats) {
                const resSm = resolveMaterial(sm.name, depth + 1);
                if (resSm.tier != null && resSm.tier > sMaxTier) {
                  sMaxTier = resSm.tier;
                  sMaxBiome = resSm.biome;
                }
              }
              if (sMaxTier > 0) {
                const res = {
                  name,
                  biome: sMaxBiome,
                  tier: sMaxTier,
                  how: 'wiki',
                  note: `structure ${link} built from ${structMats.map((s) => s.name).join(', ')}`,
                };
                materialCache.set(name, res);
                return res;
              }
            }
          }
        }
      }
      for (const [bName, bId] of BIOME_KEYWORDS) {
        if (checkText.toLowerCase().includes(bName)) {
          const res = { name, biome: bId, tier: tierByBiome.get(bId), how: 'wiki', note: `mentioned biome ${bName}` };
          materialCache.set(name, res);
          return res;
        }
      }
    }

    // Lead text check
    const lead = wt.slice(0, 5000);
    const leadLinks = parseLinks(lead);
    for (const link of leadLinks) {
      const c = creatureByName.get(link.toLowerCase());
      if (c && c.biomes[0]) {
        const b = c.biomes[0];
        const res = { name, biome: b, tier: tierByBiome.get(b), how: 'wiki', note: `lead mentioned creature ${c.name}` };
        materialCache.set(name, res);
        return res;
      }
    }
    for (const [bName, bId] of BIOME_KEYWORDS) {
      if (lead.toLowerCase().includes(bName)) {
        const res = { name, biome: bId, tier: tierByBiome.get(bId), how: 'wiki', note: `lead mentioned biome ${bName}` };
        materialCache.set(name, res);
        return res;
      }
    }

    const res = { name, biome: null, tier: null, how: 'unresolved', note: 'could not determine biome' };
    materialCache.set(name, res);
    return res;
  }

  const allResolvedMaterials = matList.map((m) => resolveMaterial(m));
  const materialsByName = new Map(allResolvedMaterials.map((m) => [m.name, m]));

  for (const m of allResolvedMaterials) {
    if (m.tier == null) report.unresolvedMaterials.push(m.name);
  }

  // 7. Compute tiers for all kept weapons
  for (const w of parsedWeapons) {
    if (w.name.toLowerCase() === 'bare fists') {
      w.tier = 1;
      w.biome = 'meadows';
    } else if (w.materials.length === 0) {
      w.tier = null;
      w.biome = null;
    } else {
      let maxTier = -1;
      let maxBiome = null;
      let hasUnresolved = false;
      for (const item of w.materials) {
        const rm = materialsByName.get(item.name);
        if (!rm || rm.tier == null) {
          hasUnresolved = true;
        } else if (rm.tier > maxTier) {
          maxTier = rm.tier;
          maxBiome = rm.biome;
        }
      }
      if (hasUnresolved || maxTier <= 0) {
        w.tier = null;
        w.biome = null;
      } else {
        w.tier = maxTier;
        w.biome = maxBiome;
      }
    }

    const tierKey = w.tier == null ? 'null' : String(w.tier);
    report.weaponsByTier[tierKey] = (report.weaponsByTier[tierKey] || 0) + 1;
    if (w.tier == null) report.weaponsWithNullTier.push(w.name);
  }

  // 8. Download weapon icons
  const weaponsDir = abs('img/weapons');
  mkdirSync(weaponsDir, { recursive: true });

  for (const w of parsedWeapons) {
    const dest = path.join(weaponsDir, `${w.id}.png`);
    if (existsSync(dest)) {
      w.image = `img/weapons/${w.id}.png`;
    }
  }

  const resolveImageBatch = async (items, getFileName, client) => {
    const needed = items.filter((w) => !w.image);
    if (needed.length === 0) return;
    const fileMap = new Map();
    for (const w of needed) {
      const fn = getFileName(w);
      if (fn) fileMap.set(w, fn);
    }
    const filesToQuery = [...new Set(fileMap.values())];
    if (filesToQuery.length === 0) return;

    const urls = await client.getImageUrls(filesToQuery, WEAPON_IMG_WIDTH);
    for (const [w, fn] of fileMap.entries()) {
      if (w.image) continue;
      const url = urls[fn];
      if (url) {
        const dest = path.join(weaponsDir, `${w.id}.png`);
        await client.download(url, dest);
        if (existsSync(dest)) {
          w.image = `img/weapons/${w.id}.png`;
        }
      }
    }
  };

  // Step 1: field `image` from infobox (including inside tabber)
  await resolveImageBatch(parsedWeapons, (w) => w.imageFile, api);

  // Step 2: File:<Title>.png via weirdgloop
  await resolveImageBatch(parsedWeapons, (w) => `${w.name}.png`, api);

  // Step 3: File:<Title with lowercase except first letter>.png via weirdgloop
  await resolveImageBatch(parsedWeapons, (w) => `${lowercaseExceptFirst(w.name)}.png`, api);

  // Step 4: same names via https://valheim.fandom.com/api.php
  const stillMissing = parsedWeapons.filter((w) => !w.image);
  if (stillMissing.length > 0) {
    const fandomApi = new MwApi({ baseUrl: 'https://valheim.fandom.com/api.php' });
    await resolveImageBatch(stillMissing, (w) => w.imageFile, fandomApi);
    await resolveImageBatch(stillMissing, (w) => `${w.name}.png`, fandomApi);
    await resolveImageBatch(stillMissing, (w) => `${lowercaseExceptFirst(w.name)}.png`, fandomApi);
  }

  // Record weapons without image for the report
  const missingFinal = parsedWeapons.filter((w) => !w.image);
  report.weaponsWithoutImage = missingFinal.map((w) => w.name);

  // Delete temp imageFile property
  for (const w of parsedWeapons) {
    delete w.imageFile;
  }

  // Sort deterministically
  parsedWeapons.sort((a, b) => byCodepoint(a.name, b.name));
  allResolvedMaterials.sort((a, b) => byCodepoint(a.name, b.name));

  // 9. Write outputs
  mkdirSync(DATA_DIR, { recursive: true });
  const writeIfChanged = (dest, content) => {
    if (existsSync(dest) && readFileSync(dest, 'utf8') === content) return;
    writeFileSync(dest, content);
  };
  writeIfChanged(path.join(DATA_DIR, 'weapons.json'), `${JSON.stringify(parsedWeapons, null, 2)}\n`);
  writeIfChanged(path.join(DATA_DIR, 'materials.json'), `${JSON.stringify(allResolvedMaterials, null, 2)}\n`);
  writeIfChanged(path.join(DATA_DIR, 'report-weapons.md'), renderReport(report, parsedWeapons, allResolvedMaterials));

  console.log(`done: ${parsedWeapons.length} weapons, ${allResolvedMaterials.length} materials`);
}

function renderReport(report, weapons, materials) {
  const lines = [];
  lines.push('# VC-2 weapons and materials report', '', 'Source: valheim.weirdgloop.org (MediaWiki API). No dates on purpose: the report must be byte-identical on re-runs from cache.', '');

  lines.push('## Weapons per tier', '', '| Tier | Biome | Count |', '|---|---|---|');
  for (const b of BIOMES) {
    const count = weapons.filter((w) => w.tier === b.tier && w.biome === b.id).length;
    lines.push(`| ${b.tier} | ${b.id} | ${count} |`);
  }
  const nullCount = weapons.filter((w) => w.tier == null).length;
  lines.push(`| null | (none) | ${nullCount} |`);
  lines.push(`| **Total** | | **${weapons.length}** |`, '');

  lines.push('## Weapons per category', '');
  const catMap = {};
  for (const w of weapons) catMap[w.category] = (catMap[w.category] || 0) + 1;
  for (const [cat, cnt] of Object.entries(catMap).sort(([a], [b]) => byCodepoint(a, b))) {
    lines.push(`- **${cat}**: ${cnt}`);
  }
  lines.push('');

  lines.push('## Weapons with null tier', '');
  if (report.weaponsWithNullTier.length === 0) {
    lines.push('(none)', '');
  } else {
    for (const name of report.weaponsWithNullTier.sort(byCodepoint)) {
      lines.push(`- ${name}`);
    }
    lines.push('');
  }

  lines.push('## Missing weapon icons', '');
  if (report.weaponsWithoutImage.length === 0) {
    lines.push('(none)', '');
  } else {
    for (const name of report.weaponsWithoutImage.sort(byCodepoint)) {
      lines.push(`- ${name}`);
    }
    lines.push('');
  }

  lines.push('## Unresolved materials', '');
  if (report.unresolvedMaterials.length === 0) {
    lines.push('(none)', '');
  } else {
    for (const name of report.unresolvedMaterials.sort(byCodepoint)) {
      lines.push(`- ${name}`);
    }
    lines.push('');
  }

  lines.push('## Excluded weapons', '');
  for (const item of report.excluded.sort((a, b) => byCodepoint(a.title, b.title))) {
    lines.push(`- **${item.title}**: ${item.reason}`);
  }
  lines.push('');

  lines.push('## Open questions', '');
  lines.push('(none)', '');

  return lines.join('\n');
}

main().catch((err) => {
  console.error('Fatal error in fetch-weapons:', err);
  process.exit(1);
});
