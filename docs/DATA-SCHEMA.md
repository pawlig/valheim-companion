# Schéma dat — Valheim Companion

Závazné pro VC-1, VC-2 a VC-3. Změnu schématu smí udělat jen orchestrátor.

Všechny JSONy jsou UTF-8, odsazené 2 mezerami, pole seřazená deterministicky (biomy podle `order`, jednotky a zbraně podle `name`).
`id` = slug z názvu stránky na wiki: malá písmena, cokoliv mimo `[a-z0-9]` → `-`, sloučené a oříznuté pomlčky.
Diakritika se nejdřív odstraní (`normalize('NFKD')` + smazat kombinující znaky).
Příklady: `Greydwarf (Deep North)` → `greydwarf-deep-north`, `Zil & Thungr` → `zil-thungr`, `Nidhögg` → `nidhogg`.

Typy poškození (`DamageType`): `blunt`, `slash`, `pierce`, `chop`, `pickaxe`, `fire`, `frost`, `lightning`, `poison`, `spirit`.
Stupně (`ModTier`): `veryweak` (2), `weak` (1.5), `slightlyweak` (1.25), `neutral` (1), `slightlyresistant` (0.75), `resistant` (0.5), `veryresistant` (0.25), `immune` (0).

## `data/biomes.json`

```json
[
  {
    "id": "meadows",
    "name": "Meadows",
    "order": 1,
    "tier": 1,
    "image": "img/biomes/meadows.png",
    "wiki": "https://valheim.weirdgloop.org/w/Meadows",
    "creatures": {
      "boss": ["eikthyr"],
      "miniboss": [],
      "hostile": ["boar", "greyling", "neck"],
      "passive": ["deer", "gull"],
      "fish": ["perch", "pike"]
    }
  }
]
```

`order` a `tier` jsou shodné (tier = order): 1 Meadows, 2 Black Forest, 3 Ocean, 4 Swamp, 5 Mountain, 6 Plains, 7 Mistlands, 8 Ashlands, 9 Deep North (viz `docs/ANALYZA.md` § 14).

`boss` vs `miniboss`: miniboss = stránka je v `Category:Minibosses`. `fish` = stránka je v `Category:Fish`. Ostatní z pole `passive` biomu jde do `passive`.

## `data/creatures.json`

```json
[
  {
    "id": "greydwarf",
    "name": "Greydwarf",
    "wiki": "https://valheim.weirdgloop.org/w/Greydwarf",
    "gameIds": ["Greydwarf"],
    "kind": "hostile",
    "biomes": ["black-forest"],
    "faction": "Forest",
    "behavior": "Aggressive",
    "tameable": false,
    "weakPoints": [],
    "stagger": "30%",
    "hasStars": true,
    "stars": [
      {
        "star": 0,
        "image": "img/creatures/greydwarf-0.png",
        "health": 40,
        "healthText": "40",
        "attacks": [
          { "name": "Attack", "damage": { "slash": 14 }, "raw": "Attack: 14 Slash" },
          { "name": "Throw", "damage": { "blunt": 10 }, "raw": "Throw: 10 Blunt" }
        ]
      }
    ],
    "abilities": ["Attack (2s)", "Throw (8s)"],
    "modifiers": { "fire": "veryweak", "poison": "resistant", "spirit": "immune" },
    "otherImmunities": [],
    "drops": ["Greydwarf Eye", "Greydwarf Trophy", "Resin", "Stone", "Wood"],
    "trophy": { "name": "Greydwarf Trophy", "image": "img/creatures/greydwarf-trophy.png" },
    "summon": null,
    "location": "Black Forest",
    "spawns": ["Anywhere in Black Forest during the daytime (limit 3)"],
    "description": "Greydwarfs are aggressive creatures found in Black Forests. …"
  }
]
```

