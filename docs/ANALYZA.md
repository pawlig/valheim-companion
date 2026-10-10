# Valheim Companion — analýza

Statický web, který ukazuje všechny jednotky Valheimu (bossy, minibossy, nepřátele, pasivní zvířata, ryby) rozdělené po biomech.
Každý biom je **zavřený** (ochrana proti spoilerům), po kliknutí se rozbalí.
U každé jednotky jsou obrázky, staty po hvězdičkách, slabiny/resisty a **doporučené zbraně a munice**, které se dají mít nejpozději v tom biomu.

- Repo: `pawlig/valheim-companion` (public). Web: https://valheim-companion.teuferon.click (EasyPanel, Docker, deploy webhookem při pushi).
- Jazyk webu: **vše anglicky**. Dokumentace a zadání pro agenty česky.
- Stav hry: Valheim 1.0 včetně **Deep North**.

## 1. Zdroj dat

**Primární: nová oficiální wiki <https://valheim.weirdgloop.org>** (MediaWiki API `https://valheim.weirdgloop.org/api.php`).
⛔ Stará `valheim.fandom.com` je zastaralá (Deep North tam chybí). Smí se použít jen jako záloha pro obrázek, který na nové wiki chybí, a takový případ se zapíše do reportu.

Ověřeno 5. 10. 2026:

| Co | Jak se to získá |
|---|---|
| Přiřazení jednotek k biomům | `{{infobox biome}}` na stránkách biomů, pole `passive`, `hostile`, `boss` (odkazy `[[...]]`). Je to **zdroj pravdy**. |
| Staty jednotky | `{{infobox creature}}`: `health 0star/1star/2star`, `damage 0star/1star/2star`, `abilities`, `veryweak`, `weak`, `resistant`, `veryresistant`, `immune`, `neutral`, `stagger`, `faction`, `tameable`, `behavior`, `type`, `location`, `drops`, `summon`, `trophy`, `id`, `image 0star/1star/2star` |
| Zbraně | `{{infobox weapon}}`: `type`, `source`, `crafting level`, damage pole (`slash`, `blunt`, `pierce`, `fire`, `frost`, `lightning`, `poison`, `spirit`, `chop`, `pickaxe`), `<typ> per level`, `materials 1..N` (N = max kvalita), `stamina`, `knockback`, `backstab`, `block armor` |
| Obrázky | `action=query&prop=imageinfo&iiprop=url&iiurlwidth=<px>&titles=File:...` vrací rovnou zmenšený náhled (`thumburl`) |
| Kategorie | `Category:Creatures` (97), `Bosses` (10), `Minibosses` (4), `Passive creatures`, `Fish`, `Weapons` (223), `Arrows` (14), `Bolts` (6) |

Obsah biomů podle infoboxů (5. 10. 2026):

| Biom | Pasivní | Nepřátelé | Boss / miniboss |
|---|---|---|---|
| Meadows | Deer, Gull, Perch, Pike | Boar, Greyling, Neck | Eikthyr |
| Black Forest | Crow, Deer, Gull, Perch, Pike, Trollfish | Bear, Ghost, Greydwarf, Greydwarf Brute, Greydwarf Shaman, Rancid Remains, Skeleton, Troll | The Elder, *Brenna* |
| Swamp | Giant Herring | Blob, Oozer, Draugr, Draugr Elite, Leech, Skeleton, Surtling, Wraith, Writhan, Abomination | Bonemass |
| Ocean | Leviathan, Tuna, Coral Cod, Pufferfish, Gull | Serpent | — |
| Mountain | Tetra | Wolf, Drake, Stone Golem, Fenring, Draugr, Skeleton, Bat, Ulv, Cultist | Moder, *Geirrhafa* |
| Plains | Gull, Grouper | Deathsquito, Fuling, Fuling Berserker, Fuling Shaman, Growth, Lox, Vile | Yagluth, *Zil & Thungr* |
| Mistlands | Hare, Anglerfish, Pufferfish, Dvergr Rogue, Dvergr Mage | Tick, Seeker, Seeker Soldier, Gjall | The Queen |
| Ashlands | Ash Crow, Ashlands Dvergr, Magmafish | Asksvin, Bonemaw Serpent, Charred ×4, Fallen Valkyrie, Lava Blob, Morgen, Volture, Skugg | Fader, *Lord Reto* |
| Deep North | Seal, Northern Salmon, Shadow | Greydwarf (DN), Greydwarf Shaman (DN), Skeleton, Moose, Barka, Elaking, Eyeless One, Fallen Warrior, Gammeltroll, Hexen, Krigen, Captive Fuling, Imprisoned Dvergr, Hexahedric/Shapeless/Tiny Pulp | Kall Fimbulbringer |

V `Category:Creatures` jsou i jednotky, které v žádném biomu nejsou (např. Frost Blob, Seeker Brood, Kvastur, Frysling, Ulf, Astrid, Gudrun, Harald). Ty se přiřadí přes `location`, nebo skončí v reportu a rozhodne orchestrátor (`data/overrides.json`).

Pozor na formáty infoboxů, liší se stránka od stránky:
- `{{infobox creature}}` i `{{Infobox creature}}`, pole s mezerami i bez nich, hodnoty přes víc řádků.
- `health 0star = 10000 + 7000 + 30000` (fáze bosse), `image 0star = {{InfoboxGallery|A.png|Phase 1\nB.png|Phase 2}}`.
- `damage` jako vnořený seznam (`* Axe` → `** Cleave: 150 Slash, 60 Chop`) nebo s nadpisy fází (`'''Phase 1'''`).
- Stejná stránka může mít více `id` oddělených `<br>`.

## 2. Biomy, pořadí a tier výbavy

| order | id | name | gearTier |
|---|---|---|---|
| 1 | `meadows` | Meadows | 1 |
| 2 | `black-forest` | Black Forest | 2 |
| 3 | `swamp` | Swamp | 3 |
| 4 | `ocean` | Ocean | 3 |
| 5 | `mountain` | Mountain | 4 |
| 6 | `plains` | Plains | 5 |
| 7 | `mistlands` | Mistlands | 6 |
| 8 | `ashlands` | Ashlands | 7 |
| 9 | `deep-north` | Deep North | 8 |

`gearTier` = nejvyšší tier zbraní, které se v tom biomu smí doporučit (spoilery). Oceán je za Swampem, protože na Serpenta se chodí s výbavou ze Swampu. Bonemaw Serpent patří do Ashlands, ne do Oceánu.

Jednotka, která je ve víc biomech (Skeleton, Draugr, Deer, Gull…), se ukáže **v každém** z nich. Doporučení se počítá **pro každý pár (biom, jednotka)** zvlášť, podle `gearTier` toho biomu.

## 3. Tier zbraní

Tier zbraně = nejvyšší tier ze všech jejích materiálů (`materials 1`). `biome` zbraně = biom toho materiálu.
Výchozí tabulka materiálů (zbytek dohledá agent z wiki a zapíše do `data/materials.json`):

| tier | biom | materiály |
|---|---|---|
| 1 | meadows | Wood, Stone, Flint, Leather Scraps, Deer Hide, Resin, Feathers, Hard Antler, Raspberries, Honey |
| 2 | black-forest | Copper, Tin, Bronze, Bronze Nails, Core Wood, Fine Wood, Bone Fragments, Troll Hide, Greydwarf Eye, Surtling Core, Ancient Seed |
| 3 | swamp | Iron, Iron Nails, Ancient Bark, Elder Bark, Guck, Ooze, Entrails, Bloodbag, Wishbone, Root, Withered Bone |
| 3 | ocean | Chitin, Serpent Scale, Serpent Meat |
| 4 | mountain | Silver, Obsidian, Wolf Fang, Wolf Pelt, Wolf Claw, Freeze Gland, Dragon Tear, Crystal, Fenris Hair, Fenris Claw, Ymir Flesh?, Drake Trophy |
| 5 | plains | Black Metal, Linen Thread, Flax, Needle, Lox Pelt, Barley, Tar, Torn Spirit, Yagluth Thing |
| 6 | mistlands | Carapace, Eitr, Refined Eitr, Black Core, Yggdrasil Wood, Mandible, Bilebag, Black Marble, Jade, Sap, Royal Jelly, Iolite, Dvergr Extractor, Scale Hide, Feasting? |
| 7 | ashlands | Flametal, Flametal Ore, Charred Bone, Grausten, Ashwood, Asksvin Hide, Morgen Sinew, Morgen Heart, Bonemaw Tooth, Celestial Feather, Proustite, Sulfur Stone, Molten Core, Fader Drop, Charred Cogwheel, Bell Fragment, Ceramic Plate |
| 8 | deep-north | Frostcore, Timberwood, Moose Hide, Moose Sinew, Petrified Tissue, Luminous Larva, Ice + vše, co wiki u materiálu vede v Deep North |

Položky s `?` agent ověří na wiki: Ymir Flesh se kupuje u Haldora, tier podle reálného výskytu. Materiál, který z wiki nejde jednoznačně určit, dostane `biome: null` a jde do reportu.

## 4. Násobiče poškození

Podle wiki stránky *Damage*: Very Weak ×2, Weak ×1.5, Neutral ×1, Resistant ×0.5, Very Resistant ×0.25, Immune ×0.
Pokud se na nové wiki objeví i stupně „Slightly weak/resistant“, použijí se ×1.25 a ×0.75. Neznámé pole infoboxu se zapíše do reportu.

Výchozí hodnoty pro typ, který infobox neuvádí:
- `blunt`, `slash`, `pierce`, `fire`, `frost`, `lightning`, `poison`: **×1**
- `spirit`: **×0**, pokud není uveden (spirit bere jen nemrtvým, wiki ho uvádí výslovně)
- `chop`, `pickaxe`: **×0**, pokud není uveden (výjimky typu Stone Golem wiki uvádí)

