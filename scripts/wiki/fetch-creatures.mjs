// Fetches biomes and creatures from valheim.weirdgloop.org (MediaWiki API) and
// builds data/biomes.json, data/creatures.json, data/report.md plus images in
// img/creatures/ and img/biomes/.
//
// Every API response goes through the on-disk cache (api.mjs), so a re-run with
// a warm cache makes no network calls and rewrites identical files. `--refresh`
// bypasses the cache. data/overrides.json (if present) is applied last.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { MwApi, api } from './api.mjs';
import {
  cleanText,
  findTemplateRange,
  parseAttacks,
  parseHealth,
  parseImage,
  parseInfobox,
  parseLinks,
  parseList,
  parseModifiers,
  parseTemplates,
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

// Biome order and gear tiers per docs/ANALYZA.md § 2.
const BIOMES = [
  { title: 'Meadows', id: 'meadows', order: 1, gearTier: 1 },
  { title: 'Black Forest', id: 'black-forest', order: 2, gearTier: 2 },
  { title: 'Swamp', id: 'swamp', order: 3, gearTier: 3 },
  { title: 'Ocean', id: 'ocean', order: 4, gearTier: 3 },
  { title: 'Mountain', id: 'mountain', order: 5, gearTier: 4 },
  { title: 'Plains', id: 'plains', order: 6, gearTier: 5 },
  { title: 'Mistlands', id: 'mistlands', order: 7, gearTier: 6 },
  { title: 'Ashlands', id: 'ashlands', order: 8, gearTier: 7 },
  { title: 'Deep North', id: 'deep-north', order: 9, gearTier: 8 },
];

const SECTIONS = ['boss', 'miniboss', 'hostile', 'passive', 'fish'];
const biomeByTitle = new Map(BIOMES.map((biome) => [biome.title, biome]));
const biomeById = new Map(BIOMES.map((biome) => [biome.id, biome]));

const wikiPageUrl = (title) => `${WIKI_URL}/w/${encodeURIComponent(title.replace(/ /g, '_'))}`;
const creatureImage = (id, star) => `img/creatures/${id}-${star}.png`;
const trophyImage = (id) => `img/creatures/${id}-trophy.png`;
const biomeImage = (id) => `img/biomes/${id}.png`;
const abs = (relative) => path.join(REPO_ROOT, relative);
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

async function mainInner() {
  const report = {
    noInfobox: [],
    noBiome: [],
    unknownModifiers: [],
    noImage: [],
    emptyDamage: [],
    fandomFallbacks: [],
    openQuestions: [],
  };

  // 1. Biome pages ----------------------------------------------------------
  console.log('fetching biome pages…');
  const biomePages = await api.getWikitext(BIOMES.map((biome) => biome.title));

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

    // Biomes: infobox membership, else first location link that is a biome.
    let assignments = membershipByPage.get(name) ?? [];
    let locationAssigned = false;
    if (assignments.length === 0) {
      const link = parseLinks(info.location ?? '').find((target) => biomeByTitle.has(target));
      if (link) {
        assignments = [{ biomeId: biomeByTitle.get(link).id, section: kindFromCategories(name) }];
        locationAssigned = true;
      }
    }
    const biomeIds = [...new Set(assignments.map((entry) => entry.biomeId))].sort(
      (a, b) => biomeById.get(a).order - biomeById.get(b).order,
    );
    const kind = assignments.length ? assignments[0].section : kindFromCategories(name);
    for (const entry of assignments) sectionByKey.set(`${entry.biomeId}:${id}`, entry.section);
    if (locationAssigned) console.log(`  location-assigned: ${name} -> ${biomeIds.join(', ')}`);

    const hasStars = Boolean(info['health 1star']);
    const starDefs = hasStars ? [0, 1, 2] : [0];
    const { modifiers, otherImmunities, unknown } = parseModifiers(info);
    for (const item of unknown) report.unknownModifiers.push(`${name}: ${item.field} = ${item.value}`);

    const zeroStarFile = parseImage(info['image 0star'] ?? info.image ?? '');
    const starFiles = {};
    for (const star of starDefs) {
      starFiles[star] = parseImage(info[`image ${star}star`]) ?? zeroStarFile;
    }
    const attacksByStar = {};
    for (const star of starDefs) {
      attacksByStar[star] = parseAttacks(info[`damage ${star}star`] ?? '');
      for (const attack of attacksByStar[star]) {
        if (Object.keys(attack.damage).length === 0) {
          report.emptyDamage.push(`${name} (${star}★): ${attack.name} — ${attack.raw}`);
        }
      }
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
      weakPoints: Object.keys(info).some(
        (key) => /^weak ?points?$/.test(key.replace(/_/g, ' ')) && cleanText(info[key]),
      ),
      stagger: cleanText(info.stagger) || null,
      hasStars,
      stars: starDefs.map((star) => ({
        star,
        image: null, // filled after downloads
        health: parseHealth(info[`health ${star}star`]),
        healthText: cleanText(info[`health ${star}star`]) || null,
        attacks: attacksByStar[star],
      })),
      abilities: parseList(info.abilities),
      modifiers,
      otherImmunities,
      drops: parseList(info.drops),
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
  const jobs = []; // { file, width, dest }
  for (const item of built) {
    for (const star of item.starDefs) {
      const file = item.starFiles[star];
      if (file) jobs.push({ file, width: CREATURE_IMG_WIDTH, dest: creatureImage(item.record.id, star) });
    }
    if (item.trophyFile) jobs.push({ file: item.trophyFile, width: TROPHY_IMG_WIDTH, dest: trophyImage(item.record.id) });
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
  // Fandom fallback for files missing on the new wiki (one attempt per file).
  const fandom = new MwApi({ baseUrl: FANDOM_API });
  for (const [key, url] of [...urlByKey.entries()]) {
    if (url) continue;
    const [width, file] = key.split('|');
    const fallbackUrls = await fandom.getImageUrls([file], Number(width));
    if (fallbackUrls[file]) {
      urlByKey.set(key, fallbackUrls[file]);
      const dests = jobs.filter((job) => job.file === file && job.width === Number(width)).map((job) => job.dest);
      report.fandomFallbacks.push(`${file} (${width}px) -> ${dests.join(', ')}`);
    }
  }

  console.log(`downloading ${jobs.length} images…`);
  const dests = new Set();
  for (const job of jobs) {
    if (dests.has(job.dest)) continue;
    dests.add(job.dest);
    const url = urlByKey.get(`${job.width}|${job.file}`);
    if (!url) continue;
    await api.download(url, abs(job.dest));
  }

  // Fill image paths into the records.
  for (const item of built) {
    const { record } = item;
    const zeroPath = existsSync(abs(creatureImage(record.id, 0))) ? creatureImage(record.id, 0) : null;
    for (const star of record.stars) {
      star.image = existsSync(abs(creatureImage(record.id, star.star)))
        ? creatureImage(record.id, star.star)
        : zeroPath;
    }
    if (!zeroPath) report.noImage.push(record.name);
    if (record.trophy) {
      record.trophy.image = existsSync(abs(trophyImage(record.id))) ? trophyImage(record.id) : null;
    }
  }

  // 7. Overrides (data/overrides.json, orchestrator-owned) ------------------
  const overridesPath = path.join(DATA_DIR, 'overrides.json');
  if (existsSync(overridesPath)) {
    console.log('applying data/overrides.json…');
    const overrides = JSON.parse(readFileSync(overridesPath, 'utf8'));
    const excluded = new Set(overrides.exclude?.creatures ?? []);
    for (const item of built) {
      const patch = overrides.creatures?.[item.record.id];
      if (patch) Object.assign(item.record, Object.fromEntries(Object.entries(patch).filter(([key]) => key !== 'reason')));
    }
    const kept = built.filter((item) => !excluded.has(item.record.id));
    if (kept.length !== built.length) console.log(`  excluded ${built.length - kept.length} creatures`);
    built.length = 0;
    built.push(...kept);
  }

  // 8. Output files ----------------------------------------------------------
  let creatures = built.map((item) => item.record).sort((a, b) => byCodepoint(a.name, b.name));
  // Drop creatures excluded by overrides from the section lists as well.
  const finalSectionByKey = new Map(
    [...sectionByKey.entries()].filter(([key]) => creatures.some((creature) => creature.id === key.split(':')[1])),
  );

  const biomeRecords = BIOMES.map((biome) => ({
    id: biome.id,
    name: biome.title,
    order: biome.order,
    gearTier: biome.gearTier,
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

  // Creatures without a biome, recomputed after overrides.
  report.noBiome = creatures
    .filter((creature) => creature.biomes.length === 0)
    .map((creature) => `${creature.name} (location: ${creature.location ?? 'n/a'})`);

  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(path.join(DATA_DIR, 'biomes.json'), `${JSON.stringify(biomeRecords, null, 2)}\n`);
  writeFileSync(path.join(DATA_DIR, 'creatures.json'), `${JSON.stringify(creatures, null, 2)}\n`);
  writeFileSync(path.join(DATA_DIR, 'report.md'), renderReport(report, biomeRecords, creatures));
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

  lines.push('## Open questions', '');
  const notes = [
    ...report.openQuestions,
    'package.json test script uses `node --test \'scripts/**/*.test.mjs\'` instead of `node --test scripts/`: Node v25.9.0 executes a directory argument as a module and fails.',
  ];
  for (const note of notes) lines.push(`- ${note}`);
  lines.push('');
  return lines.join('\n');
}

main();
