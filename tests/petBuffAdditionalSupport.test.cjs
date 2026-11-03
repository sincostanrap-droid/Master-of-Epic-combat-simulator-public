const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {context,json}=require('../tools/benchmark-optimizer.cjs');
const pets=require('../src/domain/petBuffCatalog'),party=require('../src/domain/petParty');
const extensions=require('../src/calc/combatNumericExtensions');
const c=context(undefined,{data:false}),w=context(undefined,{worker:true,data:false});
c.structuredClone=w.structuredClone=structuredClone;
const base=json(vm.runInContext('DEFAULT_STATE()',c));
for(const key of ['equipment','composite','pct','flat','conv','dmg','special','post','other'])base[key]=[];
base.skillSim={...base.skillSim,skills:{...base.skillSim?.skills,'攻撃回避':100}};
const inputs={raceSelect:'newtar',attackType:'attack',str:100,spirit:100,weaponDamage:100,weaponSkill:100,targetAC:100};
const ids=['support-happy','support-mavis','support-charle','halloween-cat','botamochi','shimaenaga-1','shimaenaga-2','shimaenaga-3','guinea-pig','gremlin'];
const row=id=>pets.build(id,150)[0],on=id=>({...row(id),enabled:true});
assert.equal(new Set(pets.catalogs.map(p=>p.id)).size,pets.catalogs.length);
assert.equal(row('support-happy').extraAvoidPct,15);
assert.equal(row('support-mavis').magicPct,10);
assert.equal(row('halloween-cat').speedPct,10);
assert.throws(()=>pets.build('gremlin',69.99));
for(const level of [70,100,150]){
 const g=pets.build('gremlin',level)[0];
 for(const key of ['attackPct','extraHitPct','extraAvoidPct','extraACPct','magicPct'])assert.equal(g[key],15);
 assert.equal(g.slot,true);assert.equal(g.clientBuffDefinitionId,'13735');
 assert.equal(g.catalogNumeric.applied.length,5);
 if(level===150){assert.equal(g.durationSeconds,52);assert.equal(g.catalogNumeric.times[0].estimated,true);}
 else{assert.equal(g.durationSeconds,undefined);assert.ok(g.catalogNumeric.pending.some(x=>x.category==='時間未確認'));}
 assert.equal(g.hpRegenPerMinute,undefined,'instant heals are not natural recovery');
}
assert.throws(()=>party.withSource([row('gremlin')],'gremlin','external'),'owner support is not a verified external area Buff');
for(const id of ids.slice(0,4))assert.equal(row(id).durationSeconds,180);
assert.throws(()=>pets.build('botamochi',59.99));
assert.equal(pets.build('botamochi',60)[0].extraMagicDelayPct,(extensions.selectedReuse(109,75,0).factor-1)*100);
assert.equal(row('botamochi').catalogNumeric.times[0].estimated,true,'wiki 5s is not a proved level formula');
assert.ok(row('support-charle').catalogNumeric.values.every(v=>v.scope==='表示のみ'));
assert.equal(row('support-charle').catalogNumeric.applied.length,0);
assert.match(row('support-charle').note,/消費MP計算には未反映/);
for(const id of ids)assert.ok(!row(id).enabled&&!row(id).fixed&&!row(id).excluded);
for(const id of ['support-happy','support-mavis','support-charle','halloween-cat','shimaenaga-3','guinea-pig'])assert.throws(()=>party.withSource([row(id)],id,'external'));
for(const id of ['botamochi','shushupop'])assert.equal(party.source(party.withSource([row(id)],id,'external')[0]),'external');
for(const [count,resources]of [[1,['HP']],[2,['HP','MP']],[3,['HP','MP','ST']]]){
 const r=row('shimaenaga-'+count),single=r.catalogNumeric.values.filter(v=>v.scope==='周期回復1回分');
 assert.equal(r.slot,false);assert.equal(r.clientBuffDefinitionId,undefined,'wiki-only support has no invented Buff ID');
 assert.equal(r.durationSeconds,undefined);assert.equal(r.catalogNumeric.times.length,0);
 assert.equal(r.catalogNumeric.pending.length,0,'no finite Buff duration is appropriate for proximity healing');
 assert.deepEqual(single.map(v=>v.name),resources.map(s=>s+'回復量'));
 assert.ok(single.every(v=>v.value===10*count&&v.intervalSeconds===10&&v.estimated));
 assert.ok(r.catalogNumeric.values.filter(v=>v.unit.endsWith('/分')).every(v=>v.value===60*count&&v.estimated));
 assert.equal(r.catalogNumeric.applied.length,0);assert.equal(r.hpRegenPerMinute,undefined);
 assert.equal(party.usage({composite:[{...r,enabled:true}]}).own,count);
 assert.equal(party.usage({composite:[{...r,enabled:true}],petParty:{otherPets:1}}).excess,Math.max(0,count-2));
 assert.equal(party.usage({composite:[{...r,enabled:true,excluded:true}]}).own,0);
}
const guinea=row('guinea-pig');
assert.equal(guinea.slot,false);
assert.ok(guinea.catalogNumeric.values.filter(v=>v.unit.endsWith('/分')).every(v=>Math.abs(v.value-600/10.25)<1e-10));
const manual={name:'既存手入力',enabled:false,fixed:true,flatAttack:12.345,note:'変更しない'};
let registered=pets.replace([manual],'shimaenaga-3','');
registered=pets.setControls(registered,'shimaenaga-3','excluded',true);
registered=pets.replace(registered,'shimaenaga-1','');
assert.equal(registered.length,2);assert.deepEqual(registered[0],manual);assert.equal(registered[1].excluded,true);
assert.equal(registered[1].catalogInputs.petId,'shimaenaga-1');
for(const engine of [c,w]){
 const calc=composite=>engine.computeMetrics({...base,composite},inputs),before=calc([]);
 assert.equal(calc([on('support-happy')]).totalStats.avoid,115);
 assert.equal(calc([on('support-mavis')]).totalStats.magic,110);
 assert.equal(calc([on('halloween-cat')]).totalStats.magic,110);
 assert.equal(calc([on('halloween-cat')]).totalStats.speed,110);
 const physical={name:'基礎防御・命中',enabled:true,slot:false,extraAC:100,extraHit:100};
 const gremlin=calc([physical,on('gremlin')]);
 for(const key of ['avoid','magic','defense','hit'])assert.equal(gremlin.totalStats[key],115,key);
 assert.ok(gremlin.atk>calc([physical]).atk);assert.equal(gremlin.slots.total,1);assert.equal(gremlin.petParty.own,1);
 for(const id of ['support-charle','shimaenaga-3','guinea-pig']){
  const actual=calc([on(id)]);assert.deepEqual(json(actual.totalStats),json(before.totalStats));
  assert.equal(actual.finalDamage,before.finalDamage);
  assert.equal(actual.slots.total,id==='support-charle'?1:0);
 }
 assert.equal(calc([on('shimaenaga-3')]).petParty.total,3);
 const settings={objective:'attack',maxSlots:24,topN:1,exactEquipmentLimit:1,buffMode:'local',localPasses:1,includeDisabledBuffs:true,evaluateCurrentEquipment:false,includeCurrentConfig:false};
 const forced={...on('shimaenaga-3'),fixed:true};
 const run=(otherPets,rows)=>engine.runOptimizerCore({state:{...base,petParty:{otherPets},composite:rows},inputs,settings}).results;
 assert.equal(run(1,[forced]).length,0,'three birds plus non-Buff pet cannot be accepted');
 const accepted=run(0,[forced,row('laharl-sd')]);assert.ok(accepted.length);
 assert.ok(accepted.every(r=>r.metrics.petParty.total===3&&r.metrics.slots.total===0),'zero Buff slots do not mean zero pet slots');
}
for(const f of ['src/storage/importExport.js','src/storage/shareUrl.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c);
// Representative valid construction: 2 birds + 1 owner support + an external area support.
const state={...base,composite:[manual,on('shimaenaga-2'),on('gremlin'),...party.withSource([on('botamochi')],'botamochi','external')]};
const snapshot=JSON.stringify(state);c.collectConfig=()=>({state,inputs});
const before=c.computeMetrics(state,inputs);
for(const restored of [c.parseConfigFromTsv(c.serializeConfigAsTsv({state,inputs})).state,c.collectShowcaseShareConfig().state,c.compactPresetConfig({state,inputs}).state,JSON.parse(JSON.stringify(state))]){
 const normalized=json(c.normalizeCompositeRows(restored.composite));
 for(let i=1;i<state.composite.length;i++)for(const key of ['slot','catalogInputs','catalogNumeric','clientBuffDefinitionId','durationSeconds','fixed','excluded'])assert.deepEqual(normalized[i][key],state.composite[i][key],key);
 const actual=c.computeMetrics({...restored,composite:normalized},inputs);
 assert.equal(actual.finalDamage,before.finalDamage);assert.deepEqual(json(actual.totalStats),json(before.totalStats));
 assert.deepEqual(json(actual.petParty),json(before.petParty));assert.equal(actual.slots.total,before.slots.total);
}
assert.equal(JSON.stringify(state),snapshot);
console.log(JSON.stringify({modes:pets.catalogs.length,families:new Set(pets.catalogs.map(p=>p.family||p.id)).size,addedModes:ids.length,verified:['main/Worker values','unlock boundary','display-only separation','ambient zero Buff slots','one to three own pets','bounded optimizer','TSV/share/preset/JSON','existing rows unchanged']}));
