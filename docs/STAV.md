# Stav projektu Valheim Companion

> **Živý dokument.** Orchestrátor ho aktualizuje po každé přejímce, merge nebo změně fronty. Nová session začíná tady.
> Poslední aktualizace: **10. 10. 2026**

> ⚠️ **Audit 10. 10. (Fable):** Items Compendium a Trader Ledger (VC-39 … VC-40f) **nejsou v pořádku** — agy je dělal bez zadání a sám si je přebral. 16 nálezů (3 kritické), opravy po balících O-1 … O-10 jako VC-42a … viz [`docs/audit/AUDIT-VC-39-40.md`](audit/AUDIT-VC-39-40.md). Údaje „✅" u VC-40c … VC-40f níž neplatí. Otázky AUD/1–7 v globálním rozhodovacím archu.

- Web: https://valheim-companion.teuferon.click (EasyPanel, deploy webhookem při každém pushi do repa)
- Repo: https://github.com/pawlig/valheim-companion (public), lokálně `~/gameroot/valheim-units`
- Jak se pouští agenti a přejímá práce: [`docs/ORCHESTRACE.md`](ORCHESTRACE.md)
- Analýza a rozhodnutí: [`docs/ANALYZA.md`](ANALYZA.md) (§ 1–15) · schéma dat: [`docs/DATA-SCHEMA.md`](DATA-SCHEMA.md)
- Návrhy dalších nástrojů: [`docs/NAVRHY-NASTROJU.md`](NAVRHY-NASTROJU.md)

## Sekce na webu

