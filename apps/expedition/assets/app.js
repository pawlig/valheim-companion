import { readPlayerState, sanitizePlayer, PLAYER_STORAGE_KEY } from '../../../shared/player/core.js';
const data = globalThis.VCX_DATA;
const core = globalThis.VCExpedition;
const preparations = Array.isArray(data.expedition) ? data.expedition : data.expedition.bosses;
const supplementalItems = data.expedition.items || {};
const supplementalStations = data.expedition.stations || [];
const t = (key, values) => VCI18n.t(VC_MESSAGES, key, values);
const number = value => new Intl.NumberFormat(VCI18n.locale(), {
  maximumFractionDigits: 1
}).format(value);
const tn = (key, count, values) => VCI18n.tn(VC_MESSAGES, key, count, {
  count: number(count),
  ...values
});
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) {
    n.className = cls;
  }
  if (text !== undefined) {
    n.textContent = text;
  }
  return n;
};
const link = (text, href) => {
  const n = el('a', '', text);
  n.href = href;
  return n;
};
const button = (text, action, id) => {
  const n = el('button', '', text);
  n.type = 'button';
  if (id) {
    n.id = id;
  }
  n.addEventListener('click', action);
  return n;
};
const section = (title, cls = '') => {
  const n = el('section', 'card ' + cls);
  n.append(el('h2', '', t(title)));
  return n;
};
const check = (text, checked, action, id) => {
  const n = el('label', 'check-control');
  const input = el('input');
  input.type = 'checkbox';
  input.checked = checked;
  if (id) {
    input.id = id;
  }
  input.addEventListener('change', () => action(input.checked));
  if (typeof text === 'string') {
    n.append(input, el('span', '', text));
  } else {
    n.append(input, text);
  }
  return n;
};
const summonLabel = (id, count, name, options = {}) => {
  const wrap = el('span');
  const text = el('span', '', tn('{count}× {name}', count, { name }) + ' ');
  const a = el('a', 'item-link', '↗');
  a.href = `/items/#item=${encodeURIComponent(id)}`;
  a.setAttribute('aria-label', name);
  if (options.stopPropagation) {
    a.addEventListener('click', (e) => e.stopPropagation());
  }
  wrap.append(text, a);
  return wrap;
};
const read = () => {
  try {
    return JSON.parse(localStorage.getItem('vx.prep'));
  } catch {
    return null;
  }
};
let state = core.decodePrep(location.hash, data) ?? core.sanitize(read(), data);
let player = readPlayerState().player;
let tab = location.hash === '#raids' ? 'raids' : 'boss';
if (core.decodePrep(location.hash, data)) {
  player = sanitizePlayer({
    ...player,
    players: state.players
  });
} else {
  state.players = player.players;
}
let dependencies;
let loaded = false;
let busy = false;
let renderVersion = 0;
const biomes = () => preparations.map(b => ({
  id: b.biome,
  order: b.order,
  creatures: {
    boss: [b.id]
  }
})).concat([{
  id: 'ocean',
  order: 3,
  creatures: {
    boss: []
  }
}]);
const revealed = () => VCProgress.revealedBiomes(biomes());
const eligible = prep => revealed().includes(prep.biome);
const current = () => core.targetBoss(state, VCProgress.get(), data) ?? preparations.at(-1);

function save() {
  state.players = player.players;
  try {
    localStorage.setItem('vx.prep', JSON.stringify({
      ...state,
      boss: state.auto ? null : state.boss
    }));
  } catch {
    // In-memory prep remains usable.
  }
}

function notice(key) {
  document.getElementById('notice').textContent = t(key);
}

function script(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => {
      s.remove();
      reject(new Error(src));
    };
    document.head.append(s);
  });
}

async function loadDependencies() {
  if (!dependencies) {
    dependencies = (async () => {
      await script('/bestiary/data/data.js');
      await import('../../bestiary/assets/rank.js');
      await script('/provisions/data/data.js');
      await script('/provisions/assets/advisor.js');
      await script('/provisions/assets/planner.js');
      loaded = true;
    })().catch(error => {
      dependencies = null;
      throw error;
    });
  }
  return dependencies;
}

