// Valheim Companion Hub application script

(function () {
  'use strict';

  function t(key, params) {
    return globalThis.VCI18n ? globalThis.VCI18n.t(key, params) : key;
  }

  function normalizeSearch(str) {
    return (str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function getOpenBiomes() {
    if (typeof globalThis.VCProgress?.revealedBiomes === 'function') {
      try {
        const biomes = globalThis.VCProgress.revealedBiomes();
        if (biomes && biomes.size) return biomes;
      } catch {}
    }
    try {
      const raw = localStorage.getItem('vc.openBiomes');
      return new Set(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set();
    }
  }

  const TYPE_CONFIG = [
    { type: 'creature', label: 'Creatures' },
    { type: 'weapon', label: 'Weapons' },
    { type: 'armor', label: 'Armor' },
    { type: 'material', label: 'Materials' },
    { type: 'food', label: 'Food & Mead' },
  ];

  function initSearch() {
    const input = document.getElementById('hub-search-input');
    const resultsContainer = document.getElementById('hub-search-results');
    const clearBtn = document.getElementById('hub-search-clear');
    if (!input || !resultsContainer) return;

    let selectedIndex = -1;

    function getIndex() {
      return Array.isArray(globalThis.VC_SEARCH_INDEX) ? globalThis.VC_SEARCH_INDEX : [];
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
        const isLocked = item.biome && !openBiomes.has(item.biome);
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
          const a = document.createElement('a');
          a.className = 'hub-search-item';
          a.href = item.url;
          a.setAttribute('role', 'option');

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
          nameSpan.textContent = item.name;
          infoDiv.appendChild(nameSpan);

          a.appendChild(infoDiv);
          itemsDiv.appendChild(a);
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
          : t('{count} more results in locked biomes', { count: lockedCount });
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
          target.click();
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

    window.addEventListener('storage', (e) => {
      if (e.key === 'vc.openBiomes' || e.key === 'vc.progress') {
        if (!resultsContainer.hidden && input.value.trim()) {
          renderResults(input.value);
        }
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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
