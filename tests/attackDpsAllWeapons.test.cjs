const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const c={};vm.createContext(c);vm.runInContext(fs.readFileSync('src/domain/attackDpsState.js','utf8'),c);
const cfg={damageSource:'manual',manualDamage:100,weaponDelaySource:'manual',manualWeaponDelay:150,weaponCategory:'12',motionProfile:'form477',equipmentBuffDelaySource:'manual',equipmentBuffDelay:-60,attackDelayBuff:0,stDelayBonus:-10};
function run(overrides={}){return c.calculateAttackDps({cfg:{...cfg,...overrides}})}
assert.equal(run().periodSec,.768);assert.equal(run().continuousDps,100/.768);
assert.equal(run({criticalCancel:false}).periodSec,2.08);
assert.equal(run({weaponCategory:'13'}).periodSec,.8);
assert.ok(Math.abs(run({weaponCategory:'19',motionProfile:'tackleGun'}).periodSec-.944)<1e-12);
assert.equal(run({manualWeaponDelay:200}).periodSec,1.024);
assert.equal(run({manualWeaponDelay:300}).periodSec,1.552);
assert.equal(run({manualWeaponDelay:80}).delaySec,run({manualWeaponDelay:150}).delaySec);
assert.equal(run({fps:144,damageFrame:999}).periodSec,run().periodSec);
assert.equal(run({weaponCategory:'auto'}).supported,false);
assert.equal(run({manualAttackBonus:false}).supported,false);
assert.equal(run({manualWeaponDelay:0}).supported,false);

for(const category of [1,2,3,4,5,6,7,8,9,10,12,13,15,18,19])for(const criticalCancel of [false,true]){
 const r=run({weaponCategory:String(category),criticalCancel});assert.equal(r.supported,true);assert.ok(Number.isFinite(r.continuousDps));
}
const bare=run({weaponCategory:'1',manualWeaponDelay:0});assert.equal(bare.supported,true);assert.equal(bare.baseReuseDelay,182);
console.log('All weapon categories, normal/critical, delay boundaries and unsupported inputs passed');
