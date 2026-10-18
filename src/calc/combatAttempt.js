(function(root){
  'use strict';
  const common=typeof module!=='undefined'&&module.exports;
  const life=common?require('./combatEffectLifecycle.js'):root.MOE_COMBAT_EFFECT_LIFECYCLE;
  const refs=[...(common?require('../data/reference/timedCombatDefinitions20261010.js'):root.MOE_TIMED_COMBAT_DEFINITIONS).records,
    ...(common?require('../data/reference/statBuffDefinitions20261010.js'):root.MOE_STAT_BUFF_DEFINITIONS).records,
    ...(common?require('../data/reference/defenseBuffDefinitions20261011.js'):root.MOE_DEFENSE_BUFF_DEFINITIONS).records];
  const catalog=common?require('../data/generated/wikiPlayerCatalog.generated.js'):root.MOE_WIKI_PLAYER_CATALOG;
  const f=Math.fround,n=life.number;
  // Per-ID fields from saved TMG0 rows. New raw59 spells use the already
  // saved raw59 -> runtime46 map; no new outcome/timer policy is inferred.
  // These are raw client units, NOT seconds or Buff lifetime ticks.
  const profiles=Object.freeze({
    114:Object.freeze({id:114,primaryRuntimeSkill:46,actionType:1,activationRaw:241,reuseRaw:93,reuseGroup:1,selfOnly:false}),
    158:Object.freeze({id:158,primaryRuntimeSkill:46,actionType:1,activationRaw:297,reuseRaw:101,reuseGroup:1,selfOnly:false}),
    131:Object.freeze({id:131,primaryRuntimeSkill:46,actionType:1,activationRaw:189,reuseRaw:77,reuseGroup:1,selfOnly:false}),
    142:Object.freeze({id:142,primaryRuntimeSkill:46,actionType:1,activationRaw:171,reuseRaw:73,reuseGroup:1,selfOnly:false}),
    153:Object.freeze({id:153,primaryRuntimeSkill:46,actionType:1,activationRaw:171,reuseRaw:73,reuseGroup:1,selfOnly:false}),
    323:Object.freeze({id:323,primaryRuntimeSkill:36,actionType:4,activationRaw:150,reuseRaw:1500,reuseGroup:0,selfOnly:false}),
    324:Object.freeze({id:324,primaryRuntimeSkill:36,actionType:4,activationRaw:150,reuseRaw:1500,reuseGroup:0,selfOnly:true})
  });
  function profile(id){const p=profiles[id];if(!p)throw Error('この技の成否試行は未対応です');return p;}
  const missing=Object.freeze([
    Object.freeze({axis:'success',reason:'表示成功率と実際の成否判定の対応、乱数の範囲・比較・判定時点が未確認'}),
    Object.freeze({axis:'activation',reason:'発動基値の補正・時計単位・効果発生イベントとの対応が未確認'}),
    Object.freeze({axis:'reuse',reason:'結果区分0/1/2の供給元、再使用開始時点、カウンタ更新頻度、共有待ちの適用が未確認'}),
    Object.freeze({axis:'failureResources',reason:'成否・中断・競合拒否と605530のcommit/factor引数の対応が未確認'})
  ]);
  function describe(input){
    const p=profile(input.definitionId),ref=refs.find(r=>r.id===p.id),skill=n(input.skill,'技能',0,255);
    const d=catalog.rows.find(r=>r.internalId===p.id).definition;
    const required=d.required,diff=Math.round((skill-required)*10)/10;
    // Existing skillKnowledgeTechniqueSuccess single-skill DISPLAY formula.
    // Never pass this value to a Bernoulli/random success decision.
    const rate=Math.round(Math.max(1,Math.min(100,80-Math.max(0,-diff)*10+Math.min(8,Math.max(0,diff))*2.5))*10000)/10000;
    const cost=life.cost(d,ref.baseCost,skill),costs=[{resource:cost.resource,amount:cost.amount}];
    if(ref.materialId)costs.push({resource:'material',id:ref.materialId,amount:ref.materialCount});
    return {definitionId:p.id,name:ref.name,displaySuccess:{rate,required,provenance:'src/main.js:skillKnowledgeTechniqueSuccess（表示専用）',usableForDecision:false},
      activationRaw:p.activationRaw,reuseRaw:p.reuseRaw,reuseGroup:p.reuseGroup,activationSeconds:null,reuseSeconds:null,
      costs,missing:missing.map(r=>({...r})),fullAttemptSupported:false};
  }
  function preflight(input,resources){
    const p=profile(input.definitionId),details=describe(input),reasons=[];
    if(!['A','B'].includes(input.caster))throw Error('使用者A/Bを指定してください');
    if(typeof input.targetEligible!=='boolean')throw Error('対象条件を指定してください');
    if(!input.targetEligible)reasons.push('対象条件不成立');
    if(p.selfOnly&&input.caster!=='A')reasons.push('ナイト マインドは自己専用です（対象プレイヤーA）');
    const spending=life.spend(resources,details.costs);
    if(!spending.ok)reasons.push(spending.reason);
    // This is a read-only admission check. Passing it is NOT success/acceptance.
    return {...details,knownConditionsPass:reasons.length===0,usage:reasons.length?'使用前条件不成立':'未確定',reasons,
      resourceCheck:{passed:spending.ok,consumed:false}};
  }
  function attempt(state,input,resources,options={}){
    const checks=preflight(input,resources);
    if(options.rng!==undefined&&typeof options.rng!=='function')throw Error('乱数供給は関数で指定してください');
    // No verified success predicate or scheduling profile exists for these IDs.
    // In particular do not sample RNG, spend, start effects, or start cooldown.
    return {state,applied:false,status:checks.knownConditionsPass?'計算未対応':'使用前条件不成立',mode:'attempt',outcome:null,
      reason:'成功・失敗を含む試行は計算未対応です。'+[...checks.reasons,...checks.missing.map(r=>r.reason)].join('。'),checks};
  }
  function reuseComponent(id,input){
    if(![153,323,324].includes(id))throw Error('この技の再使用計算部品は今回未接続です。成功時効果とは別に管理します');
    const p=profile(id);
    if(!input||![0,1,2].includes(input.resultKind))throw Error('観測された結果区分0/1/2を指定してください（成否とは未対応）');
    const st=f(n(input.st,'ST',0,500));
    // Limited ordinary-player branch: no active reuse/resource modifiers.
    // Stat getter values and runtime skill24 are explicit state, not substitute formulas.
    let coefficient=1,base;
    if(p.actionType===1){
      const stat=f(n(input.stat15,'能力getter15',0,1000));
      const encoded=n(input.runtimeSkill24Integer,'runtime技能24整数',-1000000,2550000);
      if(!Number.isInteger(encoded))throw Error('runtime技能24は整数で指定してください');
      const points=Math.max(0,Math.min(f(1000000*f(.0001)),f(encoded*f(.0001))));
      coefficient=Math.max(0,1-Math.min(f(.2),f(points*f(.0016))));
      base=f(stat*p.reuseRaw*f(.01));
    }else{
      base=f(Math.max(f(.4),f(n(input.stat16,'能力getter16',0,1000))*f(.01))*p.reuseRaw);
      if(input.resultKind===1)base=f(base*f(.9));
      if(input.resultKind===2){
        if(typeof input.rng!=='function')throw Error('元405490のuint32乱数を供給してください');
        const seed=input.rng();if(!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw Error('乱数はuint32が必要です');
        base=f(base*(1+((seed>>>1)&255)*f(.000390625)));
      }
      coefficient*=st<10?f(1.3):st<40?f(1.2):st<100?f(1.1):st>=200?f(.9):1;
    }
    return {counterBeforeIntegerization:f(base*coefficient),unit:'client-counter',seconds:null,scheduled:false,
      scope:'通常補正・component単体。結果区分の成否対応／時計／起点は未接続'};
  }
  function summary(input){const d=describe(input);return `表示成功率 ${d.displaySuccess.rate}%（成否判定には未使用） / 発動基値 ${d.activationRaw} / 再使用基値 ${d.reuseRaw}（内部単位）。成否・効果発生時点・再使用時点・失敗時消費は計算未対応。`;}
  const api=Object.freeze({profiles,describe,preflight,attempt,reuseComponent,summary});
  if(common)module.exports=api;else root.MOE_COMBAT_ATTEMPT=api;
})(globalThis);
