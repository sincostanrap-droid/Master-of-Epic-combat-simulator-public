// Saved native7abd20: candidate selection, independent of damage/HP storage.
(function(root){'use strict';
 const common=typeof module!=='undefined'&&module.exports;
 const saved=common?require('../data/generated/combatRecognitionNpcProfiles.generated.js'):root.MOE_COMBAT_RECOGNITION_NPC_PROFILES;
 const scope='指定した探索条件での候補選別。感知範囲・既存ヘイト・最終ターゲット選択は別。';
 function initialFields(presetId,attributes){
  const fail=reason=>({supported:false,fields:null,reason});
  if(!Number.isInteger(presetId)||presetId<0||presetId>3)return fail('NPCの基本設定が未取得');
  const base=saved?.presets?.[presetId];if(!base)return fail('NPCの基本設定が未取得');
  if(!Array.isArray(attributes)||attributes.length>128)return fail('NPCの追加設定が未取得、または上限超過');
  const fields={...base};
  for(const e of attributes){
   if(![3,4,33,48].includes(e.id)||!Number.isInteger(e.value)||e.value<0||e.value>0xffffffff||!Number.isInteger(e.mode)||e.mode<0||e.mode>0xffffffff)return fail('未照合のNPC追加設定。別の作用へ流用しません');
   if(e.id===3||e.id===4)fields[e.id===3?'hostileRank':'friendlyRank']=(e.value<<16)>>16;
   else if(e.id===48)fields.ownerRelationFallback=e.value;
   else fields.flags=(e.mode===1?fields.flags|e.value:e.mode===2?fields.flags&~e.value:e.value)>>>0;
  }
  return {supported:true,fields,scope:saved.scope};
 }
 const npcProfiles=Object.values(saved?.npcs||{});
 const npcOptions=npcProfiles.map(n=>({value:'npc:'+n.groupKey,name:n.name}));
 function candidate(p){
  const unknown=reason=>({supported:false,candidateAccepted:null,excludedBy208:null,reason,scope});
  const result=(accepted,excluded,reason)=>({supported:true,candidateAccepted:accepted,excludedBy208:excluded,reason,scope});
  const integer=(value,min,max)=>Number.isInteger(value)&&value>=min&&value<=max;
  if(!['hostile','friendly'].includes(p.mode))return unknown('敵対側／友好側の探索区分が必要');
  if(typeof p.sameActor!=='boolean'||typeof p.allied!=='boolean')return unknown('同一対象・所属関係の条件が必要');
  if(p.sameActor)return result(p.mode==='friendly',false,'同一対象の先行判定');
  if(!integer(p.rules,0,0xffffffff))return unknown('NPCの探索設定が未指定');
  if(p.mode==='friendly'&&(p.rules&0x400))return typeof p.specialResult==='boolean'?result(p.specialResult,false,'友好側の特別な相対条件へ分岐'):unknown('友好側の特別な相対条件の結果が必要');
  if(p.allied)return result(p.mode==='friendly',false,'所属関係の先行判定');
  if(p.mode==='hostile'){
   if(!integer(p.rank,-32768,32767))return unknown('探索側が要求する友好段階が必要');
   if(p.rank<0)return result(true,false,'友好フィルタ省略の分岐で208照会を迂回');
  }
  if((p.rules&4)&&typeof p.sourceNormal!=='boolean')return unknown('NPC型参照の符号条件が必要');
  if((p.rules&4)&&p.sourceNormal&&typeof p.targetPc!=='boolean')return unknown('対象がPC区分か指定してください');
  if((p.rules&4)&&p.sourceNormal&&p.targetPc)return result(p.mode==='hostile',false,'対PC強制敵対の分岐で208照会を迂回');
  if(typeof p.has208!=='boolean'||typeof p.disabled!=='boolean')return unknown('208保持・Buff照会の有効条件が必要');
  if(p.has208&&!p.disabled)return result(false,true,'208を保持しているため候補から除外');
  if(!integer(p.rank,-32768,32767))return unknown('探索側が要求する友好段階が必要');
  if(p.mode==='friendly'&&p.rank<0)return result(false,false,'友好側の要求段階が負の分岐');
  if(!integer(p.relationRaw,-32768,32767))return unknown('NPC所属に対する友好値が必要。NPCレベルで代用しない');
  const threshold=(p.mode==='friendly'?2000:-2000)*p.rank;
  return {...result(p.mode==='friendly'?threshold<=p.relationRaw:threshold>=p.relationRaw,false,'友好値と要求段階×2000の比較'),relationshipThreshold:threshold,relationshipValue:p.relationRaw};
 }
 function profile(name){
  if(typeof name==='string'&&name.startsWith('npc:')){
   const n=saved?.npcs?.[name.slice(4)];if(!n)return {supported:false,candidateAccepted:null,excludedBy208:null,reason:'選択したNPCの初期設定は未取得',scope};
   const q=initialFields(n.presetId,n.attributes);if(!q.supported)return {...q,candidateAccepted:null,excludedBy208:null};
   const p={mode:'hostile',sameActor:false,allied:false,rules:q.fields.flags,rank:q.fields.hostileRank,sourceNormal:true,targetPc:true,has208:true,disabled:false};
   return {...candidate(p),profile:name,npcInitial:{name:n.name,groupKey:n.groupKey,variant:n.variant,ruleKey:n.ruleKey,fields:q.fields},
    assumption:'保存定義の初期設定・通常NPC型・所属関係なし・効果208を保持中のPCに対する通常候補探索。実行中の設定変更は含まない',sourceVersion:saved.sourceVersion};
  }
  if(!['normal','forced-player','unfiltered','allied'].includes(name))return {supported:false,candidateAccepted:null,excludedBy208:null,reason:'NPCの探索条件が未指定。通常探索では208保持者を候補から除外する。',scope};
  const p={mode:'hostile',sameActor:false,allied:name==='allied',rules:name==='forced-player'?4:0,rank:name==='unfiltered'?-1:0,sourceNormal:true,targetPc:true,has208:true,disabled:false};
  return {...candidate(p),profile:name,assumption:'当該効果208を保持中のPCを対象とし、選択した探索条件が成立する場合'};
 }
 const api=Object.freeze({candidate,profile,initialFields,npcOptions,consumer:'0x7abd20',evidence:'dist/effect208-recognition-20261015/recognition-native-oracle.json',npcEvidence:saved?.evidence});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MOE_COMBAT_RECOGNITION_NUMERICS=api;
})(globalThis);
