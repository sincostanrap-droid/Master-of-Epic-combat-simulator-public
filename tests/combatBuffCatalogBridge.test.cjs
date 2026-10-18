const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('src/main.js','utf8');
const code=source.slice(source.indexOf('function combatBuffCatalogMatch('),source.indexOf('function installReviewedBuffCatalogStyles('));
const elements={},calls=[],state={composite:[{name:'既存の手入力',note:'保持',flatMagic:12}]};const saved=JSON.stringify(state);
const rule={id:'test-buff',wikiPlayerKey:'magic:test',name:'対象Buff',category:'強化魔法',calculationSupported:true,evaluate:()=>({flatMagic:20})};
const notices=[];
const sandbox={structuredClone,combatBuffCatalogTransfer:null,document:{createElement:()=>({})},REVIEWED_BUFF_CATALOG_PHASE1:[rule,{...rule,id:'ambiguous1',wikiPlayerKey:'ambiguous'},{...rule,id:'ambiguous2',wikiPlayerKey:'ambiguous'}],reviewedBuffCatalogSelectedId:'',byId:id=>elements[id]??={value:'',after:node=>notices.push(node)},openReviewedBuffCatalog:kind=>calls.push(kind),renderReviewedBuffCatalogList:()=>calls.push('list'),renderReviewedBuffCatalogPreview:()=>calls.push('preview')};
vm.createContext(sandbox);vm.runInContext(code,sandbox);const bridge=sandbox.MOE_COMBAT_BUFF_CATALOG_BRIDGE;
assert.equal(bridge.availability('missing').available,false);assert.equal(bridge.availability('ambiguous').available,false);assert.throws(()=>bridge.open('missing'),/確定できません/);assert.equal(calls.length,0);
bridge.open('magic:test');assert.equal(sandbox.reviewedBuffCatalogSelectedId,'test-buff');assert.equal(elements.reviewedBuffCatalogSearch.value,'対象Buff');assert.equal(elements.reviewedBuffCatalogCategory.value,'all');assert.equal(elements.reviewedBuffCatalogInputKind.value,'all');assert.equal(JSON.stringify(state),saved);
// Reuse the real registration function and verify its existing update path.
Object.assign(sandbox,{state,reviewedBuffCatalogSelectedRule:()=>rule,reviewedBuffCatalogInputs:()=>({skill:100,magic:100}),reviewedBuffCatalogDefaultRow:()=>({enabled:true,slot:true}),normalizeCompositeRows:rows=>rows,renderCompositeTable:()=>{},renderTagLinkSummary:()=>{},renderShowcaseTab:()=>{},calc:()=>{},closeReviewedBuffCatalog:()=>{}});
vm.runInContext(source.slice(source.indexOf('function addReviewedBuffCatalogSelection()'),source.indexOf('function openReviewedBuffCatalog(')),sandbox);
sandbox.addReviewedBuffCatalogSelection();assert.equal(state.composite.length,2);state.composite[1].name='名前を保持';state.composite[1].note='メモを保持';state.composite[1].tags='競合を保持';state.composite[1].enabled=false;
sandbox.addReviewedBuffCatalogSelection();assert.equal(state.composite.length,2);assert.equal(state.composite[1].name,'名前を保持');assert.equal(state.composite[1].note,'メモを保持');assert.equal(state.composite[1].tags,'競合を保持');assert.equal(state.composite[1].enabled,false);assert.deepEqual(state.composite[0],JSON.parse(saved).composite[0]);
console.log('Buff bridge: exact identity, ambiguous/missing rejection, read-only preview, duplicate update and user row preservation passed');

rule.catalogOptions=[{key:'world',type:'number',min:0,max:1},{key:'timePeriod',type:'select',values:[{value:'day'},{value:'night'}]}];
const transfer={key:'magic:test',inputs:{skill:87.5,magic:156.2,world:1,timePeriod:'night',seed:12},conditions:[{inputKey:'world',label:'世界条件',displayValue:'War Age'},{inputKey:'seed',label:'効果量のばらつき',displayValue:'12'}]};
bridge.open('magic:test',transfer);assert.equal(elements.reviewedBuffCatalogSkill.value,'87.5');assert.equal(elements.reviewedBuffCatalogMagic.value,'156.2');assert.equal(elements['reviewedBuffCatalogOption-world'].value,'1');assert.equal(elements['reviewedBuffCatalogOption-timePeriod'].value,'night');assert.match(notices.at(-1).textContent,/計算へ反映できない条件：効果量のばらつき＝12/);
vm.runInContext(source.slice(source.indexOf('function reviewedBuffCatalogInputs()'),source.indexOf('function renderReviewedBuffCatalogOptions(')),sandbox);
const transferred=sandbox.reviewedBuffCatalogInputs();assert.equal(transferred.skill,87.5);assert.equal(transferred.magic,156.2);assert.equal(transferred.world,1);assert.equal(transferred.timePeriod,'night');assert.equal(transferred.combatTrialSource.inputs.seed,12);
transfer.inputs.skill=1;assert.equal(sandbox.reviewedBuffCatalogInputs().combatTrialSource.inputs.skill,87.5);
sandbox.addReviewedBuffCatalogSelection();assert.equal(state.composite.length,2);assert.equal(state.composite[1].catalogInputs.magic,156.2);assert.equal(state.composite[1].catalogInputs.combatTrialSource.inputs.seed,12);assert.equal(state.composite[1].note,'メモを保持');
assert.throws(()=>bridge.open('magic:test',{key:'different',inputs:{skill:1,magic:2}}),/別の技/);
console.log('Input transfer: exact decimals, world, time period, unsupported-condition notice, persisted snapshot and cross-technique rejection passed');

// Re-registering an input-dependent result must not retain an old known value
// when the new conditions cannot calculate that field.
sandbox.reviewedBuffCatalogDefaultRow=()=>({enabled:true,slot:true,flatMagic:0});
state.composite[1].durationSeconds=20;
rule.evaluate=()=>({catalogNumeric:{version:1,values:[],pending:[{name:'魔力',category:'入力不足'}],times:[],applied:[]}});
sandbox.addReviewedBuffCatalogSelection();assert.equal(state.composite.length,2);
assert.equal(state.composite[1].flatMagic,0);assert.equal(state.composite[1].durationSeconds,undefined);
assert.equal(state.composite[1].note,'メモを保持');assert.equal(state.composite[1].enabled,false);
const savedAgain=JSON.parse(JSON.stringify(state));assert.equal(savedAgain.composite[1].catalogNumeric.pending[0].name,'魔力');
console.log('Re-registration: unavailable quantities replace stale fields; user flags, notes and row identity remain intact');
