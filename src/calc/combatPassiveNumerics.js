// Saved normal-jump consumer5fb9d0..5fbc96. State admission is a boundary.
(function(root){'use strict';const f=Math.fround;
 const resources=typeof module!=='undefined'&&module.exports?require('./combatResourceFormula.js'):root.MOE_COMBAT_RESOURCE_FORMULA;
 const delivery=typeof module!=='undefined'&&module.exports?require('./clientNativeStatDeliveryReference.js'):root.MOE_CLIENT_NATIVE_STAT_DELIVERY_REFERENCE;
 const actionTiming=typeof module!=='undefined'&&module.exports?require('../data/generated/combatGeneratedActionTiming.generated.js'):root.MOE_COMBAT_GENERATED_ACTION_TIMING;
 function criticalDefinition(e){return e.kind===112&&[1,2].includes(e.selector)&&!e.qualifier&&!e.other10&&!e.other18&&Number.isFinite(e.value)&&Number.isInteger(e.flags)&&!(e.flags&~0x3ff);}
 function petExperienceTransition(before,value,add,eligible){
  if([before,value].some(v=>typeof v!=='number'||!Number.isFinite(v)||Math.abs(v)>100000)||typeof add!=='boolean'||typeof eligible!=='boolean')throw Error('ペット経験値倍率の変更条件が不正です');
  return eligible?f(add?f(value)+f(before)-1:f(before)-f(value)+1):f(before);
 }
 function petExperience(e,{before=null,eligible=null,baseRequest=null,ownerMultiplier=null}={}){
  if(e.kind!==149||e.selector||e.qualifier||e.other10||e.other18||e.flags!==48||!Number.isFinite(e.value)||eligible!==null&&typeof eligible!=='boolean')throw Error('ペット経験値倍率の定義・対象条件が未照合です');
  const after=before===null||eligible===null?null:petExperienceTransition(before,e.value,true,eligible);
  let request=null;if(baseRequest!==null&&ownerMultiplier!==null){if([baseRequest,ownerMultiplier].some(v=>typeof v!=='number'||!Number.isFinite(v)||v<0||v>100000))throw Error('経験値計算の補正前要求と使用者側倍率を指定してください');if(after!==null)request=f(f(baseRequest)*after*f(ownerMultiplier));}
  return {consumerProved:true,standaloneMultiplier:f(e.value),additiveBonus:f(e.value)-1,before:before===null?null:f(before),after,eligible,
   afterRemoval:after===null?null:petExperienceTransition(after,e.value,false,eligible),baseRequest,ownerMultiplier,request,
   scope:'対象型・所有者の条件を満たす自分のペットへ受理された場合。登録時は現在倍率＋定義倍率−1、解除時は現在倍率−定義倍率＋1です。複数の倍率を単純に掛けません。補正後要求は基礎要求×ペット倍率×使用者側の経験値倍率で、経験値から最終レベル増分への変換とは別です。未指定の対象条件・現在倍率・使用者側倍率を0や1へ代用しません。'};
 }
 function criticalProjection(contribution,selector,conditions={}){
  if(!Number.isFinite(contribution)||![1,2].includes(selector))throw Error('クリティカル寄与の定義が不正です');
  const q={consumerProved:true,contribution:f(contribution),selector,before:null,after:null,passed:null,uniformResiduePercent:null,
   scope:'基礎率と攻撃側・被攻撃側の他寄与を指定し、この効果を最後の採用レコードとして加算する条件。各側の集計をfloat32へ保存した後、基礎率を加えて0～1へ制限します。剰余0～999均等の比較値は実測頻度とは別で、命中・発動成否を保証しません。'};
  if([conditions.basePercent,conditions.attackerPoints,conditions.targetPoints].some(v=>v==null))return {...q,reason:'基礎率と両側の他寄与が必要です。未指定を0にはしません'};
  for(const [key,min,max] of [['basePercent',0,100],['attackerPoints',-1000,1000],['targetPoints',-1000,1000]])if(typeof conditions[key]!=='number'||!Number.isFinite(conditions[key])||conditions[key]<min||conditions[key]>max)throw Error('クリティカルの基礎率・他寄与を有効な範囲で指定してください');
  const base=f(conditions.basePercent/100),a=f(conditions.attackerPoints/100),t=f(conditions.targetPoints/100),attacker=selector===1?f(a+f(contribution)):a,target=selector===2?f(t+f(contribution)):t;
  const before=Math.max(0,Math.min(1,t+a+base)),after=Math.max(0,Math.min(1,target+attacker+base)),threshold=after*1000;
  let passed=null;if(conditions.residue!=null){if(!Number.isInteger(conditions.residue)||conditions.residue<0||conditions.residue>999)throw Error('クリティカル抽選用の剰余は0～999の整数です');passed=conditions.residue<threshold;}
  return {...q,base,attacker,target,before,after,threshold,passed,uniformResiduePercent:Math.ceil(threshold)/10,reason:null};
 }
 function petSpecialCommand(e,ready=null){
  if(e.kind!==28||e.selector!==7||e.qualifier||e.other10||e.other18||e.flags!==48||!Number.isFinite(e.value)||ready!==null&&typeof ready!=='boolean')throw Error('ペット特殊行動の定義・条件が未照合です');
  return {consumerProved:true,messageType:20,command:7,ready,quantity:null,petAttackQuantityKnown:false,
   scope:'特殊攻撃を使えるペットへの行動指示。技自身はダメージ量を持たず、ペットが選ぶ攻撃の威力・成否・実行回数は別です。未指定の使用可能条件を成立と扱いません。'};
 }
 function trapRemoval(e,eligible=null){
  if(e.kind!==74||e.selector!==0||e.qualifier||e.other10||e.other18||e.flags!==48||!Number.isFinite(e.value)||eligible!==null&&typeof eligible!=='boolean')throw Error('設置物解除の定義・対象条件が未照合です');
  return {consumerProved:true,messageType:34,eligible,quantity:null,
   scope:'解除対象として適合した設置物へ送る1要求。対象の適合・選択範囲は条件入力です。効果行に損傷量・解除件数・範囲半径の係数はなく、設置物のHPを削る計算とは区別します。実解除の受理・消滅と範囲内の対象数は未再現です。'};
 }
 function equipmentCurse(records=null){
  const q={consumerProved:true,selectedSlot:null,clearedCount:null,after:null,mask:0x400000,
   scope:'現在の装備スナップショット1回の条件付き解除。1～17を昇順に調べ、13を除く最初の適合装備1枠だけ処理します。複数装備の一括解除や、Buff・Debuff全般の解除とは別です。'};
  if(records===null)return {...q,reason:'呪い状態の装備が未指定です。解除0件や解除成功とは扱いません'};
  if(!Array.isArray(records)||records.length>19)throw Error('装備状態は19枠以内の配列で指定してください');
  const seen=new Set();for(const r of records){
   if(!r||!Number.isInteger(r.slot)||r.slot<0||r.slot>18||seen.has(r.slot)||!Number.isInteger(r.kind)||r.kind<0||r.kind>255||!Number.isInteger(r.flags)||r.flags<0||r.flags>0xffffffff||typeof r.empty!=='boolean')throw Error('装備状態の枠・種類・属性が不正です');seen.add(r.slot);
  }
  const selected=records.filter(r=>r.slot>=1&&r.slot<=17&&r.slot!==13&&!r.empty&&r.kind===1&&(r.flags&0x400000)).sort((a,b)=>a.slot-b.slot)[0];
  return {...q,selectedSlot:selected?.slot??null,clearedCount:selected?1:0,after:records.map(r=>({...r,flags:r===selected?(r.flags&~0x400000)>>>0:r.flags})),reason:null};
 }
 function dirtCorrection(amount,before=null){
  if(typeof amount!=='number'||!Number.isFinite(amount)||amount>0||amount< -300)throw Error('汚れの既知の減少補正を指定してください');
  const q={consumerProved:true,runtimeSelector:31,amount:f(amount),before:null,after:null,lower:0,upper:100,
   scope:'効果を受理した通常PCへの能力補正1回。指定した補正前の髪・顔の汚れへ適用し、通常範囲0～100で表示します。毎秒の清潔度回復、自然増加、全Buffの再構築順序や終了後の永続値を示すものではありません。'};
  if(before===null)return q;
  if(typeof before!=='number'||!Number.isFinite(before)||before<0||before>100)throw Error('補正前の汚れを0～100で指定してください');
  // Reuse the verified single type8 consumer. Other cache values are inert
  // scratch entries; selector31 is the only read/written destination here.
  const values=Array(96).fill(0);values[31]=f(before);
  const result=delivery.evaluate({entry:'consumer',message:{type:8,selector:31,amount:f(amount),flags:0},baseValues:values,limits:{lower:0,upper:100},
   context:{mode:2,delay:-1,actorType:1,sourceType:1,sourcePresent:true,targetPresent:true,targetBlocked:0,specialDelivery:0,blockVital:0,statusD4:4,alternate:false,statMode:0,boundStatusByte:0,inactiveObserver:true}});
  return {...q,before:f(before),after:result.values[31],actualChange:f(result.values[31]-f(before))};
 }
 function stateResourceDefinition(e){return [46,50].includes(e.kind)&&e.selector===0&&!e.qualifier&&!e.other10&&!e.other18&&e.flags===48&&Number.isFinite(e.value);}
 function stConsumptionEffect(e,active,baseST=null){
  if(!stateResourceDefinition(e)||e.kind!==50||typeof active!=='boolean')throw Error('ST消費補正の定義・条件が未照合です');
  const projection=baseST==null?null:resources.stConsumption({baseST,doubled:active});
  return {consumerProved:true,mask:128,multiplier:active?2:1,projection,usesRawB:false,stacks:false,
   scope:'受理済みの効果50がSTを消費する通常PCにある条件。登録はbit128のORであり重ねて4倍にはならない。B・M/A・技能で倍率自体は変化しない。入力した基礎STの比較は技能軽減係数・他の消費補正を1とした要求値。NPCへの別作用・実際の成否時消費は別。'};
 }
 function recoverySuppression(e,active){
  if(!stateResourceDefinition(e)||e.kind!==46||typeof active!=='boolean')throw Error('自然回復抑止の定義・条件が未照合です');
  return {consumerProved:true,mask:2048,hpMpProducerSuppressed:active,stRecoverySuppressed:false,buffPeriodicSuppressed:false,usesRawB:false,
   scope:'通常PCの基礎HP/MP回復更新609d60を省略する存在フラグ。ST回復60a160とBuffの継続増減は別経路。過去の累積値・資源残量を0へ上書きする作用ではない。'};
 }
 function actionWaitDefinition(e){return e.kind===178&&e.selector===0&&!e.qualifier&&!e.other10&&!e.other18&&[32,48].includes(e.flags)&&Number.isFinite(e.value)&&Math.abs(e.value)<=1000000;}
 function aiWaitClock(counter,random15=null){
  if(!Number.isInteger(counter)||counter< -2147483648||counter>2147483647)throw Error('AI待機の符号付き整数が未確定です');
  if(random15!==null&&(!Number.isInteger(random15)||random15<0||random15>32767))throw Error('AI待機抽選の15bit整数を指定してください');
  const n=Math.trunc(counter/10),half=Math.trunc(n/2),enabled=counter>0,delta=enabled&&n>1?(random15==null?null:random15%n-half):0;
  return {counter,waitEnabled:enabled,nominalSeconds:enabled?counter/1000:null,selectedSeconds:enabled&&delta!==null?(counter+delta)/1000:null,minimumSeconds:enabled?(counter-(n>1?half:0))/1000:null,maximumSeconds:enabled?(counter+(n>1?n-1-half:0))/1000:null,random15,
   scope:'通常時計の共通AI待ち判定。正の待ち値をミリ秒として使い、初期化時の乱数補正を加えた公称閾値。0以下はこの待ち枝を省略。時計の特殊モード・時刻0の番兵境界、行動の詠唱/動作や次の対象選択は別条件。個々の攻撃間隔や自動発動回数ではない',evidence:'dist/client-numeric-gaps26-20261016/clock-binding.json'};
 }
 function generatedActionTime(id,random15=null,elapsedSeconds=null){
  const record=actionTiming.byAction[id];if(!record)return null;
  if(random15!==null&&(!Number.isInteger(random15)||random15<0||random15>32767))throw Error('個別AI待ち抽選の15bit整数を指定してください');
  const x=resources.extendedArithmetic,c=actionTiming.constants;
  const duration=r=>x.trunc(x.multiply(x.multiply(x.add(x.multiply(x.number(r),x.single(c['0x90c674'])),x.single(c['0x945a14'])),x.single(record.baseSeconds)),x.single(c['0x921a00'])));
  const ms=random15===null?null:duration(random15%3000);let elapsedMs=null;
  if(elapsedSeconds!==null){if(!Number.isFinite(elapsedSeconds)||elapsedSeconds<0||elapsedSeconds>86400||Math.abs(elapsedSeconds*1000-Math.round(elapsedSeconds*1000))>1e-6)throw Error('個別AI待ち登録後の経過を1ms刻み・0～86400秒で指定してください');elapsedMs=Math.round(elapsedSeconds*1000);}
  return {baseSeconds:record.baseSeconds,durationMs:ms,seconds:ms===null?null:ms/1000,minimumSeconds:duration(0)/1000,maximumSeconds:duration(2999)/1000,elapsedSeconds,remainingSeconds:ms===null||elapsedMs===null?null:Math.max(0,ms-elapsedMs)/1000,ruleKey:record.ruleKey,evidence:actionTiming.evidence,
   scope:'保存済み第0亜種で選択・開始された個別AI行動の待ち登録。基準秒に抽選補正を掛け、ミリ秒へ切捨て。共通AI待ち・詠唱・動作・対象選択とは別の条件であり、この値だけから実攻撃間隔や寿命内の自動発動回数を算出しない'};
 }
 function actionWait(records,{baseCounter=null,exempt=false,actionGroup=0,listEnabled=true,random15=null}={}){
  if(!Array.isArray(records)||records.length>24||typeof exempt!=='boolean'||typeof listEnabled!=='boolean'||![0,3].includes(actionGroup)||baseCounter!==null&&(!Number.isInteger(baseCounter)||baseCounter<0||baseCounter>2147483647))throw Error('AI行動待機の条件・基礎整数を正しく指定してください');
  let addition=0;
  if(listEnabled&&!exempt)for(const record of records){
   const e=(record.effects||[]).find(e=>e.kind===178);if(!e)continue;
   if(!actionWaitDefinition(e))throw Error('未照合のAI行動待機補正です');
   addition=(addition+Math.trunc(f(e.value)*1000))|0;
  }
  const after=actionGroup===3?0:baseCounter===null?null:(baseCounter+addition)|0,timer=after===null?null:aiWaitClock(after,random15);
  return {consumerProved:true,addition,additionSeconds:addition/1000,after,baseCounter,exempt,actionGroup,listEnabled,timer,
   waitingDisabled:actionGroup===3||after!==null&&after<=0,seconds:timer?.selectedSeconds??null,
   scope:'保存リストを持つAIの共通行動待機。各定義の最初の効果178のB×1000を切り捨ててミリ秒加算し、M/Aは使わない。対象の除外条件では加算なし、行動区分3では待ち枝を省略。詠唱・動作を含む攻撃間隔や、PC全般の再使用待ちとは別。'};
 }
 // Saved constants92704c/943500/9434fc. The upper value differs by one
 // float32 ULP from fround(7*Math.PI/4), which changes the boundary decision.
 const turn=6.2831854820251465,facingLower=0.7853981852531433,facingUpper=5.4977874755859375;
 function facingRequirement(sourceYaw=null,targetYaw=null){
  const q={consumerProved:true,lower:facingLower,upper:facingUpper,turn,normalizedDifference:null,allowed:null,
   scope:'技使用前の向き差の検査。使用者の向き−対象の向きを内部角度0～6.2831854820へ正規化し、0.7853981853以下または5.4977874756以上を許可（境界を含む、概ね±45度）。相対座標・命中・他の発動条件の成立とは別。'};
  if(sourceYaw==null||targetYaw==null)return {...q,reason:'使用者・対象の向きが未指定です。背面条件成立や向き0とは扱いません'};
  if([sourceYaw,targetYaw].some(v=>typeof v!=='number'||!Number.isFinite(v)||Math.abs(v)>100))throw Error('使用者・対象の有限な内部角度を−100～100で指定してください');
  let d=f(f(sourceYaw)-f(targetYaw));
  if(d>turn){while(d>turn)d-=turn;d=f(d);}else if(d<0){while(d<0)d+=turn;d=f(d);}
  return {...q,sourceYaw:f(sourceYaw),targetYaw:f(targetYaw),normalizedDifference:d,allowed:d<=facingLower||d>=facingUpper,reason:null};
 }
 const restrictionExamples=Object.freeze({2:Object.freeze({name:'アタック',flags:69}),78:Object.freeze({name:'ドミニオン',flags:5}),1572:Object.freeze({name:'パーフェクト ミミック',flags:5})});
 function actionRestrictionDefinition(e){return [136,165].includes(e.kind)&&Number.isInteger(e.selector)&&e.selector>=0&&e.selector<=65535&&!e.qualifier&&!e.other10&&!e.other18&&e.flags===48&&Number.isFinite(e.value);}
 function actionRestriction(records,actionId,actionFlags=0,slotCount=24){
  if(![8,24].includes(slotCount)||!Array.isArray(records)||records.length>slotCount||!Number.isInteger(actionId)||actionId<1||actionId>65535||!Number.isInteger(actionFlags)||actionFlags<0||actionFlags>0xffffffff)throw Error('行動制限の保持リスト・行動ID・flagsが不正です');
  let sawAllowlist=false;
  for(const r of records){
   if(!r||r.flagged)continue;
   const effects=(r.effects||[]).filter(e=>[136,165].includes(e.kind));if(effects.some(e=>!actionRestrictionDefinition(e)))throw Error('未照合の行動制限定義です');
   if(effects.some(e=>e.kind===165&&e.selector===actionId))return {allowed:false,reason:'禁止リスト165に一致',consumerProved:true};
   const allow=effects.filter(e=>e.kind===136);if(!allow.length)continue;sawAllowlist=true;
   if(allow.some(e=>e.selector===actionId||e.selector===1&&!!(actionFlags&64)))return {allowed:true,reason:'許可リスト136に一致',consumerProved:true};
  }
  return {allowed:!sawAllowlist,reason:sawAllowlist?'許可リスト136に一致なし':'この制限なし',consumerProved:true};
 }
 function jumpDefinition(e){return e.kind===195&&e.selector===0&&!e.qualifier&&!e.other10&&!e.other18&&Number.isFinite(e.value)&&!(e.flags&~(0x30|0x100|0x200));}
 function jump(records,world){
  if(!Array.isArray(records)||records.length>24||![0,1].includes(world))throw Error('跳躍補正の条件が不正です');
  let multiplier=1;
  for(const r of records){
   if(r.enabled===false||r.excluded||r.flaggedSpecial===true)continue;
   const effects=(r.effects||[]).filter(e=>e.kind===195);if(!effects.length)continue;
   if(effects.some(e=>!jumpDefinition(e)))throw Error('未照合の跳躍補正です');
   const flags=effects[0].flags,a=!!(flags&0x100),b=!!(flags&0x200);
   if(a!==b&&(a&&world===1||b&&world===0))continue;
   for(const e of effects)multiplier*=f(e.value);
   multiplier=f(multiplier);if(!Number.isFinite(multiplier))throw Error('跳躍倍率が計算範囲外です');
  }
  return {multiplier,initial:f(multiplier*f(.17)),base:f(.17),unit:'単位なしの鉛直移動入力',
   scope:'通常ジャンプが成立した1回分の初期鉛直移動値。技能・魔力で倍率は変わりません。高さや飛距離、時間経過の軌道とは別です。'};
 }
 // 5fe910 -> v330/772130 returns the LAST matching definition ID;
 // 774280 returns its FIRST matching row. This is lookup order, not a
 // claim that Buff registration/overwrite always follows insertion order.
 function itemDelayDefinition(e){return e.kind===125&&e.selector===0&&!e.qualifier&&!e.other10&&!e.other18&&e.flags===0x30&&Number.isFinite(e.value);}
 function itemDelay(records,{disabled=false,baseCounter=null,activationCounter=null}={}){
  if(!Array.isArray(records)||records.length>24||typeof disabled!=='boolean')throw Error('アイテム待ち補正の登録条件が不正です');
  let percent=100,selectedId=null;
  if(!disabled)for(const r of records){
   // Null stands for the zero-ID terminator, not an unknown record.
   if(r===null)break;if(r.enabled===false)continue;
   const e=(r.effects||[]).find(e=>e.kind===125);if(!e)continue;
   if(!itemDelayDefinition(e))throw Error('未照合のアイテム待ち補正です');
   percent=f(e.value);selectedId=r.id??null;
  }
  const multiplier=percent*f(.01);let counter=null,activation=null;
  if(baseCounter!==null&&baseCounter!==undefined){
   if(baseCounter===''||!Number.isFinite(+baseCounter)||+baseCounter<0||+baseCounter>1000000)throw Error('補正前の待ち値を有効な数値で指定してください');
   // The two FMULs have no intervening float32 store. 8a70f8 truncates.
   counter=Math.trunc(Math.max(0,multiplier*f(+baseCounter)));
   if(activationCounter!==null&&activationCounter!==undefined){
    if(activationCounter===''||!Number.isFinite(+activationCounter)||Math.abs(+activationCounter)>1000000)throw Error('発動カウンタが不正です');
    activation=Math.min(counter,Math.max(0,Math.trunc(f(+activationCounter))));
   }
  }
  return {percent,multiplier,selectedId,baseCounter:baseCounter==null?null:f(+baseCounter),counter,activationCounter:activation,
   seconds:null,scope:'この効果を受理した通常PCのアイテム使用経路に渡す倍率と待ちカウンタ。実時間・再使用可能時刻とは別。倍率は技能・魔力で変わりません。'};
 }
 function displayPlacement(e,actionType){
  if(![267,277].includes(e.kind)||!Number.isInteger(e.selector)||e.selector<0||e.selector>5||e.qualifier||e.other10||e.other18||e.flags!==48||!Number.isFinite(e.value))throw Error('表示エフェクト配置の定義が未照合です');
  const mode=e.kind===267?({2:1,3:2,4:3,5:4}[e.selector]??0):({1:0,2:2,3:1,4:6,5:5}[e.selector]??-1);
  return {kind:e.kind,selector:e.selector,modes:mode===-1?(actionType===1?[1,2]:[0]):[mode],rawValueConsumed:false,
   source:e.kind===267?'774fe0→77e050':'774d40→77d9c0',quantityEffect:false,
   meaning:e.kind===267?'飛来する表示エフェクトの発生位置を指定する。selectorにより通常位置・モデルの部位参照を選ぶ。ダメージ量や飛来回数の指定ではない':'技の表示エフェクトを身体・装備などへ配置する区分。ダメージ倍率やアイテム生成数の指定ではない',
   scope:'77d270→7825e0→782ce0→7865b0の表示オブジェクト生成・モデル座標経路を照合。効果量欄Bはこの配置処理で読まれません。表示カウンタを技の持続時間へ転用しません。'};
 }
  const api=Object.freeze({generatedActionTime,aiWaitClock,petExperienceTransition,petExperience,criticalDefinition,criticalProjection,petSpecialCommand,trapRemoval,equipmentCurse,dirtCorrection,stateResourceDefinition,stConsumptionEffect,recoverySuppression,actionWaitDefinition,actionWait,facingRequirement,restrictionExamples,actionRestrictionDefinition,actionRestriction,jumpDefinition,jump,itemDelayDefinition,itemDelay,displayPlacement});if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MOE_COMBAT_PASSIVE_NUMERICS=api;
})(globalThis);
