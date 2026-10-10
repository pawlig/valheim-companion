🚨 PRACUJEŠ VÝHRADNĚ VE STROMU {{STROM}} (větev {{VETEV}}).
⛔ /Users/paveldvorak/gameroot/valheim-units (bez přípony) NIKDY — ani čtení, ani zápis, ani příkaz s touhle cestou. ⛔ /Users/paveldvorak/gameroot/marchbound taky ne.
Všechny cesty níž jsou relativní k {{STROM}}.
Commituj jen do své větve {{VETEV}}, po krocích, soubory výčtem (⛔ `git add -A`). ⛔ push, merge, rebase. Každý příkaz pouštěj zvlášť a synchronně. Kód a commity ANGLICKY.
⚠️ Zásady Pavla: názvy z hry zůstávají anglicky, UI je ve 13 jazycích (0 chybějících překladů), bez spoilerů (zamykání podle `VCProgress`). Texty s číslem jdou přes `tn`.
⛔ Nevěř číslům v `docs/STAV.md` ani v commitech VC-40c–f — zdroj pravdy je wiki cache v `data/raw/`.
Úkol VC-42d: **Sdílený košík `va.cart` — suroviny a zboží z Items a Traders** — balík **O-4** z auditu `docs/audit/AUDIT-VC-39-40.md` (nález A-5: položky přidané z Items/Traders se ve Smithy vykreslí jako výbava s Q1–Q4 a surovým id).

PŘEČTI NEJDŘÍV (rozpočet čtení): audit nález A-5 a oddíl **O-4** (ř. 90–93); `shared/shopping/core.js` (89 ř.); `apps/items/assets/app.js` ř. 165–195 a místo volání `addToCart` (~558); `apps/traders/assets/app.js` ř. 50–90, ~340–355, ~505–515; `apps/smithy/assets/app.js` ř. 100–125, 300–460 (`calculateCartMaterials`), 1570–1700 (render košíku); `scripts/shopping.test.mjs`.

ROZSAH: `shared/shopping/core.js`, `apps/smithy/assets/app.js` (jen košík), `apps/items/assets/app.js` (jen košík / tlačítko), `apps/traders/assets/app.js` (jen košík), locales těch tří aplikací (nové klíče ve 13 jazycích), `scripts/shopping.test.mjs`, `scripts/items-compendium-ui.test.mjs`, `scripts/traders-ui.test.mjs`.
⛔ Provisions a Comfort nesahat (mají vlastní seznamy). ⛔ Data a generátory nesahat.

POSTUP (rozhodnutý):
1. `shared/shopping/core.js`: přidej `VCShopping.cart = { read(), write(lines), addMaterial(id, amount), hasMaterial(id) }`. Záznam suroviny: `{ id: 'mat_' + id + '_' + rnd, materialId: id, amount, setId: null, pieceId: null }`; `addMaterial` na existující řádek se stejným `materialId` jen přičte `amount`. `read` vrací vždy pole (poškozený JSON → `[]`). `sumMaterials` musí řádek s `materialId` započítat jako `amount` kusů té suroviny a řádek bez `pieceId` nesmí shodit výpočet.
2. **Items** (`apps/items/assets/app.js`): lokální `addToCart` smaž.
   - Položka, která má `crossLinks.smithy` a kategorii `weapon`, `shield`, `ammo`, `tool`, `armor` nebo `accessory`: místo „Add to shopping cart" ukaž odkaz „Plan in Smithy" na `crossLinks.smithy`. Kvalitu a sety řeší Smithy.
   - Ostatní: `VCShopping.cart.addMaterial(item.id, count)`.
3. **Traders** (`apps/traders/assets/app.js`): lokální `getCart`/`isInCart`/`addToCart` smaž a volej `VCShopping.cart`. Zboží se kupuje po baleních, takže `addMaterial(item.id, item.quantity || 1)`. Love Potion ×5 tedy přidá 5 kusů.
4. **Smithy** (`apps/smithy/assets/app.js`): řádek s `materialId` vykresli v nákupním seznamu jako „N× <název>" (název z `data.items[materialId]`, jinak z `VC_ITEMS_DATA`, pokud je načtené, jinak id). Bez selectů Mám/Chci, s ✕ pro smazání. Řádek se započítá do „Total Materials" i rozpadu. Pro skupinu takových řádků použij nadpis „Materials & goods" (přes `t()`).
5. Ověř, že `shared/shopping/core.js` je na stránkách Items a Traders načtený (`index.html`). Když není, přidej `<script>` stejně jako ve Smithy a `index.html` přidej do ROZSAHU.
6. Testy: `scripts/shopping.test.mjs` +3 (addMaterial sčítá; sumMaterials započte `materialId` řádek; řádek bez `pieceId` nepadá). UI testy Items a Traders načtou `shared/shopping/core.js` a ověří zápis `materialId`.

KROKY (commit po každém, značka `[CC/sonnet]`): (1) core + test, (2)+(3)+(5) Items a Traders, (4) Smithy, (6) UI testy.

HOTOVO, KDYŽ (výstupy do zprávy):
- `grep -c "localStorage.getItem('va.cart')" apps/items/assets/app.js apps/traders/assets/app.js` → `0` `0`
- `node --test 'scripts/**/*.test.mjs' 2>&1 | tail -8` → fail 0
- prohlížeč (skill `~/.claude/skills/browser-test/SKILL.md`, `prohlizec`; statický server nad kořenem stromu, stránky `/apps/items/index.html`, `/apps/traders/index.html`, `/apps/smithy/index.html`; čistý profil, přepínač spoilerů Off nebo `VCProgress.visit`):
  - `/apps/items/index.html#item=iron`, klik „Add to shopping cart" → `localStorage['va.cart']` obsahuje `"materialId":"iron"`
  - `#item=iron-sword` ukazuje „Plan in Smithy" s odkazem na `/smithy/#item=iron-sword`
  - Traders, Bog Witch, Love Potion „add" → `amount: 5`
  - Smithy vykreslí „1× Iron" a „5× Love Potion" bez selectů, Total Materials obsahuje Iron, ✕ řádek smaže, `prohlizec errors --json` → `[]`
  - `prohlizec kontrola` na Smithy s plným košíkem bez vad (mobil 360 px)
- `git diff --name-only main...HEAD` jen soubory z ROZSAHU

NAKONEC: závěrečná zpráva — commity, výstupy z HOTOVO, `⬜ Co zůstalo otevřené`.
