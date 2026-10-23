/*
  optimizer.worker.js

  最適化をブラウザのメインUIとは別スレッドで実行します。
  これにより、探索中もタブ切り替えや進捗表示が止まりにくくなります。
*/

// Legacy calculation/catalog scripts use window for data globals only.
// No document or DOM shim is provided: UI initializers must stay guarded.
self.window = self;
importScripts('../data/generated/equipmentAdditions20261013.generated.js?v=20261014-equipment', '../calc/equipmentBuffNumerics.js?v=20261014-equipment', '../calc/combatRangeNumerics.js?v=20261014-gaps12', '../calc/combatPassiveNumerics.js?v=20261014-gaps13');

importScripts(
  "../calc/clientWeaponReference.js?v=20261006-product-formulas",
  "../calc/orderedStats.js?v=20261006-product-formulas",
  "../calc/clientCombatReference.js?v=20261007-damage-hit",
  "../calc/damagePrediction.js?v=20261008-attack-special-2",
  "../domain/attackDpsState.js?v=20261023-all-weapons",
  "../domain/catalogData.js?v=20261009-weapon-procs",
  "../domain/catalogSearch.js?v=20261009-weapon-procs",
  "../data/generated/masteries.generated.js?v=20261008-effect-calculation",
  "../data/generated/attackTechniques.generated.js?v=20261008-effect-calculation",
  "../data/manual/playerCatalogAdditions.manual.js?v=20261010-player-catalog",
  "../calc/clientSkillInputReference.js?v=20261008-effect-calculation",
  "../calc/clientPhysicalTechniqueReference.js?v=20261008-effect-calculation",
  "../calc/clientMagicReference.js?v=20261008-effect-calculation",
  "../calc/effectTiming.js?v=20261008-effect-calculation",
  "../calc/combatEffectFormulas.js?v=20261011-catalog-engine",
  "../data/generated/combatSkillNames.generated.js?v=20261011-catalog-engine",
  "../calc/combatResourceFormula.js?v=20261011-catalog-engine",
  "../data/generated/wikiPlayerCatalog.generated.js?v=20261010-wiki41",
  "../calc/wikiPlayerEffects.js?v=20261011-catalog-engine",
  "../calc/clientNativeBuffSlotReference.js?v=20261010-combat2",
  "../calc/clientNativeBuffConflictReference.js?v=20261010-combat2",
  "../data/reference/timedCombatDefinitions20261010.js?v=20261010-combat2",
  "../data/reference/statBuffDefinitions20261010.js?v=20261010-stat-buffs",
  "../data/reference/defenseBuffDefinitions20261011.js?v=20261011-defense-buffs",
  "../calc/combatEffectLifecycle.js?v=20261011-catalog-engine",
  "../calc/combatAttempt.js?v=20261011-defense-buffs",
  "../calc/timedBuffCombat.js?v=20261011-defense-buffs",
  "../calc/samuraiHeartCombat.js?v=20261010-combat-attempt",
  "../calc/additionalTechniqueDamage.js?v=20261009-weapon-procs",
  "../calc/attackFollowups.js?v=20261009-normal-attack-followups",
  "../data/generated/weaponSpeciesTraits.generated.js?v=20261008-attack-special-2",
  "../calc/techniqueDamage.js?v=20261014-equipment",
  "../calc/clientPhysicalBuildBuffReference.js?v=20261011-catalog-engine",
  "../calc/combatCatalogEngine.js?v=20261014-gaps13",
  "../main.js?v=20261014-equipment",
  "../calc/core.js?v=20261014-equipment",
  "./core.js?v=20261010-player-catalog"
);

self.onmessage = event => {
  const msg = event.data || {};
  if (msg.type !== "optimize") return;

  try {
    const runtime = msg.payload?.runtime || {};
    OPTIMIZER_RUNTIME_DATA_KEYS.forEach(key => { self[key] = runtime.data?.[key] ?? null; });
    self.MOE_NPC_EFFECT_SLOTS = {
      getAcDelta: () => runtime.npc?.acDelta || 0,
      getEvasionDelta: () => runtime.npc?.evasionDelta || 0,
      getDamageTakenMultiplier: () => runtime.npc?.damageTakenMultiplier || 1
    };
    const out = runOptimizerCore(msg.payload, progress => {
      self.postMessage({
        type: "progress",
        runId: msg.runId,
        ...progress
      });
    });

    self.postMessage({
      type: "result",
      runId: msg.runId,
      results: out.results,
      summary: out.summary
    });
  } catch (e) {
    self.postMessage({
      type: "error",
      runId: msg.runId,
      message: e && e.stack ? e.stack : (e?.message || String(e))
    });
  }
};