Hodnoty v `immune` / `veryresistant` …, které nejsou typ poškození (`Stagger`, `Knockback`, `Freezing`…), jdou do `otherImmunities`.

## 5. Doporučení zbraní (deterministický výpočet, žádné LLM)

Pro každý pár (biom B, jednotka C):

1. **Kandidáti** = zbraně s `tier ≤ gearTier(B)` a `tier != null`.
   Vynechané: štíty, missiles/payloady (katapult), cheat zbraně, torch, lucerny, snowball, snow shovel, magie bez přímého poškození (Dead Raiser, Spirit Caller, Voidcaller, Staff of Protection, Staff of the Wild…) a cokoliv se součtem poškození 0.
   Krumpáče jen tehdy, když má C `pickaxe` násobič > 0.
2. **Poškození zbraně** = poškození na **max kvalitě**: `base + perLevel × (maxQuality − 1)`, `maxQuality` = počet polí `materials N`.
3. **Skóre** = Σ přes typy `dmg[typ] × násobič(C, typ)`. DoT (fire, poison) se počítá nominální hodnotou, je to zjednodušení a web ho uvádí v legendě.
4. **Luk + šíp**: skóre = `(bowPierce + arrowPierce) × mod(pierce) + Σ elementy šípu × mod`. Vezme se nejlepší luk ≤ tier a nejlepší šíp ≤ tier; doporučí se top 3 šípy s tím lukem. Stejně kuše + šipky (top 2).
5. **Výstup na pár**:
   - `melee`: top 3, každý z jiné kategorie (sword / axe / club / spear / polearm / knife / battleaxe / sledge / fists / pickaxe)
   - `bow` + `arrows[3]`, `crossbow` + `bolts[2]` (když existují)
   - `magic`: top 1 hůl (když existuje)
   - `bomb`: top 1 (když existuje)
   - `avoid`: typy s násobičem ≤ 0.5, které nějaký kandidát skutečně má
   - `tip`: jedna věta ze šablony, např. `Very weak to Fire (×2): Fire Arrows hit for 66 effective.`

Bossové a minibossové se počítají stejně. Pasivní zvířata a ryby se počítají taky, web u nich ale ukáže jen střelnou zbraň.

## 6. Web (frontend)

- Čistě statický: `index.html` + `assets/app.js` + `assets/styles.css` + `data/data.js` + `img/`. **Bez build kroku, bez frameworku, bez CDN.**
- Data se načítají přes `<script src="data/data.js">` (`window.VC_DATA = …`), protože `fetch()` ani ES moduly na `file://` nefungují.
- Biomy jsou akordeon, výchozí stav **zavřeno**. Hlavička biomu ukazuje jen název, obrázek biomu a počet jednotek, ne jména.
  Otevřené biomy si web pamatuje v `localStorage` (v try/catch). Tlačítka „Collapse all“ a „Reset spoiler progress“.
- V otevřeném biomu: Boss → Miniboss → Hostile → Passive → Fish (ryby jako kompaktní dlaždice) a nakonec sbalitelná sekce „Weapons & ammo from this biome“.
- Karta jednotky:
  - obrázek; přepínač 0★/1★/2★ jen u jednotek, které hvězdičky mají (mění obrázek, HP i poškození)
  - název, štítky (Boss, Miniboss, Passive, Tameable, Weak points)
  - HP, útoky s poškozením
  - čipy slabin a resistů s barvou podle stupně a násobičem
  - doporučení: ikona + název + efektivní poškození + důvod (např. „×2 Fire“)
  - „Details“ (rozbalovací): schopnosti a cooldowny, dropy, trofej, frakce, stagger, chování, kde a kdy se spawnuje, `id`, odkaz na wiki
  - „Also found in“ ukazuje **jen dřívější biomy**, aby se nic nespoilovalo
- Hledání a filtr jen uvnitř otevřených biomů.
- Patička: zdroj dat a licence (CC BY-SA, Valheim Wiki na weirdgloop.org) a datum stažení dat.
- Vzhled: tmavé seveřanské téma, čitelné na mobilu (šířka 360 px) i na desktopu, `prefers-color-scheme` stačí jen tmavý.

## 7. Rozdělení práce

| ID | Kdo | Co | Výstup |
|---|---|---|---|
| VC-1 | GL (zai / GLM) | stažení a parsování wiki: biomy, jednotky, obrázky | `scripts/wiki/*.mjs`, `data/raw/`, `data/biomes.json`, `data/creatures.json`, `img/creatures/`, `img/biomes/`, `data/report.md` |
| VC-2 | GM (agy / Flash), původně GL — došla kvóta Z.ai | zbraně, materiály, výpočet doporučení, balík dat | `data/weapons.json`, `data/materials.json`, `data/recommendations.json`, `data/data.js`, `img/weapons/` |
| VC-3 | GM (agy / Flash) | web nad hotovými daty | `index.html`, `assets/app.js`, `assets/styles.css` |
| — | orchestrátor (Opus) | zadání, přejímka, `data/overrides.json`, test v prohlížeči, merge, push | |

Úlohy jdou **za sebou** (na Macu smí běžet jen jeden GM/GL). VC-3 potřebuje hotové `data/data.js` z VC-2.
Schéma dat, které sdílí všechny tři úlohy, je v `docs/DATA-SCHEMA.md`.

## 8. Rozcestník a sekce (od 5. 10. 2026)

Valheim Companion je rozcestník a nástroje jsou pod ním jako sekce:

| URL | Sekce | Zdroj v repu |
|---|---|---|
| `/` | rozcestník (anglicky) | `apps/hub/` |
| `/bestiary/` | **Bestiary**: jednotky, slabiny, doporučené zbraně | `apps/bestiary/` (statický web) + `scripts/` + `data/` |
| `/damage-calculator/` | **Damage Calculator**: poškození zbraní proti jednotkám, resisty, DPS a čas na zabití | `apps/damage-calculator/` (React 19 + Vite, převzato z `Teuferon/valheim-weapon-boss-damage`) |
| `/signs/` | **Sign Editor (Runopis)**: editor cedulí, 13 jazyků | `apps/signs/` (React 19 + Vite, převzato z `pawlig/valheim-signs` přes `git subtree` i s historií) |

- Další nástroje přibydou jako `apps/<nazev>/` a `/<nazev>/` a dostanou kartu v rozcestníku.
- Každá sekce má nahoře odkaz zpět na rozcestník („Valheim Companion“).
- Runopis se staví s `base: '/signs/'`. Varianta pro Cloudflare / vinext / OpenAI Sites se ruší, zůstává jen statický Vite build.
- Docker: v první fázi Node postaví Runopis, nginx pak servíruje `apps/hub` → `/`, `apps/bestiary` → `/bestiary/` a build Runopisu → `/signs/`.
  Lokálně: `npm run build` složí stejné rozložení do `dist/` a `npm run preview` ho servíruje i s CSP.
- Stará appka `valheim-signs.teuferon.click` se vypne a repo `pawlig/valheim-signs` se smaže (rozhodnutí Pavla). Obojí udělá orchestrátor nebo Pavel až po ověření nové verze.

## 9. Postava hráče: skilly a další faktory (VC-5)

Ověřeno na wiki 5. 10. 2026 (*Damage mechanics*, *Skills*, *World Modifiers*, *Creature level*, *Status effects*).

**Vzorec poškození:** `damage = listed × skillFactor × multipliers × difficulty`.
- `skillFactor` je náhodný v rozsahu `min = 0.25 + 0.006·L`, `max = min(0.55 + 0.006·L, 1.0)`, kde L = skill 0–100.
  Průměr: 0.40 na L0, 0.85 na L75, 0.925 na L100. Web počítá s průměrem a rozsah ukazuje v tooltipu.
- Luk a šíp: `(luk + šíp) × skillFactor(Bows)`. Kuše a šipka: skill Crossbows.
- Skill podle kategorie zbraně:
  - sword → Swords
  - axe, battleaxe → Axes
  - club, sledge → Clubs
  - spear → Spears
  - polearm → Polearms
  - knife → Knives
  - fists → Fists
  - pickaxe → Pickaxes
  - bow, arrow → Bows
  - crossbow, bolt → Crossbows
  - magic → Elemental magic, nebo Blood magic, když to říká `type` v infoboxu
  - bomb → bez skillu (faktor 1)
- **Obtížnost světa** (World modifier *Combat*), poškození hráče: Very easy 125 %, Easy 110 %, Normal 100 %, Hard 85 %, Very hard 70 %.
- **Víc hráčů:** každý další hráč do 100 m přidá nepříteli +30 % efektivního HP, maximálně 5 hráčů (tedy +120 %).
- **Hvězdy:** +100 % HP a +50 % poškození za úroveň. HP už jsou v datech po hvězdách.
- **Situační násobiče:**
  - stagger (po parry nebo nahromaděném staggeru) ×2
  - backstab na nic netušícího nepřítele: násobič zbraně z infoboxu (`backstab`, 2×–6×)
  - třetí úder komba ×2 a sekundární útoky 0.5×–3× web nepočítá; skóre je **za úder primárním útokem**, ne DPS
  - zásah víc cílů najednou dává penalizaci, web ji nepočítá
- **Bonusy ze setů** (přičítají se ke skillu, strop 100):
  - Root set: Bows +15
  - Lox fur set: Bows +15
  - Fenris set: Fists +15
- **Bonusy ze setů k poškození:**
  - Bear set (Berserk): +10 % Slash a Chop
  - Vanguard set: +10 % Pierce
- Nezapočítává se (zmínit v legendě):
  - dočasný buff od Dvergr Mage (+20 %)
  - Thunderblood / Bloodgold bonus za chybějící HP
  - otrava a hoření jako DoT (počítají se nominální hodnotou)
  - zbroj nepřítele (nepřátelé zbroj nemají)

## 10. Armourer (VC-7, VC-8)

