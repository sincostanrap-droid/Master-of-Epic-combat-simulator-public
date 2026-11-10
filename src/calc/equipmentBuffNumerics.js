(function(root){'use strict';
 const common=typeof module!=='undefined'&&module.exports;
 const sources=[common?require('../data/generated/equipmentAdditions20261013.generated.js'):root.MOE_EQUIPMENT_ADDITIONS_20261013,
  common?require('../data/generated/catalogUpdate20261020.generated.js'):root.MOE_CATALOG_UPDATE_20261020,
  common?require('../data/generated/catalogUpdate20261027.generated.js'):root.MOE_CATALOG_UPDATE_20261027,
  common?require('../data/generated/catalogUpdate20261104.generated.js'):root.MOE_CATALOG_UPDATE_20261104,
  common?require('../data/generated/catalogUpdate20261110.generated.js'):root.MOE_CATALOG_UPDATE_20261110].filter(Boolean);
 const data={records:sources.flatMap(source=>source.records)};
 const records=new Map(data.records.map(r=>[r.id,r])),f=Math.fround;
 const id=row=>Number(row.clientBuffDefinitionId||String(row.catalogRuleId||'').replace(/^technic-/,''));
 function gate(state,world=0){
  if(![0,1].includes(+world))throw Error('装備Buffの世界条件が不正です');
  if(+world!==1)return state;
  return {...state,composite:(state.composite||[]).map(row=>{
   const d=records.get(id(row));return d&&d.effects.every(e=>(e.flags&0x300)===0x100)?{...row,enabled:false}:row;
  })};
 }
 function collect(rows,world=0){
  if(![0,1].includes(+world))throw Error('装備Buffの世界条件が不正です');
  const seen=new Set(),skills={},elements={},reductions={},names=[];
  for(const row of rows||[]){
   const d=records.get(id(row));if(!d||row.enabled===false||row.excluded||seen.has(d.id))continue;
   seen.add(d.id);if(+world===1&&d.effects.every(e=>(e.flags&0x300)===0x100))continue;names.push(d.name);
   for(const e of d.effects){
    if(e.kind===235){const name=({40:'キック',56:'破壊魔法',58:'神秘魔法',62:'死の魔法',66:'暗黒命令'})[e.selector];if(name)skills[name]=f((skills[name]||0)+e.value);}
    if(e.kind===275)elements[e.selector]=f((elements[e.selector]||0)+e.value);
    if(e.kind===273)reductions[e.selector]=f((reductions[e.selector]||0)+e.value);
   }
  }
  return {skills,elements,reductions,names};
 }
 function incomingElement(rows,amount,element,world=0){
  const label=({3:'火',4:'水',5:'風',6:'地'})[element];if(!label)throw Error('軽減対象の属性が不正です');
  if(amount==null||amount===''||!Number.isFinite(+amount)||+amount<0)throw Error('軽減前の'+label+'属性要求量を指定してください');
  const pct=collect(rows,world).reductions[element]||0;
  return {before:+amount,percent:pct,after:f(f(+amount)*(1-f(pct)*f(.01))),scope:'この装備のkind273が選択された条件の量。最終HP減少量とは別で、他の軽減・反射・耐性・上限処理は含みません。'};
 }
 const incomingFire=(rows,amount,world=0)=>incomingElement(rows,amount,3,world);
 const incomingWater=(rows,amount,world=0)=>incomingElement(rows,amount,4,world);
 function magicToHit(rows,magic,baseHit,world=0){
  if(![0,1].includes(+world)||!Number.isFinite(magic)||!Number.isFinite(baseHit)||!Number.isFinite(f(magic))||!Number.isFinite(f(baseHit)))throw Error('魔力・補正前命中・世界条件を指定してください');
  const seen=new Set();let rate=0;
  for(const row of rows||[]){const d=records.get(id(row));if(!d||row.enabled===false||row.excluded||seen.has(d.id))continue;seen.add(d.id);
   let sum=rate;for(const e of d.effects)if(e.kind===284){const bits=e.flags&0x300;
    if(bits===0x100&&+world===1||bits===0x200&&+world!==1)continue;
    if(e.qualifier||e.other10||e.other18||e.flags&0x1000)throw Error('未対応の魔力→命中条件です');
    sum+=f(e.value)*f(.01);
   }rate=f(sum);
  }
  const before=f(baseHit),addition=f(f(magic)*rate),after=rate?f(before+f(magic)*rate):baseHit;
  return {before,rate,addition,after,scope:'有効な装備Buffの魔力→命中加算。不可視認識・射程・サーバーの最終命中判定は含まない。'};
 }
 function mainAttackSources(rows,world=0){
  const seen=new Set();return (rows||[]).flatMap(row=>{const d=records.get(id(row));if(!d||row.enabled===false||row.excluded||seen.has(d.id))return [];seen.add(d.id);
   return d.effects.filter(e=>e.kind===108&&!(+world===1&&(e.flags&0x300)===0x100)).map(e=>({name:d.name,percent:100-e.value,skill:'全武器',kind:'attack',excludeUnarmed:false}));});
 }
 const api=Object.freeze({mainAttackSources,gate,collect,incomingElement,incomingFire,incomingWater,magicToHit,records:data.records});
 if(common)module.exports=api;else root.MOE_EQUIPMENT_BUFF_NUMERICS=api;
})(globalThis);
