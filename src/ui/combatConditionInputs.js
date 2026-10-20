/* UI input relevance; this does not calculate or infer effect quantities. */
(function(root){'use strict';
 function forBundle(bundle,numeric,selection={}){
  const allowed=new Set(),add=(...keys)=>keys.forEach(k=>allowed.add(k));
  if(!bundle)return allowed;
  const defs=[bundle.row.definition,...bundle.row.dependencies||[]].filter(Boolean);
  const generated=numeric.generatedInputChildren(bundle);
  const effects=[...defs,...(selection.summonSelected?generated:[])].flatMap(d=>d.effects||[]);
  const kinds=new Set([...numeric.conditionalInputKinds(bundle),...effects.map(e=>e.kind)]);
  const has=(...values)=>values.some(k=>kinds.has(k)),stat=(...selectors)=>effects.some(e=>[41,147].includes(e.kind)&&selectors.includes(e.selector));
  const physical=defs.some(d=>d.action_type===2),magic=defs.some(d=>d.action_type===1);
  // Shared numerical inputs consumed by the selected definitions only.
  if(magic||effects.some(e=>[2,3,11,19,38,41,42,82,83,147,170,171,173,237].includes(e.kind)))add('Seed','Amplification');
  if(physical||has(8,9,28,32,38,53,89,92,94,112,115,123,169,178,217,241,242)||effects.some(e=>Object.hasOwn(numeric.craftingSelectors,e.selector)))add('Random15');
  if(physical)add('Seed');
  if(defs.some(d=>d.action_type===2&&bundle.attack?.definition?.id!==d.id))add('ItemClass');if(defs.some(d=>[30,31].includes(d.primary_raw)))add('ShotDistance');
  if(effects.some(e=>e.flags&0xc00))add('TimePeriod');
  if(has(86,133)||bundle.row.dependencies?.length){add('ReferenceChain','ReferenceSimultaneous','ReferenceReceiptOrder');}
  if(has(133))add('PeriodicReference');
  if(bundle.row.internalId===37)add('ReferenceSelfCenterTarget');
  if(defs.some(d=>d.counter>0&&d.interval===1)&&has(3,11,42,123,170,171,173))add('FixedUpdateElapsed','SinglePositiveUpdate');
  const byKind={
   23:['HostilityBefore','HostilityPromotion'],27:['TamePetLevelSum','TameTargetLevel'],
   31:['MovementX','MovementY','MovementZ'],57:['MovementX','MovementY','MovementZ'],78:['MovementX','MovementY','MovementZ'],130:['MovementX','MovementY','MovementZ'],201:['MovementX','MovementY','MovementZ'],
   44:['MagicBodyBranch'],45:['CarnivalCategory','CarnivalTarget','CarnivalUnopposed','CarnivalResetAttackCount'],
   47:['BuffReflectionDamage','BuffReflectionOnly'],50:['AffectedBaseST'],
   59:['FloatHeight'],87:['FloatHeight'],80:['FacingBefore'],142:['SinkingBefore'],
   65:['OtherLightProfile'],69:['ReuseSkill','ReuseType'],108:['ReuseSkill','ReuseType'],109:['ReuseSkill','ReuseType'],
   72:['WeaponWearConfirmed','WeaponDurability','WeaponWearFloor'],79:['CasterMaxHP'],
   82:['MaxHP','PercentHpGate'],83:['MaxMP'],91:['Concentration','CastingMovementFactor'],92:['Concentration'],93:['RangeAction'],101:['Concentration','CastingMovementFactor'],
   107:['PerceptionRaw','PerceptionDistance'],112:['CriticalBase','CriticalAttacker','CriticalTarget','CriticalResidue'],
   113:['FallDamageFactor','FallDamageBefore','FallHeight','FallSkill','FallOverload'],114:['FallSpeedFactor','FallVelocityBefore'],
   121:['WeatherIndex','WeatherChildAccepted'],124:['SwimAbility'],125:['ItemDelayBaseCounter'],127:['VisualFogAdmitted'],
   136:['RestrictionAction'],165:['RestrictionAction'],149:['PetExperienceEligible','PetExperienceBefore','PetExperienceBase','PetExperienceNoOwnerBuff'],
   162:['TheftInputBefore'],163:['TheftInputBefore','TheftRequestSelector'],
   176:['CasterCurrentHP','CasterMaxHP'],177:['TransferEligibleCount','TransferRecords'],178:['AiWaitBaseCounter','AiWaitGroup','AiWaitExempt'],
   188:['BuffActionSkill','BuffHitBefore'],190:['WeaponMass'],191:['CursedSlots'],195:['NormalJumpConfirmed'],
   197:['EvasionHolder','IncomingHit','HolderEvasion','IncomingBypass'],198:['ReceivedHpAmount','CurrentHP'],199:['ReceivedHpAmount','TargetCurrentMP'],
   200:['ProtectionDistance'],207:['SourceYaw','TargetYaw'],208:['RecognitionProfile'],210:['PetLevel'],211:['ReceivedHpAmount','IncomingElement'],
   217:['GuardRandom31','IncomingElement','ElementalReflectionSelected'],218:['AppearanceSpecies','AppearanceSex'],
   231:['CasterCurrentMP'],232:['ReceivedHpAmount'],234:['AbsorptionBasis','AbsorptionSelected'],237:['MaxHP'],
   239:['PhysicalCategory'],240:['TargetCategory'],244:['TargetCategory'],245:['AreaRadiusBase'],248:['RangedRangeBase'],
   250:['BarrierHitsBefore','DamageReactionBranch'],251:['ReceivedHpAmount','DamageReactionBranch'],
   259:['ReceivedHpAmount'],260:['ReceivedHpAmount'],262:['EquipmentDurability','EquipmentFloor'],
   269:['DamageReactionBranch','ReceivedHpAmount'],
  };
  for(const kind of kinds)add(...byKind[kind]||[]);
  if(has(241,242))add('ReactionSelected','ReactionLastAcceptedSeconds');
  if(has(123))add('InterruptCondition','InterruptNpcProfile','InterruptNpcLevel','InterruptNpcRandom15');
  if(has(28)&&effects.some(e=>e.kind===28&&e.selector===7))add('PetSpecialReady');
  if(effects.some(e=>e.kind===28&&e.selector===10))add('PetLevel');
  if(has(74))add('RemovableObject');
  if(has(96))add('LifetimeInitial','LifetimeRemaining','LifetimeElapsed','LifetimeCategory','LifetimePresent');
  if(bundle.row.internalId===5825)add('AreaElapsed','AreaTargetType','AreaInside','AreaBuffRemaining');
  if(stat(72))add('DirtBefore');
  if(stat(16))add('ReuseMagicPercent');if(stat(17))add('ReuseWeaponPercent');
  if(effects.some(e=>e.kind===85&&e.selector===3))add('AffectedBaseST');
  if(effects.some(e=>[41,147].includes(e.kind)&&Object.hasOwn(numeric.craftingSelectors,e.selector)))add('CraftingSelector','CraftingSlipBefore');
  if(effects.some(e=>[41,147].includes(e.kind)&&Object.hasOwn(numeric.craftingSpeedSelectors,e.selector)))add('CraftingSelector','CraftingSpeedBefore');
  for(const e of effects.filter(e=>e.kind===129)){if(e.selector===1)add('MaxHP','CurrentHP','CasterMaxHP','CasterCurrentHP');if(e.selector===2)add('MaxMP','CasterCurrentMP','TargetCurrentMP');if(e.selector===3)add('NumericTargetType','TargetMaxST');}
  if(has(122))add('MaxHP','CurrentHP');
  if(has(111))add('ReplacementBuff','ReplacementState','ReplacementSource');
  if(numeric.areaBuffOptions(bundle).length)add('AreaBuffChoice');
  if(has(8,9,89,94,169)||generated.length)add('SummonBaseVariant');
  if(generated.length&&selection.summonSelected){add('GeneratedUnmodified','GeneratedTrapLevel','GeneratedRequestsNonOverlapping','GeneratedUseFixedBase','GeneratedAttack','GeneratedHit','GeneratedNormalNpc','GeneratedMagic','GeneratedActionElapsed');}
  if(numeric.bladeInputs(bundle).length){
   add('BladeSelected','BladeMode');
   if(numeric.bladeInputs(bundle,selection.bladeMode).some(d=>d.action_type===2))add('BladeWeaponAttack','BladeWeaponHit');
  }
  if(bundle.row.independentPhysicalChildren?.includes(13576))add('IndependentShotSelected','LeftShotAttack','LeftShotHit');
  if([5387,6699].includes(bundle.row.internalId))add('DualWeaponConfirmed','DualWeaponLeft','DualWeaponLeftAttack','DualWeaponLeftHit');
  if(has(53,115)&&defs.some(d=>d.action_type===3)){
   add('GuardBranch','PreGuardDamage','GuardIncomingAction','GuardWindow','GuardShield','GuardShieldSkill','IncomingHit');
   const guardEffects=effects.filter(e=>e.kind===115),magicGuard=Object.hasOwn(numeric.guardMagicInputs,selection.guardIncomingAction||'');
   if(guardEffects.some(e=>[3,4,5,8].includes(e.selector)))add('GuardFullBlock');
   if(guardEffects.some(e=>e.selector===4))add('GuardRandom31');
   if(guardEffects.some(e=>e.selector===5))add('GuardAmmoCondition');
   if(magicGuard){add('GuardIncomingSkill','GuardIncomingMagic','GuardIncomingSkillAdjustment','GuardMagicBranch');if(guardEffects.some(e=>e.selector===4))add('GuardReplayUnmodified','GuardReplayResistance','GuardReplayDefense');}
   if(selection.guardShieldId&&numeric.guardShields[selection.guardShieldId]?.name?.includes('フューチャー'))add('GuardShieldRegion');
  }
  if(defs.some(d=>root.MOE_COMBAT_GUARD_WINDOW_NUMERICS?.rules[d.id]))add('GuardGroundTiming','GuardRegularClock','GuardDelayedStart','GuardClockMode','GuardCurrentCounter','GuardScheduledMilliseconds');
  if(defs.some(d=>d.action_type===5))add('PassiveLearnedConfirmed');
  if(physical)add('NormalPcPhysical','NormalPcPhysicalDefense','NormalPcPhysicalCritical');
  if(physical||defs.some(d=>[2,3].includes(d.effect_class)||d.effect_class===1&&numeric.targetReductionEligibility(d).eligible)||has(45))add('TargetPhysicalReduction');if(magic||has(2,3,11,42,173,231))add('TargetMagicReduction');
  if(stat(5))add('NpcArmorConfirmed','NpcArmorDefense','NpcArmorGearDefense','NpcArmorWearSkill','NpcArmorPower','NpcArmorCritical');
  if(effects.some(e=>e.kind===86&&e.flags===50))add('ReverseReferenceNormalPc','ReverseReferenceNpcUnarmed','ReverseReferenceNpcWeapon','ReverseReferenceNpcShield','ReverseReferenceNpcShieldSkill','ReverseReferenceSkill','ReverseReferenceAttack','ReverseReferenceHit','ReverseReferenceDamage','ReverseReferenceDefense','ReverseReferenceGearDefense','ReverseReferenceWearSkill','ReverseReferenceCritical');
  return allowed;
 }
 function basicForBundle(bundle){
  const result=new Set();if(!bundle)return result;
  const defs=[bundle.row.definition,...bundle.row.dependencies||[]].filter(Boolean);
  if(bundle.row.definition?.primary_raw>0)result.add('Skill');
  if(defs.some(d=>d.action_type===1&&!d.effects.some(e=>e.kind===256)&&(!(d.flags&0x1000)||d.duration_coefficient!==0)))result.add('Magic');
  if(defs.some(d=>d.action_type===2||d.effects.some(e=>e.kind===260)||[2,3].includes(d.effect_class)&&d.element===1))result.add('Defense');
  // Both harmful strength and harmful duration can consume resistance.
  if(defs.some(d=>[2,3].includes(d.effect_class)&&d.element!==1))result.add('Resistance');
  if(bundle.attack||defs.some(d=>d.action_type===2||d.effects.some(e=>e.kind===260)))result.add('Attack');
  if(bundle.attack||defs.some(d=>d.extra_coefficient||d.extra_upper_limit||d.effects.some(e=>e.flags&0x300)))result.add('World');
  return result;
 }
 function displayNumber(value,resource=false){
  const number=Number(value);if(!Number.isFinite(number))return String(value);
  const scale=resource?1:10;
  const rounded=Math.sign(number)*Math.round((Math.abs(number)+Number.EPSILON*Math.abs(number))*scale)/scale;
  return String(Object.is(rounded,-0)?0:rounded);
 }
 function displayText(value,resource=false){
  return String(value??'').replace(/[+-]?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi,(number,offset,whole)=>{
   const tail=whole.slice(offset+number.length),unit=tail.match(/^\s*(HP|MP|ST|%|％|倍|秒|ポイント|回|件|レベル)/i)?.[1];
   const prefix=whole.slice(0,offset);
   const integer=unit?/^(HP|MP|ST)$/i.test(unit):resource||/(?:HP|MP|ST)\s*[:：]?\s*$/i.test(prefix);
   return (number.startsWith('+')?'+':'')+displayNumber(number,integer);
  });
 }
 // Upper-only conditions are not a known minimum; keep them with unknowns.
 function requiredValue(meta,skill=''){
  const requirements=skill?(meta?.requirements||[]).filter(q=>q.skill===skill):meta?.requirements||[];
  if(!requirements.length||requirements.some(q=>!Number.isFinite(q.min)))return null;
  return Math.max(...requirements.map(q=>q.min));
 }
 function compareRequired(a,b,skill=''){
  const left=requiredValue(a,skill),right=requiredValue(b,skill);
  if(left===null)return right===null?0:1;if(right===null)return -1;return left-right;
 }
 const api={forBundle,basicForBundle,displayNumber,displayText,requiredValue,compareRequired};if(typeof module==='object'&&module.exports)module.exports=api;else root.MOE_COMBAT_CONDITION_INPUTS=api;
})(globalThis);
