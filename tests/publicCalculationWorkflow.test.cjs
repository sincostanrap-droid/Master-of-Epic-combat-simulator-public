// Bounded release regression: five selected techniques, serial page reads.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {context,json,root}=require('../tools/benchmark-optimizer.cjs'); // loader only
const numeric=require('../src/calc/combatNumerics');
const {connect}=require('../src/calc/buffNumericRegistration');
const index=require('../src/data/generated/combatCatalogIndex.generated');
const ctx=context(root,{data:false});ctx.structuredClone=structuredClone;
const source=fs.readFileSync('src/main.js','utf8');
const base={skill:100,magic:100,world:0,seed:10,targetDefense:100,resistance:50,targetAmplificationAllowed:true};
const fixtures=[
 ['バースト',{},'ダメージ（指定したばらつき）',78.401123046875],
 ['ヒーリング',{skill:75,magic:123.4},'HP回復量',73.87997436523438],
 ['エンライテン',{},'命中',17.76365852355957],
 ['ウィークネス アナライズ',{},'攻撃力',-29.70075035095215],
 ['フレイム ブレイド',{bladeMode:'normal',bladeSelected:true,skills:{'神秘魔法':100}},'HPダメージ',4.752120018005371]
];
const state={composite:[{name:'利用者の既存行',note:'保持',flatMagic:12,enabled:false}]};
const sandbox={structuredClone,state,combatBuffCatalogTransfer:null,reviewedBuffCatalogSelectedRule:()=>sandbox.rule,
 reviewedBuffCatalogInputs:()=>sandbox.inputs,reviewedBuffCatalogDefaultRow:ctx.reviewedBuffCatalogDefaultRow,
 normalizeCompositeRows:ctx.normalizeCompositeRows,renderCompositeTable(){},renderTagLinkSummary(){},renderShowcaseTab(){},calc(){},closeReviewedBuffCatalog(){}};
vm.createContext(sandbox);vm.runInContext(source.slice(source.indexOf('function addReviewedBuffCatalogSelection()'),source.indexOf('function openReviewedBuffCatalog(')),sandbox);
const results=[];
for(const [name,conditions,label,expected] of fixtures){
 const entry=index.entries.find(e=>e.name===name);assert.ok(entry);
 const page=JSON.parse(fs.readFileSync('src/data/generated/combatNumericPages/'+String(entry.page).padStart(3,'0')+'.json'));
 const bundle=page.rows.find(b=>b.row.key===entry.key),inputs={...base,...conditions};
 const evaluate=p=>connect(bundle,numeric,p,{},page.skillNames);
 sandbox.rule={id:bundle.row.id,name,wikiPlayerKey:entry.key,evaluate};sandbox.inputs=inputs;
 const effect=evaluate(inputs),value=effect.catalogNumeric.values.find(q=>q.name===label);
 assert.ok(value,name+' result');assert.equal(value.value,expected);
 sandbox.addReviewedBuffCatalogSelection();
 const row=state.composite.at(-1);row.note='利用者メモ';row.tags='利用者グループ';row.enabled=false;
 sandbox.addReviewedBuffCatalogSelection();assert.equal(state.composite.filter(r=>r.catalogRuleId===bundle.row.id).length,1);
 assert.equal(state.composite.at(-1).note,'利用者メモ');assert.equal(state.composite.at(-1).enabled,false);
 const restored=json(ctx.normalizeCompositeRows(json(state.composite)));
 assert.deepEqual(restored.at(-1).catalogNumeric,json(row.catalogNumeric));
 assert.deepEqual(restored.at(-1).catalogInputs,json(inputs));
 results.push({name,value:expected,time:effect.durationSeconds});
}
assert.equal(state.composite.length,6);assert.equal(state.composite[0].note,'保持');assert.equal(state.composite[0].flatMagic,12);
const buff=state.composite.find(r=>r.name==='エンライテン');assert.equal(buff.extraHit,17.76365852355957);
const debuff=state.composite.find(r=>r.name==='ウィークネス アナライズ');assert.equal(debuff.flatAttack,0);assert.equal(debuff.flatMagic,0);
for(const name of ['ヒーリング','バースト','フレイム ブレイド'])assert.equal(state.composite.find(r=>r.name===name).extraHP,0);
// Search/list rendering remains bounded; it does not fetch numerical pages.
const listCode=source.slice(source.indexOf('let reviewedBuffCatalogListLimit='),source.indexOf('function reviewedBuffCatalogSelectedRule()'));
let evaluations=0;const nodes={reviewedBuffCatalogList:{innerHTML:'',appendChild(){},querySelectorAll:()=>[]},reviewedBuffCatalogCount:{}};
const listContext={byId:id=>nodes[id],reviewedBuffCatalogSelectedId:'0',reviewedBuffCatalogFilteredRules:()=>Array.from({length:1642},(_,i)=>({id:String(i)})),reviewedBuffCatalogCardHtml:()=>{evaluations++;return '<button></button>';},document:{createElement:()=>({})}};
vm.runInNewContext(listCode+';renderReviewedBuffCatalogList();',listContext);assert.equal(evaluations,60);assert.match(nodes.reviewedBuffCatalogCount.textContent,/1642件中 60件/);
console.log(JSON.stringify({passed:true,results,duplicateRegistration:false,serialPages:5,jsonRoundTrip:true,existingRowPreserved:true,debuffNotAppliedToCaster:true,catalogueInitialCards:evaluations}));
