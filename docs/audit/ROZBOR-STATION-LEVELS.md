# Rozbor VC-44: dostupnost úrovní stanic a kvalit předmětů po biomech

Autor: Fable · 10. 10. 2026 · strom `valheim-units-CC`, větev `vc-44-rozbor`, HEAD po commitu `cf4dbb3` (3 nové stránky ve wiki cache).
Zdroj pravdy: wiki cache `data/raw/` (4 409 stránek v 501 souborech, indexováno přes `scripts/wiki/api.mjs` → `query.pages[].revisions[0].slots.main.content`). Odkazy ve tvaru *(wiki: Název stránky)* jsou názvy stránek v cache. Nic nebylo převzato z `docs/STAV.md` ani z commitů VC-40c–f; čísla z `data/*.json` jsou naměřená skripty, které jsou popsané u každé tabulky.

## 0. Shrnutí

- Companion dnes **nikde nebere v úvahu, že stanici lze v daném biomu rozšířit jen na určitou úroveň**. Biom předmětu (`weapons[].biome`, `armor[].biome`) je jen „nejvyšší biom surovin Q1“ (`scripts/wiki/fetch-weapons.mjs:542-570`, `scripts/wiki/fetch-armor.mjs:757-782`); úroveň stanice (`levels[q].stationLevel`) se zobrazuje, ale s biomem se nepropojuje.
- Z **240 vyrobitelných kusů** (122 zbraní, 19 štítů, 4 krumpáče, 23 munice, 72 kusů zbroje; 859 kvalit) se **97 kusů / 103 kvalit** ukazuje v dřívějším biomu, než jsou ve hře vyrobitelné. 5 kusů už v Q1 (Arbalest, Skoll and Hati, Bone Bolt, Iron Bolt, Black Metal Bolt — vše Black Forge, tj. Mistlands, companion je řadí do Swamp/Plains/Black Forest). Dalších **68 kusů / 73 kvalit** má požadovanou úroveň stanice **vyšší než maximum stanice ve hře** (wiki je značí „not yet available“), companion je nabízí jako běžně vyrobitelné.
- **Carapace Armor** (Pavlův podnět): Q1 a Q2 Mistlands, **Q3 podle wiki také Mistlands** (Black Forge 3 přes rozšíření Vice, materiál Mechanical Spring se vyrábí na Artisan Table z Refined Eitr + Iron), **Q4 až Ashlands** (Black Forge 4 vyžaduje Metal Cutter nebo Gem Cutter s Flametal). Companion ukazuje Q1–Q4 v Mistlands. Pavlovo „jen do Q2“ se s wiki neshoduje — otázka O-3 v § 7.
- Vedlejší nálezy v datech: 27 kusů z Deep North má stanici „Frost Foundry“ s úrovněmi 4–7, ale Frost Foundry úrovně nemá (odlitky se dělají na Black Forge 4, vylepšení na Black Forge 5–7); 7 kusů zbroje má špatně naparsované úrovně (Flametal Breastplate `3/10/10/10`, Drake Helmet `1/3/4/5`, Caller Set `1/4/5/6`); suroviny rozšíření Mechanical Spring, Sharpening Stone a Asksvin Trophy v `data/items.json` chybí; Coal a Ymir Flesh mají v `items.json` jiný biom než v kompendiu.
- Návrh: úrovně stanic držet v `data/stations.json` (`maxLevel`, `levels[{level, upgrade, biome}]` — Cauldron už tak zapsaný je), ke každé kvalitě přidat `availableFrom`, počítat ve fetcherech sdíleným modulem; 8 balíků oprav O-1 … O-8; 9 otázek pro Pavla.

## 1. Stanice a jejich rozšíření

Pravidlo hry (wiki: Crafting, oddíl „Crafting mechanics“): *„Each upgrade level requires a higher station level … the Troll Leather Tunic requires a level 2 Workbench to be crafted … upgrading it to quality 2 requires a level 3 Workbench, to quality 3 a level 4 Workbench“* → úroveň stanice pro kvalitu q = úroveň pro Q1 + (q − 1). Wiki to kóduje šablonou `{{Upgrade station row|<stanice>|<počet kvalit>|start=<úroveň Q1>}}` (152 stránek v cache ji používá; `fetch-weapons.mjs:338` ji čte). Úroveň stanice = 1 + počet **různých** postavených rozšíření; pořadí rozšíření nehraje roli (wiki: Workbench — „Duplicate upgrades do not stack“; data/report-provisions: „nearby upgrades each add one level and can be built in a different order“).

Maximální úrovně podle wiki modulu (wiki: Module:Crafting station/data, stažen do cache v tomto rozboru; šablona `Template:Max crafting level` z něj počítá „max = počet rozšíření + 1“ a úrovně nad maximem vypisuje jako *„(not yet available)“*):

| Stanice | Rozšíření (wiki modul) | Max. úroveň |
|---|---|---|
| Workbench | chopping block, tanning rack, adze, tool shelf | 5 |
| Forge | forge bellows, anvils, grinding wheel, smith's anvil, forge cooler, forge toolrack | 7 |
| Black Forge | black forge cooler, vice, metal cutter, gem cutter, smith's aprons | **6** |
| Galdr Table | rune table, unfading candles, feathery wreath, standing loom | 5 |
| Cauldron | spice rack, butcher's table, pots and pans, mortar and pestle, rolling pins and cutting boards, smoker | 7 |
| Artisan Table | artisan press | 2 |
| Stonecutter, Mead Ketill, Food Preparation Table, player crafting menu | — | 1 |

Biom suroviny = `data/items.json` (`biome`), kde chybí, `data/items-compendium.json` — tedy to, co používá web. Nejranější biom rozšíření = nejvyšší biom jeho surovin, **plus** biom stanice, na které se rozšíření staví / ze které se bere surovina (poznámka u řádku). Tabulka vznikla skriptem nad cache (`scratchpad/vc44/upgrades.mjs`), materiály na stránce stanice i na stránce rozšíření se shodují u všech 26 rozšíření.

### 1.1 Workbench *(wiki: Workbench)* — základ 10 Wood → Meadows

| Rozšíření | `id` ve hře | Materiály | Biomy surovin (items.json) | Nejranější biom |
|---|---|---|---|---|
| Chopping Block *(wiki: Chopping Block)* | piece_workbench_ext1 | 10 Wood, 10 Flint | meadows, meadows | **Meadows** |
| Tanning Rack *(wiki: Tanning Rack)* | piece_workbench_ext2 | 10 Wood, 15 Flint, 20 Leather Scraps, 5 Deer Hide | vše meadows | **Meadows** |
| Adze *(wiki: Adze)* | piece_workbench_ext3 | 10 Finewood, 3 Bronze | black-forest, black-forest | **Black Forest** |
| Tool Shelf *(wiki: Tool Shelf)* | piece_workbench_ext4 | 10 Finewood, 4 Iron, 4 Obsidian | black-forest, swamp, mountain | **Mountain** |

### 1.2 Forge *(wiki: Forge)* — základ 4 Stone, 4 Coal, 10 Wood, 6 Copper, staví se u Workbench → Black Forest

