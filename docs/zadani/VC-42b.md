🚨 PRACUJEŠ VÝHRADNĚ VE STROMU {{STROM}} (větev {{VETEV}}).
⛔ /Users/paveldvorak/gameroot/valheim-units (bez přípony) NIKDY — ani čtení, ani zápis, ani příkaz s touhle cestou. ⛔ /Users/paveldvorak/gameroot/marchbound taky ne.
Všechny cesty níž jsou relativní k {{STROM}}.
Commituj jen do své větve {{VETEV}}, po krocích, soubory výčtem (⛔ `git add -A`). ⛔ push, merge, rebase. Každý příkaz pouštěj zvlášť a synchronně. Kód a commity ANGLICKY.
⚠️ Zásady Pavla: názvy z hry zůstávají anglicky, UI je ve 13 jazycích (0 chybějících překladů), bez spoilerů (zamykání podle `VCProgress`). Texty s číslem jdou přes `tn`.
⛔ Nevěř číslům v `docs/STAV.md` ani v commitech VC-40c–f — zdroj pravdy je wiki cache v `data/raw/`.

Úkol VC-42b: **Items Compendium — jediný zdroj pořadí biomů a tier** — balík **O-2** z auditu `docs/audit/AUDIT-VC-39-40.md`.

PROČ: 241 z 1 087 položek kompendia má `tier` jiný než `order` biomu, protože generátor i UI mají vlastní tabulku biomů bez Oceánu (audit A-3). Pořadí biomů je v celém Companionu jedno (`data/biomes.json`, ANALYZA § 14, `tier = order`).

PŘEČTI NEJDŘÍV (rozpočet čtení, nic dalšího): `docs/audit/AUDIT-VC-39-40.md` nález A-3 a oddíl **O-2** (ř. 74–77), `data/biomes.json`, `scripts/build-items-data.mjs` ř. 1–160 a místa, kde se nastavuje `tier` (`grep -n "tier" scripts/build-items-data.mjs`), `apps/items/assets/app.js` ř. 1–20 a 720–750 a místa s `BIOMES`/`BIOME_TIER` (`grep -n`), `scripts/items-compendium.test.mjs`, `scripts/items-compendium-ui.test.mjs`.

ROZSAH (jen tyto soubory): `scripts/build-items-data.mjs`, `apps/items/assets/app.js`, `scripts/items-compendium.test.mjs`, `scripts/items-compendium-ui.test.mjs`, přegenerované `data/items-compendium.json` a `apps/items/data/data.js`.

POSTUP (rozhodnutý, žádné varianty):
1. V `scripts/build-items-data.mjs` smaž konstantu `BIOME_TIERS` (ř. ~33–43) a nahraď ji mapou `{[id]: order}` načtenou z `data/biomes.json`. Všude, kde se nastavuje `tier` položky s biomem, použij `order` z této mapy. Do výstupu (`data/items-compendium.json` i `apps/items/data/data.js`) přidej pole `biomes: [{id, name, order}]` ve stejném pořadí jako `data/biomes.json`.
2. V `apps/items/assets/app.js` smaž konstanty `BIOMES` (ř. ~5–15) a `BIOME_TIER` (ř. ~729–739). Seznam biomů ber z `VC_ITEMS_DATA.biomes`, řazení podle postupu podle `item.tier`.
3. Testy: v `scripts/items-compendium.test.mjs` nový test „každá položka s biomem má `tier === order` z `data/biomes.json`" a „`biomes` má 9 položek v pořadí meadows, black-forest, ocean, swamp, mountain, plains, mistlands, ashlands, deep-north". V `scripts/items-compendium-ui.test.mjs` doplň fixturu o `biomes`.
4. ⛔ Nesahej na kategorie, sken wiki, i18n, spoilery, košík, CSS ani nic mimo ROZSAH.

KROKY: (1)+(2) commit `VC-42b: single biome order source for items compendium [GM/flash]`, (3) commit `VC-42b: tier equals biome order tests [GM/flash]`.

HOTOVO, KDYŽ (výstupy vlož do závěrečné zprávy):
- `node -e 'const d=JSON.parse(require("fs").readFileSync("data/items-compendium.json"));const o=Object.fromEntries(JSON.parse(require("fs").readFileSync("data/biomes.json")).map(b=>[b.id,b.order]));console.log(d.items.filter(i=>i.biome&&o[i.biome]!==i.tier).length, d.biomes.map(b=>b.id).join(","))'` → `0 meadows,black-forest,ocean,swamp,mountain,plains,mistlands,ashlands,deep-north`
- `grep -c "deep-north" apps/items/assets/app.js` → `0`
- `node --test 'scripts/**/*.test.mjs' 2>&1 | tail -8` → `fail 0`
- `node scripts/build-items-data.mjs` 2× za sebou → `git status --short` prázdný
- počet položek se nezměnil: `node -e '…d.items.length'` → `1087`
- `git diff --name-only main...HEAD` jen soubory z ROZSAHU (+ `apps/items/data/data.js`, `data/items-compendium.json`)

NAKONEC: závěrečná zpráva — commity, výstupy příkazů z HOTOVO, `⬜ Co zůstalo otevřené`.
