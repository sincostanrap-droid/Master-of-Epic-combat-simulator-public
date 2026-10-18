(function(root) {
  'use strict';
  const common = typeof module !== 'undefined' && module.exports;
  const slots = common ? require('./clientNativeBuffSlotReference.js') : root.MOE_CLIENT_NATIVE_BUFF_SLOT_REFERENCE;
  function uint(n, label) {
    if (!Number.isInteger(n) || n < 0 || n > 0xffffffff) throw new RangeError('Invalid ' + label);
    return n;
  }
  function int(n, label) {
    if (!Number.isInteger(n) || n < -2147483648 || n > 2147483647) throw new RangeError('Invalid ' + label);
    return n;
  }
  function index(registry) {
    const rows = Array.isArray(registry) ? registry : registry?.records;
    if (!Array.isArray(rows)) throw new TypeError('Expected activation definition registry');
    const map = new Map();
    for (const d of rows) {
      uint(d.id, 'runtime definition ID');
      if (map.has(d.id)) throw new RangeError('Duplicate runtime definition ID');
      for (const key of ['actionType','definitionClass','interval','mask','effectFlags']) uint(d[key], key);
      if (typeof d.hasKind110 !== 'boolean') throw new TypeError('Expected explicit kind110 membership');
      map.set(d.id, d);
    }
    return map;
  }
  function activationParameters(row, definition, flags) {
    const marked=!!(row.flagByte & 1), repeating=definition.actionType===5;
    const interval=marked ? (flags & 0x1000000 ? 20 : 10) : definition.interval;
    const remaining=(!marked && !repeating && (flags & 0x4000000) && definition.definitionClass===1)
      ? (row.duration + row.remainingDuration) | 0 : row.duration;
    return {interval,remaining};
  }
  function evaluate(state, context, registry) {
    if (state?.idDomain && state.idDomain !== 'runtime-table-index') throw new TypeError('Expected runtime-table-index Buff IDs');
    let s = slots.snapshot(state);
    const lookup = index(registry);
    const flags = uint(context.actorFlags, 'actor flags');
    const elapsed = uint(context.elapsed, 'elapsed word') | 0;
    const filter = uint(context.filterMask, 'filter mask');
    const events = [];
    if (s.containerFlag !== 1) for (let i=0; i<24 && s.slots[i].id; i++) {
      const row = s.slots[i], d = lookup.get(row.id);
      if (!d) continue; // Missing definition does not end the native sweep.
      for (const key of ['duration','remainingDuration']) int(row[key], key);
      uint(row.field0C, 'record accumulator');
      uint(row.byte2D, 'record phase');
      const marked = !!(row.flagByte & 1), repeating = d.actionType === 5;
      const preserveDuration = !marked && !repeating && d.hasKind110;
      const parameters=activationParameters(row,d,flags);
      row.field30=parameters.interval;
      const mask = ((marked ? 0x40 : d.mask) & filter) >>> 0;
      const remaining=parameters.remaining;
      if (mask || (remaining <= 0 && !repeating)) {
        events.push({operation:'expiry',slot:i,mask});
        // Callback effects are supplied as no-ops in the original oracle.
        // The original container guard is checked after the callback too.
        events.push({operation:'remove-notification',slot:i});
        s = slots.removeAt(s, i);
        i--;
        continue;
      }
      const interval = row.field30 | 0;
      row.byte2D = 0;
      if (interval === 1) {
        if (!marked) row.byte2D = 1;
        if (!preserveDuration) row.duration = (row.duration - elapsed) | 0;
      } else if (interval > 1) {
        if ((d.effectFlags & 0x400) && !marked) row.byte2D = 2;
        row.field0C = (row.field0C + elapsed) >>> 0;
        // Equality deliberately does not trigger. Only one subtraction is
        // performed even when several periods have accumulated.
        if ((row.field0C | 0) <= interval) continue;
        if (!marked) row.byte2D |= 1;
        row.field0C = (row.field0C - interval) >>> 0;
        if (!preserveDuration) row.duration = (row.duration - 1) | 0;
      }
      if (repeating && row.duration <= 0) row.duration = row.remainingDuration;
    }
    return {state:{...s,idDomain:'runtime-table-index'},events,
      activationControlFlowVerified:true,notificationEffectsVerified:false,
      callbackStateMutationsVerified:false,timingUnitVerified:false,serverAdmissionVerified:false};
  }
  const api = Object.freeze({evaluate,activationParameters,activationControlFlowVerified:true,
    notificationEffectsVerified:false,timingUnitVerified:false,
    scope:'Original772ac0 24-slot timer and phase-byte producer with explicit elapsed/filter/actor flags and native definitions. Expiry callback and notification effects are no-op boundaries; does not execute ability dispatch or imply server effect admission.'});
  if (common) module.exports = api;
  else root.MOE_CLIENT_NATIVE_BUFF_ACTIVATION_REFERENCE = api;
})(globalThis);
