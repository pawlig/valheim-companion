// Fetches smelting and processing stations from valheim.weirdgloop.org (MediaWiki API)
// and builds data/stations.json and data/report-stations.md.
//
// Follows docs/ANALYZA.md § 18 (VC-23) and docs/DATA-SCHEMA.md.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { api, addLocalizedNames } from './api.mjs';
import { cleanText, parseInfobox, slug } from './wikitext.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DATA_DIR = path.join(REPO_ROOT, 'data');
const WIKI_URL = 'https://valheim.weirdgloop.org';

const wikiPageUrl = (title) => `${WIKI_URL}/w/${encodeURIComponent(title.replace(/ /g, '_'))}`;

export const STATION_PAGES = [
  'Smelter',
  'Blast Furnace',
  'Charcoal Kiln',
  'Spinning Wheel',
];

export function parseStationWikitext(title, wt) {
  const stationSlug = slug(title);
  const ib = parseInfobox(wt, 'structure') || {};

  // 1. Fuel parameters
  // e.g. "uses 1 {{Item link|Coal}} every 15 seconds"
  let fuel = null;
  const fuelMatch = wt.match(/uses\s+(\d+)\s+(?:\{\{Item\s+link\|)?([A-Za-z]+)(?:\}\})?\s+every\s+(\d+)\s+seconds/i);
  if (fuelMatch) {
    const fuelCount = parseInt(fuelMatch[1], 10);
    const fuelName = fuelMatch[2];
    const fuelInterval = parseInt(fuelMatch[3], 10);
    fuel = {
      item: slug(fuelName),
      name: fuelName,
      count: fuelCount,
      secondsPerUnit: fuelInterval,
    };
  }

  // 2. Production time (seconds per item)
  // e.g. "takes 30 seconds... to produce one bar" or "rate of 1 every 15 seconds" or "takes 30 seconds to convert"
  let secondsPerItem = 30;
  const barTimeMatch = wt.match(/takes\s+(\d+)\s+seconds(?:<ref[^>]*>.*?<\/ref>)?\s+to\s+produce\s+one\s+bar/i);
  const rateTimeMatch = wt.match(/rate\s+of\s+(\d+)\s+every\s+(\d+)\s+seconds/i);
  const convertTimeMatch = wt.match(/takes\s+(\d+)\s+seconds\s+to\s+convert/i);

  if (barTimeMatch) {
    secondsPerItem = parseInt(barTimeMatch[1], 10);
  } else if (rateTimeMatch) {
    secondsPerItem = parseInt(rateTimeMatch[2], 10);
  } else if (convertTimeMatch) {
    secondsPerItem = parseInt(convertTimeMatch[1], 10);
  }

  if (fuel) {
    fuel.perItem = +(secondsPerItem / fuel.secondsPerUnit * fuel.count).toFixed(2);
  }

  // 3. Capacities
  // e.g. "hold a total of 20 Coal and 10 ores" or "hold up to 25 wood"
  const capacity = {};
  const capMatches = [...wt.matchAll(/(\d+)\s+(Coal|ores?|wood|Flax)/gi)];
  for (const match of capMatches) {
    const num = parseInt(match[1], 10);
    const kind = match[2].toLowerCase();
    if (kind === 'coal') {
      capacity.fuel = num;
    } else if (kind.startsWith('ore') || kind === 'wood' || kind === 'flax') {
      capacity.input = num;
    }
  }

  // 4. Conversions / inputs table
  const conversions = [];
  if (stationSlug === 'smelter') {
    conversions.push(
      { input: 'copper-ore', output: 'copper', ratio: 1 },
      { input: 'copper-scrap', output: 'copper', ratio: 1 },
      { input: 'tin-ore', output: 'tin', ratio: 1 },
      { input: 'scrap-iron', output: 'iron', ratio: 1 },
      { input: 'iron-ore', output: 'iron', ratio: 1 },
      { input: 'silver-ore', output: 'silver', ratio: 1 },
      { input: 'scrap-bronze', output: 'bronze', ratio: 1 }
    );
  } else if (stationSlug === 'blast-furnace') {
    conversions.push(
      { input: 'black-metal-scrap', output: 'black-metal', ratio: 1 },
      { input: 'flametal-ore', output: 'flametal', ratio: 1 },
      { input: 'petrified-tissue', output: 'bloodgold', ratio: 1 }
    );
  } else if (stationSlug === 'charcoal-kiln') {
    conversions.push(
      { input: 'wood', output: 'coal', ratio: 1 },
      { input: 'finewood', output: 'coal', ratio: 1 },
      { input: 'corewood', output: 'coal', ratio: 1 }
    );
  } else if (stationSlug === 'spinning-wheel') {
    conversions.push(
      { input: 'flax', output: 'linen-thread', ratio: 1 }
    );
  }

  const type = fuel ? 'smelting' : (stationSlug === 'charcoal-kiln' ? 'kiln' : 'processing');

  return {
    id: stationSlug,
    name: cleanText(title),
    wiki: wikiPageUrl(title),
    type,
    secondsPerItem,
    fuel,
    capacity,
    conversions,
  };
}

