// Shared material tier and biome resolution logic.
// Baseline material table from docs/ANALYZA.md § 3.

import {
  cleanText,
  parseInfobox,
  parseLinks,
  parseMaterialList,
  parseTemplates,
} from './wikitext.mjs';

export const BIOMES = [
  { id: 'meadows', tier: 1 },
  { id: 'black-forest', tier: 2 },
  { id: 'swamp', tier: 3 },
  { id: 'ocean', tier: 3 },
  { id: 'mountain', tier: 4 },
  { id: 'plains', tier: 5 },
  { id: 'mistlands', tier: 6 },
  { id: 'ashlands', tier: 7 },
  { id: 'deep-north', tier: 8 },
];

export const DEFAULT_TIER_BY_BIOME = new Map(BIOMES.map((b) => [b.id, b.tier]));

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
  // tier 1
  Wood: { biome: 'meadows', tier: 1 },
  Stone: { biome: 'meadows', tier: 1 },
  Flint: { biome: 'meadows', tier: 1 },
  'Leather Scraps': { biome: 'meadows', tier: 1 },
  'Deer Hide': { biome: 'meadows', tier: 1 },
  Resin: { biome: 'meadows', tier: 1 },
  Feathers: { biome: 'meadows', tier: 1 },
  'Hard Antler': { biome: 'meadows', tier: 1 },
  Raspberries: { biome: 'meadows', tier: 1 },
  Honey: { biome: 'meadows', tier: 1 },
  // tier 2
  Copper: { biome: 'black-forest', tier: 2 },
  Tin: { biome: 'black-forest', tier: 2 },
  Bronze: { biome: 'black-forest', tier: 2 },
  'Bronze Nails': { biome: 'black-forest', tier: 2 },
  'Core Wood': { biome: 'black-forest', tier: 2 },
  Corewood: { biome: 'black-forest', tier: 2 },
  'Fine Wood': { biome: 'black-forest', tier: 2 },
  Finewood: { biome: 'black-forest', tier: 2 },
  'Bone Fragments': { biome: 'black-forest', tier: 2 },
  'Troll Hide': { biome: 'black-forest', tier: 2 },
  'Greydwarf Eye': { biome: 'black-forest', tier: 2 },
  'Surtling Core': { biome: 'black-forest', tier: 2 },
  'Ancient Seed': { biome: 'black-forest', tier: 2 },
  // tier 3
  Iron: { biome: 'swamp', tier: 3 },
  'Iron Nails': { biome: 'swamp', tier: 3 },
  'Ancient Bark': { biome: 'swamp', tier: 3 },
  'Elder Bark': { biome: 'swamp', tier: 3 },
  Guck: { biome: 'swamp', tier: 3 },
  Ooze: { biome: 'swamp', tier: 3 },
  Entrails: { biome: 'swamp', tier: 3 },
  Bloodbag: { biome: 'swamp', tier: 3 },
  Wishbone: { biome: 'swamp', tier: 3 },
  Root: { biome: 'swamp', tier: 3 },
  'Root (item)': { biome: 'swamp', tier: 3 },
  'Withered Bone': { biome: 'swamp', tier: 3 },
  // tier 3 ocean
  Chitin: { biome: 'ocean', tier: 3 },
  'Serpent Scale': { biome: 'ocean', tier: 3 },
  'Serpent Meat': { biome: 'ocean', tier: 3 },
  // tier 4
  Silver: { biome: 'mountain', tier: 4 },
  Obsidian: { biome: 'mountain', tier: 4 },
  'Wolf Fang': { biome: 'mountain', tier: 4 },
  'Wolf Pelt': { biome: 'mountain', tier: 4 },
  'Wolf Claw': { biome: 'mountain', tier: 4 },
  'Freeze Gland': { biome: 'mountain', tier: 4 },
  'Dragon Tear': { biome: 'mountain', tier: 4 },
  Crystal: { biome: 'mountain', tier: 4 },
  'Fenris Hair': { biome: 'mountain', tier: 4 },
  'Fenris Claw': { biome: 'mountain', tier: 4 },
  'Drake Trophy': { biome: 'mountain', tier: 4 },
  // tier 5
  'Black Metal': { biome: 'plains', tier: 5 },
  'Linen Thread': { biome: 'plains', tier: 5 },
  Linen: { biome: 'plains', tier: 5 },
  Flax: { biome: 'plains', tier: 5 },
  Needle: { biome: 'plains', tier: 5 },
  'Lox Pelt': { biome: 'plains', tier: 5 },
  Barley: { biome: 'plains', tier: 5 },
  Tar: { biome: 'plains', tier: 5 },
  'Torn Spirit': { biome: 'plains', tier: 5 },
  'Yagluth Thing': { biome: 'plains', tier: 5 },
  // tier 6
  Carapace: { biome: 'mistlands', tier: 6 },
  Eitr: { biome: 'mistlands', tier: 6 },
  'Refined Eitr': { biome: 'mistlands', tier: 6 },
  'Black Core': { biome: 'mistlands', tier: 6 },
  'Yggdrasil Wood': { biome: 'mistlands', tier: 6 },
  Mandible: { biome: 'mistlands', tier: 6 },
  Bilebag: { biome: 'mistlands', tier: 6 },
  'Black Marble': { biome: 'mistlands', tier: 6 },
  Jade: { biome: 'mistlands', tier: 6 },
  Sap: { biome: 'mistlands', tier: 6 },
  'Royal Jelly': { biome: 'mistlands', tier: 6 },
  Iolite: { biome: 'mistlands', tier: 6 },
  'Dvergr Extractor': { biome: 'mistlands', tier: 6 },
  'Scale Hide': { biome: 'mistlands', tier: 6 },
  // tier 7
  Flametal: { biome: 'ashlands', tier: 7 },
  'Flametal Ore': { biome: 'ashlands', tier: 7 },
  'Charred Bone': { biome: 'ashlands', tier: 7 },
  Grausten: { biome: 'ashlands', tier: 7 },
  Ashwood: { biome: 'ashlands', tier: 7 },
  'Asksvin Hide': { biome: 'ashlands', tier: 7 },
  'Morgen Sinew': { biome: 'ashlands', tier: 7 },
  'Morgen Heart': { biome: 'ashlands', tier: 7 },
  'Bonemaw Tooth': { biome: 'ashlands', tier: 7 },
  'Celestial Feather': { biome: 'ashlands', tier: 7 },
  Proustite: { biome: 'ashlands', tier: 7 },
  'Proustite Powder': { biome: 'ashlands', tier: 7 },
  'Sulfur Stone': { biome: 'ashlands', tier: 7 },
  Sulfur: { biome: 'ashlands', tier: 7 },
  'Molten Core': { biome: 'ashlands', tier: 7 },
  'Fader Drop': { biome: 'ashlands', tier: 7 },
  'Charred Cogwheel': { biome: 'ashlands', tier: 7 },
  'Bell Fragment': { biome: 'ashlands', tier: 7 },
  'Ceramic Plate': { biome: 'ashlands', tier: 7 },
  // tier 8
  Frostcore: { biome: 'deep-north', tier: 8 },
  Timberwood: { biome: 'deep-north', tier: 8 },
  'Moose Hide': { biome: 'deep-north', tier: 8 },
  'Moose Sinew': { biome: 'deep-north', tier: 8 },
  'Petrified Tissue': { biome: 'deep-north', tier: 8 },
  'Luminous Larva': { biome: 'deep-north', tier: 8 },
  Ice: { biome: 'deep-north', tier: 8 },
};

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
      const res = { name, biome: 'swamp', tier: 3, how: 'wiki', note: 'purchased from Haldor after The Elder' };
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
