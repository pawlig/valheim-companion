// Expedition enrichments use the existing Events reader and cached wiki client.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { api } from './api.mjs';
import { eventRows } from './creature-extras.mjs';
import { cleanText, parseLinks, parseTemplates, parseMaterialList, slug } from './wikitext.mjs';
import { parseSources } from './items.mjs';
import { BIOMES } from './biomes.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const load = name => JSON.parse(readFileSync(path.join(ROOT, 'data', name + '.json'), 'utf8'));
const wiki = title => 'https://valheim.weirdgloop.org/w/' + encodeURIComponent(title.replaceAll(' ', '_'));
const save = (name, value) => {
  const file = path.join(ROOT, 'data', name), text = typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n';
  if (!existsSync(file) || readFileSync(file, 'utf8') !== text) writeFileSync(file, text);
};
const plain = value => cleanText(value ?? '').replace(/^"|"$/g, '').trim();
const section = (wt, heading) => String(wt ?? '').match(new RegExp('^={2,3}\\s*' + heading + '\\s*={2,3}\\s*$([\\s\\S]*?)(?=^={2,3}[^=]|$(?![\\s\\S]))', 'mi'))?.[1]?.trim() ?? null;

export function parseItemSources(source, creatures) {
  const normalized = String(source ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/^\s*\*+\s*/gm, '');
  return parseSources(normalized, creatures);
}

export function parseEvents(wt, creatures) {
  const byId = new Map(creatures.map(c => [c.id, c])), unmatched = [];
  const match = (name, event) => {
    const c = byId.get(slug(name));
    if (!c) unmatched.push(event + ': ' + name);
    return c;
  };
  const events = eventRows(wt, true).map(row => {
    const id = plain(row.event), notes = [];
    const creatureIds = [];
    for (const name of parseLinks(row.creatures.replace(/\([^)]*\)/g, '')).filter(n => !/^File:/.test(n))) {
      const c = match(name, id);
      if (c) creatureIds.push(c.id);
      else notes.push(plain(row.creatures));
    }
    const parentheses = row.creatures.match(/\([^)]*\)/g) ?? [];
    notes.push(...parentheses.map(plain));
    const enabled = parseLinks(row.enabled).map(name => match(name, id)).filter(Boolean);
    // Hildir chest returns are not creature kills; approximate only after the
    // associated miniboss biome is revealed, retaining the exact condition.
    const chest = /Brass Chest/i.test(row.enabled) ? 'brenna' : /Silver Chest/i.test(row.enabled) ? 'geirrhafa' : /Bronze Chest/i.test(row.enabled) ? 'zil-thungr' : null;
    if (chest && byId.has(chest)) enabled.push(byId.get(chest));
    if (chest || (!enabled.length && !/Start of the world/i.test(row.enabled))) notes.push(plain(row.enabled));
    const conditions = enabled.map(c => ({ id: c.id, name: c.name, biomes: c.biomes, boss: c.kind === 'boss', miniboss: c.kind === 'miniboss' }));
    return { id, startMessage: plain(row.start), endMessage: plain(row.end), creatures: [...new Set(creatureIds)],
      creatureDetails: [...new Set(creatureIds)].map(id => { const c = byId.get(id); return { id, name: c.name, biomes: c.biomes, modifiers: c.modifiers }; }),
      enabledBy: { mode: /Start of the world/i.test(row.enabled) ? 'start' : /\bor\b/i.test(plain(row.enabled)) ? 'any' : 'all', ids: [...new Set(enabled.map(c => c.id))] },
      conditions, disabledBy: parseLinks(row.disabled).map(name => match(name, id)?.id).filter(Boolean),
      biomes: /^(Any)$/i.test(plain(row.biomes)) ? BIOMES.map(b => b.id) : parseLinks(row.biomes).map(slug),
      durationSeconds: Number(plain(row.duration)) || null, notes: [...new Set(notes)], source: wiki('Events') };
  });
  return { events, unmatched: [...new Set(unmatched)].sort() };
}

export function parseBoss(boss, wt, powers) {
  const summoning = section(wt, 'Summoning');
  const paragraph = summoning?.split(/\n\s*\n/).map(p => p.replace(/\[\[File:[\s\S]*?\]\]/gi, '').trim()).find(p => p && !p.startsWith('[[')) ?? null;
  const altarName = boss.id === 'the-queen' && /Infested Citadel/.test(summoning ?? '') ? 'Infested Citadel'
    : boss.id === 'kall-fimbulbringer' && /Strange Bowl/.test(summoning ?? '') ? 'Strange Bowl'
    : /Forsaken Altar/i.test(summoning ?? '') ? 'Forsaken Altar'
    : /summoning altar/i.test(summoning ?? '') ? 'Summoning altar' : null;
  const summonItems = boss.id === 'the-queen' && /Sealbreaker/.test(wt) ? [{ id: 'sealbreaker', count: 1 }]
    : parseMaterialList(boss.summon ?? '').map(m => ({ id: slug(m.name), count: m.amount }));
  const powerSection = String(powers ?? '').split(/^==(?!=)/m).find(p => parseLinks(p.split('\n')[0]).includes(boss.name));
  const effect = powerSection?.split(/===Notes/)[0].split('\n').slice(1).filter(line => line.trim() && !line.startsWith('{{Quote') && !line.startsWith('===')).join('\n').split(/===Notes/)[0];
  const cooldown = /20-minute cooldown/.test(powers ?? '') ? 1200 : null;
  return { id: boss.id, name: boss.name, biome: boss.biomes[0], order: BIOMES.find(b => b.id === boss.biomes[0]).order,
    altar: altarName ? { name: altarName, howToFind: paragraph ? plain(paragraph) : null } : null,
    summonItems, forsakenPower: effect ? { name: plain(powerSection.split('\n')[0].replace(/=+/g, '')), effect: plain(effect), cooldownSeconds: cooldown } : null, source: wiki(boss.name) };
}

