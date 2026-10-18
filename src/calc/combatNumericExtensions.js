(function(root){'use strict';
 const common=typeof module!=='undefined'&&module.exports;
 const skillLimits=common?require('./combatResourceFormula.js'):root.MOE_COMBAT_RESOURCE_FORMULA;
 const data=common?require('../data/generated/combatNumericReference.generated.js'):root.MOE_COMBAT_NUMERIC_REFERENCE;
 const guards=common?require('../data/generated/combatGuardReference.generated.js'):root.MOE_COMBAT_GUARD_REFERENCE;
 const guardInputs=common?require('../data/generated/combatGuardInputs.generated.js'):root.MOE_COMBAT_GUARD_INPUTS;
 const magicGuardInputs=common?require('../data/generated/combatMagicGuardInputs.generated.js'):root.MOE_COMBAT_MAGIC_GUARD_INPUTS;
 const reflectDefs=common?require('../data/generated/combatReflectionReference.generated.js'):root.MOE_COMBAT_REFLECTION_REFERENCE;
 const reactionDefs=common?require('../data/generated/combatReactionReference.generated.js'):root.MOE_COMBAT_REACTION_REFERENCE;
 const guardChildren=common?require('../data/generated/combatGuardChildren.generated.js'):root.MOE_COMBAT_GUARD_CHILDREN;
 const summonSelectors=common?require('../data/generated/combatSummonSelectors.generated.js'):root.MOE_COMBAT_SUMMON_SELECTORS;
 const shieldDefs=common?require('../data/generated/combatShieldReference.generated.js'):root.MOE_COMBAT_SHIELD_REFERENCE;
 const dispatch=common?require('./clientNativeBuffDispatchReference.js'):root.MOE_CLIENT_NATIVE_BUFF_DISPATCH_REFERENCE;
 const activation=common?require('./clientNativeBuffActivationReference.js'):root.MOE_CLIENT_NATIVE_BUFF_ACTIVATION_REFERENCE;
 const conflict=common?require('./clientNativeBuffConflictReference.js'):root.MOE_CLIENT_NATIVE_BUFF_CONFLICT_REFERENCE;
 const slots=common?require('./clientNativeBuffSlotReference.js'):root.MOE_CLIENT_NATIVE_BUFF_SLOT_REFERENCE;
 const timerReceipts=common?require('../data/generated/combatTimerReceipts.generated.js'):root.MOE_COMBAT_TIMER_RECEIPTS;
 const modes=common?require('../data/generated/combatDispatchModes.generated.js'):root.MOE_COMBAT_DISPATCH_MODES;
 const interruptionProfiles=common?require('../data/generated/combatNpcInterruptionProfiles.generated.js'):root.MOE_COMBAT_NPC_INTERRUPTION_PROFILES;
 const replacements=common?require('../data/generated/combatReplacementRules.generated.js'):root.MOE_COMBAT_REPLACEMENT_RULES;
 const f=Math.fround,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 const delayFactor=value=>f(clamp(f(value)*f(.01),f(.1),10));
 const castingMovementFactor=(base,current)=>f(Math.min(3,f(f(base)*f(current))));
 const reviveFractionCache=value=>f(value)<f(.2)||f(value)>1?f(.2):f(value);
 function equipmentRestriction(mask){
  if(!Number.isInteger(mask)||mask<0||mask>0x3ffff)throw Error('装備制限の18索引maskが未確定');
  return {mask,restrictedIndices:Array.from({length:18},(_,i)=>i).filter(i=>mask&(1<<i)),queryReturnsRestricted:true,
   scope:'通常PCのkind116はselectorをplayer+52f4へORする。5d5810は一致索引のbitがある場合1、ない場合0。B/M/Aを用いた数量式ではない。索引の部位名と、このqueryを採用する実装備操作は未確認'};
 }
 function queuedMovementGate(present,specialAllowed,movementBit4,actorState){
  if([present,specialAllowed,movementBit4].some(v=>typeof v!=='boolean')||!Number.isInteger(actorState))throw Error('動作開始の移動状態を明示してください');
  return present||specialAllowed||movementBit4||actorState!==0;
 }
 function randomInput(value){if(!Number.isInteger(value)||value<0||value>32767)throw Error('追加作用の判定用15bit整数を0〜32767で指定してください');return value;}
 function interruptRequest(base,multiplier,addition,random15){
  const threshold=f(f(base)*f(multiplier)+f(addition)),scale=f(100/32767),draw=randomInput(random15)*scale;
  const passing=Math.max(0,Math.min(32768,Math.floor(threshold/scale)+1));
  return {threshold,draw,passed:draw<=threshold,passing,uniformPercent:passing/32768*100};
 }
 function reactionRequest(base,random15){
  const threshold=f(base),scale=f(1/32767),draw=randomInput(random15)*scale;
  const passing=clamp(Math.floor(threshold/scale)+1,0,32768);
  return {threshold,draw,passed:draw<=threshold,uniformPercent:passing/32768*100};
 }
 function omenRequest(base,multiplier,random15,targetFactor=1){
  const threshold=clamp(Math.trunc(f(multiplier)*50),30,90),roll=randomInput(random15)%100;
  const target=roll<threshold,plain=clamp(f(base),-1000,10000);
  const amount=target&&plain>0?clamp(f(plain*(1+f(targetFactor-1))),-1000,10000):plain;
  // Enumerate residue counts algebraically, not by allocating random samples.
  const passing=327*threshold+Math.min(threshold,68);
  return {threshold,roll,target,amount,uniformPercent:passing/32768*100};
 }
 function npcInterruptResistance(profileKey,level,random15){
  const profile=interruptionProfiles?.profiles[profileKey];if(!profile)throw Error('対象NPCの保存初期設定を選択してください。未収録NPCの係数を0で補いません');
  const requiresLevel=profile.perLevel!==0;
  if(requiresLevel&&(!Number.isFinite(level)||level<0))throw Error('対象NPCのレベルを指定してください');
  const growth=requiresLevel?f(profile.perLevel*f(level)):0,threshold=Math.trunc(f((profile.base+Math.min(growth,profile.cap))*f(100)));
  const q=clamp(threshold,0,100),passing=327*q+Math.min(q,68),resisted=threshold<=0?false:threshold>=100?true:random15==null?null:randomInput(random15)%100<threshold;
  return {profile,threshold,requiresLevel,level:requiresLevel?f(level):null,levelEliminated:!requiresLevel,random15:random15??null,resisted,uniformResistancePassing:passing,uniformResistancePercent:passing/32768*100,scope:interruptionProfiles.scope,evidence:interruptionProfiles.evidence};
 }
 function interruptOutcome(gate,condition,active=true,npc={}){
  if(condition==='npc-active')try{
   const resistance=npcInterruptResistance(npc.profile,npc.level,npc.random15),n=32768,a=active?gate.passing:0,b=n-resistance.uniformResistancePassing;
   if(!Number.isInteger(a)||a<0||a>n)throw Error('一次抽選の通過整数件数が未確定です');
   const lowerCount=Math.max(0,a+b-n),upperCount=Math.min(a,b),probabilityBounds={lower:lowerCount/n*100,upper:upperCount/n*100,lowerCount,upperCount,sampleSize:n,
    scope:'各抽選の15bit整数がそれぞれ均等という比較条件での1要求の上下限。二つの抽選の結合分布・独立性は仮定しません。上下限が一致する場合だけ最終の条件付き率を確定します。実測頻度・持続全期間の率ではありません。'};
   const percent=lowerCount===upperCount?probabilityBounds.lower:null;
   return {supported:true,percent,probabilityBounds,interrupted:active&&gate.passed?(resistance.resisted===null?null:!resistance.resisted):false,npcResistance:resistance,
    scope:'対象NPCが動作中・中断阻止なしで、この保存初期設定を採用する1要求。一次抽選と別の抵抗抽選を区別し、独立を仮定して乗算しない。実行時補正・技の発動成否・全期間の率は別'};
  }catch(error){return {supported:false,percent:null,interrupted:null,reason:error.message};}
  if(!['pc-active','pc-idle','pc-blocked'].includes(condition))return {supported:false,percent:null,interrupted:null,reason:'通常PCの動作条件、またはNPC動作中と対象NPCの保存初期設定を選択してください。未収録NPC・特殊状態は判定未対応です'};
  const eligible=condition==='pc-active'&&active;
  return {supported:true,percent:eligible?gate.uniformPercent:0,interrupted:eligible&&gate.passed,
   scope:'type50の要求を受ける通常PC（状態0/1）。動作ポインタあり・阻止flag200000なしの条件でaction+a4への中断マークまで。通信後の最終結果・技自体の成否は別'};
 }
 function hpAssignment(base,maximum,current){
  if(![base,maximum,current].every(Number.isFinite)||maximum<1||current<0||current>maximum)throw Error('HP指定要求を受ける側の最大HP・現在HPを指定してください');
  const desired=Math.min(f(maximum),Math.max(1,f(base))),request=f(f(current)-desired);
  return {desired,current:f(current),maximum:f(maximum),request};
 }
 function resourceAssignment(selector,base,maximum,current){
  if(![2,3].includes(selector)||![base,maximum].every(Number.isFinite)||maximum<0)throw Error('MP/ST指定を受ける側の最大値を指定してください');
  const desired=f(base)<1?1:Math.min(f(maximum),f(base));
  if(selector===3)return {desired,maximum:f(maximum),operation:'set',resource:'ST',receiver:'通常PC',consumerProved:true};
  if(!Number.isFinite(current)||current<0||current>maximum)throw Error('MP指定を受ける側の現在MPを指定してください');
  const request=f(f(current)-desired);
  return {desired,current:f(current),maximum:f(maximum),request,operation:request===0?'none':'request',resource:'MP',consumerProved:true};
 }
 function guardOverride(fraction,selector,soft,hard){
  if(selector===8)return {fraction:soft||hard?1:0,effectFlag:!!(soft||hard),softFlag:false};
  if(hard)return {fraction:0,effectFlag:false,softFlag:false};
  return {fraction:soft?0:fraction,effectFlag:true,softFlag:!!soft};
 }
 function hitAddition(rows,skillRaw,before){
  const runtime=data.skillRuntime[skillRaw];
  if(runtime==null||!Number.isFinite(before))throw Error('対象行動の主技能と補正前の命中入力を指定してください');
  let after=f(before);
  for(const row of rows)if(data.skillRuntime[row.selector]===runtime)after=f(after+f(row.value));
  return {before:f(before),after,addition:f(after-f(before)),runtimeSkill:runtime};
 }
 function protectionDistance(radius,distance){
  if(!Number.isFinite(radius)||!Number.isFinite(distance)||distance<0)throw Error('保持者と効果発生元の非負の座標距離を指定してください');
  return {radius:f(radius),distance,within:distance<f(radius)};
 }
 function mpBurst(base,multiplier,addition,currentMP){
  if(![base,multiplier,addition,currentMP].every(Number.isFinite)||currentMP<0)throw Error('使用者の効果発生直前MPを指定してください');
  // 5638a0 stores HP once, then clamps that request. The second clamp call
  // still points at the HP message: the MP request retains the full getter.
  return {hpRequest:clamp(f(f(base)*f(multiplier)*f(currentMP)+f(addition)),-1000,10000),mpRequest:f(currentMP)};
 }
 function thresholdDefense(base,incoming,enabled=true){
  if(!Number.isFinite(base)||!Number.isFinite(incoming)||typeof enabled!=='boolean')throw Error('受信したHP要求量を指定してください');
  const before=f(incoming),threshold=f(base);return {before,threshold,after:enabled&&before>0&&before<=threshold?0:before};
 }
 function resourceDefense(kind,incoming,hp,mp,ratio){
  if(![198,199,211].includes(kind)||!Number.isFinite(incoming)||incoming<0)throw Error('受理された正のHP損傷要求量を指定してください');
  const damage=Math.trunc(f(incoming));
  if(kind===211){if(!Number.isFinite(ratio))throw Error('保存された属性吸収率が必要です');return {damage,healing:f(damage*f(ratio))};}
  if(kind===199){
   if(!Number.isFinite(mp)||mp<0)throw Error('効果を持つ対象の現在MPを指定してください');
   return {damage,mpBefore:f(mp),mpRequested:f(f(mp)-damage),mpDecrease:Math.min(f(mp),damage),hpDamage:Math.max(0,Math.trunc(damage-f(mp)))};
  }
  if(!Number.isFinite(hp)||hp<=0)throw Error('効果を持つ対象の正の現在HPを指定してください');
  const consumed=damage>f(hp)+1,requested=consumed?1:f(f(hp)-damage);
  return {damage,hpBefore:f(hp),hpRequested:requested,hpDamage:f(hp)-Math.max(0,requested),consumed};
 }
 function guardEligibility(mask,attackClass,inWindow,blocked){
  if(![1,2,4].includes(attackClass)||typeof inWindow!=='boolean'||typeof blocked!=='boolean')throw Error('防御受付中・阻止状態・相手の行動区分を指定してください');
  return inWindow&&!blocked&&!!(mask&attackClass);
 }
 function guardCalculation(id,skillInteger,seed,encodedHit,damage,condition=null,skillOverride=null){
  const d=guards[id];if(!d)throw Error('防御行動の保存能力欄が未照合');
  if(!Number.isInteger(skillInteger)||skillInteger<0||skillInteger>skillLimits.skillIntegerMax||!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw Error('防御技能と種値を指定してください');
  if(skillOverride){
   if(!shieldDefs.shields[skillOverride.shieldId])throw Error('装備成立を指定する盾を保存定義から選択してください');
   if(!Number.isInteger(skillOverride.skillInteger)||skillOverride.skillInteger<0||skillOverride.skillInteger>skillLimits.skillIntegerMax)throw Error('装備した盾による技能切替に使う盾技能を指定してください');
   // 5a411d: category 0x000d0002 replaces only selector, not the action's
   // required-skill denominator/base coefficient or shield performance.
   skillInteger=skillOverride.skillInteger;
  }
  const factor=d.primary&&d.required>1?clamp(skillInteger*f(.0001)/(d.required+10),0,f(1.2)):1;
  const chance=Math.min(1,f(f(d.base)*factor)),defense=d.primary?f(skillInteger*f(.000033)):0;
  const result=guardFromParameters(chance,defense,seed,encodedHit,damage,condition);
  return skillOverride?{...result,skillOverride:{selector:38,skillInteger,shieldId:skillOverride.shieldId,shieldName:shieldDefs.shields[skillOverride.shieldId].name,required:d.required,base:d.base},evidence:['docs/guard-numerics-20261013.txt']}:result;
 }
 function guardFromParameters(chance,defense,seed,encodedHit,damage,condition){
  const threshold=Math.trunc(chance*256),result={chance,defense,threshold,uniformBytePercent:clamp(threshold,0,256)/256*100};
  if(encodedHit==null||damage==null)return {...result,outcome:null};
  if(!Number.isInteger(encodedHit)||encodedHit< -32768||encodedHit>32767||!Number.isFinite(damage)||damage<=0)throw Error('相手の格納命中と防御直前の正の損傷量を指定してください');
  const roll=(Math.imul(encodedHit,seed)>>>4)&255,complete=roll<threshold;
  const capacity=(seed%41+80)*defense*f(.01),before=f(Math.ceil(f(damage)));
  const rawFraction=complete?1:f(clamp(capacity/f(damage),0,1));
  const override=condition?guardOverride(rawFraction,condition.selector,condition.soft,condition.hard):{fraction:rawFraction,effectFlag:true,softFlag:false};
  const fraction=condition?.accepted===false?0:override.fraction,blocked=Math.ceil(fraction*before);
  return {...result,outcome:{roll,complete,capacity,fraction,before,blocked,remaining:f(before-blocked),...condition?{accepted:condition.accepted,rawFraction,effectFlag:condition.accepted&&override.effectFlag,softFlag:condition.accepted&&override.softFlag}:{}}};
 }
 function magicGuardGate(chance,encoded,seed,condition){
  if(!Number.isFinite(chance)||chance<0||chance>1||!Number.isInteger(encoded)||encoded<0||encoded>65535||!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw Error('魔法防御の保存割合・格納入力・種値を指定してください');
  if(!condition||typeof condition.accepted!=='boolean'||typeof condition.hard!=='boolean'||typeof condition.soft!=='boolean')throw Error('魔法防御の受付・防御無視条件を指定してください');
  const threshold=Math.trunc(f(chance)*256),roll=(Math.imul(encoded,seed)>>>4)&255;
  const passed=condition.accepted&&(condition.selector===8?condition.hard||condition.soft:roll<threshold&&!condition.hard);
  return {threshold,roll,passed,encodedInput:encoded,normalizedInput:encoded/16,uniformBytePercent:condition.accepted?(condition.selector===8?(condition.hard||condition.soft?100:0):condition.hard?0:clamp(threshold,0,256)/256*100):0};
 }
 function magicGuardRefund(baseCost,gate){
  if(!Number.isFinite(baseCost)||baseCost<0||typeof gate?.passed!=='boolean')throw Error('相手魔法の保存基礎MP消費と防御結果が必要です');
  return {supported:true,magicGate:true,emitted:gate.passed,type:4,recipient:'guard-user',resource:'MP',amount:gate.passed?f(baseCost):0,whenSuppressed:f(baseCost),
   scope:'5a4c26の通常消費成立枝はblocked=0のままextraFlag=1を渡す。5a1090 selector5は相手の保存基礎消費を負のMP要求にする。実消費の割引率や損傷量は掛けない。現在MPの回復上限・最終保存と別'};
 }
 function magicGuardCalculation(guard,condition,p){
  const incoming=magicGuardInputs?.[condition?.incoming.id];
  if(!incoming)throw Error('選択した相手魔法の動作分類・主技能の照合が不足しています');
  const scope='59f0c0の魔法防御抽選。5a2780+64は常に相手の主技能・技能補正・魔力で生成（kind256による攻撃力への切替は+62だけ）。通常PC・別使用者・分類2・受付/装備消費成立の条件。5a4c46後の通常枝では魔法本体処理を抑止。反射・追加要求・最終HPと別';
  if(incoming.effectClass!==2)return {supported:true,eligible:false,passed:false,uniformBytePercent:0,incoming,scope:'相手は魔法分類2ではないため、この魔法防御枝に入りません。'+scope};
  if(p.guardMagicBranchConfirmed!==true)throw Error('魔法防御：通常PC・異なる使用者・通常本体/装備消費成立の条件を指定してください');
  const skill=p.guardIncomingSkill,magic=p.guardIncomingMagic,adjustment=p.guardIncomingSkillAdjustment;
  if(!Number.isFinite(skill)||skill<0||skill>skillLimits.skillMax||!Number.isFinite(magic)||magic<0||magic>1000||!Number.isFinite(adjustment))throw Error('相手魔法の主技能・魔力・技能補正を指定してください');
  const encoded=skillLimits.magicActionInput(Math.round(skill*10000),adjustment,magic)*16;
  const gate=magicGuardGate(guard.chance,encoded,p.seed,condition);
  if(p.preGuardDamage!=null&&(!Number.isFinite(p.preGuardDamage)||p.preGuardDamage<0))throw Error('防御なしで発行される非負の魔法本体量を指定してください');
  const before=p.preGuardDamage==null?null:f(p.preGuardDamage);
  return {supported:true,eligible:true,...gate,incoming,before,blocked:before==null?null:gate.passed?before:0,remaining:before==null?null:gate.passed?0:before,
   ...(condition.selector===5?{refund:magicGuardRefund(condition.incoming.baseCost,gate)}:{}),
   scope,remainingScope:'受付時間の自動算出・実際の装備消費可否・反射魔法の入力/損傷・防御後の別補正は未接続。未入力の本体量は0にしない'};
 }
 function shieldFitness(d,skillInteger){
  if(!d||!Number.isInteger(skillInteger)||skillInteger<0||skillInteger>skillLimits.skillIntegerMax)throw Error('保存盾の必要技能と現在の盾技能が必要です');
  let factor=d.required>0?f(skillInteger*f(.0001)/f(d.required)):1;
  return factor>=1?1:factor<f(.8)?0:factor;
 }
 function shieldGuardCalculation(id,skillInteger,seed,encodedHit,damage,allowed,condition=null){
  const d=shieldDefs.shields[id];if(!d)throw Error('使用する盾を保存定義から選択してください');
  if(!Number.isInteger(skillInteger)||skillInteger<0||skillInteger>skillLimits.skillIntegerMax||!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw Error('盾技能と種値を指定してください');
  if(d.extra.length)throw Error('この盾の複合必要技能は未接続');
  if(d.restricted&&typeof allowed!=='boolean')throw Error('この盾の使用地域条件を指定してください');
  // 56fb00 rounds the primary ratio to float32 before checking .8/1.
  const factor=shieldFitness(d,skillInteger);
  const enabled=!d.restricted||allowed,base=enabled?d.base:0;
  const chance=Math.min(1,f((enabled?d.chance:0)*factor));
  // 0x945a20 contains 0x37fba883, one ULP above float32(.00003).
  const defense=f(skillInteger*3.000000106112566e-5+factor*f(base)*f(.5));
  return {...guardFromParameters(chance,defense,seed,encodedHit,damage,condition),shieldId:d.id,shieldName:d.name,fitness:factor,regionAllowed:enabled};
 }
 function guardFeedback(selector,incoming,blocked,random31){
  if(!Number.isFinite(blocked)||blocked<0)throw Error('軽減量の計算または完全軽減条件が必要です');
  const none={supported:true,emitted:false,amount:0,mean:null};
  if(blocked===0)return none;
  if(selector===3)return incoming.actionType===1?none:{supported:true,emitted:true,type:2,recipient:'guard-user',resource:'HP',amount:f(Math.min(f(blocked),100)),mean:null};
  if(selector===5)return {supported:true,emitted:true,type:incoming.actionType===1?4:1,recipient:'guard-user',resource:incoming.actionType===1?'MP':'ST',amount:f(incoming.baseCost),mean:null};
  if(selector!==4)return {supported:false,reason:'この種類の追加作用は独立の数値要求ではありません'};
  if(incoming.actionType===1)return {supported:false,reason:'魔法反射は元行動を再生成する枝。反射側の入力継承と再計算条件が未接続'};
  if(!Number.isInteger(blocked))throw Error('物理反射には切上げ後の整数軽減量が必要です');
  let amount=blocked,mean=blocked;
  if(blocked>180){
   const width=Math.min(blocked,200)-180,n=2147483648,q=Math.floor(n/width),r=n%width;
   mean=180+(q*width*(width-1)/2+r*(r-1)/2)/n;
   if(!Number.isInteger(random31)||random31<0||random31>0x7fffffff)throw Error('反射用31bit乱数を0〜2147483647で指定してください');
   amount=180+random31%width;
  }
  return {supported:true,emitted:true,type:18,recipient:'attacker',resource:'HP',amount,mean};
 }
 function guardContext(id,p){
  const d=guardInputs.guards[id],incoming=guardInputs.incoming[p.guardIncomingAction];
  if(!d||!incoming)throw Error('相手の攻撃・魔法を選択してください');
  const attackClass=incoming.actionType===1?4:incoming.near?1:2;
  const accepted=guardEligibility(d.mask,attackClass,p.guardTimingById?.[id]?.inWindow??p.guardInWindow,p.guardBlocked);
  return {definition:d,incoming,attackClass,accepted,selector:d.selector,soft:incoming.ignoreSoft,hard:incoming.ignoreHard};
 }
 function buffReflectionRates(reflect,reduce,multiplier){
  if(![reflect,reduce,multiplier].every(Number.isFinite)||multiplier<0||multiplier>10)throw Error('反射Buffの保持強度が有効範囲外です');
  return {reflectRate:clamp(f(f(reflect)*multiplier),0,1),reduceRate:clamp(f(f(reduce)*multiplier),0,1)};
 }
 function buffReflectionDamage(rates,damage){
  if(!Number.isFinite(damage)||damage<0)throw Error('反射Buff処理に渡る非負の損傷量を指定してください');
  const before=f(damage),reflectRequest=Math.ceil(f(before*rates.reflectRate)),reductionRequest=Math.ceil(f(before*rates.reduceRate));
  let remaining=rates.reduceRate>=1?0:f(before-reductionRequest);
  if(rates.reduceRate<1&&before>0&&remaining<=0)remaining=1;
  remaining=Math.max(0,remaining);
  return {before,reflectRequest,reductionRequest,remaining};
 }
 function buffReflection(id,multiplier,damage){
  const d=reflectDefs[id];if(!d)throw Error('反射Buffの保存済み比率欄が未照合');
  const rates=buffReflectionRates(d.reflect,d.reduce,multiplier);
  return {...rates,outcome:damage==null?null:buffReflectionDamage(rates,damage)};
 }
 function sacrificeRequests(base,multiplier,addition){
  const q=f(f(base)*f(multiplier)+f(addition));
  return [{type:2,target:'target',amount:10000},{type:2,target:'source',amount:clamp(-q,-1000,10000)},
   {type:4,target:'source',amount:clamp(-q,-1000,10000)},{type:1,target:'source',amount:q}];
 }
 function equipmentWear(base,currentRaw,keepOne){
  const request=Math.trunc(Math.abs(f(base)));
  if(!Number.isFinite(base)||request>30000)throw Error('装備耐久要求が確認済み整数範囲0〜30000の外です');
  if(currentRaw==null)return {request,after:null};
  if(!Number.isInteger(currentRaw)||currentRaw<0||currentRaw>32767||typeof keepOne!=='boolean')throw Error('対象装備の内部耐久値と破損条件を指定してください');
  // 6267c0, valid durable instance, definition+28>0. Bit13 keeps one.
  const after=Math.max(keepOne?1:0,currentRaw-request);
  const display=v=>v>0?Math.max(1,Math.trunc(v*f(.025))):0;
  return {request,before:currentRaw,after,loss:currentRaw-after,displayBefore:display(currentRaw),displayAfter:display(after)};
 }
 function resistantDurationFactor(d,x,y,resistance,seed,world){
  let sub=Math.max(f(.1),1+(f(x)-d.required)*(f(d.coefficient)+(world===1?0:f(d.extra_coefficient))));
  const cap=f(d.upper_limit)+(world===1?0:f(d.extra_upper_limit));if(cap>=1)sub=Math.min(sub,cap);
  sub=f(sub);
  const ordinary=d.flags&2||d.flags254&1?sub:(f(x)+300)*f(1/350)+sub-1;
  const resisted=f(ordinary*ordinary/(ordinary+(f(resistance)-f(d.threshold)+1)*f(.01)));
  const halfThreshold=70*((d.required+f(y))*f(.5)+30)/(f(resistance)-f(d.threshold)+30);
  const half=seed%100>halfThreshold;
  return {factor:f(resisted*(half?f(.5):1)),half,halfThreshold};
 }
 function conditionalHpRequest(base,maximum,current,gate){
  if(![base,maximum,current].every(Number.isFinite)||maximum<1||current<0||current>maximum||typeof gate!=='boolean')throw Error('対象の最大HP・現在HPと適合条件を指定してください');
  const threshold=f(f(base)*f(.01)*f(maximum)),eligible=gate&&f(current)<=threshold;
  return {threshold,current:f(current),maximum:f(maximum),eligible,amount:eligible?f(Math.min(200,f(current)+1)):0};
 }
 function petRevivePenalty(base,level){
  if(!Number.isFinite(base)||!Number.isFinite(level)||level<1||level>150)throw Error('蘇生対象ペットの現在レベルを1〜150で指定してください');
  const b=f(base),selected=b< -1||b>2?f(.2):b,nominal=f(selected*f(.1)),before=f(level);
  const after=before>1&&nominal>0?Math.max(1,f(before-nominal)):before;
  return {nominal:Math.max(0,nominal),before,after,loss:before-after};
 }
 // These producers always ADD the supplied A, including a negative B.
 // HP source/target clamps apply independently to the original signed value.
 function directMessage(kind,base,multiplier,addition){
  if(![3,11,42,173].includes(kind)||![base,multiplier,addition].every(Number.isFinite))throw Error('直接要求量の入力が不正です');
  const raw=f(f(base)*f(multiplier)+f(addition));
  return {raw,value:kind===42?raw:clamp(raw,-1000,10000),source:kind===3?clamp(-raw,-1000,10000):null};
 }
 // Native576600 returns an x87 value; do not round the final subtraction here.
 function reuseCoefficient({actionType,primary,actionFlags=0,actorType=1,actorEffectFlags=0,cachedSkill=0,skillFactor=1,attackFactor=1,magicFactor=1,skill24=0}){
  if(![actionType,primary,actionFlags,actorType,actorEffectFlags,cachedSkill,skill24].every(Number.isInteger)||![skillFactor,attackFactor,magicFactor].every(Number.isFinite))throw Error('再使用係数の技能・分類・倍率入力が不正です');
  const reduction=actionType===1&&(actorType&5)?Math.min(f(.2),f(clamp(f(skill24*f(.0001)),0,f(1000000*f(.0001)))*f(.0016))):0;
  if((actorEffectFlags&0xc00000)&&primary){
   const allowed=actionType===1?data.reuseSkills.magic:actionFlags&0x40?data.reuseSkills.weapon:[];
   if(allowed.includes(primary))return Math.max(0,f(actionType===1?magicFactor:attackFactor)-reduction);
  }
  return Math.max(0,f((actorEffectFlags&0x80000)&&primary&&cachedSkill===primary?skillFactor:1)-reduction);
 }
 function selectedReuse(kind,base,selector,request){
  const factor=delayFactor(base),cachedSkill=kind===69?data.skillRuntime[selector]:0;
  if(kind===69&&!cachedSkill)throw Error('技能別再使用のselector変換が未確定');
  if(!request)return {factor,cachedSkill,applied:null};
  const {actionType,rawSkill,weaponEligible,concentration}=request,primary=data.skillRuntime[rawSkill];
  if(primary===undefined||typeof weaponEligible!=='boolean'||!Number.isFinite(concentration)||concentration<0||concentration>skillLimits.skillMax||![1,2,3,4].includes(actionType))return {factor,cachedSkill,applied:null,remaining:'指定行動への適用は入力不足。再使用を受ける行動の主技能・分類・集中力を入力してください。保存倍率の数値は既知です'};
  const args={actionType,primary,actionFlags:weaponEligible?64:0,skill24:Math.round(concentration*10000)};
  const without=reuseCoefficient(args),withEffect=reuseCoefficient({...args,cachedSkill,actorEffectFlags:{69:0x80000,108:0x400000,109:0x800000}[kind],skillFactor:factor,attackFactor:kind===108?factor:1,magicFactor:kind===109?factor:1});
  return {factor,cachedSkill,applied:withEffect,without,delta:withEffect-without};
 }
 function percentResource(kind,base,multiplier,addition,maximum){
  if(![82,83].includes(kind)||![base,multiplier,addition,maximum].every(Number.isFinite)||maximum<0)throw Error('割合HP/MPの入力が不正です');
  const b=f(base),percentage=clamp(f(clamp(b*f(multiplier)+f(addition),-Math.abs(b),Math.abs(b))),-1000,10000);
  const raw=f(maximum)*percentage*f(.01);
  return {percentage,request:f(kind===82?Math.min(40,raw):raw)};
 }
 function placementInput(selector,base,skillInteger){
  if(!Number.isFinite(base))throw Error('設置入力の基礎値が不正です');
  if(f(base)>0)return f(base); // Positive fixed input bypasses the skill cap.
  if(![1,2,3,4,5,6,7,8,10,11,12,13].includes(selector))throw Error('設置selector '+selector+' はactor状態+f4を使う。入力値の意味と供給式が未確定');
  if(!Number.isInteger(skillInteger)||skillInteger<0||skillInteger>skillLimits.skillIntegerMax)throw Error('設置に使用する銃器/罠技能を入力してください');
  return f(clamp(f(base)+skillInteger*f(.0001),f(.1),130));
 }
 function summonSelection(selector,base,skillInteger,random15,resistances){
  const skill=f(skillInteger*f(.0001));let selected=summonSelectors.byRuntime[selector]||data.summons[selector];
  if(selector===7||selector===189)selected={referenceKey:(selector===7?8:190)+(skill>=70?2:skill>=40?1:0),flag:0,fixedLevel:false};
  if(selector===467)selected={referenceKey:random15%10===0?474:473,flag:0,fixedLevel:false};
  if(selector===6||selector===362){
   if(!Array.isArray(resistances)||resistances.length!==4||resistances.some(n=>!Number.isFinite(n)))throw Error('召喚体選択に使用者の火・水・風・地耐性が必要');
   const values=resistances.map(f),maximum=Math.max(...values),ties=[0,1,2,3].filter(i=>values[i]===maximum);
   if(maximum< -1)throw Error('全属性耐性が-1未満のため生成先選択が成立しない');
   const i=ties[random15%ties.length];selected={referenceKey:(selector===6?12:365)+i,flag:0,fixedLevel:false};
  }
  if(!selected)throw Error('召喚selector '+selector+' の参照表行が保存範囲で見つからない');
  const level=f(base)<=0&&!selected.fixedLevel?f(clamp(f(f(base)+skill),1,150)):f(base);
  return {...selected,level,skill};
 }
 function summonLifetime(baseSeconds,multiplier,addition,darkSkillInteger){
  return Math.trunc(Math.trunc(baseSeconds*f(multiplier)+f(addition))*(1+darkSkillInteger*f(8.000000661922968e-7)));
 }
 function immediateReferences(rootId,definitions){
  const byId=new Map(definitions.map(d=>[d.id,d])),nodes=[],edges=[];
  function visit(id,path){
   const d=byId.get(id);if(!d)throw Error('参照先 '+id+' の定義なし');
    if(path.includes(id)||path.length>=12)throw Error('循環または連鎖token上限（初回0・子1〜11）に関わる参照');
    if(path.length>=10&&path.some(parent=>byId.get(parent).effects.filter(e=>[86,133].includes(e.kind)).length!==1))throw Error('長い分岐連鎖のtoken共有順が未確定');
   if(d.counter||d.interval)throw Error('持続・周期・終了イベントの参照回数が未確定：'+d.name);
   nodes.push(id);
   for(const e of d.effects.filter(e=>[86,133].includes(e.kind))){
    if(e.kind!==86||e.qualifier||e.other10||e.other18||![32,48].includes(e.flags)||d.flags&0x400)throw Error('参照行の追加条件・対象切替・mode別回数が未確定：'+d.name);
    if(e.selector<=1)throw Error('参照selector 0/1 の選択先が未確定');
    edges.push({id:d.id+':'+e.index,from:id,to:e.selector});visit(e.selector,[...path,id]);
   }
  }
  try{visit(rootId,[]);return {supported:!!edges.length,nodes,edges,counts:Object.fromEntries([...new Set(nodes)].map(id=>[id,nodes.filter(n=>n===id).length]))};}
  catch(e){return {supported:false,reason:e.message};}
 }
 // 772ac0 decrements a finite, unmarked interval>1 record once per phase1.
 // No clock conversion is needed to count an uninterrupted complete lifetime.
 function lifetimeModifier(kind){
  if(![95,96].includes(kind))throw Error('Unknown lifetime modifier');
  const row={flagByte:kind===95?1:0,duration:1,remainingDuration:1},d={actionType:4,definitionClass:1,interval:1};
  const before=activation.activationParameters(row,d,0),after=activation.activationParameters(row,d,kind===95?0x1000000:0x4000000);
  return kind===95?{ratio:after.interval/before.interval,before:before.interval,after:after.interval}:{ratio:after.remaining/before.remaining,before:before.remaining,after:after.remaining};
 }
 function effectModes(e){
  const entry=modes[e.kind],effect={flags:e.flags,modeOverride:e.other18};
  if(!entry||entry[2]||!entry[4])return null;
  const initial=dispatch.handlerMode(entry,effect,7),update=dispatch.handlerMode(entry,effect,3);
  if(!Number.isInteger(initial.modeType)||initial.modeType<0||initial.modeType>3)return null;
  return {type:initial.modeType,initial:initial.selected,update:update.selected,
   scope:(initial.selected?'初回mode7で処理':'初回mode7では処理なし')+' / '+(update.selected?'周期更新mode3で処理':'周期更新mode3では処理なし')+'。対象・phaseの成立は別条件'};
 }
 // These original scalar producers and 5608e0/57afc0/560cc0 do not read
 // effect+0c/+10. This says nothing about those fields' global meaning.
 function scalarMetadataIndependent(kind){return [2,3,12,13,19,31,41,49,171,180].includes(kind);}
 // Mask registrations do not call a scalar handler. Native dispatch ignores
 // +0c/+10 and modeOverride for this branch; lifecycle consumers remain separate.
 function stateMaskRegistration(kind){return !!modes[kind]?.[2];}
 function buffReplacement(d,e,conditions={}){
  const rule=replacements?.rules[d.id],incoming=replacements?.definitions[d.id];
  if(e.kind!==111||e.value!==0||e.selector!==0||e.qualifier||e.other10||e.other18||e.flags!==48||!rule||d.group!==incoming.conflictGroup||d.conflictParameters?.fieldF0!==incoming.fieldF0)return null;
  const q={consumerProved:true,quantity:false,group:incoming.conflictGroup,strength:conflict.strength(incoming),knownTargets:rule.oldIds.map(id=>replacements.definitions[id]),removedCount:null,accepted:null,
   scope:'この定義が通常のBuff競合受付へ到達した条件で、先に存在する同一グループの最初の有効Buffを比較する。数量係数ではなく、旧Buffの強度・発生元・解除状態による置換。技の成否・パーティ全員への到達・終了後のパッシブ再付与は別',evidence:replacements.evidence};
  if(conditions.existingId==null)return {...q,reason:'置換対象の既存Buffが未指定。解除0件とは扱いません'};
  const old=replacements.definitions[conditions.existingId];if(!rule.oldIds.includes(Number(conditions.existingId))||!old)return {...q,reason:'この技について確認した既存Buffを選択してください'};
  if(typeof conditions.marked!=='boolean')return {...q,reason:'対象Buffが有効で、解除処理中ではない条件を指定してください'};
  if(conflict.strength(old)===q.strength&&typeof conditions.sameSource!=='boolean')return {...q,reason:'等強度の既存Buffは同じ使用者かどうかを指定してください'};
  // A stronger record does not inspect source identity. Its arbitrary words
  // are inert comparison scratch, not a substituted unknown input.
  const source=[1,0,0,0],previous=conditions.sameSource===false?[2,0,0,0]:source;
  const registry=[old,incoming].map(r=>({...r,id:r.runtimeId})).filter((r,i,a)=>a.findIndex(q=>q.id===r.id)===i);
  const result=conflict.resolveConflict({containerFlag:0,slots:[{id:old.runtimeId,flagByte:conditions.marked?1:0,sourceIdentity:previous}]},{group:q.group,strength:q.strength,sourceIdentity:source},registry);
  return {...q,accepted:!!result.result,removedCount:result.notifications.length,reason:result.reason,existing:old,existingRemains:result.state.slots.some(s=>s.id===old.runtimeId),sourceIndependent:conflict.strength(old)!==q.strength};
 }
 function confusionTarget(normalTarget,statePresent,category='ordinary',targetResolved=true){
  if(!['self','specified-target'].includes(normalTarget)||typeof statePresent!=='boolean'||typeof targetResolved!=='boolean'||!['ordinary','self','resolve-target'].includes(category))throw Error('対象指定行動の分類・混乱状態・対象解決条件を明示してください');
  const selected=category==='self'||category==='resolve-target'&&!targetResolved||category==='ordinary'&&statePresent?'self':normalTarget;
  return {selected,statePresent,category,targetResolved,scalarAmount:false,consumerProved:true};
 }
 function spiritVisibility(invisibleBranch,viewerState,baseVisual){
  if(typeof invisibleBranch!=='boolean'||typeof viewerState!=='boolean'||!Number.isFinite(baseVisual)||baseVisual<0||baseVisual>1)throw Error('不可視表示の分岐・視点側の状態・基礎描画値が必要です');
  return {value:invisibleBranch?viewerState?f(f(baseVisual)*.5):0:f(baseVisual),visualOnly:true,scalarAmount:false,consumerProved:true};
 }
 function reactionLifetime(rootTime,child,lastAcceptedSeconds){
  if(lastAcceptedSeconds==null)return {supported:false,seconds:null,reason:'最後に反応子を受理した時刻が未指定。最終終了を0秒としません'};
  if(!rootTime?.supported||rootTime.partial||!Number.isFinite(rootTime.seconds)||rootTime.seconds<=0)return {supported:false,seconds:null,reason:'反応を受け付ける親の有効時間が未確定'};
  if(!Number.isFinite(lastAcceptedSeconds)||lastAcceptedSeconds<0||lastAcceptedSeconds>=rootTime.seconds)return {supported:false,seconds:null,reason:'最後の反応時刻は0秒以上・親の終了時刻未満で指定してください。終了と同時点の順序を仮定しません'};
  if(!child||!Number.isFinite(child.durationSeconds)||child.durationSeconds<0)return {supported:false,seconds:null,reason:'反応子の受理1回の持続時間が未確定'};
  const end=lastAcceptedSeconds+child.durationSeconds;
  return {supported:true,seconds:Math.max(rootTime.seconds,end),reaction:true,conditional:true,parts:[{definitionId:rootTime.definitionId,seconds:rootTime.seconds,endSeconds:rootTime.seconds},{definitionId:child.id,seconds:child.durationSeconds,lastStartSeconds:lastAcceptedSeconds,endSeconds:end}],
   scope:'指定時刻が最後に受理された反応子で、その後に更新・解除・時間延長がない条件。受理1回の既知の子寿命を、その時刻へ加算する。自動発動の回数や最後の被攻撃時刻を推測しない'};
 }
 // These definitions cache a parameter/presence consumed by another routine;
 // they do not independently dispatch a scalar handler. Restrict the71 case
 // to a generation request, not relationship27 or an arbitrary same-kind row.
 function cachedParameter(d,e){return e.kind===232||e.kind===102&&d.action_type===2||e.kind===71&&d.effects.some(x=>[8,9,89,94,169].includes(x.kind));}
 function lightSelection(profile,otherProfile=null){
  const valid=n=>Number.isInteger(n)&&n>=0&&n<12;
  if(!valid(profile)||otherProfile!==null&&!valid(otherProfile))throw Error('光源・視界設定は確認済みの0〜11の整数を指定してください');
  const selected=otherProfile===null?null:Math.max(profile,otherProfile);
  return {selector:profile,level:profile>=1&&profile<=5?profile:null,color:profile===6?'red':profile===7?'green':null,
   label:profile>=1&&profile<=5?'光源Lv'+profile:profile===6?'赤色の光源':profile===7?'緑色の光源':'視界設定'+profile,
   selected,otherProfile,adoptionProved:true,collectionSlots:[8,24],
   scope:'受理済みのこの定義の設定値。8/24枠の有効な効果・装備・他の光源では設定番号の大きい方を採用する（加算しない）。他の設定が未指定なら最終採用値は未計算。ライトの技能別受理Lv・照射距離・視界制限の実測値は別で、特殊設定10を光源Lv10とは扱わない',
   evidence:'docs/client-numeric-gaps23-20261016.txt'};
 }
 function guardDefinitionParameter(d,e){
  // Match the reviewed spell, not every record with the same effect number.
  // 53 is cached on the action definition and consumed by the type3 guard
  // constructor. The ordinary Buff scalar dispatcher has no53 callback.
  if(d.id!==166||d.action_type!==1||d.effect_class!==1||d.primary_raw!==59||d.required!==30||d.flags!==5||d.group!==166||
   d.effects.length!==2||d.effects[0].kind!==41||d.effects[0].selector!==5||d.effects[0].value!==4.5||
   e.index!==1||e.kind!==53||e.selector!==0||e.value!==f(.1)||e.flags!==48||e.qualifier||e.other10||e.other18)return null;
  return {definitionId:d.id,kind:53,base:e.value,cacheOffset:'0x810',consumer:'type3-guard-constructor',ordinaryBuffScalarCallback:false,
   calculationBoundary:'ordinary-buff-admission',
   scope:'現行581dd6の通常Buff数量処理では53の登録先がなく量を発行しない。0.1は定義内の防御行動用基礎値で、魔法の追加軽減率10%としては使わない。防御技型3の計算は別経路。他の受動的な参照・サーバー独自処理の有無は今回未確認。'};
 }
 function equipmentDisplayScale(base,coefficient,matchingType){
  if(!Number.isFinite(coefficient)||typeof matchingType!=='boolean'||base!==null&&(!Number.isFinite(base)||base<0))throw Error('装備表示倍率の入力が未確定');
  return {multiplier:matchingType?f(coefficient):1,value:base===null?null:f(f(base)*(matchingType?f(coefficient):1)),
   consumerProved:true,numericalRole:'equipment-model-scale',scope:'武器表示の該当分類では、表示モデルの3軸へ同じ倍率を格納する。確認した設定の適用先は表示サイズ。射程は別効果248の加算として計算し、この表示倍率を掛けない。実描画・当たり判定・最終射程の実測とは区別する'};
 }
 function periodicRequests(d,e,counter,conditions={}){
  // 773e90/560a60: these definitions do not create a persistent record.
  // Count only the explicitly selected initial dispatch, not a future update.
  if([1,2,4].includes(d.action_type)&&d.fieldC0<=0&&d.counter<=0&&effectModes(e)?.initial)
   return {supported:true,count:1,initialCount:1,periodicCount:0,intervalSeconds:null,nonPersistentInitial:true,
    scope:'持続レコードを作らない定義で、初回のこの作用が選択・受理された1要求。周期更新/自動反復を含めない。phase・対象・命中の成立は条件であり成功確率の計算ではない'};
  if(!(d.interval>=1&&d.counter>0)||d.action_type===5||d.effects.some(x=>x.kind===110))return {supported:false,reason:'有限の周期回数ではない（停止・繰返し・時間停止を含む）'};
  if(e.flags&0x40||(e.qualifier||e.other10)&&!scalarMetadataIndependent(e.kind))return {supported:false,reason:'周期外phase・追加条件による発動回数が未確定'};
  const mode=effectModes(e);if(!mode)return {supported:false,reason:'処理登録またはmode上書きの意味が未確定'};
  if(!Number.isInteger(counter)||counter<1||counter>216000)return {supported:false,reason:'持続回数の入力が未確定'};
  if(d.interval===1){
   if(conditions.fixedUpdateElapsed!=null){
    const elapsed=conditions.fixedUpdateElapsed;
    if(!Number.isInteger(elapsed)||elapsed<1||elapsed>216000)throw Error('各更新で進む効果カウンタを1〜216000の整数で指定してください');
    const periodicCount=mode.update?Math.ceil(counter/elapsed):0;
    return {supported:true,count:(mode.initial?1:0)+periodicCount,initialCount:mode.initial?1:0,periodicCount,intervalSeconds:null,
     fixedUpdateElapsed:elapsed,automaticCountKnown:false,elapsedToSecondsKnown:false,
     scope:'未mark・途中解除/更新/時間停止なし、各更新が指定の正の内部elapsedで進み、各周期作用が受理される条件。772ac0は減算前の正の残りカウンタを検査し、減算で0以下になる更新もphase1を作る。ceil(保持カウンタ/指定elapsed)回。実際の更新頻度・毎秒量・自動総量ではない'};
   }
   if(counter!==1||conditions.singlePositiveUpdateConfirmed!==true)return {supported:false,reason:counter===1?'最初の更新が正の内部elapsedで受理され、途中解除されない条件を指定してください（interval1の実頻度は未確定）':'interval1は更新ごとにelapsedをカウンタから減算する。残りカウンタが1以外では、更新時系列なしに回数を決めない'};
   return {supported:true,count:(mode.initial?1:0)+(mode.update?1:0),initialCount:mode.initial?1:0,periodicCount:mode.update?1:0,intervalSeconds:null,
    singlePositiveUpdate:true,scope:'残りカウンタ1・unmarked・延長/停止なし。最初の正のelapsed更新が受理される条件では1更新の後にカウンタが0以下となる。実秒の更新間隔や自動発動頻度を示さない'};
  }
  return {supported:true,count:(mode.initial?1:0)+(mode.update?counter:0),initialCount:mode.initial?1:0,periodicCount:mode.update?counter:0,intervalSeconds:d.interval/60,scope:'未中断・未更新・各周期成立時の条件付き回数。公称間隔であり実時計からの自動発動ではない'};
 }
 function receiptPeriodicRequests(id,kind,conditions){
  const d=timerReceipts[id],e=d?.effects.find(e=>e.kind===kind);
  if(!d||!e)throw Error('保持子の実定義と作用が未照合です');
  return periodicRequests(d,e,d.counter,conditions);
 }
 function referenceLifetime(graph,definitions,times,conditions={}){
  const fail=reason=>({supported:false,seconds:null,reason});
  if(!graph.supported)return fail(graph.reason||'参照経路が未確定');
  if(graph.periodic||graph.refreshes?.length)return fail('周期子の発生時刻・上書き間の有効時間が未確定');
  const selected=definitions.filter(d=>Object.hasOwn(graph.counts,d.id)),groups=new Set(),parts=[];let sharedGroup=false;
  if(selected.length!==Object.keys(graph.counts).length)return fail('参照定義が不足');
  for(const d of selected){
   const t=times.find(t=>t.definitionId===d.id);
   if(!t?.supported||t.partial)return fail(d.name+'の単独持続時間が未確定');
   if(graph.counts[d.id]!==1)return fail('同一定義への複数要求の競合が未確定');
   if(d.action_type===5||d.effects.some(e=>[60,110,241,242].includes(e.kind)))return fail('時間停止・再発生・終了イベントを持つ定義');
   if(t.seconds>0&&d.group){if(groups.has(d.group))sharedGroup=true;groups.add(d.group);}
   parts.push({definitionId:d.id,seconds:t.seconds});
  }
  if(sharedGroup){
   if(!['parent-first','child-first'].includes(conditions.order))return fail('同じ競合グループの開始順・上書きが未確定。未mark・同発生元の条件付き受理順を指定してください');
   const saved=conditions.definitions;
   if(!saved)return fail('競合の実行時ID・強度・保持判定が未取得');
   const registry=[],publicId=new Map();
   for(const d of selected){
    const record=saved[d.id],r=record?.conflict;
    if(!r||r.id!==record.runtimeId||r.conflictGroup!==d.group||r.fieldC0!==d.fieldC0||r.fieldC4!==d.counter)return fail(d.name+'の競合定義と時間定義の照合が不一致');
    registry.push(r);publicId.set(r.id,d.id);
   }
   // This is an explicit simultaneous-receipt scenario, not an inference of
   // network order. The identity words only encode the specified SAME source.
   const order=[...graph.nodes];if(conditions.order==='child-first')order.reverse();
   const sourceIdentity=[1,0,0,0],trace=[];let state={containerFlag:0,slots:[]};
   for(const id of order){
    const part=parts.find(p=>p.definitionId===id);if(!(part.seconds>0))continue;
    const r=saved[id].conflict;
    const q=conflict.resolveConflict(state,{group:r.conflictGroup,strength:conflict.strength(r),sourceIdentity},registry);
    state=q.state;
    trace.push({definitionId:id,accepted:!!q.result,reason:q.reason,removedDefinitionId:q.notifications.length?publicId.get(q.notifications[0].id):null,seconds:part.seconds});
    if(q.result)state=slots.insertNonFull(state,{id:r.id,flagByte:0,marker:0,sourceIdentity}).state;
   }
   const kept=new Set(state.slots.filter(r=>r.id).map(r=>publicId.get(r.id))),activeParts=parts.filter(p=>p.seconds===0||kept.has(p.definitionId));
   return {supported:true,seconds:Math.max(0,...activeParts.map(p=>p.seconds)),parts:activeParts,allParts:parts,conflictTrace:trace,receiptOrder:conditions.order,
    scope:'条件入力：初回の要求を同時刻・同発生元・未mark・既存Buffなしで、'+(conditions.order==='parent-first'?'親→子（参照行の順）':'子→親（参照行の逆順）')+'に競合判定する。保存済み772d20の強度・同発生元更新を適用し、残る保持効果の公称終了を計算。実際の受理順、到着差、途中解除、終了時の追加行動は保証しない。拒否/解除前に発行された初回数量の集計とは別'};
  }
  return {supported:true,seconds:Math.max(0,...parts.map(t=>t.seconds)),parts,
   scope:'初回の全参照要求が同時点で受理され、対象条件不変・途中解除/競合なしの公称終了時間。単独持続の最大値。周期子・重複定義・同じ競合群は含めない。実通信の到着差や自動発動時刻とは別'};
 }
 function periodicReferenceLifetime(graph,definitions,times,rootId){
  const fail=reason=>({supported:false,seconds:null,reason});
  if(!graph.supported||!graph.periodic)return fail('有限の周期参照経路が未確定');
  if(graph.edges.some(e=>e.kind===133&&e.from!==rootId))return fail('多段周期の終了順が未確定');
  const overlapping=!!graph.refreshes?.some(r=>!r.nonOverlapping);
  const byId=new Map(definitions.map(d=>[d.id,d])),byTime=new Map(times.map(t=>[t.definitionId,t])),parts=[],groups=new Set();
  const rootTime=byTime.get(rootId);if(!rootTime?.supported||rootTime.partial)return fail('親の公称持続時間が未確定');
  for(const id of Object.keys(graph.counts).map(Number)){
   const d=byId.get(id),t=byTime.get(id);if(!d||!t?.supported||t.partial)return fail('定義'+id+'の単独公称持続時間が未確定');
   if(d.action_type===5||d.effects.some(e=>[60,110,241,242].includes(e.kind)))return fail('終了時の再発生・時間停止・繰返しを持つ定義');
   const incoming=graph.edges.filter(e=>e.to===id);
   if(incoming.length>1)return fail('同じ子への複数経路の終了時刻が未確定');
   const periodic=incoming.find(e=>e.kind===133);let start=0;
   if(periodic){
    const source=byId.get(periodic.from),effect=source.effects.find(e=>source.id+':'+e.index===periodic.id),mode=effectModes(effect);
    if(!(source.interval>1)||!mode?.update||mode.initial)return fail('公称の最終要求時刻を決めるmodeが未確定');
    start=rootTime.seconds;
   }else if(incoming.some(e=>e.from!==rootId))return fail('初回子の多段開始時点が未確定');
   if(t.seconds>0&&d.group){if(groups.has(d.group))return fail('同じ競合群による終了順が未確定');groups.add(d.group);}
   const part={definitionId:id,lastStartSeconds:start,seconds:t.seconds,endSeconds:start+t.seconds};
   if(overlapping&&periodic){
    const source=byId.get(periodic.from),requests=graph.counts[id],step=source.interval/60,refresh=graph.refreshes.find(r=>r.definitionId===id);
    if(!refresh||refresh.maximumConcurrentCopies!==1||!Number.isInteger(requests)||requests<1||!Number.isFinite(t.seconds)||t.seconds<0)return fail('子の単独寿命・受理回数・同発生元更新の条件が未確定');
    part.firstStartSeconds=step;part.requests=requests;part.maximumConcurrentCopies=1;
    part.coverageSeconds=t.seconds>=step?Math.max(0,start-step)+t.seconds:requests*t.seconds;
    part.sameSourceRefresh=true;
   }
   parts.push(part);
  }
  return {supported:true,seconds:Math.max(...parts.map(p=>p.endSeconds)),parts,periodic:true,conditional:true,...(overlapping?{sameSourceRefresh:true}:{}),
   scope:overlapping?'親の公称全周期が成立し、同使用者・同対象・同一定義・未markの各子要求が等強度で受理される条件。同じ子は重ねず、最後の受理で単独寿命へ更新する。最終要求=親の公称持続末尾、その時点+子寿命を終了とする。表示する保持区間の合計は時間であり、未知の周期回数や回復・損傷総量ではない。延長/他の競合/実時計の遅れ・自動発動は含めない。':'親の周期要求が公称間隔どおりに全て受理され、各子の公称寿命が完了し、延長/解除/他の競合がない条件。最終周期要求=親の公称持続末尾、その時点+子単独寿命までの最大値。実時計の更新遅れ・通信到着差・自動発動の保証を含めない'};
 }
 function conditionalReferences(rootId,definitions,counterFor,conditions={}){
  const byId=new Map(definitions.map(d=>[d.id,d])),nodes=[],edges=[],counts={},refreshes=[];let periodic=false;
  function visit(id,path,multiplicity,fromPeriodic=null){
   const d=byId.get(id);if(!d)throw Error('参照先 '+id+' の定義なし');
   if(path.includes(id)||path.length>=12)throw Error('循環または連鎖token上限（初回0・子1〜11）に関わる参照');
   if(path.length>=10&&path.some(parent=>byId.get(parent).effects.filter(e=>[86,133].includes(e.kind)).length!==1))throw Error('長い分岐連鎖のtoken共有順が未確定');
   if(fromPeriodic&&(d.counter||d.interval)){
    if(!(d.counter>0&&d.interval>0)||d.action_type===5||d.effects.some(e=>[60,86,110,133].includes(e.kind)))throw Error('持続子の時間上書き・停止・再帰参照の回数が未確定：'+d.name);
    const counter=counterFor(d);
    if(!Number.isInteger(counter)||counter<=0||counter>216000)throw Error('持続子の生成カウンタが未確定：'+d.name);
    const cp=d.conflictParameters;if(!cp||!Number.isInteger(cp.fieldF0))throw Error('持続子の競合定義が未取得：'+d.name);
    // Strict separation proves that a direct child finishes before replacement.
    // Equal boundaries and nested schedules still require dispatch ordering.
    const nonOverlapping=path.length===1&&counter*d.interval<fromPeriodic.interval;
    refreshes.push({definitionId:id,requests:multiplicity,counter,interval:d.interval,seconds:counter*d.interval/60,group:d.group,strength:cp.fieldF0===4294967286?0:Math.abs(cp.fieldF0|0),
     parentIntervalSeconds:fromPeriodic.interval/60,nonOverlapping,
     maximumConcurrentCopies:1,accumulatorAfterRefresh:0,phaseAfterRefresh:0,rule:'同一使用者・同一定義・unmarkedの各要求が受理される条件。等強度・同発生元は解除後に追加し、保存時間・周期蓄積・phaseを更新。別の使用者/競合効果は含めない',
     remaining:nonOverlapping?'公称間隔どおりに成立し、他から更新・解除されない条件では子が次回より先に終了する。子単独で確定した周期数を各要求へ加算できる':'更新間に実行された周期数・実時間の重複/空白・親から見た最終終了時刻は未確定'});
   }
   nodes.push(id);counts[id]=(counts[id]||0)+multiplicity;
   for(const e of d.effects.filter(e=>[86,133].includes(e.kind))){
    const normalRoles=!(e.flags&1)&&!!(e.flags&2)===!!(d.flags&0x400);
    // Saved wiki and matched definitions37->1041 identify this user-centered
    // physical attack. Native flags49 keeps its constructor owner unchanged.
    // This does not identify/reinterpret other kinds of self-targeted children.
    const selfCenter=e.kind===86&&d.id===37&&e.selector===1041&&e.flags===49&&!(d.flags&0x400);
    if(selfCenter&&conditions.selfCenterTargetConfirmed!==true)throw Error('使用者中心の範囲内の指定NPCに子攻撃が1回命中する条件を指定してください');
    // 560cc0 supplies source/target in this order even with flags50 when
    // definition bit400 is set. Reversed source means a different constructor
    // owner: do not borrow the displayed caster's skills for that case.
    if(e.qualifier||e.other10||e.other18||(![32,48,50].includes(e.flags)||!normalRoles)&&!selfCenter)throw Error('参照行の追加条件、または別使用者から作る子入力が未確定：'+d.name);
    if(e.selector<=1)throw Error('参照selector 0/1 の選択先が未確定');
    let repeats=1;
    if(e.kind===133){const q=periodicRequests(d,e,counterFor(d));if(!q.supported)throw Error(q.reason);repeats=q.count;periodic=true;}
    if(multiplicity*repeats>216000)throw Error('参照要求数が計算上限を超える');
    edges.push({id:d.id+':'+e.index,from:id,to:e.selector,countPerParent:repeats,kind:e.kind,constructorOwner:'使用者',targetRole:selfCenter?'使用者中心の指定対象':'指定対象',...(selfCenter?{requestTarget:'使用者（範囲の中心）',damageRecipientCondition:'範囲内の指定NPCに1回命中、対象の選択/人数は入力条件'}:{})});visit(e.selector,[...path,id],multiplicity*repeats,e.kind===133?{interval:d.interval}:null);
   }
  }
  try{visit(rootId,[],1);
   for(const r of refreshes)if(refreshes.some(q=>q!==r&&(q.definitionId===r.definitionId||r.group&&q.group===r.group))){r.nonOverlapping=false;r.remaining='同じ子または競合グループへの複数経路があるため、受理順と有効周期数は未確定';}
   return {supported:!!edges.length,nodes,edges,counts,periodic,refreshes,scope:'全参照要求の対象条件成立・条件不変。flags32は成立した対象関係に限定。連鎖tokenは初回0・子1〜11、各要求が期限内に順番に成立。周期は自己保持の未中断・未更新を仮定'};}
  catch(e){return {supported:false,reason:e.message};}
 }
 const api=Object.freeze({buffReplacement,reactionLifetime,confusionTarget,spiritVisibility,queuedMovementGate,equipmentRestriction,summonSelection,summonLifetime,immediateReferences,conditionalReferences,referenceLifetime,periodicReferenceLifetime,lifetimeModifier,periodicRequests,receiptPeriodicRequests,scalarMetadataIndependent,stateMaskRegistration,cachedParameter,lightSelection,guardDefinitionParameter,equipmentDisplayScale,effectModes,delayFactor,reuseCoefficient,selectedReuse,percentResource,placementInput,directMessage,castingMovementFactor,petRevivePenalty,reviveFractionCache,interruptRequest,interruptOutcome,hpAssignment,resourceAssignment,hitAddition,protectionDistance,mpBurst,thresholdDefense,resourceDefense,guardCalculation,magicGuardGate,magicGuardRefund,magicGuardCalculation,magicGuardInputs,shieldGuardCalculation,shieldFitness,shieldDefs,guards,guardInputs,guardOverride,guardEligibility,guardFeedback,guardContext,buffReflection,buffReflectionRates,buffReflectionDamage,reactionRequest,reactionDefs,omenRequest,sacrificeRequests,equipmentWear,resistantDurationFactor,conditionalHpRequest,stats:data.stats});
 const decodeSummonSelector=raw=>{const runtime=summonSelectors.rawToRuntime[raw];if(runtime==null)throw Error('召喚selectorの保存値→実行時値変換が未確定：'+raw);return runtime;};
 if(common)module.exports=Object.freeze({...api,guardChildren,decodeSummonSelector});else root.MOE_COMBAT_NUMERIC_EXTENSIONS=Object.freeze({...api,guardChildren,decodeSummonSelector});
})(globalThis);
