// Wiki semantics supply selection/conditions; quantities come from client definitions.
(function(root){'use strict';const common=typeof module!=='undefined'&&module.exports;
 const activation=common?require('./clientNativeBuffActivationReference'):root.MOE_CLIENT_NATIVE_BUFF_ACTIVATION_REFERENCE;
 const data=common?require('../data/generated/combatWikiHints.generated'):root.MOE_COMBAT_WIKI_HINTS;
 function finite(n,label,min=0,max=1000000){if(!Number.isFinite(n)||n<min||n>max)throw Error(label+'を指定してください');return n;}
 function temporaryExtension({initialSeconds,remainingSeconds,modifierSeconds,elapsedSeconds=0,category='buff',present=true}){
  const initial=finite(initialSeconds,'対象Buffの初期持続時間'),remaining=finite(remainingSeconds,'延長開始時の対象Buff残り時間'),window=finite(modifierSeconds,'延長作用の公称持続時間'),elapsed=finite(elapsedSeconds,'延長開始からの経過時間');
  if(remaining>initial)throw Error('延長前の残り時間が初期時間を超えています。既存の延長・更新との競合は未対応です');
  if(!['buff','debuff','repeating','charged','paused'].includes(category))throw Error('保持効果の分類を指定してください');
  if(category==='paused')throw Error('時間停止との合成は未対応です');
  const eligible=category==='buff'&&initial>0&&remaining>0,rawRemaining=remaining-elapsed,active=present&&elapsed<window&&eligible;
  // For interval1, both counters share the same nominal /60 conversion.
  // Preserve the original 772ac0 predicate through the existing reference.
  const parameters=activation.activationParameters({flagByte:category==='charged'?1:0,duration:Math.round(rawRemaining*60),remainingDuration:Math.round(initial*60)},
   {actionType:category==='repeating'?5:4,definitionClass:category==='debuff'?2:1,interval:1},active?0x4000000:0);
  const end=eligible&&present&&remaining<=window?Math.min(remaining+initial,window):remaining;
  return {eligible,originalRemaining:rawRemaining,counterRemaining:Math.max(0,parameters.remaining/60),endSeconds:end,remainingSeconds:Math.max(0,end-elapsed),expired:elapsed>=end,
   extraSeconds:Math.max(0,end-remaining),modifierActive:active,
   scope:'interval1・有限・時間停止/追加上書き/別解除なし。公称60内部単位/秒での終了境界。延長中も元のcounterは減少し、延長終了時に追加分を失う。実ゲームの更新遅延は保証しない'};
 }
 function areaWindow(rule,{elapsedSeconds,inside,targetType,existingBuffSeconds}){
  const elapsed=finite(elapsedSeconds,'魔法陣設置からの経過時間'),remaining=finite(existingBuffSeconds,'既存マジック エンハンスの残り時間');
  if(typeof inside!=='boolean'||!['pc','npc','pet'].includes(targetType))throw Error('陣内の条件と対象PC/NPC/ペットを指定してください');
  const life=rule.areaSeconds,allowed=targetType==='pc'&&inside&&elapsed<life,newlyApplied=allowed&&remaining===0;
  return {allowed,newlyApplied,refreshed:false,existing:remaining>0,remainingSeconds:remaining>0?remaining:newlyApplied?rule.child.counter*rule.child.interval/60:null,
   areaRemainingSeconds:Math.max(0,life-elapsed),status:remaining>0?'既存Buffを保持・更新しない':newlyApplied?'PCへ新規に20秒Buffを要求':'新規Buff要求なし',
   scope:'wikiのPC・陣内条件。既存Buffは陣外/陣消滅でも保持。期限切れ後にまだ陣内なら再付与可能。距離境界2.5は概数なので陣内/陣外を条件入力する'};
 }
 function transferRecords(records,limit,{mask=15870}={}){
  if(!Array.isArray(records)||records.length>24)throw Error('移送対象レコードは古い順で最大24件を指定してください');
  if(!Number.isInteger(limit)||limit<0||limit>24)throw Error('移送上限が未対応です');
  if(!Number.isInteger(mask)||mask<0||mask>0x1ffff)throw Error('移送定義の分類maskが未照合です');
  const ids=new Set();
  for(const r of records){
   if(typeof r?.key!=='string'||!r.key||ids.has(r.key))throw Error('保持効果には重複しないkeyが必要です');ids.add(r.key);
   if(typeof r.eligible!=='boolean'||!['buff','debuff','dot'].includes(r.category))throw Error('保持効果の分類と適合済み条件を指定してください');
   finite(r.remainingSeconds,'元レコードの残り秒数');
   if(r.classificationMask!=null&&(!Number.isInteger(r.classificationMask)||r.classificationMask<0||r.classificationMask>0x1ffff))throw Error('元効果の分類maskは確認済み整数で指定してください');
   if(!Array.isArray(r.quantities)||r.quantities.length>10)throw Error('保存済みの量をquantities配列で指定してください');
   for(const q of r.quantities)if(typeof q.name!=='string'||typeof q.unit!=='string'||!Number.isFinite(q.value))throw Error('保存済み効果の量・名称・単位が必要です');
  }
  const matches=r=>r.classificationMask==null?true:!(r.classificationMask&0x10200)&&!!(r.classificationMask&0x4000?mask&0x4000:mask&r.classificationMask);
  const ordered=mask&1?records:[...records].reverse();
  const selected=limit?ordered.filter(r=>r.eligible&&r.remainingSeconds>0&&matches(r)).slice(0,limit):[];
  return {count:selected.length,records:JSON.parse(JSON.stringify(selected)),remainingTargetRecords:JSON.parse(JSON.stringify(records.filter(r=>!selected.includes(r)))),
   definitionMask:mask,order:mask&1?'oldest-first':'latest-first',directRecordCopy:true,preservesOriginalQuantity:true,preservesRemainingTime:true,
   scope:'命中・分類適合/受信条件・特殊子への再詠唱を行わない元レコードコピー枝が成立した条件。古い順で入力した元レコードを定義maskの順序/上限で選び、量と残り秒数を保持。classificationMask省略時はeligibleが分類適合も含む。受理・競合・解除副作用は別'};
 }
 const api=Object.freeze({data,temporaryExtension,areaWindow,transferRecords});if(common)module.exports=api;else root.MOE_COMBAT_WIKI_HINT_NUMERICS=api;
})(globalThis);
