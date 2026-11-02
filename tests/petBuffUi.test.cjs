const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {context}=require('../tools/benchmark-optimizer.cjs');
const p=context(undefined,{data:false});p.structuredClone=structuredClone;
const pet=require('../src/domain/petBuffCatalog');p.MOE_PET_BUFF_CATALOG=pet;
const nodes={};
class El {
 constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.events={};this.owned=[];this.value='';this.className='';this.classList={toggle:(name,on)=>{this.className=this.className.split(' ').filter(c=>c!==name).concat(on?[name]:[]).join(' ');}};}
 appendChild(c){c.parentElement=this;this.children.push(c);if(c.id)nodes[c.id]=c;return c;}
 before(c){if(c.id)nodes[c.id]=c;}
 set innerHTML(text){this._html=text;this.owned=[];this.cards=[];
  for(const m of text.matchAll(/<(\w+)\b([^>]*\bid="([^"]+)"[^>]*)>/g)){
   const el=new El(m[1]);el.id=m[3];el.value=m[2].match(/\bvalue="([^"]*)"/)?.[1]||'';el.parentElement=this;nodes[el.id]=el;this.owned.push(el);
  }
  for(const m of text.matchAll(/<button\b[^>]*data-pet-catalog-id="([^"]+)"[^>]*>/g)){
   const el=new El('button');el.dataset.petCatalogId=m[1];el.className=m[0].match(/class="([^"]+)"/)?.[1]||'';el.parentElement=this;this.cards.push(el);
  }
 }
 get innerHTML(){return this._html||'';}
 set textContent(text){this._text=text;this._html='';}get textContent(){return this._text||'';}
 querySelectorAll(selector){return selector==='[data-pet-catalog-id]'?this.cards||[]:this.owned.filter(el=>['input','button','a'].includes(el.tag));}
 addEventListener(name,handler){this.events[name]=handler;}
 setAttribute(name,value){this[name]=value;}
 closest(){return this.hidden?this:null;}
 focus(){p.document.activeElement=this;}
 remove(){for(const el of this.owned)delete nodes[el.id];delete nodes[this.id];if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(el=>el!==this);}
}
nodes.compositeBuffTable=new El('table');
const toolbar=new El('div');nodes.reviewedBuffCatalogOpen=new El('button');toolbar.appendChild(nodes.reviewedBuffCatalogOpen);
p.document={createElement:t=>new El(t),body:new El('body'),head:new El('head'),activeElement:null};p.byId=id=>nodes[id]||null;
p.closeReviewedBuffCatalog=()=>{};
let calcs=0,renders=0;p.calc=()=>calcs++;p.renderCompositeTable=()=>renders++;
vm.runInContext(fs.readFileSync('src/ui/petBuffCatalog.js','utf8'),p);
p.ensurePetBuffCatalog();p.ensurePetBuffCatalog();assert.equal(toolbar.children.length,2,'one pet launcher next to existing catalogue');
assert.equal(nodes.petBuffCatalogOpen.className,'buffCatalogPrimaryButton');assert.match(nodes.petBuffCatalogOpen.innerHTML,/ペットBuff/);
const open=()=>nodes.petBuffCatalogOpen.onclick();
const search=text=>{nodes.petBuffSearch.value=text;nodes.petBuffSearch.oninput();};
const choose=id=>{const card=nodes.petBuffList.querySelectorAll('[data-pet-catalog-id]').find(el=>el.dataset.petCatalogId===id);assert.ok(card);card.onclick();return card;};
open();assert.match(nodes.petBuffCatalogOverlay.innerHTML,/role="dialog"/);assert.equal(nodes.petBuffList.cards.length,26);
assert.equal(p.document.activeElement,nodes.petBuffSearch);assert.match(nodes.petBuffPreview.innerHTML,/4枠/);
assert.match(nodes.petBuffPreview.innerHTML,/参考値/);assert.match(nodes.petBuffPreview.innerHTML,/実測点/);
assert.match(nodes.petBuffPreview.innerHTML,/スキル 150\.0・魔力 152\.0/);assert.match(nodes.petBuffPreview.innerHTML,/変動の基準値/);
nodes.petBuffLevel.value='90';nodes.petBuffLevel.oninput();assert.equal(calcs,0,'browsing does not calculate build');
const retained={name:'既存',enabled:false,flatAttack:12.345},state={composite:[retained]};p.fixture=state;vm.runInContext('state=fixture',p);
search('該当なし');assert.equal(nodes.petBuffList.cards.length,0);assert.equal(nodes.petBuffRegister.disabled,true);assert.match(nodes.petBuffPreview.textContent,/選んで/);
search('プロテクト');assert.equal(nodes.petBuffList.cards.length,1);assert.equal(calcs,0);
nodes.petBuffRegister.onclick();assert.equal(calcs,1);assert.equal(renders,1);assert.equal(state.composite.length,5);assert.deepEqual(state.composite[0],retained);
assert.equal(nodes.petBuffCatalogOverlay,undefined);assert.equal(p.document.activeElement,nodes.petBuffCatalogOpen);
assert.ok(state.composite.slice(1).every(r=>!r.enabled&&!r.fixed));
const row=p.makePetBuffTableRow(state.composite[1]);
assert.ok(row.children[1].children[0].disabled);
for(const i of [0,2,3])assert.ok(!row.children[i].children[0].disabled);
for(const [i,prop] of [[0,'enabled'],[2,'fixed'],[3,'excluded']]){
 const cb=row.children[i].children[0];cb.checked=true;cb.onchange();assert.ok(state.composite.slice(1).every(r=>r[prop]));
}
assert.ok(state.composite.slice(1).every(r=>!r.enabled));
row.children[3].children[0].checked=false;row.children[3].children[0].onchange();
row.children[2].children[0].checked=false;row.children[2].children[0].onchange();
open();nodes.petBuffLevel.value='120';nodes.petBuffLevel.oninput();nodes.petBuffRegister.onclick();assert.equal(state.composite.length,5,'replace instead of duplicate');
row.children.at(-1).children[0].onclick();assert.equal(state.composite.length,1);assert.deepEqual(state.composite[0],retained);
open();nodes.petBuffLevel.value='';nodes.petBuffLevel.oninput();assert.equal(nodes.petBuffRegister.disabled,true);
const card=choose('la-pucelle-avatar');assert.equal(card['aria-pressed'],'true');assert.equal(p.document.activeElement,nodes.petBuffSearch);
assert.equal(nodes.petBuffLevelWrap.hidden,true);assert.equal(nodes.petBuffLevel.disabled,true);assert.equal(nodes.petBuffRegister.disabled,false);
assert.match(nodes.petBuffPreview.innerHTML,/レベルに依存しない/);assert.match(nodes.petBuffPreview.innerHTML,/攻撃力\+10%/);
nodes.petBuffRegister.onclick();assert.equal(state.composite.length,2);assert.equal(state.composite[1].attackPct,10);
assert.equal(p.makePetBuffTableRow(state.composite[1]).children[6].textContent,'固定効果');
open();choose('yukata-finyu');nodes.petBuffLevel.value='130';nodes.petBuffLevel.oninput();
assert.equal(nodes.petBuffLevelWrap.hidden,false);assert.equal(nodes.petBuffLevel.disabled,false);assert.match(nodes.petBuffPreview.innerHTML,/非戦闘時/);
assert.match(nodes.petBuffPreview.innerHTML,/この登録に含まれない効果/);
nodes.petBuffLevel.value='150';nodes.petBuffLevel.oninput();assert.match(nodes.petBuffPreview.innerHTML,/参考値を含む/);assert.match(nodes.petBuffPreview.innerHTML,/最大HP\+43/);
const before=JSON.stringify(state),calcBefore=calcs;
nodes.petBuffCatalogCancel.onclick();assert.equal(JSON.stringify(state),before);assert.equal(calcs,calcBefore);
open();let prevented=false;
nodes.petBuffCatalogCancel.focus();nodes.petBuffCatalogOverlay.events.keydown({key:'Tab',shiftKey:false,preventDefault:()=>prevented=true});assert.ok(prevented);assert.equal(p.document.activeElement,nodes.petBuffCatalogClose);
nodes.petBuffCatalogOverlay.events.keydown({key:'Tab',shiftKey:true,preventDefault:()=>{}});assert.equal(p.document.activeElement,nodes.petBuffCatalogCancel);
nodes.petBuffCatalogOverlay.events.keydown({key:'Escape',preventDefault:()=>prevented=true});assert.equal(nodes.petBuffCatalogOverlay,undefined);
open();const overlay=nodes.petBuffCatalogOverlay;overlay.events.mousedown({target:overlay});assert.equal(nodes.petBuffCatalogOverlay,undefined);
assert.deepEqual(state.composite[0],retained);
// Result cards use the computed motion boundary; no changed damage rounding.
vm.runInContext(fs.readFileSync('src/ui/attackDpsResult.js','utf8'),p);
nodes.attackDpsResult={};p.attackDpsState=()=>({damageSource:'manual'});
p.computeAttackDpsAlpha=()=>p.calculateAttackDps({cfg:{weaponCategory:'12',motionProfile:'form477',weaponDelaySource:'manual',manualWeaponDelay:150,damageSource:'manual',manualDamage:100,equipmentBuffDelaySource:'manual',equipmentBuffDelay:-60}});
p.renderAttackDpsResult();assert.match(nodes.attackDpsResult.innerHTML,/必要な装備・Buff短縮/);assert.match(nodes.attackDpsResult.innerHTML,/59\.7%/);assert.match(nodes.attackDpsResult.innerHTML,/0\.3ポイント/);
console.log('Pet catalogue: matching launcher/modal/cards, search/no results, level/fixed effects, preview/register/update/cancel, keyboard focus, group removal and DPS regression passed (DOM fixture, not real browser)');
