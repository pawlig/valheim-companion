# VC-45b: O-2 station parsing validation

Branch: `vc-45b`. Baseline: `d6e58af596cc39a83fbdf906e064b182cc15ead0`.

## Result

Quality station levels now come from the wiki quality headers for the actual piece type, including head, chest/legs, cape and cast qualifiers. Upgrade station rows take precedence over infobox sources. Station names resolve against the names in `data/stations.json`, with non-station sources represented by `null`.

Exactly 27 Deep North pieces retain `finishedAt: "Frost Foundry"`: 18 weapons/shields and 9 armor pieces. Their crafting/upgrade station is Black Forge or Galdr Table. Padded Cuirass and Padded Greaves retain the wiki's Forge 2/2/3/4 sequence.

Club and Stone Axe have Workbench upgrade rows with `by hand=y`; following the O-2 precedence rule, their `station` is Workbench; the hand-crafting source is not a finishing station, so no `finishedAt` is set (orchestrator fix). Their existing quality levels remain 1/2/3/4. Bare Fists has no station and becomes `null`. Trader names become `null` stations; trader metadata is retained.

Only station, finishedAt and levels[].stationLevel changed in the source item records. The complete list below contains 81 item ids. All 73 affected wiki pages were read from `data/raw/` through `readCachedPages`, including the named regression cases and all 27 Frost Foundry pieces. Materials, combat statistics and item biomes did not change.

## Checks

All commands ran separately and synchronously in this worktree.

### Data invariants (exit 0)

```text
non +1 exceptions: padded-cuirass, padded-greaves (wiki 2/2/3/4)
non +1 exceptions excluding Padded Cuirass/Greaves: 0
invalid station values: 0
station Frost Foundry: 0
finishedAt Frost Foundry: 27
```

### Final scripts test run (exit 0)

Command: `node --test 'scripts/**/*.test.mjs'`.

```text
✔ wiki tables preserve cells, headers, attributes, links and multiline content (0.415125ms)
ℹ tests 455
ℹ suites 3
ℹ pass 455
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 8494.821541
```

Six new regression tests cover Drake Helmet, all Flametal pieces, Caller Q1, Nord Sword, Linen Cape/Padded exceptions and dataset station invariants.

### npm test (exit 0)

```text
ℹ tests 455
ℹ pass 455
ℹ fail 0
ℹ tests 29
ℹ pass 29
ℹ fail 0
i18n en: 0 missing translations
i18n cs: 0 missing translations
i18n de: 0 missing translations
i18n es: 0 missing translations
i18n fr: 0 missing translations
i18n pt: 0 missing translations
i18n zh: 0 missing translations
i18n hi: 0 missing translations
i18n ar: 0 missing translations
i18n bn: 0 missing translations
i18n ru: 0 missing translations
i18n ja: 0 missing translations
i18n id: 0 missing translations
i18n: 232 messages; coverage, placeholders, formatting and language store verified
i18n: 239 English game names verified in all 13 languages; normalized English search passed
All engine checks passed.
```

### Build (exit 0)

Command: `npm run build`. Both applications built locally; no symlink was needed.

```text
vite v8.0.13 building client environment for production...
✓ built in 444ms
vite v8.0.13 building client environment for production...
✓ built in 499ms
done: i18n build complete
Successfully built Items Compendium: 1075 items.
Successfully built Trader Ledger: 3 traders, 4 valuables.
done: site assembled in dist/
```

### Idempotence

The first block of the pipeline in `docs/ORCHESTRACE.md` ran twice, each command with exit 0, in this order:

1. `node scripts/wiki/fetch-creatures.mjs` — 106 creatures, 9 biomes.
2. `node scripts/wiki/fetch-weapons.mjs` — 171 weapons, 119 materials.
3. `node scripts/recommend.mjs` — 117 pairs.
4. `node scripts/build-data.mjs` — Bestiary bundle.
5. `node scripts/wiki/fetch-armor.mjs` — 68 armor entries, 191 items.
6. `node scripts/build-armourer-data.mjs` — Smithy bundle.

The first run regenerated the Bestiary and Smithy data bundles. The build also regenerated Items Compendium and its app data (36 related entries: recipes, stations and usedIn levels). These outputs were committed. After the second pipeline run and removal of temporary validation logs, `git status --short` returned no output. `git diff --check` passed.

## Commits

- `a108012` — VC-45b - fix quality station parsing and preserve finishing sources
- `2a9b735` — VC-45b - regenerate consumer data with corrected crafting stations
- This report is recorded in a separate documentation commit.

## Complete source item changes

