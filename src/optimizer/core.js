/*
  optimizer/core.js

  最適化の重い本体です。
  現時点では既存ロジックの安全分離を優先しており、
  normalize系・computeMetrics系などは src/main.js 側の関数を参照します。

  役割:
  - runOptimizerCore(payload, onProgress)
  - makeOptimizerStatusText(...)
*/

function makeOptimizerStatusText({settings, equipmentBeams, buffEvalBeams, results, elapsed}) {
  const equipmentRowsForStatus = optimizerEquipmentRows(settings);
  const equipCount = equipmentRowsForStatus.filter(equipmentCandidateHasData).length;
  const equipExcludedCount = equipmentRowsForStatus.filter(r => r.optimizerExcluded && equipmentCandidateHasData(r)).length;
  const equipFixedCount = equipmentRowsForStatus.filter(r => r.optimizerFixed && equipmentCandidateHasData(r)).length;
  const buffCount = optimizerCompositeCandidates(settings).length;
  const optimizerFixedText = equipFixedCount ? ` / 固定装備 ${equipFixedCount}件` : "";
  const optimizerExcludeText = equipExcludedCount ? ` / 検索除外装備 ${equipExcludedCount}件` : "";
  const conflictSkipText = settings.equipmentConflictSkipped ? ` / 競合装備除外 ${settings.equipmentConflictSkipped}件` : "";
  const pruneText = settings.optimizerPrunedBuffs ? ` / 不要Buff整理 ${settings.optimizerPrunedBuffs}件` : "";
  const capText = settings.optimizerCapRejected ? ` / 上限超過候補 ${settings.optimizerCapRejected}件除外` : "";
  const duplicateText = settings.optimizerDuplicateRemoved ? ` / 重複構成 ${settings.optimizerDuplicateRemoved}件整理` : "";
  const cacheText = settings.optimizerEvalCount ? ` / 確認 ${settings.optimizerEvalCount}回 / 再利用 ${settings.optimizerCacheHits || 0}回` : "";
  const currentText = settings.includeCurrentConfig
    ? ` / 現在ON構成 ${settings.optimizerCurrentConfigIncluded ? "比較済み" : "比較なし"}`
    : "";
  const betterOnlyText = settings.onlyBetterThanCurrent
    ? ` / 現在ON超え ${settings.optimizerBetterThanCurrentCount ?? 0}件${settings.optimizerBetterThanCurrentFiltered ? `（${settings.optimizerBetterThanCurrentFiltered}件非表示）` : ""}`
    : "";
  const currentEquipSeedText = settings.evaluateCurrentEquipment
    ? ` / 現在ON装備Buff最適化 ${settings.optimizerCurrentEquipmentSeedStatus || "未実行"}`
    : "";
  const accuracyText = settings.accuracyPreset === "fast" ? "高速" : settings.accuracyPreset === "accurate" ? "精度重視" : "標準";
  const equipmentModeText = settings.optimizerEquipmentSearchMode === "exact"
    ? `装備を全通り確認 ${settings.optimizerEquipmentExactTotal || equipmentBeams.length}通り`
    : `装備候補を一部確認 / 全候補 ${settings.optimizerEquipmentExactTotal || "-"}通り`;
  const buffModeText = settings.buffMode === "fast" ? "高速" : settings.buffMode === "beam" ? `深掘り 広さ${settings.buffBeamWidth}` : `標準 仕上げ${settings.localPasses}回`;
  const objectiveText = `${optimizerObjectiveLabel(settings.objective)}${settings.secondaryObjective ? " > " + optimizerObjectiveLabel(settings.secondaryObjective) : ""}`;
  const targetText = optimizerPrimaryTargetDescription(settings);

  return `検索完了: 精度 ${accuracyText} / 目標 ${objectiveText}${targetText ? " / " + targetText : ""} / 装備候補 ${equipCount}件${optimizerFixedText}${optimizerExcludeText} / 装備以外Buff候補 ${buffCount}件 / ${equipmentModeText} / Buff検索 ${buffModeText}${conflictSkipText}${pruneText}${capText}${duplicateText}${cacheText}${currentText}${betterOnlyText}${currentEquipSeedText} / 装備追加・交換確認 ${settings.optimizerEquipmentRefinementChecks || 0}件・改善 ${settings.optimizerEquipmentRefinementImprovements || 0}回 / 装備組み合わせ ${equipmentBeams.length}件中 ${buffEvalBeams.length}件確認 / 表示 ${results.length}件 / ${elapsed}ms`;
}

function optimizerCurrentSelectionKey(result, settings=null) {
  return [
    optimizerEquipmentSelectionKey(result?.equipmentIdxs || [], settings),
    optimizerCompositeSelectionKey(result?.compositeIdxs || []),
    result?.forceOtherBuffs === false ? "noOther" : "other"
  ].join("|");
}

function optimizerCurrentEnabledEquipmentIdxs(settings) {
  return optimizerEquipmentRows(settings)
    .map((row, idx) => ({row, idx}))
    .filter(x => x.row.enabled !== false && optimizerEquipmentRowHasVisibleData(x.row))
    .map(x => x.idx);
}

