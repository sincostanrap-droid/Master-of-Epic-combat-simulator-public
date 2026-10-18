(function(root){
 'use strict';
 const common=typeof module!=='undefined'&&module.exports;
 const scopeExclusions=common?require('../data/manual/combatScopeExclusions.manual.js'):root.MOE_COMBAT_SCOPE_EXCLUSIONS;
 const formulas=common?require('./combatEffectFormulas.js'):root.MOE_COMBAT_EFFECT_FORMULAS;
 const life=common?require('./combatEffectLifecycle.js'):root.MOE_COMBAT_EFFECT_LIFECYCLE;
 const damage=common?require('./techniqueDamage.js'):root.MOE_TECHNIQUE_DAMAGE;
 const collector=common?require('./clientPhysicalBuildBuffReference.js'):root.MOE_CLIENT_PHYSICAL_BUILD_BUFF_REFERENCE;
 const skillCollector=common?require('./clientSkillInputReference.js'):root.MOE_CLIENT_SKILL_INPUT_REFERENCE;
 const inputFormula=common?require('./combatResourceFormula.js'):root.MOE_COMBAT_RESOURCE_FORMULA;
 const skillMetadata=common?require('../data/generated/combatSkillNames.generated.js'):root.MOE_COMBAT_SKILL_NAMES;
 const f=Math.fround;
 const rangeBuffs=common?require('./combatRangeNumerics.js'):root.MOE_COMBAT_RANGE_NUMERICS;
 const passive=common?require('./combatPassiveNumerics.js'):root.MOE_COMBAT_PASSIVE_NUMERICS;
 const unknown={
  2:['HP回復/損傷','class1負値の入力生成・符号とHP受信更新。class2正値は保存攻撃定義で別照合'],
  8:['召喚','召喚体の能力・寿命・命令・消滅の式と状態'],9:['設置','設置体の能力・対象選択・動作の式'],
  12:['継続/追撃ダメージ','保存攻撃追加定義にないものは入力継承・回数・発生時刻'],
  13:['資源継続変化','局所生成/受信式は既知。技能から保存M/Aへの全経路、elapsedと秒の対応・上位成立条件'],
  23:['ST変化','生成入力・符号・上限と受信先の対応'],49:['ブレイド追撃','type30補助レコードは既知。攻撃時消費・属性抵抗・成立回数'],
  86:['参照行動','子定義/入力構築は既知。親イベントからの発動時刻・個別条件と子の作用への統合'],
  133:['自己参照行動','自己条件/tokenは既知。発動イベントと子作用への統合'],
  47:['軽減/反射','成立条件・対象攻撃・適用順'],69:['技能ディレイ','単位・実周期・開始/解除時の反映順'],
  108:['攻撃ディレイ','実周期・適用順と状態時計'],109:['詠唱','単位・発動時計への適用順'],
  132:['自然回復抑制','保存された回復再構築ではselectorは抑制bit。回復時計への接続が必要。クリティカル率へ読み替えない'],
  71:['設置寿命','設置kind9との組合せではselector/60の整数秒は既知。設置体の状態生成・消滅が未接続'],
  188:['能力変換','変換元/対象・順序・再計算時点'],247:['物理威力','対象攻撃選択と条件・重複'],274:['魔法威力','Mへの乗算位置は既知。独立collectorの選択・集計・条件の全契約が未接続'],275:['属性威力','属性選択・対象入力・重複']
 };
 const special={392:'人数別フュージョンの選択・入力継承',384:'AC低下とジャンプ解除の作用元',9760:'ノックバック踏み止まりの条件/距離'};
 function unsupported(d,e,reason,category='不足する式・仕様'){
  const named=unknown[e.kind]||['内部効果'+e.kind,'この内部効果の入力・単位・適用先・状態処理の保存された対応根拠が不足'];
  return {id:d.id+':'+e.index,definitionId:d.id,index:e.index,kind:e.kind,selector:e.selector,signature:[e.kind,d.action_type,d.effect_class,e.flags,e.qualifier,e.other10,e.other18].join('/'),
   handler:named[0],quantity:false,application:false,category,reason:reason||named[1]};
 }
 function compile(bundle,skillNames={}){
  const exclusion=scopeExclusions?.exclusion(bundle.row);if(exclusion)throw Error(exclusion.reason);
  const row=bundle.row,math=formulas.create(skillNames),nodes=[row.definition,...(row.dependencies||[])].filter(Boolean),effects=[];
  const matched=row.matchStatus==='一致'&&!!row.definition&&!bundle.definitions[String(row.internalId)]?.unresolved;
  for(const d of nodes)for(const e of d.effects){
   if(!matched){effects.push(unsupported(d,e,'内部IDの照合未確定','照合未確定'));continue;}
   const reason=math.statReason(d,e),isStat=[41,147,235].includes(e.kind),rootNode=d.id===row.internalId;
   if(bundle.numericReferences?.[d.id]?.physical&&[33,54,64,164,205,214,252,253,254,258].includes(e.kind)){
    effects.push({...unsupported(d,e,''),handler:'保存武器入力の本体量',quantity:true,application:false,category:'必要な共通処理',reason:'NPC・命中成立時の本体要求量は共通画面へ接続。HP保存・発生時刻・成否は別',formula:'clientPhysicalTechniqueReference.power/npcDamage'});continue;
   }
   if(passive.jumpDefinition(e)){
    effects.push({...unsupported(d,e,''),handler:'通常ジャンプの倍率',quantity:true,application:false,category:'必要な共通処理',
     reason:'条件付き1回の初期鉛直値は数値接続済み。ジャンプによるBuff消費・保持・衝突・軌道の状態処理は未接続',fields:[],formula:'combatPassiveNumerics.jump',durationKnown:math.timeStatus({definition:d,dependencies:[]}).supported});continue;
   }
   if(rangeBuffs.fixed(e)){
    const time=math.timeStatus({definition:d,dependencies:[]}),applicable=rootNode&&row.recipient==='player'&&time.supported&&time.kind==='buff';
    effects.push({...unsupported(d,e,''),handler:'固定範囲補正',quantity:true,application:applicable,category:applicable?null:'必要な共通処理',reason:applicable?null:'付与先・参照先の受理は未確定。採用Buffの固定加算は独立して計算可能',fields:[],formula:'combatRangeNumerics.collect',durationKnown:time.supported});continue;
   }
   const modifier=[247,275].includes(e.kind)&&Number.isFinite(e.value)&&!e.qualifier&&!e.other10&&!e.other18&&!(e.flags&~(0x30|0x100|0x200))&&e.selector>=0&&e.selector<=6;
   if(modifier){
    const time=math.timeStatus({definition:d,dependencies:[]}),applicable=rootNode&&row.recipient==='player'&&time.supported&&time.kind==='buff';
    effects.push({...unsupported(d,e,''),handler:'攻撃入力補正',quantity:true,application:applicable,category:applicable?null:'必要な共通処理',
     reason:applicable?null:'参照先または未照合の対象への適用経路',fields:[],formula:'clientPhysicalBuildBuffReference.collect',durationKnown:time.supported});
    continue;
   }
   if(isStat&&!reason){
    const time=math.timeStatus({definition:d,dependencies:[]}),recipient=rootNode?row.recipient:'参照先の対象入力未接続';
    const missingConsumer=e.kind===235&&skillNames[e.selector]==='回復魔法';
    const applicable=rootNode&&recipient==='player'&&time.supported&&time.kind==='buff'&&!missingConsumer;
    effects.push({...unsupported(d,e,''),handler:'能力状態',quantity:true,application:applicable,category:applicable?null:'必要な共通処理',
     reason:applicable?null:missingConsumer?'効果用回復魔法の係数は既知。回復量の入力/符号/HP受信先が未接続のため量表示のみ':!rootNode?'子行動の成立と入力・対象を独立に供給する接続':recipient!=='player'?'対象NPC/ペット/設置物の能力状態への適用':time.reason||'寿命と能力状態の開始/終了の対応',
     fields:math.effectFields(e),skillName:skillNames[e.selector],formula:'saved-class1-stat/percentage/skill',durationKnown:time.supported});
   }else{
    const attack=bundle.attack,attackEffects=[2,12,33,54,64,164,190,205,206,214,239,252,253,254,258,235];
    if(rootNode&&attack&&attack.calculationSupported!==false&&attackEffects.includes(e.kind))effects.push({...unsupported(d,e,''),handler:'既存攻撃計算',quantity:true,application:false,category:'必要な共通処理',reason:'HPメッセージ/期待値の計算は既存接続。受信側HP更新・多段/継続の発生時刻は別の未確定境界',formula:'techniqueDamage.calculate'});
    else effects.push(unsupported(d,e,isStat?reason:undefined));
   }
  }
  const refs=nodes.flatMap(d=>d.effects.filter(e=>[86,133].includes(e.kind)).map(e=>({parent:d.id,effectIndex:e.index,kind:e.kind,child:e.selector&65535,found:nodes.some(n=>n.id===(e.selector&65535)),
   reason:'親の係数をコピーしない。保存済み子入力構築・条件・作用を結ぶ必要あり'})));
  const pending=[];
  if(!matched)pending.push({category:'照合未確定',reason:row.matchStatus||'内部定義なし'});
  if(!effects.length)pending.push({category:'不足する式・仕様',reason:'内部効果または動作定義の照合/解析なし'});
  for(const e of effects)if(!e.application)pending.push({category:e.category,effect:e.id,reason:e.reason});
  if(effects.some(e=>e.handler==='既存攻撃計算'))pending.push({category:'不足する式・仕様',reason:'既存攻撃の量は計算可能だが、受信側のHP丸め・上限/死亡処理と多段/継続の実着弾時刻の証拠が不足'});
  if(special[row.internalId])pending.push({category:'不足する式・仕様',reason:special[row.internalId]});
  if(effects.some(e=>e.application&&[41,147].includes(e.kind)&&[1,2,22].includes(e.selector)))pending.push({category:'不足する式・仕様',reason:'最大HP/MP/STは能力状態のみ。増減/解除と現在資源のクランプ・更新順は未確定'});
  if(effects.some(e=>e.application&&e.kind===235))pending.push({category:'必要な共通処理',reason:'効果用技能を既存の攻撃計算へ供給。回復魔法等の未解析評価先は別途保留'});
  const ref=bundle.definitions[String(row.internalId)];
  const resourceKnown=!!ref&&!ref.unresolved&&!ref.moneyCost&&!ref.stat27Cost&&ref.requirements.every(r=>r.name);
  if(!resourceKnown)pending.push({category:'必要な共通処理',reason:ref?.moneyCost||ref?.stat27Cost?'追加金銭/stat27資源処理・状態名照合': '資源定義/技能名照合が未確定。効果だけの適用は独立可能'});
  return {bundle,math,matched,key:row.key,name:row.name,id:row.internalId,effects,references:refs,pending,resourceKnown,
   applicationCount:effects.filter(e=>e.application).length,quantityCount:effects.filter(e=>e.quantity).length,
   complete:false,fullAttemptSupported:false,scope:'指定条件下の成功時効果／全技完成ではない'};
 }
 function plan(compiled,input){
  const {bundle,math}=compiled,d=bundle.row.definition;
  const skill=life.number(input.skill,'主技能',0,inputFormula.skillMax),magic=life.number(input.magic,'魔力',0,1000);
  if(![0,1].includes(input.world))throw Error('世界条件0/1を指定してください');
  const controls={skill,magic,world:input.world,casterElementStrengthPct:life.number(input.casterElementStrengthPct??0,'属性強化',-100,1000)};
  const rows=[],displayOnlyRows=[];
  for(const status of compiled.effects.filter(e=>e.quantity&&!e.application&&e.definitionId===compiled.id&&e.handler==='能力状態')){
   const e=d.effects.find(e=>e.index===status.index),r=math.effect(d,e,controls);
   if(r.supported)displayOnlyRows.push({effectId:status.id,kind:e.kind,selector:e.selector,value:r.value,active:r.active,fields:r.fields,skillName:r.skillName,reason:status.reason});
  }
  for(const status of compiled.effects.filter(e=>e.application)){
   const e=d.effects.find(e=>e.index===status.index);
   const a=!!(e.flags&0x100),b=!!(e.flags&0x200);
   const r=['攻撃入力補正','固定範囲補正'].includes(status.handler)?{supported:true,active:!(a!==b&&(a&&input.world===1||b&&input.world!==1)),value:e.value,fields:[],skillName:null}:math.effect(d,e,controls);
   if(!r.supported)throw Error(r.reason);
   // Retain separate entries/order; never collapse unknown values into zero.
   rows.push({effectId:status.id,kind:e.kind,selector:e.selector,flags:e.flags,value:r.value,active:r.active,fields:r.fields,skillName:r.skillName});
  }
  let cost=null,costReason=null;
  if(compiled.resourceKnown){try{
   const req=bundle.definitions[String(d.id)].requirements,skills={...(input.skills||{})};
   const primary=req.find(r=>r.rawSkill===d.primary_raw);if(primary)skills[primary.name]=skill;
   cost=life.costMany(d,bundle.definitions[String(d.id)],skills);
  }catch(e){costReason=e.message;}}
  else costReason='消費は未接続';
  const durationSeconds=math.duration(bundle.row,controls);
  let damageResult=null;
  if(compiled.matched&&bundle.attack&&bundle.attack.calculationSupported!==false&&input.damageContext){
   for(const key of ['skill','attack','hit','magic','defense','targetDefense','evasion','resistance','powerMultiplier','specialMultiplier','incoming','targetMultiplier','finalCap'])
    life.number(input.damageContext[key],'攻撃入力 '+key,0,100000);
   damageResult=damage.calculate(bundle.attack,input.damageContext);
  }
  return {key:compiled.key,definitionId:compiled.id,name:compiled.name,controls,rows,displayOnlyRows,durationSeconds,durationTicks:durationSeconds===null?null:Math.round(durationSeconds*60),
   cost,costReason,damage:damageResult,pending:compiled.pending,complete:false,mode:'successful-effect',reference:bundle.definitions[String(compiled.id)]};
 }
 function create({A={st:100,mp:100,materials:{}},B={st:100,mp:100,materials:{}}}={}){
  return {version:1,kind:'catalog-effect-trial',tick:0,actors:structuredClone({A,B}),active:[],events:[]};
 }
 function validate(state){
  if(state?.kind!=='catalog-effect-trial'||state.version!==1||!Number.isInteger(state.tick)||state.tick<0||!Array.isArray(state.active)||state.active.length>48)throw Error('試行状態が不正です');
  const seen=new Set();for(const r of state.active){const key=r.target+':'+r.reference.conflict.conflictGroup;
   if(r.reference.conflict.conflictGroup&&seen.has(key))throw Error('競合グループ重複');seen.add(key);
   if(r.endsAt<=state.tick||r.endsAt!==r.startedAt+r.durationTicks)throw Error('効果時刻が不正です');}
 }
 function use(compiled,state,input){
  validate(state);
  if(input.mode==='attempt')return {state,applied:false,outcome:null,status:'計算未対応',reason:'成否・発動・再使用・失敗消費は未接続。成功時効果は独立して利用可能'};
  if(!['A','B'].includes(input.caster)||!['A','B'].includes(input.target))throw Error('使用者と対象A/Bを指定してください');
  if(input.conditionsConfirmed!==true)return {state,applied:false,status:'条件未指定',reason:'対象適合・必要Buff/装備・空き枠等の成立を指定してください'};
  if(!['effect-only','successful-use'].includes(input.mode))throw Error('成功時効果か、成功時消費を含む試行を指定してください');
  if(compiled.pending.length&&!input.acknowledgePartial)throw Error('未対応部分を残す部分適用を確認してください');
  const p=plan(compiled,input);if(!p.rows.length)return {state,applied:false,status:'適用未対応',reason:'独立して適用できる能力効果なし',plan:p};
  if(!(p.durationTicks>0))throw Error('効果時間は未対応です');
  const info=compiled.bundle.row.info||'';
  if(/自分以外|自分には使用でき/.test(info)&&input.caster===input.target)throw Error('自己対象には使用できません');
  if((/自身|自分の防御力|自身の/.test(info)||p.definitionId===324)&&input.caster!==input.target)throw Error('自己対象条件を指定してください');
  const slots=state.active.filter(r=>r.target===input.target),definitions=[...new Map([...slots.map(r=>r.reference),p.reference].map(r=>[r.id,r])).values()];
  const gate=life.conflict(slots,{definitionId:p.definitionId,caster:input.caster},definitions);
  if(!gate.allowed)return {state,applied:false,status:'競合拒否',reason:gate.reason+'。失敗消費は未確定'};
  const copy=structuredClone(state),replace=gate.replaceIndex==null?null:slots[gate.replaceIndex];
  if(!replace&&slots.length>=24)return {state,applied:false,status:'空き枠なし',reason:'満杯時の追い出しはこの試行では未接続'};
  if(input.mode==='successful-use'){
   if(!p.cost)throw Error(p.costReason);const spending=life.spend(copy.actors[input.caster],p.cost.costs);
   if(!spending.ok)return {state,applied:false,status:'資源不足',reason:spending.reason};copy.actors[input.caster]=spending.resources;
  }
  if(replace)copy.active.splice(state.active.indexOf(replace),1);
  copy.active.push({...p,caster:input.caster,target:input.target,startedAt:state.tick,endsAt:state.tick+p.durationTicks});
  copy.events.push({type:replace?'updated':'applied',tick:state.tick,name:p.name,target:input.target,key:p.key,mode:input.mode,costs:input.mode==='successful-use'?p.cost.costs:null});
  return {state:copy,applied:true,status:'部分対応・指定条件下',plan:p};
 }
 function advance(state,seconds){validate(state);const next=life.advance(state.active,state.tick,seconds),copy=structuredClone(state);copy.tick=next.tick;copy.active=next.active;
  for(const r of next.expired)copy.events.push({type:'expired',tick:r.endsAt,key:r.key,name:r.name,target:r.target});return copy;}
 function project(playerState,state,target='A'){
  validate(state);const active=state.active.filter(r=>r.target===target);if(!active.length)return playerState;
  const activeGroups=new Set(active.map(r=>r.reference.conflict.conflictGroup).filter(Boolean));
  const wiki=root.MOE_WIKI_PLAYER_EFFECTS;
  for(const row of playerState.composite||[]){if(!row.enabled||row.excluded)continue;
   const found=wiki?.byId.get(row.catalogRuleId)||wiki?.data.rows.find(r=>String(r.internalId)===String(row.clientBuffDefinitionId)||wiki.norm(row.name)===wiki.norm(r.name));
   if(active.some(r=>row.clientBuffDefinitionId!=null&&String(row.clientBuffDefinitionId)===String(r.definitionId)||row.catalogRuleId===r.key||row.name===r.name)||activeGroups.has(found?.definition?.group))throw Error('同じ競合グループの登録をOFFにしてください。ユーザー登録は変更しません');}
  const additions=active.flatMap((r,i)=>r.rows.filter(e=>e.active).map((e,j)=>({name:r.name+'（効果試行）',enabled:true,slot:j===0,combatTrial:true,
    ...Object.fromEntries(e.fields.map(field=>[field,e.value])),extraEffects:[
     ...(e.kind===235?[{key:'skillPlus',name:e.skillName,value:e.value,scope:'both',unit:''}]:[]),
     ...([245,248].includes(e.kind)?[{key:'custom',name:rangeBuffs.names[e.kind],value:e.value,unit:'内部距離',scope:'display',source:'catalog-range-effect'}]:[]),
     ...(j===0?[{key:'custom',name:'指定条件下の成功時効果・1枠',scope:'display',unit:''}]:[])
    ]})));
  return {...playerState,composite:[...(playerState.composite||[]),...additions]};
 }
 // The existing collector stores once per definition, then the existing attack
 // constructors choose whether to consume these fractions (fixed branches skip).
 function attackBonuses(state,target,element){
  validate(state);const records=state.active.filter(r=>r.target===target).map(r=>({id:r.definitionId,name:r.name,effects:r.rows.filter(e=>e.active&&[247,275].includes(e.kind)).map(e=>({...e,flags:48}))}));
  return collector.collect(records.map(d=>({enabled:true,clientBuffDefinitionId:d.id})),{records,sources:[]},element,0,0);
 }
 function damageContext(state,target,entry,context){
  const apply=(hit,c)=>{const b=attackBonuses(state,target,hit.definition.element),extra=attackBonuses(state,target,hit.additional?.element??hit.definition.element);
   const buffs=state.active.filter(r=>r.target===target).map(r=>({effects:r.rows.filter(e=>e.active&&e.kind===235&&e.skillName===hit.skillName).map(e=>({...e,selector:1,flags:48}))}));
   const adjustment=skillCollector.aggregate(buffs,235,1);
   const encoded=hit.family==='magic'&&adjustment&&skillMetadata.magicInputRoutes[hit.definition.id]==='stat6'?inputFormula.magicActionInput(Math.round(c.skill*10000),adjustment,c.magic):null;
   return {...c,powerMultiplier:b.physicalFraction?1+f(c.powerMultiplier-1+b.physicalFraction):c.powerMultiplier,
    ...(encoded===null?{}:{combatActionInput:encoded}),
    elementPct:b.elementFraction?f((c.elementPct||0)+b.elementFraction*100):c.elementPct,
    additionalElementPct:extra.elementFraction?f((c.additionalElementPct||0)+extra.elementFraction*100):c.additionalElementPct};};
  return {...apply(entry,context),hitContexts:(entry.hits||[entry]).map((hit,i)=>apply(hit,{...context,...context.hitContexts?.[i]}))};
 }
 const api=Object.freeze({compile,plan,create,use,advance,project,attackBonuses,damageContext,unknown});
 if(common)module.exports=api;else root.MOE_COMBAT_CATALOG_ENGINE=api;
})(globalThis);
