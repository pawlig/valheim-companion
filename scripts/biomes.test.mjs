import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { BIOMES, biomeById, tierOf } from './wiki/biomes.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('biome order matches apps/damage-calculator/src/data/biomes.ts', () => {
  const tsContent = readFileSync(
    path.join(REPO_ROOT, 'apps', 'damage-calculator', 'src', 'data', 'biomes.ts'),
    'utf8'
  );
  const expectedIds = [...tsContent.matchAll(/id:\s*"([^"]+)"/g)].map((m) => m[1]);
  const actualIds = BIOMES.map((b) => b.id);
  assert.deepEqual(actualIds, expectedIds);
});

test('tierOf ocean is 3 and swamp is 4', () => {
  assert.equal(tierOf('ocean'), 3);
  assert.equal(tierOf('swamp'), 4);
  assert.equal(tierOf('meadows'), 1);
  assert.equal(tierOf('black-forest'), 2);
  assert.equal(tierOf('mountain'), 5);
  assert.equal(tierOf('plains'), 6);
  assert.equal(tierOf('mistlands'), 7);
  assert.equal(tierOf('ashlands'), 8);
  assert.equal(tierOf('deep-north'), 9);
});

test('biomeById returns matching biome object', () => {
  const ocean = biomeById('ocean');
  assert.equal(ocean?.id, 'ocean');
  assert.equal(ocean?.order, 3);
  assert.equal(ocean?.title, 'Ocean');
  assert.equal(biomeById('nonexistent'), null);
});
