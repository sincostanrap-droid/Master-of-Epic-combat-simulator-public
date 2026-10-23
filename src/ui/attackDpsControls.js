/*
  Attack DPS controls

  攻撃DPSタブの入力状態、手入力欄の表示切替、イベント登録を管理します。
*/

function attackDpsState() {
  state.attackDps = normalizeAttackDpsState(state.attackDps);
  return state.attackDps;
}

function setAttackDpsField(key, value, type="number") {
  const cfg = attackDpsState();
  if (type === "checkbox") cfg[key] = !!value;
  else if (type === "select") cfg[key] = value;
  else {
    const n = parseFloat(value);
    cfg[key] = Number.isFinite(n) ? n : 0;
  }
  bindAttackDpsControls();
  calc();
}

function updateAttackDpsManualVisibility() {
  const cfg = attackDpsState();
  document.querySelectorAll('[data-attack-dps-manual-for="damage"]').forEach(el => {
    el.hidden = cfg.damageSource !== "manual";
  });
  document.querySelectorAll('[data-attack-dps-manual-for="hitRate"]').forEach(el => {
    el.hidden = cfg.hitRateSource !== "manual";
  });
  document.querySelectorAll('[data-attack-dps-manual-for="weaponDelay"]').forEach(el => {
    el.hidden = cfg.weaponDelaySource !== "manual";
  });
  document.querySelectorAll('[data-attack-dps-manual-for="equipBuffDelay"]').forEach(el => {
    el.hidden = cfg.equipmentBuffDelaySource !== "manual";
  });
}

// Compact alternatives: broad speed candidates plus weapon-specific comparisons.
// Keep the full timing table for restoring existing configurations.
const ATTACK_DPS_MOTION_SHORTLIST = [
  ['form477','猫又'],
  ['motion751','ショルダー タックル'],
  ['form405','リザードマン フォーム'],
  ['form273','SGK フォーム'],
  ['form494','ブラック ライノー フォーム'],
  ['form883','夏天清魚フォーム'],
  ['form454','犬変身'],
  ['form810','トイソルジャー フォーム'],
  ['motion446','免許皆伝（比較用）']
];
function attackDpsMotionOptionsHtml(selected) {
  const rows=[['auto','変身・モーション変更なし（通常人型）'],...ATTACK_DPS_MOTION_SHORTLIST];
  if (!rows.some(([id])=>id===selected)) {
    const saved=ATTACK_DPS_MOTION_PROFILES[selected] || ATTACK_DPS_REMOTE_MOTIONS[selected];
    if (saved) rows.push([selected,saved.label+'（保存中の設定）']);
  }
  return rows.map(([id,label])=>'<option value="'+escapeHtml(id)+'">'+escapeHtml(label)+'</option>').join('');
}

