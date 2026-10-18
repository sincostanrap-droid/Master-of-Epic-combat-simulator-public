(function(root){
 'use strict';
 const f=Math.fround;
 const skillApi=typeof module!=='undefined'&&module.exports?require('./clientSkillInputReference.js'):root.MOE_CLIENT_SKILL_INPUT_REFERENCE;
 const combatApi=typeof module!=='undefined'&&module.exports?require('./clientCombatReference.js'):root.MOE_CLIENT_COMBAT_REFERENCE;
 function number(v,def,label){const n=Number(v??def);if(!Number.isFinite(n))throw new RangeError(label+' must be finite');return n;}
 function single(v,def,label){const n=f(number(v,def,label));if(!Number.isFinite(n))throw new RangeError(label+' exceeds float32');return n;}
 function integer(v,def,lo,hi,label){const n=number(v,def,label);if(!Number.isInteger(n)||n<lo||n>hi)throw new RangeError('Invalid '+label);return n;}
 function flag(v,def,label){v=v??def;if(typeof v!=='boolean')throw new TypeError(label+' must be boolean');return v;}
 function definition(d){if(!d||d.action_type!==2||!Array.isArray(d.effects)||!Number.isFinite(d.base_multiplier)||!Number.isFinite(d.post_defense_multiplier))throw new TypeError('Expected an extracted physical technique definition');return d;}
 const has=(d,k)=>d.effects.some(e=>e.kind===k);
 const rawEffect=(d,k)=>d.effects.find(e=>e.kind===k);
 function allowed(e,input){const a=!!(e.flags&0x100),b=!!(e.flags&0x200);return !(a!==b&&(a&&input.world===1||b&&input.world!==1))&&!(e.flags&0x1000&&!(input.contextMark&4));}
 function selected(d,k,input){return d.effects.find(e=>e.kind===k&&allowed(e,input));}
 // Every type2 definition is supported at the explicit getter/item boundaries.
 // An item class selects the original branch, not the technique name or kind54 alone.
 function power(d,input={},options={}){
  definition(d);
  const world=integer(input.world,0,0,0xffffffff,'world');
  const state=integer(input.casterStateMode,0,0,1,'caster state');
  const contextMark=integer(input.contextMark,0,0,0xffffffff,'context mark');
  const hasTarget=flag(input.hasTarget,true,'hasTarget');
  const itemClass=integer(input.itemClass,NaN,0,0xffffffff,'item class');
  if(![0,0xf0001,0xd0002].includes(itemClass))throw new RangeError('Unsupported item class');
  const flags={world,contextMark};
  const weapon=d.class_runtime===3||itemClass===0xf0001;
  const specialItem=!weapon&&itemClass===0xd0002;
  const projectile=!weapon&&!specialItem&&d.class_runtime===17&&!d.fixed_branch_predicate;
  const skillInteger=integer(input.primarySkillInteger,1000000,0,2147483647,'skill integer');
  const S=d.primary_runtime?f(skillInteger*f(.0001)):0;
  const stat=k=>single(input.stats?.[k],0,'scalar stat'+k);
  let value=weapon||projectile?single(input.weaponAttack,NaN,'weapon getter attack'):
   specialItem?f(single(input.itemPerformance,1,'item performance')*single(input.itemBase,NaN,'item base')*f(.9)):
   d.flags&0x40?0:d.base;
  for(const [k,statId]of [[252,4],[253,6]])if(selected(d,k,flags))value=stat(statId);
  const add=selected(d,254,flags);if(add)value=f(value+stat(6)*add.value*f(.01));
  // Original weapon/projectile constructor adds255/276/270 after the own
  // 252/253/254 basis edits, when a target exists, before cap/multipliers.
  // These supplied source/fraction rows are separate from5fa530's max-cache
  // reference and from the ordinary weapon getter's cached additive.
  if(input.attackConversions!=null){
   if(!Array.isArray(input.attackConversions)||input.attackConversions.length>3)throw new TypeError('Expected ordered attack conversions');
   let previous=-1;
   for(const row of input.attackConversions){
    const order=[255,276,270].indexOf(row.kind);
    if(order<0||order<=previous)throw new RangeError('Invalid attack conversion order');previous=order;
    const source=single(row.source,NaN,'conversion source'),fraction=single(row.fraction,NaN,'conversion fraction');
    if((weapon||projectile)&&hasTarget)value=f(value+source*fraction);
   }
  }
  if(!weapon&&!projectile)value=f(value*(specialItem?1:f(.9))+S*f(.1));
  if(weapon)value=Math.min(10000,value);
  let distanceMultiplier=1;
  if(weapon&&flag(input.rangedWeapon,false,'rangedWeapon')&&hasTarget){
   const distance=single(input.distance,NaN,'distance');if(distance<0)throw new RangeError('Negative distance');
   if(distance<7){distanceMultiplier=distance*f(1/7)*f(.15)+f(.85);value=f(value*distanceMultiplier);}
  }
  const fixed=!weapon&&!projectile&&!specialItem;
  const multiply=specialItem||((weapon||projectile)&&!(weapon&&(d.flags&0x40)))||(fixed&&has(d,54));
  const factors={distanceMultiplier};
  if(multiply){
   const e239=rawEffect(d,239);
   const predicates=input.targetPredicateSelectors??[];
   if(!Array.isArray(predicates)||predicates.some(v=>!Number.isInteger(v)||v<1||v>9))throw new TypeError('Invalid target predicates');
   if(e239&&hasTarget&&predicates.includes(e239.selector)&&!fixed){
    factors.target239=e239.value;value=f(value*e239.value);
   }else{
    if(!fixed){
     let multiplier=d.base_multiplier;const e205=rawEffect(d,205);
     if(e205){const random15=integer(input.random15,NaN,0,32767,'random15');const lo=f(Math.min(e205.value,e205.selector)),span=f(Math.max(e205.value,e205.selector)-lo);multiplier=lo+random15*span*f(1/32767);}
     factors.baseMultiplier=multiplier;value=f(value*multiplier);
    }
    let resourceMultiplier=1;const e258=rawEffect(d,258);
    if(e258){
     const maximum=single(input.resource218,NaN,'resource getter218');
     let current=single(input.resource228,NaN,'resource getter228');
     if(maximum>0&&e258.selector>1&&e258.value>1){
      current=Math.max(0,Math.min(maximum,current));const n=e258.selector-1;
      if(current/maximum<f(.01))resourceMultiplier=e258.value;
      else{const index=Math.min(n,Math.max(0,n-Math.trunc(current/(maximum/n))));resourceMultiplier=1+(e258.value-1)*index/n;}
     }
    }
    factors.resource258=resourceMultiplier;value=f(value*resourceMultiplier);
   }
  }
  const hitGetter=weapon||projectile?single(input.weaponHit,NaN,'weapon getter hit'):S;
  const skillInputs=fixed?skillApi.fixedBasePhysicalInputs(skillInteger,d.primary_runtime,{...input,casterStateMode:state}):null;
  const U=skillInputs?.requiredSkill??S,hit=skillInputs?.hitInput??hitGetter;
  const slope=d.coefficient+(world===1?0:d.extra_coefficient),limit=d.upper_limit+(world===1?0:d.extra_upper_limit);
  let requiredSubfactor=Math.max(f(.1),1+(U-d.required)*slope);if(limit>=1)requiredSubfactor=Math.min(limit,requiredSubfactor);
  // Supplied active/collected Buff247/275 fractions precede requiredSubfactor.
  let beforeRequired=value;
  if(hasTarget&&(weapon||projectile)){
   beforeRequired=f(beforeRequired*(1+single(input.casterPhysicalPowerFraction,0,'physical fraction')));
   beforeRequired=f(beforeRequired*(1+single(input.casterElementStrengthFraction,0,'attribute fraction')));
  }
  const preSpecialPower=f(beforeRequired*requiredSubfactor);
  if(preSpecialPower<0)throw new RangeError('Negative generated power is outside the reference API scope');
  const encoded=combatApi.encodePhysicalPower(preSpecialPower,{...options,caster244:hasTarget?options.caster244:null});
  const encodedHitRaw=Math.trunc(Math.max(0,Math.min(5000,hit))*16);
  return {definitionId:d.id,route:weapon?'weapon':specialItem?'specialItem':projectile?'projectile':'fixed',rawSkill:S,skillInputs,
   preRequiredPower:beforeRequired,requiredSubfactor,preSpecialPower,...encoded,
   encodedHit:(encodedHitRaw+32768)%65536-32768,factors,serverFinalDamageVerified:false};
 }
 // Type18 damage prefix4e20..56f2, then optional gate and absorption. Extra
 // skill handlers/counters/reflections/player defenses are not evaluated.
 function npcDamage(d,input,options={}){
  definition(d);
  const P=integer(input.encodedPower,NaN,0,10000,'encoded power');
  const R=single(input.defense,0,'defense');if(R<0)throw new RangeError('Negative defense');
  const seed=integer(input.seed,0,0,0xffffffff,'seed');
  const defenseIgnored=has(d,164),D=defenseIgnored?0:R*(seed%21+60)*f(.01);
  let amount=f((P*P/(P+D+f(.1))+(seed%3-1))*f(.8));
  if(flag(input.critical,false,'critical'))amount=f(amount*f(1.5));
  const postDefenseMultiplier=has(d,33)?d.post_defense_multiplier:1;
  amount=f(amount*postDefenseMultiplier);
  const e190=rawEffect(d,190);let itemFieldMultiplier=1;
  if(e190){const field=single(input.itemField18,NaN,'item field18');itemFieldMultiplier=Math.min(10000,Math.max(f(.1),1+(field-e190.selector)*f(.03)));amount=f(amount*itemFieldMultiplier);}
  const incoming=single(input.incoming,1,'incoming');if(incoming<0)throw new RangeError('Negative incoming');
  amount=amount>0?f(amount*incoming):0;
  if(options.target232){const v=single(options.target232.value,NaN,'target232');amount=f(amount*(1+v));}
  // The caller proves the original273 sign/element/world/selected-record gate.
  // The wide factor must not acquire an additional float32 store here.
  if(options.target273){if(typeof options.target273.applies!=='boolean')throw new TypeError('Explicit273 eligibility is required');
   if(options.target273.applies)amount=f(amount*(1-single(options.target273.percent,NaN,'selected273 percent')*f(.01)));}
  if(!Number.isFinite(amount))throw new RangeError('Non-finite primary message');
  const generatedAmount=amount;
  if(options.forced197Present!=null&&input.evasion==null)throw new TypeError('Supply evasion for the hit gate');
  const bypass=has(d,214),gateAttempted=input.evasion!=null&&amount>0&&!bypass;
  const hitGate=gateAttempted?combatApi.physicalHitGate(input,{forced197Present:options.forced197Present}):null;
  const evaded=!!hitGate?.evaded;if(evaded)amount=0;
  const drain=rawEffect(d,233)??options.caster234,secondaryMessages=[];
  if(amount>0&&drain){const value=f(amount*single(drain.value,NaN,'drain value')*f(.01));if(value>0&&[1,2,3].includes(drain.selector))secondaryMessages.push({messageType:{1:2,2:4,3:1}[drain.selector],amount:drain.selector===3?value:f(-value),recipient:'caster'});}
  return {definitionId:d.id,encodedPower:P,effectiveDefense:D,defenseIgnored,postDefenseMultiplier,itemFieldMultiplier,generatedAmount,
   clientMessageAmount:amount,messageType:18,secondaryMessages,hitGate,gateAttempted,evaded,definitionBypassesEvasion:bypass,
   successfulHitAssumed:input.evasion==null,otherSkillEffectsEvaluated:false,serverFinalDamageVerified:false};
 }
 const api=Object.freeze({power,npcDamage,defaultCalculationReplacement:false,
  scope:'All1000 original type2 definition power records at explicit item/getter/stat/predicate/random/resource boundaries; state0/1. Damage prefix includes33/164/190, with optional original hit gate/214 and supplied absorption. Full technique effects, live acquisition/Buff selection, state2 skill caches, transformation188/active conversion collectors, innate20%, player/shield defenses and server final HP remain outside this API.'});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MOE_CLIENT_PHYSICAL_TECHNIQUE_REFERENCE=api;
})(globalThis);
