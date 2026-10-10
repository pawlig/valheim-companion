# Orchestrace: jak se tady pracuje

Pavel chce, aby orchestrátor (Claude Opus/Fable v Claude Code) dělal **analýzu, zadání, přejímku, merge a push**. Kód píšou levní agenti **agy** (Gemini Flash přes Antigravity CLI) a **zai** (GLM přes Z.ai). Orchestrátor sám kód nepíše. Výjimkou jsou drobné opravy při přejímce (1–5 řádků), a ty musí být v commitu označené „(orchestrator fix)“.

## 1. Zadání

- Soubor `docs/zadani/VC-<n>.md`, česky, kód a commity anglicky.
- Šablona: hlavička se stromem a zákazy (viz kterékoli zadání), dál PROČ, PŘEČTI NEJDŘÍV, ROZSAH (výčet souborů), KROKY s commity, ZKOUŠKA, NAKONEC.
- Placeholdery `{{STROM}}` a `{{VETEV}}` se při spuštění nahradí `sed`em do scratchpadu.
- Zadání se **commituje a pushuje před spuštěním** agenta.
- Velké úlohy rozděl na kroky s commitem po každém (agy má tvrdý limit 45 min).
- Vlepuj ukázky dat a wikitextu, ať agent nemusí hledat.

## 2. Spuštění agenta

Launchery jsou v `~/gameroot/marchbound/scripts/` a spouští se odtamtud:

```sh
# worktree (jednou; GM pro agy, GL pro zai)
git worktree add ../valheim-units-GM -b prace/VC-<n> main
# nebo na existujícím worktree: git -C ../valheim-units-GM checkout -b prace/VC-<n> main

sed -e 's#{{STROM}}#/Users/paveldvorak/gameroot/valheim-units-GM#g' \
    -e 's#{{VETEV}}#prace/VC-<n>#g' docs/zadani/VC-<n>.md > $SCRATCH/VC-<n>.zadani.md

cd ~/gameroot/marchbound
# agy (Gemini Flash), na pozadí:
node scripts/pust-gm.mjs --zadani $SCRATCH/VC-<n>.zadani.md --strom /Users/paveldvorak/gameroot/valheim-units-GM --vystup $SCRATCH/gm-VC-<n>.json --znacka VC-<n>
# zai (GLM):
node scripts/pust-gl.mjs --zadani $SCRATCH/VC-<n>.zadani.md --strom /Users/paveldvorak/gameroot/valheim-units-GL --vystup $SCRATCH/gl-VC-<n>.json --znacka VC-<n> --minut 75
# Codex Sol (GPT-6.1 Sol), od 6. 10. 2026 hlavní pracovník po vyčerpání agy:
node scripts/pust-cs.mjs --zadani $SCRATCH/VC-<n>.zadani.md --strom /Users/paveldvorak/gameroot/valheim-units-CS --vystup $SCRATCH/cs-VC-<n>.json --minut 90
```

Kvóty: `node ~/webroot/dashboard/bin/prace.mjs usage` **jednou za kolo** (Pavel 8. 10. 2026: limity jen odtud). `limit-agy.mjs`/`limit-zai.mjs --ted` jen když hlásí „pult nedostupný". Launchery samy skončí kódem 10/11, když limit nestačí.

- **Sol** běží s `--dangerously-bypass-approvals-and-sandbox` a smí npm, testy i git. Pravidla zadání jsou stejná jako u agy: hotové zadání, kroky s commitem a výčet souborů v ROZSAHU. Worktree `../valheim-units-CS`. Commity značkuj `[CS/sol]`.
- Sol může běžet souběžně s agy nebo zai, protože je to jiný slot. Musí ale mít vlastní worktree a úlohy se nesmějí překrývat v souborech.

### Pravidla a pasti (všechny se už staly)

