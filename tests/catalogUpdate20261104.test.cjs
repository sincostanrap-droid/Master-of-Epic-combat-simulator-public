const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {context,json}=require('../tools/benchmark-optimizer.cjs');
const data=require('../src/data/generated/catalogUpdate20261104.generated.js');
const num=require('../src/calc/equipmentBuffNumerics.js');
let checks=0;const eq=(a,b)=>{assert.deepEqual(json(a),json(b));checks++;};
const near=(a,b)=>{assert.ok(Math.abs(a-b)<.00004,`${a} / ${b}`);checks++;};
eq(data.equipment.map(r=>r.officialId),[23535,23536,23540,23541,23479]);
const input={raceSelect:'newtar',str:100,spirit:100,weaponDamage:100,weaponSkill:100,targetAC:100,targetEvasion:100,atkCap:500};
const parity=[];
for(const worker of [false,true]){
 const p=context(undefined,{worker,catalog:!worker});
 if(worker)for(const file of ['equipmentCatalog','buffCatalog'])vm.runInContext(fs.readFileSync('src/data/generated/'+file+'.generated.js','utf8'),p);
 const install=()=>vm.runInContext(fs.readFileSync('src/data/generated/catalogUpdate20261104.generated.js','utf8'),p);install();install();
 const items=p.equipmentCatalogItems();
 eq(p.MOE_EQUIPMENT_CATALOG_META.gameUpdateDate,'2026-11-04');eq(p.MOE_EQUIPMENT_CATALOG_META.equipmentCount,p.MOE_EQUIPMENT_CATALOG_GENERATED.length);
 for(const id of [23535,23536,23540,23541,23479])eq(items.filter(r=>r.officialId===id).length,1);
 for(const id of [23537,23538,23539])eq(data.equipment.filter(r=>r.officialId===id).length,0);
 const row=id=>json(p.catalogEquipmentToRow(items.find(r=>r.officialId===id)));
 const arms=row(23535),urn=row(23536),brow=row(23540),horn=row(23541),weapon=row(23479);
 eq([arms.slot,urn.slot,brow.slot,horn.slot],['装飾: 背中','装飾: 腰','装飾: 顔','装飾: 頭']);
 eq([arms.attack,arms.magic,arms.extraHit,arms.extraAvoid,arms.extraAttackDelay],[4,4,4,4,-4]);
 eq([urn.attack,urn.magic,urn.extraAC,urn.extraMaxWeight],[3,3,6,6]);
 eq([brow.attack,brow.extraHit,brow.extraAttackDelay,brow.extraKickAttack,brow.extraKickHit],[3,3,-2,0,0]);
 assert.match(brow.note,/2項目は意味未確認/);checks++;
 eq([horn.attack,horn.magic,horn.extraAttackDelay,horn.extraMagicDelay,horn.equipBuffEnabled],[3,3,-2,-2,false]);
 eq([weapon.attack,weapon.extraHit,weapon.weaponDamage,weapon.weaponAttackInterval,weapon.weaponTwoHanded],[3,5,88,330,'○']);near(weapon.weaponRange,5.1);
 eq(weapon.weaponReq.map(({name,required})=>({name,required})),[{name:'刀剣',required:91},{name:'槍',required:91}]);
 const state=json(vm.runInContext('DEFAULT_STATE()',p));state.composite=[];
 const metrics=[];
 for(const equipment of [arms,urn,brow,horn]){
  state.equipment=[{...equipment,enabled:true}];const before=JSON.stringify(state),capture={};
  const on=p.computeMetrics(state,input,capture),active=json(capture.resolvedBuffState);
  const off=p.computeMetrics({...state,equipment:[{...state.equipment[0],equipBuffEnabled:false}]},input);
  const war=p.computeMetrics(state,{...input,equipmentBuffWorld:1});
  eq(JSON.stringify(state),before);eq(war.stats,off.stats);eq(war.attackDelayBSources,[]);eq(war.skillPlusTotals,{});
  if(equipment.officialId===23535){
   near(on.stats.magic,107.12);near(off.stats.magic,104);
   eq(on.attackDelayBSources.map(r=>r.percent),[15]);
   eq(p.optimizerAttackDelayBSelection({attackDelayBSources:on.attackDelayBSources},{mainWeaponSkill:'素手'}).percent,15);
   const delay=p.collectAttackDpsDelaySourcesPrepared([] ,active);
   const dps=p.calculateAttackDps({cfg:{weaponCategory:'1',weaponDelaySource:'manual',manualWeaponDelay:0,damageSource:'manual',manualDamage:100,attackDelayBuff:0},delayAuto:delay});eq(dps.attackDelayBuff,-15);
   const stronger={name:'stronger',enabled:true,extraEffects:[{key:'attackDelayB',name:'全武器',value:20,unit:'%',scope:'display'}]};
   for(const composite of [[...active.composite,stronger],[stronger,...active.composite]])eq(p.optimizerAttackDelayBSelection({attackDelayBSources:p.attackDelayBSourcesFromResolvedState({composite})},{mainWeaponSkill:'刀剣'}).percent,20);
  }
  if(equipment.officialId===23536){
   eq(on.skillPlusTotals,{'死の魔法':10,'暗黒命令':10});eq(num.collect([...active.composite,...active.composite]).skills,{'死の魔法':10,'暗黒命令':10});
   eq(num.collect(active.composite,1).skills,{});
   eq([urn.equipBuffStRegenPerMinute,urn.equipBuffMpRegenPerMinute,urn.equipBuffStChangePerSecond,urn.equipBuffMpChangePerSecond],[0,0,0,0]);
   assert.match(urn.equipBuffSourceText,/18\.79114.*0\.293857/);checks++;
  }
  if(equipment.officialId===23540){
   eq(p.optimizerAttackDelayBSelection({attackDelayBSources:on.attackDelayBSources},{mainWeaponSkill:'素手'}).percent,15);
   eq(p.optimizerAttackDelayBSelection({attackDelayBSources:on.attackDelayBSources},{mainWeaponSkill:'刀剣'}),null);
  }
  metrics.push(json(on));
 }
 parity.push(metrics);
}
eq(parity[0],parity[1]);
const active=[{enabled:true,clientBuffDefinitionId:14699}];
eq(num.mainAttackSources([...active,...active]).map(r=>r.percent),[15]);eq(num.mainAttackSources(active,1),[]);
eq(num.mainAttackSources([{...active[0],enabled:false}]),[]);eq(num.mainAttackSources([{...active[0],excluded:true}]),[]);
console.log(JSON.stringify({passed:true,checks,mainWorkerParity:true,storageWrites:0,newEquipment:4,updatedWeapon:1,heldCrusaders:2}));
