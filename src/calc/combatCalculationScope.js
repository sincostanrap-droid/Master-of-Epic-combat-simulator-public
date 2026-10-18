// User scope, 2026-10-12: summoning/gestures are described, not simulated.
// Keep the numerical research intact; this layer never invents a value or ID.
(function(root){'use strict';
 const guardInputs=typeof module!=='undefined'&&module.exports?require('../data/generated/combatGuardInputs.generated.js'):root.MOE_COMBAT_GUARD_INPUTS;
 const reflections=typeof module!=='undefined'&&module.exports?require('../data/generated/combatReflectionReference.generated.js'):root.MOE_COMBAT_REFLECTION_REFERENCE;
 const shields=typeof module!=='undefined'&&module.exports?require('../data/generated/combatShieldReference.generated.js'):root.MOE_COMBAT_SHIELD_REFERENCE;
 const presentation=typeof module!=='undefined'&&module.exports?require('../data/generated/combatPresentationScope.generated.js'):root.MOE_COMBAT_PRESENTATION_SCOPE;
 const utility=typeof module!=='undefined'&&module.exports?require('../data/manual/utilityDescriptionScope.manual.js'):root.MOE_UTILITY_DESCRIPTION_SCOPE;
 const summoning=new Set([8,9,89,94,169]);
 const motion=new Set([97,98,99,100,117,118,119,138,228,229]);
 const visual=new Set([76,215,225]);
 // Reviewed saved descriptions and empty action-effect rows. Resurrection,
 // healing, motion-with-stat-changes and unknown handlers are NOT in this list.
 const gestures=new Set([6281,6313,6378,6405,6408,6487,6568,6678,6899,7258,7299,7469,9659,10565,10866,11407,11573,12524,12702,13796,5824,7811,7813,7812,5975,12435,7083,8830,8831,8832,9963,10372,5987,1054,1370,12244,837,1055,606,1056,1057,662,1058,1059,649,1064,1060,840,893,894,1061,1065,664,1062,1066,514,1063,1067]);
 // These create an attack/area/obstacle through the entity handler. Do not
 // erase their damage/Buff requirements merely because the handler is shared.
 const generatedCombat=new Set([7913,8437,8635,8782,9768,10572,13571,3743,4571,4675,8006,187,3644,3962,6202,6773,7146,8124,8636,8825,9507,9649,9996,9967,10264,10265,10568,11647,12564,13123,13431,13687,13911,14093,14303,14349,5825,5829,6778,8429,8430,8431,8428,9213,9280,10428,10517,11582,12001,12159,12161,13479,13966,5568,4784,10641,10975]);
 // Saved wiki names a summoned object; the player definition has only
 // summon/relationship rows and no separate attack/Buff calculation. The
 // user's summon-description scope also excludes that object's own actions.
 const describedSummonObjects=new Set([7913,8635,7146,11647,393]);
 const wikiSummons=new Set(['magic:サモンハラペコクマ','physical:フリーマーケット','physical:プレゼントボックス','physical:こいのぼり','physical:ハイアーボディーガード']);
 const label='説明対応（数値計算不要）';
 // Reviewed native paths already define these non-quantity operations. Their
 // lifecycle/receiver gaps remain recorded without blocking other numbers.
 const stateOnlySemantics=new Set([10,15,16,22,25,48,26,66,29,56,105,126,174,243,202,203,238,264,272]);
 const independentRequests=new Set([23,43,44,80,92,93,113,200,201,260,269]);
 // Numerical completion is about a declared request, not about replaying the
 // game's state machine. Each certificate below checks computed data and the
 // proved input route; a kind number or a finite local helper alone is not proof.
 function requestBoundary(e,result,optional=new Set(),visiting=new Set()){
  e=result.effects.find(q=>q.id===e.id)||e;
  if(e.conditionalEligibility||visiting.has(e.id))return null;
  const finite=Number.isFinite;
  const childKnown=c=>!!c&&c.effects.length>0&&c.effects.every(known)&&(!c.physicalResult||c.physicalResult.supported===true);
  const known=q=>optional.has(q.id)||q.coveredByAttack===true||
   (!q.partial&&(q.resolved===true||q.supported===true))||deferredStateEffect(q)||!!requestBoundary(q,result,optional,new Set([...visiting,e.id]));
  const certificate=(mode,conditions,remaining)=>({mode,conditions,remaining,evidence:e.evidence||[],scope:'条件を指定した成立1回の数量。状態適用・自動回数・全期間の総量は別'});
  if(e.kind===34&&e.userReferenceOnly?.kind===34&&e.userReferenceOnly.meaningUnknown===true&&Number.isFinite(e.diagnostic?.value))
   return {...certificate('user-reference-only',e.userReferenceOnly.basis,'設定値の意味・単位・射程への換算は未解明。作用なしや数値0、解析完了とはしない'),scope:'ユーザー指定の参考表示。数量式の実装や作用の解明とは区別'};
  if(e.kind===123&&e.supported===true&&finite(e.value)&&finite(e.requestGate?.uniformPercent)&&e.interruption?.supported===true&&finite(e.interruption.percent))
   return certificate('interruption-request','対象の動作状態・NPCの抵抗条件・指定乱数','各要求時の状態と実際の中断回数・全期間の率。NPCの別乱数の結合分布が不明な枝は別途未対応');
  if(e.kind===79&&e.supported===true&&e.restoration?.consumerProved===true&&finite(e.restoration.assigned)&&finite(e.restoration.percent)&&finite(e.restoration.interruption?.uniformPercent))
   return certificate('revival-assignment','蘇生処理が受理される条件・使用者の最大HP','死亡からの復帰状態、保持子の実中断回数・HP保存。保持時間を復活待ち時間に読み替えない');
  if((e.kind===28&&e.selector===10||e.kind===210)&&e.supported===true&&finite(e.value)&&e.petRestoration?.consumerProved===true&&e.petRestoration.consumer==='0x793b70'&&e.petRestoration.accepted===true&&e.petRestoration.hp===1&&e.petRestoration.mp===0)
   return certificate('pet-revival-assignment','管理枠1〜3の有効な死亡ペットへの蘇生受理・現在レベル','HP/MPの実保存、成功判定、道具・装備耐久消費。HP1/MP0は設定指定であり加算回復量ではない');
  if(e.kind===45&&e.supported===true&&finite(e.carnivalDamage?.amount))
   return certificate('carnival-hit','対応する近接武器・PC/NPC・命中済み・追加防御なし・外部倍率','発動済みbitの更新と解除、全期間の実攻撃回数。指定回数の条件付き合計は自動総量と別');
  if(e.kind===86&&e.supported===true&&e.unit==='HP'&&finite(e.value)&&e.reverseReferencePower?.supported===true&&e.reverseReferencePower.normalPcDamage?.supported===true)
   return certificate('reversed-hit','攻撃元のPC/NPC・装備と現在技能/能力・対象の防御力・命中条件・追加補正なし','実際の反撃選択・受理、追加Buffのある枝、全期間の自動回数');
  if(e.kind===115&&e.supported===true&&finite(e.value)&&e.guardRule&&e.guardCondition?.accepted===true){
   // Some115 rows only dispatch a fixed-input child; the independent53 row,
   // if present, remains responsible for the numerical reduction. A known
   // child request need not fabricate a second shield calculation here.
   if(e.timeOnly===true&&childKnown(e.guardChild)&&finite(e.guardChild.durationSeconds))
    return certificate('guard-child','適合する攻撃・受付内・追加作用成立・子Buffの受理','追加作用の実発動・競合/更新と終了、自動発動回数。独立した防御効果は別行で計算');
   const q=e.guard,magic=q?.magic;
   const base=magic?magic.supported===true&&magic.eligible===true&&finite(magic.before)&&finite(magic.remaining):finite(q?.outcome?.blocked)&&finite(q?.outcome?.remaining);
   const selector=e.guardRule.selector;
   const extra=selector===0||[1,2,6,7,8].includes(selector)&&childKnown(e.guardChild)&&finite(e.guardChild.durationSeconds)||
    [3,4].includes(selector)&&e.guardFeedback?.supported===true&&finite(e.guardFeedback.amount)||
    selector===4&&magic?.supported===true||
    selector===5&&e.guardFeedback?.supported===true&&finite(e.guardFeedback.amount)&&(!(e.guardRule.mask&2)||e.ammunitionRecovery?.supported===true&&finite(e.ammunitionRecovery.count));
   if(base&&extra)return certificate('guard-request','選択した盾・盾技能・受付時間内・装備消費可・相手の技と指定種値','装備の消費後状態、実受理/競合/上書き、連続防御と自動総量。反射は説明対応の範囲を維持');
  }
  if((summoning.has(e.kind)||e.semanticHeaderBinding?.kind==='planted-seed-trigger')&&(e.supported===true||e.resolved===true&&e.generatedActionBinding?.semanticSource)&&e.areaBindingConfirmed===true&&e.generatedActionBinding?.children.length){
   const children=[e.selectedChild,...e.additionalChildren||[]].filter(Boolean);
   if(children.length===1&&children[0].inputCondition?.observedReceipt?.adoptedByUser&&children.every(c=>!c.inputReason&&childKnown(c)))
    return certificate('user-adopted-receipt',children[0].inputCondition.observedReceipt.scope,'実際の再付与・解除・回復上限・総量。秒換算は推定。ユーザー指定の計算モデルと個別実測を区別する');
   if(children.length===1&&children[0].inputCondition?.observedReceipt&&children.every(c=>!c.inputReason&&childKnown(c)))
    return certificate('observed-receipt',children[0].inputCondition.observedReceipt.scope,'未観測の付与条件の倍率・加算、別種の設置物、実際の再付与・解除・総量。今回の記録を一般式にはしない');
   if(children.length===e.generatedActionBinding.children.length&&children.every((c,i)=>c.id===e.generatedActionBinding.children[i]&&!c.inputReason&&childKnown(c)))
    return certificate('generated-action',(e.generatedActionBinding.recipient?'対象：'+e.generatedActionBinding.recipient+'。':'')+'表示した生成物と行動・生成物自身の現在技能/能力・追加補正なし・命中/受理済み','実際の生成能力、AIの行動選択/頻度、自動回数と親の総量。生成レベルを攻撃力へ代用しない');
  }
  if(summoning.has(e.kind)&&e.resolved===true&&e.areaBindingConfirmed===true&&e.semanticBinding?.bindingBasis==='wiki-client-semantic'){
   const children=[e.selectedChild,...e.additionalChildren||[]].filter(Boolean);
   if(children.length===e.semanticBinding.childIds.length&&children.every((c,i)=>c.id===e.semanticBinding.childIds[i]&&Number.isFinite(c.durationSeconds)&&childKnown(c)))
    return certificate('wiki-bound-area-effect','対象：'+children[0].recipient+'。表示した領域の作用が対象へ成立・各行の地域/対象条件・指定入力','内部の子ID発行命令、実際の再付与/更新・途中解除、自動回数と親全体の総量。wikiの意味照合と元命令の証明は区別');
  }
  if([86,133].includes(e.kind)&&result.referenceGraph?.supported===true){
   const edge=result.referenceGraph.edges.find(v=>v.id===e.id),children=edge&&result.effects.filter(v=>v.definitionId===edge.to);
   if(edge&&Number.isInteger(edge.countPerParent)&&edge.countPerParent>=0&&children.length&&!result.constructorErrors?.[edge.to]&&children.every(known))
    return certificate('referenced-request','表示した参照先・各参照先の入力条件・受理済み','実対象の選択・参照先の受理/更新と終了、全期間の自動総量。各子の既知量を別表示');
  }
  return null;
 }
 function deferredStateEffect(e){
  if(!e.partial||e.conditionalEligibility)return false;
  if(e.kind===104)return e.resolved===true&&e.nonNumerical===true&&e.motionReference?.namespaceProved===true&&e.motionReference.scalarHandlerRegistered===false;
  if(motion.has(e.kind))return e.resolved===true&&e.nonNumerical===true&&e.evidence?.includes('docs/client-numeric-gaps9-20261011.txt');
  if(stateOnlySemantics.has(e.kind))return e.resolved===true&&e.nonNumerical===true;
  if(e.kind===116)return e.resolved===true&&e.nonNumerical===true&&e.equipmentRestriction?.queryReturnsRestricted===true;
  if(e.kind===137)return e.resolved===true&&e.nonNumerical===true&&e.itemUseRestriction?.consumerProved===true&&e.itemUseRestriction.quantity===false;
  if(e.kind===183)return e.resolved===true&&e.nonNumerical===true&&e.queuedMovementMarker?.lookupProved===true;
  if(e.kind===208)return e.resolved===true&&e.nonNumerical===true&&e.recognitionRule?.consumerProved===true&&e.recognitionRule.consumer==='0x7abd20';
  if(e.kind===127)return e.supported===true&&Number.isFinite(e.value)&&e.visualFog?.consumerProved===true;
  if(e.kind===46)return e.resolved===true&&e.nonNumerical===true&&e.recoverySuppression?.consumerProved===true;
  if(e.kind===28&&e.selector===7)return e.resolved===true&&e.nonNumerical===true&&e.petCommand?.consumerProved===true&&e.petCommand.petAttackQuantityKnown===false;
  if(e.kind===191)return e.resolved===true&&e.nonNumerical===true&&e.equipmentCurse?.consumerProved===true;
  if(e.kind===74)return e.resolved===true&&e.nonNumerical===true&&e.trapRemoval?.consumerProved===true;
  if(e.kind===193)return e.resolved===true&&e.nonNumerical===true&&e.trapSuppression?.consumerProved===true&&e.trapSuppression.quantity===false;
  if(e.kind===65)return e.resolved===true&&e.nonNumerical===true&&e.lightSetting?.adoptionProved===true&&!e.lightSetting.skillSelectionUnresolved;
  if(e.kind===106)return e.resolved===true&&e.nonNumerical===true&&e.petCage?.consumerProved===true&&e.petCage.recordBytes===22;
  if(e.kind===41&&e.selector===72)return e.supported===true&&Number.isFinite(e.value)&&e.dirt?.consumerProved===true;
  if(e.kind===149)return e.supported===true&&Number.isFinite(e.value)&&e.petExperience?.consumerProved===true;
  if([67,81,90,168,265].includes(e.kind))return e.resolved===true&&e.nonNumerical===true&&e.requestOperation?.consumerProved===true&&e.requestOperation.quantity===false;
  if([77,218].includes(e.kind))return e.resolved===true&&e.nonNumerical===true&&e.appearanceOperation?.consumerProved===true&&e.appearanceOperation.quantity===false;
  // The copied values are existing target state, not invented coefficients.
  // Only a supplied and validated direct-copy projection can defer lifecycle.
  if(e.kind===177)return e.supported===true&&e.transferredRecords?.directRecordCopy===true&&e.transferredRecords.preservesOriginalQuantity===true&&e.transferredRecords.preservesRemainingTime===true&&!e.transferCopyReason;
  if(e.kind===128)return e.resolved===true&&e.nonNumerical===true;
  if(e.kind===111)return e.resolved===true&&e.nonNumerical===true&&e.replacementOperation?.consumerProved===true&&e.replacementOperation.quantity===false;
  if(e.kind===121)return e.resolved===true&&e.nonNumerical===true&&e.weatherRequest?.consumerProved===true&&e.weatherRequest.accepted===true&&e.weatherRequest.count===1&&Number.isFinite(e.selectedChild?.durationSeconds);
  if(e.kind===172&&[5,6].includes(e.selector))return e.resolved===true&&e.nonNumerical===true;
  if(e.kind===178)return e.supported===true&&Number.isFinite(e.value)&&e.actionWait?.consumerProved===true;
  if(e.kind===207)return e.resolved===true&&e.nonNumerical===true&&e.facingRequirement?.consumerProved===true;
  if([136,165].includes(e.kind))return e.resolved===true&&e.nonNumerical===true&&e.actionRestriction?.consumerProved===true;
  // The user explicitly accepted an estimated rate per minute. Exact clocks
  // and automatic lifetime integrals must not turn that rate into missing data.
  if(e.kind===13)return e.supported===true&&e.estimated===true&&Number.isFinite(e.value)&&!!e.naturalRecovery?.calibration;
  if([95,96].includes(e.kind))return e.supported===true&&Number.isFinite(e.value)&&!!e.lifetimeModifier;
  // User scope: raw movement numbers need no invented physical unit. This
  // does not resolve unknown eligibility, collisions or repeated impulses.
  if([31,57,78,130].includes(e.kind))return e.supported===true&&e.movement?.rawUnitless===true&&Number.isFinite(e.movement.initialMagnitude)&&Number.isFinite(e.movement.totalMagnitude);
  // Confirmed conditional movement numbers do not require a final world
  // coordinate or an unknown seconds-per-update conversion. Missing relative
  // height still blocks the floating update; its boundary alone is not enough.
  if(e.kind===114)return e.supported===true&&Number.isFinite(e.value)&&Number.isFinite(e.fallResult?.after)&&Number.isFinite(e.fallResult?.limit);
  if(e.kind===184)return e.supported===true&&Number.isFinite(e.value)&&(e.active===false||Number.isFinite(e.launch?.initial)&&Number.isFinite(e.launch?.after));
  if(e.kind===87)return e.supported===true&&Number.isFinite(e.value)&&(e.active===false||Number.isFinite(e.floating?.increment));
  if(e.kind===59)return e.supported===true&&Number.isFinite(e.value)&&e.movementMode?.runtime===2000&&(e.active===false||Number.isFinite(e.floating?.increment));
  if(e.kind===142)return e.supported===true&&Number.isFinite(e.sinking?.combined)&&Number.isFinite(e.sinking?.velocity);
  // Original non-shield, equipped-shield skill routing and magic +64 gate are
  // now proved. Explicit window/consumption conditions replace runtime state;
  // an absent damage/input or unknown branch still blocks numerical completion.
  if(e.kind===53&&e.supported===true&&e.guard?.numericInputPathsKnown){
   const q=e.guard;
   return q.magic? q.magic.supported===true&&q.magic.eligible===true&&Number.isFinite(q.magic.before)&&Number.isFinite(q.magic.remaining):Number.isFinite(q.outcome?.blocked)&&Number.isFinite(q.outcome?.remaining);
  }
  // These quantities are independent of later state storage/selection. Do not
  // defer unproved guard branches, summoned attacks or unknown model effects.
  if([124,213,250,251].includes(e.kind))return e.supported===true&&Number.isFinite(e.value);
  if([241,242].includes(e.kind))return e.supported===true&&Number.isFinite(e.value)&&!!e.reactionChild;
  if(e.kind===101)return e.supported===true&&Number.isFinite(e.value)&&!!e.castingMovement;
  if(e.kind===107)return e.supported===true&&Number.isFinite(e.value)&&!!e.perception;
  if(e.kind===195)return e.supported===true&&Number.isFinite(e.value)&&!!e.jump&&Number.isFinite(e.jump.multiplier);
  if(e.kind===125)return e.supported===true&&Number.isFinite(e.value)&&Number.isFinite(e.itemDelay?.multiplier)&&!e.conditionalEligibility;
  if(e.kind===72)return e.supported===true&&Number.isFinite(e.value)&&e.weaponWearCacheProved===true&&!e.conditionalEligibility;
  if(e.kind===47)return e.supported===true&&Number.isFinite(e.value)&&Number.isFinite(e.buffReflection?.reduceRate)&&Number.isFinite(e.buffReflection?.reflectRate);
  return independentRequests.has(e.kind)&&e.supported===true&&Number.isFinite(e.value);
 }
 function describe(bundle){
  const row=bundle.row,definitions=[row.definition,...row.dependencies].filter(Boolean),operations=[],effectIds=new Set(),timeIds=new Set();
  // User's summon-description scope also covers the wall-only spell whose
  // old header has no effect rows. Its1/60s body receipt is not a wall lifetime.
  const wall=row.internalId===173&&row.matchStatus==='一致'&&row.key==='magic:リコールストーンウォール'&&definitions.length===1&&row.definition.id===173&&row.definition.action_type===1&&row.definition.effect_class===3&&row.definition.counter===1&&row.definition.interval===1&&row.definition.flags===5&&!row.definition.effects.length&&!row.isAttack;
  if(wall){operations.push({definitionId:173,type:'summon',name:row.name,accepted:true,description:row.info+'。壁の寿命・寸法は未確認です。本体の短い保持指定を壁の寿命には使いません。',evidence:row.wiki,scope:'召喚物は何を出現させるかの説明で対応するユーザー指定範囲。経路探索・衝突・壁の状態再現を完成条件にしない'});timeIds.add(173);}
  const utilityScope=utility?.get(bundle);
  const requested=presentation?.userOperations?.[row.key];
  const signature=d=>(d?.effects||[]).map(e=>[e.kind,e.value,e.selector,e.qualifier,e.other10,e.flags,e.other18]);
  const acceptedRequest=requested&&requested.id===row.internalId&&(row.internalId===null?!row.definition:row.matchStatus==='一致'&&row.definition?.id===requested.id)&&!row.isAttack&&!row.dependencies.length&&JSON.stringify(signature(row.definition))===JSON.stringify(requested.expectedEffects);
  if(acceptedRequest){
   operations.push({definitionId:row.internalId,type:requested.type,name:row.name,description:requested.meaning,accepted:true,evidence:requested.evidence,scope:requested.scope,mode:requested.mode,timeNote:requested.timeNote,
    ...(!row.definition?{identityStatus:'内部IDは未照合。ユーザー指定の用途を採用。照合完了とはしない'}:{})});
   for(const e of row.definition?.effects||[])effectIds.add(row.internalId+':'+e.index);
   if(['description','existing-calculation'].includes(requested.mode))timeIds.add(row.internalId);
  }
  for(const d of definitions){
   const shown=presentation?.rules[d.id];
   if(shown&&d.id===row.internalId&&row.matchStatus==='一致'&&!row.isAttack&&!row.dependencies.length&&JSON.stringify(d.effects.map(e=>[e.kind,e.value,e.selector]))===JSON.stringify(shown.expectedEffects)){
    operations.push({definitionId:d.id,type:'presentation',name:row.name,description:shown.meaning,accepted:true,evidence:shown.wiki,scope:shown.scope});
    for(const e of d.effects)effectIds.add(d.id+':'+e.index);timeIds.add(d.id);
   }
   const description=(d.id===row.internalId?row.info:d.description)||d.description;
   const summon=d.effects.some(e=>summoning.has(e.kind)),pureGesture=gestures.has(d.id)&&!d.effects.length&&!row.isAttack;
   // Phantom's invisibility/movement modifier are on its player definition. The
   // dummy object is described separately; no combat Buff from it is assumed.
   const selfBuffDummy=d.id===13966&&d.effects.some(e=>e.kind===26)&&d.effects.some(e=>e.kind===147&&e.selector===15)&&!!description&&description.includes('身代わり');
   // Moai is an ordinary summoned combat pet. Its own attacks/stats are in
   // the user's omitted scope; the player's separate impact12 stays numeric.
   const ordinaryMoai=d.id===8782&&d.effects.some(e=>e.kind===169&&e.selector===266)&&d.effects.some(e=>e.kind===12&&e.value===50);
   const describedObject=(describedSummonObjects.has(d.id)&&d.effects.every(e=>summoning.has(e.kind)||e.kind===71)||selfBuffDummy||ordinaryMoai)&&!row.isAttack;
   const summonAccepted=summon&&(!generatedCombat.has(d.id)||describedObject)&&(!d.effects.some(e=>e.kind===94)||d.id===169||describedObject)&&!!description&&row.matchStatus==='一致';
   if(summon&&description)operations.push({definitionId:d.id,type:'summon',name:d.name,description,accepted:summonAccepted,
    evidence:d.id===row.internalId?row.wiki:{definitionId:d.id,source:'保存済み内部定義の説明'},
    ...(summonAccepted?{}:{remaining:'生成先によるダメージ・回復・Buff等の作用は数値計算の対象として保持。生成体の一般能力成長だけを理由とする保留とは分ける'})});
   if(pureGesture)operations.push({definitionId:d.id,type:'motion',name:d.name,description,evidence:row.wiki,accepted:true});
   for(const e of d.effects){
    const rule=e.kind===115?guardInputs.guards[d.id]:null;
    if(e.kind===217||e.kind===47&&reflections[d.id]?.reflect>0||rule?.selector===4){
     const meaning=e.kind===217?({3:'火',4:'水',5:'風',6:'地'}[e.selector]||'指定属性')+'属性の魔法を反射する':e.kind===47?'適合する物理攻撃を反射する（別途、軽減作用を持つ）':(rule.mask&4?'魔法':'')+(rule.mask&3?(rule.mask&4?'・':'')+'物理攻撃':'')+'を防御成立時に反射する';
     operations.push({definitionId:d.id,type:'reflection',name:d.name,description:meaning,accepted:true,evidence:{source:'docs/client-numeric-gaps7-20261011.txt / docs/client-numeric-gaps9-20261011.txt'},scope:'反射可能なことの説明対応。発動率・反射ダメージの完成を意味しない'});
     // Only the pure elemental-reflection effect is wholly optional. Shared
     // guard/reduction handlers still own their independent numerical work.
     if(e.kind===217)effectIds.add(d.id+':'+e.index);
     // Non-shield guard definitions have their independent guard effect53.
     // Do not require the extra reflected HP branch to complete the reflection.
     if(rule?.selector===4&&shields.rules[d.id]?.primary!==38&&d.effects.some(v=>v.kind===53))effectIds.add(d.id+':'+e.index);
    }
   }
   for(const e of d.effects){
    if(summonAccepted&&(summoning.has(e.kind)||e.kind===71)||motion.has(e.kind))effectIds.add(d.id+':'+e.index);
   }
   if(d.effects.some(e=>motion.has(e.kind)))operations.push({definitionId:d.id,type:'motion',name:d.name,
    description:description||'動作モーションを変更する',accepted:true,evidence:{source:'docs/client-numeric-gaps9-20261011.txt',meaning:'573a40→563ce0→5b2910のモーション参照'}});
   if(pureGesture||(summonAccepted||d.effects.some(e=>motion.has(e.kind)||e.kind===217))&&d.effects.every(e=>effectIds.has(d.id+':'+e.index)||visual.has(e.kind)||[16,35].includes(e.kind)))timeIds.add(d.id);
  }
  const wikiOnly=!row.definition&&wikiSummons.has(row.key)&&!!row.info;
  const itemBundle=!row.definition&&presentation?.bundles[row.key];
  if(itemBundle)operations.push({definitionId:null,type:'item-bundle',name:row.name,description:itemBundle.meaning,accepted:true,evidence:itemBundle.wiki,scope:itemBundle.scope,identityStatus:'技書セットの一覧行。技の内部ID照合は行っていません'});
  if(wikiOnly)operations.push({definitionId:null,type:'summon',name:row.name,description:row.info,accepted:true,evidence:row.wiki,identityStatus:'内部IDは未照合。wikiの召喚対象の説明だけを採用'});
  if(utilityScope){
   operations.length=0;
   operations.push({definitionId:row.internalId,type:'utility',name:row.name,description:utilityScope.meaning,accepted:true,mode:'description-known-time',scope:utilityScope.scope,evidence:utilityScope.evidence,timeNote:utilityScope.timeNote,
    ...(!row.definition?{identityStatus:'内部IDは未照合。説明の採用と内部照合は別です'}:{})});
   for(const d of definitions)for(const e of d.effects)if(utilityScope.whole||utilityScope.effectKinds.includes(e.kind))effectIds.add(d.id+':'+e.index);
  }
  // No blanket completion by category or by a technique's name.
  const existingCalculation=!!acceptedRequest&&requested.mode==='existing-calculation';
  const descriptionOnly=!!utilityScope?.whole||!!acceptedRequest&&['description','existing-calculation'].includes(requested.mode)||wikiOnly||!!itemBundle||definitions.length===1&&timeIds.has(row.internalId)&&!row.isAttack;
  return {policy:'summon-motion-reflection-description-20261015',label:utilityScope?.whole?utility.label:existingCalculation?'既存計算対応':label,operations,effectIds:[...effectIds],timeIds:[...timeIds],descriptionOnly,existingCalculation,utilityScope,durationOnly:!!acceptedRequest&&requested.mode==='duration-only',
   timeNote:acceptedRequest?requested.timeNote:null,
   excludedRequirements:['召喚物・設置物のステータス、能力成長・寿命・専用行動の再現','モーションだけの技のフレーム長・戦闘状態再現'],
   meaning:'召喚対象・動作内容・反射できることは説明対応。別のダメージ・回復・軽減・能力補正は数値計算の対象'};
 }
 function assess(bundle,result){
  const scope=describe(bundle),ids=new Set(scope.effectIds),times=new Set(scope.timeIds);
  const conditionalNumerics=result.pending.filter(e=>!ids.has(e.id)).flatMap(e=>{const q=requestBoundary(e,result,ids);return q?[{id:e.id,name:e.name,kind:e.kind,...q}]:[];});
  const conditionalIds=new Set(conditionalNumerics.map(e=>e.id));
  const deferredState=result.pending.filter(e=>!ids.has(e.id)&&(deferredStateEffect(e)||conditionalIds.has(e.id)));
  const activePending=scope.descriptionOnly?[]:result.pending.filter(e=>!ids.has(e.id)&&!deferredState.includes(e));
  const optional=result.pending.filter(e=>!activePending.includes(e)&&!deferredState.includes(e));
  const pending=activePending.map(e=>summoning.has(e.kind)&&e.category!=='入力不足'&&!e.numericBranchGap?{...e,archivedResearchReason:e.reason||e.remaining,
   reason:e.generatedActionBinding?.candidateOnly?(e.selectedChild?.inputCondition?.derivedTrap?'罠レベル→NPC技能→爆発候補の1要求量は計算済み。実際の爆発ID・段階を選ぶ条件が未照合。候補を親の確定量や合計にはしません':'爆発候補自身の量は別表示。親から発行される実ID・段階選択が未照合です。') :e.areaBindingConfirmed===true&&e.semanticBinding?'wikiと内部定義で付与元は照合済み。子の数量に未解析または入力不足の枝があります。対応済みの量と子Buff時間は別表示します':e.generatedActionBinding?'参照先IDは照合済み。生成体自身の数値入力が未指定、または子の量に未対応の枝があります。既知の1要求量は内訳へ表示し、自動発動回数・親の総量は別に扱います':e.selectedChild&&e.areaBindingConfirmed===false?'候補Buff自身の量・時間は別表示。この技からその子IDが発行される結合が未照合のため、親の効果量としては確定しません':'生成された攻撃・領域の子定義ID、入力生成・数量式への結合が未照合。生成レベルを効果量に読み替えません。状態再現・自動回数は既知の1要求量の完成条件に含めません',remaining:null}:e);
  const nested=result.effects.flatMap(e=>[...(e.guardChild?.effects||[]),...(e.selectedChild?.effects||[]),...(e.reactionChild?.effects||[]),...(e.additionalChildren||[]).flatMap(c=>c.effects)]);
  const numeric=result.effects.some(e=>!ids.has(e.id)&&(e.supported&&!e.timeOnly||e.coveredByAttack||e.bladeFollowup?.numericCount))||nested.some(e=>e.supported&&!e.timeOnly)||!!result.physicalResults.length||!!result.attack;
  const amountStatus=scope.descriptionOnly?scope.label:pending.length?(numeric?'一部対応':'計算未対応'):scope.utilityScope?utility.mixedLabel:numeric?'対応':result.effects.some(e=>e.resolved)||scope.operations.some(e=>e.accepted)?'数量なし（作用確認）':'計算未対応';
  const root=bundle.row.definition,sourceTime=result.times.find(t=>t.definitionId===bundle.row.internalId);
  const headerEffect=result.effects.find(e=>e.semanticHeaderBinding?.kind==='planted-seed-trigger'&&e.selectedChild);
  const headerDurationCoverage=headerEffect&&sourceTime?.supported&&!sourceTime.partial&&Number.isFinite(headerEffect.selectedChild.durationSeconds)?{supported:true,bodyHoldingSeconds:sourceTime.seconds,childId:headerEffect.selectedChild.id,childHoldingSeconds:headerEffect.selectedChild.durationSeconds,scope:'起動本体の保持指定と選択した種の1作用の持続。実発動時間・種の寿命・起動の自動回数とは別。'}:null;
  const boundArea=root?.effects.length&&result.effects.find(e=>e.definitionId===root.id&&e.areaBindingConfirmed===true&&
   (root.effects.every(e=>e.kind===9)&&(e.semanticBinding||e.generatedActionBinding)||
    root.effects.every(e=>e.kind===8)&&e.generatedActionBinding?.childTimeCoverage===true));
  const boundTimes=boundArea?[boundArea.selectedChild,...boundArea.additionalChildren||[]].filter(Boolean):[];
  const childDurationCoverage=sourceTime&&!sourceTime.supported&&boundTimes.length&&boundTimes.every(c=>Number.isFinite(c.durationSeconds))?{
   supported:true,children:boundTimes.map(c=>({id:c.id,name:c.name,seconds:c.durationSeconds})),excludedSourceLifetime:{definitionId:root.id,known:false,reason:sourceTime.reason},
   scope:'付随作用が受理された1回の保持指定は計算済み（0は持続指定なしで、動作時間0という意味ではない）。設置物自体の寿命は未確認で、召喚物の再現を省く指定範囲として別記。子の保持指定へ置換せず、自動再付与や親の総量は計算しない。',
   ...(boundArea.generatedActionBinding?.durationNote?{durationNote:boundArea.generatedActionBinding.durationNote}:{} )}:null;
  return {...scope,pending,optional,deferredState,conditionalNumerics,conditionalRequestSupported:numeric&&conditionalNumerics.length>0&&!pending.length,numericalBoundary:'受理された条件での要求量・倍率・表示値・単位なしの移動1要求分。持続親の全要求合計・最終座標・HP保存・実ターゲット選択・実状態の適用/終了は別軸',amountStatus:!scope.utilityScope&&!optional.length&&!deferredState.length&&!scope.descriptionOnly&&result.amountStatus?result.amountStatus:amountStatus,
    timeStatus:scope.existingCalculation?'既存計算を利用':scope.descriptionOnly?scope.label:result.receivedDefinition?.time?.supported?'選択段階の保持対応（共有終了は別）':headerDurationCoverage?'対応':childDurationCoverage?'付随効果対応・設置寿命未確認（指定範囲）':result.timeStatus,childDurationCoverage,headerDurationCoverage,
   deferredTimes:(result.times||[]).filter(t=>times.has(t.definitionId))};
 }
 const api=Object.freeze({describe,assess,label,knownUtilityTimes:(bundle,input,names,duration)=>utility?.knownTimes(bundle,input,names,duration)||[]});if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MOE_COMBAT_CALCULATION_SCOPE=api;
})(globalThis);