| Rozšíření | `id` | Materiály | Biomy surovin | Nejranější biom |
|---|---|---|---|---|
| Forge Cooler *(wiki: Forge Cooler)* | forge_ext5 | 25 Finewood, 10 Copper | black-forest | **Black Forest** |
| Anvils *(wiki: Anvils)* | forge_ext2 | 5 Wood, 2 Bronze | meadows, black-forest | **Black Forest** |
| Grinding Wheel *(wiki: Grinding Wheel)* | forge_ext3 | 25 Wood, 1 Sharpening Stone | meadows, Sharpening Stone = 5 Stone na **Stonecutter** *(wiki: Sharpening Stone)*; Stonecutter stojí 10 Wood, **2 Iron**, 4 Stone *(wiki: Stonecutter)* | **Swamp** |
| Smith's Anvil *(wiki: Smith's Anvil)* | forge_ext4 | 5 Wood, 20 Iron | meadows, swamp | **Swamp** |
| Forge Toolrack *(wiki: Forge Toolrack)* | forge_ext6 | 10 Wood, 15 Iron | meadows, swamp | **Swamp** |
| Forge Bellows *(wiki: Forge Bellows)* | forge_ext1 | 5 Wood, 5 Deer Hide, 4 Chain | meadows, meadows, swamp | **Swamp** |

Nálezy k surovinám: **Coal** má v `items.json` `biome: swamp`, v kompendiu `meadows` (Coal vzniká v Charcoal Kiln z Wood v Black Forest / spálením jídla; Forge je Black Forest i podle wiki „source: Workbench“ a Copper). **Sharpening Stone** v `items.json` není, kompendium má `black-forest` — ale Stonecutter potřebuje Iron, správně Swamp (wiki: Sharpening Stone „can rarely be found in Plains Chests“ nepomůže dřív).

### 1.3 Black Forge *(wiki: Black Forge)* — základ 10 Black Marble, 10 Yggdrasil Wood, 5 Black Core, u Workbench → Mistlands

| Rozšíření | `id` | Materiály | Biomy surovin | Nejranější biom |
|---|---|---|---|---|
| Black Forge Cooler *(wiki: Black Forge Cooler)* | blackforge_ext1 | 5 Iron, 5 Copper, 4 Black Marble | swamp, black-forest, mistlands | **Mistlands** |
| Vice *(wiki: Vice)* | blackforge_ext2_vise | 5 Iron, 8 Copper, 2 Mechanical Spring | Mechanical Spring: v `items.json` chybí, kompendium mistlands; recept 1 Refined Eitr + 3 Iron na Artisan Table *(wiki: Mechanical Spring)* | **Mistlands** (přidáno v Hildir's Request 0.217.4, 16. 6. 2023) |
| Metal Cutter *(wiki: Metal Cutter)* | blackforge_ext3_metalcutter | 5 Black Marble, 5 Flametal, 5 Ashwood, 4 Charred Bone | mistlands, ashlands ×3 | **Ashlands** (0.218.15) |
| Gem Cutter *(wiki: Gem Cutter)* | blackforge_ext4_gemcutter | 5 Flametal, 8 Ashwood, 2 Morgen Sinew, 1 Bloodstone | ashlands | **Ashlands** |
| Smith's Aprons *(wiki: Smith's Aprons)* | blackforge_ext5_apron | 5 Bloodgold, 8 Timberwood, 2 Moose Hide | deep-north | **Deep North** (Deep North update 9. 9. 2026) |

### 1.4 Galdr Table *(wiki: Galdr Table)* — základ 10 Black Metal, 20 Yggdrasil Wood, 5 Black Core, 5 Refined Eitr → Mistlands

| Rozšíření | `id` | Materiály | Biomy surovin | Nejranější biom |
|---|---|---|---|---|
| Rune Table *(wiki: Rune Table)* | piece_magetable_ext | 10 Black Marble, 5 Yggdrasil Wood, 10 Refined Eitr | mistlands | **Mistlands** |
| Unfading Candles *(wiki: Unfading Candles)* | piece_magetable_ext2 | 10 Black Marble, 3 Skeleton Trophy, 10 Refined Eitr, 15 Resin | mistlands, black-forest, mistlands, meadows | **Mistlands** |
| Feathery Wreath *(wiki: Feathery Wreath)* | — (stránka bez `id`) | 8 Celestial Feather, 1 Asksvin Trophy, 10 Refined Eitr, 3 Ashwood | ashlands (Asksvin Trophy v `items.json` chybí, kompendium ashlands) | **Ashlands** |
| Standing Loom *(wiki: Standing Loom)* | piece_magetable_ext4 | 5 Timberwood, 10 Nornathread | deep-north | **Deep North** |

### 1.5 Cauldron *(wiki: Cauldron)* — základ 10 Tin, staví se u Forge → Black Forest

| Rozšíření | `id` | Materiály | Nejranější biom |
|---|---|---|---|
| Spice Rack *(wiki: Spice Rack)* | cauldron_ext1_spice | 3 Dandelion, 2 Carrot, 5 Mushroom, 3 Thistle, 3 Turnip | **Black Forest** (Thistle) |
| Butcher's Table *(wiki: Butcher's Table)* | cauldron_ext3_butchertable | 2 Ancient Bark, 4 Corewood, 4 Finewood, 2 Silver | **Mountain** |
| Pots and Pans *(wiki: Pots and Pans)* | cauldron_ext4_pots | 5 Iron, 5 Copper, 5 Black Metal, 10 Finewood | **Plains** |
| Mortar and Pestle *(wiki: Mortar and Pestle)* | cauldron_ext5_mortarandpestle | 8 Black Marble, 6 Finewood, 4 Corewood | **Mistlands** |
| Rolling Pins and Cutting Boards *(wiki: Rolling Pins and Cutting Boards)* | cauldron_ext6_rollingpins | 8 Ashwood, 6 Finewood, 4 Flametal | **Ashlands** |
| Smoker *(wiki: Smoker)* | cauldron_ext7_smoker | 5 Bloodgold, 6 Timberwood | **Deep North** |

`data/stations.json` už tohle částečně má: záznam `cauldron` nese `maxLevel: 7` a `levels[{level, upgrade}]`, záznamy rozšíření nesou `upgrades: "cauldron"`, `progressionLevel` (pořadí, ne biom) — `scripts/wiki/fetch-provisions.mjs:141`. Chybí jen biom na úroveň.

### 1.6 Artisan Table *(wiki: Artisan Table)* — základ 2 Dragon Tear (Moder), 10 Wood → Mountain

| Rozšíření | Materiály | Nejranější biom |
|---|---|---|
| Artisan Press (bez vlastní stránky v cache; tabulka na stránce Artisan Table) | 5 Black Marble, 5 Bronze, 1 Majestic Carapace *(wiki: Majestic Carapace — drop The Queen)* | **Mistlands** |

### 1.7 Stanice bez rozšíření (úroveň 1) a jejich nejranější biom

| Stanice | Materiály / podmínka *(wiki stránka)* | Biom |
|---|---|---|
| Cooking Station | 2 Wood *(Cooking Station)* | Meadows |
| Smelter, Charcoal Kiln | 20 Stone, 5 Surtling Core *(Smelter, Charcoal Kiln)* | Black Forest |
| Fermenter | 30 Finewood, 5 Bronze, 10 Resin, u Forge *(Fermenter)* | Black Forest |
| Mead Ketill | 4 Tin, 6 Copper, 2 Leather Scraps, u Forge *(Mead Ketill)* | Black Forest |
| Stonecutter | 10 Wood, 2 Iron, 4 Stone *(Stonecutter)* | Swamp |
| Iron Cooking Station | 3 Chain, 3 Iron *(Iron Cooking Station)* | Swamp |
| Food Preparation Table | 5 Iron, 20 Finewood, 15 Leather Scraps *(Food Preparation Table)* | Swamp |
| Spinning Wheel | 20 Finewood, 10 Iron Nails, 5 Leather Scraps, **staví se u Artisan Table** *(Spinning Wheel)* | Mountain |
| Windmill | 20 Stone, 30 Wood, 30 Iron Nails, u Artisan Table *(Windmill)* | Mountain |
| Blast Furnace | 20 Stone, 5 Surtling Core, 10 Iron, 20 Finewood, u Artisan Table *(Blast Furnace)* | Mountain |
| Stone Oven | 15 Iron, 20 Stone, 4 Surtling Core, u Artisan Table *(Stone Oven)* | Mountain |
| Eitr Refinery | 20 Black Marble, 5 Black Metal, 10 Yggdrasil Wood, 5 Black Core, 3 Sap *(Eitr Refinery)* | Mistlands |
| Frost Foundry | 15 Iron, 20 Stone, 10 Frostcore *(Frost Foundry)*; **nemá úrovně**, jen tvrdí odlitky vyrobené na Black Forge 4 / Galdr Table 3 (tabulka „Casts“: 22 odlitků Black Forge level 4, 7 odlitků Galdr Table level 3) | Deep North |
| Frigid Kiln | 20 Stone, 10 Frostcore, 5 Ice *(Frigid Kiln)* | Deep North |