- **Jen jeden agy/zai agent na Macu najednou, napříč všemi projekty** (hriva a marchbound je používají taky). Před spuštěním: `pgrep -lf "^agy |pust-gl.mjs"`.
- ⛔ **Nikdy nečekej ve smyčce přes `pgrep -f "agy -p"`**: vzor najde i samotnou smyčku a ta pak čeká navždy (stalo se 6. 10., ztráta celé noci). Na konec agenta čekej přes `run_in_background` přímo na launcheru a **nic mezitím nekontroluj** — žádný `tail` výstupu, `sleep`/`until` ani `git log` worktree (každá kontrola znovu přečte celý kontext orchestrátora; Pavel 8. 10. 2026). Průběh, když je opravdu potřeba: `Monitor` filtrovaný na změnu stavu. Na čas čekej `ScheduleWakeup`, ⛔ ne `sleep` smyčkou.
- **agy** má pevný `--print-timeout 45m`. Když narazí, commitnuté kroky zůstanou a necommitnutá práce je ve worktree a v `refs/zachrana/VC-<n>`. Rozpracované věci commitni jako WIP (`… (zai/agy, interrupted)`) a pusť navazující zadání s hlavičkou „🔁 NAVAZUJEŠ…“. `pust-gm` vyžaduje čistý strom.
- **zai** smí jen `git`, `node`, `npm run build`, `npx tsc`, `ls/cat/grep/sed -n/find/mkdir/echo`. ⛔ Nesmí `npm test`, `npm ci`, `npm run <jiné>` ani WebFetch.
  - Nástroje se proto volají přes node, např. `node apps/damage-calculator/node_modules/tsx/dist/cli.mjs …`, `node apps/damage-calculator/node_modules/typescript/bin/tsc --noEmit -p apps/damage-calculator`.
  - `npm ci` pro `apps/damage-calculator` a `apps/signs` udělá orchestrátor ve worktree předem.
- **zai** se nepouští Po–Pá 8:00–12:00 (špička Z.ai, launcher skončí s kódem 11). Pod 40 % pětihodinového okna jen malé úlohy, pod 10 % nic.
- Síť: agenti stahují z wiki jen přes `scripts/wiki/api.mjs` (cache `data/raw/`, 300 ms mezi požadavky, User-Agent). Druhý běh pipeline musí jet z cache a nic nezměnit.

## 3. Přejímka (po každé úloze)

Body 1–6 dělá **v čerstvém kontextu** `Agent` se `subagent_type: "prejimka"` (zadání, worktree, větev) — do kontextu orchestrátora jde jen verdikt. Orchestrátor sám: prohlížeč (bod 7), merge a deploy (8–9). Výstupy testů a buildu vždy s ořezem (`| tail -30`).

1. `git log --oneline main..HEAD`, `git status --short`, `git diff --name-only main...HEAD`: rozsah sedí se zadáním?
2. Testy:
   - kořen: `node --test 'scripts/**/*.test.mjs'` (obsahuje test parity Bestiary ↔ kalkulačka)
   - `npm --prefix apps/damage-calculator test` + `run typecheck`
   - `npm --prefix apps/signs test` + `run typecheck`
3. Idempotence dat:
   ```sh
   node scripts/wiki/fetch-creatures.mjs && node scripts/wiki/fetch-weapons.mjs && node scripts/recommend.mjs && node scripts/build-data.mjs && node scripts/wiki/fetch-armor.mjs && node scripts/build-armourer-data.mjs
   ```
   ```sh
   node scripts/wiki/fetch-stations.mjs && node scripts/wiki/fetch-comfort.mjs && node scripts/wiki/fetch-expedition.mjs && node scripts/wiki/fetch-provisions.mjs
   ```
   Stanice (`data/stations.json`) skládají tyto čtyři fetchery v tomhle pořadí; každý nahrazuje jen své záznamy.
   Pusť 2× a potom `git status --short` musí být prázdné.
4. Kontroly dat přes `node -e` (konkrétní jednotky a zbraně).
   🚨 **Data z wiki se vzorkují proti wiki cache `data/raw/`, ne proti zadání ani analýze** (Pavel 10. 10. 2026, arch AUD/7 — chybné ceny Trader Ledgeru prošly, protože byly už v ANALYZA § 28). Aspoň 10 náhodných záznamů + všechny, které zadání jmenuje, porovnat s wikitextem stránky v cache; nesoulad = vráceno.
   ⚠️ `rank.js` čte `globalThis.VC_DATA`, takže v Node nastav `globalThis.window = globalThis` a teprve pak `eval` souboru `data.js`.
