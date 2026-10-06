/**
 * Valheim wiki scraper.
 *
 * Pulls weapon, ammo, recipe and boss data from
 * https://valheim.weirdgloop.org/wiki/Valheim_Wiki through the MediaWiki API
 * and writes normalised JSON into src/data/.
 *
 * Run with:  npm run scrape
 *
 * Why this wiki and not Fandom:
 *  - The community wiki moved to weirdgloop and only that one is current. The
 *    Fandom copy still describes the game as it was before the Deep North: no
 *    Kall Fimbulbringer, no Nord/Frostfire/Thunderblood families, no Bloodgold
 *    arrows, no Frost Foundry.
 *  - Its image CDN also serves files without a referer, unlike Fandom's, so
 *    images download without the referer workaround.
 *
 * Notes on the source shape:
 *  - There is no Cargo / Semantic MediaWiki, so data lives inside templates:
 *    {{infobox weapon}}, {{infobox creature}} and the "Upgrade information" table.
 *  - The upgrade table is the authoritative source for per-quality damage. The
 *    infobox only carries the quality-1 value plus an optional "X per level"
 *    upgrade increment, and that increment is frequently missing even when the
 *    item does scale, so the table is preferred and the infobox is the fallback.
 *  - Recipes are in the same infobox: `source` (station), `crafting level` and
 *    `materials 1..4` (one list per quality), plus `quantity` for consumables.
 *    Availability is *derived* from those recipes — see deriveBiome below.
 *  - The Creatures overview page groups every aggressive creature by biome and
 *    lists Hildir's minibosses separately. That page is the creature roster;
 *    each creature's own infobox supplies health, resistances and artwork.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { BIOMES, BIOME_NAME, BIOME_ORDER, type BiomeId } from "../src/data/biomes";
import {
  ITEM_BIOME_OVERRIDE,
  MATERIAL_BIOME,
  STATION_BIOME,
  normalizeName,
} from "../src/data/materials";
import {
  ALL_DAMAGE_TYPES,
  type Ammo,
  type Creature,
  type CreatureKind,
  type DamageType,
  type Recipe,
  type RecipeBook,
  type RecipeMaterial,
  type Weapon,
} from "../src/lib/types";
import type { WeaponClass } from "../src/data/weapon-class";

const API = "https://valheim.weirdgloop.org/api.php";
const WIKI = "https://valheim.weirdgloop.org/wiki/";
const UA = "ValheimBossDamageCalc/1.0 (personal fan tool; data from valheim.weirdgloop.org)";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "src", "data");
const IMAGE_DIR = join(ROOT, "public", "items");

/* ------------------------------------------------------------------ *
 * Damage types — imported from the app (see the import block) rather than
 * duplicated here, so the scraper and the engine cannot drift apart. The
 * wiki's taxonomy (https://valheim.weirdgloop.org/wiki/Damage) files Chop,
 * Pickaxe and Pure under *terrain* damage, which is why the engine counts
 * terrain damage only against targets with an explicit chop/pickaxe modifier.
 * Every item's terrain values are still scraped and committed for
 * completeness.
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 * Small HTTP helper
 * ------------------------------------------------------------------ */

async function api<T>(params: Record<string, string>, attempt = 0): Promise<T> {
  const url = `${API}?${new URLSearchParams({ format: "json", formatversion: "2", ...params })}`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) {
    if (attempt < 3) {
      await sleep(500 * (attempt + 1));
      return api<T>(params, attempt + 1);
    }
    throw new Error(`API ${res.status} for ${url}`);
  }
  const json = (await res.json()) as T;
  return json;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Parse wiki numbers, tolerating thousands separators ("12,500"), refs and
 *  stray text. Returns undefined when nothing numeric is present. */
