🚨 PRACUJEŠ VÝHRADNĚ VE STROMU {{STROM}} (větev {{VETEV}}).
⛔ /Users/paveldvorak/gameroot/valheim-units (bez přípony) NIKDY — ani čtení, ani zápis, ani příkaz s touhle cestou. ⛔ /Users/paveldvorak/gameroot/marchbound taky ne.
Všechny cesty níž jsou relativní k {{STROM}}.
Commituj jen do své větve {{VETEV}}, po krocích, soubory výčtem (⛔ `git add -A`). ⛔ push, merge, rebase. Každý příkaz pouštěj zvlášť a synchronně. Kód a commity ANGLICKY.
⚠️ Zásady Pavla: názvy z hry zůstávají anglicky, UI je ve 13 jazycích (0 chybějících překladů), bez spoilerů (zamykání podle `VCProgress`). Texty s číslem jdou přes `tn`.
⛔ Nevěř číslům v `docs/STAV.md` ani v commitech VC-40c–f — zdroj pravdy je wiki cache v `data/raw/`.
Úkol VC-42e: **Items Compendium — spoilery zpět na výchozí „zamčeno"** — balík **O-5** z auditu `docs/audit/AUDIT-VC-39-40.md` (nález A-4, část A-11). Pavel 10. 10. (AUD/1): zamčeno podle postupu jako zbytek Companionu, přepínač spoilerů zůstává.

PŘEČTI NEJDŘÍV (rozpočet čtení): audit nález A-4 a oddíl **O-5** (ř. 95–97); `apps/items/assets/app.js` ř. 120–140 a 260–290 a místa s `showAllBiomes` / `isBiomeRevealed` (`grep -n`); `shared/progress/` jen API `VCProgress` (`grep -n "isBiomeRevealed\|visit\|export\|VCProgress\." shared/progress/*.js | head -30`); klíče názvů biomů v `apps/smithy/locales/messages.json`; `scripts/items-compendium-ui.test.mjs`.

ROZSAH (jen tyto soubory): `apps/items/assets/app.js` (jen spoiler logika a banner biomu v modalu), `apps/items/locales/messages.json` + `.js`, `scripts/items-compendium-ui.test.mjs`.
⛔ Souběžně běží VC-42c, která v `app.js` mění seznam kategorií/čipů a generuje data — na ten kód ani na `data/`, `scripts/build-items-data.mjs` nesahej.

POSTUP: přesně oddíl O-5 — výchozí `showAllBiomes = false`; karta i modal používají `isBiomeRevealed(item.biome)`; zamčená karta má třídu `is-locked` a neprozrazuje název ani obrázek (stejně jako Smithy); banner v modalu bere název biomu z dat přes `t()` (názvy biomů převzít z `apps/smithy/locales/messages.json`, 13 jazyků). Přepínač „Spoiler filter: On/Off" zůstává a jen dočasně odemyká (neukládá do `vc.progress`).

KROKY: (1) logika + i18n — commit `VC-42e: items compendium spoilers locked by progress by default [GM/flash]`, (2) test — commit.

HOTOVO, KDYŽ:
- `node --test scripts/items-compendium-ui.test.mjs scripts/i18n.test.mjs scripts/plural-rendering.test.mjs 2>&1 | tail -8` → `fail 0`; nový test: bez progress jsou karty Ashlands `is-locked` a přepínač ukazuje „Spoiler filter: On"
- `grep -n "showAllBiomes = true" apps/items/assets/app.js` → nic
- `node scripts/preview.mjs <port>` na pozadí; skill prohlížeče `~/.claude/skills/browser-test/SKILL.md` (`prohlizec`): s čistým profilem na `/items/` → počet karet, počet `.is-locked` > 0 (= položky mimo Meadows) a text přepínače; po `VCProgress.visit('ashlands')` v `eval` a reloadu je karta z Ashlands odemčená; `prohlizec kontrola http://localhost:<port>/items/ …` bez vad; preview ukonči
- `git diff --name-only main...HEAD` jen soubory z ROZSAHU

NAKONEC: závěrečná zpráva — commity, výstupy z HOTOVO, `⬜ Co zůstalo otevřené`.
