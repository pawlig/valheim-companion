🚨 PRACUJEŠ VÝHRADNĚ VE STROMU {{STROM}} (větev {{VETEV}}).
⛔ /Users/paveldvorak/gameroot/valheim-units (bez přípony) NIKDY — ani čtení, ani zápis, ani příkaz s touhle cestou. ⛔ /Users/paveldvorak/gameroot/marchbound taky ne.
Všechny cesty níž jsou relativní k {{STROM}}.
Commituj jen do své větve {{VETEV}}, po krocích, soubory výčtem (⛔ `git add -A`). ⛔ push, merge, rebase. Každý příkaz pouštěj zvlášť a synchronně. Kód a commity ANGLICKY.
⚠️ Zásady Pavla: názvy z hry zůstávají anglicky, UI je ve 13 jazycích (0 chybějících překladů), bez spoilerů (zamykání podle `VCProgress`). Texty s číslem jdou přes `tn`.
⛔ Nevěř číslům v `docs/STAV.md` ani v commitech VC-40c–f — zdroj pravdy je wiki cache v `data/raw/`.
Úkol VC-42h: **Úklid generátorů a dat po auditu** — datová část balíku **O-9** z auditu `docs/audit/AUDIT-VC-39-40.md` (A-13) + drobnosti z přejímek. UI (Smithy, Provisions, Expedition) přijde v dalším úkolu, tady jen generátory a data.

PŘEČTI NEJDŘÍV (rozpočet čtení): audit A-13 a oddíl **O-9** (ř. 112–114); `scripts/build-items-data.mjs` ř. 1–30, 60–115, 200–230 a 1440–1525 (+ místa, kde se čte `wikiPages`: `grep -n wikiPages`); `scripts/build-traders-data.mjs` ř. 90–140 a 200–210; `scripts/wiki/api.mjs` ř. 1–70 (jak funguje cache) a 140–180; `scripts/build-armourer-data.mjs` ř. 1–90; `scripts/build-provisions-data.mjs` (jen kde skládá `items`); `scripts/wiki/fetch-creatures.mjs` ř. 280–310; `scripts/wiki/wikitext.mjs` `parseList` (ř. 318); `docs/DATA-SCHEMA.md` oddíly Smithy, Provisions, items-compendium (jen to, co měníš). ⛔ Nečti celé JSONy, jen `node -e`.

ROZSAH: `scripts/build-items-data.mjs`, `scripts/build-traders-data.mjs`, `scripts/wiki/api.mjs` (jen nová exportovaná funkce), nový `scripts/image-index.mjs`, nový `scripts/wiki/items-pages.json`, `scripts/build-armourer-data.mjs`, `scripts/build-provisions-data.mjs`, `scripts/wiki/fetch-creatures.mjs`, vygenerovaná data (`data/*.json`, `apps/*/data/data.js`), `apps/smithy/img/items/roots.png` (smazat), `docs/DATA-SCHEMA.md` (nová pole), testy v `scripts/*.test.mjs`.
⛔ Nesahej na `apps/*/assets/` (UI je další úkol), `scripts/wiki/wikitext.mjs` (sdílený parser, A-16), `docs/STAV.md`.

