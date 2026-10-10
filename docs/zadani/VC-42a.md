🚨 PRACUJEŠ VÝHRADNĚ VE STROMU {{STROM}} (větev {{VETEV}}).
⛔ /Users/paveldvorak/gameroot/valheim-units (bez přípony) NIKDY — ani čtení, ani zápis, ani příkaz s touhle cestou. ⛔ /Users/paveldvorak/gameroot/marchbound taky ne.
Všechny cesty níž jsou relativní k {{STROM}}.
Commituj jen do své větve {{VETEV}}, po krocích, soubory výčtem (⛔ `git add -A`). ⛔ push, merge, rebase. Každý příkaz pouštěj zvlášť a synchronně. Kód a commity ANGLICKY.
⚠️ Zásady Pavla: názvy z hry zůstávají anglicky, UI je ve 13 jazycích (0 chybějících překladů), bez spoilerů (zamykání podle `VCProgress`). Texty s číslem jdou přes `tn`.
⛔ Nevěř číslům v `docs/STAV.md` ani v commitech VC-40c–f — zdroj pravdy je wiki cache v `data/raw/`.

Úkol VC-42a: **Trader Ledger z wiki** — balík **O-1** z auditu `docs/audit/AUDIT-VC-39-40.md`.

PROČ: data obchodníků jsou ručně psaný literál bez čtení wiki. Haldor 8 položek (wiki 11), Hildir 11 (wiki 37) a 0 správných cen, Bog Witch má 5 neexistujících položek a všech 14 cen špatně (audit A-1, A-15).

PŘEČTI NEJDŘÍV (rozpočet čtení, nic dalšího): `docs/audit/AUDIT-VC-39-40.md` řádky 1–60 (nálezy A-1, A-8, A-15) a oddíl **O-1** (ř. 68–72), `scripts/build-traders-data.mjs`, `scripts/traders.test.mjs`, `scripts/wiki/api.mjs`, tabulkový parser v `scripts/wiki/wikitext.mjs` (+ `scripts/wiki/wikitext.test.mjs` jako ukázku), `apps/traders/assets/app.js`, `docs/ANALYZA.md` § 28.

ROZSAH a POSTUP: přesně podle oddílu O-1 v auditu (soubory, rozhodnutý postup, `unlockedBy` typy, obrázky, zamykání `creature`).
Upřesnění orchestrátora:
- ⛔ Nesahej na `apps/items/**`, `scripts/build-items-data.mjs`, `data/items-compendium.json`, `shared/**` a ⛔ nespouštěj `scripts/build-items-data.mjs` (souběžně na něm pracuje jiný agent; kompendium se přegeneruje po merge).
- Když po změně `data/traders.json` selže test kompendia (`scripts/items-compendium*.test.mjs`), **neopravuj ho**, jen ho vypiš v závěrečné zprávě (název testu + 1 řádek chyby).
- Wiki stránky čti jen z cache přes `scripts/wiki/api.mjs` (žádná síť mimo něj). Když stránka v cache chybí, napiš to do zprávy a nevymýšlej data.

KROKY (commit po každém):
1. `scripts/build-traders-data.mjs` přepsaný na parsování wiki tabulek + přegenerovaná `data/traders.json` a `apps/traders/data/data.js` — commit `VC-42a: build trader ledger from wiki tables [CC/sonnet]`.
2. `scripts/traders.test.mjs` s hodnotami z wiki (počty 11/37/20 a kontrolní položky z O-1) — commit `VC-42a: trader tests assert wiki values`.
3. UI: množství „x{count}" přes `tn` ve 13 jazycích, zamykání `creature` — `apps/traders/assets/app.js`, `apps/traders/locales/messages.json` + `.js` — commit.
4. `docs/ANALYZA.md` § 28 opravená čísla + věta, že zdrojem je tabulka na wiki stránce obchodníka — commit.

HOTOVO, KDYŽ (všechno přeměřeno, výstupy vlož do závěrečné zprávy):
- `node -e 'const t=JSON.parse(require("fs").readFileSync("data/traders.json"));const g=id=>t.traders.find(x=>x.id==id).items;console.log(g("haldor").length,g("hildir").length,g("bog-witch").length)'` → `11 37 20`
- kontrolní položky z O-1: Hildir `barber-kit` 600, `iron-pit` 75, `fur-cap-grey` chest bronze; Haldor `fishing-bait` quantity 20 price 10, `ymir-flesh` unlockedBy.id `the-elder`; Bog Witch bez `anti-sting-concoction`, `love-potion` quantity 5 price 110, `scythe-handle` 200 unlock `moder`, `crown-of-roots` 3000 (jedním `node -e`, vypiš skutečné hodnoty)
- `node --test scripts/traders.test.mjs scripts/traders-ui.test.mjs scripts/i18n.test.mjs scripts/plural-rendering.test.mjs` → 0 selhání
- `node scripts/build-traders-data.mjs` 2× za sebou → `git status --short` prázdný
- `node scripts/preview.mjs <port>` na pozadí, `node scripts/check-mobile.mjs <port>` → žádný řádek `FAIL` s `/traders/`; preview ukonči
- `git diff --name-only main...HEAD` obsahuje jen soubory z tohoto zadání

NAKONEC: závěrečná zpráva — commity, výstupy všech příkazů z HOTOVO, seznam selhaných testů kompendia (pokud jsou), `⬜ Co zůstalo otevřené`.
