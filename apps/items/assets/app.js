/* Safe, CSP-compliant Items Compendium Application */
(function () {
  'use strict';

  const t = (key, values) => (globalThis.VCI18n ? globalThis.VCI18n.t(key, values) : key);
  const number = (value) =>
    new Intl.NumberFormat(globalThis.VCI18n?.locale?.() || 'en', { maximumFractionDigits: 2 }).format(value);
  const tn = (key, count, values) =>
    globalThis.VCI18n?.tn
      ? globalThis.VCI18n.tn(globalThis.VC_MESSAGES || {}, key, count, { count: number(count), ...values })
      : `${count} ${key}`;

  // 17 distinct categories + backward compatibility aliases
  const CATEGORY_FILTERS = {
    all: null,
    material: ['material'],
    metal: ['metal'],
    weapon: ['weapon'],
    shield: ['shield'],
    armor: ['armor'],
    ammo: ['ammo'],
    tool: ['tool'],
    food: ['food'],
    ingredient: ['ingredient'],
    mead: ['mead'],
    drop: ['drop'],
    trophy: ['trophy'],
    building: ['building'],
    valuable: ['valuable'],
    summoning: ['summoning'],
    accessory: ['accessory'],
    casting: ['casting'],
    // Backward-compatibility aliases
    'weapon,tool': ['weapon', 'tool'],
    'armor,shield': ['armor', 'shield'],
    'food,mead,food-ingredient': ['food', 'mead', 'ingredient'],
    'food-ingredient': ['ingredient'],
  };

  const CATEGORY_LABELS = {
    material: 'Material',
    metal: 'Metal',
    weapon: 'Weapon',
    shield: 'Shield',
    armor: 'Armor',
    ammo: 'Ammo',
    tool: 'Tool',
    food: 'Food',
    ingredient: 'Ingredient',
    mead: 'Mead',
    drop: 'Monster Drop',
    trophy: 'Trophy',
    building: 'Building',
    valuable: 'Valuable',
    summoning: 'Summoning',
    accessory: 'Accessories',
    casting: 'Casting',
    'food-ingredient': 'Ingredient',
  };

  const CATEGORY_DEFS = [
    { id: 'all', label: 'All categories' },
    { id: 'material', label: 'Materials & Resources' },
    { id: 'metal', label: 'Metals & Ores' },
    { id: 'weapon', label: 'Weapons' },
    { id: 'shield', label: 'Shields' },
    { id: 'armor', label: 'Armor & Clothing' },
    { id: 'ammo', label: 'Ammunition' },
    { id: 'tool', label: 'Tools & Equipment' },
    { id: 'food', label: 'Food & Meals' },
    { id: 'ingredient', label: 'Ingredients & Crops' },
    { id: 'mead', label: 'Meads & Potions' },
    { id: 'drop', label: 'Monster Drops' },
    { id: 'trophy', label: 'Trophies' },
    { id: 'building', label: 'Building & Furniture' },
    { id: 'valuable', label: 'Valuables & Treasures' },
    { id: 'summoning', label: 'Boss Summoning & Keys' },
    { id: 'accessory', label: 'Accessories' },
    { id: 'casting', label: 'Casting' },
  ];

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  };

  const button = (text, action, className, id) => {
    const node = el('button', className, text);
    node.type = 'button';
    if (id) node.id = id;
    if (action) node.addEventListener('click', action);
    return node;
  };

  function resolveImage(img) {
    if (!img) return null;
    if (img.startsWith('../')) return img;
    if (img.startsWith('img/')) return '../smithy/' + img;
    return img;
  }

  const itemsData = (globalThis.VC_ITEMS_DATA && globalThis.VC_ITEMS_DATA.items) || [];
  const biomes = (globalThis.VC_ITEMS_DATA && globalThis.VC_ITEMS_DATA.biomes) || [];
  const itemsById = new Map(itemsData.map((it) => [it.id, it]));

  let selectedCategory = 'all';
  let selectedBiome = 'all';
  let selectedSort = 'tier-asc';
  try {
    const storedSort = localStorage.getItem('vc.itemsSort');
    if (storedSort) selectedSort = storedSort;
  } catch {}

  let selectedTeleport = 'all';
  try {
    const storedTeleport = localStorage.getItem('vc.itemsTeleport');
    if (storedTeleport) selectedTeleport = storedTeleport;
  } catch {}

  let modalHistory = [];
  let searchQuery = '';
  let activeModalItem = null;
  let noticeTimer = null;
  let showAllBiomes = false;
  try {
    const stored = localStorage.getItem('vc.itemsShowAll');
    if (stored !== null) {
      showAllBiomes = stored === 'true';
    }
  } catch {}

  function showNotice(key) {
    const notice = document.getElementById('notice');
    if (!notice) return;
    notice.textContent = t(key);
    notice.classList.add('show');
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => {
      notice.classList.remove('show');
    }, 3000);
  }

  function getRevealedBiomes() {
    if (globalThis.VCProgress && typeof globalThis.VCProgress.revealedBiomes === 'function') {
      return globalThis.VCProgress.revealedBiomes(biomes);
    }
    return biomes.map((b) => b.id);
  }

  function isBiomeRevealed(biomeId) {
    if (!biomeId || showAllBiomes) return true;
    return getRevealedBiomes().includes(biomeId);
  }

  // Items revealed one by one (session only, never written to vc.progress).
  const tempRevealed = new Set();

  function isItemRevealed(item) {
    return isBiomeRevealed(item.biome) || tempRevealed.has(item.id);
  }

  function revealBiome(biomeId) {
    if (globalThis.VCProgress && typeof globalThis.VCProgress.visit === 'function') {
      globalThis.VCProgress.visit(biomeId, true);
    }
  }

  function addToCart(item, count = 1) {
    try {
      const raw = localStorage.getItem('va.cart');
      const cart = raw ? JSON.parse(raw) : [];
      const existing = cart.find((c) => (c.item === item.id || c.pieceId === item.id) && !c.setId);
      if (existing) {
        existing.quantity = (existing.quantity || existing.amount || 1) + count;
        existing.amount = existing.quantity;
      } else {
        cart.push({
          id: 'item_' + item.id + '_' + Math.random().toString(36).slice(2, 7),
          item: item.id,
          pieceId: item.id,
          quantity: count,
          amount: count,
        });
      }
      localStorage.setItem('va.cart', JSON.stringify(cart));
      showNotice('Added to shopping cart.');
    } catch {
      showNotice('Added to shopping cart.');
    }
  }

  function formatDuration(seconds) {
    if (seconds == null) return null;
    return seconds >= 120 ? `${Math.round(seconds / 60)} min` : `${seconds} s`;
  }

  function damageText(damage) {
    if (!damage) return null;
    const parts = Object.entries(damage)
      .filter(([, v]) => v != null && v > 0)
      .map(([type, v]) => `${v} ${type.charAt(0).toUpperCase() + type.slice(1)}`);
    return parts.length > 0 ? parts.join(' + ') : null;
  }

  function navigateToUrl(url) {
    try {
      if (typeof history !== 'undefined' && typeof history.pushState === 'function') {
        history.pushState(null, '', url);
      }
    } catch (_) {}
    const hashIdx = url.indexOf('#');
    if (hashIdx !== -1 && typeof location !== 'undefined') {
      location.hash = url.slice(hashIdx);
    }
    handleHash();
  }

  function navigateToItem(itemId) {
    navigateToUrl(`/items/#item=${encodeURIComponent(itemId)}`);
  }

  // A material chip in a recipe: links into the compendium when the item exists.
  function materialNode(m) {
    const targetItem = itemsById.get(m.item);
    const displayName = targetItem ? targetItem.name : (m.name || m.item);
    const label = `${m.amount || 1}× ${displayName}`;
    if (targetItem) {
      const a = el('a', 'modal-link-tag', label);
      a.href = `/items/#item=${encodeURIComponent(m.item)}`;
      a.title = displayName;
      a.addEventListener('click', (e) => {
        if (e && typeof e.preventDefault === 'function') e.preventDefault();
        navigateToItem(m.item);
      });
      return a;
    }
    return el('span', 'modal-link-tag modal-link-plain', label);
  }

  function openModal(item, isBack = false) {
    if (!isBack && activeModalItem && activeModalItem.id !== item.id) {
      const existingIdx = modalHistory.findLastIndex ? modalHistory.findLastIndex((it) => it.id === item.id) : -1;
      if (existingIdx !== -1) {
        modalHistory = modalHistory.slice(0, existingIdx);
      } else {
        modalHistory.push(activeModalItem);
      }
    }
    activeModalItem = item;
    const modal = document.getElementById('item-modal');
    const backdrop = document.getElementById('item-modal-backdrop');
    const modalName = document.getElementById('modal-item-name');
    const modalBody = document.getElementById('modal-body');
    const backBtn = document.getElementById('modal-back');

    if (!modal || !backdrop || !modalName || !modalBody) return;

    if (backBtn) {
      if (modalHistory.length > 0) {
        const prev = modalHistory[modalHistory.length - 1];
        backBtn.textContent = `← ${t('Back to {item}', { item: isItemRevealed(prev) ? prev.name : t('Locked item') })}`;
        backBtn.hidden = false;
      } else {
        backBtn.hidden = true;
      }
    }

    modalBody.scrollTop = 0;
    const lockedItem = !isItemRevealed(item);
    modalName.textContent = lockedItem ? t('Locked item') : item.name;
    modalBody.replaceChildren();

    // 0. Spoiler notice if biome is unvisited
    if (lockedItem) {
      const banner = el('div', 'modal-spoiler-banner');
      const biomeObj = biomes.find((b) => b.id === item.biome);
      const biomeName = biomeObj ? biomeObj.name : item.biome.replace('-', ' ');
      banner.append(el('span', '', t('Locked until you reach this biome: {biome}', { biome: t(biomeName) })));
      const revBtn = button(t('Reveal'), () => {
        tempRevealed.add(item.id);
        render();
        openModal(item, true);
      }, 'reveal-btn');
      banner.append(revBtn);
      modalBody.append(banner);
      modal.hidden = false;
      backdrop.hidden = false;
      return;
    }

    // 1. Overview: image + badges + weight/stack
    const overview = el('div', 'modal-overview');
    const resolvedImg = resolveImage(item.image);
    if (resolvedImg) {
      const img = el('img', 'modal-image');
      img.src = resolvedImg;
      img.alt = item.name;
      overview.append(img);
    } else {
      const placeholder = el('div', 'modal-image item-card-placeholder', '✦');
      overview.append(placeholder);
    }

    const details = el('div', 'modal-details');
    const badges = el('div', 'modal-badges');

    const catLabel = CATEGORY_LABELS[item.category];
    if (catLabel) {
      badges.append(el('span', 'badge badge-category', t(catLabel)));
    }
    if (item.biome) {
      const bBadge = el('span', 'badge badge-biome', item.biome.replace('-', ' '));
      badges.append(bBadge);
    }
    if (item.tier != null) {
      const tBadge = el('span', 'badge badge-tier', `Tier ${item.tier}`);
      badges.append(tBadge);
    }
    if (item.teleportable === false) {
      const noPort = el('span', 'badge badge-non-teleport', t("Can't be teleported"));
      badges.append(noPort);
    }
    details.append(badges);

    const basicStats = el('div', 'modal-stats');
    if (item.weight != null) {
      basicStats.append(el('span', '', t('Weight: {weight}', { weight: item.weight })));
    }
    if (item.stack != null) {
      basicStats.append(el('span', '', t('Stack: {stack}', { stack: item.stack })));
    }
    details.append(basicStats);
    overview.append(details);
    modalBody.append(overview);

    // 2. Stats (damage, armor, food values, effects…)
    const s = item.stats;
    const statRows = [];
    if (s) {
      const dmg = damageText(s.damage) || damageText(s.damageMax);
      if (dmg) statRows.push(t('Damage: {damage}', { damage: dmg }));
      if (s.blockArmor != null) statRows.push(t('Block: {block}', { block: s.blockArmor }));
      if (s.skill) statRows.push(t('Skill: {skill}', { skill: s.skill }));
      if (s.hands) statRows.push(s.hands.toUpperCase());
      if (s.maxQuality != null && s.maxQuality > 1) {
        statRows.push(t('Max quality: {count}', { count: s.maxQuality }));
      }
      if (s.armor != null) {
        statRows.push(
          s.armorMax != null && s.armorMax !== s.armor
            ? t('Armor: {armor} (max {max})', { armor: s.armor, max: s.armorMax })
            : t('Armor: {armor}', { armor: s.armor })
        );
      }
      if (s.durability != null) statRows.push(t('Durability: {durability}', { durability: s.durability }));
      if (s.movementSpeed) statRows.push(t('Movement speed: {speed}', { speed: s.movementSpeed }));
      if (s.setBonus) statRows.push(t('Set bonus: {bonus}', { bonus: s.setBonus }));
      if (s.health != null) statRows.push(t('Health: {health}', { health: s.health }));
      if (s.stamina != null) statRows.push(t('Stamina: {stamina}', { stamina: s.stamina }));
      if (s.eitr != null) statRows.push(t('Eitr: {eitr}', { eitr: s.eitr }));
      if (s.healing != null) statRows.push(t('Healing: {healing}', { healing: s.healing }));
      if (s.duration != null) statRows.push(t('Duration: {duration}', { duration: formatDuration(s.duration) }));
      if (s.servings != null) statRows.push(t('Servings: {count}', { count: s.servings }));
      if (s.effect) statRows.push(t('Effect: {effect}', { effect: s.effect }));
      if (s.cooldown != null) statRows.push(t('Cooldown: {cooldown}', { cooldown: formatDuration(s.cooldown) }));
      if (s.comfort != null) statRows.push(t('Comfort: {comfort}', { comfort: s.comfort }));
      if (s.furniture) statRows.push(s.furniture);
    }
    if (statRows.length > 0) {
      const statsSection = el('section', 'modal-section');
      statsSection.append(el('h3', '', t('Stats')));
      const grid = el('div', 'stat-grid');
      for (const row of statRows) {
        grid.append(el('span', 'stat-cell', row));
      }
      statsSection.append(grid);
      modalBody.append(statsSection);
    }

    // 3. Crafting Recipe (station + level, materials link back into the compendium)
    if (item.recipe && (item.recipe.materials || []).length > 0) {
      const recipeSection = el('section', 'modal-section');
      recipeSection.append(el('h3', '', t('Crafting Recipe')));

      const stationLine = el('p', 'modal-text-item');
      if (item.recipe.station) {
        stationLine.append(
          el('strong', '', item.recipe.station),
          el('span', '', ` — ${t('Level {level}', { level: item.recipe.stationLevel || 1 })}`)
        );
      } else {
        stationLine.textContent = '—';
      }
      recipeSection.append(stationLine);

      const mats = el('div', 'modal-links-list');
      for (const m of item.recipe.materials) {
        mats.append(materialNode(m));
      }
      recipeSection.append(mats);

      if (item.recipe.yields && item.recipe.yields > 1) {
        recipeSection.append(el('p', 'modal-text-item', t('Yields: {count}', { count: item.recipe.yields })));
      }
      if (item.category === 'mead') {
        recipeSection.append(el('p', 'modal-text-item', t('Ferment the mead base in a Fermenter.')));
      }
      modalBody.append(recipeSection);
    }

    // 4. Sources (where to find it)
    const sourcesSection = el('section', 'modal-section');
    sourcesSection.append(el('h3', '', t('Sources')));

    const hasCreatures = item.sources?.creatures?.length > 0;
    const hasLocations = item.sources?.locations?.length > 0;
    const hasTraders = item.sources?.traders?.length > 0;

    if (!hasCreatures && !hasLocations && !hasTraders && !item.recipe) {
      sourcesSection.append(el('p', 'modal-text-item', '—'));
    } else {
      if (hasCreatures) {
        sourcesSection.append(el('p', 'modal-text-item', t('Dropped by:')));
        const creaturesList = el('div', 'modal-links-list');
        for (const c of item.sources.creatures) {
          const a = el('a', 'modal-link-tag', c.name);
          a.href = `/bestiary/#c=${encodeURIComponent(c.id)}`;
          creaturesList.append(a);
        }
        sourcesSection.append(creaturesList);
      }

      if (hasLocations) {
        sourcesSection.append(el('p', 'modal-text-item', t('Found in:')));
        for (const loc of item.sources.locations) {
          sourcesSection.append(el('p', 'modal-text-item', loc.text || String(loc)));
        }
      }

      if (hasTraders) {
        sourcesSection.append(el('p', 'modal-text-item', t('Sold by:')));
        const tradersList = el('div', 'modal-links-list');
        for (const tr of item.sources.traders) {
          const a = el('a', 'modal-link-tag', tr.name);
          a.href = `/traders/#trader=${encodeURIComponent(tr.id)}&item=${encodeURIComponent(item.id)}`;
          tradersList.append(a);
        }
        sourcesSection.append(tradersList);
      }

      if (!hasCreatures && !hasLocations && !hasTraders && item.recipe) {
        sourcesSection.append(el('p', 'modal-text-item', t('Crafted from the recipe above.')));
      }
    }
    modalBody.append(sourcesSection);

    // 5. Used In (recipes that need this item)
    const usedInSection = el('section', 'modal-section');
    usedInSection.append(el('h3', '', t('Used in')));

    const u = item.usedIn || {};
    const groups = [
      { key: 'weapons', label: t('Weapons') },
      { key: 'armor', label: t('Armor') },
      { key: 'food', label: t('Food') },
      { key: 'meads', label: t('Meads') },
      { key: 'comfort', label: t('Comfort') },
      { key: 'expedition', label: t('Boss Summoning') },
      { key: 'stations', label: t('Building & Stations') },
      { key: 'crafting', label: t('Crafting & Materials') },
    ];
    const total = groups.reduce((sum, g) => sum + (u[g.key]?.length || 0), 0);

    if (total === 0) {
      usedInSection.append(el('p', 'modal-text-item', '—'));
    } else {
      for (const g of groups) {
        const entries = u[g.key] || [];
        if (entries.length === 0) continue;
        usedInSection.append(el('p', 'modal-text-item', `${g.label} (${entries.length}):`));
        const list = el('div', 'modal-links-list');
        for (const entry of entries) {
          const label = entry.name || entry.bossName || entry.id;
          let href = null;
          let isItemLink = false;
          if (entry.itemId && itemsById.has(entry.itemId)) {
            href = `/items/#item=${encodeURIComponent(entry.itemId)}`;
            isItemLink = true;
          } else if (g.key === 'weapons') {
            href = `/smithy/#item=${encodeURIComponent(entry.id)}`;
          } else if (g.key === 'armor') {
            href = entry.set ? `/smithy/#set=${encodeURIComponent(entry.set)}` : `/smithy/#item=${encodeURIComponent(entry.id)}`;
          } else if (g.key === 'food' || g.key === 'meads') {
            href = `/provisions/#item=${encodeURIComponent(entry.id)}`;
          } else if (g.key === 'comfort') {
            href = `/comfort/#item=${encodeURIComponent(entry.id)}`;
          } else if (g.key === 'expedition') {
            href = `/expedition/#boss=${encodeURIComponent(entry.bossId || entry.id)}`;
          }
          if (href) {
            const a = el('a', 'modal-link-tag', label);
            a.href = href;
            if (isItemLink) {
              a.addEventListener('click', (e) => {
                if (e && typeof e.preventDefault === 'function') e.preventDefault();
                navigateToUrl(href);
              });
            }
            list.append(a);
          } else {
            list.append(el('span', 'modal-link-tag modal-link-plain', label));
          }
        }
        usedInSection.append(list);
      }
    }
    modalBody.append(usedInSection);

    // 6. Actions: cross-tool buttons, quantity + cart, wiki
    const crossLinks = item.crossLinks || {};
    const crossDefs = [
      { href: crossLinks.smithy, label: 'Open in Smithy →' },
      { href: crossLinks.provisions, label: 'Open in Provisions →' },
      { href: crossLinks.comfort, label: 'Open in Comfort Planner →' },
      { href: crossLinks.traders, label: 'Open in Trader Ledger →' },
    ];
    if (hasCreatures) {
      crossDefs.push({
        href: `/bestiary/#c=${encodeURIComponent(item.sources.creatures[0].id)}`,
        label: 'Open in Bestiary →',
      });
    }
    const present = crossDefs.filter((d) => d.href);
    if (present.length > 0) {
      const crossRow = el('div', 'modal-crosslinks');
      for (const d of present) {
        const a = el('a', 'cross-link-btn', t(d.label));
        a.href = d.href;
        crossRow.append(a);
      }
      modalBody.append(crossRow);
    }

    const actions = el('div', 'modal-actions');
    const cartGroup = el('div', 'cart-group');
    const qty = el('input', 'cart-qty');
    qty.type = 'number';
    qty.min = '1';
    qty.max = '9999';
    qty.value = '1';
    qty.setAttribute('aria-label', t('Qty'));
    const cartBtn = button(
      t('Add to shopping cart'),
      () => {
        const count = Math.max(1, Math.min(9999, Math.round(Number(qty.value) || 1)));
        addToCart(item, count);
      },
      'add-cart-btn'
    );
    cartGroup.append(qty, cartBtn);
    actions.append(cartGroup);

    if (item.wiki) {
      const wikiA = el('a', 'wiki-link', `${t('Wiki')} ↗`);
      wikiA.href = item.wiki;
      wikiA.target = '_blank';
      wikiA.rel = 'noopener noreferrer';
      actions.append(wikiA);
    }
    modalBody.append(actions);

    modal.hidden = false;
    backdrop.hidden = false;
  }

  function closeModal() {
    activeModalItem = null;
    modalHistory = [];
    const modal = document.getElementById('item-modal');
    const backdrop = document.getElementById('item-modal-backdrop');
    const backBtn = document.getElementById('modal-back');
    if (modal) modal.hidden = true;
    if (backdrop) backdrop.hidden = true;
    if (backBtn) backBtn.hidden = true;
    // Drop the deep-link hash without scrolling or adding a history entry.
    if (location.hash && location.hash.includes('item=') && typeof history !== 'undefined' && history.replaceState) {
      history.replaceState(null, '', location.pathname + location.search);
    }
  }

  function renderCategoryChips() {
    const container = document.getElementById('category-chips');
    if (!container) return;
    container.replaceChildren();

    const query = searchQuery.trim().toLowerCase();
    const matchesQueryAndBiome = (item) => {
      if (selectedBiome !== 'all' && item.biome !== selectedBiome) return false;
      if (selectedTeleport === 'yes' && item.teleportable === false) return false;
      if (selectedTeleport === 'no' && item.teleportable !== false) return false;
      if (query) {
        const nameMatch = item.name.toLowerCase().includes(query);
        const idMatch = item.id.toLowerCase().includes(query);
        const locNamesMatch = item.names && Object.values(item.names).some((n) => typeof n === 'string' && n.toLowerCase().includes(query));
        if (!nameMatch && !idMatch && !locNamesMatch) return false;
      }
      return true;
    };

    const categoryCounts = new Map();
    let totalCount = 0;
    for (const it of itemsData) {
      if (matchesQueryAndBiome(it)) {
        totalCount++;
        categoryCounts.set(it.category, (categoryCounts.get(it.category) || 0) + 1);
      }
    }

    for (const cat of CATEGORY_DEFS) {
      const isSelected = selectedCategory === cat.id;
      const chipClasses = ['category-chip'];
      if (isSelected) chipClasses.push('active');

      const count = cat.id === 'all' ? totalCount : (categoryCounts.get(cat.id) || 0);

      const chip = el('button', chipClasses.join(' '));
      chip.type = 'button';
      chip.dataset.category = cat.id;
      chip.append(
        el('span', 'chip-label', t(cat.label)),
        el('span', 'chip-count', number(count))
      );

      chip.addEventListener('click', () => {
        selectedCategory = cat.id;
        const catSelect = document.getElementById('category-select');
        if (catSelect) {
          catSelect.value = cat.id;
        }
        render();
      });
      container.append(chip);
    }
  }

  function renderBiomeChips() {
    const container = document.getElementById('biome-chips');
    if (!container) return;
    container.replaceChildren();

    // "All" chip
    const allChip = el('button', 'biome-chip' + (selectedBiome === 'all' ? ' active' : ''), t('All biomes'));
    allChip.type = 'button';
    allChip.addEventListener('click', () => {
      selectedBiome = 'all';
      render();
    });
    container.append(allChip);

    for (const b of biomes) {
      const revealed = isBiomeRevealed(b.id);
      const isSelected = selectedBiome === b.id;
      const chipClasses = ['biome-chip'];
      if (isSelected) chipClasses.push('active');
      if (!revealed) chipClasses.push('is-locked');

      const chipText = revealed ? b.name : `🔒 ${b.name}`;
      const chip = el('button', chipClasses.join(' '), chipText);
      chip.type = 'button';
      chip.dataset.biome = b.id;
      chip.addEventListener('click', () => {
        if (!revealed) {
          revealBiome(b.id);
        }
        selectedBiome = b.id;
        render();
      });
      container.append(chip);
    }
  }

  function render() {
    if (globalThis.VCI18n && typeof globalThis.VCI18n.apply === 'function') {
      globalThis.VCI18n.apply();
    }

    renderCategoryChips();
    renderBiomeChips();

    const grid = document.getElementById('items-grid');
    const countSpan = document.getElementById('items-count');
    const emptyNotice = document.getElementById('items-empty');
    const toggleBtn = document.getElementById('toggle-locked-btn');

    if (toggleBtn) {
      const isSpoilerOff = showAllBiomes;
      toggleBtn.classList.toggle('active', isSpoilerOff);
      toggleBtn.setAttribute('aria-pressed', String(isSpoilerOff));
      toggleBtn.textContent = isSpoilerOff ? t('Spoiler filter: Off') : t('Spoiler filter: On');
    }

    if (!grid) return;

    const query = searchQuery.trim().toLowerCase();

    const filtered = itemsData.filter((item) => {
      // Category filter (an option may cover several categories)
      const allowed = CATEGORY_FILTERS[selectedCategory];
      if (allowed && !allowed.includes(item.category)) {
        return false;
      }
      // Biome filter
      if (selectedBiome !== 'all' && item.biome !== selectedBiome) {
        return false;
      }
      // Teleportable filter
      if (selectedTeleport === 'yes' && item.teleportable === false) {
        return false;
      }
      if (selectedTeleport === 'no' && item.teleportable !== false) {
        return false;
      }
      // Search query
      if (query) {
        // A locked item must not be findable by name (search would leak its existence).
        if (!isItemRevealed(item)) return false;
        const nameMatch = item.name.toLowerCase().includes(query);
        const idMatch = item.id.toLowerCase().includes(query);
        const locNamesMatch = item.names && Object.values(item.names).some((n) => typeof n === 'string' && n.toLowerCase().includes(query));
        if (!nameMatch && !idMatch && !locNamesMatch) return false;
      }
      return true;
    });

    // Sorting
    const getProgression = (it) => {
      if (it.tier != null) return it.tier;
      return 99;
    };

    filtered.sort((a, b) => {
      if (selectedSort === 'name-asc') {
        return (a.name || '').localeCompare(b.name || '');
      }
      if (selectedSort === 'name-desc') {
        return (b.name || '').localeCompare(a.name || '');
      }
      if (selectedSort === 'weight-asc') {
        const wa = a.weight != null ? a.weight : Infinity;
        const wb = b.weight != null ? b.weight : Infinity;
        if (wa !== wb) return wa - wb;
        return (a.name || '').localeCompare(b.name || '');
      }
      if (selectedSort === 'weight-desc') {
        const wa = a.weight != null ? a.weight : -Infinity;
        const wb = b.weight != null ? b.weight : -Infinity;
        if (wa !== wb) return wb - wa;
        return (a.name || '').localeCompare(b.name || '');
      }
      // Default: 'tier-asc' (Progression / Tier: Meadows → Ashlands)
      const pa = getProgression(a);
      const pb = getProgression(b);
      if (pa !== pb) return pa - pb;
      return (a.name || '').localeCompare(b.name || '');
    });

    if (countSpan) {
      countSpan.textContent = tn('{count} items', filtered.length, { count: filtered.length });
    }

    if (filtered.length === 0) {
      grid.replaceChildren();
      if (emptyNotice) emptyNotice.hidden = false;
      return;
    }

    if (emptyNotice) emptyNotice.hidden = true;
    grid.replaceChildren();

    for (const item of filtered) {
      const revealed = isItemRevealed(item);
      const card = el('div', 'item-card' + (!revealed ? ' is-locked' : ''));
      card.id = `item-card-${item.id}`;
      card.dataset.id = item.id;

      if (!revealed) {
        const lockedTop = el('div', 'item-card-top');
        lockedTop.append(el('div', 'item-card-placeholder', '🔒'));
        const lockedInfo = el('div', 'item-card-info');
        lockedInfo.append(el('div', 'item-card-name', t('Locked item')));
        const lockedMeta = el('div', 'item-card-meta');
        if (item.biome) {
          lockedMeta.append(el('span', 'badge badge-biome', item.biome.replace('-', ' ')));
        }
        lockedInfo.append(lockedMeta);
        lockedTop.append(lockedInfo);
        card.append(lockedTop);

        const lockedCover = el('div', 'item-card-locked-cover');
        lockedCover.append(el('p', 'item-card-locked-text', t('Locked until you reach this biome.')));
        const revBtn = button(
          t('Reveal'),
          (e) => {
            e.stopPropagation();
            revealBiome(item.biome);
            render();
          },
          'reveal-btn'
        );
        lockedCover.append(revBtn);
        card.append(lockedCover);
      } else {
      const top = el('div', 'item-card-top');
      const resolvedImg = resolveImage(item.image);
      if (resolvedImg) {
        const img = el('img', 'item-card-image');
        img.src = resolvedImg;
        img.alt = item.name;
        img.loading = 'lazy';
        top.append(img);
      } else {
        const placeholder = el('div', 'item-card-placeholder', '✦');
        top.append(placeholder);
      }

      const info = el('div', 'item-card-info');
      const name = el('div', 'item-card-name', item.name);
      info.append(name);

      const meta = el('div', 'item-card-meta');
      const catLabel = CATEGORY_LABELS[item.category];
      if (catLabel) {
        meta.append(el('span', 'badge badge-category', t(catLabel)));
      }
      if (item.biome) {
        const bBadge = el('span', 'badge badge-biome', item.biome.replace('-', ' '));
        meta.append(bBadge);
      }
      if (item.tier != null) {
        const tBadge = el('span', 'badge badge-tier', `Tier ${item.tier}`);
        meta.append(tBadge);
      }
      if (item.teleportable === false) {
        const noPort = el('span', 'badge badge-non-teleport', t("Can't be teleported"));
        meta.append(noPort);
      }
      info.append(meta);
      top.append(info);
      card.append(top);

        const stats = el('div', 'item-card-stats');
        const weightText = item.weight != null ? `${item.weight} kg` : '—';
        const stackText = item.stack != null ? `×${item.stack}` : '';
        stats.append(el('span', '', weightText));
        if (stackText) stats.append(el('span', '', stackText));
        card.append(stats);
      }

      card.addEventListener('click', () => {
        openModal(item);
      });

      grid.append(card);
    }
  }

  function handleHash() {
    const hash = location.hash;
    if (!hash || !hash.includes('item=')) {
      if (activeModalItem) {
        closeModal();
      }
      return;
    }
    const match = hash.match(/item=([^&]+)/);
    if (!match) return;
    const itemId = decodeURIComponent(match[1]);
    const item = itemsById.get(itemId);
    if (!item) return;

    // Deep link never reveals anything: a locked item opens in its locked state.

    // Reset filters if item is outside current view
    if (selectedBiome !== 'all' && item.biome && selectedBiome !== item.biome) {
      selectedBiome = 'all';
    }
    const allowed = CATEGORY_FILTERS[selectedCategory];
    if (allowed && !allowed.includes(item.category)) {
      selectedCategory = 'all';
      const catSelect = document.getElementById('category-select');
      if (catSelect) catSelect.value = 'all';
    }
    if (selectedTeleport === 'yes' && item.teleportable === false) {
      selectedTeleport = 'all';
      const telSelect = document.getElementById('teleport-select');
      if (telSelect) telSelect.value = 'all';
    } else if (selectedTeleport === 'no' && item.teleportable !== false) {
      selectedTeleport = 'all';
      const telSelect = document.getElementById('teleport-select');
      if (telSelect) telSelect.value = 'all';
    }
    searchQuery = '';
    const searchInput = document.getElementById('item-search');
    if (searchInput) searchInput.value = '';

    render();

    const card = document.getElementById(`item-card-${item.id}`);
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    openModal(item);
  }

  function init() {
    if (globalThis.VCI18n && typeof globalThis.VCI18n.mountPicker === 'function') {
      globalThis.VCI18n.mountPicker('#language-picker');
    }

    const searchInput = document.getElementById('item-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        render();
      });
    }

    const catSelect = document.getElementById('category-select');
    if (catSelect) {
      catSelect.value = selectedCategory;
      catSelect.addEventListener('change', (e) => {
        selectedCategory = e.target.value;
        render();
      });
    }

    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
      sortSelect.value = selectedSort;
      sortSelect.addEventListener('change', (e) => {
        selectedSort = e.target.value;
        try {
          localStorage.setItem('vc.itemsSort', selectedSort);
        } catch {}
        render();
      });
    }

    const teleportSelect = document.getElementById('teleport-select');
    if (teleportSelect) {
      teleportSelect.value = selectedTeleport;
      teleportSelect.addEventListener('change', (e) => {
        selectedTeleport = e.target.value;
        try {
          localStorage.setItem('vc.itemsTeleport', selectedTeleport);
        } catch {}
        render();
      });
    }

    const toggleBtn = document.getElementById('toggle-locked-btn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        showAllBiomes = !showAllBiomes;
        try {
          localStorage.setItem('vc.itemsShowAll', String(showAllBiomes));
        } catch {}
        render();
      });
    }

    const modalBack = document.getElementById('modal-back');
    if (modalBack) {
      modalBack.addEventListener('click', () => {
        if (modalHistory.length > 0) {
          const prev = modalHistory.pop();
          if (typeof history !== 'undefined' && history.replaceState) {
            history.replaceState(null, '', `/items/#item=${encodeURIComponent(prev.id)}`);
          }
          openModal(prev, true);
        }
      });
    }

    const modalClose = document.getElementById('modal-close');
    if (modalClose) {
      modalClose.addEventListener('click', closeModal);
    }

    const modalBackdrop = document.getElementById('item-modal-backdrop');
    if (modalBackdrop) {
      modalBackdrop.addEventListener('click', closeModal);
    }

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && activeModalItem) {
        closeModal();
      }
    });

    window.addEventListener('hashchange', handleHash);

    if (globalThis.VCProgress && typeof globalThis.VCProgress.onChange === 'function') {
      globalThis.VCProgress.onChange(() => {
        render();
      });
    }

    if (globalThis.VCI18n && typeof globalThis.VCI18n.onChange === 'function') {
      globalThis.VCI18n.onChange(() => {
        render();
      });
    }

    window.addEventListener('storage', (e) => {
      if (e.key === 'vc.progress' || e.key === 'vc.openBiomes') {
        render();
      }
    });

    render();
    handleHash();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
