(function(root){'use strict';
 const data=typeof module!=='undefined'&&module.exports?require('../data/generated/combatGuardWindows.generated.js'):root.MOE_COMBAT_GUARD_WINDOWS;
 const f=Math.fround;
 function window(id,{confirmed=false,delayed=false,current=null,scheduledMilliseconds=null}={}){
  const rule=data.rules[id];if(!rule)return null;
  if(typeof confirmed!=='boolean'||typeof delayed!=='boolean')throw Error('防御動作の条件を指定してください');
  const base={definitionId:id,activationRaw:rule.activationRaw,evidence:data.evidence,seconds:null,
   scope:'地上の通常PC・開始要求が受理され、中断・動作の差替えがない条件。発動基値から作る防御受付の内部カウンタ。1更新ごとに1進む値で、秒・再使用待ち・Buff保持時間とは区別します。特殊な開始要求の上書き枝は未対応です。'};
  if(!confirmed)return {...base,supported:false,reason:'地上の通常動作条件が未指定です。受付範囲を0として扱いません'};
  if(scheduledMilliseconds!==null){
   if(!Number.isInteger(scheduledMilliseconds)||scheduledMilliseconds<0||scheduledMilliseconds>16000000)throw Error('開始後の基準予定時間を0～16000000の整数msで指定してください');
   if(current!==null)throw Error('内部カウンタと基準予定時間はどちらか一方を指定してください');
   current=Math.floor(scheduledMilliseconds/16);
  }
  if(current!==null&&(typeof current!=='number'||!Number.isFinite(current)||current<0||current>1000000))throw Error('防御開始後の内部カウンタを0～1000000で指定してください');
  const n=Math.trunc(Math.max(1,f(rule.activationRaw))),extra=delayed?10:0,total=f(n+extra);
  let start=f(f(n*f(.01))+extra),end=f(f(n*(f(.01)+f(.9)))+extra);
  if(start>total)start=f(total-f(.5));if(end>total)end=total;
  const firstTick=Math.ceil(start),excludedTick=Math.ceil(end),clock={stepMilliseconds:16,firstAcceptedTick:firstTick,firstExcludedTick:excludedTick,
   startSeconds:firstTick*16/1000,endSeconds:excludedTick*16/1000,acceptedSeconds:Math.max(0,excludedTick-firstTick)*16/1000,actionSeconds:Math.ceil(total)*16/1000,
   elapsedMilliseconds:scheduledMilliseconds,evidence:'dist/client-numeric-gaps28-20261016/guard-clock-native-oracle.json',realElapsedVerified:false,
   scope:'開始時カウンタ0、以後16msごとに1更新する条件での基準予定時間。初回更新の位相・遅延・予定時計の再設定・中断を含む実時間は未検証です。'};
  return {...base,supported:true,total,start,end,width:end-start,scheduledClock:clock,current:current===null?null:f(current),inWindow:current===null?null:f(current)>=start&&f(current)<end,delayed,
   remaining:current===null?null:Math.max(0,end-f(current)),startInclusive:true,endInclusive:false};
 }
 const api=Object.freeze({window,rules:data.rules});if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MOE_COMBAT_GUARD_WINDOW_NUMERICS=api;
})(globalThis);
