// Presentation only: existing equations and registered inputs are left intact.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {context,root,json}=require('../tools/benchmark-optimizer.cjs');
const ctx=context(root,{data:false}),state=json(vm.runInContext('DEFAULT_STATE()',ctx));
const input={raceSelect:'newtar',str:100,spirit:100,weaponDamage:100,weaponSkill:100,targetAC:100,attackType:'attack',atkCap:500};
const metrics=ctx.computeMetrics(state,input),saved=JSON.stringify(metrics);
const audit=ctx.damageAuditHtml(metrics,input);
assert.match(audit,/計算に使う武器が見つかりません/); // useful warning survives
assert.match(audit,/<details class="damageAuditFormula"><summary>/);
assert.doesNotMatch(audit,/丸め前|計算に使う武器・必要スキルに大きな警告はありません/);
assert.equal(JSON.stringify(metrics),saved);
const source=fs.readFileSync('src/ui/attackDpsResult.js','utf8'),nodes={attackDpsResult:{innerHTML:''}};
const result={supported:true,warnings:[],cfg:{damageSource:'current',equipmentBuffDelaySource:'auto',criticalCancel:true,weaponDelaySource:'currentWeapon'},
 weapon:{slot:'武器: 右手',name:'確認用'},damage:100,delaySec:1,motionLockSec:.8,motion:{label:'確認用'},periodSec:1,continuousDps:100,
 hitRate:1,shortenedDelay:60,simSeconds:60,expectedTotalDamage:6000,hitCount:60,attacksPerMinute:60,equipBuffRaw:-70,equipBuffCapped:-60,
 attackDelayBuff:0,stBonus:0,manualBonus:0,delayAuto:{equipmentTotal:-20,buffTotal:-50,total:-70,sources:[]},weaponDelay:150,delayMultiplier:.4,followupComplete:true,followupExpectedActivations:[]};
const c={byId:id=>nodes[id],fmt:(n,p=0)=>Number(n).toFixed(p),escapeHtml:String,attackDpsState:()=>result.cfg};vm.createContext(c);
vm.runInContext(source.slice(0,source.indexOf('function computeAttackDpsAlpha(')),c);c.computeAttackDpsAlpha=()=>result;c.renderAttackDpsResult();
assert.match(nodes.attackDpsResult.innerHTML,/継続DPS/);assert.match(nodes.attackDpsResult.innerHTML,/上限適用前/);
assert.match(nodes.attackDpsResult.innerHTML,/<details class="attackDpsFormula">/);
assert.doesNotMatch(nodes.attackDpsResult.innerHTML,/\braw\b|遠隔β試作|class="attackDpsFormula" open/);
Object.assign(result,{delaySec:.833333,motionLockSec:.768333,continuousDps:100.12345,attacksPerMinute:72.06123});
const beforeDisplay=JSON.stringify(result);c.renderAttackDpsResult();assert.match(nodes.attackDpsResult.innerHTML,/0\.8 秒/);assert.match(nodes.attackDpsResult.innerHTML,/100\.1/);assert.doesNotMatch(nodes.attackDpsResult.innerHTML,/0\.833|100\.123|72\.061/);assert.equal(JSON.stringify(result),beforeDisplay);
c.renderAttackDpsResult({unsupportedBuffs:['確認用Buff']});assert.match(nodes.attackDpsResult.innerHTML,/計算未対応のBuff.*確認用Buff/);
result.simSeconds=47.5;const fractionalBefore=JSON.stringify(result);c.renderAttackDpsResult();assert.match(nodes.attackDpsResult.innerHTML,/47\.5秒の期待総ダメージ/);assert.match(nodes.attackDpsResult.innerHTML,/47\.5秒内ヒット数/);assert.equal(JSON.stringify(result),fractionalBefore);
const tabs=fs.readFileSync('src/ui/mainTabs.js','utf8');assert.doesNotMatch(tabs,/Git上の生成|JSON\/TSV\/プリセットを扱います|常時自動反映/);
assert.match(fs.readFileSync('src/ui/appVersionBadge.js','utf8'),/const versionText = APP_VERSION;/);
console.log('Public UI: optional formula details closed, technical labels removed, real warnings and numerical data retained');
