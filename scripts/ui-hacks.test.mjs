import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { Element } from './lib/render-apps.mjs';

class MockElement extends Element {
  replaceChildren(...children) {
    this.textContent = '';
    this.append(...children);
  }
  querySelector(selector) {
    const all = this.querySelectorAll(selector);
    return all.length ? all[0] : null;
  }
  querySelectorAll(selector) {
    const matches = [];
    const walk = el => {
      if (!el || typeof el !== 'object') return;
      let matched = true;
      if (selector.includes('.')) {
        const parts = selector.split('.');
        const tag = parts[0];
        const classes = parts.slice(1);
        if (tag && (!el.tagName || el.tagName.toLowerCase() !== tag.toLowerCase())) matched = false;
        const elClasses = (el.className || '').split(/\s+/);
        for (const cls of classes) {
          if (!elClasses.includes(cls)) matched = false;
        }
      } else if (selector.startsWith('[')) {
        const attr = selector.slice(1, -1).split('=')[0];
        if (!el.attributes || el.attributes[attr] === undefined) matched = false;
      } else {
        if (!el.tagName || el.tagName.toLowerCase() !== selector.toLowerCase()) matched = false;
      }
      if (matched) matches.push(el);
      for (const child of el.children || []) walk(child);
    };
    for (const child of this.children || []) walk(child);
    return matches;
  }
}

function createDOMContext(initialStorage = {}) {
  const storage = new Map(Object.entries(initialStorage));
  const elements = new Map();
  const context = vm.createContext({
    console,
    URLSearchParams,
    TextEncoder,
    TextDecoder,
    atob,
    btoa,
    Intl,
    Math,
    Date,
    location: { hash: '' },
    localStorage: {
      getItem: k => (storage.has(k) ? storage.get(k) : null),
      setItem: (k, v) => storage.set(k, String(v)),
      removeItem: k => storage.delete(k),
      clear: () => storage.clear(),
    },
    document: {
      documentElement: new MockElement('html'),
      createElement: tag => new MockElement(tag),
      createTextNode: text => {
        const el = new MockElement('#text');
        el.textContent = text;
        return el;
      },
      getElementById: id => {
        if (!elements.has(id)) elements.set(id, new MockElement('div'));
        return elements.get(id);
      },
      querySelector: sel => {
        for (const el of elements.values()) {
          const match = el.querySelector(sel);
          if (match) return match;
        }
        return null;
      },
      querySelectorAll: sel => {
        const res = [];
        for (const el of elements.values()) {
          res.push(...el.querySelectorAll(sel));
        }
        return res;
      },
      addEventListener: () => {},
      removeEventListener: () => {},
    },
    readPlayerState: () => ({ player: { bossDefeated: [] } }),
    sanitizePlayer: p => p,
    PLAYER_STORAGE_KEY: 'vc.player',
  });
  context.window = context;
  context.globalThis = context;
  context.addEventListener = () => {};
  context.removeEventListener = () => {};
  return { context, storage, elements };
}

test('Smithy trader badge from item and armor traders data (ymir-flesh -> Haldor, cosmetic piece Hildir)', () => {
  const { context } = createDOMContext();
  vm.runInContext(readFileSync('shared/i18n/core.js', 'utf8'), context);
  vm.runInContext(readFileSync('shared/progress/core.js', 'utf8'), context);
  vm.runInContext(readFileSync('shared/shopping/core.js', 'utf8'), context);
  vm.runInContext(readFileSync('apps/smithy/data/data.js', 'utf8'), context);
  context.VC_MESSAGES = JSON.parse(readFileSync('apps/smithy/locales/messages.json', 'utf8'));

  const appSource = readFileSync('apps/smithy/assets/app.js', 'utf8').replace(
    "    const picker = VCI18n.mountPicker('#language-picker');",
    "    return;\n    const picker = VCI18n.mountPicker('#language-picker');"
  );
  vm.runInContext(appSource, context);

  // 1. ymir-flesh raw material -> Haldor
  const ymirBadges = context.VACart.traderBadges('ymir-flesh', context.VA_DATA);
  assert.equal(ymirBadges.length, 1);
  assert.equal(ymirBadges[0].textContent, 'Haldor');
  assert.equal(ymirBadges[0].href, '/traders/#trader=haldor&item=ymir-flesh');
  assert.ok(ymirBadges[0].className.includes('badge-source'));

  // 2. beaded-dress-blue cosmetic armor piece -> Hildir
  const hildirBadges = context.VACart.traderBadges('beaded-dress-blue', context.VA_DATA);
  assert.equal(hildirBadges.length, 1);
  assert.equal(hildirBadges[0].textContent, 'Hildir');
  assert.equal(hildirBadges[0].href, '/traders/#trader=hildir&item=beaded-dress-blue');
  assert.ok(hildirBadges[0].className.includes('badge-source'));

  // 3. thunderstone (not in Smithy data / no traders) -> empty
  const thunderBadges = context.VACart.traderBadges('thunderstone', context.VA_DATA);
  assert.equal(thunderBadges.length, 0);
});

