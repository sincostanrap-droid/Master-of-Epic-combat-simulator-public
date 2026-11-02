const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const {context}=require('../tools/benchmark-optimizer.cjs');
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
function catalogFixture(){
  const nodes=new Map();
  const node=id=>{if(!nodes.has(id))nodes.set(id,{value:'',dataset:{},hidden:false,textContent:'',innerHTML:'',classList:{toggle(){}},setAttribute(k,v){this[k]=v;},querySelectorAll:()=>[]});return nodes.get(id);};
  const c=vm.createContext({console,MOEEquipmentCandidatePolicy:{create:()=>({})},byId:node});
  vm.runInContext(read('src/ui/catalogSpecialization.js'),c);
  vm.runInContext(read('src/ui/equipmentCatalogSearchCache.js'),c);
  const panel={dataset:{},querySelector:q=>node(q)};
  c.document={querySelector:()=>panel,getElementById:node};
  c.equipmentCatalogItems=()=>[];c.catalogSlotOptions=()=>'';c.catalogSelectedItem=x=>x;
  c.loadCatalogScriptsOnce=async()=>true;
  c.updateSpecializationOptimizationSupport=()=>{};c.catalogSpecialHeader=()=>{};
  c.catalogFilterState=()=>({limit:25,specialization:{enabled:vm.runInContext('catalogSearchMode',c)==='special',axes:[{key:'stat:magic'}]}});
  return {c,node,panel};
}
async function run(){
  const c=context(root,{data:false});let calculations=0;
  // Setting select.innerHTML resets its selection, as in a browser.
  const select={id:'comparePresetSelect',value:'',type:'select-one',dataset:{},events:{},closest:()=>null,addEventListener(k,f){this.events[k]=f;},set innerHTML(html){this.html=html;this.value=html.match(/value="([^"]*)"/)?.[1]||'';},get innerHTML(){return this.html;}};
  const output={innerHTML:''};c.byId=id=>id===select.id?select:id==='buildCompareResult'?output:null;
  c.automaticAnalysisVisible=()=>true;c.calc=()=>calculations++;
  vm.runInContext('namedPresets={A:{config:{id:"A"}},B:{config:{id:"B"}}}',c);
  vm.runInContext(read('src/ui/buildAnalysis.js'),c);c.renderBuildDiagnostics=()=>{};
  c.refreshComparePresetSelect();c.bindCalcRefreshInput(select);
  select.value='B';select.events.input?.();select.events.change?.();
  assert.equal(calculations,0,'choosing a comparison is not a build input');
  assert.equal(select.value,'B');c.calc();assert.equal(select.value,'B','other input calculation retains comparison');
  const compared=[];c.collectConfig=()=>({id:'current'});c.safeMetricsForConfig=cfg=>{compared.push(cfg.id);return {finalDamage:10,atk:100,stats:{magic:80},slots:{total:1}};};
  c.buildDiagnosticsForConfig=()=>({issues:[]});c.compareCurrentWithPreset();assert.deepEqual(compared,['current','B']);
  vm.runInContext('delete namedPresets.A;namedPresets.C={}',c);c.refreshComparePresetSelect();assert.equal(select.value,'B');
  vm.runInContext('delete namedPresets.B',c);c.refreshComparePresetSelect();assert.equal(select.value,'C');
  vm.runInContext('namedPresets={}',c);c.refreshComparePresetSelect();assert.equal(select.value,'');

  const {c:s,node,panel}=catalogFixture();s.setupCatalogSpecializationOptions=async()=>{};
  s.applyCatalogSearch();await s.setCatalogSearchMode('special');await s.setCatalogSearchMode('normal');
  const prepared=deferred(),entered=deferred();
  s.setupCatalogSpecializationOptions=()=>{entered.resolve();return prepared.promise;};
  const stale=s.setCatalogSearchMode('special');await entered.promise;
  await s.setCatalogSearchMode('normal');prepared.resolve();await stale;
  assert.equal(panel.dataset.catalogMode,'normal');assert.doesNotMatch(node('catalogSummary').textContent,/特化検索/);
  // Both successful and failed stale script completions must leave normal mode alone.
  for(const ready of [true,false]){
    const load=deferred();let builds=0,failures=0;
    s.loadCatalogScriptsOnce=()=>load.promise;s.setupCatalogSpecializationOptions=async()=>builds++;
    s.showCatalogLoadFailure=()=>failures++;
    const old=s.setCatalogSearchMode('special');await s.setCatalogSearchMode('normal');load.resolve(ready);await old;
    assert.equal(builds,0);assert.equal(failures,0);assert.doesNotMatch(node('catalogSummary').textContent,/特化検索/);
  }
  // Real one-item option builder: special -> normal -> special shares preparation.
  const {c:r,node:rn,panel:rp}=catalogFixture(),timers=[];
  r.setTimeout=fn=>timers.push(fn);r.escapeHtml=String;r.escapeAttr=String;
  r.equipmentCatalogItems=()=>[{id:'one'}];r.MOEEquipmentSearchSpecification={metricFor:()=>({})};
  r.catalogEffectProjection=()=>({facets:[{key:'stat:magic',label:'魔力'}]});
  r.MOEEquipmentEffectFacets={matches:()=>true,compare:()=>0};
  vm.runInContext('catalogCandidatePolicy.get=()=>"normal"',r);
  r.catalogRegistrationKey=()=>'';r.catalogResultRowHtml=()=>'<tr></tr>';r.catalogSpecialRowHtml=r.catalogResultRowHtml;
  const restored=[],restore=r.restoreCatalogSearchMode;r.restoreCatalogSearchMode=mode=>{restored.push(mode);restore(mode);};
  const firstBuild=deferred(),secondBuild=deferred(),setup=r.setupCatalogSpecializationOptions;let buildCalls=0;
  r.setupCatalogSpecializationOptions=()=>{const promise=setup();if(++buildCalls===1)firstBuild.resolve();else if(buildCalls===2)secondBuild.resolve();return promise;};
  const first=r.setCatalogSearchMode('special');await firstBuild.promise;assert.equal(timers.length,1);
  await r.setCatalogSearchMode('normal');const last=r.setCatalogSearchMode('special');await secondBuild.promise;
  assert.equal(timers.length,1,'do not rebuild the same options');assert.deepEqual(restored,['normal']);
  timers.shift()();await Promise.all([first,last]);
  assert.deepEqual(restored,['normal','special'],'only the latest special transition applies results');
  assert.equal(rp.dataset.catalogMode,'special');assert.match(rn('catalogSummary').textContent,/特化検索/);
  assert.match(rn('catalogSpecialAxis0').innerHTML,/魔力/);
  // Failed preparation is not a permanently cached rejected promise.
  vm.runInContext('catalogFacetOptionsReady=false',r);const projection=r.catalogEffectProjection;
  r.catalogEffectProjection=()=>{throw new Error('fixture failure');};
  await assert.rejects(r.setupCatalogSpecializationOptions(),/fixture failure/);
  r.catalogEffectProjection=projection;const retry=r.setupCatalogSpecializationOptions();assert.equal(timers.length,1);timers.shift()();await retry;
  assert.equal(vm.runInContext('catalogFacetOptionsReady',r),true);
  console.log('UI selection: preset retained and compared, deletion fallback, stale mode completions ignored, shared preparation and retry passed (VM fixtures; no registered data accessed)');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
