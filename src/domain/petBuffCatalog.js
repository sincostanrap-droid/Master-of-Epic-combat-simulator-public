// Owner support only. Levels/unlocks and observations: MoE pet wiki (2026-11-02).
// Per-effect constants/durations: saved TMG0 (2026-10-27); see local survey report.
// Only Magia/Ana's documented first-wins conflicts are currently registered.
// Observations are not a solved client level -> skill -> potency formula.
(function(root){'use strict';
 const url=name=>'https://wikiwiki.jp/moe-pet/'+encodeURIComponent('ペット/特殊/'+name);
 const resist=['extraNeutralRes','extraFireRes','extraWaterRes','extraWindRes','extraEarthRes'];
 const enhance=['flatAttack','flatMagic','extraHit','extraAvoid'];
 const catalogs=[
  {id:'magia-bit',name:'マギアビット',mode:'強化支援',minLevel:30,maxLevel:150,duration:180,firstWins:true,url:url('マギアビット'),buffs:[
   {id:9161,name:'マギア・プロテクト',level:30,group:6767,description:'防御力上昇・被ダメージ軽減',observations:[{fields:['extraAC'],points:[[30,13],[90,25],[150,35]]}],fixed:{extraDamageReducePct:6.25}},
   {id:9163,name:'マギア・エレメント',level:50,group:6766,description:'全属性耐性上昇',observations:[{fields:resist,points:[[90,24],[150,35]]}]},
   {id:9162,name:'マギア・エンハンス',level:70,group:6769,description:'攻撃力・魔力・命中・回避上昇',observations:[{fields:enhance,points:[[90,19],[150,29]]}]},
   {id:9164,name:'マギア・アルカナ',level:90,group:6768,description:'攻撃ディレイ短縮・HP/MP/ST自然回復',observations:[{fields:['extraAttackDelay'],points:[[90,-40],[150,-60]]},{fields:['hpRegenPerMinute','mpRegenPerMinute','stRegenPerMinute'],points:[[90,123],[150,214]]}]}
  ]},
  {id:'crystal-ana',name:'千年結晶竜アナ',mode:'補助モード',minLevel:10,maxLevel:150,duration:180,firstWins:true,url:url('千年結晶竜アナ'),buffs:[
   {id:10332,name:'ドラゴニック プロテクション',level:50,group:6766,description:'防御力・全属性耐性上昇',observations:[{fields:['extraAC',...resist],points:[[70,22],[150,37]]}]},
   {id:10333,name:'ドラゴニック エンハンス',level:70,group:6769,description:'攻撃力・魔力・命中・回避上昇',observations:[{fields:enhance,points:[[70,17],[150,31]]}]}
  ]},
  {id:'rafuel',name:'ラフエル',mode:'防御支援',minLevel:60,maxLevel:150,duration:150,url:url('ラフエル'),condition:'ウェントゥス ディフェンシオが飼い主に付与された場合。常時付与を保証するものではありません。',buffs:[
   {id:9135,name:'ウェントゥス ディフェンシオ',level:60,description:'防御力・全属性耐性上昇',observations:[{fields:['extraAC'],points:[[60,24],[150,50]]},{fields:resist,points:[[60,14],[150,30]]}]}
  ]},
  {id:'yukata-finyu',name:'浴衣フィニュ',mode:'サマー フェスティバル',minLevel:130,maxLevel:150,duration:120,url:url('浴衣フィニュ'),condition:'非戦闘時に特殊行動を指示して付与。現在忠誠84・最大忠誠168以上が目安。数値の実測点はLv150のみです。',buffs:[
   {id:6576,name:'サマー フェスティバル',level:130,description:'攻撃力・防御力・命中・回避・魔力・最大HP/MP上昇',observations:[{fields:['flatAttack','extraAC','extraHit','extraAvoid','flatMagic'],points:[[150,33]]},{fields:['extraHP','extraMP'],points:[[150,43]]}]}
  ]},
  {id:'la-pucelle-avatar',name:'ラ・ピュセル アバター',mode:'サポート',minLevel:0,maxLevel:150,levelIndependent:true,duration:180,url:'https://scrapbox.io/medianmoe/ラ・ピュセル_アバター',buffs:[
   {id:7393,name:'ラ・ピュセル サポート',level:0,description:'攻撃力・防御力上昇',exact:{attackPct:10,extraACPct:10}}
  ]},
  {id:'ripple-avatar',name:'リップル アバター',mode:'サポート',minLevel:0,maxLevel:150,levelIndependent:true,duration:180,url:'https://scrapbox.io/medianmoe/リップル_アバター',buffs:[
   {id:7394,name:'リップル サポート',level:0,description:'命中・回避上昇',exact:{extraHitPct:15,extraAvoidPct:15}}
  ]},
  {id:'snow-white-avatar',name:'スノーホワイト アバター',mode:'サポート',minLevel:0,maxLevel:150,levelIndependent:true,duration:180,url:'https://scrapbox.io/medianmoe/スノーホワイト_アバター',buffs:[
   {id:7392,name:'スノーホワイト サポート',level:0,description:'魔力・MP自然回復上昇',exact:{magicPct:10},fixed:{mpRegenPerMinute:56}}
  ]},
  {id:'top-speed-avatar',name:'トップスピード アバター',mode:'サポート',minLevel:0,maxLevel:150,levelIndependent:true,duration:180,url:'https://scrapbox.io/medianmoe/トップスピード_アバター',buffs:[
   {id:7395,name:'トップスピード サポート',level:0,description:'移動速度・詠唱中の移動速度上昇',exact:{speedPct:15},displayValues:[{name:'詠唱中の移動速度倍率',value:1.1,unit:'倍'}]}
  ]}
 ];
 const labels={extraAC:'防御力',flatAttack:'攻撃力',flatMagic:'魔力',extraHit:'命中',extraAvoid:'回避',extraHP:'最大HP',extraMP:'最大MP',attackPct:'攻撃力',magicPct:'魔力',speedPct:'移動速度',extraACPct:'防御力',extraHitPct:'命中',extraAvoidPct:'回避',extraAttackDelay:'攻撃ディレイ',extraDamageReducePct:'被ダメージ軽減',hpRegenPerMinute:'HP自然回復',mpRegenPerMinute:'MP自然回復',stRegenPerMinute:'ST自然回復',extraNeutralRes:'無耐性',extraFireRes:'火耐性',extraWaterRes:'水耐性',extraWindRes:'風耐性',extraEarthRes:'地耐性'};
 function observation(points,level){
  const exact=points.find(p=>p[0]===level);if(exact)return {value:exact[1],kind:'wiki実測の目安'};
  for(let i=1;i<points.length;i++)if(points[i-1][0]<level&&level<points[i][0]){const [x,a]=points[i-1],[y,b]=points[i];return {value:a+(b-a)*(level-x)/(y-x),kind:'wiki実測値間の直線補間（推定）'};}
  return null;
 }
 function isPet(row){return row?.catalogSource==='pet-owner-buff-v1';}
 function build(id,rawLevel){
  const pet=catalogs.find(p=>p.id===id),level=pet?.levelIndependent?0:Number(rawLevel);
  if(!pet||(!pet.levelIndependent&&(rawLevel===''||rawLevel==null))||!Number.isFinite(level)||level<pet.minLevel||level>pet.maxLevel)throw Error('ペットのレベルを範囲内で入力してください');
  return pet.buffs.filter(b=>level>=b.level).map(b=>{
   const fields={...b.fixed,...b.exact},values=[],pending=[],estimatedFields=Object.keys(b.fixed||{}),kinds=new Set();
   if(Object.keys(b.fixed||{}).length)kinds.add('wiki実測の目安');
   if(Object.keys(b.exact||{}).length)kinds.add('固定効果');
   for(const o of b.observations||[]){const sample=observation(o.points,level);
    if(!sample){pending.push({id:b.id+':'+o.fields[0],name:o.fields.map(f=>labels[f]).join('・'),reason:'このレベルの実測値と確定式がありません',category:'参考値なし'});continue;}
    kinds.add(sample.kind);for(const field of o.fields){fields[field]=sample.value;estimatedFields.push(field);}
   }
   for(const [field,value]of Object.entries(fields))values.push({id:b.id+':'+field,name:labels[field],value,unit:/Pct$/.test(field)?'%':/RegenPerMinute/.test(field)?'/分':'',scope:'飼い主',estimated:estimatedFields.includes(field)});
   const applied=values.map(v=>v.id);
   for(const [i,v]of (b.displayValues||[]).entries())values.push({id:b.id+':display:'+i,...v,scope:'表示のみ',estimated:false});
   return {name:pet.name+'：'+b.name,enabled:true,fixed:true,excluded:false,slot:true,...fields,
    tags:pet.firstWins?'pet-support:'+b.group:'',stackRule:pet.firstWins?'first':'',clientBuffDefinitionId:String(b.id),durationSeconds:pet.duration,
    catalogSource:'pet-owner-buff-v1',catalogRuleId:'pet:'+pet.id+':'+b.id,catalogInputs:{petId:pet.id,petLevel:level},
    extraEffects:[{key:'custom',name:b.description,scope:'display',unit:'',note:''}],
    note:pet.mode+'・Buff付与中／'+(pet.levelIndependent?'レベル非依存':'Lv'+level)+'／'+([...kinds].join('・')||'このレベルの量は未確認')+'。'+(pet.condition||'')+(pet.firstWins?'同じ競合グループは先に付いたBuffを優先。':'他のBuffとの重複可否は未確認。')+'魔力増減など追加補正なし。',
    catalogNumeric:{version:1,key:'pet:'+pet.id+':'+b.id,values,pending,applied,estimatedFields,times:[{definitionId:b.id,name:b.name,seconds:pet.duration,conditional:false}],inputs:{petId:pet.id,petLevel:level}}
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
