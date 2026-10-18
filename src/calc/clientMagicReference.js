(function(root) {
  'use strict';
  const f = Math.fround;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  function finite(value, fallback, label) {
    const number = Number(value ?? fallback);
    if (!Number.isFinite(number)) throw new RangeError(label + ' must be finite');
    return number;
  }
  // Original kind2 handler56a730. Effects are already selected by caller.
  // Predicate results are supplied; this API does not classify live actors.
  function hpMessage(channels, options = {}) {
    const base = f(finite(channels.base, 0, 'base'));
    const multiplier = f(finite(channels.multiplier, 1, 'multiplier'));
    const addition = f(finite(channels.addition, 0, 'addition'));
    const selected = (key, kind) => {
      const e = options[key];
      if (e == null) return null;
      if (e.kind != null && e.kind !== kind) throw new TypeError(key + ' has the wrong effect kind');
      const value = f(finite(e.value, NaN, key + '.value'));
      const selector = finite(e.selector, 0, key + '.selector');
      if (!Number.isInteger(selector) || selector < 0 || selector > 0xffffffff) throw new RangeError('Invalid selector');
      return {value, selector};
    };
    const replacement = selected('replacement240',240), caster = selected('caster244',244);
    const target = selected('target232',232), drain = selected('caster234',234);
    const ownDrain = selected('definition233',233);
    const state = finite(options.targetStateMode,0,'targetStateMode');
    const actorType = finite(options.targetActorType,4,'targetActorType');
    if (!Number.isInteger(state) || state < 0 || state > 255 || !Number.isInteger(actorType)) throw new RangeError('Invalid target state/type');
    const predicates = options.targetPredicateSelectors ?? [];
    if (!Array.isArray(predicates) || predicates.some(v => !Number.isInteger(v) || v < 1 || v > 9)) throw new TypeError('Expected target predicate selector numbers');
    const matches = selector => selector === 7 ? !!(actorType & 3) :
      state === 2 && [1,2,3,4,5,6,8,9].includes(selector) && predicates.includes(selector);
    const effectiveBase = replacement && matches(replacement.selector) ? replacement.value : base;
    let amount = f(effectiveBase * multiplier + addition);
    if (amount !== 0 && caster && matches(caster.selector)) amount = f(amount * caster.value);
    if (amount > 0 && target) amount = f(amount * (1 + target.value));
    if (!Number.isFinite(amount)) throw new RangeError('Non-finite HP message value');
    const secondaryMessages = [];
    const secondaryEffect = ownDrain ?? drain;
    if (amount > 0 && secondaryEffect) {
      const raw = f(amount * secondaryEffect.value * f(.01));
      if (!Number.isFinite(raw)) throw new RangeError('Non-finite secondary value');
      if (raw > 0 && [1,2,3].includes(secondaryEffect.selector)) {
        const selector = secondaryEffect.selector;
        // Original ST branch clamps a different local buffer, so its amount is uncapped here.
        const signed = selector === 3 ? raw : clamp(f(-raw),-1000,10000);
        secondaryMessages.push({selector, messageType:{1:2,2:4,3:1}[selector], amount:signed,
          rawAmount:raw, clampApplied:selector !== 3, recipient:'caster',
          effectSource:ownDrain ? 'definition233' : 'caster234'});
      }
    }
    return {effectiveBase, unclampedAmount:amount, clientMessageAmount:clamp(amount,-1000,10000),
      secondaryMessages, serverFinalDamageVerified:false};
  }
  // Type1 constructor2780 ordinary skill/magic inputs; no active skill bonus.
  function actionInput(skill, magic) {
    skill = Math.max(0, finite(skill, 100, 'skill'));
    magic = Math.max(0, finite(magic, 100, 'magic'));
    const combined = Math.round(skill * 10000) * f(.0001) * f(.6) + f(magic) * f(.4);
    const encoded = Math.trunc(combined * 16);
    if (encoded > 32767 || encoded < -32768) throw new RangeError('Action int16 input overflow');
    return encoded / 16;
  }
  // Controlled type1/class2, single positive kind2 entry with flags0x30.
  // Percent inputs are already-effective selected effects, not display totals.
  function strengthChannels(definition, input = {}) {
    const r = definition;
    if (!r || r.effect_class !== 2) throw new TypeError('Expected class2 strength definition');
    const x = input.actionInput == null ? actionInput(input.skill, input.magic) : f(finite(input.actionInput,0,'actionInput'));
    const y = f(finite(input.secondaryInput,x,'secondaryInput'));
    const resistance = f(finite(input.resistance, 0, 'resistance'));
    const seed = finite(input.seed, 10, 'seed');
    if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new RangeError('seed must be uint32');
    const incoming = f(finite(input.incoming, 1, 'incoming'));
    if (!(incoming > 0)) throw new RangeError('incoming must be positive');
    const R = [4,7,8,9,10,11].includes(r.resistance_ordinal) ? resistance : 0;
    let sub = Math.max(f(.1), 1 + (x - r.required) * (f(r.coefficient) + f(r.extra_coefficient)));
    const limit = f(r.upper_limit) + f(r.extra_upper_limit);
    if (limit >= 1) sub = Math.min(sub, limit);
    const delta = f(sub - 1);
    sub = f(sub);
    let multiplier = sub, addition = 0, halfResist = false, halfResistThreshold = null;
    const simple = !!(r.flags & 2 || r.flags254 & 1);
    const ordinaryM = simple ? sub : (x + 300) * f(1/350) + delta;
    const ordinaryA = simple ? 0 : x * f(.15);
    if (r.threshold > -100) {
      const difference = R - r.threshold + 1;
      multiplier = f(ordinaryM * ordinaryM / (ordinaryM + difference * f(.01)));
      if (!simple) addition = f(ordinaryA * ordinaryA / (ordinaryA + difference * f(.15)));
      // Original773ad0 returns required skill, not the spell's base damage.
      halfResistThreshold = 70 * ((r.required + y) * f(.5) + 30) / (R - r.threshold + 30);
      halfResist = seed % 100 > halfResistThreshold;
      if (halfResist) {multiplier = f(multiplier * f(.5)); addition = f(addition * f(.5));}
    }
    multiplier = clamp(f(multiplier + (seed % 21 - 10) * f(.01)), 0, 10);
    addition = clamp(addition, 0, 40);
    const bypass = !!(r.flags & 0x1000) || input.targetAmplificationAllowed === false;
    if (bypass) {
      multiplier = 1; addition = 0; halfResist = false; halfResistThreshold = null;
    } else {
      // Original249 then273 target reductions affect BOTH channels.
      for (const key of ['targetMagicReductionPct', 'targetElementReductionPct']) {
        const factor = 1 - f(finite(input[key], 0, key)) * f(.01);
        multiplier = f(multiplier * factor); addition = f(addition * factor);
      }
      // Original274 then275 caster boosts affect ONLY the multiplier.
      for (const key of (input.allowMagicBoost===false?['casterElementStrengthPct']:['casterMagicPowerPct', 'casterElementStrengthPct'])) {
        multiplier = f(multiplier * (1 + f(finite(input[key], 0, key) / 100)));
      }
    }
    multiplier = f(multiplier * incoming); addition = f(addition * incoming);
    if (![multiplier, addition].every(Number.isFinite)) throw new RangeError('Undefined/non-finite controlled formula');
    return {definitionId:r.id, name:r.name, element:r.element, actionInput:x, resistance:R, seed,
      strengthSubfactor:sub, ordinaryMultiplier:ordinaryM, ordinaryAddition:ordinaryA,
      halfResist, halfResistThreshold, multiplier, addition};
  }
  function evaluate(r, input = {}) {
    if (!r || r.action_type !== 1 || r.effect_class !== 2 || !(r.base > 0)) throw new TypeError('Expected a verified single positive HP damage definition');
    const channels=strengthChannels(r,input),{multiplier,addition}=channels;
    const emitsHpMessage = multiplier > 0 || addition > 0;
    const hpPostProcessing = emitsHpMessage ? hpMessage({base:r.base,multiplier,addition},input.hpEffects) : null;
    const clientMessageAmount = hpPostProcessing?.clientMessageAmount ?? null;
    return {...channels, emitsHpMessage, clientMessageAmount,
      hpPostProcessing, secondaryMessages:hpPostProcessing?.secondaryMessages ?? [],
      serverFinalDamageVerified:false};
  }
  const api = Object.freeze({actionInput, hpMessage, strengthChannels, evaluate, defaultCalculationReplacement:false,
    evidence:'attack_magic_chain_validation.json',
    hpModifierEvidence:'hp_message_modifier_validation.json',
    scope:'Controlled normal-world type1/class2 single positive kind2/flags30 HP message, plus original kind2 post-processing240/244/232/233/234 with explicit selected effects and target predicate results. No hit gating, skill bonus, automatic active-effect selection/stacking, whole physical attack routes, server HP processing, integer final damage or live acquisition proof.'});
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MOE_CLIENT_MAGIC_REFERENCE = api;
})(globalThis);
