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
   * @returns {HTMLElement}
   */
  function createWeaponRowBtn(weaponId, score, notes, sublabel, data) {
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
      right.appendChild(el('span', 'weapon-score', String(score)));
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
    };
    updateStarView();

    // Weaknesses & Resistances
    const recKey = biome.id + ':' + creature.id;
    const rec = data.recommendations && data.recommendations[recKey];
    const modifiers = (rec && rec.modifiers) || (creature.modifiers) || {};

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

    // Best Weapons Section
    if (rec) {
      const recBox = el('div', 'recommendations-box');
      const isRangedOnly = creature.kind === 'passive' || creature.kind === 'fish';

      // Tip row
      if (rec.tip) {
        recBox.appendChild(el('div', 'rec-tip', rec.tip));
      }

      const recGroups = el('div', 'rec-groups');

      // 1. Melee (up to 3 rows, only if not ranged only)
      if (!isRangedOnly && rec.melee && rec.melee.length > 0) {
        const meleeGroup = el('div', 'rec-group');
        meleeGroup.appendChild(el('span', 'rec-group-title', 'Melee'));
        rec.melee.slice(0, 3).forEach(m => {
          meleeGroup.appendChild(createWeaponRowBtn(m.weapon, m.score, filterWeaponNotes(m.notes, creature), null, data));
        });
        recGroups.appendChild(meleeGroup);
      }

      // 2. Bow + arrows
      if (rec.bow || (rec.arrows && rec.arrows.length > 0)) {
        const bowGroup = el('div', 'rec-group');
        const bowWeapon = rec.bow ? data.weapons[rec.bow.weapon] : null;
        const bowName = bowWeapon ? bowWeapon.name : 'Bow';
        bowGroup.appendChild(el('span', 'rec-group-title', 'Bow + Arrows (' + bowName + ')'));

        if (rec.arrows && rec.arrows.length > 0) {
          rec.arrows.forEach(arr => {
            bowGroup.appendChild(createWeaponRowBtn(arr.weapon, arr.score, filterWeaponNotes(arr.notes, creature), null, data));
          });
        } else if (rec.bow) {
          bowGroup.appendChild(createWeaponRowBtn(rec.bow.weapon, rec.bow.score, filterWeaponNotes(rec.bow.notes, creature), null, data));
        }
        recGroups.appendChild(bowGroup);
      }

      // 3. Crossbow + bolts
      if (rec.crossbow || (rec.bolts && rec.bolts.length > 0)) {
        const xbowGroup = el('div', 'rec-group');
        const xbowWeapon = rec.crossbow ? data.weapons[rec.crossbow.weapon] : null;
        const xbowName = xbowWeapon ? xbowWeapon.name : 'Crossbow';
        xbowGroup.appendChild(el('span', 'rec-group-title', 'Crossbow + Bolts (' + xbowName + ')'));

        if (rec.bolts && rec.bolts.length > 0) {
          rec.bolts.forEach(bolt => {
            xbowGroup.appendChild(createWeaponRowBtn(bolt.weapon, bolt.score, filterWeaponNotes(bolt.notes, creature), null, data));
          });
        } else if (rec.crossbow) {
          xbowGroup.appendChild(createWeaponRowBtn(rec.crossbow.weapon, rec.crossbow.score, filterWeaponNotes(rec.crossbow.notes, creature), null, data));
        }
        recGroups.appendChild(xbowGroup);
      }

      // 4. Magic (only if not ranged only)
      if (!isRangedOnly && rec.magic) {
        const magicGroup = el('div', 'rec-group');
        magicGroup.appendChild(el('span', 'rec-group-title', 'Magic'));
        magicGroup.appendChild(createWeaponRowBtn(rec.magic.weapon, rec.magic.score, filterWeaponNotes(rec.magic.notes, creature), null, data));
        recGroups.appendChild(magicGroup);
      }

      // 5. Bomb (only if not ranged only)
      if (!isRangedOnly && rec.bomb) {
        const bombGroup = el('div', 'rec-group');
        bombGroup.appendChild(el('span', 'rec-group-title', 'Bomb'));
        bombGroup.appendChild(createWeaponRowBtn(rec.bomb.weapon, rec.bomb.score, filterWeaponNotes(rec.bomb.notes, creature), null, data));
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

      if (recGroups.children.length > 0 || rec.tip) {
        recBox.appendChild(recGroups);
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
    headRow.appendChild(el('th', null, 'Stamina'));
    headRow.appendChild(el('th', null, 'Materials'));
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = el('tbody');
    sortedCategories.forEach(cat => {
      // Category group header row
      const catRow = el('tr', 'weapon-category-header');
      const catTd = el('td', null, capitalize(cat) + ' (' + categoriesMap[cat].length + ')');
      catTd.colSpan = 4;
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
    const note = el('p', 'legend-note', 'Scores = per-hit damage at max upgrade quality vs. this creature; fire/poison DoT counted at face value.');
    body.appendChild(note);

    details.appendChild(body);
    container.appendChild(details);
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

    // Build Legend
    buildLegend(document.getElementById('legend-section'));

    // Build Footer
    buildFooter(document.getElementById('page-footer'), data);

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
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();
