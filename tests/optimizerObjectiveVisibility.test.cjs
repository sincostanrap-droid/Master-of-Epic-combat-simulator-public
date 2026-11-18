const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {context,root,json}=require('../tools/benchmark-optimizer.cjs');
const p=context();
// Model native select behavior, including loss of selection when an unavailable
// value is restored. Exercise the real markup, option installer and settings read.
class Option {
  constructor(text,value){this.textContent=text;this.value=value;}
  remove(){this.parent.options.splice(this.parent.options.indexOf(this),1);}
}
class Select {
  constructor(options){this.options=[];options.forEach(o=>this.appendChild(new Option(o.label,o.value)));this.value=options[0]?.value||'';}
  appendChild(option){option.parent=this;this.options.push(option);}
  get value(){return this.options.some(o=>o.value===this.selected)?this.selected:'';}
  set value(value){this.selected=String(value);}
}
const html=fs.readFileSync(root+'/index.html','utf8');
function markupOptions(id){
  const body=html.match(new RegExp('<select id="'+id+'">([\\s\\S]*?)</select>'))[1];
  return [...body.matchAll(/<option value="([^"]*)">([^<]*)<\/option>/g)].map(m=>({value:m[1],label:m[2]}));
}
const elements=new Map(['optimizerObjective','optimizerSecondaryObjective'].map(id=>[id,new Select(markupOptions(id))]));
elements.set('optimizerTargetValue',{value:'120'});elements.set('optimizerTargetOver',{value:'5'});
p.Option=Option;p.byId=id=>elements.get(id)||null;
const hidden=vm.runInContext('[...UTILITY_EXTRA_STAT_DEFS,...BUFF_PCT_EXTRA_STAT_DEFS,...BUFF_ONLY_EXTRA_STAT_DEFS.filter(d=>!d.prop.startsWith("extra"))].map(d=>d.prop)',p);
hidden.push('extraHit');
const primary=elements.get('optimizerObjective'),secondary=elements.get('optimizerSecondaryObjective');
// Previously generated options may already exist before this installer runs.
for(const value of hidden){primary.appendChild(new Option('legacy',value));secondary.appendChild(new Option('legacy',value));}
primary.value='hpRegenPerMinute';secondary.value='extraFishingGaugeLength';
p.ensureOptimizerObjectiveOptions();
assert.equal(primary.value,'damage');assert.equal(secondary.value,'');
assert.equal(elements.get('optimizerTargetValue').value,'');assert.equal(elements.get('optimizerTargetOver').value,'');
for(const select of [primary,secondary])for(const key of hidden)assert.ok(!select.options.some(o=>o.value===key),key);
const visible=p.optimizerObjectiveOptionDefs();
assert.equal(visible.length,23);assert.equal(new Set(visible.map(o=>o.value)).size,23);
for(const objective of ['damage','attackDps','sustainedDps'])assert.ok(visible.some(o=>o.value===objective));
assert.ok(visible.every(o=>o.label&&o.label!=='なし'));
assert.deepEqual(primary.options.map(o=>o.value).sort(),Array.from(visible,o=>o.value).sort());
assert.equal(secondary.options.filter(o=>o.value==='').length,1);
elements.set('optimizerMaxSlots',{value:'0'});
elements.set('optimizerExactEquipmentLimit',{value:'0'});
assert.equal(p.integratedOptimizerSettings().maxSlots,0);
assert.equal(p.integratedOptimizerSettings().exactEquipmentLimit,0);
// Reinstallation and normal settings reads preserve supported objectives/targets.
for(const {value} of visible){
  primary.value=value;secondary.value='magic';elements.get('optimizerTargetValue').value='100';
  const settings=p.integratedOptimizerSettings();
  assert.equal(settings.objective,value);assert.equal(settings.secondaryObjective,'magic');
  assert.equal(settings.targetValueRaw,'100');
}
// An imported legacy objective cannot silently become a damage target, even
// before the optimizer has been opened and the native select rejects its value.
p.syncRaceCoeff=()=>{};p.syncBaseMagic=()=>{};
p.setInputs({optimizerObjective:'mpChangePerSecond',optimizerSecondaryObjective:'extraSeeing',optimizerTargetValue:'42',optimizerTargetOver:'8'});
assert.equal(primary.value,'damage');assert.equal(secondary.value,'');
assert.equal(p.integratedOptimizerSettings().targetValueRaw,'');
assert.equal(p.integratedOptimizerSettings().targetOverRaw,'');
// Unknown future display fields are not automatically exposed as objectives.
const baseDefs=p.extraFieldDefsFor;p.extraFieldDefsFor=mode=>[...baseDefs(mode),{prop:'extraUnreviewedMetric',label:'future'}];
p.ensureOptimizerObjectiveOptions();assert.ok(!primary.options.some(o=>o.value==='extraUnreviewedMetric'));
// The retired hit objective compared additions rather than actual weapon hit.
// Keep it hidden until this concrete reversed ranking is resolved.
const st=json(vm.runInContext('DEFAULT_STATE()',p));st.equipment=[];st.composite=[];
st.skillSim.skills['銃器']=100;st.skillSim.skills['刀剣']=0;
const inputs={raceSelect:'newtar',str:100,spirit:100,weaponDamage:10,atkCap:500};
const hitMetrics=(name,skill,bonus)=>p.computeMetrics({...st,equipment:[{name,enabled:true,slot:'武器: 右手',weaponDamage:10,weaponReq:[{name:skill,required:100}],extraHit:bonus}]},inputs);
const gun=hitMetrics('銃器100','銃器',0),sword=hitMetrics('刀剣0＋命中1','刀剣',1);
assert.ok(gun.playerHit>sword.playerHit);
assert.ok(p.optimizerObjectiveRawValue(gun,'extraHit')<p.optimizerObjectiveRawValue(sword,'extraHit'));
assert.ok(!markupOptions('optimizerObjective').some(o=>o.value==='extraHit'));
assert.ok(!markupOptions('optimizerSecondaryObjective').some(o=>o.value==='extraHit'));
console.log(`optimizer objective visibility: ${visible.length} supported objectives, ${hidden.length} retired fields, hit-ranking regression, primary/secondary restoration and target reset OK`);
