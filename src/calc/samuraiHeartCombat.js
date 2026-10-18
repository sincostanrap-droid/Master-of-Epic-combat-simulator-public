(function(root){
  'use strict';
  const common=typeof module!=='undefined'&&module.exports;
  const catalog=common?require('../data/generated/wikiPlayerCatalog.generated.js'):root.MOE_WIKI_PLAYER_CATALOG;
  const timing=common?require('./effectTiming.js'):root.MOE_EFFECT_TIMING;
  const lifecycle=common?require('./combatEffectLifecycle.js'):root.MOE_COMBAT_EFFECT_LIFECYCLE;
  const attempt=common?require('./combatAttempt.js'):root.MOE_COMBAT_ATTEMPT;
  const definitions=(common?require('../data/reference/timedCombatDefinitions20261010.js'):root.MOE_TIMED_COMBAT_DEFINITIONS).records;
  const d=catalog.rows.find(r=>r.internalId===323)?.definition;
  const f=Math.fround;
  // Public ID323 / runtime row316. Saved definition+a0=38, +ec=136,
  // +f0=2. This adapter models a successful use, not the action scheduler.
  const definitionId=323,baseCost=definitions.find(r=>r.id===323).baseCost;
  function number(value,label,min=0,max=1000000){
    if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)throw new RangeError(label+'が入力範囲外です');
    return value;
  }
  function world(value){if(value!==0&&value!==1)throw new RangeError('通常／War Ageを指定してください');return value;}
  function actor(value){if(!['A','B'].includes(value))throw new RangeError('使用者A／Bを指定してください');return value;}
  function plan(input){
    if(!d||d.group!==136||d.flags!==4101)throw new Error('サムライ ハート定義の再確認が必要です');
    const skill=number(input.skill,'戦闘技術',0,255),mode=world(input.world);
    const integerSkill=Math.round(skill*10000),converted=integerSkill*f(.0001);
    const x=Math.trunc(f(converted)*16)/16;
    const durationTicks=timing.counter(d,x,mode)*d.interval;
    const effects=d.effects.filter(e=>e.kind===147&&e.selector===5&&!(e.flags&(mode===1?0x100:0x200)));
    if(effects.length!==1)throw new Error('防御力効果の選択を確認できません');
    // 605530: a single required skill, ordinary cost factor1/ST multiplier1.
    // ST sufficiency compares the extended remainder BEFORE float32 storage.
    const computedCost=lifecycle.cost(d,baseCost,skill),costFactor=computedCost.factor,cost=computedCost.amount;
    return {definitionId,skill,world:mode,defensePct:effects[0].value,durationTicks,
      durationSeconds:durationTicks/60,costST:cost,costFactor};
  }
  function create({stA=100,stB=100}={}){
    return {version:1,tick:0,casters:{A:{st:f(number(stA,'ST A',0,500))},B:{st:f(number(stB,'ST B',0,500))}},active:null,events:[]};
  }
  function snapshot(state){
    if(state?.version!==1||!Number.isInteger(state.tick))throw new TypeError('戦闘試行データの形式が不明です');
    number(state.tick,'経過フレーム');
    const casters={};for(const key of ['A','B'])casters[key]={st:f(number(state.casters?.[key]?.st,'ST '+key,0,500))};
    let active=null;
    if(state.active){
      const a=state.active,p=plan(a);
      if(a.definitionId!==definitionId||!Number.isInteger(a.startedAt)||a.startedAt<0||a.startedAt>state.tick||a.endsAt!==a.startedAt+p.durationTicks)throw new TypeError('未対応の効果レコードです');
      actor(a.caster);
      if(a.endsAt>state.tick)active={...p,caster:a.caster,startedAt:a.startedAt,endsAt:a.endsAt};
    }
    return {version:1,tick:state.tick,casters,active,events:(state.events||[]).map(e=>({...e}))};
  }
  function advance(state,seconds){
    const s=snapshot(state),next=lifecycle.advance(s.active?[s.active]:[],s.tick,seconds);
    for(const ended of next.expired)s.events.push({type:'expired',tick:ended.endsAt,caster:ended.caster});
    s.active=next.active[0]||null;s.tick=next.tick;return s;
  }
  function use(state,input,options={}){
    const s=snapshot(state),p=plan(input),caster=actor(input.caster);
    if(input.mode==='attempt')return attempt.attempt(s,{...input,definitionId},s.casters[caster],options);
    if(input.mode!=null&&input.mode!=='successful-use')return {state:s,applied:false,status:'計算未対応',reason:'試行の種類を指定してください',plan:p};
    if(typeof input.targetEligible!=='boolean')throw new TypeError('対象への適用可否を指定してください');
    const reject=reason=>({state:s,applied:false,reason,plan:p});
    if(!input.targetEligible)return reject('対象条件不成立。失敗時の資源消費は計算未対応のため試行しません');
    const gate=lifecycle.conflict(s.active?[s.active]:[],{definitionId,caster},definitions);
    if(!gate.allowed)return reject('同強度・別使用者の効果があるため上書き不可。失敗時の消費は計算未対応');
    const spending=lifecycle.spend(s.casters[caster],[{resource:'st',amount:p.costST}]);
    if(!spending.ok)return reject(spending.reason);
    const replaced=!!s.active;
    // Explicit successful-use simulation transaction. Failed-use spending,
    // cast/cooldown scheduling and server acceptance are not inferred here.
    s.casters[caster].st=spending.resources.st;
    s.active=lifecycle.start(p,caster,s.tick);
    s.events.push({type:replaced?'replaced':'applied',tick:s.tick,caster,costST:p.costST,endsAt:s.active.endsAt});
    return {state:s,applied:true,reason:replaced?'同使用者の効果を更新':'適用成功',plan:p};
  }
  function defense(base,state){
    const before=f(number(base,'対象の防御力',0,100000)),s=snapshot(state);
    // Same type8 percentage ordering as orderedStats: current value is the
    // reference; store delta, then store sum. Rebuild from base on expiry.
    const delta=s.active?f(f(s.active.defensePct)*f(.01)*before):0;
    return {before,after:Math.max(0,f(before+delta)),delta,remainingSeconds:s.active?(s.active.endsAt-s.tick)/60:0,active:!!s.active};
  }
  const api=Object.freeze({definitionId,plan,create,snapshot,advance,use,defense,attemptDetails:input=>attempt.describe({...input,definitionId}),
    effectStatus:'完成（発動成功・対象条件指定・同技だけの競合）',techniqueStatus:'部分対応',
    pending:['発動成功率・詠唱／再使用待ち','失敗時の消費と消費時点','他の技との競合・解除／耐性','追加のST消費補正']});
  if(common)module.exports=api;else root.MOE_SAMURAI_HEART_COMBAT=api;
})(globalThis);
