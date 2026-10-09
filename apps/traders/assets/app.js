/* Safe, CSP-compliant Trader Ledger Application (VC-40) */
(function () {
  'use strict';

  const STORAGE_KEY = 'vt.valuables';

  const t = (key, values) => (globalThis.VCI18n ? globalThis.VCI18n.t(key, values) : key);
  const number = (value) =>
    new Intl.NumberFormat(globalThis.VCI18n?.locale?.() || 'en', { maximumFractionDigits: 0 }).format(value);
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

  const tradersData = (globalThis.VC_TRADERS_DATA && globalThis.VC_TRADERS_DATA.traders) || [];
  const revealedItems = new Set();
  let currentTraderId = tradersData[0]?.id || 'haldor';
  let noticeTimer = null;

  function showNotice(key) {
    const notice = document.getElementById('notice');
    if (!notice) return;
    notice.textContent = t(key);
    notice.classList.add('show');
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => {
      notice.classList.remove('show');
    }, 2500);
  }

  function loadValuables() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          coins: Math.max(0, Number(parsed.coins) || 0),
          amber: Math.max(0, Number(parsed.amber) || 0),
          'amber-pearl': Math.max(0, Number(parsed['amber-pearl']) || 0),
          ruby: Math.max(0, Number(parsed.ruby) || 0),
          'silver-necklace': Math.max(0, Number(parsed['silver-necklace']) || 0),
        };
      }
    } catch {
      /* Fallback to defaults. */
    }
    return { coins: 0, amber: 0, 'amber-pearl': 0, ruby: 0, 'silver-necklace': 0 };
  }

  function saveValuables(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* Browser storage quota. */
    }
  }

  let valuablesState = loadValuables();

  function calculateAppraisal(state) {
    const coins = Math.max(0, Number(state.coins) || 0);
    const amber = Math.max(0, Number(state.amber) || 0) * 5;
    const amberPearl = Math.max(0, Number(state['amber-pearl']) || 0) * 10;
    const ruby = Math.max(0, Number(state.ruby) || 0) * 20;
    const silverNecklace = Math.max(0, Number(state['silver-necklace']) || 0) * 30;

    const valuablesTotal = amber + amberPearl + ruby + silverNecklace;
    const total = coins + valuablesTotal;
    return { coins, valuablesTotal, total };
  }

  function isUnlocked(item) {
    if (!item.unlockedBy) return true;
    if (revealedItems.has(item.id)) return true;

    if (globalThis.VCProgress && typeof globalThis.VCProgress.get === 'function') {
      const progress = globalThis.VCProgress.get();
      const defeated = progress?.defeated || {};
      if (item.unlockedBy.type === 'boss' && item.unlockedBy.id) {
        if (defeated[item.unlockedBy.id] === true) return true;
      } else if (item.unlockedBy.type === 'chest' && item.unlockedBy.boss) {
        if (defeated[item.unlockedBy.boss] === true) return true;
      }
    }
    return false;
  }

  function parseHash() {
    const hash = (window.location.hash || '').replace(/^#/, '');
    const params = new URLSearchParams(hash);
    return {
      trader: params.get('trader'),
      item: params.get('item'),
    };
  }

  function updateHash(traderId, itemId) {
    const params = new URLSearchParams();
    if (traderId) params.set('trader', traderId);
    if (itemId) params.set('item', itemId);
    const newHash = '#' + params.toString();
    if (window.location.hash !== newHash) {
      if (window.history && typeof window.history.replaceState === 'function') {
        window.history.replaceState(null, '', newHash);
      } else {
        window.location.hash = newHash;
      }
    }
  }

  function updateAppraisalInputs() {
    const keys = ['coins', 'amber', 'amber-pearl', 'ruby', 'silver-necklace'];
    for (const key of keys) {
      const input = document.getElementById(`input-${key}`);
      if (input) {
        input.value = String(valuablesState[key] || 0);
      }
    }
  }

  function renderAppraisalSummary(appraisal) {
    const totalEl = document.getElementById('summary-total-coins');
    const valEl = document.getElementById('summary-valuables-coins');
    const affEl = document.getElementById('summary-affordable-count');

    if (totalEl) totalEl.textContent = tn('{count} coins', appraisal.total);
    if (valEl) valEl.textContent = tn('{count} coins', appraisal.valuablesTotal);

    // Count how many items across active trader are affordable
    const trader = tradersData.find((t) => t.id === currentTraderId);
    let affordableCount = 0;
    if (trader) {
      for (const item of trader.items) {
        if (appraisal.total >= item.price) {
          affordableCount++;
        }
      }
    }
    if (affEl) affEl.textContent = tn('{count} affordable', affordableCount);
  }

  function renderTrader() {
    const trader = tradersData.find((t) => t.id === currentTraderId) || tradersData[0];
    if (!trader) return;

    // Update Tab Buttons
    const tabs = document.querySelectorAll('.trader-tab');
    tabs.forEach((tab) => {
      const isActive = tab.getAttribute('data-trader') === trader.id;
      tab.classList.toggle('is-active', isActive);
      tab.setAttribute('aria-selected', String(isActive));
    });

    // Update Trader Banner
    const nameEl = document.getElementById('trader-name');
    const subEl = document.getElementById('trader-subtitle');
    const tagEl = document.getElementById('trader-biome-tag');
    const descEl = document.getElementById('trader-desc');
    const tipEl = document.getElementById('trader-map-tip');

    if (nameEl) nameEl.textContent = trader.name;
    if (subEl) subEl.textContent = trader.title;
    if (tagEl) {
      tagEl.textContent = t(trader.biome.charAt(0).toUpperCase() + trader.biome.slice(1).replace('-', ' '));
    }
    if (descEl) descEl.textContent = trader.description;
    if (tipEl) tipEl.textContent = trader.mapIconTip;

    // Render Goods Grid
    const appraisal = calculateAppraisal(valuablesState);
    renderAppraisalSummary(appraisal);

    const grid = document.getElementById('goods-grid');
    if (!grid) return;
    grid.replaceChildren();

    for (const item of trader.items) {
      const unlocked = isUnlocked(item);
      const isAffordable = appraisal.total >= item.price;

      const card = el('article', 'good-card' + (isAffordable ? ' is-affordable' : '') + (!unlocked ? ' is-locked' : ''));
      card.id = `item-card-${item.id}`;
      card.dataset.itemId = item.id;

      // Header: image & meta
      const header = el('div', 'good-card-header');
      const thumbWrap = el('div', 'good-thumb-wrap');
      if (item.image) {
        const img = el('img', 'good-thumb');
        img.src = item.image;
        img.alt = item.name;
        img.loading = 'lazy';
        thumbWrap.append(img);
      } else {
        const placeholder = el('span', 'good-thumb-placeholder', '✦');
        thumbWrap.append(placeholder);
      }

      const meta = el('div', 'good-meta');
      const title = el('h3', 'good-name', item.name);
      const priceRow = el('div', 'good-price-row');
      const priceBadge = el('span', 'good-price-badge', `🪙 ${number(item.price)}`);
      priceRow.append(priceBadge);

      if (isAffordable) {
        const affBadge = el('span', 'badge-affordable', `✓ ${t('Affordable')}`);
        priceRow.append(affBadge);
      }

      meta.append(title, priceRow);
      header.append(thumbWrap, meta);
      card.append(header);

      // Description
      const desc = el('p', 'good-desc', item.description);
      card.append(desc);

      // Unlock banner if locked
      if (!unlocked && item.unlockedBy) {
        const unlockBanner = el('div', 'good-unlock-banner');
        const lockText = el('span', 'unlock-text', `🔒 ${item.unlockedBy.text || t('Locked')}`);
        const revealBtn = button(t('Reveal'), () => {
          revealedItems.add(item.id);
          renderTrader();
        }, 'btn-reveal');
        unlockBanner.append(lockText, revealBtn);
        card.append(unlockBanner);
      }

      // Actions footer
      const actions = el('div', 'good-actions');
      const compendiumLink = el('a', 'link-compendium', t('View in Items Compendium →'));
      compendiumLink.href = `/items/#item=${encodeURIComponent(item.id)}`;
      actions.append(compendiumLink);

      if (globalThis.VCShopping && typeof globalThis.VCShopping.add === 'function') {
        const inCart = globalThis.VCShopping.has ? globalThis.VCShopping.has(item.id) : false;
        const cartBtn = button(
          inCart ? `✓ ${t('Added to cart')}` : `+ ${t('Add to shopping cart')}`,
          () => {
            globalThis.VCShopping.add({
              id: item.id,
              name: item.name,
              price: item.price,
              source: trader.name,
            });
            showNotice('Added to cart');
            renderTrader();
          },
          'btn-cart' + (inCart ? ' is-added' : '')
        );
        actions.append(cartBtn);
      }

      card.append(actions);
      grid.append(card);
    }
  }

  function handleHashNavigation() {
    const { trader: hashTrader, item: hashItem } = parseHash();
    if (hashTrader && tradersData.some((t) => t.id === hashTrader)) {
      currentTraderId = hashTrader;
    } else if (hashItem) {
      const matchingTrader = tradersData.find((t) => t.items.some((it) => it.id === hashItem));
      if (matchingTrader) {
        currentTraderId = matchingTrader.id;
      }
    }

    renderTrader();

    if (hashItem) {
      const targetCard = document.getElementById(`item-card-${hashItem}`);
      if (targetCard) {
        if (typeof targetCard.scrollIntoView === 'function') {
          targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        targetCard.classList.add('highlight');
      }
    }
  }

  function render() {
    if (globalThis.VCI18n && typeof globalThis.VCI18n.apply === 'function') {
      globalThis.VCI18n.apply();
    }
    renderTrader();
  }

  function init() {
    if (globalThis.VCI18n && typeof globalThis.VCI18n.mountPicker === 'function') {
      globalThis.VCI18n.mountPicker('#language-picker');
      globalThis.VCI18n.onChange(() => {
        render();
      });
    }

    if (globalThis.VCProgress && typeof globalThis.VCProgress.onChange === 'function') {
      globalThis.VCProgress.onChange(() => {
        render();
      });
    }

    // Bind Appraisal Step Buttons
    const stepBtns = document.querySelectorAll('.btn-step');
    stepBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-step-target');
        const step = Number(btn.getAttribute('data-step')) || 0;
        if (target && target in valuablesState) {
          valuablesState[target] = Math.max(0, (valuablesState[target] || 0) + step);
          saveValuables(valuablesState);
          updateAppraisalInputs();
          renderAppraisalSummary(calculateAppraisal(valuablesState));
          renderTrader();
        }
      });
    });

    // Bind Appraisal Numeric Inputs
    const keys = ['coins', 'amber', 'amber-pearl', 'ruby', 'silver-necklace'];
    for (const key of keys) {
      const input = document.getElementById(`input-${key}`);
      if (input) {
        input.addEventListener('input', () => {
          const val = Math.max(0, parseInt(input.value, 10) || 0);
          valuablesState[key] = val;
          saveValuables(valuablesState);
          renderAppraisalSummary(calculateAppraisal(valuablesState));
          renderTrader();
        });
      }
    }

    // Bind Clear Button
    const clearBtn = document.getElementById('appraisal-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        valuablesState = { coins: 0, amber: 0, 'amber-pearl': 0, ruby: 0, 'silver-necklace': 0 };
        saveValuables(valuablesState);
        updateAppraisalInputs();
        renderAppraisalSummary(calculateAppraisal(valuablesState));
        renderTrader();
      });
    }

    // Bind Trader Tabs
    const tabs = document.querySelectorAll('.trader-tab');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const traderId = tab.getAttribute('data-trader');
        if (traderId && traderId !== currentTraderId) {
          currentTraderId = traderId;
          updateHash(currentTraderId);
          renderTrader();
        }
      });
    });

    window.addEventListener('hashchange', () => {
      handleHashNavigation();
    });

    window.addEventListener('storage', (event) => {
      if (event.key === STORAGE_KEY || event.key === null) {
        valuablesState = loadValuables();
        updateAppraisalInputs();
        render();
      }
    });

    updateAppraisalInputs();
    handleHashNavigation();
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
