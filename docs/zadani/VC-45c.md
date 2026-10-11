🚨 PRACUJEŠ VÝHRADNĚ VE STROMU {{STROM}} (větev {{VETEV}}).
⛔ /Users/paveldvorak/gameroot/valheim-units (bez přípony) NIKDY — ani čtení, ani zápis, ani příkaz s touhle cestou. ⛔ /Users/paveldvorak/gameroot/marchbound taky ne.
Všechny cesty níž jsou relativní k {{STROM}}.
Commituj jen do své větve {{VETEV}}, po krocích, soubory výčtem (⛔ `git add -A`). ⛔ push, merge, rebase. Každý příkaz pouštěj zvlášť a synchronně. Kód a commity ANGLICKY, commity končí `[CC/sonnet]`.
⚠️ Zásady Pavla: názvy z hry zůstávají anglicky, UI je ve 13 jazycích, bez spoilerů. Zdroj pravdy je wiki cache v `data/raw/` (čti přes `scripts/wiki/api.mjs` → `readCachedPages`), ⛔ nevěř číslům v `docs/STAV.md`.

# VC-45c — `availableFrom` u kvalit, biom = dostupnost Q1, suroviny (VC-44 balík O-3)

Zdroj: rozbor `docs/audit/ROZBOR-STATION-LEVELS.md` (přijatý) a rozhodnutí Pavla `docs/ANALYZA.md` § 30. **Udělej balík O-3 z rozboru § 6** (ř. ~297–300) — jeho text je součástí zadání — s těmito upřesněními (mají přednost před rozborem):

## Upřesnění
1. **`scripts/wiki/station-levels.mjs` už existuje** (exporty `parseUpgradeStation`, `parseArmorQualityStations`, `resolveCraftingStation` z VC-45b). ⛔ Nezakládej nový — **přidej** do něj čisté funkce bez I/O podle rozboru § 5.3: `levelBiome(stations, stationId, level)`, `maxLevel(stations, stationId)`, `availableFrom(levels, stationId, materialBiome, stations, biomeOrder)`. Testy do existujícího `scripts/wiki/station-levels.test.mjs` (fixtury z O-3: Carapace Armor Q1–Q4 → mistlands ×3, ashlands; Bronze Sword Q4 → swamp; Nord Sword Q4 → `unreachable: true`).
2. Úrovně stanic a jejich biomy ber **jen** z `data/stations.json` (`levels[].biome`, `maxLevel`, hotové z VC-45a). Biom suroviny z `data/items.json`; chybí-li surovina v `items.json` → fetcher skončí chybou s názvem suroviny (ne tichý `null`).
3. **Q-5 (Pavel):** `biome` a `tier` kusu := `levels[0].availableFrom` / `availableTier` (biom, kde jde Q1 poprvé vyrobit). Platí pro `data/weapons.json` a kusy v `data/armor.json`. U setu v `armor.json` `biome`/`tier` := nejpozdější (max `order`) biom z jeho kusů s receptem. Kusy bez receptu/úrovní (obchod, boss drop, kosmetika) a `station: null` (Bare Fists, Club, Stone Axe…) — `biome` beze změny, `availableFrom` nezapisovat.
4. **Q-9 (Pavel):** jídla v `data/food.json` dostanou `availableFrom` = max(biom surovin, biom úrovně stanice) a `biome` := `availableFrom`. Očekávaný výsledek: 5 jídel z Cauldronu (Boar Jerky, Carrot Soup, Minced Meat Sauce, Onion Soup, Turnip Stew) → `black-forest`.
5. Suroviny podle O-3 (Coal → `meadows` + odstranit zbytečný override v `data/overrides.json` ř. ~46–50; Ymir Flesh → `black-forest` v `scripts/wiki/materials.mjs` ř. ~188–193; doplnit `sharpening-stone`, `mechanical-spring`, `asksvin-trophy` do `data/items.json` přes generátor, ne ručně do JSON).
6. **Q-7 (Pavel):** nový test (např. `scripts/items-biome-parity.test.mjs`): pro každou surovinu použitou v receptu platí `items.json.biome === items-compendium.json biome` — neshoda = test selže.
7. `docs/audit/station-levels/avail.mjs` rozšiř o porovnání s `levels[q].availableFrom` v datech (vypíše „N differences“) a přepočítej — od VC-45b mají Bare Fists/Club/Stone Axe `station` null/Workbench, ať je skript nespadne a výstup je aktuální.
8. **Regenerované výstupy commituj:** po změně dat pusť celý build (`npm run build`) a commitni všechny změněné `apps/*/data/*.js` a `data/*.json`/`data/report-*.md`. (Na VC-45a se přejímka vracela kvůli necommitnutému build výstupu.)
9. Změna `biome` posune kusy v UI do jiných skupin — to je záměr. Testy, které padnou jen kvůli očekávanému biomu kusu, oprav ve fixtuře a v odpovědi u každé takové změny napiš jeden řádek „test: proč“. ⛔ Neměň logiku aplikací v `apps/` (to jsou O-5…O-7).
10. DATA-SCHEMA: doplň pole `availableFrom`, `availableTier`, `unreachable` (weapons/armor levels i kus), `availableFrom` u food a pravidlo Q-5 — jen tyhle doplňky.

