// Tests for the wikitext parser, over wikitext samples pasted from
// valheim.weirdgloop.org (2026-10-05, trimmed).

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  cleanText,
  parseAttacks,
  parseHealth,
  parseImage,
  parseInfobox,
  parseLinks,
  parseList,
  parseModifiers,
  slug,
} from './wikitext.mjs';

const GREYDWARF = `{{infobox creature
| title         = Greydwarf
| image 0star   = Greydwarf.png
| image 1star   = Greydwarf 1star.png
| image 2star   = Greydwarf 2star.png
| trophy        = Greydwarf trophy
| id            = Greydwarf
| location      =
[[Black Forest]]
| drops         =
[[Greydwarf eye]]<br/>[[Greydwarf trophy]]<br/>[[Resin]]<br/>[[Stone]]<br/>[[Wood]]
| health 0star  = 40
| damage 0star  = * Attack: 14 Slash
* Throw: 10 Blunt
| health 1star  = 80
| damage 1star  = * Attack: 21 Slash
* Throw: 15 Blunt
| health 2star  = 120
| damage 2star  = * Attack: 28 Slash
* Throw: 20 Blunt
| abilities     = * Attack (2s)
* Throw (8s)
| veryweak      = Fire
| weak          =
| resistant     = Poison
| veryresistant =
| immune        = Spirit
| neutral       =
|stagger=30%|faction=Forest}}`;

const EIKTHYR = `{{infobox creature
| image 0star       = Eikthyr.png
| trophy            = Eikthyr trophy
| id                = Eikthyr
| type              = Boss
| summon            = [[Deer trophy]] x2
| behavior          = Aggressive
| tameable          = No
| location          =
* [[Meadows]]
| health 0star      = 500
| damage 0star      =
* Antler: 20 Pierce, 1000 Chop, 1000 Pickaxe
* Charge: 15 Lightning
* Stomp: 15 Lightning
| abilities         =
* Antler (5s)
* Charge (25s)
* Stomp (40s)
| immune            = Stagger
| neutral           = Spirit
|faction=Boss}}`;

const KRIGEN = `{{Infobox creature
| title=Krigen
| image 0star = Krigen.png
| id= JotunWarrior (sword and greataxe)<br>JotunWarriorDualWield (dual-axe)
| faction       = Deep North
| location      = [[Mörkhalla]], [[Jotun Invasions]]
| health 0star  = 1300
| damage 0star  =
* Axe
** Cleave: 150 Slash, 60 Chop
** Slash: 170 Slash, 40 Chop
* Greataxe
** Charge: 160 Blunt, 80 Chop, 80 Pickaxe
| health 1star  = 2600`;

const KALL = `{{infobox creature
| title         =Kall Fimbulbringer
| image 0star   =
{{InfoboxGallery|Kall Fimbulbringer.png|Phase 1
Kall Fimbulbringer phase 2.png|Phase 2
Kall Fimbulbringer phase 3.png|Phase 3}}
| type          = Boss
| location      = [[Deep North]]
| summon        = [[Malicious Blood]] x3
| id            =FrozenKing<br>FrozenKing_p2<br>FrozenKing_p3
| health 0star  = 10000 +&nbsp;7000 +&nbsp;30000
| damage 0star  =
'''Phase 1'''
* Chain Slam (left and right, single and double): 160 Blunt, 300 Chop, 300 Pickaxe
'''Phase 2'''
* No attacks
'''Phase 3'''
* Spike Rain: 100 Blunt, 100 Frost (x22), 100 Chop, 100 Pickaxe`;

test('parseInfobox: Greydwarf fields incl. one-line fields and nested values', () => {
  const info = parseInfobox(GREYDWARF, 'creature');
  assert.ok(info, 'infobox found');
  assert.equal(info['title'], 'Greydwarf');
  assert.equal(info['image 0star'], 'Greydwarf.png');
  assert.equal(info['image 2star'], 'Greydwarf 2star.png');
  assert.equal(info['health 0star'], '40');
  assert.equal(info['location'], '[[Black Forest]]');
  assert.equal(info['drops'].startsWith('[[Greydwarf eye]]<br/>[[Greydwarf trophy]]'), true);
  assert.equal(info['stagger'], '30%', 'one-line field');
  assert.equal(info['faction'], 'Forest', 'one-line field at template end');
});

test('parseInfobox: template case-insensitivity and missing infobox', () => {
  const krigen = parseInfobox(KRIGEN, 'creature');
  assert.equal(krigen['title'], 'Krigen', '{{Infobox creature}} capital variant');
  assert.equal(parseInfobox('no templates here', 'creature'), null);
});

