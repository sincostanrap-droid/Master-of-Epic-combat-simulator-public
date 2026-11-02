const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {context,json}=require('../tools/benchmark-optimizer.cjs');
const pet=require('../src/domain/petBuffCatalog');
const {connect}=require('../src/calc/buffNumericRegistration'),numeric=require('../src/calc/combatNumerics');
const c=context(undefined,{data:false});c.structuredClone=structuredClone;
for(const file of ['src/storage/importExport.js','src/storage/shareUrl.js','src/ui/attackDpsResult.js'])vm.runInContext(fs.readFileSync(file,'utf8'),c);
const base=json(vm.runInContext('DEFAULT_STATE()',c));
for(const k of ['equipment','composite','pct','flat','conv','dmg','special','post','other'])base[k]=[];
const inputs={raceSelect:'newtar',attackType:'attack',str:100,spirit:100,weaponDamage:100,weaponSkill:100,targetAC:100};
const control={skill:100,magic:100,world:0,seed:10,targetAmplificationAllowed:true};
const boostPage=JSON.parse(fs.readFileSync('src/data/generated/combatNumericPages/031.json'));
const manaPage=JSON.parse(fs.readFileSync('src/data/generated/combatNumericPages/004.json'));
const boost=boostPage.rows.find(b=>b.row.name==='Boost'),mana=manaPage.rows.find(b=>b.row.name==='アクムレイト マナ');
const boosts=[],manas=[];
for(let chargeStage=1;chargeStage<=5;chargeStage++){
 const row=connect(boost,numeric,{...control,chargeStage},{dmgPct:999},boostPage.skillNames);
 assert.ok(Math.abs(row.dmgPct-5*2**(chargeStage-1))<.00001);
 assert.equal(row.catalogNumeric.values.filter(v=>v.name==='物理威力').length,1);
 assert.equal(row.catalogNumeric.pending.length,0);
 const m=c.computeMetrics({...base,composite:[{...row,enabled:true,slot:true,name:'Boost'}]},inputs);
 const bare=c.computeMetrics(base,inputs);assert.ok(m.finalDamage>bare.finalDamage);
 assert.ok(Math.abs(m.dmgMultiplier-(1+row.dmgPct/100))<.000001);boosts.push({stage:chargeStage,pct:row.dmgPct,damage:m.finalDamage});
}
for(let chargeStage=1;chargeStage<=4;chargeStage++){
 const row=connect(mana,numeric,{...control,chargeStage},{flatAttack:999},manaPage.skillNames);
 assert.ok(row.flatAttack>0&&row.flatAttack<999);assert.equal(row.catalogNumeric.values.filter(v=>v.name==='攻撃力').length,1);
 if(manas.length)assert.ok(row.flatAttack>manas.at(-1).attack);
 manas.push({stage:chargeStage,attack:row.flatAttack,seconds:row.durationSeconds});
}
assert.throws(()=>connect(mana,numeric,{...control,chargeStage:5},{},manaPage.skillNames),/段階/);
assert.throws(()=>connect(boost,numeric,{...control,chargeStage:0},{},boostPage.skillNames),/段階/);
// Browser loader creates a separate stage selector; it is not a skill value.
const loader={structuredClone,MOE_COMBAT_NUMERICS:numeric,MOE_COMBAT_CONDITION_INPUTS:require('../src/ui/combatConditionInputs'),MOE_COMBAT_EFFECT_FORMULAS:require('../src/calc/combatEffectFormulas'),MOE_CATALOG_EFFECT_NAMES:require('../src/data/generated/catalogEffectNames.generated'),MOE_COMBAT_CATALOG_INDEX:{entries:[{key:boost.row.key,page:31},{key:mana.row.key,page:4}]},MOE_REVIEWED_BUFF_CATALOG_MANUAL:[boost,mana].map(b=>({id:b.row.id,wikiPlayerKey:b.row.key,evaluate:()=>({})})),fetch:async url=>({ok:true,json:async()=>url.includes('/031.')?boostPage:manaPage})};
vm.createContext(loader);vm.runInContext(fs.readFileSync('src/calc/buffNumericRegistration.js','utf8'),loader);
async function finish(){
 for(const rule of loader.MOE_REVIEWED_BUFF_CATALOG_MANUAL){await loader.MOE_BUFF_NUMERIC_REGISTRATION.prepare(rule);assert.equal(rule.catalogOptions.find(o=>o.key==='chargeStage').values.length,rule.id==='boost'?5:4);}
 const old={enabled:true,name:'既存のBuff',slot:true,flatAttack:3.125,note:'保存する'},before=JSON.stringify(old);
 for(const [level,count]of [[30,1],[49.9,1],[50,2],[69.9,2],[70,3],[89.9,3],[90,4],[150,4]])assert.equal(pet.build('magia-bit',level).length,count);
 for(const level of ['',null,-1,151,NaN])assert.throws(()=>pet.build('magia-bit',level));
 let rows=pet.replace([old],'magia-bit',150);rows=pet.replace(rows,'magia-bit',90);
 assert.equal(rows.length,5);assert.equal(JSON.stringify(old),before);assert.ok(rows.slice(1).every(r=>!r.fixed&&!r.enabled&&r.slot&&!r.excluded));
 rows=pet.setControls(rows,'magia-bit','enabled',true);
 assert.equal(c.buffSlotCountForState({...base,composite:rows.slice(1)}).total,4);
 assert.equal(pet.build('magia-bit',120).find(r=>r.clientBuffDefinitionId==='9164').extraAttackDelay,-50);
 assert.ok(pet.build('magia-bit',70).find(r=>r.clientBuffDefinitionId==='9162').catalogNumeric.pending.length);
 assert.equal(pet.build('magia-bit',70).find(r=>r.clientBuffDefinitionId==='9162').flatAttack,undefined);
 const both=pet.setControls(pet.replace(rows,'crystal-ana',150),'crystal-ana','enabled',true),resolved=c.resolveAllBuffRowsForGroups({...base,composite:both}).state;
 assert.equal(resolved.composite.filter(r=>r.enabled&&pet.isPet(r)).length,4,'first pet keeps two shared groups');
 const reversed=c.resolveAllBuffRowsForGroups({...base,composite:[...pet.build('crystal-ana',150),...pet.build('magia-bit',90)].map(r=>({...r,enabled:true}))}).state;
 assert.equal(reversed.composite.filter(r=>r.enabled&&pet.isPet(r)).length,4);
 assert.ok(reversed.composite.slice(0,2).every(r=>r.enabled),'first applied wins, not largest quantity');
 const state={...base,composite:rows};c.collectConfig=()=>({state,inputs});
 const routes={tsv:c.parseConfigFromTsv(c.serializeConfigAsTsv({state,inputs})).state,share:c.collectShowcaseShareConfig().state,local:JSON.parse(JSON.stringify(state))};
 const expected=c.computeMetrics(state,inputs);
 for(const [route,restored]of Object.entries(routes)){
  const actual=c.computeMetrics(restored,inputs);assert.equal(actual.finalDamage,expected.finalDamage,route);assert.equal(actual.slots.total,expected.slots.total,route);
  for(const r of rows.slice(1)){const got=c.normalizeCompositeRows(restored.composite).find(q=>q.catalogRuleId===r.catalogRuleId);assert.ok(got,route);for(const key of ['catalogInputs','catalogNumeric','fixed','slot','durationSeconds','stackRule'])assert.deepEqual(json(got[key]),json(r[key]),route+' '+key);}
 }
 // The optimizer must not trade away just one pet Buff to fit its slot budget.
 const worker=context(undefined,{worker:true,data:false});worker.structuredClone=structuredClone;
 const petState={...base,composite:pet.build('magia-bit',90)};
 const settings={objective:'attack',maxSlots:4,topN:1,exactEquipmentLimit:1,buffMode:'local',includeDisabledBuffs:true,evaluateCurrentEquipment:false,includeCurrentConfig:true};
 const optimized=worker.runOptimizerCore({state:petState,inputs,settings});
 assert.ok(optimized.results.length,'four slots accepted');
 const tooSmall=worker.runOptimizerCore({state:petState,inputs,settings:{...settings,maxSlots:3}}).results;
 assert.ok(tooSmall.every(r=>r.compositeIdxs.length===0&&r.metrics.slots.total===0),'package does not fit: omit whole pet, never select one Buff');
 assert.equal(worker.computeMetrics(petState,inputs).finalDamage,c.computeMetrics(petState,inputs).finalDamage);
 const alpha=numeric.evaluate(boost,{...control,resistance:50,targetDefense:100,areaBuffChoice:11779},boostPage.skillNames);
 assert.ok(alpha.effects.every(e=>e.definitionId===11779),'combat trial selects only stage 5');
 assert.equal(numeric.areaBuffOptions(mana).length,4);
 // Search constraint checkboxes must not trigger whole-app calculation.
 const events={},storage=[];c.localStorage={setItem:(...args)=>storage.push(args)};let calcs=0;c.calc=()=>calcs++;
 const el={id:'optimizerRequireCritRate100',dataset:{},closest:q=>q==='.optimizerDetails'?{}:null,addEventListener:(k,f)=>events[k]=f};
 c.bindCalcRefreshInput(el);c.bindCalcRefreshInput(el);assert.deepEqual(Object.keys(events),[]);assert.equal(calcs,0);assert.equal(storage.length,0);
 assert.ok(!/id="optimizerEvaluateCurrentEquipment"[^>]*checked/.test(fs.readFileSync('index.html','utf8')));
 const cfg={weaponCategory:'12',motionProfile:'form477',weaponDelaySource:'manual',manualWeaponDelay:150,damageSource:'manual',manualDamage:100,equipmentBuffDelaySource:'manual',equipmentBuffDelay:-60,stDelayBonus:-10};
 const d=c.calculateAttackDps({cfg}),limit=d.motionBudget.requiredReductionPct;
 assert.ok(d.motionBudget.reachable);assert.ok(d.motionBudget.removableReductionPct>0);
 assert.equal(c.calculateAttackDps({cfg:{...cfg,equipmentBuffDelay:-limit}}).periodSec,d.motionLockSec);
 assert.ok(c.calculateAttackDps({cfg:{...cfg,equipmentBuffDelay:-limit+.1}}).periodSec>d.motionLockSec);
 assert.equal(c.calculateAttackDps({cfg:{...cfg,manualWeaponDelay:300}}).motionBudget.reachable,false);
 const wiki=require('../src/calc/wikiPlayerEffects');assert.equal(wiki.incomplete({catalogRuleId:'boost',catalogNumeric:{version:1,pending:[]}}),false);assert.equal(wiki.incomplete({catalogNumeric:{version:1,pending:[{name:'未確認'}]}}),true);
 console.log(JSON.stringify({passed:true,boosts,manas,petLevel90:{slots:4,attack:expected.atk,damage:expected.finalDamage},dpsBudget:json(d.motionBudget),storageRoutes:Object.keys(routes),constraintCalcCalls:calcs}));
}
finish().catch(e=>{console.error(e);process.exitCode=1;});
