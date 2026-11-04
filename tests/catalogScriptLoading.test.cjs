const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const tags=[];
const ctx=vm.createContext({console,document:{createElement:()=>({dataset:{},remove(){this.removed=true;}}),head:{appendChild:n=>tags.push(n)},querySelector:q=>tags.find(n=>!n.removed&&q.includes(n.dataset.catalogSrc))||null}});
vm.runInContext(fs.readFileSync('src/domain/catalogData.js','utf8'),ctx);
async function run(){
 const runtime=ctx.loadEquipmentBuffRuntimeScriptsOnce(),catalog=ctx.loadCatalogScriptsOnce();
 let runtimeDone=false,catalogDone=false;runtime.then(()=>runtimeDone=true);catalog.then(()=>catalogDone=true);
 assert.equal(tags.length,13,'three shared scripts requested only once');
 for(const t of tags.slice(3))t.onload();
 await Promise.resolve();await Promise.resolve();
 assert.equal(runtimeDone,false);assert.equal(catalogDone,false,'tag insertion is not data readiness');
 tags[0].onerror();tags[1].onload();tags[2].onload();
 assert.equal(await runtime,false);assert.equal(await catalog,false,'failure is not success');
 assert.ok(tags[0].removed);
 const retry=ctx.loadCatalogScriptsOnce(),runtimeRetry=ctx.loadEquipmentBuffRuntimeScriptsOnce();
 assert.equal(tags.length,14,'retry only failed script; reuse twelve successful loads');
 tags[13].onload();assert.equal(await retry,true);assert.equal(await runtimeRetry,true);
 vm.runInContext('catalogScriptsPromise=null',ctx);assert.equal(await ctx.loadCatalogScriptsOnce(),true);assert.equal(tags.length,14);
 // Re-entering the tab while it loads must neither render empty data nor add
 // duplicate completion renders. A later explicit visit can retry failure.
 vm.runInContext(fs.readFileSync('src/ui/catalogTab.js','utf8'),ctx);
 const panel={dataset:{}},summary={textContent:''};let finish,created=0,rendered=0,notified=0;
 ctx.document.querySelector=()=>panel;ctx.document.dispatchEvent=()=>notified++;
 ctx.CustomEvent=function(type){this.type=type;};ctx.byId=()=>summary;
 ctx.createCatalogTab=()=>created++;ctx.setupCatalogFilterOptions=()=>rendered++;
 ctx.loadCatalogScriptsOnce=()=>new Promise(resolve=>finish=resolve);
 ctx.renderCatalogTab();ctx.renderCatalogTab();assert.equal(created,1);assert.equal(rendered,0);
 finish(false);await Promise.resolve();assert.match(summary.textContent,/再読み込み/);assert.equal(rendered,0);
 ctx.renderCatalogTab();finish(true);await Promise.resolve();assert.equal(rendered,1);assert.equal(notified,1);assert.equal(created,1);
 console.log('Catalogue loader: shared pending loads, failure reporting, bounded retry and reuse passed');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
