(function(root){'use strict';const f=Math.fround,common=typeof module!=='undefined'&&module.exports;
 const skillLimits=common?require('./combatResourceFormula.js'):root.MOE_COMBAT_RESOURCE_FORMULA;
 const ranges=common?require('../data/generated/combatMagicRanges.generated'):root.MOE_COMBAT_MAGIC_RANGES;
 function rangeAddition(base){if(!Number.isFinite(base)||Math.abs(base)>100000)throw Error('射程の保存値が有効範囲外');return (((Math.trunc(f(base)*256)+32768)&65535)-32768)/256;}
 function range(base,id){const addition=rangeAddition(base),d=id==null?null:ranges[id];if(id!=null&&!d)throw Error('射程を確認する魔法を選択してください');return {addition,selected:d,after:d?f(d.base+addition):null};}
 function hold(base,concentration,random15){
  if(!Number.isFinite(base)||!Number.isFinite(concentration)||concentration<0||concentration>skillLimits.skillMax||!Number.isInteger(random15)||random15<0||random15>32767)throw Error('集中力と15bit判定値を指定してください');
  const skill=f(Math.round(concentration*10000)*f(.0001)),addition=f(f(base)*100),threshold=Math.trunc(skill*f(.6)+addition),roll=random15%100;
  const residues=Math.max(0,Math.min(100,threshold+1)),count=327*residues+Math.min(68,residues);
  return {addition,threshold,roll,blocked:roll<=threshold,percent:count/32768*100,
   scope:'通常PCが詠唱中、被害引数が非0、行動flag800000なしの抵抗枝。15bit均等の剰余分布と等号を反映。中断要求自体の発生率とは別'};
 }
 function movement(concentration,held){
  if(!Number.isFinite(concentration)||concentration<0||concentration>skillLimits.skillMax||!Number.isFinite(held)||held<0||held>3)throw Error('集中力と採用済み詠唱移動倍率を指定してください');
  const stored=Math.round(concentration*10000),base=Math.min(1,stored*2.000000165480742e-7+f(.4));
  return {concentration,held:f(held),base,factor:base*f(held),scope:'通常PCの詠唱状態4、詠唱移動許可（kind101または行動flag4）、actor+97cなし・詠唱行動あり・flag800000なしの採用枝。別の10%枝・移動不能枝には流用しない。移動入力に掛ける倍率で、最終速度や毎秒距離ではない'};
 }
 const api=Object.freeze({ranges,range,rangeAddition,hold,movement});if(common)module.exports=api;else root.MOE_COMBAT_CASTING_NUMERICS=api;
})(globalThis);
