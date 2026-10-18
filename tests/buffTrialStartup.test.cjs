// Browser initialization regression: execute only Buff-trial dependencies in HTML scheduling order.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(process.argv[2]||'.');
const names=new Set(['jasperMusicScope.manual.js','combatScopeExclusions.manual.js','effectTiming.js','combatEffectFormulas.js','combatSkillNames.generated.js','combatResourceFormula.js','wikiPlayerCatalog.generated.js','wikiPlayerEffects.js','timedCombatDefinitions20261010.js','statBuffDefinitions20261010.js','defenseBuffDefinitions20261011.js','clientNativeBuffSlotReference.js','clientNativeBuffConflictReference.js','combatEffectLifecycle.js','combatAttempt.js','timedBuffCombat.js','samuraiHeartCombat.js']);
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const scripts=[...html.matchAll(/<script\b([^>]*?)src="([^"]+)"([^>]*)><\/script>/g)].map(m=>({file:m[2].split('?')[0].replace(/^\.\//,''),defer:/\bdefer\b/.test(m[1]+m[3])})).filter(s=>names.has(path.basename(s.file)));
// Require explicit dependency order as well as standard parser scheduling.
// This also protects hosts which schedule imported page scripts in document order.
for(const consumer of ['combatAttempt.js','timedBuffCombat.js','samuraiHeartCombat.js']){
 const at=scripts.findIndex(s=>path.basename(s.file)===consumer);
 for(const dependency of ['wikiPlayerCatalog.generated.js','wikiPlayerEffects.js'])assert.ok(scripts.findIndex(s=>path.basename(s.file)===dependency)<at,dependency+' before '+consumer);
 assert.ok(scripts[at].defer,consumer+' stays in the deferred dependency chain');
}
const ctx=vm.createContext({console});ctx.window=ctx;
for(const s of [...scripts.filter(s=>!s.defer),...scripts.filter(s=>s.defer)])vm.runInContext(fs.readFileSync(path.join(root,s.file),'utf8'),ctx,{filename:s.file});
assert.equal(ctx.MOE_WIKI_PLAYER_EFFECTS.data,ctx.MOE_WIKI_PLAYER_CATALOG);
const sam=ctx.MOE_SAMURAI_HEART_COMBAT.plan({skill:100,world:0,caster:'A',targetEligible:true});assert.equal(sam.durationSeconds,16);assert.equal(sam.defensePct,-50);
const buff=ctx.MOE_TIMED_BUFF_COMBAT.plan({definitionId:153,skill:100,magic:100,world:0,caster:'A',targetEligible:true});assert.ok(buff.durationSeconds>0);assert.ok(Number.isFinite(buff.extraHit));
console.log(JSON.stringify({passed:true,root,dependencies:scripts.length,samuraiDuration:sam.durationSeconds,buffDuration:buff.durationSeconds,buffHit:buff.extraHit}));
