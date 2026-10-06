# VC-7 Armourer Report

Source: valheim.weirdgloop.org (MediaWiki API). No dates on purpose: the report must be byte-identical on re-runs from cache.

## Summary

- Total armor sets/entries: 68
- Total armor pieces: 113
- Total items/materials: 191

## Biome breakdown

| Biome | Sets/Entries | Pieces |
|---|---|---|
| meadows | 1 | 2 |
| black-forest | 5 | 15 |
| ocean | 0 | 0 |
| swamp | 2 | 6 |
| mountain | 2 | 7 |
| plains | 3 | 11 |
| mistlands | 2 | 7 |
| ashlands | 5 | 11 |
| deep-north | 7 | 13 |
| (cosmetic / unresolved) | 5 | 5 |

## Pieces with estimated armor (armorSource: estimate)

None. All pieces with quality upgrades found in quality tables.

## Materials without source or biome

- **Curious Axe Head** (sources: 1, biome: null)
- **Frostfire Essence** (sources: 0, biome: deep-north)
- **Mysterious Axe Head** (sources: 1, biome: null)
- **Thunderblood Essence** (sources: 0, biome: deep-north)
- **Wisp** (sources: 1, biome: null)

## Skipped pages

- **Armor**: rozcestník (disambiguation page)
- **CAPE TEST**: testovací stránka (CAPE TEST)
- **Deer Hide Cape**: duplikát dílu již obsaženého v setu
- **Feather Cape**: duplikát dílu již obsaženého v setu
- **Linen Cape**: duplikát dílu již obsaženého v setu
- **Lox Cape**: duplikát dílu již obsaženého v setu
- **Odin Set**: stránka bez {{infobox armor}}
- **Troll Hide Cape**: duplikát dílu již obsaženého v setu
- **Wolf Fur Cape**: duplikát dílu již obsaženého v setu

## Non-teleportable items

- **Black Metal** (id: black-metal)
- **Black Metal Scrap** (id: black-metal-scrap)
- **Bloodgold** (id: bloodgold)
- **Bronze** (id: bronze)
- **Copper** (id: copper)
- **Copper Ore** (id: copper-ore)
- **Flametal** (id: flametal)
- **Flametal Ore** (id: flametal-ore)
- **Iron** (id: iron)
- **Petrified Tissue** (id: petrified-tissue)
- **Scrap Iron** (id: scrap-iron)
- **Silver** (id: silver)
- **Silver Ore** (id: silver-ore)
- **Tin** (id: tin)
- **Tin Ore** (id: tin-ore)

## Open questions

- Cosmetic items from Hildir / Haldor have no crafting materials or levels (`levels: []`, `biome: null`, `tier: null`).
- DLC and seasonal armor pieces (Cape of Oden, Hood of Oden, Pointy Hat, Midsummer Crown) have `kind: "special"` and `tag: "DLC"` / `"Halloween"` / `"Midsummer"`, and are shown in their own section.
- Pieces with no crafting materials whose source is not an NPC (Crown of Roots) have `kind: "special"` and `tag: "Not craftable"`: one quality level, no materials, no Add button in the Armourer.
- Pieces like Troll Hide Cape, Deer Hide Cape, Wolf Fur Cape, Feather Cape exist both as standalone wiki pages and as set pieces. Standalone duplicates are omitted to preserve set integrity.
