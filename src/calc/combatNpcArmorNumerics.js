(function(root){'use strict';
 const common=typeof module!=='undefined'&&module.exports;
 const delivery=common?require('./clientNativeStatDeliveryReference.js'):root.MOE_CLIENT_NATIVE_STAT_DELIVERY_REFERENCE;
 const f=Math.fround,evidence='dist/client-numeric-gaps29-20261016/npc-armor-native-oracle.json';
 const scope='通常NPCから通常PCへの命中済み物理1要求。通常装備は全て適合・必要技能充足、特殊地域専用装備なし。この防御力補正だけが選択され、補正前後とも能力の上下限制限に掛からない条件。盾・反射・追加損傷補正なし。装備由来の寄与と現在防御力の上限を反映。発生元NPCの技選択・威力生成・実HP保存は別です。';
 function number(v,label,min,max){if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw Error(label+'を指定してください');return v;}
 function defense({defense=null,gearDefense=null,wearSkill=null}={}){
  const R=f(number(defense,'補正を受けるPCの防御力',0,100000)),gear=f(number(gearDefense,'通常装備の基礎防御力合計（全装備適合・必要技能充足）',0,100000));
  const skill=number(wearSkill,'補正を受けるPCの着こなし',0,0x7fffffff/10000),integer=Math.round(skill*10000);
  const rawContribution=f(gear*(integer*f(.0001)+300)*f(1/350)),contribution=Math.min(R,Math.max(0,rawContribution));
  // No intervening float32 store at5a51c9..5a5208. Keep the wide value.
  return {defense:R,gearDefense:gear,wearSkill:skill,rawContribution,contribution,effectiveDefense:R+contribution*f(.2)};
 }
 function damage(state,{power=null,seed=null,critical=false}={}){
  const P=number(power,'相手NPCから届く格納威力（攻撃力表示とは別）',0,10000),S=number(seed,'変動種値',0,0xffffffff);
  if(!Number.isInteger(P)||!Number.isInteger(S)||typeof critical!=='boolean')throw Error('格納威力・変動種値は整数、クリティカルは真偽値です');
  const effectiveDefense=state.effectiveDefense*(S%21+60)*f(.01);
  let amount=f((P*P/(P+effectiveDefense+f(.1))+(S%3-1))*f(.8));
  if(critical)amount=f(amount*f(1.5));return Math.max(0,amount);
 }
 function compatible(e){return [41,147].includes(e?.kind)&&e.selector===5;}
 function project(effect,options={}){
  const base={supported:false,value:null,evidence,scope};
  if(!compatible(effect)||effect.supported!==true)return {...base,reason:'防御力加減算・割合補正の確定した要求量が必要です'};
  if(options.confirmed!==true)return {...base,reason:'通常装備・技能充足・この補正だけ選択・能力の上下限制限なしの条件を指定してください'};
  try{
   const before=defense(options),value=number(effect.value,'選択された防御力補正',-100000,100000),percentage=effect.kind===147;
   if(!delivery.validMessage(4,value,percentage?1:0))return {...base,reason:'この防御力要求量は通常PCの受理範囲外です。受理済みとして比較しません'};
   const change=delivery.change(before.defense,value,percentage),after=defense({...options,defense:change.next});
   const powerOptions={power:options.power??null,seed:options.seed??null,critical:options.critical??false};
   let hit=null,damageReason=null;
   if(powerOptions.power!==null)try{hit={before:damage(before,powerOptions),after:damage(after,powerOptions),power:powerOptions.power,seed:powerOptions.seed,critical:powerOptions.critical};}catch(error){damageReason=error.message;}
   return {...base,supported:true,value:after.effectiveDefense,before,after,change,hit,damageReason,reason:null,
    damageInputNote:'NPCの格納威力は攻撃力表示ではありません。未指定なら有効防御力だけを比較し、損傷量を0にしません。各作用は単独成立時の比較で、複数Buffや参照先を自動合算しません。'};
  }catch(error){return {...base,reason:error.message};}
 }
 const api=Object.freeze({defense,damage,project,compatible,evidence,scope});if(common)module.exports=api;else root.MOE_COMBAT_NPC_ARMOR_NUMERICS=api;
})(globalThis);
