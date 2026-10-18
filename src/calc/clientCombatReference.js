(function(root) {
  'use strict';
  const f = Math.fround;
  function finite(v, fallback, label) {
    const n = Number(v ?? fallback);
    if (!Number.isFinite(n)) throw new RangeError(label + ' must be finite');
    return n;
  }
  function single(v, fallback, label) {
    const n = f(finite(v, fallback, label));
    if (!Number.isFinite(n)) throw new RangeError(label + ' exceeds float32');
    return n;
  }
  function integer(v, fallback, lo, hi, label) {
    const n = finite(v, fallback, label);
    if (!Number.isInteger(n) || n < lo || n > hi) throw new RangeError('Invalid ' + label);
    return n;
  }
  function selected(e, kind) {
    if (e == null) return null;
    if (e.kind != null && e.kind !== kind) throw new TypeError('Expected effect kind ' + kind);
    return {value:single(e.value, NaN, 'effect value'),
      selector:integer(e.selector, 0, 0, 0xffffffff, 'selector'),
      flags:integer(e.flags, 0x30, 0, 0xffffffff, 'flags')};
  }
  function predicate(options) {
    const state = integer(options.targetStateMode, 0, 0, 255, 'target state');
    const type = integer(options.targetActorType, 4, 0, 0xffffffff, 'actor type');
    const selectors = options.targetPredicateSelectors ?? [];
    if (!Array.isArray(selectors) || selectors.some(s => !Number.isInteger(s) || s < 1 || s > 9)) throw new TypeError('Expected target predicate selectors');
    return selector => selector === 7 ? !!(type & 3) :
      state === 2 && [1,2,3,4,5,6,8,9].includes(selector) && selectors.includes(selector);
  }
  function resultFinite(v) {
    if (!Number.isFinite(v)) throw new RangeError('Non-finite generated message');
    return v;
  }
  // Final block of constructor2970 only. Input is the already computed power,
  // after preceding skill/weapon/attribute stages; it is not the displayed ATK.
  function encodePhysicalPower(preSpecialPower, options = {}) {
    let value = single(preSpecialPower, NaN, 'pre-special power');
    if (value < 0) throw new RangeError('Negative physical power is outside this reference scope');
    const caster = selected(options.caster244,244);
    if (caster && predicate(options)(caster.selector)) value = resultFinite(f(value * caster.value));
    if (value < 0) throw new RangeError('Negative modified power is outside this reference scope');
    const boundedPower = Math.min(10000,value);
    return {afterSpecial:value,boundedPower,encodedPower:Math.trunc(boundedPower),
      serverFinalDamageVerified:false};
  }
  // Original4e20 normal NPC/no-shield branch, after a successful hit.
  // Selected232/234/233 are supplied, not discovered from live Buffs.
  function physicalNpcAttack(input, options = {}) {
    const P = integer(input.encodedPower, NaN, 0, 10000, 'encoded power');
    const R = single(input.defense,0,'defense');
    if (R < 0) throw new RangeError('Negative defense is outside this reference scope');
    const seed = integer(input.seed,0,0,0xffffffff,'seed');
    const incoming = single(input.incoming,1,'incoming');
    if (incoming < 0) throw new RangeError('Negative incoming is outside this reference scope');
    if (input.critical != null && typeof input.critical !== 'boolean') throw new TypeError('critical must be boolean');
    if (options.caster244 != null) throw new TypeError('Apply caster244 in encodePhysicalPower, before this stage');
    const target = selected(options.target232,232), drain = selected(options.caster234,234);
    const ownDrain = selected(options.definition233,233);
    // x87 intermediates stay extended until the recorded float32 stores.
    const effectiveDefense = R * (seed % 21 + 60) * f(.01);
    let amount = f((P * P / (P + effectiveDefense + f(.1)) + (seed % 3 - 1)) * f(.8));
    if (input.critical) amount = f(amount * f(1.5));
    amount = amount > 0 ? f(amount * incoming) : 0;
    if (target) amount = f(amount * (1 + target.value));
    resultFinite(amount);
    const secondaryMessages = [], e = ownDrain ?? drain;
    if (amount > 0 && e) {
      const raw = resultFinite(f(amount * e.value * f(.01)));
      if (raw > 0 && [1,2,3].includes(e.selector)) {
        secondaryMessages.push({messageType:{1:2,2:4,3:1}[e.selector],
          amount:e.selector === 3 ? raw : f(-raw),recipient:'caster',
          effectSource:ownDrain ? 'definition233' : 'caster234',clampApplied:false});
      }
    }
    return {encodedPower:P,effectiveDefense,clientMessageAmount:amount,messageType:18,
      secondaryMessages,clampApplied:false,serverFinalDamageVerified:false};
  }
  // Original59f640. Presence197 is an explicitly supplied effective lookup,
  // not an automatic inference from a catalog Buff's raw definition.
  function physicalHitGate(input, options = {}) {
    const encodedHit = integer(input.encodedHit,NaN,-32768,32767,'encoded hit');
    const evasion = single(input.evasion,NaN,'evasion');
    if (evasion < 0) throw new RangeError('Negative evasion is outside this reference scope');
    const seed = integer(input.seed,0,0,0xffffffff,'seed');
    const type = integer(options.targetActorType,4,0,0xffffffff,'actor type');
    const state = integer(options.targetStateMode,2,0,255,'target state');
    if (options.forced197Present != null && typeof options.forced197Present !== 'boolean') throw new TypeError('forced197Present must be boolean');
    const forced = !!options.forced197Present && (type === 4 || [1,2].includes(type) && [0,1].includes(state));
    if (forced) return {encodedHit,hit:encodedHit/16,evasion,forced:true,evaded:true,
      unboundedThreshold:null,threshold:null,residue:null,hitFractionIfUniformResidues:0,
      liveSeedDistributionVerified:false,serverFinalDamageVerified:false};
    // x87 ratio -> integer conversion; do not round the ratio to float32.
    const unboundedThreshold = Math.trunc((encodedHit/16 + 45)/(evasion + 45)*58);
    const threshold = Math.max(15,Math.min(100,unboundedThreshold));
    const residue = (seed - (seed >>> 6)) % 100;
    return {encodedHit,hit:encodedHit/16,evasion,forced:false,unboundedThreshold,threshold,residue,
      evaded:residue > threshold,hitFractionIfUniformResidues:Math.min(100,threshold+1)/100,
      liveSeedDistributionVerified:false,serverFinalDamageVerified:false};
  }
  // The type18 amount branch of4e20, type4 NPC/no-shield target. Other skill
  // effect messages are excluded. Normal six attacks have no definition214.
  function physicalNpcAttackWithHit(input, options = {}) {
    if (options.caster244 != null) throw new TypeError('Apply caster244 in the constructor');
    if (options.definitionBypassesEvasion != null && typeof options.definitionBypassesEvasion !== 'boolean') throw new TypeError('definitionBypassesEvasion must be boolean');
    const generated = physicalNpcAttack(input,{target232:options.target232});
    const gateAttempted = generated.clientMessageAmount > 0 && !options.definitionBypassesEvasion;
    const hitGate = gateAttempted ? physicalHitGate(input,{forced197Present:options.forced197Present}) : null;
    const evaded = !!hitGate?.evaded;
    const message = evaded ? {...generated,clientMessageAmount:0,secondaryMessages:[]} : physicalNpcAttack(input,options);
    return {...message,hitGate,gateAttempted,evaded,successfulHitAssumed:false,
      outcome:evaded ? 'evaded' : generated.clientMessageAmount <= 0 ? 'nonpositive-damage' : options.definitionBypassesEvasion ? 'bypassed' : 'hit',
      otherSkillEffectsEvaluated:false};
  }
  function flagsAllow(e, world, mark) {
    const a = !!(e.flags & 0x100), b = !!(e.flags & 0x200);
    return !(a !== b && (a && world === 1 || b && world !== 1)) &&
      !(e.flags & 0x1000 && !(mark & 4));
  }
  // Whole constructor2970's admitted state0 branches. Definition records must
  // come from clientPhysicalActionDefinitions20261005; no252/253/254/257/258/271.
  function physicalActionPower(definition, input = {}, options = {}) {
    if (!definition || definition.action_type !== 2 || (!definition.normal && !definition.kind54)) throw new TypeError('Expected an admitted physical action definition');
    const skillInteger = integer(input.primarySkillInteger,1000000,0,2147483647,'primary skill integer');
    const skill = definition.primary_runtime ? f(skillInteger * f(.0001)) : 0;
    const world = integer(input.world,0,0,0xffffffff,'world');
    const hasTarget = input.hasTarget ?? true;
    if (typeof hasTarget !== 'boolean') throw new TypeError('hasTarget must be boolean');
    const physical = single(input.casterPhysicalPowerFraction,0,'physical fraction');
    const attribute = single(input.casterElementStrengthFraction,0,'attribute fraction');
    const casterState = integer(input.casterStateMode,0,0,1,'caster state');
    let power, hit, skillInputs=null;
    if (definition.normal) {
      power = Math.min(10000,single(input.weaponAttack,NaN,'weapon attack'));
      hit = single(input.weaponHit,0,'weapon hit');
      if (hasTarget) {
        power = f(power * (1 + physical));
        power = f(power * (1 + attribute));
      }
    } else {
      const skillApi = typeof module !== 'undefined' && module.exports ? require('./clientSkillInputReference.js') : root.MOE_CLIENT_SKILL_INPUT_REFERENCE;
      if (!skillApi) throw new Error('clientSkillInputReference is required');
      skillInputs=skillApi.fixedBasePhysicalInputs(skillInteger,definition.primary_runtime,{...input,casterStateMode:casterState});
      power = f(single(definition.base,NaN,'kind54 base') * f(.9) + skill * f(.1));
      hit = skillInputs.hitInput;
      // This actual fixed-base branch jumps past both collectors247/275.
    }
    const required = integer(definition.required,NaN,-32768,32767,'required skill');
    const slope = single(definition.coefficient,0,'coefficient') +
      (world === 1 ? 0 : single(definition.extra_coefficient,0,'extra coefficient'));
    const limit = single(definition.upper_limit,0,'limit') +
      (world === 1 ? 0 : single(definition.extra_upper_limit,0,'extra limit'));
    let sub = Math.max(f(.1),1 + ((skillInputs?.requiredSkill ?? skill)-required)*slope);
    if (limit >= 1) sub = Math.min(sub,limit);
    const preSpecialPower = resultFinite(f(power * sub));
    const encoded = encodePhysicalPower(preSpecialPower,{...options,caster244:hasTarget ? options.caster244 : null});
    const encodedHitRaw = Math.trunc(Math.max(0,Math.min(5000,hit))*f(16));
    const encodedHit = ((encodedHitRaw+32768)%65536)-32768;
    return {definitionId:definition.id,primarySkillInput:skill,skillInputs,preRequiredPower:power,
      requiredSubfactor:sub,preSpecialPower,...encoded,encodedHit,
      physicalCollectorApplied:definition.normal && hasTarget,
      attributeCollectorApplied:definition.normal && hasTarget,serverFinalDamageVerified:false};
  }
  // Connect the previously verified real-weapon helpers to the normal power
  // constructor and successful-NPC-attack message. Buff/cache inputs are effective.
  function evaluateNormalWeapon(weapon, actionDefinition, input = {}, hpOptions = {}) {
    if (!actionDefinition?.normal) throw new TypeError('Expected a normal attack definition');
    if (!weapon || weapon.kind !== 'weapon' || weapon.skill_switch_flags || ![27,28,29,30,31].includes(weapon.primary_skill_runtime)) throw new TypeError('Weapon switching/category is outside this verified subset');
    const weaponApi = typeof module !== 'undefined' && module.exports ? require('./clientWeaponReference.js') : root.MOE_CLIENT_WEAPON_REFERENCE;
    if (!weaponApi) throw new Error('clientWeaponReference is required');
    const skills = input.skillIntegers ?? {};
    const skill = selector => integer(skills[selector],0,0,2147483647,'effective skill integer');
    const performance = row => weaponApi.performance({primarySkillInteger:skill(row.primary_skill_runtime),primaryRequired:row.primary_required,
      primarySelector:row.primary_skill_runtime,secondary:row.secondary_requirements.map(r=>({skillInteger:skill(r.runtime_skill),required:r.required}))});
    const weaponPerformance = performance(weapon);
    const effectiveDamage = input.condition ? weaponApi.weaponCondition({...input.condition,baseDamage:weapon.damage}) : f(weapon.damage);
    const strengthInteger = integer(input.strengthInteger,1000000,0,2147483647,'strength integer');
    let weaponAttack,ammoPerformance=null,ammoApplied=false;
    if (input.ammoDefinition) {
      ammoPerformance=performance(input.ammoDefinition);
      const ammoClass=integer(input.ammoDefinition.ammo_match_class_runtime,NaN,0,0xffffffff,'ammo class');
      const selectedAttackAmmoClass=integer(actionDefinition.ammo_class_runtime,NaN,0,0xffffffff,'normal attack ammo class');
      ammoApplied=ammoClass>0 && ammoClass===selectedAttackAmmoClass;
      weaponAttack=weaponApi.projectileAttack({strengthInteger,weaponDamage:effectiveDamage,weaponPerformance,
        ammoDamage:input.ammoDefinition.damage,ammoPerformance,ammoClass,selectedAttackAmmoClass,
        raceMultiplier:single(input.raceAttackMultiplier,1,'attack race coefficient'),cachedAdditive:single(input.cachedAttack,0,'cached attack')});
    } else weaponAttack=weaponApi.attack({strengthInteger,damage:effectiveDamage,performance:weaponPerformance,
      raceMultiplier:single(input.raceAttackMultiplier,1,'attack race coefficient'),cachedAdditive:single(input.cachedAttack,0,'cached attack')});
    const weaponHit=weaponApi.hit({weaponSkillInteger:skill(weapon.primary_skill_runtime),performance:weaponPerformance,
      raceMultiplier:single(input.raceHitMultiplier,1,'hit race coefficient'),cachedAdditive:single(input.cachedHit,0,'cached hit')});
    const actionPower=physicalActionPower(actionDefinition,{...input,weaponAttack,weaponHit,primarySkillInteger:skill(actionDefinition.primary_runtime)},hpOptions);
    const attackInput={encodedPower:actionPower.encodedPower,encodedHit:actionPower.encodedHit,evasion:input.evasion,
      defense:input.defense,seed:input.seed,critical:input.critical,incoming:input.incoming};
    const attackOptions={target232:hpOptions.target232,caster234:hpOptions.caster234,definition233:hpOptions.definition233,
      forced197Present:hpOptions.forced197Present};
    if (hpOptions.forced197Present != null && input.evasion == null) throw new TypeError('Supply evasion to enable the hit gate');
    const message=input.evasion == null ? physicalNpcAttack(attackInput,attackOptions) : physicalNpcAttackWithHit(attackInput,attackOptions);
    return {weaponId:weapon.item_id,weaponPerformance,ammoPerformance,ammoApplied,effectiveDamage,weaponAttack,weaponHit,
      actionPower,message,successfulHitAssumed:input.evasion == null,serverFinalDamageVerified:false};
  }
  // Registry index206 ->56aa40. Does not interpret raw kind54 as kind206.
  // M/A are supplied from the action wrapper; this is not a whole skill formula.
  function randomRangeHp(channels, options = {}) {
    if (channels.kind != null && channels.kind !== 206) throw new TypeError('Expected effect kind206');
    if (options.replacement240 != null || options.caster234 != null || options.definition233 != null)
      throw new TypeError('This verified kind206 subset excludes240 and has no233/234 branch');
    const base = single(channels.base,NaN,'base');
    const other = integer(channels.other,NaN,-2147483648,2147483647,'other endpoint');
    const multiplier = single(channels.multiplier,1,'multiplier');
    const addition = single(channels.addition,0,'addition');
    const random15 = integer(channels.random15,0,0,32767,'random15');
    const world = integer(options.world,0,0,0xffffffff,'world');
    const mark = integer(options.contextMark,0,0,0xffffffff,'context mark');
    const caster = selected(options.caster244,244), target = selected(options.target232,232);
    const lo = f(Math.min(base,other)), hi = Math.max(base,other), span = f(hi-lo);
    let amount = f((random15 * span * f(1/32767) + lo) * multiplier + addition);
    if (amount !== 0 && caster && predicate(options)(caster.selector) && flagsAllow(caster,world,mark)) amount = f(amount * caster.value);
    if (amount > 0 && target && flagsAllow(target,world,mark)) amount = f(amount * (1 + target.value));
    resultFinite(amount);
    return {lowEndpoint:lo,highEndpoint:hi,unclampedAmount:amount,
      clientMessageAmount:Math.max(-1000,Math.min(10000,amount)),messageType:2,
      secondaryMessages:[],clampApplied:true,serverFinalDamageVerified:false};
  }
  const api = Object.freeze({encodePhysicalPower,physicalNpcAttack,physicalHitGate,physicalNpcAttackWithHit,randomRangeHp,physicalActionPower,evaluateNormalWeapon,
    defaultCalculationReplacement:false,
    scope:'Controlled state0/1 constructor for six normal attacks and94 fixed-base kind54 actions; fixed-base state1 accepts decoded active167/196/235 records and explicit stat caches. Normal real-weapon/wear/ammo helpers connected to type4 NPC/no-shield attack, with optional original hit/evasion gate when evasion is supplied. Standalone gate accepts explicit active197 and actor type/state; type18 amount wrapper accepts explicit definition214 bypass, excludes other skill effect messages. Separate kind206 HP handler with explicit M/A and random15. Live Buff eligibility/selection, other constructor branches/cache producers/conversions, whole player/shield defenses, live seed distribution and server final HP are unverified.'});
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MOE_CLIENT_COMBAT_REFERENCE = api;
})(globalThis);