| Item id | Before → after |
|---|---|
| bare-fists | station: Always available → null |
| club | station: Player crafting menu → Workbench |
| dyrnwyn | station: Black forge → Black Forge |
| echo-spike | station: Frost Foundry → Galdr Table; finishedAt: absent → Frost Foundry |
| flametal-tower-shield | station: Black forge → Black Forge |
| klossen | station: Black forge → Black Forge |
| lightning-strike | station: Frost Foundry → Galdr Table; finishedAt: absent → Frost Foundry |
| nidhogg | station: Black forge → Black Forge |
| nord-atgeir | station: Frost Foundry → Black Forge; finishedAt: absent → Frost Foundry |
| nord-axe | station: Frost Foundry → Black Forge; finishedAt: absent → Frost Foundry |
| nord-bow | station: Frost Foundry → Black Forge; finishedAt: absent → Frost Foundry |
| nord-buckler | station: Frost Foundry → Black Forge; finishedAt: absent → Frost Foundry |
| nord-crossbow | station: Frost Foundry → Black Forge; finishedAt: absent → Frost Foundry |
| nord-dagger | station: Frost Foundry → Black Forge; finishedAt: absent → Frost Foundry |
| nord-greataxe | station: Frost Foundry → Black Forge; finishedAt: absent → Frost Foundry |
| nord-greatshield | station: Frost Foundry → Black Forge; finishedAt: absent → Frost Foundry |
| nord-greatsword | station: Frost Foundry → Black Forge; finishedAt: absent → Frost Foundry |
| nord-knucklechains | station: Frost Foundry → Black Forge; finishedAt: absent → Frost Foundry |
| nord-mace | station: Frost Foundry → Black Forge; finishedAt: absent → Frost Foundry |
| nord-shield | station: Frost Foundry → Black Forge; finishedAt: absent → Frost Foundry |
| nord-sledge | station: Frost Foundry → Black Forge; finishedAt: absent → Frost Foundry |
| nord-spear | station: Frost Foundry → Black Forge; finishedAt: absent → Frost Foundry |
| nord-sword | station: Frost Foundry → Black Forge; finishedAt: absent → Frost Foundry |
| northern-vengeance | station: Frost Foundry → Galdr Table; finishedAt: absent → Frost Foundry |
| primal-berserkir-axes | station: Black forge → Black Forge |
| splitnir | station: Black forge → Black Forge |
| splitnir-the-bleeding | station: Black forge → Black Forge |
| splitnir-the-primal | station: Black forge → Black Forge |
| splitnir-the-storming | station: Black forge → Black Forge |
| stone-axe | station: Player crafting menu → Workbench |
| beaded-dress-blue | station: Hildir → null |
| beaded-dress-brown | station: Hildir → null |
| beaded-dress-yellow | station: Hildir → null |
| beaded-tunic-blue | station: Hildir → null |
| beaded-tunic-red | station: Hildir → null |
| beaded-tunic-yellow | station: Hildir → null |
| headdress-of-the-caller | station: Frost Foundry → Galdr Table; finishedAt: absent → Frost Foundry; levels: 1/4/5/6 → 3/4/5/6 |
| robes-of-the-caller | station: Frost Foundry → Galdr Table; finishedAt: absent → Frost Foundry; levels: 1/4/5/6 → 3/4/5/6 |
| trousers-of-the-caller | station: Frost Foundry → Galdr Table; finishedAt: absent → Frost Foundry; levels: 1/4/5/6 → 3/4/5/6 |
| cape-tunic-blue | station: Hildir → null |
| cape-tunic-red | station: Hildir → null |
| cape-tunic-yellow | station: Hildir → null |
| crown-of-roots | station: The Bog Witch → null |
| dverger-circlet | station: Haldor → null |
| extravagant-cap-green | station: Hildir → null |
| extravagant-cap-orange | station: Hildir → null |
| flametal-helmet | levels: 3/3/3/3 → 3/4/5/6 |
| flametal-breastplate | levels: 3/10/10/10 → 3/4/5/6 |
| flametal-greaves | levels: 3/10/10/10 → 3/4/5/6 |
| fur-cap-brown | station: Hildir → null |
| fur-cap-grey | station: Hildir → null |
| harvest-dress | station: Sold by Hildir after returning her Brass chest → null |
| harvest-tunic | station: Sold by Hildir after returning her Brass chest → null |
| headband | station: Hildir → null |
| linen-cape | levels: 2/2/3/4 → 1/2/3/4 |
| helmet-of-the-protector | station: Frost Foundry → Black Forge; finishedAt: absent → Frost Foundry |
| breastplate-of-the-protector | station: Frost Foundry → Black Forge; finishedAt: absent → Frost Foundry |
| trousers-of-the-protector | station: Frost Foundry → Black Forge; finishedAt: absent → Frost Foundry |
| shawl-dress-blue | station: Hildir → null |
| shawl-dress-brown | station: Hildir → null |
| shawl-dress-yellow | station: Hildir → null |
| simple-cap-purple | station: Hildir → null |
| simple-cap-red | station: Hildir → null |
| simple-dress-blue | station: Hildir → null |
| simple-dress-brown | station: Hildir → null |
| simple-dress-natural | station: Hildir → null |
| simple-dress-yellow | station: Hildir → null |
| simple-tunic-blue | station: Hildir → null |
| simple-tunic-natural | station: Hildir → null |
| simple-tunic-red | station: Hildir → null |
| simple-tunic-yellow | station: Hildir → null |
| straw-hat | station: Sold by Hildir after returning her Brass chest → null |
| tied-headscarf-blue | station: Hildir → null |
| tied-headscarf-yellow | station: Hildir → null |
| twisted-headscarf-green | station: Hildir → null |
| twisted-headscarf-red | station: Hildir → null |
| hood-of-the-vanguard | station: Frost Foundry → Black Forge; finishedAt: absent → Frost Foundry |
| chestpiece-of-the-vanguard | station: Frost Foundry → Black Forge; finishedAt: absent → Frost Foundry |
| trousers-of-the-vanguard | station: Frost Foundry → Black Forge; finishedAt: absent → Frost Foundry |
| drake-helmet | levels: 1/3/4/5 → 1/2/3/4 |
| yule-hat | station: Haldor → null |

