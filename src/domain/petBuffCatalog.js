// Owner support only. Levels/unlocks and observations: MoE pet wiki (2026-11-02).
// Per-effect constants/durations: saved TMG0 (2026-10-27); see local survey report.
// First-wins applies to documented Magia/dragon support groups only.
// Verified profiles use client formulas; other observations stay references.
(function(root){'use strict';
 const petFormulas=typeof module!=='undefined'&&module.exports?require('../calc/petBuffFormulas.js'):root.MOE_PET_BUFF_FORMULAS;
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
  ]},
  {id:'crystal-luna',name:'千年結晶竜ルナ',mode:'補助モード',minLevel:50,maxLevel:150,duration:180,firstWins:true,url:url('千年結晶竜ルナ'),condition:'補助モードで付与中。マジックフォース中はモード切替不可。',buffs:[
   {id:10332,name:'ドラゴニック プロテクション',level:50,group:6766,description:'防御力・全属性耐性上昇',observations:[{fields:['extraAC',...resist],ranges:[[100,28.2,29.2]]}]},
   {id:10333,name:'ドラゴニック エンハンス',level:70,group:6769,description:'攻撃力・魔力・命中・回避上昇',observations:[{fields:enhance,ranges:[[100,22.1,23]]}]}
  ]},
  {id:'crystal-ena',family:'crystal-ena',name:'千年結晶竜エナ',mode:'補助モード',minLevel:50,maxLevel:150,duration:180,firstWins:true,url:url('千年結晶竜エナ'),condition:'補助モード。回復モードとは同時登録しません。',buffs:[
   {id:10332,name:'ドラゴニック プロテクション',level:50,group:6766,description:'防御力・全属性耐性上昇',pending:[{name:'防御力・全属性耐性の上昇量',fields:['extraAC',...resist],reason:'エナ自身の実測値と成長式が未確認'}]},
   {id:10333,name:'ドラゴニック エンハンス',level:70,group:6769,description:'攻撃力・魔力・命中・回避上昇',pending:[{name:'攻撃力・魔力・命中・回避の上昇量',fields:enhance,reason:'エナ自身の実測値と成長式が未確認'}]}
  ]},
  {id:'crystal-ena-heal',family:'crystal-ena',name:'千年結晶竜エナ',mode:'回復モード',minLevel:70,maxLevel:150,url:url('千年結晶竜エナ'),condition:'条件を満たして支援Buffが付与された場合。バリアは飼い主HP90%未満、忠誠25/50以上。リバイバルは忠誠50/100以上、好きにしろ・飼い主にかかれ。',buffs:[
   {id:11705,name:'ミスティック バリア',level:70,duration:12.5,description:'80未満のダメージを無効化。80以上の攻撃で解除',displayValues:[{name:'無効化するダメージの上限（未満）',value:80,unit:'HP'}]},
   {id:11707,name:'ミスティック リバイバル',level:120,duration:180,description:'自動蘇生時にHP・MP・STを全回復',displayValues:[{name:'蘇生時HP・MP・ST',value:100,unit:'%'}]}
  ]},
  ...[false,true].map(area=>({id:area?'idol-finyu-area':'idol-finyu',family:'idol-finyu',name:'アイドル フィニュ',mode:area?'範囲支援':'単体支援',minLevel:area?110:50,maxLevel:150,url:url('アイドル フィニュ'),condition:'飼い主に3種の支援が付与された場合。単体・範囲は切替式。ペットへの追加Buffなしで計算します。瞬間回復は含めません。',buffs:[
   {id:area?12946:12941,name:(area?'エリア ':'')+'チアー ソング',level:50,duration:64,description:'MP・STを8秒ごとに回復',periodic:[{resources:['MP','ST'],points:[[150,area?31:44]],intervalSeconds:8}]},
   {id:area?12947:12942,name:(area?'エリア ':'')+'バトル ソング',level:75,description:'物理・魔法ダメージ上昇、攻撃・魔法ディレイ短縮',exact:{dmgPct:area?10:20},observations:[{fields:['extraAttackDelay','extraMagicDelay'],points:[[150,area?-10:-17]]}],durationPoints:[[150,60]],displayValues:[{name:'魔法ダメージ上昇',value:area?10:20,unit:'%'}]},
   {id:area?12949:12944,name:(area?'エリア ':'')+'ヒーロー ソング',level:110,description:'攻撃力・防御力・命中・回避・魔力・全耐性上昇',observations:[{fields:['extraAC',...enhance,...resist],points:[[150,area?30:42]]}],...(area?{durationPoints:[[150,96]]}:{})}
  ]})),
  {id:'yoko',name:'ヨーコ',mode:'狐憑依',minLevel:80,maxLevel:150,duration:180,url:url('ヨーコ'),condition:'人型で憑依を指示。ジャンプで解除。魔力量は実測範囲の中間値、HP減少・MP回復はLv80のみの参考値です。',buffs:[
   {id:5889,name:'狐憑依',level:80,description:'魔力・MP自然回復・詠唱妨害防止上昇、HP継続減少',observations:[{fields:['flatMagic'],ranges:[[80,14.8,17],[150,19.1,21.5]]},{fields:['mpRegenPerMinute'],points:[[80,130]]},{fields:['hpRegenPerMinute'],points:[[80,-70]]}],displayValues:[{name:'詠唱妨害防止',value:80,unit:'%'}]}
  ]},
  {id:'charlie',name:'チャーリー',mode:'魔力融合',minLevel:75,maxLevel:150,duration:60,url:url('チャーリー'),condition:'特殊指示で付与。ジャンプで解除、付与中は更新不可。継続ST消費量は未計算です。',buffs:[
   {id:3369,name:'魔力融合',level:75,description:'魔力・最大MP上昇、ST継続消費',exact:{magicPct:10,extraMPPct:30},pending:[{name:'継続ST消費量',reason:'実時間での消費量の証拠不足'}]}
  ]},
  {id:'dream-whale',name:'ゆめくじら',mode:'スターリー ヘヴンON',minLevel:65,maxLevel:150,url:url('ゆめくじら'),condition:'ゲーム内では初期OFF。右クリックでスターリー ヘヴンをONにした場合のみ。騎乗中の自動発動はありません。',buffs:[
   {id:13209,name:'スターリー ヘヴン',level:65,description:'攻撃力・魔力・MP自然回復・音楽の効果上昇',exact:{attackPct:15,magicPct:15},fixed:{mpRegenPerMinute:112.5},durationPoints:[[65,30],[80,36],[90,40],[120,50],[140,56],[150,60]],pending:[{name:'音楽の効果上昇量',reason:'wikiの+10と内部値20の換算が未確認'}]}
  ]},
  {id:'moon-star-spirit',name:'月と星の大精霊',mode:'回復支援',minLevel:60,maxLevel:150,url:url('月と星の大精霊'),condition:'対象MP70%以下のコンデンス、HP75%未満のシンフォニーが付与された場合。瞬間HP回復は含めません。',buffs:[
   {id:120,name:'コンデンスマインド',level:60,description:'MP自然回復上昇',pending:[{name:'MP自然回復の増加量',reason:'ペットのスキル・魔力入力と実測値が未確認'}]},
   {id:9608,name:'スターライト シンフォニー',level:110,duration:30,description:'防御力・回避・全耐性上昇',observations:[{fields:['extraAC','extraAvoid'],points:[[110,31],[150,43]]},{fields:resist,points:[[110,24],[150,33]]}]}
  ]},
  {id:'kamuy',name:'カントコロカムイ',mode:'セレマク・カムイ',minLevel:65,maxLevel:150,duration:100,url:url('カントコロカムイ'),condition:'飼い主に回復Buffが付与された場合。忠誠25以上。1回の回復量と間隔を表示し、自然回復量には加算しません。',buffs:[
   {id:8923,name:'セレマク・カムイ',level:65,description:'MPを10秒ごとに回復',periodic:[{resources:['MP'],points:[[90,26],[120,35]],intervalSeconds:10}]}
  ]},
  {id:'summer-fish',name:'夏天清魚',mode:'水神乃祝福',minLevel:90,maxLevel:150,duration:108,url:url('夏天清魚'),condition:'HP減少時に範囲回復が付与された場合。初回の瞬間回復は含めません。持続は内部定義108秒を使用（wiki約110秒）。',buffs:[
   {id:10000,name:'水神乃祝福',level:90,description:'HP・MPを12秒ごとに回復',periodic:[{resources:['HP','MP'],points:[[90,28],[120,37],[150,46]],intervalSeconds:12}]}
  ]},
  ...[['dearstage','ディアステージ'],['blazermates','ブレザーメイツ']].map(([id,name])=>({id,name,mode:'ハイパーリペア',minLevel:50,maxLevel:150,duration:49,url:url(name),condition:'範囲回復Buffが付与された場合。1回の周期回復量を表示し、初回回復や自然回復とは区別します。',buffs:[
   {id:10942,name:'メダフォース：ハイパーリペア',level:50,description:'HPを7秒ごとに回復',periodic:[{resources:['HP'],ranges:id==='blazermates'?[[150,35,40]]:[],intervalSeconds:7}]}
  ]})),
  {id:'shushupop',name:'シュシュポップ',mode:'たいちせいぎょON',minLevel:80,maxLevel:150,url:url('シュシュポップ'),condition:'右クリックで支援技をONにした場合。所持品重量の軽減は最大所持重量の増加とは別です。',buffs:[
   {id:12349,name:'頭部：たいちせいぎょ',level:80,description:'移動速度上昇・所持品重量軽減',observations:[{fields:['flatSpeed'],points:[[126,24],[150,29]]}],durationPoints:[[126,51],[150,60]],displayObservations:[{name:'所持品重量軽減',unit:'%',ranges:[[126,40,40],[150,45,49]]}]}
  ]},
  {id:'elemental-plulume',name:'エレメンタル プルルーム',mode:'禁断魔法のページ使用',minLevel:70,maxLevel:150,duration:215999/60,url:url('エレメンタル プルルーム'),condition:'ページを渡して範囲PCへ付与した場合。マナ増幅法のページは自己強化なので含めません。',buffs:[
   {id:4120,name:'禁断魔法のページ',level:70,description:'スキル上昇率増加',displayValues:[{name:'スキル上昇率増加',value:20,unit:'%'}]}
  ]},
  {id:'finyu',name:'フィニュ',mode:'コンデンスマインド',minLevel:75,maxLevel:150,url:url('フィニュ'),condition:'対象MP70%以下、現在忠誠33・最大67以上が目安。ローズ カーテンはペット自身にしか付かないため含めません。',buffs:[
   {id:120,name:'コンデンスマインド',level:75,description:'MP自然回復上昇',pending:[{name:'MP自然回復の増加量',reason:'ペット用のスキル・魔力入力と実測値が未確認'}]}
  ]},
  {id:'jackalope',name:'ジャッカロープ',mode:'回復支援',minLevel:50,maxLevel:150,url:url('ジャッカロープ'),condition:'飼い主に支援Buffが付与された場合。瞬間HP回復は含めません。癒しの瞳は内部140秒を使用（wiki Lv150約150秒）。',buffs:[
   {id:9606,name:'癒しの瞳',level:50,duration:140,description:'MPを20秒ごとに回復',periodic:[{resources:['MP'],points:[[150,60]],intervalSeconds:20}]},
   {id:9607,name:'幻獣のソーマ',level:110,duration:15,description:'状態異常・継続ダメージを解除して防止'}
  ]},
  {id:'nekomata',name:'ネコマタ',mode:'猫又憑依',minLevel:40,maxLevel:150.1,url:url('ネコマタ'),condition:'右クリックで指示、最大忠誠35以上。ジャンプや変身で解除。量は実測範囲の中間値、時間はwiki Lv150.1約90秒（内部上限180秒とは区別）。',buffs:[
   {id:4882,name:'猫又憑依',level:40,description:'最大HP・攻撃力・回避上昇',durationPoints:[[150.1,90]],observations:[{fields:['extraHP'],ranges:[[60.1,26,29],[150.1,53,56]]},{fields:['flatAttack','extraAvoid'],ranges:[[60.1,12.8,13.4],[150.1,29,29.7]]}]}
  ]}
 ];
 const labels={extraAC:'防御力',flatAttack:'攻撃力',flatMagic:'魔力',flatSpeed:'移動速度',extraHit:'命中',extraAvoid:'回避',extraHP:'最大HP',extraMP:'最大MP',extraMPPct:'最大MP',dmgPct:'物理ダメージ上昇',attackPct:'攻撃力',magicPct:'魔力',speedPct:'移動速度',extraACPct:'防御力',extraHitPct:'命中',extraAvoidPct:'回避',extraAttackDelay:'攻撃ディレイ',extraMagicDelay:'魔法ディレイ',extraDamageReducePct:'被ダメージ軽減',hpRegenPerMinute:'HP自然回復',mpRegenPerMinute:'MP自然回復',stRegenPerMinute:'ST自然回復',extraNeutralRes:'無耐性',extraFireRes:'火耐性',extraWaterRes:'水耐性',extraWindRes:'風耐性',extraEarthRes:'地耐性'};
 function observation(points,level){
  const exact=points.find(p=>p[0]===level);if(exact)return {value:exact[1],kind:'wiki実測の目安'};
  for(let i=1;i<points.length;i++)if(points[i-1][0]<level&&level<points[i][0]){const [x,a]=points[i-1],[y,b]=points[i];return {value:a+(b-a)*(level-x)/(y-x),kind:'wiki実測値間の直線補間（推定）'};}
  return null;
 }
 function isPet(row){return row?.catalogSource==='pet-owner-buff-v1';}
 function observed(spec,level){
  const points=spec.ranges?spec.ranges.map(([level,low,high])=>[level,(low+high)/2]):spec.points||[];
  const result=observation(points,level);
  return result&&{...result,kind:result.kind+(spec.ranges?'・実測範囲の中間値':'')};
 }
 function build(id,rawLevel){
  const pet=catalogs.find(p=>p.id===id),level=pet?.levelIndependent?0:Number(rawLevel);
  if(!pet||(!pet.levelIndependent&&(rawLevel===''||rawLevel==null))||!Number.isFinite(level)||level<pet.minLevel||level>pet.maxLevel)throw Error('ペットのレベルを範囲内で入力してください');
  return pet.buffs.filter(b=>level>=b.level).map(b=>{
   const calculated=petFormulas.calculate(id,b.id,level),covered=new Set(calculated?.replacedFields||[]);
   const fields={...b.fixed,...b.exact,...calculated?.fields},values=[],pending=(b.pending||[]).filter(p=>!p.fields?.every(f=>covered.has(f))).map((p,i)=>({id:b.id+':pending:'+i,category:'未確認',...p})),estimatedFields=[...Object.keys(b.fixed||{}).filter(f=>!covered.has(f)),...(calculated?.estimatedFields||[])],kinds=new Set();
   if(calculated)kinds.add('ペットのレベルから計算（変動の基準値）');
   if(Object.keys(b.fixed||{}).length)kinds.add('wiki実測の目安');
   if(Object.keys(b.exact||{}).length)kinds.add('固定効果');
   for(const source of b.observations||[]){const o={...source,fields:source.fields.filter(f=>!covered.has(f))};if(!o.fields.length)continue;const sample=observed(o,level);
    if(!sample){pending.push({id:b.id+':'+o.fields[0],name:o.fields.map(f=>labels[f]).join('・'),reason:'このレベルの実測値と確定式がありません',category:'参考値なし'});continue;}
    kinds.add(sample.kind);for(const field of o.fields){fields[field]=sample.value;estimatedFields.push(field);}
   }
   for(const [field,value]of Object.entries(fields))values.push({id:b.id+':'+field,name:labels[field],value,unit:/Pct$/.test(field)?'%':/RegenPerMinute/.test(field)?'/分':'',scope:'飼い主',estimated:estimatedFields.includes(field)});
   const applied=values.map(v=>v.id);
   for(const [i,v]of (b.displayValues||[]).entries())if(!(calculated?.magicDamageCalculated&&v.name==='魔法ダメージ上昇'))values.push({id:b.id+':display:'+i,...v,scope:'表示のみ',estimated:false});
   values.push(...(calculated?.values||[]));
   for(const [i,o]of [...(calculated?.periodicCalculated?[]:b.periodic||[]).map(o=>({...o,periodic:true})),...(b.displayObservations||[])].entries()){
    const sample=observed(o,level),name=o.name||(o.resources.join('・')+'周期回復量');
    if(!sample){pending.push({id:b.id+':observation:'+i,name,category:'参考値なし',reason:'このレベルの実測値と確定式がありません'});continue;}
    kinds.add(sample.kind);
    for(const resource of o.resources||[''])values.push({id:b.id+':observation:'+i+resource,name:o.name||(resource+'回復量'),value:sample.value,unit:o.unit||resource,scope:o.periodic?'周期回復1回分':'表示のみ',estimated:true,...(o.intervalSeconds?{intervalSeconds:o.intervalSeconds}:{})});
   }
   let seconds=b.duration??pet.duration,timeEstimated=false;
   if(b.durationPoints){const sample=observation(b.durationPoints,level);seconds=sample?.value;timeEstimated=!!sample;}
   if(Number.isFinite(calculated?.seconds)){seconds=calculated.seconds;timeEstimated=false;}
   if(!Number.isFinite(seconds))pending.push({id:b.id+':duration',name:b.name+'の持続時間',category:'時間未確認',reason:'このレベルの時間の実測値と入力換算が未確認'});
   const times=Number.isFinite(seconds)?[{definitionId:b.id,name:b.name,seconds,conditional:false,estimated:timeEstimated}]:[];
   return {name:pet.name+'：'+b.name,enabled:false,fixed:false,excluded:false,slot:true,...fields,
    tags:pet.firstWins?'pet-support:'+b.group:'',stackRule:pet.firstWins?'first':'',clientBuffDefinitionId:String(b.id),...(Number.isFinite(seconds)?{durationSeconds:seconds}:{}),
    catalogSource:'pet-owner-buff-v1',catalogRuleId:'pet:'+pet.id+':'+b.id,catalogInputs:{petId:pet.id,petLevel:level,petFamily:pet.family||pet.id},
    extraEffects:[{key:'custom',name:b.description,scope:'display',unit:'',note:''}],
    note:pet.mode+'・Buff付与時の効果／'+(pet.levelIndependent?'レベル非依存':'Lv'+level)+'／'+([...kinds].join('・')||'効果の説明と確認済みの時間を表示')+'。'+(timeEstimated?'持続時間はwiki実測の参考値。':'')+(pet.condition||'')+(pet.firstWins?'同じ競合グループは先に付いたBuffを優先。':'他のBuffとの重複可否は未確認。')+'魔力増減など追加補正なし。',
    catalogNumeric:{version:1,key:'pet:'+pet.id+':'+b.id,values,pending,applied,estimatedFields,times,inputs:{petId:pet.id,petLevel:level,...(calculated?{petActor:calculated.source,quantityBasis:'client-base-seed10'}:{})}}
   };
  });
 }
 function replace(rows,id,level){
  const pet=catalogs.find(p=>p.id===id),family=pet?.family||id;
  const matches=r=>isPet(r)&&(r.catalogInputs?.petFamily||r.catalogInputs?.petId)===family;
  const first=rows.findIndex(matches),previous=rows.filter(matches);
  const flags=previous.length?{enabled:previous.every(r=>r.enabled),fixed:previous.every(r=>r.fixed),excluded:previous.some(r=>r.excluded)}:{};
  const next=build(id,level).map(row=>({...row,...flags}));
  const result=rows.filter(r=>!matches(r));
  result.splice(first<0?result.length:Math.min(first,result.length),0,...next);return result;
 }
 function setControls(rows,id,prop,value){
  if(!['enabled','fixed','excluded'].includes(prop))throw Error('ペット単位の設定ではありません');
  return rows.map(row=>{
    if(!isPet(row)||row.catalogInputs?.petId!==id)return row;
    return {...row,[prop]:!!value,...(prop==='enabled'&&value?{excluded:false}:{}),...(prop==='excluded'&&value?{enabled:false}:{})};
  });
 }
 const api={catalogs,build,replace,setControls,isPet,observation};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MOE_PET_BUFF_CATALOG=api;
})(globalThis);
