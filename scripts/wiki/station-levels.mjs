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
    // Hand-crafted Q1 ("Player crafting menu") is not a finishing station.
    ...(station && craftingStation && normalizedSource && normalizedSource !== station
      && !/player crafting menu|by hand/i.test(normalizedSource)
      ? { finishedAt: normalizedSource } : {}),
  };
}

// ---- VC-45c: availability of qualities (pure functions, no I/O) ----

const findStation = (stations, stationId) => stations.find((station) => station.id === stationId) ?? null;

export function stationIdByName(stations, name) {
  const wanted = String(name ?? '').trim().toLowerCase();
  return stations.find((station) => station.name.toLowerCase() === wanted)?.id ?? null;
}

// Highest level the station has in the game, or null for unknown stations.
export function maxLevel(stations, stationId) {
  return findStation(stations, stationId)?.maxLevel ?? null;
}

// Biome id where `level` of the station can first be reached; null above the
// station maximum (or for unknown stations / levels).
export function levelBiome(stations, stationId, level) {
  const station = findStation(stations, stationId);
  if (!station || !(level >= 1) || level > (station.maxLevel ?? 0)) return null;
  return (station.levels ?? []).find((entry) => entry.level === level)?.biome ?? null;
}

const orderMap = (biomeOrder) => {
  if (Array.isArray(biomeOrder)) return Object.fromEntries(biomeOrder.map((biome) => [biome.id, biome.order]));
  return biomeOrder;
};

// Earliest biome for every quality: the later of "all materials up to this
// quality" and "the biome where the required station level exists".
// `materialBiome(itemId)` must return a biome id and throw for unknown items.
// Returns [{ availableFrom, availableTier, unreachable? }] aligned with `levels`;
// qualities above the station maximum have null values and `unreachable: true`.
export function availableFrom(levels, stationId, materialBiome, stations, biomeOrder) {
  const order = orderMap(biomeOrder);
  const idOf = Object.fromEntries(Object.entries(order).map(([id, value]) => [value, id]));
  let materialOrder = 0;
  return levels.map((entry) => {
    for (const material of entry.materials ?? []) {
      const biome = materialBiome(material.item);
      if (!(biome in order)) throw new Error(`Unknown biome "${biome}" for material "${material.item}"`);
      materialOrder = Math.max(materialOrder, order[biome]);
    }
    const stationBiome = levelBiome(stations, stationId, entry.stationLevel);
    if (!stationBiome) return { availableFrom: null, availableTier: null, unreachable: true };
    const reached = Math.max(materialOrder, order[stationBiome]);
    return { availableFrom: idOf[reached], availableTier: reached };
  });
}

// Later of the given biome ids (by order); null entries are ignored.
export function latestBiome(biomeIds, biomeOrder) {
  const order = orderMap(biomeOrder);
  const known = biomeIds.filter((id) => id != null);
  if (!known.length) return null;
  return known.reduce((best, id) => (order[id] > order[best] ? id : best));
}

// Writes availableFrom / availableTier / unreachable onto every quality of a
// piece and returns the values for the piece itself (= quality 1). Pieces
// without a levelled station or without any recipe materials are left alone
// (trader / boss-drop / cosmetic items) and yield null.
export function annotateQualities(piece, { stations, materialBiome, biomeOrder }) {
  const levels = piece.levels ?? [];
  if (!piece.station || !levels.some((entry) => (entry.materials ?? []).length)) return null;
  const stationId = stationIdByName(stations, piece.station);
  if (!stationId) throw new Error(`Unknown crafting station "${piece.station}" on ${piece.name ?? piece.id}`);
  const result = availableFrom(levels, stationId, materialBiome, stations, biomeOrder);
  levels.forEach((entry, index) => {
    entry.availableFrom = result[index].availableFrom;
    entry.availableTier = result[index].availableTier;
    if (result[index].unreachable) entry.unreachable = true;
    else delete entry.unreachable;
  });
  return result[0];
}

// Item lookup used by the fetchers: biome of a material by item id, failing
// loudly (with the material's name) when items.json does not know it.
export function materialBiomeLookup(items) {
  const byId = new Map(items.map((item) => [item.id, item]));
  return (itemId) => {
    const item = byId.get(itemId);
    if (!item) throw new Error(`Material "${itemId}" is missing in data/items.json`);
    if (!item.biome) throw new Error(`Material "${item.name ?? itemId}" has no biome in data/items.json`);
    return item.biome;
  };
}
