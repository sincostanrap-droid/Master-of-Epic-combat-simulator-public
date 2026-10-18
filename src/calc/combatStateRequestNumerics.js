// Confirmed scalar consumers. Eligibility and propagated recipients stay explicit.
(function(root){'use strict';const f=Math.fround,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const skillLimits=typeof module!=='undefined'&&module.exports?require('./combatResourceFormula.js'):root.MOE_COMBAT_RESOURCE_FORMULA;
 function finite(x,name,a=-100000,b=100000){if(!Number.isFinite(x)||x<a||x>b)throw Error(name+'を指定してください');return f(x);}
 function hostilityPromotion(ordinary,base,promoted){return f(clamp(finite(ordinary,'通常加算後の敵対値',0,10000)+(promoted&&base>0?f(finite(base,'敵対要求')*2):0),0,10000));}
 function hostility(base,before,promoted){
  base=finite(base,'敵対要求の定義値');
  // 57f8c0 -> 569ad0: accepted existing source entry, positive type17 result.
  const after=before==null?null:f(clamp(finite(before,'既存の対象別敵対値',0,10000)+Math.abs(base),0,10000));
  const final=after==null||typeof promoted!=='boolean'?null:hostilityPromotion(after,Math.abs(base),promoted);
  return {request:Math.abs(base),after,final,promoted,before:before==null?null:f(before),reset:base<0,
   scope:base<0?'負のtype17は対象NPCの敵対リストを解除し、関係先NPCへ正の量を要求する。各関係先の受理条件は別。':'正のtype17が受理されたNPCの対象別敵対リストへの要求。',
   remaining:'既存エントリの通常加算と、元順位1以降から先頭へ移った条件下の追加2倍加算。順位決定・新規挿入・伝播先の選択は別処理。最終ターゲット選択/全体総量ではない'};
 }
 function turn(before){const addition=f(Math.PI);return {addition,after:before==null?null:f(finite(before,'変更前の向き')+addition)};}
 function theftInput(before,selector,effects){
  if(![1,2,3].includes(selector)||!Array.isArray(effects)||effects.length>24)throw Error('盗取要求の区分1〜3と採用済み補正を指定してください');
  const basis=finite(before,'盗取要求の補正前入力');let total=basis;
  for(const e of effects){if(![1,2,3].includes(e.selector))throw Error('盗取補正selectorが未確定');if(selector!==3&&(e.selector===3||e.selector===selector))total+=finite(e.value,'盗取補正');}
  return {basis,uncapped:total,requestInput:f(Math.min(total,100)),selector,
   scope:'採用されたkind163のBを、要求区分1/2では一致区分または共通区分3について加算し、上限100。区分3の要求は補正を加算しない。M/Aなし、下限0への補正なし。送信前の補助入力で、成功率%・盗む数量・最終結果ではない'};
 }
 function theftPacket(skillInteger,selector,basis=null,effects=[]){
  if(!Number.isInteger(skillInteger)||skillInteger<0||skillInteger>skillLimits.skillIntegerMax||![1,2,3].includes(selector))throw Error('盗み技能の保存整数と盗取区分を指定してください');
  const auxiliary=basis===null?null:theftInput(basis,selector,effects);
  return {messageType:205,selector,skillInput:skillLimits.scaledSkillInput(skillInteger),auxiliaryInput:auxiliary?.requestInput??null,auxiliary,
   scope:'盗み技能の保存整数×float32(0.0001)を技能入力に、能力88と採用済み163の合成値を別の補助入力に入れる。二つを足し合わせない。補助値未指定は0にしない。サーバー側の対象HP補正・最終成功率・盗取物品/数量とは別。'};
 }
 const motionSelectors=Object.freeze({81:Object.freeze([39,40,57,61,88]),168:Object.freeze([32,36,41,50,102])});
 function appearanceOperation(e,species=null,sex=null){
  if(![77,218].includes(e.kind)||e.qualifier||e.other10||!Number.isInteger(e.selector)||e.selector<0)throw Error('外見変更の参照定義が未照合です');
  const n=Math.trunc(f(finite(e.value,'外見の種族・性別条件',-2147483648,2147483520)))|0;
  if([species,sex].some(v=>v!=null&&(!Number.isInteger(v)||v<0||v>0xffffffff)))throw Error('変身を受ける人物の種族・性別の保存整数を指定してください');
  const conditional=e.kind===218&&n!==0,rem=n%2,requiredSpecies=conditional?Math.trunc(((n+1)|0)/2):null,requiredSex=conditional?(rem===1?1:rem===0?2:null):null;
  const eligible=!conditional?true:species==null||sex==null?null:(rem!==1||sex===1)&&(rem!==0||sex===2)&&requiredSpecies===species;
  return {consumerProved:true,quantity:false,modelReference:e.selector||null,copySelectedAppearance:e.selector===0,eligible,requiredSpecies,requiredSex,
   meaning:e.selector===0?'相手の外見を複製する作用。威力・回復量を持たない。':'指定された姿へ変身する作用。威力・回復量を持たない。',
   scope:'外見変更を受ける人物について判定。種族値はニューター1・エルモニー2・コグニート3・パンデモス4。性別は保存値1/2で指定する。条件一致は外見要求の前段だけで、モデル作成・他の能力作用・実際の採用/復元を保証しない。'};
 }
 // Real191 -> post-load runtime417(public428) -> removal22 runtime418(public429).
 // Native775430/572826/5fa360/5673b0 prove an assignment, not additive healing.
 function revivalRestoration(d,e,maximum=null){
  if(d.id!==191||d.counter!==36000||d.interval!==1||e.kind!==79||e.selector!==428||e.value!==0||e.flags!==48||e.qualifier||e.other10||e.other18)throw Error('解除時回復の参照・入力経路が未照合です');
  if(maximum!=null)finite(maximum,'自動蘇生する使用者の最大HP',1,100000000);
  const requested=10,assigned=maximum==null?null:f(Math.min(requested,f(maximum)));
  return {consumerProved:true,requested,assigned,maximum:maximum==null?null:f(maximum),percent:maximum==null?null:assigned/f(maximum)*100,
   resource:'HP',operation:'assign',sourceId:191,sourceRuntimeId:189,childId:428,childRuntimeId:417,restoreId:429,restoreRuntimeId:418,
   childHoldingSeconds:370/60,
   scope:'自動蘇生の保持効果が受理され、終了時の復帰処理が自分のPCへ正常に適用される条件。HP指定10を0〜最大HPへ制限する。この復帰処理にMP/ST回復は含まれない。6.1667秒は保持効果の公称時間で、死亡から復活までの確定待ち時間ではない。HP保存・死亡/蘇生状態の再現とは別。'};
 }
 function requestOperation(e){
  if(![67,81,90,168,265].includes(e.kind)||e.qualifier||e.other10||!Number.isFinite(e.value))throw Error('位置・追従・動作要求の定義が未照合です');
  if([81,168].includes(e.kind)&&!motionSelectors[e.kind].includes(e.selector)||[67,90,265].includes(e.kind)&&e.selector!==0)throw Error('未照合の動作・位置selectorです');
  const meaning={67:'使用者を、効果が採用された相手の指定位置へ移す要求。移動先座標を渡し、技自身の威力・回復量・移動速度は持たない。',
   81:'対象へ強制動作を要求する。動作を受けられる対象という条件が必要。対象PCの実行中動作を解除する準備経路も持つ。',
   168:'対象へ動作を要求する。強制動作81のPC動作解除の準備経路を通さず、指定動作を要求する。',
   90:'使用者PCに相手を追従するよう要求する。相手がこの要求を受けられる対象型である条件が必要。速度・接近距離・HP量を定義した効果ではない。',
   265:'双方の位置・向きを交換する要求。両者の移動可否により更新される側が変わる。HP量や距離倍率を定義した効果ではない。'}[e.kind];
  return {consumerProved:true,quantity:false,messageType:{67:41,81:40,90:43,168:57,265:42}[e.kind],selector:e.selector,meaning,
   scope:'効果が選択され要求を受理する条件での作用。B・技能・魔力を数量へ変換しない。実動作・追従の時系列、地形補正後の最終位置、受理/終了の状態再現とは別。'};
 }
 function launch(base){const initial=f(finite(base,'跳躍の定義値')*f(.17));return {initial,after:f(Math.max(f(initial-0.009000000543892384),f(-2/3))),scope:'通常空中枝の初期鉛直移動値と次の1更新。毎秒速度/飛距離とは別。特殊移動・接地・衝突なし'};}
 function floating(base,height){base=finite(base,'浮遊の定義値');return {heightOffset:base,increment:height==null?null:finite(height,'浮遊基準からの相対高さ')<=base?0.03333333507180214:0,
  scope:'浮遊mode2000・特殊下降なし。基準高度+B以上へ上昇していない間の1更新鉛直加算。基準高度は開始時の地形照会/保存欄から選ぶため、現在の相対高さを条件入力する。秒換算/最終高度ではない'};}
 function sinking(base,prior){const combined=f(clamp(finite(prior,'この効果を除く鉛直補正',-10,100)+finite(base,'鉛直補正の定義値'),-10,100));return {combined,velocity:f(-clamp(combined*0.004500000271946192,-0.04500000178813934,0.09000000357627869)),
  scope:'移動flag278のbit4が成立し、移動禁止・特殊状態を通過した枝の1更新鉛直値。水面/地形判定を入力条件とする。通常空中の重力式とは別'};}
 function perception(base,raw,distance){
  if(!Number.isInteger(raw)||raw< -128||raw>127)throw Error('計算するNPC索敵系統の定義補正（signed byte）を指定してください');
  const held=f(finite(base,'索敵補正の定義値')*f(.01)),adjusted=clamp(Math.trunc((raw+100)*held)-100,-100,100);
  // 79f6e0 keeps 1 + byte*.01 in x87 until the range multiplication/store.
  const multiplier=1+adjusted*f(.01),after=distance==null?null:f(finite(distance,'補正前の索敵範囲',0,100000)*multiplier);
  return {raw,held,adjusted,multiplier,after,distance:distance==null?null:f(distance),scope:'NPC定義+8c/+8d/+8eのうち計算する系統の値。5bef70の整数切捨て・±100制限後、79fe60の実索敵判定が範囲へ乗算。系統1は角度判定を伴う。対象体格・外周係数・関係判定を含む最終発見可否とは別'};
 }
 function blade(base,multiplier,addition,counter,selector){
  [base,multiplier,addition,counter,selector].forEach(x=>finite(x,'ブレイド要求入力'));
  const scaled=selector>=4000&&selector<4057;
  return {amount:f(f(base)*(scaled?f(f(multiplier)+1):1)),counter:f(counter*(scaled?f(addition)+1:1)),selector,
   scope:'type30の補助量と保持カウンタ入力。最終追撃HP量・秒数・発動回数は未確定。定義B×(M+1)、カウンタ×(A+1)は指定された実行時selector範囲だけ'};
 }
 function cappedMaxHp(base,multiplier,addition,maximum,override){
  [base,multiplier,addition,maximum].forEach(x=>finite(x,'割合HP要求入力',-100000000,100000000));
  if(maximum<1)throw Error('対象の最大HPを1以上で指定してください');
  const b=override==null?f(base):finite(override,'対象分類に対応する保存定義値');
  const percent=clamp(f(b*f(multiplier)+f(addition)),-Math.abs(f(base)),Math.abs(f(base)));
  return {percent,amount:Math.max(-1000,f(Math.min(200,f(maximum)*(percent*f(.01)))))};
 }
 function transfer(base,eligible){
  const limit=Math.trunc(finite(base,'効果移送の定義値'));
  if(eligible!=null&&(!Number.isInteger(eligible)||eligible<0||eligible>10000))throw Error('移送に適合する対象の効果件数を整数で指定してください');
  return {limit:limit<0?null:limit,count:eligible==null?null:limit<0?eligible:Math.min(limit,eligible)};
 }
 function elementalReflection(base,random31,matched,selected){
  finite(base,'属性反射の定義値',0,1);
  if(!Number.isInteger(random31)||random31<0||random31>0x7fffffff)throw Error('防御・反射用31bit乱数を指定してください');
  const threshold=Math.trunc(f(base)*256),roll=random31&255;
  return {threshold,roll,uniformPercent:threshold/256*100,requested:typeof matched==='boolean'&&selected===true?matched&&roll<threshold:null,
   scope:'最初の有効なkind217が選ばれ、異なる相手の魔法分類2・指定属性に一致する条件。乱数の下位8bit < trunc(B×256)。技能/魔力/保持倍率はこの抽選を増幅しない。均等byteの割合と指定乱数の1回判定を区別'};
 }
 function magicBodyGate(active,branch){
  if(typeof branch!=='boolean')throw Error('受ける魔法が分類2・通常本体（特殊要求なし）か指定してください');
  return {blocked:active&&branch,factor:active&&branch?0:1,scope:'5a4970の魔法受信経路。分類2かつ行動+38が0の通常本体を、保持者のkind44状態が遮断する。別行動・後から届くHP要求の無敵とは異なる。1はこのゲートを通過する意味で、他の軽減や最終HP量を保証しない'};
 }
 function tameCapacity(skill,pets,targetLevel){
  const stored=Math.round(finite(skill,'手懐け行動の主技能',0,skillLimits.skillMax)*10000);
  const capacity=f(f(stored*0.00012000000424450263)-finite(pets,'集計対象の既存ペットレベル合計',0,10000));
  if(targetLevel!=null)finite(targetLevel,'手懐け対象レベル',.000001,10000);
  return {capacity,remaining:targetLevel==null?null:f(capacity-f(targetLevel)),levelEligible:targetLevel==null?null:f(capacity-f(targetLevel))>=0,
   scope:'7981d0→798257の通常枠。主技能の格納値×保存係数0.00012000000424450263から、5d2820が数える既存ペットのレベル合計を引く。通常3枠の有効・非格納かつ特殊flag0x20000なしが集計対象。対象にも同flagなし・正のレベルという条件。種族/枠数/残HP/関係の後段抽選とは別'};
 }
 function barrierHits(limit,before){
  if(!Number.isInteger(limit)||limit<1||limit>127)throw Error('回数終了のselector範囲が未対応です');
  if(before==null)return {limit,before:null,after:null,expires:null};
  if(!Number.isInteger(before)||before<0||before>=limit)throw Error('使用済み回数は0以上、終了回数未満で指定してください');
  const after=before+1;return {limit,before,after,expires:after===limit,remaining:limit-after};
 }
 function barrierAbsorb(capacity,damage){
  if(!Number.isInteger(capacity)||capacity<0||capacity>216000)throw Error('計算した障壁容量が範囲外です');
  damage=Math.trunc(finite(damage,'受信HP損傷要求',0,100000000));
  const after=capacity-damage;
  return {before:capacity,damage,after:Math.max(0,after),absorbed:Math.min(capacity,damage),unabsorbed:Math.max(0,-after),exhausted:after<=0};
 }
 function damageRecovery(base,selector,damage){
  if(![1,2,3].includes(selector))throw Error('被害後回復の資源selectorが未対応です');
  damage=Math.trunc(finite(damage,'受信HP損傷要求',0,100000000));
  const amount=f(damage*finite(base,'回復割合の定義値')*f(.01));
  return {damage,amount:Math.max(0,amount),requested:amount>0,resource:['','HP','MP','ST'][selector],messageType:[0,2,4,1][selector]};
 }
 function bodyScale(base){base=finite(base,'体格倍率の定義値',0,100000);if(base<f(.001))throw Error('この体格倍率は608c00の受理下限未満です');return {requested:base,geometry:clamp(base,f(.001),20)};}
 function defenseGate(damage,defense,active){damage=finite(damage,'受信HP損傷要求',-100000000,100000000);defense=finite(defense,'効果保持者の防御力',0,100000);return {before:damage,threshold:defense,after:active&&damage>=0&&damage<=defense?0:damage,blocked:active&&damage>=0&&damage<=defense};}
 function weaponMass(selector,weight){return clamp(1+(finite(weight,'使用武器1個の重量',0,100000)-selector)*f(.03),f(.1),10000);}
 function carnival(category,targetType){if(![3,27,28,29].includes(category)||!['pc','npc'].includes(targetType))throw Error('通常近接攻撃の武器区分と対象PC/NPCを指定してください');return ({3:160,27:250,28:220,29:200})[category]*(targetType==='pc'?1:2);}
 function carnivalDamage(category,targetType,incoming,targetMultiplier){
  const base=carnival(category,targetType);
  finite(incoming,'カーニバル攻撃の外部倍率',0,100000);finite(targetMultiplier,'カーニバル攻撃の対象倍率',0,100000);
  //5a540f/5a5524 etc replace the pre-defense result; do not apply armor again.
  //5a55b4 keeps 1+float32(kind232) in x87 until the final float32 store.
  const scaled=f(base*f(incoming)),fraction=f(targetMultiplier-1),amount=f(scaled*(1+fraction));
  return {base,scaled,amount,incoming:f(incoming),targetFraction:fraction,
   scope:'適合する通常近接攻撃が命中し、kind273・盾・回避・反射・追加軽減が作用しない条件。外部倍率→対象kind232の順でHP要求の前段を計算。防御力・武器倍率・クリティカルは置換前の値なので再適用しない。最終HP減少・全期間の総量とは別'};
 }
 function carnivalResetTotal(amount,count=null){
  if(!Number.isFinite(amount)||amount<0||amount>1e12)throw Error('計算済みのカーニバル1回量が必要です');
  if(count!==null&&(!Number.isInteger(count)||count<0||count>10000))throw Error('各攻撃前に通常リセットを通った適合攻撃回数を0～10000の整数で指定してください');
  return {maximumBetweenResets:1,count,conditionalTotal:count===null?null:amount*count,automaticCount:null,
   scope:'各攻撃前に通常の状態リセットを通り、置換が成立した回数を条件として指定。同じ対象区分・外部倍率・対象倍率での要求量合計。リセットを挟まない2回目は通常攻撃へ戻り、その損傷を0にする意味ではありません。時間内の自動発動回数・自動総量は未確定です。',evidence:'dist/client-numeric-gaps27-20261016/carnival-reset-native-oracle.json'};
 }
 const api=Object.freeze({carnivalResetTotal,appearanceOperation,revivalRestoration,requestOperation,motionSelectors,theftPacket,theftInput,hostility,hostilityPromotion,turn,launch,floating,sinking,perception,blade,cappedMaxHp,transfer,elementalReflection,magicBodyGate,tameCapacity,barrierHits,barrierAbsorb,damageRecovery,bodyScale,defenseGate,weaponMass,carnival,carnivalDamage});if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MOE_COMBAT_STATE_REQUEST_NUMERICS=api;
})(globalThis);
