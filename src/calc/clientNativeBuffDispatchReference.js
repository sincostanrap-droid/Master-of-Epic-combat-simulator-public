(function(root) {
  'use strict';
  const f = Math.fround, bitsBuffer = new ArrayBuffer(4), bitsView = new DataView(bitsBuffer);
  function uint(v, label) {
    if (!Number.isInteger(v) || v < 0 || v > 0xffffffff) throw new RangeError('Invalid ' + label);
    return v;
  }
  function float(bits) { bitsView.setUint32(0,uint(bits,'float bits'),true); return bitsView.getFloat32(0,true); }
  function bits(v) { bitsView.setFloat32(0,v,true); return bitsView.getUint32(0,true); }
  function normalize(input) {
    const p = {...input};
    if (!Array.isArray(p.sourceWords) || p.sourceWords.length !== 4) throw new TypeError('Expected four source identity words');
    p.sourceWords.forEach(v=>uint(v,'source identity word'));
    p.sourceThirdWord=p.sourceWords[2];
    if (!Array.isArray(p.effects) || p.effects.length > 10) throw new TypeError('Expected up to ten decoded effects');
    for (const key of ['id','sourceThirdWord','sourceStatusByte','targetStatus','sourceStatus','world','environment',
      'actorFlags278','actorFlags164','definitionFlags','interval','fieldC0','fieldC4','phaseByte','mode','fourth',
      'precheck','handlerResult','targetVirtualFlags','sourceVirtualFlags']) uint(p[key],key);
    if (p.id > 65535 || p.phaseByte > 255 || p.sourceStatusByte > 255) throw new RangeError('Invalid record byte/ID');
    for (const key of ['scaleRaw','offsetRaw']) if (!Number.isInteger(p[key]) || p[key] < -32768 || p[key] > 32767) throw new RangeError('Invalid signed record word');
    for (const key of ['definitionResolved','sourceResolved','executeStatHandlers','sourceIsTarget','fixedBuffCollectionEmpty'])
      if (typeof p[key] !== 'boolean') throw new TypeError('Expected explicit ' + key);
    return p;
  }
  // Original560cc0 target selection and effect eligibility, not the separate presentation precheck.
  function gate(p,e,index,source) {
    const flags = e.flags ?? 0, reversed = !!(p.definitionFlags & 0x400);
    let first, second;
    if (flags & 1) first = second = source;
    else if (!!(flags & 2) === reversed) { first = source; second = 'target'; }
    else { first = 'target'; second = source; }
    const status = role => role === 'target' ? p.targetStatus : role === 'source' ? p.sourceStatus : 0;
    if (!(flags & 0x1f30)) return {first,second,blocked:index !== 0 || e.kind !== 0};
    let mask = 0;
    if (!first || !second) mask = 0x20;
    else {
      const a = status(first), b = status(second), world = p.world === 1;
      if ((flags & 0x30) === 0x30) mask = 0x30;
      else if ((a & 1) && (b & 1)) {
        if (flags & 0x20) { if (!world && !((a & 2) && (b & 2))) mask = 0x20; }
        else if (world || ((a & 2) && (b & 2))) mask = 0x10;
      } else if (flags & 0x20) mask = 0x20;
      if ((flags & 0x300) === 0x300) mask |= 0x300;
      else if (((flags & 0x100) && world) || ((flags & 0x200) && !world)) return {first,second,blocked:true};
      if ((flags & 0xc00) === 0xc00) mask |= 0x300;
      else {
        const inside = p.environment >= 4 && p.environment <= 21;
        if (((flags & 0x400) && inside) || ((flags & 0x800) && !inside)) return {first,second,blocked:true};
      }
      if ((flags & 0x1000) && !(p.actorFlags278 & 4)) return {first,second,blocked:true};
    }
    if (!(mask & flags) || ((flags & 4) && first && first === second) || !p.phaseByte) return {first,second,blocked:true};
    const phase = p.phaseByte & 3;
    const phase2OnlyBlocked = phase === 2 && (!(p.fieldC0 > 0 && p.fieldC0 < 0x80000000 || p.fieldC4 > 0 && p.fieldC4 < 0x80000000) || (p.interval | 0) <= 1 || !(flags & 0x40));
    return {first,second,blocked:phase2OnlyBlocked};
  }
  // Shared with numerical reporting: this selects the handler mode only.
  // Target/phase gating and fallback handler results remain separate.
  function handlerMode(entry, effect, mode) {
    if (!entry || entry[2] || !entry[4] || !(mode & entry[1])) return {selected:false,modeType:null};
    const modeType = ((effect.flags ?? 0) & 0x80) && !entry[8] ? effect.modeOverride ?? 0 : entry[6];
    const selected = modeType === 0 || modeType === 1 && !!(mode & 4) || modeType === 2 && !(mode & 4) || modeType === 3 && mode === 7;
    return {selected,modeType};
  }
  function evaluate(input, registration, extension) {
    const p = normalize(input), rows = registration?.records ?? registration;
    if (!Array.isArray(rows) || rows.length !== 284 || rows.some(r=>!Array.isArray(r)||r.length!==10)) throw new TypeError('Expected original 284-row dispatch registration');
    const events = [], identity = p.sourceWords.slice();
    let targetMask = 0, sourceMask = 0, source = null, queueCount = 0;
    const finish = () => ({events,actorFlags164:(p.actorFlags164 | targetMask)>>>0,sourceFlags164:source ? sourceMask>>>0 : 0,
      sourceIdentityAfter:identity,queueCount,dispatchControlFlowVerified:true,
      messageDeliveryVerified:false,abilityUpdateEffectsVerified:false,allHandlersVerified:false,liveInputsAcquired:false});
    if (!p.definitionResolved || p.fourth || !(p.phaseByte & 3)) return finish();
    if (identity.some(Boolean)) {
      events.push({operation:'source-lookup'});
      if (p.sourceResolved && (p.sourceStatusByte & 4)) source = p.sourceIsTarget ? 'target' : 'source';
    }
    if (!identity.some(Boolean) || !p.sourceResolved) {
      if (p.sourceThirdWord !== 1) {
        if (p.definitionFlags & 0x100000) identity.fill(0);
        else { if (p.id > 0 && p.id < 8332) events.push({operation:'remove',id:p.id}); return finish(); }
      } else if (p.definitionFlags & 0x200000) {
        if (p.id > 0 && p.id < 8332) events.push({operation:'remove',id:p.id});
        return finish();
      }
    }
    queueCount = 1;
    events.push({operation:'precheck'});
    if (p.precheck) { queueCount = 0; return finish(); }
    function finalize() {
      events.push({operation:'finalize'});
      if ((p.sourceIsTarget ? p.targetVirtualFlags : p.sourceVirtualFlags) & 0x200000) sourceMask &= 0xfdff7ff3;
      if (p.sourceIsTarget && source) targetMask |= sourceMask;
      if (p.targetVirtualFlags & 0x200000) targetMask &= 0xfdff7ff3;
    }
    const effects = p.effects.length ? p.effects : [{kind:0,flags:0,amountBits:0}];
    for (let index=0;index<effects.length;index++) {
      const e=effects[index]; uint(e.kind,'effect kind'); uint(e.flags??0,'effect flags');
      uint(e.amountBits??0x3f800000,'effect amount bits');
      uint(e.selector??3,'effect selector'); uint(e.modeOverride??0,'effect mode override');
      const selected=gate(p,e,index,source), entry=rows[e.kind];
      if (selected.blocked || !entry) continue;
      if (entry[2]) { if (selected.second === 'target') targetMask |= entry[2]; else sourceMask |= entry[2]; continue; }
      if (!entry[4]) continue;
      for (const modeBit of [1,2]) {
        if (!(p.mode & modeBit) || entry[1] !== modeBit) continue;
        const fallback = !handlerMode(entry,e,p.mode).selected;
        let result = entry[7];
        if (!fallback) {
          events.push({operation:'handler',address:'0x'+entry[4].toString(16),kind:e.kind,owner:'target',mode:p.mode,
            phaseByte:p.phaseByte,firstActor:selected.first,secondActor:selected.second});
          const nativeStat = p.executeStatHandlers && (entry[4]===0x561ef0 || entry[4]===0x563740);
          if (nativeStat) {
            if (entry[4]===0x561ef0 && !p.fixedBuffCollectionEmpty && typeof extension?.fixedMessageFlags !== 'function') throw new TypeError('Fixed message producer requires an explicitly empty Buff collection');
            const amount=float(e.amountBits??0x3f800000), scale=f(p.scaleRaw/256);
            if (!Number.isFinite(amount)) throw new RangeError('Invalid stat message amount');
            const offset=f(p.offsetRaw/256) * (amount < 0 ? -1 : 1);
            // Original x87 retains the product until the final float32 message write.
            const value=bits(amount*scale+offset);
            const flags=entry[4]===0x563740?1:!p.fixedBuffCollectionEmpty?extension.fixedMessageFlags(p,e):0;
            if (entry[4]===0x561ef0 && flags!==0 && flags!==2) throw new RangeError('Invalid fixed stat message flags');
            events.push({operation:'message',type:8,source:selected.first,target:selected.second,
              selector:(e.selector??3)&65535,amountBits:value,flags,mode:(~(p.mode>>>2))&1});
            result=1;
          } else result=p.handlerResult;
        }
        if (result===3) { queueCount=0; finalize(); return finish(); }
        if (result!==2) break;
      }
    }
    finalize(); queueCount=0;
    return finish();
  }
  function statMessages(result, target='target') {
    if (!['target','source'].includes(target)) throw new RangeError('Invalid recipient');
    return result.events.filter(e=>e.operation==='message'&&e.type===8&&e.target===target)
      .map(e=>({selector:e.selector,amount:float(e.amountBits),percentage:!!(e.flags&1)}));
  }
  function evaluateRecord(record, definition, context, registration) {
    if (!record || !definition || record.id !== definition.id) throw new TypeError('Expected matching runtime record and definition IDs');
    const signedWord=(v,label)=>{uint(v,label);if(v>65535)throw new RangeError('Invalid '+label);return v<<16>>16;};
    return evaluate({...context,...definition,sourceWords:record.sourceIdentity,phaseByte:record.byte2D,
      scaleRaw:signedWord(record.multiplierWord,'multiplier word'),offsetRaw:signedWord(record.additiveWord,'additive word')},registration);
  }
  const api=Object.freeze({evaluate,evaluateRecord,statMessages,handlerMode,dispatchControlFlowVerified:true,allHandlersVerified:false,
    defaultCalculationReplacement:false,
    scope:'Original5608e0 to virtual28/57afc0 with original284 dispatch registration and 560cc0 eligibility. Actor resolution/status, presentation precheck, other handlers and message delivery are explicit boundaries. Kind41 empty collection and kind147 original type8 message generation only; no final character or server claim.'});
  if (typeof module!=='undefined'&&module.exports) module.exports=api;
  else root.MOE_CLIENT_NATIVE_BUFF_DISPATCH_REFERENCE=api;
})(globalThis);
