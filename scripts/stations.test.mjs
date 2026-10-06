import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

test('stations data: smelting, kiln and processing stations have wiki-accurate parameters', () => {
  const stations = JSON.parse(readFileSync('data/stations.json', 'utf8'));

  const smelter = stations.find((s) => s.id === 'smelter');
  assert.ok(smelter, 'Smelter station must exist');
  assert.equal(smelter.secondsPerItem, 30);
  assert.equal(smelter.fuel?.item, 'coal');
  assert.equal(smelter.fuel?.secondsPerUnit, 15);
  assert.equal(smelter.fuel?.perItem, 2);
  assert.equal(smelter.capacity?.fuel, 20);
  assert.equal(smelter.capacity?.input, 10);
  assert.ok(smelter.conversions.some((c) => c.input === 'scrap-iron' && c.output === 'iron'));

  const blastFurnace = stations.find((s) => s.id === 'blast-furnace');
  assert.ok(blastFurnace, 'Blast Furnace station must exist');
  assert.equal(blastFurnace.secondsPerItem, 30);
  assert.equal(blastFurnace.fuel?.item, 'coal');
  assert.equal(blastFurnace.fuel?.secondsPerUnit, 15);
  assert.equal(blastFurnace.fuel?.perItem, 2);
  assert.ok(blastFurnace.conversions.some((c) => c.input === 'black-metal-scrap' && c.output === 'black-metal'));

  const kiln = stations.find((s) => s.id === 'charcoal-kiln');
  assert.ok(kiln, 'Charcoal Kiln station must exist');
  assert.equal(kiln.secondsPerItem, 15);
  assert.equal(kiln.fuel, null);
  assert.ok(kiln.conversions.some((c) => c.input === 'wood' && c.output === 'coal' && c.ratio === 1));

  const spinningWheel = stations.find((s) => s.id === 'spinning-wheel');
  assert.ok(spinningWheel, 'Spinning Wheel station must exist');
  assert.equal(spinningWheel.secondsPerItem, 30);
  assert.ok(spinningWheel.conversions.some((c) => c.input === 'flax' && c.output === 'linen-thread'));
});

test('weapons & shields data: shields have recommendable: false and all weapons have levels array', () => {
  const weapons = JSON.parse(readFileSync('data/weapons.json', 'utf8'));

  const shields = weapons.filter((w) => w.category === 'shield');
  assert.ok(shields.length >= 18, `Expected at least 18 shields, got ${shields.length}`);
  assert.ok(shields.every((s) => s.recommendable === false), 'Every shield must have recommendable: false');
  assert.ok(shields.every((s) => Array.isArray(s.levels) && s.levels.length >= 1), 'Every shield must have levels array');

  const woodShield = shields.find((s) => s.id === 'wood-shield');
  assert.ok(woodShield);
  assert.equal(woodShield.levels.length, 3);
  assert.equal(woodShield.levels[0].stationLevel, 1);
  assert.equal(woodShield.levels[1].stationLevel, 2);
  assert.equal(woodShield.levels[2].stationLevel, 3);
  assert.ok(woodShield.levels[0].materials.some((m) => m.item === 'wood' && m.amount === 10));

  const ironSword = weapons.find((w) => w.id === 'iron-sword');
  assert.ok(ironSword);
  assert.equal(ironSword.levels.length, 4);
  assert.equal(ironSword.levels[0].stationLevel, 2);
  assert.equal(ironSword.levels[3].stationLevel, 5);
  assert.ok(ironSword.levels[0].materials.some((m) => m.item === 'iron' && m.amount === 20));
  assert.ok(ironSword.levels[3].materials.some((m) => m.item === 'iron' && m.amount === 40));
});

test('teleportable flag: items from Category:Can\'t be Teleported have teleportable: false', () => {
  const items = JSON.parse(readFileSync('data/items.json', 'utf8'));

  const expectedNonTeleportable = [
    'iron',
    'scrap-iron',
    'copper',
    'copper-ore',
    'tin',
    'tin-ore',
    'bronze',
    'silver',
    'silver-ore',
    'black-metal',
    'black-metal-scrap',
    'flametal',
    'flametal-ore',
  ];

  for (const slug of expectedNonTeleportable) {
    const item = items.find((i) => i.id === slug);
    assert.ok(item, `Item ${slug} must exist in items.json`);
    assert.equal(item.teleportable, false, `Item ${slug} must have teleportable: false`);
  }

  const wood = items.find((i) => i.id === 'wood');
  assert.ok(wood);
  assert.notEqual(wood.teleportable, false, 'Wood must be teleportable');
});

