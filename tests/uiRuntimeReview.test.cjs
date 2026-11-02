const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {context,json}=require('../tools/benchmark-optimizer.cjs');
const c=context(undefined,{data:false});c.structuredClone=structuredClone;
let calls=0;const originalCalc=c.calc;c.calc=()=>calls++;
const input={value:'100',type:'number',dataset:{},events:{},closest:()=>null,addEventListener(k,f){this.events[k]=f;}};
c.bindCalcRefreshInput(input);c.bindCalcRefreshInput(input);
input.value='101';input.events.input();input.events.change();assert.equal(calls,1,'input/change pair calculates once');
input.value='102';input.events.change();assert.equal(calls,2,'change-only remains supported');
input.value='103';input.events.input();input.value='104';input.events.change();assert.equal(calls,4,'different value must recalculate');
for(const selector of ['#attackDpsRoot','#petBuffCatalogOverlay','.optimizerDetails','#combatCatalogTrial']){
 const el={...input,dataset:{},events:{},closest:q=>q===selector?{}:null};c.bindCalcRefreshInput(el);assert.deepEqual(el.events,{},selector+' owns its events');
}
c.calc=originalCalc;
const events={},panel={open:false,dataset:{},host:{hidden:false},closest(){return this.host;},addEventListener(k,f){events[k]=f;}};
const nodes=new Map();const node=id=>{if(!nodes.has(id))nodes.set(id,{value:'0',textContent:'',innerHTML:'',dataset:{},style:{}});return nodes.get(id);};
c.document={querySelector:q=>q==='.analysisDetails'?panel:null,addEventListener:(k,f)=>events[k]=f};c.byId=node;
const cfg={raceSelect:'newtar',attackType:'attack',str:100,spirit:100,weaponDamage:100,weaponSkill:100,targetAC:100,techMultiplier:1,raceCoeff:0.2};
const st=json(vm.runInContext('DEFAULT_STATE()',c));c.fixture=st;vm.runInContext('state=fixture',c);
c.collectInputs=()=>({...cfg});c.collectConfig=()=>({state:st,inputs:{...cfg}});c.localStorage={setItem(){},getItem(){return null;}};
for(const name of ['ensureTargetRaceSelector','ensureTargetPresetSelector','syncSkillSimToCalcInputs','syncSelectedWeaponToHiddenInputs','syncRaceCoeff','syncBaseMagic','syncAttackTypeUI','syncHeavyTechniqueLabel','updateSlotUI','updateEquipmentSummary','updateTotalStatsSummary','updateHitRateSummary','updateWeaponReqAutoCurrentDisplays','updateSelectedWeaponCalcSummary','updateWeaponSkillModHint','renderShowcaseTab','renderAttackDpsTab','renderTagLinkSummary','updateBuffHeaderStats'])c[name]=()=>{};
node('raceCoeff').value='.2';node('techMultiplier').value='1';c.skillSimDerived=()=>({});c.showcaseTotalStats=()=>[];
const compute=c.computeMetrics;let computes=0;c.computeMetrics=(...args)=>{computes++;return compute(...args);};
const expand=c.expandSkillSimMasteryBuffState;let expansions=0;c.expandSkillSimMasteryBuffState=(...args)=>{expansions++;return expand(...args);};
c.calc();const closed=computes;assert.equal(closed,1,'closed analysis only computes main metrics');
assert.equal(expansions,1,'mastery expansion belongs to computeMetrics, not both caller and callee');
c.setupAnalysisLazyRendering();c.setupAnalysisLazyRendering();panel.open=true;events.toggle();const opened=computes-closed;
assert.ok(opened>=12,'opening computes all secondary tables');assert.match(node('raceTable').innerHTML,/種族/);assert.match(node('valueTable').innerHTML,/攻撃力/);
panel.host.hidden=true;const beforeHidden=computes;c.calc();assert.equal(computes-beforeHidden,1,'other tab does not compute hidden analysis');
panel.host.hidden=false;const beforeReturn=computes;events['moe:main-tab-activated']({detail:{id:'calc'}});assert.ok(computes>beforeReturn);
// Imported names are rendered as text in the tooltip and calculation details.
const payload='<img src=x onerror="throw new Error(1)">',sample=compute(st,cfg);
sample.pctStats.steps=[{key:'magic',name:payload,percent:10,before:100,after:110}];
sample.pctAtkCalc.steps=[{name:payload,percent:10,add:10}];
sample.conv.steps=[{name:payload,source:'magic',base:100,rate:10,add:10}];
c.computeMetrics=()=>sample;panel.open=false;c.calc();
for(const id of ['predictedMagicBreakdown','breakdown']){assert.ok(!node(id).innerHTML.includes('<img'),id);assert.ok(node(id).innerHTML.includes('&lt;img'),id);}
vm.runInContext(fs.readFileSync('src/ui/buildAnalysis.js','utf8'),c);
const old={...sample,stats:{...sample.stats,magic:70},finalDamage:50},now={...sample,stats:{...sample.stats,magic:110},finalDamage:70};
const html=c.compareMetricRows(now,old);assert.match(html,/<th>魔力<\/th><td>70/);assert.match(html,/<td>110/);assert.ok(!html.includes('攻撃間隔'));
assert.match(c.compareMetricRows({...now,finalDamage:null},old),/計算未対応/);
console.log(JSON.stringify({passed:true,closedAnalysisComputes:closed,openingAnalysisComputes:opened,inputChangePairComputes:1,unsafeNamesEscaped:true,presetMagic:'70 -> 110',registeredDataAccessed:false,browser:'VM fixture'}));
