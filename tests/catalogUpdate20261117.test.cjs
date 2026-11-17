const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {context,json}=require('../tools/benchmark-optimizer.cjs'),num=require('../src/calc/equipmentBuffNumerics.js');
let checks=0;const eq=(a,b)=>{assert.deepEqual(json(a),json(b));checks++;},near=(a,b)=>{assert.ok(Math.abs(a-b)<.0001,`${a} / ${b}`);checks++;};
const input={raceSelect:'newtar',str:100,spirit:100,weaponDamage:100,weaponSkill:100,targetAC:100,targetEvasion:100,atkCap:500},parity=[];
for(const worker of [false,true]){
 const p=context(undefined,{worker,catalog:!worker});
 if(worker)for(const file of ['equipmentCatalog','buffCatalog'])vm.runInContext(fs.readFileSync('src/data/generated/'+file+'.generated.js','utf8'),p);
 const install=()=>vm.runInContext(fs.readFileSync('src/data/generated/catalogUpdate20261117.generated.js','utf8'),p);install();install();
 const items=p.equipmentCatalogItems(),row=id=>json(p.catalogEquipmentToRow(items.find(r=>r.officialId===id)));
 eq(p.MOE_EQUIPMENT_CATALOG_META.gameUpdateDate,'2026-11-17');
 for(const id of [23542,23549,23550,23551])eq(items.filter(r=>r.officialId===id).length,1);
 for(const id of [23544,23552,23553])eq(items.filter(r=>r.officialId===id).length,0);
 const halo=row(23542),cat=row(23549),wear=row(23550),belt=row(23551);
 eq([halo.slot,halo.magic,halo.extraMagicDelay,halo.extraNeutralRes],['装飾: 頭',3,-2,10]);
 eq([cat.slot,cat.magic,cat.extraMP],['装飾: 胸',5,15]);
 eq([wear.attack,wear.extraHit,wear.extraAvoid,wear.magic,wear.extraNeutralRes],[4,4,4,4,10]);near(wear.armorBaseAC,9.2);
 eq([belt.attack,belt.extraST,belt.extraMaxWeight],[3,10,6]);near(belt.armorBaseAC,2.4);
 eq(halo.equipBuffMpRegenPerMinute,0);assert.match(halo.equipBuffSourceText,/説明表示/);checks++;
 const state=json(vm.runInContext('DEFAULT_STATE()',p));state.composite=[];const metrics=[];
 const skills={23542:{},23549:{'破壊魔法':15,'回復魔法':15},23550:{'回復魔法':15,'神秘魔法':15},23551:{'薬調合':15,'包帯':15}};
 for(const item of [halo,cat,wear,belt]){
  state.equipment=[{...item,enabled:true}];const before=JSON.stringify(state),capture={};
  const on=p.computeMetrics(state,input,capture),off=p.computeMetrics({...state,equipment:[{...state.equipment[0],equipBuffEnabled:false}]},input),war=p.computeMetrics(state,{...input,equipmentBuffWorld:1});
  eq(JSON.stringify(state),before);eq(on.skillPlusTotals,skills[item.officialId]);eq(war.stats,off.stats);eq(war.skillPlusTotals,{});
  const active=capture.resolvedBuffState.composite;eq(num.collect([...active,...active]).skills,skills[item.officialId]);eq(num.collect(active,1).skills,{});eq(num.collect(active,1).elements,{});
  const entry={skillName:'回復魔法',definition:{primary_runtime:52,element:2}},bonus=p.MOE_TECHNIQUE_DAMAGE.bonuses(active,entry);
  eq(bonus.elementPct,item.officialId===23542?10:item.officialId===23550?15:0);
  metrics.push(json(on));
 }
 state.equipment=[halo,wear,cat].map(r=>({...r,enabled:true}));const capture={};const together=p.computeMetrics(state,input,capture);
 eq(together.skillPlusTotals,{'回復魔法':30,'神秘魔法':15,'破壊魔法':15});
 near(num.collect(capture.resolvedBuffState.composite).elements[2],.25);
 eq(p.MOE_TECHNIQUE_DAMAGE.bonuses(capture.resolvedBuffState.composite,{skillName:'神秘魔法',definition:{primary_runtime:53,element:2}}).elementPct,25);
 parity.push(metrics);
}
eq(parity[0],parity[1]);
console.log(JSON.stringify({passed:true,checks,mainWorkerParity:true,newEquipment:4,storageWrites:0}));