Pozor na dvě věci, které čistý „max biom surovin“ nezachytí: **(a)** předpoklad jiné stanice (Spinning Wheel, Windmill, Blast Furnace, Stone Oven potřebují Artisan Table → Mountain, i když suroviny jsou Swamp; Grinding Wheel potřebuje Stonecutter → Swamp), **(b)** surovina, která je sama výrobek (Mechanical Spring → Artisan Table + Refined Eitr). Návrh v § 5 s tím počítá.

## 2. Max úroveň stanice po biomech

Pořadí biomů = `data/biomes.json` (`order`): Meadows 1, Black Forest 2, Ocean 3, Swamp 4, Mountain 5, Plains 6, Mistlands 7, Ashlands 8, Deep North 9. Úroveň v biomu B = 1 + počet rozšíření, jejichž nejranější biom ≤ B (§ 1). „—“ = stanici v biomu nelze postavit.

| Stanice | Meadows | Black Forest | Ocean | Swamp | Mountain | Plains | Mistlands | Ashlands | Deep North | Max (wiki modul) |
|---|---|---|---|---|---|---|---|---|---|---|
| Workbench | **3** | **4** | 4 | 4 | **5** | 5 | 5 | 5 | 5 | 5 |
| Forge | — | **3** | 3 | **7** | 7 | 7 | 7 | 7 | 7 | 7 |
| Black Forge | — | — | — | — | — | — | **3** | **5** | **6** | 6 |
| Galdr Table | — | — | — | — | — | — | **3** | **4** | **5** | 5 |
| Cauldron | — | **2** | 2 | 2 | **3** | **4** | **5** | **6** | **7** | 7 |
| Artisan Table | — | — | — | — | **1** | 1 | **2** | 2 | 2 | 2 |
| Stonecutter | — | — | — | 1 | 1 | 1 | 1 | 1 | 1 | 1 |
| Mead Ketill, Fermenter, Smelter, Charcoal Kiln | — | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 |
| Cooking Station | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 |
| Iron Cooking Station, Food Preparation Table | — | — | — | 1 | 1 | 1 | 1 | 1 | 1 | 1 |
| Spinning Wheel, Windmill, Blast Furnace, Stone Oven | — | — | — | — | 1 | 1 | 1 | 1 | 1 | 1 |
| Eitr Refinery | — | — | — | — | — | — | 1 | 1 | 1 | 1 |
| Frost Foundry, Frigid Kiln | — | — | — | — | — | — | — | — | 1 | 1 |

Důsledky, které companion dnes ignoruje: Workbench 4 (Q4 kusů z Meadows) až v Black Forest, Workbench 5 (Q4 kožených/trollích/Root/Fenris zbrojí, Stagbreaker Q4) až v Mountain; Forge 4–7 (Q4 bronzových věcí) až ve Swamp; Black Forge 4 (Q4 Mistlands věcí) až v Ashlands; Black Forge 6 a Galdr Table 5 (Q4 Ashlands věcí) až v Deep North; Black Forge 7 a Galdr Table 6 **neexistují** (Q4 „evolved“ Ashlands zbraní a všech Deep North kusů).

## 3. Kvality předmětů

### 3.1 Kde data úroveň stanice mají

- `data/weapons.json` (171 kusů; zbraně, štíty `category: shield` 19, krumpáče `pickaxe` 4, munice `arrow/bolt/bomb` 23): `levels[q].stationLevel` = infobox `crafting level` (nebo `start=` šablony Upgrade station row) + (q − 1) — `fetch-weapons.mjs:336-361`. Shoduje se s pravidlem hry.
- `data/armor.json` (68 setů, 113 kusů, 72 s receptem): `pieces[].levels[q].stationLevel` z tabberu „Quality N … Black forge level: N“ nebo `crafting level + (q − 1)` — `fetch-armor.mjs:366-402`.
- `data/items.json` (333 surovin, 146 s receptem): `recipe.stationLevel` mají jen 3 recepty; u 60 receptů je úroveň schovaná v textu stanice (`"Black Forge level 4"` 50×, `"Galdr Table level 3"` 10×) — viz AUDIT-VC-39-40 A-9. `data/items-compendium.json` to normalizuje (`build-items-data.mjs:116-121, 1231-1253`): recepty `Black Forge@4` 87×, `@3` 17×, `Forge@2..4`, `Workbench@2..4`, `Cauldron@2..7`, `Galdr Table@2..4`, `Frost Foundry@3/4`, `Artisan Table@2`.
- `data/food.json`: `stationLevel` (Cauldron 1–7) z `fetch-provisions.mjs:35`.
- Žádný soubor nemá **biom úrovně stanice**; biom předmětu je vždy jen z surovin.

### 3.2 Měření: co companion ukazuje dřív, než je vyrobitelné

Skript `scratchpad/vc44/avail2.mjs`: pro každý kus a kvalitu q → `availableFrom(q) = max(biom surovin všech úrovní ≤ q, biom, kde stanice dosáhne levels[q].stationLevel podle § 2)`; porovnáno s biomem, ve kterém ho companion zobrazuje (`weapons[].biome`, `armor[].biome`). Kusy se stanicí „Frost Foundry“ přepočteny na Black Forge (wiki šablona `{{Upgrade station row|Black forge|4|start=4}}` na stránkách Nord Sword, Moose Hide Cape; Caller Set → Galdr Table). Vyřazeno: Bare Fists, Club, Stone Axe (bez stanice), kusy bez receptu (Hildir, Haldor, kosmetika).

| | Kusů | Kvalit | Kusů ukázaných dřív | Kvalit ukázaných dřív | Kvalit nad max. úrovní stanice („not yet available“) |
|---|---|---|---|---|---|
| Zbraně | 122 | 485 | 59 | 65 | 58 |
| Štíty | 19 | 57 | 1 | 1 | 0 |
| Krumpáče | 4 | 13 | 1 | 1 | 0 |
| Munice | 23 | 23 | 3 | 3 | 0 |
| Zbroj (kusy) | 72 | 281 | 33 | 33 | 15 |
| **Celkem** | **240** | **859** | **97** | **103** | **73 (68 kusů)** |

Všech 103 posunů způsobuje **úroveň stanice**, ani jeden suroviny (suroviny vyšších kvalit jsou vždy ze stejného nebo dřívějšího biomu). Podle stanice: Black Forge 55, Workbench 24, Galdr Table 14, Forge 10. Posuny „zobrazeno → skutečně“: ashlands→deep-north 41, mistlands→ashlands 17, black-forest→mountain 15, black-forest→swamp 10, meadows→black-forest 5, swamp→mistlands 4, plains→mistlands 4, swamp→mountain 3, ocean→mountain 1, swamp→ashlands 1, black-forest→mistlands 1, plains→ashlands 1.

Skupiny (kompletní seznam je v `scratchpad/vc44/avail2.json`):

