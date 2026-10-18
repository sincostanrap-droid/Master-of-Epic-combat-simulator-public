// Effective actor conditions, plus the explicitly verified two-trap skill model.
(function(root){'use strict';
 const common=typeof module!=='undefined'&&module.exports;
 const physical=common?require('./clientPhysicalTechniqueReference.js'):root.MOE_CLIENT_PHYSICAL_TECHNIQUE_REFERENCE;
 const extensions=common?require('./combatNumericExtensions.js'):root.MOE_COMBAT_NUMERIC_EXTENSIONS;
 const resource=common?require('./combatResourceFormula.js'):root.MOE_COMBAT_RESOURCE_FORMULA;
 const data=common?require('../data/generated/combatGeneratedActionBindings.generated.js'):root.MOE_COMBAT_GENERATED_ACTION_BINDINGS;
 const physicalDefinitions=common?require('../data/generated/combatGeneratedPhysical.generated.js'):root.MOE_COMBAT_GENERATED_PHYSICAL;
 const abilities=common?require('../data/generated/combatSummonAbilities.generated.js'):root.MOE_COMBAT_SUMMON_ABILITIES;
 const evidence='dist/client-numeric-gaps31-20261016/generated-input-native-oracle.json';
 const trapEvidence='dist/client-numeric-gaps51-20261017/trap-level-skill-native-oracle.json';
 const trapProfiles=Object.freeze({215:{kind:94,selector:7,base:0,template:5,skillClass:4,group:991,children:[2891,1047,13833]},4784:{kind:9,selector:105,base:Math.fround(-1.9),template:3,skillClass:2,group:712,children:[4785,4786,4787]}});
 function trapProfile(parent,binding){const t=trapProfiles[parent?.id],saved=data.bindings[parent?.id+':0'];return t&&parent.primary_raw===46&&binding?.kind===t.kind&&binding.selector===t.selector&&binding.children.length>0&&binding.children.every(id=>t.children.includes(id))&&JSON.stringify(saved?.children)===JSON.stringify(t.children)&&parent.effects.some(e=>e.kind===t.kind&&e.selector===t.selector&&e.value===t.base)?t:null;}
 function trapSkill(level,template){
  if(![3,5].includes(template)||typeof level!=='number'||!Number.isFinite(level)||level<0||level>500)throw Error('確認済みの罠テンプレートと0～500の生成レベルが必要です');
  const a=resource.extendedArithmetic,ratio=a.multiply(a.single(level),a.single(.01));
  // Captured6435b0: x87 level*.01f, clamp0..5, *100f, float32 store,
  // then *10000f and ftol2. The finite supported level domain needs no clamp.
  const storedSkill=a.storeSingle(a.multiply(ratio,a.single(100))),integer=a.trunc(a.multiply(a.single(storedSkill),a.single(10000)));
  return {level:Math.fround(level),template,skillClass:template===3?2:4,coefficient:100,skillRuntimeIndex:33,skillRawId:46,skillInteger:integer,skill:integer/10000,evidence:trapEvidence};
 }
 function trapCondition(parent,binding,condition,casterSkill){
  const profile=trapProfile(parent,binding);if(!profile)throw Error('この生成参照の罠技能テンプレートは未照合です');
  if(condition?.unmodified!==true)throw Error('罠に追加技能補正・属性強化・追加威力補正がない条件を指定してください');
  if(typeof casterSkill!=='number'||!Number.isFinite(casterSkill)||casterSkill<0||casterSkill>resource.skillMax)throw Error('使用者の罠技能を有効な数値で指定してください');
  const integer=Math.round(casterSkill*10000);
  const level=profile.kind===94?extensions.placementInput(profile.selector,profile.base,integer):extensions.summonSelection(extensions.decodeSummonSelector(profile.selector),profile.base,integer,0).level;
  const derivedTrap=trapSkill(level,profile.template);
  return {...condition,skills:{...condition.skills,46:derivedTrap.skill},derivedTrap:{...derivedTrap,parentId:parent.id,group:profile.group,selectionConfirmed:false}};
 }
 function compatible(d){const saved=data.children[d?.id];return !!saved&&([1,4].includes(d.action_type)||d.action_type===2&&!!physicalDefinitions[d.id])&&JSON.stringify(saved)===JSON.stringify(d)&&!d.effects.some(e=>[252,253,254,256].includes(e.kind));}
 function finite(v,label,max){if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>max)throw Error('生成体の'+label+'を指定してください（使用者の入力ではありません）');return v;}
 function fixedBaseInput(d,b){
  if(d?.action_type!==2||!compatible(d)||!b?.children.includes(d.id)||b.variant!==0)return null;
  const a=abilities[b.referenceKey];if(!a||a.variant!==0||a.ruleKey!==b.ruleKey)return null;
  const attack=a.known.find(v=>v.stat===2&&v.mode==='fixed'),hit=a.known.find(v=>v.stat===3&&v.mode==='fixed');
  return attack&&hit?{attack:attack.value,hit:hit.value,referenceKey:b.referenceKey,ruleKey:b.ruleKey,source:'保存基底定義・第0亜種の固定能力2/3',evidence:'src/data/generated/combatSummonAbilities.generated.js'}:null;
 }
 function input(d,condition,binding){
  if(!compatible(d))throw Error('生成体のこの行動型・入力置換分岐は未対応です。物理威力や未知係数を任意入力で代用しません');
  if(condition?.unmodified!==true)throw Error('生成体の追加技能補正・属性強化・追加威力補正なしという計算条件を指定してください');
  let fixedBase=null;if(condition.useKnownBaseStats===true){fixedBase=fixedBaseInput(d,binding);if(!fixedBase)throw Error('この生成参照と行動では攻撃力・命中の固定能力の照合が不足しています');condition={...condition,...fixedBase};}
  if(d.action_type===2){
   const rule=physicalDefinitions[d.id];if(rule.class_runtime!==3)throw Error('生成体の物理入力の保存係数分岐が未確認です');
   if([rule.coefficient,rule.extra_coefficient,rule.upper_limit,rule.extra_upper_limit].some(v=>v!==0)){
    const attack=finite(condition.attack,'現在攻撃力',100000),hit=finite(condition.hit,'現在命中',5000),skill=finite(condition.skills?.[d.primary_raw],'行動技能',resource.skillMax);
    if(![0,1].includes(condition.world))throw Error('生成体が行動する世界条件を指定してください');
    const q=physical.power(rule,{world:condition.world,itemClass:0,weaponAttack:attack,weaponHit:hit,primarySkillInteger:Math.round(skill*10000),casterStateMode:0,hasTarget:true});
    return {x:q.encodedPower,y:q.encodedHit/16,encodedPower:q.encodedPower,encodedHit:q.encodedHit,attack,hit,skill,fixedBase:null,magic:null,physical:true,npcActorType:4,evidence:'dist/client-numeric-gaps36-20261017/generated-physical-native-oracle.json',scope:'生成体NPC自身の攻撃力・命中・現在技能と保存定義の必要技能/係数を既存の物理計算へ渡す。生成レベルや使用者PCの技能を代入しない。通常NPCへの命中済み・追加補正なしの1要求。'};
   }
   const attack=finite(condition.attack,'現在攻撃力',100000),hit=finite(condition.hit,'現在命中',5000),power=Math.min(10000,Math.fround(Math.min(10000,Math.fround(attack))*Math.fround(rule.base_multiplier)));
   const encodedPower=Math.trunc(power),rawHit=Math.trunc(Math.fround(hit)*16),encodedHit=(rawHit+32768)%65536-32768;
   return {x:encodedPower,y:encodedHit/16,encodedPower,encodedHit,attack,hit,fixedBase,skill:null,magic:null,physical:true,evidence:d.id===11961?'dist/client-numeric-gaps36-20261017/impale-physical-native-oracle.json':'dist/client-numeric-gaps32-20261016/generated-physical-native-oracle.json',npcActorType:4,
    scope:'生成体NPC自身の有効攻撃力・命中から格納威力/命中を生成。この保存定義の技能係数0を確認し技能入力を消去。追加威力補正なし。生成レベルからの能力算出ではありません。物理HP量は通常NPC・命中済み・盾/反射/追加補正なしの条件だけ対応。'};
  }
  const skill=finite(condition.skills?.[d.primary_raw],'行動技能',resource.skillMax),integer=Math.round(skill*10000);
  let x,magic=null;
  if(d.action_type===1){magic=finite(condition.magic,'魔力',1000);x=resource.magicActionInput(integer,0,magic);}
  else{const a=resource.extendedArithmetic;x=a.trunc(a.multiply(a.multiply(a.number(integer),a.single(.0001)),a.number(16)))/16;
   if(x<0||x*16>32767)throw Error('生成体の技入力がsigned16格納範囲外です');}
  const derivedTrap=condition.derivedTrap&&binding?.children.includes(d.id)&&d.primary_raw===46?condition.derivedTrap:null;
  return {x,y:x,skill,skillInteger:integer,magic,evidence:derivedTrap?trapEvidence:evidence,npcActorType:4,...(derivedTrap?{derivedTrap}:{}),
   scope:derivedTrap?'生成要求のレベル→確認済みNPC技能テンプレート→罠技能整数→爆発候補の技入力。追加補正なしの1要求。爆発候補の実ID・段階選択・親の総量は未確定。':'生成体自身の現在技能'+(d.action_type===1?'・魔力':'')+'を指定した1行動。追加技能補正・属性強化なし。生成レベルから能力を算出した値ではなく、実際の召喚物の能力値として保証しません。自動発動回数・親の総量は別です。'};
 }
 function reverseNpcInput(d,condition){
  const saved=physicalDefinitions.reverse5470;
  if(!saved||JSON.stringify(saved.definition)!==JSON.stringify(d))throw Error('反転NPCのこの保存行動定義は未確認です');
  if(condition?.unarmedUnmodified!==true)throw Error('元の対象がNPCで、選択した装備枝・追加補正なしの条件を指定してください');
  const rule=saved.physical,skill=finite(condition.skill,'反転子行動技能',resource.skillMax),integer=Math.round(skill*10000),S=Math.fround(integer*Math.fround(.0001));
  if(![0,1].includes(condition.world))throw Error('反転したNPCの世界条件は0または1を指定してください');
  const factor=Math.fround(Math.min(condition.world===1?Infinity:rule.extra_upper_limit,Math.max(Math.fround(.1),1+S*(rule.coefficient+(condition.world===1?0:rule.extra_coefficient)))));
  if(condition.shieldId!=null){
   if(condition.weapon===true)throw Error('NPCの武器枝と盾枝は同時に選択できません');
   const shield=extensions.shieldDefs.shields[condition.shieldId];if(!shield||shield.extra.length)throw Error('NPCが使う盾の保存基礎性能・複合必要技能が未照合です');
   const shieldSkill=finite(condition.shieldSkill,'反転NPCの盾技能',resource.skillMax),fitness=extensions.shieldFitness(shield,Math.round(shieldSkill*10000));
   const power=physical.power(rule,{itemClass:0xd0002,itemPerformance:fitness,itemBase:shield.base,primarySkillInteger:integer,casterStateMode:0,world:condition.world,hasTarget:true});
   return {...power,skill,attack:null,hit:null,weapon:false,shield:{id:shield.id,name:shield.name,base:shield.base,required:shield.required,skill:shieldSkill,fitness},skillInteger:integer,
    evidence:'dist/client-numeric-gaps33-20261016/reverse-npc'+(condition.world===1?'-world1-shield':'-shield')+'-native-oracle.json',scope:'元の対象NPC・保存盾の基礎性能・追加補正なし。盾技能38で適合を計算し、盾基礎性能×適合×0.9と子の主技能由来加算を合成して5470の倍率へ渡す。主技能37と盾技能38を分離。NPCの攻撃力/命中や元の使用者PCの能力をコピーしない'};
  }
  const weapon=condition.weapon===true,attack=weapon?finite(condition.attack,'反転NPCの現在攻撃力',100000):null,hit=weapon?finite(condition.hit,'反転NPCの現在命中',5000):null;
  const basis=weapon?Math.fround(Math.min(10000,Math.fround(attack))*Math.fround(rule.base_multiplier)):Math.fround(S*Math.fround(.1));
  const preSpecialPower=Math.fround(basis*factor),encodedPower=Math.trunc(Math.min(10000,preSpecialPower)),rawHit=Math.trunc((weapon?Math.fround(hit):Math.min(5000,S))*16),encodedHit=(rawHit+32768)%65536-32768;
  return {skill,attack,hit,weapon,skillInteger:integer,preSpecialPower,encodedPower,encodedHit,evidence:condition.world===1?'dist/client-numeric-gaps33-20261016/reverse-npc-world1-'+(weapon?'weapon':'fixed')+'-native-oracle.json':'dist/client-numeric-gaps32-20261016/reverse-npc'+(weapon?'-weapon':'')+'-native-oracle.json',scope:'元の対象NPC・追加補正なし。保存5470の'+(weapon?'武器枝ではNPC自身の有効攻撃力・命中と技能を使います。PC専用の装備・距離補正は通りません。':'装備なし固定枝では現在技能から威力を作り、NPCの攻撃力・命中は採用しません。')+'元の使用者PCの能力をコピーしません。'};
 }
 function children(bundle){const found=new Map();for(const d of [bundle.row.definition,...bundle.row.dependencies].filter(Boolean))for(const e of d.effects){
  const b=data.bindings[d.id+':'+e.index];if(b?.kind===e.kind&&b.selector===e.selector)for(const id of b.children){const c=data.children[id];if(compatible(c))found.set(id,c);}}
  return [...found.values()];}
 function needsSkill(d){const p=physicalDefinitions[d.id];return d.action_type!==2||p&&[p.coefficient,p.extra_coefficient,p.upper_limit,p.extra_upper_limit].some(v=>v!==0);}
 const api=Object.freeze({input,compatible,children,evidence,physicalDefinitions,reverseNpcInput,fixedBaseInput,needsSkill,trapProfile,trapSkill,trapCondition});if(common)module.exports=api;else root.MOE_COMBAT_GENERATED_INPUT_NUMERICS=api;
})(globalThis);
