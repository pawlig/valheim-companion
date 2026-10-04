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

// `"40"` -> 40, `"10000 + 7000 + 30000"` -> 47000, anything else -> null.
export function parseHealth(s) {
  if (s == null) return null;
  const text = cleanText(s);
  if (!text) return null;
  let sum = 0;
  for (const part of text.split('+')) {
    const token = part.trim();
    if (!/^\d+(?:\.\d+)?$/.test(token)) return null;
    sum += Number(token);
  }
  return sum;
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

// Attack lines -> [{ name, damage, raw }].
// - `Name: 14 Slash, 10 Blunt` -> name + typed damage map
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
    const namePart = cleanText(colon === -1 ? content : content.slice(0, colon)).trim();
    const damagePart = colon === -1 ? '' : content.slice(colon + 1).trim();
    const raw = cleanText(content);
    if (depth > 0) nameStack[depth - 1] = namePart;

    const damage = damagePart ? parseDamagePart(damagePart) : {};
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

// Modifier fields of an infobox. Values are split on commas, <br> and bullets.
// Damage types land in `modifiers` (type -> tier), everything else
// (Stagger, Knockback, …) in `otherImmunities`. Fields whose name contains
// "weak"/"resist" but are not a known tier are reported in `unknown`.
export function parseModifiers(infobox) {
  const modifiers = {};
  const otherImmunities = [];
  const unknown = [];
  for (const [field, value] of Object.entries(infobox ?? {})) {
    const key = String(field).toLowerCase().replace(/[\s_]+/g, '');
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
  const text = String(s ?? '').trim();
  if (!text) return null;
  const fileLink = text.match(/\[\[\s*(?:file|image)\s*:\s*([^|\]]+)/i);
  if (fileLink) return fileLink[1].trim();
  if (text.includes('{{')) {
    const template = text.match(/\{\{([^{}]*)\}\}/);
    const candidates = template ? template[1].split('|') : text.split('|');
    for (const candidate of candidates) {
      const value = candidate.trim();
      if (IMAGE_EXTENSION_RE.test(value)) return value;
    }
    return null;
  }
  const bare = text.split('|')[0].trim();
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
