(function(root) {
  'use strict';
  const count=24;
  const optionalWords={statusByte:255,multiplierWord:65535,additiveWord:65535,field0C:0xffffffff,
    auxByte:255,byte2D:255,field30:0xffffffff};
  function uint(value,fallback,max,label) {
    const n=value??fallback;
    if(!Number.isInteger(n)||n<0||n>max)throw new RangeError('Invalid '+label);
    return n;
  }
  function record(row) {
    if(row==null)return {id:0,flagByte:0,marker:0};
    const value={id:uint(row.id,0,65535,'Buff ID'),flagByte:uint(row.flagByte,0,255,'record flag'),
      marker:uint(row.marker,0xffffffff,0xffffffff,'record marker')};
    if(row.sourceIdentity!==undefined) {
      if(!Array.isArray(row.sourceIdentity)||row.sourceIdentity.length!==4)
        throw new TypeError('Expected four native source identity words');
      value.sourceIdentity=row.sourceIdentity.map(n=>uint(n,undefined,0xffffffff,'source identity word'));
    }
    for(const [key,max] of Object.entries(optionalWords))if(row[key]!==undefined)
      value[key]=uint(row[key],undefined,max,'record '+key);
    for(const key of ['duration','remainingDuration'])if(row[key]!==undefined) {
      if(!Number.isInteger(row[key])||row[key]< -2147483648||row[key]>2147483647)
        throw new RangeError('Invalid record '+key);
      value[key]=row[key];
    }
    return value;
  }
  // Slot order is supplied from the native record array. UI row order is not
  // an equivalent input. Optional sourceIdentity is record+14..20, preserved
  // by original770e20 and compaction; unspecified identity remains unknown.
  function snapshot(state) {
    if(!state||!Array.isArray(state.slots)||state.slots.length>count)throw new TypeError('Expected at most24 native Buff slots');
    return {containerFlag:uint(state.containerFlag,0,255,'container byte'),
      slots:Array.from({length:count},(_,i)=>record(state.slots[i]))};
  }
  function firstKind(state,definitions,kind) {
    const s=snapshot(state);
    if(!Number.isInteger(kind))throw new RangeError('Invalid effect kind');
    if(s.containerFlag===1||kind<0||kind>=284)return null;
    if(!Array.isArray(definitions))throw new TypeError('Expected decoded definitions');
    const registry=new Map(definitions.map(d=>[d.id,d]));
    for(let slot=0;slot<count;slot++) {
      const row=s.slots[slot],d=registry.get(row.id);
      if(!row.id)return null; // Original7721f0 stops at the first empty slot.
      if(!d)continue;
      const effect=d.effects.find(e=>e.kind===kind);
      // Original7721f0 does NOT test record+0x24 bit0;774280 does NOT test
      // world/context flags.247/275 collectors use a different filter.
      if(effect)return {slot,definitionId:d.id,name:d.name,effect,record:row};
    }
    return null;
  }
  function insertNonFull(state,incoming) {
    const s=snapshot(state),item=record(incoming);
    if(s.slots.every(r=>r.id))throw new RangeError('Full24-slot eviction is outside this reference');
    const slot=s.slots.findIndex(r=>!r.id||r.id===item.id&&!((r.flagByte^item.flagByte)&1));
    const previous=s.slots[slot];
    s.slots[slot]={...item,flagByte:(previous.flagByte&254)|(item.flagByte&1)};
    s.containerFlag=0;
    return {state:s,slot,result:1};
  }
  function removeAt(state,index) {
    const s=snapshot(state);
    index=uint(index,undefined,23,'slot index');
    if(s.containerFlag===1)return s;
    let at=index;
    while(at<23&&s.slots[at+1].id){s.slots[at]={...s.slots[at+1]};at++;}
    const cleared={id:0,flagByte:0,marker:0xffffffff};
    for(const key of [...Object.keys(optionalWords),'duration','remainingDuration'])
      if(s.slots.some(r=>r[key]!==undefined))cleared[key]=0;
    if(s.slots.some(r=>r.sourceIdentity!==undefined))cleared.sourceIdentity=[0,0,0,0];
    s.slots[at]=cleared;
    s.containerFlag=s.slots.some(r=>r.id)?0:1;
    return s;
  }
  function removeId(state,id) {
    const s=snapshot(state);id=uint(id,undefined,65535,'Buff ID');
    let slot=-1;
    if(s.containerFlag!==1)for(let i=0;i<count&&s.slots[i].id;i++)if(s.slots[i].id===id){slot=i;break;}
    return slot<0?{state:s,slot:null,result:0}:{state:removeAt(s,slot),slot,result:1};
  }
  function collectorRows(state) {
    return snapshot(state).slots.filter(r=>r.id).map(r=>({enabled:!(r.flagByte&1),clientBuffDefinitionId:String(r.id)}));
  }
  // Native774720/775430 index TMG0 by row_index. Catalog definitions use a
  // different lookup_key. Keep that distinction explicit in the new API.
  function runtimeState(state) {
    if(state?.idDomain && state.idDomain!=='runtime-table-index')
      throw new TypeError('Expected runtime-table-index Buff IDs');
    return {...snapshot(state),idDomain:'runtime-table-index'};
  }
  function registryIndex(registry) {
    const records=Array.isArray(registry)?registry:registry?.records;
    if(!Array.isArray(records))throw new TypeError('Expected native definition registry');
    const index=new Map();
    for(const d of records) {
      const id=uint(d?.id,undefined,8332,'runtime definition ID');
      if(index.has(id))throw new TypeError('Duplicate runtime definition ID '+id);
      index.set(id,d);
    }
    return id=>{
      const d=index.get(id);
      if(!d)throw new RangeError('Missing runtime definition '+id);
      return d;
    };
  }
  function priority(d) {
    const type=uint(d.actionType,undefined,65535,'native action type');
    const cls=uint(d.definitionClass,undefined,0xffffffff,'native definition class');
    return (type===5?0:20)+(cls===2?3:cls===1?2:cls===3?1:0);
  }
  function fieldF0(d) {
    if(!Number.isInteger(d.fieldF0)||d.fieldF0< -2147483648||d.fieldF0>2147483647)
      throw new RangeError('Invalid native definition fieldF0');
    return d.fieldF0;
  }
  function candidate(s,lookup) {
    if(s.containerFlag===1)return null;
    let chosen=null;
    // Original7722b0 scans all24 positions, including positions after holes.
    // It excludes8332, although the direct registry getter accepts that row.
    for(let slot=0;slot<count;slot++) {
      const row=s.slots[slot];
      if(!row.id||row.id>=8332)continue;
      const definition=lookup(row.id);
      if(fieldF0(definition)<0)continue;
      const score=priority(definition);
      if(!chosen||score<chosen.priority||score===chosen.priority&&
          !(chosen.record.flagByte&1)&&(row.flagByte&1))
        chosen={slot,record:row,definitionId:definition.definitionId??null,priority:score};
    }
    return chosen;
  }
  function evictionCandidate(state,registry) {
    return candidate(runtimeState(state),registryIndex(registry));
  }
  function insert(state,incoming,registry) {
    if(!incoming||incoming.id===undefined)throw new TypeError('Expected explicit incoming Buff record');
    let s=runtimeState(state);
    const item=record(incoming),lookup=registryIndex(registry);
    let eviction=null;
    const notifications=[];
    if(s.slots.every(r=>r.id)) {
      // Original773280 first searches for this ID with bit0 CLEAR, regardless
      // of the incoming bit0. Its return does not determine insertion success.
      const unmarked=s.containerFlag!==1&&s.slots.some(r=>r.id===item.id&&!(r.flagByte&1));
      if(!unmarked&&item.id<=8332) {
        const incomingPriority=priority(lookup(item.id)),chosen=candidate(s,lookup);
        if(chosen&&(chosen.priority<incomingPriority||chosen.priority===incomingPriority&&
            (chosen.record.flagByte&1)&&!(item.flagByte&1))) {
          // Original773190 removes the first same-ID row, ignoring bit0.
          // This can differ from the position selected by7722b0.
          const removed=removeId(s,chosen.record.id);
          if(removed.result) {
            eviction={candidateSlot:chosen.slot,removedSlot:removed.slot,id:chosen.record.id,
              definitionId:chosen.definitionId,candidatePriority:chosen.priority,incomingPriority};
            notifications.push({operation:'remove',slot:removed.slot,id:chosen.record.id});
            s={...removed.state,idDomain:'runtime-table-index'};
          }
        }
      }
    }
    const slot=s.slots.findIndex(r=>!r.id||r.id===item.id&&!((r.flagByte^item.flagByte)&1));
    if(slot<0)return {state:s,slot:null,result:0,eviction,notifications};
    const previous=s.slots[slot];
    s.slots[slot]={...item,flagByte:(previous.flagByte&254)|(item.flagByte&1)};
    s.containerFlag=0;
    notifications.push({operation:'add',slot,id:item.id});
    return {state:s,slot,result:1,eviction,notifications};
  }
  function definitionSnapshot(state,registry) {
    const s=runtimeState(state),lookup=registryIndex(registry);
    return {containerFlag:s.containerFlag,idDomain:'catalog-definition-id',slots:s.slots.map(row=>{
      if(!row.id)return row;
      const id=uint(lookup(row.id).definitionId,undefined,65535,'catalog definition ID');
      if(!id)throw new RangeError('Missing catalog definition for runtime ID '+row.id);
      return {...row,id};
    })};
  }
  const api=Object.freeze({count,snapshot,firstKind,insertNonFull,removeAt,removeId,collectorRows,
    evictionCandidate,insert,definitionSnapshot,
    liveSnapshotVerified:false,fullCapacityEvictionVerified:true,admissionVerified:false,
    scope:'Native fixed24-slot query, insertion including full-capacity candidate comparison, and compaction of ID/flagByte/marker with optional decoded record fields and sourceIdentity. New insert/evictionCandidate take runtime table indices and the explicit native registry; definitionSnapshot projects them to catalog IDs for comparison APIs. Actor callback effects, reserved padding bytes, network admission, effect activation and server state are not reproduced.'});
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.MOE_CLIENT_NATIVE_BUFF_SLOT_REFERENCE=api;
})(globalThis);
