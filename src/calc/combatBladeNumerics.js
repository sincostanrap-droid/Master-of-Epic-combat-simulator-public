// Actual post-hit child table, distinct from the kind49 visual payload.
(function(root){'use strict';
 const common=typeof module!=='undefined'&&module.exports;
 const data=common?require('../data/generated/combatBladeChildren.generated.js'):root.MOE_COMBAT_BLADE_CHILDREN;
 function definitions(slot,mode){
  const selected=data.children[slot?.[mode]];if(!selected)return [];
  const found=new Map();function visit(d){if(found.has(d.id))return;found.set(d.id,d);for(const e of d.effects)if(e.kind===86&&data.children[e.selector])visit(data.children[e.selector]);}
  visit(selected);return [...found.values()];
 }
 function inputs(bundle,selectedMode=null){
  const found=new Map();for(const d of [bundle.row.definition,...bundle.row.dependencies].filter(Boolean))for(const e of d.effects)if(e.kind===49){
   const slot=data.slots[e.selector];for(const mode of selectedMode?[selectedMode]:['normal','dual','twin'])for(const child of definitions(slot,mode))found.set(child.id,child);
  }return [...found.values()];
 }
 function calculate(selector,bundle,p,names,evaluate){
  const slot=data.slots[selector];if(!slot)throw Error('ブレイドの子選択表との照合なし');
  if(!['normal','dual','twin'].includes(p.bladeMode))throw Error('追撃の採用枝（通常・二刀流・双棍）を指定してください');
  if(p.bladeSelected!==true)throw Error('このブレイドが最初の有効候補として選ばれ、追撃が成立する条件を指定してください');
  const defs=definitions(slot,p.bladeMode),child=defs[0];
  if(!child)throw Error('選択した枝は子IDが0です。通常枝への適合を確認して通常を指定してください');
  const name=names[child.primary_raw],skill=p.skills?.[name];
  if(skill==null||skill===''||!Number.isFinite(+skill))throw Error('追撃使用者の'+(name||'技能')+'を指定してください');
  const cb={row:{...bundle.row,internalId:child.id,definition:child,dependencies:defs.slice(1)},numericReferences:data.numericReferences,attack:null};
  // Parent M/A and buff-caster input do not enter type45's action constructor.
  const cp={...p,skill:+skill,bladeMode:undefined,bladeSelected:false,referenceChainConfirmed:p.referenceChainConfirmed===true,
   damageContext:p.damageContext?{...p.damageContext,attack:p.bladeWeaponAttack,hit:p.bladeWeaponHit}:undefined};
  const result=evaluate(cb,cp,names);
  return {id:child.id,name:child.name,selector:slot.selector,mode:p.bladeMode,definitions:defs.map(d=>({id:d.id,name:d.name})),
   effects:result.effects,times:result.times,physicalResults:result.physicalResults,constructorErrors:result.constructorErrors,pending:result.pending,
   aggregate:result.referenceAggregate,graph:result.referenceGraph,
   poisonSingleHit:bundle.row.internalId===2852,postAttackOne:child.id===12286,
   numericCount:result.rootNumericCount+result.childNumericCount+result.physicalResults.length,
   scope:(child.id===12286?'アタック後に成立した追撃1回。内部の物理成分と追加HP作用は別成分で、2回の追撃を意味しない。':'')+'この追撃が選択・受理され、命中した1機会の条件付き量。魔法追撃は他の効果技能加算Buff・威力半減状態なし。追撃使用者の現在の技能・装備から再生成し、Buff使用者の魔力や親のM/Aは継承しない。指定種値の1回値で平均ではない。',
   remaining:'攻撃本体とは別の追撃。Buff全期間の自動発動回数・総量、複数ブレイドの優先選択、受理/命中率は計算しない。二刀流を優先し、装備/対象不適合なら通常へ戻る。入力は適合判定後の採用枝。'};
 }
 const api=Object.freeze({inputs,calculate,definitions});if(common)module.exports=api;else root.MOE_COMBAT_BLADE_NUMERICS=api;
})(globalThis);
