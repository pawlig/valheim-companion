import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { readCachedPages } from './wiki/api.mjs';
import { aliasImage, buildImageIndex } from './image-index.mjs';
import { parseDrops } from './wiki/fetch-creatures.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (rel) => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));
const readBundle = (rel) => {
  const sandbox = { window: {} };
  vm.runInNewContext(readFileSync(path.join(ROOT, rel), 'utf8'), sandbox);
  return Object.values(sandbox.window)[0];
};

test('readCachedPages returns cached wikitext and throws listing missing titles', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'wiki-cache-'));
  writeFileSync(path.join(dir, 'a.json'), JSON.stringify({ query: { pages: [{ title: 'Foo', revisions: [{ slots: { main: { content: 'foo text' } } }] }] } }));
  assert.equal(readCachedPages(['Foo'], dir).get('Foo'), 'foo text');
  assert.throws(() => readCachedPages(['Foo', 'Bar', 'Baz'], dir), /Bar, Baz/);
});

test('items-pages.json titles are all in the wiki cache', () => {
  const titles = readJson('scripts/wiki/items-pages.json');
  assert.ok(titles.length > 0);
  assert.equal(readCachedPages(titles).size, new Set(titles).size);
});

test('roots resolves to root.png everywhere and roots.png is gone', () => {
  assert.equal(existsSync(path.join(ROOT, 'apps/smithy/img/items/roots.png')), false);
  assert.equal(aliasImage('img/items/roots.png'), 'img/items/root.png');
  const index = buildImageIndex(path.join(ROOT, 'apps'), ['smithy']);
  assert.equal(index.get('roots'), '../smithy/img/items/root.png');
  const smithy = readBundle('apps/smithy/data/data.js');
  assert.equal(smithy.items.roots.image, 'img/items/root.png');
  const compendium = readJson('data/items-compendium.json');
  const image = compendium.items.find((i) => i.id === 'roots').image;
  assert.equal(image, '../smithy/img/items/root.png');
  assert.ok(existsSync(path.join(ROOT, 'apps', image.replace('../', ''))));
});

test('Smithy and Provisions items carry the traders that sell them', () => {
  const smithy = readBundle('apps/smithy/data/data.js');
  assert.equal(smithy.items['ymir-flesh'].traders[0].id, 'haldor');
  assert.deepEqual(Object.keys(smithy.items['ymir-flesh'].traders[0]).sort(), ['id', 'name']);
  const cosmetic = smithy.armor.flatMap((e) => e.pieces).find((p) => p.id === 'beaded-dress-blue');
  assert.equal(cosmetic.traders[0].id, 'hildir');
  const provisions = readBundle('apps/provisions/data/data.js');
  assert.equal(provisions.items['toadstool'].traders[0].id, 'bog-witch');
  assert.equal(provisions.meads.find((m) => m.id === 'love-potion')?.traders?.[0].id ?? provisions.items['love-potion'].traders[0].id, 'bog-witch');
  assert.equal(provisions.items.honey?.traders, undefined);
});

test('creature drops: comma-separated links are split, None is dropped', () => {
  assert.deepEqual(parseDrops('[[Ectoplasm]], [[Ghost Trophy]]'), ['Ectoplasm', 'Ghost Trophy']);
  assert.deepEqual(parseDrops('None'), []);
  assert.deepEqual(parseDrops('* [[Troll Hide]]\n* [[Troll Trophy]]'), ['Troll Hide', 'Troll Trophy']);
  const creatures = readJson('data/creatures.json');
  assert.deepEqual(creatures.find((c) => c.id === 'ghost').drops, ['Ectoplasm', 'Ghost Trophy']);
  assert.deepEqual(creatures.find((c) => c.id === 'moose-calf').drops, []);
  const compendium = readJson('data/items-compendium.json');
  const ids = new Set(compendium.items.map((i) => i.id));
  assert.equal(ids.has('ectoplasm-ghost-trophy'), false);
  for (const id of ['ectoplasm', 'ghost-trophy']) {
    assert.ok(compendium.items.find((i) => i.id === id).sources.creatures.some((c) => c.id === 'ghost'), id);
  }
});

test('no crafted item has a lower biome than its ingredients (except explicit exceptions)', () => {
  const compendium = readJson('data/items-compendium.json');
  const order = Object.fromEntries(readJson('data/biomes.json').map((b, i) => [b.id, b.tier ?? i + 1]));
  const byId = new Map(compendium.items.map((i) => [i.id, i]));
  const rank = (b) => order[b] ?? 0;
  // Items with an explicit biome (ITEM_EXPLICIT_BIOMES in build-items-data.mjs) and trader merchandise
  // may be lower than their materials.
  const source = readFileSync(path.join(ROOT, 'scripts/build-items-data.mjs'), 'utf8');
  const block = source.slice(source.indexOf('const ITEM_EXPLICIT_BIOMES = {'));
  const exceptions = new Set([...block.slice(0, block.indexOf('\n  };')).matchAll(/^\s*'?([a-z0-9-]+)'?:\s*'[a-z-]+'/gm)].map((m) => m[1]));
  assert.ok(exceptions.size > 50);
  const offenders = [];
  for (const item of compendium.items) {
    if (exceptions.has(item.id) || !item.recipe?.materials?.length) continue;
    for (const m of item.recipe.materials) {
      const mat = byId.get(m.item);
      if (mat?.biome && rank(mat.biome) > rank(item.biome) && item.sources.traders.length === 0) {
        offenders.push(`${item.id} (${item.biome}) < ${m.item} (${mat.biome})`);
      }
    }
  }
  assert.deepEqual(offenders.slice(0, 20), []);
});

test('ingredient biomes follow the wiki (coal, cones, axe heads, trader goods)', () => {
  const byId = new Map(readJson('data/items-compendium.json').items.map((i) => [i.id, i]));
  const expected = { coal: 'meadows', 'pine-cone': 'meadows', 'fir-cone': 'meadows', 'curious-axe-head': 'meadows', 'candle-wick': 'swamp', 'barrel-hoops': 'black-forest', 'ceramic-plate': 'mistlands', 'mysterious-rock': 'meadows', 'finewood-stack': 'black-forest' };
  for (const [id, biome] of Object.entries(expected)) assert.equal(byId.get(id).biome, biome, id);
});
