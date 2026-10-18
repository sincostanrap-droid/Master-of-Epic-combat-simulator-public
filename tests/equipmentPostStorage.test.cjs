const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {context,json,root}=require('../tools/benchmark-optimizer.cjs');const p=context(root,{data:false});
for(const f of ['src/storage/importExport.js','src/storage/shareUrl.js'])vm.runInContext(fs.readFileSync(f,'utf8'),p);
const state=json(vm.runInContext('DEFAULT_STATE()',p));for(const k of ['equipment','composite','post','other','pct','flat','conv','dmg','special'])state[k]=[];
state.equipment=[{name:'装備詳細検証',slot:'防具: 頭',enabled:true,optimizerFixed:true,attack:12.345678,equipBuffEnabled:true,equipBuffName:'検証Buff',equipBuffTechnicId:'999991',equipBuffConflictGroups:'test:equipment',equipBuffStackRule:'latest',equipBuffConvMagicSpeedRate:0.123456,equipBuffForcedEvasion:0,equipBuffNote:'効果の説明を保持',extraEffects:[{key:'custom',name:'補足',value:0,scope:'display',note:'未確定の説明'}]},
{name:'除外装備検証',slot:'防具: 胴',enabled:false,optimizerExcluded:true,optimizerFixed:false,magic:3.45678,equipBuffEnabled:false,equipBuffName:'停止中Buff',equipBuffFlatAttack:9.87654,equipBuffNote:'OFFでも定義を保持'},
{name:'未使用装備検証',slot:'防具: 手',enabled:false,optimizerExcluded:false,attack:1}];
state.post=[{name:'有効外枠',enabled:true,slot:true,fixed:true,excluded:false,value:1.234567,note:'説明'}, {name:'除外外枠',enabled:false,slot:false,fixed:true,excluded:true,value:1.345678,note:'除外して保存'}, {name:'未使用外枠',enabled:false,excluded:false,fixed:false,slot:false,value:1.1,note:''}];
const inputs={attackType:'attack',raceSelect:'newtar',str:100,spirit:100,weaponDamage:100,targetAC:100};p.collectConfig=()=>({state,inputs});
p.testState=state;vm.runInContext('state=testState',p);const box={};p.byId=()=>box;p.exportBuffOnlyTsv();
const original=JSON.stringify(state);
const paths={full:p.parseConfigFromTsv(p.serializeConfigAsTsv({state,inputs})).state,partial:{equipment:p.equipmentFromTsvRows(json(p.equipmentOnlyRows(state.equipment))),post:p.parseConfigFromTsv(box.value).state.post},share:p.collectShowcaseShareConfig().state};
const keys={equipment:['enabled','optimizerFixed','optimizerExcluded','attack','magic','equipBuffEnabled','equipBuffName','equipBuffTechnicId','equipBuffConflictGroups','equipBuffStackRule','equipBuffConvMagicSpeedRate','equipBuffForcedEvasion','equipBuffFlatAttack','equipBuffNote','extraEffects'],post:['enabled','fixed','excluded','slot','value','note']},failures=[];
for(const [route,restored]of Object.entries(paths))for(const type of ['equipment','post'])for(const source of state[type]){
 const expected=type==='equipment'?json(p.normalizeEquipmentCandidate(source)):source;
 const absent=route==='share'&&source.enabled===false&&!(type==='equipment'?source.optimizerExcluded||source.optimizerFixed:source.excluded||source.fixed);
 const actual=restored[type].find(r=>r.name===source.name);if(absent){assert.equal(actual,undefined);continue;}
 if(!actual){failures.push({route,type,name:source.name,field:'row missing'});continue;}
 const row=type==='equipment'?json(p.normalizeEquipmentCandidate(actual)):{...actual,enabled:!!actual.enabled,fixed:!!actual.fixed,excluded:!!actual.excluded,slot:actual.slot!==false,note:actual.note||''};
 for(const key of keys[type])try{assert.deepEqual(row[key],expected[key]);}catch{failures.push({route,type,name:source.name,field:key});}
}
const baseline=p.computeMetrics(state,inputs);
for(const [route,restored]of Object.entries(paths)){
 const m=p.computeMetrics({...json(state),...restored},inputs);
 for(const key of ['finalDamage','atk','stats','extraStats','forcedEvasion','postMultiplier'])assert.deepEqual(m[key]===undefined?undefined:json(m[key]),baseline[key]===undefined?undefined:json(baseline[key]),route+' numerical parity '+key);
}
// Column omissions in old files retain safe legacy defaults; zero is a value.
assert.equal(p.equipmentFromTsvRows([{name:'旧形式',slot:'防具: 頭'}])[0].equipBuffForcedEvasion,null);
assert.equal(p.equipmentFromTsvRows([{name:'零',slot:'防具: 頭',equipBuffForcedEvasion:'0'}])[0].equipBuffForcedEvasion,0);
const legacy=p.parseConfigFromTsv('[post]\nenabled\tslot\tname\tvalue\n1\t0\t旧外枠\t1.2\n').state.post[0];
assert.equal(legacy.fixed,false);assert.equal(legacy.excluded,false);
assert.equal(JSON.stringify(state),original);
const report={passed:!failures.length,equipmentCases:3,postCases:3,numericalParity:true,legacyDefaults:true,failures};if(process.argv.includes('--report'))fs.writeFileSync('docs/equipment-post-storage-validation-20261018.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));assert.equal(failures.length,0);
