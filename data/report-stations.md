# Crafting, Processing & Smelting Stations Report

Source: valheim.weirdgloop.org (MediaWiki API). Extracted deterministically from station wikitext.

## Stations

| Station | Type | Sec / Item | Fuel | Fuel / Item | Input Capacity | Fuel Capacity |
|---|---|---|---|---|---|---|
| Smelter | smelting | 30s | Coal (15s) | 2 | 10 | 20 |
| Blast Furnace | smelting | 30s | Coal (15s) | 2 | 10 | 20 |
| Charcoal Kiln | kiln | 15s | None | — | 25 | — |
| Spinning Wheel | processing | 30s | None | — | 40 | — |

## Conversions by station

### Smelter
- **copper-ore** → **copper** (ratio 1:1)
- **copper-scrap** → **copper** (ratio 1:1)
- **tin-ore** → **tin** (ratio 1:1)
- **scrap-iron** → **iron** (ratio 1:1)
- **iron-ore** → **iron** (ratio 1:1)
- **silver-ore** → **silver** (ratio 1:1)
- **scrap-bronze** → **bronze** (ratio 1:1)

### Blast Furnace
- **black-metal-scrap** → **black-metal** (ratio 1:1)
- **flametal-ore** → **flametal** (ratio 1:1)
- **petrified-tissue** → **bloodgold** (ratio 1:1)

### Charcoal Kiln
- **wood** → **coal** (ratio 1:1)
- **finewood** → **coal** (ratio 1:1)
- **corewood** → **coal** (ratio 1:1)

### Spinning Wheel
- **flax** → **linen-thread** (ratio 1:1)

## Maximum crafting level by biome

| Station | Meadows | Black Forest | Ocean | Swamp | Mountain | Plains | Mistlands | Ashlands | Deep North | Max |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Workbench | 3 | 4 | 4 | 4 | 5 | 5 | 5 | 5 | 5 | 5 |
| Forge | — | 3 | 3 | 7 | 7 | 7 | 7 | 7 | 7 | 7 |
| Black Forge | — | — | — | — | — | — | 3 | 5 | 6 | 6 |
| Galdr Table | — | — | — | — | — | — | 3 | 4 | 5 | 5 |
| Cauldron | — | 2 | 2 | 2 | 3 | 4 | 5 | 6 | 7 | 7 |
| Artisan Table | — | — | — | — | 1 | 1 | 2 | 2 | 2 | 2 |

Levels count distinct extensions available by that biome; ties retain wiki table order.
Material biomes use items.json, falling back to items-compendium.json. Construction and manufactured-material station prerequisites are included.
Coal uses the existing wiki-verified Comfort acquisition override until the shared material correction in O-3.
Cauldron remains owned by fetch-provisions.mjs; its progression is calculated by the same cache-only module.