Nová sekce `/armourer/` (`apps/armourer/`, statický web jako Bestiary). Ukazuje přehled všech brnění, kolik surovin stojí výroba a vylepšení na zvolenou úroveň a kde se ty suroviny berou.

**Zdroj (ověřeno 5. 10. 2026):**
- `Category:Armor` (81 stránek, podkategorie `Head`, `Body`, `Legs`, `Capes`). Set je jedna stránka (`Iron Armor`, `Troll Set`, `Protector Armor`…) a v ní je `{{InfoboxTabber}}` s blokem `{{infobox armor}}` pro každý díl. Tabbery můžou být vnořené (`Protector Armor`). Samostatné pláště a čepice mají vlastní stránku s jedním blokem.
- Pole `{{infobox armor}}`:
  - `title`, `image`, `id`, `type` (Head/Chest/Legs/Cape/Body)
  - `source` (stanice), `crafting level`, `repair level`
  - `armor`, `durability`, `weight`
  - `movement speed`, `resistance`
  - `set pieces` („Troll Set (4 pieces)“) a `set effect` (název efektu + odrážky)
  - `materials 1..4`: cena výroby (1) a cena každého vylepšení (2–4)
- Zápis materiálů se liší: `* 20 [[Iron]]` i `* [[Bronze]] x2`, někdy s poznámkou `(Fuel)`.
- Brnění na vyšších úrovních: infobox ho nemá. Je v tabulkách `=== Quality N ===` na stránce setu (první číslo v řádku dílu, „Durability per piece: N“ v hlavičce). Když tabulka chybí, `armor per level` = 2 a v reportu se to označí jako odhad.
- **Suroviny** (`{{infobox item}}` na stránce suroviny):
  - `source`: odkud se bere (jednotky, stanice, místa), např. `[[Boar]], [[Bat]], [[Muddy Scrap Pile]]s`
  - `materials`: recept, když se vyrábí (Bronze = 2× Copper + 1× Tin na Forge/Smelter, Iron = Scrap Iron na Smelter, Linen Thread = Flax na Spinning Wheel)
- Kosmetika od Hildir (`source = [[Hildir]]`, bez receptu) a testovací stránky (`CAPE TEST`) se vyřadí, nebo se ukážou jako „Cosmetic“ bez nákupního seznamu. Rozhodne report.

**Funkce:**
- Sety seskupené po biomech podle tieru (stejné pravidlo jako u zbraní: max tier surovin z `materials 1`).
- Spoilery: biomy, které hráč v Bestiary ještě neotevřel (`vc.openBiomes`, stejný origin), jsou zamčené a jde je odemknout.
- Detail setu:
  - díly s brněním na úrovni 1–4, váha, rychlost pohybu, odolnosti, set bonus
  - stanice a její potřebná úroveň pro výrobu a pro každé vylepšení
- **Nákupní seznam (košík):**
  - Přidá se celý set nebo jednotlivé díly a jde to kombinovat napříč sety.
  - U každé položky se nastaví „mám úroveň“ (žádná / 1–3) a „chci úroveň“ (1–4). Platí to i hromadně pro celý set.
  - Suroviny se sečtou: ikona, název, počet, kde se berou (a biom jednotky, pokud je zdrojem jednotka z Bestiary).
  - Přepínač „Break down crafted materials“ rozloží vyráběné suroviny až na základní (hloubka 3) a ukáže, na jaké stanici se vyrábí.
  - Košík se ukládá v `localStorage` (`va.cart`).

## 11. Sdílení na sítích (VC-9)

- Na každé stránce (rozcestník, Bestiary, Sign Editor, Armourer):
  - `<title>`, `description`, `canonical`
  - Open Graph: `og:type`, `og:site_name`, `og:title`, `og:description`, `og:url`, `og:image` (+ `width`, `height`, `alt`)
  - Twitter: `twitter:card=summary_large_image`, `twitter:title`, `twitter:description`, `twitter:image`
  - `theme-color`, `apple-touch-icon` (PNG 180×180) a `site.webmanifest`
- Obrázky 1200×630 PNG: jedna šablona (`apps/hub/og/card.html`) s logem (runový štít), nadpisem fontem Norse a pozadím biomu. Pro každou sekci vlastní varianta. Renderuje se headless Chromem skriptem `scripts/render-og.mjs` a výsledné PNG se commitují.
- Web běží na **https://valheim-companion.teuferon.click** (EasyPanel, deploy webhookem při každém pushi). Absolutní adresa webu je v jednom místě, `site.config.json` → `{ "siteUrl": "https://…" }`. Meta tagy se do HTML vkládají skriptem `scripts/apply-meta.mjs` (idempotentně, mezi komentáře `<!-- meta:start -->` a `<!-- meta:end -->`), aby šla doména změnit na jednom místě.

## 12. Rychlost útoku a DPS (VC-10)

Ověřeno 6. 10. 2026. Infobox zbraně rychlost útoku nemá. Je ve **vykreslené stránce** (`action=parse&prop=text`), kterou dopočítává šablona podle typu zbraně. Bloky:
- `Primary attack | <typ> | <dmg> … | Backstab | 3x | … | Stamina | 16 | … | Attack speed | 2.46 s (0.86 + 0.70 + 0.90) | Chain last hit | 2x damage, +20% knockback | Hitbox | …, no multitarget penalty`
- `Secondary attack | <typ> | <dmg (už vynásobené)> | … | Stamina | 32 | … | Attack speed | 1.84 s`
- Luk: `Stamina | 8 / s | … | Attack speed | 0.8 s + 2.5 s draw time`
- Kuše (`Arbalest`) ani hole čas útoku nemají.

**Model:**
- Primární útok: komba se počítají jako n úderů s časem T (součet segmentů). Poslední úder ×`chainLast` (2). Poškození komba = `perHit × (n − 1 + chainLast)` a `DPS = to / T`. Útok bez komba (sledge: `1.7 s`) má n = 1.
- Sekundární útok: `secMult = sekundární dmg / primární dmg` (na q1, součet typů). `DPS = perHit × secMult / Tsec`.
- Luk: `T = shot + draw × (1 − 0.8 × L/100)` (skill Bows až −80 % natažení). `DPS = perHit / T`.
- Kuše: jen pokud se najde čas přebití (stránka *Crossbows*), `T = shot + reload × (1 − 0.5 × L/100)`. Jinak DPS `null` a řadí se podle poškození za zásah.
- Stamina za sekundu: `stamina × n / T × (1 − 0.33 × L/100)`, u luku `X / s` × stejný koeficient.
- Backstab: hodnota z vykreslené stránky má přednost před infoboxem i výchozí hodnotou.
- Řazení: nové nastavení hráče `rankBy: 'dps' | 'hit'`, výchozí `'dps'`. Každá zbraň má lepší z primárního a sekundárního DPS (`bestMode`). Zbraň bez DPS se při `'dps'` řadí na konec své skupiny.

## 13. Damage Calculator a jednotná čísla (PR #1, VC-11)

- 6. 10. 2026 je mergnutý PR #1 od Teuferona: `apps/damage-calculator/` (React + Vite) na `/damage-calculator/`. Data bere ze stejné wiki (valheim.weirdgloop.org, staženo 5. 10.) vlastním scraperem `apps/damage-calculator/scripts/scrape.ts`. Testy enginu jsou v `npm test` (156 kontrol).
- **Porovnání s Bestiary** (orchestrátor, 6. 10.):
  - Vzorec skillu je stejný (0.25–0.55 + 0.006·L).
  - Odolnosti a HP 78 společných jednotek se shodují. Rozdíl je jen u Chop a Pickaxe: kalkulačka je proti jednotkám ignoruje, Bestiary počítá slabiny z wiki (Stone Golem Pickaxe ×2, Gammeltroll, Kvastur).
  - **Chyba v Bestiary:** poškození na úrovních 2–4 se bralo jen z polí `<typ> per level` v infoboxu a ta u mnoha zbraní chybí. Kalkulačka bere tabulku „Upgrade information“ (Battleaxe 70/76/82/88, Bestiary 70). Bestiary tak u 216 hodnot podhodnocuje vyšší kvalitu.
  - Backstab: kalkulačka ho dává jen na první úder (pak má nepřítel na 5 minut imunitu), Bestiary na všechny. Správně je model kalkulačky.
  - Rychlosti útoku: kalkulačka má kurátorované profily (`src/data/attack-profiles.ts`) z tabulek typů zbraní na wiki a herního modelu MaxDPS, s označenou spolehlivostí. Původně plánované VC-10 (parsování vykreslených stránek) se **ruší**. Bestiary převezme profily kalkulačky, aby oba nástroje dávaly stejná čísla.
- **Jeden zdroj pravdy:** časování útoků a poškození po kvalitách se exportují z kalkulačky do `data/attack-profiles.json` a `data/weapon-quality.json`. Bestiary je čte a test parity hlídá, že `rank.js` a engine kalkulačky dávají stejná čísla.

## 14. Jednotné pořadí biomů (VC-12, 6. 10. 2026)

- Podle wiki (*Biomes*: Early game = Meadows, Black Forest, Ocean; Mid game od Swampu) a stejně jako v Damage Calculatoru:
  **1 Meadows · 2 Black Forest · 3 Ocean · 4 Swamp · 5 Mountain · 6 Plains · 7 Mistlands · 8 Ashlands · 9 Deep North.**
- `tier` = `order`. Rozlišení na `gearTier` se ruší a pro biom platí jedno číslo. Tier materiálu, zbraně i brnění je pořadí biomu, ze kterého pochází.
- Jediný zdroj pořadí v Bestiary a Armouru je `scripts/wiki/biomes.mjs`. Test hlídá, že pořadí sedí s `apps/damage-calculator/src/data/biomes.ts`.
- Důsledek: v Oceánu (Serpent) se doporučuje jen výbava do Oceánu (Black Forest + Chitin), ne železo ze Swampu. Stejně to dělá kalkulačka.
- § 2 výše (původní tabulka s Oceánem za Swampem) tímto neplatí.

