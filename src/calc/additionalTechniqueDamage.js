(function(root){
  'use strict';
  const common=typeof module!=='undefined'&&module.exports;
  const magic=common?require('./clientMagicReference.js'):root.MOE_CLIENT_MAGIC_REFERENCE;
  const timing=common?require('./effectTiming.js'):root.MOE_EFFECT_TIMING;
  const f=Math.fround,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const ordinal={1:4,2:7,3:8,4:9,5:10,6:11};
  function inputs(entry,c,power){
    if(entry.additionalInput!=='skill')return {actionInput:power.encodedPower,secondaryInput:power.encodedHit/16};
    const converted=Math.round(Math.max(0,c.skill)*10000)*f(.0001);
    const skillApi=common?require('./clientSkillInputReference.js'):root.MOE_CLIENT_SKILL_INPUT_REFERENCE;
    const bonus=skillApi.aggregate(c.skillBuffs||[],235,entry.definition.primary_runtime);
    return {actionInput:Math.trunc(f(f(converted)+bonus)*16)/16,secondaryInput:Math.trunc(converted*16)/16};
  }
  function evaluate(d,input){
    const r=magic.strengthChannels({...d,resistance_ordinal:ordinal[d.element]}, {...input,resistance:d.effects.some(e=>e.kind===164)?0:input.resistance,allowMagicBoost:false});
    const count=timing.counter(d,input.actionInput,input.world||0);
    const deferred=count>0&&d.interval>0;
    // Receiver771a80 stores both channels as signed words in units of 1/256.
    const multiplier=deferred?Math.trunc(clamp(r.multiplier,0,10)*256)/256:r.multiplier;
    const addition=deferred?((Math.trunc(r.addition*256)+32768)&65535)-32768:r.addition;
    const a=deferred?addition/256:addition;
    const rows=d.effects.filter(e=>e.kind===12&&!(e.flags&0x200)&&!(e.flags&0x1000)).map(e=>({
      amount:clamp(f(e.value*multiplier+a),-1000,10000),count:deferred?count:1,
      self:!!(e.flags&1),intervalSeconds:deferred?d.interval/60:0,element:d.element
    }));
    return {...r,count,multiplier,addition:a,rows};
  }
  // The direct weapon receiver supplies fixed M=1/A=0. Share the kind12
  // event filter/count with technique additional damage, bypassing strength.
  function fixedPackets(d){
    const count=timing.counter(d,0);
    return d.effects.filter(e=>e.kind===12&&!(e.flags&0x200)&&!(e.flags&0x1000)&&!(e.flags&1))
      .map(e=>({amount:clamp(f(e.value),-1000,10000),count:count>0&&d.interval>0?count:1,element:d.element}));
  }
  const api=Object.freeze({evaluate,inputs,fixedPackets});
  if(common)module.exports=api;else root.MOE_ADDITIONAL_TECHNIQUE_DAMAGE=api;
})(globalThis);
