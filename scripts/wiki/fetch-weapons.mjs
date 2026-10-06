import { addLocalizedNames } from './api.mjs';
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
import { cleanText, parseImage, parseInfobox, parseLinks, parseMaterialList, parseTemplates, slug } from './wikitext.mjs';
import { BIOMES, tierOf } from './biomes.mjs';
import { BASE_MATERIAL_TABLE, createMaterialResolver } from './materials.mjs';

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

const tierByBiome = new Map(BIOMES.map((b) => [b.id, tierOf(b.id)]));

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
  if (t === 'fist' || t === 'fists' || t === 'unarmed') return 'fists';
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

function determineSkill(category, typeStr) {
  switch (category) {
    case 'sword':
      return 'swords';
    case 'axe':
    case 'battleaxe':
      return 'axes';
    case 'club':
    case 'sledge':
      return 'clubs';
    case 'spear':
      return 'spears';
    case 'polearm':
      return 'polearms';
    case 'knife':
      return 'knives';
    case 'fists':
      return 'fists';
    case 'pickaxe':
      return 'pickaxes';
    case 'bow':
    case 'arrow':
      return 'bows';
    case 'crossbow':
    case 'bolt':
      return 'crossbows';
    case 'magic':
      return (typeStr || '').toLowerCase().includes('blood') ? 'blood-magic' : 'elemental-magic';
    case 'shield':
      return 'blocking';
    case 'bomb':
      return null;
    default:
      return null;
  }
}

