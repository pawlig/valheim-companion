🚨 PRACUJEŠ VÝHRADNĚ VE STROMU {{STROM}} (větev {{VETEV}}).
⛔ /Users/paveldvorak/gameroot/valheim-units (bez přípony) NIKDY — ani čtení, ani zápis, ani příkaz s touhle cestou. ⛔ /Users/paveldvorak/gameroot/marchbound taky ne.
Všechny cesty níž jsou relativní k {{STROM}}.
Commituj jen do své větve {{VETEV}}, po krocích, soubory výčtem (⛔ `git add -A`). ⛔ push, merge, rebase. Každý příkaz pouštěj zvlášť a synchronně. Kód a commity ANGLICKY.
⚠️ Zásady Pavla: názvy z hry zůstávají anglicky, UI je ve 13 jazycích (0 chybějících překladů), bez spoilerů (zamykání podle `VCProgress`). Texty s číslem jdou přes `tn`.
⛔ Nevěř číslům v `docs/STAV.md` ani v commitech VC-40c–f — zdroj pravdy je wiki cache v `data/raw/`.
Úkol VC-42i: **Dokumentace dat Items Compendia a Trader Ledgeru** — část balíku **O-10** z auditu `docs/audit/AUDIT-VC-39-40.md` (A-14). ⛔ `docs/STAV.md` nesahat (vede ho orchestrátor). Kód ani data neměň.

PŘEČTI NEJDŘÍV (rozpočet čtení): audit oddíl **O-10** a „Rozhodnutí Pavla" (konec souboru); `docs/DATA-SCHEMA.md` (jak jsou popsané ostatní soubory — drž stejný styl); `docs/ANALYZA.md` § 27 a § 28; tvar dat jen přes `node -e` (⛔ nečti celé JSONy): `data/items-compendium.json` (klíče nejvyšší úrovně, `biomes[0]`, 3 vzorové položky různých kategorií vč. jedné od Hildir, distinct `category` s počty, distinct `sources`/`crossLinks` klíče), `data/traders.json` (klíče, 1 obchodník bez `items`, 3 vzorové položky s různým `unlockedBy.type`).

ROZSAH: `docs/DATA-SCHEMA.md`, `docs/ANALYZA.md` (§ 27 a § 28).

POSTUP:
1. `docs/DATA-SCHEMA.md`: nové oddíly `data/items-compendium.json` a `data/traders.json` — všechna pole s typem a významem, 17 kategorií (id → popisek, odkud se bere: zbraně/štíty/munice/nástroje z `data/weapons.json`, zbroj z `data/armor.json`, `accessory`, `casting` atd. podle generátoru `scripts/build-items-data.mjs`), pravidla `biome`/`tier` (tier = order z `data/biomes.json`; zboží obchodníka s podmínkou má biom podmínky), `recipe.station`/`stationId`/`stationLevel`, `unlockedBy` typy (`null`, `boss`, `chest`, `creature`) s příkladem, `quantity` (balení). Generátor a příkaz, kterým se soubor vyrábí.
2. `docs/ANALYZA.md` § 27 (Items): doplň rozhodnutí Pavla 10. 10. (AUD/1 spoilery zamčené, AUD/2 Casting, AUD/3 Hildiřino zboží jako karty, AUD/4 Accessories, AUD/5 hledání vede do Items, AUD/8 Reveal jen `vc.openBiomes`) — stručně, s odkazem na audit. § 28 (Traders): ověř, že čísla odpovídají `data/traders.json` (Haldor 11, Hildir 38, Bog Witch 20) a že je tam věta o zdroji z wiki tabulky; nic jiného neměň.

KROK: jeden commit `docs: data schema for items compendium and trader ledger, Pavel's decisions in ANALYZA [CC/haiku]`.

HOTOVO, KDYŽ: `grep -c "items-compendium.json\|traders.json" docs/DATA-SCHEMA.md` ≥ 2; každé pole, které popisuješ, v datech opravdu existuje (vlož do zprávy `node -e`, který to ověří); `git diff --name-only main...HEAD` jen 2 soubory.

NAKONEC: krátká zpráva — commit, výstup kontrol, `⬜ Co zůstalo otevřené`.
