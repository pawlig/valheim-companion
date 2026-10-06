// Fetches armor, materials, and recipes from valheim.weirdgloop.org (MediaWiki API)
// and builds data/armor.json, data/items.json, data/report-armor.md plus images.
//
// Follows docs/DATA-SCHEMA.md § Armourer and docs/ANALYZA.md § 10.
// Every API response goes through the on-disk cache (api.mjs).

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { api, MwApi } from './api.mjs';
import {
  cleanText,
  parseAllInfoboxes,
  parseInfobox,
  parseLinks,
  parseMaterialList,
  parseQualityTables,
  parseTemplates,
  resolveDisambiguationTitle,
  slug,
} from './wikitext.mjs';
import { BIOMES } from './biomes.mjs';
import { BASE_MATERIAL_TABLE, createMaterialResolver } from './materials.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DATA_DIR = path.join(REPO_ROOT, 'data');
const ARMOURER_DIR = path.join(REPO_ROOT, 'apps', 'armourer');
const ARMOR_IMG_DIR = path.join(ARMOURER_DIR, 'img', 'armor');
const ITEMS_IMG_DIR = path.join(ARMOURER_DIR, 'img', 'items');

const WIKI_URL = 'https://valheim.weirdgloop.org';
const ARMOR_IMG_WIDTH = 128;
const ITEM_IMG_WIDTH = 64;

const byCodepoint = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const wikiPageUrl = (title) => `${WIKI_URL}/w/${encodeURIComponent(title.replace(/ /g, '_'))}`;

function lowercaseExceptFirst(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

const KNOWN_STATIONS = [
  'workbench',
  'forge',
  'smelter',
  'blast-furnace',
  'spinning-wheel',
  'windmill',
  'galdr-table',
  'black-forge',
  'artisan-table',
  'frost-foundry',
  'kiln',
  'cauldron',
  'fermenter',
  'stonecutter',
  'eitr-refinery',
];

const KNOWN_NPCS = ['haldor', 'hildir', 'bog-witch'];

export { resolveDisambiguationTitle };

export function resolvePieceName(boxTitle, pageTitle) {
  const fromBox = boxTitle ? cleanText(boxTitle).trim() : '';
  if (fromBox) return fromBox;
  const fromPage = pageTitle ? cleanText(pageTitle).trim() : '';
  if (fromPage) return fromPage;
  return pageTitle ? String(pageTitle).trim() : '';
}

export function parseTrophySource(itemName, creatures, creatureByName, creaturesBySlug) {
  const trophyMatch = itemName.match(/^(.+?)\s+Trophy$/i);
  if (!trophyMatch) return null;
  const creaturePart = trophyMatch[1].trim();
  const creatureSlug = slug(creaturePart);
  const c =
    creaturesBySlug?.get(creatureSlug) ??
    creatureByName?.get(creaturePart.toLowerCase()) ??
    creatures?.find((cr) => cr.name.toLowerCase() === creaturePart.toLowerCase() || cr.id === creatureSlug);
  if (!c) return null;
  return {
    text: creaturePart,
    kind: 'creature',
    creatureId: c.id,
    biomes: c.biomes,
  };
}

export function parseConversionRecipe(wt, matName, sources = []) {
  if (!wt) return null;
  const re = /\{\{Item\s+link\|([^|}]+)(?:\|(\d+))?\}\}\s*can be converted to\s*(?:(\d+)\s+)?.*?(?:at\s+(?:a\s+)?\[\[([^\]]+)\]\]|\.|$)/i;
  const match = wt.match(re);
  if (match) {
    const inputItemName = cleanText(match[1]).trim();
    const inputAmount = match[2] ? parseInt(match[2], 10) : 1;
    const yields = match[3] ? parseInt(match[3], 10) : 1;
    const station = (match[4] ? cleanText(match[4]).trim() : null) ??
      sources.find((s) => s.kind === 'station')?.text ??
      'Crafting';
    return {
      station,
      materials: [{ name: inputItemName, amount: inputAmount }],
      yields,
    };
  }
  return null;
}

export function resolveRecipeBiomes(items) {
  const itemsById = new Map(items.map((it) => [it.id, it]));
  let changed = true;
  while (changed) {
    changed = false;
    for (const it of items) {
      if (it.biome == null && it.recipe?.materials?.length > 0) {
        let maxTier = -1;
        let maxBiome = null;
        let allKnown = true;
        for (const rm of it.recipe.materials) {
          const matItem = itemsById.get(rm.item);
          if (matItem && matItem.biome && matItem.tier != null) {
            if (matItem.tier > maxTier) {
              maxTier = matItem.tier;
              maxBiome = matItem.biome;
            }
          } else {
            allKnown = false;
          }
        }
        if (allKnown && maxTier > 0 && maxBiome) {
          it.biome = maxBiome;
          it.tier = maxTier;
          changed = true;
        }
      }
    }
  }
}

