(function(root) {
  'use strict';
  const f = Math.fround, view = new DataView(new ArrayBuffer(4));
  function integer(v, min, max, label) {
    if (!Number.isInteger(v) || v < min || v > max) throw new RangeError('Expected explicit ' + label);
    return v;
  }
  function bool(v, label) {
    if (typeof v !== 'boolean') throw new TypeError('Expected explicit ' + label);
    return v;
  }
  function number(v, label) {
    if (typeof v !== 'number' || !Number.isFinite(v) || !Number.isFinite(f(v))) throw new RangeError('Invalid ' + label);
    return f(v);
  }
  function floatBits(v) { view.setFloat32(0, v, true); return view.getUint32(0, true); }
  function bitsFloat(v) { view.setUint32(0, integer(v, 0, 0xffffffff, 'amount bits'), true); return number(view.getFloat32(0, true), 'amount'); }
  // Arithmetic before bounds/observer effects. Callers must separately supply
  // the admission, selected-record and no-bound-crossing conditions.
  function change(current, amount, percentage, reference = current) {
    current = number(current, 'current stat'); amount = number(amount, 'amount');
    bool(percentage, 'percentage');
    const delta = percentage ? f(amount * f(.01) * number(reference, 'percentage reference')) : amount;
    return {current,delta,next:f(current + delta)};
  }
  function validMessage(selector, amount, flags) {
    const s = selector >= 0x8000 ? selector - 0x10000 : selector;
    if (!(s >= 0 && s <= 27 || s === 30 || s === 31 || s >= 33 && s <= 98)) return false;
    if (flags & 1) return amount >= -500 && amount <= 500;
    return s >= 97 || amount >= -300 && amount <= (s === 14 ? 600 : 3200);
  }
  function evaluate(options) {
    if (!options || !options.context || !options.message || !Array.isArray(options.baseValues) || options.baseValues.length !== 96)
      throw new TypeError('Expected a type8 message, explicit context and 96 cache values');
    const p = options.context, message = options.message;
    const entry = options.entry;
    if (entry !== 'transport' && entry !== 'consumer') throw new TypeError('Expected explicit transport or consumer entry');
    if (message.type !== 8) throw new RangeError('Only type8 stat messages are supported');
    const selector = integer(message.selector, 0, 0xffff, 'selector word');
    const amount = message.amountBits !== undefined ? bitsFloat(message.amountBits) : number(message.amount, 'amount');
    if (message.amount !== undefined && message.amountBits !== undefined && floatBits(number(message.amount, 'amount')) !== message.amountBits)
      throw new RangeError('Conflicting message amount and bits');
    const flags = integer(message.flags, 0, 255, 'message flags');
    const mode = integer(p.mode, -0x80000000, 0x7fffffff, 'delivery mode');
    const delay = integer(p.delay, -0x80000000, 0x7fffffff, 'delay');
    const actorType = integer(p.actorType, -0x80000000, 0x7fffffff, 'actor type');
    const sourceType = integer(p.sourceType, -0x80000000, 0x7fffffff, 'source actor type');
    const sourcePresent = bool(p.sourcePresent, 'source presence'), targetPresent = bool(p.targetPresent, 'target presence');
    const targetBlocked = integer(p.targetBlocked, 0, 0xffffffff, 'virtual24 result');
    const special = integer(p.specialDelivery, 0, 0xffffffff, 'virtual164 result');
    const blockVital = integer(p.blockVital, 0, 0xffffffff, 'virtual1b4 result');
    const status = integer(p.statusD4, 0, 255, 'statusD4'), alternate = bool(p.alternate, 'alternate cache mode');
    const statMode = integer(p.statMode, -0x80000000, 0x7fffffff, 'stat bound mode');
    const boundStatus = integer(p.boundStatusByte, 0, 255, 'stat bound status byte');
    if (p.inactiveObserver !== true) throw new TypeError('This comparison requires an explicitly inactive UI/action observer');
    const values = options.baseValues.map(v => number(v, 'base cache value'));
    const limits = Array.from({length:96}, (_, s) => {
      const r = options.limits?.[s] ?? options.limits;
      if (!r) throw new TypeError('Explicit stat limits are required');
      const lower = number(r.lower, 'lower bound'), upper = number(r.upper, 'upper bound');
      if (lower > upper) throw new RangeError('Reversed stat limits');
      return {lower, upper:statMode === 5 ? f(upper * 5) : upper};
    });
    const events = [], writes = [], acceptedMessages = [];
    let selectorAfter = selector, deferred = null, admitted = false;
    function consume(s, expansionFlag) {
      events.push({operation:'consume',selector:s,expansionFlag});
      const signedSelector = s >= 0x8000 ? s - 0x10000 : s;
      if (!(effectiveMode & 2) || !(status & 4) || (blockVital && (s === 0 || s === 1))) return;
      if (actorType !== 1 && (!(signedSelector >= (actorType === 2 ? 2 : 0)) || signedSelector >= 20)) return;
      if (signedSelector < 0 || signedSelector >= 96) throw new RangeError('Player cache selector outside the supported 96 values');
      const r = limits[s], clamp = v => Math.max(r.lower, boundStatus & 14 ? v : Math.min(r.upper, v));
      const current = !alternate && actorType === 1 ? clamp(values[s]) : values[s];
      const reference = flags & 1 && (s === 2 || s === 3)
          ? number(typeof options.percentageReference === 'function' ? options.percentageReference(s, current, values.slice()) : undefined, 'independent attack/hit reference')
          : current;
      const changed = change(current,amount,!!(flags & 1),reference),delta = changed.delta;
      let next = changed.next;
      if (actorType === 1 && s >= 24 && s <= 27) next = Math.max(0, Math.min(100, next));
      events.push({operation:'write',selector:s,valueBits:floatBits(next)});
      const stored = alternate ? Math.max(r.lower, next) : actorType === 1 ? clamp(next) : next;
      values[s] = stored;
      writes.push({selector:s,current,delta,suppliedValue:next,storedValue:stored});
      acceptedMessages.push({selector:s,amount,percentage:!!(flags & 1)});
    }
    let effectiveMode = mode;
    function deliver() {
      admitted = true;
      if (selector === 98) {
        for (let s = 0; s <= 11; s++) consume(s, 1);
        consume(21, 1);
        selectorAfter = 21;
      } else if (selector === 97) {
        for (let s = 7; s <= 11; s++) consume(s, 0);
        selectorAfter = 11;
      } else consume(selector, 0);
    }
    if (entry === 'consumer') {
      if (!targetPresent) throw new TypeError('Consumer entry requires the target actor');
      deliver();
    } else if (targetPresent && !targetBlocked) {
      effectiveMode = mode !== 0 || special || sourcePresent && actorType === 4 ? 3 : 1;
      const needsValidation = actorType === 1 || sourcePresent && sourceType === 1;
      if (needsValidation) events.push({operation:'validate'});
      if (!needsValidation || validMessage(selector, amount, flags)) {
        admitted = true;
        if (delay >= 0) events.push({operation:'identity-notice'});
        if (delay > 0) {
          // Original5ae690 copies the type8 bytes and inserts one deferred list node.
          // Acquiring actor handles and draining this queue remain external inputs.
          const payload = new Uint8Array(14), dv = new DataView(payload.buffer);
          payload[0] = 8;
          const headers = message.headerWords;
          if (!Array.isArray(headers) || headers.length !== 3) throw new TypeError('Deferred messages require three explicit header words');
          headers.forEach((v, i) => dv.setUint16(1 + i * 2, integer(v,0,0xffff,'header word'),true));
          dv.setUint16(7,selector,true); dv.setUint32(9,floatBits(amount),true); payload[13] = flags;
          deferred = {delay,mode:effectiveMode,length:14,payload:Array.from(payload,b=>b.toString(16).padStart(2,'0')).join('')};
        } else deliver();
      }
      if (mode === 0) events.push({operation:'feedback',selector:selectorAfter});
    }
    return {kind:'supplied-native-type8-delivery',events,values,writes,acceptedMessages,selectorAfter,deferred,admitted,effectiveMode,
      storageSelectorCount:alternate || actorType === 1 ? 96 : 20,
      deliveryControlFlowVerified:true,statCacheWritesVerified:true,liveInputsAcquired:false,
      queueDrainVerified:false,observerEffectsVerified:false,serverFinalStatsVerified:false,defaultCalculationReplacement:false};
  }
  const api = Object.freeze({evaluate,change,validMessage,floatBits,scope:'Original type8 transport, deferred payload copy, expansion and stat cache writes with explicit actor inputs; inactive UI/action observer.',
    defaultCalculationReplacement:false,queueDrainVerified:false,liveInputsAcquired:false});
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MOE_CLIENT_NATIVE_STAT_DELIVERY_REFERENCE = api;
})(globalThis);
