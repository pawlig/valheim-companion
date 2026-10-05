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

  // Damage map at requested quality: damage + perLevel * (q - 1)
  function weaponDamage(weapon, quality = 'max') {
    if (!weapon) return {};
    const maxQ = weapon.maxQuality || 1;
    const q = quality === 'max' ? maxQ : Math.max(1, Math.min(Number(quality) || 1, maxQ));
    const baseDmg = weapon.damage || weapon.damageMax || {};
    const res = {};
    for (const [dt, baseVal] of Object.entries(baseDmg)) {
      const step = weapon.perLevel?.[dt] || 0;
      res[dt] = (baseVal || 0) + step * (q - 1);
    }
    return res;
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
    if (skillName) {
      const effSkill = effectiveSkill(player, skillName);
      factor = skillFactor(effSkill);
    }

    const diffMult = DIFFICULTY[player?.difficulty] ?? 1;
    const sneakMult = player?.sneak && weapon?.backstab ? weapon.backstab : 1;
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
    if (skillName) {
      factorAvg = skillFactor(effectiveSkill(player, skillName)).avg;
    }
    const diffMult = DIFFICULTY[player?.difficulty] ?? 1;
    const unresistedAvg = unresistedDmg * factorAvg * diffMult;

    return hit.avg >= 0.5 * unresistedAvg;
  }

  // Full recommendation for a creature in a given biome with player character settings
  function recommend(creature, biome, weapons, player = DEFAULT_PLAYER) {
    const gearTier = biome.gearTier;
    const mods = effectiveModifiers(creature);

    const candidates = weapons.filter((w) => w.tier != null && w.tier <= gearTier);

    // 1. Melee: top 3 from distinct categories
    const meleeCandidates = candidates.filter((w) => {
      if (!MELEE_CATEGORIES.includes(w.category)) return false;
      if (w.category === 'pickaxe' && (mods.pickaxe ?? 0) <= 0) return false;
      return true;
    });

    const scoredMelee = meleeCandidates.map((w) => {
      const hit = perHit(w, null, creature, player);
      return {
        weapon: w.id,
        name: w.name,
        category: w.category,
        tier: w.tier,
        score: Math.round(hit.avg),
        min: Math.round(hit.min),
        max: Math.round(hit.max),
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
        const hit = perHit(b, null, creature, player);
        return {
          weapon: b.id,
          name: b.name,
          tier: b.tier,
          score: Math.round(hit.avg),
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
        min: bestBow.min,
        max: bestBow.max,
      };

      const arrows = candidates.filter((w) => w.category === 'arrow');
      const scoredArrows = arrows.map((a) => {
        const hit = perHit(bestBow.rawWeapon, a, creature, player);
        const effective = isEffectiveAttack(bestBow.rawWeapon, a, creature, player, hit);
        return {
          weapon: a.id,
          name: a.name,
          tier: a.tier,
          score: Math.round(hit.avg),
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
        const hit = perHit(c, null, creature, player);
        return {
          weapon: c.id,
          name: c.name,
          tier: c.tier,
          score: Math.round(hit.avg),
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
        min: bestCrossbow.min,
        max: bestCrossbow.max,
      };

      const bolts = candidates.filter((w) => w.category === 'bolt');
      const scoredBolts = bolts.map((b) => {
        const hit = perHit(bestCrossbow.rawWeapon, b, creature, player);
        const effective = isEffectiveAttack(bestCrossbow.rawWeapon, b, creature, player, hit);
        return {
          weapon: b.id,
          name: b.name,
          tier: b.tier,
          score: Math.round(hit.avg),
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
        const hit = perHit(m, null, creature, player);
        const effective = isEffectiveAttack(m, null, creature, player, hit);
        return {
          weapon: m.id,
          name: m.name,
          tier: m.tier,
          score: Math.round(hit.avg),
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
        magicObj = {
          weapon: effectiveMagic[0].weapon,
          score: effectiveMagic[0].score,
          min: effectiveMagic[0].min,
          max: effectiveMagic[0].max,
          raw: effectiveMagic[0].raw,
          notes: effectiveMagic[0].notes,
        };
      }
    }

    // 5. Bomb top 1
    const bombs = candidates.filter((w) => w.category === 'bomb');
    let bombObj = null;
    if (bombs.length > 0) {
      const scoredBombs = bombs.map((b) => {
        const hit = perHit(b, null, creature, player);
        const effective = isEffectiveAttack(b, null, creature, player, hit);
        return {
          weapon: b.id,
          name: b.name,
          tier: b.tier,
          score: Math.round(hit.avg),
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
        bombObj = {
          weapon: effectiveBombs[0].weapon,
          score: effectiveBombs[0].score,
          min: effectiveBombs[0].min,
          max: effectiveBombs[0].max,
          raw: effectiveBombs[0].raw,
          notes: effectiveBombs[0].notes,
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
        tipPrefix = `No elemental weakness \u2014 best raw option: ${topMelee.name} (${topMelee.score}).`;
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
      gearTier,
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

  globalThis.VCRank = {
    DAMAGE_TYPES,
    COMBAT_DAMAGE_TYPES,
    MOD_TIERS,
    MELEE_CATEGORIES,
    SKILLS,
    DIFFICULTY,
    SET_BONUSES,
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
  };
})();