function optimizerCurrentEnabledCompositeIdxs(settings) {
  return optimizerCompositeRows(settings)
    .map((row, idx) => ({row, idx}))
    .filter(x => x.row.enabled && compositeHasEffect(x.row))
    .map(x => x.idx);
}

function optimizerBuildCurrentConfigResult(inputs, settings) {
  const equipmentIdxs = optimizerCanonicalEquipmentIdxs(optimizerCurrentEnabledEquipmentIdxs(settings), settings);
  const compositeIdxs = optimizerCompositeSelectionKey(optimizerCurrentEnabledCompositeIdxs(settings))
    .split(",")
    .filter(Boolean)
    .map(x => parseInt(x, 10));

  const ev = optimizerEvaluateBuffSelection(equipmentIdxs, compositeIdxs, inputs, settings);
  const metrics = ev.metrics;
  const reasons = [];
  const capViolations = optimizerFinalConstraintViolations(metrics, settings);

  if (metrics.slots.total > settings.maxSlots) {
    reasons.push(`バフ枠超過 ${metrics.slots.total}/${settings.maxSlots}`);
  }
  capViolations.forEach(x => reasons.push(x));

  const equipmentConflicts = optimizerEquipmentConflictNames(equipmentIdxs);
  if (equipmentConflicts.length) {
    reasons.push(`装備競合 ${equipmentConflicts.join(", ")}`);
  }
  if (!optimizerEquipmentSelectionAllowed(equipmentIdxs, optimizerEquipmentGroups(settings), settings)) {
    reasons.push("装備の固定・除外・武器条件に不一致");
  }
  const eligible = new Set(optimizerCompositeCandidates(settings).flatMap(candidate => candidate.indices));
  if (compositeIdxs.some(i => !eligible.has(i))) reasons.push("検索から除外したBuffを使用中");

  if (ev.score <= OPTIMIZER_INVALID_SCORE / 2 && !capViolations.length) {
    reasons.push("目的/上限判定で無効スコア");
  }

  return {
    equipmentIdxs,
    compositeIdxs,
    metrics,
    score: ev.score,
    rank: ev.rank,
    equipmentSummary: optimizerEquipmentSummaryByIdx(equipmentIdxs, metrics),
    equipmentConflicts,
    capViolations,
    prunedCount: 0,
    forceOtherBuffs: settings.forceOtherBuffs,
    sourceLabel: "現在ON",
    currentConfig: true,
    forcedVisible: true,
    baselineInvalid: reasons.length > 0,
    baselineReasons: reasons
  };
}

function optimizerResultPassesDisplayFilters(result, settings) {
  if (!result || !result.metrics || result.baselineInvalid) return false;
  return result.metrics.slots.total <= settings.maxSlots
    && !(result.capViolations || []).length
    && result.score > OPTIMIZER_INVALID_SCORE / 2;
}

function optimizerBuildCurrentEquipmentBuffOptimizedResult(inputs, settings) {
  const equipmentIdxs = optimizerCanonicalEquipmentIdxs(optimizerCurrentEnabledEquipmentIdxs(settings), settings);
  if (!equipmentIdxs.length) {
    settings.optimizerCurrentEquipmentSeedStatus = "装備なし";
    return null;
  }

  // 「現在の装備」は探索の固定/除外指定と異なる場合がある。
  // その場合は比較用の現在ON行だけを残し、最適化候補には混ぜない。
  const selected = new Set(equipmentIdxs);
  const fixedMismatch = optimizerEquipmentRows(settings).some((row, index) =>
    (row.optimizerFixed && !row.optimizerExcluded && !selected.has(index))
    || (row.optimizerExcluded && selected.has(index)));
  if (fixedMismatch || !optimizerEquipmentSelectionAllowed(equipmentIdxs, optimizerEquipmentGroups(settings), settings)) {
    settings.optimizerCurrentEquipmentSeedStatus = "固定・除外条件と不一致のため対象外";
    return null;
  }

  const buff = optimizerSelectExternalBuffs(equipmentIdxs, inputs, settings);
  const metrics = buff.metrics;
  const capViolations = optimizerFinalConstraintViolations(metrics, settings);
  const equipmentConflicts = optimizerEquipmentConflictNames(equipmentIdxs);
  const reasons = [];

  if (metrics.slots.total > settings.maxSlots) {
    reasons.push(`バフ枠超過 ${metrics.slots.total}/${settings.maxSlots}`);
  }
  capViolations.forEach(x => reasons.push(x));
  if (equipmentConflicts.length) reasons.push(`装備競合 ${equipmentConflicts.join(", ")}`);
  if (buff.score <= OPTIMIZER_INVALID_SCORE / 2 && !capViolations.length) reasons.push("目的/上限判定で無効スコア");

  const result = {
    equipmentIdxs,
    compositeIdxs: optimizerCompositeSelectionKey(buff.compositeIdxs).split(",").filter(Boolean).map(x => parseInt(x, 10)),
    metrics,
    score: buff.score,
    rank: buff.rank,
    equipmentSummary: optimizerEquipmentSummaryByIdx(equipmentIdxs, metrics),
    equipmentConflicts,
    capViolations,
    prunedCount: buff.prunedCount || 0,
    forceOtherBuffs: settings.forceOtherBuffs,
    sourceLabel: "現在ON装備 + 最適Buff",
    currentEquipmentSeed: true,
    baselineInvalid: reasons.length > 0,
    baselineReasons: reasons
  };

  settings.optimizerCurrentEquipmentSeedStatus = optimizerResultPassesDisplayFilters(result, settings)
    ? "評価済み"
    : `条件外${reasons.length ? `（${reasons.join(" / ")}）` : ""}`;
  return result;
}

