🚨 PRACUJEŠ VÝHRADNĚ VE STROMU {{STROM}} (větev {{VETEV}}).
⛔ /Users/paveldvorak/gameroot/valheim-units (bez přípony) NIKDY — ani čtení, ani zápis, ani příkaz s touhle cestou. ⛔ /Users/paveldvorak/gameroot/marchbound taky ne.
Všechny cesty níž jsou relativní k {{STROM}}.
Commituj jen do své větve {{VETEV}}, po krocích, soubory výčtem (⛔ `git add -A`). ⛔ push, merge, rebase. Každý příkaz pouštěj zvlášť a synchronně. Kód a commity ANGLICKY.
⚠️ Zásady Pavla: názvy z hry zůstávají anglicky, UI je ve 13 jazycích (0 chybějících překladů), bez spoilerů (zamykání podle `VCProgress`). Texty s číslem jdou přes `tn`.
⛔ Nevěř číslům v `docs/STAV.md` ani v commitech VC-40c–f — zdroj pravdy je wiki cache v `data/raw/`.

# VC-43b — spoilery: zamčené podmínky v Traders a „Dropped by“ v Items

Drobnosti ze `docs/STAV.md` § Známé drobnosti (body 2 a 3). Pravidlo Pavla (ANALYZA § 27, AUD/1): spoilery zamčené podle postupu `VCProgress`. Vzor: Expedition píše u biomu za dosahem „A later raid“ bez jména.

## 1. Traders — jméno bosse/bytosti jen v odhaleném biomu
Na čistém profilu ukazuje banner zámku `🔒 Requires defeating The Queen` / `Fader` / `Kall Fimbulbringer` a odkaz „Boss preparation: … →“ (`apps/traders/assets/app.js` ř. 95–103 `unlockText`, ř. 286–305 banner). Každé `unlockedBy` má pole `biome` (`data/traders.json`).
- Přidej `isBiomeRevealed(biomeId)` stejně jako ř. 117–123 (`VCProgress.revealedBiomes(VC_TRADERS_DATA.biomes)`; bez `VCProgress` → `true`).
- Když biom `unlockedBy.biome` **není** odhalený: text banneru `🔒 ` + `t('Requires progress in a later biome')`, **bez** odkazu na Expedition (ani boss, ani chest). Platí pro všechny typy (`boss`, `chest`, `creature`).
- Když odhalený: beze změny.
- Projdi `grep -n "unlockText\|unlockedBy.name\|bossName" apps/traders/assets/app.js` — stejné pravidlo všude, kde se jméno ukazuje (např. title/aria, filtr, detail).
- Klíč `Requires progress in a later biome` do `apps/traders/locales/messages.json` ve všech 13 jazycích (en, cs, de, es, fr, pt, zh, hi, ar, bn, ru, ja, id) — skutečný překlad, ne angličtina; přegeneruj `messages.js` stejným způsobem, jakým vzniká (najdi generátor `grep -rn "traders/locales" scripts/`; když není, uprav oba soubory konzistentně).
- Na změnu `vc.progress` / `vc.openBiomes` (storage event) se banner překreslí — ověř, že stávající poslech to pokrývá.

## 2. Items — „Dropped by“ bez tvorů ze zamčených biomů
`apps/items/assets/app.js` ř. ~411–419 vypisuje všechny `item.sources.creatures` (každý má `biome`). U `wood` se tak na čistém profilu ukáže „Greydwarf Shaman (Deep North)“ (data jsou správně, je to skutečný tvor z wiki — jde jen o spoiler).
- Tvory s biomem mimo odhalené (`revealed` z ř. ~150–155, stejný zdroj jako „Used in“ ř. ~480–510) vynech; když nějací chybí, pod seznam `tn('{count} more in locked biomes', n, { count: n })` (klíč už existuje a je přeložený) — přesně jako u „Used in“ ř. 510.
- Když jsou zamčení všichni, místo seznamu jen ten řádek.
- Odkaz na Bestiary z karty (ř. ~525, `item.sources.creatures[0]`) ber z prvního **odhaleného** tvora; když žádný, odkaz nevykresluj.

## Testy
Rozšiř `scripts/items-compendium-ui.test.mjs` a test Traders (najdi `grep -ln "traders" scripts/*.test.mjs`) stejným stylem jako existující testy: čistý profil → banner bez „The Queen“ a bez odkazu `/expedition/`; profil s odhaleným `mistlands` → jméno i odkaz jsou; `wood` na čistém profilu → „Dropped by“ bez `greydwarf-shaman-deep-north` a s řádkem „1 more in locked biomes“ (nebo správné číslo).

## ⛔ Nesahat
`data/`, generátory, `shared/`, Smithy, Expedition, ostatní aplikace.

## Rozpočet čtení
`apps/traders/assets/app.js` ř. 80–140 a 230–320, `apps/items/assets/app.js` ř. 100–160 a 395–530, `apps/traders/locales/messages.json` jen záznam „Requires defeating {boss}“ jako vzor, příslušné testy. Nic dalšího.

## Hotovo, když
- `node --test 'scripts/**/*.test.mjs'` → fail 0.
- `npm run build` (chybí-li `apps/signs/dist-static`, dočasný symlink na `/Users/paveldvorak/gameroot/valheim-units/apps/signs/dist-static`, po buildu smaž) + `node scripts/preview.mjs <port>` na pozadí.
- `prohlizec` (skill `~/.claude/skills/browser-test/SKILL.md`): čistý profil → `/traders/` text stránky neobsahuje „The Queen“, „Fader“, „Kall“, „Yagluth“; `/items/#item=wood` → modal bez „Deep North“; v `?lang=cs` nový text česky; po `localStorage.setItem('vc.openBiomes', '["mistlands"]')` + reload → „The Queen“ je; `prohlizec kontrola` /traders/ a /items/ bez vad; `errors --json` → [].
- Preview a prohlížeč ukonči. Do odpovědi: commity, výstupy kontrol.
