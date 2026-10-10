// Builds the browser data package for Provisions without introducing a frontend page.
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { aliasImage } from './image-index.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = name => JSON.parse(readFileSync(path.join(ROOT, 'data', `${name}.json`), 'utf8'));
export function buildProvisionsData() {
  const biomes = load('biomes').map(b => ({ ...b, image: b.image ? `../bestiary/${b.image}` : null }));
  const items = Object.fromEntries(load('items').filter(item => !item.comfort).map(item => {
    const itemImage = aliasImage(item.image);
    const image = itemImage ? (itemImage.startsWith('../provisions/') ? itemImage.slice('../provisions/'.length) : `../smithy/${itemImage}`) : null;
    return [item.id, { ...item, image: image && existsSync(path.resolve(ROOT, 'apps/provisions', image)) ? image : null }];
  }));
  const bundle = { biomes, food: load('food'), meads: load('meads'), stations: load('stations').filter(station => station.type !== 'comfort'), items, tips: load('provisions-tips') };
  const tipsDestination = path.join(ROOT, 'apps/provisions/data/tips.json');
  writeFileSync(tipsDestination, JSON.stringify(bundle.tips, null, 2) + '\n');
  const imageReferences = new Set([...bundle.food, ...bundle.meads, ...Object.values(items)].map(e => e.image).filter(Boolean));
  for (const image of imageReferences) {
    if (!existsSync(path.resolve(ROOT, 'apps/provisions', image))) throw new Error(`Missing image: ${image}`);
  }
  for (const entity of [...bundle.food, ...bundle.meads]) {
    for (const material of entity.base?.materials ?? entity.materials ?? []) {
      if (!items[material.item]) throw new Error(`${entity.name}: missing material ${material.item}`);
    }
  }
  // Remove obsolete generated images from earlier scraper runs.
  const imageRoot = path.join(ROOT, 'apps/provisions/img');
  function prune(directory) {
    if (!existsSync(directory)) return;
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) prune(target);
      else if (!imageReferences.has(path.relative(path.join(ROOT, 'apps/provisions'), target))) rmSync(target);
    }
  }
  prune(imageRoot);
  const destination = path.join(ROOT, 'apps/provisions/data/data.js');
  mkdirSync(path.dirname(destination), { recursive: true });
  const content = `window.VPR_DATA = ${JSON.stringify(bundle, null, 2)};\n`;
  if (!existsSync(destination) || readFileSync(destination, 'utf8') !== content) writeFileSync(destination, content);
  console.log(`Built Provisions: ${bundle.food.length} foods, ${bundle.meads.length} meads, ${bundle.stations.length} stations, ${Object.keys(items).length} items.`);
  return bundle;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) buildProvisionsData();
