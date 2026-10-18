(function(root){'use strict';
 const common=typeof module!=='undefined'&&module.exports;
 const meanings=common?require('../data/generated/catalogEffectNames.generated.js'):root.MOE_CATALOG_EFFECT_NAMES;
 const formulaDefinitions=common?require('./combatEffectFormulas.js'):root.MOE_COMBAT_EFFECT_FORMULAS;
 const nonQuantity=new Set(meanings?.descriptionOnlyKinds||[]);
 function connect(bundle,numeric,input,old,skillNames){
  // Same declared starting conditions as the combat-trial UI, not guessed coefficients.
  const params=structuredClone({skill:100,magic:100,world:0,seed:10,targetDefense:100,resistance:50,targetAmplificationAllowed:true,...(input.combatTrialSource?.inputs||{}),...input});
  if(params.targetAmplificationAllowed==='yes'||params.targetAmplificationAllowed==='no')params.targetAmplificationAllowed=params.targetAmplificationAllowed==='yes';delete params.combatTrialSource;
  const result=numeric.evaluate(bundle,params,skillNames);
  const output={...old},values=[],pending=[],seen=new Set(),applied=[],fields=new Map(),skillEffects=[],childIds=new Set(),estimatedFields=new Set(),timeNames=new Map([bundle.row.definition,...bundle.row.dependencies||[]].filter(Boolean).map(d=>[d.id,d.name]));
  const rootId=bundle.row.internalId,fieldMath=formulaDefinitions.create(skillNames);
  for(const e of result.effects)if(e.definitionId===rootId&&e.supported!==true&&[41,147].includes(e.kind)){const raw=bundle.row.definition.effects.find(q=>q.index===e.index);if(raw)for(const field of fieldMath.effectFields(raw))delete output[field];}
  function visit(e,path='',canApply=false){
   if(!e||seen.has(e.id+'|'+path))return;seen.add(e.id+'|'+path);
   const children=[e.selectedChild,e.guardChild,e.reactionChild,e.bladeFollowup,...(e.magicReplay?.emitted?[{...e.magicReplay,name:'反射された魔法'}]:[]),...e.additionalChildren||[]].filter(Boolean);
   const quantity=e.supported===true&&Number.isFinite(e.value)&&!e.timeOnly&&!e.nonNumerical&&!nonQuantity.has(e.kind)&&e.quantityRole!=='auxiliary'&&!e.diagnosticOnly&&![8,9,94,169].includes(e.kind);
   if(quantity){
    const label=String(e.name||'効果量').replace(/技能/g,'スキル').replace(/要求量/g,'量').replace(/内部単位|内部描画値/g,'値');
    const record={id:e.id,name:label.replace(/内部/g,'').replace(/要求/g,''),value:e.value,unit:String(e.unit||'').replace(/(?:高度|距離|耐久|描画)?内部(?:単位|値|距離)?/g,''),scope:path||'本体',estimated:!!e.estimated,
      ...(Number.isFinite(e.count)?{count:e.count}:{}),...(Number.isFinite(e.total)?{total:e.total}:{}),...(Number.isFinite(e.intervalSeconds)?{intervalSeconds:e.intervalSeconds}:{})};
    if(e.kind===2&&bundle.row.isAttack&&!/回復/.test(record.name))record.name='ダメージ（指定したばらつき）';
    values.push(record);
    if((canApply||e.definitionId===rootId&&bundle.row.prior&&e.fields?.every(field=>Number.isFinite(old[field])&&old[field]!==0))&&[41,147].includes(e.kind)&&Array.isArray(e.fields)&&e.fields.length){for(const field of e.fields){if(Number.isFinite(e.value)){fields.set(field,(fields.get(field)||0)+e.value);applied.push(e.id);}}}
    if((canApply||e.definitionId===rootId&&bundle.row.prior&&Number.isFinite(old.extraCritRatePct))&&e.kind===112&&e.selector===1){fields.set('extraCritRatePct',(fields.get('extraCritRatePct')||0)+e.value);applied.push(e.id);}
    for(const [kind,field]of [[108,'extraAttackDelayPct'],[109,'extraMagicDelayPct']])if(e.definitionId===rootId&&e.kind===kind&&Number.isFinite(old[field])&&e.unit==='倍'){
      fields.set(field,(e.value-1)*100);applied.push(e.id);
    }
    if(canApply&&e.kind===235&&skillNames[e.selector]){skillEffects.push({key:'skillPlus',name:skillNames[e.selector],value:e.value,scope:'both',unit:''});applied.push(e.id);}
    if(canApply&&e.naturalRecovery&&Number.isFinite(e.naturalRecovery.perMinute)){
      const field={HP:'hpRegenPerMinute',MP:'mpRegenPerMinute',ST:'stRegenPerMinute'}[e.naturalRecovery.resource];
      if(field){fields.set(field,(fields.get(field)||0)+(e.active===false?0:e.naturalRecovery.perMinute));if(e.estimated)estimatedFields.add(field);applied.push(e.id);}
    }
   }
   const projections=[
    ['guard.magic.uniformBytePercent','魔法防御の一次抽選率','%'],['guard.magic.blocked','魔法防御による軽減量','HP'],['guard.magic.remaining','魔法防御後のダメージ','HP'],['guard.magic.refund.amount','魔法防御時のMP回復量','MP'],
    ['guard.outcome.blocked','物理防御による軽減量','HP'],['guard.outcome.remaining','物理防御後のダメージ','HP'],['buffReflection.outcome.remaining','Buff軽減後のダメージ','HP'],['buffReflection.outcome.reflected','反射ダメージ','HP'],
    ['carnivalDamage.amount','置き換え後の攻撃ダメージ','HP'],['interruption.percent','条件付きの詠唱中断率','%'],['movement.initialMagnitude','吹き飛ばしの初期値',''],['movement.totalMagnitude','吹き飛ばしの累計値（衝突なし）',''],
    ['jump.initial','ジャンプの初期値',''],['itemDelay.counter','アイテム使用の待ち値（秒数とは別）',''],['stConsumption.projection.request','補正後のST消費量','ST'],['resourceCostProjection.request','補正後のST消費量','ST'],
    ['npcArmorProjection.after.effectiveDefense','NPC攻撃に対する補正後の防御力',''],['npcArmorProjection.hit.after','同じNPC攻撃の補正後ダメージ','HP'],['dirt.after','髪・顔の汚れ（効果後）',''],['petExperience.after','効果中のペット経験値倍率','倍'],['petExperience.request','補正後の経験値（レベル上昇量とは別）',''],['actionWait.after','敵の行動待ち値（秒数とは別）',''],['wear.displayAfter','装備の残り耐久',''],['critical.after','条件指定後のクリティカル率','倍'],['gaugeSlip.slip','生産ゲージ停止時の滑り','マス'],['gaugeSlip.uniformMean','生産ゲージ停止時の滑り（平均）','マス'],['gaugeSpeed.factor','生産ゲージ速度（通常比）','倍'],
   ];
   for(const [key,name,unit]of projections){let value=e;for(const part of key.split('.'))value=value?.[part];if(Number.isFinite(value)&&!(['movement.initialMagnitude','carnivalDamage.amount'].includes(key)&&quantity&&value===e.value))values.push({id:e.id+':'+key,name,value,unit,scope:path||'指定した条件',estimated:false});}
   if(e.absorption?.requested&&Number.isFinite(e.absorption.amount))values.push({id:e.id+':absorption',name:e.absorption.resource+'吸収回復量',value:e.absorption.amount,unit:e.absorption.resource,scope:path||'指定した条件',estimated:false});
   if(quantity&&Number.isFinite(e.initialValue)&&e.initialValue!==e.value)values.push({id:e.id+':initial',name:e.name+'（初回1回分）',value:e.initialValue,unit:e.unit||'',scope:path||'本体',estimated:!!e.estimated});
   if(!e.supported&&!e.resolved&&!e.nonNumerical&&!nonQuantity.has(e.kind)&&!e.coveredByAttack&&!children.length){
     const names=meanings?.rows?.[bundle.row.id]?.effectNames;
     if(!(names&&Object.hasOwn(names,e.id)&&names[e.id]===null)){
      const name=e.name==='付随効果'?(names?.[e.id]||'効果量（作用名未確認）'):/^(?:効果\d+|内部)/.test(e.name||'')?(meanings?.kindLabels?.[e.kind]||'効果量（名称未確認）'):e.name||'効果量';
      pending.push({id:e.id,name:name.replace(/技能/g,'スキル'),reason:e.reason||'追加条件または式が不足',category:e.category||'未確定'});
     }
   }
   for(const child of children){childIds.add(child.id);timeNames.set(child.id,child.name);const area=e.kind===9&&e.selectedChild===child&&(child.recipient==='陣内PC'||e.areaBindingConfirmed===true&&/PC|術者|使用者|プレイヤー/.test(child.recipient||''));for(const q of child.effects||[])visit(q,(e.generatedActionBinding?.candidateOnly?'候補（選択条件未確定）：':'')+(child.name||'付与効果'),area);}
  }
  for(const e of result.effects)if(e.definitionId===rootId||!childIds.has(e.definitionId))visit(e,'',e.definitionId===rootId&&bundle.row.recipient==='player'&&!e.conditional);
  for(const physical of result.physicalResults||[])if(Number.isFinite(physical.value))values.push({id:physical.definitionId+':physical',name:'物理ダメージ（指定したばらつき）',value:physical.value,unit:'HP',scope:physical.definitionId===rootId?'本体':physical.name||'追加の攻撃',estimated:false});
  for(const range of result.rangeProjection||[])if(Number.isFinite(range.after))values.push({id:range.kind+':range',name:range.kind===245?'補正後の範囲半径':'補正後の射程',value:range.after,unit:'',scope:'指定した条件',estimated:false});
  if(Number.isFinite(result.attack?.average))values.push({id:'attack:average',name:'平均ダメージ',value:result.attack.average,unit:'HP',scope:'本体',estimated:false});
  for(const [field,value]of fields)output[field]=value;
  // No evaluated condition, result, or unsupported item is represented by zero.
  output.catalogNumeric={version:1,key:bundle.row.key,values,pending,applied,estimatedFields:[...estimatedFields],times:result.times.filter(t=>t.supported&&Number.isFinite(t.seconds)).map(t=>({definitionId:t.definitionId,name:timeNames.get(t.definitionId)||'付与された効果',seconds:t.seconds,conditional:!!t.conditional})),inputs:params};
  const rootTime=output.catalogNumeric.times.find(t=>t.definitionId===rootId);if(rootTime)output.durationSeconds=rootTime.seconds;
  output.extraEffects=[...(old.extraEffects||[]).filter(e=>!(e.key==='custom'&&/^(?:計算未対応[:：]|効果量 )/.test(e.name||''))&&!(e.key==='skillPlus'&&skillEffects.some(q=>q.name===e.name))),...skillEffects];
  // Values are displayed from structured records. HP damage/healing and conditional
  // children are never turned into permanent character-stat bonuses.
  return output;
 }
 function install(){
  const catalog=root.MOE_REVIEWED_BUFF_CATALOG_MANUAL,index=root.MOE_COMBAT_CATALOG_INDEX,numeric=root.MOE_COMBAT_NUMERICS;
  if(!catalog||!index||!numeric)return;
  const entries=new Map(index.entries.map(e=>[e.key,e])),pages=new Map(),pending=new Map(),failed=new Map();let queue=Promise.resolve();
  const get=rule=>{const entry=entries.get(rule.wikiPlayerKey);return entry&&pages.get(entry.page)?.rows.find(b=>b.row.key===entry.key);};
  function configure(rule,page){const entry=entries.get(rule.wikiPlayerKey);if(!entry)return;const bundle=page.rows.find(b=>b.row.key===entry.key);if(!bundle)throw Error('対象の計算データを確認できません');const basic=root.MOE_COMBAT_CONDITION_INPUTS?.basicForBundle(bundle);if(basic){rule.inputKind=basic.has('Skill')?(basic.has('Magic')?'skillMagic':'skill'):(basic.has('Magic')?'magic':'none');rule.skillLabel=page.skillNames[bundle?.row.definition?.primary_raw]||rule.skillLabel;
      const relevant=root.MOE_COMBAT_CONDITION_INPUTS.forBundle(bundle,numeric);
      const options=[['World','world','世界条件（0:通常、1:War Age）',0],['Defense','targetDefense','対象防御力',100],['Resistance','resistance','対象の該当属性耐性',50],['Seed','seed','効果量のばらつき指定（標準値10）',10]];
      rule.catalogOptions=rule.catalogOptions||[];
      for(const [key,name,label,value]of options)if((basic.has(key)||relevant.has(key))&&!rule.catalogOptions.some(o=>o.key===name))rule.catalogOptions.push({key:name,label,type:'number',defaultValue:value,min:0,step:key==='Seed'||key==='World'?1:'any',...(key==='World'?{max:1}:key==='Seed'?{max:4294967295}:{})});
      if(relevant.has('Amplification')&&!rule.catalogOptions.some(o=>o.key==='targetAmplificationAllowed'))rule.catalogOptions.push({key:'targetAmplificationAllowed',label:'スキル・魔力補正',type:'select',defaultValue:'yes',values:[{value:'yes',label:'補正あり'},{value:'no',label:'補正なし（基礎量）'}]});
     }}
  async function prepare(rule){const entry=entries.get(rule?.wikiPlayerKey);if(!entry)return false;if(failed.has(entry.page))throw failed.get(entry.page);if(pages.has(entry.page)){configure(rule,pages.get(entry.page));return true;}if(pending.has(entry.page))return pending.get(entry.page);
   const job=queue.then(async()=>{const response=await fetch('src/data/generated/combatNumericPages/'+String(entry.page).padStart(3,'0')+'.json?v='+encodeURIComponent(index.numericRevision||index.date)+'-numerics');if(!response.ok)throw Error('計算データを読み込めませんでした');const page=await response.json();pages.set(entry.page,page);configure(rule,page);while(pages.size>2)pages.delete(pages.keys().next().value);return true;});
   queue=job.catch(()=>{});pending.set(entry.page,job);try{return await job;}catch(error){failed.set(entry.page,error);throw error;}finally{pending.delete(entry.page);}
  }
  for(const rule of catalog){if(!entries.has(rule.wikiPlayerKey))continue;const original=rule.evaluate;rule.evaluate=function(input={}){const old=original.call(this,input),bundle=get(rule);if(!bundle)return {...old,catalogNumericDeferred:true};try{const value=connect(bundle,numeric,input,old,pages.get(entries.get(rule.wikiPlayerKey).page).skillNames);rule.numericRegistrationAvailable=value.catalogNumeric.values.length>0;return value;}catch(error){return {...old,catalogNumericError:'追加の計算条件を戦闘試行αで指定してください。'};}};}
  root.MOE_BUFF_NUMERIC_REGISTRATION={prepare,ready:rule=>{const entry=entries.get(rule?.wikiPlayerKey);if(!entry)return true;const page=pages.get(entry.page);if(page&&get(rule))configure(rule,page);return !!get(rule);}};
 }
 const api={connect,install};if(common)module.exports=api;else{root.MOE_BUFF_NUMERIC_REGISTRATION_CORE=api;install();}
})(globalThis);
