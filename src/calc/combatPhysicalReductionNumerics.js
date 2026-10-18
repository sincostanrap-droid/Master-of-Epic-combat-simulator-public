(function(root){'use strict';
 const common=typeof module!=='undefined'&&module.exports;
 const data=common?require('../data/generated/combatTargetReductions.generated.js'):root.MOE_COMBAT_TARGET_REDUCTIONS;
 const f=Math.fround;
 function eligibility(d){
  if(!Array.isArray(d?.effects))return {known:false,reason:'行動の効果行が未照合です'};
  let missing=false;
  for(const e of d.effects){
   if(!data.negativeKinds.includes(e.kind)&&!data.positiveKinds.includes(e.kind))continue;
   if(typeof e.value!=='number'||!Number.isFinite(e.value)){missing=true;continue;}
   const b=f(e.value);
   if(data.negativeKinds.includes(e.kind)?b<0:b>0)return {known:true,eligible:true,triggerKind:e.kind};
  }
  return missing?{known:false,reason:'273検査を起動する効果行の数値形式が未確認です'}:{known:true,eligible:false,triggerKind:null};
 }
 function selected(d,selectedId,world,targetFlags=null,kind=273){
  if(![0,1].includes(world))throw Error('世界条件0/1を指定してください');
  const q=eligibility(d);
  if(!q.known)return {...q,supported:false};
  if(!Number.isInteger(selectedId)||selectedId<0)throw Error('受け手側で採用される属性軽減効果を選択してください');
  const definition=selectedId===0?null:(kind===249?data.magicDefinitions:data.definitions)[selectedId];
  if(selectedId!==0&&!definition)throw Error('保存定義を照合した属性軽減効果を選択してください');
  const e=definition?.effects[0];
  const base={supported:true,...q,selectedId,name:definition?.name||kind+'効果なし',element:d.element,percent:e?.value??0,evidence:kind===249?data.magicEvidence:data.evidence,firstRowOnly:true,applies:false,kind,scope:'採用済みの最初の1効果を使用し、同種の値を合算しません。量の生成では魔法軽減→属性軽減→使用者の属性強化→保持量子化の順です。'};
  if(!q.eligible)return {...base,reason:'この行動の効果行は'+kind+'検査を起動しません。通常威力64だけの行動もこの枝では軽減されません'};
  if(!e)return {...base,reason:'受け手に採用された'+kind+'効果なしの条件'};
  if(e.flags&0x1000){if(!Number.isInteger(targetFlags))return {...base,supported:false,reason:'この273行が要求する対象状態bit4の値・意味は画面未対応です'};if(!(targetFlags&4))return {...base,reason:'273行が要求する追加の対象状態条件が不成立'};}
  const normal=!!(e.flags&0x100),war=!!(e.flags&0x200);
  if(normal!==war&&(normal&&world===1||war&&world===0))return {...base,reason:'選択した273行はこの世界条件では無効'};
  if(!Number.isInteger(d.element))return {...base,supported:false,reason:'行動の属性指定が未照合です'};
  if(kind===273&&e.selector!==0&&e.selector!==d.element)return {...base,reason:'選択した最初の273行の属性が不一致。次の効果へ繰り下げません'};
  return {...base,applies:true,reason:null};
 }
 function apply(d,before,{selectedId=null,world=0,targetFlags=null}={}){
  if(typeof before!=='number'||!Number.isFinite(before)||!Number.isFinite(f(before)))throw Error('属性軽減前の1回要求量を指定してください');
  const q=selected(d,selectedId,world,targetFlags),base={...q,before:f(before),after:null};
  if(!q.supported)return base;
  const factor=q.applies?1-f(q.percent)*f(.01):1;
  return {...base,after:q.applies?f(f(before)*factor):f(before),factor,
   scope:'受け手の最初の有効273レコードを選択済みとする、物理本体1回の比較。外部倍率・対象232の後、盾/反射の前。継続HP効果の別要求・他の軽減・最終HP更新は別です。'};
 }
 const selectedMagic=(d,id,world,flags=null)=>selected(d,id,world,flags,249);
 function scaleChannels(d,channels,{magicId=null,elementId=null,world=0,targetFlags=null}={}){
  let m=f(channels.m),a=f(channels.a);if(!Number.isFinite(m)||!Number.isFinite(a))throw Error('軽減前の倍率・加算が必要です');
  const magicReduction=magicId===null?null:selectedMagic(d,magicId,world,targetFlags),targetReduction=elementId===null?null:selected(d,elementId,world,targetFlags);
  for(const q of [magicReduction,targetReduction]){if(!q)continue;if(!q.supported)throw Error(q.reason);if(q.applies){const factor=1-f(q.percent)*f(.01);m=f(m*factor);a=f(a*factor);}}
  return {m,a,...(magicReduction?{magicReduction}:{}),...(targetReduction?{targetReduction}:{})};
 }
 const api=Object.freeze({eligibility,selected,selectedMagic,scaleChannels,apply,definitions:data.definitions,magicDefinitions:data.magicDefinitions,evidence:data.evidence});if(common)module.exports=api;else root.MOE_COMBAT_PHYSICAL_REDUCTION_NUMERICS=api;
})(globalThis);
