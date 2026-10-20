// DOM and real calculation integration. No real browser or storage operations.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {context,json,root}=require('../tools/benchmark-optimizer.cjs'); // loader only; no benchmark
const api=require('../src/calc/combatCatalogEngine'),numeric=require('../src/calc/combatNumerics'),index=require('../src/data/generated/combatCatalogIndex.generated');
const page=context(root,{data:false}),state=json(vm.runInContext('DEFAULT_STATE()',page));
for(const k of ['equipment','composite','flat','pct','conv','dmg','special','post','other'])state[k]=[];
for(const k of Object.keys(state.skillSim.skills))state.skillSim.skills[k]=100;
const inputs={raceSelect:'newtar',str:100,spirit:100,weaponDamage:100,weaponSkill:100,targetAC:100,targetEvasion:100,attackType:'attack',allowCrit:false,atkCap:500,drunk:50};
const original=JSON.stringify(state),nodes={},events={},requests=[];
function element(tag='div'){return {tag,value:'',checked:false,textContent:'',children:[],handlers:{},addEventListener(k,fn){this.handlers[k]=fn;},replaceChildren(){this.children=[];this.value='';},append(child){this.children.push(child);if(this.tag==='select'&&this.children.length===1)this.value=child.value;}};}
const el=k=>nodes[k]??=element(k==='Select'?'select':'div');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');for(const m of html.matchAll(/id="combatCatalog([^"]+)"/g))el(m[1]);
for(const [k,v]of Object.entries({Skill:100,Magic:100,World:0,Defense:100,Resistance:50,Seed:10,Random15:16384,ItemClass:983041,Amplification:'yes',TimePeriod:'day',Caster:'A',Target:'A',ST:100,MP:100,Material:30,Seconds:60,MaxHP:500,MaxMP:200,ReuseType:1,Concentration:0,ReuseMagicPercent:100,ReuseWeaponPercent:100}))el(k).value=String(v);
el('PercentHpGate').checked=true;el('UseCurrentAttack').checked=true;el('Attack').value='100';
el('PetLevel').value='50';el('CastingMovementFactor').value='1';
let checks=0;const has=(regex)=>{assert.match(el('Numbers').textContent,regex);checks++;};
async function search(text){el('Search').value=text;await el('Search').handlers.input();const choice=el('Select').children.find(r=>r.value);if(choice){el('Select').value=choice.value;await el('Select').handlers.change();}}
let ui;
async function start(){
 for(const k of ['Element2','Element3','Element4','Element5','Element6','Attack','UseCurrentAttack','UseCurrentMagic','Skill','Magic','Select','TimePeriod','Conditions','PeriodicReference','BladeSelected','BladeMode','SummonBaseVariant','GeneratedUnmodified','GeneratedMagic','GeneratedAttack','GeneratedHit','GeneratedNormalNpc','GeneratedRequestsNonOverlapping']){el(k).id='combatCatalog'+k;el(k).type=['UseCurrentAttack','UseCurrentMagic','Conditions','PeriodicReference','BladeSelected','SummonBaseVariant','GeneratedUnmodified','GeneratedNormalNpc','GeneratedRequestsNonOverlapping'].includes(k)?'checkbox':'number';}
 el('Trial').querySelectorAll=()=>['Element2','Element3','Element4','Element5','Element6','Attack','UseCurrentAttack','UseCurrentMagic','Skill','Magic','Select','TimePeriod','Conditions','PeriodicReference','BladeSelected','BladeMode','SummonBaseVariant','GeneratedUnmodified','GeneratedMagic','GeneratedAttack','GeneratedHit','GeneratedNormalNpc','GeneratedRequestsNonOverlapping'].map(el);
 vm.runInNewContext(fs.readFileSync(path.join(root,'src/ui/combatCatalogTrial.js'),'utf8'),ui={
  MOE_COMBAT_RESOURCE_FORMULA:require('../src/calc/combatResourceFormula'),structuredClone,AbortController,setTimeout:fn=>{fn();return null;},clearTimeout:()=>{},MOE_COMBAT_CATALOG_ENGINE:api,MOE_COMBAT_CATALOG_INDEX:index,MOE_COMBAT_NUMERICS:numeric,
  document:{readyState:'complete',getElementById:id=>nodes[id.replace('combatCatalog','')],createElement:element,addEventListener:(k,fn)=>events[k]=fn},
  fetch:async url=>{requests.push(url);return {ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(root,url.split('?')[0]),'utf8'))};},
  collectConfig:()=>({state,inputs}),expandSkillSimMasteryBuffState:s=>s,computeMetrics:page.computeMetrics
 });
 await new Promise(setImmediate);

  for(const f of ['src/storage/importExport.js','src/storage/shareUrl.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),page);
 const bridge=ui.MOE_COMBAT_TRIAL_SETTINGS;
 await search('バースト');
 ui.MOE_COMBAT_CONDITION_INPUTS=require('../src/ui/combatConditionInputs');
 el('Element3').value='20';el('Trial').handlers.input({target:el('Element3')});
 const elementalSaved=json(bridge.capture()),elementalNumbers=el('Numbers').textContent;
 await bridge.restore(elementalSaved);assert.equal(el('Element3').value,'20');assert.equal(el('Numbers').textContent,elementalNumbers);
 el('Element3').value='0';const elementalZero=json(bridge.capture());await bridge.restore(elementalZero);assert.equal(el('Element3').value,'0');
 el('Element3').value='';const elementalBlank=json(bridge.capture());await bridge.restore(elementalBlank);assert.equal(el('Element3').value,'');
 await bridge.restore(null);

 // Manual/current stat sources: actual UI calculation, including valid zero and blank rejection.
 const rerender=()=>el('Trial').handlers.input({target:el('Skill')});
 await search('ヒーリング');el('UseCurrentMagic').checked=false;el('Magic').value='100';rerender();const manualHeal=el('Numbers').textContent;
 el('Magic').value='150';rerender();assert.notEqual(el('Numbers').textContent,manualHeal);
 const currentMagic=page.computeMetrics(state,inputs).stats.magic;
 el('Magic').value=String(currentMagic);rerender();const expectedCurrentHeal=el('Numbers').textContent;
 el('Magic').value='999';el('UseCurrentMagic').checked=true;rerender();assert.equal(el('Numbers').textContent,expectedCurrentHeal);
 let sourceSaved=json(bridge.capture());await bridge.restore(sourceSaved);assert.equal(el('UseCurrentMagic').checked,true);assert.equal(el('Magic').value,'999');assert.equal(el('Numbers').textContent,expectedCurrentHeal);
 el('UseCurrentMagic').checked=false;el('Magic').value='0';rerender();assert.doesNotMatch(el('Numbers').textContent,/数値を入力/);
 el('Magic').value='';rerender();assert.match(el('Numbers').textContent,/数値を入力/);
 el('Magic').value='100';await search('チャージド スラッシュ');el('UseCurrentAttack').checked=false;el('Attack').value='100';rerender();const attack100=el('Numbers').textContent;
 el('Attack').value='200';rerender();assert.notEqual(el('Numbers').textContent,attack100);
 el('Attack').value=String(page.computeMetrics(state,inputs).atk);rerender();const expectedCurrentAttack=el('Numbers').textContent;
 el('Attack').value='999';el('UseCurrentAttack').checked=true;rerender();assert.equal(el('Numbers').textContent,expectedCurrentAttack);
 el('UseCurrentAttack').checked=false;el('Attack').value='0';rerender();sourceSaved=json(bridge.capture());await bridge.restore(sourceSaved);assert.equal(el('UseCurrentAttack').checked,false);assert.equal(el('Attack').value,'0');
 await bridge.restore(null);assert.equal(el('UseCurrentAttack').checked,true);assert.equal(el('UseCurrentMagic').checked,false);

 for(const name of ['マイナー ヒーリング','ムーン フォース','リコール インセクト','フレイムスロワー','ポイズン ブレイド','リモート ボム','マシンガン プレイスメント']){
  await search(name);el('UseCurrentAttack').checked=false;el('Attack').value='0';el('UseCurrentMagic').checked=name==='ムーン フォース';el('Skill').value='83.4567';el('Magic').value='127.8901';el('TimePeriod').value='night';el('Conditions').checked=true;
  if(el('Skills').children.length)el('Skills').children[0].children[0].value='42.1234';
  if(name==='フレイムスロワー')el('PeriodicReference').checked=true;
  if(name==='ポイズン ブレイド'){el('BladeSelected').checked=true;el('BladeMode').value='dual';}
  if(['リモート ボム','マシンガン プレイスメント'].includes(name)){
   el('SummonBaseVariant').checked=true;el('GeneratedUnmodified').checked=true;el('GeneratedMagic').value='137.2468';el('GeneratedAttack').value='112.3456';el('GeneratedHit').value='98.7654';el('GeneratedNormalNpc').checked=true;el('GeneratedRequestsNonOverlapping').checked=true;
   assert.ok(el('GeneratedRequestCounts').children.length>0);
   for(const label of el('GeneratedSkills').children)label.children[0].value='64.321';
   for(const label of el('GeneratedRequestCounts').children)label.children[0].value='3';
   if(name==='リモート ボム')assert.ok(el('GeneratedSkills').children.length>0);
  }
  el('Trial').handlers.input({target:el('Skill')});const before=el('Numbers').textContent,saved=bridge.capture();

  const cfg={state:{...state,combatTrial:saved},inputs};page.collectConfig=()=>cfg;
  const roundTrips=[page.parseConfigFromTsv(page.serializeConfigAsTsv(cfg)).state.combatTrial,page.collectShowcaseShareConfig().state.combatTrial];
  for(const restored of roundTrips){await bridge.restore(null);el('Select').replaceChildren();const pending=bridge.restore(restored);assert.deepEqual(json(bridge.capture()),json(restored),'saving during asynchronous load retains restored conditions');await pending;assert.equal(el('Skill').value,'83.4567');assert.equal(el('Magic').value,'127.8901');assert.equal(el('TimePeriod').value,'night');assert.equal(el('Conditions').checked,true);assert.equal(el('PeriodicReference').checked,saved.fields.combatCatalogPeriodicReference);assert.equal(el('BladeSelected').checked,saved.fields.combatCatalogBladeSelected);assert.equal(el('BladeMode').value,saved.fields.combatCatalogBladeMode);assert.equal(el('Numbers').textContent,before);assert.deepEqual(json(bridge.capture()),json(saved));}
 }
 // Switching technique rebuilds generated inputs and resets technique-specific conditions.
 await search('リモート ボム');el('SummonBaseVariant').checked=true;el('GeneratedUnmodified').checked=true;
 for(const label of el('GeneratedSkills').children)label.children[0].value='61.2345';
 for(const label of el('GeneratedRequestCounts').children)label.children[0].value='7';
 await search('マシンガン プレイスメント');assert.equal(el('GeneratedSkills').children.length,0);assert.equal(el('GeneratedUnmodified').checked,false);
 assert.ok(el('GeneratedRequestCounts').children.every(label=>label.children[0].value===''));
 await search('ポイズン ブレイド');assert.equal(el('PeriodicReference').checked,false);assert.equal(el('BladeSelected').checked,false);
 const roundTripCurrent=async()=>{el('Trial').handlers.input({target:el('Skill')});const saved=bridge.capture(),before=el('Numbers').textContent;const cfg={state:{...state,combatTrial:saved},inputs};page.collectConfig=()=>cfg;
 for(const restored of [page.parseConfigFromTsv(page.serializeConfigAsTsv(cfg)).state.combatTrial,page.collectShowcaseShareConfig().state.combatTrial]){await bridge.restore(null);await bridge.restore(restored);assert.deepEqual(json(bridge.capture()),json(saved));assert.equal(el('Numbers').textContent,before);}};
 el('BladeSelected').checked=true;
 for(const label of el('Skills').children)label.children[0].value='67.8912';
 for(const mode of ['dual','twin','normal','dual']){el('BladeMode').value=mode;await roundTripCurrent();}
 await search('フレイムスロワー');assert.equal(el('BladeSelected').checked,false);el('PeriodicReference').checked=true;await roundTripCurrent();
 await search('マイナー ヒーリング');assert.equal(el('PeriodicReference').checked,false);assert.equal(el('BladeSelected').checked,false);assert.equal(el('GeneratedRequestCounts').children.length,0);await roundTripCurrent();
 await search('マイナー ヒーリング');el('Skill').value='0';el('Magic').value='';el('Conditions').checked=false;const emptySaved=bridge.capture();await bridge.restore(emptySaved);assert.equal(el('Skill').value,'0');assert.equal(el('Magic').value,'');assert.equal(el('Conditions').checked,false);
 // Explicit empty, zero and false must overwrite populated values in both formats.
 for(const name of ['マイナー ヒーリング','リモート ボム','ポイズン ブレイド']){
  await search(name);el('Skill').value='0';el('Magic').value='';el('Conditions').checked=false;el('PeriodicReference').checked=false;el('BladeSelected').checked=false;
  if(name==='リモート ボム'){el('SummonBaseVariant').checked=true;el('GeneratedUnmodified').checked=true;el('GeneratedMagic').value='';el('GeneratedRequestsNonOverlapping').checked=false;for(const label of el('GeneratedSkills').children)label.children[0].value='0';for(const label of el('GeneratedRequestCounts').children)label.children[0].value='0';}
  if(name==='ポイズン ブレイド')for(const [i,label]of el('Skills').children.entries())label.children[0].value=i?'0':'';
  el('Trial').handlers.input({target:el('Skill')});const saved=bridge.capture(),before=el('Numbers').textContent,cfg={state:{...state,combatTrial:saved},inputs};page.collectConfig=()=>cfg;
  for(const restored of [page.parseConfigFromTsv(page.serializeConfigAsTsv(cfg)).state.combatTrial,page.collectShowcaseShareConfig().state.combatTrial]){
   const populated=structuredClone(saved);for(const k of Object.keys(populated.fields))if(typeof populated.fields[k]==='boolean')populated.fields[k]=true;else if(k!=='combatCatalogSelect')populated.fields[k]='100';
   for(const group of ['skills','generatedSkills','requestCounts'])for(const k of Object.keys(populated[group]))populated[group][k]='99';
   await bridge.restore(populated);await bridge.restore(restored);assert.deepEqual(json(bridge.capture()),json(saved));assert.equal(el('Numbers').textContent,before);
  }
 }
 // Legacy files omit combatTrial entirely; exercise the actual applyConfig path.
 let importRestore,autosavedTrial;page.setInputs=()=>{};page.renderAll=()=>{};page.syncSkillSimToCalcInputs=()=>{};page.calc=()=>{autosavedTrial=json(bridge.capture());};page.setImportStatus=()=>{};
 page.MOE_COMBAT_TRIAL_SETTINGS={restore:raw=>{importRestore=bridge.restore(raw);}};
 const legacyConfig={inputs,state:structuredClone(state)};delete legacyConfig.state.combatTrial;
 const oldTsv=page.serializeConfigAsTsv(legacyConfig).replace(/\[combatTrial\][\s\S]*?(?=\n\[|$)/,'');
 assert.ok(!oldTsv.includes('[combatTrial]'));
 for(const name of ['ポイズン ブレイド','リモート ボム'])for(const old of [page.parseConfigFromTsv(oldTsv),legacyConfig]){
  await search(name);el('BladeSelected').checked=true;el('PeriodicReference').checked=true;el('Skill').value='37';el('Magic').value='181';
  assert.equal(page.applyConfig(old),true);await importRestore;
  assert.equal(autosavedTrial.selected,'','legacy import must clear the autosaved selection');
  const cleared=bridge.capture();assert.equal(cleared.selected,'');assert.equal(el('Skill').value,'100');assert.equal(el('Magic').value,'100');assert.equal(el('BladeSelected').checked,false);assert.equal(el('PeriodicReference').checked,false);assert.deepEqual(json(cleared.skills),{});assert.deepEqual(json(cleared.generatedSkills),{});assert.deepEqual(json(cleared.requestCounts),{});assert.doesNotMatch(el('Numbers').textContent,/HPダメージ|HP回復量/);
 }
 // Model reload from the configuration captured by calc, not just the visible UI.
 for(const name of ['ポイズン ブレイド','リモート ボム']){
  await search(name);el('Skill').value='63.4567';el('Magic').value='142.3456';el('TimePeriod').value='night';el('Conditions').checked=true;
  const saved=json(bridge.capture()),cfg={inputs,state:{...state,combatTrial:saved}};page.collectConfig=()=>cfg;
  for(const restored of [page.parseConfigFromTsv(page.serializeConfigAsTsv(cfg)),page.collectShowcaseShareConfig()]){
   await bridge.restore(null);assert.equal(page.applyConfig(restored),true);
   assert.deepEqual(autosavedTrial,saved,'autosave during async restore must capture incoming settings');
   await importRestore;const before=el('Numbers').textContent;
   await bridge.restore(autosavedTrial);assert.deepEqual(json(bridge.capture()),saved);assert.equal(el('Numbers').textContent,before);
  }
 }
 // An inactive reuse selector may be blank or populated before selection.
 // Selecting a technique must rebuild it and discard prior technique conditions.
 for(const name of ['ポイズン ブレイド','リモート ボム','マイナー ヒーリング']){
  await bridge.restore(null);await search(name);el('Trial').handlers.input({target:el('Skill')});
  const clean=json(bridge.capture()),cleanNumbers=el('Numbers').textContent;
  for(const inactive of ['','56']){
   await search('ポイズン ブレイド');el('BladeSelected').checked=true;el('BladeMode').value='dual';el('PeriodicReference').checked=true;
   for(const n of skillInputsForTest())n.value='17.2345';
   await bridge.restore({version:1,selected:'',fields:{combatCatalogBladeSelected:true,combatCatalogSkill:'37'},skills:{神秘魔法:'17'}});
   el('ReuseSkill').value=inactive;await search(name);el('Trial').handlers.input({target:el('Skill')});
   assert.equal(el('ReuseSkill').value,'56',name+' rebuilds the inactive reuse selector');
   assert.deepEqual(json(bridge.capture()),clean,name+' must not inherit prior technique conditions');
   assert.equal(el('Numbers').textContent,cleanNumbers,name+' calculation must match a clean selection');
  }
 }
 function skillInputsForTest(){return el('Skills').children.map(label=>label.children[0]);}
 await bridge.restore({version:1,selected:'not-a-technique',fields:{combatCatalogSkill:'0'}});assert.equal(el('Select').value,'');
 await bridge.restore(null);assert.equal(el('Skill').value,'100');
 assert.equal(JSON.stringify(state),original);console.log('Trial save/restore: healing, conditional Buff, additional skill, periodic reference, blade dual followup, generated skills and request counts; TSV/share and old defaults OK');
}
start().catch(e=>{console.error(e);process.exitCode=1;});