## ⛔ Nesahat
`apps/*/assets/**`, `apps/*/locales/**`, `scripts/build-items-data.mjs`, `scripts/build-search-index.mjs`, `apps/hub/**` kromě regenerovaných dat (paralelně běží VC-46 a VC-47), `apps/damage-calculator/src/**` (O-6), `docs/STAV.md`, `data/stations.json` (jen čtení).

## Rozpočet čtení
Rozbor ř. 236–300 (§ 5 a § 6 O-3); `docs/ANALYZA.md` § 30 (ř. ~666–678); `scripts/wiki/station-levels.mjs` + test; `docs/audit/station-levels/avail.mjs`; `scripts/wiki/fetch-weapons.mjs` a `fetch-armor.mjs` jen oblast, kde se skládají `levels` (hledej `stationLevel`); `scripts/wiki/fetch-provisions.mjs` jen část jídel/Cauldronu; `scripts/wiki/materials.mjs` ř. 170–210; `data/overrides.json` ř. 30–60. ⛔ Nečti celé `docs/STAV.md`, `docs/ANALYZA.md` ani rozbor mimo vyjmenované řádky.

## Hotovo, když
Body „Hotovo, když“ z O-3 a navíc:
- `node -e` nad daty: každý kus s `levels` (a stanicí z `stations.json`) má na každé úrovni `availableFrom` a `availableTier`; `biome` kusu = `levels[0].availableFrom` (0 výjimek mimo bod 3); Carapace Armor kusy Q1–Q3 `mistlands`, Q4 `ashlands`; Nord Sword Q4 `unreachable: true`; 5 jídel z Cauldronu `black-forest`.
- `node docs/audit/station-levels/avail.mjs` → `0 differences`; do odpovědi `git diff --stat` a souhrn změn `early-and-unreachable.md` s jednořádkovým odůvodněním každého rozdílu.
- Seznam kusů a jídel, kterým se změnil `biome` (id: před → po), do odpovědi.
- Pipeline z `docs/ORCHESTRACE.md` § Idempotence puštěná 2× (fetchery jedou z cache) → po commitu `git status --short` prázdný.
- `node --test 'scripts/*.test.mjs' 'scripts/**/*.test.mjs'` → fail 0 (výstup `| tail -15`).
- `npm run build` exit 0 (chybí-li `apps/signs/dist-static`, dočasný symlink na `/Users/paveldvorak/gameroot/valheim-units/apps/signs/dist-static`, po buildu smaž — jediná povolená výjimka k hlavnímu repu) a strom čistý.
- Do odpovědi: commity, výstupy kontrol, řádky „test: proč“.
