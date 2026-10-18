const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {context,json,root}=require('../tools/benchmark-optimizer.cjs');
// Only a VM: no browser storage, user files, catalogue search or optimizer run.
const read=fs.readFileSync;
let p;
try{
 fs.readFileSync=function(file,...args){
  if(file===path.join(root,'src/main.js'))return ['src/data/manual/reviewedBuffCatalog.manual.js','src/data/generated/buffPresentation.generated.js','src/domain/buffDurations.js','src/data/generated/wikiPlayerCatalog.generated.js','src/data/generated/combatSkillNames.generated.js','src/calc/combatEffectFormulas.js','src/calc/wikiPlayerEffects.js','src/domain/wikiPlayerCatalog.js'].map(f=>read(path.join(root,f),'utf8')).join('\n')+'\n'+read(file,...args);
  return read.call(this,file,...args);
 };
 p=context(root,{data:false});
}finally{fs.readFileSync=read;}
p.structuredClone=structuredClone;
for(const file of ['src/storage/importExport.js','src/storage/shareUrl.js','src/ui/effectDisplayText.js'])vm.runInContext(read(path.join(root,file),'utf8'),p);
const numeric=require('../src/calc/combatNumerics'),registration=require('../src/calc/buffNumericRegistration');
const names=['エンライテン','マジック サークル','ヒーリング','リジェネレイション','フレイム ブレイド'];
const bundles=new Map();
for(let i=0;i<58&&bundles.size<names.length;i++){
 const page=JSON.parse(read(path.join(root,'src/data/generated/combatNumericPages',String(i).padStart(3,'0')+'.json'),'utf8'));
 for(const bundle of page.rows)if(names.includes(bundle.row.name))bundles.set(bundle.row.name,{bundle,skillNames:page.skillNames});
}
assert.equal(bundles.size,names.length);
const controls={reviewedBuffCatalogSkill:{value:'100'},reviewedBuffCatalogMagic:{value:'100'}};
p.byId=id=>controls[id]||null;
for(const fn of ['renderCompositeTable','renderTagLinkSummary','renderShowcaseTab','calc','closeReviewedBuffCatalog'])p[fn]=()=>{};
const state=json(vm.runInContext('DEFAULT_STATE()',p));
for(const key of ['equipment','composite','pct','flat','conv','dmg','special','post','other'])state[key]=[];
const inputs={raceSelect:'newtar',str:100,spirit:100,weaponDamage:100,weaponSkill:100,targetAC:100,attackType:'attack'};
const baseInputs={skill:100,magic:100,world:0,seed:10,resistance:50,targetDefense:100,targetAmplificationAllowed:true,bladeMode:'normal',bladeSelected:true,skills:{'神秘魔法':100}};
const retained={name:'既存の手入力',enabled:false,slot:true,flatMagic:12.3456789,note:'変更しない',catalogInputs:{skill:73.456789}};
state.composite.push(retained);p.fixture=state;vm.runInContext('state=fixture',p);
let transferred;
for(const name of names){
 const {bundle,skillNames}=bundles.get(name);
 const rule=p.MOE_REVIEWED_BUFF_CATALOG_MANUAL.find(r=>r.wikiPlayerKey===bundle.row.key);
 assert.ok(rule,name+' real catalogue rule');
 // Use the current numerical connector for this selected page only.
 const original=rule.evaluate;
 rule.evaluate=arg=>registration.connect(bundle,numeric,arg,original(arg),skillNames);
 p.selected=rule.id;p.transfer={ruleId:rule.id,snapshot:{key:bundle.row.key,inputs:baseInputs}};
 vm.runInContext('reviewedBuffCatalogSelectedId=selected;combatBuffCatalogTransfer=transfer',p);
 p.addReviewedBuffCatalogSelection();
 let rows=vm.runInContext('state.composite',p),row=rows.find(r=>r.catalogRuleId===rule.id);
 assert.ok(row,name+' registered');assert.ok(row.catalogNumeric.values.length,name+' real calculated quantity');
 assert.equal(row.catalogInputs.combatTrialSource.inputs.seed,10);
 row.name='編集済み '+name;row.note='保持する注記';row.excluded=true;
 p.addReviewedBuffCatalogSelection();rows=vm.runInContext('state.composite',p);
 assert.equal(rows.filter(r=>r.catalogRuleId===rule.id).length,1,'repeat updates instead of duplicates');
 row=rows.find(r=>r.catalogRuleId===rule.id);assert.equal(row.name,'編集済み '+name);assert.equal(row.note,'保持する注記');assert.equal(row.excluded,true);row.excluded=false;
 if(name==='エンライテン'){
  const high=row.extraHit;controls.reviewedBuffCatalogSkill.value='50';p.addReviewedBuffCatalogSelection();
  row=vm.runInContext('state.composite',p).find(r=>r.catalogRuleId===rule.id);assert.ok(row.extraHit<high);assert.equal(row.catalogInputs.skill,50);controls.reviewedBuffCatalogSkill.value='100';transferred=rule.id;
 }
}
for(const [key,value]of Object.entries(retained))assert.deepEqual(json(vm.runInContext('state.composite[0]',p)[key]),value,'existing input '+key);
const saved=json(vm.runInContext('state',p));p.collectConfig=()=>({state:saved,inputs});
const before=JSON.stringify(saved),metrics=json(p.computeMetrics(saved,inputs));
const routes={json:JSON.parse(JSON.stringify(saved)),fullTsv:p.parseConfigFromTsv(p.serializeConfigAsTsv({state:saved,inputs})).state,buffTsv:{...json(saved),composite:p.compositeFromTsvRows(json(p.compositeOnlyRows(saved.composite)))}};
const failures=[];
function check(label,fn){try{fn();}catch(error){failures.push({label,message:error.message.slice(0,180)});}}
for(const [route,restored]of Object.entries(routes)){
 check(route+' count',()=>assert.equal(restored.composite.length,saved.composite.length));
 for(const original of saved.composite){const row=restored.composite.find(r=>r.name===original.name);assert.ok(row,route+' '+original.name);
  for(const key of ['catalogRuleId','durationSeconds','flatMagic','extraHit','mpRegenPerMinute','catalogInputs','catalogNumeric','note'])if(original[key]!==undefined)
   check(route+' '+original.name+' '+key,()=>assert.deepEqual(row[key]===undefined?undefined:json(row[key]),json(original[key])));
 }
 check(route+' recalculation',()=>assert.deepEqual(json(p.computeMetrics(restored,inputs)),metrics));
}
const enabledRow=saved.composite.find(r=>r.catalogRuleId===transferred);enabledRow.excluded=true;enabledRow.enabled=false; // Actual exclusion checkbox also disables the row.
const share=p.collectShowcaseShareConfig();
check('share keeps excluded disabled row',()=>{const row=share.state.composite.find(r=>r.catalogRuleId===transferred);assert.ok(row?.excluded);assert.equal(row.enabled,false);assert.deepEqual(json(row.catalogNumeric),json(enabledRow.catalogNumeric));});
check('share omits disabled rows',()=>assert.ok(!share.state.composite.some(r=>r.name===retained.name)));
for(const original of saved.composite.filter(r=>r.enabled)){
 const row=share.state.composite.find(r=>r.catalogRuleId===original.catalogRuleId);
 check('share '+original.name+' row',()=>assert.ok(row));
 check('share '+original.name+' numerical results',()=>assert.deepEqual(row?.catalogNumeric===undefined?undefined:json(row.catalogNumeric),json(original.catalogNumeric)));
}
check('share restored calculation',()=>{
 const restored=p.computeMetrics({...json(saved),...json(share.state),composite:p.normalizeCompositeRows(json(share.state.composite))},inputs),original=p.computeMetrics(saved,inputs);
 // Sharing intentionally omits disabled rows, so compare numerical outcomes,
 // not diagnostic row inventories or source indices.
 for(const key of ['finalDamage','attackExpectedDamage','atk','stats','totalStats','extraStats','playerHit'])assert.deepEqual(json(restored[key]),json(original[key]),key);
});
// Sharing must detach nested details instead of aliasing the registered row.
const shareRow=share.state.composite.find(r=>r.catalogRuleId===transferred);
const sourceValue=enabledRow.catalogNumeric.values[0].value;
shareRow.catalogNumeric.values[0].value=999;
assert.equal(enabledRow.catalogNumeric.values[0].value,sourceValue);
for(const cells of [{},{catalogNumeric:'{'},{catalogNumeric:'null'},{catalogNumeric:'[]'},{catalogNumeric:'{"version":2,"values":[],"pending":[],"times":[]}'}])assert.equal(p.buffPresentationTsvParse(cells).catalogNumeric,undefined);
assert.equal(p.specialBuffRuleTsvParse({specialExcluded:'1'}).excluded,true,'legacy special exclusion remains readable');
assert.equal(p.compositeFromTsvRows([{name:'old',excluded:'1',special:'1'}])[0].excluded,true,'blank legacy field cannot erase modern exclusion');
assert.equal(p.normalizeCompositeRows(p.compositeFromTsvRows([{name:'old',special:'1'}]))[0].excluded,false,'missing old fields retain old default');
enabledRow.excluded=false;enabledRow.enabled=true;
assert.equal(JSON.stringify(saved),before,'serialization never rounds or edits source');
const legacy=require('../src/data/manual/playerCatalogAdditions.manual.js').buffs;
for(const rule of legacy){
 const effect=rule.evaluate({skill:100,magic:100});
 const row={...json(effect),name:'確認 '+rule.name,enabled:true,slot:true,excluded:true,catalogRuleId:rule.id,catalogInputs:{skill:73.456789,magic:91.234567},note:'未対応を保持'};
 const cfg={state:{...json(saved),composite:[row]},inputs};
 p.collectConfig=()=>cfg;
 const shared=p.collectShowcaseShareConfig().state.composite.find(r=>r.catalogRuleId===rule.id);
 check(rule.name+' shared description-only exclusion',()=>{assert.ok(shared);assert.equal(shared.excluded,true);assert.deepEqual(json(shared.catalogInputs),row.catalogInputs);});
 const jsonRestored=JSON.parse(JSON.stringify(cfg));
 const tsv=p.parseConfigFromTsv(p.serializeConfigAsTsv(cfg));
 for(const [route,restored]of [['json',jsonRestored],['fullTsv',tsv]]){
  const restoredRow=restored.state.composite[0];
  check(rule.name+' '+route+' unknown metadata',()=>{assert.equal(restoredRow.catalogRuleId,rule.id);assert.equal(restoredRow.excluded,true);assert.equal(restoredRow.note,row.note);assert.deepEqual(json(restoredRow.catalogInputs),row.catalogInputs);});
 }
}
const report={passed:failures.length===0,registered:names,legacyUnknownBuffs:legacy.length,updateWithoutDuplicates:true,inputChanges:true,roundTrips:Object.keys(routes),failures,userStorageWrites:0};
if(process.argv.includes('--report'))fs.writeFileSync(path.join(root,'docs/current-buff-persistence-validation-20261018.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
assert.equal(failures.length,0,'current Buff persistence must preserve calculated quantities; see per-route failures');