export async function fetchExpedition() {
  const creatures = load('creatures'), items = load('items').filter(i => !i.expedition && i.addedBy !== 'expedition'), stations = load('stations');
  const bosses = creatures.filter(c => c.kind === 'boss').sort((a,b) => BIOMES.find(x => x.id === a.biomes[0]).order - BIOMES.find(x => x.id === b.biomes[0]).order);
  const titles = ['Events', ...bosses.map(b => b.name), 'Forsaken power', 'Ancient Seed', 'Withered Bone', 'Dragon Egg', 'Fuling Totem', 'Bell', 'Malicious Blood', 'Sealbreaker', 'Portal'];
  const pages = await api.getWikitext(titles);
  const { events, unmatched } = parseEvents(pages.Events.wikitext, creatures);
  const expedition = bosses.map(b => parseBoss(b, pages[b.name].wikitext, pages['Forsaken power'].wikitext));
  // Galdr Table is owned by fetch-stations; Expedition only reads stations.
  const pending = [...new Set([...expedition.flatMap(b => b.summonItems.map(m => m.id.replaceAll('-', ' '))), 'Portal'])];
  const seen = new Set();
  const additions = [];
  while (pending.length) {
    const title = pending.shift();
    if (seen.has(slug(title))) continue;
    seen.add(slug(title));
    if (items.some(i => i.id === slug(title))) continue;
    const canonicalTitle = Object.keys(pages).find(t => slug(t) === slug(title)) ?? title.replace(/\b\w/g, c => c.toUpperCase());
    const page = pages[canonicalTitle] ?? (await api.getWikitext([canonicalTitle]))[canonicalTitle];
    const box = parseTemplates(page.wikitext ?? '', 'infobox item')[0] ?? parseTemplates(page.wikitext ?? '', 'infobox structure')[0];
    if (!box) throw new Error('Missing item infobox: ' + title);
    const name = page.title, id = slug(name), materials = parseMaterialList(box.materials ?? '').map(m => ({ item: slug(m.name), amount: m.amount }));
    pending.push(...materials.map(m => m.item.replaceAll('-', ' ')));
    const boss = expedition.find(b => b.summonItems.some(m => m.id === id));
    const override = load('overrides').expedition?.materials?.[id];
    const biome = override?.biome ?? boss?.biome ?? (id === 'portal' ? 'black-forest' : null);
    additions.push({ id, name, addedBy: 'expedition', names: {}, image: null, biome, tier: BIOMES.find(b => b.id === biome)?.order ?? null,
      sources: parseItemSources(box.source, new Map(creatures.map(c => [c.id,c]))),
      recipe: materials.length ? { station: plain(box.source) || null, stationLevel: Number(box['crafting level']) || 1, materials, yields: Number(box.quantity) || 1 } : null,
      teleportable: /^no$/i.test(plain(box.teleport)) ? false : box.teleport ? true : null, wiki: wiki(name) });
  }
  const tips = [];
  // Each short UI tip is checked against the corresponding boss source.
  const bossTips = {
    eikthyr: [[/Sacrificial Stone/, 'Find Eikthyr’s Vegvisir at the Sacrificial Stones.'], [/Deer Trophy/, 'Bring Deer Trophy to the Forsaken Altar.']],
    'the-elder': [[/Burial Chambers/, 'Look for The Elder’s Vegvisir in Burial Chambers or ruined structures.'], [/Ancient Seed/, 'Bring Ancient Seed to the Forsaken Altar.']],
    bonemass: [[/Sunken Crypts/, 'Look for Bonemass’ Vegvisir in Sunken Crypts or ruined structures.'], [/Withered Bone/, 'Bring Withered Bone to the Forsaken Altar.']],
    moder: [[/ruined structures/, 'Look for Moder’s Vegvisir in ruined structures in the Mountains.'], [/Dragon Egg/, 'Bring Dragon Egg to the Forsaken Altar.']],
    yagluth: [[/Stonehenge/, 'Look for Yagluth’s Vegvisir at Stonehenge structures.'], [/Fuling Totem/, 'Bring Fuling Totem to the Forsaken Altar.']],
    'the-queen': [[/Infested Mines/, 'Look for The Queen’s Vegvisir in Infested Mines.'], [/Sealbreaker/, 'Use Sealbreaker to enter the Infested Citadel.']],
    fader: [[/central tower/, 'Look for Fader’s Vegvisir in the central tower of Charred Fortresses.'], [/Bell Fragment/, 'Craft Bell from Bell Fragment before visiting the altar.']],
    'kall-fimbulbringer': [[/Aesir Passage/, 'Reach The Prison through the Aesir Passage.'], [/Strange Bowl/, 'Offer Malicious Blood at the Strange Bowl.']],
  };
  for (const prep of expedition) for (const [index, [pattern, text]] of bossTips[prep.id].entries()) {
    if (!pattern.test(pages[prep.name].wikitext)) throw new Error('Boss tip verification failed: ' + prep.id);
    tips.push({ id: prep.id + '-' + index, boss: prep.id, text, source: prep.source });
  }
  for (const [id, pattern, text] of [
    ['world', /World-based events are the default mode/, 'World-based events are the default mode.'],
    ['dungeon', /not in a dungeon/, 'Raids do not start while the player is in a dungeon.'],
    ['timer', /timer is paused/, 'Stay in the event area until the timer runs out; it pauses without players, except during the hunted event.'],
    ['biome', /exact biome at the player/, 'The biome check uses the exact biome at your position.'],
    ['deaths', /source of death.*not tracked/, 'Environmental deaths can also unlock creature-based events.'],
    ['pets', /Tamed creatures can easily be killed/, 'Protect tamed creatures during raids.'],
  ]) {
    if (!pattern.test(pages.Events.wikitext)) throw new Error('Tip verification failed: ' + id);
    tips.push({ id, text, source: wiki('Events') });
  }
  const conditionSatisfied = (id, defeated, open) => defeated[id] || events.flatMap(e => e.conditions).some(c => c.id === id && !c.boss && c.biomes.some(b => open.includes(b)));
  const active = (e, defeated, open) => !e.disabledBy.some(id => defeated[id]) && (e.enabledBy.mode === 'start' || (e.enabledBy.ids.length > 0 && (e.enabledBy.mode === 'any' ? e.enabledBy.ids.some : e.enabledBy.ids.every).call(e.enabledBy.ids, id => conditionSatisfied(id,defeated,open)))) && e.biomes.some(b => open.includes(b));
  const lines = ['# Expedition data report', '', 'Source: https://valheim.weirdgloop.org/w/Events and each boss page (cached MediaWiki API).', '', `World events: ${events.length}. Bosses: ${expedition.length}.`, '', '## Progression (world-based; nonboss conditions approximated by revealed biome)', '', '| Bosses defeated | Can happen now | Ended | Coming next |', '|---:|---:|---:|---:|'];
  for (let n=0;n<=8;n++) {
    const defeated = Object.fromEntries(bosses.slice(0,n).map(b=>[b.id,true]));
    const order = expedition[Math.min(n,7)].order;
    const open = BIOMES.filter(b=>b.order<=order).map(b=>b.id);
    const current = events.filter(e=>active(e,defeated,open));
    const after = {...defeated, ...(bosses[n] ? {[bosses[n].id]:true} : {})};
    const nextOpen = BIOMES.filter(b=>b.order<=(expedition[Math.min(n+1,7)].order)).map(b=>b.id);
    lines.push(`| ${n} | ${current.length} | ${events.filter(e=>e.disabledBy.some(id=>defeated[id])).length} | ${events.filter(e=>active(e,after,nextOpen)&&!current.includes(e)).length} |`);
  }
  lines.push('', '## Unmatched links', '', ...unmatched.map(x=>'- '+x), '', '## Missing boss fields', '',
    '- Missing altar: ' + (expedition.filter(b=>!b.altar).map(b=>b.name).join(', ') || 'None') + '.',
    '- Missing power: ' + (expedition.filter(b=>!b.forsakenPower).map(b=>b.name).join(', ') || 'None') + '.', '', '## Open questions', '',
    '- Coming next counts potential additions after the next boss opens its following biome. The UI still hides raids whose prerequisite creatures are currently locked.',
    '- Player-based raids and player-initiated Jotun Invasion are excluded from calculations.',
    '- Hildir chest returns are approximated by the associated miniboss biome. A revealed biome cannot prove that the chest was returned; exact requirements remain in notes.',
    '- Nonboss kills are assumed once their biome is revealed; visiting a biome does not prove a kill.',
    '- Kall Fimbulbringer has no Forsaken Power: hanging his trophy ends the game according to Forsaken power. The field remains null.',
    '- Malicious Blood has no teleport field in its infobox; teleportability remains unknown.',
    '- Incoming damage uses existing Bestiary attack maps; compound attack strings may not preserve every repeated component. Bestiary data is not changed.', '');
  save('events.json',events); save('expedition.json',expedition); save('expedition-tips.json',tips);
  save('items.json',[...items,...additions].sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0));
  save('report-expedition.md',lines.join('\n'));
  console.log(`Expedition: ${events.length} events, ${expedition.length} bosses, ${additions.length} new items; ${stations.length} existing stations.`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await fetchExpedition();