function parseNum(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined;
  const m = /-?\d[\d,]*(?:\.\d+)?/.exec(raw);
  if (!m) return undefined;
  const n = Number(m[0].replace(/,/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

/* ------------------------------------------------------------------ *
 * Wikitext parsing helpers
 * ------------------------------------------------------------------ */

/** Extract a balanced `{{...}}` template starting at `start`, ignoring nested
 *  braces and `[[...]]` link brackets. */
function sliceBalancedBraces(text: string, start: number): string {
  let depth = 0;
  let i = start;
  while (i < text.length) {
    if (text.startsWith("{{", i)) {
      depth++;
      i += 2;
      continue;
    }
    if (text.startsWith("}}", i)) {
      depth--;
      i += 2;
      if (depth === 0) return text.slice(start, i);
      continue;
    }
    i++;
  }
  return text.slice(start);
}

/** Split a template body on top-level `|` characters. */
function splitTopLevel(inner: string): string[] {
  const parts: string[] = [];
  let cur = "";
  let depth = 0;
  let i = 0;
  while (i < inner.length) {
    if (inner.startsWith("{{", i) || inner.startsWith("[[", i)) {
      depth++;
      cur += inner.slice(i, i + 2);
      i += 2;
      continue;
    }
    if (inner.startsWith("}}", i) || inner.startsWith("]]", i)) {
      depth--;
      cur += inner.slice(i, i + 2);
      i += 2;
      continue;
    }
    const c = inner[i];
    if (c === "|" && depth === 0) {
      parts.push(cur);
      cur = "";
      i++;
      continue;
    }
    cur += c;
    i++;
  }
  parts.push(cur);
  return parts;
}

/** Parse `{{infobox weapon|...}}` / `{{infobox creature|...}}` into a field
 *  map. Some creature pages spell the template `{{Infobox_creature}}`, so the
 *  separator between the words may be a space or an underscore. */
function parseInfobox(text: string, kind: string): Record<string, string> | null {
  const re = new RegExp(`\\{\\{\\s*infobox[\\s_]+${kind}`, "i");
  const m = re.exec(text);
  if (!m) return null;
  const body = sliceBalancedBraces(text, m.index);
  const inner = body.slice(2, -2);
  const fields: Record<string, string> = {};
  for (const part of splitTopLevel(inner).slice(1)) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim().toLowerCase();
    const value = part.slice(eq + 1).trim();
    if (value) fields[key] = value;
  }
  return fields;
}

/** Pull the damage table out of a weapon page.
 *
 * The heading is not consistent across the wiki: the old weapons use
 * "Upgrade information" and the Deep North chain (Nord / Frostfire /
 * Thunderblood, including the fist knucklechains) uses "Upgrading", often
 * preceded by an unrelated "Mould" section. Both are matched; the first
 * section that carries a table wins. */
function extractUpgradeTable(text: string): string | null {
  const heading = /==+\s*(?:Upgrade information|Upgrading)\s*==+/i.exec(text);
  if (!heading) return null;
  const after = text.slice(heading.index + heading[0].length);
  const next = after.search(/\n==[^=]/);
  const section = next === -1 ? after : after.slice(0, next);
  const start = section.indexOf("{|");
  if (start === -1) return null;
  const end = section.indexOf("\n|}", start);
  return section.slice(start, end === -1 ? undefined : end);
}

const LABEL_ALIASES: Record<string, DamageType> = {
  blunt: "blunt",
  pierce: "pierce",
  slash: "slash",
  fire: "fire",
  frost: "frost",
  lightning: "lightning",
  poison: "poison",
  spirit: "spirit",
  chop: "chop",
  pickaxe: "pickaxe",
};

/** Map a table row label ("Chop (trees)", "Blunt", " Pierce") to a damage type. */
function labelToDamageType(label: string): DamageType | null {
  const clean = label.replace(/\(.*?\)/g, "").trim().toLowerCase();
  return LABEL_ALIASES[clean] ?? null;
}

/** Parse the upgrade table into { damageType: number[] } keyed by quality 1..4.
 *
 * Cells are read *positionally*, because they are not all filled in: the
 * Mistwalker's Spirit row is blank at quality 1 and then reads 5/10/15/20, so
 * collecting the numbers and taking the first four shifts every value up by
 * one quality and invents a quality-1 value that does not exist. Reading the
 * cells instead treats the blank as zero.
 *
 * Tables may also carry more than four quality columns — the Deep North update
 * added a fifth, unlocked at the Forge of Potential — so only the first four
 * are kept. */
function parseUpgradeTable(table: string): Partial<Record<DamageType, number[]>> {
  const out: Partial<Record<DamageType, number[]>> = {};
  const rows = table.split(/\n\|-/);
  for (const row of rows) {
    const label = /!\s*([^\n!|]+)/.exec(row);
    if (!label) continue;
    const type = labelToDamageType(label[1]);
    if (!type) continue;
    const values = row
      .slice(label.index + label[0].length)
      .split("\n")
      .map((line) => /^\s*\|(.*)$/.exec(line)?.[1] ?? null)
      .filter((cell): cell is string => cell !== null)
      .map((cell) => parseNum(cell) ?? 0);
    if (values.length >= 4) out[type] = values.slice(0, 4);
  }
  return out;
}

/** Fallback per-quality damage derived from the infobox base + "X per level". */
function damageFromInfobox(
  fields: Record<string, string>,
): Partial<Record<DamageType, number[]>> {
  const out: Partial<Record<DamageType, number[]>> = {};
  for (const type of ALL_DAMAGE_TYPES) {
    const base = Number(fields[type]);
    if (!Number.isFinite(base)) continue;
    const perLevel = Number(fields[`${type} per level`] ?? 0) || 0;
    out[type] = [0, 1, 2, 3].map((i) => base + i * perLevel);
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Classification
 * ------------------------------------------------------------------ */

type Classification = {
  cls: WeaponClass;
  label: string;
  wielding: "one-handed" | "two-handed" | "ranged" | "magic";
};

function classify(type: string): Classification | null {
  const t = type.replace(/[[\]]/g, "").trim().toLowerCase();
  switch (t) {
    case "axe":
    case "axe 1h":
      return { cls: "axe", label: "One-handed Axe", wielding: "one-handed" };
    case "axe 2h":
      return { cls: "battleaxe", label: "Battleaxe (2H Axe)", wielding: "two-handed" };
    case "axe dw":
      return { cls: "dual-axe", label: "Dual-wielded Axes", wielding: "one-handed" };
    case "club":
    case "club 1h":
      return { cls: "club", label: "One-handed Club", wielding: "one-handed" };
    case "club 2h":
      return { cls: "sledge", label: "Sledgehammer (2H Club)", wielding: "two-handed" };
    case "sword":
      return { cls: "sword", label: "Sword", wielding: "one-handed" };
    case "sword 2h":
      return { cls: "greatsword", label: "Two-handed Sword", wielding: "two-handed" };
    case "knife":
      return { cls: "knife", label: "Knife", wielding: "one-handed" };
    case "knife 2h":
      return { cls: "knife", label: "Dual-wielded Knives", wielding: "one-handed" };
    case "spear":
      return { cls: "spear", label: "Spear", wielding: "one-handed" };
    case "polearm":
      return { cls: "atgeir", label: "Polearm (Atgeir)", wielding: "two-handed" };
    case "fists":
      return { cls: "fists", label: "Unarmed", wielding: "one-handed" };
    case "bow":
      return { cls: "bow", label: "Bow", wielding: "ranged" };
    case "crossbow":
      return { cls: "crossbow", label: "Crossbow", wielding: "ranged" };
    case "elemental magic":
      return { cls: "staff", label: "Elemental Staff", wielding: "magic" };
    case "blood magic":
      return { cls: "blood-staff", label: "Blood Magic Staff", wielding: "magic" };
    case "pickaxe":
      return { cls: "pickaxe", label: "Pickaxe", wielding: "one-handed" };
    case "bomb":
      return { cls: "bomb", label: "Bomb", wielding: "one-handed" };
    case "missile":
      return { cls: "missile", label: "Ballista Missile", wielding: "ranged" };
    case "catapult ammo":
      return { cls: "siege", label: "Catapult Ammo", wielding: "ranged" };
    default:
      return null; // shields, tools without damage, index pages, misc
  }
}

type AmmoKind = "arrow" | "bolt";

function classifyAmmo(type: string): AmmoKind | null {
  const t = type.replace(/[[\]]/g, "").trim().toLowerCase();
  if (t === "arrow" || t === "arrows") return "arrow";
  if (t === "bolt" || t === "bolts") return "bolt";
  return null;
}

/** Display name for an item: prefer the infobox title, but fall back to the
 *  page title when it is a parser function like {{PAGENAME}}. */
function displayName(fields: Record<string, string>, pageTitle: string): string {
  const t = fields["title"];
  if (!t || t.includes("{{")) return pageTitle;
  return t;
}

/** First file name in an image field, which may be a gallery template
 *  (Kall Fimbulbringer lists one image per phase). */
function firstImageFile(raw: string): string {
  const gallery = /\{\{\s*InfoboxGallery\s*\|([^|}\n]+)/i.exec(raw);
  return (gallery ? gallery[1] : raw).split("|")[0].replace(/^File:/i, "").trim();
}

/** Category index pages: listed as category members, but they are overviews
 *  rather than items (their "members" are the real items). */
const INDEX_PAGES = new Set([
  "Weapons",
  "Ammunition",
  "Arrows",
  "Bolts",
  "Axes",
  "Blood magic",
  "Blob Bombs",
  "Bombs",
  "Bows",
  "Clubs",
  "Crossbows",
  "Elemental magic",
  "Fists",
  "Knives",
  "Magic",
  "Missiles",
  "Pickaxes",
  "Polearms",
  "Shields",
  "Spears",
  "Swords",
  "Wooden Weapons",
]);

/** Pages that match the category but are not player weapons we want to model.
 *  Every entry here is a decision, not an accident: the roster self-check at
 *  the end of main() fails when a page is dropped for any *other* reason, so a
 *  weapon can never leave the dataset just because the wiki re-typed it. */
const EXCLUDE_PAGES = new Set([
  "Sparkler", // firework, no combat value
  "Dvergr Lantern", // light source
  "Butcher Knife", // utility knife, no damage
  "Dead Raiser", // summon staff, damage comes from the skeleton
  "Spirit Caller", // Deep North summon staff; typed Blood Magic, no damage of its own
  "Staff of Protection", // defensive bubble
  "Trollstav", // summon staff (blood magic)
  "Voidcaller", // drop whose recipe is disabled in the current build
  "Basalt Bomb", // Ashlands explosive whose page documents knockback only, no damage
  "Salvaged Lantern", // Deep North relic torch; typed Club 1h but deals no damage
]);

/** Weapon-typed pages that are filed under the weapon categories yet never deal
 *  damage (shields, terrain tools and the like). They are recognised from the
 *  infobox `type` so the roster self-check does not have to list each shield by
 *  hand, and so a real weapon can never hide behind a generic "no damage" skip. */
const NON_COMBAT_TYPE = /(?:^|\s)(?:shield|shovel|tool|torch|building|banner)\b/i;

/* ------------------------------------------------------------------ *
 * Slug + image helpers
 * ------------------------------------------------------------------ */

const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const wikiUrl = (title: string) => WIKI + encodeURIComponent(title.replace(/ /g, "_"));

const IMAGE_CACHE = new Map<string, string>();

/** Resolve File:Name.png references into real, hotlinkable thumbnail URLs. */
async function resolveImages(fileNames: string[]): Promise<void> {
  const missing = [...new Set(fileNames)].filter(
    (n) => n && !IMAGE_CACHE.has(n.toLowerCase()),
  );
  for (let i = 0; i < missing.length; i += 40) {
    const batch = missing.slice(i, i + 40);
    const data = await api<{
      query: {
        pages: {
          title: string;
          imageinfo?: { thumburl?: string; url?: string }[];
        }[];
      };
    }>({
      action: "query",
      titles: batch.map((n) => `File:${n}`).join("|"),
      prop: "imageinfo",
      iiprop: "url",
      iiurlwidth: "256",
    });
    for (const page of data.query.pages) {
      const name = page.title.replace(/^File:/, "").toLowerCase();
      const info = page.imageinfo?.[0];
      IMAGE_CACHE.set(name, info?.thumburl ?? info?.url ?? "");
    }
    await sleep(120);
  }
}

const imageUrl = (file?: string) =>
  file ? IMAGE_CACHE.get(file.replace(/^File:/, "").toLowerCase()) ?? "" : "";

/* ------------------------------------------------------------------ *
 * Image localisation
 *
 * weirdgloop's CDN serves files to any referer, so unlike the old Fandom
 * source there is no hotlink restriction to work around. The scraper still
 * downloads each image once and the app serves it from /items/*, so the Docker
 * image stays self-contained and the page keeps working offline.
 * ------------------------------------------------------------------ */

const extensionOf = (url: string): string => {
  const withoutRevision = url.split("/revision/")[0];
  const match = /\.(png|jpe?g|webp|gif|svg)$/i.exec(withoutRevision);
  return match ? match[1].toLowerCase() : "png";
};

async function downloadImage(
  remote: string,
  slug: string,
  referer: string,
): Promise<string> {
  if (!remote) return "";
  const rel = `${slug}.${extensionOf(remote)}`;
  const dest = join(IMAGE_DIR, rel);
  if (existsSync(dest)) return `/items/${rel}`;

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(remote, {
      headers: { "User-Agent": UA, Referer: referer },
    });
    if (res.ok) {
      mkdirSync(IMAGE_DIR, { recursive: true });
      writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
      return `/items/${rel}`;
    }
    await sleep(300 * (attempt + 1));
  }
  console.warn(`  ! could not download ${remote}; falling back to the remote URL`);
  return remote;
}

/** Fallback for pages whose infobox has no `image` field.
 *
 * The file named after the page wins ("Frostfire Dagger.png" on "Frostfire
 * Dagger"). Taking merely the first image on the page is wrong for these
 * pages: a Frostfire Dagger page lists its *ingredients* as images first, so
 * the first candidate is Bloodgold.png — a material icon. When no page-named
 * file exists we take the first plausible one and say so, and when the page
 * has no images at all the item keeps an empty image and the UI draws its
 * placeholder. */
const IGNORED_IMAGE = /(logo|icon|favicon|site-|wiki|ambox|disambig|spoiler|stub|nav)/i;

const imageStem = (name: string) =>
  name.toLowerCase().replace(/^file:/, "").replace(/\.(png|jpe?g|webp|gif)$/i, "").replace(/[_-]+/g, " ").trim();

async function resolvePageImages(titles: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  /* One page per request on purpose: `imlimit` caps the number of images
   * returned for the whole response, so batching titles silently leaves every
   * page after the first few with no images at all. */
  for (const title of titles) {
    const data = await api<{
      query: {
        pages: { title: string; images?: { title: string }[] }[];
      };
    }>({
      action: "query",
      titles: title,
      prop: "images",
      imlimit: "50",
    });
    for (const page of data.query.pages) {
      const names = (page.images ?? []).map((img) => img.title.replace(/^File:/, ""));
      const named = names.find((name) => imageStem(name) === imageStem(page.title));
      const chosen = named ?? names.find((name) => !IGNORED_IMAGE.test(name));
      if (!chosen) continue;
      if (!named) {
        console.warn(`  ! ${page.title}: no image named after the page; using ${chosen}`);
      }
      out.set(page.title, chosen);
      imageFilesForFallback.push(chosen);
    }
    await sleep(120);
  }
  return out;
}

const imageFilesForFallback: string[] = [];

/* ------------------------------------------------------------------ *
 * Fetching
 * ------------------------------------------------------------------ */

/** Members of a wiki category, split into pages and subcategories. */
async function categoryMembers(
  category: string,
): Promise<{ pages: string[]; subcategories: string[] }> {
  const data = await api<{ query: { categorymembers: { title: string }[] } }>({
    action: "query",
    list: "categorymembers",
    cmtitle: `Category:${category}`,
    cmlimit: "500",
  });
  const titles = data.query.categorymembers.map((m) => m.title);
  return {
    pages: titles.filter((t) => !t.startsWith("Category:")),
    subcategories: titles
      .filter((t) => t.startsWith("Category:"))
      .map((t) => t.slice("Category:".length)),
  };
}

/** Pages in a category, plus every page filed under one of its subcategories.
 *
 * Not every weapon is listed directly in `Category:Weapons`: the fist weapons
 * all live in `Category:Unarmed`, so reading only the top category drops every
 * one of them except Bare Fists, which happens to be double-listed. Follow the
 * subcategories (breadth-first, guarded by a visited set) so a class the wiki
 * chooses to nest can never silently disappear from the dataset again. */
async function allCategoryMembers(category: string): Promise<string[]> {
  const pages = new Set<string>();
  const seen = new Set<string>();
  const queue = [category];
  while (queue.length > 0) {
    const name = queue.shift()!;
    if (seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    const { pages: direct, subcategories } = await categoryMembers(name);
    for (const page of direct) pages.add(page);
    queue.push(...subcategories);
  }
  return [...pages];
}

async function fetchWikitext(titles: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (let i = 0; i < titles.length; i += 40) {
    const batch = titles.slice(i, i + 40);
    const data = await api<{
      query: {
        pages: {
          title: string;
          revisions?: { slots: { main: { content: string } } }[];
        }[];
      };
    }>({
      action: "query",
      prop: "revisions",
      rvprop: "content",
      rvslots: "main",
      titles: batch.join("|"),
    });
    for (const page of data.query.pages) {
      const content = page.revisions?.[0]?.slots?.main?.content;
      if (content) {
        // Follow simple #REDIRECT pages.
        const redirect = /^#REDIRECT\s*\[\[([^\]]+)\]\]/i.exec(content.trim());
        if (redirect) continue;
        out.set(page.title, content);
      }
    }
    await sleep(120);
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Build
 * ------------------------------------------------------------------ */

type Quality = [number, number, number, number];

/* ------------------------------------------------------------------ *
 * Recipes → availability
 *
 * The wiki has no "available from" field, so it is derived from the recipe:
 * an item is reachable at the first biome by which its station, every material
 * in the recipe, and every *item* in the recipe can be obtained. Ingredient
 * items matter because the Ashlands and Deep North chains forge weapons *into*
 * other weapons — a Frostfire Sword needs a Nord Sword, so its station (Black
 * Forge, Ashlands) understates it and its materials make it Deep North gear.
 * ------------------------------------------------------------------ */

/** Ingredient list of one recipe line. The wiki uses two forms:
 *  "* [[Silver]] x30" and "* {{item link|Ice|2}}" (the template carries the
 *  quantity as its second parameter, the link form spells it after the name). */
function parseMaterials(field: string | undefined): RecipeMaterial[] {
  if (!field) return [];
  const out: RecipeMaterial[] = [];
  for (const line of field.split("\n")) {
    const link = /\[\[([^\]|]+)/.exec(line);
    const template = /\{\{\s*item\s*link\s*\|\s*([^|}\n]+?)\s*(?:\|\s*(\d+)\s*)?\}\}/i.exec(line);
    const name = link?.[1] ?? template?.[1];
    if (!name) continue;
    const spelled = /(?:x|×)\s*(\d+)|(\d+)\s*x\b/i.exec(line);
    const quantity = Number(template?.[2] ?? spelled?.[1] ?? spelled?.[2] ?? 1);
    out.push({
      name: name.replace(/_/g, " ").replace(/\s+/g, " ").trim(),
      quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
    });
  }
  return out;
}

/** Recipe of an item, or null when the page does not document one. */
function parseRecipe(fields: Record<string, string>): Recipe | null {
  const stationRaw = fields["source"];
  if (!stationRaw) return null;
  const station = stationRaw.replace(/\[\[|\]\]/g, "").split("|")[0].trim();
  const qualities: RecipeMaterial[][] = [];
  for (let q = 1; q <= 4; q++) qualities.push(parseMaterials(fields[`materials ${q}`]));
  if (qualities.every((m) => m.length === 0)) return null;
  const quantity = parseNum(fields["quantity"]);
  return {
    station,
    stationLevel: parseNum(fields["crafting level"]) ?? 1,
    qualities,
    quantity: quantity && quantity > 1 ? quantity : undefined,
  };
}

/** Weapon class → ranking group. */
function groupFor(cls: WeaponClass): Weapon["group"] {
  if (cls === "bow" || cls === "crossbow") return "ranged";
  if (cls === "staff" || cls === "blood-staff") return "magic";
  if (cls === "bomb") return "consumable";
  if (cls === "missile" || cls === "siege") return "siege";
  return "melee";
}

/** Recipes that could not be mapped to a biome, and why — reported, never
 *  guessed at. The scrape fails when either list is non-empty. */
const missingMaterials = new Set<string>();
const missingStations = new Set<string>();
const unmappedItems: string[] = [];
const unmappedCreatures: string[] = [];

const maxBiome = (a: BiomeId | null, b: BiomeId | null): BiomeId | null =>
  a === null ? b : b === null ? a : BIOME_ORDER[a] >= BIOME_ORDER[b] ? a : b;

/** A biome named in the station field itself, which the wiki does for items
 *  that need no station ("Crafted by hand, Deep North"). */
function biomeNamedIn(raw: string): BiomeId | null {
  const text = raw.toLowerCase();
  let found: BiomeId | null = null;
  for (const biome of BIOMES) {
    if (text.includes(biome.name.toLowerCase())) found = maxBiome(found, biome.id);
  }
  return found;
}

/** Crafting station -> biome, e.g. "Crafting_Menu#Player_Inventory" -> meadows. */
function stationBiome(raw: string): BiomeId | null {
  const cleaned = normalizeName(raw).replace(/#.*$/, "").split(",")[0].trim();
  const mapped = STATION_BIOME[cleaned] ?? null;
  const named = biomeNamedIn(raw);
  if (!mapped && !named) missingStations.add(raw);
  return maxBiome(mapped, named);
}

/** First biome the item can be *crafted* in.
 *
 * Only the crafting recipe (`materials 1`) counts, not the upgrade levels: an
 * item becomes available the moment you can make one, even when its Q2-Q4
 * upgrades still need later materials. The UI clamps the upgrade selector to
 * the highest level that is actually reachable at the chosen biome, so the two
 * mechanisms stay separate on purpose.
 *
 * `tierOfItem` resolves ingredients that are themselves craftable items; it
 * returns null while an ingredient's own biome is still unknown. Returns null —
 * never a guess — when any ingredient is unmapped, so a hole in the material
 * table shows up as an unmapped *item* rather than silently placing the item in
 * whatever biome its station happens to sit in. */
function deriveBiome(
  recipe: Recipe,
  tierOfItem: (name: string) => BiomeId | null,
): BiomeId | null {
  let biome = stationBiome(recipe.station);

  for (const material of recipe.qualities[0] ?? []) {
    const key = normalizeName(material.name);
    const ingredient = tierOfItem(key);
    if (ingredient) {
      biome = maxBiome(biome, ingredient);
      continue;
    }
    const mapped = MATERIAL_BIOME[key];
    if (mapped) {
      biome = maxBiome(biome, mapped);
      continue;
    }
    missingMaterials.add(material.name);
    return null;
  }
  return biome;
}

/** The eight Forsaken, in ladder order. Biomes come from ./biomes.ts so the
 *  slider and the data cannot disagree about the progression order. */
const BOSS_PAGES: { title: string; biome: BiomeId; note?: string }[] = [
  { title: "Eikthyr", biome: "meadows" },
  { title: "The Elder", biome: "black-forest" },
  { title: "Bonemass", biome: "swamp" },
  { title: "Moder", biome: "mountain" },
  { title: "Yagluth", biome: "plains" },
  { title: "The Queen", biome: "mistlands" },
  { title: "Fader", biome: "ashlands" },
  {
    title: "Kall Fimbulbringer",
    biome: "deep-north",
    note: "Three phases (10,000 / 7,000 / 30,000 HP); immune to all damage during phase 2. Resistances shown are the ones the infobox publishes.",
  },
];

const RESISTANCE_FIELDS: Record<
  string,
  "very-weak" | "weak" | "resistant" | "very-resistant" | "immune"
> = {
  veryweak: "very-weak",
  weak: "weak",
  resistant: "resistant",
  veryresistant: "very-resistant",
  immune: "immune",
};

/* ------------------------------------------------------------------ *
 * Creatures → minibosses and regular enemies
 *
 * The wiki's Creatures overview page
 * (https://valheim.weirdgloop.org/wiki/Creatures) groups every aggressive
 * creature under its biome — the same nine steps as the item ladder — and
 * lists the four Hildir's Request minibosses in their own table. That page is
 * the roster; each creature's own infobox only supplies health, resistances
 * and artwork.
 *
 * Aggressive creatures never need a biome guess: the section they are listed
 * in *is* their biome. Minibosses sit in dungeons instead, so their biome is
 * read from the dungeon page's `location` field and resolved through the table
 * below; an unmapped dungeon fails the scrape.
 * ------------------------------------------------------------------ */

const CREATURES_PAGE = "Creatures";

/** Dungeon page -> biome, taken from each dungeon's own `location` field. */
const DUNGEON_BIOME: Record<string, BiomeId> = {
  "smouldering tomb": "black-forest", // Brenna; the name is misleading
  "howling cavern": "mountain", // Geirrhafa
  "sealed tower": "plains", // Zil & Thungr
  "tomb of lord reto": "ashlands", // Lord Reto
};

/** Notes that need wiki context the infobox does not carry. */
const CREATURE_NOTES: Record<string, string> = {
  "zil-thungr":
    "Two enemies: Thungr 4,200 HP + Zil 2,400 HP. Combined health shown; both must die.",
};

type CreatureRosterEntry = {
  title: string;
  name: string;
  kind: CreatureKind;
  /** Known for aggressive creatures (their section); minibosses resolve it
   *  from the dungeon location. */
  biome: BiomeId | null;
};

/** Body of a level-2 `== Heading ==` section, up to the next one. */
function sectionBody(text: string, heading: string): string | null {
  const lines = text.split("\n");
  const sameHeading = (line: string) =>
    /^==[^=]/.test(line) &&
    line.replace(/=/g, "").trim().toLowerCase() === heading.toLowerCase();
  const start = lines.findIndex(sameHeading);
  if (start === -1) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => /^==[^=]/.test(line));
  return (end === -1 ? rest : rest.slice(0, end)).join("\n");
}

/** Every `{| … |}` table of a wikitext fragment, as raw lines. */
function tableBlocks(text: string): string[] {
  const out: string[] = [];
  let current: string[] | null = null;
  for (const line of text.split("\n")) {
    if (line.startsWith("{|")) {
      current = [line];
      continue;
    }
    if (!current) continue;
    current.push(line);
    if (line.startsWith("|}")) {
      out.push(current.join("\n"));
      current = null;
    }
  }
  return out;
}

/** Split one wikitable into rows of cell text.
 *
 * Cells can span several lines (damage lists, gallery templates), so content
 * is accumulated until the next line that starts a cell or a row. */
function parseTableRows(table: string): string[][] {
  const rows: string[][] = [];
  let row: string[] | null = null;
  let cell: string[] = [];
  const flushCell = () => {
    if (row && cell.length) {
      row.push(cell.join("\n").trim());
      cell = [];
    }
  };
  const flushRow = () => {
    flushCell();
    if (row && row.length) rows.push(row);
    row = null;
  };
  for (const line of table.split("\n")) {
    if (line.startsWith("|}")) break;
    if (line.startsWith("|-")) {
      flushRow();
      row = [];
      continue;
    }
    if (line.startsWith("|")) {
      if (!row) row = [];
      flushCell();
      cell.push(line.replace(/^\|\s?/, ""));
      continue;
    }
    if (line.startsWith("!")) continue; // header row
    if (row && cell.length) cell.push(line);
  }
  flushRow();
  return rows;
}

/** First non-file wikilink of a row: the name cell of a creature table. */
function rowName(cells: string[]): { title: string; label: string } | null {
  for (const cell of cells) {
    const m = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/.exec(cell);
    if (!m) continue;
    const title = m[1].trim();
    if (title.startsWith("File:")) continue;
    return { title, label: (m[2] ?? title).trim() };
  }
  return null;
}

/** Roster of minibosses and aggressive creatures from the overview page. */
function parseCreatureRoster(page: string): CreatureRosterEntry[] {
  const out: CreatureRosterEntry[] = [];

  const minibosses = sectionBody(page, "Minibosses");
  if (minibosses) {
    for (const table of tableBlocks(minibosses)) {
      for (const cells of parseTableRows(table)) {
        const link = rowName(cells);
        if (link) {
          out.push({
            title: link.title,
            name: link.label,
            kind: "miniboss",
            biome: null,
          });
        }
      }
    }
  }

  const aggressive = sectionBody(page, "Aggressive creatures");
  if (aggressive) {
    let heading: string | null = null;
    let buffer: string[] = [];
    const flush = () => {
      if (!heading) return;
      const biome = BIOMES.find(
        (b) => b.name.toLowerCase() === heading!.toLowerCase(),
      )?.id;
      if (!biome) {
        unmappedCreatures.push(`biome section "${heading}" is not on the ladder`);
      } else {
        for (const table of tableBlocks(buffer.join("\n"))) {
          for (const cells of parseTableRows(table)) {
            const link = rowName(cells);
            if (link) {
              out.push({ title: link.title, name: link.label, kind: "enemy", biome });
            }
          }
        }
      }
      buffer = [];
    };
    for (const line of aggressive.split("\n")) {
      const m = /^===\s*([^=]+?)\s*===$/.exec(line);
      if (m) {
        flush();
        heading = m[1];
        continue;
      }
      if (heading) buffer.push(line);
    }
    flush();
  }

  return out;
}

/** Plain text of a small infobox value: links, refs and emphasis removed. */
function cleanWikiText(raw: string): string {
  return raw
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\[\[([^\]|]*\|)?([^\]]*)\]\]/g, "$2")
    .replace(/\{\{[^}]*\}\}/g, "")
    .replace(/'''?/g, "")
    .trim();
}

/** Resistance fields of a creature infobox into the app's shape.
 *
 * Chop and pickaxe are kept when — and only when — the wiki lists them
 * explicitly for the creature (Stone Golem is very weak to pickaxe, Kvastur
 * weak to chop); the engine counts terrain damage only against such targets.
 * Pure cannot come out of labelToDamageType and stays dropped, as do "Stagger"
 * and other non damage-type entries. */
function parseResistances(
  fields: Record<string, string>,
): Creature["resistances"] {
  const out: Creature["resistances"] = {};
  for (const [field, tier] of Object.entries(RESISTANCE_FIELDS)) {
    const value = fields[field];
    if (!value) continue;
    for (const entry of value.split(/[,\n]/)) {
      const type = labelToDamageType(cleanWikiText(entry));
      if (!type || type === "pure") continue;
      out[type] = tier;
    }
  }
  return out;
}

/** Health from an infobox field, plus how it was read.
 *
 * A plain value takes its first number. Labelled values need care:
 *  - Region lists ("Black Forest: 40") are variants of one creature, so the
 *    entry for the biome the roster lists it under is the right one. Skeleton
 *    is such a page.
 *  - Multi-enemy fields ("Thungr: 4200", "Zil: 2400") are one fight against
 *    all of them, so the numbers are summed. The caller warns about this path
 *    because it must stay a deliberate exception.
 * Variant fields with no labels (Root: "20 (The Elder)", "30 (Root Black
 * Forest)") keep the first value. */
function healthValue(
  raw: string | undefined,
  biome: BiomeId,
): { value: number; source: "plain" | "biome" | "sum" } | undefined {
  if (!raw) return undefined;
  const labelled = [...raw.matchAll(/([A-Za-z][A-Za-z '&]*):\s*(-?[\d,]+)/g)]
    .map((m) => ({
      label: m[1].trim().toLowerCase(),
      value: Number(m[2].replace(/,/g, "")),
    }))
    .filter((entry) => Number.isFinite(entry.value));
  if (labelled.length > 1) {
    const biomeName = BIOME_NAME[biome].toLowerCase();
    const forBiome = labelled.find((entry) => entry.label === biomeName);
    if (forBiome) return { value: forBiome.value, source: "biome" };
    return {
      value: labelled.reduce((sum, entry) => sum + entry.value, 0),
      source: "sum",
    };
  }
  const value = parseNum(raw);
  return value === undefined ? undefined : { value, source: "plain" };
}

/** Why a discovered page did not become an item in the dataset. The `code`
 *  decides whether the roster self-check accepts the drop or fails on it. */
type DropCode =
  | "redirect" // alias or empty page; the real page is listed under its own title
  | "excluded" // named in EXCLUDE_PAGES on purpose
  | "cheat" // developer-only item
  | "non-combat" // shield / shovel / other weapon-typed utility
  | "no-infobox" // category member that is not an item page at all
  | "no-damage" // item page with no damage values anywhere
  | "unknown-type"; // weapon infobox whose `type` the classifier does not know

/** Drops that are correct by definition. Anything else is a roster gap: the
 *  wiki listed a page and the dataset did not get it. */
const EXPECTED_DROPS = new Set<DropCode>([
  "redirect",
  "excluded",
  "cheat",
  "non-combat",
]);

async function main() {
  console.log("Fetching the weapon, arrow and bolt categories …");
  const listed = await Promise.all(
    ["Weapons", "Arrows", "Bolts"].map((c) => allCategoryMembers(c)),
  );
  const discovered = [...new Set(listed.flat())];
  const titles = discovered.filter((t) => !INDEX_PAGES.has(t));
  console.log(`  ${titles.length} pages`);

  /* The roster the previous run committed, read before we overwrite it. The
   * self-check at the end uses it to prove this run did not quietly lose an
   * item the dataset already had — which is what would happen if the category
   * crawl ever stopped reaching a class again. */
  const committed = new Map<string, string>();
  for (const file of ["weapons.json", "ammo.json"]) {
    const path = join(OUT_DIR, file);
    if (!existsSync(path)) continue;
    const items = JSON.parse(readFileSync(path, "utf8")) as {
      wikiTitle: string;
    }[];
    for (const item of items) committed.set(item.wikiTitle, file);
  }

  const bossTitles = BOSS_PAGES.map((b) => b.title);
  const text = await fetchWikitext([...titles, ...bossTitles]);

  type PendingWeapon = Omit<Weapon, "biome">;
  type PendingAmmo = Omit<Ammo, "biome">;

  const pendingWeapons: PendingWeapon[] = [];
  const pendingAmmo: PendingAmmo[] = [];
  /** slug -> recipe, for every item whose page documents one. */
  const recipes: RecipeBook = {};
  const skipped: string[] = [];
  /** Every page we deliberately did not turn into an item, and why. */
  const drops = new Map<string, { code: DropCode; detail: string }>();
  /** Wiki titles that did become weapons or ammo. */
  const emitted = new Set<string>();
  const imageFiles: string[] = [];

  const drop = (title: string, code: DropCode, detail: string) => {
    drops.set(title, { code, detail });
    skipped.push(`${title} (${detail})`);
  };

  for (const title of titles) {
    const page = text.get(title);
    if (!page) {
      drop(title, "redirect", "no content / redirect");
      continue;
    }
    if (EXCLUDE_PAGES.has(title)) {
      drop(title, "excluded", "excluded: not a combat weapon");
      continue;
    }
    const fields = parseInfobox(page, "weapon");
    if (!fields) {
      drop(title, "no-infobox", "no weapon infobox");
      continue;
    }
    const gameId = fields["id"] ?? "";
    if (/cheat/i.test(gameId) || /^cheat\b/i.test(title)) {
      drop(title, "cheat", "excluded: cheat item");
      continue;
    }
    const rawType = fields["type"] ?? "";
    /* Checked before the damage values on purpose: a shield or a shovel has
     * none, and "no damage values" must stay reserved for real weapons the
     * parser failed to read. */
    if (NON_COMBAT_TYPE.test(rawType.replace(/[[\]]/g, "").trim())) {
      drop(title, "non-combat", `excluded: non-combat type (${rawType})`);
      continue;
    }
    const image = fields["image"] ?? "";
    const fromInfobox = damageFromInfobox(fields);
    const table = extractUpgradeTable(page);
    const fromTable = table ? parseUpgradeTable(table) : {};

    // Cross-check table against infobox at quality 1 and report drift.
    for (const type of Object.keys(fromTable) as DamageType[]) {
      const a = fromTable[type]?.[0];
      const b = fromInfobox[type]?.[0];
      if (a !== undefined && b !== undefined && a !== b) {
        console.warn(
          `  ! ${title}: ${type} quality-1 mismatch (table ${a} vs infobox ${b}); using table`,
        );
      }
    }

    const damage: Partial<Record<DamageType, Quality>> = {};
    for (const type of ALL_DAMAGE_TYPES) {
      const v = fromTable[type] ?? fromInfobox[type];
      if (!v) continue;
      damage[type] = [v[0], v[1], v[2], v[3]] as Quality;
    }
    if (Object.keys(damage).length === 0) {
      drop(title, "no-damage", "no damage values");
      continue;
    }

    const slug = slugify(title);
    const recipe = parseRecipe(fields);
    if (recipe) recipes[slug] = recipe;
    if (image) imageFiles.push(firstImageFile(image));

    const ammoKind = classifyAmmo(rawType);
    if (ammoKind) {
      emitted.add(title);
      pendingAmmo.push({
        slug,
        name: displayName(fields, title),
        wikiTitle: title,
        wikiUrl: wikiUrl(title),
        image: "",
        kind: ammoKind,
        damage,
      });
      continue;
    }

    const cls = classify(rawType);
    if (!cls) {
      drop(title, "unknown-type", `excluded type: ${rawType}`);
      continue;
    }

    const stamina = parseNum(fields["stamina"]);
    /* Tooltip backstab bonus, which only some weapon pages publish ("3x").
     * Absent means "derive it from the class rule" — see backstabMultiplier()
     * in src/lib/damage.ts — not "backstabs for 1x". */
    const backstab = parseNum(fields["backstab"]);
    /* Bombs, ballista missiles and catapult ammo are crafted in batches with a
     * single damage value rather than upgrade levels, and no weapon skill
     * scales their damage. */
    const consumable =
      cls.cls === "bomb" || cls.cls === "missile" || cls.cls === "siege";

    pendingWeapons.push({
      slug,
      name: displayName(fields, title),
      wikiTitle: title,
      wikiUrl: wikiUrl(title),
      image: "",
      gameId,
      cls: cls.cls,
      clsLabel: cls.label,
      wielding: cls.wielding,
      group: groupFor(cls.cls),
      damage,
      scaledFromTable: Object.keys(fromTable).length > 0,
      stamina: Number.isFinite(stamina) ? stamina : undefined,
      backstab: backstab && backstab > 0 ? backstab : undefined,
      ammo: cls.cls === "bow" ? "arrow" : cls.cls === "crossbow" ? "bolt" : undefined,
      consumable: consumable || undefined,
      skillScaled: consumable ? false : undefined,
    });
    emitted.add(title);
  }

  /* --- availability: recipe → biome, resolving ingredient items first --- */
  const slugByName = new Map<string, string>();
  for (const item of [...pendingWeapons, ...pendingAmmo]) {
    slugByName.set(normalizeName(item.name), item.slug);
  }

  const biomeOf = new Map<string, BiomeId>();
  const tierOfItem = (name: string): BiomeId | null => {
    const slug = slugByName.get(name);
    return slug ? biomeOf.get(slug) ?? null : null;
  };

  let progress = true;
  while (progress) {
    progress = false;
    for (const item of [...pendingWeapons, ...pendingAmmo]) {
      if (biomeOf.has(item.slug)) continue;
      const recipe = recipes[item.slug];
      if (!recipe) continue;
      // Ingredient items must be placed before their dependants (Nord Sword
      // before Frostfire Sword, Slayer before Nidhögg, and so on).
      const pending = (recipe.qualities[0] ?? [])
        .map((m) => slugByName.get(normalizeName(m.name)))
        .filter((s): s is string => Boolean(s) && !biomeOf.has(s!));
      if (pending.length > 0) continue;
      const derived = deriveBiome(recipe, tierOfItem);
      if (!derived) continue; // unmapped ingredient: reported below, never guessed
      biomeOf.set(item.slug, derived);
      progress = true;
    }
  }

  const weapons: Weapon[] = [];
  const ammo: Ammo[] = [];
  for (const item of [...pendingWeapons, ...pendingAmmo]) {
    const biome =
      biomeOf.get(item.slug) ?? ITEM_BIOME_OVERRIDE[item.slug] ?? null;
    if (!biome) {
      const recipe = recipes[item.slug];
      unmappedItems.push(
        recipe
          ? `${item.name} (recipe resolves through unresolvable ingredients: ${[
              ...new Set((recipe.qualities[0] ?? []).map((m) => m.name)),
            ].join(", ")})`
          : `${item.name} (no recipe on the page)`.concat(
              pendingAmmo.some((a) => a.slug === item.slug) ? " [ammo]" : "",
            ),
      );
      continue;
    }
    if ("kind" in item) ammo.push({ ...item, biome });
    else weapons.push({ ...item, biome });
  }

  /* --- bosses --- */
  const bosses: Creature[] = [];
  for (const { title, biome, note } of BOSS_PAGES) {
    const page = text.get(title);
    if (!page) {
      console.warn(`  ! boss ${title}: not found`);
      continue;
    }
    const fields = parseInfobox(page, "creature");
    if (!fields) {
      console.warn(`  ! boss ${title}: no creature infobox`);
      continue;
    }
    const resistances = parseResistances(fields);
    const image = fields["image 0star"] ?? fields["image"] ?? "";
    if (image) imageFiles.push(firstImageFile(image));
    /* Multi-phase bosses write their health as "10000 + 7000 + 30000"; the
     * total is what time-to-kill should use, the phases are kept for context. */
    const phases = (fields["health 0star"] ?? fields["health"] ?? "")
      .split(/\+/)
      .map((part) => parseNum(part))
      .filter((n): n is number => n !== undefined && n > 0);
    bosses.push({
      slug: slugify(title),
      name: title,
      kind: "boss",
      wikiTitle: title,
      wikiUrl: wikiUrl(title),
      image: "",
      health: phases.reduce((sum, n) => sum + n, 0),
      healthPhases: phases.length > 1 ? phases : undefined,
      biome,
      resistances,
      note,
    });
  }

  /* --- creatures: Hildir's minibosses + regular aggressive creatures --- */
  const overview = (await fetchWikitext([CREATURES_PAGE])).get(CREATURES_PAGE);
  if (!overview) {
    throw new Error(`Could not fetch the ${CREATURES_PAGE} overview page`);
  }
  const roster = [
    ...new Map(
      parseCreatureRoster(overview).map((r) => [r.title, r] as const),
    ).values(),
  ];
  const minibossCount = roster.filter((r) => r.kind === "miniboss").length;
  const enemyCount = roster.filter((r) => r.kind === "enemy").length;
  console.log(
    `Creature roster: ${minibossCount} minibosses, ${enemyCount} enemies`,
  );

  const creaturePages = await fetchWikitext(roster.map((r) => r.title));
  for (const [title, content] of creaturePages) text.set(title, content);

  const enemies: Creature[] = [];
  for (const entry of roster) {
    const page = creaturePages.get(entry.title);
    if (!page) {
      unmappedCreatures.push(`${entry.title} (no page / redirect)`);
      continue;
    }
    const fields = parseInfobox(page, "creature");
    if (!fields) {
      unmappedCreatures.push(`${entry.title} (no creature infobox)`);
      continue;
    }

    let biome = entry.biome;
    if (entry.kind === "miniboss") {
      const location = cleanWikiText(fields["location"] ?? "");
      const named = BIOMES.find(
        (b) => b.name.toLowerCase() === location.toLowerCase(),
      )?.id;
      biome = named ?? DUNGEON_BIOME[location.toLowerCase()] ?? null;
      if (!biome) {
        unmappedCreatures.push(
          `${entry.title} (miniboss dungeon not mapped: ${location || "no location"})`,
        );
        continue;
      }
    }
    if (!biome) {
      unmappedCreatures.push(`${entry.title} (no biome)`);
      continue;
    }

    let rawHealth = fields["health 0star"] ?? fields["health"];
    let healthSource = "0star";
    if (!rawHealth && entry.kind === "miniboss") {
      // Unique minibosses can publish only the star level they always spawn
      // at — Lord Reto exists as a 2-star creature only.
      rawHealth = fields["health 2star"] ?? fields["health 1star"];
      healthSource = "starred";
    }
    const health = healthValue(rawHealth, biome);
    if (health === undefined) {
      unmappedCreatures.push(`${entry.title} (no health in the infobox)`);
      continue;
    }
    if (healthSource !== "0star") {
      console.warn(`  ! ${entry.title}: health taken from its ${healthSource} field`);
    }
    if (health.source === "sum") {
      console.warn(`  ! ${entry.title}: health summed over several labelled values`);
    }

    const image = fields["image 0star"] ?? fields["image"] ?? "";
    if (image) imageFiles.push(firstImageFile(image));

    const slug = slugify(entry.title);
    enemies.push({
      slug,
      name: entry.name,
      wikiTitle: entry.title,
      wikiUrl: wikiUrl(entry.title),
      image: "",
      kind: entry.kind,
      health: health.value,
      biome,
      resistances: parseResistances(fields),
      note: CREATURE_NOTES[slug],
    });
  }

  /* --- images --- */
  // Resolve wiki file names to CDN URLs first.
  console.log(`Resolving ${new Set(imageFiles).size} images …`);
  await resolveImages(imageFiles);

  const remoteFor = (item: { wikiTitle: string }, kind: "weapon" | "creature") => {
    const fields = parseInfobox(text.get(item.wikiTitle)!, kind)!;
    return kind === "weapon"
      ? imageUrl(fields["image"])
      : imageUrl(firstImageFile(fields["image 0star"] ?? fields["image"] ?? ""));
  };

  const remoteUrls = new Map<string, string>();
  for (const w of weapons) remoteUrls.set(w.slug, remoteFor(w, "weapon"));
  for (const a of ammo) remoteUrls.set(a.slug, remoteFor(a, "weapon"));
  for (const b of bosses) remoteUrls.set(b.slug, remoteFor(b, "creature"));
  for (const e of enemies) remoteUrls.set(e.slug, remoteFor(e, "creature"));

  // Fallback for items whose page/infobox has no image reference.
  const missing = [...weapons, ...ammo, ...bosses, ...enemies].filter(
    (i) => !remoteUrls.get(i.slug),
  );
  if (missing.length) {
    console.log(`Falling back to page images for ${missing.length} items …`);
    const pageImages = await resolvePageImages(missing.map((i) => i.wikiTitle));
    await resolveImages(imageFilesForFallback);
    for (const item of missing) {
      remoteUrls.set(item.slug, imageUrl(pageImages.get(item.wikiTitle)));
    }
    const noArt = missing.filter((i) => !remoteUrls.get(i.slug));
    if (noArt.length > 0) {
      console.warn(
        `  ! ${noArt.length} item(s) have no artwork on the wiki, so the UI will draw a placeholder: ${noArt.map((i) => i.name).join(", ")}`,
      );
    }
  }

  // Download them locally.
  rmSync(IMAGE_DIR, { recursive: true, force: true });
  console.log(`Downloading ${remoteUrls.size} images into public/items …`);
  for (const item of [...weapons, ...ammo, ...bosses, ...enemies]) {
    item.image = await downloadImage(
      remoteUrls.get(item.slug) ?? "",
      item.slug,
      wikiUrl(item.wikiTitle),
    );
  }

  /* --- write --- */
  mkdirSync(OUT_DIR, { recursive: true });
  const meta = {
    generatedAt: new Date().toISOString(),
    source: "https://valheim.weirdgloop.org/wiki/Valheim_Wiki",
    sourceApi: API,
    counts: {
      weapons: weapons.length,
      ammo: ammo.length,
      bosses: bosses.length,
      minibosses: enemies.filter((e) => e.kind === "miniboss").length,
      enemies: enemies.filter((e) => e.kind === "enemy").length,
      biomes: BIOMES.length,
      recipes: Object.keys(recipes).length,
    },
    availability:
      "Item tier is derived from wiki recipes plus the curated tables in src/data/materials.ts; creature biomes come from the wiki's Creatures overview and the curated DUNGEON_BIOME table in scripts/scrape.ts.",
  };

  const sortByName = <T extends { name: string }>(a: T, b: T) =>
    a.name.localeCompare(b.name);

  /* Only keep recipes for items that survived every filter. */
  const included = new Set([...weapons, ...ammo].map((i) => i.slug));
  const recipeBook: RecipeBook = Object.fromEntries(
    Object.entries(recipes)
      .filter(([slug]) => included.has(slug))
      .sort(([a], [b]) => a.localeCompare(b)),
  );

  writeFileSync(join(OUT_DIR, "weapons.json"), JSON.stringify(weapons.sort(sortByName), null, 2));
  writeFileSync(join(OUT_DIR, "ammo.json"), JSON.stringify(ammo.sort(sortByName), null, 2));
  writeFileSync(join(OUT_DIR, "bosses.json"), JSON.stringify(bosses, null, 2));
  writeFileSync(
    join(OUT_DIR, "enemies.json"),
    JSON.stringify(
      enemies.sort(
        (a, b) =>
          BIOME_ORDER[a.biome] - BIOME_ORDER[b.biome] ||
          (a.kind === b.kind ? 0 : a.kind === "miniboss" ? -1 : 1) ||
          a.name.localeCompare(b.name),
      ),
      null,
      2,
    ),
  );
  writeFileSync(join(OUT_DIR, "recipes.json"), JSON.stringify(recipeBook, null, 2));
  writeFileSync(join(OUT_DIR, "meta.json"), JSON.stringify(meta, null, 2));

  console.log(
    `\nWrote ${weapons.length} weapons, ${ammo.length} ammo types, ${bosses.length} bosses, ${enemies.length} minibosses + enemies, ${Object.keys(recipeBook).length} recipes to src/data/`,
  );
  for (const biome of BIOMES) {
    const count = [...weapons, ...ammo].filter((i) => i.biome === biome.id).length;
    const creatures = enemies.filter((e) => e.biome === biome.id).length;
    console.log(
      `  ${String(count).padStart(4)} items and ${String(creatures).padStart(2)} creatures from ${biome.name}`,
    );
  }
  console.log(`Skipped ${skipped.length} pages:`);
  for (const s of skipped) console.log(`  - ${s}`);

  /* --- roster self-check -------------------------------------------------
   * Category:Unarmed hid every fist weapon from a scraper that only read
   * Category:Weapons, and nothing complained: the run just produced a dataset
   * with a whole class missing. Following subcategories fixes that for today,
   * but only this check stops the next wiki reorganisation from going silent.
   * It fails in both directions:
   *   1. a page the wiki lists is neither emitted nor a deliberate drop;
   *   2. an item the committed dataset already had is no longer emitted.
   * A drop is deliberate only when its code is in EXPECTED_DROPS. */
  const unlisted = discovered
    .filter((title) => !emitted.has(title) && !INDEX_PAGES.has(title))
    .map((title) => ({ title, drop: drops.get(title) }))
    .filter(({ drop }) => !drop || !EXPECTED_DROPS.has(drop.code))
    .map(({ title, drop }) => `${title}${drop ? ` [${drop.detail}]` : ""}`);

  const vanished = [...committed]
    .filter(([title]) => !emitted.has(title))
    .filter(([title]) => {
      const drop = drops.get(title);
      return !drop || !EXPECTED_DROPS.has(drop.code);
    })
    .map(([title, file]) => `${title} (was in ${file})`);

  /* Diagnostics: anything listed here means the dataset is incomplete, so the
   * scrape must not be accepted. */
  const problems = [
    missingStations.size > 0
      ? `unmapped crafting stations: ${[...missingStations].join(", ")}`
      : "",
    missingMaterials.size > 0
      ? `unmapped materials: ${[...missingMaterials].sort().join(", ")}`
      : "",
    unmappedItems.length > 0
      ? `items whose biome could not be derived:\n    - ${unmappedItems.join("\n    - ")}`
      : "",
    unmappedCreatures.length > 0
      ? `creatures that could not be read:\n    - ${unmappedCreatures.join("\n    - ")}`
      : "",
    unlisted.length > 0
      ? `pages the wiki lists that the dataset is missing:\n    - ${unlisted.join(
          "\n    - ",
        )}\n    Teach the parser to read them, or add them to EXCLUDE_PAGES / INDEX_PAGES when they are not damage weapons.`
      : "",
    vanished.length > 0
      ? `items the committed dataset had that this scrape dropped:\n    - ${vanished.join(
          "\n    - ",
        )}`
      : "",
  ].filter(Boolean);
  if (problems.length > 0) {
    console.error(
      `\nThe scrape produced an incomplete dataset:\n  - ${problems.join("\n  - ")}`,
    );
    console.error(
      "Fix the parser, or extend the curated tables in src/data/materials.ts (or DUNGEON_BIOME in this file), then re-run.",
    );
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
