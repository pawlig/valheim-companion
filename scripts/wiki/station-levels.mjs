import { cleanText } from './wikitext.mjs';

// Upgrade rows describe the crafting station, even when the infobox names
// the foundry that hardens the finished item.
export function parseUpgradeStation(wikitext) {
  const row = String(wikitext ?? '').match(/\{\{\s*Upgrade station row\s*\|([^}]+)\}\}/i);
  if (!row) return null;
  const [station, , ...options] = row[1].split('|').map((part) => part.trim());
  const start = options.find((part) => /^start\s*=/i.test(part));
  return { station, level: start ? Number(start.split('=')[1].trim()) : 1 };
}

// Read station headers, never numeric table cells (weight and durability are
// also numbers). Slot qualifiers distinguish head, chest/legs and cape.
export function parseArmorQualityStations(wikitext, slot) {
  const text = String(wikitext ?? '');
  const headings = [...text.matchAll(/={2,4}\s*Quality\s*(\d+)\s*={2,4}/gi)];
  const result = new Map();
  for (let i = 0; i < headings.length; i++) {
    const heading = headings[i];
    const section = text.slice(heading.index + heading[0].length, headings[i + 1]?.index ?? text.length)
      .split(/\{\||(?:^|\n)={2,4}[^=\n]+={2,4}/)[0]
      .replace(/<[^>]*>/g, '');
    const rows = [...section.matchAll(/(Workbench|Black Forge|Forge|Galdr Table|Artisan Table|Frost Foundry|Station)\s+level:\s*(\d+)[^\S\n]*(?:\(([^)]+)\))?/gi)];
    const matching = rows.find((row) => row[3]?.toLowerCase().split('/').includes(slot))
      ?? rows.find((row) => !row[3] || row[3].toLowerCase() === 'cast');
    if (matching) result.set(Number(heading[1]), { station: matching[1], level: Number(matching[2]) });
  }
  return result;
}

export function resolveCraftingStation(source, craftingStation, stationNames) {
  const sourceName = cleanText(source ?? '').split(',')[0].trim();
  const canonical = (name) => stationNames.find((station) => station.toLowerCase() === cleanText(name ?? '').trim().toLowerCase()) ?? null;
  const station = canonical(craftingStation) ?? canonical(sourceName);
  const normalizedSource = canonical(sourceName) ?? sourceName;
  return {
    station,
    ...(station && craftingStation && normalizedSource && normalizedSource !== station
      ? { finishedAt: normalizedSource } : {}),
  };
}
