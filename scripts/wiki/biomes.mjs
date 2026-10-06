// Single source of truth for biome progression order and tiers.
// Follows docs/ANALYZA.md § 14 and matches apps/damage-calculator/src/data/biomes.ts.

export const BIOMES = [
  { id: 'meadows', title: 'Meadows', order: 1 },
  { id: 'black-forest', title: 'Black Forest', order: 2 },
  { id: 'ocean', title: 'Ocean', order: 3 },
  { id: 'swamp', title: 'Swamp', order: 4 },
  { id: 'mountain', title: 'Mountain', order: 5 },
  { id: 'plains', title: 'Plains', order: 6 },
  { id: 'mistlands', title: 'Mistlands', order: 7 },
  { id: 'ashlands', title: 'Ashlands', order: 8 },
  { id: 'deep-north', title: 'Deep North', order: 9 },
];

for (const b of BIOMES) {
  Object.defineProperty(b, 'tier', {
    get() {
      return this.order;
    },
    enumerable: true,
  });
}

const byId = new Map(BIOMES.map((b) => [b.id, b]));

export function biomeById(id) {
  return byId.get(id) ?? null;
}

export function tierOf(biomeId) {
  if (!biomeId) return null;
  const id = typeof biomeId === 'object' ? biomeId.id : biomeId;
  const b = byId.get(id);
  return b ? b.order : null;
}
