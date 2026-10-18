const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {context,json,root}=require('../tools/benchmark-optimizer.cjs');
const p=context(root,{data:false});p.structuredClone=structuredClone;
vm.runInContext(fs.readFileSync('src/storage/importExport.js','utf8'),p);
const requirements=[{name:'刀剣',current:100,required:41},{name:'戦闘技術',current:0,required:70}];
for(const separator of ['\n','\r\n',String.raw`\n`,String.raw`\\n`])assert.deepEqual(json(p.parseWeaponReqText(['刀剣:100/41','戦闘技術:0/70'].join(separator))),requirements,'legacy/new separator '+JSON.stringify(separator));
const effects=[{key:'custom',name:String.raw`効果A|B;C\D`,value:12.5,unit:'%',scope:'display',note:'複数行\n'+String.raw`C:\new\test;補足|末尾`+'\\'},{key:'custom',name:'別効果;|',value:-3.45678,unit:'',scope:'display',note:String.raw`\;\|\\`}];
assert.deepEqual(json(p.normalizeAdditionalEffects(p.parseAdditionalEffectsText(p.serializeAdditionalEffectsText(effects)))),json(p.normalizeAdditionalEffects(effects)),'inner effect format');
const st=json(vm.runInContext('DEFAULT_STATE()',p));st.skillSim.skills['刀剣']=100;st.skillSim.skills['戦闘技術']=0;st.skillSim.skills['筋力']=100;
st.equipment=[{enabled:true,slot:'武器: 右手',name:'複数スキル武器',weaponDamage:50,weaponReq:requirements,extraEffects:effects}];
st.composite=[{enabled:true,name:'追加効果保存確認',flatAttack:7.123456,extraEffects:effects}];
const inputs={attackType:'attack',raceSelect:'newtar',str:100,spirit:0,weaponDamage:50,targetAC:100},cfg={state:st,inputs},original=JSON.stringify(cfg);
p.fixture=json(st);vm.runInContext('state=fixture',p);
const full=p.parseConfigFromTsv(p.serializeConfigAsTsv(cfg));
const partial={inputs,state:{...json(st),equipment:p.equipmentFromTsvRows(p.parseTsvSections(p.makeTsvSection('equipment',p.equipmentOnlyHeaders(),p.equipmentOnlyRows(st.equipment))).equipment.rows),composite:p.compositeFromTsvRows(p.parseTsvSections(p.makeTsvSection('composite',p.compositeOnlyHeaders(),p.compositeOnlyRows(st.composite))).composite.rows)}};
const expected=p.computeMetrics(st,inputs);
const check=(c,label)=>{const weapon=c.state.equipment.find(r=>r.name==='複数スキル武器');assert.deepEqual(json(weapon.weaponReq),requirements,label+' requirements');for(const row of [weapon,c.state.composite[0]])assert.deepEqual(json(row.extraEffects),json(p.normalizeAdditionalEffects(effects)),label+' extra effects');const m=p.computeMetrics(c.state,inputs);for(const key of ['finalDamage','atk','weaponPerformance'])assert.equal(m[key],expected[key],label+' '+key);};
Object.assign(p,{setInputs:()=>{},renderAll:()=>{},syncSkillSimToCalcInputs:()=>{},calc:()=>{},setImportStatus:()=>{}});
for(const [name,c]of Object.entries({full,partial})){check(c,name);assert.equal(p.applyConfig(c),true);check({inputs,state:json(vm.runInContext('state',p))},name+' apply/reload');check(p.parseConfigFromTsv(p.serializeConfigAsTsv(c)),name+' repeated round trip');}
// Check a boundary where only the second skill changes; it must remain effective.
const qualified=json(st);qualified.skillSim.skills['戦闘技術']=70;
const qualifiedRoundTrip=p.parseConfigFromTsv(p.serializeConfigAsTsv({inputs,state:qualified}));
assert.equal(p.computeMetrics(qualifiedRoundTrip.state,inputs).finalDamage,p.computeMetrics(qualified,inputs).finalDamage);
assert.notEqual(p.computeMetrics(qualified,inputs).finalDamage,expected.finalDamage);
assert.equal(JSON.stringify(cfg),original);
console.log('Nested TSV separators: 2 weapon requirements, legacy separators, escaped effect names/notes, full/partial/repeated import, second-skill boundary and damage parity OK');
