🚨 PRACUJEŠ VÝHRADNĚ VE STROMU {{STROM}} (větev {{VETEV}}).
⛔ /Users/paveldvorak/gameroot/valheim-units (bez přípony) NIKDY — ani čtení, ani zápis, ani příkaz s touhle cestou. ⛔ /Users/paveldvorak/gameroot/marchbound taky ne.
Všechny cesty níž jsou relativní k {{STROM}}.
Commituj jen do své větve {{VETEV}}, po krocích, soubory výčtem (⛔ `git add -A`). ⛔ push, merge, rebase. Každý příkaz pouštěj zvlášť a synchronně. Kód a commity ANGLICKY.
⚠️ Zásady Pavla: názvy z hry zůstávají anglicky, UI je ve 13 jazycích (0 chybějících překladů), bez spoilerů (zamykání podle `VCProgress`). Texty s číslem jdou přes `tn`.
⛔ Nevěř číslům v `docs/STAV.md` ani v commitech VC-40c–f — zdroj pravdy je wiki cache v `data/raw/`.
Úkol VC-42c: **Items Compendium — kategorie, duplicity, odpad, stanice** — balík **O-3** z auditu `docs/audit/AUDIT-VC-39-40.md` (nálezy A-2, A-8, A-9). Navazuje na VC-42a (traders z wiki) a VC-42b (tier = order), obojí je už v `main`.

PŘEČTI NEJDŘÍV (rozpočet čtení): audit nálezy A-2, A-8, A-9, oddíl **O-3** (ř. 79–88) a oddíl „Rozhodnutí Pavla" na konci souboru; `scripts/build-items-data.mjs`; `scripts/items-compendium.test.mjs`; struktura (ne celé soubory — přes `node -e`) `data/weapons.json`, `data/armor.json`, `data/stations.json`, `data/traders.json`; v `apps/items/assets/app.js` jen místa s čipy kategorií (`grep -n "category" apps/items/assets/app.js`); `apps/items/locales/messages.json` jen klíče kategorií.

ROZSAH: `scripts/build-items-data.mjs`, `scripts/items-compendium.test.mjs`, `data/items-compendium.json`, `apps/items/data/data.js`, a kvůli novým čipům `apps/items/assets/app.js` (jen seznam kategorií/čipů) + `apps/items/locales/messages.json` a `.js` (2 nové klíče „Accessories", „Casting" ve 13 jazycích).

POSTUP: body 1–6 oddílu O-3 přesně, jak jsou napsané (Pavel 10. 10. potvrdil: kategorie `accessory` „Accessories" a `casting` „Casting"). Navíc podle rozhodnutí AUD/3:
7. **Hildiřino zboží** (`data/traders.json`, obchodník `hildir`, 38 položek podle wiki (audit chybně uváděl 37)): každá položka, která v kompendiu ještě není, dostane kartu — `category: 'armor'`, `biome: 'meadows'`, `tier` = order Meadows, `crossLinks.traders: ['hildir']`, `sources.traders` se záznamem obchodníka a ceny. Položky, které už v kompendiu jsou, dostanou jen `crossLinks.traders`. Totéž (jen crossLinks/sources) pro zboží Haldora a Bog Witch.
⛔ Nesahej na spoilery, košík, CSS, mobil, Bestiary, nic mimo ROZSAH (souběžně běží VC-42e v `apps/items/assets/app.js` — měň v něm jen seznam kategorií, nic jiného).

KROKY (commit po každém, značka `[CC/sonnet]`): (1) kategorie ze zdrojových sad + accessory/casting, (2) vyloučení odpadu a duplicit + Hildiřino zboží, (3) stanice a lokace, (4) testy + i18n klíče.

HOTOVO, KDYŽ: všechny body „Hotovo, když" z O-3 (výstupy `node -e` vlož do zprávy) a navíc:
- `node -e` → každé id z hildir v `data/traders.json` existuje v kompendiu s `crossLinks.traders` obsahujícím `hildir` (vypiš počet 38/38)
- `node -e` → žádná položka nemá `category` mimo 17 kategorií (vypiš distinct seznam s počty)
- `node --test 'scripts/**/*.test.mjs' 2>&1 | tail -8` → `fail 0`
- `node scripts/build-items-data.mjs` 2× → `git status --short` prázdný
- 10 náhodných položek (`Math.random` se seedem není potřeba, vypiš id) porovnaných s wikitextem v `data/raw/` — recept, stanice, váha; vypiš tabulku shoda/nesoulad.

NAKONEC: závěrečná zpráva — commity, výstupy z HOTOVO, `⬜ Co zůstalo otevřené`.
