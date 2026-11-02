// Base pet -> constructor1 -> existing Buff engine. No owner skill substitution.
(function(root){'use strict';
 const common=typeof module!=='undefined'&&module.exports;
 const get=(file,name)=>common?require(file):root[name];
 const data=get('../data/generated/petBuffInputs.generated.js','MOE_PET_BUFF_INPUTS');
 function profile(id){return data.profiles[id==='idol-finyu-area'?'idol-finyu':id];}
 function actor(id,level){
  const p=profile(id);if(!p)return null;
  if(typeof level!=='number'||!Number.isFinite(level)||level<0||level>500)throw Error('ペットのレベルを0～500で指定してください');
  const resource=get('./combatResourceFormula.js','MOE_COMBAT_RESOURCE_FORMULA'),a=resource.extendedArithmetic;
  const stored=a.storeSingle(a.multiply(a.multiply(a.single(level),a.single(.01)),a.single(p.skillCoefficient)));
  const skillInteger=a.trunc(a.multiply(a.single(stored),a.single(10000)));
  // Native 643190/6435ce: spirit and all action skills have coefficient100
  // in these six class15/template7 definitions. Other classes are not inferred.
  const baseMagic=a.storeSingle(a.add(a.multiply(a.multiply(a.number(skillInteger),a.single(p.magicCoefficient)),a.single(.0001)),a.single(p.magicBase)));
  const magic=a.storeSingle(a.multiply(a.single(baseMagic),a.single(p.magicMultiplier)));
  return {level:Math.fround(level),skill:skillInteger/10000,skillInteger,magic,unmodified:true};
 }
 function calculate(id,definitionId,level){
  const p=profile(id);if(!p?.definitions.includes(definitionId))return null;
  const source=actor(id,level),d=data.definitions[definitionId];
  const numeric=get('./combatNumerics.js','MOE_COMBAT_NUMERICS');
  const params={skill:source.skill,magic:source.magic,world:0,seed:10,targetAmplificationAllowed:true,targetDefense:0,resistance:0};
  // Constructor1 NPC and PC input assembly use the same skillInteger and
  // float32 magic path. Class15 has no skill bonus; flags252..256 are excluded.
  const row={key:'pet:'+id+':'+definitionId,id:'pet:'+id+':'+definitionId,name:d.name,internalId:d.id,matchStatus:'一致',recipient:'player',definition:d,dependencies:[]};
  const result=numeric.evaluate({row},params,{}),fields={},values=[],estimatedFields=[],replacedFields=new Set();
  for(const e of result.effects){
   if(!e.supported||!Number.isFinite(e.value))continue;
   let targets=e.kind===41?e.fields||[]:[];
   if(e.kind===41&&[16,17].includes(e.selector))targets=[e.selector===16?'extraMagicDelay':'extraAttackDelay'];
   if(e.kind===13&&e.naturalRecovery)targets=[{HP:'hpRegenPerMinute',MP:'mpRegenPerMinute',ST:'stRegenPerMinute'}[e.naturalRecovery.resource]];
   if(e.kind===247&&e.selector===0)targets=['dmgPct'];
   for(const field of targets){fields[field]=e.value;replacedFields.add(field);if(e.estimated)estimatedFields.push(field);}
   if([170,171,274].includes(e.kind))values.push({id:e.id,name:e.kind===274?'魔法ダメージ上昇':e.name,value:e.value,unit:e.unit,scope:e.kind===274?'表示のみ':'周期回復1回分',estimated:!!e.estimated,...(e.intervalSeconds?{intervalSeconds:e.intervalSeconds}:{})});
  }
  return {source,fields,estimatedFields,replacedFields:[...replacedFields],values,
   seconds:result.times.find(t=>t.definitionId===d.id&&t.supported)?.seconds,
   periodicCalculated:result.effects.some(e=>[170,171].includes(e.kind)&&e.supported),
   magicDamageCalculated:result.effects.some(e=>e.kind===274&&e.supported),
   // Unresolved entries are left to their individual wiki/reference handling.
   unresolved:result.effects.filter(e=>!e.supported&&!e.nonNumerical).map(e=>({kind:e.kind,selector:e.selector,reason:e.reason}))};
 }
 const api={actor,calculate,profile};if(common)module.exports=api;else root.MOE_PET_BUFF_FORMULAS=api;
})(globalThis);
