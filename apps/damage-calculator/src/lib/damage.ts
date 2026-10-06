import {
  attackProfileFor,
  cycleSecondsFor,
  primaryProfileFor,
  type AttackKind,
  type AttackProfile,
  type TimingConfidence,
  type TimingSource,
} from "@/data/attack-profiles";
import type { WeaponClass } from "@/data/weapon-class";
import {
  ALL_DAMAGE_TYPES,
  COMBAT_DAMAGE_TYPES,
  DAMAGE_LABEL,
  RESISTANCE_MULTIPLIER,
  type Ammo,
  type Creature,
  type DamageMap,
  type DamageType,
  type Weapon,
} from "./types";

/* ------------------------------------------------------------------ *
 * Skill factor
 * https://valheim.weirdgloop.org/wiki/Damage_mechanics
 *
 *   min = 0.25 + 0.006 x skill level            (0.25 -> 0.85 at level 100)
 *   max = min(0.55 + 0.006 x skill level, 1.0)  (0.55 -> 1.00 at level 75)
 *
 * The tooltip shows this range in yellow parentheses; the average is what a
 * player sees over a long fight.
 * ------------------------------------------------------------------ */

export type SkillMode = "min" | "avg" | "max";

export function skillFactor(level: number, mode: SkillMode = "avg"): number {
  const clamped = Math.max(0, Math.min(100, level));
  const min = Math.min(0.25 + 0.006 * clamped, 1);
  const max = Math.min(0.55 + 0.006 * clamped, 1);
  if (mode === "min") return min;
  if (mode === "max") return max;
  return (min + max) / 2;
}

/* ------------------------------------------------------------------ *
 * Backstab bonus
 * https://valheim.weirdgloop.org/wiki/Weapons#Backstab
 *
 *   damage = listed damage × skill factor × (backstab bonus × stagger bonus
 *            × attack bonus × multitarget penalty × damage type modifier)
 *
 * The bonus only applies to an unaware enemy (the wiki's red exclamation
 * point), and backstabbing gives that enemy five minutes of backstab
 * immunity — so it is a one-hit opening, never sustained damage. The wiki
 * states the multiplier per weapon type:
 *   Abyssal Harpoon 1× · two-handed clubs 2× · Flesh Rippers and all knives
 *   6× · every other weapon 3×
 * A page that publishes its own value in the infobox wins over the class rule
 * (Dundr 1×, the siege payloads 4×).
 * ------------------------------------------------------------------ */

/** Backstab multipliers the wiki calls out by class; other classes use
 *  DEFAULT_BACKSTAB. */
const BACKSTAB_BY_CLASS: Partial<Record<WeaponClass, number>> = {
  sledge: 2, // "Two-handed clubs: 2x"
  knife: 6, // "Knives and Flesh rippers: 6x"
};

/** Items the class rule gets wrong. Flesh Rippers is named on its own next to
 *  the knives on the wiki's Weapons page, even though it is a fist weapon.
 *  Abyssal Harpoon (1×) needs no entry: its infobox publishes the value. */
const BACKSTAB_BY_SLUG: Record<string, number> = {
  "flesh-rippers": 6,
};

/** "All other weapons, including bows and one-handed clubs: 3x". */
export const DEFAULT_BACKSTAB = 3;

/** Backstab bonus of a weapon on the first hit against an unaware enemy.
 *
 * Precedence: the value the weapon's own infobox publishes, then the named
 * exceptions, then the weapon class, then the 3× default. */
export function backstabMultiplier(weapon: Weapon): number {
  return (
    weapon.backstab ??
    BACKSTAB_BY_SLUG[weapon.slug] ??
    BACKSTAB_BY_CLASS[weapon.cls] ??
    DEFAULT_BACKSTAB
  );
}

/* ------------------------------------------------------------------ *
 * Damage at a given upgrade quality
 * ------------------------------------------------------------------ */

export const MAX_QUALITY = 4;

export function damageAtQuality(
  map: DamageMap | undefined,
  type: DamageType,
  quality: number,
): number {
  if (!map) return 0;
  const values = map[type];
  if (!values) return 0;
  const index = Math.max(0, Math.min(MAX_QUALITY - 1, Math.round(quality) - 1));
  return values[index] ?? 0;
}

/** Whether a terrain damage type can hurt the target at all.
 *
 * The wiki files chop and pickaxe under terrain damage (woodcutting / mining):
 * they do nothing to creatures in general. A few targets publish an explicit
 * modifier anyway — Stone Golem is very weak to pickaxe, Kvastur weak to chop,
 * Barka neutral to chop — and any listed tier with a multiplier above zero
 * makes the type count: an explicit neutral counts at x1, only immunity (x0)
 * keeps it out. */
