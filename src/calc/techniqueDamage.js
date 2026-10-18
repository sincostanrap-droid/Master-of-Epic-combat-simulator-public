(function(root){
  'use strict';
  const common=typeof module!=='undefined'&&module.exports;
  const scopeExclusions=common?require('../data/manual/combatScopeExclusions.manual.js'):root.MOE_COMBAT_SCOPE_EXCLUSIONS;
  const loadCatalog=()=>common?require('../data/generated/attackTechniques.generated.js'):root.MOE_ATTACK_TECHNIQUE_CATALOG;
  const physical=common?require('./clientPhysicalTechniqueReference.js'):root.MOE_CLIENT_PHYSICAL_TECHNIQUE_REFERENCE;
  const magic=common?require('./clientMagicReference.js'):root.MOE_CLIENT_MAGIC_REFERENCE;
  const combat=common?require('./clientCombatReference.js'):root.MOE_CLIENT_COMBAT_REFERENCE;
  const reductionApi=()=>common?require('./combatPhysicalReductionNumerics.js'):root.MOE_COMBAT_PHYSICAL_REDUCTION_NUMERICS;
  const additional=common?require('./additionalTechniqueDamage.js'):root.MOE_ADDITIONAL_TECHNIQUE_DAMAGE;
  const weaponTraits=common?require('../data/generated/weaponSpeciesTraits.generated.js'):root.MOE_WEAPON_SPECIES_TRAITS;
  const additions=common?require('../data/manual/playerCatalogAdditions.manual.js'):root.MOE_PLAYER_CATALOG_ADDITIONS;
  // Keep the formula-backed records stable; player selection also admits
  // explicitly reviewed choices whose calculation has not been connected.
  let entries;
  function selection(){
    if(!entries){const wiki=common?require('../data/generated/wikiPlayerCatalog.generated.js'):root.MOE_WIKI_PLAYER_CATALOG;
      entries=new Map([...loadCatalog().records,...(additions?.attacks||[]),...(wiki?.attacks||[])].filter(r=>!scopeExclusions?.exclusion(r)).map(r=>[r.key,r]));}
    return entries;
  }
  const f=Math.fround,clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),number=(n,fallback=0)=>Number.isFinite(+n)&&n!==''?+n:fallback;
  const get=key=>selection().get(key)||null;
  const has=(d,k)=>d.effects?.some(e=>e.kind===k);
  const elementNames={2:'無',3:'火',4:'水',5:'風',6:'地'};
  const resistanceNames={4:'AC',7:'無',8:'火',9:'水',10:'風',11:'地'};
  // These public 239 definitions explicitly name their target in the existing
  // descriptions. Do not invent names for the remaining predicate selectors.
  const targetRaces={1:'undead',3:'demon'};
  const targetNames={undead:'アンデッド',dragon:'ドラゴン',demon:'悪魔',giant:'巨人',chaos:'カオス',bird:'鳥'};
  const rotationTargetProfiles=Object.freeze({gigas:'ギガース',garp:'ガープ（ネオク高原）',
    eligos:'エリゴス',ezeijia:'エゼイジア','cave-gigas':'ケイブ ギガース',
    'gigas-madness':'ギガース マッドネス','gigas-twin':'ギガース ツイン',
    'giant-destroyer':'ジャイアント デストロイヤー'});
  const isRotation=entry=>(entry?.hits||[entry]).some(h=>h?.definition?.id===5823);
  function targetTechniqueModifier(entry,c={}){
    // NPC kind19 lists a specific stable technique ID. Native800ff0 resolves
    // it through7746e0/823a10, then4890 supplies both main and extra inputs.
    // Only verified NPC profiles are admitted; race alone is insufficient.
    // The Neok Garp shares Eligos's definition. A same-name Garp in another
    // resource lacks the entry, so its name alone does not establish a match.
    const profile=isRotation(entry)&&Object.hasOwn(rotationTargetProfiles,c.rotationTargetProfile)?c.rotationTargetProfile:'';
    return {profile,name:rotationTargetProfiles[profile]||'',applies:!!profile,multiplier:profile?3:1};
  }
  function weaponSpecial(weapon,targetRace){
    const id=weapon?.catalogId||(/^[0-9]+$/.test(String(weapon?.officialId||''))?`official-weapon-${weapon.officialId}`:'');
    const trait=weaponTraits?.records[id];
    const selected=!trait?.requiresSelection||weapon?.weaponInnateSpecialEnabled===true;
    return trait?{...trait,selected,applies:trait.supported&&selected&&targetRace===trait.target}:null;
  }
  // Constructor 3e66..3f11: the innate bonus is added once before selected244.
  // Native fixture verifies the float32 store and the OR of the two triggers.
  function innatePower(power,applies){return applies?f(power+Math.max(0,power*f(.2))):power;}
  function splitSpeciesBuffEffects(st,hasOtherEffect){
    //13132's conversion remains active when another selected244 replaces only
    //its racial effect. Reuse the already declared special:latest rule.
    const composite=(st.composite||[]).flatMap(row=>{
      const id=Number(row.clientBuffDefinitionId),definition=weaponTraits?.buffRecords?.[id];
      if(id!==13132||!definition)return [row];
      const base={...row,special:1};
      return [base,{enabled:row.enabled,excluded:row.excluded,
        slot:hasOtherEffect(base)?false:row.slot!==false,name:row.name+'（種族特攻）',
        tags:'special:latest',stackRule:'latest',special:number(row.special,1)===1?definition.value:row.special,
        specialTarget:row.specialTarget||definition.target}];
    });
    return {...st,composite};
  }
  function speciesNote(weapon,targetRace){
    const trait=weaponSpecial(weapon,targetRace);
    if(!trait)return '';
    if(trait.requiresSelection&&!trait.selected)return `武器の${targetNames[trait.target]}特攻: ${weapon.weaponInnateSpecialEnabled===false?'なし':'未確認（ゲーム内infoで確認）'}。`;
    return trait.supported?`武器の${targetNames[trait.target]}特攻: ${trait.applies?'適用':'対象外'}。`
      :`武器の${targetNames[trait.target]}特攻は対象・適用経路未確認のため計算へ未反映です。`;
  }
  function techniqueSpeciesNote(entry,c){
    if(!isRotation(entry))return '';
    if(c){const modifier=targetTechniqueModifier(entry,c);
      return `回転斬りの対象補正: ${modifier.applies?modifier.name+'に適用（本体・追撃、倍率非公開）':'なし'}。`;}
    return '回転斬りの対象補正は、確認済みの対象を選ぶと本体と追撃へ適用します（倍率非公開）。対象種族の巨人とは別に選択してください。';
  }
  function bonuses(rows,entry){
    if(entry.calculationSupported===false)return {magicPct:0,elementPct:0,additionalElementPct:0,skillBuffs:[]};
    let magicPct=0,elementPct=0,additionalElementPct=0;
    const skillBuffs=[];
    for(const row of rows||[]) {
      if(row.enabled===false||row.excluded)continue;
      const effects=[];
      for(const e of row.extraEffects||[]) {
        if(e.key==='skillPlus'&&e.name===entry.skillName)effects.push({kind:235,selector:entry.definition.primary_runtime??entry.definition.primary_raw,value:number(e.value),flags:48});
        if(e.key==='elementDamagePct'&&e.name===elementNames[entry.definition.element]+'属性')elementPct=f(elementPct+number(e.value));
        if(e.key==='elementDamagePct'&&e.name===elementNames[entry.additional?.element]+'属性')additionalElementPct=f(additionalElementPct+number(e.value));
        if(e.key==='custom'&&e.name==='魔法与ダメージ'&&e.unit==='%')magicPct=f(magicPct+number(e.value));
      }
      if(effects.length)skillBuffs.push({effects});
    }
    return {magicPct,elementPct,additionalElementPct,skillBuffs};
  }
  const displayNumber=n=>String(Math.round((n+Number.EPSILON)*10)/10);
  function powerLabel(entry){
    if(entry.calculationSupported===false)return '';
    const d=entry.definition;
    if(entry.family==='magic'||(entry.itemClass===0&&d.fixed_branch_predicate))return '';
    const random=d.effects.find(e=>e.kind===205);
    // Display the technique's combined multiplier. This label is never fed
    // back into power encoding or the separate native multiplier consumer.
    const post=has(d,33)?d.post_defense_multiplier:1;
    const label=n=>post===1?displayNumber(n):displayNumber(n*post);
    return random?`${label(Math.min(random.value,random.selector))}〜${label(Math.max(random.value,random.selector))}倍`:`${label(d.base_multiplier)}倍`;
  }
  function optionLabel(entry){
    if(entry.calculationSupported===false)return `${entry.name}（計算未対応）`;
    const hits=entry.hits||[entry];
    const labels=[powerLabel(entry),hits.length>1?`最大${hits.length}段`:'',entry.damageIssues?.length?'一部未対応':''].filter(Boolean);
    return entry.name+(labels.length?`（${labels.join('・')}）`:'');
  }
  function resultLabel(p){
    if(p.supported===false)return '計算未対応';
    if(p.partial)return `計算対応分 ${p.hitCount}段の小計`;
    if(p.additionalCount)return '追加・継続を含む発動・命中時合計';
    return p.hitCount>1?`全${p.hitCount}段の発動・命中時合計`:'発動・命中時の1発平均';
  }
  function calculateHit(entry,c){
    const d=entry.definition,skill=Math.max(0,number(c.skill)),samples=[];
    const targetModifier=targetTechniqueModifier(entry,c);
    // Encode weapon/technique power first. The NPC-specific factor is passed
    // once through the shared incoming argument, independently of innate244.
    const incoming=targetModifier.applies?f(c.incoming*targetModifier.multiplier):c.incoming;
    let power=null,gate=null,additionalAverage=0,baseAverage=0,additionalCount=0,selfDamageAverage=0;
    // Formal magic entries encode the verified single positive kind2 as base.
    // Prefer the full matched definition supplied by the common screen; this
    // fallback is only the existing type1/class2 single-HP API contract.
    const reductionDefinition=c.targetReductionDefinitions?.[d.id]||(entry.family==='magic'&&d.action_type===1&&d.effect_class===2&&d.base>0?{...d,effects:[{kind:2,value:d.base}]}:d);
    const targetReduction=c.targetPhysicalReductionId!=null?reductionApi().selected(reductionDefinition,c.targetPhysicalReductionId,0):null;
    const targetMagicReduction=c.targetMagicReductionId!=null?reductionApi().selectedMagic(reductionDefinition,c.targetMagicReductionId,0):null;
    if(targetReduction&&!targetReduction.supported)throw Error(targetReduction.reason);
    if(targetMagicReduction&&!targetMagicReduction.supported)throw Error(targetMagicReduction.reason);
    if(entry.family==='physical') {
      const random=d.effects.find(e=>e.kind===205);
      const lo=random?Math.min(random.value,random.selector):0,hi=random?Math.max(random.value,random.selector):1;
      const random15=random?Math.round((clamp(number(c.randomPower,(lo+hi)/2),lo,hi)-lo)/(hi-lo)*32767):0;
      const target=d.effects.find(e=>e.kind===239);
      power=physical.power(d,{itemClass:entry.itemClass,primarySkillInteger:Math.round(skill*10000),
        casterStateMode:1,statCache:c.statCache,buffRecords:c.skillBuffs||[],
        weaponAttack:Math.max(0,c.attack-number(c.conversionAttack)),weaponHit:c.hit,
        attackConversions:[{kind:255,source:1,fraction:number(c.conversionAttack)}],
        stats:{4:c.defense,6:c.magic},casterPhysicalPowerFraction:c.powerMultiplier-1,
        casterElementStrengthFraction:number(c.elementPct)/100,
        random15,resource218:100,resource228:clamp(number(c.hpPercent,100),0,100),
        targetPredicateSelectors:target&&(c.targetRace!=null?targetRaces[target.selector]===c.targetRace:c.specialTarget)?[target.selector]:[]});
      // The build's selected target-specific multiplier belongs before encoding.
      const innateApplied=power.route==='weapon'&&!!c.weaponSpecial?.applies;
      power={...power,innateApplied,...combat.encodePhysicalPower(f(innatePower(power.preSpecialPower,innateApplied)*c.specialMultiplier))};
      gate=combat.physicalHitGate({encodedHit:power.encodedHit,evasion:c.evasion,seed:0});
      const base=seed=>physical.npcDamage(d,{encodedPower:power.encodedPower,defense:c.targetDefense,seed,incoming},
        {target232:{value:c.targetMultiplier-1},...(targetReduction?{target273:targetReduction}:{})}).clientMessageAmount;
      if(entry.additional){
        const extraReduction=c.targetPhysicalReductionId!=null?reductionApi().selected(entry.additional,c.targetPhysicalReductionId,0):null;
        const extraMagicReduction=c.targetMagicReductionId!=null?reductionApi().selectedMagic(entry.additional,c.targetMagicReductionId,0):null;
        if(extraReduction&&!extraReduction.supported)throw Error(extraReduction.reason);
        if(extraMagicReduction&&!extraMagicReduction.supported)throw Error(extraMagicReduction.reason);
        const extraInput={...additional.inputs(entry,c,power),...(extraReduction?{targetElementReductionPct:extraReduction.applies?extraReduction.percent:0}:{}),...(extraMagicReduction?{targetMagicReductionPct:extraMagicReduction.applies?extraMagicReduction.percent:0}:{}),
          resistance:entry.additional.element===1?c.targetDefense:c.resistance,
          incoming:Math.max(Number.MIN_VALUE,incoming),casterElementStrengthPct:number(c.additionalElementPct)};
        const threshold=additional.evaluate(entry.additional,{...extraInput,seed:0}).halfResistThreshold;
        const full=threshold===null?100:clamp(Math.floor(threshold)+1,0,100);
        for(const [residue,weight]of [[0,full],[99,100-full]])if(weight)for(let jitter=0;jitter<21;jitter++){
          const seed=residue+100*((jitter-residue%21+21)*4%21);
          const extra=additional.evaluate(entry.additional,{...extraInput,seed}),main=base(seed);
          let total=0,rawTotal=0,self=0;
          additionalCount=extra.rows.filter(r=>!r.self).reduce((s,r)=>s+r.count,0);
          for(const row of extra.rows){
            const value=incoming===0?0:Math.max(0,row.amount*c.targetMultiplier);
            const capped=c.finalCap>0?Math.min(value,c.finalCap):value;
            if(row.self)self+=Math.max(0,row.amount)*row.count;else {total+=capped*row.count;rawTotal+=value*row.count;}
          }
          const cappedMain=c.finalCap>0?Math.min(main,c.finalCap):main;
          baseAverage+=weight*cappedMain/2100;additionalAverage+=weight*total/2100;selfDamageAverage+=weight*self/2100;
          samples.push({weight,value:cappedMain+total,rawValue:main+rawTotal,alreadyCapped:true});
        }
      }else for(let seed=0;seed<21;seed++)samples.push({weight:1,value:base(seed)});
    } else {
      const skillApi=common?require('./clientSkillInputReference.js'):root.MOE_CLIENT_SKILL_INPUT_REFERENCE;
      const resourceApi=common?require('./combatResourceFormula.js'):root.MOE_COMBAT_RESOURCE_FORMULA;
      const adjustment=skillApi.aggregate(c.skillBuffs||[],235,d.primary_runtime??d.primary_raw);
      const actionInput=c.combatActionInput??(adjustment?resourceApi.magicActionInput(Math.round(skill*10000),adjustment,(d.effects||[]).some(e=>e.kind===256)?c.attack:c.magic):null);
      const input={skill,magic:c.magic,resistance:d.resistance_ordinal===4?c.targetDefense:c.resistance,
        ...(targetReduction?{targetElementReductionPct:targetReduction.applies?targetReduction.percent:0}:{}),
        ...(targetMagicReduction?{targetMagicReductionPct:targetMagicReduction.applies?targetMagicReduction.percent:0}:{}),
        ...(actionInput==null?{}:{actionInput,secondaryInput:actionInput}),
        casterMagicPowerPct:number(c.magicPct),casterElementStrengthPct:number(c.elementPct),
        incoming:Math.max(Number.MIN_VALUE,c.incoming),hpEffects:{target232:{value:c.targetMultiplier-1}}};
      // 100 and 21 are coprime. Group the 2100 residues by the two resist
      // outcomes, retaining exact weight and each of the 21 jitter residues.
      const probe=magic.evaluate(d,{...input,seed:0});
      const threshold=probe.halfResistThreshold;
      const full=threshold===null?100:clamp(Math.floor(threshold)+1,0,100);
      for(const [residue,weight]of [[0,full],[99,100-full]])if(weight)for(let jitter=0;jitter<21;jitter++) {
        const seed=residue+100*((jitter-residue%21+21)*4%21);
        const r=magic.evaluate(d,{...input,seed});
        samples.push({weight,value:c.incoming===0?0:Math.max(0,r.clientMessageAmount||0)});
      }
    }
    const uncapped=samples.map(r=>({...r,value:r.rawValue??r.value}));
    if(c.finalCap>0)for(const row of samples)if(!row.alreadyCapped)row.value=Math.min(row.value,c.finalCap);
    const weight=samples.reduce((s,r)=>s+r.weight,0),average=samples.reduce((s,r)=>s+r.value*r.weight,0)/weight;
    const hitRatePct=entry.family==='magic'?null:has(d,214)?100:gate.hitFractionIfUniformResidues*100;
    return {family:entry.family,techniqueName:entry.name,skillName:entry.skillName,skill,
      average,minimum:Math.min(...samples.map(r=>r.value)),maximum:Math.max(...samples.map(r=>r.value)),
      normalMean:average,criticalMean:average,criticalRate:0,hitRatePct,
      hitInput:gate?.hit??null,hitThreshold:gate?.threshold??null,unboundedHitThreshold:gate?.unboundedThreshold??null,
      encodedPower:power?.encodedPower??null,encodedHit:power?.encodedHit??null,
      defenseFactor:power?.encodedPower?average/(power.encodedPower*.8):0,
      power,...(isRotation(entry)?{targetTechniqueModifier:targetModifier}:{}),uncappedAverage:uncapped.reduce((s,r)=>s+r.value*r.weight,0)/weight,
      additionalAverage,additionalCount,selfDamageAverage,baseAverage:entry.additional?baseAverage:average,
      scope:'single-hit',distributionModel:'uniform-arithmetic-period'};
  }
  function calculate(entry,c){
    if(entry.calculationSupported===false)return {
      supported:false,reason:entry.calculationReason,family:entry.family,techniqueName:entry.name,skillName:entry.skillName,
      average:null,minimum:null,maximum:null,hitRatePct:null,unboundedHitThreshold:null,defenseFactor:null,
      hits:[],hitCount:0
    };
    const definitions=entry.hits||[entry];
    const routingMissing=entry.damageIssues?.includes('weapon-routing');
    const requested=number(c.hitCount,definitions.length);
    const hitCount=routingMissing?1:clamp(Math.trunc(requested),1,definitions.length);
    const hits=definitions.slice(0,hitCount).map((hit,index)=>{
      const context=c.hitContexts?.[index]||{};
      const result=calculateHit({...hit,name:entry.name},{...c,...context});
      return {...result,index:index+1,powerLabel:powerLabel(hit),required:hit.definition.required};
    });
    const sum=key=>hits.reduce((n,h)=>n+h[key],0),average=sum('average');
    return {...hits[0],average,minimum:sum('minimum'),maximum:sum('maximum'),
      uncappedAverage:sum('uncappedAverage'),normalMean:average,criticalMean:average,
      baseAverage:sum('baseAverage'),additionalAverage:sum('additionalAverage'),additionalCount:sum('additionalCount'),selfDamageAverage:sum('selfDamageAverage'),
      hits,hitCount,maxHitCount:definitions.length,partial:!!entry.damageIssues?.length,
      damageIssues:entry.damageIssues||[],scope:hitCount>1?'all-hits':'single-hit'};
  }
  const api=Object.freeze({get,get records(){return loadCatalog().records.filter(r=>!scopeExclusions?.exclusion(r));},get selectionRecords(){return [...selection().values()];},calculate,bonuses,resistanceNames,powerLabel,optionLabel,resultLabel,
    targetRaces,targetNames,weaponSpecial,innatePower,splitSpeciesBuffEffects,speciesNote,techniqueSpeciesNote,
    isRotation,rotationTargetProfiles,targetTechniqueModifier});
  if(common)module.exports=api;else root.MOE_TECHNIQUE_DAMAGE=api;
})(globalThis);
