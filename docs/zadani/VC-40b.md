🚨 PRACUJEŠ VÝHRADNĚ VE STROMU {{STROM}} (větev {{VETEV}}).
⛔ /Users/paveldvorak/gameroot/valheim-units (bez přípony) NIKDY — ani čtení, ani zápis, ani příkaz s touhle cestou. ⛔ /Users/paveldvorak/gameroot/marchbound taky ne.
Všechny cesty níž jsou relativní k {{STROM}}.
Commituj jen do své větve {{VETEV}}, po krocích, soubory výčtem (⛔ `git add -A`). ⛔ push, merge, rebase. Každý příkaz pouštěj zvlášť a synchronně. Kód ANGLICKY.
⚠️ Zásady Pavla (konec `docs/ANALYZA.md`): názvy z hry i názvy nástrojů zůstávají anglicky („Items Compendium“ se nepřekládá), UI je ve 13 jazycích (0 chybějících překladů), bez spoilerů (zamykání podle `VCProgress`).
🌍 Texty s číslem jdou přes `tn` (množná čísla, ANALYZA § 22, test `scripts/plural-rendering.test.mjs`, všechny CLDR tvary s `{count}`).
Kontrola mobilu: `node scripts/preview.mjs <port>` na pozadí, `node scripts/check-mobile.mjs <port>` (0 přetečení), pak preview ukonči.

Úkol VC-40b: **Items Compendium oprava a kompletní katalog všech předmětů** (750+ itemů, odstranění visícího modalu, recepty, stanice, prolinkování).
Závazné je `docs/ANALYZA.md` § 29 a § 27.
Požadavek od Pavla (9. 10. 2026): *„item compendium je spatne, vysi tam nějaký popup a je tam hrozněš málo itemu, chci aby jsi si to po sobě pořádně kontroloval a opravil to, až doběhne VC-40 tak se pust do opravy, a než něco nasadíš tak si to pořádně kontroluj, a klidně využij i ZAi glm na práci aktuálně má ještě 8 procent tak ho klidně vyčerpej“*

PŘEČTI NEJDŘÍV: `docs/ANALYZA.md` § 29, § 28, § 27, § 20 a § 17. `data/weapons.json`, `data/armor.json`, `data/food.json`, `data/meads.json`, `data/comfort.json`, `data/traders.json`, `data/items.json`, `scripts/build-items-data.mjs`, `apps/items/assets/app.js`, `apps/items/assets/styles.css`.

ROZSAH:
- **Oprava visícího modalu v CSS/JS:**
  - V `apps/items/assets/styles.css`: přidat `.item-modal[hidden], .modal-backdrop[hidden] { display: none !important; }`. Nyní `.item-modal { display: flex; }` přebíjí HTML `hidden` a prázdný box visí uprostřed obrazovky hned po načtení!
  - V `apps/items/assets/app.js`: při zavření modalu (ESC, Close tlačítko, klik na backdrop) nastavit `hidden = true` pro modal i backdrop a vyčistit URL hash přes `history.replaceState(null, '', location.pathname + location.search)` bez skákání stránky.
- **Kompletní katalog všech předmětů (750+ itemů):**
  - Rozšířit `scripts/build-items-data.mjs` tak, aby sloučil VŠECHNY položky ze všech herních datasetů do `data/items-compendium.json` a `apps/items/data/data.js`:
    1. `data/items.json` (materiály, suroviny, rudy, dřeva, trofeje, mob drops, semena, vyvolávací předměty)
    2. `data/weapons.json` (meče, sekery, palcáty, luky, kuše, hole, dýky, oštěpy, štíty, šípy, munice, bomby, nástroje jako Hammer, Cultivator, Hoe, Pickaxes, Fishing Rod...)
    3. `data/armor.json` (přilby, hrudní zbroje, nohavice, pláště)
    4. `data/food.json` & provisions (vařená jídla, polévky, koláče, guláše, saláty, pečená masa)
    5. `data/meads.json` & provisions (léčivé, výdržové, lektvary odolností)
    6. `data/comfort.json` (postele, stoly, židle, trůny, koberce, ohniště)
    7. `data/traders.json` (cennosti, předměty z obchodů)
  - Každá položka má: `id`, `name`, `category`, `biome`, `tier`, `image`, `weight`, `stack`, `teleportable`, `recipe` (suroviny s id), `station` (vyžadovaná stanice a level), `sources` (potvory, těžba, sběr, obchodník), `usedIn` (kde se používá jako surovina), `crossLinks` (přímé prokliky do `/smithy/`, `/provisions/`, `/comfort/`, `/bestiary/`, `/traders/`).
