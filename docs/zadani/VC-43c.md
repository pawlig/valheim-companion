🚨 PRACUJEŠ VÝHRADNĚ VE STROMU {{STROM}} (větev {{VETEV}}).
⛔ /Users/paveldvorak/gameroot/valheim-units (bez přípony) NIKDY — ani čtení, ani zápis, ani příkaz s touhle cestou. ⛔ /Users/paveldvorak/gameroot/marchbound taky ne.
Všechny cesty níž jsou relativní k {{STROM}}.
Commituj jen do své větve {{VETEV}}, po krocích, soubory výčtem (⛔ `git add -A`). ⛔ push, merge, rebase. Každý příkaz pouštěj zvlášť a synchronně. Kód a commity ANGLICKY.
⚠️ Zásady Pavla: názvy z hry zůstávají anglicky, UI je ve 13 jazycích (0 chybějících překladů), bez spoilerů (zamykání podle `VCProgress`). Texty s číslem jdou přes `tn`.
⛔ Nevěř číslům v `docs/STAV.md` ani v commitech VC-40c–f — zdroj pravdy je wiki cache v `data/raw/`.

# VC-43c — Smithy: hromadné Have/Want podle kvality kusů; úklid háčků pro testy

Drobnosti ze `docs/STAV.md` § Známé drobnosti (body 5 a 6). Jen Smithy, Expedition a `scripts/ui-hacks.test.mjs`.

## 1. Hromadné „All: Have / Want“ ve skupině setu (bug ověřen orchestrátorem)
`apps/smithy/assets/app.js` ř. ~1744–1800: selecty mají napevno Have None+Q1–Q3 a Want Q1–Q4 a Want se nastaví všem kusům bez ohledu na jejich maximum. Rag Armor (`rag-tunic`, `rag-trousers`) má jen Q1–Q2 → po „Want Q3“ má kus `want: 3` a jeho vlastní select (max Q2) je prázdný.
- `pieceMaxQ(piece)` = kvalita posledního levelu (`piece.levels[piece.levels.length - 1].quality`, jako ř. 1655/1677), bez levelů 1.
- `groupMax` = největší `pieceMaxQ` z kusů skupiny. Bulk Have nabízí None + Q1 … Q(groupMax−1), bulk Want Q1 … Q(groupMax).
- Bulk Want change: každému kusu `want = min(newWant, pieceMaxQ)`, pak `have = min(have, want − 1)` (min 0).
- Bulk Have change: každému kusu `have = min(newHave, pieceMaxQ − 1)`, a když `want <= have`, `want = min(pieceMaxQ, have + 1)`.
- Výchozí hodnota bulk Want, když se kusy liší: `groupMax` (dnes napevno '4'). Opravit i `maxQ = piece?.levels.length || 4` na ř. ~1764 na `pieceMaxQ`.
- Žádný řádek košíku nesmí skončit s `want` > max kusu (ani u starých uložených řádků: při renderu skupiny clampni stejně a ulož).

## 2. Háčky pro testy pryč z produkčního kódu
- `apps/smithy/assets/app.js` ř. 47–59: větev `if (typeof document === 'undefined') return {…mock…}` v `el()` smaž. Test (`scripts/ui-hacks.test.mjs` ř. ~100–135) místo toho dá do vm kontextu minimální `document` s `createElement(tag)` vracejícím stejný mock objekt (tagName, className, textContent, href, setAttribute, appendChild, append, addEventListener).
- `apps/expedition/assets/app.js` ř. 72: `globalThis.summonLabel = summonLabel;` smaž. Test (ř. ~176–200) si funkci zpřístupní sám: ke zdroji, který už ořezává, připojí `\n;globalThis.summonLabel = summonLabel;` před `vm.runInContext`.
- `traderBadges` (Smithy ř. ~61): řetěz `customData || data || globalThis.VA_DATA || window.VA_DATA` nech, jen pokud ho používá produkční kód; jinak zjednoduš na to, co produkce potřebuje, a test předá data přes vm kontext.

## Testy
Do `scripts/ui-hacks.test.mjs` (nebo `scripts/smithy-*.test.mjs`, kde už se testuje košík — `grep -ln "bulk\|groupItems" scripts/*.test.mjs`) přidej: skupina se syntetickými kusy s maximem Q2 a Q4 → bulk Want Q3 → kus Q2 `want 2`, kus Q4 `want 3`; bulk Have Q3 → kus Q2 `have 1, want 2`; nabídka bulk selectů odpovídá `groupMax`; skutečný set Rag Armor → bulk Want nabízí jen Q1–Q2.

## ⛔ Nesahat
Data, generátory, `shared/`, Items, Traders, Provisions, styly.

## Rozpočet čtení
`apps/smithy/assets/app.js` ř. 40–90, 1640–1820; `apps/expedition/assets/app.js` ř. 55–80; `scripts/ui-hacks.test.mjs` celý (331 ř.). Nic dalšího.

## Hotovo, když
- `node --test 'scripts/**/*.test.mjs'` → fail 0.
- `grep -n "typeof document === 'undefined'" apps/smithy/assets/app.js` a `grep -n "globalThis.summonLabel" apps/expedition/assets/app.js` → nic.
- `npm run build` (chybí-li `apps/signs/dist-static`, dočasný symlink na `/Users/paveldvorak/gameroot/valheim-units/apps/signs/dist-static`, po buildu smaž) + `node scripts/preview.mjs <port>` na pozadí; `prohlizec` (skill `~/.claude/skills/browser-test/SKILL.md`): ve Smithy přidej do košíku celý set Rag Armor → bulk Want nabízí jen Q1–Q2, vlastní selecty kusů nejsou prázdné; `/expedition/` summon položky se vykreslí s odkazem ↗; `prohlizec kontrola` /smithy/ a /expedition/ bez vad; `errors --json` → [].
- Preview a prohlížeč ukonči. Do odpovědi: commity, výstupy kontrol.