Pravidla:
- `kind`: `boss` | `miniboss` | `hostile` | `passive` | `fish`, podle sekce biomu, ve které je jednotka poprvé (nejnižší `order`).
- `biomes`: všechny biomy, ve kterých je jednotka uvedená, seřazené podle `order`.
- `stars`: jen úrovně, které infobox skutečně uvádí (má neprázdné `health Nstar` nebo `damage Nstar`), seřazené podle `star`. Může tedy mít 1, 2 nebo 3 prvky a nemusí začínat nulou (Lord Reto má jen `star: 2`). `hasStars = stars.length > 1`. Chybí-li obrázek pro danou úroveň, použije se obrázek nejbližší nižší úrovně, jinak první dostupný.
- `health`: číslo. Čárky a mezery v tisících se ignorují (`12,500` → 12500). Fáze (`10000 + 7000 + 30000`) a části (`* Thungr: 4200 * Zil: 2400`) se sečtou a `healthText` je původní text bez wiki značek (víc řádků oddělených `\n`). Nečíselné HP → `health: null`.
- `healthByBiome`: jen když řádky HP začínají názvem biomu (`Meadows: 30`, Skeleton). Je to objekt `{ "<biomeId>": číslo }` a `health` je pak `null`. Jinak pole chybí.
- `weakPoints`: `[{ "part": "Head", "modifiers": { "pierce": "veryweak" } }]` z polí `weak point`, `wp veryweak`, `wp weak`, `wp resistant`… Žádný slabý bod → `[]`.
- `attacks[].name`: u vnořených seznamů složené z rodiče a potomka (`"Axe – Cleave"`), u fází s předponou (`"Phase 1 – Chain Slam"`). `damage` obsahuje jen typy z `DamageType`. `raw` je řádek bez wiki značek. Nejde-li řádek rozparsovat, `damage: {}` a `raw` se vyplní.
- `modifiers`: jen typy, které infobox výslovně uvádí. Výchozí hodnoty z `docs/ANALYZA.md` § 4 doplňuje až výpočet v VC-2, ⛔ ne tento soubor.
- `spawns`: řádky ze `{{spawn row|type=…|limit=…}}` převedené na čistý text. Žádná šablona → `[]`.
- `description`: první odstavec textu stránky bez wiki značek, max 400 znaků.
- Všechny texty jsou čisté: bez `[[`, `]]`, `{{`, `'''`, `<br>` a HTML entit (`&nbsp;` → mezera).
- Obrázky jsou relativní cesty v repu. Neexistující obrázek → `null`.

## `data/materials.json` (VC-2)

```json
[{ "name": "Black Metal", "biome": "plains", "tier": 5, "how": "table" }]
```
`how`: `table` (z tabulky v ANALYZA § 3) | `wiki` (dohledáno z wiki, s krátkým důvodem v `note`) | `unresolved` (`biome: null`).

## `data/weapons.json` (VC-2)

```json
[
  {
    "id": "frostner",
    "name": "Frostner",
    "wiki": "https://valheim.weirdgloop.org/w/Frostner",
    "gameId": "MaceSilver",
    "category": "club",
    "hands": "1h",
    "type": "Club 1h",
    "image": "img/weapons/frostner.png",
    "station": "Forge",
    "stationLevel": 3,
    "maxQuality": 4,
    "damage": { "blunt": 35, "frost": 40, "spirit": 20 },
    "perLevel": { "frost": 6, "blunt": 0 },
    "damageMax": { "blunt": 35, "frost": 58, "spirit": 20 },
    "stamina": 12,
    "knockback": 100,
    "skill": "clubs",
    "backstab": 3,
    "materials": [{ "name": "Silver", "amount": 30 }],
    "tier": 4,
    "biome": "mountain",
    "description": "The dead fear silver. Remind them why."
  }
]
```

`skill` (od VC-5): `swords` | `axes` | `clubs` | `spears` | `polearms` | `knives` | `fists` | `pickaxes` | `bows` | `crossbows` | `elemental-magic` | `blood-magic` | `null` (bomby). Mapování podle ANALYZA § 9.
`backstab` (od VC-5): číslo z pole infoboxu `backstab` (`"3x"` → 3), chybí-li → `null`.

`category`: `sword` | `axe` | `club` | `spear` | `polearm` | `knife` | `battleaxe` | `sledge` | `fists` | `pickaxe` | `bow` | `crossbow` | `arrow` | `bolt` | `magic` | `bomb`. Zbraně, které se nedoporučují (štíty, missiles…), ⛔ do souboru nepatří.
U šípů a šipek je `damage` poškození šípu, `maxQuality: 1`, `materials` je recept na jednu dávku a `quantity` je počet kusů z receptu.

