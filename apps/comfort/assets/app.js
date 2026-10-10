/* Safe DOM rendering for Comfort Planner. */
(function () {
  'use strict';
  const data = VCO_DATA;
  const t = (key, values) => VCI18n.t(key, values);
  const number = value => new Intl.NumberFormat(VCI18n.locale(), { maximumFractionDigits: 2 }).format(value);
  const tn = (key, count, values) => VCI18n.tn(VC_MESSAGES, key, count, { count: number(count), ...values });
  const byId = id => data.pieces.find(p => p.id === id);
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const button = (text, action, className, id) => {
    const node = el('button', className, text); node.type = 'button';
    if (id) node.id = id;
    node.addEventListener('click', action); return node;
  };
  function checkbox(key, checked, action, id) {
    const label = el('label', 'check-control');
    const input = el('input'); input.type = 'checkbox'; input.checked = checked;
    if (id) input.id = id;
    input.addEventListener('change', () => action(input.checked));
    label.append(input, el('span', '', t(key))); return label;
  }
  const read = () => { try { return JSON.parse(localStorage.getItem('vco.build')); } catch { return null; } };
  let state = VCComfort.decodeBuild(location.hash, data) ?? VCComfort.sanitize(read(), data);
  const revealed = () => VCProgress.revealedBiomes(data.biomes);
  const eligible = p => p.tier != null && revealed().includes(p.biome) && (state.seasonal || !p.seasonal);
  // Imported or previously saved locked pieces never leak into totals or shopping.
  const current = () => ({ ...state, pieces: state.pieces.filter(id => eligible(byId(id))) });
  let noticeTimer;
  function notify(key) {
    const notice = document.getElementById('notice'); notice.textContent = t(key);
    clearTimeout(noticeTimer); noticeTimer = setTimeout(() => { notice.textContent = ''; }, 4000);
  }
  function save() { try { localStorage.setItem('vco.build', JSON.stringify(state)); } catch { /* Keep the in-memory build. */ } }
  function choose(piece) {
    if (!eligible(piece)) return;
    if (state.pieces.includes(piece.id)) state.pieces = state.pieces.filter(id => id !== piece.id);
    else {
      if (piece.category) state.pieces = state.pieces.filter(id => byId(id).category !== piece.category);
      state.pieces.push(piece.id);
    }
    update();
  }
  function renderSummary() {
    const level = VCComfort.comfortLevel(current(), data, { sheltered: state.sheltered });
    const max = VCComfort.comfortLevel(VCComfort.bestBuild(data, revealed(), { seasonal: state.seasonal }), data, { sheltered: state.sheltered }).total;
    const summary = document.getElementById('summary'); summary.replaceChildren();
    summary.append(el('p', 'summary-value', tn('Comfort {count} / {max}', level.total, { max: number(max) })), el('p', 'summary-value', tn('Rested {count} min', VCComfort.restedMinutes(level.total))));
    const effects = el('div', 'effects');
    for (const [key, amount] of [['HP regeneration +{count}%', data.rules.restedEffects.healthRegenPercent], ['Stamina regeneration +{count}%', data.rules.restedEffects.staminaRegenPercent], ['Eitr regeneration +{count}%', data.rules.restedEffects.eitrRegenPercent], ['XP +{count}%', data.rules.restedEffects.xpPercent]]) effects.append(el('span', '', tn(key, amount)));
    summary.append(effects);
    const parts = el('details', 'parts'); parts.append(el('summary', '', t('Comfort breakdown')));
    const list = el('ul');
    for (const part of level.parts) list.append(el('li', '', tn('+{count} · {name}', part.comfort, { name: byId(part.id)?.name ?? t(part.id === 'base' ? 'Base comfort' : 'Shelter') })));
    parts.append(list); summary.append(parts);
    if (!state.sheltered) summary.append(el('p', 'hint', t('Without shelter, all other comfort sources are ignored.')));
    document.getElementById('mobile-summary').textContent = tn('Comfort {count}', level.total);
  }
  function renderControls() {
    const controls = document.getElementById('controls'); controls.replaceChildren();
    const toggles = el('div', 'toggles');
    toggles.append(checkbox('Sheltered', state.sheltered, value => { state.sheltered = value; update(); }, 'sheltered'), checkbox('Include seasonal items', state.seasonal, value => { state.seasonal = value; update(); }, 'seasonal'));
    const actions = el('div', 'actions');
    actions.append(button(t('Best I can build'), () => {
      state.pieces = VCComfort.bestBuild(data, revealed(), { seasonal: state.seasonal }); state.conditions = {}; update();
    }, 'primary', 'best-build'), button(t('Clear'), () => { state.pieces = []; state.conditions = {}; update(); }, '', 'clear-build'), button(t('Share build'), () => {
      const url = new URL(location.href); url.hash = 'b=' + VCComfort.encodeBuild(state, data);
      history.replaceState(null, '', url); copy(url.href, controls, 'Link copied!');
    }, '', 'share-build'));
    controls.append(toggles, actions);
  }
  function materialList(materials) { return materials.map(m => tn('{count}× {name}', m.amount, { name: data.items[m.item]?.name ?? m.item })).join('\n'); }
  function materialNodes(materials) {
    const wrap = el('span', 'mat-nodes');
    materials.forEach((m, idx) => {
      if (idx > 0) wrap.append(document.createTextNode(', '));
      wrap.append(document.createTextNode(`${m.amount}× `));
      const a = el('a', 'item-link', data.items[m.item]?.name ?? m.item);
      a.href = `/items/#item=${encodeURIComponent(m.item)}`;
      wrap.append(a);
    });
    return wrap;
  }
  function renderUpgrades() {
    const container = document.getElementById('upgrades');
    const heading = el('h2', '', t('Next upgrades')); heading.id = 'upgrades-title'; container.replaceChildren(heading);
    if (!state.sheltered) { container.append(el('p', 'hint', t('Enable Sheltered to benefit from furniture upgrades.'))); return; }
    const upgrades = VCComfort.nextUpgrades(current(), data, revealed(), { seasonal: state.seasonal, limit: 5 });
    if (!upgrades.length) container.append(el('p', 'hint', t('No comfort upgrades available at your current progress.')));
    const list = el('div', 'upgrade-list');
    for (const upgrade of upgrades) {
      const row = el('div', 'upgrade'), text = el('div');
      text.append(el('strong', '', tn('+{count} · {name}', upgrade.gain, { name: upgrade.piece.name })));
      if (upgrade.replaces.length) text.append(el('p', 'hint', t('Instead of {name}', { name: upgrade.replaces.map(id => byId(id).name).join(', ') })));
      const upMats = el('p', 'hint'); upMats.append(materialNodes(upgrade.piece.materials)); text.append(upMats);
      row.append(text, button(t('Use this'), () => { state.pieces = upgrade.selection; delete state.conditions[upgrade.id]; update(); }, '', 'upgrade-' + upgrade.id)); list.append(row);
    }
    container.append(list);
  }
  function pieceCard(piece) {
    const selected = current().pieces.includes(piece.id);
    const card = el('article', 'piece-card' + (selected ? ' selected' : '')); card.id = 'item-' + piece.id; card.tabIndex = -1;
    const heading = el('div', 'heading');
    if (piece.image) { const image = el('img'); image.src = piece.image; image.alt = ''; image.loading = 'lazy'; heading.append(image); }
    heading.append(el('h3', '', piece.name)); card.append(heading, el('span', 'badge', tn('+{count} comfort', piece.comfort)));
    const recipe = el('details'); recipe.append(el('summary', '', t('Recipe')));
    const recP = el('p', 'hint recipe'); recP.append(materialNodes(piece.materials)); recipe.append(recP);
    recipe.append(el('p', 'hint', piece.station ? data.stations.find(s => s.id === piece.station)?.name ?? piece.station : t('No station')));
    const link = el('a', 'hint', 'Valheim Wiki'); link.href = piece.wiki; link.target = '_blank'; link.rel = 'noopener noreferrer'; recipe.append(link); card.append(recipe);
    if (!piece.category) card.append(checkbox(piece.name, selected, () => choose(piece), 'select-' + piece.id));
    else {
      const pick = button(t(selected ? 'Selected' : 'Select'), () => choose(piece), 'pick', 'select-' + piece.id); pick.setAttribute('aria-pressed', String(selected));
      pick.setAttribute('aria-label', t(selected ? 'Deselect {name}' : 'Select {name}', { name: piece.name })); card.append(pick);
    }
    if (selected) {
      card.append(checkbox('I have it', state.have.includes(piece.id), value => { state.have = value ? [...state.have, piece.id] : state.have.filter(id => id !== piece.id); update(); }, 'have-' + piece.id));
      for (const [condition, label] of [['lit', 'Lit'], ['heated', 'Heated'], ['hearthRange8m', 'Within Hearth bonus range']]) if (piece.conditions[condition]) {
        const control = checkbox(label, state.conditions[piece.id]?.[condition] !== false, value => { state.conditions[piece.id] = { ...state.conditions[piece.id], [condition]: value }; update(); }, condition + '-' + piece.id);
        control.classList.add('condition'); card.append(control);
      }
    }
    if (piece.id === 'snow-lantern') card.append(el('p', 'hint', t('Snow Lantern breaks quickly outside Mountain and Deep North.')));
    return card;
  }
  function renderCatalog() {
    const catalog = document.getElementById('catalog'); catalog.replaceChildren();
    for (const category of [...data.categories, { id: null, name: 'Seasonal bonuses' }]) {
      const section = el('section', 'category'); section.id = 'category-' + (category.id ?? 'seasonal');
      const heading = el('div', 'category-heading'); heading.append(el('h2', '', t(category.name)));
      if (category.id) heading.append(button(t('Clear'), () => { state.pieces = state.pieces.filter(id => byId(id).category !== category.id); update(); }, '', 'clear-' + category.id));
      section.append(heading, el('p', 'category-note', t(category.id ? 'Only the highest comfort piece in each category counts.' : 'Maypole and Yule Tree each add their own bonus.')));
      const pieces = data.pieces.filter(p => p.category === category.id && (state.seasonal || !p.seasonal));
      const grid = el('div', 'piece-grid'); grid.append(...pieces.filter(eligible).map(pieceCard)); section.append(grid);
      const locked = el('div', 'locked-biomes');
      for (const biome of data.biomes) if (!revealed().includes(biome.id) && pieces.some(p => p.biome === biome.id)) {
        const row = el('div', 'locked-row'); row.append(el('span', 'hint', biome.name + ' · ' + t('Locked until you reach this biome.')), button(t('Reveal'), () => VCProgress.openBiome(biome.id), '', 'reveal-' + category.id + '-' + biome.id)); locked.append(row);
      }
      if (pieces.some(p => p.tier == null)) locked.append(el('p', 'hint', t('Some wiki recipes are incomplete. Unverified pieces are excluded from recommendations.')));
      if (!state.seasonal && !category.id) locked.append(el('p', 'hint', t('Enable Include seasonal items to see seasonal bonuses.')));
      section.append(locked); catalog.append(section);
    }
  }
  function sources(item) {
    const container = el('div', 'sources');
    for (const source of item?.sources ?? []) {
      if (source.kind === 'creature' && source.creatureId) {
        if (source.biomes?.length && !source.biomes.some(id => revealed().includes(id))) {
          const row = el('div', 'locked-row'); row.append(el('span', 'hint', t('Locked until you reach this biome.')), button(t('Reveal'), () => { for (const id of source.biomes) VCProgress.openBiome(id); })); container.append(row);
        } else { const link = el('a', '', source.text); link.href = '/bestiary/#c=' + encodeURIComponent(source.creatureId); container.append(link); }
      } else container.append(el('span', 'hint', source.text.replace(/^\*\s*/, '')));
    }
    if (item?.wiki) { const link = el('a', '', 'Valheim Wiki'); link.href = item.wiki; link.target = '_blank'; link.rel = 'noopener noreferrer'; container.append(link); }
    return container;
  }
  function shoppingText(plan) {
    return ['Comfort Planner', ...current().pieces.map(id => byId(id).name), '', t('Shopping list'), materialList(plan.materials), '', t('Required stations'), ...plan.stations.map(s => s.name), '', t('Station steps'), ...plan.steps.map(s => tn('{count}× {name} at {station}', s.amount, { name: s.productName, station: s.station }))].join('\n');
  }
  async function copy(text, parent, success = 'Copied!') {
    parent.querySelector('.copy-fallback')?.remove();
    try { await navigator.clipboard.writeText(text); notify(success); }
    catch {
      const fallback = el('div', 'copy-fallback'), field = el('textarea'); field.value = text; field.readOnly = true; field.setAttribute('aria-label', t('Copy list'));
      fallback.append(el('p', 'hint', t('Copy failed. Select and copy the text below.')), field); parent.append(fallback); field.focus(); field.select();
    }
  }
  function renderShopping() {
    const content = document.getElementById('shopping-content'); content.replaceChildren();
    const plan = VCComfort.shopping(current(), data);
    content.append(checkbox('Show raw materials', state.breakdown, value => { state.breakdown = value; update(); }, 'breakdown'));
    if (!plan.materials.length) content.append(el('p', 'hint', t('Choose furniture you still need to build a shopping list.')));
    for (const material of plan.materials) {
      const row = el('div', 'material'); const strong = el('strong'); strong.append(materialNodes([material])); row.append(strong);
      const details = el('details'); details.append(el('summary', '', t('Sources')), sources(data.items[material.item])); row.append(details); content.append(row);
    }
    if (plan.nonTeleportable.length) content.append(el('p', 'warning', t("Can't be teleported") + ': ' + plan.nonTeleportable.map(m => data.items[m.item].name).join(', ')));
    if (plan.steps.length) {
      const details = el('details'); details.append(el('summary', '', t('Station steps'))); const steps = el('ol', 'shopping-steps');
      for (const step of plan.steps) steps.append(el('li', '', tn('{count}× {name} at {station}', step.amount, { name: step.productName, station: step.station }))); details.append(steps); content.append(details);
    }
    if (plan.stations.length) {
      const required = el('section'); required.append(el('h3', '', t('Required stations')));
      for (const station of plan.stations) {
        const row = el('details'); row.append(el('summary', '', station.name));
        if (station.materials?.length) { const p = el('p', 'hint recipe'); p.append(materialNodes(station.materials)); row.append(p); }
        if (station.wiki) { const link = el('a', 'hint', 'Valheim Wiki'); link.href = station.wiki; row.append(link); }
        required.append(row);
      }
      required.append(el('p', 'hint', t('Station building materials are shown separately.'))); content.append(required);
    }
    const copyButton = button(t('Copy list'), () => copy(shoppingText(plan), content), '', 'copy-list'); copyButton.disabled = !plan.materials.length; content.append(copyButton);
  }
  function renderTips() {
    const container = document.getElementById('tips'), heading = el('h2', '', t('Tips')); heading.id = 'tips-title'; container.replaceChildren(heading);
    const list = el('ul', 'tip-list');
    for (const tip of data.tips.filter(tip => !tip.biome || revealed().includes(tip.biome))) {
      const row = el('li'); row.append(el('span', '', tip.count !== undefined ? tn(tip.text, tip.count) : t(tip.text)));
      const link = el('a', '', t('Source')); link.href = tip.source; link.target = '_blank'; link.rel = 'noopener noreferrer'; row.append(link); list.append(row);
    }
    container.append(list);
  }
  function update() {
    const focusId = document.activeElement?.id;
    save(); renderSummary(); renderControls(); renderUpgrades(); renderCatalog(); renderShopping(); renderTips();
    if (focusId) document.getElementById(focusId)?.focus({ preventScroll: true });
  }
  function deepLink() {
    const id = new URLSearchParams(location.hash.slice(1)).get('item'), piece = byId(id);
    if (!piece) return;
    if (piece.seasonal && !state.seasonal) { state.seasonal = true; update(); }
    if (!eligible(piece)) { document.getElementById('category-' + (piece.category ?? 'seasonal'))?.scrollIntoView({ block: 'center' }); notify('Reveal the biome to view this piece.'); return; }
    const card = document.getElementById('item-' + piece.id); card?.classList.add('highlight'); card?.scrollIntoView({ block: 'center' }); card?.focus({ preventScroll: true });
  }
  function render() {
    VCI18n.apply(); const picker = document.querySelector('.vc-language-picker'); picker.setAttribute('aria-label', t('Language')); picker.options[0].textContent = t('Auto (browser)'); update(); deepLink();
  }
  const panel = document.getElementById('shopping-panel'), opener = document.getElementById('open-shopping'), backdrop = document.getElementById('shopping-backdrop');
  function setDrawer(open) {
    panel.classList.toggle('open', open); backdrop.hidden = !open; document.body.classList.toggle('shopping-open', open); opener.setAttribute('aria-expanded', String(open));
    if (open) { panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); document.getElementById('close-shopping').focus(); }
    else { panel.removeAttribute('role'); panel.removeAttribute('aria-modal'); opener.focus(); }
  }
  opener.addEventListener('click', () => setDrawer(true));
  document.getElementById('close-shopping').addEventListener('click', () => setDrawer(false)); backdrop.addEventListener('click', () => setDrawer(false));
  document.addEventListener('keydown', event => {
    if (!panel.classList.contains('open')) return;
    if (event.key === 'Escape') { setDrawer(false); return; }
    if (event.key === 'Tab') {
      const focusable = [...panel.querySelectorAll('button:not(:disabled),input,a,summary,textarea')].filter(node => node.getClientRects().length);
      const first = focusable[0], last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  VCI18n.mountPicker('#language-picker'); VCI18n.onChange(render);
  VCProgress.onChange(() => { update(); deepLink(); });
  window.addEventListener('hashchange', () => { const imported = VCComfort.decodeBuild(location.hash, data); if (imported) state = imported; update(); deepLink(); });
  window.addEventListener('storage', event => { if (event.key === 'vco.build' || event.key === null) { state = VCComfort.sanitize(read(), data); update(); } });
  render();
})();