test('Provisions goods sold by Bog Witch render link to bog-witch and plain text when no traders', () => {
  const { context } = createDOMContext();
  vm.runInContext(readFileSync('shared/i18n/core.js', 'utf8'), context);
  vm.runInContext(readFileSync('shared/shopping/core.js', 'utf8'), context);
  vm.runInContext(readFileSync('shared/progress/core.js', 'utf8'), context);
  vm.runInContext(readFileSync('apps/provisions/data/data.js', 'utf8'), context);
  vm.runInContext(readFileSync('apps/provisions/locales/messages.js', 'utf8'), context);
  vm.runInContext(readFileSync('apps/provisions/assets/planner.js', 'utf8'), context);
  vm.runInContext(readFileSync('apps/provisions/assets/advisor.js', 'utf8'), context);

  const source = readFileSync('apps/provisions/assets/app.js', 'utf8').replace(
    '  const panel =',
    '  globalThis.sources = sources; return;\n  const panel ='
  );
  vm.runInContext(source, context);

  // Item sold by Bog Witch: toadstool
  const toadstool = context.VPR_DATA.items['toadstool'];
  assert.ok(toadstool, 'toadstool exists in provisions data');
  assert.ok(toadstool.traders && toadstool.traders.length > 0, 'toadstool has traders');

  const container = context.sources(toadstool);
  const links = container.querySelectorAll('a');
  const traderLink = links.find(l => l.href && l.href.includes('/traders/'));
  assert.ok(traderLink, 'trader link rendered for toadstool');
  assert.equal(traderLink.textContent, 'The Bog Witch');
  assert.equal(traderLink.href, '/traders/#trader=bog-witch&item=toadstool');

  // NPC source without traders -> plain text hint, no trader link
  const mockNpcItem = {
    id: 'unknown-herb',
    sources: [{ text: 'Some Old Vendor', kind: 'npc' }]
  };
  const npcContainer = context.sources(mockNpcItem);
  const npcLinks = npcContainer.querySelectorAll('a').filter(l => l.href && l.href.includes('/traders/'));
  assert.equal(npcLinks.length, 0, 'no trader link when item has no traders');
  assert.ok(npcContainer.textContent.includes('Some Old Vendor'), 'plain text rendered for npc without traders');
});

test('Expedition summon without string slicing (summonLabel for pattern with name before count)', () => {
  const { context } = createDOMContext();
  vm.runInContext(readFileSync('shared/i18n/core.js', 'utf8'), context);
  vm.runInContext(readFileSync('shared/progress/core.js', 'utf8'), context);
  vm.runInContext(readFileSync('shared/shopping/core.js', 'utf8'), context);
  vm.runInContext(readFileSync('apps/expedition/data/data.js', 'utf8'), context);
  vm.runInContext(readFileSync('apps/expedition/locales/messages.js', 'utf8'), context);
  vm.runInContext(readFileSync('apps/expedition/assets/planner.js', 'utf8'), context);

  const expSource = readFileSync('apps/expedition/assets/app.js', 'utf8')
    .replace(/^import[^\n]+\n/, '')
    .split(/^for\s*\(const id of \['boss',\s*'raids'\]\)/m)[0];
  vm.runInContext(expSource, context);

  // Verify summonLabel exists
  assert.equal(typeof context.summonLabel, 'function');

  // Test summonLabel standard format
  const node = context.summonLabel('withered-bone', 10, 'Withered bone');
  assert.ok(node.textContent.includes('10× Withered bone'));
  const link = node.querySelector('a.item-link');
  assert.ok(link, 'link found in summonLabel output');
  assert.equal(link.href, '/items/#item=withered-bone');
  assert.equal(link.getAttribute('aria-label'), 'Withered bone');
  assert.equal(link.textContent, '↗');

  // Test with a pattern where name precedes count (no slicing breaks)
  context.VC_MESSAGES['{count}× {name}'] = { en: '{name}: {count} pcs' };
  const customNode = context.summonLabel('ancient-bark', 5, 'Ancient Bark');
  assert.ok(customNode.textContent.includes('Ancient Bark: 5 pcs'));
  const customLink = customNode.querySelector('a.item-link');
  assert.ok(customLink);
  assert.equal(customLink.href, '/items/#item=ancient-bark');
  assert.equal(customLink.getAttribute('aria-label'), 'Ancient Bark');
});