function control(label, node) {
  const n = el('label', 'control', t(label));
  n.append(node);
  return n;
}

function setPlayer(count) {
  player = sanitizePlayer({
    ...player,
    players: count
  });
  state.players = player.players;
  try {
    localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(player));
  } catch {
    // Keep the active profile.
  }
  window.dispatchEvent(new CustomEvent('vc:player-change', {
    detail: player
  }));
}

function renderControls() {
  const parent = document.getElementById('boss-controls');
  parent.replaceChildren();
  const select = el('select');
  select.id = 'boss-select';
  const automatic = el('option', '', t('Next boss (auto)'));
  automatic.value = '';
  select.append(automatic);
  for (const [index, prep] of preparations.entries()) {
    const opt = el('option', '', eligible(prep) ? prep.name : tn('🔒 Boss {count}', index + 1));
    opt.value = prep.id;
    select.append(opt);
  }
  select.value = state.auto ? '' : current().id;
  select.addEventListener('change', () => {
    state.boss = select.value || null;
    state.auto = !select.value;
    state.checked = [];
    history.replaceState(null, '', state.auto ? '#' : '#boss=' + state.boss);
    render();
  });
  parent.append(control('Target', select));
  if (!eligible(current())) {
    parent.append(button(t('Reveal'), () => VCProgress.openBiome(current().biome), 'reveal-boss'));
  }
  const players = el('input');
  players.id = 'players';
  players.type = 'number';
  players.min = '1';
  players.max = '5';
  players.value = player.players;
  players.addEventListener('change', () => {
    setPlayer(Number(players.value));
    render();
  });
  parent.append(control('Players nearby', players));
  const minutes = el('select');
  minutes.id = 'minutes';
  for (const count of [...new Set([15, 30, 60, 90, 120, state.minutes])].sort((a, b) => a - b)) {
    const opt = el('option', '', tn('{count} min', count));
    opt.value = count;
    minutes.append(opt);
  }
  minutes.value = state.minutes;
  minutes.addEventListener('change', () => {
    state.minutes = Number(minutes.value);
    render();
  });
  parent.append(control('Fight duration', minutes));
  parent.append(button(t('Share prep'), async () => {
    save();
    const url = new URL(location.href);
    url.hash = 'x=' + core.encodePrep({
      ...state,
      boss: current().id
    }, data);
    history.replaceState(null, '', url);
    await copy(url.href, parent, 'Link copied!');
  }, 'share-prep'));
}

async function copy(text, parent, message = 'Copied!') {
  parent.querySelector('textarea')?.remove();
  try {
    await navigator.clipboard.writeText(text);
    notice(message);
  } catch {
    const field = el('textarea');
    field.value = text;
    field.readOnly = true;
    field.setAttribute('aria-label', t('Copy list'));
    parent.append(el('p', 'hint', t('Copy failed. Select and copy the text below.')), field);
    field.focus();
    field.select();
  }
}

function safeSources(definition) {
  const n = el('div', 'rows');
  for (const source of definition?.sources || []) {
    if (source.biomes?.length && !source.biomes.some(b => revealed().includes(b))) {
      n.append(el('span', 'hint', t('Locked until you reach this biome.')));
      continue;
    }
    n.append(source.creatureId
      ? link(source.text, '/bestiary/#c=' + source.creatureId)
      : el('span', 'hint', source.text));
  }
  if (definition?.wiki) {
    n.append(link('Valheim Wiki', definition.wiki));
  }
  return n;
}

function modifiers(parent, creature) {
  for (const [type, value] of Object.entries(creature.modifiers || {})) {
    if (value !== 'neutral' && !['chop', 'pickaxe'].includes(type)) {
      parent.append(el('p', 'hint', t('{type}: {resistance}', {
        type: t(type),
        resistance: t(value)
      })));
    }
  }
}

