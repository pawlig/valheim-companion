import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeStations, STATION_PAGES } from './fetch-stations.mjs';
import { slug } from './wikitext.mjs';

const rec = (id, extra = {}) => ({ id, name: id, type: 'processing', ...extra });

test('replaces matching records in place and keeps others in order', () => {
  const existing = [rec('a'), rec('smelter', { old: true }), rec('b'), rec('forge')];
  const fresh = [rec('smelter', { fresh: true }), rec('blast-furnace')];
  const out = mergeStations(existing, fresh);
  assert.deepEqual(out.map((s) => s.id), ['blast-furnace', 'a', 'smelter', 'b', 'forge']);
  assert.deepEqual(out[2], rec('smelter', { fresh: true }));
  assert.deepEqual(out[1], rec('a'));
  assert.deepEqual(out[4], rec('forge'));
});

test('empty existing yields only fresh records', () => {
  const fresh = [rec('smelter'), rec('blast-furnace')];
  assert.deepEqual(mergeStations([], fresh), fresh);
  assert.deepEqual(mergeStations(undefined, fresh), fresh);
  assert.deepEqual(mergeStations({ not: 'array' }, fresh), fresh);
});

test('missing fresh ids are inserted at the front in fresh order', () => {
  const existing = [rec('a'), rec('b')];
  const fresh = [rec('x'), rec('y')];
  const out = mergeStations(existing, fresh);
  assert.deepEqual(out.map((s) => s.id), ['x', 'y', 'a', 'b']);
});

test('merging the main stations.json with its own station records is a no-op', () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const main = JSON.parse(readFileSync(path.join(here, '..', '..', 'data', 'stations.json'), 'utf8'));
  const stationIds = new Set(STATION_PAGES.map((t) => slug(t)));
  const fresh = main.filter((s) => stationIds.has(s.id));
  assert.equal(fresh.length, STATION_PAGES.length);
  assert.deepEqual(mergeStations(main, fresh), main);
});
