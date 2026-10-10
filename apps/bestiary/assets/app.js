import './rank.js';
import { PLAYER_STORAGE_KEY, defaultPlayer, sanitizePlayer, readPlayerState } from '../../../shared/player/core.js';

'use strict';

(function () {
  const t = (source, values) => VCI18n.t(VC_MESSAGES, source, values);
  const tn = (key, count, values) => VCI18n.tn(globalThis.VC_MESSAGES, key, count, values);
  const entityName = entity => VCI18n.name(entity);
  const biomeName = biome => entityName(biome);
  const normalizeSearch = value => value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  const gameName = name => {
    const data = window.VC_DATA;
    const entity = [...Object.values(data?.items || {}), ...Object.values(data?.weapons || {}),
      ...Object.values(data?.creatures || {}), ...(data?.armor || []).flatMap(a => [a, ...a.pieces])]
      .find(e => e.name.toLowerCase() === name.toLowerCase());
    return entity ? entityName(entity) : name;
  };
  function setLabel(id) {
    const ids = { root: 'root-set', lox: 'lox-fur-set', fenris: 'fenris-set', bear: 'bear-set', vanguard: 'vanguard-set' };
    const armor = window.VC_DATA?.armor?.find(a => a.id === ids[id]);
    const bonuses = window.VCRank.SET_BONUSES[id];
    const terms = bonuses.type === 'skill'
      ? ['+' + bonuses.amount + ' ' + t(window.VCRank.SKILLS.find(s => s.id === bonuses.skill)?.name || bonuses.skill)]
      : ['+' + Math.round(bonuses.amount * 100) + ' % ' + bonuses.types.map(capitalize).join('/')];
    return (armor ? entityName(armor) : SET_LABELS[id].split(' (')[0]) + ' (' + terms.join(', ') + ')';
  }
  const noteText = note => String(note).replace(/Sneak|Stagger/g, word => t(word));
  let modalWeapon = null;

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
      element.textContent = t(String(text));
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
    return t(str.charAt(0).toUpperCase() + str.slice(1));
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
      ph.setAttribute('aria-label', alt || t('Image'));
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
        ph.setAttribute('aria-label', alt || t('Image'));
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
    return VCProgress.revealedBiomes(window.VC_DATA.biomes);
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

  const loadedPlayerState = window.VCRank ? readPlayerState() : null;
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
      const playersStr = tn('{count} players', player.players, { count: player.players });
      const qualityStr = player.quality === 'max' ? t('Max quality') : t('Quality {level}', { level: player.quality });
      const rankByStr = player.rankBy === 'hit' ? t('Per hit') : t('DPS');
      summaryEl.textContent = t('Your character · avg skill {skill} · {difficulty} · {players} · {quality} · {ranking}', { skill: avg, difficulty: t(diffLabel ? diffLabel.short : 'Normal'), players: playersStr, quality: qualityStr, ranking: rankByStr });
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
    setAllRange.setAttribute('aria-label', t('Set all skills value'));
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
      range.setAttribute('aria-label', t('{skill} skill', { skill: t(s.name) }));

      const numBox = el('div', 'skill-number-box');
      const number = document.createElement('input');
      number.type = 'number';
      number.min = '0';
      number.max = '100';
      number.value = String(player.skills[s.id]);
      number.className = 'skill-number';
      number.id = 'skill-number-' + s.id;
      number.setAttribute('aria-label', t('{skill} skill level', { skill: t(s.name) }));
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
      label.appendChild(document.createTextNode(setLabel(setId)));
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
    difficultySelect.setAttribute('aria-label', t('Combat difficulty'));
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
    playersSelect.setAttribute('aria-label', t('Players nearby'));
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

    // Weapons (upgrade level + rank by)
    const weaponsBlock = el('div', 'character-block');
    weaponsBlock.appendChild(el('span', 'character-block-title', 'Weapons'));
    const weaponsRow = el('div', 'character-fields-row');

    const rankGroup = el('div', 'char-field-group');
    rankGroup.appendChild(el('span', 'char-field-label', 'Rank by'));
    const rankToggle = el('div', 'char-rank-toggle');
    rankToggle.setAttribute('role', 'radiogroup');
    rankToggle.setAttribute('aria-label', t('Rank by'));
    const dpsBtn = el('button', 'rank-toggle-btn' + (player.rankBy !== 'hit' ? ' active' : ''), 'Damage per second');
    dpsBtn.type = 'button';
    const hitBtn = el('button', 'rank-toggle-btn' + (player.rankBy === 'hit' ? ' active' : ''), 'Damage per hit');
    hitBtn.type = 'button';

    updateRankButtons = () => {
      dpsBtn.className = 'rank-toggle-btn' + (player.rankBy !== 'hit' ? ' active' : '');
      hitBtn.className = 'rank-toggle-btn' + (player.rankBy === 'hit' ? ' active' : '');
    };

    dpsBtn.addEventListener('click', () => {
      player.rankBy = 'dps';
      updateRankButtons();
      onPlayerChange();
    });
    hitBtn.addEventListener('click', () => {
      player.rankBy = 'hit';
      updateRankButtons();
      onPlayerChange();
    });

    rankToggle.appendChild(dpsBtn);
    rankToggle.appendChild(hitBtn);
    rankGroup.appendChild(rankToggle);
    weaponsRow.appendChild(rankGroup);

    const qualityGroup = el('div', 'char-field-group');
    qualityGroup.appendChild(el('span', 'char-field-label', 'Upgrade level'));
    qualitySelect = document.createElement('select');
    qualitySelect.className = 'char-select';
    qualitySelect.setAttribute('aria-label', t('Upgrade level'));
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
    sneakLabel.appendChild(document.createTextNode(t('Sneak attack (backstab)')));
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
    staggeredLabel.appendChild(document.createTextNode(t('Enemy staggered (×2)')));
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
      player.rankBy = fresh.rankBy || 'dps';
      syncAllInputs();
      onPlayerChange();
    });
    actions.appendChild(resetBtn);
    const shareBtn = el('button', 'action-btn', 'Share my profile');
    shareBtn.type = 'button';
    const shareResult = el('div', 'profile-share-result');
    shareResult.hidden = true;
    shareBtn.addEventListener('click', async () => {
      const url = new URL(window.location.href);
      const params = new URLSearchParams();
      params.set('player', window.VCExtras.encodeProfile(sanitizePlayer(player)));
      const creatureId = new URLSearchParams(window.location.hash.slice(1)).get('c');
      if (creatureId) params.set('c', creatureId);
      url.hash = params.toString();
      shareResult.replaceChildren();
      shareResult.hidden = false;
      const label = el('label', 'extra-note', 'Profile link');
      const input = el('input', 'profile-link-input');
      input.type = 'text';
      input.readOnly = true;
      input.value = url.href;
      label.appendChild(input);
      shareResult.appendChild(label);
      const status = el('p', 'extra-note');
      status.setAttribute('role', 'status');
      shareResult.appendChild(status);
      try {
        await navigator.clipboard.writeText(url.href);
        status.textContent = t('Link copied');
      } catch {
        status.textContent = t('Copy this link to share your profile.');
        input.focus();
        input.select();
      }
    });
    actions.appendChild(shareBtn);
    body.appendChild(actions);
    body.appendChild(shareResult);

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

    modalWeapon = weapon;
    container.textContent = '';

    // Header (icon + title + close button)
    const header = el('div', 'modal-header');
    const icon = createImage(weapon.image, entityName(weapon), 'modal-icon', entityName(weapon).charAt(0));
    header.appendChild(icon);

    const titleBox = el('div', 'modal-title-box');
    titleBox.appendChild(el('h3', 'modal-title', entityName(weapon)));

    const typeStr = [capitalize((weapon.type || weapon.category || '').toLowerCase().replace(/\s+(1h|2h|dw)$/, '')), t(weapon.hands || '')].filter(Boolean).join(' · ');
    titleBox.appendChild(el('div', 'modal-subtitle', typeStr));
    header.appendChild(titleBox);

    const closeBtn = el('button', 'modal-close-btn', '✕');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', t('Close dialog'));
    closeBtn.addEventListener('click', () => dialog.close());
    header.appendChild(closeBtn);

    container.appendChild(header);

    // Grid of stats
    const statsGrid = el('div', 'modal-grid');

    // Tier & Biome
    const biomeObj = data.biomes.find(b => b.id === weapon.biome);
    const biomeLabel = biomeObj ? biomeName(biomeObj) : (weapon.biome ? capitalize(weapon.biome) : t('Unknown'));
    const tierBiome = el('div', 'modal-field');
    tierBiome.appendChild(el('span', 'modal-field-title', 'Tier & Biome'));
    tierBiome.appendChild(el('span', 'modal-field-val', (weapon.tier ? t('Tier {tier}', { tier: weapon.tier }) : t('Special')) + ' · ' + biomeLabel));
    statsGrid.appendChild(tierBiome);

    // Max Quality
    const qualityField = el('div', 'modal-field');
    qualityField.appendChild(el('span', 'modal-field-title', 'Max Quality'));
    qualityField.appendChild(el('span', 'modal-field-val', weapon.maxQuality ? t('Level {level}', { level: weapon.maxQuality }) : t('Level {level}', { level: 1 })));
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
      const lvlStr = weapon.stationLevel ? ' (' + t('Level {level}', { level: weapon.stationLevel }) + ')' : '';
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
      const matText = weapon.materials.map(m => gameName(m.name) + (m.amount ? ' ×' + m.amount : '')).join(', ');
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

    if (!dialog.open) dialog.showModal();
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
   * @param {object} [recItem]
   * @returns {HTMLElement}
   */
  function createWeaponRowBtn(weaponId, score, notes, sublabel, data, recItem) {
    const weapon = data.weapons[weaponId];
    const btn = el('button', 'weapon-btn');
    btn.type = 'button';

    const left = el('div', 'weapon-btn-left');
    const iconSrc = weapon ? weapon.image : null;
    const weaponName = weapon ? entityName(weapon) : weaponId;
    left.appendChild(createImage(iconSrc, weaponName, 'weapon-btn-icon', weaponName.charAt(0)));

    const nameText = sublabel ? weaponName + ' (' + t(sublabel) + ')' : weaponName;
    left.appendChild(el('span', 'weapon-btn-name', nameText));

    if (recItem && recItem.isSecondary) {
      left.appendChild(el('span', 'badge badge-secondary', t('secondary')));
    }
    btn.appendChild(left);

    const right = el('div', 'weapon-btn-right');
    if (notes && notes.length > 0) {
      const notesDiv = el('div', 'rec-notes');
      notes.forEach(n => {
        notesDiv.appendChild(el('span', 'rec-note-chip', noteText(n)));
      });
      right.appendChild(notesDiv);
    }

    if ((score !== null && score !== undefined) || recItem) {
      const scoreBox = el('div', 'weapon-score-box');
      const rankBy = playerState?.rankBy === 'hit' ? 'hit' : 'dps';

      // 1. Large number according to rankBy (187/s or 120)
      let mainScoreText = '';
      if (rankBy === 'hit') {
        const val = recItem?.perHit != null ? Math.round(recItem.perHit) : Math.round(score || 0);
        mainScoreText = String(val);
      } else {
        const val = recItem?.dps != null ? Math.round(recItem.dps) : Math.round(score || 0);
        mainScoreText = val + '/s';
      }
      const scoreEl = el('span', 'weapon-score', mainScoreText);
      if (recItem && recItem.min !== undefined && recItem.max !== undefined) {
        scoreEl.title = recItem.min + '–' + recItem.max + ' ' + t('Per hit');
      }
      scoreBox.appendChild(scoreEl);

      // 2. Subline: "per hit 120 · cycle 2.5 s" (with estimate icon if confidence === 'estimate')
      if (recItem && recItem.perHit != null && recItem.cycleSeconds != null) {
        const subline = el('div', 'weapon-subline');
        const hitVal = Math.round(recItem.perHit);
        const cycleVal = Number(recItem.cycleSeconds.toFixed(2));
        subline.appendChild(document.createTextNode(t('per hit {damage} · cycle {seconds} s', { damage: hitVal, seconds: cycleVal })));
        if (recItem.confidence === 'estimate') {
          const estSpan = el('span', 'timing-estimate', ' ~');
          estSpan.title = t('estimated timing');
          subline.appendChild(estSpan);
        }
        scoreBox.appendChild(subline);
      }

      // 3. Hits / TTK: "≈ N hits · ≈ X s"
      if (recItem && recItem.hits != null) {
        let hitsText = tn('≈ {count} hits', recItem.hits, { count: recItem.hits });
        if (recItem.timeToKill != null && Number.isFinite(recItem.timeToKill)) {
          const ttkVal = recItem.timeToKill < 10 ? recItem.timeToKill.toFixed(1) : Math.round(recItem.timeToKill);
          hitsText += ' · ≈ ' + ttkVal + ' s';
        }
        scoreBox.appendChild(el('span', 'weapon-hits', hitsText));
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
    card.dataset.creatureName = normalizeSearch(creature.name);
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
      imageBox.appendChild(createImage(imgSrc, entityName(creature), 'card-image', entityName(creature).charAt(0)));
    };
    updateImage(starsList[currentStarIndex]);

    const headerInfo = el('div', 'card-header-info');

    // Title Row
    const titleRow = el('div', 'card-title-row');
    const nameEl = el('h4', 'card-name', entityName(creature));
    titleRow.appendChild(nameEl);
    const creatureLink = el('a', 'creature-link', '↗');
    creatureLink.href = '#c=' + encodeURIComponent(creature.id);
    creatureLink.title = t('Link to creature');
    creatureLink.setAttribute('aria-label', t('Link to creature'));
    creatureLink.addEventListener('click', () => {
      if (window.location.hash === creatureLink.getAttribute('href')) {
        window.dispatchEvent(new Event('hashchange'));
      }
    });
    titleRow.appendChild(creatureLink);
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
      badgesRow.appendChild(el('span', 'badge badge-always-stars', t('Always {stars}', { stars: getStarSymbol(starsList[0].star) })));
    }
    if (badgesRow.children.length > 0) {
      headerInfo.appendChild(badgesRow);
    }

    // Star Selector (if hasStars)
    if (creature.hasStars && starsList.length > 1) {
      const starSelector = el('div', 'star-selector');
      starSelector.setAttribute('role', 'group');
      starSelector.setAttribute('aria-label', t('Select star level'));

      starsList.forEach((starObj, idx) => {
        const starBtn = el('button', 'star-btn' + (idx === 0 ? ' active' : ''), getStarSymbol(starObj.star));
        starBtn.type = 'button';
        starBtn.setAttribute('aria-label', tn('{count} stars', starObj.star, { count: starObj.star }));
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
        const label = el('span', 'weak-point-label', t('Weak point: {part} — ', { part: t(wp.part) }));
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
        const tip = rec.tipData;
        let text = t('No recommended weapons found for this biome.');
        if (tip?.kind === 'weakness') text = t('{weakness} to {type} (×{multiplier}): {weapon} hits for {damage} effective.', {
          weakness: t(tip.multiplier === 2 ? 'Very Weak' : 'Weak'), type: capitalize(tip.type),
          multiplier: tip.multiplier, weapon: gameName(tip.weaponName), damage: tip.score,
        });
        if (tip?.kind === 'raw') text = t('No elemental weakness — best raw option: {weapon} ({damage}).', { weapon: gameName(tip.weaponName), damage: tip.score });
        if (tip?.immuneTypes?.length) text += ' ' + t('Immune to {types}.', { types: tip.immuneTypes.map(capitalize).join(', ') });
        recBox.appendChild(el('div', 'rec-tip', text));
      }

      const recGroups = el('div', 'rec-groups');
      const bowWeapon = rec.bow ? data.weapons[rec.bow.weapon] : null;
      const xbowWeapon = rec.crossbow ? data.weapons[rec.crossbow.weapon] : null;

      // 1. Melee (up to 3 rows, only if not ranged only)
      if (!isRangedOnly && rec.melee && rec.melee.length > 0) {
        const meleeGroup = el('div', 'rec-group');
        meleeGroup.appendChild(el('span', 'rec-group-title', 'Melee'));
        rec.melee.slice(0, 3).forEach(m => {
          meleeGroup.appendChild(createWeaponRowBtn(m.weapon, m.score, filterWeaponNotes(m.notes, creature), null, data, m));
        });
        recGroups.appendChild(meleeGroup);
      }

      // 2. Bow + arrows
      if (rec.bow || (rec.arrows && rec.arrows.length > 0)) {
        const bowGroup = el('div', 'rec-group');
        const bowName = bowWeapon ? entityName(bowWeapon) : t('Bow');
        bowGroup.appendChild(el('span', 'rec-group-title', t('Bow + Arrows ({name})', { name: bowName })));

        if (rec.arrows && rec.arrows.length > 0) {
          rec.arrows.forEach(arr => {
            bowGroup.appendChild(createWeaponRowBtn(arr.weapon, arr.score, filterWeaponNotes(arr.notes, creature), null, data, arr));
          });
        } else if (rec.bow) {
          bowGroup.appendChild(createWeaponRowBtn(rec.bow.weapon, rec.bow.score, filterWeaponNotes(rec.bow.notes, creature), null, data, rec.bow));
        }
        recGroups.appendChild(bowGroup);
      }

      // 3. Crossbow + bolts
      if (rec.crossbow || (rec.bolts && rec.bolts.length > 0)) {
        const xbowGroup = el('div', 'rec-group');
        const xbowName = xbowWeapon ? entityName(xbowWeapon) : t('Crossbow');
        xbowGroup.appendChild(el('span', 'rec-group-title', t('Crossbow + Bolts ({name})', { name: xbowName })));

        if (rec.bolts && rec.bolts.length > 0) {
          rec.bolts.forEach(bolt => {
            xbowGroup.appendChild(createWeaponRowBtn(bolt.weapon, bolt.score, filterWeaponNotes(bolt.notes, creature), null, data, bolt));
          });
        } else if (rec.crossbow) {
          xbowGroup.appendChild(createWeaponRowBtn(rec.crossbow.weapon, rec.crossbow.score, filterWeaponNotes(rec.crossbow.notes, creature), null, data, rec.crossbow));
        }
        recGroups.appendChild(xbowGroup);
      }

      // 4. Magic (only if not ranged only)
      if (!isRangedOnly && rec.magic) {
        const magicGroup = el('div', 'rec-group');
        magicGroup.appendChild(el('span', 'rec-group-title', 'Magic'));
        magicGroup.appendChild(createWeaponRowBtn(rec.magic.weapon, rec.magic.score, filterWeaponNotes(rec.magic.notes, creature), null, data, rec.magic));
        recGroups.appendChild(magicGroup);
      }

      // 5. Bomb (only if not ranged only)
      if (!isRangedOnly && rec.bomb) {
        const bombGroup = el('div', 'rec-group');
        bombGroup.appendChild(el('span', 'rec-group-title', 'Bomb'));
        bombGroup.appendChild(createWeaponRowBtn(rec.bomb.weapon, rec.bomb.score, filterWeaponNotes(rec.bomb.notes, creature), null, data, rec.bomb));
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
        healthValue.textContent = Number(hpVal).toLocaleString(VCI18n.locale());
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

    if (creature.kind === 'boss') {
      const expeditionLink = el('a', 'card-expedition-link', t('Prepare for this fight → Expedition'));
      expeditionLink.href = '/expedition/#boss=' + encodeURIComponent(creature.id);
      card.appendChild(expeditionLink);
    }

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
        const otherImm = el('div', 'other-immunities', t('Also immune: {types}', { types: creature.otherImmunities.map(tier => t(tier)).join(', ') }));
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

    if (creature.calculatorSlug) {
      const calcLinkPara = el('p', 'card-calculator-link');
      const calcLink = el('a', 'card-calc-link', 'Compare all weapons in the Damage Calculator →');
      calcLink.href = '../damage-calculator/?biome=' + encodeURIComponent(biome.id) +
        '&target=' + encodeURIComponent(creature.calculatorSlug);
      calcLinkPara.appendChild(calcLink);
      card.appendChild(calcLinkPara);
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
        alsoBox.appendChild(document.createTextNode(earlierBiomes.map(b => biomeName(b)).join(', ')));
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
    const dropItems = creature.dropLinks ?? (creature.drops ? creature.drops.map(d => ({ name: d, itemId: null })) : null);
    if (dropItems && dropItems.length > 0) {
      const row = el('div', 'details-row');
      row.appendChild(el('span', 'details-key', 'Drops'));
      const dropsVal = el('span', 'details-val');
      dropItems.forEach((drop, idx) => {
        if (idx > 0) dropsVal.appendChild(document.createTextNode(', '));
        const name = drop.name ?? drop;
        if (drop.itemId) {
          const a = el('a', 'item-link', gameName(name));
          a.href = `/items/#item=${encodeURIComponent(drop.itemId)}`;
          dropsVal.appendChild(a);
        } else {
          dropsVal.appendChild(document.createTextNode(gameName(name)));
        }
      });
      row.appendChild(dropsVal);
      detailsContent.appendChild(row);
    }

    // Trophy
    if (creature.trophy?.name) {
      const row = el('div', 'details-row');
      row.appendChild(el('span', 'details-key', 'Trophy'));
      const trophyVal = el('div', 'trophy-val');
      if (creature.trophy.image) {
        trophyVal.appendChild(createImage(creature.trophy.image, creature.trophy.name, 'trophy-img', 'T'));
      }
      const trophyText = el('div', 'details-val');
      if (creature.trophy.itemId) {
        const trophyLink = el('a', 'item-link', gameName(creature.trophy.name));
        trophyLink.href = `/items/#item=${encodeURIComponent(creature.trophy.itemId)}`;
        trophyText.appendChild(trophyLink);
      } else {
        trophyText.appendChild(document.createTextNode(gameName(creature.trophy.name)));
      }
      if (creature.trophy.dropChance !== null && creature.trophy.dropChance !== undefined) {
        trophyText.appendChild(el('div', 'extra-note', t('Drop chance: {chance}%', {
          chance: creature.trophy.dropChance.toLocaleString(VCI18n.locale()),
        })));
      }
      if (creature.trophy.usage?.length) {
        const usage = creature.trophy.usage.map(value => {
          const summon = value.match(/^(?:Re-summoning|Summoning) (.+)$/);
          return summon ? t('Summon {name}', { name: summon[1] }) : value;
        });
        trophyText.appendChild(el('div', 'extra-note', t('Used for: {usage}', { usage: usage.join(', ') })));
      }
      trophyVal.appendChild(trophyText);
      row.appendChild(trophyVal);
      detailsContent.appendChild(row);
    }

    if (creature.taming) {
      const row = el('div', 'details-row');
      row.appendChild(el('span', 'details-key', 'Taming'));
      const value = el('div', 'details-val');
      value.appendChild(el('div', 'extra-note', 'Food'));
      const foods = el('div', 'taming-foods');
      creature.taming.foods.forEach(name => {
        const food = el('span', 'taming-food');
        const item = Object.values(data.items || {}).find(item => item.name.toLowerCase() === name.toLowerCase());
        if (item?.image) food.appendChild(createImage('../smithy/' + item.image, name, 'trophy-img'));
        food.appendChild(document.createTextNode(name));
        foods.appendChild(food);
      });
      value.appendChild(foods);
      value.appendChild(el('div', 'extra-note', creature.taming.eatingRange === null
        ? t('Eating range: unknown')
        : t('Eating range: {range} m', { range: creature.taming.eatingRange.toLocaleString(VCI18n.locale()) })));
      if (creature.taming.tameTime !== undefined) {
        value.appendChild(el('div', 'extra-note', tn('Taming time: {minutes} min', creature.taming.tameTime, { minutes: creature.taming.tameTime })));
      }
      row.appendChild(value);
      detailsContent.appendChild(row);
    }

    if (creature.raids?.length) {
      const row = el('div', 'details-row raid-row');
      const refreshRaids = () => {
        const openBiomes = new Set(getStoredOpenBiomes());
        const names = [...new Set(creature.raids.map(raid => window.VCExtras.raidIsHidden(raid, data.creatures, openBiomes)
          ? t('a later raid') : raid.name))];
        row.textContent = t('Appears in raids: {raids}', { raids: names.join('; ') });
      };
      card._refreshRaids = refreshRaids;
      refreshRaids();
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
    wrapper.dataset.creatureName = normalizeSearch(creature.name);
    wrapper.dataset.creatureKind = 'fish';

    const tile = el('div', 'fish-tile');
    tile.setAttribute('role', 'button');
    tile.setAttribute('tabindex', '0');
    tile.setAttribute('aria-expanded', 'false');
    tile.setAttribute('aria-label', t('{name}, click to toggle details', { name: entityName(creature) }));

    const star0 = (creature.stars && creature.stars[0]) || {};
    const thumb = createImage(star0.image, entityName(creature), 'fish-thumb', entityName(creature).charAt(0));
    tile.appendChild(thumb);

    const info = el('div', 'fish-info');
    info.appendChild(el('span', 'fish-name', entityName(creature)));
    const hpStr = star0.health !== null && star0.health !== undefined ? star0.health + ' ' + t('HP') : '— ' + t('HP');
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
  /**
   * Compute average per-hit damage and attack stats (DPS, cycle) for a weapon with player settings without creature modifiers.
   * For arrows and bolts, pairs with the best available launcher (bow/crossbow) of equal or lower tier.
   * @param {object} weapon
   * @param {object} data
   * @param {object} player
   * @returns {object|null}
   */
  function computeWeaponStats(weapon, data, player) {
    if (!window.VCRank || !player || !weapon) return null;
    const basePlayer = { ...player, sneak: false, staggered: false };
    const allWeapons = data?.weapons ? Object.values(data.weapons) : [];

    let launcher = weapon;
    let ammo = null;

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
        launcher = bows[0];
        ammo = weapon;
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
        launcher = crossbows[0];
        ammo = weapon;
      }
    }

    const hit = window.VCRank.perHit(launcher, ammo, null, basePlayer);
    const stats = window.VCRank.attackStats(launcher, ammo, null, basePlayer, 'primary');

    return {
      hit,
      stats,
      avg: hit ? Math.round(hit.avg) : 0,
      dps: stats ? Math.round(stats.dps) : 0,
      cycleSeconds: stats ? stats.cycleSeconds : null,
      confidence: stats?.confidence || 'wiki',
    };
  }

  function computeWeaponAvgHit(weapon, data, player) {
    const s = computeWeaponStats(weapon, data, player);
    return s ? s.hit : null;
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
    const summary = el('summary', null, tn('Weapons & ammo from this biome ({count})', weaponsList.length, { count: weaponsList.length }));
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
    yourAvgTh.title = t('Average per-hit damage with your skills, difficulty and upgrade level (no creature modifiers)');
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
        itemBox.appendChild(createImage(weapon.image, entityName(weapon), 'weapon-cell-icon', entityName(weapon).charAt(0)));
        itemBox.appendChild(el('span', 'weapon-cell-name', entityName(weapon)));
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
          matTd.textContent = weapon.materials.map(m => gameName(m.name) + (m.amount ? ' ×' + m.amount : '')).join(', ');
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
            ? Math.round(hit.min) + '–' + Math.round(hit.max) + ' ' + t('Per hit')
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
      bossTitle.textContent = tn('Bosses ({count})', bossesList.length);
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
      hostileTitle.textContent = tn('Hostile ({count})', hostileList.length);
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
      passiveTitle.textContent = tn('Passive ({count})', passiveList.length);
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
      fishTitle.textContent = tn('Fish ({count})', fishList.length);
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
    const searchQuery = searchInput ? normalizeSearch(searchInput.value.trim()) : '';

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
      { mult: 2, label: '×2 ' + t('Very Weak'), cls: 'mod-chip-2' },
      { mult: 1.5, label: '×1.5 ' + t('Weak'), cls: 'mod-chip-1_5' },
      { mult: 1.25, label: '×1.25 ' + t('Slightly Weak'), cls: 'mod-chip-1_25' },
      { mult: 1, label: '×1 ' + t('Neutral'), cls: 'mod-chip-1' },
      { mult: 0.75, label: '×0.75 ' + t('Slightly Resistant'), cls: 'mod-chip-0_75' },
      { mult: 0.5, label: '×0.5 ' + t('Resistant'), cls: 'mod-chip-0_5' },
      { mult: 0.25, label: '×0.25 ' + t('Very Resistant'), cls: 'mod-chip-0_25' },
      { mult: 0, label: '×0 ' + t('Immune'), cls: 'mod-chip-0' }
    ];
    tiers.forEach(item => {
      modItems.appendChild(el('span', 'mod-chip ' + item.cls, item.label));
    });
    modGroup.appendChild(modItems);
    body.appendChild(modGroup);

    // Note
    const note = el('p', 'legend-note', 'Damage = average per hit with your skills (primary attack). Combo finisher ×2, secondary attacks, Dvergr buff and DoT ticking are not included.');
    body.appendChild(note);

    const calcLinkPara = el('p', 'legend-calculator-link');
    const calcLink = el('a', 'legend-link', 'Detailed breakdown → Damage Calculator');
    calcLink.href = '../damage-calculator/';
    calcLinkPara.appendChild(calcLink);
    body.appendChild(calcLinkPara);

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
  function buildArmorySection(container, data, state = {}) {
    if (!container || !data || !data.weapons) return null;
    container.textContent = '';

    // Header
    const header = el('div', 'armory-header');
    header.appendChild(el('h2', 'armory-title', 'Armory'));
    header.appendChild(el('p', 'armory-subtitle', 'Every weapon and ammo, with your damage.'));
    container.appendChild(header);

    // State
    let sortColumn = state.sortColumn ?? 'yourDps';
    let sortDirection = state.sortDirection ?? 'desc';
    let searchQuery = state.searchQuery ?? '';
    let selectedCategory = state.selectedCategory ?? 'all';
    let selectedDamageType = state.selectedDamageType ?? null;

    // Controls
    const controls = el('div', 'armory-controls');

    // Controls Row 1: Search, Category select, Spoiler toggle
    const row1 = el('div', 'armory-controls-row');

    // Search box
    const searchBox = el('div', 'armory-search-box');
    const searchInput = el('input');
    searchInput.type = 'search';
    searchInput.id = 'armory-search';
    searchInput.value = searchQuery;
    searchInput.placeholder = t('Search weapons…');
    searchInput.setAttribute('aria-label', t('Search weapons by name'));
    searchBox.appendChild(searchInput);
    row1.appendChild(searchBox);

    // Category filter dropdown
    const categorySelect = el('select', 'armory-select');
    categorySelect.id = 'armory-category-filter';
    categorySelect.setAttribute('aria-label', t('Filter weapons by category'));

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
    categorySelect.value = selectedCategory;
    row1.appendChild(categorySelect);

    // Spoiler toggle
    const toggleLabel = el('label', 'armory-toggle-label');
    const toggleAllCheckbox = el('input');
    toggleAllCheckbox.type = 'checkbox';
    toggleAllCheckbox.id = 'armory-toggle-all';
    toggleAllCheckbox.checked = getStoredArmoryAll();
    toggleLabel.appendChild(toggleAllCheckbox);
    const spoilerText = el('span');
    toggleLabel.appendChild(spoilerText);
    const updateSpoilerLabel = () => {
      const active = toggleAllCheckbox.checked;
      spoilerText.textContent = t(active ? '⚠ All weapons shown — click to hide' : 'Show all weapons (spoilers)');
      toggleAllCheckbox.setAttribute('aria-pressed', String(active));
      toggleLabel.classList.toggle('spoilers-active', active);
    };
    updateSpoilerLabel();
    row1.appendChild(toggleLabel);
    const progressLink = el('a', 'armory-toggle-label', 'Track your progress →');
    progressLink.href = '../progress/';
    row1.appendChild(progressLink);

    controls.appendChild(row1);

    // Controls Row 2: Damage type chips
    const row2 = el('div', 'armory-controls-row');
    const damageChipsDiv = el('div', 'armory-damage-chips');
    damageChipsDiv.appendChild(el('span', 'armory-damage-label', 'Damage:'));

    const DAMAGE_CHIP_TYPES = ['fire', 'frost', 'lightning', 'poison', 'spirit', 'pierce', 'blunt', 'slash'];
    const chipButtons = [];

    DAMAGE_CHIP_TYPES.forEach(dt => {
      const chipBtn = el('button', 'armory-chip-btn' + (selectedDamageType === dt ? ' active' : ''), capitalize(dt));
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
      { key: 'yourDps', label: 'Your DPS', cls: 'sortable', title: 'Cycle DPS with your skills, difficulty, upgrade level and timing' },
      { key: 'cycle', label: 'Cycle', cls: 'sortable', title: 'Attack cycle duration in seconds' },
      { key: 'stamina', label: 'Stamina', cls: 'sortable' },
      { key: null, label: 'Backstab', cls: '' },
      { key: null, label: 'Materials', cls: '' },
    ];

    const sortThMap = {};

    headerCols.forEach(col => {
      const th = el('th', col.cls || null);
      if (col.title) th.title = t(col.title);

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
            sortDirection = (col.key === 'yourAvg' || col.key === 'yourDps') ? 'desc' : 'asc';
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
        th.textContent = t(col.label);
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

    function createWeaponRow(w, weaponStats) {
      const row = el('tr', 'armory-row');
      const hit = weaponStats?.hit || (weaponStats?.avg !== undefined ? weaponStats : null);

      // 1. Icon
      const iconTd = el('td', 'armory-col-icon');
      iconTd.appendChild(createImage(w.image, entityName(w), 'armory-weapon-icon', entityName(w).charAt(0)));
      row.appendChild(iconTd);

      // 2. Name
      const nameTd = el('td', 'armory-col-name', entityName(w));
      row.appendChild(nameTd);

      // 3. Category
      row.appendChild(el('td', null, capitalize(w.category)));

      // 4. Skill
      const skillText = w.skill ? capitalize(w.skill.replace('-', ' ')) : '—';
      row.appendChild(el('td', null, skillText));

      // 5. Biome (Tier)
      let biomeText = t('Special');
      if (w.biome) {
        const b = data.biomes?.find(x => x.id === w.biome);
        const bName = b ? biomeName(b) : capitalize(w.biome);
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
      if (hit && hit.avg !== undefined) {
        const avgVal = Math.round(hit.avg);
        avgTd.textContent = String(avgVal);
        avgTd.title = hit.min !== hit.max
          ? Math.round(hit.min) + '–' + Math.round(hit.max) + ' ' + t('Per hit')
          : String(avgVal);
      } else {
        avgTd.textContent = '—';
      }
      row.appendChild(avgTd);

      // 8. Your DPS
      const dpsTd = el('td', 'weapon-your-dps');
      if (weaponStats?.dps != null && weaponStats.dps > 0) {
        dpsTd.textContent = weaponStats.dps + '/s';
      } else {
        dpsTd.textContent = '—';
      }
      row.appendChild(dpsTd);

      // 9. Cycle
      const cycleTd = el('td', 'weapon-cycle');
      if (weaponStats?.cycleSeconds != null && weaponStats.cycleSeconds > 0) {
        const cycleStr = Number(weaponStats.cycleSeconds.toFixed(2)) + ' s';
        cycleTd.textContent = cycleStr;
        if (weaponStats.confidence === 'estimate') {
          const est = el('span', 'timing-estimate', ' ~');
          est.title = t('estimated timing');
          cycleTd.appendChild(est);
        }
      } else {
        cycleTd.textContent = '—';
      }
      row.appendChild(cycleTd);

      // 10. Stamina
      row.appendChild(el('td', null, w.stamina !== null && w.stamina !== undefined ? String(w.stamina) : '—'));

      // 11. Backstab
      const bsTd = el('td');
      if (w.backstab != null) {
        bsTd.textContent = w.backstab + '×';
      } else {
        const defVal = window.VCRank?.DEFAULT_BACKSTAB?.[w.category] ?? 3;
        bsTd.textContent = defVal + '× ';
        bsTd.appendChild(el('span', 'armory-backstab-default', '(default)'));
      }
      row.appendChild(bsTd);

      // 12. Materials
      const matTd = el('td', 'weapon-materials');
      if (w.materials && w.materials.length > 0) {
        matTd.textContent = w.materials.map(m => gameName(m.name) + (m.amount ? ' ×' + m.amount : '')).join(', ');
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
      td.colSpan = 12;
      td.textContent = tn('🔒 {count} weapons from {biome} — open the biome to reveal', count, { biome: biomeName(biome) });
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
        if (searchQuery && !normalizeSearch(w.name).includes(searchQuery)) continue;

        const weaponStats = computeWeaponStats(w, data, playerState);
        visible.push({
          weapon: w,
          stats: weaponStats,
          hit: weaponStats?.hit,
          avg: weaponStats?.avg || 0,
          dps: weaponStats?.dps || 0,
          cycle: weaponStats?.cycleSeconds || 0,
        });
      }

      if (sortColumn === 'biome') {
        const sortedBiomes = [...data.biomes].sort((a, b) => a.order - b.order);
        if (sortDirection === 'desc') sortedBiomes.reverse();

        // If desc, Special comes first when showAll is true
        if (showAll && sortDirection === 'desc') {
          const specialItems = visible.filter(it => !it.weapon.biome);
          specialItems.sort((a, b) => entityName(b.weapon).localeCompare(entityName(a.weapon)));
          specialItems.forEach(it => tbody.appendChild(createWeaponRow(it.weapon, it.stats)));
        }

        sortedBiomes.forEach(biome => {
          if (showAll || openBiomes.has(biome.id)) {
            const biomeItems = visible.filter(it => it.weapon.biome === biome.id);
            biomeItems.sort((a, b) => {
              return sortDirection === 'asc'
                ? entityName(a.weapon).localeCompare(entityName(b.weapon))
                : entityName(b.weapon).localeCompare(entityName(a.weapon));
            });
            biomeItems.forEach(it => tbody.appendChild(createWeaponRow(it.weapon, it.stats)));
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
          specialItems.sort((a, b) => entityName(a.weapon).localeCompare(entityName(b.weapon)));
          specialItems.forEach(it => tbody.appendChild(createWeaponRow(it.weapon, it.stats)));
        }
      } else {
        // Sorted by name, yourAvg, yourDps, cycle, or stamina
        visible.sort((a, b) => {
          if (sortColumn === 'name') {
            return sortDirection === 'asc'
              ? entityName(a.weapon).localeCompare(entityName(b.weapon))
              : entityName(b.weapon).localeCompare(entityName(a.weapon));
          }
          if (sortColumn === 'yourDps') {
            const diff = a.dps - b.dps;
            return sortDirection === 'asc'
              ? (diff || entityName(a.weapon).localeCompare(entityName(b.weapon)))
              : (-diff || entityName(a.weapon).localeCompare(entityName(b.weapon)));
          }
          if (sortColumn === 'cycle') {
            const aCyc = a.cycle > 0 ? a.cycle : (sortDirection === 'asc' ? 9999 : -1);
            const bCyc = b.cycle > 0 ? b.cycle : (sortDirection === 'asc' ? 9999 : -1);
            const diff = aCyc - bCyc;
            return sortDirection === 'asc'
              ? (diff || entityName(a.weapon).localeCompare(entityName(b.weapon)))
              : (-diff || entityName(a.weapon).localeCompare(entityName(b.weapon)));
          }
          if (sortColumn === 'yourAvg') {
            const diff = a.avg - b.avg;
            return sortDirection === 'asc'
              ? (diff || entityName(a.weapon).localeCompare(entityName(b.weapon)))
              : (-diff || entityName(a.weapon).localeCompare(entityName(b.weapon)));
          }
          if (sortColumn === 'stamina') {
            const aStam = a.weapon.stamina !== null && a.weapon.stamina !== undefined ? a.weapon.stamina : (sortDirection === 'asc' ? 9999 : -1);
            const bStam = b.weapon.stamina !== null && b.weapon.stamina !== undefined ? b.weapon.stamina : (sortDirection === 'asc' ? 9999 : -1);
            const diff = aStam - bStam;
            return sortDirection === 'asc'
              ? (diff || entityName(a.weapon).localeCompare(entityName(b.weapon)))
              : (-diff || entityName(a.weapon).localeCompare(entityName(b.weapon)));
          }
          return 0;
        });

        visible.forEach(it => tbody.appendChild(createWeaponRow(it.weapon, it.stats)));

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
        emptyTd.textContent = t('No weapons found matching your criteria.');
        emptyTr.appendChild(emptyTd);
        tbody.appendChild(emptyTr);
      }
    }

    // Input listeners
    searchInput.addEventListener('input', () => {
      searchQuery = normalizeSearch(searchInput.value.trim());
      renderTableBody();
    });

    categorySelect.addEventListener('change', () => {
      selectedCategory = categorySelect.value;
      renderTableBody();
    });

    toggleAllCheckbox.addEventListener('change', () => {
      setStoredArmoryAll(toggleAllCheckbox.checked);
      updateSpoilerLabel();
      renderTableBody();
    });

    // Initial render
    updateSortHeaderIndicators();
    renderTableBody();

    return {
      snapshot: () => ({ sortColumn, sortDirection, searchQuery, selectedCategory, selectedDamageType }),
      refresh() {
        toggleAllCheckbox.checked = getStoredArmoryAll();
        updateSpoilerLabel();
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
    p1.appendChild(document.createTextNode(t('Data: ')));

    const wikiA = el('a', null, 'Valheim Wiki (valheim.weirdgloop.org)');
    wikiA.href = 'https://valheim.weirdgloop.org';
    wikiA.target = '_blank';
    wikiA.rel = 'noopener noreferrer';
    p1.appendChild(wikiA);

    p1.appendChild(document.createTextNode(t(', CC BY-SA 4.0 · generated ')));

    const genDate = data.generatedAt ? data.generatedAt.slice(0, 10) : '2026-10-05';
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

  /**
   * Main App Initialization
   */
  function confirmationDialog(title, message, confirmText, previewPlayer) {
    document.querySelector('.link-dialog')?.close();
    return new Promise(resolve => {
      const dialog = el('dialog', 'link-dialog weapon-modal');
      dialog.setAttribute('aria-labelledby', 'link-dialog-title');
      let accepted = false;
      const render = () => {
        dialog.replaceChildren();
        const content = el('div', 'modal-content');
        const heading = el('h2', 'modal-title', title);
        heading.id = 'link-dialog-title';
        content.appendChild(heading);
        content.appendChild(el('p', 'link-dialog-message', message));
        if (previewPlayer) {
          const list = el('dl', 'profile-preview');
          const add = (key, value) => {
            list.appendChild(el('dt', null, key));
            const description = el('dd');
            description.textContent = value;
            list.appendChild(description);
          };
          window.VCRank.SKILLS.forEach(skill => add(skill.name, previewPlayer.skills[skill.id]));
          add('Difficulty', t(DIFFICULTY_OPTIONS.find(option => option.id === previewPlayer.difficulty).short));
          add('Players nearby', previewPlayer.players);
          add('Quality', previewPlayer.quality === 'max' ? t('Max quality') : previewPlayer.quality);
          add('Equipment sets', previewPlayer.sets.map(id => SET_LABELS[id]).join(', ') || '—');
          add('Sneak / backstab', t(previewPlayer.sneak ? 'Yes' : 'No'));
          add('Enemy staggered (×2)', t(previewPlayer.staggered ? 'Yes' : 'No'));
          add('Ranking', t(previewPlayer.rankBy === 'hit' ? 'Damage per hit' : 'Damage per second'));
          content.appendChild(list);
        }
        const actions = el('div', 'character-actions');
        const cancel = el('button', 'action-btn', confirmText ? 'Cancel' : 'Close');
        cancel.type = 'button';
        cancel.autofocus = true;
        cancel.addEventListener('click', () => dialog.close());
        actions.appendChild(cancel);
        if (confirmText) {
          const confirm = el('button', 'action-btn', confirmText);
          confirm.type = 'button';
          confirm.addEventListener('click', () => { accepted = true; dialog.close(); });
          actions.appendChild(confirm);
        }
        content.appendChild(actions);
        dialog.appendChild(content);
      };
      dialog._translate = render;
      render();
      dialog.addEventListener('close', () => { dialog.remove(); resolve(accepted); }, { once: true });
      document.body.appendChild(dialog);
      dialog.showModal();
    });
  }

  async function openCreatureLink(id, data, stillCurrent) {
    const creature = Object.hasOwn(data.creatures, id) ? data.creatures[id] : null;
    const biome = creature && window.VCExtras.creatureBiome(creature, data.biomes, new Set(getStoredOpenBiomes()));
    if (!biome) {
      await confirmationDialog('Link to creature', 'Creature not found.');
      return;
    }
    const biomeCard = document.querySelector('.biome-card[data-biome-id="' + biome.id + '"]');
    const header = biomeCard?.querySelector('.biome-header');
    if (!header) return;
    if (!new Set(getStoredOpenBiomes()).has(biome.id)) {
      const reveal = await confirmationDialog('Reveal creature', 'This creature is in a hidden biome. Reveal it?', 'Reveal');
      if (!reveal || !stillCurrent()) return;
    }
    if (!stillCurrent()) return;
    const search = document.getElementById('creature-search');
    if (search) search.value = '';
    document.querySelectorAll('.kind-filter .filter-btn').forEach(button => {
      button.classList.toggle('active', button.dataset.kind === 'all');
    });
    if (header.getAttribute('aria-expanded') !== 'true') header.click();
    // Ensure all open biomes from stored progress remain rendered and expanded
    const openBiomesSet = new Set(getStoredOpenBiomes());
    document.querySelectorAll('.biome-card').forEach(bCard => {
      const bId = bCard.dataset.biomeId;
      const bHeader = bCard.querySelector('.biome-header');
      if (bHeader && (bHeader.getAttribute('aria-expanded') === 'true' || openBiomesSet.has(bId))) {
        if (bHeader.getAttribute('aria-expanded') !== 'true') {
          bHeader.setAttribute('aria-expanded', 'true');
        }
        const wrapper = bCard.querySelector('.biome-content-wrapper');
        if (wrapper) {
          wrapper.removeAttribute('inert');
          wrapper.classList.add('open');
          if (!wrapper.firstElementChild) {
            const b = data.biomes.find(item => item.id === bId);
            if (b) renderBiomeContent(b, wrapper, data);
          }
        }
      }
    });
    applyFiltersToAllOpenBiomes();
    const fish = biomeCard.querySelector('.fish-wrapper[data-creature-id="' + creature.id + '"]');
    if (fish && !fish.classList.contains('expanded')) fish.querySelector('.fish-tile').click();
    const card = biomeCard.querySelector('.creature-card[data-creature-id="' + creature.id + '"]');
    if (!card) return;
    document.querySelectorAll('.creature-linked').forEach(element => element.classList.remove('creature-linked'));
    card.classList.add('creature-linked');
    card.setAttribute('tabindex', '-1');
    card.querySelector('.creature-details').open = true;
    const scroll = () => {
      if (!stillCurrent() || !card.isConnected) return;
      card.scrollIntoView({ block: 'start', behavior: 'instant' });
      card.focus({ preventScroll: true });
    };
    requestAnimationFrame(scroll);
    // Scroll again once the biome accordion has finished expanding.
    setTimeout(scroll, 350);
  }

  function initLinks(data) {
    let request = 0;
    const handleHash = async () => {
      const current = ++request;
      const stillCurrent = () => current === request;
      document.querySelector('.link-dialog')?.close();
      const params = new URLSearchParams(window.location.hash.slice(1));
      if (params.has('player')) {
        try {
          const imported = sanitizePlayer(window.VCExtras.decodeProfile(params.get('player')));
          const accept = await confirmationDialog('Import player profile',
            'Import this profile? Your current character settings will be replaced.', 'Import profile', imported);
          if (!stillCurrent()) return;
          if (accept) {
            Object.assign(playerState, imported);
            savePlayerState(playerState);
            buildCharacterPanel(document.getElementById('character-section'), true);
            refreshRenderedCards();
          }
        } catch {
          await confirmationDialog('Profile link', 'This profile link is invalid.');
        }
        if (!stillCurrent()) return;
        params.delete('player');
        const url = new URL(window.location.href);
        url.hash = params.toString();
        history.replaceState(null, '', url);
      }
      if (stillCurrent() && params.has('c')) await openCreatureLink(params.get('c'), data, stillCurrent);
    };
    window.addEventListener('hashchange', handleHash);
    handleHash();
  }

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
      const orderBadge = el('span', 'biome-order-badge', t('Biome {order}', { order: biome.order }));
      const nameHeading = el('span', 'biome-name', biomeName(biome));
      const countBadge = el('span', 'biome-count-badge', tn('{count} creatures', creaturesCount, { count: creaturesCount }));

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
          const searchQuery = searchInput ? normalizeSearch(searchInput.value.trim()) : '';
          const activeFilterBtn = document.querySelector('.filter-btn.active');
          const kindFilter = activeFilterBtn ? activeFilterBtn.dataset.kind : 'all';
          applyFiltersToBiome(card, searchQuery, kindFilter);
        } else {
          contentWrapper.setAttribute('inert', '');
          contentWrapper.classList.remove('open');
        }

        // Expanding reveals a biome; collapsing does not erase spoiler progress.
        if (nextState && !getStoredOpenBiomes().includes(biome.id)) {
          setStoredOpenBiomes([...new Set([...getManualOpenBiomes(), biome.id])]);
        }
        document.querySelectorAll('.creature-card').forEach(card => card._refreshRaids?.());
        if (armoryController) armoryController.refresh();
      });

      card.appendChild(headerBtn);
      card.appendChild(contentWrapper);
      biomesContainer.appendChild(card);

      if (isOpenInitial) {
        applyFiltersToBiome(card, '', 'all');
      }
    });

    const picker = VCI18n.mountPicker('#language-picker');
    function translatePage() {
      VCI18n.apply(document);
      picker.setAttribute('aria-label', t('Language'));
      picker.options[0].textContent = t('Auto (browser)');
      const characterOpen = document.querySelector('.character-panel')?.open;
      const legendOpen = document.querySelector('.legend-details')?.open;
      buildCharacterPanel(document.getElementById('character-section'), characterOpen);
      buildLegend(document.getElementById('legend-section'));
      document.querySelector('.legend-details').open = legendOpen;
      buildFooter(document.getElementById('page-footer'), data);
      document.querySelectorAll('.biome-card').forEach(card => {
        const biome = data.biomes.find(b => b.id === card.dataset.biomeId);
        card.querySelector('.biome-name').textContent = biomeName(biome);
        card.querySelector('.biome-order-badge').textContent = t('Biome {order}', { order: biome.order });
        card.querySelector('.biome-count-badge').textContent = tn('{count} creatures', Object.values(biome.creatures || {}).flat().length);
        const wrapper = card.querySelector('.biome-content-wrapper');
        if (!wrapper.children.length) return;
        const fish = [...wrapper.querySelectorAll('.fish-wrapper.expanded')].map(e => e.dataset.creatureId);
        const states = [...wrapper.querySelectorAll('.creature-card')].map(e => ({
          id: e.dataset.creatureId, star: [...e.querySelectorAll('.star-btn')].findIndex(b => b.classList.contains('active')),
          details: !!e.querySelector('.creature-details')?.open,
          linked: e.classList.contains('creature-linked'),
        }));
        const details = [...wrapper.querySelectorAll('details')].map(e => e.open);
        wrapper.replaceChildren();
        renderBiomeContent(biome, wrapper, data);
        fish.forEach(id => wrapper.querySelector('.fish-wrapper[data-creature-id="' + id + '"] .fish-tile')?.click());
        states.forEach(state => {
          const creature = wrapper.querySelector('.creature-card[data-creature-id="' + state.id + '"]');
          creature?.querySelectorAll('.star-btn')[state.star]?.click();
          if (creature?.querySelector('.creature-details')) creature.querySelector('.creature-details').open = state.details;
          if (state.linked && creature) {
            creature.classList.add('creature-linked');
            creature.setAttribute('tabindex', '-1');
          }
        });
        [...wrapper.querySelectorAll('details')].forEach((e, i) => { e.open = details[i] ?? e.open; });
      });
      armoryController = buildArmorySection(armoryContainer, data, armoryController?.snapshot());
      if (document.getElementById('weapon-modal').open && modalWeapon) openWeaponModal(modalWeapon, data);
      applyFiltersToAllOpenBiomes();
      document.querySelector('.link-dialog')?._translate?.();
    }
    VCI18n.onChange(translatePage);
    let revealed = new Set(getStoredOpenBiomes());
    function refreshProgress() {
      const next = new Set(getStoredOpenBiomes());
      document.querySelectorAll('.biome-card').forEach(card => {
        const id = card.dataset.biomeId;
        const header = card.querySelector('.biome-header');
        const wrapper = card.querySelector('.biome-content-wrapper');
        if (!next.has(id)) {
          header.setAttribute('aria-expanded', 'false');
          wrapper.replaceChildren();
          wrapper.classList.remove('open');
          wrapper.setAttribute('inert', '');
        } else if (!revealed.has(id)) {
          header.setAttribute('aria-expanded', 'true');
          renderBiomeContent(data.biomes.find(b => b.id === id), wrapper, data);
          wrapper.classList.add('open');
          wrapper.removeAttribute('inert');
        }
      });
      revealed = next;
      document.querySelectorAll('.creature-card').forEach(card => card._refreshRaids?.());
      armoryController?.refresh();
      applyFiltersToAllOpenBiomes();
    }
    VCProgress.onChange(refreshProgress);
    VCI18n.apply(document);
    picker.setAttribute('aria-label', t('Language'));
    picker.options[0].textContent = t('Auto (browser)');
    initLinks(data);

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
        document.querySelectorAll('.creature-card').forEach(card => card._refreshRaids?.());
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
        refreshProgress();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();
