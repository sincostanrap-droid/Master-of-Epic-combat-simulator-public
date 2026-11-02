const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {context,json}=require('../tools/benchmark-optimizer.cjs');
const pet=require('../src/domain/petBuffCatalog');
const c=context(undefined,{data:false}),w=context(undefined,{worker:true,data:false});c.structuredClone=w.structuredClone=structuredClone;
const base=json(vm.runInContext('DEFAULT_STATE()',c));for(const k of ['equipment','composite','pct','flat','conv','dmg','special','post','other'])base[k]=[];
const inputs={raceSelect:'newtar',attackType:'attack',str:100,spirit:100,weaponDamage:100,weaponSkill:100,targetAC:100};
const settings={objective:'attack',maxSlots:4,topN:1,exactEquipmentLimit:1,localPasses:2,buffBeamWidth:8,includeDisabledBuffs:true,evaluateCurrentEquipment:false,includeCurrentConfig:false};
const magia=pet.build('magia-bit',150),snapshot=JSON.stringify(magia);
assert.ok(magia.every(r=>!r.enabled&&!r.fixed&&!r.excluded&&r.slot));
const run=(engine,rows,options={})=>engine.runOptimizerCore({state:{...base,composite:rows},inputs,settings:{...settings,...options}}).results;
for(const buffMode of ['fast','local','beam']){
 for(const engine of [c,w]){
  const full=run(engine,magia,{buffMode})[0];assert.deepEqual(json(full.compositeIdxs),[0,1,2,3],buffMode+' adopts whole pet');assert.equal(full.metrics.slots.total,4);
  for(const maxSlots of [0,3]){
   const results=run(engine,magia,{buffMode,maxSlots});assert.ok(results.every(r=>r.compositeIdxs.length===0&&r.metrics.slots.total===0));
  }
  const rows=[...magia,{name:'単独Buff',enabled:false,fixed:false,slot:true,flatAttack:50}];
  assert.deepEqual(json(run(engine,rows,{buffMode})[0].compositeIdxs),[4],'replace pet with stronger one-slot candidate');
  assert.deepEqual(json(run(engine,rows,{buffMode,maxSlots:5})[0].compositeIdxs),[0,1,2,3,4]);
  assert.ok(run(engine,magia,{buffMode,includeDisabledBuffs:false}).every(r=>!r.compositeIdxs.length));
  for(const block of [{excluded:true},{fixed:true,enabled:false}]){
   const mixed=magia.map((r,i)=>i===2?{...r,...block}:r);
   assert.ok(run(engine,mixed,{buffMode}).every(r=>!r.compositeIdxs.length),'one blocked member blocks package');
  }
  const forced=pet.setControls(pet.setControls(rows,'magia-bit','enabled',true),'magia-bit','fixed',true);
  assert.deepEqual(json(run(engine,forced,{buffMode})[0].compositeIdxs),[0,1,2,3],'explicit fixed ON still works');
 }
}
assert.equal(JSON.stringify(magia),snapshot,'search preserves registrations');
// Candidate index closure also applies when the UI evaluates/restores a saved result.
const config={_equipmentRows:[],_compositeRows:magia};
const expanded=c.optimizerStateForSelection([], [2],config);
assert.ok(expanded.composite.every(r=>r.enabled));assert.equal(c.computeMetrics(expanded,inputs).slots.total,4);
// Contribution views must remove a whole package too, not evaluate it as zero
// contribution because its remaining members re-enable the removed row.
const mainText=fs.readFileSync('src/main.js','utf8');
vm.runInContext(mainText.slice(mainText.indexOf('  function buffContributionSettingsFromLastPayload()'),mainText.indexOf('  function buffContributionValueText(')),c);
c.petPayload={state:{...base,composite:magia},inputs,settings};
c.petResults=run(c,magia,{buffMode:'local'});
vm.runInContext('optimizerLastPayload=petPayload; integratedOptimizerResults=petResults;',c);
const contribution=c.analyzeTopOptimizerBuffContribution();
assert.equal(contribution.contributions.length,1);assert.match(contribution.contributions[0].name,/全4 Buff/);
assert.ok(contribution.contributions[0].loss>0);
assert.equal(contribution.contributions[0].removedRaw,c.computeMetrics(base,inputs).atk);
const retained={name:'既存データ',enabled:true,note:'保持'};
let rows=pet.replace([retained],'idol-finyu',150);assert.equal(rows.length,4);
rows=pet.setControls(rows,'idol-finyu','enabled',true);rows=pet.setControls(rows,'idol-finyu','fixed',true);
rows=pet.replace(rows,'idol-finyu-area',150);assert.equal(rows.length,4,'mode update removes previous mode');
assert.ok(rows.slice(1).every(r=>r.enabled&&r.fixed&&r.catalogInputs.petId==='idol-finyu-area'));assert.deepEqual(rows[0],retained);
rows=pet.setControls(rows,'idol-finyu-area','excluded',true);assert.ok(rows.slice(1).every(r=>r.excluded&&!r.enabled));
rows=pet.setControls(rows,'idol-finyu-area','enabled',true);assert.ok(rows.slice(1).every(r=>r.enabled&&!r.excluded));
for(const file of ['src/storage/importExport.js','src/storage/shareUrl.js'])vm.runInContext(fs.readFileSync(file,'utf8'),c);
const saved={...base,composite:[...magia,...pet.build('idol-finyu-area',150)]};c.collectConfig=()=>({state:saved,inputs});
for(const restored of [c.parseConfigFromTsv(c.serializeConfigAsTsv({state:saved,inputs})).state,c.collectShowcaseShareConfig().state,JSON.parse(JSON.stringify(saved))]){
 restored.composite=json(c.normalizeCompositeRows(restored.composite));
 for(let i=0;i<saved.composite.length;i++){
  for(const k of ['enabled','fixed','excluded','catalogInputs','catalogNumeric'])assert.deepEqual(json(restored.composite[i][k]),json(saved.composite[i][k]));
 }
 const chosen=run(w,json(restored.composite),{maxSlots:3,buffMode:'local'})[0];
 assert.deepEqual(json(chosen.compositeIdxs),[4,5,6],'three-slot idol remains linked after restoration');
 assert.equal(chosen.metrics.slots.total,3);
}
console.log('Pet packages: default OFF/unfixed; greedy/local/beam x main/Worker; slot boundaries, swap/prune, exclude/fixed-OFF, explicit fixed-ON, modes and TSV/share/JSON passed');
