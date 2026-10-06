// Shared material tier and biome resolution logic.
// Baseline material table from docs/ANALYZA.md § 3.

import { BIOMES, tierOf } from './biomes.mjs';
import {
  cleanText,
  parseInfobox,
  parseLinks,
  parseMaterialList,
  parseTemplates,
} from './wikitext.mjs';

export { BIOMES, tierOf };

export const DEFAULT_TIER_BY_BIOME = new Map(BIOMES.map((b) => [b.id, tierOf(b.id)]));

export const BIOME_KEYWORDS = [
  ['deep north', 'deep-north'],
  ['ashlands', 'ashlands'],
  ['mistlands', 'mistlands'],
  ['plains', 'plains'],
  ['mountains', 'mountain'],
  ['mountain', 'mountain'],
  ['swamp', 'swamp'],
  ['ocean', 'ocean'],
  ['black forest', 'black-forest'],
  ['meadows', 'meadows'],
];

// Baseline material table from docs/ANALYZA.md § 3
export const BASE_MATERIAL_TABLE = {
  // meadows
  Wood: { biome: 'meadows' },
  Stone: { biome: 'meadows' },
  Flint: { biome: 'meadows' },
  'Leather Scraps': { biome: 'meadows' },
  'Deer Hide': { biome: 'meadows' },
  Resin: { biome: 'meadows' },
  Feathers: { biome: 'meadows' },
  'Hard Antler': { biome: 'meadows' },
  Raspberries: { biome: 'meadows' },
  Honey: { biome: 'meadows' },
  // black-forest
  Copper: { biome: 'black-forest' },
  Tin: { biome: 'black-forest' },
  Bronze: { biome: 'black-forest' },
  'Bronze Nails': { biome: 'black-forest' },
  'Core Wood': { biome: 'black-forest' },
  Corewood: { biome: 'black-forest' },
  'Fine Wood': { biome: 'black-forest' },
  Finewood: { biome: 'black-forest' },
  'Bone Fragments': { biome: 'black-forest' },
  'Troll Hide': { biome: 'black-forest' },
  'Greydwarf Eye': { biome: 'black-forest' },
  'Surtling Core': { biome: 'black-forest' },
  'Ancient Seed': { biome: 'black-forest' },
  // ocean
  Chitin: { biome: 'ocean' },
  'Serpent Scale': { biome: 'ocean' },
  'Serpent Meat': { biome: 'ocean' },
  // swamp
  Iron: { biome: 'swamp' },
  'Iron Nails': { biome: 'swamp' },
  'Ancient Bark': { biome: 'swamp' },
  'Elder Bark': { biome: 'swamp' },
  Guck: { biome: 'swamp' },
  Ooze: { biome: 'swamp' },
  Entrails: { biome: 'swamp' },
  Bloodbag: { biome: 'swamp' },
  Wishbone: { biome: 'swamp' },
  Root: { biome: 'swamp' },
  'Root (item)': { biome: 'swamp' },
  'Withered Bone': { biome: 'swamp' },
  // mountain
  Silver: { biome: 'mountain' },
  Obsidian: { biome: 'mountain' },
  'Wolf Fang': { biome: 'mountain' },
  'Wolf Pelt': { biome: 'mountain' },
  'Wolf Claw': { biome: 'mountain' },
  'Freeze Gland': { biome: 'mountain' },
  'Dragon Tear': { biome: 'mountain' },
  Crystal: { biome: 'mountain' },
  'Fenris Hair': { biome: 'mountain' },
  'Fenris Claw': { biome: 'mountain' },
  'Drake Trophy': { biome: 'mountain' },
  // plains
  'Black Metal': { biome: 'plains' },
  'Linen Thread': { biome: 'plains' },
  Linen: { biome: 'plains' },
  Flax: { biome: 'plains' },
  Needle: { biome: 'plains' },
  'Lox Pelt': { biome: 'plains' },
  Barley: { biome: 'plains' },
  Tar: { biome: 'plains' },
  'Torn Spirit': { biome: 'plains' },
  'Yagluth Thing': { biome: 'plains' },
  // mistlands
  Carapace: { biome: 'mistlands' },
  Eitr: { biome: 'mistlands' },
  'Refined Eitr': { biome: 'mistlands' },
  'Black Core': { biome: 'mistlands' },
  'Yggdrasil Wood': { biome: 'mistlands' },
  Mandible: { biome: 'mistlands' },
  Bilebag: { biome: 'mistlands' },
  'Black Marble': { biome: 'mistlands' },
  Jade: { biome: 'mistlands' },
  Sap: { biome: 'mistlands' },
  'Royal Jelly': { biome: 'mistlands' },
  Iolite: { biome: 'mistlands' },
  'Dvergr Extractor': { biome: 'mistlands' },
  'Scale Hide': { biome: 'mistlands' },
  // ashlands
  Flametal: { biome: 'ashlands' },
  'Flametal Ore': { biome: 'ashlands' },
  'Charred Bone': { biome: 'ashlands' },
  Grausten: { biome: 'ashlands' },
  Ashwood: { biome: 'ashlands' },
  'Asksvin Hide': { biome: 'ashlands' },
  'Morgen Sinew': { biome: 'ashlands' },
  'Morgen Heart': { biome: 'ashlands' },
  'Bonemaw Tooth': { biome: 'ashlands' },
  'Celestial Feather': { biome: 'ashlands' },
  Proustite: { biome: 'ashlands' },
  'Proustite Powder': { biome: 'ashlands' },
  'Sulfur Stone': { biome: 'ashlands' },
  Sulfur: { biome: 'ashlands' },
  'Molten Core': { biome: 'ashlands' },
  'Fader Drop': { biome: 'ashlands' },
  'Charred Cogwheel': { biome: 'ashlands' },
  'Bell Fragment': { biome: 'ashlands' },
  'Ceramic Plate': { biome: 'ashlands' },
  // deep-north
  Frostcore: { biome: 'deep-north' },
  Timberwood: { biome: 'deep-north' },
  'Moose Hide': { biome: 'deep-north' },
  'Moose Sinew': { biome: 'deep-north' },
  'Petrified Tissue': { biome: 'deep-north' },
  'Luminous Larva': { biome: 'deep-north' },
  Ice: { biome: 'deep-north' },
};

