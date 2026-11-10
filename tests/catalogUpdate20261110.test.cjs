const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {context,json}=require('../tools/benchmark-optimizer.cjs');
let checks=0;const eq=(a,b)=>{assert.deepEqual(json(a),json(b));checks++;};
const near=(a,b)=>{assert.ok(Math.abs(a-b)<.0001,`${a} / ${b}`);checks++;};
const parity=[],input={raceSelect:'newtar',str:100,spirit:100,weaponDamage:100,weaponSkill:100,targetAC:100,targetEvasion:100,atkCap:500};
for(const worker of [false,true]){
 const p=context(undefined,{worker,catalog:!worker});
 if(worker)for(const file of ['equipmentCatalog','buffCatalog'])vm.runInContext(fs.readFileSync('src/data/generated/'+file+'.generated.js','utf8'),p);
 const install=()=>vm.runInContext(fs.readFileSync('src/data/generated/catalogUpdate20261110.generated.js','utf8'),p);install();install();
 const items=p.equipmentCatalogItems(),row=id=>json(p.catalogEquipmentToRow(items.find(r=>r.officialId===id)));
 eq(p.MOE_EQUIPMENT_CATALOG_META.gameUpdateDate,'2026-11-10');
 for(const id of [23537,23538,23539,23543,23545,23540])eq(items.filter(r=>r.officialId===id).length,1);
 for(const id of [23542,23544])eq(items.filter(r=>r.officialId===id).length,0);
 const rose=row(23537),back=row(23538),shield=row(23539),boots=row(23543),bag=row(23545),brow=row(23540);
 eq([rose.magic,rose.extraMP],[4,10]);
 eq([back.slot,back.attack,back.extraAC,back.extraNeutralRes],['装飾: 背中',3,10,20]);
 eq([shield.attack,shield.extraNeutralRes],[3,20]);
 eq([boots.attack,boots.extraKickAttack,boots.extraKickHit,boots.speed,boots.extraAttackDelay],[5,5,5,5,-2]);
 eq([brow.attack,brow.extraHit,brow.extraKickAttack,brow.extraKickHit],[3,3,3,3]);
 eq([bag.magic,bag.extraMaxWeight],[5,15]);
 const state=json(vm.runInContext('DEFAULT_STATE()',p));state.composite=[];
 const metrics=[];
 for(const item of [rose,back,shield,boots,bag]){
  state.equipment=[{...item,enabled:true}];const before=JSON.stringify(state),capture={};
  const on=p.computeMetrics(state,input,capture),off=p.computeMetrics({...state,equipment:[{...state.equipment[0],equipBuffEnabled:false}]},input),war=p.computeMetrics(state,{...input,equipmentBuffWorld:1});
  eq(JSON.stringify(state),before);eq(war.stats,off.stats);eq(war.skillPlusTotals,{});
  if(item.officialId===23537)eq(on.skillPlusTotals,{'破壊魔法':10,'死の魔法':10});
  if(item.officialId===23543){
   eq(on.skillPlusTotals,{'キック':15});
   const entry={skillName:'キック',definition:{primary_runtime:35}};
   const bonus=p.MOE_TECHNIQUE_DAMAGE.bonuses(capture.resolvedBuffState.composite,entry);
   const effects=bonus.skillBuffs.flatMap(r=>r.effects);
   eq(effects.filter(e=>e.kind===167).map(e=>[e.selector,e.value]),[[35,15]]);
   eq(effects.filter(e=>e.kind===235).map(e=>[e.selector,e.value]),[[35,15]]);
  }
  metrics.push(json(on));
 }
 state.equipment=[back,shield].map(r=>({...r,enabled:true}));const capture={};p.computeMetrics(state,input,capture);
 eq(capture.resolvedBuffState.composite.filter(r=>Number(r.clientBuffDefinitionId)===14386&&r.enabled&&!r.excluded).length,1);
 parity.push(metrics);
}
eq(parity[0],parity[1]);
// Execute the production NPC aggregation with preserved saved rows.
const main=fs.readFileSync('src/main.js','utf8'),start=main.indexOf('  function damageTakenMultiplier()'),end=main.indexOf('  function critTakenPct()',start);
assert.ok(start>=0&&end>start);
for(const [values,expected] of [[[10,30],1.3],[[30,10],1.3],[[30,30],1.3],[[-20],1],[[],1],[[-20,10],1.1]]){
 const effects=values.map((value,i)=>({id:'saved-'+i,calcType:'damageTakenPct',value}));effects.push({calcType:'critTakenPct',value:100});
 const before=JSON.stringify(effects),p=vm.createContext({effects});
 near(vm.runInContext(main.slice(start,end)+'damageTakenMultiplier()',p),expected);eq(JSON.stringify(effects),before);
}
console.log(JSON.stringify({passed:true,checks,mainWorkerParity:true,newEquipment:5,correctedEquipment:1,crusadersReleased:2,storageWrites:0}));
