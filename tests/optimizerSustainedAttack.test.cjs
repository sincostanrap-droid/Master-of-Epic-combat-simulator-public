const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {context,json}=require('../tools/benchmark-optimizer.cjs');
const results=[];
for(const worker of [false,true]){
  const c=context(undefined,{worker,data:false}),st=json(vm.runInContext('DEFAULT_STATE()',c));
  st.attackDps={motionProfile:'form477',weaponCategory:'12',criticalCancel:false,sustainMinutes:1};
  st.equipment=c.normalizeEquipmentRows([{slot:'武器: 左手',name:'bow',enabled:true,optimizerFixed:true,weaponDamage:61,weaponAttackInterval:155,weaponTwoHanded:'○',weaponReq:[{name:'弓',required:66}]}]);
  st.composite=c.normalizeCompositeRows([
    {name:'short',enabled:false,flatAttack:100,durationSeconds:1,sustainDowntimeSeconds:10},
    {name:'long',enabled:false,flatAttack:20,durationSeconds:120},
  ]);
  const inputs={attackType:'attack',raceSelect:'newtar',str:100,spirit:100,weaponDamage:61,weaponSkill:100,atkCap:500,targetAC:0,targetEvasion:0};
  const settings={objective:'sustainedDps',mainWeaponSkill:'弓',requireMotionLimit:false,maxSlots:1,topN:1,beamWidth:5,equipmentEvalLimit:3,exactEquipmentLimit:3,includeDisabledBuffs:true,includeCurrentConfig:false,onlyBetterThanCurrent:false,buffMode:'beam',buffBeamWidth:8,localPasses:1};
  const before=json(st),out=c.runOptimizerCore(json({state:st,inputs,settings}));
  assert.ok(out.results.length);assert.deepEqual(json(out.results[0].compositeIdxs),[1],'long lived Buff wins over stronger frequent refresh');
  assert.deepEqual(json(st),before,'original registrations untouched');
  assert.ok(out.results[0].metrics.sustainedAttack.supported);
  const steady=c.runOptimizerCore(json({state:st,inputs,settings:{...settings,objective:'attackDps'}}));
  assert.deepEqual(json(steady.results[0].compositeIdxs),[0],'stationary objective unchanged');
  results.push(out.results[0].metrics.sustainedAttack.averageDps);
  const criticalState=json(st);
  criticalState.attackDps.criticalCancel=true;
  criticalState.composite=c.normalizeCompositeRows([
    {name:'crit 60',extraCritRatePct:60,durationSeconds:120},
    {name:'crit 40',extraCritRatePct:40,durationSeconds:120},
    {name:'excluded',excluded:true,extraCritRatePct:100,durationSeconds:120}
  ]);
  const critical=c.runOptimizerCore(json({state:criticalState,inputs,
    settings:{...settings,buffMode:'fast',maxSlots:2}}));
  assert.deepEqual(json(critical.results[0]?.compositeIdxs),[0,1]);
  assert.equal(critical.results[0].metrics.sustainedAttack.supported,true);
  criticalState.composite[1].durationSeconds=4;
  criticalState.composite[1].sustainMode='once';
  assert.equal(c.runOptimizerCore(json({state:criticalState,inputs,
    settings:{...settings,buffMode:'fast',maxSlots:2}})).results.length,0);
  // Storage helpers, with no localStorage or browser registration writes.
  for(const f of ['src/storage/importExport.js','src/storage/shareUrl.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c,{filename:f});
  const row=c.normalizeCompositeRows([{...st.composite[0],sustainMode:'refresh',sustainDurationSeconds:7.5,sustainDowntimeSeconds:0}])[0];
  const parsed=c.buffPresentationTsvParse(c.buffPresentationTsvExport(row));
  const shared=c.shareCompactCompositeRow(row);
  for(const copy of [parsed,shared]){
    assert.equal(copy.sustainMode,'refresh');assert.equal(copy.sustainDurationSeconds,7.5);assert.equal(copy.sustainDowntimeSeconds,0);
  }
  st.composite=[{...row,enabled:true}];st.attackDps.sustainMinutes=2.5;
  c.collectConfig=()=>({inputs,state:st});
  const restored=c.parseConfigFromTsv(c.serializeConfigAsTsv({inputs,state:st})).state;
  const sharedState=c.collectShowcaseShareConfig().state;
  const expected=c.computeSustainedAttack(st,inputs,st.attackDps);
  assert.ok(expected.supported);
  for(const restoredState of [restored,sharedState]){
    assert.equal(restoredState.attackDps.sustainMinutes,2.5);
    assert.equal(restoredState.composite[0].sustainDowntimeSeconds,0);
    assert.equal(restoredState.composite[0].sustainDurationSeconds,7.5);
    assert.equal(restoredState.composite[0].sustainMode,'refresh');
    const value=c.computeSustainedAttack(restoredState,inputs,restoredState.attackDps);
    assert.equal(value.totalDamage,expected.totalDamage,'TSV/share restored numerical result');
  }
  assert.equal(c.normalizeAttackDpsState({sustainMinutes:5}).sustainMinutes,5);
}
assert.equal(results[0],results[1],'worker/main same sustained score');
console.log(JSON.stringify({workerMainParity:true,rankingChangesWithRefreshCost:true,sustainedDps:results[0],storageFieldsRetained:true}));
