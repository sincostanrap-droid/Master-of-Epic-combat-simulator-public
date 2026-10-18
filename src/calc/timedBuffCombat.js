(function(root){
  'use strict';
  const common=typeof module!=='undefined'&&module.exports;
  const lifecycle=common?require('./combatEffectLifecycle.js'):root.MOE_COMBAT_EFFECT_LIFECYCLE;
  const attempt=common?require('./combatAttempt.js'):root.MOE_COMBAT_ATTEMPT;
  const wiki=common?require('./wikiPlayerEffects.js'):root.MOE_WIKI_PLAYER_EFFECTS;
  const definitions=[...(common?require('../data/reference/timedCombatDefinitions20261010.js'):root.MOE_TIMED_COMBAT_DEFINITIONS).records,
    ...(common?require('../data/reference/statBuffDefinitions20261010.js'):root.MOE_STAT_BUFF_DEFINITIONS).records,
    ...(common?require('../data/reference/defenseBuffDefinitions20261011.js'):root.MOE_DEFENSE_BUFF_DEFINITIONS).records];
  const ids=[153,324,131,142,114,158],f=Math.fround,number=lifecycle.number;
  // An explicit per-technique effect list: expanding a handler never silently
  // enables another technique whose resources/conditions have not been checked.
  const selectors={153:[4],324:[4],131:[3],142:[6],114:[5],158:[9,10,11,12,8]};
  const fields={3:'flatAttack',4:'extraHit',5:'extraAC',6:'extraAvoid',8:'extraNeutralRes',9:'extraFireRes',10:'extraWaterRes',11:'extraWindRes',12:'extraEarthRes'};
  const groups=new Set(ids.map(id=>definitions.find(d=>d.id===id).conflict.conflictGroup));
  const rows=ids.map(id=>wiki.data.rows.find(r=>r.internalId===id));
  const conditions=Object.freeze({trialMode:'successful-use',strength:'変動なし基準値（seed10）',target:'player-A',resourceModifiers:'通常消費・追加補正なし'});
  function actor(value){if(!['A','B'].includes(value))throw new Error('使用者A/Bを指定してください');return value;}
  function plan(input){
    const row=rows.find(r=>r.internalId===input.definitionId);if(!row)throw new Error('この技の戦闘試行は未対応です');
    const skill=number(input.skill,'技能',0,255),magic=number(input.magic,'魔力',0,1000),world=input.world;
    if(world!==0&&world!==1)throw new Error('通常／War Ageを指定してください');
    const d=row.definition,ref=definitions.find(r=>r.id===d.id);
    if(d.effects.length!==selectors[d.id].length||d.effects.some((e,i)=>e.kind!==41||e.selector!==selectors[d.id][i]||e.flags!==48||e.qualifier||e.other10||e.other18)||d.effect_class!==1||ref.moneyCost||ref.stat27Cost)throw new Error('技の個別定義を再確認してください');
    const c=wiki.channels(d,{skill,magic,world}),amounts={};
    for(const e of d.effects){const field=fields[e.selector];if(Object.hasOwn(amounts,field))throw new Error('同じ能力項目の複数加算順は未確認です');amounts[field]=f(f(e.value)*c.m+(e.value<0?-c.a:c.a));}
    const seconds=wiki.duration(row,{skill,magic,world});if(seconds===null)throw new Error('効果時間は未対応です');
    const expense=lifecycle.cost(d,ref.baseCost,skill),costs=[{resource:expense.resource,amount:expense.amount}];
    if(ref.materialId)costs.push({resource:'material',id:ref.materialId,amount:ref.materialCount});
    return {definitionId:d.id,name:row.name,skill,magic,world,...amounts,durationTicks:Math.round(seconds*60),durationSeconds:seconds,
      costs,costFactor:expense.factor,group:ref.conflict.conflictGroup,strength:Math.abs(ref.conflict.fieldF0),target:'player-A'};
  }
  function resources(input={},required=false){
    if(required&&(input.st==null||input.mp==null||input.materials?.[1671]==null))throw new Error('資源状態が不足しています');
    const material=input.materials?.[1671]??30;
    if(!Number.isInteger(material)||material<0||material>1000000)throw new Error('ND所持数は0以上の整数で指定してください');
    const materials={1671:material};
    // Preserve older snapshots without inventing newly supported catalysts.
    for(const [id,label] of [[1672,'NP'],[1673,'NQ'],[1674,'PNQ']])if(input.materials?.[id]!=null){const value=input.materials[id];if(!Number.isInteger(value)||value<0||value>1000000)throw new Error(label+'所持数は0以上の整数で指定してください');materials[id]=value;}
    return {st:f(number(input.st??100,'ST',0,500)),mp:f(number(input.mp??100,'MP',0,1000)),materials};
  }
  function create({A={},B={}}={}){return {version:1,kind:'hit-buff-trial',mode:'successful-use',tick:0,casters:{A:resources(A),B:resources(B)},active:[],events:[]};}
  function snapshot(state){
    if(state?.kind!=='hit-buff-trial'||state.version!==1||state.mode!=='successful-use'||!Number.isInteger(state.tick)||!Array.isArray(state.active)||state.active.length>groups.size)throw new Error('未対応の試行状態です');
    number(state.tick,'経過フレーム');
    const s={...state,casters:{A:resources(state.casters.A,true),B:resources(state.casters.B,true)},events:(state.events||[]).map(e=>({...e})),active:[]};
    const occupied=new Set();
    for(const entry of state.active){const p=plan(entry);actor(entry.caster);
      if(occupied.has(p.group))throw new Error('同一競合グループの効果が重複しています');occupied.add(p.group);
      if(!Number.isInteger(entry.startedAt)||entry.startedAt<0||entry.startedAt>state.tick||entry.endsAt!==entry.startedAt+p.durationTicks)throw new Error('効果時刻を確認できません');
      if(p.definitionId===324&&entry.caster!=='A')throw new Error('ナイト マインドは使用者自身への効果です');
      if(entry.endsAt>state.tick)s.active.push(lifecycle.start(p,entry.caster,entry.startedAt));
    }return s;
  }
  function use(state,input,options={}){
    const s=snapshot(state);
    const reject=(reason,status='条件不成立')=>({state:s,applied:false,status,reason});
    if(input.mode==='attempt')return attempt.attempt(s,input,s.casters[actor(input.caster)],options);
    if(input.mode!=='successful-use')return reject('試行の種類を指定してください','計算未対応');
    const p=plan(input),caster=actor(input.caster);
    if(typeof input.targetEligible!=='boolean')throw new Error('対象条件を指定してください');
    if(!input.targetEligible)return reject('対象条件不成立。失敗時消費は未対応のため状態を進めません');
    if(p.definitionId===324&&caster!=='A')return reject('ナイト マインドは自己専用です。計算対象プレイヤーAを使用者にしてください');
    const gate=lifecycle.conflict(s.active,{definitionId:p.definitionId,caster},definitions);
    if(!gate.allowed)return reject(gate.reason==='weaker'?'強い効果が有効なため上書き不可。失敗時消費は未対応':'同強度・別使用者のため上書き不可。失敗時消費は未対応');
    const spend=lifecycle.spend(s.casters[caster],p.costs);if(!spend.ok)return reject(spend.reason);
    const previous=gate.replaceIndex==null?null:s.active[gate.replaceIndex];
    if(previous)s.active.splice(gate.replaceIndex,1);
    s.casters[caster]=spend.resources;s.active.push(lifecycle.start(p,caster,s.tick));
    s.events.push({type:previous?'replaced':'applied',tick:s.tick,definitionId:p.definitionId,caster,replacedId:previous?.definitionId,costs:p.costs});
    return {state:s,applied:true,status:'成功時試行',reason:previous?'競合定義に従って効果を更新':'効果を適用',plan:p};
  }
  function advance(state,seconds){
    const s=snapshot(state),next=lifecycle.advance(s.active,s.tick,seconds);
    for(const ended of next.expired)s.events.push({type:'expired',tick:ended.endsAt,definitionId:ended.definitionId,caster:ended.caster});
    s.active=next.active;s.tick=next.tick;return s;
  }
  function assertCompatible(playerState,definitionIds=ids){
    const relevantGroups=new Set(definitionIds.map(id=>{const ref=definitions.find(d=>d.id===id);if(!ref)throw new Error('競合定義なし');return ref.conflict.conflictGroup;}));
    for(const r of playerState.composite||[]){
      if(!r.enabled||r.excluded)continue;
      const known=wiki.byId.get(r.catalogRuleId)||wiki.data.rows.find(x=>String(x.internalId)===String(r.clientBuffDefinitionId));
      const named=wiki.data.rows.find(x=>wiki.norm(r.name)===wiki.norm(x.name));
      if(relevantGroups.has(known?.definition?.group)||relevantGroups.has(named?.definition?.group))
        throw new Error('同じ競合グループの既存Buff「'+r.name+'」をOFFにして試行してください。発生元・残り時間がない登録から競合状態を推定しません');
    }
  }
  function project(playerState,state){
    const s=snapshot(state);if(!s.active.length)return playerState;
    assertCompatible(playerState,s.active.map(r=>r.definitionId));
    // One row/slot per technique, even when it modifies several capabilities.
    // All items start, refresh and expire together under that technique's group.
    const additions=s.active.map(r=>({name:r.name+'（戦闘試行）',enabled:true,slot:true,
      ...Object.fromEntries(selectors[r.definitionId].map(selector=>[fields[selector],r[fields[selector]]])),combatTrial:true}));
    return {...playerState,composite:[...(playerState.composite||[]),...additions]};
  }
  const api=Object.freeze({ids,conditions,plan,create,snapshot,use,advance,project,assertCompatible,attemptDetails:attempt.describe,
    support:{application:'対応（プレイヤーAの攻撃力・命中・回避・防御力・5属性耐性／基準値。範囲技は条件成立したAの1受信分）',elapsed:'対応',conflict:'対応（各技の個別定義／試行内）',resources:'対応（成功時・通常ST/MP・個別触媒）',
      success:'計算未対応（既存表示式の原判定との照合・乱数・失敗遷移なし）',activation:'計算未対応（基値あり・換算/補正/開始終了未接続）',reuse:'計算未対応（基値あり・換算/補正/起点未接続）',failureResources:'計算未対応'}});
  if(common)module.exports=api;else root.MOE_TIMED_BUFF_COMBAT=api;
})(globalThis);