function optimizerMergeSeedResults(rawResults, seedResults, settings) {
  const out = (rawResults || []).slice();
  (seedResults || []).forEach(seed => {
    if (!seed) return;
    if (optimizerResultPassesDisplayFilters(seed, settings)) {
      out.push(seed);
    }
  });
  return out;
}

function optimizerFilterBetterThanCurrent(results, currentResult, settings) {
  if (!settings?.onlyBetterThanCurrent || !currentResult || currentResult.baselineInvalid) return results || [];
  const before = (results || []).length;
  const filtered = (results || []).filter(r => optimizerCompareEvaluations(r, currentResult) > 0);
  settings.optimizerBetterThanCurrentFiltered = before - filtered.length;
  settings.optimizerBetterThanCurrentCount = filtered.length;
  return filtered;
}

function optimizerMergeCurrentConfigResult(results, currentResult, settings) {
  if (!currentResult || !settings?.includeCurrentConfig) return results || [];

  const out = (results || []).slice();
  const currentKey = optimizerCurrentSelectionKey(currentResult, settings);
  const foundIndex = out.findIndex(r => optimizerCurrentSelectionKey(r, settings) === currentKey);

  if (foundIndex >= 0) {
    out[foundIndex] = {
      ...out[foundIndex],
      sourceLabel: settings?.onlyBetterThanCurrent ? "自動探索 + 現在ON（基準超え）" : "自動探索 + 現在ON",
      currentIncluded: true,
      currentConfig: true,
      baselineReasons: currentResult.baselineReasons || [],
      baselineInvalid: currentResult.baselineInvalid,
      equipmentConflicts: currentResult.equipmentConflicts || out[foundIndex].equipmentConflicts || []
    };
    settings.optimizerCurrentConfigIncluded = "merged";
    return out;
  }

  settings.optimizerCurrentConfigIncluded = currentResult.baselineInvalid ? "invalid-appended" : "appended";

  if (settings?.onlyBetterThanCurrent) {
    // 「良い結果だけ」モードでも、現在ON行を基準として末尾に出す。
    // 比較元が見えないと、どれくらい改善したか分かりづらいため。
    return out.concat([{...currentResult, sourceLabel:"現在ON（基準）", baselineReference:true}]);
  }

  if (currentResult.baselineInvalid) {
    return out.concat([currentResult]);
  }

  const withCurrent = out.concat([currentResult]).sort(optimizerSortByEvaluation);
  const currentIndex = withCurrent.findIndex(r => optimizerCurrentSelectionKey(r, settings) === currentKey);

  if (currentIndex < settings.topN) {
    return withCurrent.slice(0, settings.topN);
  }

  // topN外でも、比較用として現在ON行は必ず末尾に残す。
  return withCurrent.slice(0, settings.topN).concat([currentResult]);
}


/* __MOE_OPTIMIZER_EXPLORATION_DIAGNOSTICS_V1__
 * 最適化検索の探索範囲と現在ON構成比較を表示するための診断ヘルパー。
 * 探索アルゴリズム・計算式・stateは変更しない。
 */
function optimizerDiagnosticFmtInt(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "";
  try { return Math.round(v).toLocaleString("ja-JP"); } catch { return String(Math.round(v)); }
}

function optimizerDiagnosticMetricValue(result, settings) {
  const m = result?.metrics || {};
  const objective = settings?.objective || "damage";
  if (objective === "sustainedDps") return m.sustainedAttack?.averageDps ?? OPTIMIZER_INVALID_SCORE;
  if (objective === "attackDps") return m.attackDps?.continuousDps ?? OPTIMIZER_INVALID_SCORE;
  if (objective === "damage") return Number(m.rawDamage ?? m.damage ?? m.finalDamage ?? result?.score ?? 0);
  if (objective === "atk") return Number(m.atk ?? result?.score ?? 0);
  if (objective === "magic") return Number(m.magic ?? result?.score ?? 0);
  if (objective === "speed") return Number(m.interval ?? m.speed ?? result?.score ?? 0);
  if (objective === "hit") return Number(m.hit ?? result?.score ?? 0);
  if (objective === "avoid") return Number(m.avoid ?? result?.score ?? 0);
  if (objective === "ac") return Number(m.ac ?? result?.score ?? 0);
  return Number(result?.score ?? 0);
}

function optimizerDiagnosticCompareText(a, b, settings) {
  if (!a || !b) return "";
  const cmp = optimizerCompareEvaluations(a, b);
  const av = optimizerDiagnosticMetricValue(a, settings);
  const bv = optimizerDiagnosticMetricValue(b, settings);
  const diff = av - bv;
  const diffText = Number.isFinite(diff) && Math.abs(diff) > 0.000001
    ? ` / 表示値差 ${diff > 0 ? "+" : ""}${fmt(diff, 2)}`
    : "";
  if (cmp > 0) return `現在ON構成の方が自動探索1位より強い可能性があります${diffText}`;
  if (cmp < 0) return `現在ON構成は自動探索1位以下です${diffText}`;
  return `現在ON構成と自動探索1位は同等評価です${diffText}`;
}

