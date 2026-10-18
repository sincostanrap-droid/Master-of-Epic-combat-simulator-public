const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const parser=require('../src/domain/combatLogParser');
const source=fs.readFileSync('src/ui/combatLogTab.js','utf8');
const events=parser.parseCombatLog([
 '26/10/18 00:00:00: TestA→TestB : 10 ダメージ',
 '26/10/18 00:00:01: TestA→TestB : 11 ダメージ',
 '26/10/18 00:00:02: TestA は 体力が 10 回復した',
 '26/10/18 00:00:03: TestA は 体力が 11 回復した'
].join('\n')).events;
const nodes={combatLogSummary:{},combatLogSelectionStatus:{}};
const c={parsedEvents:events,global:{MoeCombatLogParser:parser},document:{getElementById:id=>nodes[id]||null},selectedTimeRange:()=>({from:Date.parse('2026-10-18T00:00:00+09:00'),to:Date.parse('2026-10-18T00:01:00+09:00')}),renderRangeStatus(){}};
vm.createContext(c);
vm.runInContext(source.slice(source.indexOf('  function formatNumber('),source.indexOf('  function datetimeLocalValue(')),c);
vm.runInContext(source.slice(source.indexOf('  function renderSummary('),source.indexOf('  function renderRanking(')),c);
const before=JSON.stringify(events),analysis=parser.analyzeCombatEvents(events,c.selectedTimeRange());
assert.equal(analysis.recovery.hp.average,10.5);
const csvBefore=parser.buildCombatReportCsv(analysis);
c.renderSummary();
assert.match(nodes.combatLogSummary.innerHTML,/平均11 \/ 毎分21/);
assert.match(nodes.combatLogSummary.innerHTML,/10\.5/); // damage average is a non-resource statistic
assert.equal(c.formatNumber(1.2345,1),'1.2');assert.equal(c.formatNumber(10.5,0),'11');
assert.equal(c.formatNumber(1,1),'1');
assert.equal(JSON.stringify(events),before);assert.equal(parser.analyzeCombatEvents(events,c.selectedTimeRange()).recovery.hp.average,10.5);
assert.equal(parser.buildCombatReportCsv(analysis),csvBefore);
console.log('Combat log display: recovery averages/minute rounded to integers, rates one decimal, analysis/events/CSV unchanged');
