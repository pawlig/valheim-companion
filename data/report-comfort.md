# Comfort data report

Source: cached MediaWiki API, https://valheim.weirdgloop.org/w/Comfort.

Pieces: 76; categories: 11; seasonal: 6.

## Categories

| Category | Pieces |
|---|---:|
| Fire | 7 |
| Rug | 11 |
| Table | 6 |
| Chair | 14 |
| Bed | 3 |
| Banner | 14 |
| Plants | 5 |
| Stands | 3 |
| Bathroom | 2 |
| Lights | 5 |
| Ashlands | 4 |
| No category | 2 |

## Biomes and maximum (sheltered, no seasonal items)

| Biome | Pieces unlocked here | Computed | Wiki | Difference |
|---|---:|---:|---:|---:|
| Meadows | 4 | 5 | 5 | 0 |
| Black Forest | 19 | 13 | 13 | 0 |
| Ocean | 0 | 13 | 13 | 0 |
| Swamp | 8 | 15 | 15 | 0 |
| Mountain | 9 | 17 | 17 | 0 |
| Plains | 10 | 19 | 19 | 0 |
| Mistlands | 9 | 20 | 20 | 0 |
| Ashlands | 9 | 22 | 22 | 0 |
| Deep North | 6 | 22 | 22 | 0 |

## Missing data

- Without recipe: Carved Chair, Moose Hide Carpet.
- Without tier: Carved Chair, Moose Hide Carpet.
- Missing images: Armor Stand.

## Table / infobox differences

- None among explicit infobox values.

## Comfort-only material overrides

- Barber Kit: meadows, tier 1. Barber Kit and Hildir wiki: always available from Hildir in Meadows. Barber Station still needs Black Forest Finewood and Bronze Nails.
- Iron Pit: meadows, tier 1. Iron Pit and Hildir wiki: always available from Hildir in Meadows.
- Charcoal Resin: ashlands, tier 8. Charcoal Resin drops from Scorched Tree; its wiki lists Ashlands.
- Pot Shard: ashlands, tier 8. Pot Shard wiki: Ancient Pots inside Putrid Holes or Charred Ruins in Ashlands.
- Fir Cone: black-forest, tier 2. Comfort wiki maximum section: both Maypole and Yule Tree require visiting Black Forest. Fir Cone lists growing biomes, not the earliest natural acquisition; use the early Fir route.
- Pine Cone: black-forest, tier 2. Pine wiki: naturally found in Black Forest. Growing biomes in the seed infobox do not determine acquisition tier.
- Turnip: swamp, tier 4. Turnip wiki: seeds first found in Swamp. Preserve the existing Provisions item record and use its actual acquisition tier for Jack-O-Turnip.

## Recipe fallbacks

- Deer Rug: group table.
- Hare Rug: group table.
- Asksvin Rug: group table.
- Straw: group table.
- Red Jute Carpet: group table.
- Blue Jute Carpet: group table.
- Bearskin Rug: group table.
- Wolf Rug: group table.
- Lox Rug: group table.
- Moose Hide Carpet: missing.
- Table: group table.
- Black Marble Table: group table.
- Round Table: group table.
- Long Heavy Table: group table.
- Bench: group table.
- Sitting Log: group table.
- Stool: group table.
- Black Marble Bench: group table.
- Ashwood Bench: group table.
- Carved Bench: group table.
- Chair: group table.
- Darkwood Chair: group table.
- Carved Chair: missing.
- Raven Throne: group table.
- Stone Throne: group table.
- Black Marble Throne: group table.
- Bone Throne: group table.
- Antler Throne: group table.
- Black banner: group table.
- Blue banner: group table.
- White and red striped banner: group table.
- Red banner: group table.
- Green banner: group table.
- Blue, red and white banner: group table.
- White and blue striped banner: group table.
- Yellow banner: group table.
- Purple banner: group table.
- White banner: group table.
- Orange banner: group table.

## Open questions

- Many piece URLs redirect to Chairs, Tables, Rugs or Banners, which have group recipe tables instead of individual infoboxes. Those recipes and internal IDs are retained. Workbench is the default furniture station for these group tables; Stonecutter membership is verified against its Usage list.
- Carved Chair and Moose Hide Carpet appear in Comfort, but their redirected group pages omit their recipes and IDs. They remain unresolved and are excluded from recommendations; no recipe or tier was invented.
- Item Stand tabbers have unclosed infoboxes and no internal IDs. Variants are parsed separately; gameId remains null.
- Pots share an infobox with size-dependent costs (3/4/5 Pot Shards); no station is required. Missing comfort fields on Plants, Stands and Ashlands pieces use the authoritative Comfort table.
- Hearth assumes a lit fire within eight meters by default. The planner can disable lit/heated conditions or the eight-meter bonus; general furniture placement within ten meters remains a player responsibility.
- Ocean has no separate wiki maximum row and uses Black Forest. Snow Lantern is Deep North-tier because its documented recipe uses Snowballs from Ice; its durability warning is retained as a condition note.