function makeOptimizerExplorationDiagnostic({settings, equipmentBeams, buffEvalBeams, rawResults, dedupedSortedResults, autoResults, currentResult, results}) {
  const mode = settings?.optimizerEquipmentSearchMode || "unknown";
  const exact = mode === "exact";
  const totalGenerated = (equipmentBeams || []).length;
  const evaluated = (buffEvalBeams || []).length;
  const rawCount = (rawResults || []).length;
  const dedupedCount = (dedupedSortedResults || []).length;
  const shownCount = (results || []).length;
  const topAuto = (autoResults && autoResults[0]) || (dedupedSortedResults && dedupedSortedResults[0]) || null;

  const exactTotal = Number(settings?.optimizerEquipmentExactTotal || 0);
  const exactTotalText = exactTotal && exactTotal !== totalGenerated
    ? ` / 全組み合わせ推定 ${optimizerDiagnosticFmtInt(exactTotal)}通り`
    : "";

  const lines = [];
  const warnings = [];

  lines.push(`探索方式: ${exact ? "全探索候補" : "近似探索"}（mode=${mode}）`);
  lines.push(`装備候補: 生成 ${optimizerDiagnosticFmtInt(totalGenerated)}件 / Buff評価 ${optimizerDiagnosticFmtInt(evaluated)}件${exactTotalText}`);
  lines.push(`結果整理: 条件通過 ${optimizerDiagnosticFmtInt(rawCount)}件 / 装備重複整理後 ${optimizerDiagnosticFmtInt(dedupedCount)}件 / 表示 ${optimizerDiagnosticFmtInt(shownCount)}件`);

  if (!exact) {
    warnings.push("装備候補を途中で間引いているため、手動で作れるシナジー構成が探索結果に出ない可能性があります。");
  }

  if (settings?.equipmentEvalLimit && totalGenerated > evaluated) {
    warnings.push(`equipmentEvalLimit により ${optimizerDiagnosticFmtInt(totalGenerated)}件中 ${optimizerDiagnosticFmtInt(evaluated)}件だけをBuff評価しています。`);
  }

  if (settings?.optimizerBetterThanCurrentFiltered) {
    lines.push(`現在ON超えフィルタ: ${optimizerDiagnosticFmtInt(settings.optimizerBetterThanCurrentFiltered)}件を除外 / 通過 ${optimizerDiagnosticFmtInt(settings.optimizerBetterThanCurrentCount || 0)}件`);
  }

  if (currentResult && topAuto) {
    const cmp = optimizerCompareEvaluations(currentResult, topAuto);
    lines.push(optimizerDiagnosticCompareText(currentResult, topAuto, settings));
    if (cmp > 0) {
      warnings.push("現在ON構成が自動探索1位より高評価です。探索漏れ、表示フィルタ、または近似探索の間引きを確認してください。");
    }
  } else if (currentResult && !topAuto) {
    lines.push("現在ON構成: 評価済み / 比較できる自動探索結果なし");
    warnings.push("自動探索結果が空です。表示フィルタ、上限条件、候補間引きを確認してください。");
  } else {
    lines.push("現在ON構成: 未比較");
  }

  if (settings?.optimizerCurrentEquipmentSeedStatus) {
    lines.push(`現在ON装備+最適Buff: ${settings.optimizerCurrentEquipmentSeedStatus}`);
  }

  const statusText = [
    "",
    "▼探索診断",
    ...lines,
    ...(warnings.length ? ["警告:", ...warnings.map(x => `- ${x}`)] : [])
  ].join("\\n");

  return {
    statusText,
    approximate: !exact,
    mode,
    totalGenerated,
    evaluated,
    exactTotal: exactTotal || null,
    rawCount,
    dedupedCount,
    shownCount,
    currentBetterThanAuto: !!(currentResult && topAuto && optimizerCompareEvaluations(currentResult, topAuto) > 0),
    warnings
  };
}

function optimizerEquipmentSelectionAllowed(indices, groups, settings) {
  const rows = optimizerEquipmentRows(settings);
  if (!optimizerSelectionHasMainWeapon(indices, settings)) return false;
  for (const group of groups) {
    const selected = indices.filter(i => rows[i]?.slot === group.slot && equipmentCandidateHasData(rows[i]));
    if (selected.length > 1) return false;
    const others = indices.filter(i => rows[i]?.slot !== group.slot);
    const allowed = optimizerEquipmentCandidatesForSelection(group, others, settings);
    if (selected.length ? !allowed.some(c => c.idx === selected[0])
        : !allowed.some(c => !equipmentCandidateHasData(c.row))) return false;
  }
  return !indices.some(i => optimizerEquipmentWouldConflict(indices.filter(j => j !== i), i, settings));
}

