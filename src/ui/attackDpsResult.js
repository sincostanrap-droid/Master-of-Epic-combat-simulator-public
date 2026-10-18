/*
  Attack DPS result view

  攻撃DPSの計算結果を表示用HTMLへ変換します。
  状態の更新やDPS計算式はこのファイルでは扱いません。
*/

function attackDpsDelaySourceListHtml(auto) {
  if (!auto?.sources?.length) return "該当なし";
  const maxShown = 12;
  const shown = auto.sources.slice(0, maxShown)
    .map(s => `${s.kind}: ${s.name} ${s.value > 0 ? "+" : ""}${fmt(s.value, 1)}`);
  if (auto.sources.length > maxShown) shown.push(`ほか ${auto.sources.length - maxShown}件`);
  return shown.map(escapeHtml).join(" / ");
}

function attackDpsResultCard(label, value, note="") {
  return `<div class="attackDpsCard"><span>${escapeHtml(label)}</span><b>${escapeHtml(value)}</b>${note ? `<small>${escapeHtml(note)}</small>` : ""}</div>`;
}

function renderAttackDpsResult(metrics=null) {
  const el = byId("attackDpsResult");
  if (!el) return;
  if (metrics?.unsupportedBuffs?.length && attackDpsState().damageSource === 'current') {
    el.innerHTML = `<p>計算未対応のBuffがあります：${metrics.unsupportedBuffs.map(escapeHtml).join(' / ')}。効果を含む自動DPSは計算未対応です。</p>`;
    return;
  }
  if (metrics?.techniqueContext && (attackDpsState().damageSource === 'current' || attackDpsState().hitRateSource === 'current')) {
    el.innerHTML = '<p>攻撃DPSは通常アタックの周期で計算します。基本設定の攻撃種別を「アタック」に戻すか、アタック1発のダメージと命中率を手入力してください。</p>';
    return;
  }
  const r = computeAttackDpsAlpha(metrics);
  const warnHtml = r.warnings.length
    ? `<div class="attackDpsWarnings">${r.warnings.map(w => `<div>⚠ ${escapeHtml(w)}</div>`).join("")}</div>`
    : `<div class="attackDpsOk">選択した武器・モーションとクリティカル設定で計算しています。</div>`;

  if (!r.supported) {
    el.innerHTML = warnHtml + '<p>対応モーションを選択してください。対象外の武器には下限値を流用しません。</p>';
    return;
  }
  const weaponText = r.weapon
    ? `${(r.weapon.slot || "武器").replace(/^武器: /, "")} ${r.weapon.name || "名称未入力"}`
    : "手入力/未選択";

  const cards = [
    attackDpsResultCard("攻撃本体の1発ダメージ", fmt(r.damage, 0), r.cfg.damageSource === "current" ? "計算タブ参照" : "手入力（追撃を含む値なら再加算しません）"),
    ...(r.cfg.damageSource==='current'&&metrics?.attackFollowups?.rows?.length?[attackDpsResultCard("追撃のDPS用追加期待値",r.followupComplete?fmt(r.followupExpected, 1):r.followupExpected>0?`${fmt(r.followupExpected, 1)}（対応分）`:'未対応',r.followupComplete?'発動率を1回だけ適用':'未反映の追撃あり')]:[]),
    attackDpsResultCard("短縮後ディレイ", fmt(r.delaySec, 1) + " 秒", r.cfg.equipmentBuffDelaySource === "auto" ? "装備・Buffから計算" : "手入力の補正で計算"),
    attackDpsResultCard("実測周期の下限", fmt(r.motionLockSec, 1) + " 秒", r.motion.label),
    attackDpsResultCard("実アタック周期", fmt(r.periodSec, 1) + " 秒", r.cfg.criticalCancel ? "クリキャン前提" : "非キャンセル"),
    attackDpsResultCard(`継続DPS${r.followupComplete?'':'（対応分）'}`, fmt(r.continuousDps, 1), `命中率 ${fmt(r.hitRate * 100, 1)}%`),
    attackDpsResultCard(`${fmt(r.simSeconds, 1)}秒の期待総ダメージ`, fmt(r.expectedTotalDamage, 0), `${fmt(r.hitCount, 1)}回相当 / 定常周期換算`),
    attackDpsResultCard("1分あたり攻撃回数", fmt(r.attacksPerMinute, 1), "理論値")
  ].join("");

  el.innerHTML = `
    ${warnHtml}
    <div class="attackDpsOk">${r.delaySec <= r.motionLockSec ? `モーション上限に到達（約${fmt(r.attacksPerMinute, 1)}回／分）。追加のディレイ短縮によるDPS上昇なし。` : `現在はディレイが攻撃周期を制限しています。モーション上限は約${fmt(60 / r.motionLockSec, 1)}回／分です。`}</div>
    <div class="attackDpsResultGrid">${cards}</div>
    <details class="attackDpsFormula">
      <summary>計算内訳</summary>
      <div>計算武器: ${escapeHtml(weaponText)} / 武器ディレイ ${fmt(r.weaponDelay, 1)}${r.cfg.weaponDelaySource === "currentWeapon" ? "（現在武器）" : "（手入力）"}</div>
      <div>装備・Buffのディレイ補正: 上限適用前 ${fmt(r.equipBuffRaw, 1)} → 適用後 ${fmt(r.equipBuffCapped, 1)} / スキル・アタック短縮 ${fmt(r.attackDelayBuff, 1)} / ST補正 ${fmt(r.stBonus, 1)} / 手動補正 ${fmt(r.manualBonus, 1)}</div>
      <div>ディレイ短縮自動参照: 装備 ${fmt(r.delayAuto.equipmentTotal, 1)} / Buff ${fmt(r.delayAuto.buffTotal, 1)} / 合計 ${fmt(r.delayAuto.total, 1)}${r.cfg.equipmentBuffDelaySource === "auto" ? "（採用中）" : "（手入力のため未採用）"}</div>
      <div>参照元: ${attackDpsDelaySourceListHtml(r.delayAuto)}</div>
      <div>短縮後ディレイ = 武器ディレイ × ${fmt(r.delayMultiplier, 1)} = ${fmt(r.shortenedDelay, 1)}（${fmt(r.delaySec, 1)}秒）</div>
      <div>周期 = max(短縮後ディレイ秒 ${fmt(r.delaySec, 1)}, 実測周期下限 ${fmt(r.motionLockSec, 1)}) = ${fmt(r.periodSec, 1)}秒</div>
      <div>${fmt(r.simSeconds,1)}秒内ヒット数 = ${fmt(r.hitCount, 1)}回相当（定常換算） / 期待総ダメージ = ${fmt(r.expectedTotalDamage, 0)}</div>
      ${r.followupExpectedActivations.map(row=>`<div>${escapeHtml(row.name)}: 期待発動 ${fmt(row.activations, 1)}回 / 期待ダメージ発生 ${fmt(row.packets, 1)}回</div>`).join('')}
    </details>
  `;
}

