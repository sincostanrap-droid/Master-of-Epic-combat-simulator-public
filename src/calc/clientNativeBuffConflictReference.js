(function(root) {
  'use strict';
  const slots=typeof module!=='undefined'&&module.exports?
    require('./clientNativeBuffSlotReference.js'):root.MOE_CLIENT_NATIVE_BUFF_SLOT_REFERENCE;
  function uint(n,max,label) {
    if(!Number.isInteger(n)||n<0||n>max)throw new RangeError('Invalid '+label);
    return n;
  }
  function int(n,label) {
    if(!Number.isInteger(n)||n< -2147483648||n>2147483647)throw new RangeError('Invalid '+label);
    return n;
  }
  function identity(value) {
    if(!Array.isArray(value)||value.length!==4)throw new TypeError('Expected four explicit native source identity words');
    return value.map(n=>uint(n,0xffffffff,'source identity word'));
  }
  function stateSnapshot(state) {
    if(state?.idDomain&&state.idDomain!=='runtime-table-index')throw new TypeError('Expected runtime-table-index Buff IDs');
    return {...slots.snapshot(state),idDomain:'runtime-table-index'};
  }
  function registryIndex(registry) {
    const records=Array.isArray(registry)?registry:registry?.records;
    if(!Array.isArray(records))throw new TypeError('Expected native conflict definition registry');
    const map=new Map();
    for(const d of records) {
      const id=uint(d?.id,8332,'runtime definition ID');
      if(map.has(id))throw new TypeError('Duplicate runtime definition ID '+id);
      map.set(id,d);
    }
    return id=>{
      const d=map.get(id);
      if(!d)throw new RangeError('Missing native conflict definition '+id);
      return d;
    };
  }
  // Original5a7df0 has a -10 sentinel and 32-bit signed negation. INT_MIN
  // stays negative; Math.abs(INT_MIN) would change the comparison behavior.
  function strength(definition) {
    const n=int(definition?.fieldF0,'native definition fieldF0');
    return n===-10?0:n<0?(-n|0):n;
  }
  function resolveConflict(state,query,registry) {
    const s=stateSnapshot(state);
    const group=uint(query?.group,65535,'conflict group');
    const incomingStrength=int(query?.strength,'incoming strength');
    const source=identity(query?.sourceIdentity);
    const unchanged=reason=>({state:s,result:1,matchedSlot:null,existingStrength:null,reason,notifications:[]});
    if(!group)return unchanged('group-zero');
    if(s.containerFlag===1)return unchanged('container-disabled');
    const lookup=registryIndex(registry);
    // Unlike firstKind, original772d20 continues after an empty position and
    // accepts registry row8332. Only the FIRST qualifying same-group row acts.
    for(let slot=0;slot<24;slot++) {
      const row=s.slots[slot];
      if(!row.id||row.id>8332)continue;
      const d=lookup(row.id);
      if(!(int(d.fieldC0,'native definition fieldC0')>0||int(d.fieldC4,'native definition fieldC4')>0))continue;
      if(uint(d.conflictGroup,65535,'definition conflict group')!==group||row.flagByte&1)continue;
      const existingStrength=strength(d);
      const rejected=reason=>({state:s,result:0,matchedSlot:slot,existingStrength,reason,notifications:[]});
      if(incomingStrength<existingStrength)return rejected('weaker');
      if(incomingStrength===existingStrength) {
        const existingSource=identity(row.sourceIdentity);
        if(existingSource.some((n,i)=>n!==source[i]))return rejected('equal-strength-different-source');
      }
      return {state:{...slots.removeAt(s,slot),idDomain:'runtime-table-index'},result:1,
        matchedSlot:slot,existingStrength,
        reason:incomingStrength===existingStrength?'equal-strength-same-source':'stronger',
        notifications:[{operation:'remove',slot,id:row.id}]};
    }
    return unchanged('no-matching-group');
  }
  // The call-site subset at5adff0: marked incoming records or group0 bypass
  // this gate, otherwise conflict removal happens BEFORE native storage.
  // Actor validity, ownership/world conditions and packet decoding precede
  // this slice and must be established by the caller; this is not admission.
  function insertAfterConflict(state,incoming,options) {
    if(!incoming||incoming.id===undefined)throw new TypeError('Expected explicit incoming Buff record');
    const s=stateSnapshot(state);
    const id=uint(incoming.id,8332,'incoming runtime definition ID');
    const flag=uint(incoming.flagByte??0,255,'record flag');
    const d=registryIndex(options?.conflictRegistry)(id);
    const group=uint(d.conflictGroup,65535,'definition conflict group');
    const conflictCalled=!!group&&!(flag&1);
    const conflict=conflictCalled?resolveConflict(s,{group,strength:strength(d),
      sourceIdentity:incoming.sourceIdentity},options.conflictRegistry):null;
    if(conflict?.result===0)return {state:conflict.state,result:0,conflictCalled,conflict,storage:null,
      notifications:conflict.notifications};
    const storage=slots.insert(conflict?.state??s,incoming,options?.storageRegistry);
    return {state:storage.state,result:storage.result,conflictCalled,conflict,storage,
      notifications:[...(conflict?.notifications??[]),...storage.notifications]};
  }
  const api=Object.freeze({strength,resolveConflict,insertAfterConflict,
    conflictGateVerified:true,receiverAdmissionVerified:false,liveSnapshotVerified:false,
    defaultCalculationReplacement:false,
    scope:'Original772d20 conflict gate and its documented call-site subset followed by native773450 storage, using explicit runtime definitions and source identities. Original actor callbacks, receiver preconditions, packet decoding, feedback and server admission remain supplied or unverified.'});
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.MOE_CLIENT_NATIVE_BUFF_CONFLICT_REFERENCE=api;
})(globalThis);