POSTUP (rozhodnutý):
1. **Cache stránek podle titulu.** Funkci `readCachedPages(titles)` z `build-traders-data.mjs` (ř. 93–117) přesuň do `scripts/wiki/api.mjs` jako export (`readCachedPages(titles, cacheDir = api.cacheDir)` → `Map<title, wikitext>`, chybějící stránka = výjimka se seznamem). Používají ji oba generátory.
2. **Items: pevný seznam stránek místo skenu `data/raw/`.** Zjisti tituly, které `build-items-data.mjs` z `wikiPages` dnes skutečně používá (stránky, ze kterých vznikne nebo se doplní položka), seřaď je a ulož do `scripts/wiki/items-pages.json` (pole řetězců). Generátor je načte přes `readCachedPages`; sken `readdirSync(data/raw)` (ř. 206–225) zmizí. Do komentáře u načtení napiš, jak seznam rozšířit (doplnit titul a stáhnout stránku přes `api.getWikitext`). **Výstup se nesmí změnit**: `data/items-compendium.json` a `apps/items/data/data.js` po kroku 2 bajtově stejné jako před ním.
3. **Jeden index obrázků.** `buildImageIndex` (traders ř. 121+) a `IMAGE_INDEX` (items ř. 60–96) nahraď jedním `scripts/image-index.mjs` (`buildImageIndex(appsDir, apps, extraDirs)` → Map). Výstupy obou generátorů beze změny.
4. **roots/root** (A-13): `data/items.json` vrať do stavu, který vyrobí `node scripts/wiki/fetch-armor.mjs`; obrázek kořenů vyřeš v `resolveImage`/indexu mapou `roots → root` (soubor `apps/smithy/img/items/root.png` existuje); `apps/smithy/img/items/roots.png` smaž. Smithy i Items musí mít u položky `roots` funkční obrázek.
5. **Obchodníci v datech sekcí.** `build-armourer-data.mjs` a `build-provisions-data.mjs` doplní k položkám, které prodává obchodník, pole `traders: [{ id, name }]` z `data/traders.json` (párování podle id položky; pořadí jako v traders.json; položky bez obchodníka pole nemají). Ověř: `ymir-flesh` a `thunderstone` ve Smithy → haldor; zboží Bog Witch v Provisions → bog-witch. Pole popiš v DATA-SCHEMA.
6. **Ghost a moose-calf.** V `fetch-creatures.mjs` (ne v parseru): drop, který obsahuje víc odkazů oddělených čárkou, rozděl na samostatné položky (Ghost: `["Ectoplasm", "Ghost Trophy"]`), a dropy `None` vynech (moose-calf → `[]`). Pak řetězec `node scripts/wiki/fetch-creatures.mjs && node scripts/build-data.mjs && node scripts/build-traders-data.mjs && node scripts/build-items-data.mjs` (cache, bez sítě) — v compendiu nesmí být `ectoplasm-ghost-trophy`, `ectoplasm` a `ghost-trophy` mají Ghost jako zdroj. Ověř wikitext Ghost a Moose (calf) v `data/raw/` (`grep -l`), že rozdělení odpovídá wiki.
7. **Biom vyráběné položky aspoň jako její suroviny.** V `build-items-data.mjs` po výpočtu biomů (za ř. ~1517, před konečným přepočtem tier): položka s receptem, která nemá biom z `ITEM_EXPLICIT_BIOMES` ani z podmínky obchodníka, dostane biom nejvyšší suroviny receptu, když je vyšší než její dosavadní. Dnes je takových 61 (např. `ashwood-stakewall` meadows ze surovin ashlands, `finewood-stack` meadows z `finewood` black-forest, `smelter`, `forge`). Do zprávy vypiš seznam změněných id se starým → novým biomem po kategoriích; podezřelé případy (materiál s chybným biomem) označ, neopravuj ručně.
8. Testy: `readCachedPages` (chybějící titul hází), roots obrázek, `traders` u ymir-flesh, Ghost dropy, žádná vyráběná položka pod biomem svých surovin (mimo explicitní výjimky).

KROKY (commit po každém bodu nebo dvojici, `[CC/sonnet]`): 1+2, 3, 4, 5, 6, 7, 8 + DATA-SCHEMA.

HOTOVO, KDYŽ (výstupy do zprávy):
- po krocích 2 a 3: `git diff --stat HEAD~1 -- data apps` prázdný (bajtová shoda)
- `node scripts/wiki/fetch-armor.mjs && node scripts/build-armourer-data.mjs && node scripts/build-provisions-data.mjs && node scripts/build-traders-data.mjs && node scripts/build-items-data.mjs && git status --short` → prázdný (2× za sebou)
- `grep -rn "readdirSync" scripts/build-items-data.mjs scripts/build-traders-data.mjs` → jen čtení obrázků přes `image-index.mjs` nebo nic; `ls apps/smithy/img/items/roots.png` → neexistuje
- `node -e`: compendium bez `ectoplasm-ghost-trophy`; moose-calf drops `[]`; Ghost drops 2 položky; smithy `ymir-flesh.traders[0].id === 'haldor'`; 0 vyráběných položek pod biomem surovin
- `npm run build` exit 0 (chybí-li `apps/signs/dist-static`, dočasný symlink na `/Users/paveldvorak/gameroot/valheim-units/apps/signs/dist-static`, po buildu smaž); `node --test 'scripts/**/*.test.mjs' 2>&1 | tail -8` → fail 0
- `git diff --name-only main...HEAD` jen soubory z ROZSAHU

NAKONEC: závěrečná zpráva — commity, výstupy z HOTOVO, seznam změn biomů (krok 7), `⬜ Co zůstalo otevřené`.
