/**
 * Armourer — Valheim Companion
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

  /**
   * Helper to create DOM element safely without innerHTML
   */
  function el(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined && text !== null) element.textContent = text;
    return element;
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
      localStorage.removeItem('va.showAll');
    } catch {
      // LocalStorage unavailable, ignore
    }
  }

  function getStoredCart() {
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

  function getActionVerb(station) {
    const s = (station || '').toLowerCase();
    if (s.includes('smelt') || s.includes('blast furnace') || s.includes('smelting')) return 'Smelt';
    if (s.includes('spin')) return 'Spin';
    if (s.includes('refin')) return 'Refine';
    return 'Craft';
  }

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
   * Pure calculation function: calculates raw materials, breakdown,
   * intermediate steps, total armor, total weight and active set bonus.
   */
  function calculateCartMaterials(cart, data, options) {
    const opts = options || {};
    if (!cart || !Array.isArray(cart) || !data) {
      return {
        materials: [],
        craftingSteps: [],
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

    const biomesByOrder = new Map();
    (data.biomes || []).forEach(b => {
      biomesByOrder.set(b.id, b);
    });

    // 1. Raw materials map: itemId -> { amount, isFuel }
    const rawMats = new Map();
    let totalArmor = 0;
    let totalWeight = 0;
    const setPieceCounts = new Map();

    cart.forEach(item => {
      const entry = pieceMap.get(item.pieceId);
      if (!entry) return;
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

      // Materials for q in (Have, Want]
      const have = typeof item.have === 'number' ? item.have : 0;
      const want = typeof item.want === 'number' ? item.want : 1;

      (piece.levels || []).forEach(lvl => {
        if (lvl.quality > have && lvl.quality <= want) {
          (lvl.materials || []).forEach(m => {
            const current = rawMats.get(m.item) || { amount: 0, fuel: false };
            current.amount += m.amount;
            if (m.fuel) current.fuel = true;
            rawMats.set(m.item, current);
          });
        }
      });
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
            name: armor.setBonus.name,
            pieces: armor.setBonus.pieces,
            effects: armor.setBonus.effects || []
          });
        }
      }
    });

    // 2. Breakdown logic if requested
    const finalMats = new Map();
    const intermediateStepsMap = new Map(); // key: "station|itemId" -> { station, itemId, amount }

    if (breakdown) {
      function expandItem(itemId, qty, fuelFlag, depth, visitedPath) {
        const itemInfo = data.items && data.items[itemId];
        if (depth >= 3 || !itemInfo || !itemInfo.recipe || visitedPath.has(itemId)) {
          // Base material
          const cur = finalMats.get(itemId) || { amount: 0, fuel: false };
          cur.amount += qty;
          if (fuelFlag) cur.fuel = true;
          finalMats.set(itemId, cur);
          return;
        }

        visitedPath.add(itemId);
        const rec = itemInfo.recipe;
        const station = rec.station || 'Station';
        const yields = rec.yields || 1;
        const batches = qty / yields;

        // Record intermediate crafting step
        const stepKey = station + '|' + itemId;
        const step = intermediateStepsMap.get(stepKey) || {
          station,
          itemId,
          productName: itemInfo.name || itemId,
          amount: 0
        };
        step.amount += qty;
        intermediateStepsMap.set(stepKey, step);

        // Expand sub-materials
        (rec.materials || []).forEach(subMat => {
          expandItem(subMat.item, subMat.amount * batches, subMat.fuel || false, depth + 1, new Set(visitedPath));
        });
      }

      rawMats.forEach((val, itemId) => {
        expandItem(itemId, val.amount, val.fuel, 0, new Set());
      });
    } else {
      rawMats.forEach((val, itemId) => {
        finalMats.set(itemId, { amount: val.amount, fuel: val.fuel });
      });
    }

    // Format crafting steps
    const craftingSteps = [];
    intermediateStepsMap.forEach(step => {
      const verb = getActionVerb(step.station);
      craftingSteps.push({
        station: step.station,
        product: step.itemId,
        productName: step.productName,
        amount: step.amount,
        text: verb + ' ' + step.amount + '× ' + step.productName + ' at ' + step.station
      });
    });

    // Format materials with sources and spoiler handling
    const materials = [];
    finalMats.forEach((val, itemId) => {
      const itemData = (data.items && data.items[itemId]) || null;
      const name = itemData ? itemData.name : itemId;
      const image = itemData ? itemData.image : null;

      // Format source badges
      const formattedSources = [];
      const rawSources = (itemData && itemData.sources) || [];

      rawSources.forEach(src => {
        if (src.kind === 'creature') {
          const creatureBiomes = src.biomes || [];
          const hasOpenBiome = showAll || creatureBiomes.some(bId => openBiomes.has(bId));
          if (hasOpenBiome) {
            const biomeNames = creatureBiomes
              .map(bId => biomesByOrder.get(bId)?.name || bId)
              .join(', ');
            formattedSources.push({
              text: biomeNames ? src.text + ' (' + biomeNames + ')' : src.text,
              kind: 'creature',
              locked: false
            });
          } else {
            // Find lowest order biome among creature's biomes
            let lowestOrder = 99;
            creatureBiomes.forEach(bId => {
              const b = biomesByOrder.get(bId);
              if (b && b.order < lowestOrder) lowestOrder = b.order;
            });
            const orderLabel = lowestOrder !== 99 ? 'Biome ' + lowestOrder : 'a locked biome';
            formattedSources.push({
              text: 'a creature in ' + orderLabel,
              kind: 'creature',
              locked: true
            });
          }
        } else {
          formattedSources.push({
            text: src.text,
            kind: src.kind || 'other',
            locked: false
          });
        }
      });

      materials.push({
        item: itemId,
        name,
        image,
        amount: val.amount,
        fuel: val.fuel,
        sources: formattedSources
      });
    });

    // Sort materials deterministically by name
    materials.sort((a, b) => a.name.localeCompare(b.name));

    return {
      materials,
      craftingSteps,
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
    if (typeof document === 'undefined') return;

    const data = window.VA_DATA;
    if (!data) {
      console.error('VA_DATA not found');
      return;
    }

    const biomesContainer = document.getElementById('biomes-container');
    const cosmeticsContainer = document.getElementById('cosmetics-container');
    const toggleSpoilers = document.getElementById('toggle-spoilers');
    const btnCollapseAll = document.getElementById('btn-collapse-all');
    const btnResetProgress = document.getElementById('btn-reset-progress');
    const footer = document.getElementById('page-footer');

    // Build Footer
    buildFooter(footer, data);

    // Initial state
    let showAll = getStoredShowAll();
    if (toggleSpoilers) {
      toggleSpoilers.checked = showAll;
      toggleSpoilers.addEventListener('change', function () {
        showAll = toggleSpoilers.checked;
        setStoredShowAll(showAll);
        renderCatalog();
      });
    }

    if (btnResetProgress) {
      btnResetProgress.addEventListener('click', function () {
        clearStoredOpenBiomes();
        showAll = false;
        if (toggleSpoilers) toggleSpoilers.checked = false;
        renderCatalog();
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

    data.armor.forEach(armor => {
      if (armor.kind === 'cosmetic' || !armor.biome) {
        cosmetics.push(armor);
      } else if (armorByBiome.has(armor.biome)) {
        armorByBiome.get(armor.biome).push(armor);
      }
    });

    function renderCatalog() {
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
        const orderBadge = el('span', 'biome-order-badge', 'Biome ' + biome.order);
        const nameHeading = el('span', 'biome-name', biome.name);
        const countBadge = el('span', 'biome-count-badge', sets.length + (sets.length === 1 ? ' set' : ' sets'));

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
          const lockMsg = el('span', null, 'Biome ' + biome.order + ' — open it in the Bestiary or reveal here');
          lockedText.appendChild(lockIcon);
          lockedText.appendChild(lockMsg);

          const revealBtn = el('button', 'action-btn action-btn-primary', 'Reveal');
          revealBtn.type = 'button';
          revealBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            const current = new Set(getStoredOpenBiomes());
            current.add(biome.id);
            setStoredOpenBiomes(Array.from(current));
            renderCatalog();
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
        const countBadge = el('span', 'biome-count-badge', cosmetics.length + ' items');

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
          img.alt = p.name;
          img.loading = 'lazy';
          iconsRow.appendChild(img);
        }
      });
      summaryLeft.appendChild(iconsRow);

      const infoCol = el('div', 'set-summary-info');
      const titleRow = el('div', 'set-title-row');
      const title = el('h3', 'set-title', armor.name);
      titleRow.appendChild(title);

      const badgesRow = el('div', 'set-badges-row');

      // Armor badge (q1 -> max)
      const { q1, max } = calculateTotalArmor(armor.pieces);
      const armorBadgeText = q1 === max ? 'Armor: ' + q1 : 'Armor: ' + q1 + ' → ' + max;
      const armorBadge = el('span', 'badge badge-armor', armorBadgeText);
      badgesRow.appendChild(armorBadge);

      // Set bonus chip
      if (armor.setBonus) {
        const bonusText = armor.setBonus.name;
        const bonusBadge = el('span', 'badge badge-bonus', bonusText);
        badgesRow.appendChild(bonusBadge);
      }

      infoCol.appendChild(titleRow);
      infoCol.appendChild(badgesRow);
      summaryLeft.appendChild(infoCol);

      // Right: Add set button + details toggle button
      const summaryRight = el('div', 'set-summary-right');

      const addSetBtn = el('button', 'action-btn action-btn-primary', 'Add set');
      addSetBtn.type = 'button';
      addSetBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        // Handled in Step 3 / cart integration
        const evt = new CustomEvent('va:add-set', { detail: { armor } });
        window.dispatchEvent(evt);
      });

      const toggleDetailsBtn = el('button', 'set-detail-toggle-btn', 'Details ▾');
      toggleDetailsBtn.type = 'button';

      summaryRight.appendChild(addSetBtn);
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
          toggleDetailsBtn.textContent = 'Details ▾';
        } else {
          if (!detailRendered) {
            renderSetDetail(armor, detailContainer, data);
            detailRendered = true;
          }
          detailContainer.removeAttribute('inert');
          toggleDetailsBtn.textContent = 'Details ▴';
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
          thumb.alt = piece.name;
          thumb.loading = 'lazy';
          pieceCell.appendChild(thumb);
        }
        const nameText = el('span', 'piece-name-text', piece.name);
        pieceCell.appendChild(nameText);
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
            const resBadge = el('span', 'badge badge-source', res);
            tdResist.appendChild(resBadge);
          });
        } else {
          tdResist.textContent = '—';
        }

        // Add Piece Action
        const tdAction = el('td');
        const addPieceBtn = el('button', 'action-btn action-btn-sm', '+ Add piece');
        addPieceBtn.type = 'button';
        addPieceBtn.addEventListener('click', function () {
          const evt = new CustomEvent('va:add-piece', { detail: { piece, armor } });
          window.dispatchEvent(evt);
        });
        tdAction.appendChild(addPieceBtn);

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

          const pieceName = el('span', 'cost-piece-name', piece.name + ' · Q' + lvl.quality + (lvl.quality === 1 ? ' (Craft)' : ' (Upgrade)'));
          const stationName = piece.station || 'Station';
          const stationText = lvl.stationLevel ? stationName + ' lvl ' + lvl.stationLevel : stationName;
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
              icon.alt = itemData.name || mat.item;
              icon.loading = 'lazy';
              matPill.appendChild(icon);
            }

            const label = el('span', null, mat.amount + '× ' + (itemData ? itemData.name : mat.item));
            matPill.appendChild(label);

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
        bonusHeader.textContent = 'Set Bonus: ' + armor.setBonus.name + ' (' + armor.setBonus.pieces + ' ' + pieceWord + ')';
        bonusBox.appendChild(bonusHeader);

        if (armor.setBonus.effects && armor.setBonus.effects.length > 0) {
          const effectsUl = el('ul', 'set-bonus-effects');
          armor.setBonus.effects.forEach(eff => {
            const li = el('li', null, eff);
            effectsUl.appendChild(li);
          });
          bonusBox.appendChild(effectsUl);
        }

        container.appendChild(bonusBox);
      }

      // --- 4. Add Full Set Action ---
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
        const maxQ = p.levels && p.levels.length > 0 ? p.levels[p.levels.length - 1].quality : 1;
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

      const maxQ = piece.levels && piece.levels.length > 0 ? piece.levels[piece.levels.length - 1].quality : 1;
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
        cartCountBadge.textContent = totalPieces + (totalPieces === 1 ? ' item' : ' items');
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

      cart.forEach(item => {
        if (item.groupId) {
          if (!groupMap.has(item.groupId)) {
            groupMap.set(item.groupId, []);
          }
          groupMap.get(item.groupId).push(item);
        } else {
          standaloneItems.push(item);
        }
      });

      // Render groups
      groupMap.forEach((groupItems, groupId) => {
        const firstItem = groupItems[0];
        const armor = data.armor.find(a => a.id === firstItem.setId);
        const groupEl = el('div', 'cart-group');

        const groupHeader = el('div', 'cart-group-header');
        const groupTitle = el('span', 'cart-group-title', (armor ? armor.name : firstItem.setId) + ' (Set)');
        groupHeader.appendChild(groupTitle);

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
        for (let q = 1; q <= 3; q++) {
          const opt = el('option', null, 'Q' + q);
          opt.value = String(q);
          bulkHaveSelect.appendChild(opt);
        }
        // Detect common have
        const allSameHave = groupItems.every(i => i.have === groupItems[0].have);
        bulkHaveSelect.value = allSameHave ? String(groupItems[0].have) : '0';

        bulkHaveSelect.addEventListener('change', function () {
          const newHave = parseInt(bulkHaveSelect.value, 10);
          groupItems.forEach(item => {
            const piece = armor?.pieces.find(p => p.id === item.pieceId);
            const maxQ = piece?.levels.length || 4;
            item.have = newHave;
            if (item.want <= newHave) {
              item.want = Math.min(maxQ, newHave + 1);
            }
          });
          saveAndRenderCart();
        });

        // Bulk Want
        const bulkWantLabel = el('span', null, 'Want');
        const bulkWantSelect = el('select', 'level-select');
        for (let q = 1; q <= 4; q++) {
          const opt = el('option', null, 'Q' + q);
          opt.value = String(q);
          bulkWantSelect.appendChild(opt);
        }
        // Detect common want
        const allSameWant = groupItems.every(i => i.want === groupItems[0].want);
        bulkWantSelect.value = allSameWant ? String(groupItems[0].want) : '4';

        bulkWantSelect.addEventListener('change', function () {
          const newWant = parseInt(bulkWantSelect.value, 10);
          groupItems.forEach(item => {
            item.want = newWant;
            if (item.have >= newWant) {
              item.have = Math.max(0, newWant - 1);
            }
          });
          saveAndRenderCart();
        });

        const removeGroupBtn = el('button', 'cart-remove-btn', '✕');
        removeGroupBtn.type = 'button';
        removeGroupBtn.title = 'Remove entire set';
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

      cartContent.appendChild(itemsContainer);

      // 2. Breakdown Toggle
      const breakdownBox = el('div', 'controls-toggles');
      const breakdownLabel = el('label', 'toggle-control');
      const breakdownCheckbox = el('input');
      breakdownCheckbox.type = 'checkbox';
      breakdownCheckbox.checked = breakdown;
      breakdownCheckbox.addEventListener('change', function () {
        breakdown = breakdownCheckbox.checked;
        setStoredBreakdown(breakdown);
        renderCart();
      });

      const sliderSpan = el('span', 'toggle-slider');
      sliderSpan.setAttribute('aria-hidden', 'true');
      const textSpan = el('span', 'toggle-text', 'Break down crafted materials');

      breakdownLabel.appendChild(breakdownCheckbox);
      breakdownLabel.appendChild(sliderSpan);
      breakdownLabel.appendChild(textSpan);
      breakdownBox.appendChild(breakdownLabel);
      cartContent.appendChild(breakdownBox);

      // 3. Calculate Materials & Steps
      const calc = calculateCartMaterials(cart, data, {
        breakdown,
        openBiomes: new Set(getStoredOpenBiomes()),
        showAll
      });

      // 4. Materials List Section
      const matsSection = el('div', 'cart-materials-section');
      const matsTitle = el('h3', 'cart-section-title', 'Total Materials');
      matsSection.appendChild(matsTitle);

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
        const nameSpan = el('span', 'material-name', mat.name);
        nameQty.appendChild(qtySpan);
        nameQty.appendChild(nameSpan);
        left.appendChild(nameQty);
        row.appendChild(left);

        const right = el('div', 'material-sources');
        if (mat.fuel) {
          const fuelBadge = el('span', 'badge badge-fuel', 'fuel');
          right.appendChild(fuelBadge);
        }

        mat.sources.forEach(src => {
          const srcClass = src.locked ? 'badge badge-source badge-source-locked' : 'badge badge-source';
          const srcBadge = el('span', srcClass, src.text);
          right.appendChild(srcBadge);
        });

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
          const effText = b.effects && b.effects.length > 0 ? ' — ' + b.effects.join(', ') : '';
          bonusEl.textContent = 'Active Bonus: ' + b.name + effText;
          summaryBox.appendChild(bonusEl);
        });
      }

      cartContent.appendChild(summaryBox);

      // 7. Cart Action Buttons
      const actionsBox = el('div', 'cart-actions');

      const copyBtn = el('button', 'action-btn', 'Copy list');
      copyBtn.type = 'button';
      copyBtn.addEventListener('click', function () {
        const lines = calc.materials.map(m => m.amount + '× ' + m.name);
        const text = lines.join('\n');
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(() => {
            copyBtn.textContent = 'Copied!';
            setTimeout(() => { copyBtn.textContent = 'Copy list'; }, 1500);
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

    function renderCartPieceRow(item, showSetName) {
      const armor = data.armor.find(a => a.id === item.setId);
      const piece = armor?.pieces.find(p => p.id === item.pieceId);
      const maxQ = piece?.levels && piece.levels.length > 0 ? piece.levels[piece.levels.length - 1].quality : 4;

      const row = el('div', 'cart-piece-row');

      const info = el('div', 'cart-piece-info');
      if (piece?.image) {
        const icon = el('img', 'cart-piece-icon');
        icon.src = piece.image;
        icon.alt = piece.name;
        icon.loading = 'lazy';
        info.appendChild(icon);
      }

      const nameLabel = el('span', 'cart-piece-name', showSetName && armor ? piece?.name + ' (' + armor.name + ')' : piece?.name || item.pieceId);
      info.appendChild(nameLabel);
      row.appendChild(info);

      const selectsBox = el('div', 'cart-levels-selects');

      // Have Select
      const haveLabel = el('span', 'metric-label', 'H:');
      const haveSelect = el('select', 'level-select');
      const optHave0 = el('option', null, 'None');
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
      const wantLabel = el('span', 'metric-label', 'W:');
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
      removeBtn.title = 'Remove piece';
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

    renderCatalog();
    renderCart();
  }

  function buildFooter(footer, data) {
    if (!footer) return;
    footer.textContent = '';

    const p1 = el('p');
    p1.appendChild(document.createTextNode('Data: '));

    const wikiA = el('a', null, 'Valheim Wiki (valheim.weirdgloop.org)');
    wikiA.href = 'https://valheim.weirdgloop.org';
    wikiA.target = '_blank';
    wikiA.rel = 'noopener noreferrer';
    p1.appendChild(wikiA);

    p1.appendChild(document.createTextNode(', CC BY-SA 4.0 · generated '));

    const genDate = data && data.generatedAt ? data.generatedAt.slice(0, 10) : '2026-10-06';
    p1.appendChild(document.createTextNode(genDate));
    footer.appendChild(p1);

    const p2 = el('p', null, 'Fan project, not affiliated with Iron Gate.');
    footer.appendChild(p2);
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
    calculateTotalArmor,
    getStoredOpenBiomes,
    setStoredOpenBiomes,
    getStoredShowAll,
    setStoredShowAll,
    getStoredCart,
    setStoredCart,
    getStoredBreakdown,
    setStoredBreakdown
  };
});
