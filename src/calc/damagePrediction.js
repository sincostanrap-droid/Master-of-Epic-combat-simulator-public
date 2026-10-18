(function(root) {
  'use strict';
  const combat=typeof module!=='undefined'&&module.exports?require('./clientCombatReference.js'):root.MOE_CLIENT_COMBAT_REFERENCE;
  const f=Math.fround;
  const cache=new Map();
  function number(value,label) {const n=Number(value);if(!Number.isFinite(n)||n<0)throw new RangeError('Invalid '+label);return n;}
  function rolls(power,defense) {
    const key=power+':'+defense;
    if(cache.has(key))return cache.get(key);
    const samples=Array.from({length:21},(_,seed)=>combat.physicalNpcAttack({encodedPower:power,defense,seed}).clientMessageAmount);
    if(cache.size>=2048)cache.delete(cache.keys().next().value);
    cache.set(key,samples);return samples;
  }
  // Product prediction for a normal NPC without a shield. A full arithmetic
  // seed period (134400) covers every defense residue and hit residue equally;
  // live/server random distributions are not inferred from that period.
  function calculate({attack,hit,defense,evasion,powerMultiplier=1,specialMultiplier=1,
    postDefenseMultiplier=1,incoming=1,targetMultiplier=1,criticalRate=0,innateSpecial=false}) {
    attack=number(attack,'attack');hit=number(hit,'hit');defense=f(number(defense,'defense'));
    evasion=f(number(evasion,'evasion'));powerMultiplier=number(powerMultiplier,'power multiplier');
    specialMultiplier=f(number(specialMultiplier,'special multiplier'));
    postDefenseMultiplier=f(number(postDefenseMultiplier,'post-defense multiplier'));
    incoming=f(number(incoming,'incoming'));targetMultiplier=f(number(targetMultiplier,'target multiplier'));
    criticalRate=Math.min(1,number(criticalRate,'critical rate'));
    const preSpecial=f(Math.min(10000,f(attack))*powerMultiplier);
    const innatePower=innateSpecial?f(preSpecial+Math.max(0,preSpecial*f(.2))):preSpecial;
    const power=combat.encodePhysicalPower(f(innatePower*specialMultiplier)).encodedPower;
    const rawHit=Math.trunc(Math.max(0,Math.min(5000,f(hit)))*16);
    const encodedHit=(rawHit+32768)%65536-32768;
    const gate=combat.physicalHitGate({encodedHit,evasion,seed:0});
    const base=rolls(power,defense);
    const apply=(amount,critical)=>{
      if(critical)amount=f(amount*f(1.5));
      amount=f(amount*postDefenseMultiplier);
      amount=amount>0?f(amount*incoming):0;
      return f(amount*targetMultiplier);
    };
    const normal=base.map(value=>apply(value,false)),critical=base.map(value=>apply(value,true));
    const mean=values=>values.reduce((sum,value)=>sum+value,0)/values.length;
    const normalMean=mean(normal),criticalMean=mean(critical);
    const samples=criticalRate===0?normal:criticalRate===1?critical:[...normal,...critical];
    const average=normalMean*(1-criticalRate)+criticalMean*criticalRate;
    const positiveFraction=base.filter(value=>value>0).length/21;
    return {encodedPower:power,encodedHit,hitInput:encodedHit/16,hitThreshold:gate.threshold,
      unboundedHitThreshold:gate.unboundedThreshold,hitRatePct:Math.min(100,gate.threshold+1),
      average,normalMean,criticalMean,minimum:Math.min(...samples),maximum:Math.max(...samples),
      positiveDamageFraction:positiveFraction,criticalRate,
      defenseFactor:power>0?mean(base)/(power*f(.8)):0,
      distributionModel:'uniform-arithmetic-period',liveDistributionVerified:false,serverFinalDamageVerified:false};
  }
  const api=Object.freeze({calculate});
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MOE_DAMAGE_PREDICTION=api;
})(globalThis);
