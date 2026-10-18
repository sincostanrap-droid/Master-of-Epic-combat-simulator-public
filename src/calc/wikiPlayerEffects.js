(function(root){
  'use strict';
  const common=typeof module!=='undefined'&&module.exports;
  const scopeExclusions=common?require('../data/manual/combatScopeExclusions.manual.js'):root.MOE_COMBAT_SCOPE_EXCLUSIONS;
  const data=common?require('../data/generated/wikiPlayerCatalog.generated.js'):root.MOE_WIKI_PLAYER_CATALOG;
  const timing=common?require('./effectTiming.js'):root.MOE_EFFECT_TIMING;
  const f=Math.fround,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const norm=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[\s・･_\-]+/g,'');
  const effectSkillNames=(common?require('../data/generated/combatSkillNames.generated.js'):root.MOE_COMBAT_SKILL_NAMES).rawNames;
  const formulas=(common?require('./combatEffectFormulas.js'):root.MOE_COMBAT_EFFECT_FORMULAS).create(effectSkillNames);
  const {fields,labels,effectFields,kindNames,inputX,channels,statReason,timeStatus,duration}=formulas;
  const byId=new Map(data.rows.map(r=>[r.id,r]));
  function coverage(row){
    const d=row.definition;
    if(!d)return [{id:row.key,name:'効果量',supported:false,reason:row.matchStatus==='内部データなし'?'内部データなし':'内部IDの照合未完了'}];
    if(!d.effects.length)return [{id:d.id+':header',definitionId:d.id,name:'動作・外見効果',supported:false,quantitySupported:false,reason:'定義ヘッダ・動作条件の解析なし'}];
    return [d,...row.dependencies].flatMap(n=>n.effects.map(e=>{
      const quantity=n.id===d.id&&!statReason(n,e),generic=quantity&&row.recipient==='player';
      const old=e.kind===147&&row.legacyPercentage?.definitionId===n.id||e.kind===132&&row.legacyCritical?.definitionId===n.id;
      const body=row.attackSupported&&n.id===d.id&&[2,12,33,54,64,164,190,205,206,214,239,252,253,254,258,235].includes(e.kind)&&!(row.attackIssues||[]).includes('additional-damage');
      return {id:n.id+':'+e.index,definitionId:n.id,index:e.index,kind:e.kind,
      ...(d.id===323&&quantity?{combatSupported:true,combatAdapter:'samurai-heart-successful-use',combatScope:'対象条件指定・同技競合・発動成功時の戦闘試行'}:{}),
      name:[41,147].includes(e.kind)?(labels[e.selector]||'能力補正'):e.kind===235?'効果用'+effectSkillNames[e.selector]:kindNames[e.kind]||'付随効果',
      supported:generic||old||body,quantitySupported:quantity||old||body,adapter:generic?'stat':quantity?'quantity-only':old?'existing-buff':body?'attack':'unsupported',
      reason:generic||old||body?'':d.id===323&&quantity?'戦闘試行で対象へ適用。登録のみでは自己の常時Buffへ適用しない':n.id!==d.id?'付随効果の条件・入力継承は未対応':statReason(n,e)|| (row.recipient==='player'?'':'適用対象をプレイヤーの能力値へ接続できない')};}));
  }
  function evaluate(row,input={},previous={}){
    const result={...previous,clientBuffDefinitionId:row.internalId?String(row.internalId):undefined};
    const statuses=coverage(row),d=row.definition,known=new Set(),skillEffects=[],quantities=[];
    if(d){
      for(const e of d.effects){
        if(statReason(d,e))continue;
        const world=+input.world===1?1:0;
        const a=!!(e.flags&0x100),b=!!(e.flags&0x200);
        const active=!(a!==b&&(a&&world===1||b&&world!==1));
        const c=e.kind===41?channels(d,input):null,value=active?(e.kind===41?f(f(e.value)*c.m+(e.value<0?-c.a:c.a)):e.kind===132?e.value*100:e.value):0;
        if(row.recipient!=='player'){quantities.push({key:'custom',name:'効果量 '+(labels[e.selector]||kindNames[e.kind]||'能力補正')+(d.id===323?'（計算タブの戦闘試行で適用）':'（対象への適用は計算未対応）'),value,unit:e.kind===147||e.kind===132?'%':'',scope:'display',note:''});continue;}
        if(e.kind===235){skillEffects.push({key:'skillPlus',name:effectSkillNames[e.selector],value,unit:'',scope:'both',note:''});continue;}
        for(const field of effectFields(e)){if(!known.has(field))result[field]=0;known.add(field);result[field]+=value;}
      }
    }
    const seconds=duration(row,input);
    if(seconds!==null)result.durationSeconds=seconds;else delete result.durationSeconds;
    // Unsupported values remain absent; the display marker has no numeric
    // meaning and the calculator identifies it before aggregating totals.
    const missing=statuses.filter(s=>!s.supported&&d?.id!==323);
    const replacedSkills=new Set(skillEffects.map(e=>e.name));
    const extra=(previous.extraEffects||[]).filter(e=>!/^計算未対応[:：]/.test(e.name||'')&&!(e.key==='skillPlus'&&replacedSkills.has(e.name)));
    extra.push(...skillEffects);
    extra.push(...quantities);
    if(known.size)extra.push({key:'custom',name:'能力補正は変動を含まない基準値',unit:'',scope:'display',note:''});
    if(missing.length)extra.push({key:'custom',name:'計算未対応：'+[...new Set(missing.map(s=>s.name+'（'+s.reason+'）'))].join(' / '),unit:'',scope:'display',note:''});
    if(seconds===null)extra.push({key:'custom',name:'計算未対応：効果時間（'+timeStatus(row).reason+'）',unit:'',scope:'display',note:''});
    if(d?.id===323){
      result.combatActionId=323;
      extra.push({key:'custom',name:'戦闘試行対応：対象の防御力・ダメージへ適用、効果終了、同技の更新、成功時ST消費。登録だけでは常時適用しません',unit:'',scope:'display',note:''});
      extra.push({key:'custom',name:'計算未対応：発動成功率・詠唱／再使用待ち、失敗時の消費、他技との競合、追加ST補正',unit:'',scope:'display',note:''});
    }else if(d?.group&&!row.prior)extra.push({key:'custom',name:'計算未対応：競合の強弱・上書き条件',unit:'',scope:'display',note:''});
    if([114,131,142,153,158,324].includes(d?.id)){
      result.combatActionId=d.id;
      extra.push({key:'custom',name:'戦闘試行対応：計算タブの能力Buff試行で開始・終了・個別競合・成功時資源消費を再現。成功判定・発動／再使用待ち・失敗時消費は計算未対応',unit:'',scope:'display',note:''});
    }
    if(row.isAttack)extra.push({key:'custom',name:'攻撃のダメージは「攻撃の種類」で選択して計算',unit:'',scope:'display',note:''});
    result.extraEffects=extra;
    return result;
  }
  function metadataText(row){const m=row.metadata;return [row.requirements.length?'必要スキル '+row.requirements.map(r=>r.skill+' '+(r.min??r.max)+(r.max!=null?'以下':'以上')).join(' / '):m.requirements?'スキル条件 '+m.requirements:'',m.costST!=null?'消費ST '+m.costST:'',m.costMP!=null?'消費MP '+m.costMP:'',m.catalyst?'触媒 '+m.catalyst:'',m.activation?'発動/詠唱 '+m.activation+'（wiki表値・秒換算未対応）':'',m.delay?'Delay '+m.delay+'（wiki表値・秒換算未対応）':'',m.multiplier?'威力倍率 '+m.multiplier:'',m.range?'射程 '+m.range:''].filter(Boolean).join(' / ');}
  function installCatalog(){
    const catalog=root.MOE_REVIEWED_BUFF_CATALOG_MANUAL;if(!Array.isArray(catalog))return;
    for(const row of data.rows){
      if(scopeExclusions?.exclusion(row))continue;
      let rule=catalog.find(r=>norm(r.name)===norm(row.name));
      if(rule?.wikiCoverageInstalled)continue;
      if(!rule){rule={id:row.id,name:row.name,category:row.category,inputKind:'none',evaluate(){return {};}};catalog.push(rule);}
      const old=rule.evaluate,amounts=coverage(row),time=timeStatus(row),d=row.definition;
      rule.wikiCoverageInstalled=true;rule.wikiPlayerKey=row.key;rule.wikiCoverage=amounts;rule.wikiTimeStatus=time;rule.wikiRow=row;
      rule.calculationSupported=amounts.some(s=>s.quantitySupported)||row.prior&&rule.calculationSupported!==false;
      rule.description=row.info+'\n'+metadataText(row);
      if(d&&(time.supported||amounts.some(s=>s.quantitySupported))){rule.inputKind=d.action_type===1?'skillMagic':'skill';rule.skillLabel=d.requirements[0]?.skill||row.requirements[0]?.skill;rule.defaultSkill??=100;rule.defaultMagic??=100;}
      rule.evaluate=function(input={}){try{return evaluate(row,input,old.call(this,input));}catch(error){return {extraEffects:[{key:'custom',name:'計算未対応：'+error.message,unit:'',scope:'display',note:''}]};}};
      if(d&&(d.duration_extra||d.effects.some(e=>e.flags&(0x100|0x200)))&&!(rule.catalogOptions||[]).some(o=>o.key==='world'))
        rule.catalogOptions=[...(rule.catalogOptions||[]),{key:'world',type:'number',defaultValue:0,min:0,max:1,step:1,label:'世界条件（0:通常 / 1:War Age）'}];
      if(d&&amounts.some(s=>s.supported)&&![1,2].includes(d.element)&&!(d.flags&0x1000)&&!(rule.catalogOptions||[]).some(o=>o.key==='casterElementStrengthPct'))
        rule.catalogOptions=[...(rule.catalogOptions||[]),{key:'casterElementStrengthPct',type:'number',defaultValue:0,step:'any',label:'使用者の属性強化（%）'}];
    }
    // Explicit request to revisit the full wiki supersedes the old omissions.
    const publicNames=new Set(data.rows.map(r=>norm(r.name)));
    root.MOE_REVIEWED_BUFF_CATALOG_EXCLUDED_NAMES=[...(root.MOE_REVIEWED_BUFF_CATALOG_EXCLUDED_NAMES||[]).filter(name=>!publicNames.has(norm(name))),...(scopeExclusions?.names||[])];
  }
  function refreshState(st){
    // Only this import's catalog rows use the new adapter; a custom/legacy row
    // without casting inputs keeps its saved values and user-written fields.
    return {...st,composite:(st.composite||[]).map(row=>{
      if(row.catalogNumeric?.version===1)return row; // Keep the numerical engine's cast-time values; do not replace them with legacy estimates.
      const entry=byId.get(row.catalogRuleId);
      if(!entry||!row.catalogInputs)return row;
      let calculated;try{calculated=evaluate(entry,row.catalogInputs);}catch(error){calculated={extraEffects:[{key:'custom',name:'計算未対応：'+error.message,unit:'',scope:'display',note:''}]};}
      const copy={...row},controlled=new Set(coverage(entry).filter(s=>s.adapter==='stat').flatMap(s=>effectFields(entry.definition.effects[s.index])));
      for(const key of controlled){if(calculated[key]!=null)copy[key]=calculated[key];else delete copy[key];}
      if(calculated.durationSeconds!=null)copy.durationSeconds=calculated.durationSeconds;
      if(!entry.prior)copy.extraEffects=calculated.extraEffects;
      else {const skills=(calculated.extraEffects||[]).filter(e=>e.key==='skillPlus'),names=new Set(skills.map(e=>e.name));
        if(skills.length)copy.extraEffects=[...(row.extraEffects||[]).filter(e=>e.key!=='skillPlus'||!names.has(e.name)),...skills];}
      return copy;
    })};
  }
  function incomplete(row){const entry=byId.get(row.catalogRuleId);return entry?coverage(entry).some(s=>!s.supported)||!timeStatus(entry).supported||!!(entry.definition?.group&&!entry.prior)||(row.extraEffects||[]).some(e=>/入力範囲外/.test(e.name||'')):null;}
  const api={data,byId,coverage,timeStatus,duration,channels,evaluate,metadataText,installCatalog,refreshState,incomplete,norm};
  if(common)module.exports=api;else root.MOE_WIKI_PLAYER_EFFECTS=api;
})(globalThis);