| Skupina | Kusy | Posun |
|---|---|---|
| Workbench Q4 (úroveň 4) z Meadows | Crude Bow, Early Axes, Flint Axe, Flint Knife, Flint Spear | Q4 → Black Forest (Adze) |
| Workbench Q4 (úroveň 5) z Black Forest / Swamp / Ocean | Stagbreaker, Paws of the Bear, Bone Tower Shield (Q3), Abyssal Razor; zbroje Leather Armor (4 kusy), Troll Set (4), Bear Set (3), Celebratory Cap, Root Set (3) | Q4 → Mountain (Tool Shelf) |
| Forge Q4 (úroveň 4) z Black Forest | Bronze Sword, Bronze Axe, Bronze Mace, Bronze Spear, Bronze Atgeir, Copper Knife, Bronze Pickaxe; Bronze Armor (3 kusy) | Q4 → Swamp (Smith's Anvil / Grinding Wheel / Toolrack / Bellows) |
| Black Forge Q4 (úroveň 4) z Mistlands | Carapace Spear, Demolisher, Himminafl, Jotun Bane, Krom, Mistwalker, Skull Splittur, Spinesnap; Carapace Armor (3 kusy) | Q4 → Ashlands (Metal Cutter / Gem Cutter) |
| Galdr Table Q4 (úroveň 4) z Mistlands | Staff of Embers, Staff of Frost; Eitr-weave Set (4 kusy vč. Feather cape) | Q4 → Ashlands (Feathery Wreath) |
| Black Forge Q4 (úroveň 6) z Ashlands | Ash Fang, Berserkir Axes, Flametal Mace, Nidhögg, Ripper, Slayer, Splitnir; Ask Set (3), Ashen Cape | Q4 → Deep North (Smith's Aprons) |
| Galdr Table Q4 (úroveň 5) z Ashlands | Dundr, Staff of Fracturing, Staff of the Wild, Trollstav; Embla Set (3), Asksvin Cloak | Q4 → Deep North (Standing Loom) |
| Black Forge Q3 (úroveň 6) + Q4 (úroveň 7) „evolved“ Ashlands | 22 zbraní (Bleeding/Primal/Thundering Berserkir Axes, Blood/Root/Storm Fang, Bloodgeon, Brutal/Primal/Scourging Slayer, Dyrnwyn, Klossen, Nidhögg the Bleeding/Primal/Thundering, Root/Storm/Wound Ripper, Splitnir the Bleeding/Primal/Storming, Storm Star) | Q3 → Deep North, **Q4 nedosažitelné** (Black Forge 7 neexistuje) |
| Black Forge úroveň 1 s dřívějšími surovinami | Arbalest (zobrazeno Swamp), Skoll and Hati (Plains), Bone Bolt (Black Forest), Iron Bolt (Swamp), Black Metal Bolt (Plains, úroveň 2) | **už Q1 → Mistlands** *(wiki: Arbalest, Skoll and Hati, Bone Bolt, Iron Bolt, Black Metal Bolt — source Black Forge)* |
| Deep North („Frost Foundry“ = Black Forge 4–7 / Galdr Table 3–6) | 12 Nord zbraní, 12 Frostfire, 12 Thunderblood (Black Forge start 4), Protector Armor (3), Vanguard Set (3), Moose Hide Cape, Caller Set / Cape of the Caller | **Q4 nedosažitelné** (Black Forge 7, Galdr Table 6); Flametal Breastplate/Greaves mají chybná data (`stationLevel 10`) |

Opačný směr (zobrazeno později, než lze vyrobit): Leather Helmet, Leather Tunic, Leather Trousers — Q1 je Workbench 2 + Deer Hide (Meadows), ale set je zařazený do Black Forest, protože biom setu = max surovin Q1 **všech kusů** a Deer Hide Cape má Bone Fragments (`fetch-armor.mjs:757-782`; Bone Fragments = black-forest z tabulky `scripts/wiki/materials.mjs`).

### 3.3 Carapace Armor *(wiki: Carapace Armor)* — přesně

Infobox všech tří kusů: `source = Black Forge`, `crafting level = 1`; tabber „Quality N“: *Black forge level: 1 / 2 / 3 / 4*. Materiály: Q1 Carapace, Scale Hide, Mandible (helma), Iron (hruď, nohy), Refined Eitr; Q2–Q4 Carapace, Scale Hide, Refined Eitr — všechny Mistlands nebo dřívější (`items.json`: carapace, scale-hide, mandible mistlands; iron swamp; refined-eitr mistlands).

| Kvalita | Black Forge | Co to vyžaduje (§ 1.3) | Nejranější biom | Companion dnes |
|---|---|---|---|---|
| Q1 | 1 | Black Forge (Black Marble, Yggdrasil Wood, Black Core) | **Mistlands** | Mistlands ✓ |
| Q2 | 2 | + 1 rozšíření: Black Forge Cooler (Iron, Copper, Black Marble) | **Mistlands** | Mistlands ✓ |
| Q3 | 3 | + 2 rozšíření: Cooler + Vice (Iron, Copper, Mechanical Spring ← Artisan Table: Refined Eitr + Iron) | **Mistlands** (podle wiki) | Mistlands — shoda s wiki, **neshoda s Pavlem** („jen do lvl 2“) |
| Q4 | 4 | + 3 rozšíření: třetí je Metal Cutter nebo Gem Cutter (Flametal, Ashwood, Charred Bone / Morgen Sinew, Bloodstone) | **Ashlands** | Mistlands ✗ |

Totéž platí pro všech 8 Mistlands zbraní z Black Forge (Carapace Spear, Demolisher, Himminafl, Jotun Bane, Krom, Mistwalker, Skull Splittur, Spinesnap) a pro Galdr Table (Staff of Embers, Staff of Frost, Eitr-weave Set: Q4 až Ashlands přes Feathery Wreath).

### 3.4 Namátková kontrola 12 dalších kusů proti wiki

| Kus | Wiki (stránka) | `data/*.json` | Shoda | Dostupnost kvalit (vypočteno) | Companion ukazuje |
|---|---|---|---|---|---|
| Bronze Sword | Forge, `Upgrade station row\|Forge\|4\|start=1` → 1/2/3/4 | Forge 1/2/3/4 | ✓ | Q1–3 Black Forest, Q4 Swamp | Black Forest |
| Crude Bow | Workbench start=1 → 1/2/3/4 | Workbench 1/2/3/4 | ✓ | Q1–3 Meadows, Q4 Black Forest | Meadows |
| Stagbreaker | Workbench start=2 → 2/3/4/5 | Workbench 2/3/4/5 | ✓ | Q1–3 Black Forest, Q4 Mountain | Black Forest |
| Frostner | Forge start=3 → 3/4/5/6 | Forge 3/4/5/6 | ✓ | vše Mountain (Silver; Forge 7 už ve Swamp) | Mountain ✓ |
| Black Metal Sword | Forge start=4 → 4/5/6/7 | Forge 4/5/6/7 | ✓ | vše Plains | Plains ✓ |
| Ash Fang | Black forge start=3 → 3/4/5/6; text stránky: „level 3 … the highest upgrade currently obtainable“ (psáno před Deep North) | Black Forge 3/4/5/6 | ✓ | Q1–3 Ashlands, Q4 Deep North | Ashlands |
| Staff of Embers | Galdr table, start 1 → 1/2/3/4 | Galdr Table 1/2/3/4 | ✓ | Q1–3 Mistlands, Q4 Ashlands | Mistlands |
| Nord Sword | source Frost Foundry, crafting level 4, `Upgrade station row\|Black forge\|4\|start=4` → Black Forge 4/5/6/7 | **station „Frost Foundry“** 4/5/6/7 | stanice ✗ (Frost Foundry úrovně nemá) | Q1–3 Deep North, Q4 nedosažitelná (Black Forge max 6) | Deep North, Q4 nabízena |
| Wolf Armor / Drake Helmet | Forge level 1/2/3/4 (head) | Forge **1/3/4/5** | ✗ (parser vzal úrovně chest/legs) | Q1–4 Mountain | Mountain |
| Padded Armor / Padded Cuirass | Q1 Forge 2 (chest/legs), Q2 Forge 2, Q3 3, Q4 4 | Forge 2/2/3/4 | ✓ (wiki tak píše) | vše Plains (Forge 7 ve Swamp) | Plains ✓ |
| Flametal Armor | Black forge level 3/4/5/6 | Helmet **3/3/3/3**, Breastplate a Greaves **3/10/10/10** | ✗✗ | Q1–3 Ashlands, Q4 Deep North | Ashlands |
| Caller Set | Galdr Table 3 (cast) / 4 / 5 / 6 | Galdr Table **1**/4/5/6 | ✗ Q1 | Q1–3 Deep North, Q4 nedosažitelná (Galdr max 5) | Deep North |

Anomálie v `levels[].stationLevel` (posloupnost není +1): 10 kusů zbroje — Caller Set ×3 (`1/4/5/6`), Flametal Armor ×3 (`3/3/3/3`, `3/10/10/10` ×2), Drake Helmet (`1/3/4/5`), Padded Cuirass/Greaves/Linen Cape (`2/2/3/4` — u hrudi a nohou wiki‑věrné, u Linen Cape wiki říká Workbench 1/2/3/4). U zbraní 0 (vznikají vzorcem).

## 4. Kde companion předpokládá dostupnost (inventura)

| Místo | Soubor:řádky | Co dělá dnes | Co je špatně | Jak má být |
|---|---|---|---|---|
| **Smithy – seskupení** | `apps/smithy/assets/app.js:600-626` (sety podle `armor.biome`, zbraně podle `w.biome`), `:644-690` (karta biomu zamčená/odemčená podle `VCProgress.revealedBiomes`, `:105`) | Kus patří do biomu surovin Q1 | 5 kusů (Arbalest, Skoll and Hati, 3 šipky) je v biomu dřív, než existuje Black Forge; Leather Armor naopak později | Seskupovat podle `availableFrom` Q1 (otázka O-5) |
| **Smithy – nabídka kvalit** | `:1003` (`maxQ = weapon.maxQuality` → selecty Mám/Chci Q1..maxQ), `:1655, :1677` (zbroj), `:1354-1427` (sloupce Q1–Q4 v tabulce setu), `:1484-1493` (zvýraznění kvality) | Q1–Q4 vždy, bez ohledu na biom | 103 kvalit nabízeno dřív; 73 kvalit nad maximem stanice | Kvalita s `availableFrom` v neodhaleném biomu zamčená s důvodem; nedosažitelná označena „not yet available“ a vyřazená z výchozího výběru |
| **Smithy – rozpis ceny** | `:1151-1153`, `:1527-1529` (`stName + ' ' + t('Level {level}')`) | Ukáže „Black Forge Level 4“ | Bez informace, že úroveň 4 je až v Ashlands | Doplnit biom úrovně (`t('{station} level {level} — {biome}')`), zamčeno podle progressu |
| **Smithy – košík** | `:394` (`want` default = `maxQuality`), `:2093-2094` | Chci = Q4 | Nakupní seznam počítá suroviny na Q4, které v biomu nejde vyrobit | Default `want` = nejvyšší kvalita dostupná v odhalených biomech |
| **Smithy – data** | `scripts/build-armourer-data.mjs` (`stations … .filter(station => station.type !== 'comfort')`) | Workbench/Forge/Black Forge/Artisan Table/Stonecutter (type `comfort`) do Smithy **nejdou** | Smithy nemá stanici ani její biom k dispozici | Po O-1 posílat záznamy stanic s `levels[]` |
| **Bestiary – doporučení** | `apps/bestiary/assets/rank.js:533-538` (`recommend()` filtruje `w.tier <= tier`), `:110-115` (`weaponDamage(weapon, quality='max')`), `:332, :422, :920` (`player.quality ?? 'max'`); `shared/player/core.js:49` (`DEFAULT_PLAYER.quality: 'max'`) | Zbraň z biomu ≤ aktuální, poškození na **Q4** | V Black Forest doporučuje Bronze Sword Q4 (Forge 4 = Swamp), v Mistlands Carapace Spear Q4 (Ashlands) | Při `quality: 'max'` použít max kvalitu **dosažitelnou v biomu bytosti** (`availableFrom ≤ biome`) |
| **Předpočítaná doporučení** | `scripts/recommend.mjs:99-121` → `data/recommendations.json` (`recommend(creature, biome, weapons, DEFAULT_PLAYER)`) | Jako výše, pro každý pár biom:bytost | Totéž, zapečené v datech | Předat `qualityCap` podle biomu |
| **Bestiary – UI** | `apps/bestiary/assets/app.js:541-561` (select „Upgrade level“ Max/1–4), `:705-708` („Max Quality“), `:726` (zobrazí `stationLevel`) | Statické | Nic neříká, kde je Q4 reálné | Popisek „Max quality here: Q3“ + tooltip s biomem |
| **Damage Calculator – guide** | `apps/damage-calculator/src/lib/progression.ts:49-75` (`maxQualityAt()` — jen `MATERIAL_BIOME` surovin), `src/lib/guide.ts:110-125` (`qualityFor`), `src/components/progression-guide.tsx` | „How far can it be upgraded“ jen podle surovin | Říká Q4 pro Bronze Sword v Black Forest atd. (stejných 103 kvalit) | `maxQualityAt` doplnit o úroveň stanice z `src/data/recipes.json` (kalkulačka má vlastní kopii dat: `src/data/recipes.json`, `materials.ts`) |
| **Items Compendium** | `apps/items/assets/app.js:375-378` („{station} — Level {level}“), `:316-337` (spoilery jen u bytostí); `scripts/build-items-data.mjs:116-121, 1231-1253` (normalizace stanice/úrovně) | Biom položky = suroviny; úroveň stanice zobrazena bez biomu | Např. Arbalest v Swamp; „Black Forge — Level 4“ bez „Ashlands“ | `recipe.availableFrom`, zámek v modalu |
| **Expedition** | `apps/expedition/assets/app.js:355-368` (`weapons.filter(w => w.tier <= tier && open.includes(w.biome))` + `VCRank.recommend(..., player)`), `:410-418` (loadout: `stationLevel` pro `player.quality`), `:475` (zbroj podle odhalených biomů), `:594` (úroveň stanice pro nákupní seznam) | Na bosse doporučí zbraň v Q4 a do seznamu dá suroviny Q4 + „Black Forge 4“ | Pro The Queen (Mistlands) chce Black Forge 4 = Ashlands | Kvalita omezená `availableFrom ≤ biom bosse` |
| **Provisions** | `data/food.json.stationLevel`; `data/stations.json` cauldron `maxLevel`, `levels[]`, rozšíření `progressionLevel` (`fetch-provisions.mjs:141`); `apps/provisions/assets/planner.js:94-107` (chybějící rozšíření podle `state.cauldronLevel`), `advisor.js:44-72` (odemknuto podle biomu jídla), `app.js:119-122, 396-397` (volba úrovně Cauldronu) | Úroveň Cauldronu umí (ručně zadaná), ale biom jídla = suroviny | 5 jídel s Cauldronem zařazeno do Meadows (Boar Jerky, Carrot Soup, Minced Meat Sauce L1; Onion Soup, Turnip Stew L2) — Cauldron vyžaduje Tin (Black Forest) | `availableFrom` jídla = max(suroviny, biom úrovně Cauldronu); `progressionLevel` doplnit o `biome` |
| **Comfort** | `apps/comfort/assets/planner.js:109`, `app.js:184-189` | Stanice bez úrovní | Nic k řešení (nábytek úrovně nemá); jen biom stanice se nehlídá | Mimo rozsah |
| **Progress** | `shared/progress/core.js` (`revealedBiomes`, `reach`, `minReach`) | Zdroj odhalených biomů | V pořádku — je to brána, podle které se má zamykat | Beze změny |

## 5. Návrh dat

### 5.1 Úrovně stanic v `data/stations.json`

Rozšířit záznamy `workbench`, `forge`, `black-forge`, `galdr-table`, `artisan-table`, `cauldron` o pole podle precedentu Cauldronu (`fetch-provisions.mjs:141`, DATA-SCHEMA § `data/stations.json`):

```json
{
  "id": "black-forge", "name": "Black Forge", "type": "crafting",
  "materials": [...], "unlock": { "station": "workbench", "materials": [...] },
  "biome": "mistlands", "tier": 7,
  "maxLevel": 6,
  "levels": [
    { "level": 1, "upgrade": null,                 "biome": "mistlands",  "tier": 7 },
    { "level": 2, "upgrade": "black-forge-cooler", "biome": "mistlands",  "tier": 7 },
    { "level": 3, "upgrade": "vice",               "biome": "mistlands",  "tier": 7 },
    { "level": 4, "upgrade": "metal-cutter",       "biome": "ashlands",   "tier": 8 },
    { "level": 5, "upgrade": "gem-cutter",         "biome": "ashlands",   "tier": 8 },
    { "level": 6, "upgrade": "smith-s-aprons",     "biome": "deep-north", "tier": 9 }
  ]
}
```

a záznamy rozšíření jako samostatné položky stejného souboru (jako `spice-rack` … `smoker` dnes): `{ id, name, names, wiki, type: "upgrade", upgrades: "<station-id>", materials[], unlock: { station }, biome, tier, progressionLevel }`. `levels[]` se řadí podle biomu rozšíření (nejranější první), `levels[L].biome = max(biom stanice, biom L−1 nejranějších rozšíření)`; biom rozšíření = max(biom surovin, biom stanice, u které se staví, biom stanice potřebné na výrobu suroviny — Sharpening Stone → Stonecutter, Mechanical Spring → Artisan Table). `progressionLevel` zůstává kompatibilní (Provisions planner ho čte).

**Vlastnictví záznamů** (DATA-SCHEMA § `data/stations.json`: každý fetcher nahrazuje jen své záznamy; `mergeStations` ve `fetch-stations.mjs` nahrazuje celý záznam na místě, takže pole přidané jiným skriptem by další běh vlastníka smazal): workbench/forge/black-forge/artisan-table/stonecutter píše `fetch-comfort.mjs` (type `comfort`), galdr-table `fetch-expedition.mjs`, cauldron `fetch-provisions.mjs`. **Rozhodnutá varianta:** přesunout výrobní stanice (workbench, forge, black-forge, galdr-table, artisan-table, stonecutter) pod `fetch-stations.mjs` (rozšířit `STATION_PAGES`, nový `type: "crafting"`, parser oddílu `== Upgrades ==` do nového modulu `scripts/wiki/station-upgrades.mjs`), z `fetch-comfort.mjs` a `fetch-expedition.mjs` je odebrat. Cauldron zůstane v `fetch-provisions.mjs`, který jen zavolá týž modul pro `levels[].biome`. Smithy build (`build-armourer-data.mjs`) filtr `type !== 'comfort'` tím přirozeně začne stanice posílat; Comfort build (`build-comfort-data.mjs`) je musí nadále dostávat — ověřit, že čte stanice podle `id`, ne podle `type`.

Zamítnuté varianty: (a) parsovat rozšíření ve třech fetcherech zvlášť (trojí logika), (b) nový soubor `data/station-levels.json` (pátý soubor o stanicích, UI by skládalo dva zdroje).

### 5.2 `availableFrom` u kvalit

Do `data/weapons.json` a `data/armor.json` přidat na každé úrovni `levels[q].availableFrom: <biomeId>` a `levels[q].availableTier: <order>`; k tomu `levels[q].unreachable: true`, když `stationLevel > stations[station].maxLevel`. Na úrovni kusu `availableFrom = levels[0].availableFrom`. Pole `biome` zatím **nepřepisovat** (čte ho 9 míst; viz otázka O-5) — až po rozhodnutí.

```
availableFrom(q) = biomeMax(
  cumulativeMaterialsBiome(levels[1..q]),   // items.json biome, chybí-li → chyba fetcheru, ne tichý null
  stations[stationId].levels[levels[q].stationLevel].biome
)
```

Stejně `data/items-compendium.json` → `recipe.availableFrom`, `data/food.json` → `availableFrom` (Cauldron), `apps/damage-calculator/src/data/recipes.json` → `qualities[].availableFrom` (kalkulačka má vlastní data).

### 5.3 Kdo to počítá

Sdílený čistý modul **`scripts/wiki/station-levels.mjs`** (vstup: pole stanic z `data/stations.json`; export `levelBiome(stationId, level)`, `maxLevel(stationId)`, `availableFrom(levels, stationId, materialBiome)`), bez I/O, s testem. Volají ho **fetchery** (`fetch-weapons.mjs` po kroku 7 na ř. 542-570, `fetch-armor.mjs` po kroku 7 na ř. 757-782, `fetch-provisions.mjs` u jídel), ne až build skripty — protože `data/weapons.json` čte přímo i `scripts/recommend.mjs` a testy, a `data/*.json` je kontrakt v DATA-SCHEMA. Pořadí: `fetch-stations` → `fetch-weapons`/`fetch-armor`/`fetch-provisions` → `build-*`. Idempotence: vstupem je jen committed `data/stations.json` a wiki cache, výstup deterministický; test „dvakrát spustit = žádný diff“ už existuje pro stanice (`scripts/wiki/stations-merge.test.mjs:35`), rozšířit.

Normalizace názvu stanice je nutná součást: `weapons[].station` má „Black Forge“ 67×, „Black forge“ 9×, „Frost Foundry“ 18× (správně Black Forge podle `Upgrade station row`; Frost Foundry uložit zvlášť jako `finishedAt`), „Always available“/„Player crafting menu“ 3×; `armor` kusy „Frost Foundry“ 9×. Mapa `stationId` slug → záznam v `stations.json`.

## 6. Balíky oprav (pořadí závislostí)

Všechny balíky: větev z `main`, commity anglicky, `npm test` zelený, `npm run build` exit 0 a čistý strom, žádná změna `docs/STAV.md` prováděčem. UI texty ve 13 jazycích (`apps/*/locales/messages.json`, test `scripts/armourer-i18n.test.mjs:51` „catalogs cover 13 languages“), texty s číslem přes `tn`, názvy ze hry anglicky.

### O-1 Data: úrovně stanic a jejich biom — **normální**, Sonnet (nebo Sol)
Soubory: `scripts/wiki/fetch-stations.mjs` (STATION_PAGES + Workbench, Forge, Black Forge, Galdr Table, Artisan Table, Stonecutter; type `crafting`), nový `scripts/wiki/station-upgrades.mjs` (parser tabulky `== Upgrades ==`: řádky `|[[Název]]` + buňka materiálů v obou formátech `{{Item link|X|n}}` i `n [[X]]`; biom přes `createMaterialResolver` + pravidla z § 5.1), `scripts/wiki/fetch-comfort.mjs` a `fetch-expedition.mjs` (odebrat převzaté záznamy), `scripts/wiki/fetch-provisions.mjs` (cauldron `levels[].biome`), `data/stations.json`, `data/report-stations.md` (tabulka § 2), `docs/DATA-SCHEMA.md` § `data/stations.json`.
Kroky: 1) parser + test na wikitextu Black Forge z cache (5 rozšíření, Vice → mistlands, Metal Cutter → ashlands); 2) přesun vlastnictví; 3) `node scripts/wiki/fetch-stations.mjs && node scripts/wiki/fetch-comfort.mjs && node scripts/wiki/fetch-expedition.mjs && node scripts/wiki/fetch-provisions.mjs` dvakrát; 4) `node scripts/build-comfort-data.mjs && node scripts/build-armourer-data.mjs` — Comfort nesmí ztratit stanice.
Hotovo, když: `node -e` nad `data/stations.json` vypíše pro 6 stanic přesně tabulku § 2 (`maxLevel` 5/7/6/5/7/2, biomy úrovní jak uvedeno); 26 záznamů rozšíření s `upgrades` a `biome`; druhý běh fetcherů → `git status --short` prázdný; `npm test` zelený; Comfort build obsahuje stejné stanice jako před změnou (diff `apps/comfort/data/data.js` jen o nová pole).

