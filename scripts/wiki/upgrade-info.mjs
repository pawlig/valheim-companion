// Parsers for per-quality numbers on weapon/shield/tool wiki pages (VC-47).
// Pure functions over wikitext; no I/O.

const IGNORED_ROWS = new Set(['crafting', 'crafting recipe', 'cost', 'workbench level', 'forge level']);
const NUM = /-?\d+(\.\d+)?/;

function firstNumber(text) {
  const m = NUM.exec(String(text ?? '').replace(/,/g, ''));
  return m ? Number(m[0]) : null;
}

function cleanLabel(s) {
  return s
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
    .replace(/<[^>]*>/g, '')
    .trim()
    .toLowerCase();
}

// Returns { qualities: [1,2,3], rows: { 'block armor': [96,102,108], ... } } or null when the page
// has no "== Upgrade information ==" table.
export function parseUpgradeInfo(wikitext) {
  const text = String(wikitext ?? '');
  const head = /^==\s*Upgrade information\s*==\s*$/m.exec(text);
  if (!head) return null;
  const after = text.slice(head.index + head[0].length);
  const start = after.indexOf('{|');
  if (start < 0) return null;
  const end = after.indexOf('\n|}', start);
  const table = after.slice(start + 2, end < 0 ? undefined : end);
  const chunks = table.split(/^\|-.*$/m);

  let qualities = null;
  const rows = {};
  for (const chunk of chunks) {
    const lines = chunk.split('\n').map((l) => l.trim()).filter(Boolean);
    const first = lines.findIndex((l) => l.startsWith('!'));
    if (first < 0) continue;
    // Label is the first header cell; inline forms may continue with "||" or "!!" on the same line.
    const rest = lines.slice(first);
    const firstLine = rest[0].slice(1);
    const parts = firstLine.split(/\|\||!!/);
    const label = cleanLabel(parts[0]);
    if (label === 'quality') {
      const cells = [...parts.slice(1), ...rest.slice(1).flatMap((l) => l.replace(/^[!|]/, '').split(/\|\||!!/))];
      const nums = [];
      for (const c of cells) {
        const t = c.trim();
        if (/^total/i.test(t)) break;
        const n = firstNumber(t);
        if (n !== null) nums.push(n);
      }
      qualities = nums;
      continue;
    }
    if (!label || IGNORED_ROWS.has(label) || label.startsWith('{{upgrade station row')) continue;
    if (/\{\{\s*upgrade station row/i.test(chunk)) continue;
    const cells = [...parts.slice(1)];
    for (const l of rest.slice(1)) {
      if (!l.startsWith('|') || l.startsWith('|}') || l.startsWith('|+')) continue;
      cells.push(...l.slice(1).split('||'));
    }
    rows[label] = cells.map(firstNumber);
  }
  if (!qualities || qualities.length === 0) return null;
  for (const k of Object.keys(rows)) {
    const vals = rows[k].slice(0, qualities.length);
    while (vals.length < qualities.length) vals.push(null);
    rows[k] = vals;
  }
  return { qualities, rows };
}

// Numeric fields of the first {{infobox weapon ...}} template: { 'block armor': 96, ... }.
export function parseInfoboxNumbers(wikitext) {
  const text = String(wikitext ?? '');
  const start = text.search(/\{\{\s*infobox weapon/i);
  if (start < 0) return {};
  // Find the matching closing braces.
  let depth = 0;
  let end = text.length;
  for (let i = start; i < text.length - 1; i++) {
    if (text[i] === '{' && text[i + 1] === '{') { depth++; i++; }
    else if (text[i] === '}' && text[i + 1] === '}') { depth--; i++; if (depth === 0) { end = i + 1; break; } }
  }
  const body = text.slice(start, end);
  const out = {};
  const re = /^\s*\|\s*([^=|\n]+?)\s*=(.*)$/gm;
  let m;
  while ((m = re.exec(body))) {
    const key = m[1].toLowerCase();
    const n = firstNumber(m[2].replace(/<!--.*?-->/g, ''));
    if (n !== null && !(key in out)) out[key] = n;
  }
  return out;
}