- **UI a filtry v `apps/items/`:**
  - Rozšířit výběr kategorií v `<select id="category-select">`:
    - All categories
    - Weapons & Tools (`weapon`, `tool`)
    - Armor & Shields (`armor`, `shield`)
    - Food & Mead (`food`, `mead`)
    - Metals & Ores (`metal`)
    - Monster Drops (`drop`)
    - Trophies (`trophy`)
    - Building & Comfort (`building`, `comfort`)
    - Valuables & Traders (`valuable`)
    - Boss Summoning (`summoning`)
  - V modalu zobrazit:
    - Recept k výrobě (pokud existuje) s klikacími odkazy na jednotlivé suroviny v kompendiu (`/items/#item=<id>`).
    - Craftovací stanici a její level (např. *Forge Level 2*, *Workbench Level 1*, *Cauldron Level 3*).
    - Vlastnosti: poškození / armor / HP-Stamina-Eitr / váha / stack / teleportovatelnost.
    - Kde získat (Sources) s odkazy do Bestiáře a Trader Ledgeru.
    - Kde se používá (Used In) s klikacími odkazy na předměty, které ji potřebují.
    - Přímá akční tlačítka:
      - „Open in Smithy →“ u zbraní a zbrojí
      - „Open in Provisions →“ u jídel a lektvarů
      - „Open in Comfort Planner →“ u komfortního nábytku
      - „Open in Trader Ledger →“ u položek od obchodníků
      - „Open in Bestiary →“ u dropů a trofejí
- **Testy a lokalizace:**
  - `scripts/items.test.mjs`: ověřit aspoň 20 asercí (celkový počet >= 700, přítomnost iron-sword, root-harnesk, sausages, frost-arrow, megingjord, prolinkování, kategorie).
  - Všechny texty ve 13 jazycích v `apps/items/locales/messages.json` i `messages.js` (0 chybějících překladů).
- ⛔ stávající funkčnost ostatních sekcí se nesmí rozbít.

---

### KROK 1: Oprava CSS modalu a zavírání (commit)

1. V `apps/items/assets/styles.css`:
   - Přidej:
     ```css
     .item-modal[hidden],
     .modal-backdrop[hidden] {
       display: none !important;
     }
     ```
   - Zkontroluj, že modal a backdrop se správně centrují, když `hidden` není přítomný.
2. V `apps/items/assets/app.js`:
   - V `closeModal()`:
     ```javascript
     const modal = document.getElementById('item-modal');
     const backdrop = document.getElementById('item-modal-backdrop');
     if (modal) modal.hidden = true;
     if (backdrop) backdrop.hidden = true;
     activeModalItem = null;
     if (location.hash && location.hash.includes('item=')) {
       history.replaceState(null, '', location.pathname + location.search);
     }
     ```
3. Commit: `VC-40b: fix items modal hidden CSS and clean modal closing [GL/glm]`

---

### KROK 2: Datová pipeline pro všech 750+ předmětů (commit)

1. Uprav `scripts/build-items-data.mjs`:
   - Načti `data/items.json`, `data/weapons.json`, `data/armor.json`, `data/comfort.json`, `data/stations.json`, `data/creatures.json`, `data/traders.json` a provisions data z `apps/provisions/data/data.js`.
   - Vytvoř kompletní unifikovaný index všech předmětů.
   - Pro zbraně, štíty a nástroje z `weapons.json`:
     - Zařaď do kategorií `weapon`, `shield`, `tool`.
     - Vytáhni suroviny pro výrobu (quality 1 recipe) a stanici.
     - Vytvoř `crossLinks.smithy = '/smithy/#weapon=' + it.id` (příp. `#item=`).
   - Pro zbroje z `armor.json`:
     - Zařaď do kategorie `armor`.
     - Vytáhni suroviny a stanici.
     - Vytvoř `crossLinks.smithy = '/smithy/#armor=' + it.id`.
   - Pro jídla a medoviny z provisions:
     - Zařaď do kategorií `food`, `mead`.
     - Vytáhni suroviny a stanici (Cauldron, Fermenter...).
     - Vytvoř `crossLinks.provisions = '/provisions/#food=' + it.id` (či `#mead=`).
   - Pro komfort z `comfort.json`:
     - Zařaď do kategorie `building`.
     - Vytvoř `crossLinks.comfort = '/comfort/'`.
   - Pro položky z `traders.json`:
     - Zařaď do kategorie `valuable`.
     - Vytvoř `crossLinks.traders = '/traders/#trader=' + traderId`.
   - Postav kompletní obousměrný index `usedIn`:
     - Každá surovina má pole receptů, ve kterých figuruje (zbraně, zbroje, jídla, medoviny, komfort, stavby).
   - Generuj:
     - `data/items-compendium.json`
     - `apps/items/data/data.js` ve tvaru `globalThis.VC_ITEMS_DATA = { items: [...] };`
