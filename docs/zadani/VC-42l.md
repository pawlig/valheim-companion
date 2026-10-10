🚨 PRACUJEŠ VÝHRADNĚ VE STROMU {{STROM}} (větev {{VETEV}}).
⛔ /Users/paveldvorak/gameroot/valheim-units (bez přípony) NIKDY — ani čtení, ani zápis, ani příkaz s touhle cestou. ⛔ /Users/paveldvorak/gameroot/marchbound taky ne.
Všechny cesty níž jsou relativní k {{STROM}}.
Commituj jen do své větve {{VETEV}}, po krocích, soubory výčtem (⛔ `git add -A`). ⛔ push, merge, rebase. Každý příkaz pouštěj zvlášť a synchronně. Kód a commity ANGLICKY.
⚠️ Zásady Pavla: názvy z hry zůstávají anglicky, UI je ve 13 jazycích (0 chybějících překladů), bez spoilerů (zamykání podle `VCProgress`). Texty s číslem jdou přes `tn`.
⛔ Nevěř číslům v `docs/STAV.md` ani v commitech VC-40c–f — zdroj pravdy je wiki cache v `data/raw/`.


# VC-42l — reprodukovatelný `data/stations.json` (audit AUD/6)

## Proč
`data/stations.json` (23 stanic) skládají čtyři fetchery, každý přidává své:
- `scripts/wiki/fetch-stations.mjs` → smelter, blast-furnace, charcoal-kiln, spinning-wheel (typ smelting/processing)
- `scripts/wiki/fetch-comfort.mjs` → artisan-table, black-forge, forge, stonecutter, workbench
- `scripts/wiki/fetch-expedition.mjs` → galdr-table (`addedBy: "expedition"`)
- `scripts/wiki/fetch-provisions.mjs` → cauldron … smoker (typ `provisions`)

Comfort/expedition/provisions do souboru **slučují**. `fetch-stations.mjs` ho ale **celý přepíše** svými 4 stanicemi (ř. ~175–181 v `fetchStations()`), takže po samotném `node scripts/wiki/fetch-stations.mjs` zmizí 19 stanic (ověřeno orchestrátorem: −653 řádků). Řetězec ve správném pořadí stations → comfort → expedition → provisions dává na main bajtově totožný soubor, `node scripts/build-site.mjs` je na main čistý.

## Co udělat
1. V `scripts/wiki/fetch-stations.mjs` přidej a exportuj čistou funkci
   `mergeStations(existing, fresh)`:
   - `existing` = pole z dosavadního `data/stations.json` (nebo `[]`, když soubor neexistuje / není pole), `fresh` = 4 rozparsované stanice.
   - Záznam z `existing`, jehož `id` je v `fresh`, se nahradí záznamem z `fresh` **na stejné pozici**.
   - Záznamy z `fresh`, které v `existing` nejsou, se vloží na začátek (v pořadí `STATION_PAGES`).
   - Všechny ostatní záznamy zůstanou beze změny a ve stejném pořadí.
2. `fetchStations()` zapisuje `mergeStations(existing, stations)` místo `stations`. `data/report-stations.md` dál jen ze 4 vlastních stanic (beze změny).
3. Test `scripts/wiki/stations-merge.test.mjs` (node:test): (a) nahrazení na místě zachová ostatní a pořadí, (b) prázdný `existing` → jen 4 fresh, (c) chybějící fresh id se vloží na začátek, (d) `mergeStations(main, fresh_z_main)` je hluboce rovné vstupu (vezmi `data/stations.json`, fresh = jeho záznamy s id ze `STATION_PAGES`).
   ⚠️ Import `fetch-stations.mjs` nesmí spustit fetch — soubor už má guard `process.argv[1] === fileURLToPath(import.meta.url)`, zachovej ho.
4. `docs/ORCHESTRACE.md` § Idempotence dat (bod 3, ř. ~60): pod stávající blok přidej druhý blok
   ```sh
   node scripts/wiki/fetch-stations.mjs && node scripts/wiki/fetch-comfort.mjs && node scripts/wiki/fetch-expedition.mjs && node scripts/wiki/fetch-provisions.mjs
   ```
   s jednou větou: „Stanice (`data/stations.json`) skládají tyto čtyři fetchery v tomhle pořadí; každý nahrazuje jen své záznamy."
5. `docs/DATA-SCHEMA.md`: přidej krátký oddíl `## data/stations.json` (5–10 řádků): je to pole, kdo které záznamy zapisuje (tabulka výš), společná pole `id, name, names, wiki, type` a že pořadí je dané pořadím fetcherů.

## ⛔ Nesahat
Ostatní fetchery, `build-*.mjs`, `apps/`, data mimo `data/stations.json` (a ten se po dokončení nesmí lišit od main).

## Rozpočet čtení
`scripts/wiki/fetch-stations.mjs` (195 ř.), `docs/ORCHESTRACE.md` ř. 55–70, `docs/DATA-SCHEMA.md` jen nadpisy (`grep -n '^## '`), ř. 140–150 a 160–170 `fetch-comfort.mjs`/`fetch-provisions.mjs` jen když potřebuješ. Nic dalšího.

## Hotovo, když
- `node --test 'scripts/**/*.test.mjs'` → 0 fail (na main 432 pass, + nové).
- `node scripts/wiki/fetch-stations.mjs` samotný → `git status --short` prázdné (kromě tvých commitnutých změn — pouštěj po commitu).
- `echo '[]' > data/stations.json` a pak řetězec z bodu 4 → `git status --short` prázdné (soubor bajtově jako main).
- Řetězec z bodu 4 puštěný 2× → `git status --short` prázdné.
- Do odpovědi: výstup těch tří kontrol (`git status --short` + počet záznamů `node -e 'console.log(require("./data/stations.json").length)'` = 23) a seznam commitů.
