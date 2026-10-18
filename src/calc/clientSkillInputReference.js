(function(root) {
  'use strict';
  const f=Math.fround;
  function num(v,fallback,label) {const n=Number(v??fallback);if(!Number.isFinite(n)||!Number.isFinite(f(n)))throw new RangeError('Invalid '+label);return f(n);}
  function uint(v,fallback,label) {const n=Number(v??fallback);if(!Number.isInteger(n)||n<0||n>0xffffffff)throw new RangeError('Invalid '+label);return n;}
  // Caller supplies the already active, ordered runtime Buff records.
  // This collector does not resolve equipment, stacking, versions or eligibility.
  function aggregate(buffRecords,kind,selector,options={}) {
    if(![167,196,235].includes(kind))throw new TypeError('Expected167/196/235');
    if(!Array.isArray(buffRecords))throw new TypeError('Expected Buff records');
    selector=uint(selector,0,'runtime skill selector');
    const world=uint(options.world,0,'world'),mark=uint(options.contextMark,0,'context mark');
    let total=0;
    for(const buff of buffRecords) {
      if(!buff||!Array.isArray(buff.effects))throw new TypeError('Expected Buff effects');
      if(buff.flaggedSpecial!=null&&typeof buff.flaggedSpecial!=='boolean')throw new TypeError('flaggedSpecial must be boolean');
      if(buff.flaggedSpecial)continue;
      let subtotal=0;
      for(const e of buff.effects) {
        if(e.kind!==kind||uint(e.selector,0,'effect selector')!==selector)continue;
        const flags=uint(e.flags,0x30,'effect flags');
        if(kind===235) {
          const a=!!(flags&0x100),b=!!(flags&0x200);
          if(a!==b&&(a&&world===1||b&&world!==1))continue;
          if(flags&0x1000&&!(mark&4))continue;
        }
        // Original167/196 collectors do not inspect these effect flags.
        subtotal+=num(e.value,NaN,'effect value');
      }
      total=f(total+subtotal);
      if(!Number.isFinite(total))throw new RangeError('Effect sum exceeds float32');
    }
    return total;
  }
  function fixedBasePhysicalInputs(primarySkillInteger,primarySelector,options={}) {
    primarySkillInteger=uint(primarySkillInteger,1000000,'skill integer');
    if(primarySkillInteger>2147483647)throw new RangeError('Skill integer exceeds signed32');
    primarySelector=uint(primarySelector,0,'primary selector');
    const state=uint(options.casterStateMode,0,'caster state');
    if(![0,1].includes(state))throw new RangeError('Only caster state0/1 is verified');
    const rawSkill=primarySelector?f(primarySkillInteger*f(.0001)):0;
    let hit=rawSkill,powerBonus=0,skillBonus=0,hitBonus=0;
    const cache=options.statCache??{},cacheValue=s=>num(cache[s],0,'stat cache'+s);
    if(state===1) {
      const buffs=options.buffRecords??[];
      hitBonus=aggregate(buffs,167,primarySelector,options);
      powerBonus=aggregate(buffs,196,primarySelector,options);
      skillBonus=aggregate(buffs,235,primarySelector,options);
      hit=f(rawSkill+hitBonus);hit=f(hit+cacheValue(91));
      if([34,35].includes(primarySelector)) {
        hit=f(hit+cacheValue(primarySelector===35?89:90));
        powerBonus=f(powerBonus+cacheValue(primarySelector===35?94:95));
      }
    }
    const added=f(powerBonus+skillBonus),requiredSkill=f(rawSkill+added);
    return {rawSkill,requiredSkill,hitInput:hit,hitBonus167:hitBonus,powerBonus196:powerBonus,
      effectSkillBonus235:skillBonus,casterStateMode:state,serverFinalDamageVerified:false};
  }
  const api=Object.freeze({aggregate,fixedBasePhysicalInputs,defaultCalculationReplacement:false,
    evidence:'physical_skill_input_validation.json; skill_effect_catalog_validation.json',
    scope:'Decoded active Buff aggregation167/196/235 and admitted fixed-base constructor2970 state0/1 inputs. Caches are explicit stat getter values. No live activation, stacking, state2, other Buff effects or server result proof.'});
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.MOE_CLIENT_SKILL_INPUT_REFERENCE=api;
})(globalThis);
