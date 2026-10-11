🚨 PRACUJEŠ VÝHRADNĚ VE STROMU {{STROM}} (větev {{VETEV}}).
⛔ /Users/paveldvorak/gameroot/valheim-units (bez přípony) NIKDY — ani čtení, ani zápis, ani příkaz s touhle cestou. ⛔ /Users/paveldvorak/gameroot/marchbound taky ne.
Všechny cesty níž jsou relativní k {{STROM}}.
Commituj jen do své větve {{VETEV}}, po krocích, soubory výčtem (⛔ `git add -A`). ⛔ push, merge, rebase. Každý příkaz pouštěj zvlášť a synchronně. Kód a commity ANGLICKY.
⚠️ Zásady Pavla: názvy z hry zůstávají anglicky, UI je ve 13 jazycích (0 chybějících překladů), bez spoilerů (zamykání podle `VCProgress`). Texty s číslem jdou přes `tn`.
⛔ Nevěř číslům v `docs/STAV.md` ani v commitech VC-40c–f — zdroj pravdy je wiki cache v `data/raw/`.

# VC-45a — úrovně stanic a jejich biom v `data/stations.json` (VC-44 balík O-1)

Zdroj: rozbor `docs/audit/ROZBOR-STATION-LEVELS.md` (přijatý, ověřený proti wiki cache) a rozhodnutí Pavla `docs/ANALYZA.md` § 30. **Udělej přesně balík O-1 z rozboru § 6** — jeho text je součástí tohoto zadání. Data stanic a biomy úrovní jsou v rozboru § 1 a § 2 (tabulka stanice × biom), cílový tvar dat § 5.1, kdo co počítá § 5.3.

## Upřesnění k O-1
- Stanice, které dnes zakládá `fetch-comfort.mjs` (artisan-table, black-forge, forge, stonecutter, workbench) a `fetch-expedition.mjs` (galdr-table), přebírá `fetch-stations.mjs` (typ `crafting`); comfort/expedition je přestanou zakládat, ale dál je smí číst. Cauldron zůstává ve `fetch-provisions.mjs`, jen jeho `levels[]` dostanou `biome`.
- `mergeStations` (VC-42l) zachovej — `fetch-stations.mjs` nahrazuje jen své záznamy; pořadí fetcherů v `docs/ORCHESTRACE.md` (stations → comfort → expedition → provisions) platí dál.
- Pole podle rozboru § 5.1 (`maxLevel`, `levels[]` s `level`, `upgrade`, `biome`, `materials`…). Jména polí, která zvolíš, zapiš do `docs/DATA-SCHEMA.md` § `data/stations.json` — další balíky (O-3, O-4) na ně navazují.
- Parser rozšíření (`scripts/wiki/station-upgrades.mjs`) čte jen wiki cache přes `scripts/wiki/api.mjs`; test `scripts/wiki/station-upgrades.test.mjs` na wikitextu Black Forge z cache.
- ⛔ Nesahat: `fetch-weapons.mjs`, `fetch-armor.mjs`, `data/weapons.json`, `data/armor.json` (paralelně je mění VC-45b), `apps/`.

## Rozpočet čtení
Rozbor § 1, § 2, § 5, § 6 O-1 (ř. 14–135, 236–292); `scripts/wiki/fetch-stations.mjs`; v `fetch-comfort.mjs`, `fetch-expedition.mjs`, `fetch-provisions.mjs` jen místa se `stations` (`grep -n stations`); `scripts/wiki/materials.mjs` jen `createMaterialResolver`; `docs/DATA-SCHEMA.md` § `data/stations.json`.

## Hotovo, když
Body „Hotovo, když“ z O-1 (rozbor ř. ~292) a navíc:
- `node --test 'scripts/**/*.test.mjs'` → fail 0.
- `echo '[]' > data/stations.json` + řetězec fetcherů z ORCHESTRACE → `data/stations.json` stejný jako po prvním běhu; druhý běh → `git status --short` prázdný.
- `npm run build` exit 0 (chybí-li `apps/signs/dist-static`, dočasný symlink na `/Users/paveldvorak/gameroot/valheim-units/apps/signs/dist-static`, po buildu smaž) a strom čistý.
- Do odpovědi: commity, výpis `node -e` s tabulkou max úrovní po biomech pro 6 stanic, počet záznamů rozšíření, výstupy kontrol.
