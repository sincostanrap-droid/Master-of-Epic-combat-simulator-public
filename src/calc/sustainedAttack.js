/* Expected damage over active time, not a packet/animation timeline.
   All Buffs start active. Refreshes are serial, earliest expiry first, with
   registration order breaking ties. Unknown timings never become zero. */
(function(global){
  function number(value){return value!==null&&value!==undefined&&String(value).trim()!==''&&Number.isFinite(+value)?+value:null;}
  // Public catalog IDs checked against the five TMG0 spell definitions.
  const castBases = new Map([['vigor',189],['quickening',171],['enlighten',171],['holy-guard',241],['reviewed-manual-977',297]]);
  function normalCastWindow(ruleId, concentration) {
    const base = castBases.get(ruleId);
    const points = number(concentration);
    if (base === undefined || points === null || points < 0) return null;
    const f = Math.fround;
    const skill = Math.min(100, f(Math.round(points * 10000) * f(.0001)));
    const factor = 1 - f(skill * f(.0016));
    const encoded = Math.trunc(factor * 4096);
    const ticks = Math.trunc(f(base * encoded / 4096));
    return {ticks, seconds:ticks * .016};
  }
  function profile(row){
    return {mode:['refresh','normalCast','once','maintained'].includes(row.sustainMode)?row.sustainMode:'refresh',
      duration:number(row.sustainDurationSeconds),downtime:number(row.sustainDowntimeSeconds)};
  }
  function simulate({seconds,buffs,evaluate,concentration,maxEvents=10000,includeSegments=false}){
    const fail=reasons=>({supported:false,reasons,totalDamage:null,averageDps:null});
    if(!Number.isFinite(seconds)||seconds<=0)return fail(['戦闘時間は正の秒数で指定してください']);
    const reasons=[],rows=buffs.map((buff,index)=>{
      const p=profile(buff),duration=p.duration??number(buff.durationSeconds);
      if(p.mode==='normalCast'){
        p.downtime=normalCastWindow(buff.catalogRuleId,concentration)?.seconds??null;
        if(p.downtime===null && duration<seconds)reasons.push(buff.name+'：通常詠唱の計算には対応する魔法と集中力が必要です');
        p.mode='refresh';
      }
      if(p.mode!=='maintained'&&!(duration>0))reasons.push(buff.name+'：効果時間が必要です');
      if(p.mode==='refresh'&&duration<seconds&&!(p.downtime!==null&&p.downtime>=0))reasons.push(buff.name+'：かけ直しで攻撃を止める秒数が必要です');
      return {index,name:buff.name,mode:p.mode,duration,downtime:p.downtime,expires:p.mode==='maintained'?Infinity:duration,refreshes:0};
    });
    if(reasons.length)return fail(reasons);
    let time=0,totalDamage=0,downtime=0,events=0;
    const cache=new Map(),segments=[];
    function damageUntil(end){
      if(end<=time)return null;
      const active=rows.filter(r=>r.expires>time).map(r=>r.index),key=active.join(',');
      if(!cache.has(key))cache.set(key,evaluate(active));
      const value=cache.get(key);
      if(!value?.supported||!Number.isFinite(value.dps)||value.dps<0)return fail(value?.reasons?.length?value.reasons:['Buffが切れた構成のDPSを計算できません']);
      totalDamage+=(end-time)*value.dps;
      if(includeSegments)segments.push({start:time,end,dps:value.dps,active});time=end;return null;
    }
    while(time<seconds){
      if(++events>maxEvents)return fail(['更新回数が多すぎます。効果時間と戦闘時間を確認してください']);
      const expired=rows.filter(r=>r.mode==='refresh'&&r.expires<=time).sort((a,b)=>a.expires-b.expires||a.index-b.index)[0];
      if(expired){
        const end=Math.min(seconds,time+expired.downtime);
        downtime+=end-time;time=end;
        if(time>=seconds)break;
        expired.expires=time+expired.duration;expired.refreshes++;continue;
      }
      const end=Math.min(seconds,...rows.filter(r=>r.expires>time).map(r=>r.expires));
      const error=damageUntil(end);if(error)return error;
    }
    return {supported:true,reasons:[],seconds,totalDamage,averageDps:totalDamage/seconds,
      downtimeSeconds:downtime,attackSeconds:seconds-downtime,refreshes:rows.map(r=>({name:r.name,count:r.refreshes})),
      evaluations:cache.size,segments};
  }
  global.MOESustainedAttack=Object.freeze({number,profile,normalCastWindow,simulate});
})(globalThis);