// Evaluate changes to a complete build before an equipment-only beam can
// exhaust the time budget. Leave most of the budget for the wider search.
function optimizerSearchCurrentNeighbors(inputs, settings, groups, until) {
  const rows = optimizerEquipmentRows(settings);
  let gear = optimizerCurrentEnabledEquipmentIdxs(settings);
  if (!optimizerEquipmentSelectionAllowed(gear, groups, settings)) {
    // Fixed or excluded rows can make the current layout ineligible. Assemble
    // a legal starting point, retaining eligible active items where possible.
    gear = [];
    for (const group of groups) {
      const allowed = optimizerEquipmentCandidatesForSelection(group, gear, settings)
        .filter(c => !optimizerEquipmentWouldConflict(gear, c.idx, settings));
      const candidate = allowed.find(c => c.row.enabled && equipmentCandidateHasData(c.row)) || allowed[0];
      if (!candidate) return null;
      if (equipmentCandidateHasData(candidate.row)) gear.push(candidate.idx);
    }
    if (!optimizerEquipmentSelectionAllowed(gear, groups, settings)) return null;
  }
  const candidates = optimizerCompositeCandidates(settings);
  const fixed = new Set(optimizerFixedCompositeCandidates(settings, candidates).map(c => c.idx));
  let buffs = candidates.filter(c => c.row.enabled || fixed.has(c.idx)).map(c => c.idx);
  let current = null;
  function consider(equipmentIdxs, units) {
    const evaluation = optimizerEvaluateBuffSelection(equipmentIdxs, units, inputs, settings);
    const capViolations = optimizerFinalConstraintViolations(evaluation.metrics, settings);
    const candidate = {...evaluation, equipmentIdxs, compositeIdxs:optimizerLinkedCompositeIndices(units, settings),
      capViolations, equipmentConflicts:[], forceOtherBuffs:settings.forceOtherBuffs,
      sourceLabel:'現在構成からの組み替え'};
    const feasible = optimizerResultPassesDisplayFilters(candidate, settings);
    const excess = Math.max(0, evaluation.metrics.slots.total - settings.maxSlots);
    if (current) {
      if (current.feasible && !feasible) return;
      if (feasible === current.feasible && (excess > current.excess ||
          (excess === current.excess && optimizerSortByEvaluation(candidate, current.result) >= 0))) return;
    }
    current = {result:candidate, feasible, excess};
    gear = equipmentIdxs;
    buffs = units;
  }
  function found() {
    if (!current?.feasible) return null;
    const result = current.result;
    return {...result, equipmentSummary:optimizerEquipmentSummaryByIdx(result.equipmentIdxs, result.metrics)};
  }
  consider(gear, buffs);
  for (const {idx} of candidates) {
    if (performance.now() >= until) return found();
    if (fixed.has(idx)) continue;
    consider(gear, buffs.includes(idx) ? buffs.filter(i => i !== idx) : buffs.concat(idx));
  }
  for (const group of groups) {
    const others = gear.filter(i => rows[i].slot !== group.slot);
    for (const candidate of optimizerEquipmentCandidatesForSelection(group, others, settings)) {
      if (performance.now() >= until) return found();
      if (gear.includes(candidate.idx)) continue;
      const indices = equipmentCandidateHasData(candidate.row) ? others.concat(candidate.idx) : others;
      if (optimizerEquipmentSelectionAllowed(indices, groups, settings)) consider(indices, buffs);
    }
  }
  for (const remove of buffs.slice()) {
    if (fixed.has(remove) || !buffs.includes(remove)) continue;
    const others = buffs.filter(i => i !== remove);
    for (const {idx} of candidates) {
      if (performance.now() >= until) return found();
      if (!others.includes(idx) && idx !== remove) consider(gear, others.concat(idx));
    }
  }
  return found();
}

