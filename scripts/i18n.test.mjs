import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// 1. Simulate browser environment before loading scripts
class MockStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }
  setItem(key, value) {
    this.store.set(key, String(value));
  }
  removeItem(key) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}

const mockStorage = new MockStorage();
globalThis.localStorage = mockStorage;

const mockNavigator = {
  languages: ['en'],
  language: 'en',
};
Object.defineProperty(globalThis, 'navigator', {
  value: mockNavigator,
  configurable: true,
  writable: true,
});

class MockElement {
  constructor(tagName = 'div') {
    this.tagName = tagName.toUpperCase();
    this.attributes = new Map();
    this.textContent = '';
    this.children = [];
    this.value = '';
    this.listeners = new Map();
  }
  hasAttribute(name) {
    return this.attributes.has(name);
  }
  getAttribute(name) {
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }
  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }
  removeAttribute(name) {
    this.attributes.delete(name);
  }
  appendChild(child) {
    this.children.push(child);
  }
  addEventListener(event, fn) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(fn);
  }
  dispatchEvent(event) {
    const list = this.listeners.get(event.type) || [];
    for (const fn of list) fn(event);
  }
  querySelectorAll(selector) {
    const results = [];
    const attrMatch = selector.match(/^\[([a-zA-Z0-9_-]+)\]$/);
    if (attrMatch) {
      const attrName = attrMatch[1];
      const traverse = (el) => {
        for (const child of el.children) {
          if (child.hasAttribute(attrName)) results.push(child);
          traverse(child);
        }
      };
      traverse(this);
    }
    return results;
  }
  querySelector(selector) {
    const list = this.querySelectorAll(selector);
    return list.length ? list[0] : null;
  }
}

const docElement = new MockElement('html');
docElement.lang = 'en';
docElement.dir = 'ltr';

globalThis.document = {
  documentElement: docElement,
  title: '',
  createElement(tag) {
    return new MockElement(tag);
  },
  querySelector(selector) {
    if (selector === 'html') return docElement;
    return docElement.querySelector(selector);
  },
  querySelectorAll(selector) {
    return docElement.querySelectorAll(selector);
  },
};

const windowListeners = new Map();
globalThis.window = {
  addEventListener(event, fn) {
    if (!windowListeners.has(event)) windowListeners.set(event, new Set());
    windowListeners.get(event).add(fn);
  },
  removeEventListener(event, fn) {
    if (windowListeners.has(event)) windowListeners.get(event).delete(fn);
  },
  dispatchEvent(event) {
    const list = windowListeners.get(event.type) || [];
    for (const fn of list) fn(event);
  },
};

// 2. Load the standalone scripts
await import('../shared/i18n/languages.js');
await import('../shared/i18n/core.js');

const { VCI18n } = globalThis;

test('VCI18n: 13 languages are defined with Arabic marked as RTL', () => {
  assert.equal(VCI18n.languages.length, 13);
  const ar = VCI18n.languages.find((l) => l.code === 'ar');
  assert.ok(ar);
  assert.equal(ar.rtl, true);
  const cs = VCI18n.languages.find((l) => l.code === 'cs');
  assert.equal(cs?.rtl, undefined);
});

test('VCI18n: migrates legacy runopis.language to vc.language', () => {
  mockStorage.clear();
  mockStorage.setItem(VCI18n.LEGACY_KEY, 'de');

  const pref = VCI18n.getPreference();
  assert.equal(pref, 'de');
  assert.equal(mockStorage.getItem(VCI18n.STORAGE_KEY), 'de');

  mockStorage.removeItem(VCI18n.LEGACY_KEY);
  assert.equal(VCI18n.getPreference(), 'de');
});

test('VCI18n: auto preference resolves navigator.languages = [cs-CZ] to cs', () => {
  mockStorage.clear();
  VCI18n.setPreference('auto');
  mockNavigator.languages = ['cs-CZ', 'en-US'];

  assert.equal(VCI18n.locale(), 'cs');
});

test('VCI18n: unknown browser language falls back to en', () => {
  mockStorage.clear();
  VCI18n.setPreference('auto');
  mockNavigator.languages = ['xx-YY', 'zz'];

  assert.equal(VCI18n.locale(), 'en');
});

test('VCI18n: invalid stored preference returns auto', () => {
  mockStorage.clear();
  mockStorage.setItem(VCI18n.STORAGE_KEY, 'klingon');

  assert.equal(VCI18n.getPreference(), 'auto');
});

test('VCI18n: translation fallback cascade (target -> en -> source)', () => {
  const catalog = {
    'Hello world': {
      en: 'Hello world',
      fr: 'Bonjour le monde',
    },
    'English only': {
      en: 'English only',
    },
  };

  VCI18n.setPreference('fr');
  assert.equal(VCI18n.t(catalog, 'Hello world'), 'Bonjour le monde');
  assert.equal(VCI18n.t(catalog, 'English only'), 'English only');
  assert.equal(VCI18n.t(catalog, 'Not in catalog'), 'Not in catalog');
});

