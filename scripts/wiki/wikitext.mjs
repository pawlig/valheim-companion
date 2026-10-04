// Pure wikitext parsing helpers for VC-1 (infoboxes, text cleaning).
// No I/O, no network — everything here is a pure function over strings.

export const DAMAGE_TYPES = [
  'blunt',
  'slash',
  'pierce',
  'chop',
  'pickaxe',
  'fire',
  'frost',
  'lightning',
  'poison',
  'spirit',
];

const MODIFIER_TIERS = [
  'veryweak',
  'weak',
  'slightlyweak',
  'neutral',
  'slightlyresistant',
  'resistant',
  'veryresistant',
  'immune',
];

const IMAGE_EXTENSION_RE = /\.(png|jpe?g|gif|webp)$/i;
const JOINER = ' – '; // en dash, per DATA-SCHEMA ("Axe – Cleave")

// ---------------------------------------------------------------------------
// Low-level scanning helpers (depth-aware, shared by template parsing)

// Walk a chunk and return the index of the first `char` that sits outside any
// `{{…}}` template or `[[…]]` link, or -1.
function topLevelIndexOf(chunk, char) {
  let templateDepth = 0;
  let linkDepth = 0;
  for (let i = 0; i < chunk.length; i += 1) {
    const two = chunk.slice(i, i + 2);
    if (two === '{{' || two === '[[') {
      if (two === '{{') templateDepth += 1;
      else linkDepth += 1;
      i += 1;
      continue;
    }
    if (two === '}}' || two === ']]') {
      if (two === '}}') templateDepth -= 1;
      else linkDepth -= 1;
      i += 1;
      continue;
    }
    if (chunk[i] === char && templateDepth === 0 && linkDepth === 0) return i;
  }
  return -1;
}

// Split on `separator` only at depth 0 (outside {{…}} and [[…]]).
function splitTopLevel(text, separator = '|') {
  const parts = [];
  let current = '';
  let templateDepth = 0;
  let linkDepth = 0;
  for (let i = 0; i < text.length; i += 1) {
    const two = text.slice(i, i + 2);
    if (two === '{{' || two === '[[') {
      if (two === '{{') templateDepth += 1;
      else linkDepth += 1;
      current += two;
      i += 1;
      continue;
    }
    if (two === '}}' || two === ']]') {
      if (two === '}}') templateDepth -= 1;
      else linkDepth -= 1;
      current += two;
      i += 1;
      continue;
    }
    if (text[i] === separator && templateDepth === 0 && linkDepth === 0) {
      parts.push(current);
      current = '';
      continue;
    }
    current += text[i];
  }
  parts.push(current);
  return parts;
}

// Index just past the closing '}}' of the template that opens at `start`
// (text.startsWith('{{', start)). Returns -1 when the template is unbalanced.
function findTemplateEnd(text, start) {
  let depth = 0;
  let i = start;
  while (i < text.length) {
    if (text.startsWith('{{', i)) {
      depth += 1;
      i += text.startsWith('{{{', i) ? 3 : 2;
      continue;
    }
    if (text.startsWith('}}', i)) {
      depth -= 1;
      i += text.startsWith('}}}', i) ? 3 : 2;
      if (depth === 0) return i;
      continue;
    }
    i += 1;
  }
  return -1;
}

// Inner content of a template: between the opening '{{' and the closing '}}'.
// Tolerates an unbalanced template (trimmed excerpts, malformed pages) by
// running to the end of the text.
function templateInner(text, start) {
  const end = findTemplateEnd(text, start);
  return text.slice(start + 2, end === -1 ? text.length : end - 2);
}

// Template-name pattern: spaces (or underscores — `{{Infobox_creature}}`)
// between words, matched case-insensitively.
function templateNamePattern(templateName) {
  return escapeRegExp(templateName).replace(/[ _]/g, '[\\s_]+');
}