function optimizerRefineEquipmentResults(results, inputs, settings, onProgress) {
  settings.optimizerEquipmentRefinementChecks = 0;
  settings.optimizerEquipmentRefinementImprovements = 0;
  // Exact mode already evaluated every equipment combination with Buffs.
  if (settings.optimizerEquipmentSearchMode === "exact") return [];
  const rows = optimizerEquipmentRows(settings);
  const groups = optimizerEquipmentGroups(settings);
  const seeds = optimizerDedupeResultsByEquipment(results, settings)
    .sort(optimizerSortByEvaluation).slice(0, Math.max(1, settings.topN || 10));
  // Always revisit the current-equipment seed, even if it fell outside top N.
  results.filter(r => r.currentEquipmentSeed).forEach(r => {
    if (!seeds.includes(r)) seeds.push(r);
  });
  const searchedBuffs = new Map();
  const out = [];
  function resultFor(indices, selection, evaluated) {
    return {
      equipmentIdxs: indices, compositeIdxs: selection,
      metrics: evaluated.metrics, score: evaluated.score, rank: evaluated.rank,
      equipmentSummary: optimizerEquipmentSummaryByIdx(indices, evaluated.metrics),
      equipmentConflicts: optimizerEquipmentConflictNames(indices),
      capViolations: optimizerFinalConstraintViolations(evaluated.metrics, settings),
      forceOtherBuffs: settings.forceOtherBuffs,
      sourceLabel: "装備追加・交換 + 最適Buff"
    };
  }
  seeds.forEach((seed, seedIndex) => {
    let best = seed;
    let changed = true;
    while (changed) {
      changed = false;
      for (const group of groups) {
        const others = best.equipmentIdxs.filter(i => rows[i] && rows[i].slot !== group.slot && equipmentCandidateHasData(rows[i]));
        for (const candidate of optimizerEquipmentCandidatesForSelection(group, others, settings)) {
          const indices = optimizerCanonicalEquipmentIdxs(others.concat(
            equipmentCandidateHasData(candidate.row) ? [candidate.idx] : []), settings);
          const key = optimizerEquipmentSelectionKey(indices, settings);
          if (key === optimizerEquipmentSelectionKey(best.equipmentIdxs, settings) || !optimizerEquipmentSelectionAllowed(indices, groups, settings)) continue;
          settings.optimizerEquipmentRefinementChecks++;
          // Keep the incumbent Buff selection as well: heuristic Buff search must
          // not hide a straightforward improvement that works with those Buffs.
          const inherited = resultFor(indices, best.compositeIdxs,
            optimizerEvaluateBuffSelection(indices, best.compositeIdxs, inputs, settings));
          if (optimizerResultPassesDisplayFilters(inherited, settings) && optimizerCompareEvaluations(inherited, best) > 0) {
            best = inherited;
            changed = true;
            settings.optimizerEquipmentRefinementImprovements++;
          }
        }
      }
      // Re-optimize Buffs only for an improved complete configuration. Searching
      // Buff combinations for every neighbor multiplies search time needlessly.
      if (changed) {
        const key = optimizerEquipmentSelectionKey(best.equipmentIdxs, settings);
        if (!searchedBuffs.has(key)) {
          const buff = optimizerSelectExternalBuffs(best.equipmentIdxs, inputs, settings);
          const selection = optimizerCompositeSelectionKey(buff.compositeIdxs).split(",").filter(Boolean).map(Number);
          searchedBuffs.set(key, resultFor(best.equipmentIdxs, selection, buff));
        }
        const trial = searchedBuffs.get(key);
        if (optimizerResultPassesDisplayFilters(trial, settings) && optimizerCompareEvaluations(trial, best) > 0) best = trial;
      }
    }
    if (best !== seed) out.push(best);
    if (onProgress) onProgress({current:seedIndex + 1, total:seeds.length,
      phase:"equipment-refine", message:`装備追加・交換を再確認: ${seedIndex + 1}/${seeds.length}`});
  });
  return out;
}

