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
  if (byId('attackDpsSustainResult')) byId('attackDpsSustainResult').textContent='条件を変更しました。再計算してください。';
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
  bindNumber("attackDpsSustainMinutes", "sustainMinutes");
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
          再使用待ちと動作待ちの長い方を攻撃周期とし、1更新16msで換算します。素手は武器ディレイに基本値182を加算し、武器使用時の基礎再使用値は最低150です。再使用待ちは整数に切り捨てます。スキル短縮・アタック短縮は0なら有効なBuffとマスタリーから最大値を自動適用し、0以外は手入力値を使います。同じ枠の短縮は重複加算せず、素手にも適用します。時間窓の値は定常周期による換算で、初撃・弾着距離・ラグは含みません。
        </div>
      </fieldset>
    </div>

    <div id="attackDpsResult" class="attackDpsResult"></div>
    <section><h3>Buff更新を含めた継続火力</h3>
      <label>戦闘時間（分）<input id="attackDpsSustainMinutes" type="number" min="0.1" max="60" step="0.1"></label>
      <p>開始前にBuff済み。切れた順にかけ直し、更新中は攻撃を止めます。同時に切れた場合は登録順です。
      効果量は登録時の条件で固定。装備効果・外枠補正は戦闘中も維持する前提です。</p>
      <p>この比較のダメージ・命中率・ディレイは、現在の装備・Buffと計算タブの対象条件から自動計算します。</p>
      <p>対象は「装備以外Buff」の登録行です。時間が不明なものは実測秒数を入力してください。
      「常時維持」は他人・ペットなどから途切れず受けると仮定します。自動判定ではありません。</p>
      <div id="attackDpsSustainBuffs"></div>
      <button type="button" id="attackDpsSustainCalculate">更新込みの火力を計算</button>
      <div id="attackDpsSustainResult" role="status"></div>
      <p class="small">アタックの平均火力を攻撃可能な時間に換算します。発動の成否・MP/ST切れ・攻撃再開時の初撃待ちは含みません。
      最適化では「更新込みアタックDPS」を選択すると、この条件で装備とBuffを比較します。</p>
    </section>
  `;
  panel.appendChild(wrap);
  bindAttackDpsControls();
}

function renderSustainBuffControls(){
  const host=byId('attackDpsSustainBuffs');if(!host)return;
  const concentration=state.skillSim?.skills?.['集中力'];
  const rows=state.composite||[],signature=JSON.stringify(rows.map(r=>[concentration,r.catalogRuleId,r.name,r.enabled,r.excluded,r.sustainMode,r.sustainDurationSeconds,r.sustainDowntimeSeconds,buffDurationSeconds(r)]));
  if(host._signature===signature)return;
  host._signature=signature;
  host.innerHTML=rows.map((r,i)=>{
    const p=MOESustainedAttack.profile(r),duration=buffDurationSeconds(r);
    const cast=MOESustainedAttack.normalCastWindow(r.catalogRuleId,concentration);
    return `<fieldset><legend>${escapeHtml(r.name)}${r.enabled&&!r.excluded?'':'（現在OFF／検索候補）'}</legend>
      <label>更新方法<select data-sustain-row="${i}" data-sustain-key="sustainMode">${[['refresh','切れたらかけ直す（停止秒を指定）'],...(cast||p.mode==='normalCast'?[['normalCast','通常詠唱でかけ直す（集中力から計算）']]:[]),['once','開始時の1回だけ'],['maintained','常時維持（仮定）']].map(([key,label])=>`<option value="${key}" ${key===p.mode?'selected':''}>${label}</option>`).join('')}</select></label>
      ${p.mode!=='maintained'?`<label>効果時間（秒・空欄で登録値）<input type="number" min="0.1" step="0.1" data-sustain-row="${i}" data-sustain-key="sustainDurationSeconds" value="${p.duration??''}" placeholder="${duration>0?duration:'不明'}"></label>`:''}
      ${p.mode==='normalCast'&&cast?`<p>集中力 ${fmt(concentration,1)} ／ 1回の攻撃停止 約${fmt(cast.seconds,1)}秒。立ち詠唱・詠唱速度補正なし・中断なしの条件です。</p>`:''}
      ${p.mode==='refresh'?`<label>かけ直しで攻撃を止める時間（秒）<input type="number" min="0" step="0.1" data-sustain-row="${i}" data-sustain-key="sustainDowntimeSeconds" value="${p.downtime??''}" placeholder="実測値を入力"></label>`:''}</fieldset>`;
  }).join('')||'<p>装備以外Buffの登録はありません。</p>';
  host.onchange=e=>{
    const row=rows[Number(e.target.dataset.sustainRow)],key=e.target.dataset.sustainKey;
    if(!row||!['sustainMode','sustainDurationSeconds','sustainDowntimeSeconds'].includes(key))return;
    if(key==='sustainMode')row[key]=e.target.value;
    else {const value=MOESustainedAttack.number(e.target.value);if(value===null)delete row[key];else row[key]=value;}
    byId('attackDpsSustainResult').textContent='条件を変更しました。再計算してください。';
    calc();renderSustainBuffControls();
  };
}

function calculateSustainFromUi(){
  const target=byId('attackDpsSustainResult');
  try{
    const cfg=attackDpsState(),r=computeSustainedAttack(state,collectInputs(),cfg);
    target.innerHTML=r.supported?`<p>${fmt(r.seconds/60,1)}分の期待総ダメージ <b>${fmt(r.totalDamage,0)}</b> ／ 更新込みDPS <b>${fmt(r.averageDps,1)}</b></p><p>攻撃停止 ${fmt(r.downtimeSeconds,1)}秒 ／ 更新完了 ${r.refreshes.reduce((n,b)=>n+b.count,0)}回</p>`:
      '<p>計算に必要な条件：</p><ul>'+r.reasons.map(x=>'<li>'+escapeHtml(x)+'</li>').join('')+'</ul>';
  }catch(error){target.textContent='計算できませんでした：'+error.message;}
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
