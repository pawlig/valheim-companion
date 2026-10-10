/**
 * Smithy — Valheim Companion
 * Vanilla JS Application
 */
(function (root, factory) {
  const exportsObj = factory();
  if (typeof globalThis !== 'undefined') {
    globalThis.VACart = exportsObj;
  }
  if (typeof window !== 'undefined') {
    window.VACart = exportsObj;
  }
  if (typeof module === 'object' && module.exports) {
    module.exports = exportsObj;
  }
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this), function () {
  'use strict';

  const t = (source, values) => globalThis.VCI18n
    ? VCI18n.t(globalThis.VC_MESSAGES || {}, source, values)
    : String(source).replace(/\{(\w+)\}/g, (match, key) => values?.[key] ?? match);
  const tn = (key, count, values) => VCI18n.tn(globalThis.VC_MESSAGES, key, count, values);
  const entityName = entity => globalThis.VCI18n ? VCI18n.name(entity) : entity?.name || '';
  const biomeName = biome => entityName(biome) || t('Unknown');
  const stationName = station => station ? station.split(/[·,;\/]/)[0].trim() : t('Station');
  const effectText = value => {
    const raw = String(value);
    const resistance = raw.match(/^(Resistant|Very Weak|Weak|Slightly weak)(?: \(([^)]+)\))?\s+(?:vs\.?|VS)\s+(.+)$/i);
    if (resistance) return t('{resistance} vs. {types}', {
      resistance: t(resistance[1].toLowerCase().replace(/(^| )\w/g, c => c.toUpperCase())) + (resistance[2] ? ' (' + resistance[2] + ')' : ''),
      types: resistance[3].split(/, | and /).join(', '),
    });
    const amount = raw.match(/^([+-]\d+%?)\s+(.+)$/);
    if (amount) {
      const damage = amount[2].match(/^(slash|pierce|blunt|fire|frost|lightning|poison|spirit|chop|pickaxe|pure) damage$/i);
      if (damage) return amount[1] + ' ' + t('{type} damage', { type: damage[1].charAt(0).toUpperCase() + damage[1].slice(1).toLowerCase() });
      return amount[1] + ' ' + t(amount[2].toLowerCase());
    }
    const trailing = raw.match(/^(.+?)(?::| skill)?\s+([+-]\d+%?)$/);
    if (trailing) return t(trailing[1]) + ' ' + trailing[2];
    return t(raw);
  };

  /**
   * Helper to create DOM element safely without innerHTML
   */
  function el(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined && text !== null) element.textContent = t(String(text));
    return element;
  }

  function pieceMaxQ(piece) {
    return piece?.levels && piece.levels.length > 0 ? piece.levels[piece.levels.length - 1].quality : 1;
  }

  function traderBadges(itemId) {
    const dataSource = (typeof window !== 'undefined' ? window.VA_DATA : null) || (typeof globalThis !== 'undefined' ? globalThis.VA_DATA : null);
    let traders = dataSource?.items?.[itemId]?.traders;
    if (!traders && dataSource?.armor) {
      for (const armor of dataSource.armor) {
        const piece = (armor.pieces || []).find(p => p.id === itemId);
        if (piece?.traders) {
          traders = piece.traders;
          break;
        }
      }
    }
    return (traders || []).map(trader => {
      const link = el('a', 'badge badge-source', trader.name);
      link.href = `/traders/#trader=${encodeURIComponent(trader.id)}&item=${encodeURIComponent(itemId)}`;
      return link;
    });
  }

  /**
   * LocalStorage Helpers (always wrapped in try/catch)
   */
  function getStoredShowAll() {
    try {
      return localStorage.getItem('va.showAll') === 'true';
    } catch {
      return false;
    }
  }

  function setStoredShowAll(val) {
    try {
      localStorage.setItem('va.showAll', String(val));
    } catch {
      // LocalStorage unavailable, ignore
    }
  }

  function getStoredOpenBiomes() {
    return VCProgress.revealedBiomes(window.VA_DATA.biomes);
  }

  function getManualOpenBiomes() {
    try {
      const raw = localStorage.getItem('vc.openBiomes');
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function setStoredOpenBiomes(openIds) {
    try {
      localStorage.setItem('vc.openBiomes', JSON.stringify(openIds));
    } catch {
      // LocalStorage unavailable, ignore
    }
  }

  function clearStoredOpenBiomes() {
    try {
      localStorage.removeItem('vc.openBiomes');
    } catch {
      // LocalStorage unavailable, ignore
    }
  }

  function getStoredCart() {
    if (globalThis.VCShopping?.cart?.read) {
      return globalThis.VCShopping.cart.read();
    }
    try {
      const raw = localStorage.getItem('va.cart');
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function setStoredCart(cart) {
    if (globalThis.VCShopping?.cart?.write) {
      globalThis.VCShopping.cart.write(cart);
      return;
    }
    try {
      localStorage.setItem('va.cart', JSON.stringify(cart));
    } catch {
      // LocalStorage unavailable, ignore
    }
  }

  function getStoredBreakdown() {
    try {
      return localStorage.getItem('va.breakdown') === 'true';
    } catch {
      return false;
    }
  }

  function setStoredBreakdown(val) {
    try {
      localStorage.setItem('va.breakdown', String(val));
    } catch {
      // LocalStorage unavailable, ignore
    }
  }

  function getStoredCatalogTab() {
    try {
      return localStorage.getItem('va.catalogTab') || 'armor';
    } catch {
      return 'armor';
    }
  }

  function setStoredCatalogTab(val) {
    try {
      localStorage.setItem('va.catalogTab', String(val));
    } catch {
      // LocalStorage unavailable, ignore
    }
  }

  function getStoredFurnaces() {
    try {
      const val = parseInt(localStorage.getItem('va.furnaces') || '1', 10);
      return val >= 1 && val <= 8 ? val : 1;
    } catch {
      return 1;
    }
  }

  function setStoredFurnaces(val) {
    try {
      localStorage.setItem('va.furnaces', String(val));
    } catch {
      // LocalStorage unavailable, ignore
    }
  }

  const categoryLabels = {
    spear: 'Spear',
    knife: 'Knife',
    pickaxe: 'Pickaxe',
    crossbow: 'Crossbow',
    bow: 'Bow',
    shield: 'Shield',
    fists: 'Fists',
    battleaxe: 'Battleaxe',
    axe: 'Axe',
    bomb: 'Bomb',
    polearm: 'Polearm',
    bolt: 'Bolt',
    sword: 'Sword',
    club: 'Club',
    arrow: 'Arrow',
    sledge: 'Sledge',
    magic: 'Magic'
  };

  function calculateTotalArmor(pieces) {
    let q1 = 0;
    let max = 0;
    for (const p of pieces) {
      if (p.levels && p.levels.length > 0) {
        q1 += p.levels[0].armor || 0;
        max += p.levels[p.levels.length - 1].armor || 0;
      }
    }
    return { q1, max };
  }

  /**
   * Pure calculation function: calculates smelting parameters (bars, coal, kiln wood, time)
   * from items in cart and wiki station parameters.
   */
  function calculateSmelting(cart, data, options) {
    const opts = options || {};
    const furnaceCount = Math.max(1, Math.min(8, parseInt(opts.furnaceCount || 1, 10) || 1));
    if (!cart || !Array.isArray(cart) || !data) {
      return {
        totalBars: 0,
        totalCoal: 0,
        totalKilnWood: 0,
        furnaceCount,
        seconds: 0,
        timeFormatted: '0:00',
        barsByItem: {}
      };
    }

    const pieceMap = new Map();
    (data.armor || []).forEach(a => {
      (a.pieces || []).forEach(p => pieceMap.set(p.id, p));
    });
    const weaponMap = new Map();
    (data.weapons || []).forEach(w => weaponMap.set(w.id, w));

    const definitions = Object.fromEntries([...pieceMap, ...weaponMap]);
    const rawMats = VCShopping.sumMaterials(cart, definitions);
    const smeltedBars = {};
    for (const step of VCShopping.breakdown(rawMats, data.items, 6).steps) {
      const station = step.station.toLowerCase();
      if (station.includes('smelter') || station.includes('blast furnace')) smeltedBars[step.product] = step.amount;
    }

    const smelter = (data.stations || []).find(s => s.id === 'smelter') || { secondsPerItem: 30, fuel: { perItem: 2 } };
    const blastFurnace = (data.stations || []).find(s => s.id === 'blast-furnace') || { secondsPerItem: 30, fuel: { perItem: 2 } };
    const kiln = (data.stations || []).find(s => s.id === 'charcoal-kiln') || { conversions: [{ ratio: 1 }] };

    let totalBars = 0;
    let totalCoal = 0;
    for (const [itemId, qty] of Object.entries(smeltedBars)) {
      totalBars += qty;
      const item = data.items && data.items[itemId];
      const isBlast = (item?.recipe?.station || '').toLowerCase().includes('blast');
      const st = isBlast ? blastFurnace : smelter;
      const coalPerBar = st.fuel?.perItem ?? 2;
      totalCoal += qty * coalPerBar;
    }

    const kilnRatio = kiln.conversions?.[0]?.ratio ?? 1;
    const totalKilnWood = totalCoal * kilnRatio;
    const secondsPerItem = smelter.secondsPerItem ?? 30;
    const barsPerFurnace = Math.ceil(totalBars / furnaceCount);
    const totalSeconds = barsPerFurnace * secondsPerItem;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const timeFormatted = minutes + ':' + String(seconds).padStart(2, '0');

    return {
      totalBars,
      totalCoal,
      totalKilnWood,
      furnaceCount,
      seconds: totalSeconds,
      timeFormatted,
      barsByItem: smeltedBars
    };
  }

  /**
   * Pure calculation function: calculates raw materials, breakdown,
   * intermediate steps, total armor, total weight and active set bonus.
   */
  function formatMaterialSources(itemData, data, { openBiomes, showAll, breakdown = false }) {
    const biomesByOrder = new Map(data.biomes.map(biome => [biome.id, biome]));
    const sourceOrder = src => Math.min(...(src.biomes || []).map(id => biomesByOrder.get(id)?.order ?? 99), 99);
    const rawSources = [...(itemData?.sources || [])].sort((a, b) => sourceOrder(a) - sourceOrder(b));
    const visibleSources = rawSources.filter(src => src.kind !== 'creature' || showAll || (src.biomes || []).some(id => openBiomes.has(id)));
    let formattedSources = [];
    if (itemData?.recipe && !breakdown) {
      formattedSources = [{ text: t('Crafted at {station}', { station: stationName(itemData.recipe.station) }), kind: 'station', locked: false }];
    } else if (visibleSources.length) {
      formattedSources = visibleSources.map(src => {
        if (src.kind !== 'creature') return { text: src.text, kind: src.kind || 'other', locked: false };
        const visibleBiomes = (src.biomes || []).filter(id => showAll || openBiomes.has(id))
          .sort((a, b) => (biomesByOrder.get(a)?.order ?? 99) - (biomesByOrder.get(b)?.order ?? 99));
        const creature = data.creatures?.[src.creatureId];
        const sourceName = creature ? entityName(creature) : src.text;
        const biomeNames = visibleBiomes.map(id => biomeName(biomesByOrder.get(id))).join(', ');
        return { text: sourceName + (biomeNames ? ' (' + biomeNames + ')' : ''), kind: 'creature', locked: false };
      });
    } else if (rawSources.length) {
      const biomeId = [...(rawSources[0].biomes || [])].sort((a, b) => (biomesByOrder.get(a)?.order ?? 99) - (biomesByOrder.get(b)?.order ?? 99))[0];
      formattedSources = [{
        text: t('🔒 a creature from the {biome}', { biome: biomeName(biomesByOrder.get(biomeId)) }),
        kind: 'creature', locked: true, biomeId,
      }];
    }
    return formattedSources;
  }

  /** Name for a shared-cart material: Smithy catalog, then the Items dataset if loaded, then the stored name, then the id. */
  function materialDisplayName(id, storedName, data) {
    const own = (data || globalThis.VA_DATA)?.items?.[id];
    if (own) return entityName(own);
    const list = globalThis.VC_ITEMS_DATA?.items || globalThis.VC_ITEMS_DATA;
    const external = Array.isArray(list) ? list.find(entry => entry.id === id) : list?.[id];
    if (external?.name) return entityName(external);
    return storedName || id;
  }

  function calculateCartMaterials(cart, data, options) {
    const opts = options || {};
    if (!cart || !Array.isArray(cart) || !data) {
      return {
        materials: [],
        canBreakDown: false,
        craftingSteps: [],
        hasNonTeleportable: false,
        smelting: calculateSmelting([], data, opts),
        summary: { totalArmor: 0, totalWeight: 0, activeSetBonuses: [] }
      };
    }

    const breakdown = !!opts.breakdown;
    const openBiomes = opts.openBiomes instanceof Set ? opts.openBiomes : new Set(opts.openBiomes || []);
    const showAll = !!opts.showAll;

    const armorById = new Map();
    const pieceMap = new Map();
    (data.armor || []).forEach(a => {
      armorById.set(a.id, a);
      (a.pieces || []).forEach(p => {
        pieceMap.set(p.id, { piece: p, armor: a });
      });
    });

    const weaponMap = new Map();
    (data.weapons || []).forEach(w => {
      weaponMap.set(w.id, w);
    });

    const biomesByOrder = new Map();
    (data.biomes || []).forEach(b => {
      biomesByOrder.set(b.id, b);
    });

    // 1. Raw materials map: itemId -> { amount, isFuel }
    const definitions = Object.fromEntries([
      ...[...pieceMap].map(([id, entry]) => [id, entry.piece]),
      ...weaponMap,
    ]);
    const shoppingLines = cart.map(line => ({ ...line, want: typeof line.want === 'number' ? line.want : (weaponMap.get(line.pieceId)?.maxQuality || 1) }));
    const rawMats = new Map(VCShopping.sumMaterials(shoppingLines, definitions).map(material => [material.item, material]));
    let totalArmor = 0;
    let totalWeight = 0;
    const setPieceCounts = new Map();

    cart.forEach(item => {
      const entry = pieceMap.get(item.pieceId);
      if (entry) {
        const { piece, armor } = entry;
        // Accumulate unique set piece counts
        setPieceCounts.set(armor.id, (setPieceCounts.get(armor.id) || 0) + 1);

        // Weight
        if (typeof piece.weight === 'number') {
          totalWeight += piece.weight;
        }

        // Armor at Want level
        if (piece.levels && piece.levels.length > 0) {
          const wantLevel = piece.levels.find(l => l.quality === item.want);
          if (wantLevel && typeof wantLevel.armor === 'number') {
            totalArmor += wantLevel.armor;
          }
        }
      } else {
        const weapon = weaponMap.get(item.pieceId);
        if (weapon) {
          if (typeof weapon.weight === 'number') {
            totalWeight += weapon.weight;
          }
        }
      }
    });

    // Active set bonuses
    const activeSetBonuses = [];
    const checkedSets = new Set();
    cart.forEach(item => {
      const entry = pieceMap.get(item.pieceId);
      if (!entry) return;
      const { armor } = entry;
      if (checkedSets.has(armor.id)) return;
      checkedSets.add(armor.id);

      if (armor.setBonus) {
        const count = setPieceCounts.get(armor.id) || 0;
        if (count >= armor.setBonus.pieces) {
          activeSetBonuses.push({
            name: entityName(armor.setBonus),
            pieces: armor.setBonus.pieces,
            effects: armor.setBonus.effects || []
          });
        }
      }
    });

    // Shared recipe expansion; presentation and spoiler handling stay in Smithy.
    const expanded = breakdown
      ? VCShopping.breakdown([...rawMats.values()], data.items)
      : { materials: [...rawMats.values()], steps: [] };
    const finalMats = new Map(expanded.materials.map(material => [material.item, material]));
    // Names for goods added from Items/Traders that Smithy's own catalog does not know.
    const cartNames = new Map(cart.filter(line => line?.materialId && line.name).map(line => [line.materialId, line.name]));
    const craftingSteps = expanded.steps.map(step => ({
      station: step.station,
      product: step.product,
      productName: entityName(data.items?.[step.product]) || step.productName,
      amount: step.amount,
      text: t('{action} {amount}× {product} at {station}', {
        action: t(step.action), amount: step.amount,
        product: entityName(data.items?.[step.product]) || step.productName,
        station: stationName(step.station),
      }),
    }));

    // Format materials with sources and spoiler handling
    const materials = [];
    finalMats.forEach((val, itemId) => {
      const itemData = (data.items && data.items[itemId]) || null;
      const name = itemData ? entityName(itemData) : materialDisplayName(itemId, cartNames.get(itemId), data);
      const image = itemData ? itemData.image : null;

      const formattedSources = formatMaterialSources(itemData, data, { openBiomes, showAll, breakdown });

      materials.push({
        item: itemId,
        name,
        image,
        amount: val.amount,
        fuel: val.fuel,
        teleportable: itemData ? itemData.teleportable !== false : true,
        sources: formattedSources
      });
    });

    // Sort materials deterministically by name
    materials.sort((a, b) => a.name.localeCompare(b.name));

    const hasNonTeleportable = materials.some(m => !m.teleportable);
    const smelting = calculateSmelting(cart, data, { furnaceCount: opts.furnaceCount || 1 });

    return {
      materials,
      canBreakDown: [...rawMats.keys()].some(id => data.items?.[id]?.recipe?.materials?.length),
      craftingSteps,
      hasNonTeleportable,
      smelting,
      summary: {
        totalArmor,
        totalWeight,
        activeSetBonuses
      }
    };
  }

  /**
   * Application Controller & DOM Rendering
   */
  function initArmourer() {
    const data = window.VA_DATA;
    if (!data) {
      console.error('VA_DATA not found');
      return;
    }

    const biomesContainer = document.getElementById('biomes-container');
    const cosmeticsContainer = document.getElementById('cosmetics-container');
    const weaponsBiomesContainer = document.getElementById('weapons-biomes-container');
    const tabArmor = document.getElementById('tab-armor');
    const tabWeapons = document.getElementById('tab-weapons');
    const viewArmor = document.getElementById('catalog-armor-view');
    const viewWeapons = document.getElementById('catalog-weapons-view');
    const toggleSpoilers = document.getElementById('toggle-spoilers');
    const btnCollapseAll = document.getElementById('btn-collapse-all');
    const btnResetProgress = document.getElementById('btn-reset-progress');
    const footer = document.getElementById('page-footer');

    // Build Footer
    buildFooter(footer, data);

    // Initial state
    let showAll = getStoredShowAll();
    let activeCatalogTab = getStoredCatalogTab();

    function switchCatalogTab(tab) {
      activeCatalogTab = tab;
      setStoredCatalogTab(tab);
      const isArmor = tab === 'armor';
      if (tabArmor) {
        tabArmor.classList.toggle('active', isArmor);
        tabArmor.setAttribute('aria-selected', String(isArmor));
      }
      if (tabWeapons) {
        tabWeapons.classList.toggle('active', !isArmor);
        tabWeapons.setAttribute('aria-selected', String(!isArmor));
      }
      if (viewArmor) {
        viewArmor.classList.toggle('active', isArmor);
        if (isArmor) viewArmor.removeAttribute('hidden'); else viewArmor.setAttribute('hidden', '');
      }
      if (viewWeapons) {
        viewWeapons.classList.toggle('active', !isArmor);
        if (!isArmor) viewWeapons.removeAttribute('hidden'); else viewWeapons.setAttribute('hidden', '');
      }
    }

    if (tabArmor) tabArmor.addEventListener('click', () => switchCatalogTab('armor'));
    if (tabWeapons) tabWeapons.addEventListener('click', () => switchCatalogTab('weapons'));
    switchCatalogTab(activeCatalogTab);

    if (toggleSpoilers) {
      toggleSpoilers.checked = showAll;
      toggleSpoilers.addEventListener('change', function () {
        showAll = toggleSpoilers.checked;
        setStoredShowAll(showAll);
        renderCatalog();
        renderCart();
      });
    }

    if (btnResetProgress) {
      btnResetProgress.addEventListener('click', function () {
        clearStoredOpenBiomes();
        renderCatalog();
        renderCart();
      });
    }

    if (btnCollapseAll) {
      btnCollapseAll.addEventListener('click', function () {
        const headers = document.querySelectorAll('.biome-header[aria-expanded="true"]');
        headers.forEach(h => {
          h.setAttribute('aria-expanded', 'false');
          const content = document.getElementById(h.getAttribute('aria-controls'));
          if (content) {
            content.setAttribute('inert', '');
            content.classList.remove('open');
          }
        });
      });
    }

    // Sort biomes by order
    const sortedBiomes = [...data.biomes].sort((a, b) => a.order - b.order);

    // Group armor sets
    const armorByBiome = new Map();
    sortedBiomes.forEach(b => armorByBiome.set(b.id, []));
    const cosmetics = [];
    const dlcSeasonal = [];

    data.armor.forEach(armor => {
      if (armor.kind === 'special') {
        dlcSeasonal.push(armor);
      } else if (armor.kind === 'cosmetic' || !armor.biome) {
        cosmetics.push(armor);
      } else if (armorByBiome.has(armor.biome)) {
        armorByBiome.get(armor.biome).push(armor);
      }
    });

    // Group weapons by biome
    const weaponsByBiome = new Map();
    sortedBiomes.forEach(b => weaponsByBiome.set(b.id, []));
    (data.weapons || []).forEach(w => {
      if (weaponsByBiome.has(w.biome)) {
        weaponsByBiome.get(w.biome).push(w);
      }
    });

    function updateSpoilerLabel() {
      if (!toggleSpoilers) return;
      toggleSpoilers.setAttribute('aria-pressed', String(showAll));
      const label = document.getElementById('toggle-spoilers-label');
      const text = label.querySelector('.toggle-text');
      text.textContent = t(showAll ? '⚠ Spoilers shown — click to hide' : 'Show all (spoilers)');
      label.classList.toggle('spoilers-active', showAll);
    }

    function renderCatalog() {
      updateSpoilerLabel();
      biomesContainer.textContent = '';
      cosmeticsContainer.textContent = '';

      const openBiomes = new Set(getStoredOpenBiomes());

      // Render each biome section
      sortedBiomes.forEach(biome => {
        const sets = armorByBiome.get(biome.id) || [];
        if (sets.length === 0) return;

        const isUnlocked = showAll || openBiomes.has(biome.id);
        const biomeCard = el('section', 'biome-card');
        biomeCard.dataset.biomeId = biome.id;

        const headerBtn = el('button', 'biome-header');
        headerBtn.type = 'button';
        headerBtn.id = 'biome-header-' + biome.id;
        headerBtn.setAttribute('aria-controls', 'biome-content-' + biome.id);
        headerBtn.setAttribute('aria-expanded', String(isUnlocked));

        if (biome.image) {
          headerBtn.style.backgroundImage = 'url("' + biome.image + '")';
        }

        const headerContent = el('div', 'biome-header-content');
        const orderBadge = el('span', 'biome-order-badge', t('Biome {order}', { order: biome.order }));
        const nameHeading = el('span', 'biome-name', biomeName(biome));
        const countBadge = el('span', 'biome-count-badge', tn('{count} sets', sets.length, { count: sets.length }));

        headerContent.appendChild(orderBadge);
        headerContent.appendChild(nameHeading);
        headerContent.appendChild(countBadge);

        const chevron = el('span', 'biome-chevron', '▼');
        chevron.setAttribute('aria-hidden', 'true');

        headerBtn.appendChild(headerContent);
        headerBtn.appendChild(chevron);

        const contentWrapper = el('div', 'biome-content-wrapper');
        contentWrapper.id = 'biome-content-' + biome.id;
        contentWrapper.setAttribute('role', 'region');
        contentWrapper.setAttribute('aria-labelledby', 'biome-header-' + biome.id);

        if (!isUnlocked) {
          contentWrapper.setAttribute('inert', '');
          headerBtn.setAttribute('aria-expanded', 'false');

          // Locked spoiler notice
          const lockedBanner = el('div', 'biome-locked-banner');
          const lockedText = el('div', 'locked-text');
          const lockIcon = el('span', 'locked-icon', '🔒');
          const lockMsg = el('span', null, t('Biome {order} — open it in the Bestiary or reveal here', { order: biome.order }));
          lockedText.appendChild(lockIcon);
          lockedText.appendChild(lockMsg);

          const revealBtn = el('button', 'action-btn action-btn-primary', 'Reveal');
          revealBtn.type = 'button';
          revealBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            const current = new Set(getManualOpenBiomes());
            current.add(biome.id);
            setStoredOpenBiomes(Array.from(current));
            renderCatalog();
            renderCart();
          });

          lockedBanner.appendChild(lockedText);
          lockedBanner.appendChild(revealBtn);
          biomeCard.appendChild(headerBtn);
          biomeCard.appendChild(lockedBanner);
        } else {
          // Accordion toggle
          headerBtn.addEventListener('click', function () {
            const isExpanded = headerBtn.getAttribute('aria-expanded') === 'true';
            const nextState = !isExpanded;
            headerBtn.setAttribute('aria-expanded', String(nextState));
            if (nextState) {
              contentWrapper.removeAttribute('inert');
            } else {
              contentWrapper.setAttribute('inert', '');
            }
          });

          // Render sets in this biome
          sets.forEach(armor => {
            const setCard = renderSetCard(armor);
            contentWrapper.appendChild(setCard);
          });

          biomeCard.appendChild(headerBtn);
          biomeCard.appendChild(contentWrapper);
        }

        biomesContainer.appendChild(biomeCard);
      });

      // Render Special, DLC & seasonal section (collapsed by default)
      if (dlcSeasonal.length > 0) {
        const dlcCard = el('section', 'biome-card');
        const headerBtn = el('button', 'biome-header');
        headerBtn.type = 'button';
        headerBtn.id = 'dlc-seasonal-header';
        headerBtn.setAttribute('aria-controls', 'dlc-seasonal-content');
        headerBtn.setAttribute('aria-expanded', 'false');

        const headerContent = el('div', 'biome-header-content');
        const badge = el('span', 'biome-order-badge', 'Special');
        const nameHeading = el('span', 'biome-name', 'Special, DLC & seasonal');
        const countBadge = el('span', 'biome-count-badge', tn('{count} items', dlcSeasonal.length, { count: dlcSeasonal.length }));

        headerContent.appendChild(badge);
        headerContent.appendChild(nameHeading);
        headerContent.appendChild(countBadge);

        const chevron = el('span', 'biome-chevron', '▼');
        chevron.setAttribute('aria-hidden', 'true');

        headerBtn.appendChild(headerContent);
        headerBtn.appendChild(chevron);

        const contentWrapper = el('div', 'biome-content-wrapper');
        contentWrapper.id = 'dlc-seasonal-content';
        contentWrapper.setAttribute('role', 'region');
        contentWrapper.setAttribute('aria-labelledby', 'dlc-seasonal-header');
        contentWrapper.setAttribute('inert', '');

        headerBtn.addEventListener('click', function () {
          const isExpanded = headerBtn.getAttribute('aria-expanded') === 'true';
          const nextState = !isExpanded;
          headerBtn.setAttribute('aria-expanded', String(nextState));
          if (nextState) {
            contentWrapper.removeAttribute('inert');
          } else {
            contentWrapper.setAttribute('inert', '');
          }
        });

        dlcSeasonal.forEach(armor => {
          const setCard = renderSetCard(armor);
          contentWrapper.appendChild(setCard);
        });

        dlcCard.appendChild(headerBtn);
        dlcCard.appendChild(contentWrapper);
        cosmeticsContainer.appendChild(dlcCard);
      }

      // Render Cosmetics section (collapsed by default)
      if (cosmetics.length > 0) {
        const cosmeticCard = el('section', 'biome-card');
        const headerBtn = el('button', 'biome-header');
        headerBtn.type = 'button';
        headerBtn.id = 'cosmetics-header';
        headerBtn.setAttribute('aria-controls', 'cosmetics-content');
        headerBtn.setAttribute('aria-expanded', 'false');

        const headerContent = el('div', 'biome-header-content');
        const badge = el('span', 'biome-order-badge', 'Special');
        const nameHeading = el('span', 'biome-name', 'Cosmetics');
        const countBadge = el('span', 'biome-count-badge', tn('{count} items', cosmetics.length, { count: cosmetics.length }));

        headerContent.appendChild(badge);
        headerContent.appendChild(nameHeading);
        headerContent.appendChild(countBadge);

        const chevron = el('span', 'biome-chevron', '▼');
        chevron.setAttribute('aria-hidden', 'true');

        headerBtn.appendChild(headerContent);
        headerBtn.appendChild(chevron);

        const contentWrapper = el('div', 'biome-content-wrapper');
        contentWrapper.id = 'cosmetics-content';
        contentWrapper.setAttribute('role', 'region');
        contentWrapper.setAttribute('aria-labelledby', 'cosmetics-header');
        contentWrapper.setAttribute('inert', '');

        headerBtn.addEventListener('click', function () {
          const isExpanded = headerBtn.getAttribute('aria-expanded') === 'true';
          const nextState = !isExpanded;
          headerBtn.setAttribute('aria-expanded', String(nextState));
          if (nextState) {
            contentWrapper.removeAttribute('inert');
          } else {
            contentWrapper.setAttribute('inert', '');
          }
        });

        cosmetics.forEach(armor => {
          const setCard = renderSetCard(armor);
          contentWrapper.appendChild(setCard);
        });

        cosmeticCard.appendChild(headerBtn);
        cosmeticCard.appendChild(contentWrapper);
        cosmeticsContainer.appendChild(cosmeticCard);
      }

      renderWeaponsCatalog();
    }

    /**
     * Render Weapons Catalog by Biome
     */
    function renderWeaponsCatalog() {
      if (!weaponsBiomesContainer) return;
      weaponsBiomesContainer.textContent = '';

      const openBiomes = new Set(getStoredOpenBiomes());

      sortedBiomes.forEach(biome => {
        const weapons = weaponsByBiome.get(biome.id) || [];
        if (weapons.length === 0) return;

        const isUnlocked = showAll || openBiomes.has(biome.id);
        const biomeCard = el('section', 'biome-card');
        biomeCard.dataset.biomeId = biome.id;

        const headerBtn = el('button', 'biome-header');
        headerBtn.type = 'button';
        headerBtn.id = 'weapons-biome-header-' + biome.id;
        headerBtn.setAttribute('aria-controls', 'weapons-biome-content-' + biome.id);
        headerBtn.setAttribute('aria-expanded', String(isUnlocked));

        if (biome.image) {
          headerBtn.style.backgroundImage = 'url("' + biome.image + '")';
        }

        const headerContent = el('div', 'biome-header-content');
        const orderBadge = el('span', 'biome-order-badge', t('Biome {order}', { order: biome.order }));
        const nameHeading = el('span', 'biome-name', biomeName(biome));
        const countBadge = el('span', 'biome-count-badge', tn('{count} weapons', weapons.length, { count: weapons.length }));

        headerContent.appendChild(orderBadge);
        headerContent.appendChild(nameHeading);
        headerContent.appendChild(countBadge);

        const chevron = el('span', 'biome-chevron', '▼');
        chevron.setAttribute('aria-hidden', 'true');

        headerBtn.appendChild(headerContent);
        headerBtn.appendChild(chevron);

        const contentWrapper = el('div', 'biome-content-wrapper');
        contentWrapper.id = 'weapons-biome-content-' + biome.id;
        contentWrapper.setAttribute('role', 'region');
        contentWrapper.setAttribute('aria-labelledby', 'weapons-biome-header-' + biome.id);

        if (!isUnlocked) {
          contentWrapper.setAttribute('inert', '');
          headerBtn.setAttribute('aria-expanded', 'false');

          const lockedBanner = el('div', 'biome-locked-banner');
          const lockedText = el('div', 'locked-text');
          const lockIcon = el('span', 'locked-icon', '🔒');
          const lockMsg = el('span', null, t('Biome {order} — open it in the Bestiary or reveal here', { order: biome.order }));
          lockedText.appendChild(lockIcon);
          lockedText.appendChild(lockMsg);

          const revealBtn = el('button', 'action-btn action-btn-primary', 'Reveal');
          revealBtn.type = 'button';
          revealBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            const current = new Set(getManualOpenBiomes());
            current.add(biome.id);
            setStoredOpenBiomes(Array.from(current));
            renderCatalog();
            renderCart();
          });

          lockedBanner.appendChild(lockedText);
          lockedBanner.appendChild(revealBtn);
          biomeCard.appendChild(headerBtn);
          biomeCard.appendChild(lockedBanner);
        } else {
          headerBtn.addEventListener('click', function () {
            const isExpanded = headerBtn.getAttribute('aria-expanded') === 'true';
            const nextState = !isExpanded;
            headerBtn.setAttribute('aria-expanded', String(nextState));
            if (nextState) {
              contentWrapper.removeAttribute('inert');
            } else {
              contentWrapper.setAttribute('inert', '');
            }
          });

          weapons.forEach(w => {
            const card = renderWeaponCard(w);
            contentWrapper.appendChild(card);
          });

          biomeCard.appendChild(headerBtn);
          biomeCard.appendChild(contentWrapper);
        }

        weaponsBiomesContainer.appendChild(biomeCard);
      });
    }

    /**
     * Render Weapon Card
     */
    function renderWeaponCard(weapon) {
      const card = el('div', 'set-card weapon-card');
      card.dataset.weaponId = weapon.id;

      const summary = el('div', 'set-summary weapon-summary');

      // Left: icon + name + badges
      const summaryLeft = el('div', 'set-summary-left');
      if (weapon.image) {
        const img = el('img', 'piece-icon-img');
        img.src = weapon.image;
        img.alt = weapon.name;
        img.loading = 'lazy';
        summaryLeft.appendChild(img);
      }

      const infoCol = el('div', 'set-summary-info');
      const titleRow = el('div', 'set-title-row');
      const title = el('h3', 'set-title', weapon.name);
      titleRow.appendChild(title);

      const badgesRow = el('div', 'set-badges-row');

      // Category badge
      const catKey = categoryLabels[weapon.category] || (weapon.category ? (weapon.category.charAt(0).toUpperCase() + weapon.category.slice(1)) : '');
      if (catKey) {
        const catBadge = el('span', 'badge badge-tag', catKey);
        badgesRow.appendChild(catBadge);
      }

      // Hands badge
      if (weapon.hands) {
        const handsBadge = el('span', 'badge badge-slot', weapon.hands);
        badgesRow.appendChild(handsBadge);
      }

      // Shield block armor & parry
      if (weapon.category === 'shield' || typeof weapon.blockArmor === 'number') {
        if (typeof weapon.blockArmor === 'number') {
          const blockBadge = el('span', 'badge badge-armor', t('Block Armor: {value}', { value: weapon.blockArmor }));
          badgesRow.appendChild(blockBadge);
        }
        if (typeof weapon.parryBonus === 'number' && weapon.parryBonus > 1) {
          const parryBadge = el('span', 'badge badge-bonus', t('Parry Bonus: {bonus}×', { bonus: weapon.parryBonus }));
          badgesRow.appendChild(parryBadge);
        }
      }

      // Weapon damage
      const dmgEntries = Object.entries(weapon.damage || {});
      if (dmgEntries.length > 0) {
        const dmgText = dmgEntries.map(([dtype, val]) => (dtype.charAt(0).toUpperCase() + dtype.slice(1)) + ' ' + val).join(', ');
        const dmgBadge = el('span', 'badge badge-armor', dmgText);
        badgesRow.appendChild(dmgBadge);
      }

      infoCol.appendChild(titleRow);
      infoCol.appendChild(badgesRow);
      summaryLeft.appendChild(infoCol);

      // Right: Have/Want selects + Add button + Details toggle
      const summaryRight = el('div', 'weapon-controls-row');
      const maxQ = weapon.maxQuality || (weapon.levels?.length || 1);

      // Have select
      const haveWrap = el('div', 'weapon-level-select-wrap');
      const haveLabel = el('span', 'metric-label', t('Have'));
      const haveSelect = el('select', 'level-select');
      const optHave0 = el('option', null, t('None'));
      optHave0.value = '0';
      haveSelect.appendChild(optHave0);
      for (let q = 1; q < maxQ; q++) {
        const opt = el('option', null, 'Q' + q);
        opt.value = String(q);
        haveSelect.appendChild(opt);
      }
      haveSelect.value = '0';
      haveWrap.appendChild(haveLabel);
      haveWrap.appendChild(haveSelect);

      // Want select
      const wantWrap = el('div', 'weapon-level-select-wrap');
      const wantLabel = el('span', 'metric-label', t('Want'));
      const wantSelect = el('select', 'level-select');
      for (let q = 1; q <= maxQ; q++) {
        const opt = el('option', null, 'Q' + q);
        opt.value = String(q);
        wantSelect.appendChild(opt);
      }
      wantSelect.value = String(maxQ);
      wantWrap.appendChild(wantLabel);
      wantWrap.appendChild(wantSelect);

      haveSelect.addEventListener('change', () => {
        const h = parseInt(haveSelect.value, 10);
        let w = parseInt(wantSelect.value, 10);
        if (w <= h) {
          wantSelect.value = String(Math.min(maxQ, h + 1));
        }
        for (let i = 0; i < wantSelect.options.length; i++) {
          const q = parseInt(wantSelect.options[i].value, 10);
          wantSelect.options[i].disabled = q <= h;
        }
      });

      wantSelect.addEventListener('change', () => {
        const w = parseInt(wantSelect.value, 10);
        let h = parseInt(haveSelect.value, 10);
        if (h >= w) {
          haveSelect.value = String(Math.max(0, w - 1));
        }
        for (let i = 0; i < haveSelect.options.length; i++) {
          const q = parseInt(haveSelect.options[i].value, 10);
          haveSelect.options[i].disabled = q >= w && q > 0;
        }
      });

      // Add button
      const addBtn = el('button', 'action-btn action-btn-primary action-btn-sm', t('+ Add'));
      addBtn.type = 'button';
      addBtn.addEventListener('click', e => {
        e.stopPropagation();
        cart.push({
          id: weapon.id + '_' + Math.random().toString(36).slice(2, 7),
          setId: null,
          pieceId: weapon.id,
          isWeapon: true,
          have: parseInt(haveSelect.value, 10),
          want: parseInt(wantSelect.value, 10),
          groupId: null
        });
        saveAndRenderCart();
        if (window.innerWidth <= 1024 && cartPanel) {
          cartPanel.classList.add('open');
        }
      });

      // Details toggle
      const toggleDetailsBtn = el('button', 'set-detail-toggle-btn', t('Details ▾'));
      toggleDetailsBtn.type = 'button';

      summaryRight.appendChild(haveWrap);
      summaryRight.appendChild(wantWrap);
      summaryRight.appendChild(addBtn);
      summaryRight.appendChild(toggleDetailsBtn);

      summary.appendChild(summaryLeft);
      summary.appendChild(summaryRight);

      // Detail container
      const detailContainer = el('div', 'weapon-detail set-detail');
      detailContainer.setAttribute('inert', '');
      let detailRendered = false;

      function toggleDetails() {
        const isOpen = !detailContainer.hasAttribute('inert');
        if (isOpen) {
          detailContainer.setAttribute('inert', '');
          toggleDetailsBtn.textContent = t('Details ▾');
        } else {
          if (!detailRendered) {
            renderWeaponDetail(weapon, detailContainer, data);
            detailRendered = true;
          }
          detailContainer.removeAttribute('inert');
          toggleDetailsBtn.textContent = t('Details ▴');
        }
      }

      summary.addEventListener('click', e => {
        if (e.target.closest('button') || e.target.closest('select')) return;
        toggleDetails();
      });

      toggleDetailsBtn.addEventListener('click', e => {
        e.stopPropagation();
        toggleDetails();
      });

      card.appendChild(summary);
      card.appendChild(detailContainer);

      return card;
    }

    /**
     * Render Weapon Detail (Costs & station level)
     */
    function renderWeaponDetail(weapon, container, data) {
      container.textContent = '';

      if (weapon.description) {
        const desc = el('p', 'weapon-desc', weapon.description);
        container.appendChild(desc);
      }

      const costsSection = el('div', 'detail-costs-section');
      const costsTitle = el('h4', 'detail-section-title', t('Crafting & Upgrade Costs'));
      costsSection.appendChild(costsTitle);

      const costsGrid = el('div', 'costs-grid');
      let hasAnyCost = false;

      (weapon.levels || []).forEach(lvl => {
        if (!lvl.materials || lvl.materials.length === 0) return;
        hasAnyCost = true;

        const costCard = el('div', 'cost-card');
        const costHeader = el('div', 'cost-card-header');

        const qualityName = el('span', 'cost-piece-name', weapon.name + ' · Q' + lvl.quality + (lvl.quality === 1 ? ' (' + t('Craft') + ')' : ' (' + t('Upgrade') + ')'));
        const stName = weapon.station || 'Station';
        const stText = lvl.stationLevel ? stName + ' ' + t('Level {level}', { level: lvl.stationLevel }) : stName;
        const stBadge = el('span', 'cost-station-badge', stText);

        costHeader.appendChild(qualityName);
        costHeader.appendChild(stBadge);
        costCard.appendChild(costHeader);

        const matsList = el('div', 'cost-materials-list');
        lvl.materials.forEach(mat => {
          const itemData = data.items && data.items[mat.item];
          const matPill = el('div', 'cost-mat-pill');
          const matName = (itemData && itemData.name) || mat.item;

          if (itemData && itemData.image) {
            const icon = el('img', 'cost-mat-icon');
            icon.src = itemData.image;
            icon.alt = matName;
            icon.loading = 'lazy';
            matPill.appendChild(icon);
          }

          const label = el('span', null, mat.amount + '× ');
          const matLink = el('a', 'item-link', matName);
          matLink.href = `/items/#item=${encodeURIComponent(mat.item)}`;
          label.appendChild(matLink);
          matPill.appendChild(label);

          traderBadges(mat.item).forEach(traderLink => {
            matPill.appendChild(traderLink);
          });

          if (itemData && itemData.teleportable === false) {
            const tpBadge = el('span', 'badge badge-teleport-warning', t("Can't be teleported"));
            matPill.appendChild(tpBadge);
          }

          if (mat.fuel) {
            const fuelBadge = el('span', 'badge badge-fuel', 'fuel');
            matPill.appendChild(fuelBadge);
          }

          matsList.appendChild(matPill);
        });

        costCard.appendChild(matsList);
        costsGrid.appendChild(costCard);
      });

      if (hasAnyCost) {
        costsSection.appendChild(costsGrid);
        container.appendChild(costsSection);
      }
    }

    /**
     * Render Set Card
     */
    function renderSetCard(armor) {
      const card = el('div', 'set-card');
      card.dataset.armorId = armor.id;

      const summary = el('div', 'set-summary');

      // Left: piece icons + title + badges
      const summaryLeft = el('div', 'set-summary-left');

      const iconsRow = el('div', 'piece-icons-row');
      armor.pieces.forEach(p => {
        if (p.image) {
          const img = el('img', 'piece-icon-img');
          img.src = p.image;
          img.alt = entityName(p);
          img.loading = 'lazy';
          iconsRow.appendChild(img);
        }
      });
      summaryLeft.appendChild(iconsRow);

      const infoCol = el('div', 'set-summary-info');
      const titleRow = el('div', 'set-title-row');
      const title = el('h3', 'set-title', entityName(armor));
      titleRow.appendChild(title);

      const badgesRow = el('div', 'set-badges-row');

      // Armor badge (q1 -> max)
      const { q1, max } = calculateTotalArmor(armor.pieces);
      const armorBadgeText = q1 === max ? t('Armor: {value}', { value: q1 }) : t('Armor: {value}', { value: q1 }) + ' → ' + max;
      const armorBadge = el('span', 'badge badge-armor', armorBadgeText);
      badgesRow.appendChild(armorBadge);

      // Set bonus chip
      if (armor.setBonus) {
        const bonusText = entityName(armor.setBonus);
        const bonusBadge = el('span', 'badge badge-bonus', bonusText);
        badgesRow.appendChild(bonusBadge);
      }

      // Special tag badge (DLC, Halloween, Midsummer, etc.)
      if (armor.tag) {
        const tagBadge = el('span', 'badge badge-tag', armor.tag);
        badgesRow.appendChild(tagBadge);
      }

      infoCol.appendChild(titleRow);
      infoCol.appendChild(badgesRow);
      summaryLeft.appendChild(infoCol);

      // Right: Add set button + details toggle button. A set that cannot be
      // crafted (tag "Not craftable", e.g. Crown of Roots) has no materials to
      // shop for, so it gets no Add button.
      const summaryRight = el('div', 'set-summary-right');
      const notCraftable = armor.tag === 'Not craftable';

      if (!notCraftable) {
        const addSetBtn = el('button', 'action-btn action-btn-primary', 'Add set');
        addSetBtn.type = 'button';
        addSetBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          // Handled in Step 3 / cart integration
          const evt = new CustomEvent('va:add-set', { detail: { armor } });
          window.dispatchEvent(evt);
        });
        summaryRight.appendChild(addSetBtn);
      }

      const toggleDetailsBtn = el('button', 'set-detail-toggle-btn', 'Details ▾');
      toggleDetailsBtn.type = 'button';

      summaryRight.appendChild(toggleDetailsBtn);

      summary.appendChild(summaryLeft);
      summary.appendChild(summaryRight);

      // Detail container
      const detailContainer = el('div', 'set-detail');
      detailContainer.setAttribute('inert', '');
      let detailRendered = false;

      function toggleDetails() {
        const isOpen = !detailContainer.hasAttribute('inert');
        if (isOpen) {
          detailContainer.setAttribute('inert', '');
          toggleDetailsBtn.textContent = t('Details ▾');
        } else {
          if (!detailRendered) {
            renderSetDetail(armor, detailContainer, data);
            detailRendered = true;
          }
          detailContainer.removeAttribute('inert');
          toggleDetailsBtn.textContent = t('Details ▴');
        }
      }

      summary.addEventListener('click', function (e) {
        if (e.target.closest('button')) return;
        toggleDetails();
      });

      toggleDetailsBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleDetails();
      });

      card.appendChild(summary);
      card.appendChild(detailContainer);

      return card;
    }

    /**
     * Render Set Detail (Pieces table, Upgrade costs, Set bonus)
     */
    function renderSetDetail(armor, container, data) {
      container.textContent = '';

      // --- 1. Pieces Table Section ---
      const tableSection = el('div', 'detail-pieces-section');
      const tableHeaderBar = el('div', 'table-header-bar');
      const tableTitle = el('h4', 'detail-section-title', 'Pieces & Stats');

      // Level switcher
      const switcher = el('div', 'level-switcher');
      const switcherLabel = el('span', 'level-switcher-label', 'Show level:');
      switcher.appendChild(switcherLabel);

      const levelPills = ['All', 'Q1', 'Q2', 'Q3', 'Q4'];
      const pillBtns = [];

      tableHeaderBar.appendChild(tableTitle);
      tableHeaderBar.appendChild(switcher);
      tableSection.appendChild(tableHeaderBar);

      // Table scroll wrapper for mobile 360px
      const tableWrapper = el('div', 'table-scroll-wrapper');
      const table = el('table', 'pieces-table');
      const thead = el('thead');
      const headerTr = el('tr');

      const thPiece = el('th', null, 'Piece');
      const thSlot = el('th', null, 'Slot');
      const thQ1 = el('th', 'th-quality', 'Q1');
      thQ1.dataset.quality = '1';
      const thQ2 = el('th', 'th-quality', 'Q2');
      thQ2.dataset.quality = '2';
      const thQ3 = el('th', 'th-quality', 'Q3');
      thQ3.dataset.quality = '3';
      const thQ4 = el('th', 'th-quality', 'Q4');
      thQ4.dataset.quality = '4';
      const thWeight = el('th', null, 'Weight');
      const thSpeed = el('th', null, 'Speed');
      const thResist = el('th', null, 'Resistances');
      const thAction = el('th', null, 'Action');

      headerTr.appendChild(thPiece);
      headerTr.appendChild(thSlot);
      headerTr.appendChild(thQ1);
      headerTr.appendChild(thQ2);
      headerTr.appendChild(thQ3);
      headerTr.appendChild(thQ4);
      headerTr.appendChild(thWeight);
      headerTr.appendChild(thSpeed);
      headerTr.appendChild(thResist);
      headerTr.appendChild(thAction);
      thead.appendChild(headerTr);
      table.appendChild(thead);

      const tbody = el('tbody');
      const qualityTds = [];

      armor.pieces.forEach(piece => {
        const tr = el('tr');

        // Piece cell (icon + name)
        const tdPiece = el('td');
        const pieceCell = el('div', 'piece-cell-name');
        if (piece.image) {
          const thumb = el('img', 'piece-thumb');
          thumb.src = piece.image;
          thumb.alt = entityName(piece);
          thumb.loading = 'lazy';
          pieceCell.appendChild(thumb);
        }
        const nameText = el('span', 'piece-name-text', entityName(piece));
        pieceCell.appendChild(nameText);
        if (piece.tag) {
          const tagBadge = el('span', 'badge badge-tag', piece.tag);
          pieceCell.appendChild(tagBadge);
        }
        tdPiece.appendChild(pieceCell);

        // Slot cell
        const tdSlot = el('td');
        const slotBadge = el('span', 'badge badge-slot', piece.slot || 'gear');
        tdSlot.appendChild(slotBadge);

        // Quality 1-4 armor cells
        const qLevels = new Map();
        (piece.levels || []).forEach(l => qLevels.set(l.quality, l.armor));

        const tdQ1 = el('td', 'td-quality', qLevels.has(1) ? String(qLevels.get(1)) : '—');
        tdQ1.dataset.quality = '1';
        qualityTds.push(tdQ1);

        const tdQ2 = el('td', 'td-quality', qLevels.has(2) ? String(qLevels.get(2)) : '—');
        tdQ2.dataset.quality = '2';
        qualityTds.push(tdQ2);

        const tdQ3 = el('td', 'td-quality', qLevels.has(3) ? String(qLevels.get(3)) : '—');
        tdQ3.dataset.quality = '3';
        qualityTds.push(tdQ3);

        const tdQ4 = el('td', 'td-quality', qLevels.has(4) ? String(qLevels.get(4)) : '—');
        tdQ4.dataset.quality = '4';
        qualityTds.push(tdQ4);

        // Weight
        const tdWeight = el('td', null, piece.weight !== undefined && piece.weight !== null ? String(piece.weight) : '—');

        // Movement Speed
        const tdSpeed = el('td');
        if (piece.movementSpeed) {
          const prefix = piece.movementSpeed > 0 ? '+' : '';
          tdSpeed.textContent = prefix + piece.movementSpeed + '%';
        } else {
          tdSpeed.textContent = '0%';
        }

        // Resistances
        const tdResist = el('td');
        if (piece.resistances && piece.resistances.length > 0) {
          piece.resistances.forEach(res => {
            const resBadge = el('span', 'badge badge-source', effectText(res));
            tdResist.appendChild(resBadge);
          });
        } else {
          tdResist.textContent = '—';
        }

        // Add Piece Action (not for sets that cannot be crafted)
        const tdAction = el('td');
        if (armor.tag !== 'Not craftable') {
          const addPieceBtn = el('button', 'action-btn action-btn-sm', '+ Add piece');
          addPieceBtn.type = 'button';
          addPieceBtn.addEventListener('click', function () {
            const evt = new CustomEvent('va:add-piece', { detail: { piece, armor } });
            window.dispatchEvent(evt);
          });
          tdAction.appendChild(addPieceBtn);
        }

        tr.appendChild(tdPiece);
        tr.appendChild(tdSlot);
        tr.appendChild(tdQ1);
        tr.appendChild(tdQ2);
        tr.appendChild(tdQ3);
        tr.appendChild(tdQ4);
        tr.appendChild(tdWeight);
        tr.appendChild(tdSpeed);
        tr.appendChild(tdResist);
        tr.appendChild(tdAction);
        tbody.appendChild(tr);
      });

      table.appendChild(tbody);
      tableWrapper.appendChild(table);
      tableSection.appendChild(tableWrapper);
      container.appendChild(tableSection);

      // Level pill click handlers
      const qThs = [thQ1, thQ2, thQ3, thQ4];
      function setHighlightedQuality(selectedQ) {
        pillBtns.forEach(btn => {
          btn.classList.toggle('active', btn.dataset.level === selectedQ);
        });

        qThs.forEach(th => {
          th.classList.toggle('col-highlight', selectedQ !== 'all' && th.dataset.quality === selectedQ);
        });
        qualityTds.forEach(td => {
          td.classList.toggle('col-highlight', selectedQ !== 'all' && td.dataset.quality === selectedQ);
        });
      }

      levelPills.forEach(lvl => {
        const btn = el('button', 'level-pill-btn', lvl);
        btn.type = 'button';
        btn.dataset.level = lvl === 'All' ? 'all' : lvl.slice(1);
        if (lvl === 'All') btn.classList.add('active');

        btn.addEventListener('click', function () {
          setHighlightedQuality(btn.dataset.level);
        });

        pillBtns.push(btn);
        switcher.appendChild(btn);
      });

      // --- 2. Crafting & Upgrade Costs Section ---
      const costsSection = el('div', 'detail-costs-section');
      const costsTitle = el('h4', 'detail-section-title', 'Crafting & Upgrade Costs');
      costsSection.appendChild(costsTitle);

      const costsGrid = el('div', 'costs-grid');
      let hasAnyCost = false;

      armor.pieces.forEach(piece => {
        (piece.levels || []).forEach(lvl => {
          if (!lvl.materials || lvl.materials.length === 0) return;
          hasAnyCost = true;

          const costCard = el('div', 'cost-card');
          const costHeader = el('div', 'cost-card-header');

          const pieceName = el('span', 'cost-piece-name', entityName(piece) + ' · Q' + lvl.quality + (lvl.quality === 1 ? ' (' + t('Craft') + ')' : ' (' + t('Upgrade') + ')'));
          const stationName = piece.station || t('Station');
          const stationText = lvl.stationLevel ? stationName + ' ' + t('Level {level}', { level: lvl.stationLevel }) : stationName;
          const stationBadge = el('span', 'cost-station-badge', stationText);

          costHeader.appendChild(pieceName);
          costHeader.appendChild(stationBadge);
          costCard.appendChild(costHeader);

          const matsList = el('div', 'cost-materials-list');
          lvl.materials.forEach(mat => {
            const itemData = data.items && data.items[mat.item];
            const matPill = el('div', 'cost-mat-pill');

            if (itemData && itemData.image) {
              const icon = el('img', 'cost-mat-icon');
              icon.src = itemData.image;
              icon.alt = entityName(itemData) || mat.item;
              icon.loading = 'lazy';
              matPill.appendChild(icon);
            }

            const label = el('span', null, mat.amount + '× ');
            const matLink = el('a', 'item-link', itemData ? entityName(itemData) : mat.item);
            matLink.href = `/items/#item=${encodeURIComponent(mat.item)}`;
            label.appendChild(matLink);
            matPill.appendChild(label);

            traderBadges(mat.item).forEach(traderLink => {
              matPill.appendChild(traderLink);
            });

            if (itemData && itemData.teleportable === false) {
              const tpBadge = el('span', 'badge badge-teleport-warning', t("Can't be teleported"));
              matPill.appendChild(tpBadge);
            }

            if (mat.fuel) {
              const fuelBadge = el('span', 'badge badge-fuel', 'fuel');
              matPill.appendChild(fuelBadge);
            }

            matsList.appendChild(matPill);
          });

          costCard.appendChild(matsList);
          costsGrid.appendChild(costCard);
        });
      });

      if (hasAnyCost) {
        costsSection.appendChild(costsGrid);
        container.appendChild(costsSection);
      } else {
        const noCostNotice = el('p', 'cart-empty-msg', 'No crafting recipes (obtained via merchant, quests or events).');
        costsSection.appendChild(noCostNotice);
        container.appendChild(costsSection);
      }

      // --- 3. Set Bonus Section ---
      if (armor.setBonus) {
        const bonusBox = el('div', 'set-bonus-box');
        const bonusHeader = el('div', 'set-bonus-title');
        const pieceWord = armor.setBonus.pieces === 1 ? 'piece' : 'pieces';
        bonusHeader.textContent = tn('Set Bonus: {name} ({count} pieces)', armor.setBonus.pieces, { name: entityName(armor.setBonus) });
        bonusBox.appendChild(bonusHeader);

        if (armor.setBonus.effects && armor.setBonus.effects.length > 0) {
          const effectsUl = el('ul', 'set-bonus-effects');
          armor.setBonus.effects.forEach(eff => {
            const li = el('li', null, effectText(eff));
            effectsUl.appendChild(li);
          });
          bonusBox.appendChild(effectsUl);
        }

        container.appendChild(bonusBox);
      }

      // --- 4. Add Full Set Action (not for sets that cannot be crafted) ---
      if (armor.tag !== 'Not craftable') {
        const detailActions = el('div', 'controls-actions');
        const addFullSetBtn = el('button', 'action-btn action-btn-primary', 'Add full set to shopping list');
        addFullSetBtn.type = 'button';
        addFullSetBtn.addEventListener('click', function () {
          const evt = new CustomEvent('va:add-set', { detail: { armor } });
          window.dispatchEvent(evt);
        });
        detailActions.appendChild(addFullSetBtn);
        container.appendChild(detailActions);
      }
    }

    // --- 5. Shopping Cart Controller ---
    let cart = getStoredCart();
    let breakdown = getStoredBreakdown();

    const cartPanel = document.getElementById('cart-panel');
    const cartCountBadge = document.getElementById('cart-count-badge');
    const cartContent = document.getElementById('cart-content');
    const mobileCartBtn = document.getElementById('btn-mobile-cart-toggle');
    const mobileCartClose = document.getElementById('btn-cart-mobile-close');
    const mobileCartBadge = document.getElementById('mobile-cart-badge');

    if (mobileCartBtn && cartPanel) {
      mobileCartBtn.addEventListener('click', function () {
        cartPanel.classList.add('open');
      });
    }

    if (mobileCartClose && cartPanel) {
      mobileCartClose.addEventListener('click', function () {
        cartPanel.classList.remove('open');
      });
    }

    function saveAndRenderCart() {
      setStoredCart(cart);
      renderCart();
    }

    // Add set event listener
    window.addEventListener('va:add-set', function (e) {
      const armor = e.detail && e.detail.armor;
      if (!armor || !armor.pieces) return;

      const groupId = 'group_' + armor.id + '_' + Date.now();
      armor.pieces.forEach(p => {
        const maxQ = pieceMaxQ(p);
        cart.push({
          id: armor.id + '_' + p.id + '_' + Math.random().toString(36).slice(2, 7),
          setId: armor.id,
          pieceId: p.id,
          have: 0,
          want: maxQ,
          groupId: groupId
        });
      });
      saveAndRenderCart();
      if (window.innerWidth <= 1024 && cartPanel) {
        cartPanel.classList.add('open');
      }
    });

    // Add piece event listener
    window.addEventListener('va:add-piece', function (e) {
      const piece = e.detail && e.detail.piece;
      const armor = e.detail && e.detail.armor;
      if (!piece || !armor) return;

      const maxQ = pieceMaxQ(piece);
      cart.push({
        id: armor.id + '_' + piece.id + '_' + Math.random().toString(36).slice(2, 7),
        setId: armor.id,
        pieceId: piece.id,
        have: 0,
        want: maxQ,
        groupId: null
      });
      saveAndRenderCart();
      if (window.innerWidth <= 1024 && cartPanel) {
        cartPanel.classList.add('open');
      }
    });

    function renderCart() {
      if (!cartContent) return;
      cartContent.textContent = '';

      const totalPieces = cart.length;
      if (cartCountBadge) {
        cartCountBadge.textContent = tn('{count} items', totalPieces, { count: totalPieces });
      }
      if (mobileCartBadge) {
        mobileCartBadge.textContent = String(totalPieces);
      }

      if (totalPieces === 0) {
        const emptyMsg = el('p', 'cart-empty-msg', 'Your shopping list is empty. Click “Add set” or “+ Add piece” to start.');
        cartContent.appendChild(emptyMsg);
        return;
      }

      // 1. Render Cart Items (grouped by groupId if present)
      const itemsContainer = el('div', 'cart-items-container');

      // Group items
      const groupMap = new Map();
      const standaloneItems = [];

      const materialLines = cart.filter(item => item.materialId);
      cart.forEach(item => {
        if (item.materialId) return;
        if (item.groupId) {
          if (!groupMap.has(item.groupId)) {
            groupMap.set(item.groupId, []);
          }
          groupMap.get(item.groupId).push(item);
        } else {
          standaloneItems.push(item);
        }
      });

      // Clamp any cart rows where want exceeds pieceMaxQ (stored legacy rows)
      let cartModified = false;
      cart.forEach(item => {
        if (item.materialId) return;
        const armor = item.setId ? data.armor.find(a => a.id === item.setId) : null;
        const piece = armor?.pieces.find(p => p.id === item.pieceId);
        const weapon = !piece ? (data.weapons || []).find(w => w.id === item.pieceId) : null;
        const pMax = piece ? pieceMaxQ(piece) : (weapon ? (weapon.maxQuality || weapon.levels?.length || 1) : 4);
        if (item.want > pMax) {
          item.want = pMax;
          cartModified = true;
        }
        if (item.have >= item.want) {
          item.have = Math.max(0, item.want - 1);
          cartModified = true;
        }
      });
      if (cartModified) {
        setStoredCart(cart);
      }

      // Render groups
      groupMap.forEach((groupItems, groupId) => {
        const firstItem = groupItems[0];
        const armor = data.armor.find(a => a.id === firstItem.setId);
        const groupEl = el('div', 'cart-group');

        const groupHeader = el('div', 'cart-group-header');
        const groupTitle = el('span', 'cart-group-title', (armor ? entityName(armor) : firstItem.setId) + ' (' + t('Set') + ')');
        groupHeader.appendChild(groupTitle);

        const groupMax = Math.max(1, ...groupItems.map(item => {
          const piece = armor?.pieces.find(p => p.id === item.pieceId);
          return pieceMaxQ(piece);
        }));

        // Bulk controls
        const bulkControls = el('div', 'cart-group-bulk-controls');
        const bulkLabel = el('span', 'metric-label', 'All:');
        bulkControls.appendChild(bulkLabel);

        // Bulk Have
        const bulkHaveLabel = el('span', null, 'Have');
        const bulkHaveSelect = el('select', 'level-select');
        const optHaveNone = el('option', null, 'None');
        optHaveNone.value = '0';
        bulkHaveSelect.appendChild(optHaveNone);
        for (let q = 1; q <= groupMax - 1; q++) {
          const opt = el('option', null, 'Q' + q);
          opt.value = String(q);
          bulkHaveSelect.appendChild(opt);
        }
        // Detect common have
        const allSameHave = groupItems.every(i => i.have === groupItems[0].have);
        bulkHaveSelect.value = allSameHave && groupItems[0].have < groupMax ? String(groupItems[0].have) : '0';

        bulkHaveSelect.addEventListener('change', function () {
          const newHave = parseInt(bulkHaveSelect.value, 10);
          groupItems.forEach(item => {
            const piece = armor?.pieces.find(p => p.id === item.pieceId);
            const pMax = pieceMaxQ(piece);
            item.have = Math.min(newHave, pMax - 1);
            if (item.want <= item.have) {
              item.want = Math.min(pMax, item.have + 1);
            }
          });
          saveAndRenderCart();
        });

        // Bulk Want
        const bulkWantLabel = el('span', null, 'Want');
        const bulkWantSelect = el('select', 'level-select');
        for (let q = 1; q <= groupMax; q++) {
          const opt = el('option', null, 'Q' + q);
          opt.value = String(q);
          bulkWantSelect.appendChild(opt);
        }
        // Detect common want
        const allSameWant = groupItems.every(i => i.want === groupItems[0].want);
        bulkWantSelect.value = allSameWant ? String(groupItems[0].want) : String(groupMax);

        bulkWantSelect.addEventListener('change', function () {
          const newWant = parseInt(bulkWantSelect.value, 10);
          groupItems.forEach(item => {
            const piece = armor?.pieces.find(p => p.id === item.pieceId);
            const pMax = pieceMaxQ(piece);
            item.want = Math.min(newWant, pMax);
            item.have = Math.max(0, Math.min(item.have, item.want - 1));
          });
          saveAndRenderCart();
        });

        const removeGroupBtn = el('button', 'cart-remove-btn', '✕');
        removeGroupBtn.type = 'button';
        removeGroupBtn.title = t('Remove entire set');
        removeGroupBtn.addEventListener('click', function () {
          cart = cart.filter(i => i.groupId !== groupId);
          saveAndRenderCart();
        });

        bulkControls.appendChild(bulkHaveLabel);
        bulkControls.appendChild(bulkHaveSelect);
        bulkControls.appendChild(bulkWantLabel);
        bulkControls.appendChild(bulkWantSelect);
        bulkControls.appendChild(removeGroupBtn);
        groupHeader.appendChild(bulkControls);
        groupEl.appendChild(groupHeader);

        // Group pieces
        groupItems.forEach(item => {
          const pieceRow = renderCartPieceRow(item, false);
          groupEl.appendChild(pieceRow);
        });

        itemsContainer.appendChild(groupEl);
      });

      // Render standalone pieces
      standaloneItems.forEach(item => {
        const pieceRow = renderCartPieceRow(item, true);
        itemsContainer.appendChild(pieceRow);
      });

      // Raw materials and goods added from Items/Traders: "N× name", no Have/Want.
      if (materialLines.length > 0) {
        const goodsEl = el('div', 'cart-group cart-goods-group');
        const goodsHeader = el('div', 'cart-group-header');
        goodsHeader.appendChild(el('span', 'cart-group-title', t('Materials & goods')));
        goodsEl.appendChild(goodsHeader);
        materialLines.forEach(line => goodsEl.appendChild(renderCartMaterialRow(line)));
        itemsContainer.appendChild(goodsEl);
      }

      cartContent.appendChild(itemsContainer);

      // 2. Breakdown Toggle
      const breakdownBox = el('div', 'controls-toggles');
      const breakdownLabel = el('label', 'toggle-control');
      const breakdownCheckbox = el('input');
      breakdownCheckbox.type = 'checkbox';
      breakdownCheckbox.id = 'raw-materials-toggle';
      breakdownCheckbox.setAttribute('aria-describedby', 'raw-materials-help');
      const unexpanded = calculateCartMaterials(cart, data, { openBiomes: new Set(getStoredOpenBiomes()), showAll });
      breakdownCheckbox.disabled = !unexpanded.canBreakDown;
      breakdownCheckbox.checked = breakdown && !breakdownCheckbox.disabled;
      breakdownCheckbox.addEventListener('change', function () {
        breakdown = breakdownCheckbox.checked;
        setStoredBreakdown(breakdown);
        renderCart();
      });

      const sliderSpan = el('span', 'toggle-slider');
      sliderSpan.setAttribute('aria-hidden', 'true');
      const textSpan = el('span', 'toggle-text', 'Show raw materials');

      breakdownLabel.appendChild(breakdownCheckbox);
      breakdownLabel.appendChild(sliderSpan);
      breakdownLabel.appendChild(textSpan);
      breakdownBox.appendChild(breakdownLabel);
      const help = el('p', 'raw-materials-help', 'Lists what you gather in the world (e.g. Bronze → Copper Ore + Tin Ore) and the crafting steps.');
      help.id = 'raw-materials-help';
      breakdownBox.appendChild(help);
      if (!unexpanded.canBreakDown) breakdownBox.appendChild(el('p', 'raw-materials-help', 'Nothing to break down — all materials are already raw.'));
      cartContent.appendChild(breakdownBox);

      // 3. Calculate Materials & Steps
      const furnaceCount = getStoredFurnaces();
      const calc = calculateCartMaterials(cart, data, {
        breakdown,
        openBiomes: new Set(getStoredOpenBiomes()),
        showAll,
        furnaceCount
      });

      // 4. Materials List Section
      const matsSection = el('div', 'cart-materials-section');
      const matsTitle = el('h3', 'cart-section-title', 'Total Materials');
      matsSection.appendChild(matsTitle);

      if (calc.hasNonTeleportable) {
        const tpWarning = el('div', 'cart-teleport-warning');
        const tpIcon = el('span', 'cart-warning-icon', '⚠');
        const tpText = el('span', 'cart-warning-text', t('Contains materials that cannot be teleported through portals.'));
        tpWarning.appendChild(tpIcon);
        tpWarning.appendChild(tpText);
        matsSection.appendChild(tpWarning);
      }

      const matsList = el('div', 'materials-list');
      calc.materials.forEach(mat => {
        const row = el('div', 'material-row');

        const left = el('div', 'material-left');
        if (mat.image) {
          const icon = el('img', 'material-icon');
          icon.src = mat.image;
          icon.alt = mat.name;
          icon.loading = 'lazy';
          left.appendChild(icon);
        }

        const nameQty = el('div', 'material-name-qty');
        const qtySpan = el('span', 'material-qty', mat.amount + '×');
        const nameLink = el('a', 'material-name item-link', mat.name);
        nameLink.href = `/items/#item=${encodeURIComponent(mat.item)}`;
        nameQty.appendChild(qtySpan);
        nameQty.appendChild(nameLink);
        left.appendChild(nameQty);
        row.appendChild(left);

        const right = el('div', 'material-sources');
        if (mat.fuel) {
          const fuelBadge = el('span', 'badge badge-fuel', 'fuel');
          right.appendChild(fuelBadge);
        }

        if (mat.teleportable === false) {
          const tpBadge = el('span', 'badge badge-teleport-warning', t("Can't be teleported"));
          right.appendChild(tpBadge);
        }

        renderMaterialSources(right, mat.sources, mat.item);

        row.appendChild(right);
        matsList.appendChild(row);
      });

      matsSection.appendChild(matsList);
      cartContent.appendChild(matsSection);

      // 5. Intermediate Crafting Steps (if any)
      if (calc.craftingSteps.length > 0) {
        const stepsSection = el('div', 'crafting-steps-section');
        const stepsTitle = el('div', 'crafting-steps-title', 'Crafting Steps');
        stepsSection.appendChild(stepsTitle);

        calc.craftingSteps.forEach(step => {
          const stepItem = el('div', 'crafting-step-item', step.text);
          stepsSection.appendChild(stepItem);
        });

        cartContent.appendChild(stepsSection);
      }

      // Smelting Planner Section (if any bars to smelt)
      if (calc.smelting && calc.smelting.totalBars > 0) {
        const smeltingSection = el('div', 'smelting-section');
        const smeltingHeader = el('div', 'smelting-header');
        const smeltingTitle = el('h3', 'cart-section-title', t('Smelting Planner'));
        smeltingHeader.appendChild(smeltingTitle);

        const furnaceRow = el('div', 'smelting-furnace-row');
        const furnaceLabel = el('span', 'metric-label', t('Furnaces:'));
        const furnaceSelect = el('select', 'level-select furnace-select');
        for (let f = 1; f <= 8; f++) {
          const opt = el('option', null, tn('{count} × furnace', f, { count: f }));
          opt.value = String(f);
          furnaceSelect.appendChild(opt);
        }
        furnaceSelect.value = String(furnaceCount);
        furnaceSelect.addEventListener('change', () => {
          setStoredFurnaces(parseInt(furnaceSelect.value, 10));
          renderCart();
        });
        furnaceRow.appendChild(furnaceLabel);
        furnaceRow.appendChild(furnaceSelect);
        smeltingHeader.appendChild(furnaceRow);
        smeltingSection.appendChild(smeltingHeader);

        const metricsBox = el('div', 'smelting-metrics-box');

        const barsRow = el('div', 'cart-summary-metric');
        const barsLabel = el('span', 'metric-label', t('Total bars to smelt:'));
        const barsVal = el('span', 'metric-value', String(calc.smelting.totalBars));
        barsRow.appendChild(barsLabel);
        barsRow.appendChild(barsVal);
        metricsBox.appendChild(barsRow);

        const coalRow = el('div', 'cart-summary-metric');
        const coalLabel = el('span', 'metric-label', t('{item} needed:', { item: 'Coal' }));
        const coalVal = el('span', 'metric-value metric-value-gold', String(calc.smelting.totalCoal));
        coalRow.appendChild(coalLabel);
        coalRow.appendChild(coalVal);
        metricsBox.appendChild(coalRow);

        const woodRow = el('div', 'cart-summary-metric');
        const woodLabel = el('span', 'metric-label', t('{item} in {station}:', { item: 'Wood', station: 'Charcoal Kiln' }));
        const woodVal = el('span', 'metric-value', String(calc.smelting.totalKilnWood));
        woodRow.appendChild(woodLabel);
        woodRow.appendChild(woodVal);
        metricsBox.appendChild(woodRow);

        const timeRow = el('div', 'cart-summary-metric');
        const timeLabel = el('span', 'metric-label', t('Time per furnace:'));
        const timeVal = el('span', 'metric-value metric-value-gold', tn('{time} min', calc.smelting.seconds / 60, { time: calc.smelting.timeFormatted }));
        timeRow.appendChild(timeLabel);
        timeRow.appendChild(timeVal);
        metricsBox.appendChild(timeRow);

        smeltingSection.appendChild(metricsBox);
        cartContent.appendChild(smeltingSection);
      }

      // 6. Summary Box
      const summaryBox = el('div', 'cart-summary-box');

      const armorRow = el('div', 'cart-summary-metric');
      const armorLabel = el('span', 'metric-label', 'Total Armor:');
      const armorVal = el('span', 'metric-value metric-value-gold', String(calc.summary.totalArmor));
      armorRow.appendChild(armorLabel);
      armorRow.appendChild(armorVal);
      summaryBox.appendChild(armorRow);

      const weightRow = el('div', 'cart-summary-metric');
      const weightLabel = el('span', 'metric-label', 'Total Weight:');
      const weightVal = el('span', 'metric-value', String(calc.summary.totalWeight));
      weightRow.appendChild(weightLabel);
      weightRow.appendChild(weightVal);
      summaryBox.appendChild(weightRow);

      if (calc.summary.activeSetBonuses.length > 0) {
        calc.summary.activeSetBonuses.forEach(b => {
          const bonusEl = el('div', 'cart-active-bonus');
          const effText = b.effects && b.effects.length > 0 ? ' — ' + b.effects.map(effectText).join(', ') : '';
          bonusEl.textContent = t('Active Bonus: {name}', { name: entityName(b) }) + effText;
          summaryBox.appendChild(bonusEl);
        });
      }

      cartContent.appendChild(summaryBox);

      // 7. Cart Action Buttons
      const actionsBox = el('div', 'cart-actions');

      const copyBtn = el('button', 'action-btn', 'Copy list');
      copyBtn.type = 'button';
      copyBtn.addEventListener('click', function () {
        const text = VCShopping.formatList(calc.materials, globalThis.VCI18n?.locale?.() || 'en');
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(() => {
            copyBtn.textContent = t('Copied!');
            setTimeout(() => { copyBtn.textContent = t('Copy list'); }, 1500);
          }).catch(() => {});
        }
      });

      const clearBtn = el('button', 'action-btn action-btn-danger', 'Clear');
      clearBtn.type = 'button';
      clearBtn.addEventListener('click', function () {
        cart = [];
        saveAndRenderCart();
      });

      actionsBox.appendChild(copyBtn);
      actionsBox.appendChild(clearBtn);
      cartContent.appendChild(actionsBox);
    }

    function renderCartMaterialRow(line) {
      const row = el('div', 'cart-piece-row cart-material-row');
      const info = el('div', 'cart-piece-info');
      const name = materialDisplayName(line.materialId, line.name, data);
      const itemData = data.items?.[line.materialId];
      if (itemData?.image) {
        const icon = el('img', 'cart-piece-icon');
        icon.src = itemData.image;
        icon.alt = name;
        icon.loading = 'lazy';
        info.appendChild(icon);
      }
      const label = el('span', 'cart-piece-name');
      label.textContent = `${line.amount}× ${name}`;
      info.appendChild(label);
      row.appendChild(info);
      const removeBtn = el('button', 'cart-remove-btn', '✕');
      removeBtn.type = 'button';
      removeBtn.title = t('Remove piece');
      removeBtn.addEventListener('click', function () {
        cart = cart.filter(i => i.id !== line.id);
        saveAndRenderCart();
      });
      row.appendChild(removeBtn);
      return row;
    }

    function renderCartPieceRow(item, showSetName) {
      const armor = item.setId ? data.armor.find(a => a.id === item.setId) : null;
      const piece = armor?.pieces.find(p => p.id === item.pieceId);
      const weapon = !piece ? (data.weapons || []).find(w => w.id === item.pieceId) : null;
      const maxQ = piece ? pieceMaxQ(piece)
                         : (weapon ? (weapon.maxQuality || weapon.levels?.length || 1) : 4);

      const row = el('div', 'cart-piece-row');

      const info = el('div', 'cart-piece-info');
      const itemImage = piece?.image || weapon?.image;
      const itemName = weapon ? weapon.name : (piece ? entityName(piece) : item.pieceId);
      if (itemImage) {
        const icon = el('img', 'cart-piece-icon');
        icon.src = itemImage;
        icon.alt = itemName;
        icon.loading = 'lazy';
        info.appendChild(icon);
      }

      const displayName = weapon
        ? weapon.name
        : (showSetName && armor ? entityName(piece) + ' (' + entityName(armor) + ')' : entityName(piece) || item.pieceId);
      const nameLabel = el('span', 'cart-piece-name', displayName);
      info.appendChild(nameLabel);
      row.appendChild(info);

      const selectsBox = el('div', 'cart-levels-selects');

      // Have Select
      const haveLabel = el('span', 'metric-label', t('Have'));
      const haveSelect = el('select', 'level-select');
      const optHave0 = el('option', null, t('None'));
      optHave0.value = '0';
      haveSelect.appendChild(optHave0);

      for (let q = 1; q < maxQ; q++) {
        const opt = el('option', null, 'Q' + q);
        opt.value = String(q);
        // Disable if >= want
        if (q >= item.want) opt.disabled = true;
        haveSelect.appendChild(opt);
      }
      haveSelect.value = String(item.have);

      haveSelect.addEventListener('change', function () {
        const val = parseInt(haveSelect.value, 10);
        item.have = val;
        if (item.want <= val) {
          item.want = Math.min(maxQ, val + 1);
        }
        saveAndRenderCart();
      });

      // Want Select
      const wantLabel = el('span', 'metric-label', t('Want'));
      const wantSelect = el('select', 'level-select');

      for (let q = 1; q <= maxQ; q++) {
        const opt = el('option', null, 'Q' + q);
        opt.value = String(q);
        // Disable if <= have
        if (q <= item.have) opt.disabled = true;
        wantSelect.appendChild(opt);
      }
      wantSelect.value = String(item.want);

      wantSelect.addEventListener('change', function () {
        const val = parseInt(wantSelect.value, 10);
        item.want = val;
        if (item.have >= val) {
          item.have = Math.max(0, val - 1);
        }
        saveAndRenderCart();
      });

      const removeBtn = el('button', 'cart-remove-btn', '✕');
      removeBtn.type = 'button';
      removeBtn.title = weapon ? t('Remove weapon') : t('Remove piece');
      removeBtn.addEventListener('click', function () {
        cart = cart.filter(i => i.id !== item.id);
        saveAndRenderCart();
      });

      selectsBox.appendChild(haveLabel);
      selectsBox.appendChild(haveSelect);
      selectsBox.appendChild(wantLabel);
      selectsBox.appendChild(wantSelect);
      selectsBox.appendChild(removeBtn);
      row.appendChild(selectsBox);

      return row;
    }

    const picker = VCI18n.mountPicker('#language-picker');
    function translatePage() {
      VCI18n.apply(document);
      picker.setAttribute('aria-label', t('Language'));
      picker.options[0].textContent = t('Auto (browser)');
      const accordion = [...document.querySelectorAll('.biome-header')].map(header => ({ id: header.id, open: header.getAttribute('aria-expanded') === 'true' }));
      const detailStates = [...document.querySelectorAll('.set-card')].map(card => ({
        id: card.dataset.armorId || card.dataset.weaponId,
        open: !card.querySelector('.set-detail').hasAttribute('inert'),
        level: card.querySelector('.level-pill-btn.active')?.dataset.level,
      }));
      renderCatalog();
      accordion.forEach(state => {
        const header = document.getElementById(state.id);
        if (header && (header.getAttribute('aria-expanded') === 'true') !== state.open) header.click();
      });
      detailStates.filter(state => state.open).forEach(state => {
        const card = document.querySelector('.set-card[data-armor-id="' + state.id + '"], .set-card[data-weapon-id="' + state.id + '"]');
        card?.querySelector('.set-detail-toggle-btn').click();
        card?.querySelector('.level-pill-btn[data-level="' + state.level + '"]')?.click();
      });
      renderCart();
      buildFooter(footer, data);
    }
    VCI18n.onChange(translatePage);
    VCProgress.onChange(() => {
      renderCatalog();
      renderCart();
    });
    VCI18n.apply(document);
    picker.setAttribute('aria-label', t('Language'));
    picker.options[0].textContent = t('Auto (browser)');

    renderCatalog();
    renderCart();

    function renderMaterialSources(parent, sources, itemId) {
      const badges = itemId ? traderBadges(itemId) : [];
      const hasTraders = badges.length > 0;
      if (hasTraders) {
        badges.forEach(b => parent.appendChild(b));
      }
      (sources || []).forEach(src => {
        if (src.kind === 'npc' && hasTraders) {
          return;
        }
        const srcClass = src.locked ? 'badge badge-source badge-source-locked' : 'badge badge-source';
        const srcBadge = el(src.locked && src.biomeId ? 'button' : 'span', srcClass, src.text);
        if (src.locked && src.biomeId) {
          srcBadge.type = 'button';
          srcBadge.addEventListener('click', () => {
            const open = new Set(getManualOpenBiomes());
            open.add(src.biomeId);
            setStoredOpenBiomes([...open]);
            renderCatalog();
            renderCart();
          });
        }
        parent.appendChild(srcBadge);
      });
    }

    function showMaterialCard(item) {
      const openBiomes = new Set(getStoredOpenBiomes());
      const biome = data.biomes.find(b => b.id === item.biome);
      const card = el('section', 'material-card deep-link-highlight');
      card.setAttribute('aria-label', t('Material details'));
      card.appendChild(el('h2', null, item.name));
      if (item.biome && !showAll && !openBiomes.has(item.biome)) {
        card.appendChild(el('p', 'locked-text', t('Biome {order} — open it in the Bestiary or reveal here', { order: biome?.order ?? 99 })));
      } else {
        if (item.image) {
          const image = el('img', 'material-card-image');
          image.src = item.image; image.alt = ''; image.width = 80; image.height = 80;
          card.appendChild(image);
        }
        card.appendChild(el('p', null, biomeName(biome)));
        card.appendChild(el('h3', null, t('Sources')));
        const sources = el('div', 'material-sources');
        renderMaterialSources(sources, formatMaterialSources(item, data, { openBiomes, showAll }), item.id);
        card.appendChild(sources);
        card.appendChild(el('h3', null, t('Used in')));
        const contains = entity => (entity.levels || []).some(level =>
          (level.materials || []).some(material => material.item === item.id));
        const uses = [
          ...(data.armor || []).filter(armor => (armor.pieces || []).some(contains)).map(armor => ({ ...armor, hash: '#set=' + armor.id })),
          ...(data.weapons || []).filter(contains).map(weapon => ({ ...weapon, hash: '#item=' + weapon.id })),
        ].sort((a, b) => (data.biomes.find(biome => biome.id === a.biome)?.order ?? 99) -
          (data.biomes.find(biome => biome.id === b.biome)?.order ?? 99) || a.name.localeCompare(b.name));
        const list = el('ul', 'material-uses');
        let locked = 0;
        for (const use of uses) {
          if (use.biome && !showAll && !openBiomes.has(use.biome)) { locked++; continue; }
          const row = el('li');
          const link = el('a', null, use.name); link.href = use.hash;
          row.appendChild(link); list.appendChild(row);
        }
        if (uses.length) card.appendChild(list);
        else card.appendChild(el('p', 'material-uses-empty', t('Not used in any Smithy recipe.')));
        if (locked) card.appendChild(el('p', null, tn('{count} more in locked biomes', locked, { count: locked })));
      }
      const close = el('button', 'action-btn', t('Close')); close.type = 'button';
      close.addEventListener('click', () => { window.location.hash = ''; });
      card.appendChild(close);
      const catalog = viewArmor.parentElement;
      catalog.insertBefore(card, catalog.firstChild);
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function handleDeepLink() {
      document.querySelector('.material-card')?.remove();
      const hash = window.location.hash || '';
      if (!hash) return;

      const matchSet = hash.match(/^#set=([a-zA-Z0-9_-]+)/);
      const matchItem = hash.match(/^#item=([a-zA-Z0-9_-]+)/);

      if (matchSet) {
        const setId = matchSet[1];
        const armor = (data.armor || []).find(a => a.id === setId);
        if (!armor) return;

        switchCatalogTab('armor');

        if (armor.biome && !showAll && !getStoredOpenBiomes().includes(armor.biome)) {
          document.getElementById('biome-header-' + armor.biome)?.scrollIntoView({ block: 'center' });
          return;
        }
        if (armor.biome) {
          const open = new Set(getManualOpenBiomes());
          if (!getStoredOpenBiomes().includes(armor.biome)) {
            open.add(armor.biome);
            setStoredOpenBiomes([...open]);
            renderCatalog();
            renderCart();
          }

          const headerBtn = document.getElementById('biome-header-' + armor.biome);
          const content = document.getElementById('biome-content-' + armor.biome);
          if (headerBtn && content) {
            headerBtn.setAttribute('aria-expanded', 'true');
            content.removeAttribute('inert');
          }
        } else if (armor.kind === 'special') {
          const headerBtn = document.getElementById('dlc-seasonal-header');
          const content = document.getElementById('dlc-seasonal-content');
          if (headerBtn && content) {
            headerBtn.setAttribute('aria-expanded', 'true');
            content.removeAttribute('inert');
          }
        } else if (armor.kind === 'cosmetic' || !armor.biome) {
          const headerBtn = document.getElementById('cosmetics-header');
          const content = document.getElementById('cosmetics-content');
          if (headerBtn && content) {
            headerBtn.setAttribute('aria-expanded', 'true');
            content.removeAttribute('inert');
          }
        }

        const card = document.querySelector(`.set-card[data-armor-id="${setId}"]`);
        if (card) {
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          card.classList.add('deep-link-highlight');
          setTimeout(() => card.classList.remove('deep-link-highlight'), 2200);
        }
      } else if (matchItem) {
        const itemId = matchItem[1];
        const weapon = (data.weapons || []).find(w => w.id === itemId);
        if (weapon) {
          switchCatalogTab('weapons');

          if (weapon.biome && !showAll && !getStoredOpenBiomes().includes(weapon.biome)) {
            document.getElementById('weapons-biome-header-' + weapon.biome)?.scrollIntoView({ block: 'center' });
            return;
          }
          if (weapon.biome) {
            const open = new Set(getManualOpenBiomes());
            if (!getStoredOpenBiomes().includes(weapon.biome)) {
              open.add(weapon.biome);
              setStoredOpenBiomes([...open]);
              renderCatalog();
              renderCart();
            }

            const headerBtn = document.getElementById('weapons-biome-header-' + weapon.biome);
            const content = document.getElementById('weapons-biome-content-' + weapon.biome);
            if (headerBtn && content) {
              headerBtn.setAttribute('aria-expanded', 'true');
              content.removeAttribute('inert');
            }
          }

          const card = document.querySelector(`.weapon-card[data-weapon-id="${itemId}"]`);
          if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            card.classList.add('deep-link-highlight');
            setTimeout(() => card.classList.remove('deep-link-highlight'), 2200);
          }
          return;
        }

        const armorWithPiece = (data.armor || []).find(a => a.id === itemId || (a.pieces || []).some(p => p.id === itemId));
        if (!armorWithPiece && data.items?.[itemId]) {
          showMaterialCard(data.items[itemId]);
          return;
        }
        if (armorWithPiece) {
          switchCatalogTab('armor');

          if (armorWithPiece.biome && !showAll && !getStoredOpenBiomes().includes(armorWithPiece.biome)) {
            document.getElementById('biome-header-' + armorWithPiece.biome)?.scrollIntoView({ block: 'center' });
            return;
          }
          if (armorWithPiece.biome) {
            const open = new Set(getManualOpenBiomes());
            if (!getStoredOpenBiomes().includes(armorWithPiece.biome)) {
              open.add(armorWithPiece.biome);
              setStoredOpenBiomes([...open]);
              renderCatalog();
              renderCart();
            }

            const headerBtn = document.getElementById('biome-header-' + armorWithPiece.biome);
            const content = document.getElementById('biome-content-' + armorWithPiece.biome);
            if (headerBtn && content) {
              headerBtn.setAttribute('aria-expanded', 'true');
              content.removeAttribute('inert');
            }
          } else if (armorWithPiece.kind === 'special') {
            const headerBtn = document.getElementById('dlc-seasonal-header');
            const content = document.getElementById('dlc-seasonal-content');
            if (headerBtn && content) {
              headerBtn.setAttribute('aria-expanded', 'true');
              content.removeAttribute('inert');
            }
          } else if (armorWithPiece.kind === 'cosmetic' || !armorWithPiece.biome) {
            const headerBtn = document.getElementById('cosmetics-header');
            const content = document.getElementById('cosmetics-content');
            if (headerBtn && content) {
              headerBtn.setAttribute('aria-expanded', 'true');
              content.removeAttribute('inert');
            }
          }

          const card = document.querySelector(`.set-card[data-armor-id="${armorWithPiece.id}"]`);
          if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            card.classList.add('deep-link-highlight');
            setTimeout(() => card.classList.remove('deep-link-highlight'), 2200);
          }
        }
      }
    }

    const refreshMaterialLink = () => {
      const id = window.location.hash.match(/^#item=([a-zA-Z0-9_-]+)$/)?.[1];
      if (id && data.items?.[id] && document.querySelector('.material-card')) handleDeepLink();
    };
    VCProgress.onChange(refreshMaterialLink);
    VCI18n.onChange(refreshMaterialLink);
    window.addEventListener('hashchange', handleDeepLink);
    handleDeepLink();
  }

  function buildFooter(footer, data) {
    if (!footer) return;
    footer.textContent = '';

    const p1 = el('p');
    p1.appendChild(document.createTextNode(t('Data: ')));

    const wikiA = el('a', null, 'Valheim Wiki (valheim.weirdgloop.org)');
    wikiA.href = 'https://valheim.weirdgloop.org';
    wikiA.target = '_blank';
    wikiA.rel = 'noopener noreferrer';
    p1.appendChild(wikiA);

    p1.appendChild(document.createTextNode(t(', CC BY-SA 4.0 · generated ')));

    const genDate = data && data.generatedAt ? data.generatedAt.slice(0, 10) : '2026-10-06';
    p1.appendChild(document.createTextNode(genDate));
    footer.appendChild(p1);

    const p2 = el('p', null, 'Fan project, not affiliated with Iron Gate.');
    footer.appendChild(p2);

    const pSupport = el('p', 'support');
    const spanText = el('span');
    const strong = el('strong', null, 'Free, ad-free and made in my spare time.');
    spanText.appendChild(strong);
    spanText.appendChild(document.createTextNode(t(' If it helped your run, you can buy me a coffee.')));
    pSupport.appendChild(spanText);

    const aKofi = el('a');
    aKofi.href = 'https://ko-fi.com/N2A528ACE3';
    aKofi.target = '_blank';
    aKofi.rel = 'noopener noreferrer';

    const imgKofi = document.createElement('img');
    imgKofi.src = '/support/kofi.png';
    imgKofi.alt = t('Buy Me a Coffee at ko-fi.com');
    imgKofi.width = 143;
    imgKofi.height = 36;
    imgKofi.loading = 'lazy';
    aKofi.appendChild(imgKofi);

    pSupport.appendChild(aKofi);
    footer.appendChild(pSupport);
  }

  // Auto-init on DOMContentLoaded if in browser
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initArmourer);
    } else {
      initArmourer();
    }
  }

  return {
    calculateCartMaterials,
    calculateSmelting,
    calculateTotalArmor,
    getStoredOpenBiomes,
    setStoredOpenBiomes,
    getStoredShowAll,
    setStoredShowAll,
    getStoredCart,
    setStoredCart,
    getStoredBreakdown,
    setStoredBreakdown,
    getStoredCatalogTab,
    setStoredCatalogTab,
    getStoredFurnaces,
    setStoredFurnaces,
    traderBadges,
    pieceMaxQ
  };
});