function runOptimizerCore(payload, onProgress=null) {
  const inputs = {...(payload?.inputs || {})};
  const settings = {...(payload?.settings || {})};
  if (((settings.objective||"damage")==="damage"||settings.secondaryObjective==="damage") &&
      globalThis.MOE_TECHNIQUE_DAMAGE?.get(inputs.attackType)?.calculationSupported === false)
    throw new Error("選択した攻撃は計算未対応のため、ダメージ最適化は実行できません。");
  optimizerPrepareAttackDps(settings, payload?.state?.attackDps);
  if (optimizerUsesAttackDps(settings) && inputs.attackType && inputs.attackType !== "attack")
    throw new Error("DPS最適化はアタック専用です。基本設定の攻撃種別をアタックにしてください。");
  state = clone(payload?.state || DEFAULT_STATE());

  state.equipment = normalizeEquipmentRows(state.equipment);
  state.composite = normalizeCompositeRows(state.composite);

  settings.optimizerPrunedBuffs = 0;
  settings.optimizerCapRejected = 0;
  optimizerPrepareRunCaches(settings);
  const startTime = performance.now();
  const rawResults = [];
  let budgetBaseline=null;
  if(Number.isFinite(settings.timeLimitMs)&&settings.timeLimitMs>0){
    budgetBaseline=optimizerBuildCurrentConfigResult(inputs,settings);
    settings._searchDeadline=startTime+settings.timeLimitMs;
  }
  try {
  if (settings._searchDeadline) {
    const groups = optimizerEquipmentGroups(settings);
    if (optimizerEquipmentGroupProduct(groups) > (settings.exactEquipmentLimit || 0)) {
      onProgress?.({phase:'current', message:'現在構成から装備・Buffの入れ替えを確認中'});
      const neighbor = optimizerSearchCurrentNeighbors(inputs, settings, groups, startTime + settings.timeLimitMs / 3);
      if (neighbor) rawResults.push(neighbor);
    }
  }
  const equipmentBeams = optimizerBuildEquipmentCandidates(inputs, settings);
  const buffEvalBeams = settings.optimizerEquipmentSearchMode === "exact"
    ? equipmentBeams
    : equipmentBeams.slice(0, settings.equipmentEvalLimit || equipmentBeams.length);

  const total = buffEvalBeams.length;
  const progressStep = Math.max(1, Math.floor(total / 50));

  buffEvalBeams.forEach((beam, index) => {
    const equipmentIdxs = optimizerCanonicalEquipmentIdxs(beam.equipmentIdxs, settings);
    settings._budgetEquipmentKey=optimizerEquipmentSelectionKey(equipmentIdxs,settings);
    const buff = optimizerSelectExternalBuffs(equipmentIdxs, inputs, settings);
    const result = {
      equipmentIdxs,
      compositeIdxs: optimizerCompositeSelectionKey(buff.compositeIdxs).split(",").filter(Boolean).map(x => parseInt(x, 10)),
      metrics: buff.metrics,
      score: buff.score,
      rank: buff.rank,
      equipmentSummary: optimizerEquipmentSummaryByIdx(equipmentIdxs, buff.metrics),
      equipmentConflicts: optimizerEquipmentConflictNames(equipmentIdxs),
      capViolations: optimizerFinalConstraintViolations(buff.metrics, settings),
      prunedCount: buff.prunedCount || 0,
      forceOtherBuffs: settings.forceOtherBuffs
    };

    if (optimizerResultPassesDisplayFilters(result, settings)) {
      rawResults.push(result);
    }

    if (onProgress && ((index + 1) % progressStep === 0 || index + 1 === total)) {
      onProgress({
        current: index + 1,
        total,
        phase: "buff",
        message: `Buff探索中: ${index + 1}/${total}`
      });
    }
  });

  const seedResults = settings.evaluateCurrentEquipment
    ? [optimizerBuildCurrentEquipmentBuffOptimizedResult(inputs, settings)]
    : [];

  const currentResult = (settings.includeCurrentConfig || settings.onlyBetterThanCurrent)
    ? optimizerBuildCurrentConfigResult(inputs, settings)
    : null;

  // 探索診断用。結果には混ぜず、現在ON構成との比較だけ行う。
  const diagnosticCurrentResult = currentResult || optimizerBuildCurrentConfigResult(inputs, settings);

  const searchResultsWithSeeds = optimizerMergeSeedResults(rawResults, seedResults, settings);
  searchResultsWithSeeds.push(...optimizerRefineEquipmentResults(searchResultsWithSeeds, inputs, settings, onProgress));

  const dedupedSortedResults = optimizerDedupeResultsByEquipment(searchResultsWithSeeds, settings)
    .sort(optimizerSortByEvaluation);

  const autoResults = optimizerFilterBetterThanCurrent(dedupedSortedResults, currentResult, settings)
    .slice(0, settings.topN);

  const results = optimizerMergeCurrentConfigResult(autoResults, currentResult, settings);

  const elapsed = Math.round(performance.now() - startTime);
  const optimizerDiagnostic = makeOptimizerExplorationDiagnostic({
    settings,
    equipmentBeams,
    buffEvalBeams,
    rawResults,
    dedupedSortedResults,
    autoResults,
    currentResult: diagnosticCurrentResult,
    results
  });
  settings.optimizerExplorationDiagnostic = optimizerDiagnostic;
  const statusText = [
    makeOptimizerStatusText({settings, equipmentBeams, buffEvalBeams, results, elapsed}),
    optimizerDiagnostic.statusText
  ].filter(Boolean).join("\n");

  return {
    results,
    summary: {
      statusText,
      elapsed,
      evaluated: buffEvalBeams.length,
      totalEquipmentCandidates: equipmentBeams.length,
      optimizerDiagnostic,
      // Run caches may contain hundreds of thousands of full metrics. They are
      // private scratch data, not part of the result sent through postMessage.
      settings: Object.fromEntries(Object.entries(settings).filter(([key]) => !key.startsWith("_")))
    }
  };
  }catch(error){
    if(error.name!=='OptimizerTimeLimit')throw error;
    delete settings._searchDeadline;
    if(settings._budgetIncumbent)rawResults.push(settings._budgetIncumbent);
    const ranked=optimizerDedupeResultsByEquipment(rawResults,settings).sort(optimizerSortByEvaluation);
    const auto=optimizerFilterBetterThanCurrent(ranked,budgetBaseline,settings).slice(0,settings.topN||10);
    const results=optimizerMergeCurrentConfigResult(auto,budgetBaseline,settings);
    const elapsed=Math.round(performance.now()-startTime);
    return {results,summary:{elapsed,timeLimitReached:true,evaluated:rawResults.length,
      statusText:`探索時間の上限で停止：${elapsed}ms。見つかった構成を表示します（最適の保証なし）。表示 ${results.length}件。`,
      optimizerDiagnostic:{approximate:true,timeLimitReached:true},
      settings:Object.fromEntries(Object.entries(settings).filter(([key])=>!key.startsWith('_')))}};
  }finally{delete settings._searchDeadline;}
}

/* v21: skillPlus objective/filter integration
 * skillPlus はステータス・成功率・必要スキルには加算しない。
 * ここでは最適化結果の条件判定/並び替え/表示補助だけを行う。
 */
