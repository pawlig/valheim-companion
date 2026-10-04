# VC-1 data report

Source: valheim.weirdgloop.org (MediaWiki API). No dates on purpose: the report must be byte-identical on re-runs from cache.

## Creatures per biome

| Biome | boss | miniboss | hostile | passive | fish | total |
|---|---|---|---|---|---|---|
| Meadows | 1 | 0 | 3 | 2 | 2 | 8 |
| Black Forest | 1 | 1 | 8 | 3 | 3 | 16 |
| Swamp | 1 | 0 | 11 | 0 | 1 | 13 |
| Ocean | 0 | 0 | 1 | 2 | 3 | 6 |
| Mountain | 1 | 1 | 9 | 0 | 1 | 12 |
| Plains | 1 | 1 | 7 | 3 | 1 | 13 |
| Mistlands | 1 | 0 | 6 | 3 | 2 | 12 |
| Ashlands | 1 | 1 | 11 | 2 | 1 | 16 |
| Deep North | 1 | 0 | 17 | 2 | 1 | 21 |

By kind: boss 8, miniboss 4, hostile 69, passive 13, fish 12, total 106.

## Creatures without biome

(none)

## Pages without {{infobox creature}}

- Astrid (no {{infobox creature}})
- Creature level (no {{infobox creature}})
- Creatures (no {{infobox creature}})
- Factions (no {{infobox creature}})
- Gudrun (no {{infobox creature}})
- Harald (no {{infobox creature}})
- Hexahedric Pulp (no {{infobox creature}})
- Ulf (no {{infobox creature}})

## Unknown modifier fields

(none)

## Creatures without image

- Frysling

## Attacks with empty damage

- Fuling Shaman (0★): Protect — Protect: 100 Shield
- Greydwarf Shaman (0★): Heal — Heal: 20 Health over 4 seconds
- Greydwarf Shaman (1★): Heal — Heal: 20 Health over 4 seconds
- Greydwarf Shaman (2★): Heal — Heal: 20 Health over 4 seconds
- Kall Fimbulbringer (0★): Phase 2 – No attacks — No attacks

## Fandom fallbacks

(none)

## Orphan images removed

9 image files in img/creatures/ belong to creatures excluded via overrides.json; no record in creatures.json references them, so they are deleted when found:

- img/creatures/fish-0.png
- img/creatures/frost-blob-0.png
- img/creatures/frost-blob-trophy.png
- img/creatures/hive-0.png
- img/creatures/hive-trophy.png
- img/creatures/riktig-fuling-0.png
- img/creatures/spirit-caller-0.png
- img/creatures/staff-of-the-wild-0.png
- img/creatures/the-hive-0.png

## Open questions

- "Fish" is the umbrella page of the fishing mechanic with a {{infobox creature}}; it landed in Ocean. Candidate for exclude.creatures in overrides.json.
- Creature set is biome links ∪ all five fetched categories (spec says only Category:Creatures); the extra categories contribute Chicken, Hen, Riktig Fuling, Hive and The Hive, needed for the ≥110-creatures acceptance.
- package.json test script uses `node --test 'scripts/**/*.test.mjs'` instead of `node --test scripts/`: Node v25.9.0 executes a directory argument as a module and fails.
