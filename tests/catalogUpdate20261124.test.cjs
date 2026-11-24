const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const {context,json}=require('../tools/benchmark-optimizer.cjs');
const path='src/data/generated/catalogUpdate20261124.generated.js';
const parity=[];
for(const worker of [false,true]){
 const p=context(undefined,{worker,catalog:!worker});
 if(worker)for(const name of ['equipmentCatalog','buffCatalog'])vm.runInContext(fs.readFileSync('src/data/generated/'+name+'.generated.js','utf8'),p);
 for(let i=0;i<2;i++)vm.runInContext(fs.readFileSync(path,'utf8'),p);
 const catalog=p.equipmentCatalogItems(),data=p.MOE_CATALOG_UPDATE_20261124;
 assert.equal(p.MOE_EQUIPMENT_CATALOG_META.gameUpdateDate,'2026-11-24');
 assert.equal(catalog.some(e=>e.officialId===23552),false);
 const input={raceSelect:'newtar',str:100,spirit:100,weaponDamage:100,weaponSkill:100,targetAC:100,targetEvasion:100,atkCap:500};
 const all=[];
 for(const [id,stats,skills] of [
  [23544,{extraAvoid:3,speed:3,extraST:5},{}],[23553,{attack:2,extraAvoid:3,speed:3},{}],
  [23554,{magic:5,extraMP:5,extraMagicDelay:-2,extraNeutralRes:10},{'神秘魔法':10,'回復魔法':10}],
  [23555,{attack:5,extraAC:5,extraAttackDelay:-2},{}],[23556,{attack:4,extraHit:5},{}]]){
  const hits=catalog.filter(e=>e.officialId===id);assert.equal(hits.length,1);
  assert.deepEqual(json(hits[0].extraStats),stats);
  const gear=p.catalogEquipmentToRow(hits[0]),state=json(vm.runInContext('DEFAULT_STATE()',p));
  state.equipment=[{...gear,enabled:true}];state.composite=[];const saved=JSON.stringify(state);
  const metrics=p.computeMetrics(state,input),war=p.computeMetrics(state,{...input,equipmentBuffWorld:1});
  const off=p.computeMetrics({...state,equipment:[{...state.equipment[0],equipBuffEnabled:false}]},input);
  assert.deepEqual(json(metrics.skillPlusTotals),skills);assert.deepEqual(json(war.totalStats),json(off.totalStats));
  assert.equal(JSON.stringify(state),saved);all.push(json(metrics));
  if(id===23544)assert.ok(metrics.totalStats.speed>off.totalStats.speed);
  if(id===23556||id===23555)assert.ok(metrics.atk>off.atk);
 }
 assert.equal(data.rules['technic-14728'].stats.extraAttackDelay,-10);
 parity.push(all);
}
assert.deepEqual(parity[0],parity[1]);
const index=require('../src/data/generated/combatCatalogIndex.generated.js'),entry=index.entries.find(e=>e.id===14727);
const bundle=JSON.parse(fs.readFileSync('src/data/generated/combatNumericPages/'+String(entry.page).padStart(3,'0')+'.json')).rows.find(b=>b.row.key===entry.key);
assert.deepEqual([bundle.row.metadata.costST,bundle.row.metadata.activation,bundle.row.metadata.delay],[15,160,1360]);
assert.deepEqual(bundle.row.requirements,[{skill:'着こなし',min:30}]);assert.match(bundle.row.info,/棘の守り/);
assert.ok(require('../src/data/generated/combatCatalogFilters.generated.js').rows[entry.key].types.includes('defense'));
console.log('5 equipment rows, WarAge, stored build, page/worker parity and Thorn Guard passed');
