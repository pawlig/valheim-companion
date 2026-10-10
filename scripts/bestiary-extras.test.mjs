import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import '../apps/bestiary/assets/extras.js';
import { buildDataBundle } from './build-data.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('raids hide locked bosses, including multi-condition raids, and react to reveal', () => {
  const creatures = {
    moder: { name: 'Moder', kind: 'boss', biomes: ['mountain'] },
    elder: { name: 'The Elder', kind: 'boss', biomes: ['black-forest'] },
    troll: { name: 'Troll', kind: 'hostile', biomes: ['black-forest'] },
  };
  const { raidIsHidden } = globalThis.VCExtras;
  assert.equal(raidIsHidden({ enabledBy: ['Moder'] }, creatures, new Set(['plains'])), true);
  assert.equal(raidIsHidden({ enabledBy: ['Moder'] }, creatures, new Set(['mountain'])), false);
  assert.equal(raidIsHidden({ enabledBy: ['Troll', 'The Elder'] }, creatures, new Set()), true);
  assert.equal(raidIsHidden({ enabledBy: ['Troll'] }, creatures, new Set()), false);
  assert.equal(raidIsHidden({ enabledBy: [] }, creatures, new Set()), false);
});

test('profile links round-trip with Unicode and URL-safe base64', () => {
  const player = { skills: { axes: 37, bows: 82 }, difficulty: 'hard', quality: 'max', players: 3,
    sets: ['root'], sneak: true, staggered: false, rankBy: 'hit', note: 'Čeština العربية 日本語' };
  const encoded = globalThis.VCExtras.encodeProfile(player);
  assert.match(encoded, /^[A-Za-z0-9_-]+$/);
  assert.deepEqual(globalThis.VCExtras.decodeProfile(encoded), player);
  const params = new URLSearchParams('player=' + encoded + '&c=troll');
  assert.deepEqual(globalThis.VCExtras.decodeProfile(params.get('player')), player);
  assert.equal(params.get('c'), 'troll');
});

test('profile import rejects malformed, oversized and unsupported payloads', () => {
  const { decodeProfile } = globalThis.VCExtras;
  for (const value of ['', '!', 'x'.repeat(8193), 'a', btoa('{}'), btoa('null'), btoa('[]'),
    btoa('{"version":2,"player":{"skills":{"axes":50}}}'),
    btoa('{"version":1,"player":{"skills":[]}}'),
    btoa('{"version":1,"player":{"skills":{"axes":"wrong"}}}'), '_w']) {
    assert.throws(() => decodeProfile(value));
  }
});

test('creature links prefer an open biome and otherwise the earliest biome', () => {
  const biomes = [{ id: 'swamp', order: 4 }, { id: 'black-forest', order: 2 }, { id: 'plains', order: 6 }];
  const creature = { biomes: ['swamp', 'black-forest'] };
  const { creatureBiome } = globalThis.VCExtras;
  assert.equal(creatureBiome(creature, biomes, new Set()).id, 'black-forest');
  assert.equal(creatureBiome(creature, biomes, new Set(['swamp'])).id, 'swamp');
  assert.equal(creatureBiome({ biomes: [] }, biomes, new Set()), null);
});

test('bestiary item links point only to existing compendium items and power drops have null itemId', () => {
  const compendium = JSON.parse(readFileSync(path.join(REPO_ROOT, 'data', 'items-compendium.json'), 'utf8'));
  const compendiumIds = new Set(compendium.items.map(i => i.id));
  const creaturesData = JSON.parse(readFileSync(path.join(REPO_ROOT, 'data', 'creatures.json'), 'utf8'));

  // Žádný drop ani trofej nemá v názvu -->
  for (const c of creaturesData) {
    for (const d of (c.drops ?? [])) {
      assert.equal(d.includes('-->'), false, `creature ${c.id} drop contains -->: ${d}`);
    }
    if (c.trophy?.name) {
      assert.equal(c.trophy.name.includes('-->'), false, `creature ${c.id} trophy contains -->: ${c.trophy.name}`);
    }
  }

  const bundle = buildDataBundle();
  const bundleCreatures = Object.values(bundle.creatures);

  let verifiedDrops = 0;
  let verifiedTrophies = 0;
  for (const c of bundleCreatures) {
    for (const d of (c.dropLinks ?? [])) {
      if (d.itemId !== null && d.itemId !== undefined) {
        assert.ok(compendiumIds.has(d.itemId), `creature ${c.id} drop item ${d.name} resolved to unknown id ${d.itemId}`);
        verifiedDrops++;
      }
    }
    if (c.trophy?.name && c.trophy.itemId !== null && c.trophy.itemId !== undefined) {
      assert.ok(compendiumIds.has(c.trophy.itemId), `creature ${c.id} trophy ${c.trophy.name} resolved to unknown id ${c.trophy.itemId}`);
      verifiedTrophies++;
    }
  }
  assert.ok(verifiedDrops > 0, 'at least one drop itemId verified');
  assert.ok(verifiedTrophies > 0, 'at least one trophy itemId verified');

  // „Eikthyr Power" (pokud je v drops) má itemId: null
  const eikthyr = bundleCreatures.find(c => c.id === 'eikthyr');
  assert.ok(eikthyr, 'eikthyr exists');
  const eikthyrPower = eikthyr.dropLinks?.find(d => d.name === 'Eikthyr Power');
  assert.ok(eikthyrPower, 'eikthyr has Eikthyr Power drop');
  assert.equal(eikthyrPower.itemId, null, 'Eikthyr Power must have itemId: null');

  // Žádný drop s Power nemá itemId
  for (const c of bundleCreatures) {
    for (const d of (c.dropLinks ?? [])) {
      if (d.name.endsWith(' Power')) {
        assert.equal(d.itemId, null, `${c.id} drop ${d.name} must have itemId: null`);
      }
    }
  }
});
