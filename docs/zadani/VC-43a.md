🚨 PRACUJEŠ VÝHRADNĚ VE STROMU {{STROM}} (větev {{VETEV}}).
⛔ /Users/paveldvorak/gameroot/valheim-units (bez přípony) NIKDY — ani čtení, ani zápis, ani příkaz s touhle cestou. ⛔ /Users/paveldvorak/gameroot/marchbound taky ne.
Všechny cesty níž jsou relativní k {{STROM}}.
Commituj jen do své větve {{VETEV}}, po krocích, soubory výčtem (⛔ `git add -A`). ⛔ push, merge, rebase. Každý příkaz pouštěj zvlášť a synchronně. Kód a commity ANGLICKY.
⚠️ Zásady Pavla: názvy z hry zůstávají anglicky, UI je ve 13 jazycích (0 chybějících překladů), bez spoilerů (zamykání podle `VCProgress`). Texty s číslem jdou přes `tn`.
⛔ Nevěř číslům v `docs/STAV.md` ani v commitech VC-40c–f — zdroj pravdy je wiki cache v `data/raw/`.

# VC-43a — deterministický `generatedAt` a whitelist i18n testu po párech

Drobnosti ze `docs/STAV.md` § Známé drobnosti (body 1 a 4). Jen skripty a testy, ⛔ `apps/*/assets`.

## 1. `generatedAt` z gitu, ne z mtime
`scripts/build-data.mjs` ř. 177–184 a `scripts/build-armourer-data.mjs` ř. 88–95 berou `generatedAt` z mtime `data/creatures.json` / `data/armor.json`. V čerstvém checkoutu je mtime čas checkoutu → po buildu se výstupní `data.js` liší a strom není čistý.
- Nová sdílená funkce `scripts/lib/generated-at.mjs`: `export function generatedAt(sourcePath, outputPath)`:
  1. `execFileSync('git', ['log', '-1', '--format=%cI', '--', sourcePath], { cwd: REPO_ROOT })` → oříznutý řetězec; neprázdný → vrať ho.
  2. Jinak (git chybí / soubor necommitnutý / chyba): když `outputPath` existuje a obsahuje `"generatedAt": "…"` (regex `/"generatedAt"\s*:\s*"([^"]+)"/`), vrať tu hodnotu.
  3. Jinak `new Date().toISOString()`.
- Obě místa volají `generatedAt(<zdroj json>, <výstupní soubor, kam skript zapisuje generatedAt>)`; `statSync` z importů odstraň, pokud se už nepoužívá.
- Test `scripts/generated-at.test.mjs`: (a) pro `data/creatures.json` vrací totéž co `git log -1 --format=%cI -- data/creatures.json`, (b) pro neexistující zdroj a výstup s `"generatedAt": "2026-01-02T03:04:05.000Z"` (dočasný soubor v `os.tmpdir()`) vrací tu hodnotu, (c) bez zdroje i výstupu vrací platné ISO datum.
- Pak pusť `node scripts/build-data.mjs` a `node scripts/build-armourer-data.mjs`, regenerované výstupy (změní se jen `generatedAt`) commitni zvlášť.

## 2. Whitelist identical-to-en po párech (jazyk, klíč)
`scripts/i18n.test.mjs` ř. ~345–370: whitelist je množina **hodnot** platná pro všechny jazyky → přeložitelný text, který se náhodou shoduje s hodnotou na whitelistu, projde i tam, kde být nemá.
- Vytáhni logiku do funkce `findIdenticalOffenders(messagesByApp, allow)` ve stejném souboru; `allow` je `Set` řetězců `'<app>:<lang>:<key>'`, plus `'*:<key>'` pro klíče, které jsou legitimně stejné ve **všech** jazycích (značky a názvy ze hry: `← Valheim Companion`, `Items Compendium`, `Trader Ledger`, `Wiki`, `Wiki ↗`, názvy biomů `Meadows` … `Deep North`).
- Ostatní dnešní položky whitelistu převeď na explicitní páry: spusť si dnešní test s vypnutým whitelistem, vypiš, které (app, jazyk, klíč) by padly, a ty, které dnes prošly **jen kvůli whitelistu**, zapiš jako páry. Pravidla `noText` a `/^x\{count\}$/` zachovej.
- Přidej test na funkci: syntetický katalog `{ items: { 'Foo': { en: 'Foo', cs: 'Foo', de: 'Bar' } } }` s `allow = new Set(['items:de:Foo'])` → offenders `['items:cs:Foo']`; s `'*:Foo'` → `[]`.
- Stávající test musí dál projít bez změny katalogů.

## ⛔ Nesahat
`apps/*/assets/*`, `apps/*/locales/*`, ostatní build skripty, `docs/`.

## Rozpočet čtení
`scripts/build-data.mjs` ř. 1–20 a 170–230, `scripts/build-armourer-data.mjs` ř. 1–20 a 80–130, `scripts/i18n.test.mjs` ř. 1–20 a 340–380. Nic dalšího.

## Hotovo, když
- `node --test 'scripts/**/*.test.mjs'` → fail 0 (main 436 + nové).
- Po commitu: `node scripts/build-data.mjs && node scripts/build-armourer-data.mjs` → `git status --short` prázdné; `touch data/creatures.json data/armor.json` a znovu → prázdné.
- `grep -n "mtime" scripts/build-data.mjs scripts/build-armourer-data.mjs` → nic.
- Do odpovědi: commity, výstupy kontrol, počet párů ve whitelistu.
