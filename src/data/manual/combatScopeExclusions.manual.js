// Explicit user scope, 2026-10-15. Retain research and saved registrations.
(function(root){'use strict';
 const jasper=typeof module!=='undefined'&&module.exports?require('./jasperMusicScope.manual.js'):root.MOE_JASPER_MUSIC_SCOPE;
 const names=Object.freeze(['サクリファイス・キャロル','ヒーリング・キャロル','キャノン・キャロル','ガード・キャロル','ガトリング・キャロル','バリア・キャロル','ワープ・キャロル']);
 const normalize=value=>String(value||'').normalize('NFKC').replace(/[\s・･_\-]+/g,'').toLowerCase();
 const excludedNames=new Set(names.map(normalize)),byName=new Map((jasper?.records||[]).map(row=>[normalize(row.name),row]));
 const reason='ジャスパー限定のため、ユーザー指定で通常の計算対象から除外';
 function exclusion(row){
  if(!row)return null;const name=normalize(row.name),record=byName.get(name);
  const rawId=row.internalId??row.officialTechnicId??row.definition?.id??row.clientBuffDefinitionId??row.id;
  const id=/^\d+$/.test(String(rawId))?Number(rawId):/^technic-\d+$/.test(String(rawId))?Number(String(rawId).slice(8)):null;
  if(id===752&&name==='p.o.r')return {status:'対象外（終了イベント）',reason:'P.O.Rは終了イベント専用のため、ユーザー指定で計算対象から除外。解析資料と登録データは保持。',clientId:752};
  // A same-name ordinary Buff must not be excluded by a music-technique name.
  // The original seven rows also include unresolved IDs; retain that scope.
  const music=row.primary_raw===51||row.definition?.primary_raw===51||(row.requirements||[]).some(r=>r.skill==='音楽');
  const confirmed=record?(id!==null?id===record.clientId:excludedNames.has(name)||music):excludedNames.has(name)&&id===null;
  return confirmed?{status:'対象外（ジャスパー限定）',reason,clientId:record?.clientId??null}:null;
 }
 const api=Object.freeze({date:'2026-10-15',names,reason,exclusion,jasperMusicRecords:jasper?.records||[]});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MOE_COMBAT_SCOPE_EXCLUSIONS=api;
})(globalThis);