## `data/recommendations.json` (VC-2)

Klíč je `"<biomeId>:<creatureId>"`.

```json
{
  "black-forest:greydwarf": {
    "gearTier": 2,
    "modifiers": { "blunt": 1, "slash": 1, "pierce": 1, "fire": 2, "frost": 1, "lightning": 1, "poison": 0.5, "spirit": 0, "chop": 0, "pickaxe": 0 },
    "melee": [
      { "weapon": "bronze-sword", "score": 47, "raw": 47, "notes": [] }
    ],
    "bow": { "weapon": "finewood-bow", "score": 0 },
    "arrows": [
      { "weapon": "fire-arrow", "score": 103, "raw": 59, "notes": ["×2 Fire"] }
    ],
    "crossbow": null,
    "bolts": [],
    "magic": null,
    "bomb": { "weapon": "…", "score": 0, "raw": 0, "notes": [] },
    "avoid": [{ "type": "poison", "mult": 0.5 }],
    "tip": "Very weak to Fire (×2): Fire Arrow hits for 103 effective."
  }
}
```

- `score` = efektivní poškození podle ANALYZA § 5 a `raw` = součet poškození bez násobičů. Obojí se zaokrouhluje na celá čísla.
- U šípů je `score` včetně luku. `bow.score` = efektivní pierce samotného luku.
- `notes`: typy s násobičem ≠ 1, které zbraň má, ve tvaru `"×2 Fire"` nebo `"×0.5 Pierce"`, seřazené od nejvyššího násobiče.
- Prázdná kategorie → `null` (u objektu) nebo `[]` (u pole).

## `data/data.js` (VC-2)

Jediný soubor, který čte web:

```js
window.VC_DATA = {
  "generatedAt": "2026-10-05T…Z",
  "source": { "name": "Valheim Wiki", "url": "https://valheim.weirdgloop.org", "license": "CC BY-SA 4.0" },
  "damageTypes": ["blunt", "slash", "pierce", "chop", "pickaxe", "fire", "frost", "lightning", "poison", "spirit"],
  "modTiers": { "veryweak": 2, "weak": 1.5, "slightlyweak": 1.25, "neutral": 1, "slightlyresistant": 0.75, "resistant": 0.5, "veryresistant": 0.25, "immune": 0 },
  "biomes": [/* biomes.json */],
  "creatures": { "<id>": {/* creature */} },
  "weapons": { "<id>": {/* weapon */} },
  "recommendations": {/* recommendations.json */}
};
```

Generuje ho `node scripts/build-data.mjs` z JSONů. ⛔ Ručně se needituje.

Od VC-5 se doporučení počítají **v prohlížeči** podle nastavení hráče (`apps/bestiary/assets/rank.js`). Klíč `recommendations` v `data.js` proto zmizí. `data/recommendations.json` dál vzniká pro testy a report s výchozím hráčem (`VCRank.DEFAULT_PLAYER`).

## `data/stations.json`

Pole stanic. Každý záznam zapisuje jeden fetcher, který nahrazuje jen své záznamy:

| Fetcher | Záznamy (`id`) | `type` |
|---|---|---|
| `fetch-stations.mjs` | smelter, blast-furnace, charcoal-kiln, spinning-wheel | smelting / kiln / processing |
| `fetch-comfort.mjs` | artisan-table, black-forge, forge, stonecutter, workbench | `comfort` |
| `fetch-expedition.mjs` | galdr-table (`addedBy: "expedition"`) | `crafting` |
| `fetch-provisions.mjs` | cauldron … smoker | `provisions` |

Společná pole: `id`, `name`, `names`, `wiki`, `type`. Pořadí v souboru je dané pořadím fetcherů (stations → comfort → expedition → provisions); `mergeStations` ve `fetch-stations.mjs` nové záznamy vkládá na začátek a existující nahrazuje na místě.

## `data/overrides.json` (orchestrátor)

Ruční opravy, které parser aplikuje **jako poslední krok**:

```json
{
  "creatures": { "frost-blob": { "biomes": ["mountain"], "kind": "hostile", "reason": "…" } },
  "materials": { "Ymir Flesh": { "biome": "mountain", "tier": 4, "reason": "…" } },
  "exclude": { "creatures": ["staff-of-the-wild"], "weapons": [] }
}
```

## Armourer (VC-7)

### `data/armor.json`

```json
[
  {
    "id": "iron-armor",
    "name": "Iron Armor",
    "wiki": "https://valheim.weirdgloop.org/w/Iron_Armor",
    "kind": "set",
    "biome": "swamp",
    "tier": 3,
    "setBonus": null,
    "pieces": [
      {
        "id": "iron-helmet",
        "name": "Iron Helmet",
        "slot": "head",
        "gameId": "HelmetIron",
        "image": "img/armor/iron-helmet.png",
        "station": "Forge",
        "levels": [
          { "quality": 1, "armor": 14, "durability": 1000, "stationLevel": 1, "materials": [{ "item": "iron", "amount": 20 }, { "item": "deer-hide", "amount": 2 }] },
          { "quality": 2, "armor": 16, "durability": 1200, "stationLevel": 2, "materials": [{ "item": "iron", "amount": 5 }] }
        ],
        "armorSource": "table",
        "weight": 3,
        "movementSpeed": 0,
        "resistances": [],
        "description": "A helm of polished iron, fit for a hero."
      }
    ]
  }
]
```

- `kind`: `set` (stránka s víc díly nebo s `set pieces`) | `single` (samostatný plášť nebo čepice) | `cosmetic` (bez receptu).
- `slot`: `head` | `chest` | `legs` | `cape`. Typ `Body` je `chest`.
- `levels[q].materials` je cena **toho kroku**: výroba pro q=1, vylepšení z q−1 na q pro q≥2. Položky s poznámkou `(Fuel)` mají navíc `"fuel": true`.
- `armorSource`: `table` | `infobox` | `estimate` (+2 za úroveň).
- `setBonus`: `{ "name": "Sneaky", "pieces": 4, "effects": ["Sneak skill +15"] }` nebo `null`.
- `movementSpeed`: číslo v procentech (`-5%` → -5).
- `resistances`: pole čistých řetězců (`"Resistant vs. Frost"`).

### `data/items.json`

```json
[
  {
    "id": "bronze",
    "name": "Bronze",
    "image": "img/items/bronze.png",
    "biome": "black-forest",
    "tier": 2,
    "sources": [{ "text": "Forge", "kind": "station" }, { "text": "Smelter", "kind": "station" }],
    "recipe": { "station": "Forge", "materials": [{ "item": "copper", "amount": 2 }, { "item": "tin", "amount": 1 }], "yields": 1 },
    "wiki": "https://valheim.weirdgloop.org/w/Bronze"
  }
]
```

- `sources[].kind`: `creature` (je v `data/creatures.json`; přidá se `creatureId` a `biomes`) | `station` | `location` | `npc` | `other`.
- `recipe`: z pole `materials` infoboxu suroviny, jinak `null`. `station` je první stanice ze `source`.
- `biome` a `tier` přebírají logiku z `data/materials.json` (VC-2). Nová surovina se dohledá stejným postupem.

### `apps/armourer/data/data.js`

`window.VA_DATA = { generatedAt, source, biomes, armor, items }`. `items` je objekt podle `id`.

- `items[id].traders` (volitelné, VC-42h): `[{ id, name }]` z `data/traders.json`, pořadí jako v `traders.json`; jen položky, které některý obchodník prodává (párování podle id položky). Příklad: `items['ymir-flesh'].traders[0].id === 'haldor'`. Stejné pole mají i kusy zbroje v `armor[].pieces`, které obchodník prodává (kosmetika: 34 kusů od Hildir, `crown-of-roots` od Bog Witch, `dverger-circlet` a `yule-hat` od Haldora). Smithy z něj odvodí odznak obchodníka u suroviny, bez seznamu id v kódu. (Položka `thunder-stone` v datech Smithy není, žádný recept ji nepoužívá.)
- Obrázek `roots` ukazuje na `img/items/root.png` (alias `roots.png → root.png` v `scripts/image-index.mjs`; soubor `roots.png` neexistuje).