### O-2 Data: opravy parsování úrovní a stanic — **normální**, Sonnet
Soubory: `scripts/wiki/fetch-armor.mjs:366-402` (tabber „Quality N“: brát úroveň podle kusu — závorky „(head)“, „(chest/legs)“, „(cape)“, „(cast)“; Flametal `3/10/10/10` → 3/4/5/6, Drake Helmet → 1/2/3/4, Caller Set Q1 → 3, Linen Cape → 1/2/3/4), `scripts/wiki/fetch-weapons.mjs:336-361` (stanice z `{{Upgrade station row|<stanice>|…}}` má přednost před infobox `source`, infobox `source` jít do `finishedAt` když se liší; normalizace „Black forge“ → „Black Forge“), `data/weapons.json`, `data/armor.json`, `data/report-weapons.md`, `data/report-armor.md`.
Hotovo, když: `node -e` kontrola „levels[].stationLevel je +1 posloupnost“ dává 0 výjimek kromě Padded Cuirass/Greaves (`2/2/3/4`, wiki‑věrné — zapsat do reportu); žádný kus nemá `station: "Frost Foundry"`, 27 kusů má `finishedAt: "Frost Foundry"`; `station` nabývá jen hodnot z `stations.json` + `null`; `npm test` zelený; `git diff --stat` ukazuje změny jen u vyjmenovaných kusů (přiložit seznam do zprávy).

