# Provisions data report

Source: https://valheim.weirdgloop.org (cached MediaWiki API).

Foods: 99; feasts: 9; meads: 21.

| Biome | Food (excluding feasts) | Meads | Feasts |
|---|---:|---:|---:|
| meadows | 13 | 0 | 0 |
| black-forest | 11 | 4 | 0 |
| ocean | 2 | 0 | 0 |
| swamp | 6 | 7 | 4 |
| mountain | 4 | 0 | 0 |
| plains | 8 | 4 | 1 |
| mistlands | 12 | 4 | 1 |
| ashlands | 15 | 2 | 1 |
| deep-north | 18 | 0 | 2 |
| unresolved | 1 | 0 | 0 |

## Missing data

- Foods without a crafting station (raw foods are intentional): Blue mushroom, Blueberries, Bukeperries, Carrot, Cloudberries, Fiddlehead, Honey, Jotun Puffs, Kale, Lingonberries, Luminous Larva, Magecap, Mushroom, Oats, Onion, Poteitr, Raspberries, Rotten Meat, Royal Jelly, Smoke Puff, Vineberry Cluster, Yellow Mushroom.
- Foods without tier: Blue mushroom.
- Meads without a base recipe: Love Potion.
- Missing images: None.

## Open questions

- Current wiki uses Mead Ketill (level 1), not Cauldron, for mead bases. Food Preparation Table is required for feasts. These station IDs extend the original station enum to preserve source accuracy.
- Healing tick interval is null unless explicitly documented; hp/tick is preserved without inventing an interval.
- Love Potion is purchased from Bog Witch in batches of five and has no fermentable base.
- Blue mushroom is console-only and has no biome. Existing Smithy item tiers are preserved verbatim; Anglerfish is currently Ashlands-tier in that catalog and consequently Fish n Bread inherits that tier.
- Feast biome follows the highest ingredient tier, including purchased herbs, rather than the biome theme. Cauldron levels describe a progression sequence; nearby upgrades each add one level and can be built in a different order.
- Food category pages without an edible Food/Feast infobox are excluded: Anti-Sting Concoction, Berserkir Mead, Brew of Animal Whispers, Draught of Vananidir, Feast, Fire Resistance Barley Wine, Food, Frost Resistance Mead, Lightfoot Mead, Lingering Eitr Mead, Lingering Healing Mead, Lingering Stamina Mead, Love Potion, Major Healing Mead, Mead, Mead of Troll Endurance, Medium Healing Mead, Medium Stamina Mead, Minor Eitr Mead, Minor Healing Mead, Minor Stamina Mead, Poison Resistance Mead, Tasty Mead, Tonic of Ratatosk.
