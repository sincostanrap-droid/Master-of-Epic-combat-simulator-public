// Numerical effects are independent of HP storage, action success and clocks.
(function(root){'use strict';
 const common=typeof module!=='undefined'&&module.exports;
 const dep=(file,name)=>common?require('./'+file+'.js'):root[name];
 const formulas=dep('combatEffectFormulas','MOE_COMBAT_EFFECT_FORMULAS'),magic=dep('clientMagicReference','MOE_CLIENT_MAGIC_REFERENCE');
 const timing=dep('effectTiming','MOE_EFFECT_TIMING'),damage=dep('techniqueDamage','MOE_TECHNIQUE_DAMAGE'),inputs=dep('combatResourceFormula','MOE_COMBAT_RESOURCE_FORMULA');
 const physical=dep('clientPhysicalTechniqueReference','MOE_CLIENT_PHYSICAL_TECHNIQUE_REFERENCE');
 const combat=dep('clientCombatReference','MOE_CLIENT_COMBAT_REFERENCE');
 const conversion=dep('clientNativeBaseConversionReference','MOE_CLIENT_NATIVE_BASE_CONVERSION_REFERENCE');
 const extensions=dep('combatNumericExtensions','MOE_COMBAT_NUMERIC_EXTENSIONS');
 const dualWeapons=dep('combatDualWeaponNumerics','MOE_COMBAT_DUAL_WEAPON_NUMERICS');
 const movement=dep('combatMovementNumerics','MOE_COMBAT_MOVEMENT_NUMERICS');
 const casting=dep('combatCastingNumerics','MOE_COMBAT_CASTING_NUMERICS');
 const stateRequests=dep('combatStateRequestNumerics','MOE_COMBAT_STATE_REQUEST_NUMERICS');
 const summons=dep('combatSummonNumerics','MOE_COMBAT_SUMMON_NUMERICS');
 const recovery=dep('combatNaturalRecoveryNumerics','MOE_COMBAT_NATURAL_RECOVERY_NUMERICS');
 const blades=dep('combatBladeNumerics','MOE_COMBAT_BLADE_NUMERICS');
 const wikiHints=dep('combatWikiHintNumerics','MOE_COMBAT_WIKI_HINT_NUMERICS');
 const equipmentBuffs=dep('equipmentBuffNumerics','MOE_EQUIPMENT_BUFF_NUMERICS');
 const rangeBuffs=dep('combatRangeNumerics','MOE_COMBAT_RANGE_NUMERICS');
 const passive=dep('combatPassiveNumerics','MOE_COMBAT_PASSIVE_NUMERICS');
 const guardWindowMath=dep('combatGuardWindowNumerics','MOE_COMBAT_GUARD_WINDOW_NUMERICS');
 const normalPc=dep('combatNormalPcNumerics','MOE_COMBAT_NORMAL_PC_NUMERICS');
 const npcArmor=dep('combatNpcArmorNumerics','MOE_COMBAT_NPC_ARMOR_NUMERICS');
 const targetReduction=dep('combatPhysicalReductionNumerics','MOE_COMBAT_PHYSICAL_REDUCTION_NUMERICS');
 const guardReplay=dep('combatGuardReplayNumerics','MOE_COMBAT_GUARD_REPLAY_NUMERICS');
 const generatedRequestTotals=dep('combatGeneratedRequestTotals','MOE_COMBAT_GENERATED_REQUEST_TOTALS');
 const generatedInput=dep('combatGeneratedInputNumerics','MOE_COMBAT_GENERATED_INPUT_NUMERICS');
 const recognition=dep('combatRecognitionNumerics','MOE_COMBAT_RECOGNITION_NUMERICS');
 const crafting=dep('combatCraftingNumerics','MOE_COMBAT_CRAFTING_NUMERICS');
 const visual=dep('combatVisualNumerics','MOE_COMBAT_VISUAL_NUMERICS');
 const effectSelectors=common?require('../data/generated/combatEffectSelectors.generated.js'):root.MOE_COMBAT_EFFECT_SELECTORS;
 const weatherChildren=common?require('../data/generated/combatWeatherChildren.generated.js'):root.MOE_COMBAT_WEATHER_CHILDREN;
 const generatedActions=common?require('../data/generated/combatGeneratedActionBindings.generated.js'):root.MOE_COMBAT_GENERATED_ACTION_BINDINGS;
 const generatedWait=common?require('../data/generated/combatGeneratedNpcWait.generated.js'):root.MOE_COMBAT_GENERATED_NPC_WAIT;
 const passiveReceipts=common?require('../data/generated/combatPassiveReceipts.generated.js'):root.MOE_COMBAT_PASSIVE_RECEIPTS;
 const f=Math.fround,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),ordinal={1:4,2:7,3:8,4:9,5:10,6:11};
 const proof={strength:'docs/catalog-client-formulas-20261005.md',resistance:'docs/client-attack-magic-20261005.txt',hp:'docs/client-hp-modifiers-20261005.txt',stat:'docs/client-native-buff-dispatch-20261006.txt',periodic:'docs/product-additional-damage-duration-20261008.txt',skill:'docs/client-physical-skill-input-20261005.txt',power:'docs/client-physical-build-buffs-20261005.txt',recovery:'docs/client-shared-effects-20261010.txt',reduction:'docs/client-buff-scoped-damage-20261005.md',quarter:'docs/client-recovery-rebuild-20261006.txt'};
 const missing={
  2:'HP量に渡す行動入力または強度分岐が未確定',8:'召喚体selectorの生成定義、技能・魔力から能力/寿命への換算式',9:'設置先selectorの作用定義、生成能力と対象への入力継承',
  12:'継続HP量に渡す行動入力・倍率/加算の生成分岐',13:'elapsedはactor+a6cから供給される更新量。公称60単位と実秒の対応、周期効果での有効phase積算が未確定（5617f0→610100）',23:'type17の敵対要求・NPCリスト更新。既存エントリ加算と先頭昇格時の追加2Bは接続済み。新規挿入・関連NPCの受理と最終ターゲット選択が未確定',
  47:'反射量の単位、対象攻撃に対する適用順',49:'追撃の子選択表・子入力・条件付き数値は接続済み。採用枝と追撃使用者の技能・装備条件が必要。Buff全期間の発動回数・自動総量は未確定',
  69:'技能別再使用係数の単位と実時間の合成式',71:'召喚寿命の技能/魔力倍率。設置寿命は別式',
  86:'子の条件付き数値は別表示。親の発動回数・子の選択と技全体への集計規則',133:'自己子行動の条件付き数値は別表示。親イベント別の回数と集計規則',
  108:'攻撃ディレイ値の単位と実時間への式',109:'詠唱値の単位と実時間への式',188:'変換元能力・変換先・係数を使う演算順',
  41:'能力selectorの名称・単位または強度入力分岐',147:'割合対象selectorまたは強度入力分岐',
  54:'別HP処理の入力と技定義の対応（既存攻撃アダプタにあるものは別計算）',64:'武器威力入力の組立てと保存攻撃定義の対応',
  85:'資源selector別の消費補正の適用式',235:'効果技能selectorの名前の照合'
 };
 function number(value,label,min=-100000,max=100000){if(value==null||value===''||!Number.isFinite(+value)||+value<min||+value>max)throw Error(label+'を有効な数値で指定してください');return +value;}
 function controls(input){
  const skill=number(input.skill,'主技能',0,inputs.skillMax),mp=number(input.magic,'魔力',0,1000),world=number(input.world,'世界条件',0,1),seed=number(input.seed,'変動種値',0,0xffffffff);
  if(!Number.isInteger(seed)||!Number.isInteger(world))throw Error('世界条件と変動種値は整数です');
  if(typeof input.targetAmplificationAllowed!=='boolean')throw Error('技能・魔力補正の対象条件を指定してください');
  return {...input,skill,magic:mp,world,seed,resistance:number(input.resistance,'対象属性耐性',0),targetDefense:number(input.targetDefense,'対象防御力',0),
   casterElementStrengthPct:number(input.casterElementStrengthPct??0,'使用者属性強化',-100,1000)};
 }
 function independentInput(d,row,p,names){
  if(p.replayedMagicInput?.id===d.id){
   if(JSON.stringify(guardReplay.definitions[d.id])!==JSON.stringify(d))throw Error('複製した魔法入力と効果定義が一致しません');
   return p.replayedMagicInput.x;
  }
  if(p.generatedEntityInput)return generatedInput.input(d,p.generatedActorCondition).x;
  if(d.action_type===2){if(p.constructed?.[d.id])return p.constructed[d.id].x;throw Error(p.constructorErrors?.[d.id]||'武器行動の保存入力定義の照合なし');}
  const primary=names[d.primary_raw];
  const skill=d.id===row.internalId?p.skill:number(p.skills?.[primary],(primary||'参照先技能')+'（参照先）',0,inputs.skillMax);
  if(![1,4].includes(d.action_type))throw Error('行動型'+d.action_type+'の数量入力生成は未接続');
  if(d.action_type===1){
   // Constructor2780: kind256 chooses stat2 (attack), otherwise stat6 (magic).
   const stat=d.effects.some(e=>e.kind===256)?number(p.attack,'使用者攻撃力',0):p.magic;
   return inputs.magicActionInput(Math.round(skill*10000),p.equipmentSkillBonuses?.[primary]||0,stat);
  }
  const encoded=Math.trunc(f(f(Math.round(skill*10000)*f(.0001))+(p.equipmentSkillBonuses?.[primary]||0))*16);
  if(encoded<0||encoded>32767)throw Error((primary||'主技能')+'の行動入力がsigned16格納範囲外です');
  return encoded/16;
 }
 // These callers construct mode7 receipts with M=1,A=0,timeFactor=1.
 // Match the saved child as well as its parent edge; a same-ID spell recast
 // or a normal86/133 reference must never inherit this receipt convention.
 function fixedReceipt(d,row,p){
  const same=s=>s&&['id','counter','interval','flags','action_type','effect_class','flags254'].every(k=>s[k]===d[k])&&JSON.stringify(s.effects)===JSON.stringify(d.effects);
  const guard=extensions.guardChildren.children[d.id],reaction=extensions.reactionDefs[d.id];
  if(p.guardChildDefinitionId===d.id&&same(guard))return {source:'防御子',counter:d.counter,interval:d.interval};
  if(p.reactionDefinitionId===d.id&&same(reaction))return {source:'反応子',counter:d.counter,interval:d.interval};
  if(d.id===row.internalId)return null;
  const definitions=[row.definition,...row.dependencies].filter(Boolean);
  if(definitions.some(q=>q.effects.some(e=>[86,133].includes(e.kind)&&e.selector===d.id)))return null;
  if(same(guard)&&definitions.some(q=>q.action_type===3&&extensions.guardInputs.guards[q.id]?.child===d.id&&q.effects.some(e=>e.kind===115)))return {source:'防御子',counter:d.counter,interval:d.interval};
  if(same(reaction)&&definitions.some(q=>q.effects.some(e=>[241,242].includes(e.kind)&&e.selector===d.id)))return {source:'反応子',counter:d.counter,interval:d.interval};
  return null;
 }
 function channels(d,row,p,names){
  p={...p,casterElementStrengthPct:p.casterElementStrengthPct+(p.equipmentElementFractions?.[d.element]||0)*100};
  const receipt=passiveReceipts.rules[d.id];
  if(p.passiveLearnedConfirmed===true&&d.action_type===5&&receipt&&receipt.flags===d.flags&&JSON.stringify(receipt.effectSignature)===JSON.stringify(d.effects.map(e=>[e.kind,e.selector,e.value,e.flags])))return {x:null,m:1,a:0,receipt:'習得済みパッシブの通常登録（倍率1・加算0）',evidence:passiveReceipts.evidence};
  if(fixedReceipt(d,row,p)||p.weatherChildDefinitionId===d.id&&weatherChildren.children[d.id])return {x:null,m:1,a:0};
  if(d.flags&0x1000||p.targetAmplificationAllowed===false)return {x:null,m:1,a:0};
  const independentRule=wikiHints.data.coefficientIndependentAreaChildren?.[d.id];
  const coefficientIndependent=p.semanticAreaDefinitionId===d.id&&!!independentRule&&d.effect_class===1&&!!(d.flags254&1)&&
   ['coefficient','upper_limit','extra_coefficient','extra_upper_limit'].every(k=>d[k]===0)&&JSON.stringify(independentRule.effectSignature)===JSON.stringify(d.effects);
  // This zero cancels algebraically in the proved simple, zero-coefficient
  // branch; it is not a missing actor ability filled with zero. Keep the seed.
  const x=coefficientIndependent?0:independentInput(d,row,p,names);
  if([2,3].includes(d.effect_class)){
   if(p.constructed?.[d.id]?.hitUnknown)throw Error('副入力に使う別命中getterの意味が未確定。本体物理威力とは分離');
   //4210 stores the secondary skill without the primary float32 store.
   const rawSkill=d.id===row.internalId?p.skill:p.skills?.[names[d.primary_raw]];
   const y=d.action_type===4?(p.generatedEntityInput?x:Math.trunc(Math.round(rawSkill*10000)*f(.0001)*16)/16):p.constructed?.[d.id]?.y??x;
   const adjusted=p.world===1?{...d,extra_coefficient:0,extra_upper_limit:0}:d;
   const reduction=p.targetPhysicalReductionId!=null?targetReduction.selected(d,p.targetPhysicalReductionId,p.world):null;
   const magicReduction=p.targetMagicReductionId!=null?targetReduction.selectedMagic(d,p.targetMagicReductionId,p.world):null;
   if(reduction&&!reduction.supported)throw Error(reduction.reason);
   if(magicReduction&&!magicReduction.supported)throw Error(magicReduction.reason);
   // Native5a0584 selects class1 versus the common non-class1 resistance branch.
   const c=magic.strengthChannels({...adjusted,effect_class:2,resistance_ordinal:ordinal[d.element]}, {actionInput:x,secondaryInput:y,
    resistance:d.effects.some(e=>e.kind===164)?0:d.element===1?p.targetDefense:p.resistance,seed:p.seed,
    ...(reduction?{targetElementReductionPct:reduction.applies?reduction.percent:0}:{}),
    ...(magicReduction?{targetMagicReductionPct:magicReduction.applies?magicReduction.percent:0}:{}),
    casterElementStrengthPct:p.casterElementStrengthPct,allowMagicBoost:false,targetAmplificationAllowed:p.targetAmplificationAllowed});
   return {x,y,m:c.multiplier,a:c.addition,halfResist:c.halfResist,...(magicReduction?{magicReduction}:{}),...(reduction?{targetReduction:{...reduction,scope:'効果量のM/A両方へ1回適用し、その後に使用者の属性強化と保持量子化を処理。魔法軽減249→属性軽減273の順。物理本体の補正とは別の生成経路で、同じ量へ再乗算しません。'}}:{})};
  }
  if(d.effect_class!==1)throw Error('効果分類'+d.effect_class+'の強度式が未確定');
  let q=Math.max(f(.1),1+(x-d.required)*(f(d.coefficient)+(p.world===1?0:f(d.extra_coefficient))));
  const cap=f(d.upper_limit)+(p.world===1?0:f(d.extra_upper_limit));if(cap>=1)q=Math.min(q,cap);q=f(q);
  const simple=!!(d.flags&2||d.flags254&1);
  if(p.targetMagicReductionId!=null||p.targetPhysicalReductionId!=null){
   const before={m:clamp(f((simple?q:(x+300)*f(1/350)+q-1)+(p.seed%21-10)*f(.01)),0,10),a:simple?0:clamp(f(x*f(.15)),0,40)};
   const c=targetReduction.scaleChannels(d,before,{magicId:p.targetMagicReductionId??null,elementId:p.targetPhysicalReductionId??null,world:p.world});
   return {x,...c,m:f(c.m*(1+f(p.casterElementStrengthPct/100)))};
  }
  const m=f(clamp(f((simple?q:(x+300)*f(1/350)+q-1)+(p.seed%21-10)*f(.01)),0,10)*(1+f(p.casterElementStrengthPct/100)));
  return {x:coefficientIndependent?null:x,m,a:simple?0:clamp(f(x*f(.15)),0,40),...(coefficientIndependent?{coefficientIndependent:true}:{} )};
 }
 function decorateEffectPhase(result,d,e,row,p,names,math){
  const m=result.modeInfo;
  if(result.supported&&[1,2,3,5,11,12,32,38,42,82,83,123,124,170,171,173,180,231].includes(e.kind)&&m){
   result.valuePhase=m.initial&&!m.update?'初回の未量子化M/A':'保持後のM/A（持続定義は1/256単位）';
   if(m.initial&&m.update&&d.counter>0&&d.interval>0){
    const initial=effect(d,e,row,{...p,numericPhase:'initial'},names,math);
    if(initial.supported){result.initialValue=initial.value;if(result.count!=null)result.total=initial.value+result.value*(result.count-1);}
    else{result.partial=true;result.remaining=(result.remaining||'')+' / 初回要求量：'+initial.reason;delete result.total;delete result.count;}
   }
  }
  return result;
 }
 function stored(d,c){if(!(d.counter>0&&d.interval>0))return c;
  return {...c,m:Math.trunc(clamp(c.m,0,10)*256)/256,a:(((Math.trunc(c.a*256)+32768)&65535)-32768)/256};}
 // A reversed86 changes the type45 constructor owner. Never reuse the
 // displayed caster's build. Limit this projection to an explicitly supplied
 // normal-PC weapon branch and a saved scalar64-only physical child.
 function reverseReferencePower(d,e,row,bundle,p,names){
  if(e.kind!==86||e.flags!==50||d.flags&0x400||e.qualifier||e.other10||e.other18)return null;
  const child=row.dependencies.find(q=>q.id===e.selector),saved=bundle.numericReferences?.[e.selector]?.physical;
  if(!child||child.action_type!==2||!saved||!child.effects.length||!child.effects.every(q=>q.kind===64&&q.flags===48&&!q.qualifier&&!q.other10&&!q.other18))return null;
  const reverseSkills=new Set([row.definition,...row.dependencies].filter(Boolean).flatMap(q=>!(q.flags&0x400)?q.effects.filter(v=>v.kind===86&&v.flags===50).map(v=>row.dependencies.find(c=>c.id===v.selector)?.primary_raw):[]));
  if(reverseSkills.size!==1)return null; // distinct child skills need distinct inputs
  const q={childId:child.id,childName:child.name,skillName:names[child.primary_raw],constructorOwner:'元の対象PC',damageRecipient:'元の使用者',supported:false,
   scope:'参照の役割が反転し、元の対象PCが子行動の発生元となる条件。通常PCの武器由来の威力枝、距離減衰・追加の技能/威力/属性補正なし。親の技能・攻撃力・M/Aはコピーしない。防御前の威力入力でありHPダメージではない',
   remaining:'対象PCの防御・盾・反射等を含む子のHP要求量と、実際の反撃成立/対象選択は未接続。NPC発生元にはこのPC入力式を流用しない'};
  if(p.reverseReferenceNpcUnarmed===true){
   if(p.reverseReferenceNormalPc===true)return {...q,reason:'反転した発生元はPCかNPCの一方を指定してください'};
   try{
    const power=generatedInput.reverseNpcInput(child,{unarmedUnmodified:true,weapon:p.reverseReferenceNpcWeapon===true,shieldId:p.reverseReferenceNpcShieldId,shieldSkill:p.reverseReferenceNpcShieldSkill,attack:p.reverseReferenceAttack,hit:p.reverseReferenceHit,skill:p.reverseReferenceSkill,world:p.world});let hp=null,hpReason=null;
    if(p.reverseReferenceDamageConfirmed===true)try{
     const state=npcArmor.defense({defense:p.reverseReferenceDefense??null,gearDefense:p.reverseReferenceGearDefense??null,wearSkill:p.reverseReferenceWearSkill??null});
     hp={supported:true,value:npcArmor.damage(state,{power:power.encodedPower,seed:p.seed,critical:p.reverseReferenceCritical===true}),evidence:'dist/client-numeric-gaps29-20261016/npc-armor-native-oracle.json',scope:'NPCが発生元・損傷側は通常PC。通常装備が全適合・必要技能充足、命中済み・特殊防御/盾/反射/追加損傷補正なしの1要求。PC同士の防御式に置換せず装備寄与を含めます。'};
    }catch(error){hpReason=error.message;}
    return {...q,supported:true,npcSource:true,power,inputs:{skill:power.skill,attack:power.attack,hit:power.hit},constructorOwner:'元の対象NPC',value:power.preSpecialPower,scope:power.scope,normalPcDamage:hp,damageReason:hpReason,...(p.world===1?{worldEvidence:'dist/client-numeric-gaps33-20261016/npc-armor-world1-native-oracle.json'}:{}),remaining:power.shield||p.world===1?'明示したNPC条件で装備なし・武器・保存盾の各枝の威力/命中と通常PCへの1回量を計算。追加能力補正、実際の反撃選択・全期間の自動回数は別。':'明示したNPC条件の威力・通常PCへの1回量。自動反撃回数・実際の対象選択は別。盾枝は専用の盾・盾技能入力で計算します。'};
   }catch(error){return {...q,reason:error.message};}
  }
  if(p.reverseReferenceNormalPc!==true)return {...q,reason:'元の対象が通常PCで、武器由来の威力枝・追加補正なしの条件を指定してください'};
  try{
   const skill=number(p.reverseReferenceSkill,q.skillName+'（元の対象PC）',0,inputs.skillMax),attack=number(p.reverseReferenceAttack,'元の対象PCの攻撃力',0,10000),hit=number(p.reverseReferenceHit,'元の対象PCの命中',0,2047.9375);
   const power=physical.power(saved,{itemClass:0xf0001,primarySkillInteger:Math.round(skill*10000),casterStateMode:1,world:p.world,weaponAttack:attack,weaponHit:hit,casterPhysicalPowerFraction:0,casterElementStrengthFraction:0});
   let hp=null,hpReason=null;
   if(p.reverseReferenceDamageConfirmed===true)try{hp=normalPc.damage({confirmed:true,encodedPower:power.encodedPower,defense:p.reverseReferenceDefense??null,seed:p.seed,critical:p.reverseReferenceCritical===true});}catch(error){hpReason=error.message;}
   if(hp?.supported&&p.targetPhysicalReductionId!=null)hp.targetReduction=targetReduction.apply(child,hp.value,{selectedId:p.targetPhysicalReductionId,world:p.world});
   return {...q,supported:true,power,inputs:{skill,attack,hit},value:power.preSpecialPower,...(p.reverseReferenceDamageConfirmed===true?{normalPcDamage:hp,damageReason:hpReason}:{}),
    ...(hp?.supported?{remaining:'指定した通常PC条件の1回HP要求量は計算済み。NPCが発生元の場合、盾・反射など追加作用、実際の反撃成立/対象選択・全期間の自動回数は別の未対応条件です。'}:{})};
  }catch(error){return {...q,reason:error.message};}
 }
 function durationCounter(d,row,p,names){
  const receipt=fixedReceipt(d,row,p);if(receipt&&d.counter>0&&d.interval>0&&!d.effects.some(e=>e.kind===60))return receipt.counter;
  if(row.unresolvedChildTimeInputs?.includes(d.id))throw Error('この防御子の抵抗時間入力が盾技能・親入力のどちらに由来するか未確定です');
  // Eliminate x symbolically; do not replace an unknown skill/weapon input by0.
  // With both coefficients0 the factor is exactly1 (any enabled cap is >=1).
  if([1,2,4].includes(d.action_type)&&!(d.flags&0x4000000)&&d.duration_coefficient===0&&(p.world===1||d.duration_extra===0))return Math.min(216000,Math.floor(d.counter+.5));
  const x=independentInput(d,row,p,names);
  if(!(d.flags&0x4000000))return timing.counter(d,x,p.world);
  const strength=channels(d,row,p,names);if(strength.m<=0&&strength.a<=0)return 0;
  if(!ordinal[d.element])throw Error('抵抗時間の属性に対応する対象能力が未確定');
  const rawSkill=d.id===row.internalId?p.skill:p.skills?.[names[d.primary_raw]],y=d.action_type===4?(p.generatedEntityInput?x:Math.trunc(Math.round(rawSkill*10000)*f(.0001)*16)/16):p.constructed?.[d.id]?.y??x;
  // This branch uses potency coefficients, not the normal duration coefficients;
  // kind164 suppresses the strength resistance only, not this duration lookup.
  const q=extensions.resistantDurationFactor(d,x,y,d.element===1?p.targetDefense:p.resistance,p.seed,p.world);
  if(!Number.isFinite(q.factor)||q.factor<0)throw Error('抵抗時間の除算が有効範囲外です。対象能力と閾値の条件を確認してください');
  return Math.min(216000,Math.floor(d.counter*q.factor+.5));
 }
 function summonTime(d,row,p,names){
  const life=d.effects.find(e=>e.kind===71);if(!life)throw Error('生成体の寿命指定kind71なし。既定寿命の供給元が未確定');
  const seconds=Math.trunc(life.selector/60);
  if(!d.effects.some(e=>e.kind===8))return seconds;
  const c=channels(d,row,p,names),dark=names[d.primary_raw]==='暗黒命令'&&d.id===row.internalId?p.skill:p.skills?.['暗黒命令'];
  return extensions.summonLifetime(seconds,c.m,c.a,Math.round(number(dark,'暗黒命令（召喚寿命）',0,inputs.skillMax)*10000));
 }
 function duration(d,row,p,names){
  const receipt=fixedReceipt(d,row,p);if(receipt&&d.counter>0&&d.interval>0&&!d.effects.some(e=>e.kind===60))return {supported:true,seconds:receipt.counter*receipt.interval/60,kind:receipt.source+'の受理1回の持続指定',receiptInput:{multiplier:1,addition:0,timeFactor:1,mode:7,counter:receipt.counter},scope:'子の要求が受理された条件。親の技能・対象耐性で再計算せず、倍率1・加算0・時間倍率1で生成した保持指定。解除・上書き後の実寿命や親の自動総量とは別。',evidence:['docs/client-numeric-gaps20-20261015.txt']};
  if(row.unresolvedChildTimeInputs?.includes(d.id))return {supported:false,seconds:null,baseSeconds:d.counter*d.interval/60,reason:'防御子の抵抗時間の入力継承が未確定。基礎保持指定を最終持続時間にしない'};
  if(d.action_type===5&&d.counter>0&&d.interval>0)return {supported:true,seconds:null,finiteDuration:false,kind:'条件継続中の反復保持（固定秒数なし）',
   scope:'772ac0は行動型5を残りcounter<=0で期限削除せず、更新後に初期counterへ戻す。技能・魔力から有限寿命を作らない。解除mask・装備等の保持条件が失われれば別途終了。',evidence:['docs/client-native-buff-activation-20261006.txt']};
  if(d.effects.some(e=>e.kind===251)&&d.interval===0)return {supported:true,seconds:null,finiteDuration:false,kind:'容量消費・解除で終了（固定秒数なし）',scope:'受理済み・未mark・解除条件なしの通常更新では、interval0の吸収容量を経過時間で減らさない。容量を使い切る損傷、解除・競合によって終了。無限の吸収量や無条件の永続を意味しない。',evidence:['docs/client-numeric-gaps24-20261016.txt']};
  if(d.action_type===3){
   const q=p.guardTimingById?.[d.id];
   if(q?.scheduledClock&&p.guardRegularClockConfirmed===true){const t=q.scheduledClock;return {supported:true,seconds:t.acceptedSeconds,kind:'防御受付幅（通常16ms更新条件）',
    scheduledClock:t,conditionalClock:true,actualElapsedVerified:false,startSeconds:t.startSeconds,endSeconds:t.endSeconds,actionSeconds:t.actionSeconds,
    scope:'地上の通常PC、通常の開始要求が受理され、開始時カウンタ0・以後16msごとに1更新し、中断・差替え・予定時計の再設定なしの条件。受付開始以上・終了未満の幅。Buff保持時間、技の成否、再使用待ち、現実の遅延を含む経過時間とは別。',evidence:[q.evidence,t.evidence]};}
   return {supported:false,seconds:null,reason:q?.scheduledClock?'受付カウンタと16ms基準時間は既知。通常更新の条件を指定すると受付幅を秒で計算します。実際の遅延を含む時間は別':'防御行動の受付時間は動作状態に属する。地上・通常開始と16ms更新の条件を指定してください。Buff counter=0を即時終了としません'};
  }
  if(d.id===392)try{return {supported:true,seconds:durationCounter(d,row,p,names)*d.interval/60,kind:'本体単独の保持時間指定（通常受付の条件）',partial:true,reason:'人数別定義の選択・共有終了・追加上書きは未確定。通常の本体受付式だけを表示し、合体全体の実持続とはしない',evidence:['docs/client-numeric-gaps9-20261011.txt']};}catch(e){return {supported:false,seconds:null,reason:e.message};}
  if(!d.effects.length&&!p.constructed?.[d.id]){
   const terminal=d.id!==row.internalId&&[row.definition,...row.dependencies].filter(Boolean).some(parent=>parent.effects.some(e=>[86,133].includes(e.kind)&&e.selector===d.id));
   if(terminal&&[1,2,4].includes(d.action_type)&&d.fieldC0<=0&&d.counter<=0&&d.interval===0)return {supported:true,seconds:0,nonPersistent:true,kind:'終端参照・持続Buff指定なし',scope:'初回の参照要求に持続Buffを作る指定がない。詠唱・動作・描画の所要時間が0という意味ではない。',evidence:['docs/client-numeric-gaps24-20261016.txt']};
   if(d.counter>0&&d.interval>0)try{return {supported:true,seconds:durationCounter(d,row,p,names)*d.interval/60,partial:true,kind:'効果行のない本体の保持指定',reason:'本体の保持指定だけが判明。壁の生成寿命や罠を発動する作用の時間とは別',evidence:['docs/client-numeric-gaps24-20261016.txt']};}catch(error){return {supported:false,seconds:null,reason:error.message};}
   return {supported:false,seconds:null,reason:'効果行なし。動作ヘッダの有効時間は未確定'};
  }
  if(d.effects.some(e=>e.kind===8))try{return {supported:true,seconds:summonTime(d,row,p,names),kind:'召喚寿命（生成要求）',evidence:['docs/client-numeric-gaps-20261011.txt']};}catch(e){return {supported:false,seconds:null,reason:e.message};}
  if(d.effects.some(e=>[9,89,94,169].includes(e.kind))&&d.effects.some(e=>e.kind===71&&e.selector>0)){
   const result={supported:true,seconds:Math.trunc(d.effects.find(e=>e.kind===71&&e.selector>0).selector/60),kind:'設置・生成寿命'};
   if(d.counter>0&&d.interval>0)try{result.bodySeconds=durationCounter(d,row,p,names)*d.interval/60;}
   catch(e){result.partial=true;result.reason='生成体寿命は既知。本体持続は未対応：'+e.message;}
   return result;
  }
  if(d.counter>0&&d.interval>0){try{
   return {supported:true,seconds:durationCounter(d,row,p,names)*d.interval/60,kind:d.flags&0x4000000?'持続（指定種値の抵抗時間分岐）':'持続',...(d.effects.some(e=>e.kind===8)?{partial:true,reason:'本体カウンタのみ。召喚体の寿命は未確定'}:{})};
  }catch(e){return {supported:false,seconds:null,reason:e.message};}}
  if(d.effects.some(e=>[8,9,89,94,71,41,147,49].includes(e.kind))||d.counter>0)return {supported:false,seconds:null,reason:'生成体の寿命または持続時間の入力経路は未確定'};
  return {supported:true,seconds:0,kind:'即時（本体）'};
 }
 function generatedActionChildren(actionBinding,p,row,names,math){
  return actionBinding.children.map(id=>{const child=generatedActions.children[id],cp={...p,skill:undefined,magic:undefined,skills:{},attack:undefined,generatedEntityInput:true,generatedActorCondition:p.generatedActorCondition?{...p.generatedActorCondition,world:p.world}:undefined,constructed:{},constructorErrors:{},casterElementStrengthPct:0,equipmentElementFractions:{},equipmentSkillBonuses:{}},childRow={...row,internalId:id,definition:child,dependencies:[]};
      const receipt=actionBinding.observedReceipt;
      const observedReceipt=[6773,8825,12564].includes(row.internalId)&&id===2991&&(receipt?.adoptedByUser===true||p.observedRestReceiptCase==='rest-6773-20261017')&&
       receipt?.caseId==='rest-6773-20261017'&&receipt.parentId===row.internalId&&receipt.childId===2991&&receipt.runtimeIndex===2113&&
       receipt.multiplier===1&&receipt.addition===0&&JSON.stringify(receipt.effectSignature)===JSON.stringify(child.effects);
      if(observedReceipt)cp.targetAmplificationAllowed=false; // Recorded M1/A0, not an assumed unknown NPC skill.
      if(actionBinding.nonAmplifiedOnly&&p.targetAmplificationAllowed!==false&&!observedReceipt)cp.generatedChannelsReason='休息Buffの増幅なしの定義量を計算できます。「技能・魔力による補正」を適用しない条件を選択してください。実付与時のM/Aの供給元は未確認で、生成体の技能入力から推定しません。';
      let seconds=child.counter===0&&child.interval===0?0:null,inputCondition=null,inputReason=null,durationReason=null;
       if(cp.generatedChannelsReason)inputReason=cp.generatedChannelsReason;
       else try{
        if(p.generatedActorCondition?.useTrapLevel===true)cp.generatedActorCondition=generatedInput.trapCondition(row.definition,actionBinding,cp.generatedActorCondition,p.skill);
        inputCondition=generatedInput.input(child,cp.generatedActorCondition,actionBinding);
       }catch(error){inputReason=error.message;}
      let physicalResult=null;
      if(inputCondition?.physical){
        cp.constructed[id]={x:inputCondition.x,y:inputCondition.y};cp.generatedActorCondition={...cp.generatedActorCondition,useKnownBaseStats:false,attack:inputCondition.attack,hit:inputCondition.hit};
        if(p.generatedActorCondition?.normalNpcTarget!==true||p.world!==0||p.numericTargetType&&p.numericTargetType!=='npc')physicalResult={supported:false,value:null,reason:'通常世界（0）で、生成体から通常NPCへの命中済み・盾/反射/追加補正なし条件を指定してください'};
       else try{const rule=generatedInput.physicalDefinitions[id],options={};
        if(p.targetPhysicalReductionId!=null){const q=targetReduction.selected(child,p.targetPhysicalReductionId,p.world);if(!q.supported)throw Error(q.reason);options.target273=q;}
        const q=physical.npcDamage(rule,{encodedPower:inputCondition.encodedPower,defense:p.targetDefense,seed:p.seed,incoming:1},options);
         physicalResult={supported:true,value:q.clientMessageAmount,power:inputCondition,evidence:[inputCondition.evidence,'dist/client-numeric-gaps32-20261016/npc-npc-physical-native-oracle.json'],scope:'生成体NPC→通常NPC、命中済み・盾/反射/追加損傷補正なしの本体1要求。使用者PCの装備や攻撃力、親の回数・総量は流用しません。'};
       }catch(error){physicalResult={supported:false,value:null,reason:error.message};}
      }
       if(child.counter>0&&child.interval>0)try{seconds=durationCounter(child,childRow,cp,names)*child.interval/60;}catch(error){durationReason=error.message;}
       // This is the existing, explicitly selected non-amplified branch. Its
       // channels are M=1/A=0, not an unknown NPC skill replaced with zero.
       const nonAmplifiedIndependent=(observedReceipt||p.targetAmplificationAllowed===false)&&actionBinding.nonAmplifiedInputElimination?.includes(id)&&
        child.effects.every(e=>e.kind===13&&[1,2,3].includes(e.selector)&&e.flags===48&&!e.qualifier&&!e.other10&&!e.other18);
       if(nonAmplifiedIndependent){inputReason=null;inputCondition={independent:true,evidence:actionBinding.evidence,scope:'技能・魔力補正を適用しないと明示した条件で、既存のM=1/A=0枝を使用。生成体の未知技能値を0で補いません。'};}
       if(observedReceipt){inputReason=null;inputCondition={independent:true,observedReceipt:receipt,evidence:receipt.source,scope:receipt.scope};}
       if(inputReason&&generatedInput.compatible(child)&&[1,4].includes(child.action_type)&&!(child.flags&0x4000000)&&child.duration_coefficient===0&&child.duration_extra===0&&
        (child.flags&0x1000||child.effects.every(e=>[15,16,18,25].includes(e.kind)))){inputReason=null;inputCondition={independent:true,evidence:'docs/client-numeric-gaps36-20261017.txt',scope:'この子定義の量/時間は発生元の技能・魔力を使わない。未指定の入力を0で代用せず消去。受理・状態更新は別条件。'};}
       // Separate reference output: never substitute this branch for the actual
       // receipt, eligibility, aggregate, or completion status.
       let knownNonAmplified=null;
       if(cp.generatedChannelsReason&&actionBinding.nonAmplifiedInputElimination?.includes(id)&&
        child.effects.every(e=>e.kind===13&&[1,2,3].includes(e.selector)&&e.flags===48&&!e.qualifier&&!e.other10&&!e.other18)){
        const referenceParams={...cp,targetAmplificationAllowed:false,generatedChannelsReason:undefined};
        const quantities=child.effects.map(ce=>effect(child,ce,childRow,referenceParams,names,math));
        if(quantities.every(q=>q.supported&&Number.isFinite(q.value)&&q.naturalRecovery))knownNonAmplified={
         condition:'技能・魔力補正なし（M=1/A=0）の条件付き参考値',
         quantities:quantities.map(q=>({resource:q.naturalRecovery.resource,perMinute:q.naturalRecovery.perMinute,estimated:q.estimated===true})),
         evidence:actionBinding.evidence,
         scope:'秒換算はジェネレイト ボディとの比較による推定。実付与時の補正値は未確定。実回復量・自動総量には加算しません。'};
       }
       return {id,name:child.name,knownNonAmplified,recipient:actionBinding.recipient||'生成体の行動が選択した対象',maximumRequests:actionBinding.maxRequests||null,effects:child.effects.map(ce=>({...decorateEffectPhase(effect(child,ce,childRow,cp,names,math),child,ce,childRow,cp,names,math),generatedEntityInput:true,...(inputCondition?{generatedInputCondition:inputCondition}:{}),...(ce.kind===64&&physicalResult?.supported?{resolved:true,partial:false,value:null,coveredByGeneratedPhysical:true,reason:null,meaning:'本体HP要求量は生成行動の物理欄で計算。同じ1要求を効果64として再加算しません'}:{})})),
       physicalResult,durationSeconds:seconds,durationReason,durationNote:actionBinding.durationNote,conditionNote:actionBinding.conditionNote,inputCondition,inputReason,candidateOnly:!!actionBinding.candidateOnly,scope:(actionBinding.candidateOnly?'親との結合が未照合の候補定義。その定義が単独で要求された条件の計算。':actionBinding.semanticSource?'wiki・実使用記録の作用と内部定義を照合した行動の1要求。':'基底定義・第0亜種の保存行動表に実IDで結合した行動の1要求。')+(inputCondition?inputCondition.scope:'使用者の技能/魔力を継承しません。入力と独立した量だけを表示します。')+' 受理・自動頻度・回数・親の総量は未確定。',remaining:inputReason||(inputCondition?.derivedTrap?'罠レベルから候補の技能入力・1要求量は計算済み。生成参照から爆発IDを選ぶ条件が未確定。':null)||'指定した生成体自身の入力で1要求を計算。実際の生成能力と有効回数・親の総量は未確定。表の補助欄を秒間隔や攻撃回数とみなさない'};});
 }
 function headerAction(row){
  const h=wikiHints.data.headerActions?.[row.internalId],d=row.definition;
  return h&&d&&h.kind==='planted-seed-trigger'&&d.effects.length===0&&d.id===h.parentId&&d.action_type===h.actionType&&d.primary_raw===h.primary&&d.required===h.required&&d.counter===h.counter&&d.interval===h.interval&&d.flags===h.flags?h:null;
 }
 function receivedDefinitionRule(row){
  const rule=wikiHints.data.receivedDefinitionChoices?.[row.internalId];
  if(!rule)return null;
  const byId=new Map([row.definition,...row.dependencies].filter(Boolean).map(d=>[d.id,d]));
  return rule.choices.every(c=>{const d=byId.get(c.id);return d&&d.name===c.name&&d.counter===c.counter&&d.interval===c.interval&&d.action_type===4&&d.group===c.group;})?rule:null;
 }
 function effect(d,e,row,p,names,math){
  const base={id:d.id+':'+e.index,definitionId:d.id,index:e.index,kind:e.kind,selector:e.selector,
   name:e.kind===23?'敵対・ターゲット状態操作':math.labels[e.selector]&&[41,147].includes(e.kind)?math.labels[e.selector]:math.kindNames[e.kind]||'効果'+e.kind,
   conditional:d.id!==row.internalId,recipient:(e.flags&1||!!(e.flags&2)!==!!(d.flags&0x400))?'使用者':'指定対象',value:null,supported:false,evidence:[]};
  const fail=reason=>{let diagnostic=null;
   if(row.matchStatus==='一致'&&e.kind===13&&[1,2,3].includes(e.selector)&&Number.isFinite(e.value))try{
    const c=stored(d,channels(d,row,p,names));diagnostic={name:['','HP','MP','ST'][e.selector]+'局所変化量',value:f(e.value*c.m+(e.value<0?-c.a:c.a)),unit:' / 内部elapsed 1単位',
     evidence:proof.recovery,scope:'秒換算・実回復量は未対応。対象/phase条件の成立を仮定'};
   }catch(_){}
   if(row.matchStatus==='一致'&&[41,147].includes(e.kind)&&!math.fields[e.selector]&&Number.isFinite(e.value))try{
    const c=channels(d,row,p,names);diagnostic={name:'能力selector '+e.selector+' の局所補正',value:f(f(e.value)*c.m+(e.value<0?-c.a:c.a)),unit:e.kind===147?'%（対象能力未確定）':'内部単位',
     evidence:proof.stat,scope:'補正メッセージの数値。単位・最終能力への換算は未対応'};
   }catch(_){}
   return {...base,category:'不足する式・仕様',reason:(reason||missing[e.kind]||('効果'+e.kind+'：作用の消費先、selector='+e.selector+'の意味、数量を持つかどうかが未確定'))+(diagnostic&&e.kind===13&&reason!==missing[13]?' / '+missing[13]:''),diagnostic};};
  if(row.matchStatus!=='一致')return {...fail('内部IDの照合が未確定'),category:'照合未確定'};
  if(p.generatedChannelsReason&&e.kind===13)return {...base,category:'不足する式・仕様',reason:p.generatedChannelsReason};
  if(e.kind===34){const acceptedValues={462:Math.fround(1.1),607:Math.fround(3.1),997:Math.fround(3.2),998:Math.fround(3.3),999:Math.fround(3.6)};
   const referenceOnly=[392,462].includes(row.internalId)&&acceptedValues[d.id]===e.value&&e.selector===0&&e.flags===48&&!e.qualifier&&!e.other10&&!e.other18;
   const q=fail('現行の通常Buff数量処理には登録先がありません。定義に残る設定値の別の採用先・意味・単位は未確定です。登録なしだけを根拠に作用なしとはしません。');
   return Number.isFinite(e.value)?{...q,...(referenceOnly?{userReferenceOnly:{kind:34,basis:'2026-10-17ユーザー指定：内部値の参考表示のみ。今回の数値残件から除外',meaningUnknown:true,rangeFormulaKnown:false}}:{}),diagnostic:{name:'効果34の保存設定値',value:e.value,unit:'（設定値・最終効果量ではない）',scope:'技能・魔力の倍率を掛けた効果量としては未確認。未確定値を0にしません。'+(referenceOnly?' ユーザー指定で参考表示のみとし、今回の数値残件から除外。':' '),evidence:'docs/client-numeric-gaps45-20261017.txt'}}:q;
  }
  if(e.kind===65&&e.value===0&&[1,2,3,4,5,6,7,10].includes(e.selector)&&!e.qualifier&&!e.other10&&!e.other18&&e.flags===48){
   const lightSetting=extensions.lightSelection(e.selector,p.otherLightProfile??null);
   const lightCandidates=[...new Set([row.definition,...row.dependencies].filter(Boolean).flatMap(d=>d.effects.filter(e=>e.kind===65&&e.selector>=1&&e.selector<=5).map(e=>e.selector)))];
   lightSetting.skillSelectionUnresolved=lightCandidates.length>1;
   return {...base,resolved:true,nonNumerical:true,meaning:lightSetting.label+'を指定する表示作用。技能・魔力を威力倍率として掛けない',name:'光源・視界の設定',lightSetting,partial:true,
    remaining:lightSetting.skillSelectionUnresolved?'各Lv定義の設定と、受理後の最大値採用は確認。複数Lv参照のうち技能ごとにどの定義が受理されるかを確定する子の入力条件が不足。参照候補の最大Lvを実際の技能別Lvとして表示しない':'受理済みの設定を採用する最大値規則は計算済み。他の状態の実取得・表示オブジェクトの実生成と終了は別。光量や照射距離を推測していない',evidence:['docs/client-numeric-gaps23-20261016.txt']};
  }
  if(e.kind===208){
   // 7abd20 queries kind208 through the actor's Buff lookup, then rejects the
   // candidate. This operation uses presence, not B/M/A or an invented chance.
   const condition=recognition.profile(p.recognitionProfile||'unknown');
   const worldFlags=e.flags&0x300,worldEligible=worldFlags===0x100?p.world!==1:worldFlags===0x200?p.world===1:true;
   const worldRequirement=worldFlags===0x100?'WarAge以外':worldFlags===0x200?'WarAgeのみ':'この行の地域制限なし';
   return {...base,name:'敵認識回避（候補選別）',resolved:true,nonNumerical:true,partial:true,meaningConfirmed:true,
   meaning:'効果208を保持する相手を通常の対象候補から除外する。NPCの強制敵対設定や、友好フィルタを省略する探索では、この照会を迂回する。',
   meaningStatus:'候補選別の本体と例外分岐を元命令で確認',
   remaining:'NPCごとの探索設定と呼出し時の条件の自動照合、既存ヘイト・感知範囲・最終ターゲット選択は別。確認した208の判定自体はレベル差・距離・乱数・効果量欄を使わない。',
   recognitionRule:{consumerProved:true,consumer:'0x7abd20',condition,quantity:'有無による候補除外。回避率の数値ではない',lookup:'PC24枠／NPC8枠。定義の存在bitを照会し、効果行のB・selector・地域flagsは読まない'},
   clientWorldGate:{eligible:worldEligible,world:p.world,flags:worldFlags,requirement:worldRequirement,isFinalNpcEligibility:false,evidence:'dist/effect208-recognition-20261015/world-gate-native-oracle.json'},
   internalParameters:{rawB:e.value,selector:e.selector,qualifier:e.qualifier,other10:e.other10,other18:e.other18,flags:e.flags,cacheOffset:0x878,presenceMask:0x10000},
   nativeClientPath:{normalizedKind:208,selectorConverted:false,cacheWritesPresenceOnly:true,registrationStateMask:0,registrationHandler:null,commonReadsBSign:true,scalarHandlerApplied:false,separateRecognitionConsumerKnown:true,recognitionConsumer:'0x7abd20'},
   evidence:['docs/effect208-recognition-20261015.txt',recognition.evidence,'docs/effect208-coeffects-20261015.txt','dist/effect208-consumer-20261015/coeffects-all-definitions.json']};
  }
  if(e.kind===183)return {...base,resolved:true,nonNumerical:true,active:true,partial:true,queuedMovementMarker:{lookupProved:true,skipsMovementGate:extensions.queuedMovementGate(true,false,false,0)},
   meaning:'この定義の存在マークにより、動作開始前の移動状態による一つの阻止判定を省略する。確認した枝はB・selector・M/A・効果flagsを数量として読まない。発動成功や移動距離を保証する数値ではない',
   remaining:'613446以降の動作型5のリセット・他の発動/資源条件・実動作、未確認の別消費先は状態/意味の残件。独立数量の式は確認されていない',
   evidence:['dist/client-numeric-gaps11-20261013/queue-marker-native-oracle.json','dist/client-numeric-gaps11-20261013/code-774230-774280.json']};
  if(e.kind===214&&d.action_type===2)return {...base,name:'通常物理の回避判定を省略',active:true,resolved:true,nonNumerical:true,
   meaning:'正の物理要求量ができた後、通常の命中・回避判定を呼び出さない。この判定内の強制回避197も照会しない。盾・反射・技自体の成否や、他の無効化まで省く意味ではない。',
   evasionBypass:{consumerProved:true,consumer:'0x5a57c6',query:'0x59f640',quantity:false,metadataUsed:false},
   evidence:['docs/client-physical-hit-20261005.txt','dist/client-numeric-gaps31-20261016/generated-bypass-native-oracle.json']};
  const modeInfo=extensions.effectModes(e);
  const unknownConditions=[];
  const stateMask=extensions.stateMaskRegistration(e.kind);
  // Selected232,102 and generated lifetime71 are consumed as cached
  // parameters/presence, not independently dispatched scalar handlers.
  const cachedAmount=extensions.cachedParameter(d,e);
  const metadataIndependent=extensions.scalarMetadataIndependent(e.kind)||stateMask;
  if((e.qualifier||e.other10)&&!metadataIndependent&&!cachedAmount||e.other18&&!modeInfo&&!stateMask&&!cachedAmount)unknownConditions.push('追加条件/入力欄の意味：qualifier='+e.qualifier+'、other10='+e.other10+'、other18='+e.other18);
  if(metadataIndependent&&(e.qualifier||e.other10))base.unresolvedMetadata='効果行+0c='+e.qualifier+' / +10='+e.other10+'の全体の意味は未確認。保存入力で成立したこの要求の量・dispatchには使用されない（限定元命令比較）。最終耐性・受理率を確定した表示ではない';
  if(e.flags&~(0x30|0x100|0x200|0x400|0x800|1|2|4|8|0x40|(modeInfo||stateMask||cachedAmount||passive.criticalDefinition(e)?0x80:0)))unknownConditions.push('効果flags=0x'+e.flags.toString(16)+'の対象条件・phase/mode切替の意味');
  if(e.flags&8)base.dispatchNote='元560cc0はbit0x08を量・対象選択に使用しない。受理された効果の量を表示';
  // These saved producers consume B/M/A, independently of dispatch gating.
  // Expose the conditional amount, keeping the unknown eligibility as partial.
  if(unknownConditions.length&&![1,2,3,5,8,9,11,12,13,18,19,23,27,31,32,38,41,42,43,44,45,49,57,71,78,80,82,83,85,87,89,92,93,94,101,107,112,113,114,115,120,122,123,124,127,130,132,142,147,169,170,171,173,177,180,184,190,200,201,210,213,217,232,237,239,250,251,256,260,269].includes(e.kind))return fail(unknownConditions.join(' / '));
  const a=!!(e.flags&0x100),b=!!(e.flags&0x200),night=!!(e.flags&0x400),day=!!(e.flags&0x800);
  if(night!==day&&!['day','night'].includes(p.timePeriod))return {...fail('ゲーム内の昼/夜を指定してください'),category:'入力不足'};
  const active=!(a!==b&&(a&&p.world===1||b&&p.world!==1))&&!(night!==day&&(night&&p.timePeriod==='day'||day&&p.timePeriod==='night'));
  const ok=(value,unit,evidence,extra={})=>({...base,supported:true,active,value,unit,modeInfo,evidence:[...evidence,...(d.effect_class===3||d.flags&0x4000000||e.kind===173?['docs/client-numeric-gaps5-20261011.txt']:[])],category:null,reason:null,...extra,
   ...(unknownConditions.length?{partial:true,conditionalEligibility:true,remaining:(extra.remaining?extra.remaining+' / ':'')+'効果本体が選択された場合の量。成立条件は未対応：'+unknownConditions.join(' / ')}:{})});
  const selectedChannels=()=>{const c=channels(d,row,p,names);return p.numericPhase==='initial'||modeInfo?.initial&&!modeInfo.update||[1,2,4].includes(d.action_type)&&d.fieldC0<=0&&d.counter<=0?c:stored(d,c);};
  const semantic=meaning=>({...base,active,resolved:true,nonNumerical:true,meaning,evidence:['docs/client-numeric-gaps-20261011.txt']});
  if(e.kind===111){const replacement=extensions.buffReplacement(d,e,{existingId:p.replacementBuffId,sameSource:p.replacementSameSource,marked:p.replacementMarked});if(replacement)return {...semantic(d.id===12834?'フュージョンと同じ競合グループへ、各段階より強い解除用定義を要求する':'魔法の封蝋と同じ競合グループへ、より強いリリース オブ マジックを要求し、効果中の旧パッシブを置換する'),name:'同一グループBuffの置換',replacementOperation:replacement,partial:true,
   scope:replacement.scope,remaining:'通常競合での旧Buffの除去条件は確認済み。実受理・全員への反映・終了後のパッシブ再付与は別の状態処理。独立した数量式は使用しない',evidence:['docs/client-numeric-gaps25-20261016.txt']};}
  if(e.kind===51)return {...semantic('混乱状態。通常の対象指定行動では、行動要求の対象を自身へ置き換える。自身指定・特殊な対象解決の行動には別の選択規則がある'),name:'混乱・行動対象の置換',meaningConfirmed:true,
   actionTargetRule:{ordinary:extensions.confusionTarget('specified-target',active),self:extensions.confusionTarget('specified-target',active,'self'),resolvedSpecial:extensions.confusionTarget('specified-target',active,'resolve-target',true),unresolvedSpecial:extensions.confusionTarget('specified-target',active,'resolve-target',false)},
   scope:'効果が有効で行動要求を構築する場合の対象選択。命中・行動の成功・最終受理は別条件。確認した処理は係数欄や技能・魔力を数量として使わない',evidence:['docs/client-numeric-gaps25-20261016.txt']};
  if(e.kind===21)return {...semantic('保持者の視点で、特定の不可視・霊体対象を半透明で表示するための状態。通常の表示条件に加えて参照される'),name:'不可視・霊体の表示補助',meaningConfirmed:true,
   visibilityRule:{viewerState:active,invisibleBranchOpacityFactor:active?.5:0,visualOnly:true,consumerProved:true},
   scope:'確認した不可視表示の分岐では基礎描画値の半分を使う。敵の索敵率・攻撃量・回復量・実視認距離を表す数値ではない。不可視になる作用本体は他の効果行で表示',evidence:['docs/client-numeric-gaps25-20261016.txt']};
  if(!Number.isFinite(e.value))return fail('効果量欄の数値型が未確定');
  try{
   const motionNamespace=wikiHints.data.motionReferenceKinds?.[e.kind],motionEntry=motionNamespace?.selectors[e.selector];
   if(motionEntry&&motionNamespace.scalarHandlerRegistered===false&&e.value===0&&e.qualifier===0&&e.other10===0&&e.other18===0&&e.flags===48)
    return {...semantic('モーション参照を指定する。保存selectorを正規化し、モデル動作のmetadataと照合した参照ID。HP損傷・回復量や能力補正の係数ではない'),partial:true,
     motionReference:{raw:e.selector,runtime:motionEntry.runtime,metadataWords:motionEntry.metadataWords,namespaceProved:true,scalarHandlerRegistered:false},
     scope:motionNamespace.scope,remaining:'実際に起動する時点と伝播先の選択は未確認。指定対象1体への既知の数量計算と、対象数・起動状態の再現は分離する',evidence:[motionNamespace.evidence]};
   if(e.kind===137&&e.value===0&&e.selector===0&&e.qualifier===0&&e.other10===0&&e.other18===0&&[16,48].includes(e.flags)){
    return {...semantic('通常PCのアイテム使用要求を制限する状態。4分類の要求を止め、分類0x20020には制限状態を引き渡す。独立したダメージ・回復量の係数ではない'),name:'アイテム使用要求の制限',partial:true,
     itemUseRestriction:{consumerProved:true,quantity:false,present:active,blockedClasses:active?[0x20010,0x20100,0x20400,0xf0001]:[],forwardedClass:0x20020,forwardedRestriction:active,consumer:'0x5f68e0',lookup:'PC+v334→4027c0→772250→774230'},
     scope:'通常の適合が成立したPCの使用要求。kind137の存在だけを照会し、B/M/Aは数量に用いない。分類0x20020の後段で何を許すか、最終使用成否・消費は別。',remaining:'アイテム分類名、0x20020の後段条件と実資源消費は状態・使用判定側の残件。独立した数値量へ読み替えない',evidence:['dist/client-numeric-gaps37-20261017/item-restriction-native-oracle.json']};
   }
   if([67,81,90,168,265].includes(e.kind)){
    const q=stateRequests.requestOperation(e);
    return {...semantic(q.meaning),requestOperation:q,partial:true,scope:q.scope,remaining:'要求の意味は確認済み。対象の受理・実動作・追従中の状態更新・地形補正後の位置・競合/終了は別の状態処理。数量0として扱わない。',evidence:['docs/client-numeric-gaps21-20261015.txt']};
   }
   if(e.kind===79){
    const q=stateRequests.revivalRestoration(d,e,p.casterMaxHP??null);
    // Actual428 also contains123(B100,flags48). Its caller suppliesM1/A0;
    // retain this auxiliary request rather than completing only the HP branch.
    q.interruption=extensions.interruptRequest(100,1,0,p.random15);
    if(p.fixedUpdateElapsed!=null)q.interruptionOpportunities=extensions.receiptPeriodicRequests(q.childId,123,p);
    if(q.assigned===null)return {...fail('自動蘇生する使用者の最大HPを指定してください。参照先のHP指定値10は確認済み'),category:'入力不足',restoration:q,quantityRole:'stateAssignment',recipient:'使用者',name:'自動蘇生のHP指定'};
    return ok(active?q.assigned:0,'HP',['docs/client-numeric-gaps21-20261015.txt'],{name:'自動蘇生のHP指定（加算回復ではありません）',recipient:'使用者',quantityRole:'stateAssignment',restoration:q,scope:q.scope,partial:true,remaining:'HP指定と保持子123の1要求の一次抽選率は計算済み。保持子のinterval1更新で成立する中断の有効回数・全期間の結果は未確定。自動蘇生の発動・子の受理/終了・HP保存・死亡状態の再現は別。'});
   }
   if(e.kind===50){
    const q=passive.stConsumptionEffect(e,active,p.affectedBaseST==null?null:number(p.affectedBaseST,'効果を受ける側の行動の基礎ST',0));
    return ok(q.multiplier,'倍',['docs/client-numeric-gaps18-20261015.txt'],{name:'通常PCのST消費倍率',stConsumption:q,scope:q.scope});
   }
   if(e.kind===178){
    if(!passive.actionWaitDefinition(e))return fail('AI行動待機の追加定義条件が未照合です');
    const q=passive.actionWait(active?[{effects:[e]}]:[],{baseCounter:p.aiWaitBaseCounter??null,exempt:p.aiWaitExempt===true,actionGroup:p.aiWaitGroup===3?3:0,random15:p.random15??null});
    return ok(q.addition,'ms',['docs/client-numeric-gaps18-20261015.txt','dist/client-numeric-gaps26-20261016/clock-binding.json'],{name:'AI行動待機への加算',actionWait:q,partial:true,scope:q.scope,
     remaining:'当該AIリストへの登録・実行の成立条件と解除、詠唱や動作を含む実攻撃間隔は別残件。PC一般へこの加算を流用しない'});
   }
   if(e.kind===176||e.kind===207){
    if(e.selector||e.qualifier||e.other10||e.other18||e.flags!==48)return fail('発動条件効果の追加欄・対象条件が未照合です');
    if(e.kind===176){const q=inputs.hpUpperPredicate(e.value,p.casterCurrentHP,p.casterMaxHP);
     return ok(q.percent,'%', ['docs/client-numeric-gaps18-20261015.txt'],{name:'使用者HPの発動上限割合',hpUpperPredicate:q,
      scope:'使用者の現在HP÷最大HPが保存割合以下なら、この一つの条件を通過（等号を含む）。閾値はBの直接値で技能・魔力補正なし。成否・他の条件・実行可否全体は別。損傷値は条件成立時の試算。'});
    }
    const q=passive.facingRequirement(p.sourceYaw,p.targetYaw);
    return {...semantic('使用者と対象の向き差による発動制限'),facingRequirement:q,partial:true,scope:q.scope,
     remaining:'位置・地形・他の発動条件、当該技が最終的に実行されるかは別。向きが未指定なら成立済みとはしない。損傷値は条件成立時の試算。',evidence:['docs/client-numeric-gaps18-20261015.txt']};
   }
   if(e.kind===136||e.kind===165){
    if(!passive.actionRestrictionDefinition(e))return fail('行動許可・禁止リストの追加定義欄が未照合です');
    const action=passive.restrictionExamples[p.restrictionActionId],q=action?passive.actionRestriction(active?[{effects:d.effects}]:[],p.restrictionActionId,action.flags):null;
    const selectorName=passive.restrictionExamples[e.selector]?.name||'行動ID '+e.selector;
    return {...semantic((e.kind===136?'許可リスト':'禁止リスト')+'で'+(e.kind===136&&e.selector===1?'行動flags64の技':selectorName)+'を指定する'),
     actionRestriction:{consumerProved:true,kind:e.kind,selector:e.selector,selectedActionName:action?.name||null,result:q},partial:true,
     scope:'受理済みリスト内の136は許可、165は指定IDを拒否する。8/24枠を前から走査し、最初の決定で終了する。別の発動条件・成否・資源消費の許可ではない。',
     remaining:'効果リストへの実登録・競合・解除、他の発動条件は別。各参照定義が単独で成立する条件の判定で、全子を同時適用しない。',evidence:['docs/client-numeric-gaps18-20261015.txt']};
   }
   if(e.kind===46){
    const q=passive.recoverySuppression(e,active);
    return {...semantic('基礎HP/MP自然回復の更新を抑止する'),recoverySuppression:q,partial:true,scope:q.scope,
     remaining:'HP/MPの既存累積値・実保存と解除後の状態遷移は別の状態処理。ST回復・Buff継続量を0にはしない',evidence:['docs/client-numeric-gaps18-20261015.txt','docs/client-recovery-rebuild-20261006.txt']};
   }
   if(e.kind===127){
    const q=visual.fogSetting(e.value,p.visualFogAdmitted);if(!q.supported)return fail(q.reason);
    return ok(q.value,'内部描画値',[q.evidence],{name:'PC視界描画の指定値',visualFog:q,partial:true,scope:q.scope,
     remaining:'この描画値は計算済み。NPCの対象見失い・タゲ切り、他の視界モードとの競合・解除・実視認距離は別の状態作用。0は定義が指定する描画値で、0ダメージや未対応の代用ではない'});
   }
   if(e.kind===162&&[1,2].includes(e.selector)){
    const skill=d.id===row.internalId&&d.primary_raw===68?p.skill:number(p.skills?.[names[68]],'盗み（盗取要求）',0,inputs.skillMax),q=stateRequests.theftPacket(Math.round(skill*10000),e.selector,p.theftInputBefore??null);
    return ok(q.skillInput,'技能入力',['docs/client-numeric-gaps20-20261015.txt'],{name:'盗取要求・技能入力（補助値）',partial:true,quantityRole:'auxiliary',theftPacket:q,theftRequest:{messageType:205,selector:e.selector,rawB:e.value,usesStat88:true},
     scope:(e.selector===1?'通常物品':'希少物品')+'の要求。'+q.scope+' この単独計算は、別の163補正を採用しない条件。',
     remaining:'技能と能力88は独立した要求欄。能力88の全供給元・採用Buffの自動収集、対象HPによる補正、最終成功率と盗取物品/数量は未確定。技能入力の計算を窃盗成功の完成とはしない'});
   }
   if([267,277].includes(e.kind)){
    const displayPlacement=passive.displayPlacement(e,d.action_type);
    return {...semantic(displayPlacement.meaning),displayPlacement,evidence:['docs/client-numeric-gaps14-20261015.txt','dist/client-numeric-gaps14-20261014/placement-native-oracle.json'],scope:displayPlacement.scope};
   }
   if(e.kind===125){
    if(!passive.itemDelayDefinition(e))return fail('アイテム待ち補正の追加条件・設定値が未照合です');
    const q=passive.itemDelay(active?[{id:d.id,effects:[e]}]:[],{baseCounter:p.itemDelayBaseCounter});
    return ok(q.multiplier,'倍',['docs/client-numeric-gaps14-20261015.txt'],{name:'アイテム使用の待ち値倍率（効果受理時）',itemDelay:q,
     partial:true,scope:q.scope,remaining:'実秒への換算、動作の受付条件・失敗・再使用可能時刻は未確定。指定した補正前カウンタへの演算は接続済み。PC/NPCへの受理とBuff登録順は前提条件で、別の技能ディレイへ倍率を流用しない'});
   }
   if(e.kind===72){
    const cache=d.weaponWearCache;
    if(!cache?.savedRecordMatchesCurrent||cache.sourceOffset!=='0x830'||cache.value!==e.value||!Number.isInteger(e.value)||e.value<1||e.value>30000||e.selector||e.qualifier||e.other10||e.other18||e.flags!==48)return fail('使用武器の耐久キャッシュ値と効果行、対象条件の照合が不足しています');
    let wear={request:cache.value,after:null};
    if(p.weaponWearConfirmed===true){
     const current=number(p.weaponDurabilityRaw,'使用武器の現在内部耐久',1,32767);
     if(!Number.isInteger(current)||typeof p.weaponKeepsOne!=='boolean')throw Error('使用武器の内部耐久整数と破損条件を指定してください');
     wear=extensions.equipmentWear(cache.value,current,p.weaponKeepsOne);
    }
    return ok(cache.value,'耐久内部値',['docs/client-numeric-gaps14-20261015.txt'],{name:'使用武器の耐久消費（損傷要求1回）',wear,weaponWearCacheProved:true,count:1,
     partial:true,scope:'使用者の適合する耐久武器へ損傷要求が成立した1回分。技能・魔力・ダメージ量では変わりません。内部耐久と通常表示耐久は区別し、他の耐久減少Debuffと合算しません。',
     remaining:'成否/中断時の要求回数、武器選択の実状態、連射・周期中の総消費は未確定。壊れて消滅するかの最終処理は別。1回の要求と指定した有効武器への減算だけを表示'});
   }
   if(e.kind===195){
    if(!passive.jumpDefinition(e))return fail('跳躍補正の追加条件・設定値が未照合です');
    const q=passive.jump([{effects:[e]}],p.world);
    return ok(q.multiplier,'倍',['docs/client-numeric-gaps13-20261014.txt'],{name:'通常ジャンプの初期鉛直値の倍率',
     jump:{...q,initial:p.normalJumpConfirmed===true?q.initial:null,conditionReason:p.normalJumpConfirmed===true?null:'通常ジャンプが成立する条件を指定してください'},
     partial:true,scope:q.scope,remaining:'ジャンプ可能状態・キー受付・自動消費/解除、衝突とその後の軌道は別条件。1回だけ有効なBuffを持続中ずっと再使用できるとは扱わない'});
   }
   if([245,248].includes(e.kind)){
    if(!rangeBuffs.fixed(e))return fail('この範囲効果のselector・追加条件は未照合');
    // This preview assumes this effect was accepted. Known conflict-group
    // occupants would have been replaced, so do not count them a second time.
    const value=active?e.value:0,records=(p.activeRangeRecords||[]).filter(r=>r.id!==d.id&&(!d.group||r.conflictGroup!==d.group));
    const total=rangeBuffs.collect([...records,{id:d.id,effects:[{...e,value}]}],e.kind);
    const before=e.kind===245?p.areaRadiusBase:p.rangedRangeBase;let range=null,rangeReason=null;
    try{range=rangeBuffs.project(before,total,e.kind);}catch(error){rangeReason=error.message;}
    return ok(value,'内部距離',['docs/client-numeric-gaps12-20261014.txt'],{name:rangeBuffs.names[e.kind],range,rangeReason,
     scope:'このBuffを受けたプレイヤーの通常状態で、固定値を加算。技能・魔力・種値では変動しません。成立条件を満たした成功時の値です。'});
   }
   if(e.kind===262){
    if(e.selector!==0||e.qualifier||e.other10||e.other18||![48,304,560].includes(e.flags))return fail('武器表示倍率の追加条件・selectorが未照合です');
    const q=extensions.equipmentDisplayScale(null,active?e.value:1,true);
    return ok(q.multiplier,'倍',['docs/client-numeric-gaps44-20261017.txt'],{name:'該当武器の表示サイズ倍率',equipmentDisplayScale:q,scope:q.scope,
     rangeEvidenceCorrection:{oldCandidate:'0x589596',normalFlowSkipsCandidate:true,scope:'過去に射程consumerとした断片は無条件ジャンプで飛ばされる領域で、通常経路の証拠ではなかった。既知の表示倍率を、別効果248の射程加算へ掛けない。'}});
   }
   if(e.kind===116){const q=extensions.equipmentRestriction(active?e.selector:0);
    return {...semantic('通常PCで受理された装備制限の索引mask。係数を持つダメージ・回復・能力加算ではない'),equipmentRestriction:q,partial:true,
     remaining:'内部18索引の部位名と実装備操作での採用先、実状態の適用/解除は未確認。既知の独立数量を保留する条件にはしない',
     evidence:['dist/client-numeric-gaps11-20261013/shared-native-oracle.json','dist/client-numeric-gaps9-20261011/code-56c760-56c790.txt','dist/client-numeric-gaps11-20261013/data-1360918-13609a8.json']};
   }
   if(e.kind===172&&[5,6].includes(e.selector))return {...semantic('type59の表示要求。5a9140→757040→756e10→756010は画面効果オブジェクトへ表示モードと内部描画カウンタを渡す。HP/MP/STや戦闘能力を加算する要求ではない。描画カウンタを戦闘周期・秒精度のBuff終了として使わない'),
    presentation:{selector:e.selector,displayObjectType:0,displayMode:e.selector===6?0x1000000:0},evidence:['dist/batch-numerics-20261012/screen-request-native-oracle.json']};
   if(e.kind===172&&e.selector===3)return {...semantic('保持中の視界表示を変更する。受信type59とは別に560f80が受理済み定義のselector3を読み、画面表示へmode0x08000000を要求する。HP/MP/STの巻戻し量やダメージの演算ではない'),presentation:{selector:3,displayMode:0x8000000,consumer:'0x560f80'},evidence:['docs/client-numeric-gaps23-20261016.txt']};
   if(e.kind===193&&e.selector===0&&e.value===0&&e.flags===48)return {...semantic('宝箱の罠を一時停止する保持作用。対象に193が存在すると、種別3の保留処理で罠の要求43を発行しない。種系の設置物解除（効果74）とは別。確認した抑止処理は威力や解除率の係数を使わない'),trapSuppression:{consumerProved:true,classification:3,requestType:43,quantity:false},partial:true,remaining:'元命令と保存説明で罠要求の抑止を照合。対象の罠の適合・保持時間の途中解除と実ゲームの発動成否は別の状態条件',evidence:['docs/client-numeric-gaps23-20261016.txt']};
   const verifiedOperation=wikiHints.data.verifiedOperations?.[d.id];
   if(verifiedOperation&&verifiedOperation.kind===e.kind&&JSON.stringify(verifiedOperation.effectSignature)===JSON.stringify(d.effects))return {...semantic(verifiedOperation.meaning),verifiedDescriptionOperation:{quantity:false,basis:'saved-definition-description',scope:verifiedOperation.scope},evidence:[verifiedOperation.evidence]};
   const areaCandidate=wikiHints.data.areaCandidates?.[d.id];let areaDetails=null;
   if(areaCandidate?.allowedWorlds&&!areaCandidate.allowedWorlds.includes(p.world))return {...semantic('この地域条件では領域の作用を要求しない（wikiと内部定義の地域条件）'),active:false,generationNotRequested:true};
   const rawActionBinding=generatedActions.bindings[d.id+':'+e.index];
   if(rawActionBinding?.numericTargetRestriction==='npc'&&p.numericTargetType&&p.numericTargetType!=='npc')return {...fail('対PCの威力減少係数・適用先は未解析です。通常NPC対象の値をPCへ流用しません'),numericBranchGap:true};
   if(rawActionBinding?.allowedWorlds&&!rawActionBinding.allowedWorlds.includes(p.world))return {...semantic('wikiで指定された地域条件では生成行動を要求しない。この条件下の数値を通常の発動量にしません'),active:false,generationNotRequested:true};
    if(rawActionBinding?.choice&&!rawActionBinding.candidateOnly&&!rawActionBinding.children.includes(p.areaBuffChoice))return {...fail('計算する付随作用を選択してください。実際の選択・付与条件を根拠なく自動決定しません'),category:'入力不足'};
   const compareCandidates=rawActionBinding?.candidateOnly===true&&rawActionBinding.choice===true&&p.areaBuffChoice==null;
   const actionBinding=rawActionBinding?.choice?{...rawActionBinding,children:compareCandidates?rawActionBinding.children:rawActionBinding.children.filter(id=>id===p.areaBuffChoice),candidateComparison:compareCandidates}:rawActionBinding;
   if(actionBinding&&actionBinding.kind===e.kind&&actionBinding.selector===e.selector){
    if(actionBinding.candidateOnly&&!actionBinding.children.length)areaDetails={generatedActionBinding:actionBinding,areaBindingConfirmed:false,generatedActionNames:[],generatedActionReason:'候補IDを選択すると、その定義の単独値を計算します。親から発行される実IDは未照合です。'};
    else if(p.summonBaseVariant!==true&&!actionBinding.semanticSource&&!actionBinding.candidateOnly)areaDetails={generatedActionBinding:actionBinding,generatedActionNames:actionBinding.children.map(id=>generatedActions.children[id].name),generatedActionReason:'基底定義の第0亜種を採用する条件を指定すると、確認できた行動と独立して確定した量を表示します。発動回数は推測しません'};
    else{
       const children=generatedActionChildren(actionBinding,p,row,names,math);
      areaDetails={generatedActionBinding:actionBinding,selectedChild:children[0],additionalChildren:children.slice(1),areaBindingConfirmed:!actionBinding.candidateOnly,
       ...(actionBinding.nonAmplifiedOnly&&p.targetAmplificationAllowed!==false&&children[0].inputReason?{numericBranchGap:true,remaining:children[0].inputReason}:{}),
       evidence:[actionBinding.evidence||(actionBinding.semanticSource?'dist/client-numeric-gaps36-20261017/additional-semantic-bindings.json':'docs/client-numeric-gaps21-20261015.txt')]};
    }
   }
   if(actionBinding?.semanticSource&&areaDetails)return {...semantic('wikiの作用と内部定義を照合した子行動。発生元が通常NPCという条件の1要求。生成レベルを効果量へ読み替えない'),partial:true,...areaDetails};
   if([8,9,94,169].includes(e.kind)&&areaCandidate&&e.kind===(areaCandidate.kind||9)&&e.selector===areaCandidate.selector){
    if(areaCandidate.npcOnly&&p.numericTargetType&&p.numericTargetType!=='npc')return {...semantic('NPC専用の作用です。PC/ペットへの数値を生成しません'),active:false,generationNotRequested:true};
    const selected=areaCandidate.choice?areaCandidate.children.filter(c=>c.id===p.areaBuffChoice):areaCandidate.children;
    if(!selected.length)return {...fail('計算するルーレットの抽選結果を選択してください。色と効果の対応・抽選率は未確定です'),category:'入力不足'};
    if(selected.some(child=>!(child.flags&0x1000)&&!wikiHints.data.coefficientIndependentAreaChildren?.[child.id]&&!child.effects.every(q=>wikiHints.data.strengthIndependentEffectChildren?.[child.id]?.includes(q.kind))||child.flags&0x4000000||['duration_coefficient','duration_limit','duration_extra','duration_extra_limit'].some(k=>child[k]!==0)))
     return {...fail('候補Buffの強度または持続時間の入力生成が未確定。親入力や仮の倍率1で埋めません'),candidateSourceUnresolved:true};
    const children=selected.map(child=>({id:child.id,name:child.name,recipient:areaCandidate.recipient||'このBuffを受理した対象',
     effects:child.effects.map(ce=>{const q=effect(child,ce,{...row,internalId:child.id},{...p,targetAmplificationAllowed:child.flags&0x1000?false:p.targetAmplificationAllowed,semanticAreaDefinitionId:child.id,casterElementStrengthPct:0,equipmentElementFractions:{}},names,math);return areaCandidate.effectLabels?.[q.id]?{...q,name:areaCandidate.effectLabels[q.id],scope:q.scope+'。wikiの詠唱速度という表現と区別し、解析済みの時間係数を表示。詠唱秒・再使用待ち秒へは読み替えません。'}:q;}),
     durationSeconds:child.counter*child.interval/60,numericInputKind:child.flags&0x1000?'fixed-strength-buff':'coefficient-independent-buff',sourceBindingConfirmed:areaCandidate.identityConfirmed===true,
     scope:'子定義の受理1回。親の増幅を継承しない。'+(child.flags&0x1000?'強度固定。':'技能係数は消去できるが、指定種の強度差は計算。')+(areaCandidate.identityConfirmed?'wikiの作用説明と内部Buffの効果・分類を照合済み。':'付与元とのID結合は未確定な候補の単独値。'),
     remaining:areaCandidate.remaining}));
    areaDetails={
     selectedChild:children[0],additionalChildren:children.slice(1),areaBindingConfirmed:areaCandidate.identityConfirmed,semanticBinding:areaCandidate.semanticBinding?{...areaCandidate.semanticBinding,childIds:children.map(c=>c.id)}:null,
     evidence:areaCandidate.semanticBinding?['dist/client-numeric-gaps36-20261017/semantic-buff-bindings.json']:['dist/batch-numerics-20261012/area-bindings-evidence.json','dist/batch-numerics-20261012/area-child-definitions.json']};
    if(areaCandidate.identityConfirmed)return {...semantic('wikiの作用と内部定義を照合した付随効果。対象に成立した1回の量・時間を表示。自動発動回数・親全体の総量は別'),partial:!!areaCandidate.semanticBinding,...areaDetails};
    // Keep the independent, already known generation input below. A child
    // range modifier must neither replace that input nor erase it. The
    // unconfirmed source binding still keeps the parent numerically partial.
   }
   const areaRule=wikiHints.data.areaChildren[d.id];
   if(e.kind===9&&areaRule&&e.selector===areaRule.selector){
    const child=areaRule.child,cp={...p,targetAmplificationAllowed:false},cr={...row,internalId:child.id};let application=null,applicationReason=null;
    try{application=wikiHints.areaWindow(areaRule,p.areaCondition||{});}catch(error){applicationReason=error.message;}
    return {...semantic('PCへマジック エンハンスを要求する設置領域（wikiの子Buff名と内部ID5826を照合）。技能/魔力を増幅入力へ流用しない'),
     selectedChild:{id:child.id,name:child.name,recipient:'陣内PC',effects:child.effects.map(ce=>effect(child,ce,cr,cp,names,math)),durationSeconds:child.counter*child.interval/60,
      scope:'新規付与が成立した1回分。魔力+10・20秒は内部定義。MP自然回復は既存の秒換算推定。適用中は更新せず、陣外/陣消滅でも残り時間を保持（wiki）',
      remaining:'設置物から子Buffを発行する呼出位置は未特定。量/時間は子の内部定義、適用・非更新規則は提示wiki。実受理と他Buffの競合は別'},
     areaApplication:application,areaApplicationReason:applicationReason,evidence:['dist/wiki-hints-20261012/wiki-evidence.json','dist/wiki-hints-20261012/hint-definitions.json']};
   }
   if(e.kind===13){
    const c=selectedChannels(),q=recovery.estimate(e.value,c.m,e.value<0?-c.a:c.a,e.selector);
    // A rate must not enter the per-request HP/MP/ST aggregation. No count or
    // duration multiplication: active elapsed and refresh integrals are unknown.
    return ok(active?q.perMinute:0,q.resource+'/分',[proof.recovery,'docs/natural-recovery-estimate-20261012.txt'],{
     name:q.resource+'自然増減速度（推定）',estimated:true,partial:true,naturalRecovery:q,
     scope:q.scope,remaining:q.remaining,
     diagnostic:{name:q.resource+'局所変化量',value:q.perInternalUnit,unit:' / 内部elapsed 1単位',evidence:proof.recovery,scope:'内部要求の計算値。秒換算は別の推定'}});
   }
   if(e.kind===23){if(!active)return ok(0,'要求ポイント',['docs/client-numeric-gaps9-20261011.txt'],{name:'NPC敵対要求（条件不成立）',partial:true,remaining:'NPCへの受理条件と伝播先は未接続'});
    if(e.value===0)return semantic('type17の0量。PCの向き/ターゲット変更とNPC敵対加算を起こさない');
    const q=stateRequests.hostility(e.value,p.hostilityBefore,p.hostilityPromoted);return ok(q.request,'要求ポイント',['docs/client-numeric-gaps9-20261011.txt'],{name:e.value<0?'関連NPCへの敵対要求（対象NPCのリスト解除とは別）':'NPCの対象別敵対要求',hostility:q,partial:true,scope:q.scope,remaining:q.remaining});}
   if(e.kind===80){const q=stateRequests.turn(p.facingBefore);return ok(active?q.addition:0,'ラジアン',['docs/client-numeric-gaps9-20261011.txt'],{name:'対象の向きへの加算（半回転）',turn:active?q:null,partial:true,scope:'type39が受理されvirtual200が許可する対象。角度はfloat32のπを加算。B/技能/魔力には依存しない',remaining:'PCは向き欄、NPCは向き要求へ適用。受理可否と角度の後段正規化は未接続'});}
   if(e.kind===184){const q=stateRequests.launch(e.value);return ok(active?q.initial:0,'鉛直内部値',['docs/client-numeric-gaps9-20261011.txt'],{name:'跳躍の初期鉛直移動値',launch:active?q:null,partial:true,scope:q.scope,remaining:'通常空中枝以外の更新・最終座標/飛距離は未計算'});}
   if(e.kind===59){
    if(e.selector!==0||e.qualifier||e.other10||e.other18||e.flags!==48)return fail('効果59の別移動モード・追加条件は未対応。selector0→mode2000の枝だけを確認');
    const q=stateRequests.floating(e.value,p.floatHeight);return ok(active?q.heightOffset:0,'高度内部単位',['dist/client-numeric-gaps26-20261016/weather-floating-native-oracle.json'],{name:'浮遊基準からの上昇境界',floating:active?q:null,movementMode:{raw:0,runtime:2000},partial:true,scope:q.scope+' 保存selector0は読込み時にmode2000へ変換。Bを高度境界として使い、M/A・技能・魔力で増幅しない。',remaining:'相対高さ未指定時は境界だけを表示。初期基準高度の実地形照会、特殊下降・衝突・最終高度は状態再現の残件'});
   }
   if(e.kind===87){const q=stateRequests.floating(e.value,p.floatHeight);return ok(active?q.heightOffset:0,'高度内部単位',['docs/client-numeric-gaps9-20261011.txt'],{name:'浮遊基準からの上昇境界',floating:active?q:null,partial:true,scope:q.scope,remaining:'相対高さ未指定時は境界だけを表示。mode2001の遷移・特殊下降・地形照会の実行は未接続'});}
   if(e.kind===142){const q=stateRequests.sinking(active?e.value:0,number(p.sinkingBefore,'この効果を除く鉛直補正',-10,100));return ok(q.velocity,'鉛直内部値',['docs/client-numeric-gaps9-20261011.txt'],{name:'条件付き鉛直移動の1更新値',sinking:q,partial:true,scope:q.scope,remaining:'移動flag条件の実状態判定・座標積分・秒換算は未接続'});}
   if(e.kind===93){const q=casting.range(active?e.value:0,p.rangeAction);return ok(q.addition,'距離単位',['docs/client-numeric-gaps9-20261011.txt'],{
    name:'魔法射程への加算',magicRange:q,partial:true,scope:'使用者の採用済みkind93値を×256→signed16→÷256し、魔法の定義射程に加算。技能/魔力に依存しない',
    remaining:'技型1の射程値。対象の体格・補正・遮蔽等を含む最終使用可否とは別。同種の保持値が複数ある場合の採用順は未確定'});}
   if(e.kind===92){const q=casting.hold(active?e.value:0,number(p.reuseRequest?.concentration,'集中力',0,inputs.skillMax),p.random15);return ok(q.percent,'%',[
    'docs/client-numeric-gaps9-20261011.txt'],{name:'通常PCの詠唱中断抵抗率（指定条件・15bit均等時）',hold:q,partial:true,scope:q.scope,
     remaining:'特殊詠唱の3回カウンタ、被害引数0、NPC/状態2は別枝。中断要求の発生・受理と合成した総成功率は未計算'});}
   if([113,114].includes(e.kind)){
    const prior=number(e.kind===113?p.fallDamageFactor:p.fallSpeedFactor,'この効果を除く落下'+(e.kind===113?'損傷':'移動')+'倍率',0,1);
    const value=active?movement.factor(e.selector,prior):prior;let fallResult=null;
    if(e.kind===113&&p.fallHeight!=null)fallResult=movement.landing(value,p.fallHeight,p.fallSkill,p.fallOverload);
    else if(e.kind===113&&p.fallDamageBefore!=null)fallResult=movement.fallDamage(value,p.fallDamageBefore);
    if(e.kind===114&&p.fallVelocityBefore!=null)fallResult=movement.fallStep(value,p.fallVelocityBefore);
    return ok(value,'倍',['docs/client-numeric-gaps9-20261011.txt'],{name:e.kind===113?'落下損傷への倍率':'下降加速度・下降限界への倍率',fallResult,partial:true,
     scope:'既存倍率 − (1 − selector×保存float32の0.01)、下限約0.001・上限1。技能/魔力の増幅なし。乗算で重ねない',
     remaining:e.kind===113?'通常PCの落差・技能・有効重量超過から損傷要求まで計算可能。着地損傷枝の成立・HP保存後の状態変化は別':'通常の空中更新枝を対象とする。特殊移動・衝突・更新間隔の秒換算は未確定'});
   }
   if(e.kind===121){
    if(!Number.isInteger(p.weatherIndex)||!weatherChildren.slots[p.weatherIndex])return fail('天候区分を指定してください。区分0〜9を773c60の保存参照表へ照合します');
    const slot=weatherChildren.slots[p.weatherIndex],child=weatherChildren.children[slot.id],cp={...p,weatherChildDefinitionId:child.id},cr={...row,internalId:child.id};
    const oneShot=d.id===450&&d.action_type===4&&d.counter===0&&d.interval===0&&d.effects.length===1&&e.flags===48&&!e.qualifier&&!e.other10&&!e.other18;
    const accepted=oneShot&&p.weatherChildAccepted===true,seconds=oneShot?child.counter*child.interval/60:child.counter>0&&child.interval>0?child.counter*child.interval/60:null;
    return {...semantic('天候区分に対応する子効果を指定対象へ要求する作用。子に倍率1・加算0・時間倍率1を渡す。親の技能/魔力を流用しない'),partial:true,
     weatherRequest:{oneShot,accepted,count:accepted?1:null,childPersistent:child.counter>0,consumerProved:oneShot},
     selectedChild:{id:child.id,name:child.name,recipient:base.recipient,effects:child.effects.map(ce=>effect(child,ce,cr,cp,names,math)),durationSeconds:seconds,
      scope:'天候区分'+p.weatherIndex+'・対象virtual164成立・子が受理された1回分。'+(oneShot?'親は持続レコードを作らず、1使用で選択した子を1回要求。晴の子も持続Buffを作らない。動作・描画の時間が0という意味ではない。':'counter×interval/60の保持指定。'),remaining:accepted?'既存状態との競合・別要求による更新/解除は状態再現の残件。指定した子が受理され、以後解除・更新・延長されない条件の時間':'子の受理条件を指定してください。数量値は受理された1要求を条件として表示'},
     remaining:accepted?'天候と対象条件を固定した1使用の子要求。実対象の選択・既存Buffとの競合や後の解除は別条件':'天候の子が対象条件を満たして受理される条件を指定してください',evidence:['docs/client-numeric-gaps9-20261011.txt','dist/client-numeric-gaps26-20261016/weather-receipts-native-oracle.json']};
   }
   if(e.kind===237){
    const c=selectedChannels(),special=d.effects.find(x=>x.kind===240);let override;
    if(special){if(typeof p.targetCategoryMatched!=='boolean')return fail('kind240の対象分類条件を指定してください');if(p.targetCategoryMatched)override=special.value;}
    const q=stateRequests.cappedMaxHp(e.value,c.m,c.a,number(p.targetMaxHP,'対象の最大HP',1,100000000),override);
    return ok(active?Math.abs(q.amount):0,'HP',['docs/client-numeric-gaps9-20261011.txt'],{name:q.amount<0?'最大HP割合の回復要求':'最大HP割合の損傷要求',maxHpRequest:q,
     scope:'56c020の1要求。割合B×M＋Aを±abs(B)へ制限し、対象最大HP×割合×保存float32の0.01。損傷側の上限200・回復側の上限1000。kind240成立時だけ計算元Bを差し替え、制限幅は元B。受信側の軽減・HP保存後の結果とは別'});
   }
   if(e.kind===163&&[1,2,3].includes(e.selector)){
    let theft=null,theftReason=null;try{theft=stateRequests.theftInput(p.theftInputBefore,p.theftRequestSelector,d.effects.filter(x=>x.kind===163).map(x=>({selector:x.selector,value:active?x.value:0})));}catch(error){theftReason=error.message;}
    return ok(active?f(e.value):0,'入力ポイント',['dist/client-numeric-gaps11-20261013/theft-input-native-oracle.json'],{name:'盗取要求の補正（補助値）',theft,theftReason,quantityRole:'auxiliary',partial:true,
     scope:'M/Aなし。補正前入力と要求区分を指定すると、採用したこの定義の補正を加算して上限100の要求入力を計算。他の同時Buffを自動収集する試行ではない。成功率や盗む数量として表示しない',
     remaining:'能力88の全供給元・採用Buffの自動収集、サーバー側の最終抽選・盗む数量は未確定。盗み技能は能力88に変換せず別の要求欄に送る。手入力の補正前入力は条件付き補助値の確認用で、技の完成ではない'});
   }
   if(e.kind===177){
    const q=stateRequests.transfer(e.value,p.transferEligibleCount),scope='指定対象から使用者への効果移送。type60の分類mask '+e.selector+'・除外条件を満たす既存効果が対象。Bの整数部が件数上限、M/Aで増幅しない。適合件数未指定なら上限のみ。移送先の競合と残存時間は別';
    let copied=null,copyReason=null;if(p.transferRecords!==undefined)try{copied=wikiHints.transferRecords(p.transferRecords,q.limit,{mask:e.selector});}catch(error){copyReason=error.message;}
    if(q.limit==null&&q.count==null)return {...semantic('件数上限なしの効果移送要求。'+scope),partial:true,remaining:'実移送件数は適合する効果件数が必要'};
    return ok(active?(copied?.count??q.count??q.limit):0,'件',['docs/client-numeric-gaps9-20261011.txt'],{name:copied?'元レコードを保持した移送要求件数':q.count==null?'効果移送の上限件数':'条件付き効果移送件数',transfer:q,transferredRecords:active?copied:null,transferCopyReason:copyReason,partial:true,scope,
     remaining:'分類適合・受信可否を満たす条件。移した効果の量/残存時間は元レコードに依存し、この技の技能値から新しく作り直さない'});
   }
   if(e.kind===134)return {...semantic('指定レコードストーンへ現在の位置・地域と移動状態を記録する要求。5fde50は所有する適合アイテムに座標3成分等を書き込む。独立したダメージ/回復/能力量は持たない。所持品と記録可能地域の受理条件は別'),evidence:['docs/client-numeric-gaps9-20261011.txt']};
   if(e.kind===126)return {...semantic('所持レコードストーンの記録地点またはホーム地点への移動要求。56b2b0は位置参照をtype10へ渡す。B/M/Aによる戦闘数量を生成しない'),partial:true,remaining:'移動先の解決と受理後の位置変更は未接続。数量不明と移動作用を区別する',evidence:['docs/client-numeric-gaps9-20261011.txt']};
   if(e.kind===56)return {...semantic('対象の死体レコードへ使用者側の位置・向き・地域をコピーする移動要求。type28→612810 mode4。B/M/AによるHP量を持たない'),partial:true,remaining:'死体の所有者照合と要求受理後の状態変更は未接続',evidence:['docs/client-numeric-gaps9-20261011.txt']};
   if(e.kind===272)return {...semantic('所有者が一致し、召喚状態の条件を満たすNPCを解除する要求。type62→5aafd0→793140。HPを減らす損傷係数は発行しない'),partial:true,remaining:'解除要求後の実体破棄・召喚枠更新は未接続',evidence:['docs/client-numeric-gaps9-20261011.txt']};
   if(e.kind===10&&e.selector===0)return {...semantic('召喚された対象の解除を要求する作用。送るのは対象参照と制御区分で、B・技能・魔力からHP量を作りません'),partial:true,remaining:'召喚対象の適合・解除要求の受理・枠更新は状態再現の残件。解除できたことを数値0と表示しない',evidence:['docs/client-numeric-gaps9-20261011.txt','dist/client-numeric-gaps9-20261011/code-793140-793260.json']};
   if(e.kind===105&&[0,1,2].includes(e.selector))return {...semantic(['対象とのアイテム・金銭交換を要求','露店の自動販売を開始する要求','露店の自動買取を開始する要求'][e.selector]),partial:true,remaining:'取引の受理・在庫・価格・金銭更新は未実装。戦闘の能力・HP回復量を発行する作用ではない',evidence:['docs/client-numeric-gaps9-20261011.txt']};
   if(e.kind===264&&[1,2,3].includes(e.selector))return {...semantic('PCやNPCをレーダーに表示する作用。表示窓の有効・無効を切り替え、戦闘能力への加算値は生成しません'),partial:true,remaining:'wikiの表示範囲200mは説明値。対象リスト更新・表示は未再現。索引値を戦闘射程やダメージへ変換しない',evidence:['dist/client-numeric-gaps13-20261014/code-5fe8c0-5feac0.json']};
   if(e.kind===202)return {...semantic('ローカル使用者の視点参照を対象へ切り替える要求。56cfa0→656390で参照対象と視点補間値を更新する。B/M/Aを戦闘能力量として使用しない'),partial:true,remaining:'視点の描画・追跡は戦闘数値計算とは別。ほかの戦闘状態の作用は未確認',evidence:['docs/client-numeric-gaps9-20261011.txt']};
   if(e.kind===201)return ok(movement.searchDistance(p.movementDelta),'距離単位',['docs/client-numeric-gaps9-20261011.txt'],{name:'探索対象までの表示距離',partial:true,
    scope:'サーチ ディレクションの対象参照が存在し、対象の特殊状態12c=-1を満たす条件。指定した位置差の3次元直線距離を表示。技能/魔力で増幅せず、射程や移動距離ではない',
    remaining:'対象参照の選択と8方位の表示名対応は未接続。距離は元56cb30の表示要求に接続済み'});
   if(e.kind===29)return {...semantic('使用者の位置（ペットの場合は所有者側の保存位置）へ対象を移す要求。56b9b0→type21→5ab500→5be790/5fae90。対象適合・地形照会後の座標を設定し、B/M/Aの損傷・回復量は発行しない'),partial:true,remaining:'対象の受理・地形補正後の最終位置と移動失敗は未接続',evidence:['docs/client-numeric-gaps9-20261011.txt']};
   if(e.kind===174||e.kind===243)return {...semantic(e.kind===174?'落下損傷の基準高度を、既存の基準高度と対象高度の高い方へ更新する。B/M/Aなし。落下ダメージそのものは着地時の落差から計算する':'落下損傷の基準高度を対象の現在高度へ再設定する。B/M/Aなし。再設定後の着地条件・落差がなければHP損傷は確定しない'),partial:true,remaining:'player4754の更新は確認。実際の着地時点と基準高度の他の更新は未接続',evidence:['docs/client-numeric-gaps9-20261011.txt']};
   if([37,88].includes(e.kind)){
    const selector=e.kind===37?19:e.selector&255;
    const choice=selector===19?'装備スロット11を優先し、空なら12を選ぶ':selector>0&&selector<19?'装備スロット'+(selector-1)+'を選ぶ':'有効な装備スロットなし（解除要求なし）';
    return {...semantic('装備解除要求。'+choice+'。対象PCの解除可能な装備・収納先がある条件で1枠を解除する。B/M/Aの数量演算なし。装備性能の減算値とは別'),equipmentRemoval:{selector,slot:selector>0&&selector<19?selector-1:null,priority:selector===19?[11,12]:null},evidence:['docs/client-numeric-gaps9-20261011.txt']};
   }
   if([241,242].includes(e.kind)){
    const q=extensions.reactionRequest(e.value,p.random15),child=extensions.reactionDefs[e.selector];let reactionChild=null;
    if(child){
     const cp={...p,reactionDefinitionId:child.id},childRow={...row,internalId:child.id};
     const childEffects=child.effects.map(ce=>effect(child,ce,childRow,cp,names,math));
     reactionChild={id:child.id,name:child.name,recipient:e.kind===241?'効果保持者':'攻撃した相手',effects:childEffects,
      // The dispatcher receives time factor 1. The registration/refresh lifecycle
      // is not simulated; this is the duration parameter of one accepted request.
      durationSeconds:child.counter>0&&child.interval>0?child.counter*child.interval/60:0,
      scope:'子の受理1回・倍率1/加算0/時間倍率1。親の技能や保持倍率を引き継がない。保持者起点、mode7。繰返し回数/上書き後の総量とは別'};
    }
    // One accepted reaction opportunity. Only initial resource requests enter
    // this total; a periodic child or ability modifier is never a per-hit HP sum.
    const requests=reactionChild?.effects.filter(v=>v.supported&&!v.conditionalEligibility&&[1,2,5,82,83].includes(v.kind)&&v.modeInfo?.initial!==false&&Number.isFinite(v.value)).map(v=>({
     name:v.name,resource:v.unit,recipient:v.recipient,whenSelected:v.value,
     specifiedDraw:p.reactionSelected===true?(active&&q.passed?v.value:0):null,
     conditionalUniformMean:active?v.value*q.uniformPercent/100:0}))||[];
    return ok(active?q.uniformPercent:0,'%',['docs/client-numeric-gaps7-20261011.txt'],{name:'被攻撃時の子要求・一次抽選率（15bit均等時）',reactionGate:q,reactionChild,partial:true,
     reactionOpportunity:{requests,scope:'最初の適合反応に選ばれた被攻撃1機会、子の受理を仮定した初回資源要求だけ。指定乱数の値と15bit均等の条件付き平均を区別。成否率・自動総量・最終HP増減ではない'},
     reactionSelected:p.reactionSelected===true,reactionRequested:p.reactionSelected===true?active&&q.passed:null,
     scope:'物理被害後の反応処理が有効で、最初の適合Buffに選ばれた1機会。kind241は保持者へ、242は攻撃した相手へ。241を優先して1個を選び、抽選不通過後に次のBuffを抽選しない',
     remaining:(child?'親の有効期間に受ける攻撃回数・最初に選ばれるBuff・子の受理/更新は条件付き。子の局所値を親の自動合計へ掛算しない':'子定義 '+e.selector+' が未照合')+(reactionChild?.effects.some(v=>!v.supported&&!v.resolved||v.partial)?'。子に未解明の作用あり':'')});
   }
   if(e.kind===224&&extensions.guardInputs.guards[d.id]?.selector===7&&extensions.guardInputs.guards[d.id].child===e.selector)
    return {...semantic('kind115の追加種類7が使う子定義 '+e.selector+' の参照指定。子の条件付き計算をkind115行へ表示する。同じ子をこの行で重複発動・加算しない'),evidence:['docs/client-numeric-gaps9-20261011.txt']};
   if(e.kind===44){const q=stateRequests.magicBodyGate(active,p.magicBodyBranch);return ok(q.factor,'倍',['docs/client-numeric-gaps9-20261011.txt'],{name:'条件付き魔法本体の通過倍率',magicBodyGate:q,partial:true,scope:q.scope,remaining:'ゲート以外の魔法軽減・特殊要求・効果競合は別。入力未指定は遮断済みの0にしない'});}
   if(e.kind===43){if(!active)return fail('世界・時間帯条件ではこの呼吸維持が有効でないため、通常の呼吸減少を別に計算する必要があります');return ok(100,'（呼吸ゲージ）',['docs/client-numeric-gaps9-20261011.txt'],{name:'通常水中更新後の呼吸ゲージ',partial:true,scope:'60a76fのkind43 bit100→60a8e4で100を設定し、runtime26へ書き戻す。水中減少と呼吸0による1更新0.05HP減少の枝を迂回する。技能/魔力で100を増幅しない',remaining:'通常水中条件での1更新。地形・他のHP減少・状態適用と解除は別。更新を秒や総回復量へ変換しない'});}
   if(e.kind===45){
    if(!active)return fail('世界・時間帯条件では固定量への差替えが有効でありません');
    const q=stateRequests.carnival(p.carnivalCategory,p.carnivalTarget);let calculated=null,calculationReason=null;
    if(p.carnivalUnopposed===true)try{calculated=stateRequests.carnivalDamage(p.carnivalCategory,p.carnivalTarget,p.damageContext?.incoming,p.damageContext?.targetMultiplier);}catch(error){calculationReason=error.message;}
    if(calculated&&p.targetPhysicalReductionId!=null){calculated.targetReduction=targetReduction.apply({id:2,element:1,effects:[]},calculated.amount,{selectedId:p.targetPhysicalReductionId,world:p.world});calculated.targetReduction.scope='通常アタックID2の効果行は空で、この273検査を起動しません。カーニバル置換後の固定量へ属性軽減を一律乗算しません。';}
    return ok(q,'HP',['docs/client-numeric-gaps9-20261011.txt','docs/client-numeric-gaps10-20261012.txt'],{name:'通常近接攻撃の置換基準量（後段補正前）',partial:true,carnivalDamage:calculated,carnivalReset:calculated?stateRequests.carnivalResetTotal(calculated.amount,p.carnivalResetAttackCount??null):null,
     scope:'5a53cdの保持kind45・再使用阻止bitなし・行動flags100 bit40成立。素手class3、または使用可能で必要技能を満たす近接武器のruntime主技能27/28/29に限定。対象PCは160/250/220/200、非PCは各2倍へ差替え',
     remaining:calculationReason|| (calculated?'外部倍率・対象補正後の1回量と、状態リセットを通った指定回数の条件付き合計は計算済み。発動済みbitと解除元は照合済みだが、実リセット間隔・全期間の自動回数は未確定':'命中済み・追加防御なしの条件を指定すると、共通の外部倍率・対象倍率を使う1回量も計算。武器可否・発動済みbit・全期間回数は未接続')});
   }
   if(e.kind===260){const q=stateRequests.defenseGate(p.receivedHpAmount,p.targetDefense,active);return ok(q.after,'HP',['docs/client-numeric-gaps9-20261011.txt'],{name:'防御力閾値を通したHP損傷要求',defenseGate:q,partial:true,scope:'5a9dc0→5aa030。選択された保持効果が有効、正のHP要求が保持者の防御力以下（等号含む）なら要求を0にする。それより大きい量・非正の量はこのゲートで変更しない。対象防御力を保持者の値として使用',remaining:'受信後のHP保存・効果解除・反応子の受理/更新は別。B/M/Aを軽減率として流用しない'});}
   if(e.kind===190){return ok(stateRequests.weaponMass(e.selector,p.weaponWeight),'倍',['docs/client-numeric-gaps9-20261011.txt','docs/client-post-rebuild-20261006.txt'],{name:'武器単重量による防御後の倍率',scope:'5a5336のitem+18は600f30が数量と乗算して所持重量へ加える同じ単重量。clamp(1+(重量−selector)×float32(0.03),float32(0.1),10000)。倍率は防御後の本体量に適用。未指定の武器重量を0にしない'});}
   if(e.kind===238)return {...semantic('5a58f1/5a5b9fで反射呼出許可を0にし、5a1a90の59f8a0（Buff反射・軽減）を迂回する。通常盾防御はその前に処理されるため無効化しない'),partial:true,remaining:'この呼出のBuff反射を抑止する作用。ほかの反射経路・追加効果の受理は別',evidence:['docs/client-numeric-gaps9-20261011.txt']};
   if([26,66].includes(e.kind))return {...semantic(e.kind===26?'不可視の保持bit0x40。5bfb00の他PCによる通常対象判定では、観測側にkind66（または別の例外許可）がなければ拒否する。独立した損傷・回復係数は使わない':'不可視検知の保持bit0x40000。5bfb84/5bfc02→virtual194=4025b0で、対象の不可視bitによる拒否を迂回する。通常対象判定の許可であり、索敵距離や成功確率の加算ではない'),partial:true,remaining:'対象判定のこの通常枝だけを確認。距離/遮蔽・特殊状態・実対象選択と状態復元は別。数値0や100%の効果量へ置換しない',evidence:['docs/client-numeric-gaps9-20261011.txt']};
   if(e.kind===128)return {...semantic('6351a0は対象状態+e8の符号化bit2を設定する。634d60で復号し、56fa0bで姿勢計算への参照を許可、5686f0→55e500で姿勢行列を作る。B/M/AによるHP数量はこの経路にない'),partial:true,remaining:'姿勢・モデル座標の作用を確認。別の戦闘状態consumerと効果終了時の全状態復元は未確定',evidence:['docs/client-numeric-gaps9-20261011.txt']};
   if([77,218].includes(e.kind)){
    const q=stateRequests.appearanceOperation(e,p.appearanceSpecies??null,p.appearanceSex??null);
    return {...semantic(q.meaning),appearanceOperation:q,partial:true,scope:q.scope,remaining:'外見選択と種族・性別の条件は確認済み。基準寸法・モデル作成/破棄・併存213の採用/復元は状態側の残件。同じ技の能力補正は各効果で別計算する。',evidence:['docs/client-numeric-gaps21-20261015.txt','docs/client-native-buff-notification-reapply-20261006.txt']};
   }
   if(e.kind===225&&e.selector>=0&&e.selector<=10)return {...semantic('身体/装備の指定位置へ描画効果ID '+Math.trunc(e.value)+' を発行する作用。56d660はselector別カウンタが11更新に達すると77d9c0へ描画参照を渡す。Bは損傷係数ではなく描画ID。HP量・戦闘周期・秒数へ変換しない'),presentation:{reference:Math.trunc(e.value),attachment:e.selector},evidence:['docs/client-numeric-gaps9-20261011.txt']};
   if(e.kind===215)return {...semantic('保持者に描画効果ID '+e.selector+' を定期発行する作用。56dcec→77d9c0でBは描画用更新カウンタの閾値に使う。戦闘効果の発動周期・回数ではない'),presentation:{reference:e.selector},evidence:['docs/client-numeric-gaps9-20261011.txt']};
   if(e.kind===203)return {...semantic('56db1eで移動音の要求55cec0を抑止する状態。B/M/Aによる能力加減算なし'),partial:true,remaining:'この消費先は移動音。ほかの戦闘上の状態consumerは未確認',evidence:['docs/client-numeric-gaps9-20261011.txt']};
   if(e.kind===213){const q=stateRequests.bodyScale(e.value);return ok(q.geometry,'倍',['docs/client-numeric-gaps9-20261011.txt'],{name:'体格参照寸法への倍率（寸法の上下限前）',partial:true,
    scope:'569ef4→56a441→608c00→virtual38→572160→570d80→55dd90。受理された体格変更のBをモデルの参照寸法に乗算。技能/魔力で増幅しない。乗算倍率は約0.001〜20、得られた2寸法をそれぞれ0.05〜100へ制限。HP/攻撃力倍率ではない',
    remaining:'変身先モデルの基準寸法・種族係数、PCの変更可否、重複時の採用順が必要。基準寸法未指定のため最終の体格・当たり判定距離は未計算'});}
   if(e.kind===250){const q=stateRequests.barrierHits(e.selector,active&&p.damageReactionBranch===true?p.barrierHitsBefore:null);return ok(q.limit,'回',['docs/client-numeric-gaps9-20261011.txt'],{name:'損傷受信による効果終了回数',barrierHits:q,partial:true,
    scope:'579e00の適合・unmarkedの同一定義1レコード。正HP損傷の受信枝でbyte2を1増加し、selectorと等しくなると保持counterを0にする。1回の防御率/吸収量ではない。技能・魔力は回数を増幅しない',
    remaining:'発動中に条件を満たす被害の回数・同一定義複数レコードの採用・手動解除/時間終了は別。使用済み回数未指定時は終了閾値のみ'});}
   if(e.kind===251&&d.interval===0){
    const capacity=durationCounter(d,row,p,names);let q=null;
    if(p.receivedHpAmount!=null){if(p.damageReactionBranch!==true)return fail('正HP損傷の通常受信枝（前段のMP肩代わり・属性吸収・生存保護なし）を指定してください');q=stateRequests.barrierAbsorb(active?capacity:0,p.receivedHpAmount);}
    return ok(active?capacity:0,'HP',['docs/client-numeric-gaps9-20261011.txt'],{name:'新規受理時の障壁吸収容量',barrierAbsorb:q,partial:true,
     scope:'通常時間係数774120と保持counter生成式を容量へ使用。聖壁のinterval0を秒へ換算しない。同一定義1レコードの正HP要求から整数量を差し引き、容量以上の超過だけが残る。1回試行は新規容量から計算',
     remaining:'他の防御効果との合成・複数障壁の順序・競合/上書きは別。受信要求未指定時は容量のみ。外部倍率やHP保存後の最終状態は未接続'});
   }
   if(e.kind===269){
    if(p.damageReactionBranch!==true)return fail('正HP損傷の通常受信枝（前段のMP肩代わり・属性吸収・生存保護なし）を指定してください');
    const q=stateRequests.damageRecovery(e.value,e.selector,p.receivedHpAmount);
    return ok(q.amount,q.resource,['docs/client-numeric-gaps9-20261011.txt'],{name:'被害後の'+q.resource+'回復要求',damageRecovery:q,active:true,partial:true,
     scope:'57a32fで最初の有効kind269が選ばれる1機会。整数化した正HP要求×B×保存float32の0.01。M/Aで増幅せず、実減少HPや毎秒回復ではない。この消費先は効果flagsの世界条件を再検査しないため、Buff受理済みを前提とする',
     remaining:'回復受信側の上限/増幅・最終HP/MP/ST保存は別。親全期間の自動合計へ乗算しない'});
   }
   if(e.kind===27){const skill=d.id===row.internalId?p.skill:p.skills?.[names[d.primary_raw]],q=stateRequests.tameCapacity(skill,p.tamePetLevelSum,p.tameTargetLevel);return ok(q.capacity,'レベル',['docs/client-numeric-gaps9-20261011.txt'],{name:'通常枠の手懐け対象レベル上限',tameCapacity:q,partial:true,scope:q.scope,remaining:'対象種族mask・所持枠・所有条件、関係値/HPを使う後段の要求抽選と最終受理は別。既存レベル合計未指定を0にしない'});}
   if(e.kind===217){const q=stateRequests.elementalReflection(active?e.value:0,p.guardRandom31,p.incomingElementMatched,p.elementalReflectionSelected);return ok(q.uniformPercent,'%',[
    'docs/client-numeric-gaps9-20261011.txt'],{name:'属性'+({3:'火',4:'水',5:'風',6:'地'}[e.selector]||e.selector)+'反射の一次割合（byte均等時）',elementalReflection:q,partial:true,scope:q.scope,
    remaining:'反射先の関係条件、元行動の入力複製後の再計算と反射HP量は未接続。一次選択率を最終反射成功率やダメージとしない'});}
   const guardPhysical=ctx=>{
    if(p.guardBranchConfirmed!==true)throw Error('防御計算の条件を指定してください');
    const skill=d.id===row.internalId?p.skill:number(p.skills?.[names[d.primary_raw]],'参照防御行動の技能',0,inputs.skillMax);
    const override=p.guardShieldId!=null?{shieldId:p.guardShieldId,skillInteger:Math.round(number(p.guardShieldSkill,'装備した盾による技能切替に使う盾技能',0,inputs.skillMax)*10000)}:null;
    return extensions.guardCalculation(d.id,Math.round(skill*10000),p.seed,p.incomingHit==null?null:Math.trunc(number(p.incomingHit,'相手の格納命中入力',0,2047.9375)*16),p.preGuardDamage,ctx?{...ctx,accepted:active&&ctx.accepted}:null,override);
   };
   if(e.kind===53){const parameter=extensions.guardDefinitionParameter(d,e);if(parameter)return {
    ...semantic('防御行動用の定義パラメータ：基礎値0.1（補助値）。この型1魔法の通常Buff数量処理では独立した量を発行せず、軽減率10%やHP0として計算しません。他の受動的な参照やサーバー側処理は今回未確認です。'),
    name:'防御行動用の基礎パラメータ（補助値）',definitionParameter:parameter,numericScope:'ordinary-buff-admission',
    scope:parameter.scope,stateScopeRemaining:'他の受動的な参照・サーバー独自処理の有無は未確認。全作用の不存在を証明した意味ではない。',evidence:['docs/client-numeric-gaps45-20261017.txt']};}
   if(e.kind===53&&d.action_type===3&&extensions.guards[d.id]){
    if(p.guardBranchConfirmed!==true)return {...fail('防御計算の条件を指定してください。相手未選択時はガード受付成立・相手の防御無視なしを前提にします'),category:'入力不足'};
    const ctx=p.guardIncomingAction?extensions.guardContext(d.id,p):null;
    const q=guardPhysical(ctx?.incoming.actionType===1?null:ctx);q.numericInputPathsKnown=true;
    if(ctx?.incoming.actionType===1){q.outcome=null;try{q.magic=extensions.magicGuardCalculation(q,{...ctx,accepted:active&&ctx.accepted},p);}catch(error){q.magic={supported:false,reason:error.message};}}
    return ok(q.uniformBytePercent,'%',['docs/client-numeric-gaps6-20261011.txt','docs/guard-numerics-20261013.txt'],{name:'完全軽減の一次割合（抽選byte均等の仮定）',guard:q,partial:true,
     guardCondition:ctx,
     scope:(ctx?'選択した相手行動の近接/遠隔区分・防御無視flags・受付条件を反映。':'相手未選択時は従来の限定条件：ガード受付済み・相手に防御無視なし。')+(q.skillOverride?'装備した盾の条件で盾技能を使用。技固有の必要技能・係数を保持し、盾の性能式へ置換しない。':'盾装備による技能置換なし。')+'一次割合と指定種値の結果は別。受付中は条件入力で、受付時間の自動計算ではない',
     remaining:'防御受付幅は通常16ms更新条件の共通時間欄で計算。反射・追加作用はkind115に別表示。'+(ctx?.incoming.actionType===1?q.magic.supported?'魔法本体の条件付き抑止を計算。防御後の追加要求/別補正・実装備消費は未接続':q.magic.reason:q.outcome?'1回の軽減量は指定条件で計算済み':'損傷量/命中入力が未指定のため1回の軽減量は未計算')});
   }
   if(e.kind===115&&d.action_type===3&&extensions.guardInputs.guards[d.id]){
    const rule=extensions.guardInputs.guards[d.id];let ctx;
    const details={guardRule:rule,evidence:['docs/client-numeric-gaps7-20261011.txt']};
    // The receiver scans the first row. Do not count Bandit Guard's second row twice.
    if(e.index!==rule.rows[0].index)return {...semantic('同一定義の防御適合ビットを構成。追加作用は先頭kind115行が選択されるため、この行を重複加算しない'),...details};
    const child=extensions.guardChildren.children[rule.child];
    if(child){
     const cp={...p,guardChildDefinitionId:child.id},childRow={...row,internalId:child.id};
     details.guardChild={id:child.id,name:child.name,recipient:d.effect_class===1?'攻撃した相手':'防御使用者',
      effects:child.effects.map(ce=>effect(child,ce,childRow,cp,names,math)),durationSeconds:child.counter*child.interval/60,
      scope:'子が受理された1回分。倍率1・加算0・時間倍率1・mode7。親の技能/魔力を継承しない。発動回数、実際の終了時点と別',
      remaining:'5a1090の追加作用フラグ、対象の受理/抵抗/競合を満たす条件。最終発動率・自動総量は未確定'};
    }
    try{ctx=extensions.guardContext(d.id,p);}catch(error){return {...fail(error.message),category:'入力不足',...details};}
    details.guardCondition=ctx;
    const info='防御対象ビット：'+['近接物理','遠隔物理','魔法'].filter((_,i)=>rule.mask&(1<<i)).join('・')+'。追加種類'+rule.selector+(rule.child?' → 子定義'+rule.child:'')+'。'+(ctx.accepted?'現在の入力条件では受付可能':'現在の入力条件では受付不可');
    let shield=null;
    if(extensions.shieldDefs.rules[d.id]?.primary===38&&p.guardShieldId!=null){
     const skill=d.id===row.internalId?p.skill:number(p.skills?.[names[d.primary_raw]],'参照防御行動の盾技能',0,inputs.skillMax);
     shield=extensions.shieldGuardCalculation(p.guardShieldId,Math.round(skill*10000),p.seed,
      ctx.incoming.actionType===2&&p.incomingHit!=null?Math.trunc(number(p.incomingHit,'相手の格納命中入力',0,2047.9375)*16):null,
      ctx.incoming.actionType===2?p.preGuardDamage:null,p.guardShieldRegionAllowed,{...ctx,accepted:active&&ctx.accepted});
     details.guard=shield;
     if(ctx.incoming.actionType===1)try{shield.magic=extensions.magicGuardCalculation(shield,{...ctx,accepted:active&&ctx.accepted},p);}catch(error){shield.magic={supported:false,reason:error.message};}
    }
    const unresolvedGuard=reason=>shield?ok(shield.uniformBytePercent,'%',details.evidence,{...details,name:'盾防御の一次割合（抽選byte均等の仮定）',partial:true,
     scope:'選択した盾の保存性能と盾技能から計算。物理は入力した受付条件下の軽減量、魔法は相手入力と通常消費成立条件を指定した本体抑止を別表示',remaining:reason}):({...fail(reason),...details});
    if(rule.selector===0&&shield)return unresolvedGuard('独立の追加数量なし。受付幅は通常更新条件で計算。装備状態と消費後の成立条件は未確定');
    if(rule.selector===5&&shield?.magic?.refund){const refund=shield.magic.refund;return ok(refund.amount,'MP',['docs/guard-numerics-20261013.txt'],{...details,
     name:'魔法防御時のMP回復要求',guardFeedback:refund,guardBlockedAmount:0,recipient:'防御使用者',partial:true,
     scope:refund.scope,remaining:'受付幅は通常更新条件で共通時間欄に表示。実際の装備消費成立と受信MPの上限/増幅は未接続。防御の条件付き要求量で、実回復量や技全体の完成とは別'});}
    if(rule.selector===0)return {...semantic(info+'。この種類は独立の追加数量なし'),...details,
     ...(!extensions.guards[d.id]?{partial:true,remaining:'盾装備の基礎軽減入力は未接続。追加数量なしと盾軽減量の完成を区別'}:{})};
    if(![3,4,5,8].includes(rule.selector)){
     if(child&&shield)return unresolvedGuard(info+'。'+details.guardChild.remaining);
     return child?ok(details.guardChild.durationSeconds,'秒',['docs/client-numeric-gaps9-20261011.txt'],{...details,name:'防御子の受理1回の持続指定',timeOnly:true,partial:true,remaining:details.guardChild.remaining}):unresolvedGuard(info+'。子定義の照合が不足');
    }
    if(rule.selector===4&&!(rule.mask&3))return {...fail(info+'。魔法専用反射の再生成入力・再計算条件が未接続'),...details};
    let blocked=null,method='';
    if(!active||!ctx.accepted){blocked=0;method='適合/受付条件の不成立';}
    else if(shield&&ctx.incoming.actionType===2){blocked=shield.outcome?.blocked??null;method='選択した盾の保存性能・盾技能・指定種値から軽減量を計算';}
    else if(ctx.incoming.actionType===2&&extensions.guards[d.id]){
     const q=guardPhysical(ctx);blocked=q.outcome?.blocked??null;method='非盾防御の指定種値から軽減量を計算';
    }else if(ctx.incoming.actionType===2&&rule.selector===8){
     const q=extensions.guardOverride(0,8,ctx.soft,ctx.hard);blocked=Math.ceil(f(number(p.preGuardDamage,'防御直前の損傷量',0)))*q.fraction;method='防御無視の有無で全量/無軽減へ上書き（通常抽選率とは別）';
    }else if(p.guardFullBlockConfirmed===true){blocked=Math.ceil(f(number(p.preGuardDamage,'防御直前の損傷量',0)))*(ctx.incoming.actionType===2?extensions.guardOverride(1,rule.selector,ctx.soft,ctx.hard).fraction:1);method='完全軽減枝が成立したという明示条件。物理の防御無視はさらに反映。盾/魔法の軽減判定率は未計算';}
    if(blocked==null)return unresolvedGuard(info+'。損傷量・命中入力、または盾/魔法の完全軽減成立条件が必要');
    if(rule.selector===8)return ok(blocked,'HP',['docs/client-numeric-gaps7-20261011.txt'],{...details,name:'防御無視条件による軽減量',recipient:'防御使用者',partial:true,
     scope:method,remaining:'子定義218の持続指定を別表示。追加作用の発動条件・受理/競合は未確定。'+(shield?'盾の通常一次率と防御無視の逆転は別処理':'盾入力の通常一次率は未計算')});
    if(rule.selector===5&&blocked===0)return unresolvedGuard('軽減0時の追加要求フラグにより基礎消費分の回復が発生するか未確定。回復量を0に置き換えない');
    const feedback=extensions.guardFeedback(rule.selector,ctx.incoming,blocked,p.guardRandom31);
    if(!feedback.supported)return {...fail(feedback.reason),...details};
    const resource=feedback.resource||(rule.selector===5?ctx.incoming.actionType===1?'MP':'ST':'HP');
    return ok(feedback.amount,resource,['docs/client-numeric-gaps7-20261011.txt'],{...details,guardFeedback:feedback,guardBlockedAmount:blocked,
     name:rule.selector===4?'物理反射の条件付き損傷要求':resource+'条件付き回復要求',recipient:rule.selector===4?'攻撃した相手':'防御使用者',partial:true,
     scope:method+'。'+(rule.selector===5?'回復は相手行動の保存基礎消費値。実際の消費量ではない。':'')+'指定条件で1要求。最大HP/MP/STでの実増加上限・最終HPは別',
     remaining:(rule.selector===4?'魔法反射の再生成入力は未接続。':'')+(rule.selector===5?'弾を回収する追加分岐は未接続。':'')+'受付幅は通常更新条件で計算。'+(shield?'盾の現在状態':'盾/魔法の軽減入力')+'・装備消費後の成立条件は未確定。条件付き要求量を技全体の完成にしない'});
   }
   if(e.kind===197){
    let evasionCheck=null,evasionReason=null;
    try{
     if(!['pc-normal','npc','pc-special'].includes(p.evasionHolder))throw Error('回避効果の保持者区分を指定してください');
     if(typeof p.incomingBypassesEvasion!=='boolean')throw Error('相手の物理行動が回避判定を省くか指定してください');
     if(p.incomingBypassesEvasion)evasionCheck={bypassed:true,evaded:null,hitFractionIfUniformResidues:null};
     else evasionCheck=combat.physicalHitGate({encodedHit:Math.trunc(number(p.incomingHit,'相手の格納命中入力',0,2047.9375)*16),evasion:number(p.holderEvasion,'保持者の回避値',0),seed:p.seed},
      {forced197Present:active,targetActorType:p.evasionHolder==='npc'?4:1,targetStateMode:p.evasionHolder==='pc-normal'?1:2});
    }catch(error){evasionReason=error.message;}
    return {...semantic('有効なkind197は通常物理命中判定59f640で、NPCまたは通常PC（状態0/1）への強制回避を返す。回避値への加算ではない。kind214を持つ物理行動はこの判定を省く。特殊PC状態は通常比率へ進む'),evasionCheck,evasionReason,evidence:['docs/client-physical-hit-20261005.txt','docs/client-numeric-gaps6-20261011.txt']};
   }
   if(e.kind===120){
    if(e.selector<1||e.selector>19)return fail('装備selector '+e.selector+' の有効枠が未確定');
    const wear=extensions.equipmentWear(active?e.value:0,p.equipmentDurabilityRaw,p.equipmentKeepsOne);
    if(!active&&wear.after!=null){wear.after=wear.before;wear.loss=0;wear.displayAfter=wear.displayBefore;}
    return ok(wear.request,'耐久内部値',['docs/client-numeric-gaps5-20261011.txt'],{name:'指定装備の耐久減少要求',wear,equipmentSelector:e.selector,count:1,
     scope:'初回専用の対象PCの有効な耐久装備への1要求。固定値の絶対値を整数化、M/Aなし。'+(e.selector===19?'武器の内部枠11を優先し、空なら12。':'指定装備の内部枠'+(e.selector-1)+'。')+'入力した内部耐久へ適用した値は有効な耐久装備（定義最大耐久あり）の条件。通常の表示耐久は内部値×0.025を切捨て、正なら最低1。特殊な直接表示装備はこの表示換算の対象外。'});
   }
   if(e.kind===122){
    const q=extensions.conditionalHpRequest(e.value,number(p.targetMaxHP,'対象の最大HP',1),number(p.targetCurrentHP,'対象の現在HP',0),p.targetAmplificationAllowed);
    return ok(active?q.amount:0,'HP',['docs/client-numeric-gaps5-20261011.txt'],{name:'残HP条件付きの損傷要求',hpCondition:q,count:1,
     scope:'対象の現在HPが最大HP×保存割合'+f(e.value)+'%以下で、対象条件が成立する初回1要求。現在HP＋1を上限200へ制限する。M/Aなし。条件不成立時の0は確認済み分岐。即死の保証、HP保存・死亡処理とは区別。'});
   }
   if(e.kind===123){
    const c=selectedChannels(),gate=extensions.interruptRequest(e.value,c.m,c.a,p.random15);
    const interruption=extensions.interruptOutcome(gate,p.interruptCondition,active,{profile:p.interruptNpcProfile,level:p.interruptNpcLevel,random15:p.interruptNpcRandom15});
    const persistent=d.counter>0&&d.interval>0;let opportunities;
    try{opportunities=extensions.periodicRequests(d,e,persistent?durationCounter(d,row,p,names):0,p);}catch(error){opportunities={supported:false,reason:error.message};}
    const partial=!interruption.supported||interruption.percent==null||persistent;
    return ok(active?gate.uniformPercent:0,'%',['docs/client-numeric-gaps6-20261011.txt','docs/client-numeric-gaps25-20261016.txt'],{name:'詠唱中断要求の一次抽選率（15bit均等時）',channels:c,requestGate:gate,interruption,interruptionOpportunities:opportunities,partial,
     remaining:!interruption.supported?interruption.reason:interruption.percent==null?'一次抽選とNPC抵抗の別乱数を結ぶ分布が未確定。個別の指定乱数判定と各段階の率を表示':persistent?'1要求の条件付き中断判定を接続。持続中の実有効回数・各要求時の動作状態・全期間の率は未対応':null,
     scope:'B×保存M＋Aと乱数×float32(100/32767)を比較し、等号を含めて要求する。表示は15bit値を均等とした一次比率で、最終中断率・技の発動成功率ではない。指定整数の今回の判定と区別。持続中の要求回数・全期間中の確率は未算出。'});
   }
   if(e.kind===129&&e.selector===1){
    const self=base.recipient==='使用者',q=extensions.hpAssignment(e.value,number(self?p.casterMaxHP:p.targetMaxHP,'HP指定を受ける側の最大HP',1),number(self?p.casterCurrentHP:p.targetCurrentHP,'HP指定を受ける側の現在HP',0));
    return ok(active?Math.abs(q.request):0,'HP',['docs/client-numeric-gaps6-20261011.txt'],{name:q.request<0?'HP指定による回復要求':'HP指定による損傷要求',hpAssignment:q,count:1,
     scope:'受信適合条件（virtual160とD4 bit4）が成立した1要求。保存Bを1〜最大HPへ制限し、現在HPとの差を要求する。M/Aなし。指定HPへ最終保存される保証・蘇生・死亡判定とは別。参照反復は各回の現在HPが必要なため合算しない。'});
   }
   if(e.kind===129&&[2,3].includes(e.selector)){
    if(e.selector===3&&p.numericTargetType&&p.numericTargetType!=='pc')return {...semantic('ST直接指定は通常PCだけを対象とする枝。NPCへ同じsetterを適用しません'),active:false};
    const self=base.recipient==='使用者',mp=e.selector===2,resource=mp?'MP':'ST';
    const maximum=number(mp?(self?p.casterMaxMP:p.targetMaxMP):(self?p.casterMaxST:p.targetMaxST),resource+'指定を受ける側の最大'+resource,0);
    const q=extensions.resourceAssignment(e.selector,e.value,maximum,mp?number(self?p.casterCurrentMP:p.targetCurrentMP,'指定を受ける側の現在MP',0):null);
    return ok(active?(mp?Math.abs(q.request):q.desired):0,resource,['dist/client-numeric-gaps36-20261017/resource-assignment-native-oracle.json','dist/client-numeric-gaps36-20261017/resource-assignment-zero-native-oracle.json'],{
     name:mp?'MP指定による'+(q.request<0?'回復要求':'減少要求'):'ST指定値（通常PC）',resourceAssignment:q,quantityRole:'stateAssignment',
     scope:'type51を受理する条件の1要求。M/Aなし。MPは現在値との差分、STは通常PC専用の直接指定。B<1の下限判定の後に最大値と比較。実保存・死亡/蘇生・反復後の残量とは別。'});
   }
   if(e.kind===32){
    const c=selectedChannels(),q=extensions.omenRequest(e.value,c.m,p.random15,number(p.damageContext?.targetMultiplier,'対象のHP損傷倍率',0));
    const sourceRecipient=base.recipient==='指定対象'?'使用者':e.flags&1?'使用者':'指定対象';
    return ok(active?Math.abs(q.amount):0,'HP',['docs/client-numeric-gaps5-20261011.txt'],{name:q.amount<0?'HP回復量':'HPダメージ',recipient:q.target?base.recipient:sourceRecipient,omen:q,channels:c,
     scope:'指定15bit整数で選ばれた側への1要求。量は固定BでM/Aを掛けない。対象側だけ正のHP損傷増幅を適用。対象を選ぶ閾値はtrunc(M×50)を30〜90へ制限。技の発動成功・失敗ではなく対象/自傷の分岐。受信拒否・残HP上限は別。'});
   }
   if(e.kind===38){
    const c=selectedChannels(),messages=extensions.sacrificeRequests(e.value,c.m,e.value<0?-c.a:c.a),sourceRecipient=base.recipient==='指定対象'?'使用者':e.flags&1?'使用者':'指定対象';
    return ok(active?messages[0].amount:0,'HP',['docs/client-numeric-gaps5-20261011.txt'],{name:'ペット対象のHP損傷要求',channels:c,
     secondaryMessages:messages.slice(1).map(s=>({messageType:s.type,amount:active?s.amount:0,recipient:sourceRecipient,
      name:({1:'ST',2:'HP',4:'MP'}[s.type])+(s.type===1?s.amount>=0?'回復要求':'減少要求':s.amount<0?'回復要求':'損傷要求')})),
     scope:'条件を満たすペット対象への1要求と使用者への3要求を個別表示。対象10000HP、使用者HP/MPは−(B×M＋A)を−1000〜10000へ制限、STはB×M＋A。ペットの実減少HPを転送する式ではない。死亡・復活制約・最終HP保存は別。'});
   }
   if([16,35].includes(e.kind))return {...semantic('保持状態bit4により576389の行動開始判定を拒否し、576ef3/5772a6の通常移動入力を0にする。B/M/AによるHPや能力加減算ではない。強制移動・状態解除は別処理'),evidence:['docs/client-numeric-gaps9-20261011.txt']};
   if(e.kind===15)return {...semantic('通常移動を抑止する状態。有効中は通常移動速度の取得が0を返し、行動開始を拒否する。独立した効果量係数は使わない。強制取得・特殊移動は別条件'),evidence:['docs/client-numeric-gaps9-20261011.txt'],partial:true,remaining:'通常移動getterと行動開始ゲートまで確認。ほかの状態消費・特殊移動・行動例外は未確定'};
   if(e.kind===22||e.kind===25)return {...semantic('行動開始を拒否する状態。通常の行動開始ゲート576389が状態mask0xeを検査して拒否コード43を返す。B/技能/魔力による数量演算はない'),evidence:['docs/client-numeric-gaps9-20261011.txt'],partial:true,remaining:'行動分類5は別の前段ゲート。状態全体の解除・他の能力作用は未確定'};
   if(e.kind===48)return {...semantic('魔法の行動開始を拒否する状態。actionType1で状態bit0x8000が有効なら拒否コード3を返す。独立した数量係数はない'),evidence:['docs/client-numeric-gaps9-20261011.txt'],partial:true,remaining:'行動開始ゲートまで確認。状態全体の解除・他の消費先は未確定'};
   if([97,98,99,100,117,118,119,138,228,229].includes(e.kind))return {...semantic('動作に使うモーション参照を差し替える作用。姿勢・装備・移動状態から573a40が選び、563ce0→5b2910のモデル動作へ渡す。参照番号はダメージや能力加算量ではない'),evidence:['docs/client-numeric-gaps9-20261011.txt'],partial:true,motionReference:effectSelectors[e.kind]?.[e.selector],remaining:'モーションの参照消費まで確認。行動拘束やフレーム長が戦闘上の待ち時間に与える作用は未確定'};
   if(e.kind===49){
    if(!active)return semantic('世界・時間帯条件が不成立のため、このブレイドは有効にならない');
    const bladeFollowup=blades.calculate(e.selector,{row},p,names,evaluate);
    return {...semantic('通常攻撃の追撃参照。局所表示量とは別に、保存された子選択表から追撃を計算する'),bladeFollowup,
     evidence:['docs/blade-recovery-scope-20261012.txt'],partial:unknownConditions.length>0,
     ...(unknownConditions.length?{remaining:'この効果が採用された条件下の追撃量。親の追加条件：'+unknownConditions.join(' / ')}:{})};
   }
   if(e.kind===63)return {...semantic('同じ技のBuff定義を使用者へ登録する要求。元のM/Aと定義の保持カウンタを渡し、数量作用は同じ定義内の各効果として別計算する。独立したダメージ・回復係数は持たない。実際の受理・更新・競合は別軸'),recipient:'使用者',evidence:['docs/client-numeric-gaps5-20261011.txt']};
   if(e.kind===164)return {...semantic('強度の抵抗分岐で対象抵抗を0として計算する定義。定義内の種別164の存在を調べ、当該行の昼夜・世界flagsはこの判定では読まない。数量作用へ反映済み。抵抗に応じた持続時間は別計算で、必中・発動成功の保証ではない'),active:true,evidence:['docs/client-numeric-gaps5-20261011.txt']};
   if(e.kind===76)return {...semantic('画面の揺れ。視点へ変位を加える表示効果で、戦闘能力の加減算ではない'),presentation:{durationMs:Math.trunc(f(e.value)*1000),intensitySelector:e.selector&255}};
   if(e.kind===30&&d.action_type===2)return {...semantic('物理の通常防御では軽減率を0にするが追加作用フラグを保持する。防御側115 selector8なら全量軽減へ反転。kind102の追加作用も無効にする枝とは異なる'),evidence:['docs/client-numeric-gaps7-20261011.txt']};
   if(e.kind===102&&d.action_type===2)return {...semantic('通常の物理防御では軽減と追加作用を無効化する。防御側の効果115・selector8では全量軽減へ反転する。独立した威力倍率ではない'),guardBypass:{normal:extensions.guardOverride(1,0,false,true),counter:extensions.guardOverride(0,8,false,true),consumerProved:true,scope:'この攻撃の102存在指定と有効な物理防御接触を前提とした分岐。通常防御の軽減率0・追加作用なし、selector8の軽減率1。攻撃自身のダメージは既存の物理計算へ表示。受理・防御受付の成否は別条件'},evidence:['docs/client-numeric-gaps23-20261016.txt','docs/client-numeric-gaps7-20261011.txt']};
   if(e.kind===102)return semantic('通常の盾防御を貫通。盾側の効果115・selector8がある場合は別分岐で全量防御する。効果量の乗算係数ではない');
   if(e.kind===55)return ok(active?extensions.reviveFractionCache(f((e.selector|0)*f(.01)))*100:0,'%',
    ['docs/client-numeric-gaps4-20261011.txt','docs/effect-interpretation-20261012.txt'],{name:'蘇生の指定割合',revivalPercentage:true,
     scope:'蘇生成功を前提とした割合表示。内部selector×0.01をfloat32保存し、0.2未満または1超は0.2へ置換。wikiの蘇生説明に対応付け、HP実数・端数処理・成功率・受諾処理は今回の表示範囲外。割合の数値出典は内部定義で、wiki本文からの直接引用ではない'});
   if(e.kind===91){
    const prior=number(p.castingMovementFactor,'この効果を除く詠唱中の移動倍率',0,3),value=extensions.castingMovementFactor(active?e.value:1,prior);
    const castingMovement=p.reuseRequest?.concentration==null?null:casting.movement(p.reuseRequest.concentration,value);
    return ok(value,'倍',['docs/client-numeric-gaps4-20261011.txt'],{name:'詠唱中移動の採用枝への倍率',rawMultiplier:e.value,
     castingMovement,
     scope:'詠唱中移動の補正を受ける行動条件。既存倍率×保存係数'+f(e.value)+'、合成倍率の上限3。技能・魔力補正なし。動作flag800000の免除・別の10%枝には掛けない。通常移動速度全体の倍率・実距離とは区別'});
   }
   if(e.kind===101){if(!active)return fail('世界・時間帯条件が不成立で詠唱移動許可を得られない。他の許可状態が未指定');const q=casting.movement(number(p.reuseRequest?.concentration,'集中力',0,inputs.skillMax),number(p.castingMovementFactor,'採用済みの詠唱中移動倍率',0,3));return ok(q.factor,'倍',['docs/client-numeric-gaps9-20261011.txt'],{name:'詠唱移動許可時の通常PC移動入力倍率',castingMovement:q,partial:true,scope:q.scope,remaining:'他の移動制限・地形・最終速度、複数の移動許可状態の競合は別条件'});}
   if(e.kind===107){const q=stateRequests.perception(active?e.value:100,p.perceptionRaw,p.perceptionDistance);return ok(q.multiplier,'倍',['docs/client-numeric-gaps9-20261011.txt'],{name:'NPC索敵範囲の補正倍率',perception:q,partial:true,scope:q.scope,remaining:'対象NPCの定義補正と補正前範囲は条件入力。種別と定義欄の自動取得、感知系統名の対応、最終発見可否は未接続。敵対ポイントの倍率ではない'});}
   if(e.kind===149){const q=passive.petExperience(e,p.petExperienceCondition);return ok(q.standaloneMultiplier,'倍',['docs/client-numeric-gaps20-20261015.txt'],{name:'ペット経験値倍率（単独適合時）',petExperience:q,partial:true,scope:q.scope,
    remaining:'適合ペットへの倍率変更と条件付き経験値要求を計算。実Buffの受理・更新順と経験値→最終レベル増分、他の成長条件は未接続。倍率とレベル増分を同じ値として表示しない'});}
   if(e.kind===191&&e.selector===0&&!e.qualifier&&!e.other10&&!e.other18&&e.flags===48&&Number.isFinite(e.value)){
    const q=passive.equipmentCurse(p.cursedEquipment??null);
    return {...semantic('装備中の呪い属性を1枠だけ解除する作用'),recipient:'使用者（ローカルPC）',equipmentCurse:q,partial:true,scope:q.scope,
     remaining:'装備状態の条件付き解除を表示。実装備の取得・保存・再同期、要求の成否は未接続。表示文言は当該技の保存説明と対応させたもの',evidence:['docs/client-numeric-gaps19-20261015.txt']};
   }
   if(e.kind===28&&e.selector===7){const q=passive.petSpecialCommand(e,p.petSpecialReady??null);return {...semantic('ペットに使用可能な特殊攻撃を指示する。技自身に独立した威力値はない'),petCommand:q,partial:true,scope:q.scope,
    remaining:'ペットが選ぶ特殊攻撃の種類・威力・実発動回数・成否は未接続。指示を0ダメージや攻撃計算済みとは扱わない',evidence:['docs/client-numeric-gaps19-20261015.txt']};}
   if(e.kind===74){const q=passive.trapRemoval(e,p.removableObject??null);return {...semantic('適合する罠・設置物の解除要求。独立したダメージ量は持たない'),trapRemoval:q,partial:true,scope:q.scope,
    remaining:'対象設置物への受理・消滅と範囲内の対象展開は未接続。対象の適合は条件入力。効果行だけで範囲半径・一括解除件数を決めない',evidence:['docs/client-numeric-gaps19-20261015.txt']};}
   if(e.kind===106&&e.selector===0&&!e.qualifier&&!e.other10&&!e.other18&&e.flags===48&&Number.isFinite(e.value))return {
    ...semantic('収納可能な自分のペット1体を、空のアニマル ケイジへ収納する作用。ペットの能力を新しく算出する技ではない'),
    petCage:{consumerProved:true,itemKind:6,recordBytes:22,emptyReferenceWord:0,quantity:null},partial:true,
    scope:'空きケイジを探し、管理枠のペット記録をケイジへ保存する処理まで確認。1枠の収納と装備・Buffの数値補正は別です。',
    remaining:'ペット所有・収納可否、記録内各値の更新、所持品の受理・保存と成功判定は未再現。未指定のペット能力を0や算出済みとは扱わない',evidence:['docs/client-numeric-gaps19-20261015.txt']};
   if(e.kind===28&&e.selector===10||e.kind===210){
    const q=extensions.petRevivePenalty(e.value,number(p.petLevel,'蘇生対象ペットの現在レベル',1,150));
    // Both registered paths pass mode0 to793b70 via5d2c20. For a valid
    // accepted pet record,5f6be0 writes HP1/MP0, independently of level loss.
    const restored=!e.qualifier&&!e.other10&&!e.other18&&e.flags===48&&Number.isFinite(e.value)
      ?{consumerProved:true,consumer:'0x793b70',accepted:active,hp:active?1:null,mp:active?0:null,assignment:true,
        scope:'管理枠1〜3の有効な死亡ペットへの蘇生受理1回。HPを1、MPを0に設定する指定値。加算回復量・最大HP割合・サーバー受理後の実測値ではありません。'}:null;
    return ok(active?q.loss:0,'レベル',[e.kind===210?'docs/client-numeric-gaps9-20261011.txt':'docs/client-numeric-gaps4-20261011.txt',...(restored?['docs/client-numeric-gaps40-20261017.txt']:[])],{name:'ペット蘇生時のレベル減少',petRevive:{...q,after:active?q.after:q.before},petRestoration:restored,partial:true,
     remaining:restored?'蘇生受理後の状態保存・実際の復帰と成否は別。数値指定はHP1/MP0。':'蘇生時のレベル減少は計算可能。蘇生後HP量は未確定',
     scope:(e.kind===210?'管理枠1〜3の死亡ペットを個別処理。ここには指定した1体の結果を表示し、3倍しない。':'')+'死亡した蘇生可能ペットへの受理要求1回。B×0.1をレベルから減算、下限1。M/Aなし。HP回復率ではない。成功判定・道具/装備耐久の消費は別'});
   }
   if([3,11,42,173].includes(e.kind)){
    const c=selectedChannels(),q=extensions.directMessage(e.kind,e.value,c.m,e.value<0?-c.a:c.a),value=active?q.value:0;
    if(e.kind===42){
     const stat=extensions.stats[e.selector];
     if(!stat||![24,25,27,31].includes(stat.runtime))return fail('直接能力要求のselector '+e.selector+' の単位と受信先が未確定');
     return ok(value,'ポイント',['docs/client-numeric-gaps4-20261011.txt'],{name:stat.name+'への直接増減',channels:c,count:1,
      scope:'プレイヤーへ成立した初回1要求（登録modeType1）。B×保存M＋A。dispatcherでBの符号に合わせたAを使用。'+([24,25,27].includes(stat.runtime)?'現在値へ加算後0〜100へ制限。':'汚れの単位への増減要求。最終状態の上下限は別。')+'持続中の毎秒量ではない'});
    }
    let cycle={count:1,total:Math.abs(value)};
    if([11,173].includes(e.kind)){
     let n={supported:false,reason:'周期入力が未確定'};
     try{n=extensions.periodicRequests(d,e,durationCounter(d,row,p,names),p);}catch(_){}
     cycle=n.supported?{count:n.count,total:Math.abs(value)*n.count,intervalSeconds:n.intervalSeconds,...(n.singlePositiveUpdate?{singlePositiveUpdate:true,periodicScope:n.scope}:{})}:{partial:true,remaining:'周期HPの単発要求は既知。条件付き総量：'+n.reason};
    }else if(d.counter||d.interval){
     let n={supported:false,reason:'周期入力が未確定'};
     try{n=extensions.periodicRequests(d,e,durationCounter(d,row,p,names),p);}catch(_){}
     if(n.supported){
      const initial=channels(d,row,p,names),iq=extensions.directMessage(3,e.value,initial.m,e.value<0?-initial.a:initial.a);
      cycle={count:n.count,initialValue:n.initialCount?active?Math.abs(iq.value):0:null,total:(n.initialCount?(active?Math.abs(iq.value):0):0)+Math.abs(value)*n.periodicCount,
       initialSourceValue:n.initialCount?(active?Math.abs(iq.source):0):null,sourceTotal:(n.initialCount?(active?Math.abs(iq.source):0):0)+(active?Math.abs(q.source):0)*n.periodicCount,intervalSeconds:n.intervalSeconds,periodicScope:n.scope,singlePositiveUpdate:n.singlePositiveUpdate};
     }else cycle={partial:true,remaining:'吸収の単発要求は既知。条件付き総量：'+n.reason};
    }
    return ok(Math.abs(value),'HP',['docs/client-numeric-gaps4-20261011.txt'],{name:(q.value<0?'HP回復量':'HPダメージ'),signedMessage:value,channels:c,...cycle,
     secondaryMessages:e.kind===3?[{messageType:2,amount:active?q.source:0,recipient:base.recipient==='指定対象'?'使用者':e.flags&1?'使用者':'指定対象',name:q.source<0?'HP回復要求':'HP損傷要求',...(cycle.sourceTotal!=null?{total:cycle.sourceTotal,initialValue:cycle.initialSourceValue,count:cycle.count}: {})}]:[],
     scope:(e.kind===11?'毒の周期で成立した1要求。':e.kind===173?'損傷区分5の周期で成立した1要求。':'対象と使用者へ別々に生成する1回のHP要求。')+'B×保存M＋Aを−1000〜10000へ制限。'+(e.kind===3?'使用者側は上限前の元の値を反転して別に制限。実際のHP減少分を転送する式ではない。':'全周期成立時だけ回数と条件付き合計を表示。')+'受信拒否・残HP上限・最終HP保存は別'+(cycle.periodicScope?'。'+cycle.periodicScope:'')});
   }
   if(e.kind===19){
    const ongoing=!!(d.counter||d.interval);
    let q={supported:false,reason:'有限の生成回数が未確定'};
    if(ongoing)try{q=extensions.periodicRequests(d,e,durationCounter(d,row,p,names),p);}catch(_){}
    return ok(active?1:0,'個',['docs/client-numeric-gaps4-20261011.txt','docs/wiki-client-completion-20261012.txt'],{name:'物品生成要求（参照ID '+e.selector+'）',itemReference:e.selector,count:1,
     ...(ongoing?q.supported?{count:q.count,total:(active?1:0)*q.count,intervalSeconds:q.intervalSeconds,singlePositiveUpdate:q.singlePositiveUpdate}:{partial:true,remaining:'物品1個の生成要求は既知。'+q.reason}:{}),
     scope:'有効な物品参照が解決し、対象への生成要求が成立した1回分。固定1個でM/Aを掛けない。所持枠・実取得・生成装備の性能は別。複数効果行はそれぞれ独立した要求。'+(q.supported?q.scope:'')});
   }
   if([31,57,78,130].includes(e.kind)){
    const q=movement.impulse(active?e.value:0,[31,57].includes(e.kind)?0:e.selector,p.movementDelta);
    return ok(q.updates,'更新',['docs/client-numeric-gaps9-20261011.txt'],{name:'吹き飛ばし加算が残る更新回数',movement:q,partial:true,
     scope:q.scope+(e.kind===57?' 使用者にも逆方向の別要求。対象と使用者それぞれで成立判定する':''),
     remaining:'衝突後の座標・他の移動との合成・更新間隔の実秒換算は状態再現の残件。単位なしの初期値・減衰累計は計算済み。累計は1要求分で、持続親の全発動分を合算した値ではない'});
   }
   if([69,108,109].includes(e.kind)){
    const reuse=extensions.selectedReuse(e.kind,active?e.value:100,e.selector,p.reuseRequest);
    return ok(reuse.factor,'倍',['docs/client-numeric-gaps3-20261011.txt'],{name:(e.kind===69?(names[e.selector]||'指定技能'):e.kind===108?'武器技能':'魔法技能')+'の再使用倍率',reuse,...(reuse.remaining?{partial:true,remaining:reuse.remaining}:{}),
     scope:'選択した1効果の保存倍率（技能・魔力の強度補正なし）。共通の集中力補正と対象技能判定は指定行動への適用欄に表示。発動時間・秒数・再使用可能時刻とは別'});
   }
   if([82,83].includes(e.kind)){
    if(d.effects.some(x=>x.kind===240))return fail('割合HPの基礎値置換kind240の対象分岐が未接続');
    const c=selectedChannels(),hp=e.kind===82,resource=hp?'HP':'MP';
    const maximum=number(hp?p.targetMaxHP:p.targetMaxMP,'対象の最大'+resource,0,100000000);
    if(hp&&p.percentHpGateClear!==true)return {...fail('対象に少量HPダメージ無効化（kind259）がない条件を指定してください。この条件外の採用・閾値は未接続'),category:'入力不足'};
    const q=extensions.percentResource(e.kind,e.value,c.m,e.value<0?-c.a:c.a,maximum),signed=active?q.request:0;
    return ok(Math.abs(signed),resource,['docs/client-numeric-gaps3-20261011.txt'],{name:resource+(q.request<0?'回復量':'減少量'),signedMessage:signed,channels:c,count:1,total:Math.abs(signed),percentage:q.percentage,
     scope:'成立した1要求。最大'+resource+'×割合/100。'+(hp?'正の損傷は40上限、負の回復はこの上限の対象外。対象のkind259なし。':'HP割合処理の40上限は適用しない。')+'残量による実回復上限・HP/MP保存とは区別'});
   }
   if([8,9,89,169].includes(e.kind)){
    const primary=names[d.primary_raw],skill=d.primary_raw===0?0:d.id===row.internalId?p.skill:number(p.skills?.[primary],primary+'（生成レベル）',0,inputs.skillMax);
    const runtimeSelector=extensions.decodeSummonSelector(e.selector);
    const selected=extensions.summonSelection(runtimeSelector,e.value,Math.round(skill*10000),number(p.random15,'召喚選択15bit整数',0,32767),p.casterResistances);
    const abilities=summons.calculate(selected.referenceKey,selected.level,p.summonBaseVariant);
    if(selected.level<=0)return {...fail('生成体参照キー'+selected.referenceKey+'に渡す非正のレベル指定 '+selected.level+' の解釈（既定値/継承）が未確定'),summonAbilities:abilities,diagnostic:{name:'生成要求のレベル指定',value:selected.level,unit:'（特殊指定）',scope:'実際の生成レベル・能力値として扱わない',evidence:'docs/client-numeric-gaps-20261011.txt'},...areaDetails};
    return {...ok(selected.level,'',['docs/client-numeric-gaps-20261011.txt','docs/client-numeric-gaps9-20261011.txt'],{name:'生成レベル入力',referenceKey:selected.referenceKey,partial:true,summonAbilities:abilities,
     remaining:actionBinding?.candidateOnly?(areaDetails?.selectedChild?.inputCondition?.derivedTrap?'罠レベルから候補の技能入力と1要求量は計算済み。実爆発ID・段階選択は未照合。候補を親の確定量にしない':'選択候補の単独量だけを計算。親が発行する実ID・段階選択・入力継承は未照合。親全体を対応済みにしない'):actionBinding?'保存行動の参照先を結合済み。入力に依存しない量と、生成体自身の技能・魔力を指定した対応枝の1要求量は内訳へ表示。生成体の実能力・未対応の入力枝・実行条件/回数・親の有効総量は未確定':areaDetails?areaCandidate.remaining:abilities?.remaining||abilities?.reason||'参照キー'+selected.referenceKey+'から801700が返す実体定義とレベル別HP・攻撃・防御などの能力式が未確定',scope:'生成要求で渡すレベル。生成後の能力値一式とは区別。参照キー '+selected.referenceKey}),...areaDetails};
   }
   if(e.kind===94){
    if(e.value<=0&&![1,2,3,4,5,6,7,8,10,11,12,13].includes(e.selector))return fail('設置selector '+e.selector+' はactor状態+f4を使う。入力値の意味と供給式が未確定');
    const raw=e.selector===1?36:46,skill=e.value>0?0:d.id===row.internalId&&d.primary_raw===raw?p.skill:p.skills?.[names[raw]];
    const level=extensions.placementInput(e.selector,e.value,Math.round(number(skill,(names[raw]||'設置技能')+'（設置入力）',0,inputs.skillMax)*10000));
    return {...ok(level,'',['docs/client-numeric-gaps3-20261011.txt'],{name:'設置要求の生成入力',partial:true,
     scope:'604cb0→type44に渡す値。正の固定指定はそのまま、非正は銃器/罠技能との和を0.1〜130へ制限。設置後の攻撃力・HP・総ダメージとは区別',
     remaining:areaDetails?.selectedChild?.inputCondition?.derivedTrap?'罠レベルから候補の技能入力と1要求量は計算済み。実爆発IDを選ぶ条件は未照合。候補を親の確定量にしない':'selector '+e.selector+' の設置先を選ぶ5ace20以降の実体能力・攻撃/作動周期が未接続。生成入力を最終効果量にはしない'}),...areaDetails};
   }
   if([1,5,170,171].includes(e.kind)){
    const c=selectedChannels(),raw=f(f(e.value)*c.m+(e.value<0?-c.a:c.a));
    const signed=e.kind!==1?clamp(raw,-1000,10000):raw,isSt=[1,171].includes(e.kind),delta=isSt?signed:-signed,resource=isSt?'ST':'MP';
    let cycle={};
    if([170,171].includes(e.kind)){
     let q={supported:false,reason:'周期回数を作る入力が未確定'};
     try{q=extensions.periodicRequests(d,e,durationCounter(d,row,p,names),p);}catch(_){}
     cycle=q.supported?{count:q.count,total:(active?Math.abs(delta):0)*q.count,intervalSeconds:q.intervalSeconds,singlePositiveUpdate:q.singlePositiveUpdate||false,scope:'成立した1要求の量。残量/最大値による実増減の上限前。'+q.scope}:{partial:true,remaining:'1要求の量は既知。総量：'+q.reason};
    }
    return ok(active?Math.abs(delta):0,resource,['docs/client-numeric-gaps-20261011.txt'],{name:resource+(delta<0?'減少量':'回復量'),channels:c,signedDelta:active?delta:0,
     scope:'成立した1要求の量。残量/最大値による実増減の上限前。STとMPの符号・上限は別式',...cycle});
   }
   if([12,180].includes(e.kind)){
    const c=selectedChannels(),signed=clamp(f(f(e.value)*c.m+(e.value<0?-c.a:c.a)),-1000,10000);
    let q={supported:false,reason:'持続回数を作る入力が未確定'};
    try{q=extensions.periodicRequests(d,e,durationCounter(d,row,p,names),p);}catch(_){}
    const value=active?Math.abs(signed):0;
    return ok(value,'HP',['docs/client-numeric-gaps2-20261011.txt'],{name:signed<0?'HP回復量':'HPダメージ',channels:c,signedMessage:active?signed:0,partial:!q.supported,
     ...(q.supported?{count:q.count,total:value*q.count,intervalSeconds:q.intervalSeconds,singlePositiveUpdate:q.singlePositiveUpdate||false}:{}),
     scope:'成立した1要求の量。kind2の吸収・増幅処理とは別ハンドラ。'+(q.supported?q.scope:'総量は未確定'),remaining:q.supported?null:q.reason});
   }
   if(e.kind===85&&[2,3].includes(e.selector)){
    const multiplier=active?f(e.value):1,resourceCostProjection=e.selector===3&&p.affectedBaseST!=null?inputs.stConsumption({baseST:number(p.affectedBaseST,'補正対象の基礎ST',0),resourceFactor:multiplier}):null;
    return ok(multiplier,'倍',['docs/client-numeric-gaps2-20261011.txt'],{name:(e.selector===2?'MP':'ST')+'消費倍率',recipient:'効果保持者',resourceCostProjection,scope:'必要技能による割引後の基礎消費へ乗算。選択された1効果の倍率。M/Aによる増幅なし。ST要求の比較は技能軽減と他の補正を1とした条件で、Buff自身の発動コスト・成否時の実消費とは別'});
   }
   if(e.kind===244&&e.selector>=1&&e.selector<=9){
    if(typeof p.targetCategoryMatched!=='boolean')return {...fail('この効果が指定する対象分類'+e.selector+'への該当有無を指定してください'),category:'入力不足'};
    return ok(active&&p.targetCategoryMatched?f(e.value):1,'倍',['docs/client-hp-modifiers-20261005.txt'],{name:'対象分類'+e.selector+'のHP要求量倍率',recipient:'効果保持者のHP効果',scope:'選択された1効果。指定分類への該当有無は条件入力。kind2のB×M+Aの後、対象側232・上限制限より前に乗算。実際のBuff選択や他経路の倍率へは流用しない'});
   }
   if(e.kind===18){
    const limit=Math.trunc(f(e.value));
    if(limit<0)return {...semantic('対象マスク'+e.selector+'の状態を件数上限なしで解除（成立した1要求）'),name:'状態解除'};
    return ok(active?limit:0,'件',['docs/client-numeric-gaps-20261011.txt'],{name:'状態解除の上限件数',scope:'対象マスク'+e.selector+'。実解除件数は該当状態数以下。技能・魔力で増幅しない'});
   }
   if([41,147].includes(e.kind)&&math.fields[e.selector]){
    const c=p.generatedEntityInput?selectedChannels():channels(d,row,p,names),value=f(f(e.value)*c.m+(e.value<0?-c.a:c.a));
    return ok(active?value:0,e.kind===147?'%':'',[proof.strength,proof.stat,...(d.effect_class===2?[proof.resistance]:[])],{channels:c,fields:math.effectFields(e)});
   }
   if(e.kind===41&&e.selector===72){
    const c=stored(d,channels(d,row,p,names)),value=active?f(f(e.value)*c.m+(e.value<0?-c.a:c.a)):0;
    const dirt=passive.dirtCorrection(value,p.dirtBefore??null);
    return ok(value,'汚れポイント',['docs/client-native-buff-dispatch-20261006.txt','docs/client-numeric-gaps19-20261015.txt'],{name:'髪・顔の汚れへの能力補正',channels:c,dirt,partial:true,
     scope:dirt.scope+' 保持レコードの倍率・加算を各1/256単位へ格納した後の量です。',remaining:'量と通常PCの条件付き適用は計算可能。継続する実汚れ値の更新頻度、全Buffの採用順、終了時の状態復元は未接続'});
   }
   if([41,147].includes(e.kind)&&Object.hasOwn(crafting.selectors,e.selector)){
    const c=channels(d,row,p,names),value=active?f(f(e.value)*c.m+(e.value<0?-c.a:c.a)):0;
    const gaugeSlip=crafting.selected(e.selector,p.craftingSlipBefore,value,e.kind===147,p.random15,p.craftingSelector);
    return ok(value,e.kind===147?'%':'能力ポイント',[proof.stat,crafting.evidence],{
     name:extensions.stats[e.selector].name+(e.kind===147?'への割合補正':'への加算'),channels:c,gaugeSlip,
     scope:'停止時の滑り量に使う能力補正。各技能の1～100制限・使用技能の平均・整数化・15bit剰余まで確認。マス数は下の条件付き計算に分けて表示。生産成功率・完成品抽選とは別'});
   }
   if([41,147].includes(e.kind)&&Object.hasOwn(crafting.speedSelectors,e.selector)){
    const c=channels(d,row,p,names),value=active?f(f(e.value)*c.m+(e.value<0?-c.a:c.a)):0;
    const gaugeSpeed=crafting.selectedSpeed(e.selector,p.craftingSpeedBefore,value,e.kind===147,p.craftingSelector);
    return ok(value,e.kind===147?'%':'能力ポイント',[proof.stat,'dist/client-numeric-gaps17-20261015/crafting-speed-native-oracle.json'],{
     name:extensions.stats[e.selector].name+(e.kind===147?'への割合補正':'への加算'),channels:c,gaugeSpeed,
     scope:'生産ゲージの速度能力。各使用技能を1～500へ制限して平均し、ゲージ移動へ使う。適用後の能力値と有効倍率を条件付きで表示。秒換算・生産結果の確定とは別'});
   }
   if(e.kind===147&&extensions.stats[e.selector]?.name){
    const c=channels(d,row,p,names),value=f(f(e.value)*c.m+(e.value<0?-c.a:c.a));
    return ok(active?value:0,'%',['docs/client-native-stat-delivery-20261006.txt','docs/client-numeric-gaps-20261011.txt'],{name:extensions.stats[e.selector].name+'への割合補正',scope:'該当能力値への比率。時間やゲージ動作への最終換算とは区別'});
   }
   if(e.kind===41&&/滑り$/.test(extensions.stats[e.selector]?.name||'')){
    const c=channels(d,row,p,names),value=f(f(e.value)*c.m+(e.value<0?-c.a:c.a));
    return ok(active?value:0,'能力ポイント',['docs/client-native-stat-delivery-20261006.txt','docs/effect-interpretation-20261012.txt'],{
     name:extensions.stats[e.selector].name+'への加算',channels:c,partial:true,
     scope:'保存済みselector名とtype8能力加算を接続。負数はゲージ滑り能力の減少。生産結果・ルーレット全体の再現は行わない',
     remaining:'補正値は確定。滑り能力1ポイントを画面の何マスへ換算するか、基礎ゲージとの合成・下限は未確認。マス数とは表示しない'});
   }
   if(e.kind===41&&[19,20].includes(e.selector)&&extensions.stats[e.selector]?.runtime===e.selector-1){
    const c=channels(d,row,p,names),value=active?f(f(e.value)*c.m+(e.value<0?-c.a:c.a)):0;
    return ok(value,'能力ポイント',['docs/client-native-stat-delivery-20261006.txt','dist/client-numeric-gaps35-20261016/sense-modifier-native-oracle.json'],{
     name:(e.selector===19?'嗅覚':'聴覚')+'能力への加算',channels:c,sensingStat:{rawSelector:e.selector,runtimeSelector:e.selector-1,operation:'add',numericModifierProved:true,finalDistanceKnown:false},
     scope:'対象の嗅覚/聴覚能力へ加算する1効果の量。内部能力値の差分で、距離・割合・最終発見可否には換算しません。索敵範囲への効果107の倍率は別表示。'});
   }
   if(e.kind===41&&e.selector===24){
    const c=channels(d,row,p,names),value=f(f(e.value)*c.m+(e.value<0?-c.a:c.a));
    return ok(active?value:0,'（重量）',['docs/client-post-rebuild-20261006.txt','docs/client-numeric-gaps2-20261011.txt'],{name:'現在所持重量の補正',scope:'runtime23の所持重量に加算する量。最大重量の増減とは別。最終値の下限は保存時に適用',channels:c});
   }
   if(e.kind===41&&[16,17].includes(e.selector)){
    const c=channels(d,row,p,names),value=active?f(f(e.value)*c.m+(e.value<0?-c.a:c.a)):0;
    const statBase=e.selector===16?p.reuseMagicPercent:p.reuseWeaponPercent;
    const application=statBase==null?null:{before:number(statBase,'補正前の再使用能力値',0,1000),after:Math.max(0,f(f(statBase)+value))};
    if(application)application.factor=e.selector===16?f(application.after)*f(.01):Math.max(f(.4),f(application.after)*f(.01));
    return ok(value,'ポイント',['docs/client-numeric-gaps3-20261011.txt'],{name:(e.selector===16?'魔法':'技・武器')+'再使用の百分率への加算',channels:c,reusePercent:application,
     scope:'再使用基礎値へ百分率として乗算する能力値への加算。'+(e.selector===17?'技・武器側は40%下限。':'魔法側には同じ40%下限を適用しない。')+'補正前値と選択した1効果の合成であり、他Buffの採用・秒換算は別'});
   }
   if(e.kind===2){
    // Each HP entry has its own signed addition; do not sum self damage with target damage.
    if(d.effects.some(x=>x.kind===240))return fail('同定義の240による置換対象分類の入力対応が未接続');
    const ownDrain=d.effects.find(x=>x.kind===233);
    if(ownDrain&&(![1,2,3].includes(ownDrain.selector)||ownDrain.qualifier||ownDrain.other10||ownDrain.other18||ownDrain.flags!==48))return fail('同定義233の吸収対象資源・追加条件の対応');
    const c=selectedChannels(),signedAddition=e.value<0?-c.a:c.a;
    const hp=magic.hpMessage({base:e.value,multiplier:c.m,addition:signedAddition},{definition233:ownDrain});
    const value=active?hp.clientMessageAmount:0,heal=e.value<0;
    return ok(heal?-value:value,'HP',[proof.strength,proof.hp,...(d.effect_class===2?[proof.resistance]:[])],
     {name:heal?'HP回復量':'HPダメージ',signedMessage:value,channels:c,count:1,intervalSeconds:0,
      total:heal?-value:value,secondaryMessages:active?hp.secondaryMessages:[],scope:'成立した1回の要求量'});
   }
   if([167,196,235].includes(e.kind)&&names[e.selector])return ok(e.kind!==235||active?e.value:0,'',[proof.skill],{name:({167:'命中用技能 ',196:'固定基礎威力用技能 ',235:'効果用技能 '})[e.kind]+names[e.selector],active:e.kind===235?active:true});
   if([247,275].includes(e.kind)&&e.selector>=0&&e.selector<=6)return ok(active?e.value*100:0,'%',[proof.power],{name:e.kind===247?'物理威力':(e.selector===0?'全属性':'属性'+e.selector)+'威力'});
   if(e.kind===249)return ok(active?e.value:0,'%',[proof.reduction],{name:'魔法軽減率（選択された1効果）',factor:active?f(1-f(e.value)*f(.01)):1});
   if(e.kind===274&&e.selector===0)return ok(active?e.value*100:0,'%',[proof.resistance],{name:'魔法威力（倍率側のみ）'});
   if(e.kind===112&&[1,2].includes(e.selector)){
    const critical=passive.criticalDefinition(e)?passive.criticalProjection(active?e.value:0,e.selector,p.criticalCondition):null;
    return ok(active?f(e.value)*100:0,'ポイント',['docs/catalog-client-formulas-batch2-20261005.md','docs/client-numeric-gaps20-20261015.txt'],{name:e.selector===1?'クリティカル確率への寄与':'被クリティカル確率への寄与',critical,
     scope:'選択効果の固定加算寄与。M/A・技能・魔力で増幅しません。'+(critical?critical.scope:'追加保持条件を含む他の定義は合成計算を保留。基礎率や他効果を指定していないため最終確率・実測頻度とは区別。')});
   }
   if(e.kind===259){
    const q=p.receivedHpAmount==null?null:extensions.thresholdDefense(e.value,number(p.receivedHpAmount,'受信HP要求量'),active);
    return ok(active?e.value:0,'HP',['docs/client-numeric-gaps8-20261011.txt'],{name:'正のHP損傷を無効化する上限（等号を含む）',thresholdDefense:q,
     scope:'5a8b20で採用された1効果。0より大きく上限以下のHP要求を0へ置換。回復・上限超過は通過し、保持M/Aは掛けない。HP保存処理より前'});
   }
   if([198,199,211].includes(e.kind)){
    const amount=number(p.receivedHpAmount,'受理されたHP損傷要求量',0);
    if(e.kind===211&&typeof p.incomingElementMatched!=='boolean')return fail('受ける攻撃が魔法分類2かつ指定属性'+e.selector+'に該当するか指定してください');
    const q=extensions.resourceDefense(e.kind,amount,p.targetCurrentHP,p.targetCurrentMP,e.value);
    const value=e.kind===211?(active&&p.incomingElementMatched?q.healing:0):e.kind===199&&active?q.hpDamage:e.kind===198&&active?q.hpDamage:q.damage;
    return ok(value,'HP',['docs/client-numeric-gaps8-20261011.txt'],{name:{198:'致死回避条件を反映したHP減少量',199:'MP肩代わり後のHP損傷量',211:'指定属性'+({3:'火',4:'水'}[e.selector]||e.selector)+'魔法のHP回復要求'}[e.kind],resourceDefense:active?q:null,
     scope:'選択効果だけが有効、受理済みの損傷を整数化した5798e0の枝。211は分類2/指定属性一致、198/199は他の属性吸収・致死回避との併用なし。成功判定・通信・死亡は再現しない'});
   }
   if(e.kind===231){
    const c=selectedChannels(),q=extensions.mpBurst(e.value,c.m,e.value<0?-c.a:c.a,number(p.casterCurrentMP,'使用者の効果発生直前MP',0));
    return ok(active?q.hpRequest:0,'HP',['docs/client-numeric-gaps8-20261011.txt'],{name:'使用者MP基準のHP損傷要求',mpBurst:active?q:{hpRequest:0,mpRequest:0},channels:c,
     scope:'効果が受理された1回のHP要求と使用者へのMP減少要求。技開始時の基本消費とは別に、効果発生直前MPを使う。先行消費の有無は入力MPに反映してください。対象側の最終HP保存・上書きは別'});
   }
   if(e.kind===232){
    let projection=null;
    if(p.receivedHpAmount!=null){const before=number(p.receivedHpAmount,'増幅前のHP要求量',-1000,100000);
     const q=magic.hpMessage({base:before,multiplier:1,addition:0},{target232:{value:active?e.value:0}});
     projection={before,amount:q.clientMessageAmount,request:q,multiplier:active?1+e.value:1};
    }
    return ok(active?e.value*100:0,'%',[proof.hp,'docs/client-numeric-gaps22-20261015.txt'],{name:'正のHP損傷量への増幅（選択された1効果）',hpAmplification:projection,
     scope:'対象に保持されたこの1効果が選択された条件。正のHP要求だけに1＋係数を掛け、要求上限10000を適用。負の回復量には掛けない。付与の受理・競合・最終HP変化は別。'});
   }
   if(e.kind===239){
    if(typeof p.physicalCategoryMatched!=='boolean')return fail('物理特効の指定分類に対象が該当するかを指定してください');
    return ok(p.physicalCategoryMatched?e.value:1,'倍',['docs/client-physical-techniques-20261005.txt'],{name:'物理特効・対象分類'+e.selector,
     scope:'武器・投射物の対象分類成立時に通常の基礎倍率/資源倍率を置換。非該当時の1は特効の寄与のみ。固定威力枝には適用しない。物理結果に接続済みの場合は合算しない'});
   }
   if(e.kind===124){
    const c=selectedChannels(),q=extensions.directMessage(42,e.value,c.m,e.value<0?-c.a:c.a);
    return ok(active?q.value:0,'能力ポイント',['docs/client-numeric-gaps8-20261011.txt','docs/client-numeric-gaps9-20261011.txt'],{name:'泳ぎ速度能力への加算（runtime72）',channels:c,swim:movement.swim(active?q.value:0,p.swimAbilityBefore),partial:true,
     scope:'562290の固定selector72へのtype8加算要求。raw selector72（汚れ）とは異なり、実行時72＝raw70の泳ぎ速度。保持時M/Aと初回M/Aを区別。移動距離や毎秒速度へ換算しない',
     remaining:'576f39/5772eaで通常PCの水中移動に能力×0.01を乗算。能力の上下限制限にかからない条件で補正後倍率まで計算。地形/動作/速度上限/秒換算を含む最終移動は未接続'});
   }
   if(e.kind===188){
    const name=names[e.selector];if(!name)return fail('命中加算の技能selectorが未照合');
    const hitAddition=p.buffActionSkill!=null&&p.buffHitBefore!=null?extensions.hitAddition(active?[e]:[],p.buffActionSkill,p.buffHitBefore):null;
    return ok(active?f(e.value):0,'ポイント',['docs/client-numeric-gaps8-20261011.txt'],{name:name+'の物理命中入力への加算',hitAddition,
     scope:'kind188を持つ最初の有効Buffが採用され、行動のprimary技能が一致する別命中入力枝。Bを直接加算し、M/Aなし。選択技能の補正後入力は上限5000・符号付き16bit格納より前。最終命中率ではない'});
   }
   if(e.kind===200){
    const protection=p.protectionDistance!=null?extensions.protectionDistance(e.value,p.protectionDistance):null;
    return ok(f(e.value),'座標単位',['docs/client-numeric-gaps8-20261011.txt'],{name:'保護先切替の距離上限（未満）',protection,partial:true,
     scope:'5651e0で選ぶ最初のunmarked効果200の発生元が解決し、5a6730の行動+34/+38が0・効果分類1以外という条件を通る枝（魔法も含む）。保持者と発生元の3D距離 < B で保護先を選ぶ。等号は不成立。M/Aなし。メートル換算ではない',
     remaining:'保護先の選択条件付き距離まで。切替後の各攻撃の全副作用・複数保護効果の競合は未接続'});
   }
   if([95,96].includes(e.kind)){
    const q=extensions.lifetimeModifier(e.kind);
    let extension=null,extensionReason=null;
    if(e.kind===96)try{
     if(d.interval!==1||d.action_type===5||d.effect_class!==1||d.effects.some(x=>x.kind===110))throw Error('延長作用自身の時間停止/繰返し/interval分岐は未対応');
     const own=duration(d,row,p,names);if(!own.supported)throw Error(own.reason);
     extension=wikiHints.temporaryExtension({...p.lifetimeCondition,modifierSeconds:own.seconds*2,present:active&&p.lifetimeCondition?.present!==false});
    }catch(error){extensionReason=error.message;}
    return ok(active?q.ratio:1,'倍',['docs/client-numeric-gaps8-20261011.txt','dist/wiki-hints-20261012/code-772ac0-772d10.json'],{name:e.kind===95?'チャージ印付きBuffの更新間隔比':'有限Buffの初期終了判定カウンタ比',partial:true,lifetimeModifier:q,lifetimeExtension:extension,lifetimeExtensionReason:extensionReason,
     scope:e.kind===95?'772ac0のmarkedレコードだけ、更新間隔10→20。効果B/M/Aを使わない。魔法の詠唱時間・再使用待ちではない':'772ac0のunmarked・class1・非繰返し・時間停止なし。残りcounter=初期counterの時、終了検査はcounter+initialなので2倍。保持値の書換えではなく終了判定の延長。別分類/繰返しへ流用しない',
     remaining:'内部更新間隔/終了検査の比まで。実elapsed cadence・他の解除/上書き・実秒での最終終了は未確定'});
   }
   if(e.kind===256)return {...semantic('魔法の行動入力は魔力の代わりに使用者攻撃力を使う（保存済みconstructor2780）。独立した加算量はなく、同定義のHP量に反映する'),evidence:['docs/client-numeric-gaps8-20261011.txt']};
   if([233,234].includes(e.kind)&&[1,2,3].includes(e.selector)){
    let absorption=null,absorptionReason=null;
    if(e.kind===234&&p.absorptionSelected===true)try{
     const basis=number(p.absorptionBasis,'吸収判定直前・上限制限前のkind2 HP要求量',-1000000,1000000);
     const q=magic.hpMessage({base:basis,multiplier:1,addition:0},{caster234:{...e,value:active?e.value:0}}),message=q.secondaryMessages[0];
     absorption={basis:q.unclampedAmount,raw:message?.rawAmount??0,amount:message?Math.abs(message.amount):0,resource:['','HP','MP','ST'][e.selector],requested:!!message,
      scope:'このBuffが使用者の吸収効果として選択済み・攻撃固有kind233なしのkind2 HP要求1回。上限制限前の損傷要求が基準。HP/MP回復要求は1000上限、STはこの枝に同じ上限なし。実HP減少や最大資源による受取上限とは別'};
    }catch(error){absorptionReason=error.message;}
    return ok(active?e.value:0,'%',[proof.hp,'docs/client-numeric-gaps10-20261012.txt'],{name:['','HP','MP','ST'][e.selector]+'吸収率（上限前の損傷量基準）',absorption,absorptionReason});
   }
   if(e.kind===47){
    const c=selectedChannels(),q=extensions.buffReflection(d.id,active?c.m:0,p.buffReflectionOnly===true?p.buffReflectionDamage:null);
    return ok(q.reduceRate*100,'%',['docs/client-numeric-gaps7-20261011.txt'],{name:'保持強度を反映した物理軽減率',buffReflection:q,partial:!q.outcome,
     scope:'kind47の保存比率×保持中の倍率（加算Aなし）。反射率・軽減率は別々に0〜1へ制限。他の47/216/280を併用せず、このBuffの反射・軽減が選択された条件の1回量。反射要求は軽減前の同じ損傷量が基準。HP保存前の要求量',
     remaining:q.outcome?null:'損傷量と、このBuffのみ・反射適合成立の条件を指定すると1回の反射/軽減後要求を計算。反射対象の関係・物理行動側の許可は条件入力'});
   }
   if(e.kind===132&&(e.selector&7))return ok(active?.25:1,'倍',[proof.quarter],{name:['HP','MP','ST'].filter((_,i)=>e.selector&(1<<i)).join('/')+'基礎自然回復倍率',scope:'609d60/60a160はselectorの下位3bitを個別検査する。上位bitはこの回復演算に使わない。選択された抑制効果。kind13の係数・毎秒量とは別'});
   if(e.kind===270&&e.selector===0){
    // An isolated selected record: zero is the declared baseline for a
    // contribution, never a substitute for an unknown total attack value.
    const result=conversion.reference({selector:2,cachedValue:0,ordinaryValue:0,actorType:1,
     state:{slots:[{id:d.id}]},definitions:[{id:d.id,effects:[e]}],world:p.world,context:0,
     drunk:number(p.drunk,'使用者の酩酊度（既存の能力入力欄）',0)});
    return ok(result.value,'',['docs/client-native-base-conversion-20261005.txt'],{name:'攻撃力参照への酩酊変換量',recipient:'効果保持者',fraction:result.totals[270],
     scope:'選択された1効果の変換寄与。武器/射撃の基礎差替え後に加算。現在の攻撃力・ダメージへ自動重複加算しない'});
   }
   if(e.kind===71&&d.effects.some(x=>[8,9,89,94,169].includes(x.kind)))return ok(summonTime(d,row,p,names),'秒',['docs/client-numeric-gaps3-20261011.txt'],{name:d.effects.some(x=>x.kind===8)?'召喚寿命':'設置・生成寿命',timeOnly:true});
   return fail();
  }catch(error){return {...fail(error.message),category:/指定してください/.test(error.message)?'入力不足':'不足する式・仕様'};}
 }
 function evaluate(bundle,input,skillNames={}){
  const release=bundle.row.releaseConditions;
  if(release){
   if(!release.targetTypes.includes(input.releaseTargetType))throw Error(bundle.row.name+'の計算対象を指定してください。'+release.targetReason);
   if(release.requiredBuffs.length&&!release.requiredBuffs.includes(input.releaseBuff))throw Error('発動条件のBuffを指定してください：'+release.requiredBuffs.join(' または '));
  }
  const p=controls(input),row=bundle.row,math=formulas.create(skillNames),effects=[],times=[],physicalResults=[];
  let dualWeaponRoute=null,dualWeaponReason=null;
  try{dualWeaponRoute=dualWeapons.prepare(row,p);}catch(error){dualWeaponReason=error.message;}
  const numericalDefinitions=dualWeaponRoute?.definitions||[row.definition,...row.dependencies].filter(Boolean);
  const guardWindows=numericalDefinitions.filter(d=>guardWindowMath.rules[d.id]).map(d=>({...guardWindowMath.window(d.id,{confirmed:input.guardGroundTimingConfirmed===true,delayed:input.guardDelayedStart===true,current:input.guardCurrentCounter??null,scheduledMilliseconds:input.guardScheduledMilliseconds??null}),name:d.name}));
  p.guardTimingById=Object.fromEntries(guardWindows.filter(q=>q.supported).map(q=>[q.definitionId,q]));
  const equipment=equipmentBuffs.collect(input.equipmentBuffRows,p.world);
  p.equipmentSkillBonuses=equipment.skills;p.equipmentElementFractions=equipment.elements;
  p.constructed={};p.constructorErrors={};
  const reversedPhysicalChildren=new Set([row.definition,...row.dependencies].filter(Boolean).flatMap(d=>!(d.flags&0x400)?d.effects.filter(e=>e.kind===86&&e.flags===50&&!e.qualifier&&!e.other10&&!e.other18).map(e=>e.selector):[]));
  for(const d of numericalDefinitions){
   const saved=bundle.numericReferences?.[d.id]?.physical;if(!saved||row.matchStatus!=='一致')continue;
   if(reversedPhysicalChildren.has(d.id)){p.constructorErrors[d.id]='元の対象側が発生元になる子行動です。元の使用者の技能・装備入力をコピーしません。専用条件の防御前威力と、未対応の対PC損傷を区別します';continue;}
   try{
    const itemField18=saved.effects.some(e=>e.kind===190)?number(p.weaponWeight,'使用武器1個の重量',0):undefined;
    if(saved.effects.some(e=>e.kind===239)&&typeof p.physicalCategoryMatched!=='boolean')throw Error('物理特効の対象分類条件が未指定');
    const separate=row.independentPhysicalChildren?.includes(d.id),c=dualWeaponRoute?.contexts[d.id]||(separate?input.physicalChildContexts?.[d.id]:input.damageContext);
    if(!c)throw Error(separate?(row.dualWeaponInputSupported?'左右の装備条件と各手の攻撃力・命中を指定してください。連続攻撃の条件を選ぶまで子へ入力をコピーしません':row.weaponInputRoutingUnresolved?'参照攻撃ごとの装備・攻撃力・命中の入力が未確定です。親の武器入力をコピーしません。左右の自動選択は未対応です':'左手の子射撃が成立する条件と、別の攻撃力・命中の入力が必要です。右手の値をコピーしません'):'攻撃力・命中・使用者防御力の入力が必要');
    const skill=d.id===row.internalId||dualWeaponRoute||row.sameCasterPhysicalChildren?.includes(d.id)?p.skill:number(p.skills?.[skillNames[d.primary_raw]],'参照先の主技能',0,inputs.skillMax);
    const itemClass=bundle.attack?.definition?.id===d.id?bundle.attack.itemClass:number(p.itemClass,'入力元の装備種別',0,0xf0001);
    const ranged=row.rangedPhysicalDefinitions?.includes(d.id)&&itemClass===0xf0001;
    const power=physical.power(saved,{itemClass,primarySkillInteger:Math.round(skill*10000),casterStateMode:1,world:p.world,
     rangedWeapon:!!ranged,...(ranged?{distance:number(input.shotDistance,'射撃対象までの距離（内部値）',0)}:{}),
     weaponAttack:number(c.attack,'使用者攻撃力',0),weaponHit:number(c.hit,'使用者命中',0),
     stats:{4:number(c.defense,'使用者防御力',0),6:p.magic},statCache:c.statCache,buffRecords:c.skillBuffs||[],
     casterPhysicalPowerFraction:number(c.powerMultiplier,'物理威力倍率',0)-1,casterElementStrengthFraction:(c.elementPct||0)/100,
     resource218:100,resource228:number(c.hpPercent??100,'使用者HP割合',0,100),random15:number(p.random15,'威力変動15bit整数',0,32767),
     targetPredicateSelectors:p.physicalCategoryMatched?saved.effects.filter(e=>e.kind===239).map(e=>e.selector):[]});
    p.constructed[d.id]={x:power.encodedPower,y:saved.uses_alternate_hit?null:power.encodedHit/16,hitUnknown:!!saved.uses_alternate_hit};
    if(saved.uses_alternate_hit){power.encodedHit=null;power.hitReason='別命中getter未接続。本体威力/命中成立時の損傷式は命中値に依存しない';}
    const damageInput={encodedPower:power.encodedPower,defense:p.targetDefense,seed:p.seed,incoming:number(c.incoming,'外部倍率',0),itemField18},damageOptions={target232:{value:number(c.targetMultiplier,'対象倍率',0)-1}};
    let result=physical.npcDamage(saved,damageInput,damageOptions),reduction=null;
    if(input.targetPhysicalReductionId!=null){reduction=targetReduction.apply(d,result.generatedAmount,{selectedId:input.targetPhysicalReductionId,world:p.world});
      if(!reduction.supported)throw Error(reduction.reason);
      if(reduction.supported&&reduction.applies)result=physical.npcDamage(saved,damageInput,{...damageOptions,target273:reduction});
     }
    let normalPcProjection=null;
    if(input.normalPcPhysicalConfirmed===true){
     if(!normalPc.compatible(d))normalPcProjection={supported:false,value:null,reason:'この行動には通常威力64以外の分岐があります。通常PCへの計算には追加作用の確認が必要です'};
     else if(c.incoming!==1||c.targetMultiplier!==1)normalPcProjection={supported:false,value:null,reason:'通常PCの追加補正なし条件では外部倍率・対象倍率を1に指定してください。未確認の補正は流用しません'};
     else try{normalPcProjection=normalPc.damage({confirmed:true,encodedPower:power.encodedPower,defense:input.normalPcPhysicalDefense??null,seed:p.seed,critical:input.normalPcPhysicalCritical===true});}catch(error){normalPcProjection={supported:false,value:null,reason:error.message};}
    }
    physicalResults.push({definitionId:d.id,name:d.name,conditional:d.id!==row.internalId,value:result.clientMessageAmount,power,secondaryMessages:result.secondaryMessages,
     ...(input.targetPhysicalReductionId!=null?{targetReduction:reduction}:{}),
     ...(input.normalPcPhysicalConfirmed===true?{normalPcProjection}:{}),
     scope:'NPC・盾なし、発動/命中済み、指定種値、指定装備入力の本体1回。特効・上限・別段は別計算'+(saved.uses_alternate_hit?'。別命中入力は未対応。命中済み本体量だけを計算':''),evidence:['docs/client-physical-input-20261005.txt','src/calc/clientPhysicalTechniqueReference.js']});
   }catch(e){p.constructorErrors[d.id]=e.message;}
  }
  const reverseProjections=new Map(),reverseDamages=new Map();
  for(const d of numericalDefinitions)for(const e of d.effects){const q=reverseReferencePower(d,e,row,bundle,p,skillNames);if(q){reverseProjections.set(d.id+':'+e.index,q);if(q.normalPcDamage?.supported){reverseDamages.set(q.childId,q.normalPcDamage);delete p.constructorErrors[q.childId];}}}
  for(const d of numericalDefinitions){
   const time=row.matchStatus==='一致'?duration(d,row,p,skillNames):{supported:false,seconds:null,reason:'内部IDの照合が未確定'};
   if(time.supported&&d.interval===1&&d.action_type!==5&&d.effect_class===1&&d.effects.some(e=>e.kind===96)&&!d.effects.some(e=>e.kind===110)){
    time.bodySeconds=time.seconds;time.seconds*=2;time.kind='自身も対象になる一時延長下の公称終了';time.scope='interval1の元counterが減少し、counter＋初期counterで終了を検査。他の解除/競合/時間停止なし。wikiの自身延長と保存772ac0に基づく。';
   }
   times.push({definitionId:d.id,conditional:d.id!==row.internalId,...time});
   for(const e of d.effects){
    let result=effect(d,e,row,p,skillNames,math);const reverse=reverseProjections.get(d.id+':'+e.index);
    if(reverse){result.reverseReferencePower=reverse;
     if(reverse.supported){result={...result,name:'反転参照の防御前威力',supported:true,value:reverse.value,unit:'威力入力',reason:null,partial:true,remaining:reverse.remaining,evidence:['docs/client-numeric-gaps23-20261016.txt','tests/fixtures/clientPhysicalTechniqueOracle20261005.json']};
      if(reverse.normalPcDamage?.supported)result={...result,name:'反転参照の通常PCへのHP要求量',value:reverse.normalPcDamage.value,unit:'HP',evidence:[...result.evidence,reverse.normalPcDamage.evidence]};
     }else result.reason=reverse.reason;
    }
    if(reversedPhysicalChildren.has(d.id)&&[33,54,64,164,190,205,214,239,252,253,254,258].includes(e.kind))result=reverseDamages.has(d.id)?{...result,supported:false,resolved:true,partial:false,value:null,reason:null,meaning:'反転参照の通常PCへのHP要求量を親の参照欄で計算済み。同じ1要求を子として重複加算しません',coveredByPhysical:true,coveredByAttack:true,coveredByReverseReference:true}:{...result,supported:false,reason:'発生元が反転した子の対PC損傷は未接続。防御前威力は親の参照欄へ別表示。元の使用者の入力やNPC向け損傷式を流用しない',coveredByPhysical:false,coveredByAttack:false};
     result=decorateEffectPhase(result,d,e,row,p,skillNames,math);
    if(input.npcArmorConfirmed===true&&result.supported&&npcArmor.compatible(result))result.npcArmorProjection=npcArmor.project(result,{
     confirmed:true,defense:input.npcArmorDefense??null,gearDefense:input.npcArmorGearDefense??null,wearSkill:input.npcArmorWearSkill??null,
     power:input.npcArmorPower??null,seed:p.seed,critical:input.npcArmorCritical===true});
    effects.push(result);
   }
  }
  for(const e of effects){const binding=generatedWait?.effectReferences?.[e.id],candidate=binding?.kind===e.kind&&binding.selector===e.selector?binding.referenceKey:undefined,q=generatedWait?.byReference[e.referenceKey??candidate];if(q&&p.summonBaseVariant===true)e.generatedInitialWait={...q,referenceOnly:e.referenceKey==null,unit:'ms',seconds:q.baseCounter>0?q.baseCounter/1000:null,timer:passive.aiWaitClock(q.baseCounter,p.random15??null),attackInterval:null,scope:generatedWait.scope+'。共通AI待ちの基準値。個々の攻撃間隔・全期間の発動回数とは別',evidence:[generatedWait.evidence,'dist/client-numeric-gaps26-20261016/clock-binding.json']};}
  for(const e of effects){const binding=generatedActions.bindings[e.id];if(binding?.kind===e.kind&&binding.selector===e.selector&&p.summonBaseVariant===true)e.generatedActionTimings=binding.children.map(id=>({definitionId:id,name:generatedActions.children[id].name,...passive.generatedActionTime(id,p.random15??null,p.generatedActionElapsedSeconds??null)}));}
  for(const e of effects){const c=e.reactionChild;if(c?.durationSeconds>0&&!times.some(t=>t.definitionId===c.id))times.push({definitionId:c.id,conditional:true,supported:true,seconds:c.durationSeconds,kind:'反応子の受理1回の持続指定',evidence:['docs/client-numeric-gaps7-20261011.txt'],scope:'最後の反応時刻を仮定せず、親全体の終了時刻には加算しない'});}
  for(const e of effects)for(const [label,c] of [['防御子',e.guardChild],[e.generatedActionBinding?'生成行動':e.kind===9?'領域子':'天候子',e.selectedChild],...(e.additionalChildren||[]).map(c=>[e.generatedActionBinding?'生成行動':'領域子',c])]){
    if(c&&!times.some(t=>t.definitionId===c.id))times.push({definitionId:c.id,conditional:true,supported:c.durationSeconds!==null,seconds:c.durationSeconds,partial:!e.generatedActionBinding&&!e.semanticBinding&&e.kind!==9&&label!=='防御子'&&!(e.kind===121&&e.weatherRequest?.accepted),
    kind:label+'の受理1回の持続指定',evidence:['docs/client-numeric-gaps9-20261011.txt'],scope:c.scope,
    reason:c.durationSeconds===null?(e.generatedActionBinding?'生成行動の持続入力・時間分岐は未確定。使用者の入力を流用せず、親の寿命に足さない':'保持カウンタ0の終了条件が未確定'):undefined});
  }
  let attack=null,attackReason=null;
  if(row.matchStatus==='一致'&&bundle.attack&&bundle.attack.calculationSupported!==false){
   if(p.world!==0)attackReason='既存攻撃式のWar Age分岐は未確認';
   else if(!input.damageContext)attackReason='攻撃力・命中などの攻撃条件を指定してください';
   else {try{
    const c={...input.damageContext,skill:p.skill,magic:p.magic,targetDefense:p.targetDefense,resistance:p.resistance};
    if(input.targetPhysicalReductionId!=null||input.targetMagicReductionId!=null){if(input.targetPhysicalReductionId!=null)c.targetPhysicalReductionId=input.targetPhysicalReductionId;if(input.targetMagicReductionId!=null)c.targetMagicReductionId=input.targetMagicReductionId;c.targetReductionDefinitions=Object.fromEntries(numericalDefinitions.map(d=>[d.id,d]));}
    delete c.combatActionInput;
    if(c.hitContexts)c.hitContexts=c.hitContexts.map(h=>({...h,skill:p.skill,magic:p.magic,targetDefense:p.targetDefense,resistance:p.resistance,combatActionInput:undefined}));
    for(const k of ['attack','hit','defense','evasion','powerMultiplier','specialMultiplier','incoming','targetMultiplier','finalCap'])number(c[k],k,0);
    let entry=bundle.attack;
    if(dualWeaponRoute){const ids=new Set(dualWeaponRoute.definitionIds);entry={...entry,hits:(entry.hits||[entry]).filter(h=>ids.has(h.definition.id)),damageIssues:(entry.damageIssues||[]).filter(v=>v!=='weapon-routing')};c.hitContexts=entry.hits.map(h=>({...dualWeaponRoute.contexts[h.definition.id],skill:p.skill,magic:p.magic,targetDefense:p.targetDefense,resistance:p.resistance,combatActionInput:undefined}));c.hitCount=entry.hits.length;}
    attack=damage.calculate(entry,c);
   }catch(e){attackReason=e.message;}}
  }
  // Saved attack adapters own their verified constituent effects; auxiliary
  // flags do not become additional damage. Preserve unresolved attack issues.
  const owned=new Set([2,12,33,54,64,164,190,205,206,214,239,252,253,254,258,235]);
  if(attack)for(const r of effects)if(r.definitionId===row.internalId&&owned.has(r.kind)&&!r.supported){
   r.coveredByAttack=true;r.category=null;r.reason=attack.partial?'既存攻撃計算は一部のみ。'+attack.damageIssues.join('/') :null;
  }
  for(const r of effects)if(physicalResults.some(v=>v.definitionId===r.definitionId)&&[33,54,64,164,205,214,252,253,254,258].includes(r.kind)&&!r.supported){r.coveredByAttack=true;r.coveredByPhysical=true;r.category=null;r.reason=null;}
  const graph=extensions.conditionalReferences(row.internalId,numericalDefinitions,d=>durationCounter(d,row,p,skillNames),{selfCenterTargetConfirmed:p.referenceSelfCenterTargetConfirmed});
  let referenceLifetime=graph.periodic&&p.periodicReferenceConfirmed===true?extensions.periodicReferenceLifetime(graph,[row.definition,...row.dependencies].filter(Boolean),times,row.internalId):p.referenceChainConfirmed===true&&p.referenceSimultaneous===true?extensions.referenceLifetime(graph,[row.definition,...row.dependencies].filter(Boolean),times,{order:p.referenceReceiptOrder,definitions:bundle.definitions}):{supported:false,seconds:null,reason:graph.periodic?'周期の公称間隔での全要求受理・子寿命完了・競合なしを指定してください':'初回連鎖の同時受理・条件不変を指定してください'};
  const reactionParents=effects.filter(e=>[241,242].includes(e.kind)&&e.reactionChild&&e.definitionId===row.internalId);
  const weather=effects.find(e=>e.kind===121&&e.weatherRequest?.accepted&&e.definitionId===row.internalId);
  if(weather&&Number.isFinite(weather.selectedChild.durationSeconds))referenceLifetime={supported:true,seconds:weather.selectedChild.durationSeconds,weather:true,conditional:true,oneShot:true,scope:'選択した天候子が1回受理され、以後の解除・更新・延長なし。親と子は同じ要求時点を基準。晴は持続Buffを作らず、詠唱・動作時間とは別'};
  if(!graph.supported&&!row.dependencies.length&&reactionParents.length===1&&p.reactionLastAcceptedSeconds!=null){
   const r=reactionParents[0];referenceLifetime=r.reactionRequested===true?extensions.reactionLifetime(times.find(t=>t.definitionId===row.internalId),r.reactionChild,p.reactionLastAcceptedSeconds):{supported:false,seconds:null,reason:'この指定乱数・候補選択では反応子が要求されません。受理時刻の条件と一致しません'};
  }
  let referenceAggregate=null;
  if(graph.supported&&(graph.periodic?p.periodicReferenceConfirmed===true:p.referenceChainConfirmed===true)){
   const grouped=new Map();
   // Original57afc0/560a60 emits initial requests independently of the Buff
   // storage result. Under the explicitly simultaneous, pre-update receipt
   // scenario, only the surviving records can emit subsequent periodic work.
   const stopped=new Set();let conflictCountsKnown=true;
   const groups=new Set();let sharedPersistentGroup=false;
   if(!graph.periodic)for(const d of [row.definition,...row.dependencies].filter(d=>d&&Object.hasOwn(graph.counts,d.id))){
    if(d.group&&(times.find(t=>t.definitionId===d.id)?.seconds>0||d.counter>0||d.fieldC0>0)){if(groups.has(d.group))sharedPersistentGroup=true;groups.add(d.group);}
   }
   if(referenceLifetime.supported&&referenceLifetime.conflictTrace){
    for(const q of referenceLifetime.conflictTrace){if(!q.accepted)stopped.add(q.definitionId);if(q.removedDefinitionId!=null)stopped.add(q.removedDefinitionId);}
   }
   for(const [id,count]of Object.entries(graph.counts)){
    const refresh=graph.refreshes?.find(v=>v.definitionId===+id);
    const physicalResult=physicalResults.find(v=>v.definitionId===+id);
    const quantities=effects.filter(e=>e.definitionId===+id&&e.supported&&e.quantityRole!=='stateAssignment'&&['HP','MP','ST'].includes(e.unit)&&!e.timeOnly&&![45,115,129,251,260,269].includes(e.kind)&&!([3,11,12,170,171,173,180].includes(e.kind)&&e.partial)&&(!refresh||refresh.nonOverlapping||e.modeInfo?.initial&&!e.modeInfo.update));
    for(const q of [...quantities])if([2,3,38].includes(q.kind))for(const [i,sub] of (q.secondaryMessages||[]).entries()){
     const unit={1:'ST',2:'HP',4:'MP'}[sub.messageType],healing=sub.messageType===1?sub.amount>=0:sub.amount<0;
     quantities.push({id:q.id+':source'+i,recipient:sub.recipient==='caster'?'使用者':sub.recipient,name:unit+(healing?'回復量':'ダメージ'),unit,value:Math.abs(sub.amount),count:q.count||1,total:sub.total,initialValue:sub.initialValue,modeInfo:q.modeInfo});
    }
    if(physicalResult){
     quantities.push({id:id+':physical',name:'HPダメージ',recipient:graph.edges.find(e=>e.to===+id)?.targetRole||'指定対象',unit:'HP',value:physicalResult.value,independentInitial:true});
     for(const [i,sub] of physicalResult.secondaryMessages.entries())quantities.push({id:id+':physical-source'+i,name:({1:'ST',2:'HP',4:'MP'}[sub.messageType])+'回復量',recipient:'使用者',unit:{1:'ST',2:'HP',4:'MP'}[sub.messageType],value:Math.abs(sub.amount),independentInitial:true});
    }
    for(const original of quantities){let q=original;
     if(stopped.has(+id)&&!q.independentInitial){
      if(!q.modeInfo)conflictCountsKnown=false;
      else {const initialCount=q.modeInfo.initial?1:0,initialValue=q.initialValue??q.value;
       q={...q,count:initialCount,total:initialCount*initialValue,effectiveInitialCount:initialCount,effectivePeriodicCount:0};}
     }
     const key=q.recipient+'|'+q.name+'|'+q.unit;
     if(!grouped.has(key))grouped.set(key,{recipient:q.recipient,name:q.name,unit:q.unit,value:0,parts:[]});
     const sum=grouped.get(key),perAction=q.count??1,requests=count*perAction;sum.value+=(q.total??q.value*perAction)*count;sum.parts.push({id:q.id,value:q.value,count:requests,actionCount:count,requestsPerAction:perAction,totalPerAction:q.total??null,initialValue:q.initialValue??null,...(q.effectivePeriodicCount===0?{effectiveInitialCount:q.effectiveInitialCount,effectivePeriodicCount:0,stoppedBeforePeriodic:true}:{})});
    }
   }
   for(const edge of graph.edges){const r=effects.find(e=>e.id===edge.id);if(r){r.resolved=true;r.nonNumerical=true;r.meaning='子行動 '+edge.to+' を親1使用あたり'+edge.countPerParent+'回要求。'+(edge.kind===133?'自己保持・全周期成立':'初回mode7')+'の指定条件';r.reason=null;r.evidence=['docs/client-numeric-gaps2-20261011.txt'];}}
   referenceAggregate={scope:(graph.periodic?'自己保持の周期が中断・更新・解除なく成立。公称間隔どおりに成立する条件付き合計で、自動発動を保証する総量ではない。':'初回の参照要求が成立。')+'各要求が同じ指定対象へ成立し、入力が途中で変化しない条件。各行動は独立に同じ指定種値で計算。平均値ではない。'+graph.scope,counts:graph.counts,totals:[...grouped.values()],refreshes:graph.refreshes||[],partial:!!graph.refreshes?.some(v=>!v.nonOverlapping)||effects.some(e=>!e.supported&&!e.coveredByAttack&&!e.resolved||e.partial)};
   if(referenceLifetime.conflictTrace?.some(q=>!q.accepted||q.removedDefinitionId!=null)){
    referenceAggregate.conflictUnresolved=!conflictCountsKnown;
    referenceAggregate.effectiveConflictCounts=conflictCountsKnown;
    referenceAggregate.stoppedBeforePeriodic=[...stopped];
    referenceAggregate.partial=referenceAggregate.partial||!conflictCountsKnown;
    referenceAggregate.scope+=conflictCountsKnown?' 初回要求は保存拒否・解除とは独立に発行する。指定した同時受理順で最初の周期更新より前に解除/拒否された保持効果は、初回分だけを残し、以後の周期要求を加算しない。残る保持効果の全周期成立を条件とした要求量。受信後の実HP増減・実際の自動発動総量ではない。':' 参照内の競合による初回/周期の有効数が未確定。各定義の単独小計。';
   }else if(sharedPersistentGroup&&!referenceLifetime.conflictTrace){
    referenceAggregate.partial=true;referenceAggregate.conflictUnresolved=true;
    referenceAggregate.scope+=' 同じ競合グループがあります。受理順・周期前の同時受理条件が未指定、または保持終了の入力が不足するため、以下は各定義が単独で成立した量の小計です。競合後の要求合計は未計算。';
   }
  }
  // A replay is an independently calculated, accepted request, never a sum
  // with the incoming damage or an automatic repeated reflection.
  if(input.guardReplayUnmodified===true)for(const r of effects){
   const rule=extensions.guardInputs.guards[r.definitionId];
   if(r.kind!==115||!rule||r.index!==rule.rows[0].index||rule.selector!==4||!(rule.mask&4)||r.guardCondition?.incoming.actionType!==1)continue;
   try{
    const gate=r.guard?.magic||effects.find(q=>q.definitionId===r.definitionId&&q.kind===53)?.guard?.magic;
    if(!gate?.supported)throw Error(gate?.reason||'魔法反射の防御抽選に必要な条件が不足しています');
    if(!gate.passed){r.magicReplay={supported:true,emitted:false,evidence:guardReplay.evidence,scope:'指定した防御条件では反射要求を作らない。未計算の効果量を0で代用していない'};continue;}
    const q=guardReplay.magicInput(r.guardCondition.incoming.id,p),d=q.definition;
    const reflected=number(input.guardReplayResistance,'反射先（元の魔法使用者）の属性耐性',0),defense=number(input.guardReplayDefense,'反射先（元の魔法使用者）の防御力',0);
    const replay=evaluate({row:{key:'magic-replay:'+d.id,name:d.name,internalId:d.id,matchStatus:'一致',definition:d,dependencies:[]},numericReferences:{}},
     {skill:q.skill,magic:q.magic,world:p.world,seed:q.seed,random15:p.random15,resistance:reflected,targetDefense:defense,targetAmplificationAllowed:true,
      casterElementStrengthPct:0,replayedMagicInput:{id:d.id,x:q.x,y:q.y},timePeriod:p.timePeriod,
      interruptCondition:p.interruptCondition,interruptNpcProfile:p.interruptNpcProfile,interruptNpcLevel:p.interruptNpcLevel,interruptNpcRandom15:p.interruptNpcRandom15,
      singlePositiveUpdateConfirmed:p.singlePositiveUpdateConfirmed,fixedUpdateElapsed:p.fixedUpdateElapsed},skillNames);
    r.magicReplay={supported:true,emitted:true,id:d.id,name:d.name,x:q.x,y:q.y,seed:q.seed,effects:replay.effects,times:replay.times,pending:replay.pending,scope:q.scope,evidence:q.evidence};
   }catch(error){r.magicReplay={supported:false,value:null,reason:error.message,evidence:guardReplay.evidence};}
  }
  if(input.guardAmmoCondition===true)for(const r of effects){
   const rule=extensions.guardInputs.guards[r.definitionId];
   if(r.kind!==115||rule?.selector!==5||r.index!==rule.rows[0].index||r.guardCondition?.incoming.actionType!==2)continue;
   try{r.ammunitionRecovery=r.guardCondition.accepted?guardReplay.ammunition(r.guardCondition.incoming.id,p):{supported:true,requested:false,count:0,reason:'防御受付条件が成立しないため弾の取得要求なし'};}
   catch(error){r.ammunitionRecovery={supported:false,count:null,reason:error.message};}
  }
  for(const r of effects)if(r.magicReplay){
   r.partial=true;
   if(r.magicReplay.supported){r.reason=null;r.remaining=r.magicReplay.emitted?'元入力を保持した反射1要求の量・時間は別表示。実際の反射受理/再反射・全期間の自動総量とHP保存は別。'+(r.magicReplay.pending.length?'反射魔法の一部作用には残件あり':''):'指定した防御条件では反射要求なし。別条件での量や実受理は別';}
   else r.reason=r.magicReplay.reason;
  }
  const header=headerAction(row);
  if(header){
   const selected=header.children.includes(p.areaBuffChoice)?p.areaBuffChoice:null;
   const binding={kind:null,children:selected?[selected]:[],semanticSource:true,semanticBinding:header,recipient:'同じ所有者・同種類の種の作用を受ける対象'};
   const children=selected?generatedActionChildren(binding,p,row,skillNames,math):[];
   effects.push({id:row.key+':seed-trigger',definitionId:row.internalId,index:null,kind:null,name:'設置済みの種の起動',value:null,supported:false,resolved:!!selected,nonNumerical:true,partial:true,conditional:false,
    semanticHeaderBinding:header,generatedActionBinding:binding,areaBindingConfirmed:!!selected,selectedChild:children[0],additionalChildren:[],
    reason:selected?null:'起動する種の種類を選択してください。種自身の現在技能と発動本数は使用者の値から推測しません',category:selected?null:'入力不足',meaning:header.meaning,evidence:[header.evidence],remaining:header.scope});
   for(const c of children)times.push({definitionId:c.id,name:c.name,supported:Number.isFinite(c.durationSeconds),seconds:c.durationSeconds,conditional:true,reason:c.durationReason,kind:'起動した種の1作用の保持指定（本体動作とは別）'});
   if(children.length&&children.every(c=>Number.isFinite(c.durationSeconds))){const t=times.find(t=>t.definitionId===row.internalId);if(t?.supported){t.partial=false;t.kind='起動本体の保持指定（罠の保持・実発動間隔とは別）';t.reason='子の数量・保持は別表示。95/60秒は罠の寿命や次回発動待ちを示す値ではない';}}
  }
  const pending=effects.filter(e=>!e.supported&&!e.coveredByAttack&&!e.resolved||e.partial);
  if(referenceAggregate?.conflictUnresolved&&referenceAggregate.totals.length)pending.push({id:row.key+':reference-effective-total',kind:86,category:'不足する式・仕様',
   reason:'初回要求が保存結果とは独立する処理は確認済み。競合後の周期数には、最初の周期更新より前の同時受理・受理順と確定した保持終了が必要。未指定の場合は単独小計だけを表示し、有効合計を0や計算済みにしない'});
  for(const parent of effects)if(parent.bladeFollowup){const c=parent.bladeFollowup;
   for(const t of c.times)times.push({...t,conditional:true,viaBlade:parent.id,kind:'追撃1機会 / '+(t.kind||'時間未確定')});
   for(const child of c.pending)pending.push({...child,id:parent.id+':blade:'+child.id,viaParent:parent.id,reason:'追撃 '+c.name+'：'+(child.reason||child.remaining||'作用が未確定')});
  }
  for(const parent of effects)for(const child of parent.reactionChild?.effects||[]){
   if(!child.supported&&!child.resolved||child.partial)pending.push({...child,id:parent.id+':reaction:'+child.id,viaReaction:parent.id,
    reason:'反応子 '+parent.reactionChild.name+'：'+(child.reason||child.remaining||'作用が未確定')});
  }
  for(const parent of effects)for(const [via,label,nested] of [['guard','防御子',parent.guardChild],['weather',parent.generatedActionBinding?'生成行動':'天候子',parent.selectedChild],...(parent.additionalChildren||[]).map(c=>['area',parent.generatedActionBinding?'生成行動':'領域子',c])])for(const child of nested?.effects||[]){
   if(!child.supported&&!child.resolved||child.partial)pending.push({...child,id:parent.id+':'+via+':'+child.id,viaParent:parent.id,
   reason:(parent.generatedActionBinding?'生成行動':parent.kind===9?'領域子':label)+' '+nested.name+'：'+(child.reason||child.remaining||'作用が未確定')});
  }
  const assignments=effects.filter(e=>e.kind===129&&e.supported);
  if(referenceAggregate&&assignments.some(e=>graph.counts[e.definitionId]>1)||referenceAggregate&&assignments.length>1){
   referenceAggregate.partial=true;
   pending.push({kind:129,category:'不足する式・仕様',reason:'HP指定要求は1回の現在HPとの差を計算済み。参照反復の各受信時HP・増幅/軽減後の状態遷移がないため親の総量へ加算しない'});
  }
  for(const refreshed of referenceAggregate?.refreshes||[]){
   if(!refreshed.nonOverlapping&&effects.some(e=>e.definitionId===refreshed.definitionId&&e.supported&&['HP','MP','ST'].includes(e.unit)&&!(e.modeInfo?.initial&&!e.modeInfo.update)))
    pending.push({id:refreshed.definitionId+':refresh-total',definitionId:refreshed.definitionId,kind:133,category:'不足する式・仕様',reason:'持続子の単発量は計算済み。同使用者の更新は重ねず時間/周期蓄積をリセットするため、更新間に実行される有効周期数と親の総量は未確定'});
  }
  if(attack?.partial)pending.push({id:row.key,category:'不足する式・仕様',reason:'既存攻撃の未確定部分：'+attack.damageIssues.join(' / ')});
  if(!effects.length&&!physicalResults.length)pending.push({id:row.key,category:row.definition?'不足する式・仕様':'照合未確定',reason:row.definition?'効果行なし。動作ヘッダと数量作用の対応が未確定':row.matchStatus});
  const rangeProjection=[];
  for(const [kind,base]of [[245,input.areaRadiusBase],[248,input.rangedRangeBase]]){
   const addition=rangeBuffs.collect(input.activeRangeRecords||[],kind);
   if(addition!==0){try{rangeProjection.push({kind,...rangeBuffs.project(base,addition,kind)});}catch(error){rangeProjection.push({kind,addition,after:null,reason:error.message});}}
  }
  const receivedRule=receivedDefinitionRule(row),receivedChoice=receivedRule?.choices.find(c=>c.id===p.areaBuffChoice);
  const receivedDefinition=receivedRule?{supported:!!receivedChoice,id:receivedChoice?.id,name:receivedChoice?.name,
   effects:receivedChoice?effects.filter(e=>e.definitionId===receivedChoice.id):[],
   time:receivedChoice?times.find(t=>t.definitionId===receivedChoice.id):null,
   reason:receivedChoice?null:'実際に受理された段階を選択してください。参加人数から段階を推測しません。',
   scope:receivedRule.scope,evidence:receivedRule.evidence}:null;
  if(receivedDefinition?.time?.supported)receivedDefinition.time={...receivedDefinition.time,partial:false,kind:'選択段階の受理1回の保持指定',reason:'同時受理・共有終了・次段階への自動移行は別。選択した定義の単独保持を計算。'};
  const requestTotals=input.generatedRequestCounts?generatedRequestTotals.calculate(effects.filter(e=>!e.generatedActionBinding?.candidateOnly),{counts:input.generatedRequestCounts,completeNonOverlapping:input.generatedRequestsNonOverlapping===true}):null;
  if(requestTotals)for(const e of effects.filter(e=>e.generatedActionBinding?.candidateOnly))for(const c of [e.selectedChild,...e.additionalChildren||[]].filter(Boolean))if(input.generatedRequestCounts[c.id]!=null){requestTotals.missing.push({id:c.id,name:c.name,reason:'親とのID結合が未照合の候補です。親の要求合計へ加算しません。'});requestTotals.partial=true;}
  return {key:row.key,name:row.name,effects,times,physicalResults,constructorErrors:p.constructorErrors,attack,attackReason,pending,controls:p,referenceAggregate,referenceGraph:graph,referenceLifetime,rangeProjection,dualWeaponRoute,dualWeaponReason,guardWindows,receivedDefinition,
   rootNumericCount:effects.filter(e=>!e.conditional&&e.supported&&!e.timeOnly).length,
   childNumericCount:effects.reduce((n,e)=>n+(e.magicReplay?.emitted?e.magicReplay.effects.filter(q=>q.supported&&!q.timeOnly).length:0),0)+effects.reduce((n,e)=>n+[e.selectedChild,...e.additionalChildren||[]].filter(c=>c?.physicalResult?.supported).length,0)+effects.filter(e=>e.conditional&&e.supported&&!e.timeOnly).length+effects.flatMap(e=>[...(e.guardChild?.effects||[]),...(e.selectedChild?.effects||[]),...(e.reactionChild?.effects||[]),...(e.additionalChildren||[]).flatMap(c=>c.effects)]).filter(e=>e.supported&&!e.timeOnly).length+effects.reduce((n,e)=>n+(e.bladeFollowup?.numericCount||0),0),
   generatedAbilityCount:effects.reduce((n,e)=>n+(e.summonAbilities?.values?.length||0),0),
   numericalScope:'指定条件で効果が成立した場合の要求量。HP残量による実回復上限・成否・待ち時間は別',fullSimulation:false,...(requestTotals?{generatedRequestTotals:requestTotals}:{})};
 }
 function conditionalInputKinds(bundle){
  const definitions=[bundle.row.definition,...bundle.row.dependencies].filter(Boolean),children=[];
  for(const d of definitions)for(const child of wikiHints.data.areaCandidates?.[d.id]?.children||[])children.push(child);
  for(const d of definitions){const guard=extensions.guardChildren.children[extensions.guardInputs.guards[d.id]?.child];if(guard)children.push(guard);
   for(const e of d.effects)if([241,242].includes(e.kind)&&extensions.reactionDefs[e.selector])children.push(extensions.reactionDefs[e.selector]);}
  return new Set([...definitions,...children].flatMap(d=>d.effects.map(e=>e.kind)));
 }
 function areaBuffOptions(bundle){const received=receivedDefinitionRule(bundle.row);if(received)return received.choices.map(c=>({id:c.id,name:c.name+'（受理済みの段階）'}));const h=headerAction(bundle.row);if(h)return h.children.map(id=>({id,name:generatedActions.children[id].name}));const c=wikiHints.data.areaCandidates?.[bundle.row.internalId];if(c?.choice)return c.children.map(d=>({id:d.id,name:d.name}));const b=bundle.row.definition?.effects.map(e=>generatedActions.bindings[bundle.row.internalId+':'+e.index]).find(b=>b?.choice);return b?b.children.map(id=>({id,name:(b.candidateOnly?'候補・親未照合 ID'+id+' / ':'')+generatedActions.children[id].name})):[];}
 const api=Object.freeze({evaluate,channels,independentInput,duration,conditionalInputKinds,areaBuffOptions,proof,generatedInputChildren:bundle=>{const h=headerAction(bundle.row);return h?h.children.map(id=>generatedActions.children[id]):generatedInput.children(bundle);},generatedInputNeedsSkill:generatedInput.needsSkill,targetReductionEligibility:targetReduction.eligibility,targetPhysicalReductions:targetReduction.definitions,targetMagicReductions:targetReduction.magicDefinitions,wikiNotes:wikiHints.data.notes,bladeInputs:blades.inputs,guardIncomingActions:extensions.guardInputs.incoming,guardMagicInputs:extensions.magicGuardInputs,guardShields:extensions.shieldDefs.shields,magicRanges:casting.ranges,craftingSelectors:crafting.selectors,craftingSpeedSelectors:crafting.speedSelectors,npcInterruptionProfiles:common?require('../data/generated/combatNpcInterruptionProfiles.generated.js').profiles:root.MOE_COMBAT_NPC_INTERRUPTION_PROFILES?.profiles,replacementOptions:common?require('../data/generated/combatReplacementRules.generated.js').definitions:root.MOE_COMBAT_REPLACEMENT_RULES?.definitions});
 if(common)module.exports=api;else root.MOE_COMBAT_NUMERICS=api;
})(globalThis);