### `apps/provisions/data/data.js` (pole `traders`)

`items[id]` a prvky `food[]` / `meads[]` mají volitelné pole `traders: [{ id, name }]` se stejným významem jako ve Smithy (`items['toadstool'].traders[0].id === 'bog-witch'`). Položky, které žádný obchodník neprodává, pole nemají. Generuje `scripts/build-provisions-data.mjs` přes `scripts/trader-index.mjs`.

### `data/items-compendium.json` (VC-39, VC-40b; Items Compendium)

Vyrábí `node scripts/build-items-data.mjs` (zapisuje `data/items-compendium.json` a `apps/items/data/data.js`). Pořadí: nejdřív `node scripts/build-traders-data.mjs`, pak `node scripts/build-items-data.mjs`, protože items generátor čte `data/traders.json` (`build-items-data.mjs` ř. 190 a 880); v opačném pořadí by zboží obchodníků chybělo. Odsazení 2 mezery, konec souboru nový řádek; pořadí `items` je dané generátorem (není abecední podle `name` ani `id`).

Kořen: `{ biomes, items }`.

- `biomes[]` (9 položek, pořadí podle `order`): `id`, `name`, `order` (číslo, shodné s `data/biomes.json`), `bosses` (pole `id` bossů z `data/creatures.json`).
- `items[]` (1076 položek), pole každé položky:
  - `id` (string, slug jako u ostatních souborů), `name` (anglický název ze hry; zůstává anglicky).
  - `image` (string | null): relativní cesta k obrázku z `apps/items/` (např. `../smithy/img/items/ash-fang.png`); `null`, když obrázek není.
  - `biome` (string): id biomu, odkud položka pochází. `tier` (number): **pořadí biomu** `order` z `data/biomes.json` (`tier = BIOME_ORDER[biome]`); u všech položek je vyplněný, tier se nepočítá z jiného zdroje.
  - `category` (string): jedna z 17 hodnot (tabulka níže).
  - `teleportable` (boolean), `stack` (number | null; velikost balíku ve hře), `weight` (number | null; váha).
  - `wiki` (string | null): URL stránky na wiki (`https://valheim.weirdgloop.org/w/...`).
  - `names` (objekt): překlady názvu `{ cs, de, fr, pt, ru }` — vyplněné jen jazyky, kde je překlad; chybí-li klíč, použije se `name`.
  - `description` (string | null): popis ze hry (anglicky).
  - `stats` (objekt | null): objekt u kategorií `weapon`, `shield`, `armor`, `ammo`, `tool`, `food`, `mead` a `building`, jinak `null`. Příklady klíčů: zbraně `damage`, `damageMax`, `stamina`, `blockArmor`, `skill`, `hands`, `maxQuality`; stavby `comfort`, `furniture`, `seasonal`. Některé kusy kategorií weapon, shield, ammo a tool mají `null` (45 položek).
  - `recipe` (objekt | null): `null`, pokud se nevyrábí. Jinak `{ station, stationId, stationLevel, yields, materials }`:
    - `station` (string | null): název stanice (např. `Black Forge`), `stationId` (slug stanice), `stationLevel` (number, minimální úroveň stanice). `station` a `stationId` jsou `null` u 61 receptů bez stanice.
    - `yields` (number): počet kusů z jednoho receptu.
    - `materials[]`: `{ item, name, amount }` — `item` je `id` suroviny, `name` anglický název, `amount` počet kusů.
  - `station` (objekt | null): stanice, na které se položka vyrábí, `{ id, name, level }`; u kusů z armor setu navíc `set` (slug) a `setName` (název setu, např. `Ask Set`). `null` u 429 položek (žádná stanice).
  - `sources` (objekt) — odkud se položka získává, vždy všechny čtyři klíče (prázdné pole = nic):
    - `creatures[]`: `{ id, name, biome }` — drop z bytosti (`id` z `data/creatures.json`; odkaz `/bestiary/#c=<id>`).
    - `locations[]`: `{ text, kind }` — místo ve světě (např. `Burial Chambers`).
    - `traders[]`: `{ id, name, price, unlockedBy }` — obchodník (`id` = `haldor`, `hildir`, `bog-witch`); `unlockedBy` viz oddíl `data/traders.json`.
    - `raw[]`: obecné zdroje, `{ text, kind?, creatureId?, biomes? }`. `kind` ∈ `station` | `creature` | `npc` | `location` | `other`; **`kind` chybí u 177 zdrojů** (text typu „Crafted from …“, nemá jednoznačný typ). `creatureId` a `biomes` jsou u zdrojů typu `creature`.
  - `usedIn` (objekt) — obrácený index: kde se položka používá jako surovina. Vždy všech 8 klíčů (prázdné pole = nikde):
    - `weapons[]` `{ id, name, level?, biome, itemId }` → `/smithy/#item=<id>`
    - `armor[]` `{ id, name, level?, biome, itemId, set? }` → `/smithy/#set=<set>` nebo `/smithy/#item=<id>`
    - `food[]` `{ id, name, isFeast, biome, itemId }` → `/provisions/#item=<id>`
    - `meads[]` `{ id, name, biome, itemId }` → `/provisions/#item=<id>`
    - `comfort[]` `{ id, name, comfort, biome, itemId }` → `/comfort/#item=<id>`
    - `expedition[]` `{ id, bossId, bossName, biome }` → `/expedition/#boss=<bossId>`
    - `stations[]` `{ id, name, level, biome, itemId }`
    - `crafting[]` `{ id, name, level, biome, itemId }`
  - `crossLinks` (objekt): hotové odkazy do ostatních nástrojů, klíče jen tam, kde existuje: `smithy` (289×, např. `/smithy/#item=ash-fang`), `provisions` (120×), `comfort` (76×), `traders` (67×, `/traders/#trader=<id>`).

