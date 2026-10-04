# VC-1 data report

Source: valheim.weirdgloop.org (MediaWiki API). No dates on purpose: the report must be byte-identical on re-runs from cache.

## Creatures per biome

| Biome | boss | miniboss | hostile | passive | fish | total |
|---|---|---|---|---|---|---|
| Meadows | 1 | 0 | 3 | 2 | 2 | 8 |
| Black Forest | 1 | 1 | 8 | 3 | 3 | 16 |
| Swamp | 1 | 0 | 11 | 0 | 1 | 13 |
| Ocean | 0 | 0 | 1 | 3 | 3 | 7 |
| Mountain | 1 | 1 | 9 | 0 | 1 | 12 |
| Plains | 1 | 1 | 7 | 1 | 1 | 11 |
| Mistlands | 1 | 0 | 5 | 3 | 2 | 11 |
| Ashlands | 1 | 1 | 11 | 2 | 1 | 16 |
| Deep North | 1 | 0 | 16 | 2 | 1 | 20 |

By kind: boss 10, miniboss 4, hostile 72, passive 15, fish 12, total 113.

## Creatures without biome

- Chicken (location: n/a)
- Frost Blob (location: n/a)
- Frysling (location: n/a)
- Hen (location: n/a)
- Hive (location: n/a)
- Riktig Fuling (location: n/a)
- Seeker Brood (location: Mistlands)
- Spirit Caller (location: n/a)
- Staff of the Wild (location: n/a)
- The Hive (location: n/a)

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

- Gammeltroll: weak point = Head
- Gammeltroll: wp veryweak = Pickaxe
- Gjall: weak point = Eggs
- Gjall: wp veryweak = Pierce
- Seeker Soldier: weak point = Abdomen
- Seeker Soldier: wp weak = Blunt
- Seeker Soldier: wp weak = Pierce
- Seeker Soldier: wp weak = Slash
- Seeker Soldier: wp weak = Fire
- Seeker Soldier: wp weak = Frost
- Seeker Soldier: wp weak = Lightning
- Troll: weak point = Head
- Troll: wp veryweak = Pierce

## Creatures without image

- Bat
- Crow
- Frysling
- Hive
- Lord Reto
- Riktig Fuling
- Zil & Thungr

## Attacks with empty damage

- Frost Blob (0★): 100 Frost — 100 Frost
- Fuling Shaman (0★): Protect — Protect: 100 Shield
- Greydwarf Shaman (0★): Heal — Heal: 20 Health over 4 seconds
- Greydwarf Shaman (1★): Heal — Heal: 20 Health over 4 seconds
- Greydwarf Shaman (2★): Heal — Heal: 20 Health over 4 seconds
- Hen (0★): 10 Blunt — 10 Blunt
- Hive (0★): 100 Blunt, 90 Spirit, 1000 Chop, 1000 Pickaxe — 100 Blunt, 90 Spirit, 1000 Chop, 1000 Pickaxe
- Hive (0★): 200 Spirit — 200 Spirit
- Hive (0★): 200 Spirit, 200 Chop, 200 Pickaxe — 200 Spirit, 200 Chop, 200 Pickaxe
- Kall Fimbulbringer (0★): Phase 2 – No attacks — No attacks
- Rancid Remains (1★): Mace 30 Blunt, 45 Poison — Mace 30 Blunt, 45 Poison
- Staff of the Wild (0★): 70 Blunt, 40 poison, 20 Chop, 20 Pickaxe (40 knockback, 4x backstab) — 70 Blunt, 40 poison, 20 Chop, 20 Pickaxe (40 knockback, 4x backstab)

## Fandom fallbacks

(none)

## Open questions

- package.json test script uses `node --test 'scripts/**/*.test.mjs'` instead of `node --test scripts/`: Node v25.9.0 executes a directory argument as a module and fails.
