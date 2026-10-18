// Original passive collectors 5f9ab0/5f9c50, after Buff admission.
(function(root){'use strict';const f=Math.fround;
 const names={245:'攻撃範囲半径への加算',248:'銃・弓・投げの射程加算'};
 function fixed(e){return [245,248].includes(e.kind)&&e.selector===0&&!e.qualifier&&!e.other10&&!e.other18&&Number.isFinite(e.value);}
 function collect(records,kind){
  if(![245,248].includes(kind)||!Array.isArray(records)||records.length>24)throw Error('有効な範囲Buffを指定してください');
  let total=0;
  for(const r of records){if(r.flaggedSpecial===true||r.enabled===false||r.excluded)continue;
   let sum=0;for(const e of r.effects||[])if(e.kind===kind){if(!fixed(e))throw Error('未照合の範囲補正定義です');sum+=f(e.value);}
   total=f(total+sum);if(!Number.isFinite(total))throw Error('範囲補正がfloat32範囲外です');
  }
  return total;
 }
 function project(base,addition,kind){
  if(base==null||base===''||!Number.isFinite(+base)||+base<0||+base>100000)throw Error('補正前の範囲値を指定してください');
  if(!Number.isFinite(addition)||![245,248].includes(kind))throw Error('範囲加算値が不正です');
  if(kind===245&&+base===0)return {before:0,addition,after:null,reason:'元の範囲が0の動作は範囲走査を開始しません。範囲Buffだけで範囲技にはなりません'};
  return {before:f(+base),addition:f(addition),after:f(f(+base)+f(addition)),
   scope:kind===245?'プレイヤーの通常状態で、このBuffを受けている条件。元値は技や技能による補正後・この加算前の半径。対象の適合・実際の命中人数は別条件。':'銃・弓・投げを使うプレイヤーの通常状態で、このBuffを受けている条件。元値は技・武器・弾による補正後・この加算前の射程。対象の大きさ・地形・他の射程補正は別条件。表示用の代替距離を攻撃判定に流用しない'};
 }
 const api=Object.freeze({names,fixed,collect,project});if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MOE_COMBAT_RANGE_NUMERICS=api;
})(globalThis);
