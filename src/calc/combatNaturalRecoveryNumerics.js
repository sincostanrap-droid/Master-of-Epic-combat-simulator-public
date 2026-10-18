// kind13 arithmetic: saved 5617f0 oracle. Real-second conversion is an estimate.
(function(root){'use strict';
 const f=Math.fround,view=new DataView(new ArrayBuffer(8));
 // Ported from tools/research/shared-effects-reference-20261010.cjs. Retain
 // x87's 64 significant bits and the single float32 message store.
 function rounded(n,e,precision=64,minExponent=-20000){
  if(n===0n)return {n,e:0};const neg=n<0n;if(neg)n=-n;
  const shift=Math.max(0,n.toString(2).length-precision,minExponent-e);
  if(shift){const d=1n<<BigInt(shift),q=n/d,r=n%d;n=q+(r*2n>d||r*2n===d&&(q&1n)?1n:0n);e+=shift;}
  return {n:neg?-n:n,e,negativeZero:n===0n&&neg};
 }
 function N(v){
  if(v===0)return {n:0n,e:0,negativeZero:Object.is(v,-0)};
  view.setFloat64(0,v,true);const lo=view.getUint32(0,true),hi=view.getUint32(4,true),ex=(hi>>>20)&2047;
  let n=(BigInt(hi&0xfffff)<<32n)|BigInt(lo);if(ex)n|=1n<<52n;
  return rounded(hi>>>31?-n:n,ex?ex-1075:-1074);
 }
 const negative=x=>x.n<0n||x.n===0n&&x.negativeZero;
 function add(a,b){if(a.n===0n&&b.n===0n)return N(negative(a)&&negative(b)?-0:0);const e=Math.min(a.e,b.e);return rounded((a.n<<BigInt(a.e-e))+(b.n<<BigInt(b.e-e)),e);}
 function mul(a,b){if(a.n===0n||b.n===0n)return N(!!negative(a)!==!!negative(b)?-0:0);return rounded(a.n*b.n,a.e+b.e);}
 function num(v){if(typeof v!=='number'||!Number.isFinite(v)||!Number.isFinite(f(v)))throw Error('自然回復の有限な内部入力が必要です');return f(v);}
 function store(a){if(a.n===0n)return a.negativeZero?-0:0;const r=rounded(a.n,a.e,24,-149);return num(r.n===0n&&r.negativeZero?-0:Number(r.n)*2**r.e);}
 function nativeDelta(base,multiplier,signedAddition,elapsed){
  if(!Number.isInteger(elapsed)||elapsed< -2147483648||elapsed>2147483647)throw Error('elapsedはsigned32整数です');
  return store(mul(add(mul(N(num(base)),N(num(multiplier))),N(num(signedAddition))),N(elapsed)));
 }
 const calibration=Object.freeze({id:'generate-body-observation-20261012',definitionId:11601,
  unitsPerSecond:60,preObserved:60,warObserved:24,clientPre:1,clientWar:f(.4),
  status:'公開実測記録とクライアント内部値の比較による推定',clockVerified:false,errorBound:null,
  url:'https://scrapbox.io/medianmoe/ジェネレイト_ボディ',
  sourceLimitation:'添付wikiの元ZIPは現在不在、wiki本文は取得不可。毎秒量はMedi記録Scrapbox版の公開実測記録を代替出典とする'});
 function estimate(base,multiplier,signedAddition,selector){
  const resource=['','HP','MP','ST'][selector&255];if(!resource)throw Error('kind13の資源selectorが未対応です');
  return {resource,perInternalUnit:nativeDelta(base,multiplier,signedAddition,1),
   perSecond:nativeDelta(base,multiplier,signedAddition,calibration.unitsPerSecond),
   perMinute:nativeDelta(base,multiplier,signedAddition,calibration.unitsPerSecond*60),
   calibration,estimated:true,continuousEligibilityAssumed:true,total:null,
   scope:'有効な内部elapsedの合計3600を1分と推定。対象・phaseが継続して成立する間のBuffによる資源増減速度。1分未満で終了する技も速度の分間換算であり、実際に1分間回復する総量ではない。正は回復、負は減少。基礎自然回復・最大資源上限・実HP保存を含まない。',
   remaining:'実時計の換算と誤差幅は未確定。周期/phaseの有効時間・解除・上書きが未確定なため、技全体の自動総量は算出しない'};
 }
 const api=Object.freeze({nativeDelta,estimate,calibration});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MOE_COMBAT_NATURAL_RECOVERY_NUMERICS=api;
})(globalThis);
