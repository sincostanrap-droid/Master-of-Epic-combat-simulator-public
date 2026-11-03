const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {context,json}=require('../tools/benchmark-optimizer.cjs');
const pet=require('../src/domain/petBuffCatalog');
const c=context(undefined,{data:false}),worker=context(undefined,{worker:true,data:false});
c.structuredClone=worker.structuredClone=structuredClone;
const base=json(vm.runInContext('DEFAULT_STATE()',c));
for(const k of ['equipment','composite','pct','flat','conv','dmg','special','post','other'])base[k]=[];
base.skillSim={...base.skillSim,skills:{...base.skillSim?.skills,'攻撃回避':100}};
const inputs={raceSelect:'newtar',attackType:'attack',str:100,spirit:100,weaponDamage:100,weaponSkill:100,targetAC:100};
const ids=['tuxedo-dog','harmonica-panda','laharl-sd','etna-sd','flonne-sd'];
const rows=ids.flatMap(id=>pet.build(id,150));
assert.equal(rows.length,5);assert.equal(new Set(pet.catalogs.map(p=>p.id)).size,pet.catalogs.length);
assert.ok(rows.every(r=>!r.enabled&&!r.fixed&&!r.excluded&&r.slot));
assert.throws(()=>pet.build('tuxedo-dog',109.9));assert.throws(()=>pet.build('harmonica-panda',80));
for(const level of [110,150]){
 const dog=pet.build('tuxedo-dog',level)[0];
 for(const key of ['attackPct','magicPct','extraACPct','extraHitPct','extraAvoidPct'])assert.equal(dog[key],19,key);
 assert.equal(dog.durationSeconds,90);assert.equal(dog.catalogNumeric.pending.length,0);
}
assert.equal(pet.build('harmonica-panda',80.1)[0].flatSpeed,20);
assert.equal(pet.build('harmonica-panda',150)[0].durationSeconds,10);
assert.equal(pet.build('laharl-sd','')[0].attackPct,10);
assert.equal(pet.build('laharl-sd','')[0].durationSeconds,180);
for(const id of ['etna-sd','flonne-sd']){
 const r=pet.build(id,'')[0];assert.equal(r.catalogNumeric.applied.length,0);
 assert.ok(r.catalogNumeric.values.every(v=>v.scope==='表示のみ'));
 assert.equal(r.extraDamageReducePct,undefined,'conditional physical reduction must not become generic reduction');
 assert.equal(r.dmgPct,undefined);assert.equal(r.durationSeconds,180);
}
// Existing saved rows have no festival tag: the runtime must resolve them too,
// without modifying historical registration values or manual unlinked rows.
const summer={...pet.build('yukata-finyu',150)[0],enabled:true,tags:''};
const dog={...pet.build('tuxedo-dog',150)[0],enabled:true};
const snapshot=JSON.stringify([summer,dog]);
for(const engine of [c,worker]){
 for(const list of [[summer,dog],[dog,summer]]){
  const resolved=engine.resolveAllBuffRowsForGroups({...base,composite:list}).state.composite;
  assert.equal(resolved.filter(r=>r.enabled).length,1);
  assert.equal(resolved.find(r=>r.enabled).clientBuffDefinitionId,'13726');
  const combined=engine.computeMetrics({...base,composite:list},inputs),single=engine.computeMetrics({...base,composite:[dog]},inputs);
  for(const key of ['atk','finalDamage'])assert.equal(combined[key],single[key],key);
  assert.deepEqual(json(combined.totalStats),json(single.totalStats));
  assert.equal(combined.slots.total,1);
 }
 const before=engine.computeMetrics(base,inputs);
 const dogResult=engine.computeMetrics({...base,composite:[dog]},inputs);
 assert.ok(dogResult.atk>before.atk);assert.equal(dogResult.totalStats.avoid,119);assert.equal(before.totalStats.avoid,100);
 const laharl=engine.computeMetrics({...base,composite:[{...rows[2],enabled:true}]},inputs);
 assert.ok(laharl.atk>before.atk);
 const panda=engine.computeMetrics({...base,composite:[{...rows[1],enabled:true}]},inputs);
 assert.equal(panda.totalStats.speed-before.totalStats.speed,20);
 const settings={objective:'attack',maxSlots:1,topN:1,exactEquipmentLimit:1,buffMode:'local',localPasses:2,includeDisabledBuffs:true,evaluateCurrentEquipment:false,includeCurrentConfig:false};
 const result=engine.runOptimizerCore({state:{...base,composite:[{...summer,enabled:false},{...dog,enabled:false}]},inputs,settings}).results;
 assert.ok(result.length);assert.ok(result.every(r=>r.metrics.slots.total<=1));
}
assert.equal(JSON.stringify([summer,dog]),snapshot);
const untouched={name:'手入力',enabled:true,extraAvoidPct:190,note:'自動補正禁止'};
let registered=pet.replace([untouched],'tuxedo-dog',110);
registered=pet.setControls(registered,'tuxedo-dog','excluded',true);
registered=pet.replace(registered,'tuxedo-dog',150);
assert.deepEqual(registered[0],untouched);assert.equal(registered.length,2);
assert.equal(registered[1].excluded,true);assert.equal(registered[1].extraAvoidPct,19);
for(const f of ['src/storage/importExport.js','src/storage/shareUrl.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c);
const state={...base,composite:[untouched,...rows.map(r=>({...r,enabled:true}))]};
c.collectConfig=()=>({state,inputs});
const reference=c.computeMetrics(state,inputs);
for(const restored of [c.parseConfigFromTsv(c.serializeConfigAsTsv({state,inputs})).state,c.collectShowcaseShareConfig().state,JSON.parse(JSON.stringify(state))]){
 const normalized=json(c.normalizeCompositeRows(restored.composite));
 for(let i=1;i<state.composite.length;i++)for(const key of ['catalogInputs','catalogNumeric','clientBuffDefinitionId','durationSeconds','tags','fixed','excluded'])assert.deepEqual(normalized[i][key],state.composite[i][key],key);
 const actual=c.computeMetrics(restored,inputs);for(const key of ['atk','finalDamage'])assert.equal(actual[key],reference[key]);
 assert.deepEqual(json(actual.totalStats),json(reference.totalStats));
 assert.equal(actual.slots.total,reference.slots.total);
}
console.log(JSON.stringify({catalogModes:pet.catalogs.length,added:ids,applied:['tuxedo-dog','harmonica-panda','laharl-sd'],displayOnly:['etna-sd','flonne-sd'],verified:['level-boundaries','percent-units','fixed-time','competition-both-orders','main-worker','bounded-optimizer','TSV-share-JSON','preserve-existing']}));
