const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {context,json,root}=require('../tools/benchmark-optimizer.cjs');
const p=context(root,{data:false});
for(const f of ['src/storage/importExport.js','src/storage/shareUrl.js'])vm.runInContext(fs.readFileSync(f,'utf8'),p);
const base=json(vm.runInContext('DEFAULT_STATE()',p));
for(const key of ['equipment','composite','pct','flat','conv','dmg','special','post','other'])base[key]=[];
const cases=[
 {name:'通常能力',enabled:true,slot:true,flatAttack:12.345678,extraHP:3.45678,fixed:true,stackRule:'latest',autoStackGroup:'test:ability'},
 {name:'手動の補足効果',enabled:true,extraEffects:[{key:'custom',name:'未確定効果',value:0,unit:'',scope:'display',note:'不明を0計算にしない'}]},
 {name:'追加数値効果',enabled:true,extraEffects:[{key:'skillPlus',name:'戦闘技術',value:12.34567,scope:'both',unit:''}]},
 {name:'回避固定ゼロ',enabled:true,forcedEvasion:0},
 {name:'変換',enabled:true,convMagicSpeedRate:0.123456,convDrunkRate:0.234567},
 {name:'除外した説明行',enabled:false,excluded:true,slot:false,note:'数値なし'},
 {name:'未使用候補',enabled:false,excluded:false,flatMagic:5}
];
const failures=[];
for(const source of cases){
 const state={...json(base),composite:[source]},input={attackType:'attack',raceSelect:'newtar',str:100,spirit:100,weaponDamage:100,targetAC:100};
 p.collectConfig=()=>({state,inputs:input});
 const normalized=json(p.normalizeCompositeRows([source]))[0],snapshot=JSON.stringify(source);
 const paths={fullTsv:p.parseConfigFromTsv(p.serializeConfigAsTsv({state,inputs:input})).state.composite,buffTsv:p.compositeFromTsvRows(json(p.compositeOnlyRows([source]))),share:p.collectShowcaseShareConfig().state.composite};
 for(const [route,rows]of Object.entries(paths)){
  if(route==='share'&&source.enabled===false&&!source.excluded){assert.equal(rows.length,0);continue;}
  try{assert.equal(rows.length,1);const restored=json(p.normalizeCompositeRows(rows))[0];for(const key of ['enabled','excluded','fixed','slot','flatAttack','flatMagic','extraHP','stackRule','autoStackGroup','forcedEvasion','convMagicSpeedRate','convDrunkRate','extraEffects','note'])assert.deepEqual(restored[key],normalized[key],key);
   const actual=p.computeMetrics({...json(base),composite:rows},input),expected=p.computeMetrics(state,input);
   for(const key of ['finalDamage','atk','stats','extraStats','playerHit','forcedEvasion'])assert.deepEqual(actual[key]===undefined?undefined:json(actual[key]),expected[key]===undefined?undefined:json(expected[key]),route+' calculation '+key);
  }catch(e){failures.push({name:source.name,route,reason:e.message});}
 }
 assert.equal(JSON.stringify(source),snapshot);
}
const report={passed:failures.length===0,cases:cases.length,routes:['fullTsv','buffTsv','share'],calculationParity:true,failures};
if(process.argv.includes('--report'))fs.writeFileSync('docs/buff-storage-common-validation-20261018.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));assert.equal(failures.length,0);
