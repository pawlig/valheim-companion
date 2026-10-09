import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { fixture } from './lib/progress-dom.mjs';
import { calculator, staticApp, Element } from './lib/render-apps.mjs';
import { defaultPlayer, sanitizePlayer, PLAYER_STORAGE_KEY } from '../shared/player/core.js';

const read = path => readFileSync(path, 'utf8');
const json = path => JSON.parse(read(path));
const languages = json('shared/i18n/languages.json');
const counts = [0, 1, 2, 5, 21];
const paths = [
  'apps/hub/locales/messages.json', 'apps/hub/privacy/locales/messages.json',
  'apps/bestiary/locales/messages.json', 'apps/smithy/locales/messages.json',
  'apps/progress/locales/messages.json', 'apps/provisions/locales/messages.json',
  'apps/comfort/locales/messages.json',
  'apps/expedition/locales/messages.json',
  'apps/items/locales/messages.json',
  'apps/damage-calculator/src/locales/messages.json', 'apps/signs/lib/locales/messages.json',
  'shared/progress/messages.json', 'shared/analytics/messages.json',
];
const classic = vm.createContext({});
vm.runInContext(read('shared/i18n/core.js'), classic);
const typed = calculator('en').core;
const tokens = text => [...text.matchAll(/\{\w+\}/g)].map(match => match[0]).sort();
const clean = (text, label) => {
  assert.equal(typeof text, 'string', label);
  assert.ok(text.length > 0, label);
  assert.doesNotMatch(text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, ''), /undefined|\[object Object\]|\{\w+\}/, label);
};

test('every catalog has zero missing translations and every CLDR plural category', () => {
  for (const path of paths) for (const [key, translations] of Object.entries(json(path))) {
    for (const { code } of languages) {
      const value = translations[code];
      assert.ok(value, `${path}: ${key}: missing ${code}`);
      if (typeof value !== 'string') {
        assert.deepEqual(Object.keys(value).sort(), new Intl.PluralRules(code).resolvedOptions().pluralCategories.sort(), `${path}: ${key}: categories in ${code}`);
      }
      for (const text of typeof value === 'string' ? [value] : Object.values(value)) {
        assert.ok(text.trim(), `${path}: ${key}: empty ${code}`);
        assert.deepEqual(tokens(text), tokens(key), `${path}: ${key}: interpolation in ${code}`);
      }
    }
  }
});

for (const { code } of languages) {
  test(`all counted catalog texts render in classic and typed cores (${code}: 0/1/2/5/21)`, () => {
    classic.VCI18n.setPreference(code);
    for (const path of paths) for (const [key, entry] of Object.entries(json(path))) {
      if (typeof entry.en === 'string') continue;
      const catalog = { [key]: entry };
      for (const count of counts) {
        const values = Object.fromEntries(tokens(key).map(token => [token.slice(1, -1), count]));
        Object.assign(values, { name: 'Root set', biome: 'Meadows', weights: '1+1+2', limit: 50, total: 25 });
        const result = classic.VCI18n.tn(catalog, key, count, values);
        clean(result, `${path}: ${key}: ${code}/${count}`);
        assert.notEqual(result, key, `${path}: untranslated ${key}`);
        assert.equal(typed.tn(catalog, key, count, values, code), result, `${path}: classic/typed parity`);
      }
    }
  });
}

function provisions(locale) {
  const values = new Map([['vc.language', locale]]);
  const context = vm.createContext({ console, URLSearchParams, TextEncoder, TextDecoder, atob, btoa,
    location: { hash: '' }, localStorage: { getItem: key => values.get(key) ?? null },
    document: { documentElement: new Element('html'), createElement: tag => new Element(tag) },
  });
  context.window = context;
  context.addEventListener = () => {};
  for (const path of ['shared/i18n/core.js', 'shared/shopping/core.js', 'apps/provisions/data/data.js', 'apps/provisions/locales/messages.js', 'apps/provisions/assets/planner.js', 'apps/provisions/assets/advisor.js']) vm.runInContext(read(path), context);
  // Expose hoisted production renderers without mounting the complete application.
  const source = read('apps/provisions/assets/app.js').replace('  const panel =',
    '  globalThis.renderers = { foodCard, shoppingText, renderShopping }; return;\n  const panel =');
  vm.runInContext(source, context);
  return context;
}

function comfort(locale) {
  const nodes = new Map();
  class ComfortElement extends Element {
    replaceChildren(...children) { this.textContent = ''; this.append(...children); }
  }
  const values = new Map([['vc.language', locale]]);
  const context = vm.createContext({ console, URLSearchParams, TextEncoder, TextDecoder, atob, btoa,
    location: { hash: '' }, localStorage: { getItem: key => values.get(key) ?? null },
    document: { documentElement: new ComfortElement('html'), createElement: tag => new ComfortElement(tag),
      getElementById(id) { if (!nodes.has(id)) nodes.set(id, new ComfortElement('div')); return nodes.get(id); } },
  });
  context.window = context; context.addEventListener = () => {};
  for (const path of ['shared/i18n/core.js', 'shared/shopping/core.js', 'shared/progress/core.js', 'apps/comfort/data/data.js', 'apps/comfort/locales/messages.js', 'apps/comfort/assets/planner.js']) vm.runInContext(read(path), context);
  const source = read('apps/comfort/assets/app.js').replace('  const panel = document',
    '  globalThis.renderers = { materialList, renderSummary, renderShopping }; return;\n  const panel = document');
  vm.runInContext(source, context);
  return { context, nodes };
}

