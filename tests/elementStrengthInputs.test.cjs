const fs=require('node:fs'),assert=require('node:assert/strict'),numeric=require('../src/calc/combatNumerics'),index=require('../src/data/generated/combatCatalogIndex.generated'),rules=require('../src/ui/combatConditionInputs');
function bundle(name){const e=index.entries.find(r=>r.name===name);assert.ok(e,name);const page=JSON.parse(fs.readFileSync('src/data/generated/combatNumericPages/'+String(e.page).padStart(3,'0')+'.json'));return {bundle:page.rows.find(b=>b.row.key===e.key),names:page.skillNames};}
const base={skill:100,magic:100,world:0,seed:10,targetDefense:100,resistance:50,targetAmplificationAllowed:true};
function values(r){return r.effects.filter(e=>e.supported&&Number.isFinite(e.value)&&!e.timeOnly).map(e=>[e.definitionId,e.kind,e.value]);}
const results=[];
for(const name of ['バースト','フリーズ','エンライテン']){
 const {bundle:b,names}=bundle(name),element=b.row.definition.element;assert.ok([2,3,4,5,6].includes(element));
 const evalWith=p=>numeric.evaluate(b,{...base,...p},names);
 const initial=values(evalWith({})),manual=values(evalWith({casterElementStrengthByElement:{[element]:20}})),legacy=values(evalWith({casterElementStrengthPct:20}));
 assert.deepEqual(manual,legacy,name+' per-element follows established strength formula');assert.notDeepEqual(manual,initial,name+' strength changes quantity');
 const other=element===3?4:3;assert.deepEqual(values(evalWith({casterElementStrengthByElement:{[other]:20}})),initial,name+' other element cannot leak');
 assert.deepEqual(values(evalWith({casterElementStrengthByElement:{[element]:0}})),initial);
 assert.ok(rules.elementStrengthElements(b,numeric).includes(element));
 assert.throws(()=>evalWith({casterElementStrengthByElement:{[element]:''}}),/有効な数値/);assert.throws(()=>evalWith({casterElementStrengthByElement:{[element]:1001}}),/有効な数値/);
 const bypass={...b,row:{...b.row,definition:{...b.row.definition,flags:b.row.definition.flags|0x1000},dependencies:[]}};assert.equal(rules.elementStrengthElements(bypass,numeric).length,0);
 results.push({name,element,baseline:initial,boosted:manual});
}
assert.equal(numeric.elementStrength({element:3},{casterElementStrengthByElement:{3:0}},50),0);
assert.equal(numeric.elementStrength({element:4},{casterElementStrengthByElement:{3:25}},50),50);
assert.equal(rules.elementStrengthElements(null,numeric).length,0);
console.log(JSON.stringify({passed:true,results}));

// Blade children inherit the per-element values, not the parent's strength channels.
{const {bundle:b,names}=bundle('フレイム ブレイド');
 const input={...base,bladeMode:'normal',bladeSelected:true,skills:{'神秘魔法':100}};
 const run=extra=>numeric.evaluate(b,{...input,...extra},names).effects.find(e=>e.bladeFollowup)?.bladeFollowup;
 const plain=run({}),boost=run({casterElementStrengthByElement:{3:20}}),reference=run({casterElementStrengthPct:20});
 assert.ok(plain&&boost);assert.deepEqual(values(boost),values(reference));assert.notDeepEqual(values(boost),values(plain));
 assert.ok(rules.elementStrengthElements(b,numeric,{bladeSelected:true,bladeMode:'normal'}).includes(3));
 console.log('Blade per-element child calculation passed');}
// The existing average-damage adapter consumes the same manual total as the one-shot path.
{const {bundle:b,names}=bundle('バースト'),damage=require('../src/calc/techniqueDamage');
 const context={attack:100,hit:100,defense:0,evasion:0,powerMultiplier:1,specialMultiplier:1,incoming:1,targetMultiplier:1,finalCap:0,elementPct:0,additionalElementPct:0,magicPct:0};
 const got=numeric.evaluate(b,{...base,damageContext:context,casterElementStrengthByElement:{3:20}},names);
 const reference=damage.calculate(b.attack,{...context,skill:100,magic:100,targetDefense:100,resistance:50,elementPct:20});
 assert.equal(got.attack.average,reference.average);console.log('Average damage adapter per-element calculation passed');}
