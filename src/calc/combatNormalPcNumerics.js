(function(root){'use strict';
 const combat=typeof module!=='undefined'&&module.exports?require('./clientCombatReference.js'):root.MOE_CLIENT_COMBAT_REFERENCE;
 function compatible(d){return d?.action_type===2&&Array.isArray(d.effects)&&d.effects.length>0&&d.effects.every(e=>e.kind===64&&e.flags===48&&e.selector===0&&(Array.isArray(e.words)?[3,4,6].every(i=>e.words[i]===0):[e.qualifier,e.other10,e.other18].every(v=>v===0)));}
 function damage({confirmed=false,encodedPower=null,defense=null,seed=null,critical=false}={}){
  const base={supported:false,value:null,evidence:'dist/client-numeric-gaps28-20261016/normal-pc-physical-native-oracle.json',
   scope:'発生元と損傷を受ける側が通常PC、命中済み。特殊防御状態・盾・反射・追加の威力/属性/損傷補正なし、外部倍率1の1要求。実HP保存・発動成否・自動反撃回数は別です。'};
  if(confirmed!==true)return {...base,reason:'両者が通常PC・命中済み・追加防御や追加補正なしの条件が未指定です'};
  for(const [v,min,max,label]of [[encodedPower,0,10000,'格納威力'],[defense,0,100000,'損傷を受けるPCの防御力'],[seed,0,0xffffffff,'変動種値']])if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw Error(label+'を有効な数値で指定してください');
  if(!Number.isInteger(encodedPower)||!Number.isInteger(seed)||typeof critical!=='boolean')throw Error('格納威力・種値は整数、クリティカル条件は真偽値です');
  // The PC branch itself was executed in96 native cases. Reuse only the
  // arithmetic whose equality was proved, not the NPC admission conditions.
  const q=combat.physicalNpcAttack({encodedPower,defense,seed,critical,incoming:1});
  return {...base,supported:true,value:q.clientMessageAmount,effectiveDefense:q.effectiveDefense,critical,reason:null};
 }
 const api=Object.freeze({damage,compatible});if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MOE_COMBAT_NORMAL_PC_NUMERICS=api;
})(globalThis);
