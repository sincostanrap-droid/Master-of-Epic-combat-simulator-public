// Conditional numerical consumers; independent of collision and wall-clock cadence.
(function(root){'use strict';const f=Math.fround;
 const skillLimits=typeof module!=='undefined'&&module.exports?require('./combatResourceFormula.js'):root.MOE_COMBAT_RESOURCE_FORMULA;
 function factor(selector,prior){
  if(!Number.isInteger(selector)||selector<0||selector>0xffffffff||!Number.isFinite(prior)||prior<0||prior>1)throw Error('落下の既存倍率を0〜1で指定してください');
  return f(Math.max(f(.001),Math.min(1,f(prior)-(1-(selector|0)*f(.01)))));
 }
 function fallDamage(multiplier,before){
  if(!Number.isFinite(before)||before<0||before>100000)throw Error('この効果を適用する前の落下損傷を指定してください');
  const amount=Math.min(5000,f(f(before)*f(multiplier)));
  return {before:f(before),amount:amount>1?amount:0,emitted:amount>1,scope:'着地損傷枝成立時のHP要求。1以下は要求なし、上限5000。着地高さから軽減前損傷を作る式とは別'};
 }
 function landing(multiplier,height,skill,overload){
  if(![height,skill,overload].every(Number.isFinite)||height<0||height>100000||skill<0||skill>skillLimits.skillMax||overload<0||overload>100000)throw Error('落差・落下耐性・有効な重量超過量を指定してください');
  const threshold=Math.round(skill*10000)/1000000*30+2,excess=f(f(height)-threshold);
  const square=f(excess*excess*f(.8)),weightFactor=1+Math.min(f(overload)*f(.05),1)*3;
  const before=excess>0?square*weightFactor:0,amount=excess>0?Math.min(5000,f(before*f(multiplier))):0;
  return {height:f(height),skill,overload:f(overload),threshold,excess,weightFactor,before:f(before),amount:amount>1?amount:0,emitted:amount>1,
   scope:'通常PCの着地損傷枝。落差−(落下耐性/100×30＋2)の正部分を二乗×0.8し、重量超過による1〜4倍と落下損傷倍率を適用。元float32の格納順、1以下の要求省略、上限5000を反映。水中・落下無効状態などの例外は成立条件として除外'};
 }
 function fallStep(multiplier,before){
  if(!Number.isFinite(before)||before< -1000||before>1000)throw Error('更新前の鉛直移動値を指定してください');
  const velocity=f(before),deceleration=velocity>0?1:f(multiplier),limit=f(f(multiplier)*f(-2/3));
  return {before:velocity,after:f(Math.max(f(velocity-deceleration*0.009000000543892384),limit)),limit,
   scope:'通常の空中更新枝で1更新。上昇中は通常減速、下降中は倍率を反映。座標への合成/衝突前の内部移動値で、毎秒速度ではない'};
 }
 function knockback(vector){
  if(!Array.isArray(vector)||vector.length!==3||!vector.every(v=>Number.isFinite(v)&&Math.abs(v)<=100000))throw Error('吹き飛ばしの3成分が必要です');
  const before=vector.map(f),length=Math.hypot(...before),applied=length>=f(.01);
  return {before,increment:applied?before:[0,0,0],after:applied?before.map(v=>f(v*.5)):[0,0,0],applied};
 }
 function searchDistance(delta){
  if(!Array.isArray(delta)||delta.length!==3||!delta.every(v=>Number.isFinite(v)&&Math.abs(v)<=100000))throw Error('使用者から探索対象への位置差X/Y/Zを指定してください');
  const v=delta.map(f);return Math.sqrt(v[0]*v[0]+v[1]*v[1]+v[2]*v[2]);
 }
 function swim(addition,before){
  if(!Number.isFinite(addition))throw Error('泳ぎ速度加算が未確定です');
  if(before==null)return {contribution:f(addition)*f(.01),before:null,after:null,factor:null};
  if(!Number.isFinite(before)||before<0||before>100000)throw Error('補正前の泳ぎ速度能力を指定してください');
  const after=f(f(before)+f(addition));if(after<0)throw Error('泳ぎ速度能力の下限制限が必要な入力は未対応です');
  return {contribution:f(addition)*f(.01),before:f(before),after,factor:after*f(.01)};
 }
 function impulse(base,angle,delta){
  if(!Array.isArray(delta)||delta.length!==3||!delta.every(v=>Number.isFinite(v)&&Math.abs(v)<=100000))throw Error('使用者から対象への位置差X/Y/Zを指定してください');
  if(!Number.isFinite(base)||Math.abs(base)>100000||!Number.isInteger(angle))throw Error('移動定義の入力範囲外です');
  const v=delta.map(f),length=Math.hypot(...v);if(length<=f(.000001))throw Error('同位置の向き行列による吹き飛ばしは未接続。非同位置の条件を指定してください');
  let direction=v.map(x=>f(x/length));
  if(angle){
   const horizontal=Math.hypot(direction[0],direction[2]);if(horizontal<=f(.000001))throw Error('鉛直方向と回転軸が重なる枝は未確定');
   const x=f(-direction[2]/horizontal),z=f(direction[0]/horizontal),rad=f((angle|0)*0.01745329424738884),c=f(Math.cos(rad)),s=f(Math.sin(rad)),t=f(1-c);
   const matrix=[[f(x*x*t+c),f(-z*s),f(x*z*t)],[f(z*s),c,f(-x*s)],[f(x*z*t),f(x*s),f(z*z*t+c)]];
   direction=matrix.map(row=>f(row[0]*direction[0]+row[1]*direction[1]+row[2]*direction[2]));
  }
  const initial=direction.map(v=>f(v*f(base))),increments=[];let remaining=initial,total=[0,0,0];
  for(let i=0;i<64;i++){const q=knockback(remaining);if(!q.applied)break;increments.push(q.increment);total=total.map((v,j)=>v+q.increment[j]);remaining=q.after;}
  if(knockback(remaining).applied)throw Error('移動更新の上限を超えました');
  return {initial,initialMagnitude:Math.hypot(...initial),first:knockback(initial),updates:increments.length,total,totalMagnitude:Math.hypot(...total),remaining:[0,0,0],angle,decay:.5,rawUnitless:true,
   scope:'単位なしの吹き飛ばし値。1要求の初期ベクトルを毎更新1/2にし、長さ0.01未満で停止するまで加算。他の移動・途中の再付与・衝突なしの条件付き累計。持続親の全要求合計・最終座標・実秒数とは別'};
 }
 const api=Object.freeze({factor,fallDamage,landing,fallStep,knockback,impulse,searchDistance,swim});if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MOE_COMBAT_MOVEMENT_NUMERICS=api;
})(globalThis);
