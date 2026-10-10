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
    const grid = doc.getElementById('items-grid');
    const cards = grid.querySelectorAll('.item-card');
    assert.ok(cards.length >= 1000, `Initial view should render >= 1000 cards, got ${cards.length}`);
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
    const grid = doc.getElementById('items-grid');
    const cards = grid.querySelectorAll('.item-card');
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
    const ironCard = doc.getElementById('item-card-iron');
    assert.ok(ironCard, 'Iron card should exist');
    assert.ok(ironCard.classList.contains('is-locked'), 'Iron (Swamp) should be locked when progress is default Meadows and spoiler filter is ON');
    const revBtn = ironCard.querySelector('.reveal-btn');
    assert.ok(revBtn, 'Locked card must display a Reveal button');
  });

  it('7. Clicking Reveal unlocks the biome and renders item as unlocked', () => {
    const { doc } = createDomFixture('', { 'vc.itemsShowAll': 'false' });
    const ironCard = doc.getElementById('item-card-iron');
    assert.ok(ironCard.classList.contains('is-locked'));
    const revBtn = ironCard.querySelector('.reveal-btn');
    revBtn.dispatch('click');
    const updatedIronCard = doc.getElementById('item-card-iron');
    assert.ok(!updatedIronCard.classList.contains('is-locked'), 'Iron card should now be unlocked');
  });

  it('8. Clicking an unlocked item card opens the detail modal', () => {
    const { doc } = createDomFixture();
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

  it('27. Sort select orders items by name (A → Z) and (Z → A) and persists to localStorage', () => {
    const { doc, storage } = createDomFixture();
    const sortSelect = doc.getElementById('sort-select');
    assert.ok(sortSelect, 'sort-select should exist');

    // Change to name-asc
    sortSelect.value = 'name-asc';
    sortSelect.dispatch('change');
    assert.equal(storage.get('vc.itemsSort'), 'name-asc', 'Sort preference persisted in localStorage');

    const grid = doc.getElementById('items-grid');
    const cardsAsc = grid.querySelectorAll('.item-card');
    const firstAscName = cardsAsc[0].querySelector('.item-card-name').textContent;
    const lastAscName = cardsAsc[cardsAsc.length - 1].querySelector('.item-card-name').textContent;
    assert.ok(firstAscName.toLowerCase() <= lastAscName.toLowerCase(), 'Items should be sorted alphabetically');

    // Change to name-desc
    sortSelect.value = 'name-desc';
    sortSelect.dispatch('change');
    assert.equal(storage.get('vc.itemsSort'), 'name-desc');
    const cardsDesc = grid.querySelectorAll('.item-card');
    const firstDescName = cardsDesc[0].querySelector('.item-card-name').textContent;
    assert.equal(firstDescName, lastAscName, 'First item in Z-A should match last item in A-Z');
  });

  it('28. Sort select orders items by weight (Lightest first and Heaviest first)', () => {
    const { doc } = createDomFixture();
    const sortSelect = doc.getElementById('sort-select');

    sortSelect.value = 'weight-desc';
    sortSelect.dispatch('change');
    const grid = doc.getElementById('items-grid');
    const cardsDesc = grid.querySelectorAll('.item-card');
    assert.ok(cardsDesc.length >= 1000, 'Should render cards when sorted by weight-desc');

    sortSelect.value = 'weight-asc';
    sortSelect.dispatch('change');
    const cardsAsc = grid.querySelectorAll('.item-card');
    assert.ok(cardsAsc.length >= 1000, 'Should render cards when sorted by weight-asc');
  });

  it('29. Quick portal filter filters teleportable and non-teleportable items', () => {
    const { doc } = createDomFixture();
    const telSelect = doc.getElementById('teleport-select');
    assert.ok(telSelect, 'teleport-select should exist');

    // Filter teleportable only
    telSelect.value = 'yes';
    telSelect.dispatch('change');
    assert.ok(!doc.getElementById('item-card-iron'), 'Iron (metal) should be excluded when teleportable only');
    assert.ok(!doc.getElementById('item-card-copper-ore'), 'Copper Ore should be excluded when teleportable only');
    assert.ok(doc.getElementById('item-card-wood'), 'Wood should be present when teleportable only');

    // Filter non-teleportable only
    telSelect.value = 'no';
    telSelect.dispatch('change');
    assert.ok(doc.getElementById('item-card-iron'), 'Iron should be present when non-teleportable only');
    assert.ok(doc.getElementById('item-card-dragon-egg'), 'Dragon Egg should be present when non-teleportable only');
    assert.ok(!doc.getElementById('item-card-wood'), 'Wood should be excluded when non-teleportable only');

    // Reset to all
    telSelect.value = 'all';
    telSelect.dispatch('change');
    assert.ok(doc.getElementById('item-card-iron'), 'Iron present in all');
    assert.ok(doc.getElementById('item-card-wood'), 'Wood present in all');
  });

  it('30. Modal navigation history maintains stack and Back button returns to previous item', () => {
    const { doc } = createDomFixture('', { 'vc.itemsShowAll': 'true' });
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
});
