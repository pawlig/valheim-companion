import test from 'node:test';
import assert from 'node:assert/strict';
import { parseUpgradeInfo, parseInfoboxNumbers } from './upgrade-info.mjs';

const MULTILINE = `Intro.
== Upgrade information ==
{| class="wikitable"
!Quality
!1
!2
!3
!Total
|-
!Block armor
|96
|102
|108
|
|-
!Durability
|200
|250
|300
|
|-
!Crafting
|20 [[Carapace]]<br>3 [[Scale Hide]]
|10 [[Carapace]]
|20 [[Carapace]]
|43 [[Carapace]]
|}
== Notes ==
`;

const INLINE = `== Upgrade information ==
{| class="wikitable"
!Quality
!1!!2!!3!!Total
|-
!Block armor
|96||102||108||
|-
!Durability
|200||250||300||
|-
!Crafting
|20||10||20||50
|}`;

test('parseUpgradeInfo reads the multi-line table', () => {
  const r = parseUpgradeInfo(MULTILINE);
  assert.deepEqual(r.qualities, [1, 2, 3]);
  assert.deepEqual(r.rows['block armor'], [96, 102, 108]);
  assert.deepEqual(r.rows.durability, [200, 250, 300]);
  assert.equal(r.rows.crafting, undefined);
});

test('parseUpgradeInfo reads the inline table', () => {
  const r = parseUpgradeInfo(INLINE);
  assert.deepEqual(r.qualities, [1, 2, 3]);
  assert.deepEqual(r.rows['block armor'], [96, 102, 108]);
  assert.deepEqual(r.rows.durability, [200, 250, 300]);
});

test('parseUpgradeInfo returns null without the section', () => {
  assert.equal(parseUpgradeInfo('{{infobox weapon\n| title = X\n}}\nText.'), null);
});

test('parseInfoboxNumbers reads numeric fields', () => {
  const r = parseInfoboxNumbers('{{infobox weapon\n| title = X\n| block armor = 96\n| block force = 60\n| movement speed = -5%\n}}');
  assert.equal(r['block armor'], 96);
  assert.equal(r['block force'], 60);
  assert.equal(r['movement speed'], -5);
  assert.equal(r.title, undefined);
});
