/* Safe, CSP-compliant Items Compendium Application */
(function () {
  'use strict';

  const BIOMES = [
    { id: 'meadows', name: 'Meadows', order: 1 },
    { id: 'black-forest', name: 'Black Forest', order: 2 },
    { id: 'swamp', name: 'Swamp', order: 3 },
    { id: 'ocean', name: 'Ocean', order: 3 },
    { id: 'mountain', name: 'Mountain', order: 4 },
    { id: 'plains', name: 'Plains', order: 5 },
    { id: 'mistlands', name: 'Mistlands', order: 6 },
    { id: 'ashlands', name: 'Ashlands', order: 7 },
    { id: 'deep-north', name: 'Deep North', order: 8 },
  ];

  const t = (key, values) => (globalThis.VCI18n ? globalThis.VCI18n.t(key, values) : key);
  const number = (value) =>
    new Intl.NumberFormat(globalThis.VCI18n?.locale?.() || 'en', { maximumFractionDigits: 2 }).format(value);
  const tn = (key, count, values) =>
    globalThis.VCI18n?.tn
      ? globalThis.VCI18n.tn(globalThis.VC_MESSAGES || {}, key, count, { count: number(count), ...values })
      : `${count} ${key}`;

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
  const itemsById = new Map(itemsData.map((it) => [it.id, it]));

  let selectedCategory = 'all';
  let selectedBiome = 'all';
  let searchQuery = '';
  let activeModalItem = null;
  let noticeTimer = null;

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
      return globalThis.VCProgress.revealedBiomes(BIOMES);
    }
    return BIOMES.map((b) => b.id);
  }

  function isBiomeRevealed(biomeId) {
    if (!biomeId) return true;
    return getRevealedBiomes().includes(biomeId);
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

  function openModal(item) {
    activeModalItem = item;
    const modal = document.getElementById('item-modal');
    const backdrop = document.getElementById('item-modal-backdrop');
    const modalName = document.getElementById('modal-item-name');
    const modalBody = document.getElementById('modal-body');

    if (!modal || !backdrop || !modalName || !modalBody) return;

    modalName.textContent = item.name;
    modalBody.replaceChildren();

    // 1. Overview
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

    const stats = el('div', 'modal-stats');
    if (item.weight != null) {
      stats.append(el('span', '', t('Weight: {weight}', { weight: item.weight })));
    }
    if (item.stack != null) {
      stats.append(el('span', '', t('Stack: {stack}', { stack: item.stack })));
    }
    details.append(stats);
    overview.append(details);
    modalBody.append(overview);

    // 2. Sources Section
    const sourcesSection = el('section', 'modal-section');
    sourcesSection.append(el('h3', '', t('Sources')));

    const hasCreatures = item.sources?.creatures?.length > 0;
    const hasLocations = item.sources?.locations?.length > 0;
    const hasRecipe = item.sources?.recipe != null;
    const hasTraders = item.sources?.traders?.length > 0;

    if (!hasCreatures && !hasLocations && !hasRecipe && !hasTraders) {
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

      if (hasRecipe) {
        sourcesSection.append(el('p', 'modal-text-item', t('Crafting recipe:')));
        const r = item.sources.recipe;
        const stationText = r.station ? `${r.station} (lvl ${r.stationLevel || 1})` : '';
        const matTexts = (r.materials || []).map((m) => `${m.amount || 1}× ${m.name || m.item}`).join(', ');
        sourcesSection.append(el('p', 'modal-text-item', `${stationText}: ${matTexts}`));
      }

      if (hasTraders) {
        sourcesSection.append(el('p', 'modal-text-item', t('Sold by:')));
        for (const tr of item.sources.traders) {
          const traderName = tr.text || String(tr);
          let traderSlug = 'haldor';
          if (/hildir/i.test(traderName)) traderSlug = 'hildir';
          else if (/witch/i.test(traderName)) traderSlug = 'bog-witch';
          const p = el('p', 'modal-text-item');
          const a = el('a', 'item-link', traderName);
          a.href = `/traders/#trader=${traderSlug}&item=${encodeURIComponent(item.id)}`;
          p.append(a);
          sourcesSection.append(p);
        }
      }
    }
    modalBody.append(sourcesSection);

    // 3. Used In Section
    const usedInSection = el('section', 'modal-section');
    usedInSection.append(el('h3', '', t('Used in')));

    const u = item.usedIn || {};
    const hasWeapons = u.weapons?.length > 0;
    const hasArmor = u.armor?.length > 0;
    const hasFood = u.food?.length > 0;
    const hasMeads = u.meads?.length > 0;
    const hasComfort = u.comfort?.length > 0;
    const hasExpedition = u.expedition?.length > 0;
    const hasStations = u.stations?.length > 0;

    if (!hasWeapons && !hasArmor && !hasFood && !hasMeads && !hasComfort && !hasExpedition && !hasStations) {
      usedInSection.append(el('p', 'modal-text-item', '—'));
    } else {
      if (hasWeapons) {
        usedInSection.append(el('p', 'modal-text-item', `${t('Weapons')} (${u.weapons.length}):`));
        const list = el('div', 'modal-links-list');
        for (const w of u.weapons) {
          const a = el('a', 'modal-link-tag', w.name);
          a.href = `/smithy/#item=${encodeURIComponent(w.id)}`;
          list.append(a);
        }
        usedInSection.append(list);
      }

      if (hasArmor) {
        usedInSection.append(el('p', 'modal-text-item', `${t('Armor')} (${u.armor.length}):`));
        const list = el('div', 'modal-links-list');
        for (const arm of u.armor) {
          const a = el('a', 'modal-link-tag', arm.name);
          a.href = arm.set ? `/smithy/#set=${encodeURIComponent(arm.set)}` : `/smithy/#item=${encodeURIComponent(arm.id)}`;
          list.append(a);
        }
        usedInSection.append(list);
      }

      if (hasFood) {
        usedInSection.append(el('p', 'modal-text-item', `${t('Food')} (${u.food.length}):`));
        const list = el('div', 'modal-links-list');
        for (const fd of u.food) {
          const a = el('a', 'modal-link-tag', fd.name);
          a.href = `/provisions/#item=${encodeURIComponent(fd.id)}`;
          list.append(a);
        }
        usedInSection.append(list);
      }

      if (hasMeads) {
        usedInSection.append(el('p', 'modal-text-item', `${t('Meads')} (${u.meads.length}):`));
        const list = el('div', 'modal-links-list');
        for (const md of u.meads) {
          const a = el('a', 'modal-link-tag', md.name);
          a.href = `/provisions/#item=${encodeURIComponent(md.id)}`;
          list.append(a);
        }
        usedInSection.append(list);
      }

      if (hasComfort) {
        usedInSection.append(el('p', 'modal-text-item', `${t('Comfort')} (${u.comfort.length}):`));
        const list = el('div', 'modal-links-list');
        for (const cp of u.comfort) {
          const a = el('a', 'modal-link-tag', cp.name);
          a.href = `/comfort/#item=${encodeURIComponent(cp.id)}`;
          list.append(a);
        }
        usedInSection.append(list);
      }

      if (hasExpedition) {
        usedInSection.append(el('p', 'modal-text-item', `${t('Boss Summoning')} (${u.expedition.length}):`));
        const list = el('div', 'modal-links-list');
        for (const ex of u.expedition) {
          const a = el('a', 'modal-link-tag', ex.bossName || ex.name);
          a.href = `/expedition/#boss=${encodeURIComponent(ex.bossId || ex.id)}`;
          list.append(a);
        }
        usedInSection.append(list);
      }

      if (hasStations) {
        usedInSection.append(el('p', 'modal-text-item', `${t('Stations & Upgrades')} (${u.stations.length}):`));
        const list = el('div', 'modal-links-list');
        for (const st of u.stations) {
          list.append(el('span', 'modal-link-tag', st.name));
        }
        usedInSection.append(list);
      }
    }
    modalBody.append(usedInSection);

    // 4. Actions
    const actions = el('div', 'modal-actions');
    const cartBtn = button(
      t('Add to shopping cart'),
      () => {
        addToCart(item);
      },
      'add-cart-btn'
    );
    actions.append(cartBtn);

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
    const modal = document.getElementById('item-modal');
    const backdrop = document.getElementById('item-modal-backdrop');
    if (modal) modal.hidden = true;
    if (backdrop) backdrop.hidden = true;
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

    for (const b of BIOMES) {
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

    renderBiomeChips();

    const grid = document.getElementById('items-grid');
    const countSpan = document.getElementById('items-count');
    const emptyNotice = document.getElementById('items-empty');

    if (!grid) return;

    const query = searchQuery.trim().toLowerCase();

    const filtered = itemsData.filter((item) => {
      // Category filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }
      // Biome filter
      if (selectedBiome !== 'all' && item.biome !== selectedBiome) {
        return false;
      }
      // Search query
      if (query) {
        const nameMatch = item.name.toLowerCase().includes(query);
        const idMatch = item.id.toLowerCase().includes(query);
        if (!nameMatch && !idMatch) return false;
      }
      return true;
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
      const revealed = isBiomeRevealed(item.biome);
      const card = el('div', 'item-card' + (!revealed ? ' is-locked' : ''));
      card.id = `item-card-${item.id}`;
      card.dataset.id = item.id;

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

      if (!revealed) {
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
        const stats = el('div', 'item-card-stats');
        const weightText = item.weight != null ? `${item.weight} kg` : '—';
        const stackText = item.stack != null ? `×${item.stack}` : '';
        stats.append(el('span', '', weightText));
        if (stackText) stats.append(el('span', '', stackText));
        card.append(stats);

        card.addEventListener('click', () => {
          openModal(item);
        });
      }

      grid.append(card);
    }
  }

  function handleHash() {
    const hash = location.hash;
    if (!hash || !hash.includes('item=')) return;
    const match = hash.match(/item=([^&]+)/);
    if (!match) return;
    const itemId = decodeURIComponent(match[1]);
    const item = itemsById.get(itemId);
    if (!item) return;

    if (item.biome && !isBiomeRevealed(item.biome)) {
      revealBiome(item.biome);
    }

    // Reset filters if item is outside current view
    if (selectedBiome !== 'all' && item.biome && selectedBiome !== item.biome) {
      selectedBiome = 'all';
    }
    if (selectedCategory !== 'all' && item.category !== selectedCategory) {
      selectedCategory = 'all';
      const catSelect = document.getElementById('category-select');
      if (catSelect) catSelect.value = 'all';
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
      catSelect.addEventListener('change', (e) => {
        selectedCategory = e.target.value;
        render();
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
