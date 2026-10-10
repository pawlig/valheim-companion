// VC-44 analysis helper: index the wiki cache (data/raw/*.json, MediaWiki
// `revisions` responses written by scripts/wiki/api.mjs) as title -> wikitext.
// Usage: node docs/audit/station-levels/cache.mjs   (prints counts + titles)
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
export const HERE = path.dirname(fileURLToPath(import.meta.url));

export function loadPages() {
  const dir = path.join(ROOT, 'data/raw');
  const out = {};
  let files = 0;
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.json')) continue;
    files++;
    let body;
    try { body = JSON.parse(readFileSync(path.join(dir, f), 'utf8')); } catch { continue; }
    for (const p of body?.query?.pages ?? []) {
      const wt = p.revisions?.[0]?.slots?.main?.content;
      if (wt == null) continue;
      out[p.title] = wt;
    }
  }
  return { pages: out, files };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { pages, files } = loadPages();
  console.log('files', files, 'pages', Object.keys(pages).length);
  if (process.argv.includes('--titles')) console.log(Object.keys(pages).sort().join('\n'));
}
