// Pure enrichment from the Trophies, Taming and Events wiki tables.
// dropChance is a percentage; eatingRange is meters; tameTime is minutes.
import { cleanText, parseImage, parseLinks, parseList, parseWikiTables, slug } from './wikitext.mjs';

const links = value => parseLinks(value).filter(link => !/^(File|Image|Category):/i.test(link));
const withoutRefs = value => String(value ?? '').replace(/<ref\b[^>]*>[\s\S]*?<\/ref>/gi, '').replace(/<ref\b[^>]*\/>/gi, '');
const number = value => {
  const match = cleanText(withoutRefs(value)).match(/^(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
};
const headers = table => table.headers.map(header => cleanText(header).toLowerCase());

function cleanTrophyName(rawName) {
  if (!rawName) return null;
  const cleaned = String(rawName)
    .replace(/<!--.*?-->/g, '')
    .replace(/currently no trophy-->?/gi, '')
    .replace(/-->/g, '')
    .trim();
  if (!cleaned || /^none$/i.test(cleaned)) return null;
  return cleaned;
}

export function enrichCreatures(creatures, pages) {
  const byId = new Map(creatures.map(creature => [creature.id, creature]));
  const unmatched = [];
  const match = (target, source) => {
    const creature = byId.get(slug(target.split('#')[0]));
    if (!creature) unmatched.push(`${source}: [[${target}]]`);
    return creature;
  };
  for (const creature of creatures) {
    // An infobox trophy without a matching table row keeps unknown metadata.
    if (creature.trophy) {
      const name = creature.trophy.name ? cleanTrophyName(creature.trophy.name) : undefined;
      if (name === null) {
        creature.trophy = null;
      } else {
        creature.trophy = { ...creature.trophy, ...(name ? { name } : {}), dropChance: null, usage: [] };
      }
    }
    creature.taming = null;
    creature.raids = [];
  }

  for (const table of parseWikiTables(pages.Trophies ?? '')) {
    const columns = headers(table);
    if (!columns.includes('drop chance') || !columns.includes('usage')) continue;
    for (const row of table.rows) {
      const cell = row[columns.indexOf('trophy')] ?? '';
      const file = parseImage(cell);
      const primaryLinks = links(withoutRefs(cell));
      // The Dvergr row explicitly links the individual creatures in its note.
      const targets = links(cell).filter(target => byId.has(slug(target)));
      for (const target of primaryLinks) {
        if (!targets.includes(target)) match(target, 'Trophies');
      }
      for (const target of [...new Set(targets)]) {
        const creature = match(target, 'Trophies');
        if (!creature) continue;
        const rawName = file ? file.replace(/\.[^.]+$/, '') : creature.trophy?.name ?? `${creature.name} Trophy`;
        const name = cleanTrophyName(rawName);
        creature.trophy = name
          ? {
              name,
              image: creature.trophy?.image ?? null,
              dropChance: number(row[columns.indexOf('drop chance')]),
              usage: parseList(withoutRefs(row[columns.indexOf('usage')])),
            }
          : null;
      }
    }
  }

  for (const creature of creatures) {
    if (creature.trophy) {
      const name = cleanTrophyName(creature.trophy.name);
      if (!name) {
        creature.trophy = null;
      } else {
        creature.trophy.name = name;
      }
    }
  }

  const tameMinutes = (pages.Taming ?? '').match(/Taming always requires[^\n]*\((\d+(?:\.\d+)?) minutes\)/i)?.[1];
  for (const table of parseWikiTables(pages.Taming ?? '')) {
    const columns = headers(table);
    if (!columns.includes('required food') || !columns.includes('eating range')) continue;
    for (const row of table.rows) {
      for (const target of links(row[columns.indexOf('creature')])) {
        const creature = match(target, 'Taming');
        if (!creature) continue;
        creature.taming = {
          foods: [...new Set(links(row[columns.indexOf('required food')]))],
          eatingRange: number(row[columns.indexOf('eating range')]),
          ...(tameMinutes && creature.tameable ? { tameTime: Number(tameMinutes) } : {}),
        };
      }
    }
  }

  for (const row of eventRows(pages.Events ?? "")) {
    const raid = { event: cleanText(row.event), name: cleanText(row.start).replace(/^"|"$/g, ""),
      enabledBy: links(row.enabled), disabledBy: links(row.disabled), biomes: links(row.biomes) };
    for (const target of [...new Set(links(withoutRefs(row.creatures)))]) {
      const creature = match(target, `Events/${raid.event}`);
      if (creature) creature.raids.push({ ...raid });
    }
  }
  return [...new Set(unmatched)].sort();
}

// One Events table reader, retaining the legacy Bestiary table selection.
export function eventRows(wikitext, worldOnly = false) {
  const section = worldOnly ? String(wikitext).split(/=== World-based event requirements ===/i)[1]?.split(/\n===/)[0] ?? "" : wikitext;
  return parseWikiTables(section).flatMap(table => {
    const columns = headers(table);
    if (!columns.includes("creatures") || !columns.includes("event name")) return [];
    const cell = (row, name, fallback) => row[columns.indexOf(name)] ?? row[columns.indexOf(fallback)] ?? "";
    return table.rows.map(row => ({ event: cell(row, "event name"), start: cell(row, "start message"),
      end: cell(row, "end message"), creatures: cell(row, "creatures"),
      enabled: cell(row, "enabled by", "started by"), disabled: cell(row, "disabled by", "ended by"),
      biomes: cell(row, "biome(s)"), duration: cell(row, "duration (seconds)") }));
  });
}
