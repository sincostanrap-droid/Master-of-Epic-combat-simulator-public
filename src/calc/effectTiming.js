(function(root){
  'use strict';
  const f=Math.fround;
  function counter(d,x,world=0){
    const cap=d.duration_limit+(world===1?0:d.duration_extra_limit);
    let factor=Math.max(.25,1+(f(x)-d.required)*(d.duration_coefficient+(world===1?0:d.duration_extra)));
    if(cap>=1)factor=Math.min(factor,cap);
    return Math.min(216000,Math.floor(d.counter*f(factor)+.5));
  }
  function duration(d,input={}){
    const number=(v,fallback)=>Number.isFinite(Number(v))?Number(v):fallback;
    const skill=Math.max(0,number(input.skill??100,100)),magic=Math.max(0,number(input.magic??100,100));
    const converted=Math.round(skill*10000)*f(.0001);
    const x=Math.trunc((d.action_type===1?converted*f(.6)+f(magic)*f(.4):f(converted))*16)/16;
    const count=counter(d,x,input.world||0);
    if(count>0&&d.interval>0)return {seconds:count*d.interval/60,kind:'buff'};
    const area=d.effects.find(e=>e.kind===71&&e.selector>0);
    // Kind9 placements use getter774040's integer lifetime. Kind8 pets have
    // a separate scaling path and are deliberately outside this catalog.
    if(area)return {seconds:Math.trunc(area.selector/60),kind:'area'};
    return {seconds:0,kind:'instant'};
  }
  const api=Object.freeze({counter,duration});
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MOE_EFFECT_TIMING=api;
})(globalThis);
