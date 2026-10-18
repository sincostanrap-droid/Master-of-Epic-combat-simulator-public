/*
  Main tab navigation

  メインタブの定義、表示切替、初期レイアウト構築を管理します。
*/

const MAIN_TABS = [
  {id:"calc", label:"計算", hint:"基本設定、サマリー、分析、最適化計算をここにまとめています。"},
  {id:"combatTrial", label:"戦闘試行α", hint:"技・魔法の効果量と時間を計算します。効果の適用や時間経過も、このタブで試せます。"},
  {id:"attackDps", label:"アタックDPS α", hint:"銃・弓の通常アタックで、1秒あたりのダメージと攻撃回数の目安を計算します。"},
  {id:"skill", label:"スキルシミュレータ", hint:"スキル構成と残りポイント、種族別のステータスを確認します。"},
  {id:"equipment", label:"装備登録", hint:"武器・防具・装飾候補、装備Buff、AC/HP/命中などの追加ステータスを部位ごとのカテゴリで登録します。候補追加はここで行います。"},
  {id:"catalog", label:"装備カタログ", hint:"装備を検索して装備登録へ追加します。追加した装備の「使用」をONにすると計算へ反映されます。"},
  {id:"combatLog", label:"戦闘ログ解析 α", hint:"MoEの戦闘ログをブラウザ内だけで解析し、与ダメージ、クリティカル、ミス、DPMを集計します。"},
  {id:"buffs", label:"Buff登録", hint:"装備以外のBuff、外枠補正を登録します。"},
  {id:"groups", label:"競合グループ", hint:"同一グループで重複しないBuffを確認します。"},
  {id:"showcase", label:"見せびらかし", hint:"現在構成のダメージ、ステータス、装備、Buffを一覧表示します。"},
  {id:"save", label:"保存・読込", hint:"現在の構成を保存したり、保存済みの構成を読み込めます。"}
];

function activateMainTab(id) {
  const scrollX = window.scrollX, scrollY = window.scrollY;
  const panels = byId("mainTabPanels");
  const valid = id === "specialization" ? "catalog" : MAIN_TABS.some(t => t.id === id) ? id : "calc";
  // Keep the top of the next screen visible, even when leaving a long table.
  // Do not retain an artificial blank area below shorter screens.
  const nextScrollY = panels
    ? Math.min(scrollY, Math.max(0, panels.getBoundingClientRect().top + scrollY - (byId("mainTabNav")?.getBoundingClientRect().height || 0) - 12))
    : 0;
  if (panels) panels.style.minHeight = "";
  document.querySelectorAll(".mainTabButton").forEach(btn => {
    const active = btn.dataset.tabId === valid;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-selected", active ? "true" : "false");
  });
  document.querySelectorAll(".mainTabPanel").forEach(panel => {
    panel.hidden = panel.dataset.tabPanel !== valid;
  });
  localStorage.setItem("moeDamageSimActiveTab", valid);
  document.dispatchEvent(new CustomEvent("moe:main-tab-activated", {
    detail: {id: valid}
  }));
  if (valid === "catalog") renderCatalogTab();
  if (valid === "specialization") renderSpecializationTab();
  if (valid === "combatLog") renderCombatLogTab();
  window.scrollTo({left:scrollX, top:nextScrollY, behavior:"instant"});
  requestAnimationFrame(() => {
    if (byId("mainTabPanels") === panels) window.scrollTo({left:scrollX, top:nextScrollY, behavior:"instant"});
  });
}

function setupTabLayout() {
  const nav = byId("mainTabNav");
  const panelsWrap = byId("mainTabPanels");
  if (!nav || !panelsWrap) return;
  setupAppVersionBadge(nav);
  if (nav.dataset.ready) return;

  nav.dataset.ready = "1";
  nav.setAttribute("role", "tablist");

  MAIN_TABS.forEach(tab => {
    const btn = makeCell("button", {type:"button", class:"mainTabButton", "data-tab-id":tab.id}, tab.label);
    btn.setAttribute("role", "tab");
    btn.onclick = () => activateMainTab(tab.id);
    nav.appendChild(btn);

    const panel = document.createElement("div");
    panel.className = "mainTabPanel";
    panel.dataset.tabPanel = tab.id;
    panel.setAttribute("role", "tabpanel");

    const hint = document.createElement("div");
    hint.className = "tabSectionHint small";
    hint.textContent = tab.hint;
    panel.appendChild(hint);

    panelsWrap.appendChild(panel);
  });

  document.querySelectorAll("[data-tab-target]").forEach(el => {
    const target = el.dataset.tabTarget || "calc";
    const panel = panelsWrap.querySelector(`[data-tab-panel="${target}"]`);
    if (panel) panel.appendChild(el);
  });

  activateMainTab(localStorage.getItem("moeDamageSimActiveTab") || "calc");
}
