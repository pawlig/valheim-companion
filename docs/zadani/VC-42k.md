🚨 PRACUJEŠ VÝHRADNĚ VE STROMU {{STROM}} (větev {{VETEV}}).
⛔ /Users/paveldvorak/gameroot/valheim-units (bez přípony) NIKDY — ani čtení, ani zápis, ani příkaz s touhle cestou. ⛔ /Users/paveldvorak/gameroot/marchbound taky ne.
Všechny cesty níž jsou relativní k {{STROM}}.
Commituj jen do své větve {{VETEV}}, po krocích, soubory výčtem (⛔ `git add -A`). ⛔ push, merge, rebase. Každý příkaz pouštěj zvlášť a synchronně. Kód a commity ANGLICKY.
⚠️ Zásady Pavla: názvy z hry zůstávají anglicky, UI je ve 13 jazycích (0 chybějících překladů), bez spoilerů (zamykání podle `VCProgress`). Texty s číslem jdou přes `tn`.
⛔ Nevěř číslům v `docs/STAV.md` ani v commitech VC-40c–f — zdroj pravdy je wiki cache v `data/raw/`.
Úkol VC-42k: **i18n dočištění, Reveal jen přes `vc.openBiomes`, spoilery v „Used in"** — balík **O-8** z auditu `docs/audit/AUDIT-VC-39-40.md` (A-11) + rozhodnutí Pavla **AUD/8** (konec auditu, bod 8) + drobnosti z přejímek.

PŘEČTI NEJDŘÍV (rozpočet čtení): audit řádek A-11 (ř. 33), oddíl **O-8** (ř. 108–110), bod 8 v „Rozhodnutí Pavla" (ř. 141); `shared/progress/core.js` (celý, 140 ř.); `apps/smithy/assets/app.js` ř. 640–665 (vzor Reveal) a ř. 2240–2252 (vzor „{count} more in locked biomes"); `apps/items/assets/app.js` ř. 140–180, 255–300, 440–505, 775–830 a funkce filtru (`grep -n "function matches\|filter(" apps/items/assets/app.js`); `apps/traders/assets/app.js` ř. 90–115 a 270–285; `apps/provisions/assets/app.js` ř. 195–215, 290–300, 418–425; `apps/comfort/assets/app.js` ř. 138–155; `apps/expedition/assets/app.js` ř. 185–192; `scripts/i18n.test.mjs` (jen strukturu); jak se překládá atribut v HTML (`grep -n "data-i18n-attr" apps/smithy/index.html | head -3`).

ROZSAH: `shared/progress/core.js`, `apps/{items,traders,provisions,comfort,expedition}/assets/app.js`, `apps/items/index.html`, `apps/{items,traders,provisions,comfort,expedition}/locales/messages.json` + `.js` (`node scripts/build-i18n.mjs`), `scripts/generate-items-locales.mjs` (smazat), `scripts/*.test.mjs`.
⛔ Nesahej na seskupení/stránkování karet v Items (VC-42f), Smithy, data, generátory, `docs/`.

