const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const formulas=require('../src/calc/petBuffFormulas'),pet=require('../src/domain/petBuffCatalog');
const data=require('../src/data/generated/petBuffInputs.generated');
// Captured original643190/643472 results, not recomputed expected formulas.
for(const [id,level,integer,magic] of [
 ['magia-bit',0,0,2],['magia-bit',30.1,301000,32.099998474121094],['magia-bit',99.99,999899,101.98989868164062],
 ['magia-bit',149.9,1498999,151.89990234375],['magia-bit',150.1,1501000,152.09999084472656],['magia-bit',500,5000000,502],
 ['idol-finyu',150,1500000,165.5500030517578],['rafuel',150,1500000,180.60000610351562],
 ['crystal-ana',150,1500000,182.40000915527344],['crystal-luna',150,1500000,190],['crystal-ena',150,1500000,182.40000915527344]
]){const a=formulas.actor(id,level);assert.equal(a.skillInteger,integer);assert.equal(a.magic,magic);}
assert.equal(formulas.actor('nekomata',150),null,'never borrow class15 for class8');
for(const value of [-1,501,NaN,Infinity,'150',null])assert.throws(()=>formulas.actor('magia-bit',value));
assert.equal(formulas.calculate('crystal-ena',11707,150),null,'unreviewed Buff/profile binding stays out');
let rows=0;
for(const id of [...Object.keys(data.profiles),'idol-finyu-area']){
 const c=pet.catalogs.find(c=>c.id===id);
 for(const level of [...new Set([c.minLevel,100,149.9,150])].filter(l=>l>=c.minLevel)){
  for(const r of pet.build(id,level)){
   assert.ok(r.catalogNumeric.inputs.petActor);assert.ok(r.durationSeconds>0);assert.equal(r.catalogNumeric.pending.length,0);
   assert.ok(r.catalogNumeric.values.every(v=>Number.isFinite(v.value)));assert.equal(new Set(r.catalogNumeric.values.map(v=>v.id)).size,r.catalogNumeric.values.length);
   assert.equal(r.enabled,false);assert.equal(r.fixed,false);assert.equal(r.slot,true);
  }
 }
 rows+=pet.build(id,150).length;
}
assert.equal(rows,17);
const enhancement=pet.build('magia-bit',70).find(r=>r.clientBuffDefinitionId==='9162');
assert.equal(enhancement.flatAttack,15.908928871154785);assert.deepEqual(enhancement.catalogNumeric.estimatedFields,[]);
assert.ok(pet.build('magia-bit',100).find(r=>r.clientBuffDefinitionId==='9162').flatAttack>enhancement.flatAttack);
const ena=pet.build('crystal-ena',100);assert.equal(ena[0].extraAC,28.024555206298828);assert.equal(ena[1].flatMagic,22.18259048461914);
const idol=pet.build('idol-finyu',150);assert.equal(idol[0].catalogNumeric.values[0].value,44.12890625);assert.equal(idol[0].catalogNumeric.values[0].intervalSeconds,8);
assert.equal(idol[0].durationSeconds,64);assert.equal(idol[0].mpRegenPerMinute,undefined,'tick recovery is not natural recovery');
assert.equal(idol[1].extraAttackDelay,-20);assert.equal(idol[1].durationSeconds,55.85);
assert.equal(idol[2].flatAttack,43.08080291748047);assert.equal(idol[2].durationSeconds,99.71666666666667);
const arcana=pet.build('magia-bit',150).at(-1);assert.equal(arcana.extraAttackDelay,-70.375);assert.equal(arcana.hpRegenPerMinute,202.6125030517578);
assert.ok(arcana.catalogNumeric.estimatedFields.includes('hpRegenPerMinute'),'time calibration remains an estimate');
assert.ok(pet.build('magia-bit',150)[0].catalogNumeric.estimatedFields.includes('extraDamageReducePct'),'unproved reflection coefficient is still wiki reference');
assert.equal(pet.build('nekomata',150.1)[0].extraHP,54.5,'untouched reference');
assert.ok(pet.build('finyu',150)[0].catalogNumeric.pending.length,'unreviewed pet remains pending');
// Deferred-browser dependency order: formula engine is not needed at script load.
const context=vm.createContext({structuredClone});
for(const file of ['src/data/generated/petBuffInputs.generated.js','src/calc/petBuffFormulas.js','src/domain/petBuffCatalog.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context);
context.MOE_COMBAT_RESOURCE_FORMULA=require('../src/calc/combatResourceFormula');context.MOE_COMBAT_NUMERICS=require('../src/calc/combatNumerics');
assert.equal(context.MOE_PET_BUFF_CATALOG.build('magia-bit',70).at(-1).flatAttack,enhancement.flatAttack);
const html=fs.readFileSync('index.html','utf8');for(const [a,b]of [['petBuffInputs.generated.js','petBuffFormulas.js'],['petBuffFormulas.js','domain/petBuffCatalog.js']])assert.ok(html.indexOf(a)<html.indexOf(b));
console.log(JSON.stringify({passed:true,pets:6,modes:7,buffRows:rows,nativeFixtures:11,browser:'VM fixture, not live browser'}));