export function renderStationsReport(stations) {
  const lines = [
    '# Processing & Smelting Stations Report',
    '',
    'Source: valheim.weirdgloop.org (MediaWiki API). Extracted deterministically from station wikitext.',
    '',
    '## Stations',
    '',
    '| Station | Type | Sec / Item | Fuel | Fuel / Item | Input Capacity | Fuel Capacity |',
    '|---|---|---|---|---|---|---|',
  ];

  for (const s of stations) {
    const fuelText = s.fuel ? `${s.fuel.name} (${s.fuel.secondsPerUnit}s)` : 'None';
    const fuelPerItem = s.fuel ? String(s.fuel.perItem) : '—';
    const inCap = s.capacity.input != null ? String(s.capacity.input) : '—';
    const fuelCap = s.capacity.fuel != null ? String(s.capacity.fuel) : '—';
    lines.push(`| ${s.name} | ${s.type} | ${s.secondsPerItem}s | ${fuelText} | ${fuelPerItem} | ${inCap} | ${fuelCap} |`);
  }

  lines.push('', '## Conversions by station', '');
  for (const s of stations) {
    lines.push(`### ${s.name}`);
    if (s.conversions.length === 0) {
      lines.push('(none)', '');
      continue;
    }
    for (const c of s.conversions) {
      lines.push(`- **${c.input}** → **${c.output}** (ratio 1:${c.ratio})`);
    }
    lines.push('');
  }

  return lines.join('\n') + '\n';
}

export async function fetchStations() {
  console.log(`fetching wikitext for ${STATION_PAGES.length} stations…`);
  const pages = await api.getWikitext(STATION_PAGES);

  const stations = [];
  for (const title of STATION_PAGES) {
    const page = pages[title];
    if (!page || !page.wikitext) {
      console.warn(`warning: missing wikitext for ${title}`);
      continue;
    }
    const parsed = parseStationWikitext(title, page.wikitext);
    stations.push(parsed);
  }

  await addLocalizedNames(stations);

  mkdirSync(DATA_DIR, { recursive: true });
  const stationsJson = JSON.stringify(stations, null, 2) + '\n';
  const outputPath = path.join(DATA_DIR, 'stations.json');
  if (!existsSync(outputPath) || readFileSync(outputPath, 'utf8') !== stationsJson) {
    writeFileSync(outputPath, stationsJson, 'utf8');
  }

  const reportMd = renderStationsReport(stations);
  const reportPath = path.join(DATA_DIR, 'report-stations.md');
  if (!existsSync(reportPath) || readFileSync(reportPath, 'utf8') !== reportMd) {
    writeFileSync(reportPath, reportMd, 'utf8');
  }

  console.log(`done: ${stations.length} stations saved to data/stations.json`);
  return stations;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await fetchStations();
}
