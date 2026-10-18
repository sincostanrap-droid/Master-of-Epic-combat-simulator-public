const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {context,json,root}=require('../tools/benchmark-optimizer.cjs');
const p=context(root,{data:false});
for(const f of ['src/storage/importExport.js','src/storage/shareUrl.js'])vm.runInContext(fs.readFileSync(f,'utf8'),p);
const st=json(vm.runInContext('DEFAULT_STATE()',p));
for(const k of ['equipment','composite','post','other','pct','flat','conv','dmg','special'])st[k]=[];
const flags=[{enabled:true,fixed:true,excluded:false},{enabled:false,fixed:true,excluded:false},{enabled:false,fixed:false,excluded:true}];
for(const type of ['composite','special','other'])st[type]=flags.map((f,i)=>({name:type+i,...f,slot:false,note:'保持確認',...(type==='composite'?{flatAttack:12.345678}:type==='special'?{value:1.234567,target:'dragon'}:{tags:'test'})}));
const inputs={attackType:'attack',raceSelect:'newtar',str:100,spirit:100,weaponDamage:100,targetAC:100};
const cfg={state:st,inputs},original=JSON.stringify(cfg);p.collectConfig=()=>cfg;
const routes={tsv:p.parseConfigFromTsv(p.serializeConfigAsTsv(cfg)),share:p.collectShowcaseShareConfig()};
const check=(actual,type,label)=>{assert.equal(actual.length,st[type].length,label+' row count');for(const source of st[type]){const row=actual.find(r=>r.name===source.name);assert.ok(row,label+' row exists');for(const key of ['enabled','fixed','excluded'])assert.equal(!!row[key],source[key],label+' '+source.name+' '+key);assert.equal(row.note,source.note);if(type==='composite')assert.equal(row.flatAttack,source.flatAttack);if(type==='special'){assert.equal(row.value,source.value);assert.equal(row.target,source.target);}}};
for(const [route,c]of Object.entries(routes))for(const type of ['composite','special','other'])check(c.state[type],type,route);
// Exercise both applyConfig and its reload input with the same exported flags.
Object.assign(p,{setInputs:()=>{},renderAll:()=>{},syncSkillSimToCalcInputs:()=>{},calc:()=>{},setImportStatus:()=>{}});
for(const [route,c]of Object.entries(routes)){assert.equal(p.applyConfig(c),true);const restored=json(vm.runInContext('state',p));for(const type of ['composite','special','other'])check(restored[type],type,route+' apply');assert.equal(p.applyConfig({inputs,state:restored}),true);for(const type of ['composite','special','other'])check(json(vm.runInContext('state',p))[type],type,route+' reload');}
// Buff-only TSV uses a separate reader; verify it too without real storage.
let box={};p.byId=()=>box;p.testState=json(st);vm.runInContext('state=testState',p);p.exportBuffOnlyTsv();
Object.assign(p,{confirm:()=>true,renderCompositeTable:()=>{},renderNumericTable:()=>{},renderOtherTable:()=>{},renderTagLinkSummary:()=>{},renderShowcaseTab:()=>{},alert:message=>assert.fail(message)});
p.importBuffOnly();for(const type of ['composite','other'])check(json(vm.runInContext('state',p))[type],type,'buff-only TSV');
const old=p.parseConfigFromTsv('[special]\nenabled\tname\tvalue\n1\t旧特攻\t1.5\n[other]\nenabled\tname\n1\t旧その他\n').state;
for(const type of ['special','other'])for(const key of ['fixed','excluded'])assert.equal(old[type][0][key],false,'legacy default '+type+' '+key);
assert.equal(JSON.stringify(cfg),original,'source data unchanged');
console.log('Fixed/excluded persistence: 9 rows, full TSV/share/apply/reload, Buff-only TSV and legacy defaults OK');
