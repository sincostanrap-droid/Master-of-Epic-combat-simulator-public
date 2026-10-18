(function(root){
  'use strict';
  const common=typeof module!=='undefined'&&module.exports;
  const native=common?require('./clientNativeBuffConflictReference.js'):root.MOE_CLIENT_NATIVE_BUFF_CONFLICT_REFERENCE;
  const skillLimits=common?require('./combatResourceFormula.js'):root.MOE_COMBAT_RESOURCE_FORMULA;
  const f=Math.fround;
  function number(value,label,min=0,max=1000000){
    if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)throw new RangeError(label+'が入力範囲外です');return value;
  }
  function cost(definition,baseCost,skill){
    number(skill,'技能',0,skillLimits.skillMax);number(baseCost,'消費基値',0,10000);
    if(definition.requirements?.length!==1||!(definition.required>0))throw new Error('この技能条件の消費は接続未対応です');
    const converted=Math.round(skill*10000)*f(.0001);
    const discount=f(Math.min(f(.2),Math.max(0,(converted-definition.required)*f(.02))));
    const factor=f(1-discount),resource=definition.action_type===1||definition.flags&0x1000000?'mp':'st';
    // MP stores the cost before comparing; ST compares the unrounded remainder.
    return {resource,factor,amount:resource==='mp'?f(factor*baseCost):factor*baseCost};
  }
  function spend(resources,costs){
    const next={...resources,materials:{...(resources.materials||{})}},seen=new Set();
    for(const c of costs){
      const key=c.resource+':'+(c.id??'');if(seen.has(key))throw new Error('同一資源の消費要求が重複しています');seen.add(key);
      number(c.amount,'消費量',0,10000);
      if(c.resource==='material'){
        const current=resources.materials?.[c.id];
        if(!Number.isInteger(current)||current<0||!Number.isInteger(c.amount))throw new Error('触媒の所持数を指定してください');
        if(current<c.amount)return {ok:false,reason:'触媒不足'};
        next.materials[c.id]=current-c.amount;
      }else{
        if(!['mp','st'].includes(c.resource))throw new Error('未対応の消費資源です');
        const available=f(number(resources[c.resource],c.resource.toUpperCase(),0,c.resource==='st'?500:1000));
        const remaining=available-c.amount;if(remaining<0)return {ok:false,reason:c.resource.toUpperCase()+'不足'};
        next[c.resource]=f(remaining);
      }
    }
    return {ok:true,resources:next};
  }
  // Named skills come from the selected definition's saved eight requirement
  // slots. Unknown skill names or absent inputs are never replaced by zero.
  function costMany(definition,reference,skills){
    if(reference.unresolved||reference.moneyCost||reference.stat27Cost)throw Error('追加資源または定義照合が未対応です');
    const integers={};for(const r of reference.requirements){if(!r.name)throw Error('技能名照合が未確定です');integers[r.name]=Math.round(number(skills[r.name],r.name,0,skillLimits.skillMax)*10000);}
    const formula=common?require('./combatResourceFormula.js'):root.MOE_COMBAT_RESOURCE_FORMULA;
    const factor=formula.factor(reference.requirements,integers),resource=definition.action_type===1||definition.flags&0x1000000?'mp':'st';
    const base=number(reference.baseCost,'消費基値',0,10000),amount=resource==='mp'?f(factor*base):factor*base;
    const costs=[{resource,amount}];
    if(reference.materialId)costs.push({resource:'material',id:reference.materialId,amount:reference.materialCount});
    return {resource,amount,factor,costs};
  }
  function start(plan,caster,tick){
    number(tick,'経過フレーム');
    if(!Number.isInteger(tick)||!Number.isInteger(plan.durationTicks)||plan.durationTicks<=0)throw new Error('効果時間を確認できません');
    return {...plan,caster,startedAt:tick,endsAt:tick+plan.durationTicks};
  }
  function advance(records,tick,seconds){
    const end=tick+Math.round(number(seconds,'進める秒数',0,3600)*60);number(end,'経過フレーム');
    const expired=records.filter(r=>r.endsAt<=end).sort((a,b)=>a.endsAt-b.endsAt);
    return {tick:end,active:records.filter(r=>r.endsAt>end),expired};
  }
  function conflict(records,incoming,definitions){
    const source=caster=>{if(!['A','B'].includes(caster))throw new Error('使用者A/Bを指定してください');return [0,0,0,caster==='A'?1:2];};
    const byId=new Map(definitions.map(d=>[d.id,d]));
    const d=byId.get(incoming.definitionId);if(!d)throw new Error('競合定義なし');
    // Only explicitly known trial records participate; never invent identities
    // for the user's static Buff registrations or infer native slot ordering.
    const result=native.resolveConflict({slots:records.map(r=>{
      const old=byId.get(r.definitionId);if(!old)throw new Error('既存効果の競合定義なし');
      return {id:old.runtimeId,flagByte:0,sourceIdentity:source(r.caster)};
    })},{group:d.conflict.conflictGroup,strength:native.strength(d.conflict),sourceIdentity:source(incoming.caster)},definitions.map(d=>d.conflict));
    return {allowed:result.result===1,replaceIndex:result.matchedSlot,reason:result.reason};
  }
  const api=Object.freeze({number,cost,costMany,spend,start,advance,conflict});
  if(common)module.exports=api;else root.MOE_COMBAT_EFFECT_LIFECYCLE=api;
})(globalThis);
