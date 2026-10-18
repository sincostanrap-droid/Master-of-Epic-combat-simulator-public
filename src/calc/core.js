/*
  calc/core.js

  ダメージ計算の中心部分です。
  現時点では既存ロジックの安全分離を優先しており、
  正規化関数・補助関数・定数は src/main.js 側の定義を参照します。

  役割:
  - computeMetrics(st, inputs)
  - buffSlotCountForState(st)
*/

function totalStatValue(base, flat=0, pct=0) {
  return ((+base || 0) + (+flat || 0)) * (1 + ((+pct || 0) / 100));
}

function computeMetrics(st, inputs, resolvedCapture=null, preparedEvaluation=null) {
  inputs = standardCalculationInputs(inputs);
  st = globalThis.MOE_WIKI_PLAYER_EFFECTS?.refreshState(st) || st;
  st = expandSkillSimMasteryBuffState(st);
  // 装備行に内蔵されたBuffを計算用の装備以外Buffへ展開し、競合グループで重複しないよう代表だけ採用してから既存カテゴリへ展開する。
  const normalizedEquipment = preparedEvaluation?.normalizedEquipment || normalizeEquipmentRows(st.equipment);
  st = expandEquipmentBuffState(st, normalizedEquipment, preparedEvaluation?.buffRow,
    preparedEvaluation?.equipmentBuffCompositeOnly === true);
  st = globalThis.MOE_TECHNIQUE_DAMAGE?.splitSpeciesBuffEffects(st,compositeHasEffect) || st;
  st = applyBuffGroupRules(st);
  st = globalThis.MOE_EQUIPMENT_BUFF_NUMERICS?.gate(st, inputs.equipmentBuffWorld ?? 0) || st;
  if(inputs.timedBuffScenario)st=globalThis.MOE_TIMED_BUFF_COMBAT.project(st,inputs.timedBuffScenario);
  if(inputs.combatCatalogScenario){
    if(inputs.timedBuffScenario?.active?.length)throw new Error('2つの戦闘試行を同時適用せず、使用する試行を選択してください');
    st=globalThis.MOE_COMBAT_CATALOG_ENGINE.project(st,inputs.combatCatalogScenario,inputs.combatCatalogTarget||'A');
  }
  // Optional same-evaluation handoff for callers that also need the resolved
  // equipment/Buff state. The calculator keeps its normal path and result.
  if (resolvedCapture) {
    resolvedCapture.normalizedEquipment = normalizedEquipment;
    resolvedCapture.resolvedBuffState = st;
  }
  const skillPlusTotals = skillPlusTotalsFromResolvedState(st);
  const attackDelayBSources = attackDelayBSourcesFromResolvedState(st);
  const orderedState = st;
  st = expandCompositeState(st);
  const raceCoeff = RACE_COEFFS[inputs.raceSelect] ?? parseFloat(inputs.raceCoeff) ?? 0.20;
  const spirit = parseFloat(inputs.spirit) || 0;
  const magicCoeff = RACE_MAGIC_COEFFS[inputs.raceSelect] ?? 1.00;
  const baseMagicFromSpirit = spirit * magicCoeff;
  // 装備補正はBuff枠とは別枠。攻撃力/魔力/速度/ディレイを単純合算する。
  const equipmentRows = normalizedEquipment.filter(r => r.enabled !== false);
  const equipmentRaw = {
    attack: equipmentRows.reduce((s, r) => s + (+r.attack || 0), 0),
    magic: equipmentRows.reduce((s, r) => s + (+r.magic || 0), 0),
    speed: equipmentRows.reduce((s, r) => s + (+r.speed || 0), 0),
    delay: equipmentRows.reduce((s, r) => s + (+r.delay || 0), 0)
  };
  const extraStats = emptyExtraStats();
  equipmentRows.forEach(r => addExtraStatsInto(extraStats, r, "base"));
  const armorRows = equipmentRows.map(row => equipmentArmorAC(row, st.skillSim));
  const armorAC = {base:armorACContext(st.skillSim).base,
    raw:armorRows.reduce((s,r)=>s+r.raw,0),effective:armorRows.reduce((s,r)=>s+r.effective,0),
    additions:armorRows.reduce((s,r)=>s+r.addition,0)};
  extraStats.extraAC = armorAC.effective + armorAC.additions;
  normalizeCompositeRows(st.composite).filter(r => r.enabled && !r.excluded).forEach(r => addExtraStatsInto(extraStats, r, "buff"));
  armorAC.buff = extraStats.extraAC - armorAC.effective - armorAC.additions;
  armorAC.percentage = extraStats.extraACPct;

  // 実数加算。魔力/速度は%Buffや変換より前、攻撃力は上限対象側に入る。
  const flatRows = normalizeFlatRows(st).filter(r => r.enabled);
  const flatStatRaw = {
    magic: flatRows.filter(r => (r.target || "magic") === "magic").reduce((s, r) => s + (+r.value || 0), 0) + equipmentRaw.magic,
    attack: flatRows.filter(r => r.target === "attack").reduce((s, r) => s + (+r.value || 0), 0) + equipmentRaw.attack,
    speed: flatRows.filter(r => r.target === "speed").reduce((s, r) => s + (+r.value || 0), 0) + equipmentRaw.speed
  };
  const baseStats = {
    str: parseFloat(inputs.str) || 0,
    magic: baseMagicFromSpirit + flatStatRaw.magic,
    speed: (parseFloat(inputs.speed) || 0) + flatStatRaw.speed,
    drunk: parseFloat(inputs.drunk) || 0
  };
  // 攻撃力以外の割合ステータスBuffを適用して、変換計算で使う実効ステータスを作る。

  // 武器性能発揮率を反映した武器攻撃力を計算する。
  const effectiveWeapon = effectiveWeaponStats(st, normalizedEquipment);
  const selectedWeapon = effectiveWeapon.weapon;
  const selectedAmmo = effectiveWeapon.ammo;
  const weaponDamage = selectedWeapon ? effectiveWeapon.damage : (parseFloat(inputs.weaponDamage) || 0);
  const weaponWeight = selectedWeapon ? effectiveWeapon.weight : (parseFloat(inputs.weaponWeight) || 0);
  if (selectedWeapon) inputs.weaponRange = effectiveWeapon.range;
  const weaponInputs = {...inputs, weaponDamage, weaponWeight};
  const skillModInfo = calcWeaponSkillMod(st, weaponInputs,
    preparedEvaluation?.normalizedEquipment || null);
  const skillMod = skillModInfo.mod;
  const f = Math.fround;
  const reference = MOE_CLIENT_WEAPON_REFERENCE;
  const mainWeaponSkillNames = new Set(["素手", "刀剣", "こんぼう", "槍", "弓", "銃器", "投げ"]);
  const equippedWeaponSkill = (selectedWeapon && normalizeWeaponReqRowsForEquipment(selectedWeapon.weaponReq)
    .find(r=>mainWeaponSkillNames.has(r.name))?.name)
    || (mainWeaponSkillNames.has(st.skillSim?.weaponSkill) ? st.skillSim.weaponSkill : "");
  const weaponSkillHit = +st.skillSim?.skills?.[equippedWeaponSkill] || 0;
  const race = SKILL_SIM_RACE[inputs.raceSelect] || SKILL_SIM_RACE.newtar;
  const skill = name => +st.skillSim?.skills?.[name] || 0;
  const derived = key => skillSimStat(inputs.raceSelect,key,skill({hp:"生命力",mp:"知能",st:"持久力",weight:"筋力",avoid:"攻撃回避",resist:"呪文抵抗力"}[key]));
  const ammoPerformance = selectedAmmo ? calcWeaponRequirementsMod(normalizeWeaponReqRowsForEquipment(selectedAmmo.weaponReq)
    .map(r=>({...r,current:skill(r.name)}))).mod : 1;
  // The selected projectile's weapon and ammunition have independent requirements.
  const effectiveDamage = selectedAmmo
    ? f(f(f(+selectedWeapon.weaponDamage || 0)*f(skillMod))+f(+selectedAmmo.weaponDamage || 0)*f(ammoPerformance))
    : f(f(weaponDamage)*f(skillMod));
  const ordinaryAttack = cache => reference.attack({strengthInteger:Math.round(baseStats.str*10000),
    damage:effectiveDamage,performance:1,raceMultiplier:raceCoeff/.2,cachedAdditive:cache});
  const ordinaryHit = cache => reference.hit({weaponSkillInteger:Math.round(weaponSkillHit*10000),
    performance:skillMod,raceMultiplier:race.mult.hit,cachedAdditive:cache});
  const conversionAt = values => calcConversions(st,{...values,str:baseStats.str,drunk:baseStats.drunk});
  const addConversions = (value,conversion) => {
    for (const source of conversion.sourceOrder) value=f(value+conversion.sourceAdds[source]);
    return value;
  };
  const ordered = MOE_ORDERED_STATS.calculate({
    baseValues:{attackCache:0,hitCache:0,magic:baseMagicFromSpirit,speed:+inputs.speed || 0,
      hp:derived("hp"),mp:derived("mp"),st:derived("st"),weight:derived("weight"),
      defense:f(armorAC.base+armorAC.effective+armorAC.additions),avoid:derived("avoid"),
      fireRes:derived("resist"),waterRes:derived("resist"),earthRes:derived("resist"),windRes:derived("resist"),neutralRes:derived("resist")},
    equipment:equipmentRows,rows:normalizeCompositeRows(orderedState.composite),
    flat:normalizeFlatRows(orderedState),pct:orderedState.pct || [],attackCap:+inputs.atkCap,
    attackReference:values=>addConversions(Math.max(0,values.attackCache,ordinaryAttack(values.attackCache)),conversionAt(values)),
    hitReference:values=>Math.max(0,values.hitCache,ordinaryHit(values.hitCache))
  });
  const stats = {...baseStats,magic:ordered.values.magic,speed:ordered.values.speed};
  const defense = ordered.values.defense;
  const pctStats = {stats,steps:ordered.steps.filter(s=>s.percentage && ["magic","speed"].includes(s.key))
    .map(s=>({...s,percent:s.amount,add:s.delta}))};
  const playerHit = ordinaryHit(ordered.values.hitCache);
  const totalStats = {...ordered.values,hit:playerHit};
  const statBeforeLimits = ordered.rawValues;
  const effectiveStatIncreases = {};
  for (const [key,,,prop] of MOE_ORDERED_STATS.fields) {
    if (!prop.startsWith("extra")) continue;
    const base=key==="hitCache"?0:key==="defense"?armorAC.base:
      key.endsWith("Res")?derived("resist"):derived(key);
    effectiveStatIncreases[prop]=ordered.values[key]-base;
  }
  const baseTargetAC = parseFloat(inputs.targetAC) || 0;
  const baseTargetEvasion = parseFloat(inputs.targetEvasion) || 0;
  const npcAcDelta = (() => {
    try { return +(globalThis.MOE_NPC_EFFECT_SLOTS?.getAcDelta?.() || 0); }
    catch { return 0; }
  })();
  const npcEvasionDelta = (() => {
    try { return +(globalThis.MOE_NPC_EFFECT_SLOTS?.getEvasionDelta?.() || 0); }
    catch { return 0; }
  })();
  const npcDamageTakenMultiplier = (() => {
    try { return +(globalThis.MOE_NPC_EFFECT_SLOTS?.getDamageTakenMultiplier?.() || 1); }
    catch { return 1; }
  })();
  const targetDefenseBeforeScenario = Math.max(0, baseTargetAC + npcAcDelta);
  // Optional, explicit combat trial. Ordinary calculations keep their exact
  // existing path; the trial applies the new debuff after current modifiers.
  const ac = inputs.samuraiHeartScenario
    ? globalThis.MOE_SAMURAI_HEART_COMBAT.defense(targetDefenseBeforeScenario, inputs.samuraiHeartScenario).after
    : targetDefenseBeforeScenario;
  const effectiveTargetEvasion = Math.max(0, baseTargetEvasion + npcEvasionDelta);

  const racialAtk = f(f(stats.str)*f(.2)*f(raceCoeff/.2));
  const baseNaturalAtk = ordinaryAttack(0);
  const weaponAtk = baseNaturalAtk-racialAtk;
  const conv = calcConversions(st, stats);

  // 攻撃力加算上限の基準:
  // 武器攻撃力 + 種族ごとの基礎攻撃力は基礎攻撃力。
  // ステータス変換系は上限外で突破する。
  // それ以外の攻撃力増加だけを最大 atkCap までに収める。
  const atk = addConversions(ordinaryAttack(ordered.values.attackCache),conv);
  const conversionAtk = atk-ordinaryAttack(ordered.values.attackCache);
  const baseAtk = baseNaturalAtk + conversionAtk; // 変換込みの上限外基礎として扱う。

  const flatAtkRaw = flatStatRaw.attack;
  const atkCap = parseFloat(inputs.atkCap) || 0;
  const atkPctMode = "ordered";
  const attackSteps=ordered.steps.filter(s=>s.key==="attackCache" && s.percentage);
  const pctAtkCalc={added:attackSteps.reduce((sum,s)=>sum+s.delta,0),after:atk,
    steps:attackSteps.map(s=>({...s,percent:s.amount,add:s.delta}))};
  const atkBuffRaw=ordered.rawValues.attackCache,atkBuffCapped=ordered.values.attackCache;
  const atkBeforePct=attackSteps[0]?.reference ?? baseAtk+flatAtkRaw;
  const extraRawBeforePct=flatAtkRaw,cappedAddRawBeforePct=flatAtkRaw;
  const cappedAddBeforePct=Math.max(-500,Math.min(flatAtkRaw,atkCap));

  const attackMultiplier = attackMultiplierFromInputs(weaponInputs);
  const dmgBonusSum = (st.dmg || []).filter(r => r.enabled && !r.excluded).reduce((s, r) => f(s + f(+r.value || 0)), 0);
  const dmgMultiplier = Math.max(0, 1 + dmgBonusSum);
  const targetRace = normalizeTargetRaceKey(inputs.targetRace || "");
  const weaponSpecial = globalThis.MOE_TECHNIQUE_DAMAGE?.weaponSpecial(selectedWeapon,targetRace) || null;
  const specialMultiplier = (st.special || [])
    .filter(r => r.enabled && !r.excluded)
    .filter(r => {
      const target = normalizeTargetRaceKey(r.target || r.targetRace || "");
      return !target || (targetRace && target === targetRace);
    })
    .reduce((p, r) => p * (+r.value || 1), 1);

  let criticalRate = 0;
  let critAvg = 1;
  if (inputs.attackType === "attack" && inputs.allowCrit) {
    criticalRate = Math.max(0, Math.min(1, parseFloat(inputs.critRate) || 0));
    critAvg = 1 + criticalRate * .5;
  }

  const basePostMultiplier = (st.post || []).filter(r => r.enabled && !r.excluded).reduce((p, r) => p * (+r.value || 1), 1);
  // NPCの被ダメージ倍率は、既存の外枠補正と同じ計算位置で乗算する。
  const postMultiplier = basePostMultiplier * npcDamageTakenMultiplier;

  const technique=globalThis.MOE_TECHNIQUE_DAMAGE?.get(inputs.attackType);
  let techniqueContext=technique ? {
    skill:skill(technique.skillName),attack:atk,conversionAttack:conversionAtk,hit:playerHit,magic:stats.magic,defense,
    targetDefense:ac,evasion:effectiveTargetEvasion,resistance:Math.max(0,+inputs.targetResistance||0),
    powerMultiplier:dmgMultiplier,specialMultiplier,weaponSpecial,targetRace,incoming:basePostMultiplier,targetMultiplier:npcDamageTakenMultiplier,
    hpPercent:inputs.techniqueHpPercent==null||inputs.techniqueHpPercent===''?100:+inputs.techniqueHpPercent,
    hitCount:inputs.techniqueHitCount==null||inputs.techniqueHitCount===''?'':+inputs.techniqueHitCount,
    finalCap:Math.max(0,+inputs.finalCap||0),
    hitContexts:(technique.hits||[technique]).map(hit=>({skill:skill(hit.skillName),
      ...globalThis.MOE_TECHNIQUE_DAMAGE.bonuses(normalizeCompositeRows(orderedState.composite),hit)})),
    randomPower:inputs.techniqueRandomPower==null||inputs.techniqueRandomPower===''?'':+inputs.techniqueRandomPower,
    specialTarget:inputs.techniqueSpecialTarget===true||inputs.techniqueSpecialTarget==='true',
    ...(globalThis.MOE_TECHNIQUE_DAMAGE.isRotation(technique)?{rotationTargetProfile:inputs.rotationTargetProfile||''}:{}),
    // Fixed-base skill hit has its own cache; ordinary weapon hit is not it.
    statCache:{91:0,89:extraStats.extraKickHit,90:extraStats.extraFangHit,
      94:extraStats.extraKickAttack,95:extraStats.extraFangAttack},
    ...globalThis.MOE_TECHNIQUE_DAMAGE.bonuses(normalizeCompositeRows(orderedState.composite),technique)
  } : null;
  const combatCatalog=inputs.combatCatalogScenario?globalThis.MOE_COMBAT_CATALOG_ENGINE:null;
  if(combatCatalog&&techniqueContext)techniqueContext=combatCatalog.damageContext(inputs.combatCatalogScenario,inputs.combatCatalogTarget||'A',technique,techniqueContext);
  const trialPower=combatCatalog?.attackBonuses(inputs.combatCatalogScenario,inputs.combatCatalogTarget||'A',1).physicalFraction||0;
  const damagePrediction=technique ? globalThis.MOE_TECHNIQUE_DAMAGE.calculate(technique,techniqueContext)
    : MOE_DAMAGE_PREDICTION.calculate({attack:Math.max(0,atk),hit:playerHit,
    defense:ac,evasion:effectiveTargetEvasion,powerMultiplier:trialPower?1+f(dmgMultiplier-1+trialPower):dmgMultiplier,specialMultiplier,
    postDefenseMultiplier:attackMultiplier,incoming:basePostMultiplier,targetMultiplier:npcDamageTakenMultiplier,criticalRate,
    innateSpecial:!!weaponSpecial?.applies});
  const rawHitRatePct = damagePrediction.supported===false ? null : damagePrediction.unboundedHitThreshold+1;
  const hitRatePct = damagePrediction.hitRatePct;
  const defenseFactor = damagePrediction.defenseFactor;
  const baseNoTech = atk * 0.8;
  const rawDamage = damagePrediction.average;
  const finalCap = parseFloat(inputs.finalCap) || 0;
  // Technique caps have already been applied to each hit, before summation.
  const finalDamage = !technique && finalCap > 0 ? Math.min(rawDamage, finalCap) : rawDamage;
  const slots = buffSlotCountForState(st);
  const followupApi=globalThis.MOE_ATTACK_FOLLOWUPS;
  const attackFollowups=followupApi?.calculate(followupApi.collect(selectedWeapon,normalizeCompositeRows(orderedState.composite)),
    {attackType:inputs.attackType,technique,finalCap:Math.max(0,finalCap)}) || {rows:[],expected:0,complete:true,dpsComplete:true};
  const attackExpectedDamage=finalDamage==null ? null : finalDamage+attackFollowups.expected;
  const unsupportedBuffIds=new Set((globalThis.MOE_PLAYER_CATALOG_ADDITIONS?.buffs||[]).map(b=>b.id));
  const unsupportedBuffs=normalizeCompositeRows(orderedState.composite)
    .filter(row=>row.enabled&&!row.excluded&&(globalThis.MOE_WIKI_PLAYER_EFFECTS?.incomplete(row)??unsupportedBuffIds.has(row.catalogRuleId))).map(row=>row.name);

  return {
    ...(unsupportedBuffs.length?{unsupportedBuffs}:{}),
    skillPlusTotals, attackDelayBSources, totalStats, statBeforeLimits, effectiveStatIncreases,
    orderedStatSteps:ordered.steps, ammoPerformance, effectiveDamage,
    stats, pctStats, conv, pctAtkCalc, spirit, magicCoeff, baseMagicFromSpirit, flatStatRaw, equipmentRaw, extraStats, armorAC, defense,
    racialAtk, weaponAtk, weaponDamage, weaponWeight, selectedWeapon, selectedAmmo, effectiveWeapon, skillModInfo, baseNaturalAtk, conversionAtk, baseAtk, flatAtkRaw, extraRawBeforePct, cappedAddRawBeforePct, cappedAddBeforePct, atkBeforePct, atkPctMode, atkBuffRaw, atkCap, atkBuffCapped, atk,
    attackMultiplier, dmgMultiplier, defenseFactor, critAvg, basePostMultiplier, npcDamageTakenMultiplier, postMultiplier, baseNoTech,
    rawDamage, finalDamage, attackFollowups, attackExpectedDamage, slots, specialMultiplier, damagePrediction, techniqueContext,
    baseTargetAC, npcAcDelta, effectiveTargetAC: ac,
    equippedWeaponSkill, weaponSkillHit, playerHit, baseTargetEvasion, npcEvasionDelta, effectiveTargetEvasion, rawHitRatePct, hitRatePct,
    forcedEvasion: activeForcedEvasionFromState(st),
    targetRace, weaponSpecial
  };
}
/* バフ枠一覧に表示する行名を作る。 */
function slotRowName(row, fallback) {
  const name = (row && row.name ? String(row.name).trim() : "") || fallback;
  const group = buffGroupName(row);
  return group ? `${name} [${group}]` : name;
}
/* バフ24枠の使用数を数える。装備以外Buffは効果が複数あっても1行=1枠。 */
function buffSlotCountForState(st) {
  const details = [
    ["マスタリー", (st.other || []).filter(r => r.source === "skillSimMastery" && r.enabled && !r.excluded).flatMap(r =>
      Array.from({length:Math.max(0, Math.trunc(r.buffSlotCost ?? 1))}, () => `${r.name}（${r.note}）`))],
    ["装備外", normalizeCompositeRows(st.composite).filter(r => r.enabled && !r.excluded && r.slot && compositeHasEffect(r)).map(r => `${slotRowName(r, "装備以外Buff")}（${compositeEffectText(r)}）`)],
    ["割合", (st.pct || []).filter(r => r.enabled && !r.excluded && r.slot).map(r => slotRowName(r, "割合Buff"))],
    ["実数", normalizeFlatRows(st).filter(r => r.enabled && !r.excluded && r.slot).map(r => slotRowName(r, "実数加算"))],
    ["変換", (st.conv || []).filter(r => r.enabled && !r.excluded && r.slot).map(r => slotRowName(r, "ステータス変換"))],
    ["与ダメ", (st.dmg || []).filter(r => r.enabled && !r.excluded && r.slot).map(r => slotRowName(r, "与ダメBuff"))],
    ["特攻", (st.special || []).filter(r => r.enabled && !r.excluded && r.slot).map(r => slotRowName(r, "特攻"))],
    ["外枠", (st.post || []).filter(r => r.enabled && !r.excluded && r.slot).map(r => slotRowName(r, "外枠補正"))]
  ];
  const groups = details.map(([name, items]) => [name, items.length]);
  return {total: groups.reduce((s, [,n]) => s+n, 0), groups, details};
}
