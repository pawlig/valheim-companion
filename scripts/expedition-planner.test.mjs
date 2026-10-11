import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {buildExpeditionData} from './build-expedition-data.mjs';
import '../apps/expedition/assets/planner.js';
import '../apps/bestiary/assets/rank.js';
const load=name=>JSON.parse(readFileSync(new URL('../data/'+name+'.json',import.meta.url)));
const data={events:load('events'),expedition:load('expedition')}, core=globalThis.VCExpedition;
const creatures=load('creatures'), boss=id=>creatures.find(c=>c.id===id);
test('world progression and spoiler filtering',()=>{
  assert.equal(core.nextBoss({},data).id,'eikthyr');
  assert.deepEqual(core.raidStates({},data).now.map(e=>e.id),['army_eikthyr']);
  const one={defeated:{eikthyr:true}};
  assert.ok(core.raidStates(one,data).ended.some(e=>e.id==='army_eikthyr'));
  assert.ok(core.raidStates(one,data).now.some(e=>e.id==='army_theelder'));
  const two={defeated:{eikthyr:true,'the-elder':true}};
  assert.deepEqual(core.raidStates(two,data).now.map(e=>e.id).sort(),['army_bonemass','foresttrolls','hildirboss1']);
  const changes=core.afterDefeating('bonemass',two,data);
  for(const id of ['blobs','ghosts','skeletons']) assert.ok(changes.added.some(e=>e.id===id));
  assert.ok(changes.removed.some(e=>e.id==='army_bonemass'));
  assert.ok(!Object.values(core.raidStates(two,data,['meadows'])).flat().some(e=>e.id==='army_moder'));
  const late={defeated:Object.fromEntries(data.expedition.slice(0,6).map(b=>[b.id,true]))};
  assert.ok(!core.raidStates(late,data).next.some(e=>e.id==='army_jotuns'));
  assert.ok(core.hidden(data.events.find(e=>e.id==='army_jotuns'),data,['meadows','ashlands']));
  assert.equal(core.nextBoss({defeated:Object.fromEntries(data.expedition.map(b=>[b.id,true]))},data),null);
});
test('incoming damage and existing multiplayer HP calculations',()=>{
  assert.deepEqual(core.incomingDamage(boss('bonemass')),[{type:'poison',amount:180},{type:'blunt',amount:80}]);
  assert.equal(VCRank.creatureHp(boss('bonemass'),0,null,{players:1}),5000);
  assert.equal(VCRank.creatureHp(boss('bonemass'),0,null,{players:3}),8000);
  assert.equal(VCRank.creatureHp(boss('bonemass'),0,null,{players:7}),11000);
});
test('packing food servings, resistance meads, portal and summon costs',()=>{
  const ctx={bossPrep:data.expedition.find(b=>b.id==='bonemass'),weapon:'bronze-mace',foods:[{id:'food',duration:1200}],meads:[{id:'mead',duration:600}],items:{portal:{recipe:{materials:[{item:'finewood',amount:20}]}}}};
  const list=minutes=>Object.fromEntries(core.packingList({minutes,portal:true},ctx).map(l=>[l.id,l.quantity]));
  assert.equal(list(30).food,2);assert.equal(list(60).food,3);
  assert.equal(list(30).mead,4);assert.equal(list(60).mead,7);
  assert.equal(list(30)['withered-bone'],10);assert.equal(list(30)['bronze-mace'],1);assert.equal(list(30).portal,1);
});
test('prep round trip and hostile hashes',()=>{
  const state=core.sanitize({auto:false,boss:'bonemass',players:3,minutes:60,portal:true,checked:['food']},data);
  assert.deepEqual(core.decodePrep('#x='+core.encodePrep(state,data),data),state);
  for(const hash of ['#x=???','#x=abc','#x='+btoa('{}'),'#x='+btoa('null'),'#x='+ 'a'.repeat(17000),'#boss=bonemass']) assert.equal(core.decodePrep(hash,data),null);
  assert.equal(core.sanitize({players:Infinity,minutes:-5,checked:['__proto__',null]},data).players,1);
});
test('browser bundle supplements only new materials and preserves the three data groups',()=>{
  const bundle=buildExpeditionData();
  assert.deepEqual(Object.keys(bundle).sort(),['events','expedition','tips']);
  assert.equal(bundle.expedition.bosses.length,8);
  assert.equal(Object.keys(bundle.expedition.items).length,10);
  assert.ok(Object.values(bundle.expedition.items).every(i=>i.addedBy==='expedition'));
  assert.ok(!bundle.expedition.items.wood);
  assert.ok(bundle.expedition.items.portal.recipe.materials.length);
  const galdr = bundle.expedition.stations.find(s => s.id === 'galdr-table');
  assert.equal(galdr.type, 'crafting');
  assert.equal(galdr.maxLevel, 5);
  assert.equal(galdr.levels.at(-1).biome, 'deep-north');
  assert.equal(galdr.addedBy, undefined);
  assert.ok(Object.values(bundle.expedition.items).every(i=>!('expedition' in i)));
  assert.equal(core.nextBoss({},bundle).id,'eikthyr');
});
test('Expedition search keeps dedicated destinations and prerequisite biome metadata',()=>{
  const context={};vm.runInNewContext(readFileSync(new URL('../apps/hub/data/search.js',import.meta.url),'utf8'),context);
  const index=context.VC_EXPEDITION_SEARCH_INDEX;
  assert.equal(index.filter(i=>i.url.startsWith('/expedition/#boss=')).length,8);
  assert.equal(index.filter(i=>i.url==='/expedition/#raids').length,21);
  assert.ok(index.find(i=>i.name==='The ground is shaking.').requiredBiomes.includes('black-forest'));
  assert.deepEqual([...index.find(i=>i.name==='The Jotun have found you.').requiredBiomes],['deep-north']);
  assert.ok(!context.VC_SEARCH_INDEX.some(i=>i.type==='expedition'));
});

