const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {context,json}=require('../tools/benchmark-optimizer.cjs');
const ext=require('../src/calc/combatNumericExtensions.js'),numeric=require('../src/calc/combatNumerics.js');
const conditions=require('../src/ui/combatConditionInputs.js');
let checks=0;const eq=(a,b)=>{assert.deepEqual(json(a),json(b));checks++;};
const row=(value,target='undead',other={})=>({enabled:true,name:'test '+value,tags:'special:latest',stackRule:'latest',special:value,specialTarget:target,...other});
const input={raceSelect:'newtar',str:100,spirit:100,weaponDamage:100,weaponSkill:100,targetAC:100,targetEvasion:100,atkCap:500,targetRace:'undead',attackType:'attack',allowCrit:false};
const parity=[];
for(const worker of [false,true]){
 const p=context(undefined,{worker,catalog:!worker});
 const state=json(vm.runInContext('DEFAULT_STATE()',p));
 for(const k of ['equipment','composite','pct','flat','conv','dmg','special','post','other'])state[k]=[];
 const results=[];
 const calc=(rows,extra={})=>{const s={...state,composite:rows},saved=JSON.stringify(s),m=p.computeMetrics(s,{...input,...extra});eq(JSON.stringify(s),saved);results.push(json(m));return m;};
 for(const values of [[1.5,1.2],[1.2,1.5],[1.5,1.5],[1.2,1.5,1.3]])eq(calc(values.map(v=>row(v))).specialMultiplier,1.5);
 eq(calc([row(1.2),row(1.5,'bird')]).specialMultiplier,1.2);
 eq(calc([row(1.2),row(1.5,'bird')],{targetRace:'bird'}).specialMultiplier,1.5);
 eq(calc([row(1.2),row(1.5,'bird')],{targetRace:'dragon'}).specialMultiplier,1);
 eq(calc([row(1.2),row(1.5,'undead',{excluded:true})]).specialMultiplier,1.2);
 eq(calc([row(1.2),row(1.5,'undead',{enabled:false})]).specialMultiplier,1.2);
 eq(calc([row(1.2,'undead',{tags:'#SPECIAL:latest'}),row(1.5,'bird')]).specialMultiplier,1.2);
 const mixed=[row(1.2,'undead',{magicPct:3}),row(1.5)];
 eq(calc(mixed).stats.magic,calc([row(1.5,'undead',{magicPct:3})]).stats.magic);
 const conversion=row(1.5,'bird',{clientBuffDefinitionId:'13132',convMagicRate:30,tags:'conversion:attack:eisis-blue-angel',stackRule:'score'});
 const both=calc([conversion,row(1.25,'chaos')],{targetRace:'bird'}),only=calc([conversion],{targetRace:'bird'});
 eq(both.specialMultiplier,1.5);eq(both.conversionAtk,only.conversionAtk);assert.ok(both.conversionAtk>0);checks++;
 const duplicate=[row(1.2,'undead',{clientBuffDefinitionId:'9152',magicPct:3}),row(1.2,'undead',{clientBuffDefinitionId:'9152',magicPct:3})];
 eq(calc(duplicate).stats.magic,calc([duplicate[0]]).stats.magic);
 // Other explicit conflict groups still suppress whole rows as before.
 eq(calc([row(1.2,'undead',{tags:'manual-group,special:latest'}),row(1.5,'bird',{tags:'manual-group,special:latest'})]).specialMultiplier,1);
 for(const values of [[.5,.8],[0,0],[1.2,1.5],[]]){
  const s={...state,special:values.map(value=>({enabled:true,value,target:'undead'}))};
  eq(p.computeMetrics(s,input).specialMultiplier,values.length?Math.max(...values):1);
 }
 // An innate weapon bonus remains separate from the selected racial Buff.
 const damage=p.MOE_TECHNIQUE_DAMAGE;
 eq(damage.innatePower(100,true)*calc([row(1.5),row(1.2)]).specialMultiplier,180);
 parity.push(results);
}
eq(parity[0],parity[1]);
const effect=(kind,value,selector,flags=0)=>({kind,value,selector,flags});
const sequence=(rows,draws,options={})=>ext.reactionSequence(rows,{draws,...options});
let q=sequence([{effects:[effect(241,.5,1)]},{effects:[effect(242,1,2)]}],[32767,0]);
eq(q.drawsUsed,2);eq(q.candidates[q.selected].selector,2);
q=sequence([{effects:[effect(242,1,2),effect(241,.5,1)]}],[0,32767]);
eq(q.drawsUsed,1);eq(q.candidates[q.selected].selector,1);
q=sequence([{effects:[effect(241,0,1),effect(241,1,2),effect(242,1,3)]}],[32767,0]);
eq(q.candidates.map(c=>c.selector),[1,3]);eq(q.candidates[q.selected].selector,3);
q=sequence([{effects:[effect(241,.5,1),effect(242,.5,2)]}],[32767]);
eq(q.complete,false);eq(q.candidates[1].requested,null);eq(q.candidates[1].independentUniformPercent,25);
eq(sequence([{effects:[effect(241,1,1,768)]}],[0],{world:1}).selected,0);
eq(sequence([{effects:[effect(241,1,1,256),effect(242,1,2)]}],[0],{world:1}).candidates[0].selector,2);
eq(sequence([{effects:[effect(241,1,1,4096)]}],[0]).selected,null);
eq(sequence([{effects:[effect(241,1,1,4096)]}],[0],{marked:true}).selected,0);
eq(sequence([null,{disabled:true,effects:[effect(241,1,1)]},{effects:[effect(242,1,2)]}],[0]).candidates[0].selector,2);
eq(sequence([{effects:[effect(241,0,1)]}],[0]).selected,0); // Inclusive boundary.
assert.throws(()=>sequence([{effects:[effect(241,1,1)]}],[-1]));checks++;
// Exercise the actual numeric-catalog consumer with a two-reaction definition.
const pages=fs.readdirSync('src/data/generated/combatNumericPages').filter(n=>n.endsWith('.json'));
let bundle,names;
for(const file of pages){const page=JSON.parse(fs.readFileSync('src/data/generated/combatNumericPages/'+file,'utf8'));const b=page.rows.find(b=>b.row.definition?.effects.some(e=>e.kind===241));if(b){bundle=json(b);names=page.skillNames;break;}}
assert.ok(bundle);const d=bundle.row.definition,original=d.effects.find(e=>e.kind===241);
d.effects=[{...original,index:0,value:.5},{...original,index:1,kind:242,value:1}];bundle.row.dependencies=[];
const inputs={world:0,skill:100,magic:100,seed:10,random15:32767,reactionSelected:true,timePeriod:'day',targetMaxHP:500,percentHpGateClear:true,targetAmplificationAllowed:true,resistance:50,targetDefense:100};
const run=extra=>numeric.evaluate(bundle,{...inputs,...extra},names).effects.filter(e=>[241,242].includes(e.kind));
let reactions=run({reactionNextRandom15:0});eq(reactions.map(e=>e.reactionRequested),[false,true]);eq(reactions.map(e=>e.value),[50,50]);
eq(run({random15:0,reactionNextRandom15:0}).map(e=>e.reactionRequested),[true,false]);
eq(run({}).map(e=>e.reactionRequested),[false,null]);
eq(run({reactionSelected:false,reactionNextRandom15:0}).map(e=>e.reactionRequested),[null,null]);
assert.ok(conditions.forBundle(bundle,numeric).has('ReactionNextRandom15'));checks++;
console.log(JSON.stringify({passed:true,checks,mainWorkerParity:true,storageWrites:0}));
