import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
const load = name => JSON.parse(readFileSync(new URL('../data/' + name + '.json', import.meta.url), 'utf8'));
export function buildExpeditionData() {
  const data = { events: load('events'), expedition: {
    bosses: load('expedition'),
    // Track only Expedition's additions; reuse the host recommendation bundles.
    items: Object.fromEntries(load('items').filter(i => i.addedBy === 'expedition').map(i => [i.id,i])),
    stations: load('stations').filter(s => s.id === 'galdr-table'),
  }, tips: load('expedition-tips') };
  const dest = new URL('../apps/expedition/data/data.js', import.meta.url);
  mkdirSync(new URL('../apps/expedition/data/', import.meta.url), { recursive: true });
  const text = 'window.VCX_DATA = ' + JSON.stringify(data, null, 2) + ';\n';
  if (!existsSync(dest) || readFileSync(dest, 'utf8') !== text) writeFileSync(dest, text);
  return data;
}
if (process.argv[1]?.endsWith('build-expedition-data.mjs')) buildExpeditionData();