function renderBoss(prep) {
  const boss = VC_DATA.creatures[prep.id];
  const card = section('Boss prep', 'hero');
  const heading = el('div', 'boss-heading');
  const img = el('img');
  img.src = '/bestiary/' + boss.stars[0].image;
  img.alt = '';
  heading.append(img, el('h2', '', boss.name));
  card.replaceChildren(heading);
  const metrics = el('div', 'metrics');
  metrics.append(
    el('span', '', tn('HP {count}', VCRank.creatureHp(boss, 0, prep.biome, player))),
    el('span', '', VC_DATA.biomes.find(b => b.id === prep.biome)?.name || prep.biome)
  );
  card.append(metrics);
  const altar = el('details');
  altar.append(
    el('summary', '', t('Altar and summoning')),
    el('h3', '', prep.altar?.name || t('Not documented on the wiki.')),
    el('p', 'hint', prep.altar?.howToFind || t('Not documented on the wiki.'))
  );
  for (const item of prep.summonItems) {
    const itemName = (supplementalItems[item.id] || VPR_DATA.items[item.id])?.name || item.id;
    const p = el('p');
    p.append(summonLabel(item.id, item.count, itemName));
    altar.append(p);
  }
  altar.append(link(t('Source'), prep.source));
  card.append(altar);
  const attacks = el('details');
  attacks.append(el('summary', '', t('Attacks and resistances')));
  for (const attack of boss.stars[0].attacks || []) {
    attacks.append(el('h3', '', attack.name));
    for (const [type, amount] of Object.entries(attack.damage)) {
      if (!['chop', 'pickaxe'].includes(type)) {
        attacks.append(el('p', 'hint', tn('{count} {type} damage', amount, {
          type: t(type)
        })));
      }
    }
  }
  modifiers(attacks, boss);
  if (boss.otherImmunities?.includes('Stagger') || boss.staggerImmune ||
      boss.immune?.includes?.('Stagger') || boss.modifiers?.stagger === 'immune') {
    attacks.append(el('p', '', t('Immune to stagger')));
  }
  card.append(attacks);
  const power = el('details');
  power.append(el('summary', '', t('Forsaken Power')));
  if (prep.forsakenPower) {
    power.append(el('h3', '', prep.forsakenPower.name), el('p', 'hint', prep.forsakenPower.effect));
    if (prep.forsakenPower.cooldownSeconds) {
      power.append(el('p', 'hint', tn('Cooldown: {count} min', prep.forsakenPower.cooldownSeconds / 60)));
    }
  } else {
    power.append(el('p', 'hint', t('Not documented on the wiki.')));
  }
  card.append(power);
  const links = el('div', 'links');
  links.append(link('Bestiary', '/bestiary/#c=' + boss.id));
  if (boss.calculatorSlug) {
    links.append(link(
      'Damage Calculator',
      '/damage-calculator/?biome=' + prep.biome + '&target=' + boss.calculatorSlug
    ));
  }
  card.append(links);
  return card;
}

