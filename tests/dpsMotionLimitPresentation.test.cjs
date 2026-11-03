// Anonymous fixtures only: no imported player configuration or browser storage.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {context,json}=require('../tools/benchmark-optimizer.cjs');
const c=context(undefined,{data:false});c.structuredClone=structuredClone;
for(const f of ['src/storage/importExport.js','src/ui/attackDpsResult.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c);
const host={innerHTML:''};c.byId=id=>id==='attackDpsResult'?host:null;
const cfg={weaponCategory:'12',motionProfile:'form477',weaponDelaySource:'manual',manualWeaponDelay:155,
  damageSource:'manual',manualDamage:100,hitRateSource:'manual',hitRatePct:100,
  equipmentBuffDelaySource:'manual',equipmentBuffDelay:-67,attackDelayBuff:0,
  stDelayBonus:-10,criticalCancel:true,manualAttackBonus:true};
const run=overrides=>c.calculateAttackDps({cfg:{...cfg,...overrides}});
let result=run();c.computeAttackDpsAlpha=()=>result;
c.renderAttackDpsResult();
assert.equal(result.periodSec,.8);assert.equal(result.motionLockSec,.768);
assert.equal(result.skillMotionBudget.requiredReductionPct,2.5);
assert.match(host.innerHTML,/モーション上限：未到達/);
assert.match(host.innerHTML,/現在75(?:\.0)?回／分、上限78\.1回／分/);
assert.match(host.innerHTML,/32(?:\.0)?ms/);
assert.match(host.innerHTML,/あと2\.5ポイント/);
assert.match(host.innerHTML,/合計2\.5%以上/);
result=run({attackDelayBuff:-2.4});c.renderAttackDpsResult();
assert.equal(result.periodSec,.784);assert.match(host.innerHTML,/16(?:\.0)?ms/);
result=run({attackDelayBuff:-2.5});c.renderAttackDpsResult();
assert.equal(result.periodSec,.768);assert.match(host.innerHTML,/モーション上限に到達/);
assert.doesNotMatch(host.innerHTML,/モーション上限：未到達|あと.*ポイント/);
result=run({stDelayBonus:0});assert.equal(result.skillMotionBudget.requiredReductionPct,12.2);
// The raw TSV field, the parsed value and the next export agree. No silent
// decimal correction may be inferred from the other fields of a manual row.
const state=json(vm.runInContext('DEFAULT_STATE()',c));
state.composite=c.normalizeCompositeRows([{name:'manual percentage fixture',enabled:true,
  attackPct:19,magicPct:19,extraACPct:19,extraHitPct:19,extraAvoidPct:190}]);
const tsv=c.serializeConfigAsTsv({inputs:{},state});
const restored=c.parseConfigFromTsv(tsv);
assert.equal(restored.state.composite[0].extraAvoidPct,190);
assert.equal(restored.state.composite[0].extraHitPct,19);
assert.equal(c.parseConfigFromTsv(c.serializeConfigAsTsv(restored)).state.composite[0].extraAvoidPct,190);
const html=fs.readFileSync('index.html','utf8');
assert.match(html,/<input id="optimizerRequireMotionLimit" type="checkbox" checked>/);
console.log('Motion limit: 75 vs 78.1/min, 32ms gap, B=2.5/12.2 boundaries; manual percentage TSV value preserved');