## 15. Jazyky v celém Companionu (VC-16 až VC-19, 6. 10. 2026)

- **Princip převzatý z Runopisu** (`apps/signs/lib/i18n.ts`, `hooks/use-language.ts`):
  - 13 jazyků: en, cs, de, es, fr, pt, zh, hi, ar, bn, ru, ja, id
  - volba „auto“ podle `navigator.languages` (základ kódu, fallback en)
  - katalog zpráv `messages.json` = `{ "<anglický text>": { "<locale>": "<překlad>" } }`, chybějící překlad → angličtina, placeholdery `{name}`
  - arabština `dir="rtl"`
- **Jedna volba pro všechny sekce:** sdílený klíč `localStorage` **`vc.language`** (hodnota kód jazyka nebo `auto`). Při prvním čtení se převezme stará hodnota `runopis.language`. Změna v jedné záložce se projeví v ostatních (událost `storage`).
- **Sdílený kód:** `shared/i18n/`
  - `languages.json`: seznam jazyků
  - `core.js`: klasický skript bez importů pro statické sekce, `globalThis.VCI18n`
  - `core.ts`: pro React sekce, čte stejný `languages.json`
  - React sekce (signs, damage-calculator) ho importují relativně. Vite musí mít povolený přístup ke složce `shared` (`server.fs.allow`) a Docker stage musí kopírovat i `shared/`.
- **Přepínač jazyka:** stejný `<select>` vpravo nahoře v každé sekci i v rozcestníku: „Auto (browser)“ + 13 jazyků v jejich vlastním názvu.
- **Co se překládá:**
  - celé UI (nadpisy, tlačítka, popisky, legenda, tooltipy, patička včetně Ko-fi textu), včetně názvů biomů a typů poškození jako termínů hry
  - meta `description` a `og:` zůstávají anglicky (crawlery jazyk nevolí)
- **Názvy z hry** (jednotky, zbraně, suroviny, brnění, biomy):
  - z jazykových odkazů wiki (`action=parse&prop=langlinks`); ty dávají místní názvy z jazykových verzí wiki
  - pokrytí je dobré pro cs, de, fr, ru, částečné pro pt (`pt-br`) a zh (`zh-tw`)
  - pro ostatní jazyky zůstane anglický název
  - ukládá se jako `names: { "<locale>": "…" }` u záznamu
  - ⛔ názvy z hry se strojově nepřekládají
- Popisy z wiki (odstavce o jednotkách a zbraních) zůstávají anglicky a UI to nikde neskrývá.
- **Překlady UI** dělá agent. Termíny hry (Slash, Pierce, Blunt…, Meadows…) má překládat tak, jak je používá hra a jazykové wiki. Kde wiki má název, má přednost.

> **Zásada (Pavel, 6. 10. 2026): každý nový nástroj a každá nová funkce je od začátku ve 13 jazycích** přes sdílené jádro `shared/i18n/` (§ 15). Platí to i pro názvy z hry (`names` z jazykových odkazů wiki). Žádné zadání bez katalogu `locales/messages.json` a přepínače jazyka.

## 16. Progress Tracker (VC-19, VC-20)

- Nová sekce `/progress/` (`apps/progress/`, statická jako Bestiary). Hráč si odškrtává, kam se ve hře dostal. Ostatní nástroje se podle toho samy odemknou, takže nebude potřeba odemykat biomy v každém zvlášť.
- **Sdílený stav** `vc.progress` (localStorage, JSON) obsluhuje klasický skript `shared/progress/core.js` (`globalThis.VCProgress`):
  ```json
  { "version": 1,
    "defeated": { "eikthyr": true, "the-elder": true },
    "visited": ["meadows", "black-forest", "ocean"],
    "milestones": { "forge": true } }
  ```
  - `revealedBiomes()` = sjednocení `visited`, ručně otevřených biomů (`vc.openBiomes`) a **biomu následujícího po posledním poraženém bossovi** (porazím Eikthyra → odemkne se Black Forest).
  - `onChange(cb)` reaguje i na událost `storage` z jiné záložky.
  - `exportToUrl()` / `importFromUrl()`: stav jako base64url v `#p=…`, pro přenos mezi zařízeními.
- **Checklist po biomech** (data z `data/biomes.json` a `data/creatures.json`):
  - boss a jeho vyvolání (`summon` z infoboxu, např. „Malicious Blood x3“)
  - minibossové
  - „byl jsem tam“
  - klíčové milníky: suroviny nebo předměty z dropu bosse, které otevírají další biom (Hard Antler → měď a cín, Swamp Key, Wishbone, Dragon Tear, Torn Spirit, Queen Drop, Fader Drop…). Bere se `drops` bosse z dat, ⛔ nevymýšlí se.
- Spoilery: checklist neukazuje jména bossů ani předmětů z biomů, které nejsou odemčené. Místo nich je „🔒 Biome N“ a tlačítko „Reveal“.
- **Integrace (VC-20):** Bestiary, Armourer a Damage Calculator berou odemčené biomy z `VCProgress.revealedBiomes()`. Damage Calculator nastaví výchozí pozici posuvníku progrese podle posledního odemčeného biomu, pokud uživatel nemá vlastní volbu v URL. Rozcestník ukáže v záhlaví souhrn postupu („5 / 9 biomes · 4 bosses defeated“) a kartu Progress.

## 17. Provisions: jídlo a medovina (VC-21, VC-22)

- Nová sekce `/provisions/` (`apps/provisions/`, statická). Hráč skládá 3 jídla a medoviny na výpravu a dostane součet statů a nákupní seznam surovin.
- **Data** (ověřeno 6. 10. 2026):
  - `Category:Food` (~102), `{{infobox item}}` s `type = Food`: `health`, `stamina`, `eitr`, `duration` (s), `healing` („4 hp/tick“), `materials`, `source` („[[Cauldron]] (level 2)“, Cooking Station, Oven…), `quantity`
  - Medovina: stránky `type = Mead` (~21): `effect`, `duration`, `cooldown` a recept na mead base (tabber), fermentace ve Fermenteru
  - Feasty: tabulka na stránce *Feast*
  - Úrovně kotle a jejich vylepšení: stránka *Cauldron*
- **Funkce:**
  - jídla a medoviny seskupené po biomech (tier podle surovin), zamčené podle `VCProgress`
  - filtr podle zaměření (HP / Stamina / Eitr / vyvážené)
  - 3 sloty na jídlo + sloty na medovinu
  - souhrn: HP, stamina, eitr, léčení a nejkratší doba trvání
  - „na kolik hodin hraní“ → počet porcí
  - nákupní seznam s rozpadem na základní suroviny, stanicemi a jejich potřebnou úrovní a zdroji (jednotky v Bestiary, místa)
  - uložení `vp.loadout`, sdílení v URL
- **Sdílený košík:** výpočet nákupního seznamu a rozpadu z Armouru se vytáhne do `shared/shopping/core.js` a používá ho Armourer i Provisions. Bez kopie logiky.

## 18. Vylepšení stávajících nástrojů (VC-23 až VC-27, Pavel 6. 10. 2026: před Progress a Provisions)

Vychází z `docs/NAVRHY-NASTROJU.md` § „Menší vylepšení“. Platí zásada 13 jazyků.
- **Armourer (VC-23):**
  - Do košíku jde přidat i zbraně, štíty a nástroje, se všemi úrovněmi a cenami vylepšení. Štíty dosud z dat vypadávaly, teď se stahují jako kategorie `shield` s `recommendable: false`.
  - Suroviny z `Category:Can't be Teleported` mají štítek „Can't be teleported“ a košík varuje.
  - **Kalkulačka tavení:** z wiki *Smelter* (1 Coal / 15 s, 30 s na ingot, tedy 2 uhlí na ingot), *Blast Furnace*, *Charcoal Kiln* (dřevo → uhlí) se pro tavené suroviny v rozpadu spočítá uhlí, dřevo do pece a čas na N tavicích pecí (volitelný počet). Hodnoty se ⛔ neopisují ručně, berou se z wiki stránek stanic.
  - Deep link `#set=<id>` otevře set.
- **Bestiary (VC-24):**
  - **Trofeje:** šance na drop a použití z tabulky *Trophies* (`Trophy | Drop chance | Usage | …`).
  - **Ochočování:** u ochočitelných jednotek krmení a dosah z tabulky *Taming* („Creature Feeding Habits“) a doba ochočení, pokud je na stránce.
  - **Nájezdy:** „Appears in raids: …“ z tabulky *Events* (Event name, creatures, biome, enabled by). Spoilery se respektují: nájezd, který spouští boss ze zamčeného biomu, se ukáže jen jako „a later raid“.
  - Sdílení profilu skillů v URL (`#player=…`, base64url, s potvrzením importu).
  - Deep link `#c=<creatureId>` otevře biom a odscrolluje na kartu (spoilery: zamčený biom nabídne „Reveal“).
- **Damage Calculator (VC-25):**
  - Sdílený profil hráče: když URL nemá vlastní skill, výchozí skill = skill hráče z `vc.player` pro třídu zbraně. Výchozí kvalita podle `vc.player.quality`. Přepínač „Use my Bestiary profile“.
  - Z karty jednotky v Bestiary vede odkaz „Open in Damage Calculator“ s předvyplněným cílem a doporučenou zbraní (URL formát kalkulačky `view-url.ts`).
- **Sign Editor (VC-26):**
  - Galerie šablon: štítky truhel (suroviny podle biomů), portálové tagy, značky cest, uvítací cedule. Šablony jsou v datech, přeložené do 13 jazyků, kromě jmen z hry.
  - Sdílení cedule v URL (`#sign=…`).
