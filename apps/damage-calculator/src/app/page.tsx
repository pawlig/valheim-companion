
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { Hammer, SlidersHorizontal } from "lucide-react";
import { MethodologyDialog, MethodologyLink } from "@/components/assumptions";
import { BiomeSlider, useBiomeProgression } from "@/components/biome-slider";
import { ProgressionGuide } from "@/components/progression-guide";
import { TargetPicker } from "@/components/target-picker";
import { ItemImage, WikiLink } from "@/components/item-image";
import { ShareViewButton } from "@/components/share-view";
import { WeaponsTable, type SortKey } from "@/components/weapons-table";
import { WeaponDetail } from "@/components/weapon-detail";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Segmented } from "@/components/ui/segmented";
import { Slider } from "@/components/ui/slider";
import { hasSecondaryAttack, type AttackKind } from "@/data/attack-profiles";
import type { WeaponClass } from "@/data/weapon-class";
import { arrows, bolts, CLASS_LABELS, recipes, targets, weapons } from "@/lib/data";
import { BIOMES, BIOME_NAME, type BiomeId } from "@/data/biomes";
import { calculate, formatCount, type SkillMode } from "@/lib/damage";
import {
  itemBiomeLookup,
  maxQualityAt,
  visibleAtBiome,
} from "@/lib/progression";
import {
  COMBAT_DAMAGE_TYPES,
  type Ammo,
  type Creature,
  type Weapon,
} from "@/lib/types";
import {
  INITIAL_VIEW_SEARCH,
  parseViewQuery,
  replaceViewUrl,
  subscribeViewUrl,
  VIEW_DEFAULTS,
  viewUrlServerSnapshot,
  viewUrlSnapshot,
  type ViewState,
} from "@/lib/view-url";

const totalDamage = (a: Ammo) =>
  COMBAT_DAMAGE_TYPES.reduce((sum, t) => sum + (a.damage[t]?.[0] ?? 0), 0);

const bestAmmo = (list: Ammo[]): Ammo | null =>
  [...list].sort((a, b) => totalDamage(b) - totalDamage(a))[0] ?? null;

/** Target shown when neither the URL nor the user has chosen one. */
const DEFAULT_TARGET_SLUG =
  targets.find((t) => t.slug === "bonemass")?.slug ?? targets[0].slug;