// Range of the first `{{<templateName>…}}` (case-insensitive) in the text.
// `end` is just past the closing '}}' (or the end of text when unbalanced).
export function findTemplateRange(wikitext, templateName) {
  const text = String(wikitext ?? '');
  const re = new RegExp(`\\{\\{\\s*${templateNamePattern(templateName)}(?=[\\s|}])`, 'i');
  const match = re.exec(text);
  if (!match) return null;
  const end = findTemplateEnd(text, match.index);
  return { start: match.index, end: end === -1 ? text.length : end };
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// All instances of `{{infobox <name>…}}` as param objects, in document order.
export function parseTemplates(wikitext, templateName) {
  const text = String(wikitext ?? '');
  const re = new RegExp(`\\{\\{\\s*${templateNamePattern(templateName)}(?=[\\s|}])`, 'gi');
  const out = [];
  let match;
  while ((match = re.exec(text)) !== null) {
    out.push(parseTemplateParams(templateInner(text, match.index)));
    const end = findTemplateEnd(text, match.index);
    re.lastIndex = end === -1 ? text.length : end;
  }
  return out;
}

// `{{infobox <name>|k=v|…}}` -> { k: v, … }. Keys are lowercased and trimmed,
// values are raw (trimmed) wikitext. Positional params land under "1", "2", …
function parseTemplateParams(inner) {
  const params = {};
  splitTopLevel(inner).forEach((chunk, index) => {
    if (index === 0) return; // template name chunk
    const eq = topLevelIndexOf(chunk, '=');
    if (eq === -1) {
      const positional = chunk.trim();
      if (positional) params[String(index)] = positional;
      return;
    }
    const key = chunk.slice(0, eq).trim().toLowerCase();
    const value = chunk.slice(eq + 1).trim();
    if (key) params[key] = value;
  });
  return params;
}

// First `{{infobox <name>…}}` of a page, or null.
// First `{{infobox <name>…}}` of a page, or null.
export function parseInfobox(wikitext, name) {
  return parseTemplates(wikitext, `infobox ${name}`)[0] ?? null;
}

// ---------------------------------------------------------------------------
// Text cleaning

// Strip wiki markup from a value: links keep their label, templates vanish
// (except Item link, which keeps its first param), HTML tags and entities are
// resolved, bold/italic quotes are dropped.
export function cleanText(s) {
  if (s == null) return '';
  let text = String(s);
  // HTML comments (closed, and unclosed to the end of the value)
  text = text.replace(/<!--[\s\S]*?-->/g, '').replace(/<!--[\s\S]*$/g, '');
  // <br> variants -> newline, before other tags so captions keep line breaks
  text = text.replace(/<br\s*\/?>/gi, '\n');
  // remaining HTML tags (refs, small, …)
  text = text.replace(/<[^>]*>/g, '');
  // common entities and behavior switches (__TOC__, __NOTOC__, …)
  text = text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/__[A-Z_]+__/g, '');
  // templates, innermost first (bounded: gallery/infobox nesting is shallow)
  for (let pass = 0; pass < 10; pass += 1) {
    const next = text.replace(/\{\{([^{}]*)\}\}/g, (whole, inner) => {
      const name = inner.split('|')[0].trim().toLowerCase().replace(/[\s_]+/g, '');
      if (name === 'itemlink') {
        const first = inner.split('|')[1] ?? '';
        return first.trim();
      }
      return '';
    });
    if (next === text) break;
    text = next;
  }
  // links: [[target|label]] -> label, [[target]] -> target
  text = text.replace(/\[\[([^\[\]]*?)\]\]/g, (whole, inner) => {
    const pipe = inner.lastIndexOf('|');
    return (pipe === -1 ? inner : inner.slice(pipe + 1)).trim();
  });
  // bold/italic
  text = text.replace(/'''/g, '').replace(/''/g, '');
  // tidy whitespace: collapse runs of spaces/tabs, trim line ends, clamp blank runs
  text = text
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return text;
}

// Link targets of `[[…]]` in order (label part of `[[A|B]]` is ignored).
export function parseLinks(s) {
  if (!s) return [];
  const out = [];
  const re = /\[\[([^\[\]]*?)\]\]/g;
  let match;
  while ((match = re.exec(String(s))) !== null) {
    const target = match[1].split('|')[0].trim();
    if (target) out.push(target);
  }
  return out;
}

// Bullet list / <br>-separated values -> array of clean strings.
// A plain (non-list) value becomes a single-element array.
export function parseList(s) {
  if (!s) return [];
  const lines = String(s).replace(/<br\s*\/?>/gi, '\n').split('\n');
  const items = [];
  for (const line of lines) {
    const cleaned = cleanText(line.replace(/^\s*\*+/, '')).trim();
    if (cleaned) items.push(cleaned);
  }
  return items;
}

// ---------------------------------------------------------------------------
// Structured values

// One health line -> number, or null when the line is not numeric. Accepts a
// "Name:" prefix on part/biome lines ("* Thungr: 4200", "Meadows: 30"),
// thousands separators ("12,500") and "+"-joined phases ("10000 + 7000").
function parseHealthLine(line) {
  const colon = line.indexOf(':');
  const expression = colon === -1 ? line : line.slice(colon + 1);
  let sum = 0;
  for (const term of expression.split('+')) {
    const token = term.replace(/[,\s]/g, '');
    if (!/^\d+(?:\.\d+)?$/.test(token)) return null;
    sum += Number(token);
  }
  return sum;
}

// `"40"` -> 40, `"12,500"` -> 12500; phases (`10000 + 7000 + 30000`) and named
// parts (`* Thungr: 4200` / `* Zil: 2400`) are summed, anything else -> null.
export function parseHealth(s) {
  if (s == null) return null;
  const lines = parseList(s);
  if (lines.length === 0) return null;
  let sum = 0;
  for (const line of lines) {
    const value = parseHealthLine(line);
    if (value === null) return null;
    sum += value;
  }
  return sum;
}

// Per-biome health lines (`Meadows: 30<br>Black Forest: 40`, Skeleton) ->
// `{ "<biomeId>": number }` when every line is "<Biome title>: N", else null.
// `biomeByTitle` maps wiki biome titles ("Black Forest") to biome ids.
export function parseHealthByBiome(s, biomeByTitle) {
  if (s == null || !biomeByTitle) return null;
  const lines = parseList(s);
  if (lines.length === 0) return null;
  const out = {};
  for (const line of lines) {
    const match = line.match(/^(.+?):\s*(.+)$/);
    const biomeId = match ? biomeByTitle.get(match[1].trim()) : undefined;
    if (!biomeId) return null;
    const value = parseHealthLine(match[2]);
    if (value === null) return null;
    out[biomeId] = value;
  }
  return out;
}

// Star levels the infobox actually lists: non-empty `health Nstar` or
// `damage Nstar` (Bat/Ulv/Hexen stop at 1★, Lord Reto only lists 2★).
// Sorted ascending; may be empty (fish {{infobox item}} carries no stats).
export function listedStarLevels(infobox) {
  return [0, 1, 2].filter(
    (star) =>
      Boolean(cleanText(infobox?.[`health ${star}star`] ?? '')) ||
      Boolean(cleanText(infobox?.[`damage ${star}star`] ?? '')),
  );
}

// Damage term: "14 Slash", "Fire 80" (type-first), "100 Frost (x22)",
// "50 Pierce every 0.5s" (trailing words). Multipliers in (xN) are ignored.
const DAMAGE_TERM_RE = new RegExp(
  `^(?:(\\d+(?:\\.\\d+)?)\\s+(${DAMAGE_TYPES.join('|')})|(${DAMAGE_TYPES.join('|')})\\s+(\\d+(?:\\.\\d+)?))(?:\\s*\\(\\s*x\\s*\\d+\\s*\\))?(?:\\s+[^(),+]*?)?$`,
  'i',
);

function parseDamagePart(damagePart) {
  const damage = {};
  for (const term of damagePart.split(/[,+]/)) {
    const match = term.trim().match(DAMAGE_TERM_RE);
    if (!match) continue;
    const type = (match[2] ?? match[3]).toLowerCase();
    const value = Number(match[1] ?? match[4]);
    damage[type] = Math.max(damage[type] ?? 0, value);
  }
  return damage;
}

// Damage-term scan for colon-less lines: terms anywhere in the text, in both
// orders ("30 Blunt", "Fire 80"), case-insensitive. Returns the leading name
// (text before the first term, "Attack" when the line starts with a number)
// and `damage: {}` when the line has no damage term at all.
const DAMAGE_TERM_SCAN_RE = new RegExp(
  `(\\d+(?:\\.\\d+)?)\\s+(${DAMAGE_TYPES.join('|')})\\b|(${DAMAGE_TYPES.join('|')})\\s+(\\d+(?:\\.\\d+)?)`,
  'gi',
);

function scanDamage(content) {
  const damage = {};
  let firstIndex = -1;
  for (const match of content.matchAll(DAMAGE_TERM_SCAN_RE)) {
    if (firstIndex === -1) firstIndex = match.index;
    const type = (match[2] ?? match[3]).toLowerCase();
    damage[type] = Math.max(damage[type] ?? 0, Number(match[1] ?? match[4]));
  }
  if (firstIndex === -1) return { name: cleanText(content).trim(), damage: {} };
  const name = cleanText(content.slice(0, firstIndex)).trim();
  return { name: name || 'Attack', damage };
}

// Attack lines -> [{ name, damage, raw }].
// - `Name: 14 Slash, 10 Blunt` -> name + typed damage map
// - `Mace 30 Blunt, 45 Poison` (no colon) -> damage terms anywhere in the
//   line, leading words are the name ("Attack" for bare `100 Frost`)
// - `** Cleave` nested under `* Axe` -> name "Axe – Cleave"
// - `'''Phase 1'''` heading -> name prefix "Phase 1 – …"
// - `100 Frost (x22)` -> 100 (multiplier ignored)
// - grouping bullets without damage (e.g. bare `* Axe`) are skipped
// - unparsable leaf lines are kept with `damage: {}` and a filled `raw`
export function parseAttacks(s) {
  if (!s) return [];
  const lines = String(s).replace(/<br\s*\/?>/gi, '\n').split('\n');

  // Pre-scan: { depth, content, heading } for non-empty lines.
  const items = [];
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const headingMatch = line.match(/^'''\s*(.+?)\s*'''$/);
    if (headingMatch) {
      items.push({ heading: cleanText(headingMatch[1]).trim() });
      continue;
    }
    const bulletMatch = line.match(/^(\*+)\s*(.*)$/);
    const depth = bulletMatch ? bulletMatch[1].length : 0;
    const content = (bulletMatch ? bulletMatch[2] : line).trim();
    if (content) items.push({ depth, content });
  }

  const attacks = [];
  const nameStack = []; // grouping names by bullet depth
  let phase = null;
  items.forEach((item, index) => {
    if (item.heading) {
      phase = item.heading;
      nameStack.length = 0;
      return;
    }
    const { depth, content } = item;
    // A bare number (e.g. damage 0star = "0") is a stat, not an attack.
    if (/^\d+(?:\.\d+)?$/.test(content)) return;
    nameStack.length = depth; // deeper groupings no longer apply
    const colon = content.indexOf(':');
    const raw = cleanText(content);
    let namePart;
    let damage;
    if (colon === -1) {
      // Colon-less line: damage terms anywhere ("Mace 30 Blunt, 45 Poison",
      // "100 Frost"); leading words are the name, "Attack" when it starts
      // with a number. No damage term -> unparsable, keeps `damage: {}`.
      const scanned = scanDamage(content);
      namePart = scanned.name;
      damage = scanned.damage;
    } else {
      namePart = cleanText(content.slice(0, colon)).trim();
      damage = parseDamagePart(content.slice(colon + 1).trim());
    }
    if (depth > 0) nameStack[depth - 1] = namePart;
    const hasDamage = Object.keys(damage).length > 0;
    // A bullet without damage is a grouping header unless nothing is nested under it.
    const next = items.slice(index + 1).find((later) => !later.heading);
    const isLeaf = !next || next.depth <= depth;
    if (!hasDamage && !isLeaf) return;

    const name = [...(phase ? [phase] : []), ...nameStack.slice(0, depth - 1), namePart]
      .filter(Boolean)
      .join(JOINER);
    attacks.push({ name, damage, raw });
  });
  return attacks;
}

// Weak-point fields: `weak point` names the body part(s), `wp <tier>` lists
// the damage types hitting that part at that tier (`wp veryweak = Pierce`;
// Seeker Soldier lists a whole `wp weak = Blunt, Pierce, …` set).
// -> [{ part: "Head", modifiers: { pierce: "veryweak" } }], [] when absent.
export function parseWeakPoints(infobox) {
  const parts = [];
  const tiers = []; // { tier, type }
  for (const [field, value] of Object.entries(infobox ?? {})) {
    const key = String(field).toLowerCase().replace(/[\s_]+/g, '');
    if (/^weakpoints?$/.test(key)) {
      for (const part of parseList(value)) parts.push(part);
    } else if (key.startsWith('wp') && MODIFIER_TIERS.includes(key.slice(2))) {
      for (const item of parseList(value).flatMap((entry) => entry.split(','))) {
        const type = item.trim().toLowerCase().replace(/[\s_]+/g, '');
        if (DAMAGE_TYPES.includes(type)) tiers.push({ tier: key.slice(2), type });
      }
    }
  }
  if (parts.length === 0 || tiers.length === 0) return [];
  const modifiers = {};
  for (const { tier, type } of tiers) modifiers[type] = tier;
  return parts.map((part) => ({ part, modifiers }));
}

// Modifier fields of an infobox. Values are split on commas, <br> and bullets.
// Damage types land in `modifiers` (type -> tier), everything else
// (Stagger, Knockback, …) in `otherImmunities`. Fields whose name contains
// "weak"/"resist" but are not a known tier are reported in `unknown`.
// Weak-point fields (`weak point`, `wp <tier>`) belong to parseWeakPoints.
export function parseModifiers(infobox) {
  const modifiers = {};
  const otherImmunities = [];
  const unknown = [];
  for (const [field, value] of Object.entries(infobox ?? {})) {
    const key = String(field).toLowerCase().replace(/[\s_]+/g, '');
    if (/^weakpoints?$/.test(key) || key.startsWith('wp')) continue;
    const isKnownTier = MODIFIER_TIERS.includes(key);
    if (!isKnownTier && !/weak|resist/.test(key)) continue;
    const values = parseList(value)
      .flatMap((item) => item.split(','))
      .map((item) => item.trim())
      .filter(Boolean);
    for (const item of values) {
      const type = item.toLowerCase().replace(/[\s_]+/g, '');
      if (!isKnownTier) {
        unknown.push({ field, value: item });
      } else if (DAMAGE_TYPES.includes(type)) {
        modifiers[type] = key;
      } else {
        otherImmunities.push(item);
      }
    }
  }
  return { modifiers, otherImmunities, unknown };
}

// File name from an infobox image field:
// `Greydwarf.png` -> `Greydwarf.png`,
// `{{InfoboxGallery|A.png|Phase 1\nB.png|…}}` -> `A.png`,
// `[[File:X.png|…]]` -> `X.png`, empty/absent -> null.
export function parseImage(s) {
  const text = String(s ?? '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<!--[\s\S]*$/g, '')
    .trim();
  if (!text) return null;
  // MediaWiki file titles use spaces, never underscores.
  const normalize = (name) => name.trim().replace(/_/g, ' ').trim();
  const fileLink = text.match(/\[\[\s*(?:file|image)\s*:\s*([^|\]]+)/i);
  if (fileLink) return normalize(fileLink[1]);
  if (text.includes('{{')) {
    const template = text.match(/\{\{([^{}]*)\}\}/);
    const candidates = template ? template[1].split('|') : text.split('|');
    for (const candidate of candidates) {
      if (IMAGE_EXTENSION_RE.test(candidate.trim())) return normalize(candidate);
    }
    return null;
  }
  const bare = normalize(text.split('|')[0]);
  return bare || null;
}

// Page-name slug per DATA-SCHEMA: strip diacritics (NFKD), lowercase, anything
// outside [a-z0-9] becomes "-", dashes collapsed and trimmed.
// The character class below is the combining-mark range U+0300–U+036F.
export function slug(name) {
  return String(name ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