- **Rozcestník (VC-27):** společné hledání napříč sekcemi (jednotky, zbraně, brnění, suroviny) s místními názvy. Výsledek vede přes deep link do příslušné sekce. Index se generuje při buildu (`apps/hub/data/search.js`). Souhrn postupu v záhlaví řeší VC-20.

## 19. Návštěvnost: Google Analytics 4 se souhlasem (VC-28, 6. 10. 2026)

- **GA4:** služba „Valheim Companion“ v účtu Pawlig, webový stream „Valheim Companion web“ (stream ID 16052418584), **Measurement ID `G-CXQVNCCJKE`**, časové pásmo Česko.
- **Souhlas (Pavel zvolil nenápadnou lištu, GDPR):**
  - **Consent Mode v2:** výchozí stav `denied` pro `analytics_storage`, `ad_storage`, `ad_user_data` a `ad_personalization`. Bez souhlasu se nenastaví žádné cookies a Google dostává jen anonymní pingy.
  - Po „Allow analytics“ se nastaví `analytics_storage: granted`. Reklamní signály zůstávají vždy `denied`.
  - Lišta je malá, dole, ve 13 jazycích: „We use Google Analytics to see which tools help players. Allow analytics?“ s tlačítky [Allow] [Decline] a odkazem na Privacy.
  - Volba platí pro celý Companion: `localStorage` `vc.consent` = `{ "analytics": "granted"|"denied", "at": ISO }`.
  - V patičce každé sekce je odkaz „Cookie settings“, který lištu znovu otevře.
- **Kód:** `shared/analytics/consent.js` je klasický skript, ⛔ inline. Nastaví `dataLayer`/`gtag`, výchozí souhlas a dynamicky načte `https://www.googletagmanager.com/gtag/js?id=…`. Spustí se jen na produkční doméně (`site.config.json` → `siteUrl` a `gaMeasurementId`), ne na localhostu ani v náhledu.
- **CSP:** rozšíří se jen o to, co GA potřebuje:
  - `script-src 'self' https://www.googletagmanager.com`
  - `connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com`
  - `img-src 'self' data: https://*.google-analytics.com https://*.googletagmanager.com`
- **Stránka Privacy** `/privacy/` (rozcestník, 13 jazyků): co se měří, proč, jak odvolat souhlas, žádné reklamy a žádný prodej dat, kontakt.

> **Zásada (Pavel, 6. 10. 2026): názvy z hry se nepřekládají.** Jednotky, bossové, zbraně, munice, brnění, suroviny, jídla, stanice i biomy zůstávají **anglicky ve všech jazycích** a ve všech nástrojích, stejně jako je hráč zná ze hry. Překládá se jen rozhraní: popisky, tlačítka, nápovědy, legenda a věty kolem názvů. Data `names` z jazykových odkazů wiki (VC-17) mohou zůstat v datech, UI je ale ⛔ nepoužívá. Tato zásada ruší body § 15 o místních názvech.

## 20. Odkazy mezi nástroji (kontrakty URL)

| Cíl | Tvar | Kdo ho používá |
|---|---|---|
| Bestiary, jednotka | `/bestiary/#c=<creatureId>` | hledání v rozcestníku (VC-27) |
| Bestiary, profil hráče | `/bestiary/#player=<base64url>` | sdílení profilu (VC-24) |
| Armourer | `/armourer/#set=<id>`, `#item=<id>` | hledání (VC-27) |
| Damage Calculator | `/damage-calculator/?biome=<biomeId>&target=<slug>` (+ volitelně `weapon`, `class`, `level`, `skill`, `roll`, `attack`, `state`; formát `src/lib/view-url.ts`) | karty Bestiary (VC-30), hledání |
| Sign Editor | `/signs/#sign=<base64url>` | sdílení cedule (VC-26) |
| Comfort Planner | `/comfort/#b=<base64url>`, `#item=<id>` | sdílení stavby, hledání, tip v Provisions (VC-35) |
| Expedition | `/expedition/#boss=<id>`, `#raids`, `#x=<base64url>` | hledání, karta bosse v Bestiary (VC-36) |

- Id biomů a jednotek jsou ve všech nástrojích stejná (`creature.id` v Bestiary = `slug` v kalkulačce). Bestiary odkazuje do kalkulačky jen u jednotek, které kalkulačka zná (`calculatorSlug` v bundlu); dnes je to 78 ze 106.
- Z Bestiary do kalkulačky se posílá **jen `biome` a `target`**. Zbraň, úroveň a skill si kalkulačka vezme z profilu hráče (VC-25) a návštěvník je doladí sám (návrh od Teuferona, 6. 10. 2026).

> **Doplnění zásady (6. 10. 2026):** nepřekládají se ani **názvy nástrojů** (Valheim Companion, Bestiary, Armourer, Armory, Damage Calculator, Sign Editor, Runopis, Progress Tracker, Provisions, Comfort Planner). Jsou to vlastní jména.

## 21. Progress jako vysouvací panel na každé stránce (VC-32, Pavel 6. 10. 2026)

- Progress Tracker je dostupný z **každé stránky Companionu** jako vysouvací panel zprava. Stránka `/progress/` zůstává jako plné zobrazení (sdílení a reset).
- **Spouštěč:** na desktopu svislá záložka na pravém okraji „⛓ Progress N/9“, na mobilu (< 640 px) kulaté tlačítko vlevo dole nad lištou souhlasu. Vkládá ho sdílený skript, takže sekce nemusí měnit hlavičku.
- **Jeden kód:** vykreslování checklistu se z `apps/progress/assets/app.js` vytáhne do `shared/progress/ui.js` (`VCProgressUI.render(container, data, { compact })`). Stránka i panel ho používají. ⛔ Dvě kopie.
- **Data** (`/progress/data/data.js`) se načtou až při prvním otevření panelu.
- **Reakce bez obnovení stránky:** všechny sekce poslouchají `VCProgress.onChange` (Bestiary a Smithy už to umí). Kalkulačka posune progresi jen tehdy, když ji uživatel nenastavil ručně ani v URL.
- Přístupnost: `role="dialog"`, `aria-modal`, focus trap, Esc zavírá, focus se vrátí na spouštěč. Stejná pravidla pro 13 jazyků a pro anglické názvy z hry.

## 22. Množná čísla (VC-33)

- `shared/i18n` (`core.js` i `core.ts`) dostane `tn(catalog, key, count, values)` přes `Intl.PluralRules(locale)`.
- Katalog pro počítané texty: `{ "<anglický klíč>": { "<locale>": { "one": "…", "few": "…", "many": "…", "other": "…" } } }`. Tvary jsou podle CLDR jazyka (např. cs: one/few/many/other, ar: zero/one/two/few/many/other, ja/zh/id: jen other). Chybějící tvar spadne na `other`, pak na angličtinu.
- Platí pro všechny sekce, včetně React (Runopis, kalkulačka). Každý text s číslem („N players“, „N bosses defeated“, „N servings“, „N creatures“, „N weapons“…) jde přes `tn`.

## 23. Provisions: plánovač podle činnosti (VC-34)

- **Činnost** (přepínač nad seznamem jídel):

  | Činnost | Skóre jídla |
  |---|---|
  | Boss fight | `HP×1.0 + stamina×0.35 + healing×6` |
  | Combat | `HP×1.0 + stamina×0.6 + healing×3` |
  | Mining & building | `stamina×1.0 + HP×0.4` |
  | Farming | `stamina×1.0 + HP×0.3 + duration_min×0.4` |
  | Exploration & sailing | `stamina×0.8 + HP×0.5 + duration_min×0.8` |
  | Magic | `eitr×1.2 + HP×0.6 + stamina×0.2` |
  | Balanced | `HP + stamina + eitr×0.5` |

  `healing` je HP za tik a `duration_min` doba v minutách. Váhy jsou v jedné konstantě a jdou snadno ladit.
- **Nejlepší kombinace:** projdou se všechny trojice **různých** jídel z odemčených biomů (`VCProgress`, nanejvýš ~170 000 kombinací, v prohlížeči do 100 ms) a ukáže se top 3 podle součtu skóre. Při shodě vyhrává levnější výroba (méně surovin po rozpadu, nižší úroveň stanice). Feasty se počítají jako jedno jídlo.
- **„Easy to cook“** (přepínač): skóre se vynásobí `1 / (1 + 0.15 × (počet různých základních surovin − 1) + 0.1 × (úroveň stanice − 1))`.
- **Medoviny podle činnosti a biomu**, pravidla nad `meads.json` (`effect.resistances`, text efektu):
  - jed: biom Swamp nebo boss Bonemass
  - mráz: Mountain, Deep North, Moder, Kall Fimbulbringer
  - oheň: Ashlands, Fader, Lord Reto
  - léčivé (Healing): Boss fight a Combat
  - staminové (Stamina regen nebo „Tasty“): Mining, Farming, Exploration
  - eitr: Magic
  - doporučí se jen odemčené medoviny
  - Činnost má volitelně „biom / boss“ (select z odemčených biomů a bossů).
- **Tipy:**
  - **spočítané** ze zvoleného loadoutu (šablony): nejkratší doba a počet porcí na zvolené hodiny, chybějící úroveň kotle a co k ní chybí, varování „suroviny nelze teleportovat“, když se týkají
  - **obecné** v `apps/provisions/data/tips.json`: 10–15 krátkých rad, každá s odkazem na stránku wiki, ze které vychází (`source`). Jen fakta ověřená na valheim.weirdgloop.org.
  - Všechny tipy ve 13 jazycích, názvy z hry anglicky.

## 24. Comfort Planner (VC-35, Pavel 6. 10. 2026)

Nová sekce `/comfort/` (`apps/comfort/`, statická, vanilla JS jako Provisions). Hráč skládá nábytek do základny a vidí výsledný comfort, délku efektu Rested a nákupní seznam.