function terrainTypeCounts(target: Creature, type: DamageType): boolean {
  const tier = target.resistances[type];
  return tier !== undefined && (RESISTANCE_MULTIPLIER[tier] ?? 0) > 0;
}

/** The damage types this weapon (plus ammo) deals that can hurt the target:
 *  every combat type it carries, plus chop/pickaxe where the target is
 *  explicitly vulnerable to them. */
export function damageTypesFor(
  weapon: Weapon,
  ammo: Ammo | null | undefined,
  target: Creature,
): DamageType[] {
  const present = new Set<DamageType>();
  for (const type of ALL_DAMAGE_TYPES) {
    let hasDamage = false;
    for (let q = 1; q <= MAX_QUALITY; q++) {
      if (
        damageAtQuality(weapon.damage, type, q) > 0 ||
        (ammo && damageAtQuality(ammo.damage, type, q) > 0)
      ) {
        hasDamage = true;
        break;
      }
    }
    if (hasDamage) present.add(type);
  }
  return ALL_DAMAGE_TYPES.filter(
    (t) =>
      present.has(t) &&
      ((COMBAT_DAMAGE_TYPES as readonly DamageType[]).includes(t) ||
        terrainTypeCounts(target, t)),
  );
}

/* ------------------------------------------------------------------ *
 * Calculation
 * ------------------------------------------------------------------ */

export interface CalculationInput {
  weapon: Weapon;
  quality: number;
  ammo?: Ammo | null;
  target: Creature;
  skillLevel: number;
  skillMode: SkillMode;
  attack: AttackKind;
  /** Apply the weapon's backstab bonus to the first hit, as if the target is
   *  unaware. Later hits are normal because the target is then backstab-immune
   *  for five minutes. */
  backstab?: boolean;
}

export interface DamageLine {
  type: DamageType;
  label: string;
  /** Raw listed damage from the weapon (plus ammo) at this quality. */
  base: number;
  /** Resistance tier name, or "neutral" when the target has no modifier. */
  tier: "very-weak" | "weak" | "neutral" | "resistant" | "very-resistant" | "immune";
  multiplier: number;
  /** base x skill factor x attack multiplier x resistance multiplier. */
  effective: number;
}

export interface CalculationResult {
  lines: DamageLine[];
  /** Damage of a single normal hit of the chosen attack, after resistances. */
  perHit: number;
  /** Raw listed damage per hit, before any modifier. */
  perHitRaw: number;
  /** Damage of one full repeat cycle, every combo hit included. */
  cycleDamage: number;
  /** Cycle DPS: full-cycle damage over the cycle time. Stamina/eitr are not modelled. */
  dps: number;
  /** Seconds to deal target.health: scheduled or averaged, see ttkMethod. */
  ttk: number;
  /** Seconds of one full repeat cycle at this skill level. */
  cycleSeconds: number;
  /** Damage events per cycle: 3 for a 3-hit combo, 6 for the dual axes. */
  eventCount: number;
  timingConfidence: TimingConfidence;
  timingSource: TimingSource;
  timingNote?: string;
  /** "scheduled": published hit times drive the kill; "averaged": steady cycle DPS. */
  ttkMethod: "scheduled" | "averaged";
  skillFactor: number;
  /** The weapon's backstab bonus (2×–6×), whether or not it is applied. */
  backstabMultiplier: number;
  /** True when the first hit carries the backstab bonus. */
  backstabApplied: boolean;
}

/**
 * Time to kill. With a published hit schedule the hits are placed at their
 * real times and the kill lands on the hit that crosses the health pool
 * (overkill included). Without one, the cycle DPS is used as a steady
 * average, which is marked `averaged` in the UI.
 *
 * `openingPerHit` is the first hit of the fight, which is the one backstab
 * boosts; every later hit uses `perHit`. With backstab off the two are equal
 * and this reduces to the plain combo.
 */
function timeToKill(
  health: number,
  perHit: number,
  openingPerHit: number,
  profile: AttackProfile,
  cycleSeconds: number,
  dps: number,
): { ttk: number; method: CalculationResult["ttkMethod"] } {
  if (!(perHit > 0) || !(health > 0)) {
    return { ttk: Number.POSITIVE_INFINITY, method: "averaged" };
  }

  const hitTimes = profile.hitTimes;
  if (hitTimes && hitTimes.length === profile.comboMults.length) {
    let dealt = 0;
    for (let cycle = 0; cycle < 100000; cycle += 1) {
      for (let hit = 0; hit < hitTimes.length; hit += 1) {
        const opening = cycle === 0 && hit === 0;
        dealt += (opening ? openingPerHit : perHit) * profile.comboMults[hit];
        if (dealt >= health) {
          return { ttk: cycle * cycleSeconds + hitTimes[hit], method: "scheduled" };
        }
      }
    }
  }

  return { ttk: dps > 0 ? health / dps : Number.POSITIVE_INFINITY, method: "averaged" };
}