### O-3 Data: `availableFrom` a suroviny — **normální**, Sonnet
Závisí na O-1, O-2. Soubory: nový `scripts/wiki/station-levels.mjs` + `scripts/wiki/station-levels.test.mjs` (fixtury: Carapace Armor Q1–Q4 → mistlands ×3, ashlands; Bronze Sword Q4 → swamp; Nord Sword Q4 → `unreachable`), `fetch-weapons.mjs`, `fetch-armor.mjs`, `fetch-provisions.mjs` (jídla), `scripts/wiki/materials.mjs` (Coal → meadows nebo black-forest podle wiki Charcoal Kiln; Ymir Flesh → podle `overrides` Haldor po The Elder, sjednotit s kompendiem; doplnit Sharpening Stone (swamp, Stonecutter), Mechanical Spring (mistlands, Artisan Table), Asksvin Trophy (ashlands) do `data/items.json`), `docs/DATA-SCHEMA.md` § weapons/armor/items/food.
Hotovo, když: každý kus s `levels` má na každé úrovni `availableFrom` a `availableTier`; `node -e` přepočet podle § 3.2 dává **103** kvalit s `availableTier > tier` a **73** s `unreachable: true` (nebo odůvodněný rozdíl po O-2); `data/items.json` obsahuje `sharpening-stone`, `mechanical-spring`, `asksvin-trophy`; `items.json.biome === items-compendium.biome` pro všechny suroviny použité v receptech (dnes 2 rozdíly: coal, ymir-flesh); testy zelené.

