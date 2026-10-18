// Saved695c70 /698d60: recipe slip aggregation and a single accepted stop.
(function(root){'use strict';
 const f=Math.fround,selectors=Object.freeze({31:33,35:37,39:41,43:45,47:49,51:53,55:57,59:61,63:65});
 const evidence='dist/client-numeric-gaps17-20261015/crafting-slip-native-oracle.json';
 const speedSelectors=Object.freeze(Object.fromEntries(Object.entries(selectors).map(([k,v])=>[+k+1,v+1])));
 function finite(v,label){if(v==null||v===''||!Number.isFinite(v)||Math.abs(v)>100000)throw Error(label+'を指定してください');return f(v);}
 function stop(values,random15){
  if(!Array.isArray(values)||values.length<1||values.length>16)throw Error('使用する生産技能の滑り能力を1～16個指定してください');
  if(!Number.isInteger(random15)||random15<0||random15>32767)throw Error('滑り判定用15bit整数を指定してください');
  const clamped=values.map(v=>Math.max(1,Math.min(100,finite(v,'生産技能の滑り能力'))));
  let total=0;for(const value of clamped)total=f(total+value);
  const average=f(total/values.length),divisor=Math.max(1,Math.trunc(average)),slip=random15%divisor;
  // A uniform15-bit draw has32768 outcomes; modulo is not perfectly uniform.
  const cycles=Math.floor(32768/divisor),tail=32768%divisor;
  const mean=(cycles*divisor*(divisor-1)/2+tail*(tail-1)/2)/32768;
  return {supported:true,values:clamped,average,divisor,minimum:0,maximum:divisor-1,random15,slip,
   uniformMean:mean,uniformNoSlipPercent:(cycles+(tail>0?1:0))/32768*100,
   scope:'指定した使用技能を各1～100へ制限し、平均を整数化した値で15bit判定値の剰余を取る。成立した停止1回の滑りマス数。平均は15bit値が均等という条件で、実測の分布・生産成功率ではない',evidence};
 }
 function selected(selector,base,amount,percentage,random15,selectedSelector){
  if(!Object.hasOwn(selectors,selector))return {supported:false,reason:'この生産系統の滑り採用式は未照合'};
  if(selectedSelector!==selector)return {supported:false,modelKnown:true,reason:'計算する生産の種類を選択してください'};
  if(base==null)return {supported:false,modelKnown:true,reason:'補正前の滑り能力を指定してください。未指定を0にしません'};
  const before=finite(base,'補正前の滑り能力'),delta=percentage?f(before*f(.01)*finite(amount,'滑り割合補正')):finite(amount,'滑り能力加算');
  const after=f(before+delta),previous=stop([before],random15),next=stop([after],random15);
  return {...next,before,delta,after,previous,singleSkill:true,
   scope:'選択した1技能を使う生産・この1補正の適用前後。他の効果を含む補正前能力は条件入力。複数技能のレシピは各技能の制限後平均が必要で、1技能の結果へ置き換えない。'+next.scope};
 }
 function speed(values){
  if(!Array.isArray(values)||values.length<1||values.length>16)throw Error('使用する生産技能の速度能力を1～16個指定してください');
  const limited=values.map(v=>Math.max(1,Math.min(500,finite(v,'生産技能の速度能力'))));let total=0;
  for(const value of limited)total=f(total+value);
  return {average:f(total/values.length),values:limited,evidence:'dist/client-numeric-gaps17-20261015/crafting-speed-native-oracle.json'};
 }
 function selectedSpeed(selector,base,amount,percentage,selectedSelector){
  if(!Object.hasOwn(speedSelectors,selector))return {supported:false,reason:'この生産系統の速度採用式は未照合'};
  if(selectedSelector!==selector-1)return {supported:false,modelKnown:true,reason:'計算する生産の種類を選択してください'};
  if(base==null)return {supported:false,modelKnown:true,reason:'補正前の速度能力を指定してください。未指定を0にしません'};
  const before=finite(base,'補正前の速度能力'),delta=percentage?f(finite(amount,'速度割合補正')*f(.01)*before):finite(amount,'速度能力加算'),after=f(before+delta);
  const previous=speed([before]),next=speed([after]);
  return {supported:true,before,delta,after,limitedBefore:previous.average,limitedAfter:next.average,factor:next.average/previous.average,
   scope:'選択した1技能の速度能力。適用前後を各1～500へ制限。実秒への時計換算、他技能との平均、生産成功率は別。補正率そのものと、下限を含む有効倍率を区別する',evidence:next.evidence};
 }
 const api=Object.freeze({selectors,speedSelectors,stop,selected,speed,selectedSpeed,evidence});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MOE_COMBAT_CRAFTING_NUMERICS=api;
})(globalThis);