test('VCI18n: placeholder interpolation handles values and keeps missing tokens', () => {
  const catalog = {
    'Welcome {name}! You have {count} items. Missing: {missing}': {
      en: 'Welcome {name}! You have {count} items. Missing: {missing}',
    },
  };

  VCI18n.setPreference('en');
  const result = VCI18n.t(
    catalog,
    'Welcome {name}! You have {count} items. Missing: {missing}',
    { name: 'Viking', count: 42 },
  );
  assert.equal(
    result,
    'Welcome Viking! You have 42 items. Missing: {missing}',
  );
});

test('VCI18n: name() always uses English game names', () => {
  VCI18n.setPreference('cs');
  const localizedCreature = {
    name: 'Boar',
    names: { cs: 'Divočák', de: 'Wildschwein' },
  };
  assert.equal(VCI18n.name(localizedCreature), 'Boar');

  const creatureWithoutNames = { name: 'Wolf' };
  assert.equal(VCI18n.name(creatureWithoutNames), 'Wolf');

  const creatureWithMissingLocale = {
    name: 'Deer',
    names: { de: 'Hirsch' },
  };
  assert.equal(VCI18n.name(creatureWithMissingLocale), 'Deer');
  assert.equal(VCI18n.name(null), '');
});

test('VCI18n: documentElement dir and lang are set correctly (rtl for ar, ltr otherwise)', () => {
  VCI18n.setPreference('ar');
  assert.equal(docElement.dir, 'rtl');
  assert.equal(docElement.lang, 'ar');

  VCI18n.setPreference('en');
  assert.equal(docElement.dir, 'ltr');
  assert.equal(docElement.lang, 'en');

  VCI18n.setPreference('cs');
  assert.equal(docElement.dir, 'ltr');
  assert.equal(docElement.lang, 'cs');
});

test('VCI18n: apply(root) translates data-i18n text and data-i18n-attr attributes', () => {
  globalThis.VC_MESSAGES = {
    'Search items…': {
      cs: 'Hledat předměty…',
      en: 'Search items…',
    },
    'Quick filter': {
      cs: 'Rychlý filtr',
      en: 'Quick filter',
    },
    'Page title': {
      cs: 'Titulek stránky',
      en: 'Page title',
    },
  };

  VCI18n.setPreference('cs');

  const container = new MockElement('div');
  const heading = new MockElement('h1');
  heading.setAttribute('data-i18n', 'Quick filter');
  heading.textContent = 'Quick filter';
  container.appendChild(heading);

  const input = new MockElement('input');
  input.setAttribute(
    'data-i18n-attr',
    'placeholder:Search items…;title:Quick filter',
  );
  container.appendChild(input);

  const titleEl = new MockElement('title');
  titleEl.setAttribute('data-i18n', 'Page title');
  titleEl.textContent = 'Page title';
  container.appendChild(titleEl);

  VCI18n.apply(container);

  assert.equal(heading.textContent, 'Rychlý filtr');
  assert.equal(input.getAttribute('placeholder'), 'Hledat předměty…');
  assert.equal(input.getAttribute('title'), 'Rychlý filtr');
  assert.equal(titleEl.textContent, 'Titulek stránky');
});

test('VCI18n: mountPicker creates select with auto and all 13 languages, reacting to changes', () => {
  VCI18n.setPreference('es');

  const container = new MockElement('div');
  const picker = VCI18n.mountPicker(container);

  assert.ok(picker);
  assert.equal(picker.children.length, 14); // auto + 13
  assert.equal(picker.children[0].value, 'auto');
  assert.equal(picker.children[0].textContent, 'Auto (browser)');
  assert.equal(picker.value, 'es');

  let notified = null;
  const unsubscribe = VCI18n.onChange((loc, pref) => {
    notified = { loc, pref };
  });

  picker.value = 'de';
  picker.dispatchEvent({ type: 'change', target: picker });

  assert.deepEqual(notified, { loc: 'de', pref: 'de' });
  assert.equal(VCI18n.getPreference(), 'de');

  unsubscribe();
});