export default function Home() {
  const [storedBiome, persistBiome] = useBiomeProgression();

  /* The view carried by the query string, read as an external store so the
   * prerendered HTML and the first client render agree (the server snapshot is
   * empty). See the store in src/lib/view-url.ts. */
  const urlSearch = useSyncExternalStore(
    subscribeViewUrl,
    viewUrlSnapshot,
    viewUrlServerSnapshot,
  );
  const urlView = useMemo(() => parseViewQuery(urlSearch), [urlSearch]);

  /* Each shareable selection stays undecided until the user touches it, so a
   * linked view stays live until then. `undefined` means undecided; the weapon
   * also has a distinct `null` for "no pick — show the best". */
  const [pickedBiome, setPickedBiome] = useState<BiomeId | undefined>(undefined);
  const [pickedTarget, setPickedTarget] = useState<string | undefined>(
    undefined,
  );
  const [pickedWeapon, setPickedWeapon] = useState<
    string | null | undefined
  >(undefined);
  const [pickedClass, setPickedClass] = useState<
    "all" | WeaponClass | undefined
  >(undefined);

  const biome = pickedBiome ?? urlView.biome ?? storedBiome;
  const targetSlug = pickedTarget ?? urlView.target ?? DEFAULT_TARGET_SLUG;
  const weaponSlug =
    pickedWeapon !== undefined ? pickedWeapon : (urlView.weapon ?? null);
  const classFilter = pickedClass ?? urlView.cls ?? "all";

  /** Choosing a biome also remembers it for the next visit. */
  const setBiome = (next: BiomeId) => {
    setPickedBiome(next);
    persistBiome(next);
  };

  /** A class label toggles the ranking filter: it selects that class, and a
   *  second click clears it back to All classes. */
  const toggleClass = (next: WeaponClass) => {
    setPickedClass(classFilter === next ? "all" : next);
  };

  /* The calculation controls follow the same undecided-until-touched rule, so
   * a shared link reproduces the sender's exact numbers instead of opening on
   * the built-in defaults. */
  const [pickedQuality, setPickedQuality] = useState<number | undefined>(
    undefined,
  );
  const [pickedSkillLevel, setPickedSkillLevel] = useState<number | undefined>(
    undefined,
  );
  const [pickedSkillMode, setPickedSkillMode] = useState<
    SkillMode | undefined
  >(undefined);
  const [pickedAttack, setPickedAttack] = useState<AttackKind | undefined>(
    undefined,
  );
  const [pickedBackstab, setPickedBackstab] = useState<boolean | undefined>(
    undefined,
  );
  /* Ammo selection starts empty (auto): the best *reachable* ammo is derived
   * from the slider, so no later-biome arrow is ever preselected. */
  const [pickedArrow, setPickedArrow] = useState<string | undefined>(undefined);
  const [pickedBolt, setPickedBolt] = useState<string | undefined>(undefined);
  const [sortKey, setSortKey] = useState<SortKey>("dps");

  const quality = pickedQuality ?? urlView.level ?? VIEW_DEFAULTS.level;
  const skillLevel = pickedSkillLevel ?? urlView.skill ?? VIEW_DEFAULTS.skill;
  const skillMode = pickedSkillMode ?? urlView.roll ?? VIEW_DEFAULTS.roll;
  const attack = pickedAttack ?? urlView.attack ?? VIEW_DEFAULTS.attack;
  const backstab = pickedBackstab ?? urlView.backstab ?? VIEW_DEFAULTS.backstab;
  const arrowSlug = pickedArrow ?? urlView.arrow ?? "";
  const boltSlug = pickedBolt ?? urlView.bolt ?? "";

  /* --- progression gating ------------------------------------------- *
   * Everything below is filtered by the slider: creatures up to the chosen
   * biome (Forsaken, minibosses and regular enemies alike), and items whose
   * crafting recipe is reachable at that point. Selections that fall out of
   * range move up to the best remaining option instead of leaving the page
   * pointing at unreachable gear. */
  const reachableTargets = useMemo(() => visibleAtBiome(targets, biome), [biome]);
  const reachableWeapons = useMemo(() => visibleAtBiome(weapons, biome), [biome]);
  const reachableArrows = useMemo(() => visibleAtBiome(arrows, biome), [biome]);
  const reachableBolts = useMemo(() => visibleAtBiome(bolts, biome), [biome]);

  /* Preferred selection for a slider step: the biome's own Forsaken when there
   * is one, otherwise the last creature reachable at that step (the Ocean
   * fallback is the Serpent). */
  const fallbackTarget = useCallback(
    (step: BiomeId, list: Creature[]) =>
      list.find((t) => t.slug === BIOMES.find((b) => b.id === step)?.boss) ??
      list[list.length - 1] ??
      targets[0],
    [],
  );

  const target =
    reachableTargets.find((t) => t.slug === targetSlug) ??
    fallbackTarget(biome, reachableTargets);
  const arrow =
    reachableArrows.find((a) => a.slug === arrowSlug) ??
    bestAmmo(reachableArrows);
  const bolt =
    reachableBolts.find((b) => b.slug === boltSlug) ??
    bestAmmo(reachableBolts);

  /* Moving the slider commits any clamp immediately: a selection that the new
   * step cannot reach moves up to the best remaining option, while a selection
   * that is still valid is kept. Doing it here rather than in an effect keeps
   * the state and the screen in step without an extra render pass. */
  const applyBiome = (next: BiomeId) => {
    setBiome(next);

    const nextTargets = visibleAtBiome(targets, next);
    setPickedTarget(
      nextTargets.some((t) => t.slug === target.slug)
        ? target.slug
        : fallbackTarget(next, nextTargets).slug,
    );

    const nextWeapons = visibleAtBiome(weapons, next);
    if (weaponSlug && !nextWeapons.some((w) => w.slug === weaponSlug)) {
      setPickedWeapon(null); // null means "best available", which is always valid
    }

    /* Keep an explicitly chosen arrow/bolt while it stays reachable, otherwise
     * drop back to "auto" (the best reachable one) rather than pinning a slug
     * that only happens to be the best today. */
    const nextArrows = visibleAtBiome(arrows, next);
    setPickedArrow(
      arrow && nextArrows.some((a) => a.slug === arrow.slug) ? arrow.slug : "",
    );
    const nextBolts = visibleAtBiome(bolts, next);
    setPickedBolt(
      bolt && nextBolts.some((b) => b.slug === bolt.slug) ? bolt.slug : "",
    );
  };

  /** Materials that are themselves items, for upgrade-level checks. */
  const itemBiome = useMemo(
    () => itemBiomeLookup([...weapons, ...arrows, ...bolts]),
    [],
  );
  /** Highest upgrade level this weapon can actually reach at the slider. */
  const qualityFor = useCallback(
    (weapon: Weapon) => Math.min(quality, maxQualityAt(recipes[weapon.slug], biome, itemBiome)),
    [quality, biome, itemBiome],
  );

  /** Every reachable weapon evaluated against the current target and settings,
   *  each at the best upgrade level that is reachable for it. */
  const rows = useMemo(() => {
    const ammoFor = (weapon: Weapon): Ammo | null =>
      weapon.ammo === "arrow" ? arrow : weapon.ammo === "bolt" ? bolt : null;
    return reachableWeapons.map((weapon) => ({
      weapon,
      result: calculate({
        weapon,
        ammo: ammoFor(weapon),
        quality: qualityFor(weapon),
        target,
        skillLevel,
        skillMode,
        attack,
        backstab,
      }),
    }));
  }, [reachableWeapons, qualityFor, arrow, bolt, target, skillLevel, skillMode, attack, backstab]);

  const topRow = useMemo(() => {
    const sorted = [...rows].sort((a, b) =>
      sortKey === "ttk"
        ? a.result.ttk - b.result.ttk
        : b.result[sortKey] - a.result[sortKey],
    );
    return sorted[0];
  }, [rows, sortKey]);

  const selectedWeapon =
    reachableWeapons.find((w) => w.slug === weaponSlug) ??
    topRow?.weapon ??
    reachableWeapons[0] ??
    weapons[0];
  /** The level shown for the selected weapon — clamped to what is reachable. */
  const selectedQuality = qualityFor(selectedWeapon);
  const qualityNote =
    selectedQuality < quality
      ? `Upgrade level ${quality} needs materials from a later biome, so ${BIOME_NAME[biome]}-reachable level ${selectedQuality} is shown instead.`
      : undefined;

  /* --- shareable URL --------------------------------------------------- *
   * The address bar mirrors the view so it is always bookmarkable. Writing to
   * the URL is an external-system update, not React state, which is why it is
   * allowed here; *reading* the incoming view is handled by the
   * useSyncExternalStore above rather than copied into state from an effect.
   * replaceState, never pushState: filtering should not fill the back button. */
  /** Everything a shared link has to carry to reproduce these numbers. */
  const view: ViewState = useMemo(
    () => ({
      biome,
      target: target.slug,
      weapon: weaponSlug,
      cls: classFilter,
      level: quality,
      skill: skillLevel,
      roll: skillMode,
      attack,
      backstab,
      arrow: arrowSlug || null,
      bolt: boltSlug || null,
    }),
    [
      biome,
      target.slug,
      weaponSlug,
      classFilter,
      quality,
      skillLevel,
      skillMode,
      attack,
      backstab,
      arrowSlug,
      boltSlug,
    ],
  );

  const awaitingHydration =
    INITIAL_VIEW_SEARCH !== "" && urlSearch === "";
  useEffect(() => {
    if (awaitingHydration) return; // do not overwrite the link being opened
    replaceViewUrl(view);
  }, [view, awaitingHydration]);

  const selectedAmmo =
    selectedWeapon.ammo === "arrow"
      ? arrow
      : selectedWeapon.ammo === "bolt"
        ? bolt
        : null;
  const canUseSecondary = hasSecondaryAttack(selectedWeapon);

  const selectedResult = useMemo(
    () =>
      calculate({
        weapon: selectedWeapon,
        ammo: selectedAmmo,
        quality: selectedQuality,
        target,
        skillLevel,
        skillMode,
        attack: attack === "secondary" && !canUseSecondary ? "primary" : attack,
        backstab,
      }),
    [selectedWeapon, selectedAmmo, selectedQuality, target, skillLevel, skillMode, attack, canUseSecondary, backstab],
  );

  const maxPerHit = useMemo(
    () => rows.reduce((m, r) => Math.max(m, r.result.perHit), 0),
    [rows],
  );
  const bestPick = useMemo(
    () => ({ weapon: topRow.weapon, perHit: maxPerHit, dps: topRow.result.dps }),
    [topRow, maxPerHit],
  );

  return (
    <main className="mx-auto w-full max-w-[1550px] space-y-6 px-4 py-8 sm:px-6">
      <header className="space-y-3">
        {/* Back to the companion hub; the name is not translated. */}
        <a
          href="/"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground opacity-80 transition-colors hover:text-primary hover:opacity-100"
        >
          ← Valheim Companion
        </a>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
            <Hammer className="size-6 text-primary" />
          </div>
          <div>
            <h1 className="font-heading text-3xl font-bold tracking-wide sm:text-4xl">
              Valheim Damage Calculator
            </h1>
            <p className="text-sm text-muted-foreground">
              Pick a target, pick a weapon, set the upgrade level and see the
              damage that actually lands — resistances applied.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary" className="font-normal">
            {weapons.length} weapons
          </Badge>
          <Badge variant="secondary" className="font-normal">
            {targets.length} targets
          </Badge>
          <Badge variant="outline" className="font-normal">
            Data from the Valheim wiki
          </Badge>
          <MethodologyDialog className="ml-auto" />
          <ShareViewButton view={view} />
        </div>
      </header>

      <BiomeSlider
        value={biome}
        onChange={applyBiome}
        bossName={
          targets.find(
            (t) => t.slug === BIOMES.find((entry) => entry.id === biome)?.boss,
          )?.name
        }
        visibleWeapons={reachableWeapons.length}
        totalWeapons={weapons.length}
        visibleTargets={reachableTargets.length}
        totalTargets={targets.length}
      />

      <ProgressionGuide
        biome={biome}
        skillLevel={skillLevel}
        skillMode={skillMode}
      />

      <TargetPicker
        targets={reachableTargets}
        total={targets.length}
        selected={target}
        onSelect={(t) => setPickedTarget(t.slug)}
      />

      {/* ---------------- global controls ---------------- */}
      <Card className="gap-0 py-0">
        <CardContent className="grid gap-5 px-4 py-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5 text-[11px] tracking-wide text-muted-foreground uppercase">
                <SlidersHorizontal className="size-3" />
                Weapon skill level
              </Label>
              <span className="text-sm font-semibold tabular-nums">
                {skillLevel}
              </span>
            </div>
            <Slider
              value={[skillLevel]}
              min={0}
              max={100}
              step={1}
              onValueChange={(value) => {
                const next = Array.isArray(value) ? value[0] : value;
                if (typeof next === "number") setPickedSkillLevel(next);
              }}
              aria-label="Weapon skill level"
            />
            <Segmented
              value={skillMode}
              onChange={setPickedSkillMode}
              ariaLabel="Skill factor roll"
              className="w-full"
              itemClassName="flex-1 text-xs"
              options={[
                { value: "min", label: "Min roll" },
                { value: "avg", label: "Average" },
                { value: "max", label: "Max roll" },
              ]}
            />
            <p className="text-[11px] leading-snug text-muted-foreground">
              Damage scales with skill: 40% of listed damage at level 0, up to
              92.5% on average at level 100.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-[11px] tracking-wide text-muted-foreground uppercase">
              Attack used
            </Label>
            <Segmented
              value={attack}
              onChange={setPickedAttack}
              ariaLabel="Attack type"
              className="w-full"
              itemClassName="flex-1"
              options={[
                { value: "primary", label: "Primary" },
                { value: "secondary", label: "Secondary" },
              ]}
            />
            <p className="text-[11px] leading-snug text-muted-foreground">
              Primary follows the weapon&apos;s real combo — 3 hits with a
              double-damage finisher for most, 2 for fists, 6 for the dual axes,
              and a single hit for spears, sledges, pickaxes and ranged weapons.
              Secondary applies the class&apos;s heavier attack, where it has one.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-[11px] tracking-wide text-muted-foreground uppercase">
              Enemy state
            </Label>
            <Segmented
              value={backstab ? "unalerted" : "alerted"}
              onChange={(value) => setPickedBackstab(value === "unalerted")}
              ariaLabel="Enemy state"
              className="w-full"
              itemClassName="flex-1"
              options={[
                { value: "alerted", label: "Alerted" },
                { value: "unalerted", label: "Unalerted" },
              ]}
            />
            <p className="text-[11px] leading-snug text-muted-foreground">
              An unaware enemy takes the weapon&apos;s backstab bonus on the
              first hit &mdash; 1× to 6×, shown per weapon below. The hit then
              gives it five minutes of backstab immunity, so later hits are
              normal.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-[11px] tracking-wide text-muted-foreground uppercase">
              Ranged ammunition
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <AmmoSelect
                label="Arrow"
                items={reachableArrows}
                value={arrow?.slug ?? ""}
                onChange={setPickedArrow}
              />
              <AmmoSelect
                label="Bolt"
                items={reachableBolts}
                value={bolt?.slug ?? ""}
                onChange={setPickedBolt}
              />
            </div>
            <p className="text-[11px] leading-snug text-muted-foreground">
              Bow and crossbow damage is listed weapon + listed ammo, added
              together per damage type.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ---------------- results ---------------- */}
      {/* min-w-0 lets these grid items shrink below their content's intrinsic
          width, so the inner tables scroll instead of stretching the page. */}
      <div className="grid gap-6 xl:grid-cols-[minmax(360px,1fr)_minmax(0,1.35fr)]">
        <section
          aria-label="Selected weapon"
          className="animate-rise-in min-w-0"
        >
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="font-heading text-base font-semibold tracking-wide text-muted-foreground uppercase">
              2 · Inspect a weapon
            </h2>
            {selectedWeapon ? (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                {/* The class doubles as a shortcut into the class filter. */}
                <button
                  type="button"
                  aria-pressed={classFilter === selectedWeapon.cls}
                  onClick={() => toggleClass(selectedWeapon.cls)}
                  title={
                    classFilter === selectedWeapon.cls
                      ? `Clear the ${CLASS_LABELS[selectedWeapon.cls]} filter`
                      : `Filter the ranking to ${CLASS_LABELS[selectedWeapon.cls]}`
                  }
                  aria-label={
                    classFilter === selectedWeapon.cls
                      ? `Clear the ${CLASS_LABELS[selectedWeapon.cls]} filter`
                      : `Filter the ranking to ${CLASS_LABELS[selectedWeapon.cls]}`
                  }
                  className="cursor-pointer rounded-sm underline-offset-2 transition-colors hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  {CLASS_LABELS[selectedWeapon.cls]}
                </button>
                <WikiLink
                  href={selectedWeapon.wikiUrl}
                  name={selectedWeapon.name}
                />
              </span>
            ) : null}
          </div>
          <WeaponDetail
            weapon={selectedWeapon}
            ammo={selectedAmmo}
            quality={selectedQuality}
            qualityNote={qualityNote}
            onQualityChange={setPickedQuality}
            attack={
              attack === "secondary" && !canUseSecondary ? "primary" : attack
            }
            onAttackChange={setPickedAttack}
            canUseSecondary={canUseSecondary}
            onToggleClass={toggleClass}
            classActive={classFilter === selectedWeapon.cls}
            result={selectedResult}
            bestResult={bestPick}
          />
        </section>

        <section aria-label="Weapon ranking" className="animate-rise-in min-w-0">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="font-heading text-base font-semibold tracking-wide text-muted-foreground uppercase">
              3 · Find the best weapon for {target.name}
            </h2>
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <ItemImage src={target.image} alt={target.name} size={18} />
                {formatCount(target.health)} HP
              </span>
              <ShareViewButton view={view} />
            </span>
          </div>
          <WeaponsTable
            rows={rows}
            sortKey={sortKey}
            onSortChange={setSortKey}
            selectedSlug={selectedWeapon.slug}
            onSelect={(w) => setPickedWeapon(w.slug)}
            maxPerHit={maxPerHit}
            backstab={backstab}
            cls={classFilter}
            onClsChange={setPickedClass}
          />
        </section>
      </div>

      <footer className="space-y-1 pb-6 text-center text-xs text-muted-foreground">
        <p>
          Fan-made tool. Item art and stats belong to Iron Gate Studio and the
          Valheim wiki community. Numbers are only as current as the last
          scrape.
        </p>
        <p>
          <MethodologyLink />
        </p>
        <p className="support">
          <span><strong>Free, ad-free and made in my spare time.</strong> If it helped your run, you can buy me a coffee.</span>
          <a href="https://ko-fi.com/N2A528ACE3" target="_blank" rel="noopener noreferrer">
            <img src="/support/kofi.png" alt="Buy Me a Coffee at ko-fi.com" width={143} height={36} loading="lazy" />
          </a>
        </p>
      </footer>
    </main>
  );
}

function AmmoSelect({
  label,
  items,
  value,
  onChange,
}: {
  label: string;
  items: Ammo[];
  value: string;
  onChange: (v: string) => void;
}) {
  const sorted = [...items].sort((a, b) => totalDamage(b) - totalDamage(a));
  const empty = sorted.length === 0;

  return (
    <Select
      value={value}
      disabled={empty}
      // Gives the trigger the item's name instead of its slug.
      items={sorted.map((item) => ({ value: item.slug, label: item.name }))}
      onValueChange={(next) => {
        if (typeof next === "string") onChange(next);
      }}
    >
      <SelectTrigger size="sm" className="w-full" aria-label={label}>
        <SelectValue
          placeholder={empty ? `No ${label.toLowerCase()}s yet` : label}
        />
      </SelectTrigger>
      <SelectContent>
        {sorted.map((item) => (
          <SelectItem key={item.slug} value={item.slug}>
            <span className="flex items-center gap-2">
              <ItemImage src={item.image} alt={item.name} size={18} />
              {item.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