POSTUP (rozhodnutý):
1. **AUD/8 — Reveal jen `vc.openBiomes`.** Do `shared/progress/core.js` přidej `openBiome(id)`: přidá id do `vc.openBiomes` (bez duplicit, jen platné id), uloží, `notify()`; exportuj ve `VCProgress`. Všechna tlačítka Reveal v Items (`revealBiome`, ř. 170), Comfort (ř. 140, 152), Provisions (ř. 297, 422) a Expedition (ř. 190) volají `VCProgress.openBiome` místo `VCProgress.visit(…, true)`. `vc.progress` po Reveal beze změny. Test pro každou sekci: po kliknutí na Reveal je biom v `vc.openBiomes`, `vc.progress` se nezměnil, obsah se odkryl.
2. **Items i18n (A-11):** doplň chybějící překlady (cs 4, de 5, es 4, pt 4, id 6, fr 1 — seznam podle kontrolního `node -e` níže), přidej klíč `Filter by biome` (aria-label `index.html:108`), placeholder a aria-label hledání `Search items...` přelož (`data-i18n-attr` jako ve Smithy), smaž nepoužité klíče (32). Odznak biomu na 4 místech `item.biome.replace('-', ' ')` (ř. 263, 298, 785, 828) nahraď přeloženým názvem biomu (`t(biome.name)` z `VC_ITEMS_DATA.biomes`; klíče biomů v katalogu musí být).
3. **Traders i18n:** smaž 8 nepoužitých klíčů. Text podmínky (`app.js:279`, dnes anglické `unlockedBy.text`) skládej z typu přes `t`: boss `Requires defeating {boss}`, chest `Requires returning Hildir's {chest} chest ({boss})` (`{chest}` přeložené `silver`/`bronze`/`brass`), creature `Requires killing {creature}`; jména bossů/tvorů jako vlastní jména nepřekládej. 13 jazyků.
4. **Provisions:** větev „Sold by" (`app.js` ř. 203–209) smaž (love-potion odkazuje na obchodníka přes `sources`). Ověř, že love-potion v Provisions dál ukazuje odkaz na Bog Witch.
5. **„Used in" v modalu Items:** položky ze zamčených biomů (`itemsById.get(entry.itemId || entry.id)` a `!isItemRevealed`) nevypisuj a pod skupinou ukaž `tn('{count} more in locked biomes', …)` jako Smithy; počet ve štítku skupiny jen z odkrytých.
6. **Jeden predikát filtru v Items:** čipy kategorií (počty) i seznam karet používají jednu funkci `matchesFilters(item, { ignoreCategory })`; počty na čipech = počet karet po výběru čipu.
7. Smaž `scripts/generate-items-locales.mjs`. Do `scripts/i18n.test.mjs` test: žádný klíč items/traders nemá v jiném jazyce hodnotu rovnou angličtině mimo whitelist („← Valheim Companion", „Items Compendium", „Trader Ledger", „Wiki", „Wiki ↗", „Portal", „Material", „Metal" + čistá čísla/emoji). Test v `items-compendium-ui.test.mjs`: přepínač spoilerů Off nezapíše `vc.progress`.

Kontrolní `node -e` (identical-to-en): pro každý jazyk ≠ en vypiš klíče, kde `messages[key][lang] === messages[key].en` (u plurálů po tvarech).

KROKY (commit po každém, `[CC/sonnet]`): 1, 2, 3, 4, 5, 6, 7.

HOTOVO, KDYŽ (výstupy do zprávy):
- kontrolní `node -e` → identical-to-en jen whitelist (items, traders); `ls scripts/generate-items-locales.mjs` → neexistuje; `grep -n "visit(.*true)" apps/{items,comfort,provisions,expedition}/assets/app.js` → 0; `grep -n "biome.replace" apps/items/assets/app.js` → 0; `grep -n "Sold by" apps/provisions/assets/app.js` → 0
- `npm run build` (chybí-li `apps/signs/dist-static`, dočasný symlink na `/Users/paveldvorak/gameroot/valheim-units/apps/signs/dist-static`, po buildu smaž) + `node scripts/preview.mjs <port>` na pozadí + `node scripts/check-mobile.mjs <port>` → 0
- `prohlizec` (skill `~/.claude/skills/browser-test/SKILL.md`): čistý profil, v Items, Comfort, Provisions a Expedition klikni na Reveal → `eval localStorage.getItem('vc.progress')` před i po stejné, `vc.openBiomes` obsahuje biom; Items v `?lang=cs` (nebo přepínač jazyka): placeholder hledání česky, odznaky biomů česky; Traders v cs: podmínky česky; `prohlizec kontrola` /items/ a /traders/ bez vad; `errors --json` → []
- `node --test 'scripts/**/*.test.mjs' 2>&1 | tail -8` → fail 0; preview a prohlížeč ukonči
- `git diff --name-only main...HEAD` jen soubory z ROZSAHU

NAKONEC: závěrečná zpráva — commity, výstupy z HOTOVO, `⬜ Co zůstalo otevřené`.