- **Pravidla hry** (ověřeno na wiki 6. 10. 2026, stránky *Comfort*, *Resting*, *Rested*):
  - `comfort = 1 (základ) + 1 (shelter) + Σ nejvyšší kus v každé kategorii + kusy bez kategorie (Maypole, Yule Tree)`. Kusy ve stejné kategorii se nesčítají, stejný kus se nesčítá sám se sebou.
  - Kategorie: Fire, Rug, Table, Chair, Bed, Banner (i Jute Curtain a Drapes), Plants, Stands, Bathroom, Lights, Ashlands.
  - Bez střechy (jen u ohně) je comfort vždy 1, všechno ostatní se ignoruje.
  - Nábytek se počítá do 10 m od hráče. Hearth dává 2 jen pod střechou a do 8 m, jinak 1. Ohně musí hořet, Hot Tub musí být zatopený.
  - **Rested = 7 + comfort minut.** Efekt dává HP regen +50 %, stamina regen +100 %, eitr regen +100 % a XP +50 %.
  - Maximum bez sezónních kusů je 22 (29 min). Maypole a Yule Tree přidají po 1 (24, 31 min).
- **Data:**
  - `data/comfort.json`: kategorie, kusy a hodnoty z tabulky na stránce *Comfort*.
  - Každý kus má infobox `{{infobox structure}}` s `comfort = Bed 2`, `materials`, `source` (Workbench, Stonecutter, Forge, Artisan Table, Black Forge…) a `image`.
  - Tier kusu = max(tier surovin, tier stanice). Logika je sdílená s Smithy a Provisions.
  - Sezónní kusy (`seasonal: true`): Maypole, Yule Tree, Mistletoe, Yule garland, Yule wreath, Jack-O-Turnip.
  - **Kontrola správnosti:** spočítané maximum podle biomu musí sedět s tabulkou wiki „Maximum comfort per biome“: Meadows 5, Black Forest 13, Swamp 15, Mountain 17, Plains 19, Mistlands 20, Ashlands 22, Deep North 22. Ocean má stejné maximum jako Black Forest. Odchylka se buď opraví v `data/overrides.json`, nebo se zdůvodní v reportu.
- **Funkce:**
  - souhrn nahoře: comfort N / maximum pro můj postup, Rested N min, přepínač „Sheltered“ (výchozí zapnuto)
  - kategorie jako řádky karet, v každé se vybírá nanejvýš jeden kus (nebo nic); Maypole a Yule Tree jsou zaškrtávátka
  - zamčené kusy podle `VCProgress.revealedBiomes()` s „Reveal“, sezónní kusy jen s přepínačem „Include seasonal items“
  - „Best I can build“ vybere v každé kategorii nejvyšší odemčený kus, při shodě ten levnější (méně základních surovin po rozpadu); „Clear“
  - **„Next upgrades“:** až 5 jednotlivých změn, které nejvíc zvednou comfort, seřazené podle zisku a pak podle ceny (např. „+1 · Hearth instead of Campfire · 15 Stone“)
  - nákupní seznam přes `VCShopping` jen pro kusy, které hráč ještě nemá („I have it“ jako Have/Want ve Smithy): rozpad, potřebné stanice, zdroje surovin s odkazy do Bestiary, „Copy list“, varování o neteleportovatelných surovinách
  - tipy: 8–10 ověřených rad s odkazem na wiki (10 m, shelter, Hearth 8 m, ohně musí hořet, Hot Tub zatopený, kategorie se nesčítají, táborák u vchodu do dungeonu = 10 min, mokrý hráč neodpočívá, Rested 7 + comfort)
  - uložení `vco.build`, sdílení `#b=<base64url>`, deep link `#item=<id>` (hledání v rozcestníku)
- **Vazby:** karta v rozcestníku mezi Provisions a Sign Editor (štítek „Follows your progress“), řádek „Unlocks spoilers in:“ na kartě Progress, položky v hledání rozcestníku, odkaz z tipu o Rested v Provisions.
- Název nástroje **Comfort Planner** se nepřekládá (doplnění zásady v § 20).

## 25. Expedition: Boss & Raid Prep (VC-36, Pavel 7. 10. 2026)

Nová sekce `/expedition/` (`apps/expedition/`, statická, vanilla JS jako Comfort Planner). Hráč si vybere bosse a dostane kompletní přípravu na boj: co ho vyvolá, čím ho bít, proti čemu se chránit, co sníst a vypít, co sbalit a co nakoupit. Druhá záložka ukáže, jaké nájezdy mu teď můžou přijít na základnu a co se změní po dalším bossovi.

- **Pravidla nájezdů** (ověřeno na wiki *Events* 7. 10. 2026):
  - Každých **46 minut je 20% šance** na náhodnou událost.
  - Dostupné události závisí na tom, které jednotky byly ve světě poraženy (sloupce *Enabled by* a *Disabled by*). Událost se dvěma jednotkami (např. Troll a The Elder) potřebuje obě.
  - Hráč musí být v biomu události, ne v dungeonu a **do 40 m od aspoň 3 staveb základny** (neplatí pro „You are being hunted…“).
  - Pro konec události musí hráč zůstat v oblasti, dokud nevyprší čas. Bez hráčů v oblasti se čas zastaví.
  - Výchozí jsou nájezdy podle světa. Modifikátor „player-based raids“ je řídí podle Forsaken powers a surovin hráče: v nástroji jen poznámka, nepočítá se.
- **Data:**
  - `data/events.json` z tabulky „World-based event requirements“ na stránce *Events*: `id` (`army_eikthyr`), `startMessage`, `endMessage`, `creatures` (id z `creatures.json`), `enabledBy` (seznam id, `all` nebo `any` podle „and“ / „or“), `disabledBy`, `biomes`, `durationSeconds`, `notes` (např. Freezing u `army_moder`, Monument of Torment).
  - Bossové jsou už v `creatures.json` (`kind: "boss"`, `summon`, `drops`, `stars[0].attacks`, `modifiers`). Doplní se `data/expedition.json` jen s tím, co chybí: `altar` (název a jak ho najít, z wiki stránky bosse), `summonItems` (id, počet, odkud), `forsakenPower` (název a efekt). The Queen nemá oběť, ale Sealbreaker (klíč do Infested Citadel).
  - Předměty k vyvolání (Ancient Seed, Withered Bone, Dragon Egg, Fuling Totem, Bell, Malicious Blood, Sealbreaker) se doplní do `data/items.json` se `sources`, ať je umí košík.
  - ⛔ Data se nekopírují: zbraně, doporučení a profil hráče se berou z bundlu Bestiary (`/bestiary/data/data.js` + `rank.js`), jídla a medoviny z bundlu Provisions (`/provisions/data/data.js` + `VPAdvisor`). Vlastní bundle `/expedition/data/data.js` má jen events, expedition a tipy.
- **Záložka Boss prep:**
  - **Cíl:** výchozí je první neporažený boss podle `VCProgress` (pořadí biomů § 14). Select ukáže jen bosse z odemčených biomů, ostatní jako „🔒 Boss N“ s „Reveal“. Deep link `#boss=<id>`.
  - **Karta bosse:** obrázek, HP podle počtu hráčů (stejný vzorec jako Bestiary `creatureHp`: `HP × (1 + 0.3 × (min(hráči, 5) − 1))`), biom, oltář a jak ho najít, vyvolání, útoky s typy poškození, slabiny a odolnosti, imunita na stagger, odkaz do Bestiary (`#c=`) a do kalkulačky (`calculatorSlug`).
  - **Zbraně:** top 3 z `recommend()` z Bestiary s profilem hráče `vc.player` (DPS, čas do zabití), jen z odemčených biomů. Počet hráčů jde změnit přímo tady a zapisuje se do `vc.player.players`.
  - **Obrana:** příchozí poškození podle typů (součet z útoků bosse, chop/pickaxe se ignoruje). Pro dva nejsilnější elementální typy (fire, frost, poison, lightning, spirit) doporučí medovinu odolnosti (`VPAdvisor.recommendMeads` s kontextem bosse) a kusy brnění s touto odolností (`armor.json` → `resistances`, jen odemčené, odkaz do Smithy `#set=`).
  - **Jídlo:** nejlepší trojice pro činnost „Boss fight“ (`VPAdvisor.bestCombos`) z odemčených biomů, s odkazem „Open in Provisions“ (`/provisions/#l=` přes `VPPlanner.encode`).
  - **Balicí seznam** (zaškrtávací, ukládá se): předměty k vyvolání, doporučená zbraň, jídlo na zvolenou délku boje (výchozí 30 min, porce podle `duration`), medoviny (1 kus na každých `duration` + rezerva 1), volitelně materiál na portál (recept *Portal* z `items.json`).
  - **Nákupní seznam** přes `VCShopping` pro nezaškrtnuté položky: rozpad, stanice, zdroje s odkazy do Bestiary, „Copy list“, varování o neteleportovatelných surovinách.
  - **Tipy:** `data/expedition-tips.json`, ke každému bossovi 2–3 a 5–8 obecných, každý se `source` na valheim.weirdgloop.org. ⛔ Nedoložená tvrzení.
- **Záložka Raids:**
  - Podle `VCProgress.defeated` rozdělí události na **Can happen now**, **Ended** (vypnul je poražený boss) a **Coming next** (zapne je další boss). Každá událost: startovní hláška (podle ní hráč pozná, co přichází), jednotky s odkazy do Bestiary a jejich slabiny, biomy, délka.
  - Podmínky, které nejsou bossové (Troll, Krigen, Hexen, Eyeless One, Bat…), se považují za splněné, když je jejich biom odemčený, a u události je poznámka „once you have killed a Troll“.
  - **„After you defeat <boss>“:** které události přibudou a které skončí. Je i na záložce Boss prep pod kartou bosse.
  - Rámeček s pravidly nájezdů (výše) a s tím, jak se bránit: stavět mimo dosah (40 m, 3 stavby), zůstat v oblasti do konce. Jen fakta z wiki.
  - Spoilery: událost spouštěná bossem ze zamčeného biomu je „A later raid“ bez jmen (stejně jako `VCExtras.raidIsHidden` v Bestiary).
