// Arithmetic reused verbatim from the saved 605530 reproduction; no client access.
(function(root){'use strict';const constants={"0x90c674":0.00009999999747378752,"0x941d14":0.019999999552965164,"0x941cb0":0.20000000298023224};
// Decoded skill values are signed32 integers, scaled by 1/10000, not bytes.
// See clientCurrentBaseSkillReference.readSkill / saved 62f390 and 5a2780.
// Each action constructor still enforces its own encoded input range below.
const skillIntegerMax=0x7fffffff,skillMax=skillIntegerMax/10000;
const f=Math.fround,v=new DataView(new ArrayBuffer(8));
const bits=x=>{v.setFloat32(0,x,true);return v.getUint32(0,true);};
function round(n,e,width=64){const neg=n<0n;if(neg)n=-n;const shift=Math.max(0,n.toString(2).length-width);
  if(shift){const u=1n<<BigInt(shift),q=n/u,r=n%u;n=q+(2n*r>u||2n*r===u&&(q&1n)?1n:0n);e+=shift;}return {n:neg?-n:n,e};}
function X(x){v.setFloat64(0,x,true);const hi=v.getUint32(4,true),lo=v.getUint32(0,true),ex=(hi>>>20)&2047;
  let n=(BigInt(hi&0xfffff)<<32n)|BigInt(lo);if(ex)n|=1n<<52n;return {n:hi>>>31?-n:n,e:ex?ex-1075:-1074};}
const add=(a,b)=>{const e=Math.min(a.e,b.e);return round((a.n<<BigInt(a.e-e))+(b.n<<BigInt(b.e-e)),e);};
const neg=a=>({n:-a.n,e:a.e}),sub=(a,b)=>add(a,neg(b));
const mul=(a,b)=>round(a.n*b.n,a.e+b.e);
function div(a,b){let n=a.n,d=b.n;const negative=(n<0n)!==(d<0n);if(n<0n)n=-n;if(d<0n)d=-d;
  if(!d)throw new RangeError('Division by zero');const shift=64+d.toString(2).length-n.toString(2).length;
  const N=shift>=0?n<<BigInt(shift):n,D=shift<0?d<<BigInt(-shift):d,q=N/D,r=N%D;
  const result=q+(2n*r>D||2n*r===D&&(q&1n)?1n:0n);return round(negative?-result:result,a.e-b.e-shift);}
const compare=(a,b)=>{const r=sub(a,b);return r.n<0n?-1:r.n>0n?1:0;};
function stored(a){let n=a.n<0n?-a.n:a.n,e=a.e;const shift=Math.max(0,n.toString(2).length-24,-149-e);
  if(shift){const u=1n<<BigInt(shift),q=n/u,r=n%u;n=q+(2n*r>u||2n*r===u&&(q&1n)?1n:0n);e+=shift;}
  const out=f((a.n<0n?-1:1)*Number(n)*2**e);if(!Number.isFinite(out))throw new RangeError('Float32 overflow');return out;}
const trunc=a=>Number(a.e>=0?a.n<<BigInt(a.e):a.n/(1n<<BigInt(-a.e)));
const F=x=>X(f(x)),C=a=>F(constants[a]),zero=X(0),one=X(1);

function factor(requirements,integers){let count=0,sum=zero;
 for(const s of requirements){if(!s.rawSkill||!s.required)continue;const v=integers[s.name];if(!Number.isInteger(v)||v<0||v>skillIntegerMax)throw Error('必要技能の入力が不足または32bit格納範囲外: '+s.name);count++;
 const diff=sub(mul(X(v),C('0x90c674')),X(s.required));
 if(compare(diff,zero)>0){let discount=mul(diff,C('0x941d14'));if(compare(discount,C('0x941cb0'))>0)discount=C('0x941cb0');if(compare(discount,zero)<0)discount=zero;sum=F(stored(add(discount,sum)));}}
 return count?stored(sub(one,div(sum,X(count)))):1;
}
// Saved constructor2780 state1: getter5f9550 supplies the decoded235 total.
// Same x87 operations as linked-actions-reference-20261010.magicInput.
function scaledSkillInput(skillInteger){
 if(!Number.isInteger(skillInteger)||skillInteger<0||skillInteger>skillIntegerMax)throw Error('技能整数が32bit格納範囲外です');
 return stored(mul(X(skillInteger),F(.0001)));
}
function magicActionInput(skillInteger,adjustment,magic){
 if(!Number.isInteger(skillInteger)||skillInteger<0||skillInteger>skillIntegerMax||![adjustment,magic].every(Number.isFinite))throw Error('魔法の技能整数が32bit格納範囲外、または入力が不正です');
 const total=add(mul(X(skillInteger),F(.0001)),F(adjustment));
 const encoded=trunc(mul(add(mul(total,F(.6)),mul(F(magic),F(.4))),X(16)));
 if(encoded<0||encoded>32767)throw Error('魔法入力のsigned16範囲外です');return encoded/16;
}
// Original6056c8..6056f7: double the stored skill/cost factor before the
// resource-selector3 factor and the action's base ST; subtract in x87 precision.
function stConsumption({baseST,skillFactor=1,resourceFactor=1,currentST=null,doubled=false}){
 if([baseST,skillFactor,resourceFactor].some(v=>typeof v!=='number'||!Number.isFinite(v)||v<0||v>100000)||typeof doubled!=='boolean'||currentST!==null&&(typeof currentST!=='number'||!Number.isFinite(currentST)||currentST<0||currentST>100000))throw Error('ST消費の基礎値・既知係数・残量を正しく指定してください');
 const adjustedFactor=doubled?stored(mul(F(skillFactor),X(2))):f(skillFactor);
 const cost=mul(mul(F(resourceFactor),F(adjustedFactor)),F(baseST));
 return {multiplier:doubled?2:1,baseST:f(baseST),adjustedFactor,request:stored(cost),remaining:currentST===null?null:stored(sub(F(currentST),cost)),
  scope:'通常PCのST消費経路。技能軽減後係数を必要なら2倍へfloat32保存し、資源補正と技の基礎STを乗算。要求表示はfloat32、残量は丸め前の要求を減算して保存。成否・中断・不足時の消費確定とは別。'};
}
function hpUpperPredicate(threshold,current,maximum){
 if(typeof threshold!=='number'||!Number.isFinite(threshold)||threshold<0||threshold>1)throw Error('HP発動条件の保存割合が不正です');
 const result={threshold:f(threshold),percent:f(threshold)*100,allowed:null,ratio:null};
 if(current==null||maximum==null)return {...result,reason:'使用者の現在HP・最大HPが未指定です。未指定を0にはしません'};
 if([current,maximum].some(v=>typeof v!=='number'||!Number.isFinite(v)||v<0||v>100000000)||maximum<=0)throw Error('HP発動条件の現在HP・正の最大HPを指定してください');
 const ratio=div(F(current),F(maximum));return {...result,current:f(current),maximum:f(maximum),ratio:stored(ratio),allowed:compare(ratio,F(threshold))<=0,reason:null};
}
const extendedArithmetic=Object.freeze({number:X,single:F,add,multiply:mul,trunc,storeSingle:stored});
const api=Object.freeze({extendedArithmetic,factor,scaledSkillInput,magicActionInput,stConsumption,hpUpperPredicate,skillMax,skillIntegerMax});if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MOE_COMBAT_RESOURCE_FORMULA=api;
})(globalThis);