5. Build a náhled:
   ```sh
   npm run build                    # postaví signs + kalkulačku a složí dist/
   node scripts/preview.mjs 8090 &  # servíruje dist/ se stejnou CSP jako nginx
   ```
6. **Mobil ve všech jazycích:** `node scripts/check-mobile.mjs <port>` nad běžícím preview (6 stránek × 13 jazyků, 360 px). Musí vyjít 0.
7. **Prohlížeč:** skill `browser-test` (čistý headless Chrome přes CDP). Harness `cdp.mjs` zkopíruj ze `~/.claude/skills/browser-test/` do scratchpadu. Kontroluj:
   - konzoli (0 chyb, 0 failed requests)
   - `scrollWidth` na 360 px
   - klíčové interakce
   - screenshot
8. Merge:
   ```sh
   git merge --no-ff prace/VC-<n> -m "Merge VC-<n>: … [agent]"
   git push
   ```
   Push spustí deploy. Ověř živý web přes `curl` (status, `<title>`, konkrétní řetězec).
9. Ukliď worktree a větve (`git worktree remove`, `git branch -d prace/…`) a aktualizuj **`docs/STAV.md`**.

## 3a. Předávka sezení (Pavel 8. 10. 2026)

Po 5 převzatých úlohách nebo když `node ~/.claude/skills/pracovnici/kontext.mjs` hlásí `PŘEDÁVKA` (> 250k), na hranici kola: předávací zápis (≤ 15 řádků: co běží kde, worktree, co čeká na přejímku, další krok) nahoru do `docs/STAV.md`, commit + push, Pavlovi `🔄 Předávka zapsána — /clear a „pokračuj"`. Nové sezení čte tento dokument + zápis, ne historii. Pravidla: globální skill `pracovnici` § 6.

Konflikty mezi souběžnými větvemi (rozcestník, `build-site.mjs`, `Dockerfile`, `nginx.conf`, README) řeší orchestrátor tak, že zachová obě strany.

## 4. Struktura repa

```
apps/hub/               rozcestník (/) + og/ (šablony a PNG náhledy), icons/, support/kofi.png, site.webmanifest
apps/bestiary/          Bestiary (/bestiary/): index.html, assets/{app.js,rank.js,styles.css}, data/data.js, img/
apps/armourer/          Armourer (/armourer/): index.html, assets/, data/data.js, img/
apps/damage-calculator/ React+Vite (/damage-calculator/), scripts/{scrape.ts,verify-engine.ts,export-shared.ts}
apps/signs/             Runopis React+Vite (/signs/)
scripts/                pipeline z wiki (wiki/*.mjs), recommend.mjs, build-data.mjs, build-armourer-data.mjs,
                        build-site.mjs, preview.mjs, render-og.mjs, apply-meta.mjs, testy (*.test.mjs)
data/                   mezivýsledky (JSON), raw/ (cache API), overrides.json (ruční opravy), reporty
deploy/                 nginx.conf, security-headers.conf (CSP: jen 'self')
docs/                   ANALYZA, DATA-SCHEMA, STAV, ORCHESTRACE, NAVRHY-NASTROJU, zadani/
site.config.json        siteUrl pro meta tagy
```

**Zdroje pravdy:**
- pořadí biomů: `scripts/wiki/biomes.mjs` (test hlídá shodu s `apps/damage-calculator/src/data/biomes.ts`)
- poškození po kvalitách a časování útoků: kalkulačka → `data/weapon-quality.json` a `data/attack-profiles.json`
- ruční opravy dat: `data/overrides.json`

## 5. Užitečné

- Wiki API: `https://valheim.weirdgloop.org/api.php`. Stará `valheim.fandom.com` je zastaralá.
- Vykreslená stránka (časy útoků, brnění po kvalitách): `action=parse&prop=text`.
- Místní názvy: `action=parse&prop=langlinks`.
- Doména a meta: `site.config.json` → `node scripts/apply-meta.mjs` → commit. OG obrázky: `node scripts/render-og.mjs` (headless Chrome, malé ikony přes `sips`).
- Fable (rešerše a návrhy) se pouští přes nástroj Agent s `model: fable` a nepočítá se do limitu agy/zai.
