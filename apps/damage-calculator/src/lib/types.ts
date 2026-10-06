import type { BiomeId } from "@/data/biomes";
import type { WeaponClass } from "@/data/weapon-class";

export type DamageType =
  | "blunt"
  | "pierce"
  | "slash"
  | "fire"
  | "frost"
  | "lightning"
  | "poison"
  | "spirit"
  | "chop"
  | "pickaxe"
  | "pure";

/** Per-quality damage for a single damage type: [Q1, Q2, Q3, Q4]. */
export type QualityValues = [number, number, number, number];

export type DamageMap = Partial<Record<DamageType, QualityValues>>;

/** Damage types that always hurt creatures. `chop` and `pickaxe` are terrain
 *  damage (woodcutting / mining); they count only against the few targets that
 *  publish an explicit modifier for them (see damage.ts). */
export const COMBAT_DAMAGE_TYPES = [
  "blunt",
  "pierce",
  "slash",
  "fire",
  "frost",
  "lightning",
  "poison",
  "spirit",
] as const satisfies readonly DamageType[];

export const TERRAIN_DAMAGE_TYPES = [
  "chop",
  "pickaxe",
  "pure",
] as const satisfies readonly DamageType[];

export const ALL_DAMAGE_TYPES: DamageType[] = [
  ...COMBAT_DAMAGE_TYPES,
  ...TERRAIN_DAMAGE_TYPES,
];

export type WeaponGroup = "melee" | "ranged" | "magic" | "consumable" | "siege";

export interface Weapon {
  slug: string;
  name: string;
  wikiTitle: string;
  wikiUrl: string;
  image: string;
  gameId: string;
  cls: WeaponClass;
  clsLabel: string;
  wielding: string;
  group: WeaponGroup;
  /** Backstab bonus the wiki publishes on the weapon tooltip (2×–6×), written
   *  as "3x". Absent on most pages; the engine then falls back to the class
   *  rule on the wiki's Weapons page — see backstabMultiplier(). */
  backstab?: number;
  damage: DamageMap;
  scaledFromTable: boolean;
  stamina?: number;
  ammo?: "arrow" | "bolt";
  /** First biome the item can be crafted in, derived from its recipe. */
  biome: BiomeId;
  /** True for items crafted in batches with a single damage value (bombs,
   *  ballista missiles, catapult ammo) rather than an upgradable weapon. */
  consumable?: boolean;
  /** False when no weapon skill applies (siege engines, thrown bombs). */
  skillScaled?: boolean;
}

export interface Ammo {
  slug: string;
  name: string;
  wikiTitle: string;
  wikiUrl: string;
  image: string;
  kind: "arrow" | "bolt";
  damage: DamageMap;
  /** First biome the ammo can be crafted in, derived from its recipe. */
  biome: BiomeId;
}

/** A single ingredient line of a recipe. */
export interface RecipeMaterial {
  name: string;
  quantity: number;
}

/** A crafting recipe, straight from the wiki infobox. */
export interface Recipe {
  station: string;
  stationLevel: number;
  /** Materials for quality 1..4; index 0 is the crafting recipe itself. */
  qualities: RecipeMaterial[][];
  /** Items produced per craft (consumables are crafted in batches). */
  quantity?: number;
}

/** Recipes by item slug, as committed by `npm run scrape`. */
export type RecipeBook = Record<string, Recipe>;

export type ResistanceTier =
  | "very-weak"
  | "weak"
  | "neutral"
  | "resistant"
  | "very-resistant"
  | "immune";

/** What a target is: a summonable Forsaken, one of Hildir's minibosses, or a
 *  regular aggressive creature. */
export type CreatureKind = "boss" | "miniboss" | "enemy";

export interface Creature {
  slug: string;
  name: string;
  wikiTitle: string;
  wikiUrl: string;
  image: string;
  kind: CreatureKind;
  health: number;
  /** Total health across all phases where the target has more than one. */
  healthPhases?: number[];
  biome: BiomeId;
  resistances: Partial<Record<DamageType, ResistanceTier>>;
  /** Free-text caveat shown on the target card (e.g. phase behaviour). */
  note?: string;
}

export const RESISTANCE_MULTIPLIER: Record<ModifierTier, number> = {
  "very-weak": 2,
  weak: 1.5,
  neutral: 1,
  resistant: 0.5,
  "very-resistant": 0.25,
  immune: 0,
};

/** `neutral` doubles as the default when a target has no entry for a damage
 *  type, and as an explicitly published tier (Barka lists "Chop: neutral"),
 *  so it lives inside ResistanceTier and shares the same modifier scale. */
export type ModifierTier = ResistanceTier;

export const RESISTANCE_LABEL: Record<ModifierTier, string> = {
  "very-weak": "Very weak",
  weak: "Weak",
 neutral: "Neutral",
  resistant: "Resistant",
  "very-resistant": "Very resistant",
  immune: "Immune",
};

export const DAMAGE_LABEL: Record<DamageType, string> = {
  blunt: "Blunt",
  pierce: "Pierce",
  slash: "Slash",
  fire: "Fire",
  frost: "Frost",
  lightning: "Lightning",
  poison: "Poison",
  spirit: "Spirit",
  chop: "Chop",
  pickaxe: "Pickaxe",
  pure: "Pure",
};

/** Tailwind-friendly accent colours per damage type. */
export const DAMAGE_COLOR: Record<DamageType, string> = {
  blunt: "text-orange-300",
  pierce: "text-slate-300",
  slash: "text-emerald-300",
  fire: "text-red-400",
  frost: "text-cyan-300",
  lightning: "text-violet-300",
  poison: "text-lime-300",
  spirit: "text-fuchsia-300",
  chop: "text-amber-600",
  pickaxe: "text-stone-400",
  pure: "text-neutral-300",
};