test('Smithy cart groups ordering renders standalone pieces before Materials & goods with translated title', () => {
  const { context, elements } = createDOMContext({
    'va.cart': JSON.stringify([
      { id: 'mat_1', materialId: 'ymir-flesh', amount: 2 },
      { id: 'piece_1', pieceId: 'iron-helmet', setId: 'iron-armor', have: 0, want: 4, groupId: null },
    ]),
  });
  vm.runInContext(readFileSync('shared/shopping/core.js', 'utf8'), context);
  vm.runInContext(readFileSync('shared/progress/core.js', 'utf8'), context);
  vm.runInContext(readFileSync('shared/i18n/core.js', 'utf8'), context);
  vm.runInContext(readFileSync('apps/smithy/data/data.js', 'utf8'), context);
  const smithyMessages = JSON.parse(readFileSync('apps/smithy/locales/messages.json', 'utf8'));
  context.VC_MESSAGES = smithyMessages;

  const cartContent = new MockElement('div');
  cartContent.id = 'cart-content';
  elements.set('cart-content', cartContent);

  let appSource = readFileSync('apps/smithy/assets/app.js', 'utf8');
  appSource = appSource.replace(
    "    const picker = VCI18n.mountPicker('#language-picker');",
    '    globalThis.testRenderers = { renderCart, getItemsContainer: () => cartContent.querySelector(".cart-items-container") }; return;\n    const picker = VCI18n.mountPicker(\'#language-picker\');'
  );
  appSource = appSource.replace(
    '    calculateCartMaterials,\n    calculateSmelting,',
    '    initArmourer,\n    calculateCartMaterials,\n    calculateSmelting,'
  );
  vm.runInContext(appSource, context);

  context.VACart.initArmourer();
  context.testRenderers.renderCart();

  const itemsContainer = context.testRenderers.getItemsContainer();
  assert.ok(itemsContainer, 'cart-items-container rendered');

  const children = itemsContainer.children;
  assert.equal(children.length, 2, 'two children in cart container');

  // First child should be standalone piece row, second should be cart-goods-group
  const firstChild = children[0];
  const secondChild = children[1];
  assert.ok(!firstChild.className.includes('cart-goods-group'), 'First child is standalone piece, not goods group');
  assert.ok(secondChild.className.includes('cart-goods-group'), 'Second child is cart-goods-group');

  // Title of goods group should be translated 'Materials & goods'
  const title = secondChild.querySelector('.cart-group-title');
  assert.ok(title);
  assert.equal(title.textContent, 'Materials & goods');
});

test('VCShopping.cart.read migrates legacy cart rows to { materialId, amount, name? } and saves once', () => {
  const initialStorage = {
    'va.cart': JSON.stringify([
      // 1. Old Items/Traders row from before VC-42d
      { id: 'item_ymir-flesh_1', item: 'ymir-flesh', pieceId: 'ymir-flesh', quantity: 2, amount: 2 },
      // 2. Old row with quantity only and name
      { item: 'wood', pieceId: 'wood', quantity: 15, name: 'Wood' },
      // 3. Modern material row
      { id: 'mat_iron_2', materialId: 'iron', amount: 5, setId: null, pieceId: null },
      // 4. Smithy armor piece row
      { id: 'armor_1', setId: 'iron-armor', pieceId: 'iron-helmet', have: 0, want: 4, groupId: null },
      // 5. Smithy weapon row
      { id: 'weapon_1', setId: null, pieceId: 'sword-iron', isWeapon: true, have: 1, want: 4, groupId: null },
      // 6. Invalid entries
      null,
      { bogus: true }
    ])
  };
  const { context, storage } = createDOMContext(initialStorage);
  vm.runInContext(readFileSync('shared/shopping/core.js', 'utf8'), context);

  let writeCount = 0;
  const originalSetItem = context.localStorage.setItem;
  context.localStorage.setItem = (k, v) => {
    if (k === 'va.cart') writeCount++;
    return originalSetItem(k, v);
  };

  const lines = context.VCShopping.cart.read();

  // Valid lines: 5 (2 migrated + 1 modern material + 2 smithy gear)
  assert.equal(lines.length, 5);

  // Line 1 migrated:
  assert.equal(lines[0].materialId, 'ymir-flesh');
  assert.equal(lines[0].amount, 2);
  assert.equal(lines[0].id, 'item_ymir-flesh_1');
  assert.equal(lines[0].pieceId, undefined);

  // Line 2 migrated:
  assert.equal(lines[1].materialId, 'wood');
  assert.equal(lines[1].amount, 15);
  assert.equal(lines[1].name, 'Wood');
  assert.ok(lines[1].id.startsWith('mat_wood_'));

  // Line 3 modern material preserved:
  assert.equal(lines[2].materialId, 'iron');
  assert.equal(lines[2].amount, 5);

  // Line 4 & 5 Smithy pieces preserved:
  assert.equal(lines[3].pieceId, 'iron-helmet');
  assert.equal(lines[3].have, 0);
  assert.equal(lines[3].want, 4);

  assert.equal(lines[4].pieceId, 'sword-iron');
  assert.equal(lines[4].isWeapon, true);

  // Exactly 1 write occurred during migration
  assert.equal(writeCount, 1);

  // Stored value in localStorage matches migrated data
  const saved = JSON.parse(storage.get('va.cart'));
  assert.equal(saved.length, 5);
  assert.equal(saved[0].materialId, 'ymir-flesh');

  // Calling read() again should NOT write to storage again
  const linesAgain = context.VCShopping.cart.read();
  assert.equal(linesAgain.length, 5);
  assert.equal(writeCount, 1, 'no extra write on subsequent read');
});