2. Napiš rozšířené testy v `scripts/items.test.mjs`:
   - Celkový počet itemů >= 700.
   - `iron-sword` existuje, má kategorii `weapon`, suroviny `Iron` a `Wood`, stanici `Forge`, crossLink do Smithy.
   - `root-harnesk` existuje, má kategorii `armor`, suroviny `Root`, `Elder Bark` a `Deer Hide`.
   - `sausages` existuje, má kategorii `food`, suroviny `Entrails`, `Raw Meat` a `Thistle`.
   - `copper` má v `usedIn` zbraně a zbroje.
   - `megingjord` existuje s odkazem do Trader Ledgeru.
3. Spusť `node scripts/build-items-data.mjs && node --test scripts/items.test.mjs`.
4. Commit: `VC-40b: expand items compendium to full game catalog with 750+ items [GL/glm]`

---

### KROK 3: Webová aplikace Items Compendium (commit)

1. V `apps/items/index.html`:
   - Uprav `<select id="category-select">` s novými možnostmi (Weapons & Tools, Armor & Shields, Food & Mead, Metals & Ores, Monster Drops, Trophies, Building & Comfort, Valuables & Traders, Boss Summoning).
2. V `apps/items/assets/app.js`:
   - Uprav filtrování podle kategorií.
   - V kartě položky: zobraz ikonu/placeholder, název, biome badge, tier, kategorii, váhu/stack, štítek „Can't be teleported“.
   - V modalu:
     - Hlavička s obrázkem, názvem, biomem, kategorií, stackem, váhou.
     - Sekce **Crafting Recipe**: tabulka/seznam surovin s počty a klikacími odkazy na danou surovinu v kompendiu (`/items/#item=<id>`). Stanice a požadovaný level.
     - Sekce **Stats**: přehledné statistiky (Damage hodnoty u zbraní, Armor u zbrojí, HP/Stamina/Eitr u jídel).
     - Sekce **Sources (Where to find)**: zdroje (těžba, sběr, příšery s odkazy do Bestiary, obchodník s odkazem do Trader Ledgeru).
     - Sekce **Used in (Crafting recipes)**: přehled všech věcí, co z tohoto materiálu lze vyrobit, s klikacími odkazy do kompendia.
     - Tlačítka přímého prokliku (Open in Smithy, Open in Provisions, Open in Comfort Planner, Open in Trader Ledger, Open in Bestiary).
     - Tlačítko **Add to Cart** s výběrem množství napojené na `VCShopping`.
3. V `apps/items/assets/styles.css`:
   - Dolaď stylování sekcí v modalu (recepty, statistiky, tlačítka prokliků) tak, aby bylo přehledné, responzivní a na 360 px mobilu nepůsobilo přetečení.
4. Commit: `VC-40b: items compendium rich modal with recipes, stats and cross-links [GL/glm]`

---

### KROK 4: Lokalizace a integrace (commit)

1. Přidej všechny nové překladové řetězce do `apps/items/locales/messages.json` ve všech 13 jazycích (cs, de, es, fr, pt, pl, ru, ja, id, zh, bn, hi, ar).
2. Spusť `node scripts/build-site.mjs` pro vygenerování `locales/messages.js`.
3. Ověř `scripts/plural-rendering.test.mjs` a `node --test 'scripts/**/*.test.mjs'`.
4. Commit: `VC-40b: items compendium 13 languages localization and platform build [GL/glm]`

---

### KROK 5: Přejímka a ověření

1. Spusť všechny testy repozitáře:
   - `node --test 'scripts/**/*.test.mjs'`
   - `npm --prefix apps/damage-calculator test`
   - `npm --prefix apps/signs test`
2. Zkontroluj mobilní layout na 360 px ve všech 13 jazycích:
   - `node scripts/preview.mjs 5194` na pozadí
   - `node scripts/check-mobile.mjs 5194`
   - Ukonči preview server.
3. Ověř čistotu gitu (`git status`).
