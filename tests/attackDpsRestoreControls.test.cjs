const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {context,json,root}=require('../tools/benchmark-optimizer.cjs');const p=context(root,{data:false});
for(const f of ['src/storage/importExport.js','src/storage/shareUrl.js','src/ui/attackDpsControls.js','src/ui/attackDpsResult.js'])vm.runInContext(fs.readFileSync(f,'utf8'),p);
const nodes=new Map();p.byId=id=>{if(!nodes.has(id))nodes.set(id,{});return nodes.get(id)};
const groups=['damage','hitRate','weaponDelay','equipBuffDelay'].map(()=>({hidden:true}));const panel={dataset:{attackDpsReady:'1'}};
p.document={};p.document.querySelector=()=>panel;p.document.querySelectorAll=s=>[groups[['damage','hitRate','weaponDelay','equipBuffDelay'].findIndex(k=>s.includes('"'+k+'"'))]];
p.selectedWeaponForCalc=()=>null;p.collectAttackDpsDelaySources=()=>({total:0,equipmentTotal:0,buffTotal:0,pctSources:[]});
let result;p.renderAttackDpsResult=m=>{result=p.computeAttackDpsAlpha(m)};
const cfg={...json(p.defaultAttackDpsState()),motionProfile:'nekomataBow',damageSource:'manual',manualDamage:123.4567,weaponDelaySource:'manual',manualWeaponDelay:300,equipmentBuffDelaySource:'manual',equipmentBuffDelay:-20,attackDelayBuff:-10,manualAttackBonus:false,hitRateSource:'manual',hitRatePct:78.9,simSeconds:47.5};
const st=json(vm.runInContext('DEFAULT_STATE()',p));st.attackDps=cfg;p.collectConfig=()=>({inputs:{},state:st});
const routes=[p.parseConfigFromTsv(p.serializeConfigAsTsv({inputs:{},state:st})).state,p.collectShowcaseShareConfig().state];
for(const restored of routes){p.restored=restored;vm.runInContext('state=restored',p);p.renderAttackDpsTab();assert.equal(nodes.get('attackDpsManualDamage').value,123.4567);assert.equal(nodes.get('attackDpsHitRatePct').value,78.9);assert.equal(nodes.get('attackDpsSimSeconds').value,47.5);assert.equal(nodes.get('attackDpsDamageSource').value,'manual');assert.equal(nodes.get('attackDpsManualAttackBonus').checked,false);assert.ok(groups.every(g=>!g.hidden));const expected=p.calculateAttackDps({cfg,weapon:null,currentDamage:0,currentWeaponDelay:0,delayAuto:{total:0,equipmentTotal:0,buffTotal:0,pctSources:[]},currentHitRatePct:100});assert.equal(result.continuousDps,expected.continuousDps);assert.equal(result.expectedTotalDamage,expected.expectedTotalDamage);}
p.restored={...st,attackDps:p.defaultAttackDpsState()};vm.runInContext('state=restored',p);p.renderAttackDpsTab();assert.equal(nodes.get('attackDpsDamageSource').value,'current');assert.ok(groups.every(g=>g.hidden));console.log('DPS restore controls/results: TSV, share, defaults OK');