(function installOptimizerSkillPlusV21(global) {
  if (global.__MOE_OPTIMIZER_SKILL_PLUS_V21_INSTALLED__) return;
  global.__MOE_OPTIMIZER_SKILL_PLUS_V21_INSTALLED__ = true;

  let currentSettings = null;

  function api() {
    return global.MOESkillPlusV21 || null;
  }

  function totalsForResult(result, settings=currentSettings) {
    const helper = api();
    if (!helper || !result) return {};
    if (result.metrics?.skillPlusTotals) return result.metrics.skillPlusTotals;
    if (result.skillPlusTotals) return result.skillPlusTotals;
    return global.MOEOptimizerSkillPlusFixV1?.totalsForSelection(
      result.equipmentIdxs || [], result.compositeIdxs || [], settings || {}) || {};
  }

  function skillPlusObjectiveEnabled(settings=currentSettings, objective=null) {
    const obj = objective || settings?.objective;
    return obj === "skillPlus";
  }

  function skillPlusScore(result, settings=currentSettings) {
    const helper = api();
    if (!helper) return 0;
    const totals = totalsForResult(result, settings);
    const target = settings?.skillPlusTargetSkill || "";
    if (target) return helper.totalForSkill(totals, target);
    return Object.values(totals || {}).reduce((sum, value) => sum + (+value || 0), 0);
  }

  function compareSkillPlus(a, b, settings=currentSettings) {
    const diff = skillPlusScore(b, settings) - skillPlusScore(a, settings);
    if (Math.abs(diff) > 1e-9) return diff;
    const helper = api();
    if (!helper) return 0;
    return helper.summary(totalsForResult(a, settings)).localeCompare(helper.summary(totalsForResult(b, settings)), "ja");
  }

  function resultPassesSkillPlusFilters(result, settings=currentSettings) {
    const helper = api();
    const filters = settings?.skillPlusFilters || [];
    if (!helper || !filters.length) return true;
    return helper.filterMatchesTotals(totalsForResult(result, settings), filters);
  }

  function annotateResult(result, settings=currentSettings) {
    const helper = api();
    if (!helper || !result) return result;
    const totals = totalsForResult(result, settings);
    result.skillPlusTotals = totals;
    result.skillPlusSummary = helper.summary(totals);
    result.skillPlusScore = skillPlusScore(result, settings);
    if (result.equipmentSummary && result.skillPlusSummary && !String(result.equipmentSummary).includes("スキル強化:")) {
      result.equipmentSummary += ` / スキル強化: ${result.skillPlusSummary}`;
    }
    return result;
  }

  const baseRun = global.runOptimizerCore;
  if (typeof baseRun === "function") {
    global.runOptimizerCore = function runOptimizerCoreSkillPlusV21(payload, onProgress=null) {
      currentSettings = payload?.settings || null;
      const out = baseRun.call(this, payload, onProgress);
      try {
        (out?.results || []).forEach(r => annotateResult(r, currentSettings));
        if (out?.summary && currentSettings?.skillPlusFilters?.length && api()) {
          const desc = api().filterDescription(currentSettings.skillPlusFilters);
          if (desc && !out.summary.statusText.includes("スキル強化条件")) out.summary.statusText += ` / スキル強化条件 ${desc}`;
        }
      } catch {}
      return out;
    };
  }

  const basePass = global.optimizerResultPassesDisplayFilters;
  if (typeof basePass === "function") {
    global.optimizerResultPassesDisplayFilters = function optimizerResultPassesDisplayFiltersSkillPlusV21(result, settings) {
      const ok = basePass.call(this, result, settings);
      if (!ok) return false;
      return resultPassesSkillPlusFilters(result, settings || currentSettings);
    };
  }

  // Comparisons use the shared rank (constraints, target distance, primary,
  // secondary). Do not sort raw skill totals ahead of those priorities.

  const baseLabel = global.optimizerObjectiveLabel;
  if (typeof baseLabel === "function") {
    global.optimizerObjectiveLabel = function optimizerObjectiveLabelSkillPlusV21(objective) {
      if (objective === "skillPlus") {
        const target = currentSettings?.skillPlusTargetSkill || "";
        return target ? `${target}強化 最大` : "スキル強化合計 最大";
      }
      return baseLabel.call(this, objective);
    };
  }

  const baseTargetDesc = global.optimizerPrimaryTargetDescription;
  if (typeof baseTargetDesc === "function") {
    global.optimizerPrimaryTargetDescription = function optimizerPrimaryTargetDescriptionSkillPlusV21(settings) {
      const main = baseTargetDesc.call(this, settings) || "";
      const helper = api();
      const desc = helper && settings?.skillPlusFilters?.length ? helper.filterDescription(settings.skillPlusFilters) : "";
      return [main, desc ? `スキル強化条件 ${desc}` : ""].filter(Boolean).join(" / ");
    };
  }

  const baseSummaryByIdx = global.optimizerEquipmentSummaryByIdx;
  if (typeof baseSummaryByIdx === "function") {
    global.optimizerEquipmentSummaryByIdx = function optimizerEquipmentSummaryByIdxSkillPlusV21(equipmentIdxs, metrics) {
      const text = String(baseSummaryByIdx.call(this, equipmentIdxs, metrics) || "");
      const helper = api();
      if (!helper) return text;
      try {
        const totals = metrics?.skillPlusTotals || global.MOEOptimizerSkillPlusFixV1?.totalsForSelection(equipmentIdxs || [], [], currentSettings || {}) || {};
        const summary = helper.summary(totals);
        if (!summary || text.includes("スキル強化:")) return text;
        return text ? `${text} / スキル強化: ${summary}` : `スキル強化: ${summary}`;
      } catch {
        return text;
      }
    };
  }
})(typeof globalThis !== "undefined" ? globalThis : self);