function recommendationContext(prep) {
  const boss = VC_DATA.creatures[prep.id];
  const open = revealed();
  const tier = Math.max(...VC_DATA.biomes.filter(b => open.includes(b.id)).map(b => b.tier));
  const weapons = Object.values(VC_DATA.weapons).filter(w => w.tier <= tier && open.includes(w.biome));
  // A boss cannot be staggered; preserve all other shared profile preferences.
  const rec = VCRank.recommend(boss, {
    id: prep.biome,
    tier
  }, weapons, {
    ...player,
    staggered: false
  });
  const recommendations = [...rec.melee, rec.magic, rec.bomb].filter(Boolean).sort((a, b) => b.dps - a.dps).slice(0, 3);
  const foods = VPAdvisor.bestCombos(VPR_DATA.food, 'boss', {
    unlockedBiomes: open,
    items: VPR_DATA.items,
    limit: 1
  })[0]?.foods || [];
  const damage = core.incomingDamage(boss);
  const elements = damage.filter(d => ['fire', 'frost', 'poison', 'lightning', 'spirit'].includes(d.type)).slice(0, 2);
  const meads = VPAdvisor.recommendMeads(VPR_DATA.meads, 'boss', {
    id: prep.id,
    unlockedBiomes: open
  });
  // Advisor context covers boss-specific rules. Incoming damage also covers
  // Queen poison and Yagluth fire without copying advisor data or algorithms.
  for (const element of elements) {
    const context = {
      poison: 'bonemass',
      frost: 'moder',
      fire: 'fader'
    }[element.type];
    if (context) {
      for (const pick of VPAdvisor.recommendMeads(VPR_DATA.meads, 'boss', {
        id: context,
        unlockedBiomes: open
      }).filter(p => p.mead.effect?.resistances?.some(r =>
        r.type.toLowerCase() === element.type && r.multiplier < 1
      ))) {
        if (!meads.some(p => p.mead.id === pick.mead.id)) {
          meads.unshift(pick);
        }
      }
    }
  }
  // Keep one strongest available healing mead and all relevant resistances.
  const chosen = meads.filter(p => p.priority >= 10000);
  const healing = meads.find(p => p.priority < 10000);
  if (healing) {
    chosen.push(healing);
  }
  const items = {
    ...VPPlanner.definitions(VPR_DATA),
    ...supplementalItems,
    ...Object.fromEntries(Object.values(VC_DATA.weapons).map(w => [w.id, {
      ...w,
      recipe: w.levels?.[0] ? {
        station: w.station || 'Workbench',
        stationLevel: Math.max(...w.levels
          .filter(l => l.quality <= (player.quality === 'max' ? w.maxQuality : player.quality))
          .map(l => l.stationLevel || 1)),
        materials: w.levels
          .filter(l => l.quality <= (player.quality === 'max' ? w.maxQuality : player.quality))
          .flatMap(l => l.materials),
        yields: 1
      } : null
    }]))
  };
  for (const food of foods) {
    if (food.isFeast && items[food.id]?.recipe) {
      items[food.id].recipe = {
        ...items[food.id].recipe,
        yields: (food.yields || 1) * (food.servings || 1)
      };
    }
  }
  return {
    boss,
    rec,
    recommendations,
    foods,
    meads: chosen,
    damage,
    elements,
    items
  };
}

function renderWeapons(ctx) {
  const n = section('Weapons');
  const grid = el('div', 'recommendations');
  for (const rec of ctx.recommendations) {
    const w = Object.values(VC_DATA.weapons).find(w => w.id === rec.weapon);
    const card = el('article', 'recommendation');
    card.append(
      link(w.name, '/smithy/#item=' + w.id),
      el('p', 'hint', tn('{count} DPS', rec.dps)),
      el('p', 'hint', tn('{count} seconds to defeat', rec.timeToKill))
    );
    grid.append(card);
  }
  n.append(grid, link(t('Your character profile'), '/bestiary/'));
  if (!ctx.recommendations.length) {
    n.append(el('p', 'hint', t('No recommendations available at your current progress.')));
  }
  return n;
}

function renderDefense(ctx) {
  const n = section('Defenses');
  for (const damage of ctx.damage) {
    n.append(el('p', '', tn('{count} {type} damage', damage.amount, {
      type: t(damage.type)
    })));
  }
  n.append(el('p', 'hint', t('Damage totals add attack types; they are not damage per second.')));
  for (const { mead } of ctx.meads) {
    n.append(link(mead.name, '/provisions/#item=' + mead.id), el('p', 'hint', mead.effect?.text || ''));
  }
  for (const armor of VC_DATA.armor.filter(a => revealed().includes(a.biome))) {
    const pieces = (armor.pieces || []).filter(p => ctx.elements.some(d =>
      (p.resistances || []).some(r =>
        typeof r === 'string' && r.toLowerCase().includes(d.type) &&
        /resistant|immune/i.test(r) && !/^weak/i.test(r)
      )
    ));
    for (const p of pieces) {
      n.append(el('p', '', p.name), link(t('Open in Smithy'), '/smithy/#set=' + armor.id));
    }
  }
  return n;
}