### O-4 Generátory a doporučení — **normální**, Sonnet
Závisí na O-3. Soubory: `scripts/build-armourer-data.mjs` (stanice typu `crafting` + `levels` do `VA_DATA.stations`), `scripts/build-data.mjs` (VC_DATA.weapons s `availableFrom`), `scripts/build-items-data.mjs` (`recipe.availableFrom` přes `station-levels.mjs`; odstranit vlastní parsování „level N“ tam, kde už je `stationLevel` v datech), `scripts/build-expedition-data.mjs`, `scripts/build-provisions-data.mjs`, `apps/bestiary/assets/rank.js:533-538` (`recommend(creature, biome, weapons, player)`: při `player.quality === 'max'` použít pro každou zbraň `maxReachableQuality(weapon, biome.tier)` = nejvyšší q s `availableTier ≤ biome.tier` a `!unreachable`), `scripts/recommend.mjs`, `data/recommendations.json`, `scripts/parity.test.mjs`/`recommend.test.mjs` (fixtury).
Hotovo, když: `data/recommendations.json` pro `black-forest:*` neobsahuje bronzové zbraně s `quality 4` (přidat pole `quality` do záznamu doporučení); `mistlands:the-queen` doporučuje Carapace Spear nanejvýš Q3; `npm run build` exit 0; `apps/smithy/data/data.js` obsahuje `stations[].levels`; testy zelené.

### O-5 UI Smithy — **velký**, Sonnet
Závisí na O-4. Soubory: `apps/smithy/assets/app.js` (`:600-626` seskupení podle `availableFrom` po rozhodnutí O-5 v § 7; `:1003, :1655, :1677, :2093` selecty jen do max dostupné kvality v odhalených biomech, vyšší volby `disabled` s titulkem; `:1354-1427` buňky Q s `availableTier` nad odhalením zamčené „🔒“ (stejná konvence jako zamčené suroviny `:334-337`); `:1151-1153, :1527-1529` text „{station} level {level} — {biome}“ / „not yet available“; `:394` default `want`), `apps/smithy/assets/styles.css`, `apps/smithy/locales/messages.json` (nové klíče ve 13 jazycích: „Available from {biome}“, „Requires {station} level {level} ({biome})“, „Not yet available in the game“, „Max quality here: Q{level}“), `scripts/smithy-data.test.mjs`, `scripts/armourer-i18n.test.mjs`, `scripts/check-mobile.mjs` (0 přesahů na 360 px).
Hotovo, když: s čistým profilem (jen Meadows) ukáže Crude Bow volbu Chci Q1–Q3 a Q4 zamčenou s důvodem; s odhalenými Mistlands ukáže Carapace Armor Q1–Q3, Q4 zamčeno „Black Forge level 4 — Ashlands“; se „Show all (spoilers)“ vše odemčené; Nord Sword Q4 označena „Not yet available in the game“ a není v default košíku; `prohlizec kontrola` bez vad na `/smithy/`, 0 chyb v konzoli; i18n test 13 jazyků zelený; `check-mobile` 0.

### O-6 UI Bestiary, Expedition, Damage Calculator — **velký**, Sonnet
Závisí na O-4. Soubory: `apps/bestiary/assets/app.js:541-561, :705-708, :726` (popisek „Max quality here: Q{level}“ u zbraně v biomu; select „Upgrade level“ nabízí jen dosažitelné), `apps/expedition/assets/app.js:355-368, :410-418, :594` (kvalita omezená biomem bosse; nákupní seznam podle ní), `apps/damage-calculator/src/lib/progression.ts:49-75` (`maxQualityAt` doplnit o `stationLevel` + tabulku úrovní; zdroj `src/data/recipes.json` — doplnit generátor kalkulačky o `stationLevel`/`availableFrom` z `data/weapons.json`), `src/lib/guide.ts:110-125`, `src/components/progression-guide.tsx`, lokalizace všech tří aplikací, testy `scripts/recommend.test.mjs`, `scripts/expedition-planner.test.mjs`, `scripts/calculator-progress.test.mjs`.
Hotovo, když: Bestiary pro Greydwarf (Black Forest) s profilem „Max“ počítá Bronze Sword na Q3 a říká to v UI; Expedition pro The Queen nepožaduje Black Forge 4; kalkulačka na kroku Black Forest hlásí u Bronze Sword „upgradeable to Q3“ a jako blokující důvod „Forge level 4“; parity test Bestiary × kalkulačka zelený; 13 jazyků.