function parseSlot(typeStr) {
  const t = String(typeStr ?? '').toLowerCase().trim();
  if (t.includes('head') || t.includes('helmet') || t.includes('hood') || t.includes('hat') || t.includes('cap') || t.includes('circlet') || t.includes('scarf') || t.includes('crown')) return 'head';
  if (t.includes('chest') || t.includes('body') || t.includes('tunic') || t.includes('robe') || t.includes('dress') || t.includes('harnesk') || t.includes('cuirass') || t.includes('mail') || t.includes('shirt')) return 'chest';
  if (t.includes('legs') || t.includes('leg') || t.includes('pants') || t.includes('trousers') || t.includes('greaves') || t.includes('leggings')) return 'legs';
  if (t.includes('cape') || t.includes('cloak') || t.includes('shoulder')) return 'cape';
  return 'chest'; // fallback per DATA-SCHEMA: "Typ Body je chest."
}

function parseMovementSpeed(s) {
  if (!s) return 0;
  const match = String(s).match(/([+-]?\d+(?:\.\d+)?)\s*%/);
  return match ? parseFloat(match[1]) : 0;
}

function parseResistances(resField) {
  if (!resField) return [];
  const lines = String(resField).replace(/<br\s*\/?>/gi, '\n').split('\n');
  const results = [];
  for (const line of lines) {
    const cleaned = cleanText(line).replace(/^\*+\s*/, '').trim();
    if (cleaned) results.push(cleaned);
  }
  return results;
}

function parseSources(sourceStr, creaturesBySlug) {
  if (!sourceStr) return [];
  const lines = String(sourceStr).replace(/<br\s*\/?>/gi, '\n').split('\n');
  const results = [];
  for (const line of lines) {
    const parts = line.split(/,\s*/);
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const linkMatch = trimmed.match(/\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/);
      const linkTarget = linkMatch ? linkMatch[1] : trimmed;
      const linkSlug = slug(linkTarget);
      const cleanedText = cleanText(trimmed).trim();

      const entry = { text: cleanedText, kind: 'other' };

      if (creaturesBySlug.has(linkSlug)) {
        const c = creaturesBySlug.get(linkSlug);
        entry.kind = 'creature';
        entry.creatureId = c.id;
        entry.biomes = c.biomes;
      } else if (KNOWN_STATIONS.some((s) => linkSlug.includes(s) || slug(cleanedText).includes(s))) {
        entry.kind = 'station';
      } else if (KNOWN_NPCS.some((n) => linkSlug.includes(n) || slug(cleanedText).includes(n))) {
        entry.kind = 'npc';
      } else if (/crypt|cave|chamber|mine|ruin|tower|fortress|chest|pile|deposit|vein|altar|tomb|village/i.test(cleanedText)) {
        entry.kind = 'location';
      }
      results.push(entry);
    }
  }
  return results;
}

function parseSetBonus(box, pieceCount) {
  const setEffect = box['set effect'];
  if (!setEffect) return null;

  let pieces = pieceCount;
  if (box['set pieces']) {
    const m = box['set pieces'].match(/(\d+)\s*pieces?/i);
    if (m) pieces = parseInt(m[1], 10);
  }

  const lines = setEffect.split('\n').map((l) => l.trim()).filter(Boolean);
  const nameLine = lines.find((l) => !l.startsWith('*')) ?? lines[0];
  const name = cleanText(nameLine).replace(/[:*]/g, '').trim();

  const effects = [];
  for (const line of lines) {
    if (line.startsWith('*')) {
      const effectText = cleanText(line.replace(/^\*+\s*/, '')).trim();
      if (effectText) effects.push(effectText);
    }
  }

  return { name, pieces, effects };
}

function extractDescription(wikitext) {
  if (!wikitext) return '';
  // Remove infoboxes and templates from start (handle nested templates)
  let body = wikitext;
  for (let pass = 0; pass < 10; pass += 1) {
    const next = body.replace(/\{\{([^{}]*)\}\}/g, '');
    if (next === body) break;
    body = next;
  }
  body = body.replace(/==[\s\S]*$/, '').trim(); // cut at first header
  const lines = body.split('\n').map((l) => cleanText(l).trim()).filter((l) => l.length > 10 && !l.startsWith('{|'));
  const desc = lines[0] ?? '';
  return desc.slice(0, 400).trim();
}

async function getCategoryMembers(catTitle, cmtype) {
  const titles = [];
  let cmcontinue;
  const cmtitle = catTitle.startsWith('Category:') ? catTitle : `Category:${catTitle}`;
  do {
    const params = {
      action: 'query',
      list: 'categorymembers',
      cmtitle,
      cmlimit: 500,
      cmtype,
      format: 'json',
      formatversion: 2,
    };
    if (cmcontinue) params.cmcontinue = cmcontinue;
    const body = await api.request(params);
    for (const member of body.query?.categorymembers ?? []) {
      titles.push(member.title);
    }
    cmcontinue = body.continue?.cmcontinue;
  } while (cmcontinue);
  return titles;
}

