/*
  optimizer.worker.js

  最適化をブラウザのメインUIとは別スレッドで実行します。
  これにより、探索中もタブ切り替えや進捗表示が止まりにくくなります。
*/

// Legacy calculation/catalog scripts use window for data globals only.
// No document or DOM shim is provided: UI initializers must stay guarded.
self.window = self;
importScripts('../data/generated/equipmentAdditions20261013.generated.js?v=20261014-equipment', '../data/generated/catalogUpdate20261020.generated.js?v=20261020-raid', '../data/generated/catalogUpdate20261027.generated.js?v=20261027', '../data/generated/catalogUpdate20261104.generated.js?v=20261104', '../data/generated/catalogUpdate20261110.generated.js?v=20261110', '../calc/equipmentBuffNumerics.js?v=20261110', '../calc/combatRangeNumerics.js?v=20261014-gaps12', '../calc/combatPassiveNumerics.js?v=20261014-gaps13');

importScripts(
  "../calc/clientWeaponReference.js?v=20261006-product-formulas",
  "../calc/orderedStats.js?v=20261006-product-formulas",
  "../calc/clientCombatReference.js?v=20261007-damage-hit",
  "../calc/damagePrediction.js?v=20261008-attack-special-2",
  "../domain/petParty.js?v=20261103-pet-party",
  "../domain/attackDpsState.js?v=20261103-dps-motion-required",
  "../domain/catalogData.js?v=20261110",
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
  "../calc/wikiPlayerEffects.js?v=20261102",
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
  "../calc/techniqueDamage.js?v=20261110",
  "../calc/clientPhysicalBuildBuffReference.js?v=20261011-catalog-engine",
  "../calc/combatCatalogEngine.js?v=20261020-raid",
  "../main.js?v=20261110",
  "../calc/core.js?v=20261103-pet-party",
  "./core.js?v=20261103-dps-optimizer"
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
