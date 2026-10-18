// Independent, verified branches of 63fd50. Unknown growth is never supplied as zero.
(function(root){'use strict';
 const data=typeof module!=='undefined'&&module.exports?require('../data/generated/combatSummonAbilities.generated.js'):root.MOE_COMBAT_SUMMON_ABILITIES;
 const labels=['HP','MP','攻撃力','命中','防御力','回避','魔力','無属性耐性','火耐性','水耐性','風耐性','地耐性','基礎ST','最大重量'];
 const f=Math.fround;
 function value(spec,level){
  if(spec.mode==='fixed'&&Number.isFinite(spec.value))return Math.max(0,f(spec.value));
  if(!Number.isFinite(level)||level<=0||level>150)throw Error('能力構築に渡す生成レベルが必要です');
  if(spec.mode==='linear'&&Number.isFinite(spec.slope)&&Number.isFinite(spec.base))return Math.max(0,f(f(level)*f(spec.slope)+f(spec.base)));
  throw Error('召喚能力の式または係数が未確定');
 }
 function calculate(referenceKey,level,baseVariantSelected){
  const candidate=data[referenceKey];if(!candidate)return null;
  const scope='保存済み基底定義の第0亜種を採用し、表示した生成レベルを能力構築へ渡す条件。生成後の追加補正・他亜種・サーバー最終値は別';
  if(baseVariantSelected!==true)return {candidate,scope,reason:'基底定義・第0亜種を採用する条件を指定すると、確定した能力だけを計算します',values:[]};
  const known=candidate.known.filter(s=>s.mode==='fixed'||Number.isFinite(level)&&level>0&&level<=150);
  return {candidate,scope,values:known.map(s=>({stat:s.stat,name:labels[s.stat],value:value(s,level),formula:s.mode==='fixed'?'定義による直接指定':'生成レベル × '+s.slope+' ＋ '+s.base})),
   remaining:candidate.remainingStats.map(i=>labels[i]).join('・')+'：クラス技能係数の準備と成長式への供給が未確定'+(known.length<candidate.known.length?'。比例能力は実生成レベルの解釈が未確定のため保留':'')};
 }
 const api=Object.freeze({value,calculate,labels});if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MOE_COMBAT_SUMMON_NUMERICS=api;
})(globalThis);
