import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { generatedAt } from './lib/generated-at.mjs';

test('generatedAt uses the source file commit timestamp', () => {
  const expected = execFileSync('git', ['log', '-1', '--format=%cI', '--', 'data/creatures.json'], {
    cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'),
    encoding: 'utf8',
  }).trim();

  assert.ok(expected);
  assert.equal(generatedAt('data/creatures.json', 'unused-output.js'), expected);
});

test('generatedAt reuses a timestamp from the output when the source has no commit', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'generated-at-'));
  const outputPath = path.join(directory, 'data.js');
  try {
    writeFileSync(outputPath, 'window.DATA = {"generatedAt": "2026-01-02T03:04:05.000Z"};\n');
    assert.equal(generatedAt('missing-source.json', outputPath), '2026-01-02T03:04:05.000Z');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('generatedAt uses the current ISO timestamp when source and output are unavailable', () => {
  const value = generatedAt('missing-source.json', path.join(tmpdir(), 'generated-at-no-output.js'));
  assert.match(value, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  assert.ok(Number.isFinite(Date.parse(value)));
});
