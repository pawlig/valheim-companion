🚨 PRACUJEŠ VÝHRADNĚ VE STROMU {{STROM}} (větev {{VETEV}}).
⛔ /Users/paveldvorak/gameroot/valheim-units (bez přípony) NIKDY — ani čtení, ani zápis, ani příkaz s touhle cestou. ⛔ /Users/paveldvorak/gameroot/marchbound taky ne.
Všechny cesty níž jsou relativní k {{STROM}}.
Commituj jen do své větve {{VETEV}}, po krocích, soubory výčtem (⛔ `git add -A`). ⛔ push, merge, rebase. Každý příkaz pouštěj zvlášť a synchronně. Kód a commity ANGLICKY.
⚠️ Zásady Pavla: názvy z hry zůstávají anglicky, UI je ve 13 jazycích (0 chybějících překladů), bez spoilerů (zamykání podle `VCProgress`). Texty s číslem jdou přes `tn`.
⛔ Nevěř číslům v `docs/STAV.md` ani v commitech VC-40c–f — zdroj pravdy je wiki cache v `data/raw/`.

# VC-44 (rozbor) — dostupnost úrovní stanic a kvalit předmětů po biomech

## Podnět Pavla (10. 10. 2026)
„Testovali jsme, jak se odemykají některé věci, a zjistil jsem, že uvádíme, že Carapace armor je dostupný na Mistlands do lvl 4, ale tak to není — v rámci Mistlands je dostupný jen do lvl 2. Bylo by vhodné sjednotit v rámci celého companiona, aby se počítalo s tím, co je dostupné — třeba nemůžeš udělat lvl 3 Black Forge. Prověřit, co je opravdu kde dostupné kvůli tomu, jaké úrovně rozšíření stolů jsou v biomu dostupné. To jsme dosud neřešili.“

## Co je výstup
**Jen rozbor a návrh, žádný kód.** Soubor `docs/audit/ROZBOR-STATION-LEVELS.md` (česky), commit do větve `{{VETEV}}`. Bude z něj orchestrátor psát zadání pro levné prováděče — balíky musí splnit laťku „Luna by je provedla bez jediné otázky“ (soubory, řádky, rozhodnuté varianty, měřitelné „hotovo, když“).

## Co zjistit (zdroj pravdy = wiki cache `data/raw/` přes `scripts/wiki/api.mjs`; chybějící stránky si stáhni přes `api.getWikitext`, ⛔ ne odhad z hlavy ani z `docs/`)
1. **Stanice a jejich rozšíření.** Pro každou výrobní stanici, kterou companion používá (Workbench, Forge, Black Forge, Galdr Table, Artisan Table, Stonecutter, Cauldron, Fermenter, Spinning Wheel…, plus ty, které se objeví v receptech ve `data/weapons.json`, `data/armor.json`, `data/items.json`, provisions): seznam rozšíření (název, úroveň stanice, kterou dává, materiály). Pro každé rozšíření **nejranější biom**, kde je postavitelné = nejvyšší biom jeho materiálů (+ stanice, na které se staví). Biomy materiálů ber ze stejného zdroje, jaký používá web (`data/items.json`, `data/items-compendium.json`) — a kde se liší od wiki, zapiš to jako nález.
2. **Max úroveň stanice po biomech** (tabulka stanice × biom).
3. **Kvality předmětů.** Pro každou zbraň, zbroj (kus), štít, nástroj, munici: pro každou kvalitu potřebná úroveň stanice (najdi, kde to data mají — `levels[]`, `stationLevel`, recept — a kde ne, odkud to vzít z wiki) a z toho **nejranější biom, kde je kvalita vyrobitelná** = max(biom materiálů té kvality, biom, kde jde stanice na potřebnou úroveň). Ověř na Carapace armor (Pavel: v Mistlands jen Q2) a na 10 dalších namátkových kusech napříč biomy proti wiki; vypiš, kolik kusů/kvalit se dnes v companionu ukazuje jako dostupné dřív, než ve skutečnosti jsou.
4. **Kde companion předpokládá dostupnost** — inventura s cestami a řádky: Smithy (nabídka kvalit, doporučení podle biomu, košík), doporučení zbraní (`scripts/recommend.mjs`, `data/recommendations.json`, Bestiary, Damage Calculator — jakou kvalitu předpokládají), Items Compendium (biom položky), Expedition (příprava na bosse), Provisions (Cauldron úrovně — už má `progressionLevel`?), Comfort, Progress (`shared/progress/core.js`). U každého: co dnes dělá špatně a jak by to mělo být.
5. **Návrh dat:** kde držet úrovně stanic a jejich biom (např. rozšířit `data/stations.json` o `upgrades[]`/`levels[]` — pozor, soubor skládají 4 fetchery, viz `docs/DATA-SCHEMA.md` § `data/stations.json`), a jak k úrovním kvality přidat pole typu `availableFrom: <biomeId>`; který skript to počítá (fetcher vs build), aby to bylo reprodukovatelné a idempotentní.
6. **Balíky oprav** O-1 … O-n v pořadí závislostí (data → generátory → UI aplikací → testy → dokumentace), u každého soubory, kroky, testy, „hotovo, když“, odhad velikosti (malý/normální/velký) a doporučený typ prováděče.
7. **Otázky pro Pavla** zvlášť na konci (např. má se nedostupná kvalita v biomu skrýt, nebo ukázat zamčená s důvodem „Black Forge 3 — dostupné v Ashlands“?; počítat s Haldorovými/obchodními předměty?), u každé 2–4 varianty s důsledky a tvoje doporučení.

## ⛔ Nesahat
Žádné změny kódu ani dat (jen nový `.md` a případně stažení chybějících stránek do cache `data/raw/` — ty commitni zvlášť, ať je rozbor reprodukovatelný). Jiné stromy, push, merge.

## Rozpočet
Čti cíleně (`grep`, `node -e` dotazy na JSON), ne celé velké soubory. `docs/STAV.md` nečti.

## Hotovo, když
- `docs/audit/ROZBOR-STATION-LEVELS.md` obsahuje body 1–7, každé tvrzení o hře má odkaz na wiki stránku (název) z cache, tabulka stanice × biom je úplná.
- Carapace armor: uvedeno přesně, která kvalita je od kterého biomu a proč.
- Do odpovědi: 10 řádků shrnutí (hlavní čísla, počet balíků, otázky) a commity.
