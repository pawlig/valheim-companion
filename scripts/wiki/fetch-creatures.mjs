import { addLocalizedNames } from './api.mjs';
// Fetches biomes and creatures from valheim.weirdgloop.org (MediaWiki API) and
// builds data/biomes.json, data/creatures.json, data/report.md plus images in
// img/creatures/ and img/biomes/.
//
// Every API response goes through the on-disk cache (api.mjs), so a re-run with
// a warm cache makes no network calls and rewrites identical files. `--refresh`
// bypasses the cache. data/overrides.json (if present) is applied last.

import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { MwApi, api } from './api.mjs';
import { enrichCreatures } from './creature-extras.mjs';
import {
  cleanText,
  findTemplateRange,
  listedStarLevels,
  parseAttacks,
  parseHealth,
  parseHealthByBiome,
  parseImage,
  parseInfobox,
  parseLinks,
  parseList,
  parseModifiers,
  parseTemplates,
  parseWeakPoints,
  slug,
} from './wikitext.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DATA_DIR = path.join(REPO_ROOT, 'data');
const WIKI_URL = 'https://valheim.weirdgloop.org';
const FANDOM_API = 'https://valheim.fandom.com/api.php';
const DESCRIPTION_MAX = 400;
const CREATURE_IMG_WIDTH = 320;
const TROPHY_IMG_WIDTH = 128;
const BIOME_IMG_WIDTH = 960;

import { BIOMES } from './biomes.mjs';

const SECTIONS = ['boss', 'miniboss', 'hostile', 'passive', 'fish'];
const biomeByTitle = new Map(BIOMES.map((biome) => [biome.title, biome]));
const biomeById = new Map(BIOMES.map((biome) => [biome.id, biome]));
const biomeIdByTitle = new Map(BIOMES.map((biome) => [biome.title, biome.id]));

const wikiPageUrl = (title) => `${WIKI_URL}/w/${encodeURIComponent(title.replace(/ /g, '_'))}`;
const creatureImage = (id, star) => `img/creatures/${id}-${star}.png`;
const trophyImage = (id) => `img/creatures/${id}-trophy.png`;
const biomeImage = (id) => `img/biomes/${id}.png`;
const abs = (relative) => path.join(REPO_ROOT, 'apps', 'bestiary', relative);
const byCodepoint = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

