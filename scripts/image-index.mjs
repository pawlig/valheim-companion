// Shared image lookup for the data generators (Items Compendium, Trader Ledger).
//
// Maps a lowercase file name ("ymir-flesh.png") and its slug ("ymir-flesh") to the
// relative image URL used by the apps ("../smithy/img/items/ymir-flesh.png").
// The first file found wins (apps in the given order, files sorted by name).
import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { slug } from './wiki/wikitext.mjs';

const IMAGE_FILE = /\.(png|webp|jpg)$/i;

function addFile(index, file, url) {
  const lower = file.toLowerCase();
  if (!index.has(lower)) index.set(lower, url);
  const base = slug(lower.replace(/\.[^.]+$/, ''));
  if (!index.has(base)) index.set(base, url);
}

function walk(index, dir, urlPrefix, rel) {
  for (const f of readdirSync(dir).sort()) {
    const full = path.join(dir, f);
    const sub = rel ? `${rel}/${f}` : f;
    if (statSync(full).isDirectory()) walk(index, full, urlPrefix, sub);
    else addFile(index, f, `${urlPrefix}/${sub}`);
  }
}

// apps: app folder names whose `img/` folder is walked recursively.
// extraDirs: [{ dir, urlPrefix }] flat folders of loose images (only png/webp/jpg), indexed after the apps.
export function buildImageIndex(appsDir, apps, extraDirs = []) {
  const index = new Map();
  for (const app of apps) {
    const dir = path.join(appsDir, app, 'img');
    if (existsSync(dir)) walk(index, dir, `../${app}/img`, '');
  }
  for (const { dir, urlPrefix } of extraDirs) {
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir).sort()) {
      if (IMAGE_FILE.test(f)) addFile(index, f, `${urlPrefix}/${f}`);
    }
  }
  return index;
}