function renderFood(ctx) {
  const n = section('Food and meads');
  const grid = el('div', 'recommendations');
  for (const food of ctx.foods) {
    const card = el('article', 'recommendation');
    card.append(
      el('strong', '', food.name),
      el('p', 'hint', tn('HP {count}', food.health)),
      el('p', 'hint', tn('Stamina {count}', food.stamina)),
      el('p', 'hint', tn('{count} min', food.duration / 60))
    );
    grid.append(card);
  }
  n.append(grid);
  const loadout = core.provisionsLoadout(state, ctx);
  n.append(link(t('Open in Provisions'), '/provisions/#l=' + VPPlanner.encode(loadout, VPR_DATA)));
  return n;
}

function renderPacking(prep, ctx) {
  const n = section('Packing list');
  const portalControl = check(
    t('Include a Portal'),
    state.portal && revealed().includes(ctx.items.portal?.biome),
    value => {
      state.portal = value;
      render();
    },
    'include-portal'
  );
  portalControl.querySelector('input').disabled = !revealed().includes(ctx.items.portal?.biome);
  n.append(portalControl);
  const lines = core.packingList({
    ...state,
    portal: state.portal && revealed().includes(ctx.items.portal?.biome)
  }, {
    ...ctx,
    bossPrep: prep,
    weapon: ctx.recommendations[0]
  });
  for (const line of lines) {
    const isSummon = prep.summonItems?.some((s) => s.id === line.id);
    let labelContent;
    if (isSummon) {
      const itemName = ctx.items[line.id]?.name || line.id;
      labelContent = summonLabel(line.id, line.quantity, itemName, { stopPropagation: true });
    } else {
      labelContent = tn('{count}× {name}', line.quantity, {
        name: ctx.items[line.id]?.name || line.id,
      });
    }
    n.append(
      check(
        labelContent,
        state.checked.includes(line.id),
        (value) => {
          state.checked = value ? [...state.checked, line.id] : state.checked.filter((id) => id !== line.id);
          render();
        },
        'pack-' + line.id
      )
    );
  }
  return {
    node: n,
    lines
  };
}

function renderShopping(lines, ctx) {
  const n = section('Shopping list', 'shopping');
  n.append(check(t('Show raw materials'), state.breakdown, value => {
    state.breakdown = value;
    render();
  }, 'breakdown'));
  const products = lines.filter(l => !state.checked.includes(l.id)).map(l => ({
    item: l.id,
    amount: l.quantity
  }));
  const full = VCShopping.breakdown(products, ctx.items, 20);
  const materials = state.breakdown ? full.materials : products;
  const text = lines => lines.map(m => tn('{count}× {name}', m.amount, {
    name: ctx.items[m.item]?.name || m.item
  }));
  for (const m of materials) {
    const row = el('div', 'row');
    row.append(el('strong', '', text([m])[0]));
    const sources = el('details');
    sources.append(el('summary', '', t('Sources')), safeSources(ctx.items[m.item]));
    row.append(sources);
    n.append(row);
  }
  const blocked = products.concat(full.materials).filter(m => ctx.items[m.item]?.teleportable === false);
  if (blocked.length) {
    n.append(el('p', 'warning', t("Can't be teleported") + ': ' +
      [...new Set(blocked.map(m => ctx.items[m.item].name))].join(', ')));
  }
  const stations = [...new Set(full.steps.map(s => s.station))];
  if (stations.length) {
    n.append(el('h3', '', t('Required stations')));
    for (const name of stations) {
      const station = [...VPR_DATA.stations, ...supplementalStations].find(s => s.name === name || s.id === name);
      const details = el('details');
      const level = Math.max(1, ...full.steps
        .filter(s => s.station === name)
        .map(s => ctx.items[s.product]?.recipe?.stationLevel || 1));
      details.append(el('summary', '', tn('{station} · level {count}', level, {
        station: name
      })));
      if (station?.materials) {
        details.append(el('p', 'hint', text(station.materials).join(', ')));
      }
      details.append(link(t('Source'), station?.wiki ||
        'https://valheim.weirdgloop.org/w/' + encodeURIComponent(name.replaceAll(' ', '_'))));
      n.append(details);
    }
    n.append(el('p', 'hint', t('Station building materials are shown separately.')));
  }
  if (full.steps.length) {
    const details = el('details');
    details.append(el('summary', '', t('Station steps')));
    for (const s of full.steps) {
      details.append(el('p', 'hint', tn('{count}× {name} at {station}', s.amount, {
        name: s.productName,
        station: s.station
      })));
    }
    n.append(details);
  }
  n.append(button(t('Copy list'), () => copy([
    'Expedition',
    t('Shopping list'),
    ...text(materials),
    t('Required stations'),
    ...stations
  ].join('\n'), n), 'copy-list'));
  return n;
}

