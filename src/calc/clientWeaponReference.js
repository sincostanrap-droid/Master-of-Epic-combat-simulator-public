(function (root) {
  "use strict";
  const f = Math.fround, skillScale = f(0.0001), gate = f(0.8);
  // Original 56fb00. These inputs are decoded effective skill integers and
  // definition fields, not an estimate of live/server equipment state.
  function performance({primarySkillInteger, primaryRequired, secondary = [], primarySelector = 27}) {
    const required = f(primaryRequired);
    let primary = 1;
    if (primarySelector && required > 0) {
      const ratio = f(primarySkillInteger * skillScale / required);
      primary = ratio >= 1 ? 1 : (ratio < gate ? 0 : ratio);
    }
    if (!secondary.length) return primary;
    let total = primary;
    for (const row of secondary) {
      const req = f(row.required);
      const ratio = req > 0 ? row.skillInteger * skillScale / req : 1;
      total = f(total + (req > 0 && ratio <= gate ? 0 : Math.min(1, ratio)));
    }
    const result = total / (1 + secondary.length);
    return result > gate ? f(Math.min(1, result)) : 0;
  }
  // Original 601d70, ordinary weapon branch: race multiplier is the raw
  // coefficient table entry; the client's 0.2 is applied here separately.
  function attack({strengthInteger, damage, performance: mod, raceMultiplier = 1, cachedAdditive = 0}) {
    const strength = f(strengthInteger * skillScale);
    const effectiveDamage = f(f(damage) * f(mod));
    return f(Math.max(0, strength * f(0.2) * f(raceMultiplier)
      + (strength + 300) * effectiveDamage * f(1 / 350) + f(cachedAdditive)));
  }
  // Original 6021a0 with arg3=0, ordinary weapon branch. This is a hit
  // attribute, not the probability of landing an attack against a target.
  function hit({weaponSkillInteger, performance: mod, raceMultiplier = 1, cachedAdditive = 0}) {
    const skill = f(weaponSkillInteger * skillScale);
    return f(Math.max(0, skill * (f(0.8) + f(0.2) * f(mod))
      * f(raceMultiplier) + f(cachedAdditive)));
  }
  // Original601d70 projectile branch. Ammunition is independently scaled
  // and added only when its class matches the selected normal attack.
  function projectileAttack({strengthInteger, weaponDamage, weaponPerformance,
    ammoDamage, ammoPerformance, ammoClass, selectedAttackAmmoClass,
    raceMultiplier = 1, cachedAdditive = 0}) {
    const compatible = ammoClass > 0 && ammoClass === selectedAttackAmmoClass;
    let effectiveDamage = f(f(weaponDamage) * f(weaponPerformance));
    if (compatible) effectiveDamage = f(effectiveDamage + f(ammoDamage) * f(ammoPerformance));
    return attack({strengthInteger, damage: effectiveDamage, performance: 1,
      raceMultiplier, cachedAdditive});
  }
  // Original6319f0: base-item flags and durable-instance fields are distinct.
  // No semantic names are assigned to the three instance reduction bits.
  function weaponCondition({baseDamage, currentRaw, maximumRaw, gradeCode = 0,
    itemFlags = 0, instanceFlags = 0, enhancement = 0}) {
    if (!Number.isFinite(baseDamage) || !Number.isInteger(currentRaw)
      || currentRaw < 0 || currentRaw > 32767 || !Number.isInteger(maximumRaw)
      || maximumRaw < 0 || maximumRaw > 32767 || !Number.isInteger(gradeCode)
      || gradeCode < 0 || gradeCode > 3 || !Number.isInteger(enhancement)
      || enhancement < 0 || enhancement > 15) throw new RangeError("Invalid client item condition fields");
    let value = f(baseDamage);
    const displayed = itemFlags & 0x40 ? currentRaw
      : currentRaw > 0 ? Math.max(1, Math.trunc(currentRaw * f(0.025))) : 0;
    if (!(itemFlags & 0x400)) {
      if (gradeCode) {
        value *= f(1.1);
        if (gradeCode === 1 && currentRaw < maximumRaw * f(0.5)) value *= f(0.9);
      } else if (displayed <= 1) value *= f(0.6);
      else if (currentRaw < maximumRaw * f(0.2)) value *= f(0.7);
      else if (currentRaw < maximumRaw * f(0.4)) value *= f(0.8);
      else if (currentRaw < maximumRaw * f(0.6)) value *= f(0.9);
    }
    if (instanceFlags & 0x800000) value *= f(0.8);
    if (instanceFlags & 0x400000) value *= f(0.1);
    else if (instanceFlags & 0x1000000) value *= f(0.5);
    if (enhancement <= 7) value += [0, 1, 2, 3, 4, 5, 7, 9][enhancement];
    return f(value);
  }
  function percentageUpdate({currentCachedAdditive, ordinaryWeaponValue, percentage}) {
    const reference = Math.max(0, f(currentCachedAdditive), f(ordinaryWeaponValue));
    return f(f(currentCachedAdditive) + f(f(percentage) * f(0.01) * reference));
  }
  const api = Object.freeze({performance, attack, hit, projectileAttack, weaponCondition, percentageUpdate,
    evidence: "weapon_stat_reference_validation.json; actual_weapon_ammo_validation.json; weapon_condition_validation.json; weapon_quality_labels_validation.json", defaultCalculationReplacement: false,
    scope: "Ordinary weapon and controlled bow/gun ammo; supplied encoded skills, caches, race coefficients, effective damage and selected attack compatibility. Quality/wear helper verified with supplied raw durability and item/instance flags; no semantic label for instance reduction bits or enhancement. No switching flags or conversion Buffs. No live/server final damage proof."});
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.MOE_CLIENT_WEAPON_REFERENCE = api;
})(globalThis);