test('smoke test: Iron Armor Q4 smelting calculation matches station parameters', () => {
  const armor = JSON.parse(readFileSync('data/armor.json', 'utf8'));
  const stations = JSON.parse(readFileSync('data/stations.json', 'utf8'));

  const ironSet = armor.find((a) => a.id === 'iron-armor');
  assert.ok(ironSet, 'Iron armor set must exist');

  let totalIron = 0;
  for (const piece of ironSet.pieces) {
    for (const lvl of piece.levels) {
      for (const mat of lvl.materials) {
        if (mat.item === 'iron') totalIron += mat.amount;
      }
    }
  }

  // 1. Total Iron for Q4 set is 165
  assert.equal(totalIron, 165, 'Iron Armor Q4 total iron must be 165');

  // 2. Station verification: Smelter takes 30s per bar, 2 Coal per bar, 1 Scrap Iron per Iron
  const smelter = stations.find((s) => s.id === 'smelter');
  const kiln = stations.find((s) => s.id === 'charcoal-kiln');

  const coalPerBar = smelter.fuel.perItem; // 2
  const secondsPerBar = smelter.secondsPerItem; // 30
  const totalCoal = totalIron * coalPerBar; // 330
  const totalWoodInKiln = totalCoal * 1; // 330
  const totalSeconds1Smelter = totalIron * secondsPerBar; // 4950

  assert.equal(totalCoal, 330, '165 Iron needs 330 Coal');
  assert.equal(totalWoodInKiln, 330, '330 Coal needs 330 Wood in Charcoal Kiln');
  assert.equal(totalSeconds1Smelter, 4950, '1 smelter needs 4950 seconds (30s x 165)');

  const minutes = Math.floor(totalSeconds1Smelter / 60);
  const seconds = totalSeconds1Smelter % 60;
  const timeFormatted = `${minutes}:${String(seconds).padStart(2, '0')}`;
  assert.equal(timeFormatted, '82:30', '1 smelter time must format to 82:30 min');
});

test('VACart.calculateSmelting computes accurate smelting parameters across furnace counts and items', () => {
  const context = vm.createContext({ console });
  vm.runInContext(readFileSync('apps/armourer/assets/app.js', 'utf8'), context);
  vm.runInContext(readFileSync('apps/armourer/data/data.js', 'utf8').replace('window.VA_DATA', 'globalThis.VA_DATA'), context);
  const { calculateSmelting, calculateCartMaterials } = context.VACart;
  const data = context.VA_DATA;

  const ironArmor = data.armor.find((a) => a.id === 'iron-armor');
  assert.ok(ironArmor);
  const cartIron = ironArmor.pieces.map((p) => ({
    pieceId: p.id,
    have: 0,
    want: p.levels[p.levels.length - 1].quality
  }));

  const s1 = calculateSmelting(cartIron, data, { furnaceCount: 1 });
  assert.equal(s1.totalBars, 165);
  assert.equal(s1.totalCoal, 330);
  assert.equal(s1.totalKilnWood, 330);
  assert.equal(s1.furnaceCount, 1);
  assert.equal(s1.seconds, 4950);
  assert.equal(s1.timeFormatted, '82:30');

  const s2 = calculateSmelting(cartIron, data, { furnaceCount: 2 });
  assert.equal(s2.furnaceCount, 2);
  assert.equal(s2.seconds, 83 * 30);
  assert.equal(s2.timeFormatted, '41:30');

  const s4 = calculateSmelting(cartIron, data, { furnaceCount: 4 });
  assert.equal(s4.furnaceCount, 4);
  assert.equal(s4.seconds, 42 * 30);
  assert.equal(s4.timeFormatted, '21:00');

  // Verify cart with weapons
  const cartWithWeapon = [
    ...cartIron,
    { pieceId: 'iron-sword', isWeapon: true, have: 0, want: 4 }
  ];
  const sWeapon = calculateSmelting(cartWithWeapon, data, { furnaceCount: 1 });
  assert.equal(sWeapon.totalBars, 255);
  assert.equal(sWeapon.totalCoal, 510);
  assert.equal(sWeapon.totalKilnWood, 510);

  const calc = calculateCartMaterials(cartWithWeapon, data, { breakdown: true, furnaceCount: 1 });
  assert.equal(calc.hasNonTeleportable, true);
  assert.ok(calc.materials.some((m) => m.item === 'scrap-iron' && m.teleportable === false));
});