function raidCard(event) {
  const n = el('article', 'raid');
  n.append(el('h3', '', event.startMessage), el('p', 'hint', tn('{count} seconds', event.durationSeconds)));
  n.append(el('p', 'hint', event.biomes
    .filter(b => revealed().includes(b))
    .map(b => biomes().find(x => x.id === b)?.id.replaceAll('-', ' ') || b)
    .map(b => b.replace(/\b\w/g, c => c.toUpperCase()))
    .join(', ')));
  for (const c of event.creatureDetails) {
    if (!c.biomes.some(b => revealed().includes(b))) {
      n.append(el('p', 'hint', t('A later creature')));
      continue;
    }
    n.append(link(c.name, '/bestiary/#c=' + c.id));
    const weaknesses = el('div');
    modifiers(weaknesses, c);
    n.append(weaknesses);
  }
  for (const c of event.conditions.filter(c => !c.boss)) {
    n.append(el('p', 'hint', t('Assumed once you have killed {name}.', {
      name: c.biomes.some(b => revealed().includes(b)) ? c.name : t('A later creature')
    })));
  }
  for (const note of event.notes) {
    n.append(el('p', 'hint', note));
  }
  n.append(link(t('Source'), event.source));
  return n;
}

function renderAfter(prep) {
  const n = section('After the fight');
  n.querySelector('h2').textContent = t('After you defeat {name}', {
    name: prep.name
  });
  const changes = core.afterDefeating(prep.id, VCProgress.get(), data, revealed());
  for (const [key, title] of [['added', 'Starts'], ['removed', 'Ends']]) {
    n.append(el('h3', '', t(title)));
    for (const event of changes[key]) {
      n.append(el('p', '', event.startMessage));
    }
    if (!changes[key].length) {
      n.append(el('p', 'hint', t('None')));
    }
  }
  return n;
}

function renderTips(prep) {
  const n = section('Tips');
  const list = el('ul', 'tip-list');
  for (const tip of data.tips.filter(tip => !tip.boss || tip.boss === prep.id)) {
    const row = el('li');
    row.append(el('span', '', t(tip.text)), link(t('Source'), tip.source));
    list.append(row);
  }
  n.append(list);
  return n;
}

function renderRaids() {
  const parent = document.getElementById('raids-panel');
  parent.replaceChildren();
  const rules = section('World-based raid rules', 'rule-box');
  for (const [key, count, values] of [
    [
      'Every {count} minutes: {chance}% chance of a random event.',
      46,
      { chance: number(20) }
    ],
    [
      'Within {count} m of at least {structures} base structures, outside dungeons. The hunted event is an exception.',
      40,
      { structures: number(3) }
    ]
  ]) {
    rules.append(el('p', '', tn(key, count, values)));
  }
  rules.append(
    el('p', '', t(
      'Stay in the event area until the timer runs out; it pauses without players, except during the hunted event.'
    )),
    el('p', 'hint', t('Player-based raids use different requirements and are not calculated here.')),
    el('p', 'hint', t('Nonboss conditions are assumed when their biome is revealed.')),
    link(t('Source'), 'https://valheim.weirdgloop.org/w/Events')
  );
  parent.append(rules);
  const groups = core.raidStates(VCProgress.get(), data, revealed());
  for (const [key, title] of [['now', 'Can happen now'], ['ended', 'Ended'], ['next', 'Coming next']]) {
    const n = section(title);
    const grid = el('div', 'raid-grid');
    for (const e of groups[key]) {
      grid.append(raidCard(e));
    }
    if (!groups[key].length) {
      n.append(el('p', 'hint', t('None')));
    }
    n.append(grid);
    parent.append(n);
  }
  const hidden = data.events.filter(e => core.hidden(e, data, revealed()));
  if (hidden.length) {
    const n = section('Later raids');
    for (const event of hidden) {
      n.append(el('p', 'locked', t('A later raid')));
    }
    parent.append(n);
  }
  const next = core.nextBoss(VCProgress.get(), data);
  if (next && eligible(next)) {
    parent.append(renderAfter(next));
  }
}

