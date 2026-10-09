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
      cb({ target: this, currentTarget: this, ...ev, stopPropagation() {} });
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

function createDomFixture(initialHash = '') {
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
    'biome-chips',
    'items-count',
    'items-grid',
    'items-empty',
    'item-modal-backdrop',
    'item-modal',
    'modal-item-name',
    'modal-close',
    'modal-body',
    'notice',
  ];

  ids.forEach((id) => {
    let tag = 'div';
    if (id.includes('close') || id.includes('btn')) tag = 'button';
    else if (id.includes('select')) tag = 'select';
    else if (id.includes('search')) tag = 'input';
    const n = new Node(tag);
    n.id = id;
    body.append(n);
    allNodes.push(n);
  });

  const storage = new Map();
  const windowListeners = new Map();

  const ctx = {
    document: doc,
    window: {
      addEventListener: (k, cb) => (windowListeners.get(k) || windowListeners.set(k, []).get(k)).push(cb),
      location: { hash: initialHash },
      document: doc,
    },
    location: { hash: initialHash },
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
  load('shared/progress/core.js');
  load('shared/shopping/core.js');
  load('apps/items/assets/app.js');

  return {
    ctx,
    doc,
    storage,
    fireWindow(k, ev = {}) {
      for (const cb of windowListeners.get(k) || []) cb(ev);
    },
  };
}

describe('Items Compendium UI Tests', () => {
  it('1. Renders all 333 items on initial load', () => {
    const { doc } = createDomFixture();
    const grid = doc.getElementById('items-grid');
    const cards = grid.querySelectorAll('.item-card');
    assert.equal(cards.length, 333, 'Initial view should render 333 cards');
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
    assert.equal(cards.length, 11, 'Should render 11 trophies');
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

  it('6. Items in unvisited biomes show locked state with Reveal button', () => {
    const { doc } = createDomFixture();
    const ironCard = doc.getElementById('item-card-iron');
    assert.ok(ironCard, 'Iron card should exist');
    assert.ok(ironCard.classList.contains('is-locked'), 'Iron (Swamp) should be locked when progress is default Meadows');
    const revBtn = ironCard.querySelector('.reveal-btn');
    assert.ok(revBtn, 'Locked card must display a Reveal button');
  });

  it('7. Clicking Reveal unlocks the biome and renders item as unlocked', () => {
    const { doc } = createDomFixture();
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

  it('9. Deep link #item=<id> opens the item modal and unlocks biome if needed', () => {
    const { doc } = createDomFixture('#item=silver');
    const modal = doc.getElementById('item-modal');
    assert.equal(modal.hidden, false, 'Modal should open automatically via deep link');
    const title = doc.getElementById('modal-item-name');
    assert.equal(title.textContent, 'Silver');
    const silverCard = doc.getElementById('item-card-silver');
    assert.ok(!silverCard.classList.contains('is-locked'), 'Silver card should be unlocked by deep link');
  });

  it('10. Add to shopping cart adds item to va.cart in localStorage', () => {
    const { doc, storage } = createDomFixture('#item=bronze');
    const modalBody = doc.getElementById('modal-body');
    const cartBtn = modalBody.querySelector('.add-cart-btn');
    assert.ok(cartBtn, 'Add to shopping cart button must be present in modal');
    cartBtn.dispatch('click');
    const rawCart = storage.get('va.cart');
    assert.ok(rawCart, 'va.cart should be updated in localStorage');
    const parsed = JSON.parse(rawCart);
    assert.ok(Array.isArray(parsed), 'Cart should be an array');
    assert.ok(
      parsed.some((c) => c.item === 'bronze' || c.pieceId === 'bronze'),
      'Cart should contain bronze'
    );
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
});
