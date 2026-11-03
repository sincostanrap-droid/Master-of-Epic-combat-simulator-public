const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {context,json}=require('../tools/benchmark-optimizer.cjs');
const pet=require('../src/domain/petBuffCatalog'),party=require('../src/domain/petParty');
const c=context(undefined,{data:false}),w=context(undefined,{worker:true,data:false});c.structuredClone=w.structuredClone=structuredClone;
const base=json(vm.runInContext('DEFAULT_STATE()',c));for(const k of ['equipment','composite','pct','flat','conv','dmg','special','post','other'])base[k]=[];
const inputs={raceSelect:'newtar',attackType:'attack',str:100,spirit:100,weaponDamage:100,weaponSkill:100,targetAC:100};
const settings={objective:'attack',maxSlots:24,topN:1,exactEquipmentLimit:1,localPasses:2,buffBeamWidth:8,includeDisabledBuffs:true,evaluateCurrentEquipment:false,includeCurrentConfig:false};
const ids=['magia-bit','laharl-sd','la-pucelle-avatar','tuxedo-dog'];
const rows=ids.flatMap(id=>pet.build(id,150)),snapshot=JSON.stringify(rows);
assert.equal(party.usage({...base,composite:rows.map(r=>({...r,enabled:true}))}).own,4);
assert.equal(party.usage({...base,composite:pet.build('magia-bit',150).map(r=>({...r,enabled:true}))}).own,1);
assert.throws(()=>party.withSource(rows,'magia-bit','external'),/範囲Buff/);
assert.equal(party.source({catalogSource:'pet-owner-buff-v1',catalogInputs:{petId:'magia-bit',petSource:'external'}}),'own');
const run=(engine,composite,otherPets,options={})=>engine.runOptimizerCore({state:{...base,petParty:{otherPets},composite},inputs,settings:{...settings,...options}}).results;
const results=[];
for(const engine of [c,w])for(const buffMode of ['fast','local','beam']){
 for(const otherPets of [0,2,3]){
  const found=run(engine,rows,otherPets,{buffMode});assert.ok(found.length,'must find valid alternative');
  for(const r of found){assert.equal(r.metrics.petParty.excess,0);assert.ok(r.metrics.petParty.total<=3);}
  assert.equal(found[0].metrics.petParty.own,3-otherPets);
  if(otherPets===3)assert.equal(found[0].compositeIdxs.length,0);
  results.push({buffMode,otherPets,own:found[0].metrics.petParty.own,atk:found[0].metrics.atk});
 }
 const external=party.withSource(rows,'tuxedo-dog','external');
 const chosen=run(engine,external,3,{buffMode})[0];assert.equal(chosen.metrics.petParty.own,0);assert.equal(chosen.metrics.petParty.external,1);assert.equal(chosen.metrics.slots.total,1);
 assert.ok(chosen.metrics.atk>run(engine,[],3,{buffMode})[0].metrics.atk);
 assert.equal(run(engine,external,3,{buffMode,maxSlots:0})[0].metrics.petParty.external,0,'external still uses Buff slots');
 const forced=rows.map(r=>({...r,enabled:true,fixed:true}));assert.equal(run(engine,forced,0,{buffMode}).length,0,'four fixed pets cannot be a valid result');
 const current=run(engine,forced,0,{buffMode,includeCurrentConfig:true});
 assert.ok(current.every(r=>r.baselineInvalid&&r.baselineReasons.some(s=>s.includes('ペット'))),'over-limit current config is only a warning baseline');
}
assert.equal(JSON.stringify(rows),snapshot);
// Disabled, excluded, fixed-off and competing packages must not evade the count.
const on=rows.map(r=>({...r,enabled:true}));assert.equal(party.usage({composite:on}).total,4);
assert.equal(party.usage({composite:pet.setControls(on,'magia-bit','excluded',true)}).total,3);
const competing=[...pet.build('tuxedo-dog',150),...pet.build('summer-fish',150)].map(r=>({...r,enabled:true}));
assert.equal(c.computeMetrics({...base,composite:competing},inputs).petParty.own,2);
let saved={...base,petParty:{otherPets:2},composite:party.withSource(on,'tuxedo-dog','external')};
const legacyRow={name:'手入力保持',enabled:false,fixed:true,note:'変更しない',flatAttack:12.345};saved.composite.push(legacyRow);
for(const f of ['src/storage/importExport.js','src/storage/shareUrl.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c);
c.collectConfig=()=>({state:saved,inputs});
const tsv=c.serializeConfigAsTsv({state:saved,inputs});
for(const restored of [c.parseConfigFromTsv(tsv).state,c.collectShowcaseShareConfig().state,c.compactPresetConfig({state:saved,inputs}).state,JSON.parse(JSON.stringify(saved))]){
 assert.deepEqual(json(restored.petParty),saved.petParty);
 const normalized=json(c.normalizeCompositeRows(restored.composite));
 assert.deepEqual(normalized.at(-1).note,legacyRow.note);
 for(let i=0;i<on.length;i++)assert.deepEqual(normalized[i].catalogInputs,saved.composite[i].catalogInputs);
 const m=c.computeMetrics({...restored,composite:normalized},inputs),ref=c.computeMetrics(saved,inputs);
 assert.deepEqual(json(m.petParty),json(ref.petParty));assert.equal(m.atk,ref.atk);assert.equal(m.finalDamage,ref.finalDamage);
}
const oldTsv=tsv.replace(/\[petParty\][\s\S]*?(?=\n\[)/,'');
assert.deepEqual(json(c.parseConfigFromTsv(oldTsv).state.petParty),{otherPets:0});
assert.equal(party.usage({composite:on.map(r=>({...r,catalogInputs:{...r.catalogInputs,petSource:undefined}}))}).own,4,'old registrations remain intact and default own');
const updated=pet.replace(saved.composite,'tuxedo-dog',110);assert.equal(party.source(updated.find(r=>r.catalogInputs?.petId==='tuxedo-dog')),'external');
assert.equal(party.source(pet.replace(updated,'tuxedo-dog',110,'own').find(r=>r.catalogInputs?.petId==='tuxedo-dog')),'own');
console.log(JSON.stringify({checks:'main/Worker x greedy/local/beam; own 0..3; external slots; fixed invalid; baseline; TSV/share/preset/JSON; old data preserved',samples:results.slice(0,3)}));