function parseBackstab(val) {
  if (val == null || val === '') return null;
  const match = String(val).match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const num = parseFloat(match[1]);
  return Number.isFinite(num) ? num : null;
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

  // 2. Fetch category member titles recursively
  const BASELINE_CATEGORIES = ['Category:Weapons', 'Category:Arrows', 'Category:Bolts', 'Category:Bombs', 'Category:Magic'];
  const visitedCategories = new Set();
  const pageCategories = new Map();

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

  async function walkCategory(catTitle, depth = 0) {
    const categoryName = catTitle.startsWith('Category:') ? catTitle : `Category:${catTitle}`;
    if (visitedCategories.has(categoryName)) return;
    visitedCategories.add(categoryName);

    console.log(`fetching members of ${categoryName} (depth ${depth})…`);
    const pages = await getCategoryMembers(categoryName, 'page');
    for (const pageTitle of pages) {
      if (!pageCategories.has(pageTitle)) {
        pageCategories.set(pageTitle, new Set());
      }
      pageCategories.get(pageTitle).add(categoryName);
    }

    if (depth < 2) {
      const subcats = await getCategoryMembers(categoryName, 'subcat');
      for (const subcat of subcats) {
        await walkCategory(subcat, depth + 1);
      }
    }
  }

  await walkCategory('Category:Weapons', 0);

  for (const baseCat of BASELINE_CATEGORIES) {
    if (!visitedCategories.has(baseCat)) {
      await walkCategory(baseCat, 1);
    }
  }

  const allTitles = [...pageCategories.keys()].sort(byCodepoint);
  console.log(`found ${allTitles.length} unique titles across all categories and subcategories`);

  // 3. Fetch wikitext for all pages
  const allPages = await api.getWikitext(allTitles);

  // 4. Parse weapons and apply exclusion rules
  const report = {
    addedInVC6: [],
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
    if (!category) {
      report.excluded.push({ title, reason: `excluded type (${ib.type ?? 'none'})` });
      continue;
    }

    // Exclude unfinished / console items
    if (wt.includes('{{Unfinished}}') || ib.source === 'Console' || ib.source === 'n/a') {
      report.excluded.push({ title, reason: 'unfinished/console item' });
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
    if (totalDmg === 0 && category !== 'shield') {
      report.excluded.push({ title, reason: 'zero direct damage' });
      continue;
    }

    // Max quality: count of "materials N"
    let maxQuality = 1;
    if (['arrow', 'bolt', 'bomb'].includes(category)) {
      maxQuality = 1;
    } else {
      let q = 1;
      while (ib[`materials ${q}`] != null) q += 1;
      maxQuality = Math.max(1, q - 1);
    }

    // Station level and upgrade row
    const upgradeRowMatch = wt.match(/\{\{Upgrade station row\|[^|}]*\|[^|}]*(?:\|start=(\d+))?/i);
    const startFromRow = upgradeRowMatch && upgradeRowMatch[1] ? parseInt(upgradeRowMatch[1], 10) : null;
    const baseCraftingLevel = startFromRow ?? (ib['crafting level'] ? parseInt(ib['crafting level'], 10) || 1 : 1);
    const resolvedStationLevel = Number.isFinite(baseCraftingLevel) ? baseCraftingLevel : 1;

    // Parse levels
    const levels = [];
    for (let q = 1; q <= maxQuality; q++) {
      const matRaw = ib[`materials ${q}`] ?? (q === 1 ? ib.materials : null);
      const matsParsed = parseMaterialList(matRaw);
      const levelMaterials = matsParsed.map((m) => {
        referencedMaterials.add(m.name);
        const obj = {
          item: slug(m.name),
          name: m.name,
          amount: m.amount,
        };
        if (m.fuel) obj.fuel = true;
        return obj;
      });
      levels.push({
        quality: q,
        stationLevel: resolvedStationLevel + (q - 1),
        materials: levelMaterials,
      });
    }

    // Level 1 materials for backward compatibility
    const materials = levels[0]?.materials.map((m) => {
      const res = { name: m.name, amount: m.amount };
      if (m.fuel) res.fuel = true;
      return res;
    }) ?? [];

    if (category === 'shield' && materials.length === 0) {
      report.excluded.push({ title, reason: 'no craftable materials' });
      continue;
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

    let recommendable = category !== 'shield';
    let note = null;

    if (category === 'shield') {
      recommendable = false;
    } else if (category === 'bomb') {
      const renderedHtml = await api.getRenderedText(title);
      let foundExtraDamage = false;
      if (renderedHtml) {
        for (const dt of DAMAGE_TYPES) {
          if (damage[dt] != null) continue;
          const rowPattern = new RegExp(
            `class="infobox-row-label"[^>]*>\\s*(?:<[^>]+>)?\\s*${dt}\\s*(?:<[^>]+>)?\\s*<\\/div>\\s*<div[^>]*class="infobox-row-value"[^>]*>\\s*(\\d+(?:\\.\\d+)?)`,
            'i'
          );
          const rowMatch = renderedHtml.match(rowPattern);
          if (rowMatch) {
            const val = parseFloat(rowMatch[1]);
            if (!Number.isNaN(val) && val > 0) {
              damage[dt] = val;
              foundExtraDamage = true;
            }
          }
          const tablePattern = new RegExp(
            `<t[dh][^>]*>\\s*${dt}\\s*<\\/t[dh]>\\s*<td[^>]*>\\s*(\\d+(?:\\.\\d+)?)\\s*<\\/td>`,
            'i'
          );
          const tableMatch = renderedHtml.match(tablePattern);
          if (tableMatch) {
            const val = parseFloat(tableMatch[1]);
            if (!Number.isNaN(val) && val > 0) {
              damage[dt] = val;
              foundExtraDamage = true;
            }
          }
        }
      }

      if (foundExtraDamage) {
        totalDmg = Object.values(damage).reduce((sum, v) => sum + v, 0);
        for (const [dt, baseVal] of Object.entries(damage)) {
          const step = perLevel[dt] ?? 0;
          damageMax[dt] = baseVal + step * (maxQuality - 1);
        }
      } else if (totalDmg < 20) {
        recommendable = false;
        note = 'Area/DoT damage not listed on the wiki';
      }
    }

    const weaponEntry = {
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
      stationLevel: resolvedStationLevel,
      maxQuality,
      levels,
      materials,
      damage,
      perLevel,
      damageMax,
      stamina: ib.stamina ? parseInt(ib.stamina, 10) || null : null,
      knockback: ib.knockback ? parseInt(ib.knockback, 10) || null : null,
      skill: determineSkill(category, ib.type),
      backstab: parseBackstab(ib.backstab),
      quantity: ib.quantity ? parseInt(ib.quantity, 10) || null : null,
      tier: null,
      biome: null,
      description: cleanText(ib.description || ''),
    };
    if (ib.weight) weaponEntry.weight = parseFloat(ib.weight) || null;
    if (ib['block armor']) weaponEntry.blockArmor = parseFloat(ib['block armor']) || null;
    if (ib['block force']) weaponEntry.blockForce = parseFloat(ib['block force']) || null;
    if (ib['parry bonus']) weaponEntry.parryBonus = parseFloat(ib['parry bonus']) || null;
    if (ib['movement speed']) weaponEntry.movementSpeed = cleanText(ib['movement speed']);
    if (recommendable === false) {
      weaponEntry.recommendable = false;
      weaponEntry.note = note;
    }
    parsedWeapons.push(weaponEntry);

    const catsForTitle = [...(pageCategories.get(title) ?? [])].sort(byCodepoint);
    const isBaseline = catsForTitle.some((c) => BASELINE_CATEGORIES.includes(c));
    if (!isBaseline) {
      report.addedInVC6.push({
        name: cleanText(title),
        categories: catsForTitle,
      });
    }
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
  const resolveMaterial = createMaterialResolver({
    overrides,
    creatureByName,
    tierByBiome,
    allPages,
    parseRecipe,
  });

  const allResolvedMaterials = matList.map((m) => resolveMaterial(m));
  const materialsByName = new Map(allResolvedMaterials.map((m) => [m.name, m]));

  for (const m of allResolvedMaterials) {
    if (m.tier == null) report.unresolvedMaterials.push(m.name);
  }

  // 7. Compute tiers for all kept weapons
  for (const w of parsedWeapons) {
    if (w.name.toLowerCase() === 'bare fists') {
      w.tier = tierOf('meadows');
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

  await addLocalizedNames([...parsedWeapons, ...allResolvedMaterials]);

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

  lines.push('## Added in VC-6', '');
  if (!report.addedInVC6 || report.addedInVC6.length === 0) {
    lines.push('(none)', '');
  } else {
    for (const item of [...report.addedInVC6].sort((a, b) => byCodepoint(a.name, b.name))) {
      lines.push(`- **${item.name}**: ${item.categories.join(', ')}`);
    }
    lines.push('');
  }

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
