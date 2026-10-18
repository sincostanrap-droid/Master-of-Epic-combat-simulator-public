(function(root){
  'use strict';
  const catalog=root.MOE_REVIEWED_BUFF_CATALOG_MANUAL||[];
  for(const rule of catalog){
    const presentation=root.MOE_BUFF_PRESENTATION?.[rule.id],d=presentation?.timing;
    if(!d)continue;
    const variable=d.duration_coefficient||d.duration_extra;
    if(variable){
      if(rule.inputKind==='none')rule.inputKind=d.action_type===1?'skillMagic':'skill';
      if(d.action_type===1&&rule.inputKind==='skill')rule.inputKind='skillMagic';
      rule.skillLabel=rule.skillLabel||presentation.skillLabel;
      rule.defaultSkill=rule.defaultSkill??100;
      if(d.action_type===1)rule.defaultMagic=rule.defaultMagic??100;
    }
    const evaluate=rule.evaluate;
    rule.evaluate=function(input={}){
      const result=evaluate.call(this,input),duration=root.MOE_EFFECT_TIMING.duration(d,input);
      return {...result,durationSeconds:duration.seconds};
    };
  }
})(globalThis);