async function render() {
  const version = ++renderVersion;
  const focusId = document.activeElement?.id;
  if (state.auto) {
    state.boss = core.nextBoss(VCProgress.get(), data)?.id ?? preparations.at(-1).id;
  }
  save();
  VCI18n.apply();
  const picker = document.querySelector('.vc-language-picker');
  if (picker) {
    picker.setAttribute('aria-label', t('Language'));
    picker.options[0].textContent = t('Auto (browser)');
  }
  for (const id of ['boss', 'raids']) {
    const tabButton = document.getElementById('tab-' + id);
    tabButton.setAttribute('aria-selected', String(id === tab));
    tabButton.tabIndex = id === tab ? 0 : -1;
    document.getElementById(id === 'boss' ? 'boss-panel' : 'raids-panel').hidden = id !== tab;
  }
  if (tab === 'raids') {
    renderRaids();
    return;
  }
  renderControls();
  const parent = document.getElementById('boss-content');
  parent.replaceChildren();
  const prep = current();
  if (!eligible(prep)) {
    parent.append(el('p', 'locked', t('Reveal the biome to prepare for this boss.')));
    return;
  }
  if (!loaded) {
    parent.append(el('p', 'empty', t('Loading preparation data…')));
    try {
      busy = true;
      await loadDependencies();
    } catch {
      busy = false;
      parent.replaceChildren(el('p', 'warning', t('Could not load preparation data.')), button(t('Retry'), render));
      return;
    }
    busy = false;
    if (version !== renderVersion) {
      return;
    }
  }
  const ctx = recommendationContext(prep);
  const layout = el('div', 'layout');
  const main = el('div');
  const packing = renderPacking(prep, ctx);
  main.append(
    renderBoss(prep),
    renderWeapons(ctx),
    renderDefense(ctx),
    renderFood(ctx),
    packing.node,
    renderAfter(prep),
    renderTips(prep)
  );
  layout.append(main, renderShopping(packing.lines, ctx));
  parent.replaceChildren(layout);
  if (focusId) {
    document.getElementById(focusId)?.focus({
      preventScroll: true
    });
  }
}

function hash() {
  const imported = core.decodePrep(location.hash, data);
  if (imported) {
    state = imported;
    state.auto = false;
    setPlayer(state.players);
    tab = 'boss';
  } else if (location.hash === '#raids') {
    tab = 'raids';
  } else {
    const id = new URLSearchParams(location.hash.slice(1)).get('boss');
    if (preparations.some(b => b.id === id)) {
      state.boss = id;
      state.auto = false;
      tab = 'boss';
    }
  }
  render();
}

for (const id of ['boss', 'raids']) {
  document.getElementById('tab-' + id).addEventListener('click', () => {
    tab = id;
    history.replaceState(null, '', id === 'raids' ? '#raids' : state.auto ? '#' : '#boss=' + current().id);
    render();
  });
}
document.getElementById('tabs').addEventListener('keydown', event => {
  if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
    event.preventDefault();
    const id = event.key === 'Home' ? 'boss' : event.key === 'End' ? 'raids' : tab === 'boss' ? 'raids' : 'boss';
    document.getElementById('tab-' + id).click();
    document.getElementById('tab-' + id).focus();
  }
});
window.addEventListener('hashchange', hash);
VCProgress.onChange(render);
VCI18n.onChange(render);
window.addEventListener('storage', event => {
  if (event.key === PLAYER_STORAGE_KEY || event.key === null) {
    player = readPlayerState().player;
    render();
  }
});
window.addEventListener('vc:player-change', event => {
  if (event.detail) {
    player = sanitizePlayer(event.detail);
  } else {
    player = readPlayerState().player;
  }
  if (!busy) {
    render();
  }
});
VCI18n.mountPicker('#language-picker');
hash();