test('automatic targets follow saved progress and can replace a manual choice',()=>{
  const fresh=core.sanitize(null,data);
  assert.equal(fresh.auto,true);
  assert.equal(core.targetBoss(fresh,{},data).id,'eikthyr');
  const saved=JSON.parse(JSON.stringify({...fresh,boss:null}));
  const progress={defeated:{eikthyr:true,'the-elder':true}};
  assert.equal(core.targetBoss(core.sanitize(saved,data),progress,data).id,'bonemass');
  const legacy=core.sanitize({boss:'eikthyr'},data);
  assert.equal(core.targetBoss(legacy,progress,data).id,'bonemass');
  const manual=core.sanitize({auto:false,boss:'eikthyr'},data);
  assert.equal(core.targetBoss(manual,progress,data).id,'eikthyr');
  assert.equal(core.targetBoss({...manual,auto:true},progress,data).id,'bonemass');
});
test('mead demand respects effect duration and cooldown, with one unknown reserve',()=>{
  const healing=load('meads').find(m=>m.id==='medium-healing-mead');
  const list=minutes=>core.packingList({minutes},{meads:[healing]})[0].quantity;
  assert.equal(list(30),16);
  assert.equal(list(60),31);
  assert.equal(core.meadQuantity({duration:600,cooldown:120},30),4);
  assert.equal(core.meadQuantity({},30),1);
  assert.equal(core.packingList({minutes:30},{meads:[{id:'unknown'}]})[0].quantity,1);
});


test('saved and shared expedition durations use quarters of an hour', () => {
  for (const [input, expected] of [[1, 15], [22, 15], [23, 30], [59, 60], [300, 240]]) {
    assert.equal(core.sanitize({ minutes: input }, data).minutes, expected);
    assert.equal(core.decodePrep('#x=' + core.encodePrep({ boss: 'eikthyr', minutes: input }, data), data).minutes, expected);
  }
});

test('each boss packing list matches the Provisions loadout at every offered duration', async () => {
  const context = vm.createContext({ TextEncoder, TextDecoder, URLSearchParams, btoa, atob });
  context.window = context;
  for (const file of ['apps/provisions/data/data.js', 'apps/provisions/assets/advisor.js', 'apps/provisions/assets/planner.js']) {
    vm.runInContext(readFileSync(new URL('../' + file, import.meta.url), 'utf8'), context);
  }
  const { VPAdvisor: advisor, VPPlanner: planner, VPR_DATA: provisions } = context;
  for (const boss of data.expedition) {
    const unlockedBiomes = provisions.biomes.filter(biome => biome.order <= boss.order).map(biome => biome.id);
    const ctx = {
      bossPrep: boss,
      foods: advisor.bestCombos(provisions.food, 'boss', { unlockedBiomes, items: planner.definitions(provisions) })[0]?.foods || [],
      meads: advisor.recommendMeads(provisions.meads, 'boss', { id: boss.id, unlockedBiomes }),
    };
    assert.equal(ctx.foods.length, 3, boss.id);
    for (const minutes of [15, 30, 60, 90, 120]) {
      const loadout = core.provisionsLoadout({ minutes }, ctx);
      const imported = planner.decode('#l=' + planner.encode(loadout, provisions), provisions);
      assert.equal(imported.hours, minutes / 60);
      const expected = core.packingList({ minutes }, ctx).filter(line => line.kind === 'food');
      const actual = planner.calculate(imported, provisions).foods;
      assert.deepEqual(JSON.parse(JSON.stringify(actual.map(line => [line.id, line.quantity]))), expected.map(line => [line.id, line.quantity]), boss.id + ': ' + minutes);
    }
  }
});
