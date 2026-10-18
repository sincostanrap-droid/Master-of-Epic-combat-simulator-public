(function(root){'use strict';
 const common=typeof module!=='undefined'&&module.exports;
 const data=common?require('../data/generated/equipmentAdditions20261013.generated.js'):root.MOE_EQUIPMENT_ADDITIONS_20261013;
 const records=new Map(data.records.map(r=>[r.id,r])),f=Math.fround;
 const id=row=>Number(row.clientBuffDefinitionId||String(row.catalogRuleId||'').replace(/^technic-/,''));
 function gate(state,world=0){
  if(![0,1].includes(+world))throw Error('装備Buffの世界条件が不正です');
  if(+world!==1)return state;
  return {...state,composite:(state.composite||[]).map(row=>records.has(id(row))?{...row,enabled:false}:row)};
 }
 function collect(rows,world=0){
  if(![0,1].includes(+world))throw Error('装備Buffの世界条件が不正です');
  const seen=new Set(),skills={},elements={},reductions={},names=[];
  for(const row of rows||[]){
   const d=records.get(id(row));if(!d||row.enabled===false||row.excluded||seen.has(d.id))continue;
   seen.add(d.id);if(+world===1)continue;names.push(d.name);
   for(const e of d.effects){
    if(e.kind===235){const name=({62:'死の魔法',66:'暗黒命令'})[e.selector];skills[name]=f((skills[name]||0)+e.value);}
    if(e.kind===275)elements[e.selector]=f((elements[e.selector]||0)+e.value);
    if(e.kind===273)reductions[e.selector]=f((reductions[e.selector]||0)+e.value);
   }
  }
  return {skills,elements,reductions,names};
 }
 function incomingFire(rows,amount,world=0){
  if(amount==null||amount===''||!Number.isFinite(+amount)||+amount<0)throw Error('軽減前の火属性要求量を指定してください');
  const pct=collect(rows,world).reductions[3]||0;
  return {before:+amount,percent:pct,after:f(f(+amount)*(1-f(pct)*f(.01))),scope:'この装備のkind273が選択された条件の量。最終HP減少量とは別で、他の軽減・反射・耐性・上限処理は含みません。'};
 }
 const api=Object.freeze({gate,collect,incomingFire,records:data.records});
 if(common)module.exports=api;else root.MOE_EQUIPMENT_BUFF_NUMERICS=api;
})(globalThis);