function expedition(locale) {
  class ExpeditionElement extends Element {
    replaceChildren(...children) { this.textContent = ''; this.append(...children); }
  }
  const values = new Map([['vc.language', locale]]);
  const context = vm.createContext({ console, URLSearchParams, TextEncoder, TextDecoder, atob, btoa,
    location: { hash: '' }, localStorage: { getItem: key => values.get(key) ?? null },
    readPlayerState: () => ({ player: defaultPlayer() }), sanitizePlayer, PLAYER_STORAGE_KEY,
    document: { documentElement: new ExpeditionElement('html'), createElement: tag => new ExpeditionElement(tag) },
  });
  context.window = context; context.addEventListener = () => {};
  for (const path of ['shared/i18n/core.js', 'shared/shopping/core.js', 'shared/progress/core.js',
    'apps/expedition/data/data.js', 'apps/expedition/locales/messages.js', 'apps/expedition/assets/planner.js']) vm.runInContext(read(path), context);
  const source = read('apps/expedition/assets/app.js').replace(/^import[^\n]+\n/, '')
    .split(/^for\s*\(const id of \['boss',\s*'raids'\]\)/m)[0];
  vm.runInContext(source + '\nglobalThis.renderers = { renderPacking, raidCard };', context);
  return context;
}

for (const { code } of languages) {
  test(`production UI renders independent counts (${code}: 0/1/2/5/21)`, () => {
    const calc = calculator(code);
    const { BiomeSlider } = calc.load('apps/damage-calculator/src/components/biome-slider.tsx');
    const { TargetPicker } = calc.load('apps/damage-calculator/src/components/target-picker.tsx');
    const { targets } = calc.load('apps/damage-calculator/src/lib/data.ts');
    const calcCatalog = json('apps/damage-calculator/src/locales/messages.json');
    const formatted = value => new Intl.NumberFormat(code).format(value);
    const provision = provisions(code);
    const cozy = comfort(code);
    const trip = expedition(code);
    const feast = provision.VPR_DATA.food.find(food => food.isFeast);
    assert.ok(feast);
    const bestiary = staticApp('bestiary', code, { playerCount: 1 });
    const smithy = staticApp('smithy', code);
    for (const [index, count] of counts.entries()) {
      const bossCount = counts[(index + 1) % counts.length];
      const tripPacking = trip.renderers.renderPacking({ summonItems: [{ id: 'wood', count }] }, { items: {wood:{name:'Wood'}}, recommendations: [] });
      clean(tripPacking.node.textContent, `expedition packing ${code}/${count}`);
      if (count > 0) assert.ok(tripPacking.node.textContent.includes(trip.VCI18n.tn(trip.VC_MESSAGES, '{count}× {name}', count, {count:formatted(count),name:'Wood'})));
      const event = { durationSeconds: count, startMessage:'The ground is shaking.', biomes:['meadows'], creatureDetails:[], conditions:[], notes:[], source:'https://valheim.weirdgloop.org/w/Events' };
      const raid = trip.renderers.raidCard(event);
      clean(raid.textContent, `expedition raid ${code}/${count}`);
      assert.ok(raid.textContent.includes(trip.VCI18n.tn(trip.VC_MESSAGES, '{count} seconds', count, {count:formatted(count)})));
      const materialText = cozy.context.renderers.materialList([{ item: 'wood', amount: count }]);
      clean(materialText, `comfort materials ${code}/${count}`);
      assert.equal(materialText, cozy.context.VCI18n.tn(cozy.context.VC_MESSAGES, '{count}× {name}', count, { count: formatted(count), name: 'Wood' }));
      const realCore = cozy.context.VCComfort;
      cozy.context.VCComfort = { ...realCore, comfortLevel: () => ({ total: count, parts: [] }) };
      cozy.context.renderers.renderSummary();
      const comfortSummary = cozy.nodes.get('summary').textContent;
      clean(comfortSummary, `comfort summary ${code}/${count}`);
      assert.ok(comfortSummary.includes(cozy.context.VCI18n.tn(cozy.context.VC_MESSAGES, 'Comfort {count} / {max}', count, { count: formatted(count), max: formatted(count) })));
      assert.ok(comfortSummary.includes(cozy.context.VCI18n.tn(cozy.context.VC_MESSAGES, 'Rested {count} min', count + 7, { count: formatted(count + 7) })));
      cozy.context.VCComfort = realCore;
      // Synthetic counts exercise plural boundaries beyond the game's player/biome limits.
      const progress = fixture();
      progress.context.VCI18n.setPreference(code);
      const biomes = Array.from({ length: 25 }, (_, i) => ({ id: `biome-${i}`, order: i + 1, name: `Biome ${i + 1}`, bosses: [], minibosses: [], milestones: [] }));
      progress.context.VCProgress.reach = () => count;
      biomes[0].bosses = Array.from({ length: bossCount }, (_, i) => ({ id: `boss-${i}`, name: `Boss ${i + 1}` }));
      progress.context.VCProgress.get = () => ({ visited: [], defeated: Object.fromEntries(biomes[0].bosses.map(boss => [boss.id, true])), milestones: {} });
      const summary = progress.document.createElement('main');
      progress.context.VCProgressUI.render(summary, { biomes });
      const summaryText = summary.querySelector('.summary-text').textContent;
      clean(summaryText, `progress ${code}/${count}`);
      assert.equal(summaryText, progress.context.VCProgressUI.tn('Biome {count} of {total}', count, { total: 25 }) + ' · ' + progress.context.VCProgressUI.tn('{count} of {total} bosses', bossCount, { total: bossCount }) + ' · ' + progress.context.VCProgressUI.tn('{count} of {total} minibosses', 0, { total: 0 }));

      bestiary.context.renderers.setPlayerCount(count);
      const panel = new Element('div');
      bestiary.context.renderers.buildCharacterPanel(panel, true);
      const playerSummary = panel.querySelector('summary').textContent;
      clean(playerSummary, `character ${code}/${count}`);
      assert.ok(playerSummary.includes(bestiary.context.VCI18n.tn(bestiary.context.VC_MESSAGES, '{count} players', count)));

      smithy.context.renderers.setCart(Array.from({ length: count }, (_, id) => ({ id: String(id), pieceId: 'troll-leather-helmet', have: 0, want: 1 })));
      smithy.context.renderers.renderCart();
      const cartCount = smithy.nodes.get('cart-count-badge').textContent;
      clean(cartCount, `smithy ${code}/${count}`);
      assert.equal(cartCount, smithy.context.VCI18n.tn(smithy.context.VC_MESSAGES, '{count} items', count));

      const plan = { foods: [{ definition: feast, quantity: count, batches: count }], meads: [], materials: [], steps: [], stations: [], missing: [], items: {} };
      const food = provision.renderers.foodCard({ ...feast, servings: count });
      const shopping = new Element('div');
      provision.renderers.renderShopping(shopping, plan);
      for (const text of [food.textContent, shopping.textContent, provision.renderers.shoppingText(plan)]) clean(text, `provisions ${code}/${count}`);
      assert.ok(food.textContent.includes(provision.VCI18n.tn(provision.VC_MESSAGES, 'Feast · {count} servings', count, { count: formatted(count) })));
      assert.ok(shopping.textContent.includes(provision.VCI18n.tn(provision.VC_MESSAGES, '{count} batches', count, { count: formatted(count) })));
      assert.ok(provision.renderers.shoppingText(plan).includes(provision.VCI18n.tn(provision.VC_MESSAGES, '{count} servings', count, { count: formatted(count) })));

      const html = calc.render(BiomeSlider, { value: 'meadows', onChange() {}, visibleWeapons: count, totalWeapons: 25, visibleTargets: bossCount, totalTargets: 25 });
      const targetHtml = calc.render(TargetPicker, { targets: targets.slice(0, count), total: targets.length, selected: targets[0], onSelect() {} });
      clean(html, `calculator ${code}/${count}`);
      clean(targetHtml, `targets ${code}/${count}`);
      assert.ok(html.includes(calc.core.tn(calcCatalog, '{count} weapons reachable in {biome} (total: {total})', count, { count: formatted(count), total: formatted(25), biome: 'Meadows' }, code)));
      assert.ok(html.includes(calc.core.tn(calcCatalog, '{count} targets reachable in {biome} (total: {total})', bossCount, { count: formatted(bossCount), total: formatted(25), biome: 'Meadows' }, code)));
    }
  });
}


test('typed plural core handles all Arabic categories and the fallback cascade', () => {
  const categories = ['zero', 'one', 'two', 'few', 'many', 'other'];
  const catalog = {
    unit: { ar: Object.fromEntries(categories.map(category => [category, category + ' {count}'])), en: { one: 'one {count}', other: 'other {count}' } },
    fallback: { cs: { other: 'ostatní {count}' }, en: { one: 'one {count}', other: 'other {count}' } },
    english: { cs: { few: 'několik' }, en: { one: 'one {count}', other: 'other {count}' } },
  };
  for (const [count, category] of [[0, 'zero'], [1, 'one'], [2, 'two'], [3, 'few'], [11, 'many'], [100, 'other']]) {
    assert.equal(typed.tn(catalog, 'unit', count, {}, 'ar'), category + ' ' + count);
  }
  assert.equal(typed.tn(catalog, 'fallback', 1, {}, 'cs'), 'ostatní 1');
  assert.equal(typed.tn(catalog, 'english', 1, {}, 'cs'), 'one 1');
  assert.equal(typed.tn(catalog, 'english', 5, {}, 'cs'), 'other 5');
  assert.equal(typed.tn(catalog, 'unit', 1, {}, 'ja'), 'one 1');
});
