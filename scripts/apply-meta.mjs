// Inserts or updates Open Graph, Twitter, favicon, GA4 and manifest metadata in all apps/*/index.html files.
// Idempotent: replaces the block between <!-- meta:start --> and <!-- meta:end -->.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG_FILE = path.join(REPO_ROOT, 'site.config.json');

export const PAGES = [
  {
    filePath: path.join(REPO_ROOT, 'apps', 'expedition', 'index.html'),
    section: 'expedition', path: '/expedition/', title: 'Expedition — Valheim Companion',
    description: 'Prepare for the next boss and the raids that come after it — weapons, defenses, food, meads and the full packing list.',
  },
  {
    filePath: path.join(REPO_ROOT, 'apps', 'comfort', 'index.html'),
    section: 'comfort', path: '/comfort/', title: 'Comfort Planner — Valheim Companion',
    description: 'Build the coziest Valheim base you can right now — comfort, Rested time and the full shopping list.',
  },
  {
    filePath: path.join(REPO_ROOT, 'apps', 'hub', 'index.html'),
    section: 'hub',
    path: '/',
    title: 'Valheim Companion — tools for your Valheim journey',
    i18nTitle: 'Valheim Companion — tools for your Valheim journey',
    description:
      'Spoiler-free bestiary with weaknesses and best weapons for your skills, armor shopping lists and a rich-text sign editor. Updated for Valheim 1.0 and the Deep North.',
  },
  {
    filePath: path.join(REPO_ROOT, 'apps', 'bestiary', 'index.html'),
    section: 'bestiary',
    path: '/bestiary/',
    title: 'Bestiary — Valheim Companion',
    i18nTitle: 'Bestiary — Valheim Companion',
    description:
      'Every Valheim creature and boss by biome, spoiler-free. Stats per star level, weaknesses, and the best weapons for your skills — with hits to kill.',
  },
  {
    filePath: path.join(REPO_ROOT, 'apps', 'smithy', 'index.html'),
    section: 'smithy',
    path: '/smithy/',
    title: 'Smithy — Valheim Companion',
    i18nTitle: 'Smithy — Valheim Companion',
    description:
      'Every Valheim armor set, weapon and shield by biome. Pick pieces and upgrade levels and get the full material list, smelting plan and where to farm it.',
  },
  {
    filePath: path.join(REPO_ROOT, 'apps', 'damage-calculator', 'index.html'),
    section: 'damage-calculator',
    path: '/damage-calculator/',
    title: 'Damage Calculator — Valheim Companion',
    description:
      'Pick a Valheim creature and a weapon, set skill and upgrade level and see the damage that actually lands — resistances, DPS and time-to-kill.',
  },
  {
    filePath: path.join(REPO_ROOT, 'apps', 'signs', 'index.html'),
    section: 'signs',
    path: '/signs/',
    title: 'Sign Editor (Runopis) — Valheim Companion',
    description:
      'Write Valheim signs with colors, sizes and rich-text tags, see a live in-game preview and copy them straight into the game. 13 languages.',
  },
  {
    filePath: path.join(REPO_ROOT, 'apps', 'hub', 'privacy', 'index.html'),
    section: 'privacy',
    path: '/privacy/',
    title: 'Privacy — Valheim Companion',
    i18nTitle: 'Privacy — Valheim Companion',
    description: 'Privacy policy and cookie preferences for Valheim Companion.',
  },
  {
    filePath: path.join(REPO_ROOT, 'apps', 'progress', 'index.html'),
    section: 'progress',
    path: '/progress/',
    title: 'Progress Tracker — Valheim Companion',
    description: 'Tick off bosses, biomes and key drops — every Valheim Companion tool unlocks spoilers as you progress.',
  },
  {
    filePath: path.join(REPO_ROOT, 'apps', 'provisions', 'index.html'),
    section: 'provisions',
    path: '/provisions/',
    title: 'Provisions — Valheim Companion',
    description: 'Plan your Valheim food and meads for the next trip — stats, servings and the full shopping list, with crafting stations and ingredient sources.',
  },
  {
    filePath: path.join(REPO_ROOT, 'apps', 'items', 'index.html'),
    section: 'items',
    path: '/items/',
    title: 'Items Compendium — Valheim Companion',
    description: 'Materials, monster drops, trophies and treasures across Valheim — where to find them and everything they are used to craft.',
  },
  {
    filePath: path.join(REPO_ROOT, 'apps', 'traders', 'index.html'),
    section: 'traders',
    path: '/traders/',
    title: 'Trader Ledger — Valheim Companion',
    description: 'Merchandise catalog, unlock requirements, and treasure appraisal for Haldor, Hildir & The Bog Witch.',
  },
];

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function readConfig() {
  if (!existsSync(CONFIG_FILE)) {
    return {
      siteUrl: '',
      siteName: 'Valheim Companion',
      locale: 'en_US',
      gaMeasurementId: '',
    };
  }
  try {
    const raw = readFileSync(CONFIG_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    const siteUrl = (parsed.siteUrl || '').trim().replace(/\/+$/, '');
    return {
      siteUrl,
      siteName: parsed.siteName || 'Valheim Companion',
      locale: parsed.locale || 'en_US',
      gaMeasurementId: parsed.gaMeasurementId || '',
    };
  } catch (err) {
    console.warn(`Warning: failed to read ${CONFIG_FILE}:`, err);
    return {
      siteUrl: '',
      siteName: 'Valheim Companion',
      locale: 'en_US',
      gaMeasurementId: '',
    };
  }
}

export function generateMetaBlock(page, config, indent = '  ', existingProgressScripts = []) {
  const siteUrl = (config.siteUrl || '').trim().replace(/\/+$/, '');
  const siteName = config.siteName || 'Valheim Companion';
  const locale = config.locale || 'en_US';
  const gaMeasurementId = config.gaMeasurementId || '';

  const titleTag = page.i18nTitle
    ? `<title data-i18n="${escapeHtml(page.i18nTitle)}">${escapeHtml(page.title)}</title>`
    : `<title>${escapeHtml(page.title)}</title>`;

  const lines = [
    '<!-- meta:start -->',
    titleTag,
    `<meta name="description" content="${escapeHtml(page.description)}">`,
  ];

  if (siteUrl) {
    const pageUrl = `${siteUrl}${page.path}`;
    lines.push(`<link rel="canonical" href="${pageUrl}">`);
  }

  lines.push(
    '<meta property="og:type" content="website">',
    `<meta property="og:site_name" content="${escapeHtml(siteName)}">`,
    `<meta property="og:locale" content="${escapeHtml(locale)}">`,
    `<meta property="og:title" content="${escapeHtml(page.title)}">`,
    `<meta property="og:description" content="${escapeHtml(page.description)}">`,
  );

  if (siteUrl) {
    const pageUrl = `${siteUrl}${page.path}`;
    const imageUrl = `${siteUrl}/og/${page.section}.png`;
    lines.push(
      `<meta property="og:url" content="${pageUrl}">`,
      `<meta property="og:image" content="${imageUrl}">`,
      '<meta property="og:image:width" content="1200">',
      '<meta property="og:image:height" content="630">',
      `<meta property="og:image:alt" content="${escapeHtml(page.title)}">`,
    );
  }

  lines.push(
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${escapeHtml(page.title)}">`,
    `<meta name="twitter:description" content="${escapeHtml(page.description)}">`,
  );

  if (siteUrl) {
    const imageUrl = `${siteUrl}/og/${page.section}.png`;
    lines.push(`<meta name="twitter:image" content="${imageUrl}">`);
  }

  lines.push(
    '<meta name="theme-color" content="#0f1216">',
    '<link rel="icon" type="image/svg+xml" href="/favicon.svg">',
    '<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">',
    '<link rel="manifest" href="/site.webmanifest">',
  );

  if (gaMeasurementId) {
    lines.push(`<meta name="vc-ga" content="${escapeHtml(gaMeasurementId)}">`);
  }
  if (siteUrl) {
    lines.push(`<meta name="vc-site" content="${siteUrl}">`);
  }
  lines.push('<script src="/shared/analytics/consent.js" defer></script>');
  for (const script of ['core', 'ui', 'drawer']) {
    if (!existingProgressScripts.includes(script)) lines.push(`<script src="/shared/progress/${script}.js" defer></script>`);
  }

  lines.push('<!-- meta:end -->');

  return lines.map((l) => `${indent}${l}`).join('\n');
}

export function applyMetaToHtml(html, page, config) {
  // Detect indentation from viewport line or head
  const viewportMatch = html.match(/^([ \t]*)<meta\s+name=["']viewport["'][^>]*>/m);
  const indent = viewportMatch ? viewportMatch[1] : '  ';
  // Existing classic sections load core before their app; keep that order.
  // Ignore the previous generated block so repeated runs remain idempotent.
  const outsideMeta = html.replace(/<!-- meta:start -->[\s\S]*?<!-- meta:end -->/, '');
  const existingProgressScripts = [...outsideMeta.matchAll(/<script\b[^>]*\bsrc=["'][^"']*shared\/progress\/(core|ui|drawer)\.js["']/gi)].map(match => match[1]);
  const newBlock = generateMetaBlock(page, config, indent, existingProgressScripts);

  const existingBlockRegex = /([ \t]*)<!-- meta:start -->[\s\S]*?<!-- meta:end -->/;
  if (existingBlockRegex.test(html)) {
    return html.replace(existingBlockRegex, newBlock);
  }

  // First insertion: clean legacy metadata tags from head to prevent duplication
  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  if (!headMatch) {
    throw new Error(`Cannot find <head> section in ${page.filePath}`);
  }

  let headContent = headMatch[1];

  // Remove legacy tags from head
  headContent = headContent
    .replace(/^[ \t]*<title>[\s\S]*?<\/title>[ \t]*\n?/gm, '')
    .replace(/^[ \t]*<meta\s+name=["']description["'][\s\S]*?>[ \t]*\n?/gim, '')
    .replace(/^[ \t]*<meta\s+name=["']theme-color["'][\s\S]*?>[ \t]*\n?/gim, '')
    .replace(/^[ \t]*<link\s+rel=["']icon["'][\s\S]*?>[ \t]*\n?/gim, '')
    .replace(/^[ \t]*<link\s+rel=["']apple-touch-icon["'][\s\S]*?>[ \t]*\n?/gim, '')
    .replace(/^[ \t]*<link\s+rel=["']manifest["'][\s\S]*?>[ \t]*\n?/gim, '')
    .replace(/^[ \t]*<link\s+rel=["']canonical["'][\s\S]*?>[ \t]*\n?/gim, '');

  // Insert new block directly after viewport meta
  const viewportInHeadRegex = /(<meta\s+name=["']viewport["'][^>]*>)/i;
  if (!viewportInHeadRegex.test(headContent)) {
    throw new Error(`Cannot find <meta name="viewport"> in <head> of ${page.filePath}`);
  }

  headContent = headContent.replace(viewportInHeadRegex, `$1\n${newBlock}`);

  return html.replace(/<head[^>]*>[\s\S]*?<\/head>/i, (match) => {
    const openingTag = match.match(/<head[^>]*>/i)[0];
    return `${openingTag}${headContent}</head>`;
  });
}

export function applyMeta() {
  const config = readConfig();
  if (!config.siteUrl) {
    console.warn(
      'Warning: siteUrl is empty in site.config.json. Absolute URL tags (canonical, og:url, og:image, twitter:image) will be omitted.',
    );
  }

  for (const page of PAGES) {
    if (!existsSync(page.filePath)) {
      continue;
    }

    const currentHtml = readFileSync(page.filePath, 'utf8');
    const updatedHtml = applyMetaToHtml(currentHtml, page, config);

    if (currentHtml !== updatedHtml) {
      writeFileSync(page.filePath, updatedHtml, 'utf8');
      console.log(`Updated meta tags in ${path.relative(REPO_ROOT, page.filePath)}`);
    } else {
      console.log(`No changes for ${path.relative(REPO_ROOT, page.filePath)} (up to date)`);
    }
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  applyMeta();
}
