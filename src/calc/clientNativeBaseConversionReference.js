(function(root) {
  'use strict';
  const stats=typeof module!=='undefined'&&module.exports?require('./clientStatCacheReference.js'):root.MOE_CLIENT_STAT_CACHE_REFERENCE;
  const slots=typeof module!=='undefined'&&module.exports?require('./clientNativeBuffSlotReference.js'):root.MOE_CLIENT_NATIVE_BUFF_SLOT_REFERENCE;
  const f=Math.fround,scale=f(.0001),pct=f(.01);
  function num(v,label) {if(v==null||v===''||!Number.isFinite(Number(v))||!Number.isFinite(f(Number(v))))throw new TypeError('Explicit '+label+' required');return f(Number(v));}
  function integer(v,label) {if(!Number.isInteger(v)||v<0||v>0x7fffffff)throw new RangeError('Invalid '+label);return v;}
  function baseInputsFromTables(table,options) {
    if(!Array.isArray(table?.races)||!table?.limits||!options?.skillIntegers)throw new TypeError('Explicit static tables and skill integers required');
    const id=options.toolRaceKey==null?integer(options.raceId,'race ID'):table.toolRaceIds?.[options.toolRaceKey];
    const race=table.races.find(r=>r.id===id);if(!race)throw new RangeError('Unknown static race');
    const source=options.baseSource;
    if(!['original-reset','decoded-current'].includes(source))throw new TypeError('Choose original-reset or decoded-current base source');
    if(source==='decoded-current'&&!options.decodedBase14)throw new TypeError('Explicit current base14 required');
    return {decodedBase14:source==='original-reset'?{...race.resetBase14}:options.decodedBase14,
      raceMultipliers:{...race.multipliers},skillIntegers:options.skillIntegers,limits:table.limits,
      mode:options.mode??0,statusByte:options.statusByte??0,actorFlags:options.actorFlags??0,worldFlags:options.worldFlags??0,
      staticRaceId:id,baseSource:source};
  }
  // Original600ba0 and600da0. These14 decoded base records and race/skill
  // providers must be supplied; no race baseline or live skill is inferred.
  function produceBase(options) {
    if(options?.staticTables)options=baseInputsFromTables(options.staticTables,options);
    if(!options?.decodedBase14||!options?.raceMultipliers||!options?.skillIntegers)throw new TypeError('Explicit base14, race coefficients and skills required');
    const bounds={limits:options.limits,mode:options.mode,statusByte:options.statusByte};
    const values={},bases={},races={};
    const actorFlags=integer(options.actorFlags??0,'actor flags'),worldFlags=integer(options.worldFlags??0,'world flags');
    const skill=s=>integer(options.skillIntegers[s],'skill integer '+s);
    for(let s=0;s<14;s++) {bases[s]=stats.query(num(options.decodedBase14[s],'base '+s),s,bounds);races[s]=num(options.raceMultipliers[s],'race multiplier '+s);}
    const routes={0:[20,f(.0003)],1:[22,f(.0003)],4:[18,f(.00002)],5:[19,scale],6:[23,scale],7:[25,scale],8:[25,scale],9:[25,scale],10:[25,scale],11:[25,scale],13:[17,f(.00015)]};
    for(let s=0;s<14;s++) {
      let v=bases[s];
      if(s===8&&(actorFlags&4)&&!(worldFlags&0x8000))v=f(v+10);
      if(routes[s])v=f(v+skill(routes[s][0])*races[s]*routes[s][1]);
      values[s]=stats.query(v,s,bounds);
    }
    // ST is separately rebuilt from field12 after the14-field pass.
    const endurance=f(skill(21)*scale);
    values[21]=stats.query(f(values[12]+endurance*races[12]*f(3)),21,bounds);
    return {values,clampedBase14:bases,staticRaceId:options.staticRaceId??null,baseSource:options.baseSource??'supplied-decoded',liveBaseRecordsVerified:false,liveSkillsVerified:false};
  }
  function collectConversions(state,definitions,world=0,context=0) {
    integer(world,'world');integer(context,'actor context');
    if(!Array.isArray(definitions))throw new TypeError('Expected original conversion definitions');
    const registry=new Map(definitions.map(d=>[d.id,d])),snapshot=slots.snapshot(state),totals={255:0,276:0,270:0};
    for(const row of snapshot.slots) {
      if(!row.id||(row.flagByte&1))continue;
      const d=registry.get(row.id);if(!d)continue;
      const subtotal={...totals};
      for(const e of d.effects) {
        if(!Object.hasOwn(subtotal,e.kind))continue;
        const flags=integer(e.flags??0,'effect flags'),a=!!(flags&0x100),b=!!(flags&0x200);
        if(a!==b&&((a&&world===1)||(b&&world!==1)))continue;
        if((flags&0x1000)&&!(context&4))continue;
        subtotal[e.kind]+=num(e.value,'conversion percentage')*pct;
      }
      for(const kind of [255,276,270])totals[kind]=f(subtotal[kind]);
    }
    return totals;
  }
  // Original5772a0. Stat getter results and actor/world/action state are explicit
  // providers. The mode4 action paths use skill24; runtime flags retain their
  // numeric names because action-state acquisition/semantics are not complete.
  function produceMovement(options) {
    if(!options?.resolvedStats||!Array.isArray(options.definitions))throw new TypeError('Explicit movement stats and definitions required');
    const state=slots.snapshot(options.state),definitions=options.definitions;
    const actorType=integer(options.actorType??1,'actor type'),actorFlags=integer(options.actorFlags??0,'movement actor flags');
    const context=integer(options.context??0,'actor context'),world=integer(options.world??0,'world'),mapId=integer(options.mapId,'map ID');
    const mode=integer(options.mode,'movement mode'),actionFlags=integer(options.actionFlags,'action definition flags');
    if(typeof options.actionPresent!=='boolean'||typeof options.slowAction!=='boolean')throw new TypeError('Explicit movement action state required');
    const multiplier=num(options.multiplier,'movement multiplier'),swimMultiplier=num(options.swimMultiplier,'swimming multiplier');
    const swimming=integer(options.swimSkillInteger,'swimming skill integer');
    const stat=s=>num(options.resolvedStats[s],'resolved movement stat '+s);
    const selected={},steps=[];
    if(actorFlags&0x2000004)return {value:0,referenceValue:0,selected,steps,earlyZero:true,liveStateAcquisitionVerified:false,serverMovementVerified:false};
    let value=f(stat(14)*multiplier);
    steps.push({stage:'base14-times-actor5c8',value});
    if(actorType===1&&(context&4)) {value=f(stat(72)*pct*value);steps.push({stage:'stat72-context4',value});}
    const movement101=slots.firstKind(state,definitions,101);
    if(mode===4) {
      if(!(actionFlags&4)&&!movement101) {
        if(!options.actionPresent||(actionFlags&0x800000))return {value:0,referenceValue:0,selected,steps,earlyZero:true,liveStateAcquisitionVerified:false,serverMovementVerified:false};
        value=f(value*f(.1));steps.push({stage:'mode4-action-10percent',value});
      } else if(options.slowAction) {
        value=f(value*f(.1));steps.push({stage:'mode4-slow-10percent',value});
      } else if(options.actionPresent&&!(actionFlags&0x800000)) {
        const fraction=(actorType&5)?Math.min(1,swimming*2.000000165480742e-7+f(.4)):f(.4);
        value=f(fraction*swimMultiplier*value);steps.push({stage:'mode4-swimming24',fraction,value});
      }
    }
    for(const [kind,s] of [[263,6],[266,5]]) {
      const row=slots.firstKind(state,definitions,kind);selected[kind]=row;
      if(!row)continue;
      const e=row.effect,flags=integer(e.flags??0,'movement effect flags'),a=!!(flags&0x100),b=!!(flags&0x200);
      if(a!==b&&((a&&world===1)||(b&&world!==1)))continue;
      if((flags&0x1000)&&!(context&4))continue;
      const source=stat(s),amount=source*num(e.value,'movement conversion percentage')*pct;
      //263 stores tofloat32 before266.266 stays wide until caps/return.
      value=kind===263?f(value+amount):value+amount;
      steps.push({stage:'conversion'+kind,definitionId:row.definitionId,source,amount,value});
    }
    value=Math.max(0,value);
    if((actorType&3)&&world===1)value=Math.min(value,f(120.00000762939453));
    if((actorType&1)&&[0xc1c,0x817].includes(mapId))value=Math.min(value,100);
    return {value:f(value),referenceValue:value,selected,steps,earlyZero:false,liveStateAcquisitionVerified:false,serverMovementVerified:false};
  }
  // Original5fa530 with an explicitly resolved ordinary weapon reference.
  // Weapon-slot classification, empty fallback and movement-speed production
  // are external inputs.255/276/270 affect attack references, not hit.
  function reference(options) {
    if(!options||![2,3].includes(options.selector))throw new RangeError('Expected attack/hit selector');
    const selector=options.selector,cache=num(options.cachedValue,'cached attack/hit'),actorType=integer(options.actorType??1,'actor type');
    const totals=collectConversions(options.state,options.definitions,options.world??0,options.context??0);
    const present=Object.fromEntries([255,276,270].map(k=>[k,!!slots.firstKind(options.state,options.definitions,k)]));
    const steps=[];let value=Math.max(0,cache);
    if(actorType===1) {
      value=Math.max(value,num(options.ordinaryValue,'resolved ordinary weapon value'));
      if(selector===2)for(const [kind,key] of [[255,'magic'],[276,'resolvedMovementSpeed'],[270,'drunk']])if(present[kind]) {
        let source=num(options[key],key);
        //5fa530 consumes5772a0's x87 return without an interveningfloat32
        //store. The technique constructor does store that source tofloat32.
        if(kind===276&&options.resolvedMovementReferenceValue!=null) {
          source=Number(options.resolvedMovementReferenceValue);
          if(!Number.isFinite(source)||!Number.isFinite(f(source)))throw new TypeError('Explicit wide movement reference required');
        }
        const before=value;
        value=f(value+source*totals[kind]);steps.push({kind,source,fraction:totals[kind],before,value});
      }
    }
    return {value,totals,present,steps,liveEligibilityVerified:false,weaponSelectionEvaluated:false,movementProductionEvaluated:false,serverFinalDamageVerified:false};
  }
  const api=Object.freeze({baseInputsFromTables,produceBase,produceMovement,collectConversions,reference,defaultCalculationReplacement:false,
    scope:'Original14-base/ST,5772a0 movement,255/276/270 collectors and attack reference. Explicit decoded base/race/skill/cache/actor/world/action and weapon providers; no live acquisition, full activation or server result.'});
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MOE_CLIENT_NATIVE_BASE_CONVERSION_REFERENCE=api;
})(globalThis);