test('VCI18n: plural categories, interpolation and fallback', () => {
  const catalog = {
    '{count} units': {
      cs: { one: '{count} jednotka', few: '{count} jednotky', many: '{count} jednotky', other: '{count} jednotek' },
      ar: Object.fromEntries(['zero', 'one', 'two', 'few', 'many', 'other'].map(category => [category, category + ': {count}'])),
      ja: { other: '{count}体' },
      en: { one: '{count} unit', other: '{count} units' },
    },
    fallback: { cs: { other: 'ostatní {count}' }, en: { one: 'one {count}', other: 'other {count}' } },
    english: { cs: { few: 'několik' }, en: { one: 'one {count}', other: 'other {count}' } },
  };
  VCI18n.setPreference('cs');
  for (const [count, expected] of [[1, '1 jednotka'], [2, '2 jednotky'], [5, '5 jednotek'], [1.5, '1.5 jednotky']]) {
    assert.equal(VCI18n.tn(catalog, '{count} units', count), expected);
  }
  assert.equal(VCI18n.tn(catalog, 'fallback', 1), 'ostatní 1');
  assert.equal(VCI18n.tn(catalog, 'english', 1), 'one 1');
  assert.equal(VCI18n.tn(catalog, 'english', 5), 'other 5');
  VCI18n.setPreference('ar');
  for (const [count, category] of [[0, 'zero'], [1, 'one'], [2, 'two'], [3, 'few'], [11, 'many'], [100, 'other']]) {
    assert.equal(VCI18n.tn(catalog, '{count} units', count), category + ': ' + count);
  }
  VCI18n.setPreference('ja');
  for (const count of [0, 1, 2, 5]) assert.equal(VCI18n.tn(catalog, '{count} units', count), count + '体');
  VCI18n.setPreference('de');
  assert.equal(VCI18n.tn(catalog, '{count} units', 1), '1 unit');
  assert.equal(VCI18n.tn(catalog, '{count} units', 2, { count: '2,000' }), '2,000 units');
  assert.equal(VCI18n.tn({}, 'Missing {count}', 3), 'Missing 3');
  assert.equal(VCI18n.tn({ legacy: { en: '{count} old' } }, 'legacy', 1), '1 old');
});

function findIdenticalOffenders(messagesByApp, allow) {
  const noText = value => !/\p{L}/u.test(value.replace(/\{[a-z]+\}/g, ''));
  const offenders = [];
  for (const [app, messages] of Object.entries(messagesByApp)) {
    for (const [key, entry] of Object.entries(messages)) {
      for (const lang of Object.keys(entry)) {
        if (lang === 'en') continue;
        const forms = typeof entry[lang] === 'object' ? Object.entries(entry[lang]) : [[null, entry[lang]]];
        for (const [form, value] of forms) {
          const en = form === null ? entry.en : entry.en[form] ?? entry.en.other;
          const allowed = allow.has(`${app}:${lang}:${key}`) || allow.has(`*:${key}`);
          if (value !== en || allowed || noText(value) || /^x\{count\}$/.test(value)) continue;
          offenders.push(`${app}:${lang}:${key}${form ? '#' + form : ''}`);
        }
      }
    }
  }

  return offenders;
}

test('findIdenticalOffenders applies whitelist entries to app-language-key pairs', () => {
  const messagesByApp = { items: { Foo: { en: 'Foo', cs: 'Foo', de: 'Bar' } } };
  assert.deepEqual(findIdenticalOffenders(messagesByApp, new Set(['items:de:Foo'])), ['items:cs:Foo']);
  assert.deepEqual(findIdenticalOffenders(messagesByApp, new Set(['*:Foo'])), []);
});

test('Items and Traders catalogs have no untranslated (English-identical) values outside the whitelist', () => {
  const allow = new Set([
    '*:← Valheim Companion', '*:Items Compendium', '*:Trader Ledger', '*:Wiki', '*:Wiki ↗',
    '*:Meadows', '*:Black Forest', '*:Ocean', '*:Swamp', '*:Mountain', '*:Plains', '*:Mistlands', '*:Ashlands', '*:Deep North',
    'items:fr:Sources', 'items:pt:{count} items', 'items:id:Level {level}',
    'items:de:Material', 'items:es:Material', 'items:pt:Material', 'items:id:Material',
    'items:es:Metal', 'items:pt:Metal', 'items:id:Mead', 'items:id:Stamina: {stamina}',
    'items:cs:Eitr: {eitr}', 'items:de:Eitr: {eitr}', 'items:es:Eitr: {eitr}', 'items:pt:Eitr: {eitr}', 'items:id:Eitr: {eitr}',
    'items:de:Name (A → Z)', 'items:de:Name (Z → A)',
    'items:de:Portal', 'items:es:Portal', 'items:pt:Portal', 'items:id:Portal',
  ]);
  const messagesByApp = {};
  for (const app of ['items', 'traders']) {
    messagesByApp[app] = JSON.parse(readFileSync(new URL(`../apps/${app}/locales/messages.json`, import.meta.url), 'utf8'));
  }

  const offenders = findIdenticalOffenders(messagesByApp, allow);
  assert.deepEqual(offenders, []);
});