- **Vazby:** karta v rozcestníku za Comfort Planner (štítek „Follows your progress“), „Unlocks spoilers in:“ na kartě Progress, hledání v rozcestníku (bossové → `/expedition/#boss=<id>`, události → `/expedition/#raids`), na kartě bosse v Bestiary odkaz „Prepare for this fight → Expedition“.
- URL: `/expedition/#boss=<id>`, `#raids`, sdílení přípravy `#x=<base64url>` (boss, počet hráčů, délka boje, zaškrtnuté položky). Uložení `vx.prep`.
- Název nástroje **Expedition** se nepřekládá (doplnění zásady v § 20).

## 26. Progress Tracker: Saga — dlaždice biomů a slider (VC-38, Pavel 8. 10. 2026)

> **Pavel 8. 10. 2026:** *„je to takové těžko pochopitelné a hodně klikání, chtěl bych to udělat nějak přehlednější a jasnější, třeba jen tím, že budou hezky zobrazené biomy a v nich bossové a ty přes to budeš přejíždět nějakým pěkným grafickým sliderem … dozaškrtávat si tam budeš jen zabití bossů a minibossů."*

- **Formát `vc.progress` se nemění** (verze 1, `defeated`, `visited`, `milestones`). `revealedBiomes()` se chová stejně, ostatní nástroje se nemění.
- **Dosah („kam jsem došel“)** = jedno číslo 1–9: nejvyšší `order` z `visited` a z biomů odemčených poraženými bossy (bez `vc.openBiomes`). `setReach(n)` zapíše `visited` = všechny biomy s `order ≤ n`. Dosah nejde stáhnout pod minimum dané poraženými bossy (slider se zastaví, nápověda „Unmark bosses to go back“). Poražený boss v biomu za dosahem dosah posune.
- **Ovládání:** jen tři věci. ① **slider** pod řadou biomů (nativní `input type=range`, klávesnice funguje), ② **klik na dlaždici** biomu = „došel jsem sem“ (totéž co slider), ③ **klik na portrét** bosse nebo minibosse = poražen / neporažen (`button aria-pressed`). Pryč jsou checkboxy „Visited“, „Key drops“ (stav `milestones` zůstává kvůli kompatibilitě, jen se neukazuje) a tlačítka „Reveal“ (nahrazuje je slider).
- **Vzhled:** dlaždice s artworkem biomu (zmenšeniny z `apps/bestiary/img/biomes/`), číslo biomu, název, portréty bossů (velké) a minibossů (menší). Neporažený = odbarvený, poražený = barevný se zlatým okrajem a pečetí ✓. Biom za dosahem = tmavý, rozmazaný artwork, 🔒 „Biome N“, bez názvu a portrétů (spoiler). Pod řadou karta **Next up** (první neporažený boss v dosahu: vyvolání, odkazy Bestiary / Expedition / Damage Calculator), souhrn „Biome 4 of 9 · 3 of 8 bosses · 1 of 4 minibosses“, sdílení a reset.
- **Panel (overlay)** používá stejný `VCProgressUI.render(…, { compact: true })`: souhrn, malá řada 9 čipů biomů se sliderem a pod ní dosažené biomy (aktuální nahoře) s portréty k odškrtnutí, odkaz na plný tracker.

## 27. Items Compendium: celkový přehled předmětů a surovin (VC-39, Pavel 9. 10. 2026)

> **Pavel 9. 10. 2026:** *„chtěl bych nějaký celkový přehled itemu ve hře, a z hledání a z jakéhokoliv prokliku by to vedlo na ně, a u každého itemu by jsi měl prolinkování do příslušných míst která se dají použít, smithy, provisions atd...“*

Nová sekce `/items/` (`apps/items/`, statická vanilla JS aplikace jako Smithy a Provisions). Kompletní katalog všech materiálů, surovin, ingrediencí, dropů a trofejí ve Valheimu (Meadows až Deep North). Slouží jako centrální uzel („Knowledge Base / Compendium“) pro suroviny s obousměrným propojením do všech specializovaných nástrojů Companionu.

- **Data (`scripts/build-items-data.mjs` → `apps/items/data/data.js` a `data/items-compendium.json`):**
  - Vstup: `data/items.json`, `data/weapons.json`, `data/armor.json`, `data/comfort.json`, `apps/provisions/data/data.js`, `data/expedition.json`, `data/creatures.json`, `data/stations.json`.
  - Každý záznam itemu:
    - `id`, `name`, `image`, `biome`, `tier`, `category` (`metal`, `drop`, `trophy`, `food-ingredient`, `crafting`, `valuable`, `summoning`), `teleportable` (true/false), `stack`, `weight`, `wiki`
    - **`sources`:**
      - Drop z bytosti: `creatures: [{ id, name, biome }]` → odkaz `/bestiary/#c=<id>`
      - Sběr v přírodě / těžba: `location` / `other`
      - Výroba na stanici: `recipe: { station, stationLevel, materials: [{ item, amount }] }`
      - Nákup u obchodníka: `trader: "Haldor" | "Hildir" | "Bog Witch"` s cenou
    - **`usedIn` (obrácený index receptů napříč všemi nástroji):**
      - `weapons`: `[{ id, name, biome }]` → odkaz `/smithy/#item=<id>`
      - `armor`: `[{ id, name, set, biome }]` → odkaz `/smithy/#set=<set>` nebo `/smithy/#item=<id>`
      - `food`: `[{ id, name, isFeast, biome }]` → odkaz `/provisions/#item=<id>`
      - `meads`: `[{ id, name, biome }]` → odkaz `/provisions/#item=<id>`
      - `comfort`: `[{ id, name, comfort, biome }]` → odkaz `/comfort/#item=<id>`
      - `expedition`: `[{ bossId, bossName, biome }]` → odkaz `/expedition/#boss=<bossId>`
      - `stations`: `[{ id, name, level, biome }]`
- **Uživatelské rozhraní `/items/`:**
  - Záhlaví „Items Compendium“, podtitul ve 13 jazycích, návrat na rozcestník, přepínač jazyka, vysouvací panel `VCProgress`.
  - Vyhledávání (okamžitá filtrace podle anglického názvu).
  - Filtry biomů (Meadows až Deep North, zamykání neprobádaných biomů podle `VCProgress`, synchronizace se sliderem).
  - Filtry kategorií: All, Metals & Ores, Monster Drops, Trophies, Food Ingredients, Building & Crafting, Valuables & Traders, Boss Summoning.
  - Karta / detail položky:
    - Ikona, anglický název hry, biome badge, tier.
    - Vlastnosti: štítek „Can't be teleported“ (pokud nelze portovat), váha, stack size.
    - Blok **Sources (Kde získat):** s klikacími odkazy do Bestiary (`/bestiary/#c=<creatureId>`).
    - Blok **Used in (Kde se používá):** rozdělený do přehledných sekcí (Weapons & Armor, Food & Mead, Comfort & Base, Boss Altar) s přímými klikacími odkazy do `/smithy/`, `/provisions/`, `/comfort/`, `/expedition/`.
    - Akce „Add to shopping cart“: přidá surovinu do nákupního košíku `VCShopping` / `va.cart`.
- **Prolinkování z celého Companionu:**
  - **Hub (`/`):** v `scripts/build-search-index.mjs` jsou materiály a suroviny přesměrovány na `/items/#item=<id>`. Nová karta na rozcestníku.
  - **Bestiary (`/bestiary/`):** v detailu každé jednotky u `drops` a `trophy` je každý předmět klikací odkaz na `/items/#item=<id>`.
  - **Smithy (`/smithy/`):** v receptech a v nákupním košíku Have/Want je klik na surovinu odkazem na `/items/#item=<id>`.
  - **Provisions (`/provisions/`):** v receptech a nákupním seznamu je klik na ingredienci odkazem na `/items/#item=<id>`.
  - **Comfort Planner (`/comfort/`):** v rozpisu nábytku a nákupním seznamu je klik na surovinu odkazem na `/items/#item=<id>`.
  - **Expedition (`/expedition/`):** v balicím seznamu u vyvolávacích předmětů (summon items) je klik odkazem na `/items/#item=<id>`.
- **Smlouva URL:** `/items/#item=<id>` odroluje na položku, otevře její detail a v případě uzamčeného biomu nabídne „Reveal“.
- **Název nástroje:** **Items Compendium** (vlastní název, nepřekládá se dle § 20).

## 28. Trader Ledger: Haldor, Hildir & Bog Witch (VC-40, Pavel 9. 10. 2026)

> **Pavel 9. 10. 2026:** *„určitě ten trader ledger a asi i armor calculator i ten globální shopping vault“*

Nová sekce `/traders/` (`apps/traders/`, statická vanilla JS aplikace). Kompletní přehled všech tří obchodníků ve hře, jejich nabídky, cen v mincích, podmínek odemknutí zboží a kalkulačka pokladů (appraisal cenností).

