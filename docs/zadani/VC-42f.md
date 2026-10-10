🚨 PRACUJEŠ VÝHRADNĚ VE STROMU {{STROM}} (větev {{VETEV}}).
⛔ /Users/paveldvorak/gameroot/valheim-units (bez přípony) NIKDY — ani čtení, ani zápis, ani příkaz s touhle cestou. ⛔ /Users/paveldvorak/gameroot/marchbound taky ne.
Všechny cesty níž jsou relativní k {{STROM}}.
Commituj jen do své větve {{VETEV}}, po krocích, soubory výčtem (⛔ `git add -A`). ⛔ push, merge, rebase. Každý příkaz pouštěj zvlášť a synchronně. Kód a commity ANGLICKY.
⚠️ Zásady Pavla: názvy z hry zůstávají anglicky, UI je ve 13 jazycích (0 chybějících překladů), bez spoilerů (zamykání podle `VCProgress`). Texty s číslem jdou přes `tn`.
⛔ Nevěř číslům v `docs/STAV.md` ani v commitech VC-40c–f — zdroj pravdy je wiki cache v `data/raw/`.
Úkol VC-42f: **Items Compendium — mobil 360 px a velikost stránky** — balík **O-6** z auditu `docs/audit/AUDIT-VC-39-40.md` (A-6: `check-mobile` 14 stavů `/items/` přetéká 372–475 px přes `div.filter-group`; A-7: 1 0xx karet najednou, na mobilu ~200 000 px na výšku).

PŘEČTI NEJDŘÍV (rozpočet čtení): audit A-6, A-7 a oddíl **O-6** (ř. 99–101); `apps/items/assets/styles.css` ř. 140–200 a media queries (`grep -n "@media" apps/items/assets/styles.css`); `apps/items/assets/app.js` funkce vykreslení seznamu karet (`grep -n "function render\|item-card\|is-locked" apps/items/assets/app.js | head -30`); jak seskupuje po biomech Smithy (`grep -n "<details\|details\b\|summary" apps/smithy/assets/app.js | head -15`); `scripts/check-mobile.mjs` (jen jak se spouští); `scripts/items-compendium-ui.test.mjs` (jen názvy testů).

ROZSAH: `apps/items/assets/styles.css`, `apps/items/assets/app.js` (jen vykreslení seznamu), `apps/items/locales/messages.json` + `.js` (`node scripts/build-i18n.mjs`), `scripts/items-compendium-ui.test.mjs`.
⛔ Nesahej na spoiler logiku (zamčené karty, `isBiomeRevealed`, Reveal, deep link), košík, data, generátory.

POSTUP (rozhodnutý):
1. CSS: pod 480 px `.filter-group` a jeho `select`/`input` `min-width: 0; flex: 1 1 100%; max-width: 100%`; nic v hlavičce nesmí mít pevnou šířku > 360 px.
2. Seznam karet seskup do `<details class="biome-group">` po biomech v pořadí `VC_ITEMS_DATA.biomes` (+ skupina „Other" pro položky bez biomu na konec). `<summary>` = název biomu + počet karet ve skupině. Otevřený je jen biom aktuálního dosahu (nejvyšší odhalený biom); při aktivním hledání nebo vybrané kategorii/biomu jsou otevřené všechny neprázdné skupiny. Prázdné skupiny nevykresluj.
3. V každé skupině nejvýš 60 karet, pod nimi tlačítko „Show {count} more" přes `tn` (13 jazyků, všechny CLDR tvary), které přidá dalších 60.
4. Řazení (podle postupu / A–Z / hmotnosti) platí uvnitř skupin. Zamčené karty zůstávají, jak jsou.
5. Testy: skupiny po biomech v pořadí, max 60 karet + tlačítko, hledání otevře skupiny.

KROKY (commit po každém, `[CC/sonnet]`): (1) CSS, (2)+(3)+(4) seskupení a stránkování + i18n, (5) testy.

HOTOVO, KDYŽ (výstupy do zprávy):
- `npm run build` (chybí-li `apps/signs/dist-static`, dočasný symlink na `/Users/paveldvorak/gameroot/valheim-units/apps/signs/dist-static`, po buildu smaž) + `node scripts/preview.mjs <port>` na pozadí + `node scripts/check-mobile.mjs <port>` → 0 stránek se `scrollWidth > 360`, exit 0
- `prohlizec` (skill `~/.claude/skills/browser-test/SKILL.md`) na `http://localhost:<port>/items/`: `prohlizec set viewport 360 740`, `eval document.documentElement.scrollHeight` bez filtru < 20 000 (čistý profil i se spoilery Off); `prohlizec kontrola` bez vad; `errors --json` → `[]`
- `node --test 'scripts/**/*.test.mjs' 2>&1 | tail -8` → fail 0; preview ukonči
- `git diff --name-only main...HEAD` jen soubory z ROZSAHU

NAKONEC: závěrečná zpráva — commity, výstupy z HOTOVO, `⬜ Co zůstalo otevřené`.
