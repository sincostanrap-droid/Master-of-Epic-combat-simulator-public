const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {context,json,root}=require('../tools/benchmark-optimizer.cjs');
const p=context(root,{data:false});for(const f of ['src/storage/importExport.js','src/storage/shareUrl.js'])vm.runInContext(fs.readFileSync(f,'utf8'),p);
const base=json(vm.runInContext('DEFAULT_STATE()',p));for(const k of ['equipment','composite','pct','flat','conv','dmg','special','post','other'])base[k]=[];
const inputs={raceSelect:'newtar',str:100,spirit:100,weaponDamage:100,targetAC:100,attackType:'attack',atkCap:500};
const cases=[
 {name:'旧形式の割合Buff',patch:{pct:[{enabled:true,slot:true,name:'割合',target:'attack',percent:12.34567}]}},
 {name:'旧形式の固定加算',patch:{flat:[{enabled:true,slot:true,name:'固定',target:'magic',value:12.34567}]}},
 {name:'旧形式の変換',patch:{conv:[{enabled:true,slot:true,name:'変換',source:'magic',rate:12.34567,baseOffset:0}]}},
 {name:'旧形式の与ダメ補正',patch:{dmg:[{enabled:true,slot:true,name:'与ダメ',value:0.234567}]}},
 {name:'DPS入力設定',patch:{attackDps:{...json(p.defaultAttackDpsState()),damageSource:'manual',manualDamage:123.4567,simSeconds:47.5,hitRateSource:'manual',hitRatePct:78.9}}},
 {name:'装備の速度補正',patch:{equipment:[{enabled:true,slot:'防具: 頭',name:'速度補正',delay:-12.34567}]}},
 {name:'有効な数値なし説明Buff',patch:{composite:[{enabled:true,name:'説明のみ',catalogRuleId:'player-enchant-leg',catalogSource:'reviewed-buff-catalog-v1',catalogInputs:{skill:100,magic:100}}]}}
];
// Older TSVs keep defaults; malformed or unknown DPS keys cannot override them.
const legacy=p.parseConfigFromTsv('[inputs]\nkey\tvalue\n').state;
assert.deepEqual(json(p.normalizeAttackDpsState(legacy.attackDps)),json(p.defaultAttackDpsState()));
const malformed=p.parseConfigFromTsv('[attackDps]\nkey\tvalue\nmanualDamage\tbroken\nunknown\t123\n').state;
assert.deepEqual(json(malformed.attackDps),json(p.defaultAttackDpsState()));
const failures=[],checks=[];
for(const item of cases){const state={...json(base),...item.patch},snapshot=JSON.stringify(state);p.collectConfig=()=>({state,inputs});const full=p.parseConfigFromTsv(p.serializeConfigAsTsv({state,inputs})).state,share=p.collectShowcaseShareConfig().state;
 const partialEquipment=state.equipment.length?p.equipmentFromTsvRows(json(p.equipmentOnlyRows(state.equipment))):null;
 for(const [route,r]of Object.entries({json:JSON.parse(JSON.stringify(state)),fullTsv:full,share,...(partialEquipment?{equipmentTsv:{...json(state),equipment:partialEquipment}}:{})})){
  const restored={...json(base),...r};let field,expected,actual;
  if(item.patch.attackDps){field='attackDps';expected=json(p.normalizeAttackDpsState(state.attackDps));actual=json(p.normalizeAttackDpsState(restored.attackDps));}
  else if(item.patch.equipment){field='equipment.extraAttackDelay';expected=p.normalizeEquipmentCandidate(state.equipment[0]).extraAttackDelay;actual=p.normalizeEquipmentCandidate(restored.equipment[0]||{}).extraAttackDelay;}
  else {field=Object.keys(item.patch)[0];expected=state[field].length;actual=restored[field]?.length??0;}
  if(!item.patch.equipment && !item.patch.attackDps){
    const key=Object.keys(item.patch)[0];
    for(let i=0;i<state[key].length;i++)for(const [prop,value]of Object.entries(state[key][i]))
      assert.deepEqual(json(restored[key]?.[i]?.[prop]),json(value),item.name+' '+route+' '+prop);
  }
  const before=p.computeMetrics(state,inputs),after=p.computeMetrics(restored,inputs);
  for(const key of ['atk','finalDamage'])assert.equal(after[key],before[key],item.name+' '+route+' '+key);
  assert.equal(after.stats.magic,before.stats.magic,item.name+' '+route+' magic');
  const pass=JSON.stringify(expected)===JSON.stringify(actual);checks.push({name:item.name,route,pass});
  if(!pass){const a=p.computeMetrics(state,inputs),b=p.computeMetrics(restored,inputs);failures.push({name:item.name,route,field,expected,actual,metricsBefore:{atk:a.atk,magic:a.stats.magic,damage:a.finalDamage},metricsAfter:{atk:b.atk,magic:b.stats.magic,damage:b.finalDamage}});}
 }
 assert.equal(JSON.stringify(state),snapshot);
}
const report={passed:!failures.length,representativeCases:cases.length,checks,failures,userStorageWrites:0};if(process.argv.includes('--report'))fs.writeFileSync('docs/final-storage-audit-20261018.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,cases:cases.length,failures:failures.map(({name,route,field})=>({name,route,field}))}));assert.equal(failures.length,0,'remaining storage omissions');