export function calculate(input: CalculationInput): CalculationResult {
  const { weapon, quality, ammo, target, skillLevel, skillMode, attack } = input;
  /* Bombs, ballista missiles and catapult ammo scale with no weapon skill, so
   * the skill curve must not be applied to them. */
  const skill =
    weapon.skillScaled === false ? 1 : skillFactor(skillLevel, skillMode);
  /* Secondary falls back to primary when a class has no secondary attack. */
  const profile = attackProfileFor(weapon, attack) ?? primaryProfileFor(weapon);
  const cycleSeconds = cycleSecondsFor(profile, skillLevel);

  /* Backstab is a one-hit opening, so it scales only the hit shown as "per
   * hit" — here the first hit of the cycle. */
  const backstabApplied = input.backstab === true;
  const backstabMult = backstabMultiplier(weapon);
  const openingMult = backstabApplied ? backstabMult : 1;

  const lines: DamageLine[] = [];
  for (const type of damageTypesFor(weapon, ammo, target)) {
    const base =
      damageAtQuality(weapon.damage, type, quality) +
      (ammo ? damageAtQuality(ammo.damage, type, quality) : 0);
    const tier = target.resistances[type] ?? "neutral";
    const multiplier = RESISTANCE_MULTIPLIER[tier as keyof typeof RESISTANCE_MULTIPLIER] ?? 1;
    const effective =
      base * skill * profile.damageMult * multiplier * openingMult;
    lines.push({ type, label: DAMAGE_LABEL[type], base, tier, multiplier, effective });
  }

  const perHit = lines.reduce((sum, l) => sum + l.effective, 0);
  const perHitRaw = lines.reduce((sum, l) => sum + l.base, 0);
  /* The same hit without the opening bonus: what the cycle's later hits deal. */
  const steadyPerHit = openingMult === 1 ? perHit : perHit / openingMult;

  const combos = profile.comboMults;
  const firstWeight = combos[0] ?? 1;
  const restWeight = combos.reduce((sum, mult) => sum + mult, 0) - firstWeight;
  const cycleDamage = perHit * firstWeight + steadyPerHit * restWeight;
  const dps = cycleSeconds > 0 ? cycleDamage / cycleSeconds : 0;
  const { ttk, method } = timeToKill(
    target.health,
    steadyPerHit,
    perHit,
    profile,
    cycleSeconds,
    dps,
  );

  return {
    lines,
    perHit,
    perHitRaw,
    cycleDamage,
    dps,
    ttk,
    cycleSeconds,
    eventCount: combos.length,
    timingConfidence: profile.confidence,
    timingSource: profile.source,
    timingNote: profile.note,
    ttkMethod: method,
    skillFactor: skill,
    backstabMultiplier: backstabMult,
    backstabApplied,
  };
}

/** Convenience wrapper used by the ranking table. */
export function calculateComparison(
  weapons: Weapon[],
  base: Omit<CalculationInput, "weapon">,
): { weapon: Weapon; result: CalculationResult }[] {
  return weapons.map((weapon) => ({
    weapon,
    result: calculate({ ...base, weapon }),
  }));
}

/* ------------------------------------------------------------------ *
 * Formatting helpers
 * ------------------------------------------------------------------ */

/** Thousands-grouped integer, formatted with a pinned locale.
 *
 * A bare `toLocaleString()` follows the *runtime* locale, so a cs-CZ server
 * rendered "2 500" while an en-US browser rendered "2,500" — React reported
 * that as a hydration mismatch. Pinning the locale keeps the server, the
 * prerender and every visitor in agreement.
 */
const GROUPED_INTEGER = new Intl.NumberFormat("en-US");

export function formatCount(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return GROUPED_INTEGER.format(n);
}

export function formatDamage(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return n >= 100 ? formatCount(Math.round(n)) : n.toFixed(1);
}

export function formatSeconds(seconds: number): string {
  if (!Number.isFinite(seconds)) return "—";
  if (seconds >= 3600) return `${(seconds / 3600).toFixed(1)} h`;
  if (seconds >= 60) {
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}m ${s}s`;
  }
  return `${seconds.toFixed(1)}s`;
}

/** "Best" tier of resistance the target has against the weapon's damage mix. */
export function worstTierFor(lines: DamageLine[]): DamageLine["tier"] {
  const order: DamageLine["tier"][] = [
    "immune",
    "very-resistant",
    "resistant",
    "neutral",
    "weak",
    "very-weak",
  ];
  let worst: DamageLine["tier"] = "very-weak";
  for (const line of lines) {
    if (order.indexOf(line.tier) < order.indexOf(worst)) worst = line.tier;
  }
  return worst;
}
