// Shared calculation core for Valheim Companion (VC-5).
// Classic script without import/export, exposes globalThis.VCRank.
// Follows docs/ANALYZA.md § 4, § 5, § 9 and docs/DATA-SCHEMA.md.

(() => {
  'use strict';

  const DAMAGE_TYPES = [
    'blunt',
    'slash',
    'pierce',
    'chop',
    'pickaxe',
    'fire',
    'frost',
    'lightning',
    'poison',
    'spirit',
  ];

  const COMBAT_DAMAGE_TYPES = [
    'blunt',
    'slash',
    'pierce',
    'fire',
    'frost',
    'lightning',
    'poison',
    'spirit',
  ];

  const MOD_TIERS = {
    veryweak: 2,
    weak: 1.5,
    slightlyweak: 1.25,
    neutral: 1,
    slightlyresistant: 0.75,
    resistant: 0.5,
    veryresistant: 0.25,
    immune: 0,
  };

  const MELEE_CATEGORIES = [
    'sword',
    'axe',
    'club',
    'spear',
    'polearm',
    'knife',
    'battleaxe',
    'sledge',
    'fists',
    'pickaxe',
  ];

  const SKILLS = [
    { id: 'swords', name: 'Swords' },
    { id: 'knives', name: 'Knives' },
    { id: 'clubs', name: 'Clubs' },
    { id: 'polearms', name: 'Polearms' },
    { id: 'spears', name: 'Spears' },
    { id: 'axes', name: 'Axes' },
    { id: 'fists', name: 'Fists' },
    { id: 'bows', name: 'Bows' },
    { id: 'crossbows', name: 'Crossbows' },
    { id: 'elemental-magic', name: 'Elemental magic' },
    { id: 'blood-magic', name: 'Blood magic' },
    { id: 'pickaxes', name: 'Pickaxes' },
  ];

  const DIFFICULTY = {
    veryeasy: 1.25,
    easy: 1.1,
    normal: 1,
    hard: 0.85,
    veryhard: 0.7,
  };

  const SET_BONUSES = {
    root: { type: 'skill', skill: 'bows', amount: 15 },
    lox: { type: 'skill', skill: 'bows', amount: 15 },
    fenris: { type: 'skill', skill: 'fists', amount: 15 },
    bear: { type: 'damage', types: ['slash', 'chop'], amount: 0.1 },
    vanguard: { type: 'damage', types: ['pierce'], amount: 0.1 },
  };

  // Attack timing constants from Damage Calculator (VC-11)
  const BOW_DRAW_BASE = 2.5;
  const BOW_DRAW_PER_SKILL = 0.02;
  const BOW_MIN_INTERVAL = 0.8;
  const CROSSBOW_RELOAD_BASE = 3.5;
  const CROSSBOW_RELOAD_PER_SKILL = 0.5;
  const CROSSBOW_READYING = 1.15;
  const CROSSBOW_FIRING = 0.7;

  // Default backstab multipliers by weapon category / slug (VC-11):
  // Knives and Flesh Rippers 6x, sledges (2H clubs) 2x, magic/bombs 1x, rest 3x.
  const DEFAULT_BACKSTAB = {
    knife: 6,
    sledge: 2,
    magic: 1,
    bomb: 1,
  };

  const BACKSTAB_BY_SLUG = {
    'flesh-rippers': 6,
  };

  const DEFAULT_PLAYER = {
    skills: {
      swords: 50,
      knives: 50,
      clubs: 50,
      polearms: 50,
      spears: 50,
      axes: 50,
      fists: 50,
      bows: 50,
      crossbows: 50,
      'elemental-magic': 50,
      'blood-magic': 50,
      pickaxes: 50,
    },
    difficulty: 'normal',
    players: 1,
    quality: 'max',
    sets: [],
    sneak: false,
    staggered: false,
    rankBy: 'dps',
  };

  const byCodepoint = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

  function capitalize(s) {
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  // Skill factor per docs/ANALYZA.md § 9:
  // min = 0.25 + 0.006 * L, max = min(0.55 + 0.006 * L, 1.0), avg = (min + max) / 2
  function skillFactor(level) {
    const l = Math.max(0, Math.min(100, Number(level) || 0));
    const min = Math.round((0.25 + 0.006 * l) * 1e6) / 1e6;
    const max = Math.round(Math.min(0.55 + 0.006 * l, 1.0) * 1e6) / 1e6;
    const avg = Math.round(((min + max) / 2) * 1e6) / 1e6;
    return { min, max, avg };
  }

  // Effective skill level with armor set bonuses, capped at 100
  function effectiveSkill(player, skill) {
    if (!skill) return 0;
    let val = player?.skills?.[skill] ?? 50;
    const sets = Array.isArray(player?.sets) ? player.sets : [];
    if (skill === 'bows') {
      if (sets.includes('root')) val += 15;
      if (sets.includes('lox')) val += 15;
    } else if (skill === 'fists') {
      if (sets.includes('fenris')) val += 15;
    }
    return Math.min(100, Math.max(0, val));
  }

  // Backstab multiplier: explicit weapon value, slug exception, else category default, else 3.
  function backstabOf(weapon) {
    if (!weapon) return 3;
    const slug = weapon.id || weapon.slug;
    if (weapon.backstab != null) return weapon.backstab;
    if (slug && BACKSTAB_BY_SLUG[slug] != null) return BACKSTAB_BY_SLUG[slug];
    if (weapon.category && DEFAULT_BACKSTAB[weapon.category] != null) {
      return DEFAULT_BACKSTAB[weapon.category];
    }
    return 3;
  }

  // Damage map at requested quality: weaponQuality[slug][typ][q-1] if available,
  // otherwise legacy calculation: damage + perLevel * (q - 1).
  function weaponDamage(weapon, quality = 'max', qualityMap = null) {
    if (!weapon) return {};
    const maxQ = weapon.maxQuality || 1;
    const q = quality === 'max' ? maxQ : Math.max(1, Math.min(Number(quality) || 1, maxQ));
    const slug = weapon.id || weapon.slug;
    const wq = qualityMap || globalThis.VC_DATA?.weaponQuality || globalThis._weaponQuality;

    if (slug && wq && wq[slug]) {
      const res = {};
      for (const [dt, arr] of Object.entries(wq[slug])) {
        if (Array.isArray(arr) && arr.length > 0) {
          const idx = Math.min(arr.length - 1, q - 1);
          res[dt] = arr[idx] ?? 0;
        }
      }
      return res;
    }

    const baseDmg = weapon.damage || weapon.damageMax || {};
    const res = {};
    for (const [dt, baseVal] of Object.entries(baseDmg)) {
      const step = weapon.perLevel?.[dt] || 0;
      res[dt] = (baseVal || 0) + step * (q - 1);
    }
    return res;
  }

  function clampSkill(level) {
    return Math.max(0, Math.min(100, Number(level) || 0));
  }

  function bowDrawSeconds(skillLevel) {
    const cfg = globalThis.VC_DATA?.attackProfiles?.bow || globalThis._attackProfiles?.bow || {
      drawBase: BOW_DRAW_BASE,
      drawPerSkill: BOW_DRAW_PER_SKILL,
      minInterval: BOW_MIN_INTERVAL,
    };
    return cfg.drawBase - cfg.drawPerSkill * clampSkill(skillLevel);
  }

  function bowCycleSeconds(skillLevel) {
    const cfg = globalThis.VC_DATA?.attackProfiles?.bow || globalThis._attackProfiles?.bow || {
      drawBase: BOW_DRAW_BASE,
      drawPerSkill: BOW_DRAW_PER_SKILL,
      minInterval: BOW_MIN_INTERVAL,
    };
    return Math.max(cfg.minInterval, bowDrawSeconds(skillLevel));
  }

  function crossbowReloadSeconds(skillLevel) {
    const cfg = globalThis.VC_DATA?.attackProfiles?.crossbow || globalThis._attackProfiles?.crossbow || {
      reloadBase: CROSSBOW_RELOAD_BASE,
      reloadPerSkill: CROSSBOW_RELOAD_PER_SKILL,
      readying: CROSSBOW_READYING,
      firing: CROSSBOW_FIRING,
    };
    return cfg.reloadBase * (1 - clampSkill(skillLevel) / 200);
  }

  function crossbowCycleSeconds(skillLevel) {
    const cfg = globalThis.VC_DATA?.attackProfiles?.crossbow || globalThis._attackProfiles?.crossbow || {
      reloadBase: CROSSBOW_RELOAD_BASE,
      reloadPerSkill: CROSSBOW_RELOAD_PER_SKILL,
      readying: CROSSBOW_READYING,
      firing: CROSSBOW_FIRING,
    };
    return crossbowReloadSeconds(skillLevel) + cfg.readying + cfg.firing;
  }

  const DEFAULT_CATEGORY_PROFILES = {
    sword: { timing: { kind: 'fixed', seconds: 2.46 }, comboMults: [1, 1, 2], damageMult: 1, confidence: 'wiki' },
    knife: { timing: { kind: 'fixed', seconds: 1.74 }, comboMults: [1, 1, 2], damageMult: 1, confidence: 'wiki' },
    club: { timing: { kind: 'fixed', seconds: 2.46 }, comboMults: [1, 1, 2], damageMult: 1, confidence: 'wiki' },
    axe: { timing: { kind: 'fixed', seconds: 2.58 }, comboMults: [1, 1, 2], damageMult: 1, confidence: 'wiki' },
    'dual-axe': { timing: { kind: 'fixed', seconds: 3.62 }, comboMults: [1, 1, 1, 1, 2, 2], damageMult: 1, confidence: 'wiki' },
    spear: { timing: { kind: 'fixed', seconds: 0.68 }, comboMults: [1], damageMult: 1, confidence: 'wiki' },
    polearm: { timing: { kind: 'fixed', seconds: 2.98 }, comboMults: [1, 1, 2], damageMult: 1, confidence: 'wiki' },
    greatsword: { timing: { kind: 'fixed', seconds: 3.44 }, comboMults: [1, 1, 2], damageMult: 1, confidence: 'wiki' },
    battleaxe: { timing: { kind: 'fixed', seconds: 3.2 }, comboMults: [1, 1, 2], damageMult: 1, confidence: 'wiki' },
    sledge: { timing: { kind: 'fixed', seconds: 1.7 }, comboMults: [1], damageMult: 1, confidence: 'wiki' },
    pickaxe: { timing: { kind: 'fixed', seconds: 1.4 }, comboMults: [1], damageMult: 1, confidence: 'wiki' },
    fists: { timing: { kind: 'fixed', seconds: 1.48 }, comboMults: [1, 2], damageMult: 1, confidence: 'wiki' },
    bow: { timing: { kind: 'bow' }, comboMults: [1], damageMult: 1, confidence: 'wiki' },
    crossbow: { timing: { kind: 'crossbow' }, comboMults: [1], damageMult: 1, confidence: 'model' },
    magic: { timing: { kind: 'fixed', seconds: 1.1 }, comboMults: [1], damageMult: 1, confidence: 'estimate' },
    bomb: { timing: { kind: 'fixed', seconds: 1.2 }, comboMults: [1], damageMult: 1, confidence: 'estimate' },
  };

  const DEFAULT_SECONDARY_PROFILES = {
    sword: { timing: { kind: 'fixed', seconds: 1.84 }, comboMults: [1], damageMult: 3, confidence: 'wiki' },
    knife: { timing: { kind: 'fixed', seconds: 1.52 }, comboMults: [1], damageMult: 3, confidence: 'wiki' },
    club: { timing: { kind: 'fixed', seconds: 1.72 }, comboMults: [1], damageMult: 2.5, confidence: 'wiki' },
    axe: { timing: { kind: 'fixed', seconds: 2 }, comboMults: [1], damageMult: 1.5, confidence: 'wiki' },
    'dual-axe': { timing: { kind: 'fixed', seconds: 1.93 }, comboMults: [1], damageMult: 1.5, confidence: 'wiki' },
    spear: { timing: { kind: 'fixed', seconds: 1.04 }, comboMults: [1], damageMult: 1.5, confidence: 'wiki' },
    polearm: { timing: { kind: 'fixed', seconds: 1.56 }, comboMults: [1], damageMult: 1, confidence: 'wiki' },
    greatsword: { timing: { kind: 'fixed', seconds: 2.16 }, comboMults: [1], damageMult: 3, confidence: 'wiki' },
    battleaxe: { timing: { kind: 'fixed', seconds: 0.84 }, comboMults: [1], damageMult: 0.5, confidence: 'wiki' },
    fists: { timing: { kind: 'fixed', seconds: 1.48 }, comboMults: [1], damageMult: 1, confidence: 'wiki' },
  };

  function attackProfileFor(weapon, attackKind = 'primary') {
    if (!weapon) return null;
    const slug = weapon.id || weapon.slug;
    const profiles = globalThis.VC_DATA?.attackProfiles || globalThis._attackProfiles;
    const wProf = profiles?.weapons?.[slug] || profiles?.[slug];
    if (wProf) {
      if (attackKind === 'secondary') {
        return wProf.secondary || wProf.primary;
      }
      return wProf.primary;
    }
    const cat = weapon.category || 'sword';
    if (attackKind === 'secondary') {
      const sec = DEFAULT_SECONDARY_PROFILES[cat];
      return sec || DEFAULT_CATEGORY_PROFILES[cat] || { timing: { kind: 'fixed', seconds: 2 }, comboMults: [1], damageMult: 1, confidence: 'wiki' };
    }
    return DEFAULT_CATEGORY_PROFILES[cat] || { timing: { kind: 'fixed', seconds: 2 }, comboMults: [1], damageMult: 1, confidence: 'wiki' };
  }

  function hasSecondaryAttack(weapon) {
    if (!weapon) return false;
    const slug = weapon.id || weapon.slug;
    const profiles = globalThis.VC_DATA?.attackProfiles || globalThis._attackProfiles;
    const wProf = profiles?.weapons?.[slug] || profiles?.[slug];
    if (wProf) {
      return wProf.secondary !== null && wProf.secondary !== undefined;
    }
    const cat = weapon.category || '';
    return DEFAULT_SECONDARY_PROFILES[cat] !== undefined;
  }

  // Effective numeric damage multipliers per ANALYZA § 4
  function effectiveModifiers(creature) {
    const mods = {};
    for (const dt of DAMAGE_TYPES) {
      if (['spirit', 'chop', 'pickaxe'].includes(dt)) {
        mods[dt] = 0;
      } else {
        mods[dt] = 1;
      }
    }
    for (const [k, v] of Object.entries(creature?.modifiers ?? {})) {
      if (DAMAGE_TYPES.includes(k)) {
        if (typeof v === 'number') {
          mods[k] = v;
        } else if (MOD_TIERS[v] != null) {
          mods[k] = MOD_TIERS[v];
        }
      }
    }
    return mods;
  }

  function buildNotes(damage, mods) {
    const notes = [];
    for (const [dt, val] of Object.entries(damage ?? {})) {
      if ((dt === 'chop' || dt === 'pickaxe') && (mods?.[dt] ?? 0) === 0) {
        continue;
      }
      if (val > 0 && mods?.[dt] != null && mods[dt] !== 1) {
        notes.push({ mult: mods[dt], text: `\u00d7${mods[dt]} ${capitalize(dt)}` });
      }
    }
    notes.sort((a, b) => b.mult - a.mult || byCodepoint(a.text, b.text));
    return notes.map((n) => n.text);
  }

  // Raw unscaled damage sum (excluding chop and pickaxe when creature modifier is 0)
  function rawDamage(damage, mods) {
    let r = 0;
    for (const [dt, val] of Object.entries(damage ?? {})) {
      if ((dt === 'chop' || dt === 'pickaxe') && mods && (mods[dt] ?? 0) === 0) {
        continue;
      }
      r += val || 0;
    }
    return Math.round(r);
  }

  // Direct score helper for tests and backwards compatibility
  function score(damage, mods) {
    let s = 0;
    for (const [dt, val] of Object.entries(damage ?? {})) {
      s += (val || 0) * (mods?.[dt] ?? 1);
    }
    return Math.round(s);
  }

  function rangedScore(launcher, ammo, mods) {
    const launcherPierce = launcher?.damageMax?.pierce ?? launcher?.damage?.pierce ?? 0;
    const ammoPierce = ammo?.damageMax?.pierce ?? ammo?.damage?.pierce ?? 0;
    let total = (launcherPierce + ammoPierce) * (mods?.pierce ?? 1);

    for (const dt of DAMAGE_TYPES) {
      if (dt === 'pierce') continue;
      const aVal = ammo?.damageMax?.[dt] ?? ammo?.damage?.[dt] ?? 0;
      const lVal = launcher?.damageMax?.[dt] ?? launcher?.damage?.[dt] ?? 0;
      total += (aVal + lVal) * (mods?.[dt] ?? 1);
    }
    return Math.round(total);
  }

  // Combined damage for launcher + ammo at requested quality
  function buildCombinedDamage(launcher, ammo, quality) {
    const lDmg = weaponDamage(launcher, quality);
    if (!ammo) return lDmg;
    const aDmg = weaponDamage(ammo, quality);
    const combined = { pierce: (lDmg.pierce || 0) + (aDmg.pierce || 0) };
    for (const dt of DAMAGE_TYPES) {
      if (dt === 'pierce') continue;
      const val = (aDmg[dt] || 0) + (lDmg[dt] || 0);
      if (val > 0) combined[dt] = val;
    }
    return combined;
  }

  // Detailed damage calculation per hit against creature with player stats
  function perHit(weapon, ammo = null, creature = null, player = DEFAULT_PLAYER) {
    const q = player?.quality ?? 'max';
    const combined = buildCombinedDamage(weapon, ammo, q);
    const mods = effectiveModifiers(creature);

    const skillName = weapon?.skill ?? null;
    let factor = { min: 1, max: 1, avg: 1 };
    if (skillName && weapon?.skillScaled !== false) {
      const effSkill = effectiveSkill(player, skillName);
      factor = skillFactor(effSkill);
    }

    const diffMult = DIFFICULTY[player?.difficulty] ?? 1;
    const sneakMult = player?.sneak ? backstabOf(weapon) : 1;
    const staggerMult = player?.staggered ? 2 : 1;
    const sitMult = sneakMult * staggerMult;

    const sets = Array.isArray(player?.sets) ? player.sets : [];

    let avgSum = 0;
    let minSum = 0;
    let maxSum = 0;
    let rawSum = 0;

    for (const [dt, val] of Object.entries(combined)) {
      if ((dt === 'chop' || dt === 'pickaxe') && (mods[dt] ?? 0) <= 0) {
        continue;
      }
      if (!val || val <= 0) continue;

      rawSum += val;

      const cMod = mods[dt] ?? 1;
      let setMult = 1;
      if (sets.includes('bear') && (dt === 'slash' || dt === 'chop')) {
        setMult *= 1.1;
      }
      if (sets.includes('vanguard') && dt === 'pierce') {
        setMult *= 1.1;
      }

      const typeDmg = val * cMod * setMult * diffMult * sitMult;
      avgSum += typeDmg * factor.avg;
      minSum += typeDmg * factor.min;
      maxSum += typeDmg * factor.max;
    }

    const notes = buildNotes(combined, mods);
    if (player?.sneak) {
      notes.push(`Sneak ×${sneakMult}`);
    }

    return {
      avg: avgSum,
      min: minSum,
      max: maxSum,
      raw: Math.round(rawSum),
      notes,
    };
  }

  // Creature effective health scaled by extra players nearby:
  // HP * (1 + 0.3 * (min(players, 5) - 1))
  function creatureHp(creature, star = 0, biomeId = null, player = DEFAULT_PLAYER) {
    if (!creature) return 0;
    let hp = null;
    const starNum = Number(star) || 0;
    if (Array.isArray(creature.stars)) {
      const sObj = creature.stars.find((s) => s.star === starNum) || creature.stars[0];
      if (sObj) {
        if (sObj.health != null) {
          hp = sObj.health;
        } else if (sObj.healthByBiome) {
          hp = (biomeId && sObj.healthByBiome[biomeId] != null)
            ? sObj.healthByBiome[biomeId]
            : Object.values(sObj.healthByBiome)[0];
        }
      }
    }
    if (hp == null && creature.health != null) {
      hp = creature.health;
    }
    if (hp == null) return 0;

    const players = Math.max(1, Number(player?.players) || 1);
    const playerMult = 1 + 0.3 * (Math.min(players, 5) - 1);
    return Math.round(hp * playerMult);
  }

  // Check if an attack is effective against the creature (VC-2b ineffective filter: resists >= 50%)
  function isEffectiveAttack(weapon, ammo, creature, player, hit) {
    const q = player?.quality ?? 'max';
    const combined = buildCombinedDamage(weapon, ammo, q);
    const mods = effectiveModifiers(creature);

    let unresistedDmg = 0;
    for (const [dt, val] of Object.entries(combined)) {
      if ((dt === 'chop' || dt === 'pickaxe') && (mods[dt] ?? 0) <= 0) {
        continue;
      }
      unresistedDmg += val || 0;
    }
    if (unresistedDmg <= 0) return false;

    // Both score >= 0.5 * raw and damage ratio >= 0.5 are satisfied when not heavily resisted
    const skillName = weapon?.skill ?? null;
    let factorAvg = 1;
    if (skillName && weapon?.skillScaled !== false) {
      factorAvg = skillFactor(effectiveSkill(player, skillName)).avg;
    }
    const diffMult = DIFFICULTY[player?.difficulty] ?? 1;
    const unresistedAvg = unresistedDmg * factorAvg * diffMult;

    return hit.avg >= 0.5 * unresistedAvg;
  }

  function timeToKill(health, perHit, openingPerHit, profile, cycleSeconds, dps) {
    if (!(perHit > 0) || !(health > 0)) {
      return Infinity;
    }
    const hitTimes = profile?.hitTimes;
    const comboMults = profile?.comboMults || [1];
    if (hitTimes && hitTimes.length === comboMults.length) {
      let dealt = 0;
      for (let cycle = 0; cycle < 100000; cycle++) {
        for (let hit = 0; hit < hitTimes.length; hit++) {
          const opening = cycle === 0 && hit === 0;
          dealt += (opening ? openingPerHit : perHit) * comboMults[hit];
          if (dealt >= health) {
            return cycle * cycleSeconds + hitTimes[hit];
          }
        }
      }
    }
    return dps > 0 ? health / dps : Infinity;
  }

  // Detailed timing, cycle damage, DPS and TTK per weapon attack (VC-11)
  function attackStats(weapon, ammo = null, creature = null, player = DEFAULT_PLAYER, attackKind = 'primary') {
    if (!weapon) return null;
    const profile = attackProfileFor(weapon, attackKind);
    const skillName = weapon.skill ?? null;
    const effSkill = effectiveSkill(player, skillName);

    const timing = profile?.cycle || profile?.timing || { kind: 'fixed', seconds: 2 };
    let cycleSeconds = 2;
    if (timing.kind === 'fixed') {
      cycleSeconds = timing.seconds ?? 2;
    } else if (timing.kind === 'bow') {
      cycleSeconds = bowCycleSeconds(effSkill);
    } else if (timing.kind === 'crossbow') {
      cycleSeconds = crossbowCycleSeconds(effSkill);
    }

    const damageMult = profile?.damageMult ?? 1;
    const comboMults = profile?.comboMults ?? [1];

    // Steady normal hit without backstab/sneak bonus
    const playerWithoutSneak = { ...player, sneak: false };
    const baseHit = perHit(weapon, ammo, creature, playerWithoutSneak);
    const steadyPerHit = baseHit.avg * damageMult;

    // Opening hit: with backstab if player has sneak
    const backstabApplied = player?.sneak === true;
    const bsMult = backstabOf(weapon);
    const openingMult = backstabApplied ? bsMult : 1;
    const openingPerHit = steadyPerHit * openingMult;

    // Cycle damage: first combo hit takes opening bonus, subsequent combo hits take steady damage
    const firstWeight = comboMults[0] ?? 1;
    const restWeight = comboMults.reduce((sum, mult) => sum + mult, 0) - firstWeight;
    const cycleDamage = openingPerHit * firstWeight + steadyPerHit * restWeight;

    const dps = cycleSeconds > 0 ? cycleDamage / cycleSeconds : 0;

    let targetHealth = 0;
    if (creature) {
      if (typeof creature.health === 'number' && !creature.stars) {
        targetHealth = creature.health;
      } else {
        targetHealth = creatureHp(creature, player?.star ?? 0, player?.biomeId ?? null, player);
        if (targetHealth === 0 && creature.health != null) targetHealth = creature.health;
      }
    }

    const ttk = timeToKill(targetHealth, steadyPerHit, openingPerHit, profile, cycleSeconds, dps);

    return {
      perHit: steadyPerHit,
      openingPerHit,
      cycleSeconds,
      cycleDamage,
      dps,
      timeToKill: ttk,
      comboMults,
      damageMult,
      confidence: profile?.confidence || 'wiki',
      isSecondary: attackKind === 'secondary',
    };
  }

  // Full recommendation for a creature in a given biome with player character settings
  function recommend(creature, biome, weapons, player = DEFAULT_PLAYER) {
    const tier = biome.tier ?? biome.order ?? biome.gearTier;
    const mods = effectiveModifiers(creature);
    const rankBy = player?.rankBy === 'hit' ? 'hit' : 'dps';

    const candidates = weapons.filter((w) => w.tier != null && w.tier <= tier);
    const hp = creatureHp(creature, player?.star ?? 0, biome?.id, player);

    // 1. Melee: top 3 from distinct categories
    const meleeCandidates = candidates.filter((w) => {
      if (!MELEE_CATEGORIES.includes(w.category)) return false;
      if (w.category === 'pickaxe' && (mods.pickaxe ?? 0) <= 0) return false;
      return true;
    });

    const scoredMelee = meleeCandidates.map((w) => {
      const prim = attackStats(w, null, creature, player, 'primary');
      const hasSec = hasSecondaryAttack(w);
      const sec = hasSec ? attackStats(w, null, creature, player, 'secondary') : null;

      let chosen = prim;
      let isSecondary = false;
      if (rankBy === 'dps' && sec && sec.dps > prim.dps) {
        chosen = sec;
        isSecondary = true;
      }

      const scoreVal = rankBy === 'dps' ? chosen.dps : chosen.perHit;
      const hit = perHit(w, null, creature, player);
      const hits = chosen.perHit > 0 && hp > 0 ? Math.ceil(hp / chosen.perHit) : null;

      return {
        weapon: w.id,
        name: w.name,
        category: w.category,
        tier: w.tier,
        score: Math.round(scoreVal),
        dps: chosen.dps,
        perHit: chosen.perHit,
        cycleSeconds: chosen.cycleSeconds,
        isSecondary,
        confidence: chosen.confidence,
        timeToKill: chosen.timeToKill,
        hits,
        min: Math.round(hit.min * (chosen.damageMult || 1)),
        max: Math.round(hit.max * (chosen.damageMult || 1)),
        raw: hit.raw,
        notes: hit.notes,
        rawWeapon: w,
      };
    });

    scoredMelee.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.tier !== b.tier) return a.tier - b.tier;
      return byCodepoint(a.name, b.name);
    });

    const melee = [];
    const usedCats = new Set();
    for (const m of scoredMelee) {
      if (!usedCats.has(m.category)) {
        usedCats.add(m.category);
        melee.push({
          weapon: m.weapon,
          score: m.score,
          dps: m.dps,
          perHit: m.perHit,
          cycleSeconds: m.cycleSeconds,
          isSecondary: m.isSecondary,
          confidence: m.confidence,
          timeToKill: m.timeToKill,
          hits: m.hits,
          min: m.min,
          max: m.max,
          raw: m.raw,
          notes: m.notes,
        });
        if (melee.length === 3) break;
      }
    }

    // 2. Bow + top 3 arrows
    const bows = candidates.filter((w) => w.category === 'bow');
    let bowObj = null;
    let arrowList = [];
    if (bows.length > 0) {
      const scoredBows = bows.map((b) => {
        const stats = attackStats(b, null, creature, player, 'primary');
        const scoreVal = rankBy === 'dps' ? stats.dps : stats.perHit;
        const hit = perHit(b, null, creature, player);
        const hits = stats.perHit > 0 && hp > 0 ? Math.ceil(hp / stats.perHit) : null;
        return {
          weapon: b.id,
          name: b.name,
          tier: b.tier,
          score: Math.round(scoreVal),
          dps: stats.dps,
          perHit: stats.perHit,
          cycleSeconds: stats.cycleSeconds,
          confidence: stats.confidence,
          timeToKill: stats.timeToKill,
          hits,
          min: Math.round(hit.min),
          max: Math.round(hit.max),
          rawWeapon: b,
        };
      });
      scoredBows.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (a.tier !== b.tier) return a.tier - b.tier;
        return byCodepoint(a.name, b.name);
      });
      const bestBow = scoredBows[0];
      bowObj = {
        weapon: bestBow.weapon,
        score: bestBow.score,
        dps: bestBow.dps,
        perHit: bestBow.perHit,
        cycleSeconds: bestBow.cycleSeconds,
        confidence: bestBow.confidence,
        timeToKill: bestBow.timeToKill,
        hits: bestBow.hits,
        min: bestBow.min,
        max: bestBow.max,
      };

      const arrows = candidates.filter((w) => w.category === 'arrow');
      const scoredArrows = arrows.map((a) => {
        const stats = attackStats(bestBow.rawWeapon, a, creature, player, 'primary');
        const hit = perHit(bestBow.rawWeapon, a, creature, player);
        const effective = isEffectiveAttack(bestBow.rawWeapon, a, creature, player, hit);
        const scoreVal = rankBy === 'dps' ? stats.dps : stats.perHit;
        const hits = stats.perHit > 0 && hp > 0 ? Math.ceil(hp / stats.perHit) : null;
        return {
          weapon: a.id,
          name: a.name,
          tier: a.tier,
          score: Math.round(scoreVal),
          dps: stats.dps,
          perHit: stats.perHit,
          cycleSeconds: stats.cycleSeconds,
          confidence: stats.confidence,
          timeToKill: stats.timeToKill,
          hits,
          min: Math.round(hit.min),
          max: Math.round(hit.max),
          raw: hit.raw,
          notes: hit.notes,
          effective,
        };
      });
      scoredArrows.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (a.tier !== b.tier) return a.tier - b.tier;
        return byCodepoint(a.name, b.name);
      });
      arrowList = scoredArrows
        .filter((a) => a.effective)
        .slice(0, 3)
        .map((a) => ({
          weapon: a.weapon,
          score: a.score,
          dps: a.dps,
          perHit: a.perHit,
          cycleSeconds: a.cycleSeconds,
          confidence: a.confidence,
          timeToKill: a.timeToKill,
          hits: a.hits,
          min: a.min,
          max: a.max,
          raw: a.raw,
          notes: a.notes,
        }));
    }

    // 3. Crossbow + top 2 bolts
    const crossbows = candidates.filter((w) => w.category === 'crossbow');
    let crossbowObj = null;
    let boltList = [];
    if (crossbows.length > 0) {
      const scoredCrossbows = crossbows.map((c) => {
        const stats = attackStats(c, null, creature, player, 'primary');
        const scoreVal = rankBy === 'dps' ? stats.dps : stats.perHit;
        const hit = perHit(c, null, creature, player);
        const hits = stats.perHit > 0 && hp > 0 ? Math.ceil(hp / stats.perHit) : null;
        return {
          weapon: c.id,
          name: c.name,
          tier: c.tier,
          score: Math.round(scoreVal),
          dps: stats.dps,
          perHit: stats.perHit,
          cycleSeconds: stats.cycleSeconds,
          confidence: stats.confidence,
          timeToKill: stats.timeToKill,
          hits,
          min: Math.round(hit.min),
          max: Math.round(hit.max),
          rawWeapon: c,
        };
      });
      scoredCrossbows.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (a.tier !== b.tier) return a.tier - b.tier;
        return byCodepoint(a.name, b.name);
      });
      const bestCrossbow = scoredCrossbows[0];
      crossbowObj = {
        weapon: bestCrossbow.weapon,
        score: bestCrossbow.score,
        dps: bestCrossbow.dps,
        perHit: bestCrossbow.perHit,
        cycleSeconds: bestCrossbow.cycleSeconds,
        confidence: bestCrossbow.confidence,
        timeToKill: bestCrossbow.timeToKill,
        hits: bestCrossbow.hits,
        min: bestCrossbow.min,
        max: bestCrossbow.max,
      };

      const bolts = candidates.filter((w) => w.category === 'bolt');
      const scoredBolts = bolts.map((b) => {
        const stats = attackStats(bestCrossbow.rawWeapon, b, creature, player, 'primary');
        const hit = perHit(bestCrossbow.rawWeapon, b, creature, player);
        const effective = isEffectiveAttack(bestCrossbow.rawWeapon, b, creature, player, hit);
        const scoreVal = rankBy === 'dps' ? stats.dps : stats.perHit;
        const hits = stats.perHit > 0 && hp > 0 ? Math.ceil(hp / stats.perHit) : null;
        return {
          weapon: b.id,
          name: b.name,
          tier: b.tier,
          score: Math.round(scoreVal),
          dps: stats.dps,
          perHit: stats.perHit,
          cycleSeconds: stats.cycleSeconds,
          confidence: stats.confidence,
          timeToKill: stats.timeToKill,
          hits,
          min: Math.round(hit.min),
          max: Math.round(hit.max),
          raw: hit.raw,
          notes: hit.notes,
          effective,
        };
      });
      scoredBolts.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (a.tier !== b.tier) return a.tier - b.tier;
        return byCodepoint(a.name, b.name);
      });
      boltList = scoredBolts
        .filter((b) => b.effective)
        .slice(0, 2)
        .map((b) => ({
          weapon: b.weapon,
          score: b.score,
          dps: b.dps,
          perHit: b.perHit,
          cycleSeconds: b.cycleSeconds,
          confidence: b.confidence,
          timeToKill: b.timeToKill,
          hits: b.hits,
          min: b.min,
          max: b.max,
          raw: b.raw,
          notes: b.notes,
        }));
    }

    // 4. Magic top 1
    const magics = candidates.filter((w) => w.category === 'magic');
    let magicObj = null;
    if (magics.length > 0) {
      const scoredMagic = magics.map((m) => {
        const prim = attackStats(m, null, creature, player, 'primary');
        const hasSec = hasSecondaryAttack(m);
        const sec = hasSec ? attackStats(m, null, creature, player, 'secondary') : null;
        let chosen = prim;
        let isSecondary = false;
        if (rankBy === 'dps' && sec && sec.dps > prim.dps) {
          chosen = sec;
          isSecondary = true;
        }
        const hit = perHit(m, null, creature, player);
        const effective = isEffectiveAttack(m, null, creature, player, hit);
        const scoreVal = rankBy === 'dps' ? chosen.dps : chosen.perHit;
        const hits = chosen.perHit > 0 && hp > 0 ? Math.ceil(hp / chosen.perHit) : null;
        return {
          weapon: m.id,
          name: m.name,
          tier: m.tier,
          score: Math.round(scoreVal),
          dps: chosen.dps,
          perHit: chosen.perHit,
          cycleSeconds: chosen.cycleSeconds,
          isSecondary,
          confidence: chosen.confidence,
          timeToKill: chosen.timeToKill,
          hits,
          min: Math.round(hit.min),
          max: Math.round(hit.max),
          raw: hit.raw,
          notes: hit.notes,
          effective,
        };
      });
      scoredMagic.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (a.tier !== b.tier) return a.tier - b.tier;
        return byCodepoint(a.name, b.name);
      });
      const effectiveMagic = scoredMagic.filter((m) => m.effective);
      if (effectiveMagic.length > 0) {
        const bestMagic = effectiveMagic[0];
        magicObj = {
          weapon: bestMagic.weapon,
          score: bestMagic.score,
          dps: bestMagic.dps,
          perHit: bestMagic.perHit,
          cycleSeconds: bestMagic.cycleSeconds,
          isSecondary: bestMagic.isSecondary,
          confidence: bestMagic.confidence,
          timeToKill: bestMagic.timeToKill,
          hits: bestMagic.hits,
          min: bestMagic.min,
          max: bestMagic.max,
          raw: bestMagic.raw,
          notes: bestMagic.notes,
        };
      }
    }

    // 5. Bomb top 1
    const bombs = candidates.filter((w) => w.category === 'bomb');
    let bombObj = null;
    if (bombs.length > 0) {
      const scoredBombs = bombs.map((b) => {
        const stats = attackStats(b, null, creature, player, 'primary');
        const hit = perHit(b, null, creature, player);
        const effective = isEffectiveAttack(b, null, creature, player, hit);
        const scoreVal = rankBy === 'dps' ? stats.dps : stats.perHit;
        const hits = stats.perHit > 0 && hp > 0 ? Math.ceil(hp / stats.perHit) : null;
        return {
          weapon: b.id,
          name: b.name,
          tier: b.tier,
          score: Math.round(scoreVal),
          dps: stats.dps,
          perHit: stats.perHit,
          cycleSeconds: stats.cycleSeconds,
          confidence: stats.confidence,
          timeToKill: stats.timeToKill,
          hits,
          min: Math.round(hit.min),
          max: Math.round(hit.max),
          raw: hit.raw,
          notes: hit.notes,
          effective,
        };
      });
      scoredBombs.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (a.tier !== b.tier) return a.tier - b.tier;
        return byCodepoint(a.name, b.name);
      });
      const effectiveBombs = scoredBombs.filter((b) => b.effective);
      if (effectiveBombs.length > 0) {
        const bestBomb = effectiveBombs[0];
        bombObj = {
          weapon: bestBomb.weapon,
          score: bestBomb.score,
          dps: bestBomb.dps,
          perHit: bestBomb.perHit,
          cycleSeconds: bestBomb.cycleSeconds,
          confidence: bestBomb.confidence,
          timeToKill: bestBomb.timeToKill,
          hits: bestBomb.hits,
          min: bestBomb.min,
          max: bestBomb.max,
          raw: bestBomb.raw,
          notes: bestBomb.notes,
        };
      }
    }

    // 6. Avoid: combat damage types with mult <= 0.5 present on candidate weapons
    const q = player?.quality ?? 'max';
    const candidateDamageTypes = new Set();
    for (const c of candidates) {
      const d = weaponDamage(c, q);
      for (const [dt, val] of Object.entries(d ?? {})) {
        if (val > 0) candidateDamageTypes.add(dt);
      }
    }
    const avoid = [];
    for (const dt of COMBAT_DAMAGE_TYPES) {
      if (mods[dt] <= 0.5 && candidateDamageTypes.has(dt)) {
        avoid.push({ type: dt, mult: mods[dt] });
      }
    }
    avoid.sort((a, b) => a.mult - b.mult || byCodepoint(a.type, b.type));

    // 7. Tip: based on best weakness or top raw melee
    let bestWeakType = null;
    let maxWeakMult = 1;
    for (const dt of DAMAGE_TYPES) {
      if (mods[dt] > maxWeakMult && mods[dt] > 1) {
        maxWeakMult = mods[dt];
        bestWeakType = dt;
      }
    }

    let tipPrefix = '';
    if (bestWeakType) {
      let bestWeaponName = null;
      let bestWeaponScore = -1;

      for (const w of candidates) {
        const d = weaponDamage(w, q);
        if (d?.[bestWeakType] > 0) {
          let s = 0;
          if (w.category === 'arrow' && bowObj) {
            const bowWeapon = weapons.find((x) => x.id === bowObj.weapon);
            s = Math.round(perHit(bowWeapon, w, creature, player).avg);
          } else if (w.category === 'bolt' && crossbowObj) {
            const cWeapon = weapons.find((x) => x.id === crossbowObj.weapon);
            s = Math.round(perHit(cWeapon, w, creature, player).avg);
          } else {
            s = Math.round(perHit(w, null, creature, player).avg);
          }
          if (s > bestWeaponScore) {
            bestWeaponScore = s;
            bestWeaponName = w.name;
          }
        }
      }

      if (bestWeaponName) {
        const weaknessLabel = maxWeakMult === 2 ? 'Very weak' : 'Weak';
        tipPrefix = `${weaknessLabel} to ${capitalize(bestWeakType)} (\u00d7${maxWeakMult}): ${bestWeaponName} hits for ${bestWeaponScore} effective.`;
      }
    }

    if (!tipPrefix) {
      const topMelee = scoredMelee[0];
      if (topMelee) {
        const displayVal = rankBy === 'dps' ? (topMelee.raw || Math.round(topMelee.perHit)) : topMelee.score;
        tipPrefix = `No elemental weakness \u2014 best raw option: ${topMelee.name} (${displayVal}).`;
      } else {
        tipPrefix = 'No recommended weapons found for this biome.';
      }
    }

    const immuneTypes = COMBAT_DAMAGE_TYPES.filter((t) => creature?.modifiers?.[t] === 'immune');
    let immuneSuffix = '';
    if (immuneTypes.length > 0) {
      immuneSuffix = ` Immune to ${immuneTypes.map(capitalize).join(', ')}.`;
    }

    const tip = tipPrefix + immuneSuffix;

    return {
      tier,
      modifiers: mods,
      melee,
      bow: bowObj,
      arrows: arrowList,
      crossbow: crossbowObj,
      bolts: boltList,
      magic: magicObj,
      bomb: bombObj,
      avoid,
      tip,
    };
  }

  function setData(data) {
    if (data?.weaponQuality) globalThis._weaponQuality = data.weaponQuality;
    if (data?.attackProfiles) globalThis._attackProfiles = data.attackProfiles;
  }

  globalThis.VCRank = {
    DAMAGE_TYPES,
    COMBAT_DAMAGE_TYPES,
    MOD_TIERS,
    MELEE_CATEGORIES,
    SKILLS,
    DIFFICULTY,
    SET_BONUSES,
    DEFAULT_BACKSTAB,
    DEFAULT_PLAYER,
    skillFactor,
    effectiveSkill,
    weaponDamage,
    effectiveModifiers,
    buildNotes,
    rawDamage,
    score,
    rangedScore,
    perHit,
    creatureHp,
    recommend,
    capitalize,
    bowDrawSeconds,
    bowCycleSeconds,
    crossbowReloadSeconds,
    crossbowCycleSeconds,
    attackProfileFor,
    hasSecondaryAttack,
    attackStats,
    backstabOf,
    setData,
  };
})();