- **Zdroj dat (VC-42a):** zboží, ceny, množství za nákup a podmínky odemknutí se **parsují z tabulky „Sells/Trading" na wiki stránce obchodníka** (`Haldor`, `Hildir`, `The Bog Witch`, wiki cache `data/raw/`) skriptem `scripts/build-traders-data.mjs`; ručně psané zůstávají jen popisy obchodníků a seznam cenností. Čísla níže byla přeměřena z této tabulky (původní čísla ve VC-40 byla vymyšlená).
- **Tři obchodníci (11 + 38 + 20 položek):**
  1. **Haldor** (Black Forest), 11 položek:
     - Vždy: Yule Hat (100), Dverger Circlet (620), Megingjord (950), Fishing Rod (350), Fishing Bait (x20, 10), Barrel Hoops (x3, 100).
     - Po porážce bosse: Ymir Flesh (120) a Thunder Stone (50) po The Elder, Wider Pockets (1000) po Moder, Egg (1500) po Yagluth, Deeper Pockets (2000) po The Queen.
  2. **Hildir** (Meadows), 38 položek (kosmetika, Iron Pit, Barber Kit, ohňostroje):
     - Vždy (8): Simple dress/tunic natural (250), Simple cap red/purple (150), Headband (175), Sparkler (150), Iron Pit (75), Barber Kit (600).
     - Odemyká se po vrácení truhel (Hildir's request): brass chest (Brenna, Smouldering Tomb), 11 položek za 200–550 (Simple dress/tunic barevné 350, Harvest dress/tunic 550, Fur cap brown 200, Straw hat 300, Tied headscarf blue 200); silver chest (Geirrhafa, Howling Cavern), 9 položek za 250–450 (Shawl dress, Cape tunic, Twisted headscarf green, Extravagant cap green, Tied headscarf yellow); bronze chest (Zil & Thungr, Sealed Tower), 10 položek za 50–550 (Beaded dress/tunic 550, Twisted headscarf red 300, Fur cap grey 300, Extravagant cap orange 300, Basic fireworks 50).
  3. **The Bog Witch** (Swamp), 20 položek: prodává **suroviny a ingredience** (medoviny se vaří, neprodávají se). Vždy: Candle Wick (x50, 100), Love Potion (x5, 110), Fresh Seaweed (x5, 75), Cured Squirrel Hamstring (x5, 80), Powdered Dragon Eggshells (x5, 120), Pungent Pebbles (x5, 125), Ivy Seeds (x3, 65), Serving Tray (140). Po bossech: Scythe Handle (200), Toadstool (85), Fragrant Bundle (x5, 140) a Mountain Peak Pepper Powder (x5, 140) po Moder; Woodland Herb Blend (x5, 120) a Corked Vial (x5, 150) po The Elder; Grasslands Herbalist Harvest (x5, 160) po Yagluth; Herbs of the Hidden Hills (x5, 180) po The Queen; Fiery Spice Powder (x5, 200) po Fader; Seasoning of the Gourd (x5, 220) po Kall Fimbulbringer. Podmínka „creature": Seafarer's Herbs (x5, 130) po zabití Serpenta (Ocean), Crown of Roots (3000) po porážce Writhana (Swamp).
  - Podmínka `unlockedBy.type` je `boss`, `chest` (Hildir) nebo `creature` (ne-boss bytost; zamyká se podle toho, zda je odhalený její biom ve `VCProgress`).
- **Funkce sekce `/traders/`:**
  - Tři záložky / sekce pro jednotlivé obchodníky s jejich portréty/ikonami, biomem výskytu a tipem, jak je najít (Vegvisir, ikona na mapě při přiblížení).
  - Přehled sortimentu: ikona předmětu, název (anglicky dle VC-29), cena v mincích, popis, podmínka odemknutí (`unlockedBy`), přímý klikací odkaz na kartu v Items Compendium (`/items/#item=<id>`).
  - Spoiler ochrana přes `VCProgress`: zamčené zboží je označeno 🔒 s uvedením podmínky („Requires defeating The Elder“ / „Requires returning Hildir's brass chest“) s možností „Reveal“.
  - **Coin & Valuables Appraisal (Kalkulačka pokladů):**
    - Vstup pro zásoby hráče: Amber (5 coins), Amber Pearl (10 coins), Ruby (20 coins), Silver Necklace (30 coins) + přímo Coins.
    - Okamžitý součet celkového jmění v mincích.
    - Porovnání s cenami: indikace u každého zboží, zda na něj hráč má dost mincí.
  - Akce „Add to shopping cart“ přes `VCShopping` / `va.cart`.
- **Prolinkování z celého Companionu:**
  - **Hub (`/`):** karta Trader Ledger v rozcestníku + vyhledávání obchodníků.
  - **Items Compendium (`/items/`):** u předmětů, které se kupují u obchodníka (Ymir Flesh, Megingjörd, Egg, Love Potion...), odkaz přímo do `/traders/#trader=<id>`.
  - **Smithy (`/smithy/`):** u surovin koupených od obchodníka odkaz do `/traders/`.
  - **Provisions (`/provisions/`):** u Bog Witch surovin a lektvarů odkaz do `/traders/`.
- **Smlouva URL:** `/traders/#trader=<id>` a `#item=<id>`.
- **Název nástroje:** **Trader Ledger** (vlastní název, nepřekládá se dle § 20).

## 29. Items Compendium: Oprava modalu a kompletní katalog všech předmětů (VC-40b, Pavel 9. 10. 2026)

> **Pavel 9. 10. 2026:** *„item compendium je spatne, vysi tam nějaký popup a je tam hrozněš málo itemu, chci aby jsi si to po sobě pořádně kontroloval a opravil to, až doběhne VC-40 tak se pust do opravy, a než něco nasadíš tak si to pořádně kontroluj, a klidně využij i ZAi glm na práci aktuálně má ještě 8 procent tak ho klidně vyčerpej“*

### Nález a příčiny chyb z první verze (VC-39)
1. **Visící prázdný popup při načtení:**
   - V `apps/items/assets/styles.css` bylo pravidlo `.item-modal { display: flex; }`. Specifičnost CSS třídy přebila vestavěný atribut HTML `hidden` (`[hidden] { display: none; }`), takže i když element `<div id="item-modal" hidden>` obsahoval `hidden`, prohlížeč mu nastavil vypočtený styl `display: flex`. Na stránce tak visel prázdný bílý/šedý obdélník s tlačítkem „Close“.
   - Náprava: `.item-modal[hidden], .modal-backdrop[hidden] { display: none !important; }`. Při startu a zavření musí být modal i backdrop spolehlivě skrytý.
2. **Málo předmětů v katalogu (333 vs. 750+):**
   - V první verzi načítal `scripts/build-items-data.mjs` pouze `data/items.json`, což byly čistě základní suroviny a materiály (rudy, dřevo, kůže, trofeje, cennosti). Chyběly:
     - **Zbraně, štíty a munice (171 položek z `data/weapons.json`):** meče, luky, kuše, sekery, palcáty, hole, dýky, oštěpy, kopí, pěsti, kulaté a věžové štíty, pukléře, šípy, šipky, bomby, vrhací předměty, nástroje (kladivo, motyka, kultivátor, krumpáče, rybářský prut).
     - **Zbroje a pláště (68 položek z `data/armor.json`):** přilby, kyrysy, haleny, drátěné košile, nohavice, pláště.
     - **Jídla a pokrmy (99 položek z `data/food.json` a `apps/provisions`):** vařená jídla, polévky, koláče, guláše, saláty, pečená masa, sušené maso, med, bobule, houby.
     - **Medoviny a lektvary (21 položek z `data/meads.json` a `apps/provisions`):** léčivé, výdržové, odolnosti (oheň, mráz, jed), ječné víno, elixíry Bog Witch.
     - **Komfort a nábytek (76 položek z `data/comfort.json`):** postele, stoly, židle, koberce, trůny, krby, ohniště, lucerny, kádě.
     - **Zboží a cennosti z `data/traders.json`:** mince, drahokamy, opasky, vejce, návnady, lektvary.

### Cílový stav VC-40b
- **Kompletní sjednocený dataset (`scripts/build-items-data.mjs` → `data/items-compendium.json` a `apps/items/data/data.js`):**
  - Obsahuje všech 750+ předmětů Valheimu.
  - Každý předmět má:
    - `id`: unikátní identifikátor (slug)
    - `name`: oficiální anglický název hry
    - `category`: `weapon`, `shield`, `armor`, `tool`, `food`, `mead`, `metal`, `drop`, `trophy`, `building`, `valuable`, `summoning`
    - `biome`: biom výskytu / dosažení (pro `VCProgress`)
    - `tier`: 1–9 odpovídající biomu
    - `image`: vyřešená cesta k existujícímu obrázku (ve Smithy, Bestiary nebo items)
    - `weight`, `stack`, `teleportable` (false pro kovy a dračí vejce)
    - `recipe`: suroviny potřebné k výrobě (s klikacími odkazy na ingredience v kompendiu)
    - `station`: craftovací stanice a její minimální úroveň (Workbench lv. 1, Forge lv. 2, Cauldron lv. 3, Black Forge...)
    - `sources`: kde získat (příšery z Bestiary, těžba, sběr, obchodníci)
    - `usedIn`: v čem se předmět používá jako surovina (zbraně, zbroje, jídla, lektvary, stavby, oltáře)
    - `crossLinks`: přímé prokliky do příslušných specializovaných nástrojů Companionu:
      - Zbraně a zbroje → `/smithy/#...`
      - Jídlo a medoviny → `/provisions/#...`
      - Komfort → `/comfort/`
      - Potvory / trofeje → `/bestiary/#...`
      - Obchodníci → `/traders/#...`
- **UI v `apps/items/`:**
  - Výběr kategorie rozšířen o Zbraně, Zbroje, Jídlo & lektvary, Nástroje atd.
  - Okamžité vyhledávání (např. „iron sword“, „root harnesk“, „sausages“, „frost arrow“, „hammer“ ihned najde daný předmět).
  - V modalu kompletní rozpis: Recept (potřebné suroviny), Kde vyrobit (stanice), Vlastnosti (Armor, Damage, HP/Stam/Eitr u jídla, Durability), Kde získat, V čem se používá, a tlačítko „Open in Smithy / Provisions / Bestiary / Trader Ledger“.
  - Přidání do nákupního košíku (`VCShopping`).
- **Lokalizace a CSP:**
  - 13 jazyků v `apps/items/locales/messages.json` i `messages.js` (0 chybějících klíčů, pluralizace `tn`).
  - Striktní CSP bez inline skriptů a stylů.
  - Mobilní layout 360 px bez vodorovného přesahu ve všech 13 jazycích.
