(function(root) {
  'use strict';
  const f = Math.fround;
  // Editable product fields. Attack/hit use separate reference getters;
  // other percentage messages reference the value at that point in the order.
  const fields = Object.freeze([
    ['attackCache','flatAttack','attackPct','attack',-500,500],
    ['hitCache','extraHit','extraHitPct','extraHit',-500,500],
    ['magic','flatMagic','magicPct','magic',0,500],
    ['speed','flatSpeed','speedPct','speed',-10000,1000],
    ['hp','extraHP','extraHPPct','extraHP',1,1000],
    ['mp','extraMP','extraMPPct','extraMP',0,1000],
    ['st','extraST','extraSTPct','extraST',1,500],
    ['weight','extraMaxWeight','extraMaxWeightPct','extraMaxWeight',1,1000],
    ['defense','extraAC','extraACPct','extraAC',0,500],
    ['avoid','extraAvoid','extraAvoidPct','extraAvoid',0,500],
    ['fireRes','extraFireRes','extraFireResPct','extraFireRes',0,180],
    ['waterRes','extraWaterRes','extraWaterResPct','extraWaterRes',0,180],
    ['earthRes','extraEarthRes','extraEarthResPct','extraEarthRes',0,180],
    ['windRes','extraWindRes','extraWindResPct','extraWindRes',0,180],
    ['neutralRes','extraNeutralRes','extraNeutralResPct','extraNeutralRes',0,180]
  ]);
  const active = row => row.enabled && !row.excluded;
  function calculate({baseValues,equipment=[],rows=[],flat=[],pct=[],attackReference,hitReference,attackCap=500}) {
    const values={...baseValues},steps=[];
    for(const [key,,,,lower] of fields) values[key]=Math.max(lower,f(+baseValues[key] || 0));
    for(const [key,,,prop,lower] of fields) {
      // Armor has already been separated from flat AC by the caller.
      if(key==='defense') continue;
      let sum=0;
      for(const row of equipment) sum=f(sum+f(+row[prop] || 0));
      values[key]=Math.max(lower,f(values[key]+sum));
    }
    function write(key,amount,percentage,name) {
      if(!amount) return;
      const spec=fields.find(row=>row[0]===key);
      if(!spec) return;
      const before=values[key],reference=!percentage ? before : key==='attackCache' ? attackReference(values)
        : key==='hitCache' ? hitReference(values) : before;
      const delta=percentage ? f(f(amount)*f(.01)*f(reference)) : f(amount);
      values[key]=Math.max(spec[4],f(before+delta));
      steps.push({key,name:name || '',percentage,amount:f(amount),before,reference,delta,after:values[key]});
    }
    const legacyKey=target=>({attack:'attackCache',magic:'magic',speed:'speed'})[target];
    // Legacy separate sections do not encode a shared order. Retain their
    // explicit fixed-then-percentage convention before the composite rows.
    for(const row of flat.filter(active)) write(legacyKey(row.target || 'magic'),+row.value || 0,false,row.name);
    for(const row of pct.filter(active)) write(legacyKey(row.target),+row.percent || 0,true,row.name);
    for(const row of rows.filter(active)) {
      // A manually combined row specifies fixed fields followed by percentages.
      // Across rows, never regroup all fixed amounts ahead of percentages.
      for(const [key,prop] of fields) write(key,+row[prop] || 0,false,row.name);
      for(const [key,,prop] of fields) write(key,+row[prop] || 0,true,row.name);
    }
    const rawValues={...values};
    for(const [key,,,,lower,upper] of fields) values[key]=Math.max(lower,Math.min(key==='attackCache'?attackCap:upper,values[key]));
    return {values,rawValues,steps};
  }
  const api=Object.freeze({calculate,fields});
  if(typeof module!=='undefined'&&module.exports) module.exports=api;
  else root.MOE_ORDERED_STATS=api;
})(globalThis);