**Kategorie `category` (17 hodnot)** — z generátoru `categorize()` a `categoryFromWiki()` v `scripts/build-items-data.mjs`; počty jsou z aktuálního souboru:

| id | Popisek | Odkud se bere | počet |
|---|---|---|---|
| `weapon` | Zbraně | `data/weapons.json` (kategorie mimo štít, munici a nástroje) | 134 |
| `shield` | Štíty | `data/weapons.json` (`category`/`type` obsahuje shield) | 19 |
| `ammo` | Munice | `data/weapons.json` (arrow, bolt) | 26 |
| `tool` | Nástroje | `data/weapons.json` (pickaxe, TOOL_IDS), wiki šablona `tool`/`torch` | 36 |
| `armor` | Zbroj | `data/armor.json` (sloty, vyjma accessory) | 113 |
| `accessory` | Doplňky (trinkety) | `data/armor.json` (`type` accessory), wiki šablona `trinket` | 18 |
| `casting` | Odlitky a formy | id/název `cast-`, `mould-`, `mold-`, idoly (`-battle-idol`, `-protection-idol`) | 74 |
| `summoning` | Vyvolávání bossů | `summonIds`, klíče (`*-key`), wiki `misc` | 11 |
| `metal` | Kovy a rudy | rudy, `-scrap`, `-ingot`, wiki `ore`/`metal` | 18 |
| `trophy` | Trofeje | id končí `-trophy` | 70 |
| `drop` | Drop z bytostí | `material` s `creatures[]` a bez receptu, lokace a obchodníka | 50 |
| `material` | Materiály | wiki `material`/`wood`, fallback pro nerozpoznané | 74 |
| `ingredient` | Ingredience | kuchyňské suroviny (`provisions: true`), ryby, semena, mead base | 100 |
| `food` | Jídlo | jídla z `apps/provisions/data/data.js` (`provFoodIds`), wiki `food`/`feast` | 99 |
| `mead` | Medovina | wiki `mead` | 21 |
| `building` | Stavění a stavby | wiki `structure` (kromě `plant`) a `comfort.json` | 203 |
| `valuable` | Cennosti | wiki `valuable` (Amber, Ruby, …) | 10 |