function bindAttackDpsControls() {
  const cfg = attackDpsState();
  const bindNumber = (id, key) => {
    const el = byId(id);
    if (!el) return;
    el.value = cfg[key] ?? 0;
    el.oninput = e => setAttackDpsField(key, e.target.value, "number");
  };
  const bindSelect = (id, key) => {
    const el = byId(id);
    if (!el) return;
    el.value = cfg[key];
    el.onchange = e => setAttackDpsField(key, e.target.value, "select");
  };
  const bindCheckbox = (id, key) => {
    const el = byId(id);
    if (!el) return;
    el.checked = !!cfg[key];
    el.onchange = e => setAttackDpsField(key, e.target.checked, "checkbox");
  };

  const motionSelect = byId("attackDpsMotionProfile");
  const extraProfile=cfg.motionProfile==='auto' || ATTACK_DPS_MOTION_SHORTLIST.some(([id])=>id===cfg.motionProfile) ? '' : cfg.motionProfile;
  if (motionSelect && motionSelect._attackDpsOptionsKey !== extraProfile) {
    motionSelect._attackDpsOptionsKey=extraProfile;
    motionSelect.innerHTML=attackDpsMotionOptionsHtml(cfg.motionProfile);
  }

  const categorySelect=byId('attackDpsWeaponCategory');
  if (categorySelect && !categorySelect._attackDpsOptionsReady) {
    categorySelect._attackDpsOptionsReady=true;
    categorySelect.innerHTML='<option value="auto">現在の計算武器から自動選択（弓・銃）</option>'+Object.entries(ATTACK_DPS_WEAPON_CATEGORIES).map(([id,label])=>'<option value="'+id+'">'+escapeHtml(label)+'</option>').join('');
  }

  bindSelect('attackDpsWeaponCategory','weaponCategory');

  bindSelect("attackDpsMotionProfile", "motionProfile");
  bindSelect("attackDpsDamageSource", "damageSource");
  bindNumber("attackDpsManualDamage", "manualDamage");
  bindSelect("attackDpsWeaponDelaySource", "weaponDelaySource");
  bindNumber("attackDpsManualWeaponDelay", "manualWeaponDelay");
  bindSelect("attackDpsEquipBuffDelaySource", "equipmentBuffDelaySource");
  bindNumber("attackDpsEquipBuffDelay", "equipmentBuffDelay");
  bindNumber("attackDpsAttackDelayBuff", "attackDelayBuff");
  bindNumber("attackDpsStDelayBonus", "stDelayBonus");
  bindCheckbox("attackDpsManualAttackBonus", "manualAttackBonus");
  bindCheckbox("attackDpsCriticalCancel", "criticalCancel");
  bindNumber("attackDpsDamageFrame", "damageFrame");
  bindNumber("attackDpsNonCancelMotionFrames", "nonCancelMotionFrames");
  bindNumber("attackDpsFps", "fps");
  bindNumber("attackDpsSimSeconds", "simSeconds");
  bindNumber("attackDpsHitRatePct", "hitRatePct");
  bindSelect("attackDpsHitRateSource", "hitRateSource");

  updateAttackDpsManualVisibility();

  const copy = byId("attackDpsCopyCurrent");
  if (copy) copy.onclick = copyCurrentToAttackDps;
}

