(function(root) {
  'use strict';
  const f=Math.fround, defaults={"33": 10.0, "34": 150.0, "35": 0.0, "36": 10.0, "37": 10.0, "38": 150.0, "39": 0.0, "40": 10.0, "41": 10.0, "42": 150.0, "43": 0.0, "44": 10.0, "45": 10.0, "46": 150.0, "47": 0.0, "48": 10.0, "49": 10.0, "50": 150.0, "51": 0.0, "52": 10.0, "53": 10.0, "54": 150.0, "55": 0.0, "56": 10.0, "57": 10.0, "58": 150.0, "59": 0.0, "60": 10.0, "61": 10.0, "62": 150.0, "63": 0.0, "64": 10.0, "65": 10.0, "66": 150.0, "67": 0.0, "68": 10.0, "69": 120.0, "70": 0.0, "71": 0.0, "72": 100.0, "73": 0.0, "74": 0.0, "75": 0.0, "76": 0.0, "77": 0.0, "78": 0.0, "79": 0.0, "80": 0.0, "81": 0.0, "82": 0.0, "83": 0.0, "84": 0.0, "85": 0.0, "86": 0.0, "88": 0.0, "89": 0.0, "90": 0.0, "91": 0.0, "92": 0.0, "93": 0.0, "94": 0.0, "95": 0.0};
  const skillSelectors=Object.freeze([89,90,91,94,95]);
  function number(v,label) {const n=Number(v);if(v==null||!Number.isFinite(n)||!Number.isFinite(f(n)))throw new RangeError('Invalid '+label);return f(n);}
  function selector(v) {const n=Number(v);if(!Number.isInteger(n)||n<0||n>=96)throw new RangeError('Invalid native stat selector');return n;}
  function range(s,o) {
    const r=o.limits?.[s]??o.limits;
    if(!r||r.lower==null||r.upper==null)throw new TypeError('Explicit native stat limits are required');
    const lower=number(r.lower,'lower limit'),upper=number(r.upper,'upper limit');
    if(lower>upper)throw new RangeError('Reversed native stat limits');
    const mode=Number(o.mode??0),status=Number(o.statusByte??0);
    if(!Number.isInteger(mode)||!Number.isInteger(status)||status<0||status>255)throw new RangeError('Invalid native stat mode/status');
    return {lower,upper:mode===5?f(upper*5):upper,exempt:!!(status&14)};
  }
  function query(value,s,options) {
    s=selector(s);const r=range(s,options),v=Math.max(r.lower,number(value,'stored value'));
    return r.exempt?v:Math.min(r.upper,v);
  }
  // Only the five equipment-fed fixed-base skill caches are modeled here.
  // Registry attribute eligibility and decoded item parameters are explicit inputs.
  function skillEquipmentCaches(items,allowedSelectors) {
    if(!Array.isArray(items)||items.length>18||!Array.isArray(allowedSelectors))throw new TypeError('Expected equipment slots and explicit eligible selectors');
    const allowed=new Set(allowedSelectors.map(selector)),values=Object.fromEntries(skillSelectors.map(s=>[s,0]));
    for(const item of items) {
      if(!Array.isArray(item)||item.length>5)throw new TypeError('Expected up to five decoded item parameter pairs');
      for(const row of item) {
        if(!Array.isArray(row)||row.length!==2)throw new TypeError('Expected decoded selector/value pair');
        const s=selector(row[0]),v=number(row[1],'equipment parameter');
        if(skillSelectors.includes(s)&&allowed.has(s))values[s]=f(values[s]+v);
      }
    }
    return values;
  }
  // Messages must already be admitted and ordered by the original dispatcher.
  // This API neither invents slot order nor resolves eligibility or gathering kind188.
  function rebuild(options) {
    if(!options||!options.baseValues||!Array.isArray(options.messages))throw new TypeError('Expected explicit base cache values and admitted messages');
    const values=Array(96).fill(0),steps=[];
    for(const [s,v] of Object.entries(options.baseValues))values[selector(s)]=number(v,'base value');
    // Original5f9f10 advances past87 without writing; retain an explicit prior value.
    if(options.resetExtended===true)for(const [s,v]of Object.entries(defaults))if(+s!==87)values[s]=query(v,s,options);
    for(let s=0;s<96;s++)values[s]=query(values[s],s,options);
    const before=values.slice();
    if(options.skillEquipmentCaches)for(const s of skillSelectors) {
      const added=number(options.skillEquipmentCaches[s]??0,'equipment skill cache');
      if(added!==0)values[s]=Math.max(range(s,options).lower,f(values[s]+added));
    }
    for(const message of options.messages) {
      const s=selector(message.selector),amount=number(message.amount,'stat message amount');
      if(typeof message.percentage!=='boolean')throw new TypeError('Expected explicit stat operation');
      const current=values[s];let reference=current,delta=amount;
      if(message.percentage) {
        if(s===2||s===3) {
          // Original virtual2b8(selector,1) is an independent weapon/reference
          // getter. Existing tool attack/hit aggregates cannot supply it safely.
          if(typeof options.percentageReference!=='function')throw new TypeError('Attack/hit percentage requires its explicit native reference getter');
          reference=number(options.percentageReference(s,current,values.slice()),'attack/hit percentage reference');
        }
        delta=f(amount*f(.01)*reference);
      }
      let next=f(current+delta);
      if(s>=24&&s<=27)next=Math.max(0,Math.min(100,next));
      // Alternate cache setter clamps the lower bound after each message;
      // the general upper bound is deferred until final commit.
      values[s]=Math.max(range(s,options).lower,next);
      steps.push({selector:s,percentage:message.percentage,current,amount,reference,delta,result:values[s]});
    }
    const intermediate=values.slice();
    for(let s=0;s<96;s++)values[s]=query(values[s],s,options);
    return {kind:'supplied-native-stat-rebuild',before,intermediate,values,steps,
      liveBaseValuesVerified:false,activationEvaluated:false,conversion188Evaluated:false,gathering188Evaluated:false,attackConversionsEvaluated:false,serverFinalStatsVerified:false};
  }
  const api=Object.freeze({query,rebuild,skillEquipmentCaches,skillSelectors,extendedDefaults:Object.freeze(defaults),
    defaultCalculationReplacement:false,scope:'Original96 cache bounds and admitted ordered stat-message consumption; five explicitly eligible decoded equipment skill caches. No live base generation, slot/condition inference, general armor pipeline, gathering188, attack-reference conversions or server claim.'});
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.MOE_CLIENT_STAT_CACHE_REFERENCE=api;
})(globalThis);