for (const entry of Object.values(BASE_MATERIAL_TABLE)) {
  entry.tier = tierOf(entry.biome);
}

export function createMaterialResolver({
  overrides = {},
  creatures = [],
  creatureByName = null,
  tierByBiome = DEFAULT_TIER_BY_BIOME,
  allPages = {},
  parseRecipe = parseMaterialList,
}) {
  const cMap = creatureByName ?? new Map(creatures.map((c) => [c.name.toLowerCase(), c]));
  const tMap = tierByBiome ?? DEFAULT_TIER_BY_BIOME;
  const materialCache = new Map();

  function resolveMaterial(name, depth = 0) {
    if (materialCache.has(name)) return materialCache.get(name);

    // Overrides have absolute precedence
    const override = overrides?.materials?.[name];
    if (override) {
      const res = { name, biome: override.biome, tier: override.tier, how: 'override', note: override.reason ?? 'overrides.json' };
      materialCache.set(name, res);
      return res;
    }

    // Baseline constant table
    if (BASE_MATERIAL_TABLE[name]) {
      const res = { name, biome: BASE_MATERIAL_TABLE[name].biome, tier: BASE_MATERIAL_TABLE[name].tier, how: 'table' };
      materialCache.set(name, res);
      return res;
    }

    // Trophy check
    const trophyMatch = name.match(/^(.+?)\s+Trophy$/i);
    if (trophyMatch) {
      const c = cMap.get(trophyMatch[1].toLowerCase());
      if (c && c.biomes[0]) {
        const b = c.biomes[0];
        const res = { name, biome: b, tier: tMap.get(b), how: 'wiki', note: `drops from creature ${c.name}` };
        materialCache.set(name, res);
        return res;
      }
    }

    // Haldor special for Ymir Flesh if not in overrides
    if (name.toLowerCase() === 'ymir flesh') {
      const res = { name, biome: 'swamp', tier: tierOf('swamp'), how: 'wiki', note: 'purchased from Haldor after The Elder' };
      materialCache.set(name, res);
      return res;
    }

    const page = allPages[name];
    if (!page || !page.wikitext) {
      const res = { name, biome: null, tier: null, how: 'unresolved', note: 'missing wiki page' };
      materialCache.set(name, res);
      return res;
    }
    const wt = page.wikitext;

    // Find best matching infobox (handling multi-tabbers like Early Axes or Nord weapons)
    const allIb = [
      ...parseTemplates(wt, 'infobox item'),
      ...parseTemplates(wt, 'infobox weapon'),
      ...parseTemplates(wt, 'infobox material'),
      ...parseTemplates(wt, 'infobox structure'),
    ];
    let ib = allIb[0] ?? null;
    for (const cand of allIb) {
      if (cand.title && cleanText(cand.title).toLowerCase().includes(name.toLowerCase())) {
        ib = cand;
        break;
      }
    }

    // Recursive sub-materials check (depth <= 3)
    const matField = ib?.['materials 1'] ?? ib?.['materials'];
    if (matField && depth < 3) {
      const subMats = parseRecipe(matField);
      if (subMats.length > 0) {
        let maxTier = -1;
        let maxBiome = null;
        let hasUnresolved = false;
        for (const sm of subMats) {
          if (sm.name.toLowerCase().includes('mould') || sm.name.toLowerCase() === name.toLowerCase()) continue;
          if (sm.name.toLowerCase().includes('fragment') && name.toLowerCase().includes('fragment')) continue;
          const resolved = resolveMaterial(sm.name, depth + 1);
          if (resolved.tier == null) hasUnresolved = true;
          else if (resolved.tier > maxTier) {
            maxTier = resolved.tier;
            maxBiome = resolved.biome;
          }
        }
        if (!hasUnresolved && maxTier > 0) {
          const res = { name, biome: maxBiome, tier: maxTier, how: 'wiki', note: `crafted from ${subMats.map((s) => s.name).join(', ')}` };
          materialCache.set(name, res);
          return res;
        }
      }
    }

    // Check infobox fields: biome, location, source, drops from
    if (ib) {
      const checkFields = [ib.biome, ib.location, ib.source, ib['drops from']].filter(Boolean);
      const checkText = checkFields.join(' ');
      const links = parseLinks(checkText);
      for (const link of links) {
        const c = cMap.get(link.toLowerCase());
        if (c && c.biomes[0]) {
          const b = c.biomes[0];
          const res = { name, biome: b, tier: tMap.get(b), how: 'wiki', note: `linked creature ${c.name}` };
          materialCache.set(name, res);
          return res;
        }
        if (allPages[link]?.wikitext) {
          const structIb = parseInfobox(allPages[link].wikitext, 'location') || parseInfobox(allPages[link].wikitext, 'structure');
          if (structIb) {
            const locText = [structIb.location, structIb.biome].filter(Boolean).join(' ');
            for (const [bName, bId] of BIOME_KEYWORDS) {
              if (locText.toLowerCase().includes(bName)) {
                const res = { name, biome: bId, tier: tMap.get(bId), how: 'wiki', note: `found in ${link} (${bName})` };
                materialCache.set(name, res);
                return res;
              }
            }
            if (structIb.materials && depth < 3) {
              const structMats = parseRecipe(structIb.materials);
              let sMaxTier = -1;
              let sMaxBiome = null;
              for (const sm of structMats) {
                const resSm = resolveMaterial(sm.name, depth + 1);
                if (resSm.tier != null && resSm.tier > sMaxTier) {
                  sMaxTier = resSm.tier;
                  sMaxBiome = resSm.biome;
                }
              }
              if (sMaxTier > 0) {
                const res = {
                  name,
                  biome: sMaxBiome,
                  tier: sMaxTier,
                  how: 'wiki',
                  note: `structure ${link} built from ${structMats.map((s) => s.name).join(', ')}`,
                };
                materialCache.set(name, res);
                return res;
              }
            }
          }
        }
      }
      for (const [bName, bId] of BIOME_KEYWORDS) {
        if (checkText.toLowerCase().includes(bName)) {
          const res = { name, biome: bId, tier: tMap.get(bId), how: 'wiki', note: `mentioned biome ${bName}` };
          materialCache.set(name, res);
          return res;
        }
      }
    }

    // Lead text check
    const lead = wt.slice(0, 5000);
    const leadLinks = parseLinks(lead);
    for (const link of leadLinks) {
      const c = cMap.get(link.toLowerCase());
      if (c && c.biomes[0]) {
        const b = c.biomes[0];
        const res = { name, biome: b, tier: tMap.get(b), how: 'wiki', note: `lead mentioned creature ${c.name}` };
        materialCache.set(name, res);
        return res;
      }
    }
    for (const [bName, bId] of BIOME_KEYWORDS) {
      if (lead.toLowerCase().includes(bName)) {
        const res = { name, biome: bId, tier: tMap.get(bId), how: 'wiki', note: `lead mentioned biome ${bName}` };
        materialCache.set(name, res);
        return res;
      }
    }

    const res = { name, biome: null, tier: null, how: 'unresolved', note: 'could not determine biome' };
    materialCache.set(name, res);
    return res;
  }

  resolveMaterial.cache = materialCache;
  return resolveMaterial;
}
