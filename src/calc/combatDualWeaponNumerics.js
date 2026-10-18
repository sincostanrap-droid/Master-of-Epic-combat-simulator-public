(function(root){'use strict';
 const common=typeof module!=='undefined'&&module.exports;
 const data=common?require('../data/generated/combatDualWeaponRules.generated.js'):root.MOE_COMBAT_DUAL_WEAPON_RULES;
 function select(id,right,left){
  const d=data.definitions[id];if(!d)throw Error('左右武器の実定義が未照合です');
  if(![right,left].every(s=>['fit','none','unfit'].includes(s)))throw Error('各手の装備適合条件を指定してください');
  const preferred=(d.flags254&16)||d.class24!==6&&d.fieldB4===0?'right':'left';
  const order=d.selectionMode===1?['right']:d.selectionMode===2?['left']:d.selectionMode===0?[preferred,preferred==='right'?'left':'right']:[];
  return order.find(side=>(side==='right'?right:left)==='fit')||null;
 }
 function prepare(row,p){
  if(![5387,6699].includes(row.internalId)||p.dualWeaponConfirmed!==true)return null;
  if(!['fit','none','unfit'].includes(p.dualWeaponLeft))throw Error('左手の装備条件を指定してください');
  const all=[row.definition,...row.dependencies],byId=new Map(all.map(d=>[d.id,d])),steps=[],contexts={};let id=row.internalId;
  while(id){
   const d=byId.get(id),saved=data.definitions[id];
   if(!d||!saved||d.action_type!==2||d.primary_raw!==row.definition.primary_raw||JSON.stringify(d.effects.map(e=>[e.kind,e.value,e.selector]))!==JSON.stringify(saved.effects.map(e=>[e.kind,e.value,e.selector])))throw Error('左右武器の効果定義が保存根拠と一致しません');
   const side=select(id,'fit',p.dualWeaponLeft);if(!side)break;
   let c=p.damageContext;if(!c)throw Error('右手の攻撃条件を指定してください');
   if(side==='left'){
    for(const k of ['dualWeaponLeftAttack','dualWeaponLeftHit'])if(p[k]==null||p[k]===''||!Number.isFinite(+p[k])||+p[k]<0)throw Error('左手武器での攻撃力と命中を指定してください。右手の入力をコピーしません');
    c={...c,attack:+p.dualWeaponLeftAttack,hit:+p.dualWeaponLeftHit};
   }
   steps.push({id,side});contexts[id]=c;
   const edges=d.effects.filter(e=>e.kind===86);if(edges.length>1||steps.length>9)throw Error('未確認の左右武器連鎖です');id=edges[0]?.selector;
  }
  const ids=new Set(steps.map(s=>s.id));
  return {supported:true,steps,contexts,definitionIds:[...ids],definitions:all.filter(d=>ids.has(d.id)).map(d=>({...d,effects:d.effects.filter(e=>e.kind!==86||ids.has(e.selector))})),
   scope:'右手は技に適合する片手武器を装備。左手は指定した適合状態。各子の発動条件・同一対象への受理・命中が成立し、途中で装備や入力が変化しない条件。各手の攻撃力は武器・弾・Buff込みの値。成否や自動発動の保証ではありません',evidence:data.evidence};
 }
 const api=Object.freeze({select,prepare});if(common)module.exports=api;else root.MOE_COMBAT_DUAL_WEAPON_NUMERICS=api;
})(globalThis);
