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

  get href() {
    return this.attrs.href || this._href || '';
  }

  set href(v) {
    this._href = v;
    this.attrs.href = String(v);
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
          const val = node.dataset[m[1]] ?? node.getAttribute(`data-${m[1]}`);
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
  const body = new Node('body');
  const doc = {
    readyState: 'complete',
    body,
    events: {},
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

  // Build the DOM structure matching index.html
  const langPicker = new Node('div');
  langPicker.id = 'language-picker';
  body.append(langPicker);

  const appraisalSection = new Node('section');
  appraisalSection.className = 'appraisal-section';
  body.append(appraisalSection);

  const toggleAppraisalBtn = new Node('button');
  toggleAppraisalBtn.id = 'appraisal-toggle';
  appraisalSection.append(toggleAppraisalBtn);

  const clearBtn = new Node('button');
  clearBtn.id = 'appraisal-clear';
  appraisalSection.append(clearBtn);

  const appraisalGrid = new Node('div');
  appraisalGrid.className = 'appraisal-grid';
  appraisalSection.append(appraisalGrid);

  const keys = ['coins', 'amber', 'amber-pearl', 'ruby', 'silver-necklace'];
  for (const k of keys) {
    const card = new Node('div');
    const input = new Node('input');
    input.id = `input-${k}`;
    input.value = '0';

    const btnDec = new Node('button');
    btnDec.className = 'btn-step';
    btnDec.setAttribute('data-step-target', k);
    btnDec.setAttribute('data-step', '-1');

    const btnInc = new Node('button');
    btnInc.className = 'btn-step';
    btnInc.setAttribute('data-step-target', k);
    btnInc.setAttribute('data-step', '1');

    card.append(btnDec, input, btnInc);
    appraisalGrid.append(card);
  }

  const totalEl = new Node('span');
  totalEl.id = 'summary-total-coins';

  const valEl = new Node('span');
  valEl.id = 'summary-valuables-coins';

  const affEl = new Node('span');
  affEl.id = 'summary-affordable-count';

  const filterAffBtn = new Node('button');
  filterAffBtn.id = 'filter-affordable-btn';

  const summaryWrap = new Node('div');
  summaryWrap.className = 'appraisal-summary';
  summaryWrap.append(totalEl, valEl, affEl, filterAffBtn);
  appraisalSection.append(summaryWrap);

  const tabHaldor = new Node('button');
  tabHaldor.id = 'tab-haldor';
  tabHaldor.className = 'trader-tab is-active';
  tabHaldor.setAttribute('data-trader', 'haldor');
  body.append(tabHaldor);

  const tabHildir = new Node('button');
  tabHildir.id = 'tab-hildir';
  tabHildir.className = 'trader-tab';
  tabHildir.setAttribute('data-trader', 'hildir');
  body.append(tabHildir);

  const tabBogWitch = new Node('button');
  tabBogWitch.id = 'tab-bog-witch';
  tabBogWitch.className = 'trader-tab';
  tabBogWitch.setAttribute('data-trader', 'bog-witch');
  body.append(tabBogWitch);

  const nameEl = new Node('h2');
  nameEl.id = 'trader-name';
  body.append(nameEl);

  const subEl = new Node('p');
  subEl.id = 'trader-subtitle';
  body.append(subEl);

  const tagEl = new Node('span');
  tagEl.id = 'trader-biome-tag';
  body.append(tagEl);

  const descEl = new Node('p');
  descEl.id = 'trader-desc';
  body.append(descEl);

  const tipEl = new Node('span');
  tipEl.id = 'trader-map-tip';
  body.append(tipEl);

  const goodsGrid = new Node('div');
  goodsGrid.id = 'goods-grid';
  body.append(goodsGrid);

  const notice = new Node('p');
  notice.id = 'notice';
  body.append(notice);

  let storage = {};
  const localStorageMock = {
    getItem: (k) => storage[k] ?? null,
    setItem: (k, v) => {
      storage[k] = String(v);
    },
    removeItem: (k) => {
      delete storage[k];
    },
    clear: () => {
      storage = {};
    },
  };

  let currentHash = initialHash;
  const windowMock = {
    location: {
      get hash() {
        return currentHash;
      },
      set hash(v) {
        currentHash = v;
      },
    },
    history: {
      replaceState: (state, title, url) => {
        currentHash = url;
      },
    },
    localStorage: localStorageMock,
    addEventListener: (k, cb) => {
      (doc.events[k] ??= []).push(cb);
    },
    document: doc,
  };

  let defeatedState = {};
  let progressListener = null;
  const progressMock = {
    get: () => ({ defeated: defeatedState }),
    onChange: (cb) => {
      progressListener = cb;
    },
    defeat: (bossId, val) => {
      defeatedState[bossId] = val;
      if (progressListener) progressListener();
    },
  };

  let applyCalled = 0;
  const i18nMock = {
    t: (k) => k,
    tn: (catalog, k, count) => `${count} ${k.replace(/\{count\}\s*/, '')}`,
    locale: () => 'en',
    mountPicker: () => {},
    onChange: () => {},
    apply: () => {
      applyCalled++;
    },
  };

  const context = {
    window: windowMock,
    globalThis: windowMock,
    document: doc,
    localStorage: localStorageMock,
    VCProgress: progressMock,
    VCI18n: i18nMock,
    VC_TRADERS_DATA: null,
    setTimeout: (fn) => setTimeout(fn, 0),
    clearTimeout: (id) => clearTimeout(id),
    Intl,
    URLSearchParams,
  };
  context.globalThis.window = windowMock;
  context.globalThis.document = doc;
  context.globalThis.localStorage = localStorageMock;
  context.globalThis.VCProgress = progressMock;
  context.globalThis.VCI18n = i18nMock;

  vm.createContext(context);

  // Load data bundle
  const dataScript = readFileSync(path.join(ROOT, 'apps', 'traders', 'data', 'data.js'), 'utf8');
  vm.runInContext(dataScript, context);

  // Load app script
  const appScript = readFileSync(path.join(ROOT, 'apps', 'traders', 'assets', 'app.js'), 'utf8');
  vm.runInContext(appScript, context);

  return {
    doc,
    window: windowMock,
    context,
    progress: progressMock,
    getApplyCalled: () => applyCalled,
    localStorage: localStorageMock,
  };
}

describe('Trader Ledger UI Test Suite (VC-40)', () => {
  it('1. renders Haldor tab by default as active tab with 8 merchandise items', () => {
    const { doc } = createDomFixture();
    const tabHaldor = doc.getElementById('tab-haldor');
    assert.equal(tabHaldor.getAttribute('aria-selected'), 'true');
    assert.ok(tabHaldor.classList.contains('is-active'));

    const nameEl = doc.getElementById('trader-name');
    assert.equal(nameEl.textContent, 'Haldor');

    const grid = doc.getElementById('goods-grid');
    assert.equal(grid.children.length, 8);
  });

  it('2. switches tabs to Hildir and renders Hildir goods without page reload', () => {
    const { doc } = createDomFixture();
    const tabHildir = doc.getElementById('tab-hildir');
    tabHildir.dispatch('click');

    assert.equal(tabHildir.getAttribute('aria-selected'), 'true');
    const nameEl = doc.getElementById('trader-name');
    assert.equal(nameEl.textContent, 'Hildir');

    const grid = doc.getElementById('goods-grid');
    assert.ok(grid.children.length >= 7, 'Hildir has clothing and base goods');
    const barberCard = doc.getElementById('item-card-barber-kit');
    assert.ok(barberCard, 'Barber kit card is rendered under Hildir');
  });

  it('3. switches tabs to The Bog Witch and renders potions and seasonings', () => {
    const { doc } = createDomFixture();
    const tabBogWitch = doc.getElementById('tab-bog-witch');
    tabBogWitch.dispatch('click');

    const nameEl = doc.getElementById('trader-name');
    assert.equal(nameEl.textContent, 'The Bog Witch');

    const lovePotionCard = doc.getElementById('item-card-love-potion');
    assert.ok(lovePotionCard, 'Love Potion card is rendered under Bog Witch');
  });

  it('4. calculates treasure appraisal sum from coins and all valuables correctly', () => {
    const { doc } = createDomFixture();

    const inputCoins = doc.getElementById('input-coins');
    const inputAmber = doc.getElementById('input-amber');
    const inputPearl = doc.getElementById('input-amber-pearl');
    const inputRuby = doc.getElementById('input-ruby');
    const inputNecklace = doc.getElementById('input-silver-necklace');

    // 50 coins
    inputCoins.value = '50';
    inputCoins.dispatch('input');

    // 2 Amber * 5 = 10
    inputAmber.value = '2';
    inputAmber.dispatch('input');

    // 1 Amber Pearl * 10 = 10
    inputPearl.value = '1';
    inputPearl.dispatch('input');

    // 3 Ruby * 20 = 60
    inputRuby.value = '3';
    inputRuby.dispatch('input');

    // 1 Silver Necklace * 30 = 30
    inputNecklace.value = '1';
    inputNecklace.dispatch('input');

    // Total = 50 + 10 + 10 + 60 + 30 = 160 coins
    const totalEl = doc.getElementById('summary-total-coins');
    const valEl = doc.getElementById('summary-valuables-coins');

    assert.match(totalEl.textContent, /160/);
    assert.match(valEl.textContent, /110/);
  });

  it('5. stepping buttons increase and decrease valuable counts and update appraisal', () => {
    const { doc } = createDomFixture();

    const btnInc = doc.querySelectorAll('.btn-step').find(
      (b) => b.getAttribute('data-step-target') === 'ruby' && b.getAttribute('data-step') === '1'
    );
    assert.ok(btnInc);
    btnInc.dispatch('click'); // 1 Ruby = 20

    const totalEl = doc.getElementById('summary-total-coins');
    assert.match(totalEl.textContent, /20/);

    const btnDec = doc.querySelectorAll('.btn-step').find(
      (b) => b.getAttribute('data-step-target') === 'ruby' && b.getAttribute('data-step') === '-1'
    );
    btnDec.dispatch('click'); // 0 Ruby = 0
    assert.match(totalEl.textContent, /0/);
  });

  it('6. marks merchandise with affordable badge when player has sufficient funds', () => {
    const { doc } = createDomFixture();

    // Haldor has Ymir Flesh (120), Yule Hat (100), Megingjord (950)
    const inputCoins = doc.getElementById('input-coins');
    inputCoins.value = '150';
    inputCoins.dispatch('input');

    const fleshCard = doc.getElementById('item-card-ymir-flesh');
    const hatCard = doc.getElementById('item-card-yule-hat');
    const beltCard = doc.getElementById('item-card-megingjord');

    assert.ok(fleshCard.classList.contains('is-affordable'), 'Ymir flesh (120) is affordable with 150 coins');
    assert.ok(hatCard.classList.contains('is-affordable'), 'Yule hat (100) is affordable with 150 coins');
    assert.equal(beltCard.classList.contains('is-affordable'), false, 'Megingjörd (950) is NOT affordable with 150 coins');
  });

  it('7. clears appraisal state when clicking Clear appraisal button', () => {
    const { doc } = createDomFixture();

    const inputCoins = doc.getElementById('input-coins');
    inputCoins.value = '500';
    inputCoins.dispatch('input');

    const clearBtn = doc.getElementById('appraisal-clear');
    clearBtn.dispatch('click');

    const totalEl = doc.getElementById('summary-total-coins');
    assert.match(totalEl.textContent, /0/);
    assert.equal(inputCoins.value, '0');
  });

  it('8. spoiler protection locks progress-gated goods and provides Reveal button', () => {
    const { doc, progress } = createDomFixture();

    const thunderCard = doc.getElementById('item-card-thunderstone');
    assert.ok(thunderCard.classList.contains('is-locked'), 'Thunderstone is initially locked without The Elder defeated');

    const revealBtn = thunderCard.querySelector('.btn-reveal');
    assert.ok(revealBtn, 'Reveal button exists on locked Thunderstone');

    // Click Reveal
    revealBtn.dispatch('click');
    const updatedThunderCard = doc.getElementById('item-card-thunderstone');
    assert.equal(updatedThunderCard.classList.contains('is-locked'), false, 'Thunderstone unlocked after manual reveal');
  });

  it('9. unlocks progress-gated goods automatically when boss is marked defeated in VCProgress', () => {
    const { doc, progress } = createDomFixture();

    const eggCard = doc.getElementById('item-card-egg');
    assert.ok(eggCard.classList.contains('is-locked'), 'Egg is locked before defeating Yagluth');

    progress.defeat('yagluth', true);
    const updatedEggCard = doc.getElementById('item-card-egg');
    assert.equal(updatedEggCard.classList.contains('is-locked'), false, 'Egg is unlocked after defeating Yagluth');
  });

  it('10. activates correct trader tab when deep linking with #trader or #item hash', () => {
    const { doc } = createDomFixture('#item=barber-kit');
    const nameEl = doc.getElementById('trader-name');
    assert.equal(nameEl.textContent, 'Hildir', 'Hash #item=barber-kit navigated to Hildir tab');

    const card = doc.getElementById('item-card-barber-kit');
    assert.ok(card.classList.contains('highlight'), 'Card is highlighted on deep link');
  });

  it('11. calls VCI18n.apply() during initialization and render', () => {
    const { getApplyCalled } = createDomFixture();
    assert.ok(getApplyCalled() >= 1, 'VCI18n.apply() was called');
  });

  it('12. Add to shopping cart stores item in va.cart and updates button to In cart', () => {
    const { doc, localStorage } = createDomFixture();
    const ymirCard = doc.getElementById('item-card-ymir-flesh');
    assert.ok(ymirCard, 'Ymir Flesh card exists');

    const cartBtn = ymirCard.querySelector('.btn-cart');
    assert.ok(cartBtn, 'Add to shopping cart button exists on item card');
    assert.ok(!cartBtn.classList.contains('is-added'), 'Cart button initially not marked as added');

    // Click add to cart
    cartBtn.dispatch('click');
    const rawCart = localStorage.getItem('va.cart');
    assert.ok(rawCart, 'va.cart should be present in localStorage');
    const cart = JSON.parse(rawCart);
    assert.equal(cart.length, 1);
    assert.equal(cart[0].item, 'ymir-flesh');
    assert.equal(cart[0].quantity, 1);

    // Button should now be marked as in cart
    const updatedBtn = doc.getElementById('btn-cart-ymir-flesh');
    assert.ok(updatedBtn.classList.contains('is-added'), 'Cart button now has is-added class');
    assert.ok(updatedBtn.textContent.includes('In cart') || updatedBtn.textContent.includes('✓'), 'Cart button displays In cart');

    // Click again -> increments quantity
    updatedBtn.dispatch('click');
    const cartAfter = JSON.parse(localStorage.getItem('va.cart'));
    assert.equal(cartAfter[0].quantity, 2, 'Quantity increments on multiple clicks');
  });

  it('13. Filter affordable items displays only merchandise within current budget and empty message when none affordable', () => {
    const { doc } = createDomFixture();
    const filterBtn = doc.getElementById('filter-affordable-btn');
    assert.ok(filterBtn, 'filter-affordable-btn exists');

    // Budget is 0: toggle filter
    filterBtn.dispatch('click');
    assert.equal(filterBtn.getAttribute('aria-pressed'), 'true');
    const grid = doc.getElementById('goods-grid');
    const emptyNotice = grid.querySelector('.goods-empty');
    assert.ok(emptyNotice, 'Empty notice shown when 0 items are affordable');

    // Give 200 coins: Ymir Flesh (120), Fishing Bait (10), Yule Hat (100) are affordable
    const inputCoins = doc.getElementById('input-coins');
    inputCoins.value = '200';
    inputCoins.dispatch('input');

    const cards = grid.querySelectorAll('.good-card');
    assert.ok(cards.length >= 3, 'Affordable cards rendered');
    assert.ok(doc.getElementById('item-card-ymir-flesh'), 'Ymir Flesh (120) is affordable');
    assert.ok(doc.getElementById('item-card-fishing-bait'), 'Fishing Bait (10) is affordable');
    assert.ok(!doc.getElementById('item-card-megingjord'), 'Megingjörd (950) is excluded');

    // Toggle off
    filterBtn.dispatch('click');
    assert.equal(filterBtn.getAttribute('aria-pressed'), 'false');
    const allCards = grid.querySelectorAll('.good-card');
    assert.equal(allCards.length, 8, 'Full list restored');
    assert.ok(doc.getElementById('item-card-megingjord'), 'Megingjörd is back');
  });

  it('14. Collapse calculator toggles collapsed state and aria-expanded', () => {
    const { doc, localStorage } = createDomFixture();
    const toggleBtn = doc.getElementById('appraisal-toggle');
    const section = doc.querySelector('.appraisal-section');
    assert.ok(toggleBtn, 'appraisal-toggle button exists');
    assert.ok(section, 'appraisal-section exists');

    toggleBtn.dispatch('click');
    assert.ok(section.classList.contains('is-collapsed'), 'Section has is-collapsed class');
    assert.equal(toggleBtn.getAttribute('aria-expanded'), 'false');
    assert.equal(localStorage.getItem('vc.appraisalCollapsed'), 'true');

    toggleBtn.dispatch('click');
    assert.ok(!section.classList.contains('is-collapsed'), 'Section is expanded again');
    assert.equal(toggleBtn.getAttribute('aria-expanded'), 'true');
    assert.equal(localStorage.getItem('vc.appraisalCollapsed'), 'false');
  });

  it('15. Locked goods show boss prerequisite link to expedition or bestiary', () => {
    const { doc } = createDomFixture();
    const thunderCard = doc.getElementById('item-card-thunderstone');
    const bossLink = thunderCard.querySelector('.link-boss-expedition');
    assert.ok(bossLink, 'Expedition boss link exists on Thunderstone');
    assert.equal(bossLink.getAttribute('href'), '/expedition/#boss=the-elder');

    // Hildir tab
    const tabHildir = doc.getElementById('tab-hildir');
    tabHildir.dispatch('click');
    const furCapCard = doc.getElementById('item-card-fur-cap-grey');
    assert.ok(furCapCard, 'Fur Cap card exists');
    const minibossLink = furCapCard.querySelector('.link-boss-expedition');
    assert.ok(minibossLink, 'Bestiary miniboss link exists for Brenna');
    assert.equal(minibossLink.getAttribute('href'), '/bestiary/#c=brenna');
  });

  it('16. Dynamic appraisal toggle and affordable filter buttons retain state across VCI18n.apply()', () => {
    const { doc, context } = createDomFixture();
    const toggleBtn = doc.getElementById('appraisal-toggle');
    const filterBtn = doc.getElementById('filter-affordable-btn');

    // Toggle calculator to collapsed and affordable filter to active
    toggleBtn.dispatch('click');
    filterBtn.dispatch('click');

    assert.ok(toggleBtn.textContent.includes('Expand calculator') || toggleBtn.textContent.includes('▼'));
    assert.ok(filterBtn.textContent.includes('Showing only affordable') || filterBtn.textContent.includes('✓'));

    // Apply i18n
    context.globalThis.VCI18n.apply();

    // Verify dynamic text is NOT clobbered back to static text
    assert.ok(toggleBtn.textContent.includes('Expand calculator') || toggleBtn.textContent.includes('▼'), 'Calculator toggle button keeps Expand state');
    assert.ok(filterBtn.textContent.includes('Showing only affordable') || filterBtn.textContent.includes('✓'), 'Affordable filter keeps active state');
  });
});
