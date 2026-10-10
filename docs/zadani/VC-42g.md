🚨 PRACUJEŠ VÝHRADNĚ VE STROMU {{STROM}} (větev {{VETEV}}).
⛔ /Users/paveldvorak/gameroot/valheim-units (bez přípony) NIKDY — ani čtení, ani zápis, ani příkaz s touhle cestou. ⛔ /Users/paveldvorak/gameroot/marchbound taky ne.
Všechny cesty níž jsou relativní k {{STROM}}.
Commituj jen do své větve {{VETEV}}, po krocích, soubory výčtem (⛔ `git add -A`). ⛔ push, merge, rebase. Každý příkaz pouštěj zvlášť a synchronně. Kód a commity ANGLICKY.
⚠️ Zásady Pavla: názvy z hry zůstávají anglicky, UI je ve 13 jazycích (0 chybějících překladů), bez spoilerů (zamykání podle `VCProgress`). Texty s číslem jdou přes `tn`.
⛔ Nevěř číslům v `docs/STAV.md` ani v commitech VC-40c–f — zdroj pravdy je wiki cache v `data/raw/`.
Úkol VC-42g: **Bestiary — odkazy do Items Compendia jen na existující položky** — balík **O-7** z auditu `docs/audit/AUDIT-VC-39-40.md` (nález A-10: 10/314 mrtvých odkazů, např. „Eikthyr Power" → prázdné kompendium, tichý fail).

PŘEČTI NEJDŘÍV (rozpočet čtení): audit nález A-10 a oddíl **O-7** (ř. 103–106); `apps/bestiary/assets/app.js` ř. 1330–1370 (drops a trophy — odkazy se tam dělají ad-hoc slugem); `scripts/build-data.mjs` funkce `buildDataBundle` (ř. 39–157); `scripts/wiki/creature-extras.mjs` ř. 15–60; `scripts/bestiary-extras.test.mjs`. Data jen přes `node -e` (⛔ nečti celé JSONy).

ROZSAH (jen tyto soubory): `scripts/build-data.mjs`, `apps/bestiary/assets/app.js` (jen drops/trophy odkazy), `apps/bestiary/data/data.js` (generovaný), `scripts/wiki/creature-extras.mjs`, `data/creatures.json`, `scripts/bestiary-extras.test.mjs`.
⛔ Nesahej na `apps/items/**`, `scripts/build-items-data.mjs`, `data/items-compendium.json`, `shared/**`.

POSTUP (rozhodnutý):
1. `scripts/build-data.mjs`: načti `data/items-compendium.json` a postav mapu `name.toLowerCase() → id` a množinu id. Ke každé bytosti do bundlu přidej `dropLinks: [{ name, itemId }]` (pořadí jako `drops`) a `trophy.itemId`. Rozlišení `itemId`: (a) shoda názvu bez ohledu na velikost písmen; (b) jinak shoda slugu (`toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')`) s id; (c) jinak po odříznutí úvodního čísla a mezery („3 Feathers" → „Feathers") znovu (a)/(b); (d) jinak `null`. Názvy končící „ Power", „None" a prázdné → vždy `null`.
2. `apps/bestiary/assets/app.js`: drops vykresluj z `creature.dropLinks` (fallback na `drops` bez odkazu, když pole chybí); odkaz `<a class="item-link" href="/items/#item=<itemId>">` jen když `itemId`, jinak prostý text `gameName(name)`. Totéž u trofeje přes `trophy.itemId`. Ad-hoc výpočty `cleanSlug`/`trophySlug` smaž.
3. `scripts/wiki/creature-extras.mjs`: název trofeje zbav HTML komentářů a zbytků (`/<!--.*?-->/g`, `/currently no trophy-->?/i`, `-->`), trim; když po vyčištění zůstane prázdný nebo „None", trofej `null`. Přegeneruj `data/creatures.json` stejným příkazem, jakým ho pipeline dělá (zjisti v `package.json` / ORCHESTRACE § 3 bod 3 — `node scripts/wiki/fetch-creatures.mjs` z cache) a pak `node scripts/build-data.mjs`.
4. Test v `scripts/bestiary-extras.test.mjs`: každý `itemId` (drops i trofeje) existuje v `data/items-compendium.json`; žádný drop ani trofej nemá v názvu `-->`; „Eikthyr Power" (pokud je v drops) má `itemId: null`.

KROKY (commit po každém, značka `[GM/flash]`): (1)+(3) data a pipeline, (2) UI, (4) test.

HOTOVO, KDYŽ (výstupy do zprávy):
- `node -e` nad `apps/bestiary/data/data.js` (načti přes `vm`, `globalThis.window=globalThis`) × `data/items-compendium.json` → vypiš `links`, `broken: 0`, `null` počet a seznam názvů s `itemId: null` (ten seznam vlož celý — musí to být jen „Power"/neexistující věci)
- `grep -c "cleanSlug\|trophySlug" apps/bestiary/assets/app.js` → 0
- `grep -c "currently no trophy" data/creatures.json` → 0
- `node --test 'scripts/**/*.test.mjs' 2>&1 | tail -8` → `fail 0` (včetně parity Bestiary ↔ kalkulačka)
- idempotence ORCHESTRACE § 3 bod 3 (celý řetězec 2×) → `git status --short` prázdný
- `git diff --name-only main...HEAD` jen soubory z ROZSAHU
- prohlížeč (skill `~/.claude/skills/browser-test/SKILL.md`, `prohlizec`; statický server nad kořenem stromu, `/apps/bestiary/index.html`, případně `node scripts/preview.mjs` po `npm run build`): `#c=eikthyr` — „Eikthyr Power" není odkaz; klik na odkaz dropu `Deer Hide` u Deer otevře `/items/#item=deer-hide` s kartou; 0 chyb v konzoli; `prohlizec kontrola` bez vad.

NAKONEC: závěrečná zpráva — commity, výstupy z HOTOVO, `⬜ Co zůstalo otevřené`.