function computeAttackDpsAlpha(metrics=null) {
  const cfg = attackDpsState();
  if (metrics?.techniqueContext && (cfg.damageSource === 'current' || cfg.hitRateSource === 'current')) return {supported:false,warnings:['攻撃DPSにはアタック1発のダメージと命中率を指定してください。']};
  const weapon = selectedWeaponForCalc(state);
  const currentDamage = metrics && Number.isFinite(+metrics.finalDamage) ? Math.floor(+metrics.finalDamage) : 0;
  const currentWeaponDelay = weapon && +weapon.weaponAttackInterval > 0 ? +weapon.weaponAttackInterval : 0;
  const delayAuto = collectAttackDpsDelaySources(state);
  return calculateAttackDps({cfg, weapon, currentDamage, currentFollowups:metrics?.attackFollowups, currentHitRatePct:metrics?.hitRatePct ?? 100, currentWeaponDelay, delayAuto});
}

function renderAttackDpsTab(metrics=null) {
  const panel = document.querySelector('[data-tab-panel="attackDps"]');
  if (!panel) return;
  if (!panel.dataset.attackDpsReady) {
    panel.dataset.attackDpsReady = "1";
    createAttackDpsTab(panel);
  }
  bindAttackDpsControls();
  renderAttackDpsResult(metrics);
}
