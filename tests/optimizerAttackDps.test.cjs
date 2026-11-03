const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {context,json}=require('../tools/benchmark-optimizer.cjs');
const repo=process.env.MOE_TEST_ROOT ? path.resolve(process.env.MOE_TEST_ROOT) : undefined;
function fixture(c){
  const state=json(vm.runInContext('DEFAULT_STATE()',c));
  state.attackDps={motionProfile:'form477',weaponCategory:'12',criticalCancel:true,stDelayBonus:-10,
    manualAttackBonus:false,damageSource:'manual',manualDamage:99999,attackDelayBuff:-99,
    equipmentBuffDelaySource:'manual',equipmentBuffDelay:-99};
  state.equipment=c.normalizeEquipmentRows([{slot:'武器: 左手',name:'bow',enabled:true,optimizerFixed:true,
    weaponDamage:61,weaponAttackInterval:155,weaponTwoHanded:'○',weaponReq:[{name:'弓',required:66}]}]);
  state.composite=c.normalizeCompositeRows([
    {name:'critical',enabled:true,fixed:true,slot:true,extraCritRatePct:100},
    {name:'A',enabled:false,slot:true,extraAttackDelay:-60},
    {name:'B bow',enabled:false,slot:true,extraEffects:[{key:'attackDelayB',name:'弓',value:13,unit:'%',scope:'display'}]},
    {name:'B gun',enabled:false,slot:true,extraEffects:[{key:'attackDelayB',name:'銃器',value:40,unit:'%',scope:'display'}]},
    {name:'power',enabled:false,slot:true,flatAttack:10},
    {name:'redundant A',enabled:false,slot:true,extraAttackDelay:-20}
  ]);
  return {state:json(state),inputs:{attackType:'attack',raceSelect:'newtar',str:100,spirit:100,
    weaponDamage:61,weaponSkill:100,atkCap:500,targetAC:0,targetEvasion:0},settings:{objective:'attackDps',
    mainWeaponSkill:'弓',maxSlots:4,topN:3,beamWidth:10,equipmentEvalLimit:10,exactEquipmentLimit:10,
    includeDisabledBuffs:true,includeCurrentConfig:false,evaluateCurrentEquipment:false,onlyBetterThanCurrent:false,
    buffMode:'beam',buffBeamWidth:64,localPasses:2}};
}
let snapshots=[];
for(const worker of [false,true]){
  const c=context(repo,{worker,data:false});
  let p=fixture(c),before=json(p);
  const run=(p)=>c.runOptimizerCore(json(p));
  const out=run(p),best=out.results[0];
  assert.ok(best,'DPS build found');
  assert.deepEqual(json(p),before,'source registrations and conditions unchanged');
  assert.deepEqual(json(best.compositeIdxs),[0,1,2,4],'A + eligible B + damage; no wrong skill or capped A');
  const d=best.metrics.attackDps;
  assert.equal(d.periodSec,.768);
  assert.equal(d.attackDelayBuff,-13);
  assert.equal(d.equipBuffCapped,-60);
  assert.equal(d.manualBonus,-10);
  assert.equal(d.cfg.damageSource,'current');
  assert.equal(d.cfg.equipmentBuffDelaySource,'auto');
  assert.equal(d.optimizationSupported,true);
  assert.equal(d.continuousDps,d.expectedDamagePerHit*d.hitRate/d.periodSec);
  assert.equal(best.metrics.critAvg,1.5);
  snapshots.push(json({idx:best.compositeIdxs,dps:d.continuousDps,period:d.periodSec}));
  const reevaluated=c.optimizerReevaluateResultsOnMain(out.results,p);
  assert.equal(reevaluated[0].metrics.attackDps.continuousDps,d.continuousDps,'worker/result re-evaluation parity');
  // Greedy and local search must also value a pure shortening Buff.
  for(const buffMode of ['fast','local']){
    const q=json(p);q.settings.buffMode=buffMode;
    assert.equal(run(q).results[0].metrics.attackDps.periodSec,.768);
  }
  p=fixture(c);p.state.composite[0].extraCritRatePct=99;
  assert.equal(run(p).results.length,0,'99% is not guaranteed critical spam');
  p=fixture(c);p.state.composite[2].fixed=true;
  const noB=run(p).results[0];
  assert.equal(noB.metrics.attackDps.attackDelayBuff,0,'fixed OFF remains off');
  assert.equal(noB.metrics.attackDps.periodSec,.8);
  p=fixture(c);p.state.attackDps.stDelayBonus=0;
  assert.equal(run(p).results[0].metrics.attackDps.periodSec,.768,'13% still enough at ST100');
  p.state.composite[2].extraEffects[0].value=12.1;
  assert.equal(run(p).results[0].metrics.attackDps.periodSec,.784,'below the integerization boundary');
  p.state.composite[2].extraEffects[0].value=12.2;
  assert.equal(run(p).results[0].metrics.attackDps.periodSec,.768,'at the integerization boundary');
  p=fixture(c);p.state.attackDps.criticalCancel=false;p.state.composite[0].extraCritRatePct=0;
  const normal=run(p).results[0];assert.equal(normal.metrics.attackDps.periodSec,2.08);
  assert.equal(normal.metrics.critAvg,1);
  assert.deepEqual(json(normal.compositeIdxs),[4],'normal motion wall removes useless delay Buffs; zero-effect row is empty');
  p=fixture(c);p.inputs.attackType='heavy';assert.throws(()=>run(p),/アタック専用/);
  p=fixture(c);p.state.attackDps.weaponCategory='19';assert.equal(run(p).results.length,0,'wrong weapon motion rejected');
  p=fixture(c);p.state.equipment[0].weaponAttackInterval=0;assert.equal(run(p).results.length,0,'missing weapon delay is unsupported');
  p=fixture(c);p.state.composite.push({name:'unknown delay percent',enabled:true,fixed:true,extraAttackDelayPct:-40});
  assert.equal(run(p).results.length,0,'unclassified percentage is not ignored');
  p=fixture(c);p.state.equipment[0].catalogId='official-weapon-8681';
  assert.equal(run(p).results.length,0,'unverified periodic weapon followup cannot produce a complete DPS ranking');
  p=fixture(c);p.state.equipment[0].weaponReq.push({name:'銃器',required:10});
  assert.equal(run(p).results[0].metrics.attackDps.attackDelayBuff,-13,'secondary required skill is not the attack skill');
  // Damage-only remains independent of DPS and does not pay its calculation cost.
  p=fixture(c);p.settings.objective='damage';p.state.attackDps.weaponCategory='19';
  const damage=run(p).results[0];assert.ok(damage);assert.equal(damage.metrics.attackDps,undefined);
  assert.deepEqual(json(damage.compositeIdxs),[0,4]);
  // Buff conflicts and both shortening groups use the resolved, selected state.
  p=fixture(c);p.state.composite[2].tags='speed-choice';
  p.state.composite.push({name:'weak later',enabled:true,fixed:true,tags:'speed-choice',slot:true,
    extraEffects:[{key:'attackDelayB',name:'弓',value:1,unit:'%',scope:'display'}]});
  const conflict=run(p).results[0];assert.ok(conflict.metrics.attackDps.attackDelayBuff>=-13);
  // Adding maximum ST does not invent current-ST recovery or the ST200 bonus.
  p=fixture(c);p.state.attackDps.stDelayBonus=0;p.state.composite[2].fixed=true;
  p.state.composite.push({name:'maximum ST only',enabled:true,fixed:true,extraST:50});
  assert.equal(run(p).results[0].metrics.attackDps.stBonus,0);
  if(!worker){
    p=fixture(c);const chosen=run(p).results[0];
    // Same UI application path, with an isolated in-memory DOM/storage fixture.
    c._testPayload=p;c._testResults=[chosen];
    vm.runInContext('state=clone(_testPayload.state); optimizerLastPayload=_testPayload; integratedOptimizerResults=_testResults;',c);
    const nodes=new Map();c.byId=id=>{if(!nodes.has(id))nodes.set(id,{value:'',checked:false});return nodes.get(id);};
    c.optimizerApproximationDiagnosticsHtml=()=>'';
    c.renderIntegratedOptimizerResults();
    assert.match(nodes.get('optimizerResults').innerHTML,/<th>DPS<\/th>/);
    assert.match(nodes.get('optimizerResults').innerHTML,/モーション上限/);
    assert.match(nodes.get('optimizerResults').innerHTML,/26\.9/);
    c.renderAll=()=>{};c.calc=()=>{};
    c.applyIntegratedOptimizerResult(0);
    const applied=json(vm.runInContext('state',c));
    assert.equal(applied.attackDps.attackDelayBuff,0);assert.equal(applied.attackDps.manualAttackBonus,true);
    assert.equal(nodes.get('allowCrit').checked,true);assert.equal(nodes.get('critRate').value,'1');
    for(const f of ['src/storage/importExport.js','src/storage/shareUrl.js','src/ui/attackDpsResult.js'])
      vm.runInContext(fs.readFileSync(path.join(repo||path.resolve(__dirname,'..'),f),'utf8'),c);
    c.attackDpsState=()=>applied.attackDps;
    const actualInputs={...p.inputs,allowCrit:true,critRate:1};
    const actualMetrics=c.computeMetrics(applied,actualInputs);
    assert.equal(c.computeAttackDpsAlpha(actualMetrics).continuousDps,chosen.metrics.attackDps.continuousDps,'applied UI DPS matches optimization');
    c.collectInputs=()=>actualInputs;
    const shared=c.collectShowcaseShareConfig();
    const tsv=c.parseConfigFromTsv(c.serializeConfigAsTsv({inputs:actualInputs,state:applied}));
    for(const restored of [tsv,shared]){
      assert.deepEqual(json(restored.state.attackDps),applied.attackDps);
      const q={...p,state:json(restored.state),inputs:json(restored.inputs)};
      assert.equal(run(q).results[0].metrics.attackDps.continuousDps,chosen.metrics.attackDps.continuousDps,'restored config retains DPS');
    }
  }
  console.log(JSON.stringify({worker,...snapshots.at(-1),normalDps:normal.metrics.attackDps.continuousDps}));
}
assert.deepEqual(snapshots[0],snapshots[1],'main and Worker calculate the same ranking');
console.log('DPS optimizer: bounded candidates, A/B scopes, motion wall, critical requirement, ST boundary, immutability and main/Worker parity passed');
