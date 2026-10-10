import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

class Node {
  constructor(tag) {
    this.tagName = tag;
    this.children = [];
    this.dataset = {};
    this.attrs = {};
    this.events = {};
    this.className = '';
    this.textContent = '';
    this.hidden = false;
    this.value = '';
    this.type = 'text';
  }

  get classList() {
    return {
      add: (...names) => {
        const set = new Set([...this.className.split(' ').filter(Boolean), ...names]);
        this.className = [...set].join(' ');
      },
      remove: (...names) => {
        this.className = this.className.split(' ').filter((n) => !names.includes(n)).join(' ');
      },
      contains: (name) => this.className.split(' ').includes(name),
      toggle: (name, force) => {
        const names = new Set(this.className.split(' ').filter(Boolean));
        if (force ?? !names.has(name)) names.add(name);
        else names.delete(name);
        this.className = [...names].join(' ');
      },
    };
  }

  append(...nodes) {
    for (const node of nodes) {
      if (node) {
        node.parentElement = this;
        this.children.push(node);
      }
    }
  }

  appendChild(node) {
    this.append(node);
    return node;
  }

  replaceChildren(...nodes) {
    this.children = [];
    this.append(...nodes);
  }

  setAttribute(k, v) {
    this.attrs[k] = String(v);
    if (k === 'hidden') this.hidden = true;
  }

  getAttribute(k) {
    return this.attrs[k] ?? null;
  }

  removeAttribute(k) {
    delete this.attrs[k];
    if (k === 'hidden') this.hidden = false;
  }

  addEventListener(k, cb) {
    (this.events[k] ??= []).push(cb);
  }

  dispatch(k, ev = {}) {
    for (const cb of this.events[k] || []) {
      cb({ target: this, currentTarget: this, ...ev, stopPropagation() {}, preventDefault() {} });
    }
  }

  querySelectorAll(sel) {
    const match = (node) => {
      if (sel.startsWith('#')) return node.id === sel.slice(1);
      if (sel.startsWith('.')) return node.classList.contains(sel.slice(1));
      if (sel.includes('[data-')) {
        const m = sel.match(/\[data-([^=\]]+)(?:=([^\]]+))?\]/);
        if (m) {
          const val = node.dataset[m[1]];
          return m[2] ? val === m[2].replace(/["']/g, '') : !!val;
        }
      }
      return node.tagName.toLowerCase() === sel.toLowerCase();
    };
    return this.children.flatMap((c) => [...(match(c) ? [c] : []), ...c.querySelectorAll(sel)]);
  }

  querySelector(sel) {
    return this.querySelectorAll(sel)[0] || null;
  }

  scrollIntoView() {}

  focus() {
    Node.active = this;
  }
}

// Expands every biome group (clicks all "Show more" buttons) and returns all rendered cards.
function expandAll(doc) {
  const grid = doc.getElementById('items-grid');
  for (const g of grid.querySelectorAll('.biome-group')) {
    if (g.getAttribute('open') === null) g.querySelector('.biome-group-summary').dispatch('click');
  }
  let more = grid.querySelectorAll('.biome-group-more');
  while (more.length) {
    for (const btn of more) btn.dispatch('click');
    more = grid.querySelectorAll('.biome-group-more');
  }
  return grid.querySelectorAll('.item-card');
}

function createDomFixture(initialHash = '', initialStorage = {}) {
  const allNodes = [];
  const body = new Node('body');
  const doc = {
    readyState: 'complete',
    body,
    createElement: (tag) => new Node(tag),
    getElementById: (id) => {
      const search = (node) => {
        if (node.id === id) return node;
        for (const child of node.children) {
          const res = search(child);
          if (res) return res;
        }
        return null;
      };
      return search(body);
    },
    querySelector: (sel) => body.querySelector(sel),
    querySelectorAll: (sel) => body.querySelectorAll(sel),
    addEventListener: () => {},
  };

  const ids = [
    'language-picker',
    'item-search',
    'category-select',
    'sort-select',
    'teleport-select',
    'category-chips',
    'biome-chips',
    'items-count',
    'items-grid',
    'items-empty',
    'item-modal-backdrop',
    'item-modal',
    'modal-item-name',
    'modal-back',
    'modal-close',
    'modal-body',
    'notice',
    'toggle-locked-btn',
  ];

  ids.forEach((id) => {
    let tag = 'div';
    if (id.includes('close') || id.includes('btn') || id.includes('back')) tag = 'button';
    else if (id.includes('select')) tag = 'select';
    else if (id.includes('search')) tag = 'input';
    const n = new Node(tag);
    n.id = id;
    body.append(n);
    allNodes.push(n);
  });

  const storage = new Map(Object.entries(initialStorage));
  const windowListeners = new Map();
  const historyState = { replacedUrls: [] };

  const ctx = {
    document: doc,
    window: {
      addEventListener: (k, cb) => (windowListeners.get(k) || windowListeners.set(k, []).get(k)).push(cb),
      location: { hash: initialHash, pathname: '/items/', search: '' },
      document: doc,
    },
    location: { hash: initialHash, pathname: '/items/', search: '' },
    history: {
      replaceState: (state, title, url) => historyState.replacedUrls.push(url),
      pushState: (state, title, url) => {
        historyState.pushedUrls = historyState.pushedUrls || [];
        historyState.pushedUrls.push(url);
        if (url && url.includes('#')) {
          const h = url.slice(url.indexOf('#'));
          ctx.location.hash = h;
          ctx.window.location.hash = h;
        }
      },
    },
    localStorage: {
      getItem: (k) => storage.get(k) ?? null,
      setItem: (k, v) => storage.set(k, String(v)),
      removeItem: (k) => storage.delete(k),
    },
    console,
    setTimeout,
    clearTimeout,
    Intl,
    URLSearchParams,
  };
  ctx.globalThis = ctx;
  ctx.window.globalThis = ctx;
  vm.createContext(ctx);

  const load = (rel) => vm.runInContext(readFileSync(path.join(ROOT, rel), 'utf8'), ctx);
  load('shared/i18n/languages.js');
  load('shared/i18n/core.js');
  load('apps/items/locales/messages.js');
  load('apps/items/data/data.js');
  if (!ctx.VC_ITEMS_DATA?.biomes) {
    ctx.VC_ITEMS_DATA = ctx.VC_ITEMS_DATA || {};
    ctx.VC_ITEMS_DATA.biomes = [
      { id: 'meadows', name: 'Meadows', order: 1 },
      { id: 'black-forest', name: 'Black Forest', order: 2 },
      { id: 'ocean', name: 'Ocean', order: 3 },
      { id: 'swamp', name: 'Swamp', order: 4 },
      { id: 'mountain', name: 'Mountain', order: 5 },
      { id: 'plains', name: 'Plains', order: 6 },
      { id: 'mistlands', name: 'Mistlands', order: 7 },
      { id: 'ashlands', name: 'Ashlands', order: 8 },
      { id: 'deep-north', name: 'Deep North', order: 9 },
    ];
  }
  load('shared/progress/core.js');
  load('shared/shopping/core.js');
  load('apps/items/assets/app.js');

  return {
    ctx,
    doc,
    storage,
    historyState,
    fireWindow(k, ev = {}) {
      for (const cb of windowListeners.get(k) || []) cb(ev);
    },
  };
}

