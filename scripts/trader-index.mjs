// Which traders sell an item: item id -> [{ id, name }] from data/traders.json,
// in the order of traders.json. Used by the section generators (Smithy, Provisions)
// to add the optional `traders` field to items sold by a trader.
import { existsSync, readFileSync } from 'node:fs';

export function buildTraderIndex(tradersPath) {
  const index = new Map();
  if (!existsSync(tradersPath)) return index;
  for (const trader of JSON.parse(readFileSync(tradersPath, 'utf8')).traders ?? []) {
    for (const item of trader.items ?? []) {
      const list = index.get(item.id) ?? [];
      if (!list.some((t) => t.id === trader.id)) list.push({ id: trader.id, name: trader.name });
      index.set(item.id, list);
    }
  }
  return index;
}

// Returns the entry with `traders` added when someone sells it; otherwise the entry unchanged.
export function withTraders(entry, index) {
  const traders = index.get(entry.id);
  return traders ? { ...entry, traders: traders.map((t) => ({ ...t })) } : entry;
}