async function resolveImageBatch(items, getFileName, client, destDir, width) {
  const needed = items.filter((w) => !w._imageDownloaded);
  if (needed.length === 0) return;
  const fileMap = new Map();
  for (const w of needed) {
    const fn = getFileName(w);
    if (fn) fileMap.set(w, fn);
  }
  const filesToQuery = [...new Set(fileMap.values())];
  if (filesToQuery.length === 0) return;

  const urls = await client.getImageUrls(filesToQuery, width);
  for (const [w, fn] of fileMap.entries()) {
    if (w._imageDownloaded) continue;
    const url = urls[fn];
    if (url) {
      const dest = path.join(destDir, `${w.id}.png`);
      await client.download(url, dest);
      if (existsSync(dest)) {
        w._imageDownloaded = true;
      }
    }
  }
}

async function main() {
  console.log('VC-7: fetching armor and materials…');

  // 1. Load creatures and overrides
  const creatures = JSON.parse(readFileSync(path.join(DATA_DIR, 'creatures.json'), 'utf8'));
  const creaturesBySlug = new Map(creatures.map((c) => [c.id, c]));
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

  const report = {
    biomeBreakdown: {}, // biomeId -> { sets: 0, pieces: 0 }
    estimatedArmor: [], // [{ piece, set, levels }]
    materialsWithoutSourceOrBiome: [], // [{ name, reason }]
    skippedPages: [], // [{ title, reason }]
    openQuestions: [],
  };

  // 2. Category:Armor walk (depth 2)
  console.log('fetching Category:Armor recursively…');
  const visitedCategories = new Set();
  const armorPageTitles = new Set();

  async function walkCategory(catTitle, depth = 0) {
    const cat = catTitle.startsWith('Category:') ? catTitle : `Category:${catTitle}`;
    if (visitedCategories.has(cat)) return;
    visitedCategories.add(cat);

    const pages = await getCategoryMembers(cat, 'page');
    for (const p of pages) armorPageTitles.add(p);

    if (depth < 2) {
      const subcats = await getCategoryMembers(cat, 'subcat');
      for (const sc of subcats) {
        await walkCategory(sc, depth + 1);
      }
    }
  }

  await walkCategory('Category:Armor', 0);

  // Filter out skipped pages: Armor (rozcestník) and CAPE TEST
  const filteredTitles = [...armorPageTitles].filter((t) => {
    if (t === 'Armor') {
      report.skippedPages.push({ title: t, reason: 'rozcestník (disambiguation page)' });
      return false;
    }
    if (t === 'CAPE TEST') {
      report.skippedPages.push({ title: t, reason: 'testovací stránka (CAPE TEST)' });
      return false;
    }
    return true;
  }).sort(byCodepoint);

  console.log(`found ${filteredTitles.length} armor pages to inspect…`);

  // 3. Fetch wikitext of all armor pages
  const armorPages = await api.getWikitext(filteredTitles);

  // Pre-pass: identify multi-piece sets and their pieces to prevent duplicating single pieces
  // e.g. Troll Hide Cape appears in Troll Set AND on standalone page Troll Hide Cape
  const multiPieceSetPieceNames = new Set();
  const multiPieceSetPieceSlugs = new Set();

  for (const [title, page] of Object.entries(armorPages)) {
    const wt = page?.wikitext ?? '';
    const boxes = parseAllInfoboxes(wt, 'armor');
    if (boxes.length > 1) {
      for (const b of boxes) {
        const pieceTitle = resolvePieceName(b.title, title);
        multiPieceSetPieceNames.add(pieceTitle.toLowerCase());
        multiPieceSetPieceSlugs.add(slug(pieceTitle));
      }
    }
  }

  // 4. Build armor entries
  const parsedArmor = [];
  const referencedMaterials = new Set();

  for (const title of filteredTitles) {
    const page = armorPages[title];
    const wt = page?.wikitext ?? '';
    const boxes = parseAllInfoboxes(wt, 'armor');

    if (boxes.length === 0) {
      report.skippedPages.push({ title, reason: 'stránka bez {{infobox armor}}' });
      continue;
    }

    const firstBox = boxes[0];
    // NPC merchandise (Hildir / Haldor) has no crafting materials on purpose;
    // anything else without them (Crown of Roots) cannot be crafted at all.
    const noCraftMaterials = !firstBox['materials 1'] || firstBox['materials 1'].trim() === '';
    const npcSource = Boolean(firstBox.source && /hildir|haldor|npc/i.test(firstBox.source));
    const isCosmetic = noCraftMaterials && npcSource;
    const isNotCraftable = noCraftMaterials && !npcSource;

    // Deduplication rule:
    // "Stejný díl uvedený na stránce setu i na samostatné stránce (Troll Hide Cape) se v single neduplikuje, zůstane jen v setu."
    if (boxes.length === 1) {
      const singlePieceName = resolvePieceName(firstBox.title, title);
      const singlePieceSlug = slug(singlePieceName);
      const pageTitleSlug = slug(title);
      if (
        multiPieceSetPieceNames.has(singlePieceName.toLowerCase()) ||
        multiPieceSetPieceSlugs.has(singlePieceSlug) ||
        multiPieceSetPieceNames.has(title.toLowerCase()) ||
        multiPieceSetPieceSlugs.has(pageTitleSlug)
      ) {
        console.log(`skipping single duplicate piece already in set: ${title}`);
        report.skippedPages.push({ title, reason: 'duplikát dílu již obsaženého v setu' });
        continue;
      }
    }

    const qTables = parseQualityTables(wt);
    const description = extractDescription(wt);

    const seasonBox = boxes.find((b) => b.season && b.season.trim());
    const seasonTag = seasonBox ? cleanText(seasonBox.season).trim() : null;
    const isDlc =
      title !== 'Crown of Valheim' &&
      (boxes.some((b) => b.description && /\(DLC item\)/i.test(b.description)) ||
        /\(DLC item\)/i.test(wt) ||
        /\(DLC item\)/i.test(description));
    const isSpecial =
      title !== 'Crown of Valheim' && (Boolean(seasonTag) || isDlc || isNotCraftable);
    const specialTag =
      seasonTag || (isDlc ? 'DLC' : null) || (isNotCraftable ? 'Not craftable' : null);

    let kind = 'single';
    if (isSpecial) {
      kind = 'special';
    } else if (isCosmetic) {
      kind = 'cosmetic';
    } else if (boxes.length > 1 || boxes.some((b) => b['set pieces'] && b['set pieces'].trim() !== '')) {
      kind = 'set';
    }

    const pieces = [];

    for (const b of boxes) {
      const pieceName = resolvePieceName(b.title, title);
      if (!pieceName) {
        throw new Error(`Piece on page "${title}" has empty name`);
      }
      const pieceId = slug(pieceName);
      const slot = parseSlot(b.type);
      const gameId = b.id ? cleanText(b.id).trim() : null;
      const weight = b.weight ? parseFloat(b.weight) : 0;
      const movementSpeed = parseMovementSpeed(b['movement speed']);
      const resistances = parseResistances(b.resistance || b.resistances);
      const station = b.source ? cleanText(b.source).split(',')[0].split('<br>')[0].trim() : null;

      // Extract image file name for download
      let imageFile = null;
      if (b.image) {
        imageFile = cleanText(b.image).trim();
      }

      // Build levels. Quality 1 always exists (with no materials when the
      // piece is not craftable); a level beyond quality 1 exists only when the
      // infobox lists upgrade materials for it — empty `materials 2..4` fields
      // (Crown of Valheim, Crown of Roots) are not upgrades.
      const levels = [];
      let maxQ = 1;
      while (parseMaterialList(b[`materials ${maxQ + 1}`]).length > 0) maxQ += 1;

      const baseArmor = b.armor ? parseFloat(b.armor) : 0;
      const baseDurability = b.durability ? parseInt(b.durability, 10) : null;
      const baseCraftingLevel = b['crafting level'] ? parseInt(b['crafting level'], 10) : 1;

      let usedEstimate = false;

      for (let q = 1; q <= maxQ; q++) {
        const matRaw = b[`materials ${q}`] ?? (q === 1 ? b.materials : null);
        const matsParsed = parseMaterialList(matRaw);
        const materials = matsParsed.map((m) => {
          referencedMaterials.add(m.name);
          const itemObj = { item: slug(m.name), rawName: m.name, amount: m.amount };
          if (m.fuel) itemObj.fuel = true;
          return itemObj;
        });

        if (q === 1) {
          levels.push({
            quality: 1,
            armor: baseArmor,
            durability: baseDurability,
            stationLevel: baseCraftingLevel,
            materials,
          });
        } else {
          const qMap = qTables.get(q) ?? qTables[q];
          const tData = qMap?.get(pieceName) ?? qMap?.get(b.title) ?? qMap?.get(cleanText(b.title));

          let armorVal;
          let durabilityVal;
          let stationLevelVal;

          if (tData && tData.armor != null) {
            armorVal = tData.armor;
            durabilityVal = tData.durability ?? (baseDurability != null ? baseDurability + 200 * (q - 1) : null);
            stationLevelVal = tData.stationLevel ?? (baseCraftingLevel + (q - 1));
          } else {
            armorVal = baseArmor + 2 * (q - 1);
            durabilityVal = (tData?.durability) ?? (baseDurability != null ? baseDurability + 200 * (q - 1) : null);
            stationLevelVal = (tData?.stationLevel) ?? (baseCraftingLevel + (q - 1));
            usedEstimate = true;
          }

          levels.push({
            quality: q,
            armor: armorVal,
            durability: durabilityVal,
            stationLevel: stationLevelVal,
            materials,
          });
        }
      }

      let armorSource = 'table';
      if (levels.length <= 1) {
        armorSource = 'infobox';
      } else if (usedEstimate) {
        let renderedData = null;
        for (const pageName of [pieceName, b.title, title]) {
          if (!pageName) continue;
          const html = await api.getRenderedText(pageName);
          if (!html) continue;
          const stripped = html.replace(/<[^>]+>/g, ' | ').replace(/\s+/g, ' ');
          const armMatches = [...stripped.matchAll(/Armor\s*\|\s*\|\s*(\d+(?:\.\d+)?)/gi)].map((m) => parseFloat(m[1]));
          const durMatches = [...stripped.matchAll(/Durability\s*\|\s*\|\s*(\d+)/gi)].map((m) => parseInt(m[1], 10));
          if (armMatches.length >= levels.length && durMatches.length >= levels.length) {
            renderedData = {
              armors: armMatches.slice(0, levels.length),
              durs: durMatches.slice(0, levels.length),
            };
            break;
          }
        }

        if (renderedData) {
          for (let i = 0; i < levels.length; i++) {
            levels[i].armor = renderedData.armors[i];
            levels[i].durability = renderedData.durs[i];
          }
          armorSource = 'rendered';
          usedEstimate = false;
        } else {
          // Unreachable for pieces whose every upgrade level carries materials
          // by the maxQ rule above; kept as a reported fallback for a wiki page
          // that documents upgrade materials but no quality table.
          armorSource = 'estimate';
          report.estimatedArmor.push({
            piece: pieceName,
            set: title,
            levels: levels.length,
            reason: 'quality table missing for upgrade levels with materials',
          });
        }
      } else {
        armorSource = 'table';
      }

      pieces.push({
        id: pieceId,
        name: pieceName,
        slot,
        gameId,
        image: `img/armor/${pieceId}.png`,
        station,
        levels,
        armorSource,
        weight,
        movementSpeed,
        resistances,
        description,
        ...(isSpecial ? { kind: 'special', tag: specialTag } : {}),
        _imageFile: imageFile,
      });
    }

    // Set bonus from any box with set effect
    const boxWithBonus = boxes.find((b) => b['set effect'] || b['set pieces']) ?? firstBox;
    const setBonus = parseSetBonus(boxWithBonus, pieces.length);

    parsedArmor.push({
      id: slug(title),
      name: title,
      wiki: wikiPageUrl(title),
      kind,
      ...(isSpecial ? { tag: specialTag } : {}),
      biome: null, // filled after material resolution
      tier: null,  // filled after material resolution
      setBonus,
      pieces,
    });
  }

  // 5. Fetch material pages and sub-materials recursively (depth <= 3)
  console.log(`resolving materials (direct: ${referencedMaterials.size})…`);
  const allMaterialPages = {};
  const materialsToFetch = new Set(referencedMaterials);
  const visitedMaterials = new Set();

  for (let depth = 0; depth < 3; depth++) {
    const unvisited = [...materialsToFetch].filter((m) => !visitedMaterials.has(m));
    if (unvisited.length === 0) break;
    for (const m of unvisited) visitedMaterials.add(m);

    console.log(`fetching material pages (depth ${depth}): ${unvisited.length} titles…`);
    const fetched = await api.getWikitext(unvisited);
    Object.assign(allMaterialPages, fetched);

    const disambigPairs = [];
    for (const pageTitle of unvisited) {
      const page = allMaterialPages[pageTitle];
      if (!page?.wikitext) continue;
      const targetTitle = resolveDisambiguationTitle(page.wikitext, pageTitle);
      if (targetTitle) {
        disambigPairs.push({ original: pageTitle, target: targetTitle });
      }
    }
    if (disambigPairs.length > 0) {
      const fetchedDisambigs = await api.getWikitext(disambigPairs.map((d) => d.target));
      for (const d of disambigPairs) {
        if (fetchedDisambigs[d.target]?.wikitext) {
          allMaterialPages[d.target] = fetchedDisambigs[d.target];
          allMaterialPages[d.original] = {
            ...fetchedDisambigs[d.target],
            disambiguatedFrom: d.original,
            disambiguatedTo: d.target,
            wiki: wikiPageUrl(d.target),
          };
        }
      }
    }

    for (const pageTitle of unvisited) {
      const page = allMaterialPages[pageTitle];
      if (!page?.wikitext) continue;
      const wt = page.wikitext;
      const ib =
        parseInfobox(wt, 'item') ||
        parseInfobox(wt, 'material') ||
        parseInfobox(wt, 'structure') ||
        parseInfobox(wt, 'weapon');
      const matStr = ib?.['materials 1'] ?? ib?.materials;
      if (matStr) {
        const subMats = parseMaterialList(matStr);
        for (const sm of subMats) {
          if (!visitedMaterials.has(sm.name)) {
            materialsToFetch.add(sm.name);
          }
        }
      } else {
        const conv = parseConversionRecipe(wt, pageTitle, []);
        if (conv) {
          for (const sm of conv.materials) {
            if (!visitedMaterials.has(sm.name)) {
              materialsToFetch.add(sm.name);
            }
          }
        }
      }
    }
  }

  // Canonicalize materials using wiki redirects from getWikitext
  const armorSetTitles = new Set(parsedArmor.map((a) => a.name));
  const canonicalNameByRaw = new Map();
  for (const [rawName, page] of Object.entries(allMaterialPages)) {
    const target = page?.disambiguatedFrom ? rawName : (page?.title ?? rawName);
    if (target.toLowerCase() === 'trophies' && rawName.toLowerCase() !== 'trophies') {
      canonicalNameByRaw.set(rawName, rawName);
    } else if (armorSetTitles.has(target) && !armorSetTitles.has(rawName)) {
      canonicalNameByRaw.set(rawName, rawName);
    } else {
      canonicalNameByRaw.set(rawName, target);
    }
  }

  // Update piece materials with canonical slugs
  for (const a of parsedArmor) {
    for (const p of a.pieces) {
      for (const lvl of p.levels) {
        for (const mat of lvl.materials) {
          const canonical = canonicalNameByRaw.get(mat.rawName) ?? mat.rawName;
          mat.item = slug(canonical);
          delete mat.rawName;
        }
      }
    }
  }

  // Validate that all pieces have non-empty name and id
  for (const entry of parsedArmor) {
    for (const piece of entry.pieces) {
      if (!piece.name || piece.name.trim() === '') {
        throw new Error(`Armor entry "${entry.name}" has a piece with empty name`);
      }
      if (!piece.id || piece.id.trim() === '') {
        throw new Error(`Armor entry "${entry.name}" piece "${piece.name}" has empty id`);
      }
    }
  }

  // 6. Resolve tier and biome using shared materials logic
  const resolveMaterial = createMaterialResolver({
    overrides,
    creatures,
    creatureByName,
    allPages: allMaterialPages,
    parseRecipe: parseMaterialList,
  });

  // Build items array for canonical materials
  const canonicalMaterials = new Set();
  for (const m of materialsToFetch) {
    const canonical = canonicalNameByRaw.get(m) ?? m;
    canonicalMaterials.add(canonical);
  }

  const allItems = [];
  for (const matName of canonicalMaterials) {
    const page =
      allMaterialPages[matName] ??
      Object.values(allMaterialPages).find((p) => p?.title === matName);
    const wt = page?.wikitext ?? '';
    const ib =
      parseInfobox(wt, 'item') ||
      parseInfobox(wt, 'material') ||
      parseInfobox(wt, 'structure') ||
      parseInfobox(wt, 'weapon') ||
      {};

    const res = resolveMaterial(matName);
    const id = slug(matName);
    const sources = parseSources(ib.source, creaturesBySlug);

    // Fallback for trophies without sources
    if (sources.length === 0) {
      const trophySrc = parseTrophySource(matName, creatures, creatureByName, creaturesBySlug);
      if (trophySrc) sources.push(trophySrc);
    }

    let recipe = null;
    const matStr = ib['materials 1'] ?? ib.materials;
    if (matStr) {
      const recipeMats = parseMaterialList(matStr);
      if (recipeMats.length > 0) {
        const firstStation = sources.find((s) => s.kind === 'station')?.text ?? 'Workbench';
        recipe = {
          station: firstStation,
          materials: recipeMats.map((m) => {
            const canonical = canonicalNameByRaw.get(m.name) ?? m.name;
            return { item: slug(canonical), amount: m.amount };
          }),
          yields: 1,
        };
      }
    } else {
      const conv = parseConversionRecipe(wt, matName, sources);
      if (conv) {
        recipe = {
          station: conv.station,
          materials: conv.materials.map((m) => {
            const canonical = canonicalNameByRaw.get(m.name) ?? m.name;
            return { item: slug(canonical), amount: m.amount };
          }),
          yields: conv.yields,
        };
      }
    }

    let imageFile = null;
    if (ib.image) imageFile = cleanText(ib.image).trim();

    allItems.push({
      id,
      name: matName,
      image: `img/items/${id}.png`,
      biome: res.biome,
      tier: res.tier,
      sources,
      recipe,
      wiki: page?.wiki ?? wikiPageUrl(matName),
      _imageFile: imageFile,
    });
  }

  // 7b. Resolve biome & tier for items with biome: null based on recipe
  resolveRecipeBiomes(allItems);

  // Populate report for materials without source or biome
  for (const it of allItems) {
    if (it.sources.length === 0 || it.biome == null) {
      report.materialsWithoutSourceOrBiome.push({
        name: it.name,
        sourcesCount: it.sources.length,
        biome: it.biome,
      });
    }
  }
  report.materialsWithoutSourceOrBiome.sort((a, b) => byCodepoint(a.name, b.name));

  // Sort items deterministically by name
  allItems.sort((a, b) => byCodepoint(a.name, b.name));

  // 7. Compute tier and biome for armor entries
  const itemsById = new Map(allItems.map((i) => [i.id, i]));

  for (const a of parsedArmor) {
    if (a.kind === 'cosmetic' || a.kind === 'special') {
      a.tier = null;
      a.biome = null;
      continue;
    }

    let maxTier = -1;
    let maxBiome = null;

    for (const piece of a.pieces) {
      const q1Materials = piece.levels[0]?.materials ?? [];
      for (const m of q1Materials) {
        const itemObj = itemsById.get(m.item);
        if (itemObj && itemObj.tier != null && itemObj.tier > maxTier) {
          maxTier = itemObj.tier;
          maxBiome = itemObj.biome;
        }
      }
    }

    a.tier = maxTier > 0 ? maxTier : null;
    a.biome = maxBiome;

    // Report biome stats
    const bKey = a.biome ?? 'unresolved';
    if (!report.biomeBreakdown[bKey]) {
      report.biomeBreakdown[bKey] = { sets: 0, pieces: 0 };
    }
    report.biomeBreakdown[bKey].sets += 1;
    report.biomeBreakdown[bKey].pieces += a.pieces.length;
  }

  // Sort armor deterministically by name
  parsedArmor.sort((a, b) => byCodepoint(a.name, b.name));

  // 8. Download images
  mkdirSync(ARMOR_IMG_DIR, { recursive: true });
  mkdirSync(ITEMS_IMG_DIR, { recursive: true });

  // Mark already existing images
  for (const a of parsedArmor) {
    for (const p of a.pieces) {
      const dest = path.join(ARMOR_IMG_DIR, `${p.id}.png`);
      if (existsSync(dest)) p._imageDownloaded = true;
    }
  }
  for (const it of allItems) {
    const dest = path.join(ITEMS_IMG_DIR, `${it.id}.png`);
    if (existsSync(dest)) it._imageDownloaded = true;
  }

  const allPieces = parsedArmor.flatMap((a) => a.pieces);

  console.log('downloading armor piece images (128px)…');
  await resolveImageBatch(allPieces, (p) => p._imageFile, api, ARMOR_IMG_DIR, ARMOR_IMG_WIDTH);
  await resolveImageBatch(allPieces, (p) => `${p.name}.png`, api, ARMOR_IMG_DIR, ARMOR_IMG_WIDTH);
  await resolveImageBatch(allPieces, (p) => `${lowercaseExceptFirst(p.name)}.png`, api, ARMOR_IMG_DIR, ARMOR_IMG_WIDTH);

  const stillMissingArmor = allPieces.filter((p) => !p._imageDownloaded);
  if (stillMissingArmor.length > 0) {
    console.log(`fallback to fandom for ${stillMissingArmor.length} armor images…`);
    const fandomApi = new MwApi({ baseUrl: 'https://valheim.fandom.com/api.php' });
    await resolveImageBatch(stillMissingArmor, (p) => p._imageFile, fandomApi, ARMOR_IMG_DIR, ARMOR_IMG_WIDTH);
    await resolveImageBatch(stillMissingArmor, (p) => `${p.name}.png`, fandomApi, ARMOR_IMG_DIR, ARMOR_IMG_WIDTH);
    await resolveImageBatch(stillMissingArmor, (p) => `${lowercaseExceptFirst(p.name)}.png`, fandomApi, ARMOR_IMG_DIR, ARMOR_IMG_WIDTH);
  }

  console.log('downloading item images (64px)…');
  await resolveImageBatch(allItems, (i) => i._imageFile, api, ITEMS_IMG_DIR, ITEM_IMG_WIDTH);
  await resolveImageBatch(allItems, (i) => `${i.name}.png`, api, ITEMS_IMG_DIR, ITEM_IMG_WIDTH);
  await resolveImageBatch(allItems, (i) => `${lowercaseExceptFirst(i.name)}.png`, api, ITEMS_IMG_DIR, ITEM_IMG_WIDTH);

  const stillMissingItems = allItems.filter((i) => !i._imageDownloaded);
  if (stillMissingItems.length > 0) {
    console.log(`fallback to fandom for ${stillMissingItems.length} item images…`);
    const fandomApi = new MwApi({ baseUrl: 'https://valheim.fandom.com/api.php' });
    await resolveImageBatch(stillMissingItems, (i) => i._imageFile, fandomApi, ITEMS_IMG_DIR, ITEM_IMG_WIDTH);
    await resolveImageBatch(stillMissingItems, (i) => `${i.name}.png`, fandomApi, ITEMS_IMG_DIR, ITEM_IMG_WIDTH);
    await resolveImageBatch(stillMissingItems, (i) => `${lowercaseExceptFirst(i.name)}.png`, fandomApi, ITEMS_IMG_DIR, ITEM_IMG_WIDTH);
  }

  // Clean internal tracking fields before output
  for (const a of parsedArmor) {
    for (const p of a.pieces) {
      delete p._imageFile;
      delete p._imageDownloaded;
    }
  }
  for (const it of allItems) {
    delete it._imageFile;
    delete it._imageDownloaded;
  }

  // 9. Write outputs
  mkdirSync(DATA_DIR, { recursive: true });
  const writeIfChanged = (dest, content) => {
    if (existsSync(dest) && readFileSync(dest, 'utf8') === content) return;
    writeFileSync(dest, content);
  };
  writeIfChanged(path.join(DATA_DIR, 'armor.json'), `${JSON.stringify(parsedArmor, null, 2)}\n`);
  writeIfChanged(path.join(DATA_DIR, 'items.json'), `${JSON.stringify(allItems, null, 2)}\n`);

  // Write report
  const reportMd = renderReport(report, parsedArmor, allItems);
  writeIfChanged(path.join(DATA_DIR, 'report-armor.md'), reportMd);

  console.log(`done: ${parsedArmor.length} armor sets/pieces, ${allItems.length} items`);
}

