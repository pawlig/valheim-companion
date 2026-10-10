🚨 PRACUJEŠ VÝHRADNĚ VE STROMU {{STROM}} (větev {{VETEV}}).
⛔ /Users/paveldvorak/gameroot/valheim-units (bez přípony) NIKDY — ani čtení, ani zápis, ani příkaz s touhle cestou. ⛔ /Users/paveldvorak/gameroot/marchbound taky ne.
Všechny cesty níž jsou relativní k {{STROM}}.
Commituj jen do své větve {{VETEV}}, po krocích, soubory výčtem (⛔ `git add -A`). ⛔ push, merge, rebase. Každý příkaz pouštěj zvlášť a synchronně. Kód a commity ANGLICKY.
⚠️ Zásady Pavla: názvy z hry zůstávají anglicky, UI je ve 13 jazycích (0 chybějících překladů), bez spoilerů (zamykání podle `VCProgress`). Texty s číslem jdou přes `tn`.
⛔ Nevěř číslům v `docs/STAV.md` ani v commitech VC-40c–f — zdroj pravdy je wiki cache v `data/raw/`.
Úkol VC-42j: **Úklid hacků v UI — odznak obchodníka z dat, summon v Expedition, košík** — UI část balíku **O-9** z auditu `docs/audit/AUDIT-VC-39-40.md` (A-13) + drobnosti z přejímek. Data už jsou hotová (VC-42h): položky ve Smithy (`VA_DATA.items[id]`, `armor[].pieces[]`) a v Provisions (`items`, `food`, `meads`), které prodává obchodník, mají pole `traders: [{ id, name }]` (popis v `docs/DATA-SCHEMA.md`, hledej „traders").

PŘEČTI NEJDŘÍV (rozpočet čtení): audit oddíl **O-9** (ř. 112–114); `docs/DATA-SCHEMA.md` jen odstavce s `traders` (`grep -n traders docs/DATA-SCHEMA.md`); `apps/smithy/assets/app.js` ř. 1130–1150, 1510–1525, 1760–1802, 2180–2200; `apps/provisions/assets/app.js` ř. 300–315; `apps/expedition/assets/app.js` ř. 285–312 a 520–550; `shared/shopping/core.js` ř. 85–125; starý tvar řádků košíku: `git show 9ace185^:apps/traders/assets/app.js | grep -n -A8 "va.cart"` a totéž pro `apps/items/assets/app.js`; testy jen názvy: `grep -n "^test(" scripts/smithy*.test.mjs scripts/shopping*.test.mjs scripts/expedition*.test.mjs`.

ROZSAH: `apps/smithy/assets/app.js`, `apps/provisions/assets/app.js` (jen ř. ~300–315), `apps/expedition/assets/app.js`, `shared/shopping/core.js`, `scripts/*.test.mjs`.
⛔ Nesahej na data, generátory, locales (kromě případného nového klíče — žádný by neměl být potřeba), Items, Traders, Comfort, `docs/`. Souběžně běží VC-42k ve stejném Provisions souboru (ř. 203–209 a 297, 422) — na ty řádky nesahej.

POSTUP (rozhodnutý):
1. **Smithy odznak obchodníka** (ř. 1142 a 1519, `mat.item === 'ymir-flesh' || 'thunderstone'`): nahraď čtením `VA_DATA.items[mat.item]?.traders` — pro každého obchodníka odkaz `badge badge-source` s textem `trader.name` a `href=/traders/#trader=<id>&item=<mat.item>`. Obě místa přes jednu pomocnou funkci `traderBadges(itemId)`.
2. **Smithy `renderMaterialSources`** (ř. 2187, regex `/haldor|hildir|witch/`): zdroj s `kind === 'npc'` vynech, když položka má `traders` (odkazy z bodu 1 se vykreslí místo něj); regex smaž. Funkce dostane id položky, ať může `traders` číst.
3. **Provisions** (ř. 306–312, regex `/witch|haldor|hildir/`): totéž — odkaz na obchodníka z `item.traders` (`/traders/#trader=<id>&item=<item.id>`), zdroj `kind:'npc'` bez `traders` vypiš jako prostý text; regex smaž.
4. **Expedition summon** (ř. 293–307 a 533–543 — dvě kopie rozřezávání přeloženého řetězce podle `indexOf(itemName)`): jedna pomocná funkce `summonLabel(id, count, name)` → `<span>`: text `tn('{count}× {name}', count, { name })` a vedle něj samostatný odkaz `<a class="item-link" href="/items/#item=<id>">` s ikonou/textem `↗` a `aria-label` = název (žádné řezání řetězce). U řádku v balicím seznamu (ř. 533+) zachovej `stopPropagation` na odkazu.
5. **Košík Smithy:** skupina „Materials & goods" (ř. 1788–1795) se vykreslí **až za** samostatnými kusy (ř. 1797–1801), titulek přes `t('Materials & goods')` (klíč v katalogu existuje).
6. **Migrace starých řádků `va.cart`** v `VCShopping.cart.read()`: řádky ve starém tvaru z Items/Traders před VC-42d (zjisti přesný tvar z `git show` výše, např. `{ item, pieceId, quantity }`) převeď na `{ materialId, amount, name? }`; řádky Smithy (kusy zbroje/zbraní) a nové řádky nech beze změny; neplatné zahoď. Po migraci `write()`, aby se převod udělal jen jednou.
7. Testy: Smithy odznak z `traders` (ymir-flesh → Haldor, kosmetický kus Hildir), Provisions zboží Bog Witch → odkaz bog-witch, Expedition summon bez řezání (`summonLabel` pro jazyk, kde je `{name}` před číslem), pořadí skupin v košíku, migrace starého řádku.

KROKY (commit po každém bodu, `[GM/flash]`).

HOTOVO, KDYŽ (výstupy do zprávy):
- `grep -n "ymir-flesh\|thunderstone\|haldor|hildir\|witch|haldor" apps/smithy/assets/app.js apps/provisions/assets/app.js` → 0; `grep -c "indexOf(itemName)" apps/expedition/assets/app.js` → 0
- `npm run build` (chybí-li `apps/signs/dist-static`, dočasný symlink na `/Users/paveldvorak/gameroot/valheim-units/apps/signs/dist-static`, po buildu smaž) + `node scripts/preview.mjs <port 8160+>` na pozadí + `node scripts/check-mobile.mjs <port>` → 0
- `prohlizec` (skill `~/.claude/skills/browser-test/SKILL.md`): Smithy — surovina Ymir Flesh má odznak Haldor; do `localStorage['va.cart']` vlož starý řádek, reload → v košíku „Materials & goods" jako `N× název` za samostatnými kusy; Expedition (boss Bonemass) — summon řádek s odkazem do Items; `prohlizec kontrola` /smithy/ a /expedition/ bez vad; `errors --json` → []
- `node --test 'scripts/**/*.test.mjs' 2>&1 | tail -8` → fail 0; preview a prohlížeč ukonči
- `git diff --name-only main...HEAD` jen soubory z ROZSAHU

NAKONEC: závěrečná zpráva — commity, výstupy z HOTOVO, `⬜ Co zůstalo otevřené`.