### O-7 UI Items Compendium a Provisions — **normální**, Sonnet nebo Sol
Závisí na O-4. Soubory: `apps/items/assets/app.js:375-378` (přidat biom úrovně a zámek), filtr/řazení podle `recipe.availableFrom`; `apps/provisions/assets/advisor.js:44-72` a `planner.js:94-107` (odemknutí jídla podle `availableFrom`, chybějící rozšíření podle biomu — `stations[].levels[].biome`), `apps/provisions/assets/app.js:119-122` (text úrovně s biomem), lokalizace, `scripts/items-compendium.test.mjs`, `scripts/provisions-advisor.test.mjs`.
Hotovo, když: 5 jídel s Cauldronem (Boar Jerky, Carrot Soup, Minced Meat Sauce, Onion Soup, Turnip Stew) se s odhaleným jen Meadows nenabízí (nebo je zamčeno podle rozhodnutí O-9); Arbalest, Skoll and Hati a 3 šipky jsou v kompendiu s `availableFrom: mistlands`; testy zelené; `check-mobile` 0.

### O-8 Testy a dokumentace — **malý**, Haiku
Závisí na O-5–O-7. Soubory: `scripts/stations.test.mjs` (tabulka § 2 jako fixture proti `data/stations.json`), `scripts/smithy-data.test.mjs` (Carapace Armor Q1–Q4 fixture), `docs/DATA-SCHEMA.md` (nová pole), `docs/ANALYZA.md` (nový § „Úrovně stanic a dostupnost kvalit“ s pravidlem a tabulkou § 2), `data/report-stations.md`.
Hotovo, když: `npm test` zelený, dokumentace popisuje `maxLevel`, `levels[]`, `availableFrom`, `availableTier`, `unreachable`, `finishedAt`; žádný údaj v dokumentaci nepochází z STAV.

Celkem 8 balíků; odhad: 1 malý, 5 normálních, 2 velké. Prováděči: Sonnet (6×), Sol/Luna alternativně u O-1 a O-7, Haiku u O-8. Review vždy Opus/Fable/Astra.

## 7. Otázky pro Pavla

**O-1 Zobrazení nedostupné kvality v odhaleném biomu (Smithy, kompendium).**
(a) Skrýt sloupce/volby Q nad dostupností — čisté, ale hráč neví, že vylepšení existuje. (b) Ukázat zamčené „🔒 vyžaduje vyšší úroveň stanice“ bez jména biomu — bez spoileru, ale méně užitečné. (c) Ukázat zamčené s důvodem „Black Forge level 4 — available in Ashlands“ — stejná konvence, jakou Smithy už má u zamčených surovin (`app.js:334-337` jmenuje nejranější biom). (d) Jen při zapnutém „Show all (spoilers)“.
**Doporučení: (c)** — konzistentní s dnešní konvencí zamčených surovin; při „Show all“ odemknout.

**O-2 Kvality nad maximem stanice („not yet available“, 68 kusů / 73 kvalit).**
(a) Nezobrazovat vůbec. (b) Zobrazit s odznakem „Not yet available in the game“ (dikce wiki modulu), vyřadit z doporučení a z default košíku. (c) Nechat jak je.
**Doporučení: (b)** — data z wiki jsou, hra je může odemknout s dalším rozšířením; odznak drží companion pravdivý.

**O-3 Carapace Armor Q3 / Vice.** Wiki: Vice (Iron, Copper, 2 Mechanical Spring; Mechanical Spring = Artisan Table, 1 Refined Eitr + 3 Iron) → Black Forge 3 v Mistlands → Carapace Q3 v Mistlands. Pavel: „v rámci Mistlands jen do lvl 2“.
(a) Věřit wiki (Q3 Mistlands, Q4 Ashlands). (b) Věřit pozorování a zapsat override „Vice = Ashlands“ do `data/overrides.json` (s odůvodněním). (c) Ověřit ve hře (postavit Vice v Mistlands) a pak rozhodnout.
**Doporučení: (c), do té doby (a)** — wiki je konzistentní na 3 stránkách (Black Forge, Vice, Mechanical Spring).

**O-4 Výchozí kvalita v doporučeních (Bestiary, `recommendations.json`, Expedition).**
(a) Nechat „Max“ = Q4. (b) „Max“ = nejvyšší kvalita dosažitelná v biomu bytosti/bosse. (c) Obojí: „Max“ + přepínač „Only what I can craft here“.
**Doporučení: (b)** — jinak pořadí zbraní v Black Forest počítá s kovárnou ze Swampu; explicitní volba Q1–Q4 zůstane.

**O-5 Co je `biome` předmětu.** Dnes = max biom surovin Q1 (5 kusů tím padá do dřívějšího biomu, Leather Armor do pozdějšího).
(a) `biome` := `availableFrom` Q1 (Arbalest, Skoll and Hati, 3 šipky → Mistlands; Leather Armor → Meadows) — mění seskupení a `tier` (doporučení, kompendium). (b) `biome` nechat, `availableFrom` jen pro zámky. 
**Doporučení: (a)** — Smithy i kompendium odpovídají na „kde to vyrobím“; změna se týká 8 kusů.

**O-6 Deep North kusy a „Frost Foundry“.** (a) Stanice = Black Forge (úrovně 4–7), `finishedAt: Frost Foundry` jako doplňující text „hardened in Frost Foundry“. (b) Nechat „Frost Foundry“ a úrovně mapovat tiše.
**Doporučení: (a)** — odpovídá wiki (Nord Sword: `Upgrade station row|Black forge|4|start=4`, Frost Foundry: „Casts are made at the Black Forge or the Galdr Table“).

**O-7 Zdroj pravdy biomu suroviny při neshodě `items.json` × kompendium** (Coal swamp/meadows, Ymir Flesh swamp/black-forest, Sharpening Stone –/black-forest).
(a) Opravit `scripts/wiki/materials.mjs` + `overrides.json`, kompendium jen dědí. (b) Kompendium má přednost.
**Doporučení: (a)** — `items.json` je zdroj pro Smithy i fetchery.

**O-8 Obchodníci (Haldor, Hildir, Bog Witch).** Zboží bez kvalit (kosmetika, Megingjord…) se úrovně stanic netýká; suroviny od obchodníků (Ymir Flesh po The Elder) už mají `overrides`. (a) Nechat mimo rozsah. (b) Přidat `availableFrom` i zboží podle odemknutí obchodníka (`traders.json.unlockedBy`).
**Doporučení: (a)** teď; (b) jako samostatná úloha po VC-42.

**O-9 Provisions – 5 jídel s Cauldronem zařazených do Meadows.** (a) Přesunout do Black Forest (`availableFrom`). (b) Nechat v Meadows se zámkem „needs Cauldron (Black Forest)“.
**Doporučení: (a)** — Provisions seskupuje podle biomu; Cauldron bez Tinu nepostavíš.

---
Reprodukce čísel: `scratchpad/vc44/index-cache.mjs` (index cache), `upgrades.mjs` (§ 1), `avail2.mjs` (§ 3.2, výstup `avail2.json`); všechny čtou jen `data/raw/`, `data/*.json` a `data/biomes.json` ze stromu `valheim-units-CC`.
