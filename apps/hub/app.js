// Valheim Companion Hub application script

(function () {
  'use strict';

  function t(key, params) {
    return globalThis.VCI18n ? globalThis.VCI18n.t(key, params) : key;
  }

  const tn = (key, count, values) => VCI18n.tn(globalThis.VC_MESSAGES, key, count, values);

  function normalizeSearch(str) {
    return (str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function getOpenBiomes() {
    return new Set(VCProgress.revealedBiomes(VP_DATA.biomes));
  }

  function updateProgressSummary() {
    const link = document.getElementById('hub-progress-summary');
    if (!link) return;
    const state = VCProgress.get();
    const biomes = VP_DATA.biomes;
    const revealed = getOpenBiomes();
    const bosses = biomes.flatMap(biome => biome.bosses).filter(boss => state.defeated[boss.id]).length;
    const hasProgress = state.visited.length > 0 || Object.keys(state.defeated).length > 0
      || Object.keys(state.milestones).length > 0 || revealed.size > 1;
    link.hidden = !hasProgress;
    link.textContent = hasProgress ? tn('{count} / {total} biomes', revealed.size, { total: biomes.length })
      + ' · ' + tn('{count} bosses', bosses) : '';
  }

  const TYPE_CONFIG = [
    { type: 'creature', label: 'Creatures' },
    { type: 'weapon', label: 'Weapons' },
    { type: 'armor', label: 'Armor' },
    { type: 'material', label: 'Materials' },
    { type: 'food', label: 'Food & Mead' },
    { type: 'comfort', label: 'Furniture' },
    { type: 'expedition', label: 'Expedition' },
    { type: 'trader', label: 'Traders' },
  ];

  // VC-46: action icons in search results (tool names stay English).
  const SEARCH_TOOLS = {
    items: { label: 'Items Compendium', icon: '<path d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2zM5 18a2 2 0 0 1 2-2h11M9 8h6"/>' },
    smithy: { label: 'Smithy', icon: '<path d="M4 8h12l-2 4H9v3h4v3H6v-3h1v-3H6a2 2 0 0 1-2-2zM16 8l4-2v6l-4-2"/>' },
    provisions: { label: 'Provisions', icon: '<path d="M4 12h16a8 8 0 0 1-16 0zM9 8c0-2 2-2 2-4M14 8c0-2 2-2 2-4"/>' },
    comfort: { label: 'Comfort Planner', icon: '<path d="M3 18V7M3 13h18v5M21 13v-2a3 3 0 0 0-3-3h-7v5M6 10.5h2"/>' },
    traders: { label: 'Trader Ledger', icon: '<circle cx="12" cy="12" r="8"/><path d="M12 7v10M9.5 9.5h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4"/>' },
    bestiary: { label: 'Bestiary', icon: '<path d="M12 3a7 7 0 0 0-7 7v4l2 2v3h10v-3l2-2v-4a7 7 0 0 0-7-7zM9 11h.01M15 11h.01M10 19v-2M14 19v-2"/>' },
    expedition: { label: 'Expedition', icon: '<path d="M5 21V4h11l-2 4 2 4H5"/>' },
  };

  function searchActionLink(url) {
    const tool = SEARCH_TOOLS[url.split('/')[1]];
    if (!tool) return null;
    const link = document.createElement('a');
    link.className = 'hub-search-action';
    link.href = url;
    const tip = t('Open in {tool}', { tool: tool.label });
    link.setAttribute('aria-label', tip);
    link.dataset.tip = tip;
    link.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${tool.icon}</svg>`;
    return link;
  }

  function initSearch() {
    const input = document.getElementById('hub-search-input');
    const resultsContainer = document.getElementById('hub-search-results');
    const clearBtn = document.getElementById('hub-search-clear');
    if (!input || !resultsContainer) return;

    let selectedIndex = -1;

    function getIndex() {
      return [...(Array.isArray(globalThis.VC_SEARCH_INDEX) ? globalThis.VC_SEARCH_INDEX : []),
        ...(Array.isArray(globalThis.VC_EXPEDITION_SEARCH_INDEX) ? globalThis.VC_EXPEDITION_SEARCH_INDEX : [])];
    }

    function hideResults() {
      resultsContainer.hidden = true;
      resultsContainer.replaceChildren();
      selectedIndex = -1;
    }

    function renderResults(query) {
      const normQuery = normalizeSearch(query);
      if (!normQuery) {
        hideResults();
        if (clearBtn) clearBtn.hidden = true;
        return;
      }

      if (clearBtn) clearBtn.hidden = false;

      const index = getIndex();
      const openBiomes = getOpenBiomes();
      const matches = [];

      for (const item of index) {
        const normName = normalizeSearch(item.name);
        let matched = normName.includes(normQuery);

        if (!matched && item.names) {
          for (const localName of Object.values(item.names)) {
            if (normalizeSearch(localName).includes(normQuery)) {
              matched = true;
              break;
            }
          }
        }

        if (matched) {
          matches.push(item);
        }
      }

      resultsContainer.replaceChildren();
      selectedIndex = -1;

      if (matches.length === 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'hub-search-empty';
        emptyDiv.textContent = t('No results found for "{query}"', { query });
        resultsContainer.appendChild(emptyDiv);
        resultsContainer.hidden = false;
        return;
      }

      let lockedCount = 0;
      const groups = {};

      for (const item of matches) {
        const requirements = item.requiredBiomes || [];
        const conditionsLocked = requirements.length && (item.conditionMode === 'any'
          ? !requirements.some(id => openBiomes.has(id)) : requirements.some(id => !openBiomes.has(id)));
        const isLocked = item.biome && !openBiomes.has(item.biome) || conditionsLocked;
        if (isLocked) {
          lockedCount++;
        } else {
          if (!groups[item.type]) groups[item.type] = [];
          if (groups[item.type].length < 8) {
            groups[item.type].push(item);
          }
        }
      }

      let visibleCount = 0;

      for (const cfg of TYPE_CONFIG) {
        const items = groups[cfg.type];
        if (!items || items.length === 0) continue;

        const groupDiv = document.createElement('div');
        groupDiv.className = 'hub-search-group';
        groupDiv.dataset.type = cfg.type;

        const titleDiv = document.createElement('div');
        titleDiv.className = 'hub-search-group-title';
        titleDiv.textContent = t(cfg.label);
        groupDiv.appendChild(titleDiv);

        const itemsDiv = document.createElement('div');
        itemsDiv.className = 'hub-search-group-items';

        for (const item of items) {
          visibleCount++;
          const row = document.createElement('div');
          row.className = 'hub-search-item';
          row.setAttribute('role', 'option');
          const a = document.createElement('a');
          a.className = 'hub-search-item-main';
          a.href = item.url;

          if (item.image) {
            const img = document.createElement('img');
            img.className = 'hub-search-thumb';
            img.src = item.image;
            img.alt = '';
            img.loading = 'lazy';
            a.appendChild(img);
          } else {
            const placeholder = document.createElement('div');
            placeholder.className = 'hub-search-thumb-placeholder';
            placeholder.textContent = '⚔';
            a.appendChild(placeholder);
          }

          const infoDiv = document.createElement('div');
          infoDiv.className = 'hub-search-item-info';

          const nameSpan = document.createElement('span');
          nameSpan.className = 'hub-search-item-name';
          nameSpan.textContent = VCI18n.name(item);
          infoDiv.appendChild(nameSpan);
          if (item.section) {
            const tool = document.createElement('span');
            tool.className = 'hub-search-group-title'; tool.textContent = item.section; infoDiv.appendChild(tool);
          }

          a.appendChild(infoDiv);
          row.appendChild(a);
          const actions = document.createElement('div');
          actions.className = 'hub-search-actions';
          for (const url of item.links || [item.url]) {
            const link = searchActionLink(url);
            if (link) actions.appendChild(link);
          }
          row.appendChild(actions);
          row.addEventListener('click', (event) => {
            if (!event.target.closest('a')) a.click();
          });
          itemsDiv.appendChild(row);
        }

        groupDiv.appendChild(itemsDiv);
        resultsContainer.appendChild(groupDiv);
      }

      if (lockedCount > 0) {
        const lockedDiv = document.createElement('div');
        lockedDiv.className = 'hub-search-locked-row';
        lockedDiv.setAttribute('role', 'status');

        const lockIcon = document.createElement('span');
        lockIcon.className = 'hub-search-locked-icon';
        lockIcon.setAttribute('aria-hidden', 'true');
        lockIcon.textContent = '🔒';
        lockedDiv.appendChild(lockIcon);

        const lockText = document.createElement('span');
        lockText.className = 'hub-search-locked-text';
        lockText.textContent = lockedCount === 1
          ? t('1 more result in locked biomes')
          : tn('{count} more results in locked biomes', lockedCount);
        lockedDiv.appendChild(lockText);

        resultsContainer.appendChild(lockedDiv);
      }

      if (visibleCount === 0 && lockedCount === 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'hub-search-empty';
        emptyDiv.textContent = t('No results found for "{query}"', { query });
        resultsContainer.appendChild(emptyDiv);
      }

      resultsContainer.hidden = false;
    }

    function updateActiveItem(items) {
      items.forEach((item, idx) => {
        const isActive = idx === selectedIndex;
        item.classList.toggle('active', isActive);
        if (isActive) {
          item.scrollIntoView({ block: 'nearest' });
        }
      });
    }

    input.addEventListener('input', () => {
      renderResults(input.value);
    });

    input.addEventListener('focus', () => {
      if (input.value.trim()) {
        renderResults(input.value);
      }
    });

    input.addEventListener('keydown', (e) => {
      if (resultsContainer.hidden) {
        if (e.key === 'ArrowDown' && input.value.trim()) {
          renderResults(input.value);
          e.preventDefault();
        }
        return;
      }

      const items = Array.from(resultsContainer.querySelectorAll('.hub-search-item'));
      if (items.length === 0) {
        if (e.key === 'Escape') hideResults();
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = (selectedIndex + 1) % items.length;
        updateActiveItem(items);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = selectedIndex <= 0 ? items.length - 1 : selectedIndex - 1;
        updateActiveItem(items);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const target = selectedIndex >= 0 ? items[selectedIndex] : items[0];
        if (target) {
          (target.querySelector('.hub-search-item-main') || target).click();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        hideResults();
      }
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        input.value = '';
        hideResults();
        clearBtn.hidden = true;
        input.focus();
      });
    }

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.hub-search-container')) {
        hideResults();
      }
    });

    VCProgress.onChange(() => {
      if (!resultsContainer.hidden && input.value.trim()) {
        renderResults(input.value);
      }
    });

    if (globalThis.VCI18n?.onChange) {
      globalThis.VCI18n.onChange(() => {
        if (!resultsContainer.hidden && input.value.trim()) {
          renderResults(input.value);
        }
      });
    }
  }

  function init() {
    if (typeof globalThis.VCI18n !== 'undefined') {
      const pickerContainer = document.getElementById('lang-picker-container');
      if (pickerContainer) {
        globalThis.VCI18n.mountPicker(pickerContainer);
      }

      globalThis.VCI18n.apply();

      globalThis.VCI18n.onChange(() => {
        globalThis.VCI18n.apply();
      });
    }

    initSearch();
    updateProgressSummary();
    VCProgress.onChange(updateProgressSummary);
    VCI18n.onChange(updateProgressSummary);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
