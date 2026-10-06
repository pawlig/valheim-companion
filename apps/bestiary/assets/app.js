'use strict';

(function () {
  /**
   * Helper: create a DOM element safely without innerHTML
   * @param {string} tag
   * @param {string} [className]
   * @param {string} [text]
   * @returns {HTMLElement}
   */
  function el(tag, className, text) {
    const element = document.createElement(tag);
    if (className) {
      element.className = className;
    }
    if (text !== undefined && text !== null) {
      element.textContent = text;
    }
    return element;
  }

  /**
   * Capitalize string
   * @param {string} str
   * @returns {string}
   */
  function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Format star symbol
   * @param {number} star
   * @returns {string}
   */
  function getStarSymbol(star) {
    if (star === 0) return '☆';
    if (star === 1) return '★';
    if (star === 2) return '★★';
    if (star === 3) return '★★★';
    return star + '★';
  }

  /**
   * Safe image creator with lazy loading and placeholder fallback
   * @param {string|null} src
   * @param {string} alt
   * @param {string} className
   * @param {string} [placeholderChar]
   * @returns {HTMLElement}
   */
  function createImage(src, alt, className, placeholderChar) {
    if (!src) {
      const ph = el('div', className + ' image-placeholder', placeholderChar || (alt ? alt.charAt(0) : '?'));
      ph.setAttribute('aria-label', alt || 'Image');
      return ph;
    }
    const img = document.createElement('img');
    img.className = className;
    img.src = src;
    img.alt = alt || '';
    img.loading = 'lazy';
    img.addEventListener('error', function () {
      const parent = img.parentElement;
      if (parent) {
        const ph = el('div', className + ' image-placeholder', placeholderChar || (alt ? alt.charAt(0) : '?'));
        ph.setAttribute('aria-label', alt || 'Image');
        parent.replaceChild(ph, img);
      }
    });
    return img;
  }

  /**
   * Get modifier class for tier value
   * @param {number} val
   * @returns {string}
   */
  function getModClass(val) {
    if (val >= 2) return 'mod-chip-2';
    if (val >= 1.5) return 'mod-chip-1_5';
    if (val >= 1.25) return 'mod-chip-1_25';
    if (val === 1) return 'mod-chip-1';
    if (val >= 0.75) return 'mod-chip-0_75';
    if (val >= 0.5) return 'mod-chip-0_5';
    if (val >= 0.25) return 'mod-chip-0_25';
    return 'mod-chip-0';
  }

  /**
   * Convert modifier string/number to multiplier number
   * @param {string|number} tier
   * @param {object} modTiers
   * @returns {number}
   */
  function parseModTier(tier, modTiers) {
    if (typeof tier === 'number') return tier;
    if (modTiers && tier in modTiers) return modTiers[tier];
    return 1;
  }

  /**
   * LocalStorage helpers with try/catch
   */
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
    } catch {
      // LocalStorage unavailable, ignore
    }
  }

  function getStoredArmoryAll() {
    try {
      return localStorage.getItem('vc.armoryAll') === 'true';
    } catch {
      return false;
    }
  }

  function setStoredArmoryAll(val) {
    try {
      localStorage.setItem('vc.armoryAll', String(val));
    } catch {
      // LocalStorage unavailable, ignore
    }
  }

  // ---------------------------------------------------------------------------
  // Player character settings (VC-5)
  // ---------------------------------------------------------------------------

  const PLAYER_STORAGE_KEY = 'vc.player';

  const DIFFICULTY_OPTIONS = [
    { id: 'veryeasy', label: 'Very easy (125 %)', short: 'Very easy' },
    { id: 'easy', label: 'Easy (110 %)', short: 'Easy' },
    { id: 'normal', label: 'Normal (100 %)', short: 'Normal' },
    { id: 'hard', label: 'Hard (85 %)', short: 'Hard' },
    { id: 'veryhard', label: 'Very hard (70 %)', short: 'Very hard' },
  ];

  const SET_LABELS = {
    root: 'Root set (+15 Bows)',
    lox: 'Lox fur set (+15 Bows)',
    fenris: 'Fenris set (+15 Fists)',
    bear: 'Bear set (+10 % Slash/Chop)',
    vanguard: 'Vanguard set (+10 % Pierce)',
  };

  function clampInt(val, min, max, fallback) {
    const n = Math.round(Number(val));
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, n));
  }

  function defaultPlayer() {
    return JSON.parse(JSON.stringify(window.VCRank.DEFAULT_PLAYER));
  }

  /**
   * Replace unknown or corrupted values with DEFAULT_PLAYER values
   * @param {object} raw
   * @returns {object}
   */
  function sanitizePlayer(raw) {
    const player = defaultPlayer();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return player;

    if (raw.skills && typeof raw.skills === 'object' && !Array.isArray(raw.skills)) {
      for (const s of window.VCRank.SKILLS) {
        const v = raw.skills[s.id];
        if (v !== undefined && v !== null && Number.isFinite(Number(v))) {
          player.skills[s.id] = clampInt(v, 0, 100, 50);
        }
      }
    }

    if (
      typeof raw.difficulty === 'string' &&
      Object.prototype.hasOwnProperty.call(window.VCRank.DIFFICULTY, raw.difficulty)
    ) {
      player.difficulty = raw.difficulty;
    }

    if (raw.players !== undefined && raw.players !== null && Number.isFinite(Number(raw.players))) {
      player.players = clampInt(raw.players, 1, 5, 1);
    }

    if (raw.quality === 'max') {
      player.quality = 'max';
    } else if (raw.quality !== undefined && raw.quality !== null && Number.isFinite(Number(raw.quality))) {
      player.quality = clampInt(raw.quality, 1, 4, 4);
    }

    if (Array.isArray(raw.sets)) {
      const valid = new Set(Object.keys(window.VCRank.SET_BONUSES));
      player.sets = [...new Set(raw.sets.filter((s) => typeof s === 'string' && valid.has(s)))];
    }

    player.sneak = raw.sneak === true;
    player.staggered = raw.staggered === true;
    player.rankBy = raw.rankBy === 'hit' ? 'hit' : 'dps';

    return player;
  }

  /**
   * Load player state from localStorage; firstVisit is true when the key
   * has never been written (panel starts expanded in that case)
   */
  function loadPlayerState() {
    try {
      const raw = localStorage.getItem(PLAYER_STORAGE_KEY);
      if (raw === null) {
        return { player: defaultPlayer(), firstVisit: true };
      }
      return { player: sanitizePlayer(JSON.parse(raw)), firstVisit: false };
    } catch {
      return { player: defaultPlayer(), firstVisit: false };
    }
  }

  function savePlayerState(player) {
    try {
      localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(player));
    } catch {
      // LocalStorage unavailable, ignore
    }
  }

  /**
   * Sum of active armor set skill bonuses for a skill id
   * @param {object} player
   * @param {string} skillId
   * @returns {number}
   */
  function skillBonusSum(player, skillId) {
    let sum = 0;
    for (const setId of player.sets) {
      const bonus = window.VCRank.SET_BONUSES[setId];
      if (bonus && bonus.type === 'skill' && bonus.skill === skillId) {
        sum += bonus.amount;
      }
    }
    return sum;
  }

  const loadedPlayerState = window.VCRank ? loadPlayerState() : null;
  const playerState = loadedPlayerState ? loadedPlayerState.player : null;
  const playerFirstVisit = loadedPlayerState ? loadedPlayerState.firstVisit : false;

  let cardRefreshTimer = null;
  let armoryController = null;

  /**
   * Debounced refresh of everything already rendered that depends on the
   * player character settings (creature cards, biome weapon tables)
   */
  function scheduleCardRefresh() {
    if (cardRefreshTimer) {
      clearTimeout(cardRefreshTimer);
    }
    cardRefreshTimer = setTimeout(() => {
      cardRefreshTimer = null;
      refreshRenderedCards();
    }, 150);
  }

  function refreshRenderedCards() {
    document.querySelectorAll('.creature-card').forEach((cardEl) => {
      if (typeof cardEl.refreshForPlayer === 'function') {
        cardEl.refreshForPlayer();
      }
    });
    document.querySelectorAll('.biome-weapons-details').forEach((sectionEl) => {
      if (typeof sectionEl.refreshForPlayer === 'function') {
        sectionEl.refreshForPlayer();
      }
    });
    if (armoryController && typeof armoryController.refresh === 'function') {
      armoryController.refresh();
    }
  }

  /**
   * Build the "Your character" settings panel
   * @param {HTMLElement} container
   * @param {boolean} [openInitial] Expand the panel on first visit
   */
  function buildCharacterPanel(container, openInitial) {
    if (!container || !window.VCRank || !playerState) return;
    container.textContent = '';

    const player = playerState;
    const skillInputs = {}; // skill id -> { range, number, badge }
    const setCheckboxes = {}; // set id -> checkbox
    let difficultySelect = null;
    let playersSelect = null;
    let qualitySelect = null;
    let sneakCheckbox = null;
    let staggeredCheckbox = null;
    let summaryEl = null;
    let updateRankButtons = null;

    const updateCharacterSummary = () => {
      const skills = window.VCRank.SKILLS;
      const avg = Math.round(skills.reduce((acc, s) => acc + player.skills[s.id], 0) / skills.length);
      const diffLabel = DIFFICULTY_OPTIONS.find((d) => d.id === player.difficulty);
      const playersStr = player.players + (player.players === 1 ? ' player' : ' players');
      const qualityStr = player.quality === 'max' ? 'Max quality' : 'Quality ' + player.quality;
      const rankByStr = player.rankBy === 'hit' ? 'Per hit' : 'DPS';
      summaryEl.textContent =
        'Your character · avg skill ' + avg +
        ' · ' + (diffLabel ? diffLabel.short : 'Normal') +
        ' · ' + playersStr +
        ' · ' + qualityStr +
        ' · ' + rankByStr;
    };

    const updateSkillBadges = () => {
      for (const s of window.VCRank.SKILLS) {
        const inputs = skillInputs[s.id];
        if (!inputs) continue;
        const base = player.skills[s.id];
        const effective = window.VCRank.effectiveSkill(player, s.id);
        if (effective !== base) {
          inputs.badge.textContent = '+' + skillBonusSum(player, s.id) + ' → ' + effective;
        } else {
          inputs.badge.textContent = '';
        }
      }
    };

    const onPlayerChange = () => {
      savePlayerState(player);
      updateCharacterSummary();
      updateSkillBadges();
      scheduleCardRefresh();
    };

    const syncSkillInputs = () => {
      for (const s of window.VCRank.SKILLS) {
        const inputs = skillInputs[s.id];
        const v = String(player.skills[s.id]);
        inputs.range.value = v;
        inputs.number.value = v;
      }
    };

    const syncAllInputs = () => {
      syncSkillInputs();
      for (const setId of Object.keys(setCheckboxes)) {
        setCheckboxes[setId].checked = player.sets.includes(setId);
      }
      if (difficultySelect) difficultySelect.value = player.difficulty;
      if (playersSelect) playersSelect.value = String(player.players);
      if (qualitySelect) qualitySelect.value = String(player.quality);
      if (sneakCheckbox) sneakCheckbox.checked = player.sneak;
      if (staggeredCheckbox) staggeredCheckbox.checked = player.staggered;
      if (updateRankButtons) updateRankButtons();
    };

    const details = el('details', 'character-panel');
    if (openInitial) {
      details.setAttribute('open', '');
    }
    summaryEl = el('summary', 'character-summary');
    details.appendChild(summaryEl);

    const body = el('div', 'character-body');

    // Weapon skills
    const skillsBlock = el('div', 'character-block');
    skillsBlock.appendChild(el('span', 'character-block-title', 'Weapon skills'));

    const setAllRow = el('div', 'set-all-row');
    setAllRow.appendChild(el('span', 'set-all-label', 'Set all'));
    const setAllRange = document.createElement('input');
    setAllRange.type = 'range';
    setAllRange.min = '0';
    setAllRange.max = '100';
    setAllRange.value = '50';
    setAllRange.className = 'set-all-range';
    setAllRange.setAttribute('aria-label', 'Set all skills value');
    const setAllVal = el('span', 'set-all-val', '50');
    setAllRange.addEventListener('input', () => {
      setAllVal.textContent = setAllRange.value;
    });
    const applyAllBtn = el('button', 'action-btn', 'Apply to all');
    applyAllBtn.type = 'button';
    applyAllBtn.addEventListener('click', () => {
      const v = clampInt(setAllRange.value, 0, 100, 50);
      for (const s of window.VCRank.SKILLS) {
        player.skills[s.id] = v;
      }
      syncSkillInputs();
      onPlayerChange();
    });
    setAllRow.appendChild(setAllRange);
    setAllRow.appendChild(setAllVal);
    setAllRow.appendChild(applyAllBtn);
    skillsBlock.appendChild(setAllRow);

    const skillsGrid = el('div', 'skills-grid');
    for (const s of window.VCRank.SKILLS) {
      const row = el('div', 'skill-row');
      row.appendChild(el('span', 'skill-name', s.name));

      const range = document.createElement('input');
      range.type = 'range';
      range.min = '0';
      range.max = '100';
      range.value = String(player.skills[s.id]);
      range.className = 'skill-range';
      range.id = 'skill-range-' + s.id;
      range.setAttribute('aria-label', s.name + ' skill');

      const numBox = el('div', 'skill-number-box');
      const number = document.createElement('input');
      number.type = 'number';
      number.min = '0';
      number.max = '100';
      number.value = String(player.skills[s.id]);
      number.className = 'skill-number';
      number.id = 'skill-number-' + s.id;
      number.setAttribute('aria-label', s.name + ' skill level');
      const badge = el('span', 'skill-effective-badge');
      numBox.appendChild(number);
      numBox.appendChild(badge);

      range.addEventListener('input', () => {
        number.value = range.value;
        player.skills[s.id] = clampInt(range.value, 0, 100, player.skills[s.id]);
        onPlayerChange();
      });
      number.addEventListener('input', () => {
        const v = Number(number.value);
        if (Number.isFinite(v)) {
          const c = clampInt(v, 0, 100, player.skills[s.id]);
          player.skills[s.id] = c;
          range.value = String(c);
          onPlayerChange();
        }
      });
      number.addEventListener('change', () => {
        number.value = String(player.skills[s.id]);
      });

      row.appendChild(range);
      row.appendChild(numBox);
      skillsGrid.appendChild(row);
      skillInputs[s.id] = { range, number, badge };
    }
    skillsBlock.appendChild(skillsGrid);
    body.appendChild(skillsBlock);

    // Armor set bonuses
    const setBlock = el('div', 'character-block');
    setBlock.appendChild(el('span', 'character-block-title', 'Armor set bonuses'));
    const setBoxes = el('div', 'character-checkboxes');
    for (const setId of Object.keys(window.VCRank.SET_BONUSES)) {
      const label = el('label', 'char-checkbox-label');
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = player.sets.includes(setId);
      cb.addEventListener('change', () => {
        if (cb.checked) {
          if (!player.sets.includes(setId)) player.sets.push(setId);
        } else {
          player.sets = player.sets.filter((x) => x !== setId);
        }
        onPlayerChange();
      });
      label.appendChild(cb);
      label.appendChild(document.createTextNode(SET_LABELS[setId] || setId));
      setBoxes.appendChild(label);
      setCheckboxes[setId] = cb;
    }
    setBlock.appendChild(setBoxes);
    body.appendChild(setBlock);

    // World (difficulty + players)
    const worldBlock = el('div', 'character-block');
    worldBlock.appendChild(el('span', 'character-block-title', 'World'));
    const worldRow = el('div', 'character-fields-row');

    const diffGroup = el('div', 'char-field-group');
    diffGroup.appendChild(el('span', 'char-field-label', 'Combat difficulty'));
    difficultySelect = document.createElement('select');
    difficultySelect.className = 'char-select';
    difficultySelect.setAttribute('aria-label', 'Combat difficulty');
    DIFFICULTY_OPTIONS.forEach((opt) => {
      const option = el('option', null, opt.label);
      option.value = opt.id;
      difficultySelect.appendChild(option);
    });
    difficultySelect.value = player.difficulty;
    difficultySelect.addEventListener('change', () => {
      player.difficulty = difficultySelect.value;
      onPlayerChange();
    });
    diffGroup.appendChild(difficultySelect);
    worldRow.appendChild(diffGroup);

    const playersGroup = el('div', 'char-field-group');
    playersGroup.appendChild(el('span', 'char-field-label', 'Players nearby'));
    playersSelect = document.createElement('select');
    playersSelect.className = 'char-select';
    playersSelect.setAttribute('aria-label', 'Players nearby');
    for (let n = 1; n <= 5; n++) {
      const option = el('option', null, String(n));
      option.value = String(n);
      playersSelect.appendChild(option);
    }
    playersSelect.value = String(player.players);
    playersSelect.addEventListener('change', () => {
      player.players = clampInt(playersSelect.value, 1, 5, 1);
      onPlayerChange();
    });
    playersGroup.appendChild(playersSelect);
    playersGroup.appendChild(el('span', 'char-field-hint', '+30 % enemy HP per extra player'));
    worldRow.appendChild(playersGroup);

    worldBlock.appendChild(worldRow);
    body.appendChild(worldBlock);

    // Weapons (upgrade level)
    const weaponsBlock = el('div', 'character-block');
    weaponsBlock.appendChild(el('span', 'character-block-title', 'Weapons'));
    const weaponsRow = el('div', 'character-fields-row');
    const qualityGroup = el('div', 'char-field-group');
    qualityGroup.appendChild(el('span', 'char-field-label', 'Upgrade level'));
    qualitySelect = document.createElement('select');
    qualitySelect.className = 'char-select';
    qualitySelect.setAttribute('aria-label', 'Upgrade level');
    const maxOption = el('option', null, 'Max');
    maxOption.value = 'max';
    qualitySelect.appendChild(maxOption);
    for (let q = 1; q <= 4; q++) {
      const option = el('option', null, String(q));
      option.value = String(q);
      qualitySelect.appendChild(option);
    }
    qualitySelect.value = String(player.quality);
    qualitySelect.addEventListener('change', () => {
      const v = qualitySelect.value;
      player.quality = v === 'max' ? 'max' : clampInt(v, 1, 4, 4);
      onPlayerChange();
    });
    qualityGroup.appendChild(qualitySelect);
    weaponsRow.appendChild(qualityGroup);
    weaponsBlock.appendChild(weaponsRow);
    body.appendChild(weaponsBlock);

    // Situational
    const sitBlock = el('div', 'character-block');
    sitBlock.appendChild(el('span', 'character-block-title', 'Situational'));
    const sitBoxes = el('div', 'character-checkboxes');

    const sneakLabel = el('label', 'char-checkbox-label');
    sneakCheckbox = document.createElement('input');
    sneakCheckbox.type = 'checkbox';
    sneakCheckbox.checked = player.sneak;
    sneakCheckbox.addEventListener('change', () => {
      player.sneak = sneakCheckbox.checked;
      onPlayerChange();
    });
    sneakLabel.appendChild(sneakCheckbox);
    sneakLabel.appendChild(document.createTextNode('Sneak attack (backstab)'));
    sitBoxes.appendChild(sneakLabel);

    const staggeredLabel = el('label', 'char-checkbox-label');
    staggeredCheckbox = document.createElement('input');
    staggeredCheckbox.type = 'checkbox';
    staggeredCheckbox.checked = player.staggered;
    staggeredCheckbox.addEventListener('change', () => {
      player.staggered = staggeredCheckbox.checked;
      onPlayerChange();
    });
    staggeredLabel.appendChild(staggeredCheckbox);
    staggeredLabel.appendChild(document.createTextNode('Enemy staggered (×2)'));
    sitBoxes.appendChild(staggeredLabel);

    sitBlock.appendChild(sitBoxes);
    body.appendChild(sitBlock);

    // Actions
    const actions = el('div', 'character-actions');
    const resetBtn = el('button', 'action-btn', 'Reset to defaults');
    resetBtn.type = 'button';
    resetBtn.addEventListener('click', () => {
      const fresh = defaultPlayer();
      for (const s of window.VCRank.SKILLS) {
        player.skills[s.id] = fresh.skills[s.id];
      }
      player.difficulty = fresh.difficulty;
      player.players = fresh.players;
      player.quality = fresh.quality;
      player.sets = [...fresh.sets];
      player.sneak = fresh.sneak;
      player.staggered = fresh.staggered;
      syncAllInputs();
      onPlayerChange();
    });
    actions.appendChild(resetBtn);
    body.appendChild(actions);

    details.appendChild(body);
    container.appendChild(details);

    updateCharacterSummary();
    updateSkillBadges();
  }

  /**
   * Open weapon modal dialog with full weapon statistics
   * @param {object} weapon
   * @param {object} data
   */
  function openWeaponModal(weapon, data) {
    const dialog = document.getElementById('weapon-modal');
    const container = document.getElementById('weapon-modal-content');
    if (!dialog || !container || !weapon) return;

    container.textContent = '';

    // Header (icon + title + close button)
    const header = el('div', 'modal-header');
    const icon = createImage(weapon.image, weapon.name, 'modal-icon', weapon.name.charAt(0));
    header.appendChild(icon);

    const titleBox = el('div', 'modal-title-box');
    titleBox.appendChild(el('h3', 'modal-title', weapon.name));

    const typeStr = [weapon.type || capitalize(weapon.category), weapon.hands].filter(Boolean).join(' · ');
    titleBox.appendChild(el('div', 'modal-subtitle', typeStr));
    header.appendChild(titleBox);

    const closeBtn = el('button', 'modal-close-btn', '✕');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Close dialog');
    closeBtn.addEventListener('click', () => dialog.close());
    header.appendChild(closeBtn);

    container.appendChild(header);

    // Grid of stats
    const statsGrid = el('div', 'modal-grid');

    // Tier & Biome
    const biomeObj = data.biomes.find(b => b.id === weapon.biome);
    const biomeName = biomeObj ? biomeObj.name : (weapon.biome ? capitalize(weapon.biome) : 'Unknown');
    const tierBiome = el('div', 'modal-field');
    tierBiome.appendChild(el('span', 'modal-field-title', 'Tier & Biome'));
    tierBiome.appendChild(el('span', 'modal-field-val', (weapon.tier ? 'Tier ' + weapon.tier : 'Special') + ' · ' + biomeName));
    statsGrid.appendChild(tierBiome);

    // Max Quality
    const qualityField = el('div', 'modal-field');
    qualityField.appendChild(el('span', 'modal-field-title', 'Max Quality'));
    qualityField.appendChild(el('span', 'modal-field-val', weapon.maxQuality ? 'Level ' + weapon.maxQuality : 'Level 1'));
    statsGrid.appendChild(qualityField);

    // Stamina
    const staminaField = el('div', 'modal-field');
    staminaField.appendChild(el('span', 'modal-field-title', 'Stamina Usage'));
    staminaField.appendChild(el('span', 'modal-field-val', weapon.stamina ? String(weapon.stamina) : '—'));
    statsGrid.appendChild(staminaField);

    // Knockback
    const knockbackField = el('div', 'modal-field');
    knockbackField.appendChild(el('span', 'modal-field-title', 'Knockback'));
    knockbackField.appendChild(el('span', 'modal-field-val', weapon.knockback !== null && weapon.knockback !== undefined ? String(weapon.knockback) : '—'));
    statsGrid.appendChild(knockbackField);

    // Crafting Station
    if (weapon.station) {
      const stationField = el('div', 'modal-field');
      stationField.appendChild(el('span', 'modal-field-title', 'Crafting Station'));
      const lvlStr = weapon.stationLevel ? ' (Lvl ' + weapon.stationLevel + ')' : '';
      stationField.appendChild(el('span', 'modal-field-val', weapon.station + lvlStr));
      statsGrid.appendChild(stationField);
    }

    container.appendChild(statsGrid);

    // Damage Max Breakdown
    const dmgSection = el('div', 'modal-field');
    dmgSection.appendChild(el('span', 'modal-field-title', 'Max Quality Damage'));
    const dmgChips = el('div', 'attack-damages');
    const dmgEntries = weapon.damageMax ? Object.entries(weapon.damageMax) : [];
    if (dmgEntries.length > 0) {
      dmgEntries.forEach(([type, val]) => {
        if (val > 0) {
          dmgChips.appendChild(el('span', 'dmg-chip dmg-chip-' + type, val + ' ' + capitalize(type)));
        }
      });
      dmgSection.appendChild(dmgChips);
    } else {
      dmgSection.appendChild(el('span', 'modal-field-val', '—'));
    }
    container.appendChild(dmgSection);

    // Materials Required
    if (weapon.materials && weapon.materials.length > 0) {
      const matSection = el('div', 'modal-field');
      matSection.appendChild(el('span', 'modal-field-title', 'Crafting Materials (Base)'));
      const matText = weapon.materials.map(m => m.name + (m.amount ? ' ×' + m.amount : '')).join(', ');
      matSection.appendChild(el('span', 'modal-field-val', matText));
      container.appendChild(matSection);
    }

    // Description
    if (weapon.description) {
      const descField = el('div', 'modal-field');
      descField.appendChild(el('span', 'modal-field-title', 'Description'));
      descField.appendChild(el('p', 'modal-field-val', weapon.description));
      container.appendChild(descField);
    }

    // Wiki Link
    if (weapon.wiki) {
      const wikiLink = el('a', 'wiki-link', 'Open on Valheim Wiki ↗');
      wikiLink.href = weapon.wiki;
      wikiLink.target = '_blank';
      wikiLink.rel = 'noopener noreferrer';
      container.appendChild(wikiLink);
    }

    // Close on backdrop click
    const onDialogClick = function (e) {
      if (e.target === dialog) {
        dialog.close();
        dialog.removeEventListener('click', onDialogClick);
      }
    };
    dialog.addEventListener('click', onDialogClick);

    dialog.showModal();
  }

  /**
   * Filter recommendation weapon notes:
   * ×0 Chop and ×0 Pickaxe are hidden.
   * ×0 Spirit is shown only if spirit is explicitly defined on creature.modifiers.
   * @param {Array<string>} [notes]
   * @param {object} [creature]
   * @returns {Array<string>}
   */
  function filterWeaponNotes(notes, creature) {
    if (!notes || notes.length === 0) return [];
    return notes.filter(n => {
      // ×0 Chop and ×0 Pickaxe are never shown
      if (n === '×0 Chop' || n === '×0 Pickaxe') return false;
      if (n.startsWith('×0') && (n.includes('Chop') || n.includes('Pickaxe'))) return false;

      // spirit ×0 only if spirit is explicitly defined in creature.modifiers
      if (n.startsWith('×0') && n.includes('Spirit')) {
        const hasExplicitSpirit = creature && creature.modifiers && creature.modifiers.spirit !== undefined;
        if (!hasExplicitSpirit) return false;
      }

      return true;
    });
  }

  /**
   * Helper: create a button representing a recommended weapon row
   * @param {string} weaponId
   * @param {number|null} score
   * @param {Array<string>} [notes]
   * @param {string|null} [sublabel]
   * @param {object} data
   * @param {{min?: number, max?: number, hits?: number|null}} [hitInfo]
   * @returns {HTMLElement}
   */
  function createWeaponRowBtn(weaponId, score, notes, sublabel, data, hitInfo) {
    const weapon = data.weapons[weaponId];
    const btn = el('button', 'weapon-btn');
    btn.type = 'button';

    const left = el('div', 'weapon-btn-left');
    const iconSrc = weapon ? weapon.image : null;
    const weaponName = weapon ? weapon.name : weaponId;
    left.appendChild(createImage(iconSrc, weaponName, 'weapon-btn-icon', weaponName.charAt(0)));

    const nameText = sublabel ? weaponName + ' (' + sublabel + ')' : weaponName;
    left.appendChild(el('span', 'weapon-btn-name', nameText));
    btn.appendChild(left);

    const right = el('div', 'weapon-btn-right');
    if (notes && notes.length > 0) {
      const notesDiv = el('div', 'rec-notes');
      notes.forEach(n => {
        notesDiv.appendChild(el('span', 'rec-note-chip', n));
      });
      right.appendChild(notesDiv);
    }

    if (score !== null && score !== undefined) {
      const scoreBox = el('div', 'weapon-score-box');
      const scoreEl = el('span', 'weapon-score', String(score));
      if (hitInfo && hitInfo.min !== undefined && hitInfo.max !== undefined) {
        scoreEl.title = hitInfo.min + '–' + hitInfo.max + ' per hit';
      }
      scoreBox.appendChild(scoreEl);
      if (hitInfo && hitInfo.hits !== undefined && hitInfo.hits !== null) {
        scoreBox.appendChild(el('span', 'weapon-hits', '≈ ' + hitInfo.hits + ' hits'));
      }
      right.appendChild(scoreBox);
    }
    btn.appendChild(right);

    if (weapon) {
      btn.addEventListener('click', () => openWeaponModal(weapon, data));
    }
    return btn;
  }

  /**
   * Create creature card
   * @param {object} creature
   * @param {object} biome
   * @param {object} data
   * @returns {HTMLElement}
   */
  function createCreatureCard(creature, biome, data) {
    const card = el('article', 'creature-card');
    card.dataset.creatureId = creature.id;
    card.dataset.creatureName = creature.name.toLowerCase();
    card.dataset.creatureKind = creature.kind;

    const starsList = (creature.stars && creature.stars.length > 0)
      ? creature.stars
      : [{ star: 0, image: null, health: null, healthText: null, attacks: [] }];

    let currentStarIndex = 0;

    // Card Top (Image + Header Info)
    const cardTop = el('div', 'card-top');

    const imageBox = el('div', 'card-image-box');
    const updateImage = (starObj) => {
      imageBox.textContent = '';
      const imgSrc = starObj.image || (creature.stars && creature.stars[0] && creature.stars[0].image) || null;
      imageBox.appendChild(createImage(imgSrc, creature.name, 'card-image', creature.name.charAt(0)));
    };
    updateImage(starsList[currentStarIndex]);

    const headerInfo = el('div', 'card-header-info');

    // Title Row
    const titleRow = el('div', 'card-title-row');
    const nameEl = el('h4', 'card-name', creature.name);
    titleRow.appendChild(nameEl);
    headerInfo.appendChild(titleRow);

    // Badges Row
    const badgesRow = el('div', 'card-badges');
    if (creature.kind === 'boss') {
      badgesRow.appendChild(el('span', 'badge badge-boss', 'Boss'));
    } else if (creature.kind === 'miniboss') {
      badgesRow.appendChild(el('span', 'badge badge-miniboss', 'Miniboss'));
    } else if (creature.kind === 'passive') {
      badgesRow.appendChild(el('span', 'badge badge-passive', 'Passive'));
    }

    if (creature.tameable) {
      badgesRow.appendChild(el('span', 'badge badge-tameable', 'Tameable'));
    }

    // Always star badge if single star > 0
    if (starsList.length === 1 && starsList[0].star > 0) {
      badgesRow.appendChild(el('span', 'badge badge-always-stars', 'Always ' + getStarSymbol(starsList[0].star)));
    }
    if (badgesRow.children.length > 0) {
      headerInfo.appendChild(badgesRow);
    }

    // Star Selector (if hasStars)
    if (creature.hasStars && starsList.length > 1) {
      const starSelector = el('div', 'star-selector');
      starSelector.setAttribute('role', 'group');
      starSelector.setAttribute('aria-label', 'Select star level');

      starsList.forEach((starObj, idx) => {
        const starBtn = el('button', 'star-btn' + (idx === 0 ? ' active' : ''), getStarSymbol(starObj.star));
        starBtn.type = 'button';
        starBtn.setAttribute('aria-label', starObj.star + ' star');
        starBtn.addEventListener('click', function () {
          currentStarIndex = idx;
          Array.from(starSelector.children).forEach(btn => btn.classList.remove('active'));
          starBtn.classList.add('active');
          updateStarView();
        });
        starSelector.appendChild(starBtn);
      });
      headerInfo.appendChild(starSelector);
    }

    cardTop.appendChild(imageBox);
    cardTop.appendChild(headerInfo);
    card.appendChild(cardTop);

    // Weak points (if any)
    if (creature.weakPoints && creature.weakPoints.length > 0) {
      const wpBox = el('div', 'weak-points-box');
      creature.weakPoints.forEach(wp => {
        const label = el('span', 'weak-point-label', 'Weak point: ' + wp.part + ' — ');
        wpBox.appendChild(label);

        const chips = el('div', 'modifiers-chips');
        if (wp.modifiers) {
          Object.entries(wp.modifiers).forEach(([dmgType, tierStr]) => {
            const mult = parseModTier(tierStr, data.modTiers);
            if ((dmgType === 'chop' || dmgType === 'pickaxe') && mult <= 0) return;
            if (dmgType === 'spirit' && mult === 0) {
              const hasExplicitSpirit = creature.modifiers && creature.modifiers.spirit !== undefined;
              if (!hasExplicitSpirit) return;
            }
            const chip = el('span', 'mod-chip ' + getModClass(mult), capitalize(dmgType) + ' ×' + mult);
            chips.appendChild(chip);
          });
        }
        wpBox.appendChild(chips);
      });
      card.appendChild(wpBox);
    }

    // Health Display
    const healthBox = el('div', 'health-display');
    const healthLabel = el('span', 'health-label', 'HP');
    const healthValue = el('span', 'health-value', '—');
    const healthSubtext = el('span', 'health-subtext');

    healthBox.appendChild(healthLabel);
    healthBox.appendChild(healthValue);
    healthBox.appendChild(healthSubtext);
    card.appendChild(healthBox);

    // Attacks Section
    const attacksSection = el('div', 'card-section');
    const attacksTitle = el('span', 'card-section-title', 'Attacks');
    const attacksList = el('div', 'attacks-list');
    attacksSection.appendChild(attacksTitle);
    attacksSection.appendChild(attacksList);
    card.appendChild(attacksSection);

    // Recommendations (VC-5): computed live in the browser from the shared
    // ranking core, so they follow the "Your character" panel settings.
    const weaponsArray = Object.values(data.weapons);
    let recBox = null;

    const hitInfoFor = (weapon, ammo) => {
      if (!weapon || !window.VCRank || !playerState) return null;
      const hit = window.VCRank.perHit(weapon, ammo || null, creature, playerState);
      const hp = window.VCRank.creatureHp(creature, starsList[currentStarIndex].star, biome.id, playerState);
      const hits = hit.avg > 0 && hp > 0 ? Math.ceil(hp / hit.avg) : null;
      return { min: Math.round(hit.min), max: Math.round(hit.max), hits };
    };

    const renderRec = () => {
      if (!recBox || !window.VCRank || !playerState) return;
      const rec = window.VCRank.recommend(creature, biome, weaponsArray, playerState);
      recBox.textContent = '';

      const isRangedOnly = creature.kind === 'passive' || creature.kind === 'fish';

      // Tip row
      if (rec.tip) {
        recBox.appendChild(el('div', 'rec-tip', rec.tip));
      }

      const recGroups = el('div', 'rec-groups');
      const bowWeapon = rec.bow ? data.weapons[rec.bow.weapon] : null;
      const xbowWeapon = rec.crossbow ? data.weapons[rec.crossbow.weapon] : null;

      // 1. Melee (up to 3 rows, only if not ranged only)
      if (!isRangedOnly && rec.melee && rec.melee.length > 0) {
        const meleeGroup = el('div', 'rec-group');
        meleeGroup.appendChild(el('span', 'rec-group-title', 'Melee'));
        rec.melee.slice(0, 3).forEach(m => {
          const w = data.weapons[m.weapon];
          meleeGroup.appendChild(createWeaponRowBtn(m.weapon, m.score, filterWeaponNotes(m.notes, creature), null, data, hitInfoFor(w, null)));
        });
        recGroups.appendChild(meleeGroup);
      }

      // 2. Bow + arrows
      if (rec.bow || (rec.arrows && rec.arrows.length > 0)) {
        const bowGroup = el('div', 'rec-group');
        const bowName = bowWeapon ? bowWeapon.name : 'Bow';
        bowGroup.appendChild(el('span', 'rec-group-title', 'Bow + Arrows (' + bowName + ')'));

        if (rec.arrows && rec.arrows.length > 0) {
          rec.arrows.forEach(arr => {
            const a = data.weapons[arr.weapon];
            bowGroup.appendChild(createWeaponRowBtn(arr.weapon, arr.score, filterWeaponNotes(arr.notes, creature), null, data, hitInfoFor(bowWeapon, a)));
          });
        } else if (rec.bow) {
          bowGroup.appendChild(createWeaponRowBtn(rec.bow.weapon, rec.bow.score, filterWeaponNotes(rec.bow.notes, creature), null, data, hitInfoFor(bowWeapon, null)));
        }
        recGroups.appendChild(bowGroup);
      }

      // 3. Crossbow + bolts
      if (rec.crossbow || (rec.bolts && rec.bolts.length > 0)) {
        const xbowGroup = el('div', 'rec-group');
        const xbowName = xbowWeapon ? xbowWeapon.name : 'Crossbow';
        xbowGroup.appendChild(el('span', 'rec-group-title', 'Crossbow + Bolts (' + xbowName + ')'));

        if (rec.bolts && rec.bolts.length > 0) {
          rec.bolts.forEach(bolt => {
            const b = data.weapons[bolt.weapon];
            xbowGroup.appendChild(createWeaponRowBtn(bolt.weapon, bolt.score, filterWeaponNotes(bolt.notes, creature), null, data, hitInfoFor(xbowWeapon, b)));
          });
        } else if (rec.crossbow) {
          xbowGroup.appendChild(createWeaponRowBtn(rec.crossbow.weapon, rec.crossbow.score, filterWeaponNotes(rec.crossbow.notes, creature), null, data, hitInfoFor(xbowWeapon, null)));
        }
        recGroups.appendChild(xbowGroup);
      }

      // 4. Magic (only if not ranged only)
      if (!isRangedOnly && rec.magic) {
        const magicGroup = el('div', 'rec-group');
        magicGroup.appendChild(el('span', 'rec-group-title', 'Magic'));
        const w = data.weapons[rec.magic.weapon];
        magicGroup.appendChild(createWeaponRowBtn(rec.magic.weapon, rec.magic.score, filterWeaponNotes(rec.magic.notes, creature), null, data, hitInfoFor(w, null)));
        recGroups.appendChild(magicGroup);
      }

      // 5. Bomb (only if not ranged only)
      if (!isRangedOnly && rec.bomb) {
        const bombGroup = el('div', 'rec-group');
        bombGroup.appendChild(el('span', 'rec-group-title', 'Bomb'));
        const w = data.weapons[rec.bomb.weapon];
        bombGroup.appendChild(createWeaponRowBtn(rec.bomb.weapon, rec.bomb.score, filterWeaponNotes(rec.bomb.notes, creature), null, data, hitInfoFor(w, null)));
        recGroups.appendChild(bombGroup);
      }

      // 6. Avoid
      if (rec.avoid && rec.avoid.length > 0) {
        const filteredAvoid = rec.avoid.filter(av => {
          if ((av.type === 'chop' || av.type === 'pickaxe') && av.mult <= 0) return false;
          if (av.type === 'spirit' && av.mult === 0) {
            return creature.modifiers && creature.modifiers.spirit !== undefined;
          }
          return true;
        });
        if (filteredAvoid.length > 0) {
          const avoidRow = el('div', 'rec-avoid-row');
          avoidRow.appendChild(el('span', 'rec-avoid-label', 'Avoid:'));
          const avoidChips = el('div', 'modifiers-chips');
          filteredAvoid.forEach(av => {
            const chip = el('span', 'mod-chip ' + getModClass(av.mult), capitalize(av.type) + ' (×' + av.mult + ')');
            avoidChips.appendChild(chip);
          });
          avoidRow.appendChild(avoidChips);
          recGroups.appendChild(avoidRow);
        }
      }

      if (recGroups.children.length > 0) {
        recBox.appendChild(recGroups);
      }
    };

    // Helper to update star-dependent views (image, HP, attacks)
    const updateStarView = () => {
      const starObj = starsList[currentStarIndex];
      updateImage(starObj);

      // Determine HP
      let hpVal = null;
      if (starObj.healthByBiome && starObj.healthByBiome[biome.id] !== undefined) {
        hpVal = starObj.healthByBiome[biome.id];
      } else if (starObj.health !== null && starObj.health !== undefined) {
        hpVal = starObj.health;
      }

      if (hpVal !== null) {
        healthValue.textContent = Number(hpVal).toLocaleString();
      } else if (starObj.healthText) {
        healthValue.textContent = starObj.healthText;
      } else {
        healthValue.textContent = '—';
      }

      // HP Subtext for complex phases/parts
      healthSubtext.textContent = '';
      if (starObj.healthText && (starObj.healthText.includes('\n') || starObj.healthText.includes('+') || starObj.healthText.includes(':'))) {
        healthSubtext.textContent = starObj.healthText;
      }

      // Attacks
      attacksList.textContent = '';
      if (starObj.attacks && starObj.attacks.length > 0) {
        starObj.attacks.forEach(att => {
          const row = el('div', 'attack-row');
          const attName = el('span', 'attack-name', att.name || 'Attack');
          row.appendChild(attName);

          const dmgEntries = att.damage
            ? Object.entries(att.damage).filter(([type]) => type !== 'chop' && type !== 'pickaxe')
            : [];
          if (dmgEntries.length > 0) {
            const damagesDiv = el('div', 'attack-damages');
            dmgEntries.forEach(([type, val]) => {
              const chip = el('span', 'dmg-chip dmg-chip-' + type, val + ' ' + capitalize(type));
              damagesDiv.appendChild(chip);
            });
            row.appendChild(damagesDiv);
          } else if (att.raw) {
            const rawSpan = el('span', 'attack-raw', att.raw);
            row.appendChild(rawSpan);
          }
          attacksList.appendChild(row);
        });
      } else {
        attacksList.appendChild(el('div', 'attack-raw', 'No attacks'));
      }

      // Hits-to-kill depends on the selected star level
      renderRec();
    };
    updateStarView();

    // Weaknesses & Resistances
    const modifiers = window.VCRank
      ? window.VCRank.effectiveModifiers(creature)
      : (creature.modifiers || {});

    const nonNeutralMods = Object.entries(modifiers).filter(([type, val]) => {
      const num = parseModTier(val, data.modTiers);
      if (num === 1) return false;

      // chop and pickaxe only when multiplier > 0 (Stone Golem: Pickaxe ×2)
      if ((type === 'chop' || type === 'pickaxe') && num <= 0) {
        return false;
      }

      // spirit ×0 only if spirit is explicitly defined in creature.modifiers
      if (type === 'spirit' && num === 0) {
        const hasExplicitSpirit = creature.modifiers && creature.modifiers.spirit !== undefined;
        if (!hasExplicitSpirit) {
          return false;
        }
      }

      return true;
    });

    if (nonNeutralMods.length > 0 || (creature.otherImmunities && creature.otherImmunities.length > 0)) {
      const modSection = el('div', 'card-section');
      const modTitle = el('span', 'card-section-title', 'Weaknesses & Resistances');
      modSection.appendChild(modTitle);

      const modChips = el('div', 'modifiers-chips');
      // Sort non-neutral modifiers from highest multiplier to lowest
      nonNeutralMods.sort((a, b) => {
        const valA = parseModTier(a[1], data.modTiers);
        const valB = parseModTier(b[1], data.modTiers);
        return valB - valA;
      });

      nonNeutralMods.forEach(([type, tierVal]) => {
        const num = parseModTier(tierVal, data.modTiers);
        const chip = el('span', 'mod-chip ' + getModClass(num), capitalize(type) + ' ×' + num);
        modChips.appendChild(chip);
      });
      modSection.appendChild(modChips);

      // Other immunities
      if (creature.otherImmunities && creature.otherImmunities.length > 0) {
        const otherImm = el('div', 'other-immunities', 'Also immune: ' + creature.otherImmunities.join(', '));
        modSection.appendChild(otherImm);
      }

      card.appendChild(modSection);
    }

    // Best Weapons Section (VC-5: live recommendations, re-rendered when
    // character settings or the selected star level change)
    if (window.VCRank && playerState) {
      recBox = el('div', 'recommendations-box');
      renderRec();
      if (recBox.children.length > 0) {
        card.appendChild(recBox);
      }
    }

    // Also found in (only biomes with order < current biome)
    if (creature.biomes && creature.biomes.length > 1) {
      const earlierBiomes = creature.biomes
        .map(bId => data.biomes.find(b => b.id === bId))
        .filter(b => b && b.order < biome.order)
        .sort((a, b) => a.order - b.order);

      if (earlierBiomes.length > 0) {
        const alsoBox = el('div', 'also-found-box');
        alsoBox.appendChild(el('span', 'also-found-label', 'Also found in: '));
        alsoBox.appendChild(document.createTextNode(earlierBiomes.map(b => b.name).join(', ')));
        card.appendChild(alsoBox);
      }
    }

    // Details (<details>)
    const details = el('details', 'creature-details');
    details.appendChild(el('summary', null, 'Details'));

    const detailsContent = el('div', 'details-content');

    // Abilities
    if (creature.abilities && creature.abilities.length > 0) {
      const row = el('div', 'details-row');
      row.appendChild(el('span', 'details-key', 'Abilities'));
      row.appendChild(el('span', 'details-val', creature.abilities.join(', ')));
      detailsContent.appendChild(row);
    }

    // Drops
    if (creature.drops && creature.drops.length > 0) {
      const row = el('div', 'details-row');
      row.appendChild(el('span', 'details-key', 'Drops'));
      row.appendChild(el('span', 'details-val', creature.drops.join(', ')));
      detailsContent.appendChild(row);
    }

    // Trophy
    if (creature.trophy && creature.trophy.name) {
      const row = el('div', 'details-row');
      row.appendChild(el('span', 'details-key', 'Trophy'));
      const trophyVal = el('div', 'trophy-val');
      if (creature.trophy.image) {
        trophyVal.appendChild(createImage(creature.trophy.image, creature.trophy.name, 'trophy-img', 'T'));
      }
      trophyVal.appendChild(el('span', 'details-val', creature.trophy.name));
      row.appendChild(trophyVal);
      detailsContent.appendChild(row);
    }

    // Summon
    if (creature.summon) {
      const row = el('div', 'details-row');
      row.appendChild(el('span', 'details-key', 'Summon'));
      row.appendChild(el('span', 'details-val', creature.summon));
      detailsContent.appendChild(row);
    }

    // Faction
    if (creature.faction) {
      const row = el('div', 'details-row');
      row.appendChild(el('span', 'details-key', 'Faction'));
      row.appendChild(el('span', 'details-val', creature.faction));
      detailsContent.appendChild(row);
    }

    // Behavior
    if (creature.behavior) {
      const row = el('div', 'details-row');
      row.appendChild(el('span', 'details-key', 'Behavior'));
      row.appendChild(el('span', 'details-val', creature.behavior));
      detailsContent.appendChild(row);
    }

    // Stagger
    if (creature.stagger) {
      const row = el('div', 'details-row');
      row.appendChild(el('span', 'details-key', 'Stagger'));
      row.appendChild(el('span', 'details-val', creature.stagger));
      detailsContent.appendChild(row);
    }

    // Spawns
    if (creature.spawns && creature.spawns.length > 0) {
      const row = el('div', 'details-row');
      row.appendChild(el('span', 'details-key', 'Spawns'));
      row.appendChild(el('span', 'details-val', creature.spawns.join('; ')));
      detailsContent.appendChild(row);
    }

    // Description
    if (creature.description) {
      const row = el('div', 'details-row');
      row.appendChild(el('span', 'details-key', 'Description'));
      row.appendChild(el('p', 'details-val', creature.description));
      detailsContent.appendChild(row);
    }

    // Game IDs
    if (creature.gameIds && creature.gameIds.length > 0) {
      const row = el('div', 'details-row');
      row.appendChild(el('span', 'details-key', 'Game ID'));
      row.appendChild(el('span', 'details-val', creature.gameIds.join(', ')));
      detailsContent.appendChild(row);
    }

    // Wiki Link
    if (creature.wiki) {
      const row = el('div', 'details-row');
      const wikiA = el('a', 'wiki-link', 'Open on Valheim Wiki ↗');
      wikiA.href = creature.wiki;
      wikiA.target = '_blank';
      wikiA.rel = 'noopener noreferrer';
      row.appendChild(wikiA);
      detailsContent.appendChild(row);
    }

    details.appendChild(detailsContent);
    card.appendChild(details);

    // Re-render recommendations when the player character settings change
    // (keeps expanded details and the selected star level intact)
    card.refreshForPlayer = () => {
      renderRec();
    };

    return card;
  }

  /**
   * Create expandable fish tile
   * @param {object} creature
   * @param {object} biome
   * @param {object} data
   * @returns {HTMLElement}
   */
  function createFishTile(creature, biome, data) {
    const wrapper = el('div', 'fish-wrapper');
    wrapper.dataset.creatureId = creature.id;
    wrapper.dataset.creatureName = creature.name.toLowerCase();
    wrapper.dataset.creatureKind = 'fish';

    const tile = el('div', 'fish-tile');
    tile.setAttribute('role', 'button');
    tile.setAttribute('tabindex', '0');
    tile.setAttribute('aria-expanded', 'false');
    tile.setAttribute('aria-label', creature.name + ', click to toggle details');

    const star0 = (creature.stars && creature.stars[0]) || {};
    const thumb = createImage(star0.image, creature.name, 'fish-thumb', creature.name.charAt(0));
    tile.appendChild(thumb);

    const info = el('div', 'fish-info');
    info.appendChild(el('span', 'fish-name', creature.name));
    const hpStr = star0.health !== null && star0.health !== undefined ? star0.health + ' HP' : '— HP';
    info.appendChild(el('span', 'fish-hp', hpStr));
    tile.appendChild(info);

    wrapper.appendChild(tile);

    let fullCard = null;

    const toggleFish = () => {
      const isExpanded = tile.getAttribute('aria-expanded') === 'true';
      if (isExpanded) {
        tile.setAttribute('aria-expanded', 'false');
        wrapper.classList.remove('expanded');
        if (fullCard && fullCard.parentElement) {
          wrapper.removeChild(fullCard);
        }
      } else {
        tile.setAttribute('aria-expanded', 'true');
        wrapper.classList.add('expanded');
        if (!fullCard) {
          fullCard = createCreatureCard(creature, biome, data);
        }
        wrapper.appendChild(fullCard);
      }
    };

    tile.addEventListener('click', toggleFish);
    tile.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleFish();
      }
    });

    return wrapper;
  }

  /**
   * Compute average per-hit damage for a weapon with player settings without creature modifiers.
   * For arrows and bolts, pairs with the best available launcher (bow/crossbow) of equal or lower tier.
   * @param {object} weapon
   * @param {object} data
   * @param {object} player
   * @returns {object|null}
   */
  function computeWeaponAvgHit(weapon, data, player) {
    if (!window.VCRank || !player || !weapon) return null;
    const basePlayer = { ...player, sneak: false, staggered: false };
    const allWeapons = data?.weapons ? Object.values(data.weapons) : [];

    if (weapon.category === 'arrow') {
      const ammoTier = weapon.tier ?? Infinity;
      const bows = allWeapons.filter(w => w.category === 'bow' && w.tier !== null && w.tier <= ammoTier);
      if (bows.length > 0) {
        bows.sort((a, b) => {
          const aHit = window.VCRank.perHit(a, null, null, basePlayer);
          const bHit = window.VCRank.perHit(b, null, null, basePlayer);
          if (bHit.avg !== aHit.avg) return bHit.avg - aHit.avg;
          if (a.tier !== b.tier) return a.tier - b.tier;
          return a.name.localeCompare(b.name);
        });
        return window.VCRank.perHit(bows[0], weapon, null, basePlayer);
      }
    } else if (weapon.category === 'bolt') {
      const ammoTier = weapon.tier ?? Infinity;
      const crossbows = allWeapons.filter(w => w.category === 'crossbow' && w.tier !== null && w.tier <= ammoTier);
      if (crossbows.length > 0) {
        crossbows.sort((a, b) => {
          const aHit = window.VCRank.perHit(a, null, null, basePlayer);
          const bHit = window.VCRank.perHit(b, null, null, basePlayer);
          if (bHit.avg !== aHit.avg) return bHit.avg - aHit.avg;
          if (a.tier !== b.tier) return a.tier - b.tier;
          return a.name.localeCompare(b.name);
        });
        return window.VCRank.perHit(crossbows[0], weapon, null, basePlayer);
      }
    }

    return window.VCRank.perHit(weapon, null, null, basePlayer);
  }

  /**
   * Create collapsible "Weapons & ammo from this biome" section
   * @param {object} biome
   * @param {object} data
   * @returns {HTMLElement|null}
   */
  function createBiomeWeaponsSection(biome, data) {
    const weaponsList = Object.values(data.weapons).filter(w => w.biome === biome.id);
    if (weaponsList.length === 0) return null;

    const section = el('details', 'biome-weapons-details');
    const summary = el('summary', null, 'Weapons & ammo from this biome (' + weaponsList.length + ')');
    section.appendChild(summary);

    const tableWrapper = el('div', 'weapons-table-wrapper');
    const table = el('table', 'weapons-table');

    // Group weapons by category
    const categoriesMap = {};
    weaponsList.forEach(w => {
      const cat = w.category || 'other';
      if (!categoriesMap[cat]) categoriesMap[cat] = [];
      categoriesMap[cat].push(w);
    });

    // Sort categories deterministically
    const sortedCategories = Object.keys(categoriesMap).sort();

    // Table Header
    const thead = el('thead');
    const headRow = el('tr');
    headRow.appendChild(el('th', null, 'Weapon / Ammo'));
    headRow.appendChild(el('th', null, 'Max Damage'));
    const yourAvgTh = el('th', null, 'Your avg');
    yourAvgTh.title = 'Average per-hit damage with your skills, difficulty and upgrade level (no creature modifiers)';
    headRow.appendChild(yourAvgTh);
    headRow.appendChild(el('th', null, 'Stamina'));
    headRow.appendChild(el('th', null, 'Materials'));
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = el('tbody');
    const yourAvgCells = []; // { cell, weapon } pairs for live updates

    sortedCategories.forEach(cat => {
      // Category group header row
      const catRow = el('tr', 'weapon-category-header');
      const catTd = el('td', null, capitalize(cat) + ' (' + categoriesMap[cat].length + ')');
      catTd.colSpan = 5;
      catRow.appendChild(catTd);
      tbody.appendChild(catRow);

      // Weapons in this category
      categoriesMap[cat].sort((a, b) => a.name.localeCompare(b.name)).forEach(weapon => {
        const row = el('tr', 'weapon-row');

        // Name + Icon
        const nameTd = el('td');
        const itemBox = el('div', 'weapon-cell-item');
        itemBox.appendChild(createImage(weapon.image, weapon.name, 'weapon-cell-icon', weapon.name.charAt(0)));
        itemBox.appendChild(el('span', 'weapon-cell-name', weapon.name));
        itemBox.addEventListener('click', () => openWeaponModal(weapon, data));
        nameTd.appendChild(itemBox);
        row.appendChild(nameTd);

        // Max Damage
        const dmgTd = el('td');
        const dmgDiv = el('div', 'attack-damages');
        const dmgEntries = weapon.damageMax ? Object.entries(weapon.damageMax) : [];
        if (dmgEntries.length > 0) {
          dmgEntries.forEach(([t, v]) => {
            if (v > 0) {
              dmgDiv.appendChild(el('span', 'dmg-chip dmg-chip-' + t, v + ' ' + capitalize(t)));
            }
          });
          dmgTd.appendChild(dmgDiv);
        } else {
          dmgTd.textContent = '—';
        }
        row.appendChild(dmgTd);

        // Your avg (live, no creature modifiers)
        const avgTd = el('td', 'weapon-your-avg', '—');
        yourAvgCells.push({ cell: avgTd, weapon });
        row.appendChild(avgTd);

        // Stamina
        const staminaTd = el('td', null, weapon.stamina !== null && weapon.stamina !== undefined ? String(weapon.stamina) : '—');
        row.appendChild(staminaTd);

        // Materials
        const matTd = el('td', 'weapon-materials');
        if (weapon.materials && weapon.materials.length > 0) {
          matTd.textContent = weapon.materials.map(m => m.name + (m.amount ? ' ×' + m.amount : '')).join(', ');
        } else {
          matTd.textContent = '—';
        }
        row.appendChild(matTd);

        tbody.appendChild(row);
      });
    });

    table.appendChild(tbody);
    tableWrapper.appendChild(table);
    section.appendChild(tableWrapper);

    // "Your avg" column: average per-hit damage without creature modifiers,
    // with the player's skills, difficulty and upgrade level. Situational
    // multipliers (sneak, stagger) are excluded because they are not typical hits.
    const updateYourAvg = () => {
      if (!window.VCRank || !playerState) return;
      for (const { cell, weapon } of yourAvgCells) {
        const hit = computeWeaponAvgHit(weapon, data, playerState);
        if (hit) {
          const avgVal = Math.round(hit.avg);
          cell.textContent = String(avgVal);
          cell.title = hit.min !== hit.max
            ? Math.round(hit.min) + '–' + Math.round(hit.max) + ' per hit'
            : String(avgVal);
        } else {
          cell.textContent = '—';
        }
      }
    };
    section.refreshForPlayer = updateYourAvg;
    updateYourAvg();

    return section;
  }

  /**
   * Render biome content (bosses, hostile, passive, fish, weapons) on first open
   * @param {object} biome
   * @param {HTMLElement} contentWrapper
   * @param {object} data
   */
  function renderBiomeContent(biome, contentWrapper, data) {
    if (contentWrapper.firstElementChild) return;

    const content = el('div', 'biome-content');
    const contentInner = el('div', 'biome-content-inner');

    // Populate sections: Bosses, Hostile, Passive, Fish, Biome Weapons
    const bCreatures = biome.creatures || {};

    // 1. Bosses (+ Minibosses)
    const bossesList = [...(bCreatures.boss || []), ...(bCreatures.miniboss || [])];
    if (bossesList.length > 0) {
      const bossSection = el('section', 'biome-section biome-section-bosses');
      const bossTitle = el('h3', 'section-title');
      bossTitle.appendChild(document.createTextNode('Bosses '));
      bossTitle.appendChild(el('span', 'section-count', '(' + bossesList.length + ')'));
      bossSection.appendChild(bossTitle);

      const bossGrid = el('div', 'creatures-grid');
      bossesList.forEach(cId => {
        const creature = data.creatures[cId];
        if (creature) {
          bossGrid.appendChild(createCreatureCard(creature, biome, data));
        }
      });
      bossSection.appendChild(bossGrid);
      contentInner.appendChild(bossSection);
    }

    // 2. Hostile
    const hostileList = bCreatures.hostile || [];
    if (hostileList.length > 0) {
      const hostileSection = el('section', 'biome-section biome-section-hostile');
      const hostileTitle = el('h3', 'section-title');
      hostileTitle.appendChild(document.createTextNode('Hostile '));
      hostileTitle.appendChild(el('span', 'section-count', '(' + hostileList.length + ')'));
      hostileSection.appendChild(hostileTitle);

      const hostileGrid = el('div', 'creatures-grid');
      hostileList.forEach(cId => {
        const creature = data.creatures[cId];
        if (creature) {
          hostileGrid.appendChild(createCreatureCard(creature, biome, data));
        }
      });
      hostileSection.appendChild(hostileGrid);
      contentInner.appendChild(hostileSection);
    }

    // 3. Passive
    const passiveList = bCreatures.passive || [];
    if (passiveList.length > 0) {
      const passiveSection = el('section', 'biome-section biome-section-passive');
      const passiveTitle = el('h3', 'section-title');
      passiveTitle.appendChild(document.createTextNode('Passive '));
      passiveTitle.appendChild(el('span', 'section-count', '(' + passiveList.length + ')'));
      passiveSection.appendChild(passiveTitle);

      const passiveGrid = el('div', 'creatures-grid');
      passiveList.forEach(cId => {
        const creature = data.creatures[cId];
        if (creature) {
          passiveGrid.appendChild(createCreatureCard(creature, biome, data));
        }
      });
      passiveSection.appendChild(passiveGrid);
      contentInner.appendChild(passiveSection);
    }

    // 4. Fish (compact tiles, expandable on click)
    const fishList = bCreatures.fish || [];
    if (fishList.length > 0) {
      const fishSection = el('section', 'biome-section biome-section-fish');
      const fishTitle = el('h3', 'section-title');
      fishTitle.appendChild(document.createTextNode('Fish '));
      fishTitle.appendChild(el('span', 'section-count', '(' + fishList.length + ')'));
      fishSection.appendChild(fishTitle);

      const fishGrid = el('div', 'fish-grid');
      fishList.forEach(cId => {
        const creature = data.creatures[cId];
        if (creature) {
          fishGrid.appendChild(createFishTile(creature, biome, data));
        }
      });
      fishSection.appendChild(fishGrid);
      contentInner.appendChild(fishSection);
    }

    // 5. Weapons & ammo from this biome
    const weaponsSection = createBiomeWeaponsSection(biome, data);
    if (weaponsSection) {
      contentInner.appendChild(weaponsSection);
    }

    content.appendChild(contentInner);
    contentWrapper.appendChild(content);
  }

  /**
   * Filter visible creatures in a specific biome card based on search and kind filter
   * @param {HTMLElement} biomeCard
   * @param {string} searchQuery
   * @param {string} kindFilter
   */
  function applyFiltersToBiome(biomeCard, searchQuery, kindFilter) {
    if (!biomeCard) return;

    const sections = biomeCard.querySelectorAll('.biome-section');
    let totalVisibleCreaturesInBiome = 0;

    sections.forEach(section => {
      const items = section.querySelectorAll('.creature-card, .fish-wrapper');
      let visibleInSection = 0;

      items.forEach(item => {
        const name = (item.dataset.creatureName || '').toLowerCase();
        const kind = item.dataset.creatureKind || '';

        const matchesSearch = !searchQuery || name.includes(searchQuery);
        let matchesKind = true;
        if (kindFilter && kindFilter !== 'all') {
          if (kindFilter === 'boss') {
            matchesKind = (kind === 'boss' || kind === 'miniboss');
          } else {
            matchesKind = (kind === kindFilter);
          }
        }

        const isVisible = matchesSearch && matchesKind;
        item.style.display = isVisible ? '' : 'none';
        if (isVisible) {
          visibleInSection++;
          totalVisibleCreaturesInBiome++;
        }
      });

      section.style.display = visibleInSection > 0 ? '' : 'none';
    });

    // Check if entire content has zero creatures matching
    const contentInner = biomeCard.querySelector('.biome-content-inner');
    if (contentInner) {
      let emptyMsg = contentInner.querySelector('.no-results-msg');
      if (totalVisibleCreaturesInBiome === 0 && (searchQuery || (kindFilter && kindFilter !== 'all'))) {
        if (!emptyMsg) {
          emptyMsg = el('p', 'no-results-msg', 'No creatures match your search or kind filter in this biome.');
          // Insert before weapons section if present
          const weaponsSec = contentInner.querySelector('.biome-weapons-details');
          if (weaponsSec) {
            contentInner.insertBefore(emptyMsg, weaponsSec);
          } else {
            contentInner.appendChild(emptyMsg);
          }
        }
      } else if (emptyMsg) {
        emptyMsg.remove();
      }
    }
  }

  /**
   * Filter creatures across all currently open biomes
   */
  function applyFiltersToAllOpenBiomes() {
    const searchInput = document.getElementById('creature-search');
    const searchQuery = searchInput ? searchInput.value.trim().toLowerCase() : '';

    const activeFilterBtn = document.querySelector('.filter-btn.active');
    const kindFilter = activeFilterBtn ? activeFilterBtn.dataset.kind : 'all';

    const openCards = document.querySelectorAll('.biome-card');
    openCards.forEach(card => {
      const headerBtn = card.querySelector('.biome-header');
      if (headerBtn && headerBtn.getAttribute('aria-expanded') === 'true') {
        applyFiltersToBiome(card, searchQuery, kindFilter);
      }
    });
  }

  /**
   * Build Legend Section
   * @param {HTMLElement} container
   */
  function buildLegend(container) {
    if (!container) return;
    container.textContent = '';

    const details = el('details', 'legend-details');
    const summary = el('summary', null, 'Legend & Damage Mechanics');
    details.appendChild(summary);

    const body = el('div', 'legend-body');

    // Damage Types Group
    const dmgGroup = el('div', 'legend-group');
    dmgGroup.appendChild(el('div', 'legend-group-title', 'Damage Types'));
    const dmgItems = el('div', 'legend-items');
    const damageTypes = [
      'blunt', 'slash', 'pierce', 'chop', 'pickaxe',
      'fire', 'frost', 'lightning', 'poison', 'spirit'
    ];
    damageTypes.forEach(t => {
      dmgItems.appendChild(el('span', 'dmg-chip dmg-chip-' + t, capitalize(t)));
    });
    dmgGroup.appendChild(dmgItems);
    body.appendChild(dmgGroup);

    // Multipliers Group
    const modGroup = el('div', 'legend-group');
    modGroup.appendChild(el('div', 'legend-group-title', 'Weakness & Resistance Multipliers'));
    const modItems = el('div', 'legend-items');
    const tiers = [
      { mult: 2, label: '×2 Very Weak', cls: 'mod-chip-2' },
      { mult: 1.5, label: '×1.5 Weak', cls: 'mod-chip-1_5' },
      { mult: 1.25, label: '×1.25 Slightly Weak', cls: 'mod-chip-1_25' },
      { mult: 1, label: '×1 Neutral', cls: 'mod-chip-1' },
      { mult: 0.75, label: '×0.75 Slightly Resistant', cls: 'mod-chip-0_75' },
      { mult: 0.5, label: '×0.5 Resistant', cls: 'mod-chip-0_5' },
      { mult: 0.25, label: '×0.25 Very Resistant', cls: 'mod-chip-0_25' },
      { mult: 0, label: '×0 Immune', cls: 'mod-chip-0' }
    ];
    tiers.forEach(item => {
      modItems.appendChild(el('span', 'mod-chip ' + item.cls, item.label));
    });
    modGroup.appendChild(modItems);
    body.appendChild(modGroup);

    // Note
    const note = el('p', 'legend-note', 'Damage = average per hit with your skills (primary attack). Combo finisher ×2, secondary attacks, Dvergr buff and DoT ticking are not included.');
    body.appendChild(note);

    details.appendChild(body);
    container.appendChild(details);
  }

  /**
   * Build the Armory section (VC-6)
   * Lists all weapons and ammo with live damage calculations, search, category filter,
   * damage type filter, column sorting, and spoiler-aware visibility.
   * @param {HTMLElement} container
   * @param {object} data
   * @returns {{ refresh: function }}
   */
  function buildArmorySection(container, data) {
    if (!container || !data || !data.weapons) return null;
    container.textContent = '';

    // Header
    const header = el('div', 'armory-header');
    header.appendChild(el('h2', 'armory-title', 'Armory'));
    header.appendChild(el('p', 'armory-subtitle', 'Every weapon and ammo, with your damage.'));
    container.appendChild(header);

    // State
    let sortColumn = 'biome';
    let sortDirection = 'asc';
    let searchQuery = '';
    let selectedCategory = 'all';
    let selectedDamageType = null;

    // Controls
    const controls = el('div', 'armory-controls');

    // Controls Row 1: Search, Category select, Spoiler toggle
    const row1 = el('div', 'armory-controls-row');

    // Search box
    const searchBox = el('div', 'armory-search-box');
    const searchInput = el('input');
    searchInput.type = 'search';
    searchInput.id = 'armory-search';
    searchInput.placeholder = 'Search weapons…';
    searchInput.setAttribute('aria-label', 'Search weapons by name');
    searchBox.appendChild(searchInput);
    row1.appendChild(searchBox);

    // Category filter dropdown
    const categorySelect = el('select', 'armory-select');
    categorySelect.id = 'armory-category-filter';
    categorySelect.setAttribute('aria-label', 'Filter weapons by category');

    const CATEGORY_OPTIONS = [
      { value: 'all', label: 'All' },
      { value: 'swords', label: 'Swords' },
      { value: 'axes', label: 'Axes' },
      { value: 'clubs', label: 'Clubs' },
      { value: 'spears', label: 'Spears' },
      { value: 'polearms', label: 'Polearms' },
      { value: 'knives', label: 'Knives' },
      { value: 'fists', label: 'Fists' },
      { value: 'pickaxes', label: 'Pickaxes' },
      { value: 'bows', label: 'Bows' },
      { value: 'crossbows', label: 'Crossbows' },
      { value: 'arrows', label: 'Arrows' },
      { value: 'bolts', label: 'Bolts' },
      { value: 'magic', label: 'Magic' },
      { value: 'bombs', label: 'Bombs' },
    ];

    CATEGORY_OPTIONS.forEach(opt => {
      const optionEl = el('option', null, opt.label);
      optionEl.value = opt.value;
      categorySelect.appendChild(optionEl);
    });
    row1.appendChild(categorySelect);

    // Spoiler toggle
    const toggleLabel = el('label', 'armory-toggle-label');
    const toggleAllCheckbox = el('input');
    toggleAllCheckbox.type = 'checkbox';
    toggleAllCheckbox.id = 'armory-toggle-all';
    toggleAllCheckbox.checked = getStoredArmoryAll();
    toggleLabel.appendChild(toggleAllCheckbox);
    toggleLabel.appendChild(el('span', null, 'Show all weapons (spoilers)'));
    row1.appendChild(toggleLabel);

    controls.appendChild(row1);

    // Controls Row 2: Damage type chips
    const row2 = el('div', 'armory-controls-row');
    const damageChipsDiv = el('div', 'armory-damage-chips');
    damageChipsDiv.appendChild(el('span', 'armory-damage-label', 'Damage:'));

    const DAMAGE_CHIP_TYPES = ['fire', 'frost', 'lightning', 'poison', 'spirit', 'pierce', 'blunt', 'slash'];
    const chipButtons = [];

    DAMAGE_CHIP_TYPES.forEach(dt => {
      const chipBtn = el('button', 'armory-chip-btn', capitalize(dt));
      chipBtn.type = 'button';
      chipBtn.dataset.damage = dt;
      chipBtn.addEventListener('click', () => {
        if (selectedDamageType === dt) {
          selectedDamageType = null;
          chipBtn.classList.remove('active');
        } else {
          selectedDamageType = dt;
          chipButtons.forEach(b => b.classList.remove('active'));
          chipBtn.classList.add('active');
        }
        renderTableBody();
      });
      chipButtons.push(chipBtn);
      damageChipsDiv.appendChild(chipBtn);
    });
    row2.appendChild(damageChipsDiv);
    controls.appendChild(row2);

    container.appendChild(controls);

    // Table
    const tableWrapper = el('div', 'armory-table-wrapper');
    const table = el('table', 'armory-table');

    const thead = el('thead');
    const headRow = el('tr');

    const headerCols = [
      { key: null, label: '', cls: 'armory-col-icon' },
      { key: 'name', label: 'Name', cls: 'armory-col-name sortable' },
      { key: null, label: 'Category', cls: '' },
      { key: null, label: 'Skill', cls: '' },
      { key: 'biome', label: 'Biome (Tier)', cls: 'sortable' },
      { key: null, label: 'Damage', cls: '' },
      { key: 'yourAvg', label: 'Your avg', cls: 'sortable', title: 'Average per-hit damage with your skills, difficulty and upgrade level (no creature modifiers)' },
      { key: 'stamina', label: 'Stamina', cls: 'sortable' },
      { key: null, label: 'Backstab', cls: '' },
      { key: null, label: 'Materials', cls: '' },
    ];

    const sortThMap = {};

    headerCols.forEach(col => {
      const th = el('th', col.cls || null);
      if (col.title) th.title = col.title;

      if (col.key) {
        th.setAttribute('tabindex', '0');
        th.setAttribute('role', 'columnheader');
        const textSpan = el('span', null, col.label);
        const sortSpan = el('span', 'armory-sort-indicator');
        th.appendChild(textSpan);
        th.appendChild(sortSpan);
        sortThMap[col.key] = { th, sortSpan };

        const handleSort = () => {
          if (sortColumn === col.key) {
            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
          } else {
            sortColumn = col.key;
            sortDirection = col.key === 'yourAvg' ? 'desc' : 'asc';
          }
          updateSortHeaderIndicators();
          renderTableBody();
        };

        th.addEventListener('click', handleSort);
        th.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleSort();
          }
        });
      } else {
        th.textContent = col.label;
      }
      headRow.appendChild(th);
    });

    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = el('tbody');
    table.appendChild(tbody);
    tableWrapper.appendChild(table);
    container.appendChild(tableWrapper);

    function updateSortHeaderIndicators() {
      for (const [key, { th, sortSpan }] of Object.entries(sortThMap)) {
        if (sortColumn === key) {
          th.setAttribute('aria-sort', sortDirection === 'asc' ? 'ascending' : 'descending');
          sortSpan.textContent = sortDirection === 'asc' ? ' ▲' : ' ▼';
        } else {
          th.setAttribute('aria-sort', 'none');
          sortSpan.textContent = '';
        }
      }
    }

    function matchesCategory(w, cat) {
      if (cat === 'all') return true;
      switch (cat) {
        case 'swords': return w.category === 'sword';
        case 'axes': return w.category === 'axe' || w.category === 'battleaxe';
        case 'clubs': return w.category === 'club' || w.category === 'sledge';
        case 'spears': return w.category === 'spear';
        case 'polearms': return w.category === 'polearm';
        case 'knives': return w.category === 'knife';
        case 'fists': return w.category === 'fists';
        case 'pickaxes': return w.category === 'pickaxe';
        case 'bows': return w.category === 'bow';
        case 'crossbows': return w.category === 'crossbow';
        case 'arrows': return w.category === 'arrow';
        case 'bolts': return w.category === 'bolt';
        case 'magic': return w.category === 'magic';
        case 'bombs': return w.category === 'bomb';
        default: return true;
      }
    }

    function matchesDamageType(w, dt) {
      if (!dt) return true;
      return (w.damageMax?.[dt] ?? 0) > 0 || (w.damage?.[dt] ?? 0) > 0;
    }

    function createWeaponRow(w, hit) {
      const row = el('tr', 'armory-row');

      // 1. Icon
      const iconTd = el('td', 'armory-col-icon');
      iconTd.appendChild(createImage(w.image, w.name, 'armory-weapon-icon', w.name.charAt(0)));
      row.appendChild(iconTd);

      // 2. Name
      const nameTd = el('td', 'armory-col-name', w.name);
      row.appendChild(nameTd);

      // 3. Category
      row.appendChild(el('td', null, capitalize(w.category)));

      // 4. Skill
      const skillText = w.skill ? capitalize(w.skill.replace('-', ' ')) : '—';
      row.appendChild(el('td', null, skillText));

      // 5. Biome (Tier)
      let biomeText = 'Special';
      if (w.biome) {
        const b = data.biomes?.find(x => x.id === w.biome);
        const bName = b ? b.name : capitalize(w.biome);
        biomeText = w.tier != null ? bName + ' (' + w.tier + ')' : bName;
      }
      row.appendChild(el('td', null, biomeText));

      // 6. Damage
      const dmgTd = el('td');
      const dmgDiv = el('div', 'attack-damages');
      const dmgEntries = w.damageMax ? Object.entries(w.damageMax) : [];
      let hasDmg = false;
      dmgEntries.forEach(([t, v]) => {
        if (v > 0 && t !== 'chop' && t !== 'pickaxe') {
          hasDmg = true;
          dmgDiv.appendChild(el('span', 'dmg-chip dmg-chip-' + t, v + ' ' + capitalize(t)));
        }
      });
      if (hasDmg) {
        dmgTd.appendChild(dmgDiv);
      } else {
        dmgTd.textContent = '—';
      }
      row.appendChild(dmgTd);

      // 7. Your avg
      const avgTd = el('td', 'weapon-your-avg');
      if (hit) {
        const avgVal = Math.round(hit.avg);
        avgTd.textContent = String(avgVal);
        avgTd.title = hit.min !== hit.max
          ? Math.round(hit.min) + '–' + Math.round(hit.max) + ' per hit'
          : String(avgVal);
      } else {
        avgTd.textContent = '—';
      }
      row.appendChild(avgTd);

      // 8. Stamina
      row.appendChild(el('td', null, w.stamina !== null && w.stamina !== undefined ? String(w.stamina) : '—'));

      // 9. Backstab
      const bsTd = el('td');
      if (w.backstab != null) {
        bsTd.textContent = w.backstab + '×';
      } else {
        const defVal = window.VCRank?.DEFAULT_BACKSTAB?.[w.category] ?? 3;
        bsTd.textContent = defVal + '× ';
        bsTd.appendChild(el('span', 'armory-backstab-default', '(default)'));
      }
      row.appendChild(bsTd);

      // 10. Materials
      const matTd = el('td', 'weapon-materials');
      if (w.materials && w.materials.length > 0) {
        matTd.textContent = w.materials.map(m => m.name + (m.amount ? ' ×' + m.amount : '')).join(', ');
      } else {
        matTd.textContent = '—';
      }
      row.appendChild(matTd);

      row.addEventListener('click', () => openWeaponModal(w, data));
      return row;
    }

    function createLockedRow(biome, count) {
      const tr = el('tr', 'armory-locked-row');
      const td = el('td');
      td.colSpan = 10;
      td.textContent = '🔒 ' + count + ' weapons from ' + biome.name + ' — open the biome to reveal';
      tr.appendChild(td);
      return tr;
    }

    function renderTableBody() {
      tbody.textContent = '';
      const openBiomes = new Set(getStoredOpenBiomes());
      const showAll = getStoredArmoryAll();
      const allWeapons = Object.values(data.weapons);

      // Filter visible weapons
      const visible = [];
      for (const w of allWeapons) {
        // Spoilers
        if (!showAll) {
          if (!w.biome) continue; // "Special" (biome: null) only with toggle
          if (!openBiomes.has(w.biome)) continue;
        }
        // Filters
        if (!matchesCategory(w, selectedCategory)) continue;
        if (selectedDamageType && !matchesDamageType(w, selectedDamageType)) continue;
        if (searchQuery && !w.name.toLowerCase().includes(searchQuery)) continue;

        const hit = computeWeaponAvgHit(w, data, playerState);
        visible.push({
          weapon: w,
          hit,
          avg: hit ? Math.round(hit.avg) : 0,
        });
      }

      if (sortColumn === 'biome') {
        const sortedBiomes = [...data.biomes].sort((a, b) => a.order - b.order);
        if (sortDirection === 'desc') sortedBiomes.reverse();

        // If desc, Special comes first when showAll is true
        if (showAll && sortDirection === 'desc') {
          const specialItems = visible.filter(it => !it.weapon.biome);
          specialItems.sort((a, b) => b.weapon.name.localeCompare(a.weapon.name));
          specialItems.forEach(it => tbody.appendChild(createWeaponRow(it.weapon, it.hit)));
        }

        sortedBiomes.forEach(biome => {
          if (showAll || openBiomes.has(biome.id)) {
            const biomeItems = visible.filter(it => it.weapon.biome === biome.id);
            biomeItems.sort((a, b) => {
              return sortDirection === 'asc'
                ? a.weapon.name.localeCompare(b.weapon.name)
                : b.weapon.name.localeCompare(a.weapon.name);
            });
            biomeItems.forEach(it => tbody.appendChild(createWeaponRow(it.weapon, it.hit)));
          } else {
            // Locked biome
            const count = allWeapons.filter(w => w.biome === biome.id).length;
            if (count > 0) {
              tbody.appendChild(createLockedRow(biome, count));
            }
          }
        });

        // If asc, Special comes at the end when showAll is true
        if (showAll && sortDirection === 'asc') {
          const specialItems = visible.filter(it => !it.weapon.biome);
          specialItems.sort((a, b) => a.weapon.name.localeCompare(b.weapon.name));
          specialItems.forEach(it => tbody.appendChild(createWeaponRow(it.weapon, it.hit)));
        }
      } else {
        // Sorted by name, yourAvg, or stamina
        visible.sort((a, b) => {
          if (sortColumn === 'name') {
            return sortDirection === 'asc'
              ? a.weapon.name.localeCompare(b.weapon.name)
              : b.weapon.name.localeCompare(a.weapon.name);
          }
          if (sortColumn === 'yourAvg') {
            const diff = a.avg - b.avg;
            return sortDirection === 'asc'
              ? (diff || a.weapon.name.localeCompare(b.weapon.name))
              : (-diff || a.weapon.name.localeCompare(b.weapon.name));
          }
          if (sortColumn === 'stamina') {
            const aStam = a.weapon.stamina !== null && a.weapon.stamina !== undefined ? a.weapon.stamina : (sortDirection === 'asc' ? 9999 : -1);
            const bStam = b.weapon.stamina !== null && b.weapon.stamina !== undefined ? b.weapon.stamina : (sortDirection === 'asc' ? 9999 : -1);
            const diff = aStam - bStam;
            return sortDirection === 'asc'
              ? (diff || a.weapon.name.localeCompare(b.weapon.name))
              : (-diff || a.weapon.name.localeCompare(b.weapon.name));
          }
          return 0;
        });

        visible.forEach(it => tbody.appendChild(createWeaponRow(it.weapon, it.hit)));

        // Append locked biome rows at the bottom
        if (!showAll) {
          const sortedBiomes = [...data.biomes].sort((a, b) => a.order - b.order);
          sortedBiomes.forEach(biome => {
            if (!openBiomes.has(biome.id)) {
              const count = allWeapons.filter(w => w.biome === biome.id).length;
              if (count > 0) {
                tbody.appendChild(createLockedRow(biome, count));
              }
            }
          });
        }
      }

      if (tbody.children.length === 0) {
        const emptyTr = el('tr', 'armory-empty-row');
        const emptyTd = el('td');
        emptyTd.colSpan = 10;
        emptyTd.textContent = 'No weapons found matching your criteria.';
        emptyTr.appendChild(emptyTd);
        tbody.appendChild(emptyTr);
      }
    }

    // Input listeners
    searchInput.addEventListener('input', () => {
      searchQuery = searchInput.value.trim().toLowerCase();
      renderTableBody();
    });

    categorySelect.addEventListener('change', () => {
      selectedCategory = categorySelect.value;
      renderTableBody();
    });

    toggleAllCheckbox.addEventListener('change', () => {
      setStoredArmoryAll(toggleAllCheckbox.checked);
      renderTableBody();
    });

    // Initial render
    updateSortHeaderIndicators();
    renderTableBody();

    return {
      refresh() {
        toggleAllCheckbox.checked = getStoredArmoryAll();
        renderTableBody();
      },
    };
  }

  /**
   * Build Footer Section
   * @param {HTMLElement} footer
   * @param {object} data
   */
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

    const genDate = data.generatedAt ? data.generatedAt.slice(0, 10) : '2026-10-05';
    p1.appendChild(document.createTextNode(genDate));
    footer.appendChild(p1);

    const p2 = el('p', null, 'Fan project, not affiliated with Iron Gate.');
    footer.appendChild(p2);

    const pSupport = el('p', 'support');
    const spanText = el('span');
    const strong = el('strong', null, 'Free, ad-free and made in my spare time.');
    spanText.appendChild(strong);
    spanText.appendChild(document.createTextNode(' If it helped your run, you can buy me a coffee.'));
    pSupport.appendChild(spanText);

    const aKofi = el('a');
    aKofi.href = 'https://ko-fi.com/N2A528ACE3';
    aKofi.target = '_blank';
    aKofi.rel = 'noopener noreferrer';

    const imgKofi = document.createElement('img');
    imgKofi.src = '/support/kofi.png';
    imgKofi.alt = 'Buy Me a Coffee at ko-fi.com';
    imgKofi.width = 143;
    imgKofi.height = 36;
    imgKofi.loading = 'lazy';
    aKofi.appendChild(imgKofi);

    pSupport.appendChild(aKofi);
    footer.appendChild(pSupport);
  }

  /**
   * Main App Initialization
   */
  function initApp() {
    const data = window.VC_DATA;
    if (!data || !data.biomes) {
      const container = document.getElementById('biomes-container');
      if (container) {
        container.appendChild(el('p', 'error-msg', 'Data could not be loaded. Please ensure data/data.js is present.'));
      }
      return;
    }

    // Build "Your character" panel (VC-5)
    buildCharacterPanel(document.getElementById('character-section'), playerFirstVisit);

    // Build Legend
    buildLegend(document.getElementById('legend-section'));

    // Build Footer
    buildFooter(document.getElementById('page-footer'), data);

    // Build Armory Section (VC-6)
    const armoryContainer = document.getElementById('armory-section');
    if (armoryContainer) {
      armoryController = buildArmorySection(armoryContainer, data);
    }

    const biomesContainer = document.getElementById('biomes-container');
    if (!biomesContainer) return;

    // Read stored open biomes from localStorage
    const savedOpenBiomes = new Set(getStoredOpenBiomes());

    // Sort biomes by order
    const sortedBiomes = [...data.biomes].sort((a, b) => a.order - b.order);

    // Build biomes accordion
    sortedBiomes.forEach(biome => {
      const card = el('section', 'biome-card');
      card.dataset.biomeId = biome.id;

      // Calculate total creatures
      const creaturesCount = Object.values(biome.creatures || {}).flat().length;

      // Check if previously open
      const isOpenInitial = savedOpenBiomes.has(biome.id);

      // Header button
      const headerBtn = el('button', 'biome-header');
      headerBtn.type = 'button';
      headerBtn.setAttribute('aria-expanded', String(isOpenInitial));
      headerBtn.setAttribute('aria-controls', 'biome-content-' + biome.id);
      headerBtn.id = 'biome-header-' + biome.id;

      // Biome image background
      if (biome.image) {
        headerBtn.style.backgroundImage = 'url("' + biome.image + '")';
      }

      const headerContent = el('div', 'biome-header-content');
      const orderBadge = el('span', 'biome-order-badge', 'Biome ' + biome.order);
      const nameHeading = el('span', 'biome-name', biome.name);
      const countBadge = el('span', 'biome-count-badge', creaturesCount + (creaturesCount === 1 ? ' creature' : ' creatures'));

      headerContent.appendChild(orderBadge);
      headerContent.appendChild(nameHeading);
      headerContent.appendChild(countBadge);

      const chevron = el('span', 'biome-chevron', '▼');
      chevron.setAttribute('aria-hidden', 'true');

      headerBtn.appendChild(headerContent);
      headerBtn.appendChild(chevron);

      // Content wrapper for smooth animation
      const contentWrapper = el('div', 'biome-content-wrapper' + (isOpenInitial ? ' open' : ''));
      contentWrapper.id = 'biome-content-' + biome.id;
      contentWrapper.setAttribute('role', 'region');
      contentWrapper.setAttribute('aria-labelledby', 'biome-header-' + biome.id);

      if (isOpenInitial) {
        renderBiomeContent(biome, contentWrapper, data);
      } else {
        contentWrapper.setAttribute('inert', '');
      }

      // Accordion toggle click handler
      headerBtn.addEventListener('click', function () {
        const isExpanded = headerBtn.getAttribute('aria-expanded') === 'true';
        const nextState = !isExpanded;
        headerBtn.setAttribute('aria-expanded', String(nextState));
        if (nextState) {
          renderBiomeContent(biome, contentWrapper, data);
          contentWrapper.removeAttribute('inert');
          contentWrapper.classList.add('open');
          // Apply current search / kind filter to newly opened biome
          const searchInput = document.getElementById('creature-search');
          const searchQuery = searchInput ? searchInput.value.trim().toLowerCase() : '';
          const activeFilterBtn = document.querySelector('.filter-btn.active');
          const kindFilter = activeFilterBtn ? activeFilterBtn.dataset.kind : 'all';
          applyFiltersToBiome(card, searchQuery, kindFilter);
        } else {
          contentWrapper.setAttribute('inert', '');
          contentWrapper.classList.remove('open');
        }

        // Save open biomes in localStorage
        const currentlyOpen = Array.from(document.querySelectorAll('.biome-card'))
          .filter(c => c.querySelector('.biome-header[aria-expanded="true"]'))
          .map(c => c.dataset.biomeId);
        setStoredOpenBiomes(currentlyOpen);
        if (armoryController) armoryController.refresh();
      });

      card.appendChild(headerBtn);
      card.appendChild(contentWrapper);
      biomesContainer.appendChild(card);

      if (isOpenInitial) {
        applyFiltersToBiome(card, '', 'all');
      }
    });

    // Search Box Listener
    const searchInput = document.getElementById('creature-search');
    if (searchInput) {
      searchInput.addEventListener('input', applyFiltersToAllOpenBiomes);
    }

    // Kind Filter Buttons
    const filterButtons = document.querySelectorAll('.kind-filter .filter-btn');
    filterButtons.forEach(btn => {
      btn.addEventListener('click', function () {
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        applyFiltersToAllOpenBiomes();
      });
    });

    // Collapse All Button
    const collapseAllBtn = document.getElementById('btn-collapse-all');
    if (collapseAllBtn) {
      collapseAllBtn.addEventListener('click', function () {
        const allCards = document.querySelectorAll('.biome-card');
        allCards.forEach(card => {
          const headerBtn = card.querySelector('.biome-header');
          const contentWrapper = card.querySelector('.biome-content-wrapper');
          if (headerBtn) headerBtn.setAttribute('aria-expanded', 'false');
          if (contentWrapper) {
            contentWrapper.classList.remove('open');
            contentWrapper.setAttribute('inert', '');
          }
        });
        setStoredOpenBiomes([]);
        if (armoryController) armoryController.refresh();
      });
    }

    // Reset Spoiler Progress Button
    const resetProgressBtn = document.getElementById('btn-reset-progress');
    if (resetProgressBtn) {
      resetProgressBtn.addEventListener('click', function () {
        const allCards = document.querySelectorAll('.biome-card');
        allCards.forEach(card => {
          const headerBtn = card.querySelector('.biome-header');
          const contentWrapper = card.querySelector('.biome-content-wrapper');
          if (headerBtn) headerBtn.setAttribute('aria-expanded', 'false');
          if (contentWrapper) {
            contentWrapper.classList.remove('open');
            contentWrapper.setAttribute('inert', '');
          }
        });
        clearStoredOpenBiomes();
        if (armoryController) armoryController.refresh();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();