Pozn.: `material` je ve výsledku jen tam, kde žádné pravidlo nerozhodlo; `drop` je přiřazen až generátorem u materiálu z bytostí. Počty v tabulce platí pro aktuální soubor a mohou se po přegenerování změnit.

- Zdroj stránek (VC-42h): `scripts/build-items-data.mjs` čte pevný seznam titulů `scripts/wiki/items-pages.json` přes `readCachedPages` (`scripts/wiki/api.mjs`, jen cache, bez sítě); sken `data/raw/` zmizel. Novou stránku přidáš tak, že titul doplníš do seznamu a jednou ji stáhneš přes `api.getWikitext`.
- `biome` vyráběné položky (`recipe.materials`) není nižší než biom nejvyšší suroviny; výjimkou je jen zboží odemykané podmínkou obchodníka (`traderUnlockBiome`).
- `drops` tvorů (`data/creatures.json`): odkazy oddělené čárkou jsou samostatné položky (Ghost: `["Ectoplasm", "Ghost Trophy"]`), drop `None` se vynechává (`moose-calf` → `[]`).

### `data/traders.json` (VC-40, VC-42a; Trader Ledger)

Vyrábí `node scripts/build-traders-data.mjs` (zapisuje `data/traders.json` a `apps/traders/data/data.js`). **Zdroj dat je tabulka „Sells/Trading“ na wiki stránce obchodníka** (`Haldor`, `Hildir`, `The Bog Witch`), parsovaná z wiki cache v `data/raw/`; ceny ani zboží se nedoplňují ručně.

Kořen: `{ traders, valuables, biomes }`.

- `traders[]` (3 obchodníci): `id` (`haldor`, `hildir`, `bog-witch`), `name`, `biome` (string, biom, kde obchodník stojí), `title`, `description`, `mapIconTip` (string, jak ho najít na mapě), `items[]`.
- `items[]` (Haldor 11, Hildir 38, Bog Witch 20 — celkem 69), každá položka:
  - `id`, `name` (anglicky), `description` (string), `image` (string | null), `biome` (string) — **biom podmínky**: u zboží s podmínkou je to biom z `unlockedBy.biome`, jinak `biome` obchodníka.
  - `quantity` (number): balení — kolik kusů dostaneš za jednu `price` (např. Fishing Bait `quantity` 20).
  - `price` (number): cena v mincích za jedno `quantity`.
  - `unlockedBy` (`null` | objekt) — podmínka odemknutí, viz níže.
- `valuables[]` (4 položky): `id`, `name`, `value` (number, hodnota v mincích: Amber 5, Amber Pearl 10, Ruby 20, Silver Necklace 30), `description`, `image` (string | null).
- `biomes[]` (9 položek): `id`, `order`, `creatures.boss` (pole id bossů). Pořadí odpovídá `data/biomes.json` (`order` = `tier` v items-compendium).

**`unlockedBy.type`** (u 69 položek: `null` 22, `boss` 15, `chest` 30, `creature` 2):
- `null` — vždy k dispozici (`{ unlockedBy: null }`), např. Yule Hat u Haldora.
- `boss` — `{ type: "boss", id, name, biome, text }`, např. Ymir Flesh u Haldora: `{ "type": "boss", "id": "the-elder", "name": "The Elder", "biome": "black-forest", "text": "Requires defeating The Elder" }`.
- `chest` — jen Hildir: `{ type: "chest", chest, boss, bossName, location, biome, text }` Hildir má tři truhly, každá s vlastním `chest`, `boss`, `bossName`, `location` a `biome`: `silver` / Geirrhafa / Howling Cavern / `mountain` (9 položek), `bronze` / Zil & Thungr / Sealed Tower / `plains` (10), `brass` / Brenna / Smouldering Tomb / `black-forest` (11). `text` přesně: „Requires returning Hildir's silver chest (Geirrhafa)“, „… bronze chest (Zil & Thungr)“, „… brass chest (Brenna)“.
- `creature` — bytost, která není boss (jen Bog Witch, např. Seafarer's Herbs po Serpent): `{ type: "creature", id, name, biome, text }`.

Zamykání podle `VCProgress` (odhalený biom) se řídí `biome` podmínky, ne typem; viz `docs/ANALYZA.md` § 28.
