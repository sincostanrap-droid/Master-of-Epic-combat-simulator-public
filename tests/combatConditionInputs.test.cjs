const assert=require('node:assert/strict');
const fs=require('node:fs');
const rules=require('../src/ui/combatConditionInputs');
const numeric=require('../src/calc/combatNumerics');
const index=require('../src/data/generated/combatCatalogIndex.generated');
function bundle(name){const r=index.entries.find(r=>r.name===name);assert.ok(r,name);return JSON.parse(fs.readFileSync('src/data/generated/combatNumericPages/'+String(r.page).padStart(3,'0')+'.json','utf8')).rows.find(b=>b.row.key===r.key);}
function fields(name,selection={}){return rules.forBundle(bundle(name),numeric,selection);}
function absent(keys,...names){for(const name of names)assert.equal(keys.has(name),false,name);}
function present(keys,...names){for(const name of names)assert.equal(keys.has(name),true,name);}
const heal=fields('マイナー ヒーリング');absent(heal,'MaxHP','ReceivedHpAmount','PetLevel','MovementX','GuardShield','ReuseSkill','WeatherIndex','TransferRecords','TimePeriod');
const moon=fields('ムーン フォース');present(moon,'TimePeriod');absent(moon,'PetLevel','MovementX','TransferRecords');
const hacking=fields('ハッキング バイト');present(hacking,'TransferRecords','TransferEligibleCount');absent(hacking,'WeatherIndex','PetLevel','GuardShield','ItemClass','Amplification','TargetMagicReduction');
const circle=fields('マジック サークル');present(circle,'AreaElapsed','AreaTargetType','AreaInside','AreaBuffRemaining');absent(circle,'WeatherIndex','PetLevel');
const knockback=fields('カオス フレア');present(knockback,'MovementX','MovementY','MovementZ');absent(knockback,'PetLevel','TransferRecords');
const blade=fields('ポイズン ブレイド');present(blade,'BladeSelected','BladeMode');absent(blade,'WeatherIndex','PetLevel');
const mine=fields('セット マイン',{summonSelected:true});present(mine,'AreaBuffChoice','GeneratedTrapLevel','GeneratedUnmodified');absent(mine,'TransferRecords','PetLevel');
assert.equal(rules.forBundle(null,numeric).size,0);
console.log('Input relevance: healing, day/night Buff, transfer, area Buff, knockback, blade, trap and no selection passed');

const healBasic=rules.basicForBundle(bundle('マイナー ヒーリング'));present(healBasic,'Skill','Magic');absent(healBasic,'Defense','Resistance');
const attackBasic=rules.basicForBundle(bundle('ハッキング バイト'));present(attackBasic,'Defense');absent(attackBasic,'Magic','Resistance');
const burstBasic=rules.basicForBundle(bundle('バースト'));present(burstBasic,'Magic','Resistance');absent(burstBasic,'Defense');
assert.equal(rules.displayNumber(23.8228006,true),'24');assert.equal(rules.displayNumber(-1.5,true),'-2');
assert.equal(rules.displayNumber(6.15),'6.2');assert.equal(rules.displayNumber(1.25),'1.3');
assert.equal(rules.displayText('23.49996HP / 23.5MP / 29.2186ST'),'23HP / 24MP / 29ST');
assert.equal(rules.displayText('0.82倍 / 12.345秒 / 25.55%'),'0.8倍 / 12.3秒 / 25.6%');
assert.equal(rules.displayText('HP回復 23.49996HP / ST 29.2186'),'HP回復 23HP / ST 29');
assert.equal(rules.displayText('計算未対応 / 入力不足'),'計算未対応 / 入力不足');
console.log('Basic inputs and presentation rounding boundaries passed');

const multi={requirements:[{skill:'刀剣',min:90},{skill:'神秘魔法',min:30}]},single={requirements:[{skill:'神秘魔法',min:50}]};
assert.equal(rules.requiredValue(multi),90);assert.equal(rules.requiredValue(multi,'神秘魔法'),30);
assert.ok(rules.compareRequired(multi,single)>0);assert.ok(rules.compareRequired(multi,single,'神秘魔法')<0);
assert.equal(rules.requiredValue({requirements:[{skill:'死の魔法',max:10}]},'死の魔法'),null);
assert.ok(rules.compareRequired({},single)>0);assert.equal(rules.requiredValue({requirements:[{skill:'神秘魔法',min:0}]}),0);
console.log('Required-skill sort: composite maximum, selected skill, zero, unknown and upper-only boundaries passed');