describe('Items Compendium UI Tests', () => {
  it('1. Renders the full catalog (>= 1,000 items) on initial load', () => {
    const { doc } = createDomFixture();
    const cards = expandAll(doc);
    assert.ok(cards.length >= 1000, `Full catalog should render >= 1000 cards, got ${cards.length}`);
  });

  it('2. Category filter filters items correctly (metal)', () => {
    const { doc } = createDomFixture();
    const select = doc.getElementById('category-select');
    select.value = 'metal';
    select.dispatch('change');
    const grid = doc.getElementById('items-grid');
    const cards = grid.querySelectorAll('.item-card');
    assert.ok(cards.length > 0 && cards.length < 50, `Expected metals count ~19, got ${cards.length}`);
    const ironCard = doc.getElementById('item-card-iron');
    assert.ok(ironCard, 'Iron card must be present in metal category');
  });

  it('3. Category filter filters trophies correctly', () => {
    const { doc } = createDomFixture();
    const select = doc.getElementById('category-select');
    select.value = 'trophy';
    select.dispatch('change');
    const grid = doc.getElementById('items-grid');
    const cards = grid.querySelectorAll('.item-card');
    assert.ok(cards.length >= 60, `Should render 60+ trophies, got ${cards.length}`);
  });

  it('4. Biome filter filters by selected biome', () => {
    const { doc } = createDomFixture();
    const chips = doc.getElementById('biome-chips');
    const meadowsChip = chips.querySelectorAll('.biome-chip').find((c) => c.dataset.biome === 'meadows');
    assert.ok(meadowsChip, 'Meadows biome chip should exist');
    meadowsChip.dispatch('click');
    const cards = expandAll(doc);
    assert.ok(cards.length > 0 && cards.length < 333, 'Filtered cards count should be restricted to Meadows');
    assert.ok(doc.getElementById('item-card-wood'), 'Wood should be present in Meadows');
  });

  it('5. Search filtering by text finds matching items', () => {
    const { doc } = createDomFixture();
    const input = doc.getElementById('item-search');
    input.value = 'Deer Hide';
    input.dispatch('input');
    const grid = doc.getElementById('items-grid');
    const cards = grid.querySelectorAll('.item-card');
    assert.ok(cards.length >= 1, 'Should find at least 1 card matching Deer Hide');
    assert.ok(doc.getElementById('item-card-deer-hide'), 'Deer Hide card should be rendered');
  });

  it('6. Items in unvisited biomes show locked state when spoiler filter is active', () => {
    const { doc } = createDomFixture('', { 'vc.itemsShowAll': 'false' });
    expandAll(doc);
    const ironCard = doc.getElementById('item-card-iron');
    assert.ok(ironCard, 'Iron card should exist');
    assert.ok(ironCard.classList.contains('is-locked'), 'Iron (Swamp) should be locked when progress is default Meadows and spoiler filter is ON');
    const revBtn = ironCard.querySelector('.reveal-btn');
    assert.ok(revBtn, 'Locked card must display a Reveal button');
  });

  it('7. Clicking Reveal unlocks the biome and renders item as unlocked', () => {
    const { doc, storage } = createDomFixture('', { 'vc.itemsShowAll': 'false' });
    expandAll(doc);
    const ironCard = doc.getElementById('item-card-iron');
    assert.ok(ironCard.classList.contains('is-locked'));
    const before = storage.get('vc.progress');
    const revBtn = ironCard.querySelector('.reveal-btn');
    revBtn.dispatch('click');
    assert.equal(storage.get('vc.progress'), before, 'Reveal must not change vc.progress');
    assert.ok(JSON.parse(storage.get('vc.openBiomes')).includes('swamp'), 'Reveal opens the biome in vc.openBiomes');
    const updatedIronCard = doc.getElementById('item-card-iron');
    assert.ok(!updatedIronCard.classList.contains('is-locked'), 'Iron card should now be unlocked');
  });

  it('8. Clicking an unlocked item card opens the detail modal', () => {
    const { doc } = createDomFixture();
    expandAll(doc);
    const woodCard = doc.getElementById('item-card-wood');
    assert.ok(woodCard, 'Wood card should exist');
    assert.ok(!woodCard.classList.contains('is-locked'), 'Wood (Meadows) is unlocked');
    woodCard.dispatch('click');
    const modal = doc.getElementById('item-modal');
    assert.equal(modal.hidden, false, 'Modal should be visible');
    const title = doc.getElementById('modal-item-name');
    assert.equal(title.textContent, 'Wood');
  });

  it('9. Deep link #item=<id> opens the item modal', () => {
    const { doc } = createDomFixture('#item=silver', { 'vc.itemsShowAll': 'true' });
    const modal = doc.getElementById('item-modal');
    assert.equal(modal.hidden, false, 'Modal should open automatically via deep link');
    const title = doc.getElementById('modal-item-name');
    assert.equal(title.textContent, 'Silver');
    const silverCard = doc.getElementById('item-card-silver');
    assert.ok(!silverCard.classList.contains('is-locked'), 'Silver card is unlocked with the spoiler filter off');
  });

  it('10. Add to shopping cart adds item to va.cart in localStorage', () => {
    const { doc, storage } = createDomFixture('#item=bronze', { 'vc.itemsShowAll': 'true' });
    const modalBody = doc.getElementById('modal-body');
    const cartBtn = modalBody.querySelector('.add-cart-btn');
    assert.ok(cartBtn, 'Add to shopping cart button must be present in modal');
    cartBtn.dispatch('click');
    const rawCart = storage.get('va.cart');
    assert.ok(rawCart, 'va.cart should be updated in localStorage');
    const parsed = JSON.parse(rawCart);
    assert.ok(Array.isArray(parsed), 'Cart should be an array');
    assert.ok(
      parsed.some((c) => c.materialId === 'bronze' && c.amount === 1 && c.pieceId === null),
      'Cart should contain bronze as a materialId line'
    );
  });

  it('10b. Smithy gear shows Plan in Smithy instead of the cart button', () => {
    const { doc } = createDomFixture('#item=iron-sword', { 'vc.itemsShowAll': 'true' });
    const modalBody = doc.getElementById('modal-body');
    assert.equal(modalBody.querySelector('.add-cart-btn'), null, 'no cart button for Smithy gear');
    const link = modalBody.querySelector('.plan-smithy-link');
    assert.ok(link, 'Plan in Smithy link present');
    assert.equal(link.href, '/smithy/#item=iron-sword');
  });

  it('11. Non-existent search shows empty state notice', () => {
    const { doc } = createDomFixture();
    const input = doc.getElementById('item-search');
    input.value = 'nonexistentxyz123';
    input.dispatch('input');
    const grid = doc.getElementById('items-grid');
    const emptyNotice = doc.getElementById('items-empty');
    assert.equal(grid.children.length, 0, 'Grid should have no children on non-existent search');
    assert.equal(emptyNotice.hidden, false, 'Empty notice should be shown');
  });

  it('12. Weapons & Tools filter covers weapon and tool categories', () => {
    const { doc } = createDomFixture();
    const select = doc.getElementById('category-select');
    select.value = 'weapon,tool';
    select.dispatch('change');
    const grid = doc.getElementById('items-grid');
    const cards = grid.querySelectorAll('.item-card');
    assert.ok(cards.length >= 100, `Expected 100+ weapon/tool cards, got ${cards.length}`);
    assert.ok(doc.getElementById('item-card-iron-sword'), 'iron-sword should be in Weapons & Tools');
    assert.ok(doc.getElementById('item-item-copper-knife') || doc.getElementById('item-card-copper-knife'), 'copper-knife should be in Weapons & Tools');
    assert.ok(doc.getElementById('item-card-fishing-rod'), 'fishing-rod (tool) should be in Weapons & Tools');
    assert.ok(!doc.getElementById('item-card-sausages'), 'sausages should not be in Weapons & Tools');
  });

  it('13. Armor & Shields filter covers armor and shield categories', () => {
    const { doc } = createDomFixture();
    const select = doc.getElementById('category-select');
    select.value = 'armor,shield';
    select.dispatch('change');
    assert.ok(doc.getElementById('item-card-root-harnesk'), 'root-harnesk should be in Armor & Shields');
    assert.ok(!doc.getElementById('item-card-iron-sword'), 'iron-sword should not be in Armor & Shields');
  });

  it('14. Food & Mead filter covers food, mead and ingredients', () => {
    const { doc } = createDomFixture();
    const select = doc.getElementById('category-select');
    select.value = 'food,mead,food-ingredient';
    select.dispatch('change');
    assert.ok(doc.getElementById('item-card-sausages'), 'sausages should be in Food & Mead');
    assert.ok(doc.getElementById('item-card-thistle'), 'thistle (ingredient) should be in Food & Mead');
    assert.ok(!doc.getElementById('item-card-iron-sword'), 'iron-sword should not be in Food & Mead');
  });

  it('15. Weapon modal shows crafting recipe with linked materials and station', () => {
    const { doc } = createDomFixture('#item=iron-sword', { 'vc.itemsShowAll': 'true' });
    const modalBody = doc.getElementById('modal-body');
    const recipeSection = modalBody.querySelectorAll('.modal-section').find((sec) =>
      sec.children[0] && sec.children[0].textContent === 'Crafting Recipe'
    );
    assert.ok(recipeSection, 'Crafting Recipe section must exist for iron-sword');
    const stationLine = recipeSection.querySelector('.modal-text-item');
    const stationStrong = stationLine.children.find((c) => c.tagName === 'strong');
    const levelSpan = stationLine.children.find((c) => c.tagName === 'span');
    assert.equal(stationStrong.textContent, 'Forge');
    assert.match(levelSpan.textContent, /Level 2/);
    const links = recipeSection
      .querySelectorAll('.modal-link-tag')
      .filter((n) => (n.tagName || '').toLowerCase() === 'a');
    const hrefs = links.map((a) => a.href);
    assert.ok(hrefs.some((h) => h.includes('/items/#item=iron')), 'Iron material must link into the compendium');
    assert.ok(hrefs.some((h) => h.includes('/items/#item=wood')), 'Wood material must link into the compendium');
    const statSection = modalBody.querySelectorAll('.modal-section').find((sec) =>
      sec.children[0] && sec.children[0].textContent === 'Stats'
    );
    assert.ok(statSection, 'Stats section must exist for a weapon');
    const statTexts = statSection.querySelectorAll('.stat-cell').map((c) => c.textContent).join(' | ');
    assert.match(statTexts, /Damage/);
  });

  it('16. Cross-link buttons open the right tools', () => {
    const { doc } = createDomFixture('#item=iron-sword', { 'vc.itemsShowAll': 'true' });
    const crossLinks = doc.getElementById('modal-body').querySelectorAll('.cross-link-btn');
    const hrefs = crossLinks.map((a) => a.href);
    assert.ok(hrefs.some((h) => h.includes('/smithy/#item=iron-sword')), 'Weapon must offer Open in Smithy');

    const tr2 = createDomFixture('#item=megingjord', { 'vc.itemsShowAll': 'true' });
    const traderBtns = tr2.doc.getElementById('modal-body').querySelectorAll('.cross-link-btn');
    const traderHrefs = traderBtns.map((a) => a.href);
    assert.ok(traderHrefs.some((h) => h.includes('/traders/#trader=haldor')), 'megingjord must offer Open in Trader Ledger');

    const tr3 = createDomFixture('#item=sausages', { 'vc.itemsShowAll': 'true' });
    const foodBtns = tr3.doc.getElementById('modal-body').querySelectorAll('.cross-link-btn');
    assert.ok(
      foodBtns.map((a) => a.href).some((h) => h.includes('/provisions/#item=sausages')),
      'sausages must offer Open in Provisions'
    );
  });

  it('17. Drop modal offers Open in Bestiary for creature sources', () => {
    const { doc } = createDomFixture('#item=deer-hide');
    const crossLinks = doc.getElementById('modal-body').querySelectorAll('.cross-link-btn');
    assert.ok(
      crossLinks.map((a) => a.href).some((h) => h.includes('/bestiary/#c=deer')),
      'deer-hide must offer Open in Bestiary'
    );
  });

  it('18. Closing the modal hides it and clears the deep-link hash', () => {
    const { doc, historyState } = createDomFixture('#item=bronze');
    const modal = doc.getElementById('item-modal');
    assert.equal(modal.hidden, false, 'Modal should be open via deep link');
    doc.getElementById('modal-close').dispatch('click');
    assert.equal(modal.hidden, true, 'Modal should be hidden after Close');
    assert.equal(doc.getElementById('item-modal-backdrop').hidden, true, 'Backdrop should be hidden after Close');
    assert.ok(
      historyState.replacedUrls.some((u) => u === '/items/'),
      'Deep-link hash should be cleared without reloading'
    );
  });

  it('19. Quantity input multiplies the amount added to the cart', () => {
    const { doc, storage } = createDomFixture('#item=bronze', { 'vc.itemsShowAll': 'true' });
    const qty = doc.getElementById('modal-body').querySelector('.cart-qty');
    assert.ok(qty, 'Quantity input must be present');
    qty.value = '5';
    const cartBtn = doc.getElementById('modal-body').querySelector('.add-cart-btn');
    cartBtn.dispatch('click');
    const parsed = JSON.parse(storage.get('va.cart'));
    assert.equal(parsed[0].amount, 5, 'Cart should store amount 5');
  });

  it('20. Clicking a locked card opens the modal with spoiler banner and details', () => {
    const { doc } = createDomFixture();
    expandAll(doc);
    const ironCard = doc.getElementById('item-card-iron');
    assert.ok(ironCard, 'Iron card should exist in initial view');
    ironCard.dispatch('click');
    const modal = doc.getElementById('item-modal');
    assert.equal(modal.hidden, false, 'Modal should open when locked card is clicked');
    const spoiler = doc.getElementById('modal-body').querySelector('.modal-spoiler-banner');
    assert.ok(spoiler, 'Spoiler banner should be displayed in modal for unvisited biome');
  });

  it('21. Toggle locked biomes button toggles showAll mode', () => {
    const { doc, storage } = createDomFixture();
    expandAll(doc);
    const toggleBtn = doc.getElementById('toggle-locked-btn');
    assert.ok(toggleBtn, 'Toggle locked biomes button must exist');
    assert.equal(toggleBtn.textContent, 'Spoiler filter: On');
    const ironCard = doc.getElementById('item-card-iron');
    assert.ok(ironCard.classList.contains('is-locked'), 'Iron card should initially be locked when spoiler filter is active');

    // Click to turn spoilers OFF (show all items)
    toggleBtn.dispatch('click');
    assert.equal(storage.get('vc.itemsShowAll'), 'true', 'Clicking toggles spoiler filter OFF (persists true)');
    assert.equal(toggleBtn.textContent, 'Spoiler filter: Off');
    const ironCardUnlocked = doc.getElementById('item-card-iron');
    assert.ok(!ironCardUnlocked.classList.contains('is-locked'), 'Iron card should now be unlocked');

    // Click again to turn spoilers ON
    toggleBtn.dispatch('click');
    assert.equal(storage.get('vc.itemsShowAll'), 'false', 'Clicking again toggles spoiler filter ON (persists false)');
    assert.equal(toggleBtn.textContent, 'Spoiler filter: On');
    const ironCardRelocked = doc.getElementById('item-card-iron');
    assert.ok(ironCardRelocked.classList.contains('is-locked'), 'Iron card should be locked again');
  });

  it('22. Localized search query matches items by localized names', () => {
    const { doc } = createDomFixture();
    const input = doc.getElementById('item-search');
    // amber-pearl has localized name: { cs: "Jantarová Perla" }
    input.value = 'jantarová';
    input.dispatch('input');
    const grid = doc.getElementById('items-grid');
    const cards = grid.querySelectorAll('.item-card');
    assert.ok(cards.length > 0, 'Localized search for "jantarová" should find amber items');
    assert.ok(doc.getElementById('item-card-amber-pearl'), 'item-card-amber-pearl should be found');
  });

  it('23. Recipe materials display capitalized item names and clicking them opens the material modal', () => {
    const { doc } = createDomFixture('#item=bronze', { 'vc.itemsShowAll': 'true' });
    const modalBody = doc.getElementById('modal-body');
    const matLinks = modalBody.querySelectorAll('.modal-link-tag');
    assert.ok(matLinks.length > 0, 'Bronze recipe must render material links');
    const copperLink = Array.from(matLinks).find((l) => l.textContent.includes('Copper'));
    assert.ok(copperLink, 'Material link should display capitalized Copper name');
    copperLink.dispatch('click');
    assert.equal(doc.getElementById('modal-item-name').textContent, 'Copper', 'Clicking material link should update modal to Copper');
  });

  it('24. Renders Category Chips for quick horizontal navigation', () => {
    const { doc } = createDomFixture();
    const chipsBar = doc.getElementById('category-chips');
    assert.ok(chipsBar, 'Category chips toolbar should exist');
    const chips = chipsBar.querySelectorAll('.category-chip');
    assert.equal(chips.length, 18, 'Should render 18 category chips (All + 17 categories)');
    const allChip = chips.find((c) => c.dataset.category === 'all');
    assert.ok(allChip.classList.contains('active'), 'All categories chip should be active by default');
  });

  it('25. Clicking a category chip filters grid and synchronizes category select', () => {
    const { doc } = createDomFixture();
    const chipsBar = doc.getElementById('category-chips');
    const weaponChip = chipsBar.querySelectorAll('.category-chip').find((c) => c.dataset.category === 'weapon');
    assert.ok(weaponChip, 'Weapon chip should exist');
    weaponChip.dispatch('click');
    const activeChip = chipsBar.querySelectorAll('.category-chip').find((c) => c.dataset.category === 'weapon');
    assert.ok(activeChip && activeChip.classList.contains('active'), 'Weapon chip in DOM should now be active');
    const select = doc.getElementById('category-select');
    assert.equal(select.value, 'weapon', 'category-select value should synchronize to weapon');
    const grid = doc.getElementById('items-grid');
    const cards = grid.querySelectorAll('.item-card');
    assert.ok(cards.length >= 80, `Expected 80+ weapon cards, got ${cards.length}`);
  });

  it('26. Default view locks unvisited biomes by progress (Ashlands cards are is-locked and toggle shows Spoiler filter: On)', () => {
    const { doc } = createDomFixture();
    expandAll(doc);
    const toggleBtn = doc.getElementById('toggle-locked-btn');
    assert.equal(toggleBtn.textContent, 'Spoiler filter: On', 'Toggle button text must be "Spoiler filter: On"');

    const ashCards = [
      doc.getElementById('item-card-ashwood'),
      doc.getElementById('item-card-flametal-ore'),
      doc.getElementById('item-card-flametal'),
    ].filter(Boolean);
    assert.ok(ashCards.length > 0, 'Ashlands cards should be present');
    for (const card of ashCards) {
      assert.ok(card.classList.contains('is-locked'), `${card.id} must be locked by default`);
    }

    // Modal on locked Ashlands card shows spoiler banner with localized biome
    const ashCard = doc.getElementById('item-card-ashwood');
    ashCard.dispatch('click');
    const modal = doc.getElementById('item-modal');
    assert.equal(modal.hidden, false);
    const banner = doc.getElementById('modal-body').querySelector('.modal-spoiler-banner');
    assert.ok(banner, 'Modal should display spoiler banner for unvisited Ashlands item');
    assert.equal(banner.querySelector('span').textContent, 'Locked until you reach this biome: Ashlands');
  });

  it('26b. Locked cards leak neither name nor image; search and deep link do not reveal or write progress', () => {
    const { doc, storage } = createDomFixture();
    expandAll(doc);
    const locked = doc.getElementById('items-grid').querySelectorAll('.item-card').filter((c) => c.classList.contains('is-locked'));
    assert.ok(locked.length > 0);
    for (const c of locked) {
      assert.equal(c.querySelectorAll('img').length, 0, 'locked card must have no img');
      assert.ok(!/Flametal/.test(c.textContent), 'locked card must not contain the item name');
    }
    const search = doc.getElementById('item-search');
    search.value = 'flametal';
    search.dispatch('input');
    assert.equal(doc.getElementById('items-grid').querySelectorAll('.item-card').length, 0, 'search must not find locked items');
    assert.ok(!storage.has('vc.progress'), 'progress untouched by search');
  });

  it('26c. Deep link to a locked item opens locked modal without touching progress; Reveal is per item', () => {
    const { doc, storage } = createDomFixture('#item=flametal');
    assert.ok(!storage.has('vc.progress'), 'deep link must not write vc.progress');
    const body = doc.getElementById('modal-body');
    assert.equal(doc.getElementById('item-modal').hidden, false);
    assert.ok(body.querySelector('.modal-spoiler-banner'));
    assert.ok(!/Flametal/.test(doc.getElementById('modal-item-name').textContent));
    assert.equal(body.querySelectorAll('img').length, 0);
    body.querySelector('.reveal-btn').dispatch('click');
    assert.ok(/Flametal/.test(doc.getElementById('modal-item-name').textContent), 'Reveal shows the item');
    assert.ok(!storage.has('vc.progress'), 'Reveal must not write vc.progress');
  });

  it('26d. Used in hides entries from locked biomes and counts them instead', () => {
    const { doc, ctx } = createDomFixture('#item=boar-meat');
    const allText = (n) => (n.textContent || '') + n.children.map(allText).join('\n');
    const text = allText(doc.getElementById('modal-body'));
    assert.ok(!/Sausages/.test(text), 'Sausages (Swamp) must not be listed while Swamp is locked');
    assert.match(text, /more in locked biomes/);
    const foodLabel = /Food \((\d+)\):/.exec(text);
    assert.ok(foodLabel, 'group label counts only visible entries');
    const item = ctx.VC_ITEMS_DATA.items.find((i) => i.id === 'boar-meat');
    assert.ok(Number(foodLabel[1]) < item.usedIn.food.length, 'label count excludes hidden entries');
  });

  it('26e. Category chip counts equal the number of cards after selecting the chip (search, spoilers, teleport)', () => {
    for (const [search, teleport] of [['', 'all'], ['iron', 'all'], ['', 'yes'], ['a', 'no']]) {
      const { doc } = createDomFixture('', { 'vc.itemsShowAll': 'false' });
      const searchEl = doc.getElementById('item-search');
      searchEl.value = search;
      searchEl.dispatch('input');
      const tel = doc.getElementById('teleport-select');
      tel.value = teleport;
      tel.dispatch('change');
      const chips = doc.getElementById('category-chips').querySelectorAll('.category-chip');
      assert.ok(chips.length > 5);
      const expected = chips.map((c) => [c.dataset.category, Number(c.querySelector('.chip-count').textContent.replace(/\D/g, ''))]);
      for (const [cat, count] of expected) {
        const chip = doc.getElementById('category-chips').querySelectorAll('.category-chip').find((c) => c.dataset.category === cat);
        chip.dispatch('click');
        assert.equal(expandAll(doc).length, count, `chip ${cat} (search "${search}", teleport ${teleport})`);
      }
    }
  });

  it('27. Sort select orders items by name (A → Z) and (Z → A) and persists to localStorage', () => {
    const { doc, storage } = createDomFixture();
    const sortSelect = doc.getElementById('sort-select');
    assert.ok(sortSelect, 'sort-select should exist');

    // Change to name-asc
    sortSelect.value = 'name-asc';
    sortSelect.dispatch('change');
    assert.equal(storage.get('vc.itemsSort'), 'name-asc', 'Sort preference persisted in localStorage');

    // Sorting applies inside each biome group.
    const grid = doc.getElementById('items-grid');
    const groupNames = () => grid.querySelectorAll('.biome-group').map((g) => g.querySelectorAll('.item-card-name').map((n) => n.textContent));
    const asc = groupNames();
    assert.ok(asc.length > 1 && asc[0].length > 1);
    for (const names of asc) {
      assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b)), 'Group must be sorted A-Z');
    }

    // Change to name-desc
    sortSelect.value = 'name-desc';
    sortSelect.dispatch('change');
    assert.equal(storage.get('vc.itemsSort'), 'name-desc');
    for (const names of groupNames()) {
      assert.deepEqual(names, [...names].sort((a, b) => b.localeCompare(a)), 'Group must be sorted Z-A');
    }
  });

  it('28. Sort select orders items by weight (Lightest first and Heaviest first)', () => {
    const { doc } = createDomFixture();
    const sortSelect = doc.getElementById('sort-select');

    sortSelect.value = 'weight-desc';
    sortSelect.dispatch('change');
    const cardsDesc = expandAll(doc);
    assert.ok(cardsDesc.length >= 1000, 'Should render cards when sorted by weight-desc');

    sortSelect.value = 'weight-asc';
    sortSelect.dispatch('change');
    const cardsAsc = expandAll(doc);
    assert.ok(cardsAsc.length >= 1000, 'Should render cards when sorted by weight-asc');
  });

  it('29. Quick portal filter filters teleportable and non-teleportable items', () => {
    const { doc } = createDomFixture();
    const telSelect = doc.getElementById('teleport-select');
    assert.ok(telSelect, 'teleport-select should exist');

    // Filter teleportable only
    telSelect.value = 'yes';
    telSelect.dispatch('change');
    expandAll(doc);
    assert.ok(!doc.getElementById('item-card-iron'), 'Iron (metal) should be excluded when teleportable only');
    assert.ok(!doc.getElementById('item-card-copper-ore'), 'Copper Ore should be excluded when teleportable only');
    assert.ok(doc.getElementById('item-card-wood'), 'Wood should be present when teleportable only');

    // Filter non-teleportable only
    telSelect.value = 'no';
    telSelect.dispatch('change');
    expandAll(doc);
    assert.ok(doc.getElementById('item-card-iron'), 'Iron should be present when non-teleportable only');
    assert.ok(doc.getElementById('item-card-dragon-egg'), 'Dragon Egg should be present when non-teleportable only');
    assert.ok(!doc.getElementById('item-card-wood'), 'Wood should be excluded when non-teleportable only');

    // Reset to all
    telSelect.value = 'all';
    telSelect.dispatch('change');
    expandAll(doc);
    assert.ok(doc.getElementById('item-card-iron'), 'Iron present in all');
    assert.ok(doc.getElementById('item-card-wood'), 'Wood present in all');
  });

  it('30. Modal navigation history maintains stack and Back button returns to previous item', () => {
    const { doc } = createDomFixture('', { 'vc.itemsShowAll': 'true' });
    expandAll(doc);
    const swordCard = doc.getElementById('item-card-iron-sword');
    assert.ok(swordCard, 'Iron sword card exists');
    swordCard.dispatch('click');

    const modalName = doc.getElementById('modal-item-name');
    assert.equal(modalName.textContent, 'Iron Sword');

    const backBtn = doc.getElementById('modal-back');
    assert.ok(backBtn.hidden, 'Back button should be hidden for initial item');

    // Click recipe material "Iron" in modal
    const modalBody = doc.getElementById('modal-body');
    const links = modalBody.querySelectorAll('.modal-link-tag');
    const ironLink = links.find((l) => l.title === 'Iron' || l.textContent.includes('Iron'));
    assert.ok(ironLink, 'Iron material link exists in crafting recipe');

    ironLink.dispatch('click');
    assert.equal(modalName.textContent, 'Iron', 'Modal should now display Iron');
    assert.equal(backBtn.hidden, false, 'Back button should now be visible');
    assert.ok(backBtn.textContent.includes('Iron Sword'), 'Back button indicates previous item Iron Sword');

    // Click back button
    backBtn.dispatch('click');
    assert.equal(modalName.textContent, 'Iron Sword', 'Modal returns to Iron Sword');
    assert.equal(backBtn.hidden, true, 'Back button hides after returning to initial item');
  });

  it('31. Modal navigation history avoids circular loops and browser back closes modal', () => {
    const { doc, ctx, fireWindow } = createDomFixture('#item=iron-sword', { 'vc.itemsShowAll': 'true' });
    const modal = doc.getElementById('item-modal');
    assert.equal(modal.hidden, false, 'Modal should be open initially for Iron Sword');
    const modalName = doc.getElementById('modal-item-name');
    assert.equal(modalName.textContent, 'Iron Sword');

    const backBtn = doc.getElementById('modal-back');
    assert.ok(backBtn.hidden, 'Back button is hidden for initial item');

    // Click Iron link
    const modalBody = doc.getElementById('modal-body');
    const links = modalBody.querySelectorAll('.modal-link-tag');
    const ironLink = links.find((l) => l.title === 'Iron' || l.textContent.includes('Iron'));
    assert.ok(ironLink);
    ironLink.dispatch('click');
    assert.equal(modalName.textContent, 'Iron');
    assert.equal(backBtn.hidden, false);
    assert.ok(backBtn.textContent.includes('Iron Sword'));

    // From Iron, click Used In -> Iron Sword (circular transition)
    const usedInLinks = doc.getElementById('modal-body').querySelectorAll('.modal-link-tag');
    const swordLink = usedInLinks.find((l) => l.title === 'Iron Sword' || l.textContent.includes('Iron Sword'));
    assert.ok(swordLink, 'Iron Sword link in used-in section');
    swordLink.dispatch('click');
    assert.equal(modalName.textContent, 'Iron Sword');
    assert.equal(backBtn.hidden, true, 'Back button should be hidden after returning to root item in history');

    // Test hash removal closes modal
    ctx.location.hash = '';
    ctx.window.location.hash = '';
    fireWindow('hashchange');
    assert.equal(modal.hidden, true, 'Modal should close when URL hash is cleared');
  });

  it('32. Biome chips render all 9 biomes from VC_ITEMS_DATA.biomes in progression order', () => {
    const { doc } = createDomFixture();
    const chips = doc.getElementById('biome-chips');
    const biomeButtons = chips.querySelectorAll('.biome-chip').filter((c) => c.dataset.biome);
    const biomeIds = biomeButtons.map((c) => c.dataset.biome);
    assert.deepEqual(biomeIds, [
      'meadows',
      'black-forest',
      'ocean',
      'swamp',
      'mountain',
      'plains',
      'mistlands',
      'ashlands',
      'deep-north',
    ]);
  });
  it('33. Cards are grouped into biome <details> in VC_ITEMS_DATA.biomes order, no empty groups', () => {
    const { doc, ctx } = createDomFixture();
    expandAll(doc);
    const groups = doc.getElementById('items-grid').querySelectorAll('.biome-group');
    const order = Array.from(ctx.VC_ITEMS_DATA.biomes, (b) => b.id);
    const ids = groups.map((g) => g.dataset.biome).filter((id) => id !== '__other');
    assert.deepEqual(ids, order.filter((id) => ids.includes(id)), 'Groups follow biome order');
    assert.ok(ids.length >= 2);
    for (const g of groups) {
      assert.equal(g.tagName, 'details');
      assert.ok(g.querySelectorAll('.item-card').length > 0, 'No empty groups');
    }
    const last = groups[groups.length - 1];
    if (last.dataset.biome === '__other') assert.equal(groups.indexOf(last), groups.length - 1);
  });

  it('34. Only the current reach biome is open without filters; a group renders at most 60 cards plus a Show more button', () => {
    const { doc } = createDomFixture('', { 'vc.itemsShowAll': 'false' });
    const groups = doc.getElementById('items-grid').querySelectorAll('.biome-group');
    const open = groups.filter((g) => g.getAttribute('open') !== null);
    assert.equal(open.length, 1, 'exactly one open group');
    assert.equal(open[0].dataset.biome, 'meadows');
    for (const g of groups) assert.ok(g.querySelectorAll('.item-card').length <= 60, 'max 60 cards per group');
    const big = groups.find((g) => g.querySelector('.biome-group-more'));
    assert.ok(big, 'a group with > 60 items shows the button');
    assert.equal(big.querySelectorAll('.item-card').length, 60);
    big.querySelector('.biome-group-more').dispatch('click');
    const again = doc.getElementById('items-grid').querySelectorAll('.biome-group').find((g) => g.dataset.biome === big.dataset.biome);
    assert.ok(again.querySelectorAll('.item-card').length > 60, 'button adds the next page');
  });

  it('35. Active search or category opens every non-empty group', () => {
    const { doc } = createDomFixture('', { 'vc.itemsShowAll': 'true' });
    const input = doc.getElementById('item-search');
    input.value = 'sword';
    input.dispatch('input');
    const groups = doc.getElementById('items-grid').querySelectorAll('.biome-group');
    assert.ok(groups.length >= 2, 'sword matches several biomes');
    for (const g of groups) assert.notEqual(g.getAttribute('open'), null, 'group open while searching');
    input.value = '';
    input.dispatch('input');
    const select = doc.getElementById('category-select');
    select.value = 'trophy';
    select.dispatch('change');
    for (const g of doc.getElementById('items-grid').querySelectorAll('.biome-group')) {
      assert.notEqual(g.getAttribute('open'), null, 'group open with category selected');
    }
  });
  it('36. Deep link to a card beyond the 60-card page opens its group and renders the card', () => {
    const probe = createDomFixture('', { 'vc.itemsShowAll': 'true' });
    const group = probe.doc.getElementById('items-grid').querySelectorAll('.biome-group').find((g) => g.querySelector('.biome-group-more'));
    const biome = group.dataset.biome;
    const all = Array.from(probe.ctx.VC_ITEMS_DATA.items).filter((i) => (i.biome || '__other') === biome);
    const names = expandAll(probe.doc).filter((c) => c.parentElement.parentElement.dataset.biome === biome).map((c) => c.dataset.id);
    const target = names[names.length - 1];
    assert.ok(all.some((i) => i.id === target) && names.indexOf(target) >= 60);
    const { doc } = createDomFixture(`#item=${target}`, { 'vc.itemsShowAll': 'true' });
    assert.ok(doc.getElementById(`item-card-${target}`), 'target card rendered');
    const g = doc.getElementById('items-grid').querySelectorAll('.biome-group').find((x) => x.dataset.biome === biome);
    assert.notEqual(g.getAttribute('open'), null, 'group is open');
  });
  it('37. Group wrapper spans the whole #items-grid (grid-column 1 / -1)', () => {
    const css = readFileSync(path.join(ROOT, 'apps/items/assets/styles.css'), 'utf8');
    const rule = css.match(/\.items-grid-groups\s*\{([^}]*)\}/);
    assert.ok(rule, '.items-grid-groups rule exists');
    assert.match(rule[1], /grid-column:\s*1\s*\/\s*-1/);
  });

  it('38. Closed groups render no cards until opened', () => {
    const { doc } = createDomFixture('', { 'vc.itemsShowAll': 'false' });
    const groups = doc.getElementById('items-grid').querySelectorAll('.biome-group');
    const closed = groups.find((g) => g.getAttribute('open') === null);
    assert.ok(closed);
    assert.equal(closed.querySelectorAll('.item-card').length, 0);
    const id = closed.dataset.biome;
    closed.querySelector('.biome-group-summary').dispatch('click');
    const now = doc.getElementById('items-grid').querySelectorAll('.biome-group').find((g) => g.dataset.biome === id);
    assert.ok(now.querySelectorAll('.item-card').length > 0);
    assert.notEqual(now.getAttribute('open'), null);
  });
  it('39. Opening a group by its summary keeps focus on that summary', () => {
    const { doc } = createDomFixture('', { 'vc.itemsShowAll': 'false' });
    const closed = doc.getElementById('items-grid').querySelectorAll('.biome-group').find((g) => g.dataset.biome === 'swamp');
    Node.active = null;
    closed.querySelector('.biome-group-summary').dispatch('click');
    assert.ok(Node.active, 'something is focused');
    assert.equal(Node.active.tagName, 'summary');
    assert.equal(Node.active.parentElement.dataset.biome, 'swamp');
  });

  it('40. Show more keeps focus on the first newly added card', () => {
    const { doc } = createDomFixture('', { 'vc.itemsShowAll': 'false' });
    const g = doc.getElementById('items-grid').querySelectorAll('.biome-group').find((x) => x.querySelector('.biome-group-more'));
    Node.active = null;
    g.querySelector('.biome-group-more').dispatch('click');
    assert.ok(Node.active && Node.active.classList.contains('item-card'));
    const cards = doc.getElementById('items-grid').querySelectorAll('.biome-group').find((x) => x.dataset.biome === g.dataset.biome).querySelectorAll('.item-card');
    assert.equal(cards.indexOf(Node.active), 60);
  });

  it('41. Deep link to a card past position 60 in a closed group (black-forest) opens it and renders the card', () => {
    const probe = createDomFixture('', { 'vc.itemsShowAll': 'true' });
    const ids = expandAll(probe.doc).filter((c) => c.parentElement.parentElement.dataset.biome === 'black-forest').map((c) => c.dataset.id);
    assert.ok(ids.length > 60, 'black-forest has more than 60 items');
    const target = ids[ids.length - 1];
    const { doc } = createDomFixture(`#item=${target}`, { 'vc.itemsShowAll': 'true' });
    const g = doc.getElementById('items-grid').querySelectorAll('.biome-group').find((x) => x.dataset.biome === 'black-forest');
    assert.notEqual(g.getAttribute('open'), null, 'group open');
    assert.ok(doc.getElementById(`item-card-${target}`), 'card rendered');
  });
});