function createAttackDpsTab(panel) {
  const wrap = document.createElement("section");
  wrap.id = "attackDpsRoot";
  wrap.className = "attackDpsPanel";
  wrap.innerHTML = `
    <div class="attackDpsHeader">
      <div>
        <h2>アタックDPS α</h2>
        <p class="small">通常アタックの1秒あたりのダメージを計算します。攻撃種別と、ゲーム内で使用する変身・モーションを指定してください。ダメージと命中率も選択した攻撃種別に合わせてください。</p>
      </div>
      <button type="button" id="attackDpsCopyCurrent">現在構成を手入力欄へ反映</button>
    </div>

    <div class="attackDpsGrid">
      <fieldset>
        <legend>1発ダメージ</legend>
        <label>ダメージ参照
          <select id="attackDpsDamageSource">
            <option value="current">計算タブの予想ダメージ</option>
            <option value="manual">手入力</option>
          </select>
        </label>
        <label data-attack-dps-manual-for="damage">手入力ダメージ
          <input id="attackDpsManualDamage" class="compactNumberInput" type="number" step="1">
        </label>
        <label>命中率参照
          <select id="attackDpsHitRateSource">
            <option value="current">計算タブの命中率</option>
            <option value="manual">手入力</option>
          </select>
        </label>
        <label data-attack-dps-manual-for="hitRate">手入力 命中率%
          <input id="attackDpsHitRatePct" class="compactNumberInput" type="number" step="0.1" min="0" max="100">
        </label>
      </fieldset>

      <fieldset>
        <legend>ディレイ短縮</legend>
        <label>武器ディレイ参照
          <select id="attackDpsWeaponDelaySource">
            <option value="currentWeapon">現在の計算武器</option>
            <option value="manual">手入力</option>
          </select>
        </label>
        <label data-attack-dps-manual-for="weaponDelay">手入力 武器ディレイ
          <input id="attackDpsManualWeaponDelay" class="compactNumberInput" type="number" step="0.1">
        </label>
        <label>装備+攻撃ディレイBuff枠 参照
          <select id="attackDpsEquipBuffDelaySource">
            <option value="auto">ONの装備/Buffから自動</option>
            <option value="manual">手入力</option>
          </select>
        </label>
        <label data-attack-dps-manual-for="equipBuffDelay">手入力 装備+攻撃ディレイBuff枠
          <input id="attackDpsEquipBuffDelay" class="compactNumberInput" type="number" step="0.1">
          <span class="small">手入力時に使用 / -60で上限</span>
        </label>
        <label>スキル短縮・アタック短縮（0でマスタリー自動・短縮20%なら-20）
          <input id="attackDpsAttackDelayBuff" class="compactNumberInput" type="number" step="0.1">
        </label>
        <label>ST補正%
          <input id="attackDpsStDelayBonus" class="compactNumberInput" type="number" step="0.1">
          <span class="small">ST200以上なら -10 想定</span>
        </label>
        <label class="checkLine">
          <input id="attackDpsManualAttackBonus" type="checkbox">
          手動アタック補正 -10% を適用
        </label>
      </fieldset>

      <fieldset>
        <legend>武器とモーション</legend>
        <label>武器の種類<select id="attackDpsWeaponCategory"></select></label>
        <p class="small">近接武器は、武器名の例を参考に種類を選んでください。ダメージと武器ディレイは上の参照設定を使います。素手で武器を持たない場合は、武器ディレイを手入力で0にしてください。</p>
        <label>変身・モーション変更
          <select id="attackDpsMotionProfile"></select>
        </label>
        <p class="small">変身とモーション変更は選択したものを使用する前提です。組み合わせによる重ね掛けは計算しません。</p>
        <label class="checkLine"><input id="attackDpsCriticalCancel" type="checkbox">クリティカルアタックの連続使用（OFFで通常アタック）</label>
        <p class="small">通常アタックとクリティカルアタックは待機時間が異なります。初撃の発生時間ではありません。</p>
      </fieldset>

      <fieldset>
        <legend>表示</legend>
        <label>定常攻撃の換算秒数
          <input id="attackDpsSimSeconds" class="compactNumberInput" type="number" step="1" min="1">
        </label>
        <div class="attackDpsNote small">
          再使用待ちと動作待ちの長い方を攻撃周期とし、1更新16msで換算します。素手は武器ディレイに基本値182を加算し、武器使用時の基礎再使用値は最低150です。再使用待ちは整数に切り捨てます。スキル短縮・アタック短縮は0なら対応武器のマスタリーを自動適用し、0以外は手入力値を使います。同じ枠の短縮は重複加算しません。時間窓の値は定常周期による換算で、初撃・弾着距離・ラグは含みません。
        </div>
      </fieldset>
    </div>

    <div id="attackDpsResult" class="attackDpsResult"></div>
  `;
  panel.appendChild(wrap);
  bindAttackDpsControls();
}

function copyCurrentToAttackDps() {
  try {
    syncSelectedWeaponToHiddenInputs();
    syncRaceCoeff();
    syncBaseMagic();
    syncAttackTypeUI();
    const inputs = collectInputs();
    inputs.raceCoeff = byId("raceCoeff")?.value || inputs.raceCoeff;
    inputs.techMultiplier = byId("techMultiplier")?.value || inputs.techMultiplier;
    const metrics = computeMetrics(expandSkillSimMasteryBuffState(state), inputs);
    const cfg = attackDpsState();
    cfg.manualDamage = Math.max(0, Math.floor(metrics.finalDamage || 0));
    cfg.hitRatePct = metrics.hitRatePct;
    const weapon = selectedWeaponForCalc(state);
    if (weapon && +weapon.weaponAttackInterval > 0) cfg.manualWeaponDelay = +weapon.weaponAttackInterval;
    const delayAuto = collectAttackDpsDelaySources(state);
    cfg.equipmentBuffDelay = delayAuto.total || 0;
    bindAttackDpsControls();
    renderAttackDpsTab(metrics);
    calc();
  } catch (e) {
    alert("現在構成の反映に失敗しました: " + (e?.message || e));
  }
}