| URL | Sekce | Zdroj | Stav |
|---|---|---|---|
| `/` | Rozcestník | `apps/hub/` (statický) | ✅ OG/Twitter meta, ikony, manifest, Ko-fi v patičce |
| `/bestiary/` | Bestiary | `apps/bestiary/` (vanilla JS) + `scripts/` + `data/` | ✅ 106 jednotek, 9 biomů, panel „Your character“ (skilly, sety, obtížnost, hráči, sneak/stagger, rankBy DPS/hit), DPS a čas do zabití, Armory (153 zbraní) |
| `/smithy/` | Smithy | `apps/smithy/` (vanilla JS) | ✅ 68 setů a kusů, nákupní košík Have/Want, rozpad surovin, zdroje surovin, sekce Cosmetics a DLC & seasonal |
| `/damage-calculator/` | Damage Calculator | `apps/damage-calculator/` (React + Vite, PR #1 od Teuferona) | ✅ zdroj pravdy pro poškození po kvalitách a časování útoků, parita s Bestiary hlídaná testem |
| `/progress/` | Progress Tracker | `apps/progress/` + `shared/progress/` (panel na každé stránce) | ✅ „Saga“: dlaždice biomů, slider dosahu, portréty bossů; sdílený stav `vc.progress` odemyká spoilery ve všech nástrojích |
| `/provisions/` | Provisions | `apps/provisions/` | ✅ jídla, medoviny, feasty, loadout, nákupní seznam |
| `/comfort/` | Comfort Planner | `apps/comfort/` | ✅ comfort a Rested, Best I can build, Next upgrades, nákupní seznam, maxima po biomech sedí s wiki |
| `/expedition/` | Expedition | `apps/expedition/` | ✅ Boss prep (zbraně z Bestiary, obrana, jídlo z Provisions, balicí a nákupní seznam) a Raids (teď / skončené / po dalším bossovi) |
| `/signs/` | Sign Editor (Runopis) | `apps/signs/` (React + Vite, převzato subtree z `valheim-signs`) | ✅ 13 jazyků |
| `/items/` | Items Compendium | `apps/items/` (vanilla JS) | ✅ kompletní katalog 1 087 předmětů v 15 čistých kategoriích, horizontální swipe lišta čipů na mobilu, řazení dle postupu/A–Z/hmotnosti, rychlý filtr portálu, historie modalu (Zpět), recepty, stanice, statistiky, zdroje, usedIn, 13 jazyků |
| `/traders/` | Trader Ledger | `apps/traders/` (vanilla JS) | ✅ Haldor, Hildir & Bog Witch, nabídka zboží, přímé přidávání do nákupního košíku va.cart, sbalitelná kalkulačka pokladů, filtr pouze dostupného zboží, odkazy na bossy v Expedici, 13 jazyků |
| VC-40e | **Items Compendium taxonomie 15 kategorií, rybářské návnady a štítky** | agy | ✅ nasazeno 9. 10. (1 087 předmětů, 0 nezařazených, 15 kategorií, 9 návnad, horizontální category-chips s počty, výchozí přímé zobrazení všech položek s volitelným spoiler filtrem, 13 jazyků, prohlizec kontrola bez vad 0 px přesah) |
| VC-40f | **Items Compendium & Trader Ledger UX overhaul** | agy | ✅ nasazeno 10. 10. (horizontální swipe čipy na mobilu 38px, řazení tier/A-Z/hmotnost, historie modalu Zpět, portálový filtr, oprava va.cart v Trader Ledgeru, sbalitelná kalkulačka a filtr dostupného zboží, 13 jazyků, 101 testů pass, prohlizec bez vad) |
| VC-41 | **Armor Calculator / Damage Taken** (v Damage Calculatoru: redukce poškození zbrojí a odolnostmi hráče proti potvorám a bossům) | GM | 🔄 v přípravě |

Pořadí biomů ve všech nástrojích je jedno (ANALYZA § 14): Meadows, Black Forest, **Ocean**, Swamp, Mountain, Plains, Mistlands, Ashlands, Deep North. Platí `tier = order`.

## Úlohy

Zadání jsou v [`docs/zadani/`](zadani/). Hotové úlohy jsou mergnuté do `main` (`Merge VC-n: …`).

| ID | Co | Agent | Stav |
|---|---|---|---|
| VC-1, 1b | data jednotek a biomů z wiki | zai | ✅ |
| VC-2, 2b | zbraně, materiály, doporučení | agy | ✅ |
| VC-3, 3b | web Bestiary | agy | ✅ |
| VC-4 | rozcestník + přesun Runopisu na `/signs/` | agy | ✅ |
| VC-5, 5b | panel „Your character“, výchozí backstab | agy + zai | ✅ |
| VC-6 | pěstní zbraně (Category:Unarmed), Armory | agy | ✅ |
| VC-7, 7b | data Armouru (brnění, suroviny, zdroje) | agy | ✅ |
| VC-8 | web Armouru | agy | ✅ |
| VC-9 | OG/Twitter meta, náhledy, ikony, manifest | agy | ✅ |
| VC-10 | DPS z vykreslených stránek | — | ⛔ zrušeno, nahrazuje VC-11 |
| VC-11, 11b | jednotná čísla s kalkulačkou, DPS v Bestiary, chop/pickaxe v kalkulačce | agy + zai | ✅ |
| VC-12 | jednotné pořadí biomů | agy | ✅ |
| VC-13 | Ko-fi, odebrán odkaz na GitHub z rozcestníku | agy | ✅ |
| VC-14 | úklid (bomby, Root, brnění po kvalitách, DLC/seasonal, MIME manifestu) | agy | ✅ |
| VC-15 | úklid (koruny bez vylepšení, `neutral` v kalkulačce, collation ve scraperu) | zai + agy | ✅ |
| VC-16 | sdílené jádro i18n (13 jazyků, `vc.language`), rozcestník přeložený, Runopis napojený | agy | ✅ |
| VC-28 | Google Analytics 4 (G-CXQVNCCJKE) s lištou souhlasu, CSP, stránka Privacy | agy | ✅ ověřeno na živém webu (bez souhlasu jen `gcs=G100` bez cookies, po Allow `_ga`) |
| VC-17 | Bestiary + Armourer v 13 jazycích, místní názvy z wiki, UX opravy Armouru | Sol | ✅ |
| VC-18 | Damage Calculator v 13 jazycích (místní názvy odebere VC-29) | Sol | ✅ |
| VC-23 | Armourer: zbraně a štíty v košíku, „Can't be teleported“, kalkulačka tavení | agy | ✅ |
| VC-29 | všechny názvy z hry vždy anglicky, překládá se jen UI | Sol | ✅ |
| VC-24 | Bestiary: trofeje, ochočování, nájezdy, sdílení profilu, deep link | Sol | ✅ |
| VC-30 | odkaz z karty Bestiary do kalkulačky (Teuferon) + názvy nástrojů anglicky | Sol | ✅ |
| VC-31 | Armourer → **Smithy** (`/smithy/`, 301 ze `/armourer/`), bez Bare Fists, mobil 360 px ve 13 jazycích (`scripts/check-mobile.mjs`) | Sol | ✅ |
| VC-25 | Damage Calculator: sdílený profil hráče (`shared/player`), přepínač „Use my Bestiary profile“, URL má přednost | Sol | ✅ |
| VC-26 | Sign Editor: 22 šablon, galerie, sdílení `#sign=` | Sol | ✅ |
| VC-27 | rozcestník: hledání napříč sekcemi (jen anglické názvy, zamčené biomy skryté) + oprava deep linku | agy | ✅ |
| VC-19 | Progress Tracker `/progress/`, sdílený stav `vc.progress`, 15 milníků, sdílení `#p=` | Sol | ✅ |
| VC-20 | Bestiary, Smithy, kalkulačka a rozcestník se řídí sdíleným postupem | Sol | ✅ |
| VC-21 | Provisions data (90 jídel, 21 medovin, 9 feastů) + sdílený košík `shared/shopping` | Sol | ✅ |
| VC-32 | Progress jako vysouvací panel na každé stránce („⛓ Progress N/9“), nástroje reagují hned | Sol | ✅ |
| VC-22 | stránka Provisions `/provisions/`: loadout, porce na hodiny hraní, nákupní seznam | Sol | ✅ |
| VC-33 | množná čísla ve všech 13 jazycích (`tn` + `Intl.PluralRules`, test `plural-rendering`), tip porcí v Provisions skloňuje porce i hodiny | Sol | ✅ |
| VC-34 | Provisions: plánovač podle činnosti (top 3 kombinace, medoviny podle biomu/bosse, 13 ověřených tipů) | Sol | ✅ |
| VC-35 | **Comfort Planner** `/comfort/` (ANALYZA § 24): comfort, Rested, Best I can build, Next upgrades, nákupní seznam | Sol | ✅ (+ oprava: celé dávky výroby ve sdíleném košíku, záložka Progress nepřekrývá obsah) |
| VC-36 | **Expedition** `/expedition/` (ANALYZA § 25): příprava na bosse (zbraně, obrana, jídlo, balicí a nákupní seznam) a nájezdy podle postupu | Sol | ✅ (po vrácení: auto výběr bosse, počet medovin podle cooldownu, bundly, formát) |
| VC-37 | oprava 5 chyb z reportu Teuferona 8. 10.: biomy jídel v hledání (31 → 0), duplicitní brnění (48 → 0), karta suroviny ve Smithy (`#item=`, zdroje a použití), `#item=` v Provisions (fokus jen jednou), 15min boj z Expedition → Provisions (čtvrthodiny), Bare Fists pryč z hledání | Sol | ✅ (po vrácení; přejímka Fable; deep link Smithy do zamčeného biomu už biom neodemyká, jen odroluje na hlavičku — anti-spoiler, přijato) |
| VC-38 | **Progress Tracker „Saga“** (ANALYZA § 26): dlaždice biomů s artworkem, slider „kam jsem došel“, odškrtávají se jen bossové a minibossové (stránka i panel) | Astra | ✅ nasazeno 8. 10. na Pavlův pokyn (vzhled schválen v náhledu); Astra spadla na limit Codexu v kroku 4 (session `01a11d12-7f51-7ff1-b023-c78653e20952`), WIP commitnut; přejímka Fable: převzato (5/4), drobnosti z přejímky opravil orchestrátor (čipy v panelu, jezdec ve Firefoxu, skript obrázků) |
| VC-39 | **Items Compendium** `/items/` (ANALYZA § 27): celkový přehled předmětů a surovin, kde je získat (Bestiary), kde je použít (Smithy, Provisions, Comfort, Expedition), prolinkování napříč Companionem a z vyhledávání | GM | ✅ nasazeno 9. 10. (333 položek, zdroje, usedIn, 11 routes × 13 jazyků na mobilu 360 px bez vad) |
| VC-40 | **Trader Ledger** `/traders/` (ANALYZA § 28): Haldor, Hildir & Bog Witch, nabídka, ceny, podmínky odemknutí, kalkulačka pokladů | GM | ✅ nasazeno 9. 10. (3 obchodníci, kalkulačka mincí a pokladů, prolinkování do Smithy, Items a Provisions, 12 routes × 13 jazyků na mobilu 360 px bez vad) |
| VC-40b | **Items Compendium oprava a rozšíření** (kompletní katalog 764 itemů, odstranění visícího modalu, recepty a prolinkování) | GL | ✅ nasazeno 9. 10. (764 položek, oprava CSS display:none u [hidden], ověřeno přes prohlizec i 325 stránek na 360 px mobilu) |
| VC-40c | **Items Compendium kompletní katalog (1 080 itemů)** (všechny předměty ze hry, infoboxy, trofeje, zbraně, zbroje, nářadí, stavby, překlady) | agy | ✅ nasazeno 9. 10. (1 080 položek, 13 jazyků, invertovaný index usedIn napříč všemi nástroji) |
| VC-40d | **Items Compendium oprava chyb, audit a testování** (oprava pushState navigace v modalu, biomy 0 nullů, oprava plain substringů v inferBiome, přejímka prohlizec bez vad) | agy | ✅ hotovo a otestováno 9. 10. (364 testů v npm test, prohlizec kontrola bez vad, 0 konzolových chyb) |
| VC-42a | oprava O-1: Trader Ledger z wiki tabulek (ceny, sortiment, podmínky) | Sonnet | ✅ nasazeno 10. 10. (Haldor 11, Hildir 38, Bog Witch 20; přejímka: všech 69 řádků = wiki cache, 383/383 testů, prohlizec bez vad) |
| VC-42b | oprava O-2: Items tier = order biomu z `data/biomes.json` | Flash | ✅ nasazeno 10. 10. (241 → 0 položek s chybným tier, Ocean ve filtru; přejímka 5/5; orchestrátor: biomy nesou bosse, aby zabití bosse odemklo dosah) |
| VC-42c | oprava O-3: kategorie (+ Accessories, Casting), duplicity, odpad, stanice, Hildiřino zboží jako karty | Sonnet | ✅ nasazeno 10. 10. (17 kategorií, 0 zbraní v drop, 0 duplicit, stanice bez úrovně v názvu, 38 Hildir + 20 Bog Witch karet, zboží z truhel/bossů v biomu podmínky; 1× vráceno — biomy obchodníků byla chyba zadání; 397 testů) |
| VC-42g | oprava O-7: Bestiary odkazy do Items jen na existující položky, čisté trofeje | Flash | ✅ nasazeno 10. 10. (304 odkazů, 0 mrtvých, „… Power" bez odkazu; Crow/Gull/Zil-Thungr bez vymyšlené trofeje — chyba zadání, opravil orchestrátor; 401 testů) |
| VC-42d | oprava O-4: sdílený košík `va.cart` (suroviny a zboží z Items/Traders ve Smithy jako „N× název", balení ×N, „Plan in Smithy" u výbavy) | Sonnet | ✅ nasazeno 10. 10. (přejímka 5/5: smíšený košík set + zbraň + suroviny počítá správně, poškozený `va.cart` nespadne, 404 testů) |
| VC-42e | oprava O-5: spoilery v Items zamčené podle postupu | Flash → Sonnet | ✅ nasazeno 10. 10. (zamčené karty bez názvu a obrázku, hledání je nevrací, deep link a Reveal v modalu nezapisují postup; Flash vrácen, dodělal Sonnet; 399 testů) |
| VC-42d, f, h… | opravy O-4 (košík), O-6 (mobil), O-8 (i18n), O-9 (úklid), O-10 (docs); navíc z přejímky VC-42e: spoilery v „Used in" modalu (počítadlo jako Smithy), biom Ashwood stakewall / Finewood Stack, odznak biomu na zamčené kartě přes `t()`; Reveal na kartě → jen `vc.openBiomes` v Items, Comfort, Provisions, Expedition (AUD/8, Pavel 10. 10.) (+ překlad podmínek odemčení `unlockedBy.text` v Traders, balení ×N v košíku) (kategorie, košík, spoilery, mobil, Bestiary odkazy, i18n, úklid, docs) | — | ⏳ po O-1/O-2, O-3 a O-5 čekají na AUD/1–4 |

### 🔄 Předávka orchestrátora (10. 10. 2026, ~14:00)

- **Běží:** VC-42f (O-6, Sonnet, worktree GM, větev `prace/VC-42f`, dashboard #167) a VC-42i (O-10 DATA-SCHEMA + ANALYZA, Haiku zkouška, worktree CC, `prace/VC-42i`, #168). Po doběhnutí přejímka agentem `prejimka`, merge, `node scripts/build-items-data.mjs` → čistý strom, testy, push. Další: O-8 → O-9 → AUD/8.
- **Zbývá z auditu** (`docs/audit/AUDIT-VC-39-40.md` § 4 + rozhodnutí Pavla na konci): O-6 mobil 360 px a stránkování karet (Items `app.js` + `styles.css`), O-8 i18n (+ překlad `unlockedBy.text` v Traders), O-9 úklid (sken `data/raw/` v build-items i build-traders, `roots`/`root`, Haldor odznak ve Smithy, Expedition), O-10 dokumentace (STAV/DATA-SCHEMA/ANALYZA).
- **Navíc z přejímek:** AUD/8 Reveal na kartě jen `vc.openBiomes` v Items/Comfort/Provisions/Expedition; spoilery v „Used in" modalu (počítadlo jako Smithy); biom Ashwood stakewall / Finewood Stack; odznak biomu na zamčené kartě přes `t()`; smetí `ectoplasm-ghost-trophy`, drop „None" u moose-calf; migrace starých řádků `va.cart` z Items/Traders (`{item, pieceId, quantity}` → `materialId`) v `VCShopping.cart.read()`; ve Smithy skupinu „Materials & goods" až na konec; samostatně `data/stations.json` (AUD/6) až po O-10.
- **Pořadí:** O-6 → O-8 → O-9 (všechny sahají do `apps/items/assets/app.js` nebo generátorů, ⛔ souběžně), AUD/8 může souběžně s O-9 jen když O-9 nesahá do Items. O-10 nakonec.
- **Pracovníci 10. 10.:** Claude týden 94 %, Flash 5 h ~54 % / týden 58 %, Codex a GLM vyčerpané do 13./12. 10. Flash po vrácení (VC-42e) dostává jen malé dobře vymezené úkoly; Sonnet spolehlivý.
- Worktree: `valheim-units-CC` (volný, větev `prace/VC-42g` mergnutá), `valheim-units-GM` (volný, `prace/VC-42d` mergnutá). node_modules pro damage-calculator a signs jsou v obou nalinkované.

### Po frontě
Pracovníci od 6. 10.: agy je vyčerpaný (týden 4 %, obnova 8. 10.), práci dělá **Codex Sol**. Pavel 6. 10. schválil pořadí: překlady (VC-16 až VC-18), **vylepšení stávajících nástrojů** (VC-23 až VC-27), potom **Progress Tracker** a **Provisions** (VC-19 až VC-22). Další kandidáti z [`NAVRHY-NASTROJU.md`](NAVRHY-NASTROJU.md): **Comfort Planner schválen 6. 10. (VC-35)**, **Expedition schválen 7. 10. (VC-36)**. Trader Ledger, Fishing a Taming zatím schválené nejsou.

**Zásada:** každý nový nástroj a funkce je od začátku ve 13 jazycích (ANALYZA § 15 a zásada před § 16).

## Známé drobnosti (neřešené)



- Expedition: zabití nebossů (Troll, Brenna…) a vrácení Hildir truhel se odhaduje podle odemčeného biomu; player-based raids se nepočítají; Malicious Blood nemá na wiki údaj o teleportu.
- Comfort Planner: wiki nemá recept na Carved Chair a Moose Hide Carpet, nedoporučují se (maxima tím nejsou dotčená).
- Ember Charge je jediná doporučovaná bomba. Ostatní bomby mají `recommendable: false`, protože wiki neuvádí plošné poškození.
- Popisy z wiki zůstanou po překladu anglicky (ANALYZA § 15).

## Google Analytics

Služba „Valheim Companion“ v účtu Pawlig, Measurement ID **G-CXQVNCCJKE**, stream „Valheim Companion web“ (16052418584). Nasazeno 6. 10. 2026 (VC-28, Consent Mode v2 + lišta, ANALYZA § 19). Data se v GA objeví do 48 h.

## Na Pavlovi

- Vypnout starou appku **valheim-signs.teuferon.click** v EasyPanelu. Repo `pawlig/valheim-signs` je smazané, lokální složka taky.
- Případně povolit Codex (CX/CS z marchboundu), pokud kvóty agy/zai nestačí.

## Kvóty (6. 10. 2026, 12:30)

| Agent | 5 h okno | Týden | Obnova týdne |
|---|---|---|---|
| agy (GM, Gemini Flash) | 12 % | 17 % | 8. 10. 14:59 |
| zai (GL, GLM-5.3, tarif lite) | 61 % | 22 % | 12. 10. 00:18 |

Kvóty jsou sdílené s ostatními projekty (hriva, marchbound). Na Macu smí běžet jen **jeden** agy/zai agent najednou napříč všemi projekty.