function renderReport(report, armor, items) {
  const lines = [
    '# VC-7 Armourer Report',
    '',
    'Source: valheim.weirdgloop.org (MediaWiki API). No dates on purpose: the report must be byte-identical on re-runs from cache.',
    '',
    '## Summary',
    '',
    `- Total armor sets/entries: ${armor.length}`,
    `- Total armor pieces: ${armor.reduce((acc, a) => acc + a.pieces.length, 0)}`,
    `- Total items/materials: ${items.length}`,
    '',
    '## Biome breakdown',
    '',
    '| Biome | Sets/Entries | Pieces |',
    '|---|---|---|',
  ];

  for (const b of BIOMES) {
    const stats = report.biomeBreakdown[b.id] ?? { sets: 0, pieces: 0 };
    lines.push(`| ${b.id} | ${stats.sets} | ${stats.pieces} |`);
  }
  const unresolvedStats = report.biomeBreakdown['unresolved'] ?? { sets: 0, pieces: 0 };
  if (unresolvedStats.sets > 0) {
    lines.push(`| (cosmetic / unresolved) | ${unresolvedStats.sets} | ${unresolvedStats.pieces} |`);
  }

  lines.push('', '## Pieces with estimated armor (armorSource: estimate)', '');
  if (report.estimatedArmor.length === 0) {
    lines.push('None. All pieces with quality upgrades found in quality tables.');
  } else {
    for (const ea of report.estimatedArmor) {
      const reason = ea.reason ? `: ${ea.reason}` : '';
      lines.push(`- **${ea.piece}** (${ea.set}, ${ea.levels} levels)${reason}`);
    }
  }

  lines.push('', '## Materials without source or biome', '');
  if (report.materialsWithoutSourceOrBiome.length === 0) {
    lines.push('None.');
  } else {
    for (const m of report.materialsWithoutSourceOrBiome) {
      lines.push(`- **${m.name}** (sources: ${m.sourcesCount}, biome: ${m.biome ?? 'null'})`);
    }
  }

  lines.push('', '## Skipped pages', '');
  if (report.skippedPages.length === 0) {
    lines.push('None.');
  } else {
    for (const sp of report.skippedPages) {
      lines.push(`- **${sp.title}**: ${sp.reason}`);
    }
  }

  lines.push(
    '',
    '## Open questions',
    '',
    '- Cosmetic items from Hildir / Haldor have no crafting materials or levels (`levels: []`, `biome: null`, `tier: null`).',
    '- DLC and seasonal armor pieces (Cape of Oden, Hood of Oden, Pointy Hat, Midsummer Crown) have `kind: "special"` and `tag: "DLC"` / `"Halloween"` / `"Midsummer"`, and are shown in their own section.',
    '- Pieces like Troll Hide Cape, Deer Hide Cape, Wolf Fur Cape, Feather Cape exist both as standalone wiki pages and as set pieces. Standalone duplicates are omitted to preserve set integrity.',
    ''
  );

  return lines.join('\n');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    await main();
  } catch (err) {
    console.error('Fatal error in fetch-armor:', err);
    process.exit(1);
  }
}