test('parseInfobox: Kall keeps nested InfoboxGallery value intact', () => {
  const kall = parseInfobox(KALL, 'creature');
  assert.match(kall['image 0star'], /^\{\{InfoboxGallery\|Kall Fimbulbringer\.png\|Phase 1/);
  assert.equal(kall['health 0star'], '10000 +&nbsp;7000 +&nbsp;30000');
  assert.equal(kall['id'], 'FrozenKing<br>FrozenKing_p2<br>FrozenKing_p3');
});

test('cleanText', () => {
  assert.equal(cleanText("[[A|B]] and [[C]] and [[a#x|d]]"), 'B and C and d');
  assert.equal(cleanText("'''Bold''' and ''italic''"), 'Bold and italic');
  assert.equal(cleanText('a<br>b<br/>c<br />d'), 'a\nb\nc\nd');
  assert.equal(cleanText('x <small>tiny</small> y'), 'x tiny y');
  assert.equal(cleanText('a&nbsp;b'), 'a b');
  assert.equal(cleanText('{{Item link|Resin}} and {{tl|stuff}}'), 'Resin and');
  assert.equal(cleanText('  spaced   out  '), 'spaced out');
});

test('parseLinks', () => {
  assert.deepEqual(parseLinks(EIKTHYR.split('location')[1]), ['Meadows'], 'bullet link');
  assert.deepEqual(parseLinks(KRIGEN.split('location')[1]), ['Mörkhalla', 'Jotun Invasions']);
  assert.deepEqual(parseLinks('plain text, no links'), []);
});

test('parseList: bullets and <br>-separated values', () => {
  const greydwarf = parseInfobox(GREYDWARF, 'creature');
  assert.deepEqual(parseList(greydwarf['drops']), [
    'Greydwarf eye',
    'Greydwarf trophy',
    'Resin',
    'Stone',
    'Wood',
  ]);
  assert.deepEqual(parseList(greydwarf['abilities']), ['Attack (2s)', 'Throw (8s)']);
  assert.deepEqual(parseList(greydwarf['location']), ['Black Forest'], 'single plain value');
  assert.deepEqual(parseList(''), []);
});

test('parseAttacks: flat list with two damage types (Greydwarf)', () => {
  const attacks = parseAttacks('* Attack: 14 Slash\n* Throw: 10 Blunt');
  assert.equal(attacks.length, 2);
  assert.deepEqual(attacks[0], { name: 'Attack', damage: { slash: 14 }, raw: 'Attack: 14 Slash' });
  assert.deepEqual(attacks[1], { name: 'Throw', damage: { blunt: 10 }, raw: 'Throw: 10 Blunt' });
});

test('parseAttacks: multiple damage types on one line (Eikthyr Antler)', () => {
  const eikthyr = parseInfobox(EIKTHYR, 'creature');
  const attacks = parseAttacks(eikthyr['damage 0star']);
  assert.equal(attacks.length, 3);
  assert.deepEqual(attacks[0], {
    name: 'Antler',
    damage: { pierce: 20, chop: 1000, pickaxe: 1000 },
    raw: 'Antler: 20 Pierce, 1000 Chop, 1000 Pickaxe',
  });
  assert.deepEqual(attacks[1].damage, { lightning: 15 });
});

test('parseAttacks: nested bullets compose names, bare group headers skipped (Krigen)', () => {
  const krigen = parseInfobox(KRIGEN, 'creature');
  const attacks = parseAttacks(krigen['damage 0star']);
  assert.deepEqual(
    attacks.map((a) => a.name),
    ['Axe – Cleave', 'Axe – Slash', 'Greataxe – Charge'],
  );
  assert.deepEqual(attacks[0].damage, { slash: 150, chop: 60 });
  assert.equal(attacks[0].raw, 'Cleave: 150 Slash, 60 Chop');
  assert.deepEqual(attacks[2].damage, { blunt: 160, chop: 80, pickaxe: 80 });
});

test('parseAttacks: phase headings and (x22) multipliers (Kall Fimbulbringer)', () => {
  const kall = parseInfobox(KALL, 'creature');
  const attacks = parseAttacks(kall['damage 0star']);
  assert.deepEqual(
    attacks.map((a) => a.name),
    [
      'Phase 1 – Chain Slam (left and right, single and double)',
      'Phase 2 – No attacks',
      'Phase 3 – Spike Rain',
    ],
  );
  assert.deepEqual(attacks[0].damage, { blunt: 160, chop: 300, pickaxe: 300 });
  assert.deepEqual(attacks[1].damage, {}, 'unparsable leaf keeps empty damage');
  assert.equal(attacks[1].raw, 'No attacks');
  assert.deepEqual(attacks[2].damage, { blunt: 100, frost: 100, chop: 100, pickaxe: 100 }, '(x22) ignored');
});

test('parseInfobox: underscore template names ({{Infobox_creature}})', () => {
  const wikitext = '{{Infobox_creature\n| title = Bat\n| health 0star = 30\n| veryweak = Fire\n}}';
  const info = parseInfobox(wikitext, 'creature');
  assert.equal(info['title'], 'Bat');
  assert.equal(info['health 0star'], '30');
});

test('parseAttacks: type-first damage, "+" separator, markup in names', () => {
  const attacks = parseAttacks(
    '* Spit: Fire 80, Poison 18\n* Fireball: 130 Fire + 100 Fire\n* Attach: 50 Pierce every 0.5s\n* 0',
  );
  assert.deepEqual(attacks[0].damage, { fire: 80, poison: 18 });
  assert.deepEqual(attacks[1].damage, { fire: 130 }, 'keeps the larger of "+"-joined hits');
  assert.deepEqual(attacks[2].damage, { pierce: 50 }, 'trailing words tolerated');
  assert.equal(attacks.length, 3, 'bare number "0" is not an attack');
  const nowiki = parseAttacks('* <nowiki>Fire</nowiki> mage – Fireball: 130 Fire')[0];
  assert.equal(nowiki.name, 'Fire mage – Fireball', 'HTML tags stripped from names');
});

test('parseHealth', () => {
  assert.equal(parseHealth('40'), 40);
  assert.equal(parseHealth(' 10000 +&nbsp;7000 +&nbsp;30000 '), 47000, 'phases summed');
  assert.equal(parseHealth('Unknown'), null);
  assert.equal(parseHealth(''), null);
  assert.equal(parseHealth(null), null);
});

test('parseModifiers: Greydwarf damage types map to tiers', () => {
  const greydwarf = parseInfobox(GREYDWARF, 'creature');
  const { modifiers, otherImmunities, unknown } = parseModifiers(greydwarf);
  assert.deepEqual(modifiers, { fire: 'veryweak', poison: 'resistant', spirit: 'immune' });
  assert.deepEqual(otherImmunities, []);
  assert.deepEqual(unknown, []);
});

test('parseModifiers: non-damage values go to otherImmunities (Eikthyr)', () => {
  const eikthyr = parseInfobox(EIKTHYR, 'creature');
  const { modifiers, otherImmunities } = parseModifiers(eikthyr);
  assert.deepEqual(modifiers, { spirit: 'neutral' });
  assert.deepEqual(otherImmunities, ['Stagger']);
});

test('parseModifiers: spaced/underscored field names, unknown fields reported', () => {
  const infobox = {
    'very weak': 'Fire, Frost',
    slightly_resistant: 'Blunt',
    weirdlyweak: 'Poison',
    immune: 'Knockback',
    unrelated: 'ignored',
  };
  const { modifiers, otherImmunities, unknown } = parseModifiers(infobox);
  assert.deepEqual(modifiers, { fire: 'veryweak', frost: 'veryweak', blunt: 'slightlyresistant' });
  assert.deepEqual(otherImmunities, ['Knockback']);
  assert.deepEqual(unknown, [{ field: 'weirdlyweak', value: 'Poison' }]);
});

test('parseImage', () => {
  assert.equal(parseImage('Greydwarf.png'), 'Greydwarf.png');
  assert.equal(
    parseImage('{{InfoboxGallery|Kall Fimbulbringer.png|Phase 1\nKall Fimbulbringer phase 2.png|Phase 2}}'),
    'Kall Fimbulbringer.png',
    'first gallery image',
  );
  assert.equal(parseImage('[[File:Abomination.png|thumb|Abomination]]'), 'Abomination.png');
  assert.equal(parseImage('  '), null);
  assert.equal(parseImage(undefined), null);
});

test('slug per DATA-SCHEMA', () => {
  assert.equal(slug('Greydwarf (Deep North)'), 'greydwarf-deep-north');
  assert.equal(slug('Zil & Thungr'), 'zil-thungr');
  assert.equal(slug('Nidhögg'), 'nidhogg');
  assert.equal(slug('Bonemaw Serpent'), 'bonemaw-serpent');
});

test('clean output has no wiki markup (end-to-end over samples)', () => {
  const eikthyr = parseInfobox(EIKTHYR, 'creature');
  for (const value of Object.values(eikthyr)) {
    assert.equal(cleanText(value).includes('[['), false);
    assert.equal(cleanText(value).includes('{{'), false);
    assert.equal(cleanText(value).includes("'''"), false);
    assert.equal(cleanText(value).includes('&nbsp;'), false);
  }
  const attacks = parseAttacks(parseInfobox(KALL, 'creature')['damage 0star']);
  for (const attack of attacks) {
    assert.ok(!/[[{']{2}/.test(attack.raw), `raw not clean: ${attack.raw}`);
  }
});