// First prose paragraph after the infobox: headings, tables, lists and
// indentation are skipped; markup is cleaned; length is capped.
function extractDescription(wikitext) {
  const range = findTemplateRange(wikitext, 'infobox creature');
  const body = range ? wikitext.slice(range.end) : String(wikitext ?? '');
  for (const paragraph of body.split(/\n\s*\n/)) {
    const prose = paragraph
      .split('\n')
      .filter((line) => !/^\s*(=|\{|\||!|\*|#|:|<|-{4,})/.test(line))
      .join(' ');
    const text = cleanText(prose).trim();
    if (text.length >= 40) {
      const capped = text.slice(0, DESCRIPTION_MAX);
      return capped.replace(/\s+\S*$/, '');
    }
  }
  return null;
}

// `{{spawn row|type=…|limit=…|frequency=…}}` rows -> "<type> (limit N)".
function parseSpawns(wikitext) {
  return parseTemplates(wikitext, 'spawn row')
    .map((row) => {
      const type = cleanText(row.type ?? row['1'] ?? '').trim();
      if (!type) return null;
      const limit = cleanText(row.limit ?? row['2'] ?? '').trim();
      return limit ? `${type} (limit ${limit})` : type;
    })
    .filter(Boolean);
}

function yesNo(value) {
  return /^\s*(yes|true)\b/i.test(String(value ?? ''));
}

function main() {
  return mainInner().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

// Drops field -> one clean name per drop. A line holding several links separated by
// commas ("[[Ectoplasm]], [[Ghost Trophy]]") is split into separate drops; "None" is no drop.
export function parseDrops(raw) {
  if (!raw) return [];
  const lines = String(raw).replace(/<br\s*\/?>/gi, '\n').split('\n');
  const drops = [];
  for (const line of lines) {
    for (const part of line.split(/,\s*(?=\[\[)/)) {
      for (const name of parseList(part)) {
        if (!/^none$/i.test(name)) drops.push(name);
      }
    }
  }
  return drops;
}

async function mainInner() {
  const report = {
    noInfobox: [],
    noBiome: [],
    unknownModifiers: [],
    noImage: [],
    emptyDamage: [],
    fandomFallbacks: [],
    orphanImages: [],
    openQuestions: [],
  };

  // 1. Biome pages ----------------------------------------------------------
  console.log('fetching biome pages…');
  const cachedBiomeTitles = ['Meadows', 'Black Forest', 'Swamp', 'Ocean', 'Mountain', 'Plains', 'Mistlands', 'Ashlands', 'Deep North'];
  const biomePages = await api.getWikitext(cachedBiomeTitles);

  // 2. Categories -----------------------------------------------------------
  const categories = {};
  for (const name of ['Creatures', 'Bosses', 'Minibosses', 'Passive creatures', 'Fish']) {
    console.log(`fetching Category:${name}…`);
    categories[name] = await api.getCategory(name);
  }
  const inCategory = (name, title) => categories[name].includes(title);
  // Section for a creature that no biome infobox lists (by its categories).
  const kindFromCategories = (title) => {
    if (inCategory('Fish', title)) return 'fish';
    if (inCategory('Passive creatures', title)) return 'passive';
    if (inCategory('Minibosses', title)) return 'miniboss';
    if (inCategory('Bosses', title)) return 'boss';
    return 'hostile';
  };

  // 3. Biome membership from {{infobox biome}} (source of truth) ------------
  const membership = new Map(); // page title -> [{ biomeId, section }] (biome order)
  const sectionByKey = new Map(); // `${biomeId}:${creatureId}` -> section
  const biomeImageFiles = new Map(); // biome id -> file name
  for (const biome of BIOMES) {
    const page = biomePages[biome.title];
    const info = page?.wikitext ? parseInfobox(page.wikitext, 'biome') : null;
    if (!info) {
      report.openQuestions.push(`Biome page "${biome.title}" has no {{infobox biome}}.`);
      continue;
    }
    const file = parseImage(info.image);
    if (file) biomeImageFiles.set(biome.id, file);
    else report.openQuestions.push(`Biome "${biome.title}" has no image.`);

    const assign = (field, base) => {
      for (const target of parseLinks(info[field] ?? '')) {
        let section = base;
        if (base === 'boss' && inCategory('Minibosses', target)) section = 'miniboss';
        if (inCategory('Fish', target) && base !== 'boss') section = 'fish';
        const list = membership.get(target) ?? [];
        if (!list.some((entry) => entry.biomeId === biome.id)) list.push({ biomeId: biome.id, section });
        membership.set(target, list);
      }
    };
    assign('boss', 'boss');
    assign('hostile', 'hostile');
    assign('passive', 'passive');
  }

  // 4. Creature pages -------------------------------------------------------
  // Spec: biome links ∪ Category:Creatures. The other fetched categories add
  // a few real creatures no biome lists (Chicken, Hen, Riktig Fuling, Hive),
  // which the ≥110-creatures acceptance needs — noted in Open questions.
  const titles = [...new Set([...membership.keys(), ...Object.values(categories).flat()])]
    .sort(byCodepoint);
  console.log(`fetching ${titles.length} creature pages…`);
  const pages = await api.getWikitext(titles);

  // Membership is keyed by the link as written in the biome infobox; resolve
  // those keys through redirects to the actual page titles.
  const membershipByPage = new Map(); // resolved page title -> [{ biomeId, section }]
  for (const [key, entries] of membership) {
    const resolved = pages[key]?.title ?? key;
    const list = membershipByPage.get(resolved) ?? [];
    membershipByPage.set(resolved, [...list, ...entries]);
  }

  const built = []; // { record, starDefs, starFiles, trophyFile }
  const seenIds = new Set();
  for (const title of titles) {
    const page = pages[title] ?? {};
    if (!page.wikitext) {
      report.noInfobox.push(`${title} (missing page)`);
      continue;
    }
    const name = page.title;
    // Fish pages use {{infobox item}}; fall back to it for Category:Fish.
    const creatureInfo = parseInfobox(page.wikitext, 'creature');
    const isFish = inCategory('Fish', title) || inCategory('Fish', name);
    const info = creatureInfo ?? (isFish ? parseInfobox(page.wikitext, 'item') : null);
    if (!info) {
      report.noInfobox.push(`${title} (no {{infobox creature}})`);
      continue;
    }
    const id = slug(name);
    if (seenIds.has(id)) {
      console.log(`  redirect duplicate: ${title} -> ${name}, skipped`);
      continue;
    }
    seenIds.add(id);

    // Biomes: infobox membership, else the first location link that is a biome
    // (or a location written as plain biome name, e.g. Seeker Brood).
    let assignments = membershipByPage.get(name) ?? [];
    let locationAssigned = false;
    if (assignments.length === 0) {
      const link = parseLinks(info.location ?? '').find((target) => biomeByTitle.has(target));
      const plain = biomeByTitle.get(cleanText(info.location ?? '').trim());
      const biome = biomeByTitle.get(link ?? '') ?? plain;
      if (biome) {
        assignments = [{ biomeId: biome.id, section: kindFromCategories(name) }];
        locationAssigned = true;
      }
    }
    const biomeIds = [...new Set(assignments.map((entry) => entry.biomeId))].sort(
      (a, b) => biomeById.get(a).order - biomeById.get(b).order,
    );
    const kind = assignments.length ? assignments[0].section : kindFromCategories(name);
    for (const entry of assignments) sectionByKey.set(`${entry.biomeId}:${id}`, entry.section);
    if (locationAssigned) console.log(`  location-assigned: ${name} -> ${biomeIds.join(', ')}`);

    // Star levels the infobox actually lists (Bat/Ulv/Hexen stop at 1★,
    // Lord Reto only has 2★). Pages without star stats (fish use
    // {{infobox item}}) keep a degenerate 0★ level so their image survives.
    const plainImageFile = parseImage(info.image);
    let starDefs = listedStarLevels(info);
    if (starDefs.length === 0 && (plainImageFile || parseImage(info['image 0star']))) starDefs = [0];
    const hasStars = starDefs.length > 1;
    const { modifiers, otherImmunities, unknown } = parseModifiers(info);
    for (const item of unknown) report.unknownModifiers.push(`${name}: ${item.field} = ${item.value}`);

    // Image per level; a level without its own image falls back to the
    // nearest lower level, else the first available (DATA-SCHEMA). Fish pages
    // only carry a plain `image` field.
    const imageFiles = new Map(); // star level -> file, for levels the infobox names
    for (const star of [0, 1, 2]) {
      const file = parseImage(info[`image ${star}star`]);
      if (file) imageFiles.set(star, file);
    }
    const firstAvailableImage = imageFiles.size
      ? imageFiles.get([...imageFiles.keys()].sort((a, b) => a - b)[0])
      : plainImageFile;
    const imageForLevel = (star) => {
      for (let level = star; level >= 0; level -= 1) if (imageFiles.has(level)) return imageFiles.get(level);
      return firstAvailableImage;
    };
    const starFiles = {};
    for (const star of starDefs) starFiles[star] = imageForLevel(star);
    const attacksByStar = {};
    for (const star of starDefs) {
      attacksByStar[star] = parseAttacks(info[`damage ${star}star`] ?? '');
      for (const attack of attacksByStar[star]) {
        if (Object.keys(attack.damage).length === 0) {
          report.emptyDamage.push(`${name} (${star}★): ${attack.name} — ${attack.raw}`);
        }
      }
    }

    if (id === 'fish') {
      report.openQuestions.push(
        '"Fish" is the umbrella page of the fishing mechanic with a {{infobox creature}}; it landed in Ocean. Candidate for exclude.creatures in overrides.json.',
      );
    }
    // Trophy items share one "Trophies" page, but image files follow the
    // "<trophy name>.png" pattern (verified: Greydwarf trophy.png, …).
    const trophyRaw = info.trophy ?? '';
    const trophyTarget = parseLinks(trophyRaw)[0] ?? (cleanText(trophyRaw).trim() || null);

    const record = {
      id,
      name,
      wiki: wikiPageUrl(name),
      gameIds: parseList(info.id),
      kind,
      biomes: biomeIds,
      faction: cleanText(info.faction) || null,
      behavior: cleanText(info.behavior) || null,
      tameable: yesNo(info.tameable),
      weakPoints: parseWeakPoints(info),
      stagger: cleanText(info.stagger) || null,
      hasStars,
      stars: starDefs.map((star) => {
        const healthRaw = info[`health ${star}star`] ?? '';
        const healthByBiome = parseHealthByBiome(healthRaw, biomeIdByTitle);
        return {
          star,
          image: null, // filled after downloads
          health: healthByBiome ? null : parseHealth(healthRaw),
          ...(healthByBiome ? { healthByBiome } : {}), // absent unless per-biome
          healthText: parseList(healthRaw).join('\n') || null,
          attacks: attacksByStar[star],
        };
      }),
      abilities: parseList(info.abilities),
      modifiers,
      otherImmunities,
      drops: parseDrops(info.drops),
      trophy: trophyTarget ? { name: cleanText(trophyTarget), image: null } : null,
      summon: cleanText(info.summon) || null,
      location: cleanText(info.location) || null,
      spawns: parseSpawns(page.wikitext),
      description: extractDescription(page.wikitext) ?? (cleanText(info.description) || null),
    };
    built.push({ record, starDefs, starFiles, trophyTarget, trophyFile: null });
  }

  // 5. Trophy image files ("<trophy name>.png" pattern) ---------------------
  for (const item of built) {
    if (item.trophyTarget) item.trophyFile = `${item.trophyTarget}.png`;
  }

  // 6. Images ---------------------------------------------------------------
  // Overrides are read before the downloads: creatures in exclude.creatures
  // keep their image-url queries (a stable query set keeps the on-disk cache
  // reusable) but their files are not downloaded — they would be orphans
  // (deleted in step 8) and would be re-downloaded on every run.
  const overridesPath = path.join(DATA_DIR, 'overrides.json');
  const overrides = existsSync(overridesPath) ? JSON.parse(readFileSync(overridesPath, 'utf8')) : null;
  const excludedIds = new Set(overrides?.exclude?.creatures ?? []);
  const excludedImages = []; // creature image files dropped by exclusions
  for (const item of built) {
    if (!excludedIds.has(item.record.id)) continue;
    for (const star of item.starDefs) excludedImages.push(creatureImage(item.record.id, star));
    if (item.trophyFile) excludedImages.push(trophyImage(item.record.id));
  }

  const jobs = []; // { file, width, dest, skip }
  for (const item of built) {
    const skip = excludedIds.has(item.record.id);
    for (const star of item.starDefs) {
      const file = item.starFiles[star];
      if (file) jobs.push({ file, width: CREATURE_IMG_WIDTH, dest: creatureImage(item.record.id, star), skip });
    }
    if (item.trophyFile) jobs.push({ file: item.trophyFile, width: TROPHY_IMG_WIDTH, dest: trophyImage(item.record.id), skip });
  }
  for (const [biomeId, file] of biomeImageFiles) {
    jobs.push({ file, width: BIOME_IMG_WIDTH, dest: biomeImage(biomeId) });
  }

  const filesByWidth = new Map();
  for (const job of jobs) {
    if (!filesByWidth.has(job.width)) filesByWidth.set(job.width, new Set());
    filesByWidth.get(job.width).add(job.file);
  }
  const urlByKey = new Map(); // `${width}|${file}` -> url | null
  for (const [width, files] of filesByWidth) {
    console.log(`image urls (${width}px, ${files.size} files)…`);
    const urls = await api.getImageUrls([...files].sort(byCodepoint), width);
    for (const [file, url] of Object.entries(urls)) urlByKey.set(`${width}|${file}`, url);
  }
  // Missing files: try name variants (first-letter case, underscores) on the
  // new wiki first, then one fandom attempt per file.
  const nameVariants = (file) => {
    const spaced = file.replace(/_/g, ' ');
    const upper = spaced.charAt(0).toUpperCase() + spaced.slice(1);
    return [...new Set([file, spaced, upper])];
  };
  const fandom = new MwApi({ baseUrl: FANDOM_API });
  for (const [key, url] of [...urlByKey.entries()]) {
    if (url) continue;
    const [width, file] = key.split('|');
    const variants = nameVariants(file);
    const primaryUrls = await api.getImageUrls(variants, Number(width));
    const primaryHit = variants.find((variant) => primaryUrls[variant]);
    if (primaryHit) {
      urlByKey.set(key, primaryUrls[primaryHit]);
      continue;
    }
    const fallbackUrls = await fandom.getImageUrls(variants, Number(width));
    const fallbackHit = variants.find((variant) => fallbackUrls[variant]);
    if (fallbackHit) {
      urlByKey.set(key, fallbackUrls[fallbackHit]);
      const dests = jobs.filter((job) => job.file === file && job.width === Number(width)).map((job) => job.dest);
      report.fandomFallbacks.push(`${file} -> ${fallbackHit} (fandom) -> ${dests.join(', ')}`);
    }
  }

  // Files from earlier runs that this run no longer requests (dropped star
  // levels, e.g. Lord Reto moved 0★ -> 2★). When every job of a creature
  // shares one source image, a shifted dest reuses the stale file's bytes —
  // same thumb, no download. Ids are [a-z0-9-], safe in the RegExp below.
  const creaturesDir = abs('img/creatures');
  const requestedDests = new Set(jobs.map((job) => job.dest));
  const staleCreatureFiles = existsSync(creaturesDir) ? readdirSync(creaturesDir) : [];
  const reuseShiftedImage = (dest) => {
    const match = dest.match(/^img\/creatures\/(.+)-(\d)\.png$/);
    if (!match) return false;
    const id = match[1];
    const sources = new Set(
      jobs.filter((job) => job.dest.startsWith(`img/creatures/${id}-`)).map((job) => `${job.width}|${job.file}`),
    );
    if (sources.size !== 1) return false;
    const candidates = staleCreatureFiles.filter(
      (file) => new RegExp(`^${id}-\\d\\.png$`).test(file) && !requestedDests.has(`img/creatures/${file}`),
    );
    if (candidates.length !== 1) return false;
    copyFileSync(abs(`img/creatures/${candidates[0]}`), abs(dest));
    console.log(`  reused img/creatures/${candidates[0]} as ${dest} (star level shifted)`);
    return true;
  };

  console.log(`downloading ${jobs.length} images…`);
  const dests = new Set();
  for (const job of jobs) {
    if (job.skip) continue; // excluded creature: the file would be an orphan
    if (dests.has(job.dest)) continue;
    dests.add(job.dest);
    if (existsSync(abs(job.dest))) continue;
    if (reuseShiftedImage(job.dest)) continue;
    const url = urlByKey.get(`${job.width}|${job.file}`);
    if (!url) continue;
    await api.download(url, abs(job.dest));
  }

  // Fill image paths into the records: own level, else the nearest lower
  // level's file, else the first available. Excluded creatures are skipped —
  // their files were never requested.
  for (const item of built) {
    if (excludedIds.has(item.record.id)) continue;
    const { record } = item;
    const own = record.stars.map((star) =>
      existsSync(abs(creatureImage(record.id, star.star))) ? creatureImage(record.id, star.star) : null,
    );
    record.stars.forEach((star, index) => {
      let image = own[index];
      for (let lower = index - 1; image === null && lower >= 0; lower -= 1) image = own[lower];
      star.image = image ?? own.find(Boolean) ?? null;
    });
    if (!own.some(Boolean)) report.noImage.push(record.name);
    if (record.trophy) {
      record.trophy.image = existsSync(abs(trophyImage(record.id))) ? trophyImage(record.id) : null;
    }
  }

  // 7. Overrides (data/overrides.json, orchestrator-owned) ------------------
  // Exclusions were already honored by the image jobs in step 6.
  if (overrides) {
    console.log('applying data/overrides.json…');
    for (const item of built) {
      const patch = overrides.creatures?.[item.record.id];
      if (patch) Object.assign(item.record, Object.fromEntries(Object.entries(patch).filter(([key]) => key !== 'reason')));
    }
    const kept = built.filter((item) => !excludedIds.has(item.record.id));
    if (kept.length !== built.length) console.log(`  excluded ${built.length - kept.length} creatures`);
    built.length = 0;
    built.push(...kept);
  }
  report.orphanImages = [...new Set(excludedImages)].sort(byCodepoint);

  // 8. Output files ----------------------------------------------------------
  let creatures = built.map((item) => item.record).sort((a, b) => byCodepoint(a.name, b.name));
  const extraPages = await api.getWikitext(['Trophies', 'Taming', 'Events']);
  const unmatchedExtras = enrichCreatures(creatures, Object.fromEntries(
    Object.entries(extraPages).map(([title, page]) => [title, page.wikitext]),
  ));

  // Images no final record references (excluded creatures; stale files from
  // earlier runs, e.g. dropped star levels) are deleted from img/creatures/.
  const referencedImages = new Set();
  for (const creature of creatures) {
    for (const star of creature.stars) if (star.image) referencedImages.add(star.image);
    if (creature.trophy?.image) referencedImages.add(creature.trophy.image);
  }
  if (existsSync(creaturesDir)) {
    for (const file of readdirSync(creaturesDir)) {
      if (referencedImages.has(`img/creatures/${file}`)) continue;
      rmSync(abs(`img/creatures/${file}`));
      console.log(`  removed orphan image: img/creatures/${file}`);
    }
  }
  // Drop creatures excluded by overrides from the section lists as well.
  const finalSectionByKey = new Map(
    [...sectionByKey.entries()].filter(([key]) => creatures.some((creature) => creature.id === key.split(':')[1])),
  );

  const biomeRecords = BIOMES.map((biome) => ({
    id: biome.id,
    name: biome.title,
    order: biome.order,
    tier: biome.order,
    image: existsSync(abs(biomeImage(biome.id))) ? biomeImage(biome.id) : null,
    wiki: wikiPageUrl(biome.title),
    creatures: Object.fromEntries(SECTIONS.map((section) => [section, []])),
  }));
  for (const creature of creatures) {
    for (const biomeId of creature.biomes) {
      const biomeRecord = biomeRecords.find((b) => b.id === biomeId);
      if (!biomeRecord) continue;
      const section = finalSectionByKey.get(`${biomeId}:${creature.id}`) ?? creature.kind;
      if (SECTIONS.includes(section)) biomeRecord.creatures[section].push(creature.id);
    }
  }
  for (const biome of biomeRecords) {
    for (const section of SECTIONS) biome.creatures[section] = [...new Set(biome.creatures[section])].sort(byCodepoint);
  }

  await addLocalizedNames([...creatures, ...biomeRecords]);

  // Creatures without a biome, recomputed after overrides.
  report.noBiome = creatures
    .filter((creature) => creature.biomes.length === 0)
    .map((creature) => `${creature.name} (location: ${creature.location ?? 'n/a'})`);

  mkdirSync(DATA_DIR, { recursive: true });
  const writeIfChanged = (dest, content) => {
    if (existsSync(dest) && readFileSync(dest, 'utf8') === content) return;
    writeFileSync(dest, content);
  };
  writeIfChanged(path.join(DATA_DIR, 'biomes.json'), `${JSON.stringify(biomeRecords, null, 2)}\n`);
  writeIfChanged(path.join(DATA_DIR, 'creatures.json'), `${JSON.stringify(creatures, null, 2)}\n`);
  writeIfChanged(path.join(DATA_DIR, 'report.md'), renderReport(report, biomeRecords, creatures));
  writeIfChanged(path.join(DATA_DIR, 'report-creature-extras.md'), [
    '# VC-24 creature extras report', '',
    'Source: Valheim Wiki tables on Trophies, Taming and Events. Percentages, meters and minutes are kept as numbers; unknown values are null.', '',
    'Trophy usage lists the specific uses in each table row; the shared decoration, Ballista and Obliterator uses are described on the source page.', '',
    '## Unmatched creature links', '',
    ...(unmatchedExtras.length ? unmatchedExtras.map(entry => `- ${entry}`) : ['(none)']), '',
  ].join('\n'));
  console.log(`done: ${creatures.length} creatures, ${biomeRecords.length} biomes`);
}

function renderReport(report, biomeRecords, creatures) {
  const lines = [];
  lines.push('# VC-1 data report', '', 'Source: valheim.weirdgloop.org (MediaWiki API). No dates on purpose: the report must be byte-identical on re-runs from cache.', '');

  lines.push('## Creatures per biome', '', '| Biome | boss | miniboss | hostile | passive | fish | total |', '|---|---|---|---|---|---|---|');
  for (const biome of biomeRecords) {
    const c = biome.creatures;
    lines.push(`| ${biome.name} | ${c.boss.length} | ${c.miniboss.length} | ${c.hostile.length} | ${c.passive.length} | ${c.fish.length} | ${c.boss.length + c.miniboss.length + c.hostile.length + c.passive.length + c.fish.length} |`);
  }
  lines.push('', 'By kind: ' + SECTIONS.map((section) => `${section} ${creatures.filter((c) => c.kind === section).length}`).join(', ') + `, total ${creatures.length}.`, '');

  const sections = [
    ['Creatures without biome', report.noBiome],
    ['Pages without {{infobox creature}}', report.noInfobox],
    ['Unknown modifier fields', report.unknownModifiers],
    ['Creatures without image', report.noImage],
    ['Attacks with empty damage', report.emptyDamage],
    ['Fandom fallbacks', report.fandomFallbacks],
  ];
  for (const [heading, entries] of sections) {
    lines.push(`## ${heading}`, '');
    if (entries.length === 0) lines.push('(none)', '');
    else {
      for (const entry of entries) lines.push(`- ${entry}`);
      lines.push('');
    }
  }

  lines.push('## Orphan images removed', '');
  if (report.orphanImages.length === 0) lines.push('(none)', '');
  else {
    lines.push(
      `${report.orphanImages.length} image files in img/creatures/ belong to creatures excluded via overrides.json; ` +
        `no record in creatures.json references them, so they are deleted when found:`,
      '',
    );
    for (const file of report.orphanImages) lines.push(`- ${file}`);
    lines.push('');
  }

  lines.push('## Open questions', '');
  const notes = [
    ...report.openQuestions,
    'Creature set is biome links ∪ all five fetched categories (spec says only Category:Creatures); the extra categories contribute Chicken, Hen, Riktig Fuling, Hive and The Hive, needed for the ≥110-creatures acceptance.',
    'package.json test script uses `node --test \'scripts/**/*.test.mjs\'` instead of `node --test scripts/`: Node v25.9.0 executes a directory argument as a module and fails.',
  ];
  for (const note of notes) lines.push(`- ${note}`);
  lines.push('');
  return lines.join('\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
