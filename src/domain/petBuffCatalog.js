// Owner support only. Levels/unlocks and observations: MoE pet wiki (2026-11-02).
// TMG0 9161..9164,10332..10333 confirm effects, conflict groups and 180 s.
// Observations are not a solved client level -> skill -> potency formula.
(function(root){'use strict';
 const url=name=>'https://wikiwiki.jp/moe-pet/'+encodeURIComponent('ペット/特殊/'+name);
 const resist=['extraNeutralRes','extraFireRes','extraWaterRes','extraWindRes','extraEarthRes'];
 const enhance=['flatAttack','flatMagic','extraHit','extraAvoid'];
 const catalogs=[
  {id:'magia-bit',name:'マギアビット',mode:'強化支援',minLevel:30,maxLevel:150,url:url('マギアビット'),buffs:[
   {id:9161,name:'マギア・プロテクト',level:30,group:6767,description:'防御力上昇・被ダメージ軽減',observations:[{fields:['extraAC'],points:[[30,13],[90,25],[150,35]]}],fixed:{extraDamageReducePct:6.25}},
   {id:9163,name:'マギア・エレメント',level:50,group:6766,description:'全属性耐性上昇',observations:[{fields:resist,points:[[90,24],[150,35]]}]},
   {id:9162,name:'マギア・エンハンス',level:70,group:6769,description:'攻撃力・魔力・命中・回避上昇',observations:[{fields:enhance,points:[[90,19],[150,29]]}]},
   {id:9164,name:'マギア・アルカナ',level:90,group:6768,description:'攻撃ディレイ短縮・HP/MP/ST自然回復',observations:[{fields:['extraAttackDelay'],points:[[90,-40],[150,-60]]},{fields:['hpRegenPerMinute','mpRegenPerMinute','stRegenPerMinute'],points:[[90,123],[150,214]]}]}
  ]},
  {id:'crystal-ana',name:'千年結晶竜アナ',mode:'補助モード',minLevel:10,maxLevel:150,url:url('千年結晶竜アナ'),buffs:[
   {id:10332,name:'ドラゴニック プロテクション',level:50,group:6766,description:'防御力・全属性耐性上昇',observations:[{fields:['extraAC',...resist],points:[[70,22],[150,37]]}]},
   {id:10333,name:'ドラゴニック エンハンス',level:70,group:6769,description:'攻撃力・魔力・命中・回避上昇',observations:[{fields:enhance,points:[[70,17],[150,31]]}]}
  ]}
 ];
 const labels={extraAC:'防御力',flatAttack:'攻撃力',flatMagic:'魔力',extraHit:'命中',extraAvoid:'回避',extraAttackDelay:'攻撃ディレイ',extraDamageReducePct:'被ダメージ軽減',hpRegenPerMinute:'HP自然回復／分',mpRegenPerMinute:'MP自然回復／分',stRegenPerMinute:'ST自然回復／分',extraNeutralRes:'無耐性',extraFireRes:'火耐性',extraWaterRes:'水耐性',extraWindRes:'風耐性',extraEarthRes:'地耐性'};
 function observation(points,level){
  const exact=points.find(p=>p[0]===level);if(exact)return {value:exact[1],kind:'wiki実測の目安'};
  for(let i=1;i<points.length;i++)if(points[i-1][0]<level&&level<points[i][0]){const [x,a]=points[i-1],[y,b]=points[i];return {value:a+(b-a)*(level-x)/(y-x),kind:'wiki実測値間の直線補間（推定）'};}
  return null;
 }
 function isPet(row){return row?.catalogSource==='pet-owner-buff-v1';}
 function build(id,rawLevel){
  const pet=catalogs.find(p=>p.id===id),level=Number(rawLevel);
  if(!pet||rawLevel===''||rawLevel==null||!Number.isFinite(level)||level<pet.minLevel||level>pet.maxLevel)throw Error('ペットのレベルを範囲内で入力してください');
  return pet.buffs.filter(b=>level>=b.level).map(b=>{
   const fields={...b.fixed},values=[],pending=[],estimatedFields=Object.keys(fields),kinds=new Set();
   for(const o of b.observations){const sample=observation(o.points,level);
    if(!sample){pending.push({id:b.id+':'+o.fields[0],name:o.fields.map(f=>labels[f]).join('・'),reason:'このレベルの実測値と確定式がありません',category:'参考値なし'});continue;}
    kinds.add(sample.kind);for(const field of o.fields){fields[field]=sample.value;estimatedFields.push(field);}
   }
   for(const [field,value]of Object.entries(fields))values.push({id:b.id+':'+field,name:labels[field],value,unit:field==='extraDamageReducePct'?'%':/RegenPerMinute/.test(field)?'/分':'',scope:'飼い主',estimated:true});
   return {name:pet.name+'：'+b.name,enabled:true,fixed:true,excluded:false,slot:true,...fields,
    tags:'pet-support:'+b.group,stackRule:'first',clientBuffDefinitionId:String(b.id),durationSeconds:180,
    catalogSource:'pet-owner-buff-v1',catalogRuleId:'pet:'+pet.id+':'+b.id,catalogInputs:{petId:pet.id,petLevel:level},
    extraEffects:[{key:'custom',name:b.description,scope:'display',unit:'',note:''}],
    note:pet.mode+'・全Buff付与済み／Lv'+level+'／'+([...kinds].join('・')||'このレベルの量は未確認')+'。魔力増減など追加補正なし。',
    catalogNumeric:{version:1,key:'pet:'+pet.id+':'+b.id,values,pending,applied:values.map(v=>v.id),estimatedFields,times:[{definitionId:b.id,name:b.name,seconds:180,conditional:false}],inputs:{petId:pet.id,petLevel:level}}
   };
  });
 }
 function replace(rows,id,level){
  const next=build(id,level),first=rows.findIndex(r=>isPet(r)&&r.catalogInputs?.petId===id);
  const result=rows.filter(r=>!isPet(r)||r.catalogInputs?.petId!==id);
  result.splice(first<0?result.length:Math.min(first,result.length),0,...next);return result;
 }
 const api={catalogs,build,replace,isPet,observation};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MOE_PET_BUFF_CATALOG=api;
})(globalThis);
