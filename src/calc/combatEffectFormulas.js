// Pure formula extraction from wikiPlayerEffects; no catalog loaded here.
(function(root){'use strict';
const timing=typeof module!=='undefined'&&module.exports?require('./effectTiming.js'):root.MOE_EFFECT_TIMING;
const f=Math.fround,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function create(skillNames={}){const data={skillNames};
  const fields={1:['extraHP'],2:['extraMP'],3:['flatAttack'],4:['extraHit'],5:['extraAC'],6:['extraAvoid'],7:['flatMagic'],8:['extraNeutralRes'],9:['extraFireRes'],10:['extraWaterRes'],11:['extraWindRes'],12:['extraEarthRes'],14:['extraMaxWeight'],15:['flatSpeed'],22:['extraST'],95:['extraNeutralRes','extraFireRes','extraWaterRes','extraWindRes','extraEarthRes']};
  const labels={1:'最大HP',2:'最大MP',3:'攻撃力',4:'命中',5:'防御力',6:'回避',7:'魔力',8:'無耐性',9:'火耐性',10:'水耐性',11:'風耐性',12:'地耐性',14:'最大重量',15:'移動速度',22:'最大ST',95:'全耐性'};
  const percentageField=key=>({flatAttack:'attackPct',flatMagic:'magicPct',flatSpeed:'speedPct'})[key]||key+'Pct';
  const effectFields=e=>e.kind===132?['extraCritRatePct']:e.kind===147?(fields[e.selector]||[]).map(percentageField):e.kind===41?fields[e.selector]||[]:[];
  const kindNames={2:'HP変化',8:'召喚',9:'設置',12:'追撃・継続ダメージ',13:'自然回復',23:'ST変化',41:'能力補正',47:'軽減・反射',49:'ブレイド追撃',69:'技能別ディレイ',86:'付随効果',108:'攻撃ディレイ',109:'詠唱',132:'クリティカル',133:'付随効果',147:'割合能力補正',188:'能力変換',235:'効果用スキル',247:'物理威力',274:'魔法威力',275:'属性威力'};

  function inputX(d,input={}){
    const number=v=>Number.isFinite(+v)?Math.max(0,+v):0;
    const skill=number(input.skill??100),magic=number(input.magic??100),converted=Math.round(skill*10000)*f(.0001);
    const encoded=Math.trunc((d.action_type===1?converted*f(.6)+f(magic)*f(.4):f(converted))*16);
    if(encoded>32767||encoded< -32768)throw new RangeError('使用者スキル・魔力が入力範囲外です');
    return encoded/16;
  }
  function channels(d,input={}){
    const x=inputX(d,input),world=+input.world===1?1:0;
    let m=1,a=0;
    if(!(d.flags&0x1000)){
      let sub=Math.max(f(.1),1+(x-d.required)*(f(d.coefficient)+(world?0:f(d.extra_coefficient))));
      const limit=f(d.upper_limit)+(world?0:f(d.extra_upper_limit));
      if(limit>=1)sub=Math.min(sub,limit);
      sub=f(sub);
      if(d.flags&2||d.flags254&1)m=sub;
      else {m=(x+300)*f(1/350)+sub-1;a=clamp(f(x*f(.15)),0,40);}
      m=clamp(f(m),0,10);
      m=f(m*(1+f((Number.isFinite(+input.casterElementStrengthPct)?+input.casterElementStrengthPct:0)/100)));
    }
    return {x,m,a};
  }
  function statReason(d,e){
    if(!Number.isFinite(e.value))return '効果量の数値形式は未確認';
    // The kind147 producer is shared across classes. With the strength
    // bypass it receives M=1/A=0, so weapon/class3 input routing is irrelevant.
    // Keep non-bypass constructors, selectors and conditional effects gated.
    const fixedPercentage=e.kind===147&&!!(d.flags&0x1000);
    if(d.flags&0x4000000||!fixedPercentage&&(![1,4].includes(d.action_type)||d.effect_class!==1))return 'この効果の入力・適用分岐は未解析';
    const supported=[41,147].includes(e.kind)&&fields[e.selector]||e.kind===132&&e.selector===1&&Math.abs(e.value)<=1||e.kind===235&&data.skillNames[e.selector];
    if(!supported)return ({2:'HP変化の符号・入力と回復/ダメージの適用は未解析',8:'召喚体の能力・寿命の式は未解析',9:'設置物の状態・作用条件は未解析',12:'追撃・継続ダメージの入力と成立回数は未解析',13:'資源上限・周期から自然回復量への換算は未解析',23:'ST変化の入力・符号・倍率適用は未解析',47:'軽減・反射の成立条件と量の式は未解析',49:'ブレイド追撃の入力変換・適用・成立回数は未解析',69:'技能別ディレイの適用順と実周期は未解析',86:'付随効果の発動条件・入力継承は未対応',133:'付随効果の発動条件・入力継承は未対応',108:'攻撃ディレイの単位・適用順は未対応',109:'詠唱時間の単位・適用順は未対応',188:'能力変換の入力と適用順は未解析',247:'物理威力補正の適用条件は未対応',274:'魔法威力補正の適用条件は未対応',275:'属性威力補正の適用条件は未対応'})[e.kind]||'この効果種類・対象の型・演算・適用条件は未解析';
    if(e.qualifier||e.other10||e.other18||e.flags&~(0x30|0x100|0x200))return '条件付き能力補正の判定は未対応';
    return '';
  }
  function timeStatus(row){
    const d=row.definition;
    if(!d)return {supported:false,reason:'内部定義の照合未完了'};
    if(d.id===392)return {supported:false,reason:'人数別Buffの選択・時間入力の継承は未解析'};
    if(!d.effects.length)return {supported:false,reason:'動作・外見効果の有効時間は未解析'};
    if(d.flags&0x4000000)return {supported:false,reason:'時間入力の別分岐は未解析'};
    if(d.counter>0&&d.interval>0&&[1,4].includes(d.action_type))return {supported:true,kind:'buff',partial:row.dependencies.some(n=>n.counter>0&&n.interval>0||n.effects.some(e=>[8,9].includes(e.kind)))};
    if(d.effects.some(e=>e.kind===71&&e.selector>0)&&d.effects.some(e=>e.kind===9))return {supported:true,kind:'area'};
    if([d,...row.dependencies].some(n=>n.effects.some(e=>[8,9].includes(e.kind))))return {supported:false,reason:'召喚体・設置の寿命、入力の継承は未解析'};
    if(row.dependencies.some(n=>n.counter>0&&n.interval>0))return {supported:false,reason:'付随効果の発動条件・時間入力の継承は未対応'};
    if(d.counter>0||d.effects.some(e=>[41,47,49,132,147].includes(e.kind)))return {supported:false,reason:'有効時間の適用経路は未対応'};
    return {supported:true,kind:'instant'};
  }
  function duration(row,input={}){
    const status=timeStatus(row);if(!status.supported)return null;
    if(status.kind==='instant')return 0;
    const d=row.definition,x=inputX(d,input);
    if(status.kind==='area')return Math.trunc(d.effects.find(e=>e.kind===71&&e.selector>0).selector/60);
    return timing.counter(d,x,+input.world===1?1:0)*d.interval/60;
  }

  function effect(d,e,input={}){
    const reason=statReason(d,e);if(reason)return {supported:false,reason,value:null,fields:[]};
    const world=+input.world===1?1:0,a=!!(e.flags&0x100),b=!!(e.flags&0x200);
    const active=!(a!==b&&(a&&world===1||b&&world!==1)),c=e.kind===41?channels(d,input):null;
    const value=active?(e.kind===41?f(f(e.value)*c.m+(e.value<0?-c.a:c.a)):e.kind===132?e.value*100:e.value):0;
    return {supported:true,active,value,fields:effectFields(e),skillName:e.kind===235?data.skillNames[e.selector]:null};
  }
  return Object.freeze({fields,labels,effectFields,kindNames,inputX,channels,statReason,timeStatus,duration,effect});
}
const api=Object.freeze({create});if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MOE_COMBAT_EFFECT_FORMULAS=api;
})(globalThis);
