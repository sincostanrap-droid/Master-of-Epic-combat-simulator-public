const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
// Real tab routing with a long page followed by a short page; no browser storage.
const frames=[],writes=[],panels={style:{minHeight:'5000px'},getBoundingClientRect:()=>({top:400-ui.window.scrollY})};
const ui={window:{scrollX:0,scrollY:3800,scrollTo:p=>{ui.window.scrollY=p.top;}},
 byId:id=>id==='mainTabPanels'?panels:id==='mainTabNav'?{getBoundingClientRect:()=>({height:60})}:null,
 document:{querySelectorAll:()=>[],dispatchEvent:()=>{}},CustomEvent:function(type,options){this.type=type;this.detail=options.detail;},
 localStorage:{setItem:(...a)=>writes.push(a)},requestAnimationFrame:fn=>frames.push(fn),renderCatalogTab:()=>{},renderCombatLogTab:()=>{}};
vm.createContext(ui);vm.runInContext(fs.readFileSync('src/ui/mainTabs.js','utf8'),ui);
for(const tab of ['attackDps','save','skill','combatTrial']){ui.window.scrollY=3800;panels.style.minHeight='5000px';ui.activateMainTab(tab);while(frames.length)frames.shift()();assert.equal(ui.window.scrollY,328,tab+' content starts below sticky navigation');assert.equal(panels.style.minHeight,'',tab+' no retained blank area');}
ui.window.scrollY=0;ui.activateMainTab('calc');while(frames.length)frames.shift()();assert.equal(ui.window.scrollY,0,'top stays at top');
// Catalogue cards explicitly identify the unchanged default-input calculation.
const source=fs.readFileSync('src/main.js','utf8'),catalog={reviewedBuffCatalogSelectedId:'sample',fmt:n=>String(n),escapeHtml:String,escapeAttr:String,reviewedBuffCatalogInputTypeLabel:()=> 'スキル・魔力',reviewedBuffCatalogEffectSummary:e=>'命中+'+e.value};
vm.createContext(catalog);vm.runInContext(source.slice(source.indexOf('function reviewedBuffCatalogCardHtml('),source.indexOf('let reviewedBuffCatalogListLimit=')),catalog);
let evaluated;const rule={id:'sample',name:'確認Buff',inputKind:'skillMagic',defaultSkill:100,defaultMagic:100,evaluate:input=>{evaluated=input;return {value:17.8};}};
const card=catalog.reviewedBuffCatalogCardHtml(rule);assert.match(card,/基準値（スキル 100・魔力 100）/);assert.match(card,/命中\+17.8/);assert.equal(evaluated.skill,100);assert.equal(evaluated.magic,100);
assert.match(source,/入力条件での計算結果/);
console.log('Release UX: long-to-short tab visibility, no blank min-height, explicit catalogue baseline and current-result labels OK');
