🚨 PRACUJEŠ VÝHRADNĚ VE STROMU {{STROM}} (větev {{VETEV}}).
⛔ /Users/paveldvorak/gameroot/valheim-units (bez přípony) NIKDY — ani čtení, ani zápis, ani příkaz s touhle cestou. ⛔ /Users/paveldvorak/gameroot/marchbound taky ne.
Všechny cesty níž jsou relativní k {{STROM}}.
Commituj jen do své větve {{VETEV}}, po krocích, soubory výčtem (⛔ `git add -A`). ⛔ push, merge, rebase. Každý příkaz pouštěj zvlášť a synchronně. Kód a commity ANGLICKY.
⚠️ Zásady Pavla: názvy z hry zůstávají anglicky, UI je ve 13 jazycích (0 chybějících překladů), bez spoilerů (zamykání podle `VCProgress`). Texty s číslem jdou přes `tn`.
⛔ Nevěř číslům v `docs/STAV.md` ani v commitech VC-40c–f — zdroj pravdy je wiki cache v `data/raw/`.

# VC-45b — opravy úrovní stanic u kvalit zbraní a zbrojí (VC-44 balík O-2)

Zdroj: rozbor `docs/audit/ROZBOR-STATION-LEVELS.md` (přijatý, ověřený proti wiki cache) a rozhodnutí Pavla `docs/ANALYZA.md` § 30. **Udělej přesně balík O-2 z rozboru § 6** — jeho text je součástí tohoto zadání. Kde data úrovně mají a kde jsou chybně: rozbor § 3.1, § 3.4; seznam dotčených kusů je v `docs/audit/station-levels/early-and-unreachable.md`.

## Upřesnění k O-2 (rozhodnutí Pavla Q-6)
- 27 kusů Deep North: `station` = **Black Forge** nebo **Galdr Table** podle `{{Upgrade station row|…}}` ve wiki, úrovně podle wiki (Black Forge 4–7, Galdr 3–6); nové pole `finishedAt: "Frost Foundry"`. Nikde `station: "Frost Foundry"`.
- Úrovně kvalit podle kusu (tabber „Quality N“ se závorkami „(head)“, „(chest/legs)“, „(cape)“, „(cast)“): Flametal 3/4/5/6, Drake Helmet 1/2/3/4, Caller Set Q1 = 3 (Galdr), Linen Cape 1/2/3/4. Padded Cuirass/Greaves `2/2/3/4` je věrné wiki — nech a zapiš do reportu.
- Normalizace názvu stanice („Black forge“ → „Black Forge“), `station` jen hodnoty, které existují v `data/stations.json` (`name`), nebo `null`.
- Pole `finishedAt` popiš v `docs/DATA-SCHEMA.md` (§ weapons a armor) — jen tenhle doplněk, zbytek dokumentu nech.
- ⛔ Nesahat: `fetch-stations.mjs`, `fetch-comfort.mjs`, `fetch-expedition.mjs`, `fetch-provisions.mjs`, `data/stations.json` (paralelně je mění VC-45a), `apps/` kromě regenerovaných dat.

## Rozpočet čtení
Rozbor § 3 a § 6 O-2 (ř. 135–216, 293–296); `scripts/wiki/fetch-armor.mjs` ř. 340–420; `scripts/wiki/fetch-weapons.mjs` ř. 320–380; konkrétní wiki stránky z cache přes `scripts/wiki/api.mjs` (`readCachedPages`) jen pro ověření dotčených kusů.

## Hotovo, když
Body „Hotovo, když“ z O-2 (rozbor ř. ~296) a navíc:
- Pipeline z `docs/ORCHESTRACE.md` § Idempotence (první blok: creatures, weapons, recommend, build-data, armor, build-armourer-data) puštěná 2× → `git status --short` prázdný po commitu.
- `node --test 'scripts/**/*.test.mjs'` → fail 0; nový test na Drake Helmet (1/2/3/4), Flametal (3/4/5/6), Nord Sword (Black Forge, start 4, `finishedAt`), Caller Q1 = 3.
- `npm run build` exit 0 (chybí-li `apps/signs/dist-static`, dočasný symlink na `/Users/paveldvorak/gameroot/valheim-units/apps/signs/dist-static`, po buildu smaž) a strom čistý.
- Do odpovědi: commity, seznam změněných kusů (id: před → po), výstupy kontrol.
