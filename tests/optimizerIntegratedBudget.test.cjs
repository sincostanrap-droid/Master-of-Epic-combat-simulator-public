const assert=require('node:assert/strict'),vm=require('node:vm');
const {context,json}=require('../tools/benchmark-optimizer.cjs');
for(const worker of [false,true]){
 const c=context(undefined,{data:false,worker}),state=json(vm.runInContext('DEFAULT_STATE()',c));
 state.equipment=c.normalizeEquipmentRows([{name:'base',slot:'防具: 頭',enabled:true,magic:1},{name:'better',slot:'防具: 頭',enabled:false,magic:5}]);
 state.composite=c.normalizeCompositeRows([{name:'power',flatMagic:5,enabled:true},{name:'stronger',flatMagic:10,enabled:false}]);
 const payload={state:json(state),inputs:{attackType:'attack',raceSelect:'newtar',str:100,spirit:100},settings:{objective:'magic',maxSlots:1,topN:1,beamWidth:5,equipmentEvalLimit:3,exactEquipmentLimit:3,includeCurrentConfig:true,onlyBetterThanCurrent:false,includeDisabledBuffs:true,buffMode:'fast',localPasses:1}};
 const before=json(payload);let ticks=0;c.performance={now:()=>++ticks};
 const out=c.runOptimizerCore({...json(payload),settings:{...payload.settings,timeLimitMs:1}});
 assert.equal(out.summary.timeLimitReached,true);assert.equal(out.summary.optimizerDiagnostic.approximate,true);
 assert.ok(out.results.length,'current reference retained when stopped before first completed search');
 assert.ok(out.summary.statusText.includes('最適の保証なし'));
 assert.deepEqual(json(payload),before);
 assert.ok(Object.keys(out.summary.settings).every(k=>!k.startsWith('_')));
 const rerun=c.runOptimizerCore(json(payload));assert.ok(rerun.results.length);assert.ok(!rerun.summary.timeLimitReached);
 // Exhaust the larger equipment search only after the current build's neighbors.
 const wide=json(payload);
 wide.state.equipment.push({name:'excluded gear',slot:'防具: 頭',optimizerExcluded:true,magic:999});
 wide.state.composite.push({name:'fixed off',enabled:false,fixed:true,flatMagic:999});
 wide.settings={...wide.settings,timeLimitMs:1000,exactEquipmentLimit:1,onlyBetterThanCurrent:true};
 const build=c.optimizerBuildEquipmentCandidates;
 c.optimizerBuildEquipmentCandidates=(inputs,settings)=>{
   ticks+=2000;
   return build(inputs,settings);
 };
 const preserved=json(wide);
 const partial=c.runOptimizerCore(wide);
 assert.equal(partial.summary.timeLimitReached,true);
 assert.deepEqual(json(partial.results[0].equipmentIdxs),[1]);
 assert.deepEqual(json(partial.results[0].compositeIdxs),[1]);
 assert.equal(partial.results[0].metrics.stats.magic,115);
 assert.deepEqual(json(wide),preserved);
 c.optimizerBuildEquipmentCandidates=build;
 // A stronger but excluded current configuration is comparison-only.
 wide.state.equipment[0].optimizerExcluded=true;
 wide.state.equipment[0].magic=1000;
 wide.settings.timeLimitMs=0;
 const valid=c.runOptimizerCore(wide);
 const displayed=c.optimizerReevaluateResultsOnMain(valid.results,wide);
 assert.equal(displayed[0].metrics.stats.magic,115);
 assert.equal(displayed.at(-1).baselineInvalid,true);
}
console.log('Integrated optimizer budget: main/Worker, stop, reference retention, restart, input preservation passed');
