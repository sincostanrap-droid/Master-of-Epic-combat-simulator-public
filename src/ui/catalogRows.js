function catalogCategoryLabel(category) {
  return category === "weapon" ? "武器" : category === "defense" ? "防具/装飾" : category === "shield" ? "盾" : (category || "-");
}

function catalogStatusSummary(item) {
  const parts = [];
  (item.addStatuses || []).forEach(st => {
    const v = +(st?.value || 0);
    if (st?.name && v) parts.push(`${st.name} ${v > 0 ? "+" : ""}${statDisplayNumber(v,st.name)}`);
  });
  if (!parts.length && item.extraStats) {
    Object.entries(item.extraStats).forEach(([k, v]) => +v && parts.push(`${catalogDisplayStatName(k)} ${+v > 0 ? "+" : ""}${statDisplayNumber(+v,k)}`));
  }
  return parts.join(" / ") || "-";
}

function catalogWeaponSummary(item) {
  if (item.category !== "weapon") return "-";
  const parts = [];
  if (+item.weaponDamage) parts.push(`ダメージ ${fmt(+item.weaponDamage, 1)}`);
  if (+item.weaponAttackInterval) parts.push(`間隔 ${fmt(+item.weaponAttackInterval, 1)}`);
  if (+item.weaponRange) parts.push(`射程 ${fmt(+item.weaponRange, 1)}`);
  if (item.weaponType) parts.push(item.weaponType);
  if(item.weight!=null)parts.push(`重量 ${fmt(+item.weight,1)}`);
  return parts.join(" / ") || "-";
}

function catalogBuffSummary(item) {
  if (!catalogHasBuff(item) && (item.equipBuff?.name || item.buffRefs?.length))
    return `持続Buffなし / 確率追加: ${item.equipBuff?.name || item.buffRefs.join(' / ')}`;
  const buff = catalogBuffForItem(item);
  if (!buff?.name && !(item.buffRefs || []).length) return "-";
  const reviewed = globalThis.MOE_BUFF_RULES_MANUAL?.[buff?.catalogId || buff?.id || `technic-${buff?.officialTechnicId || item.technicId}`];
  if (reviewed?.verified && reviewed.replaceOfficialDescription) {
    return [buff?.name || reviewed.name, equipmentBuffEffectText(catalogEquipmentToRow(item))].join("：");
  }
  return [buff?.name, buff?.info].filter(Boolean).join("：") || (item.buffRefs || []).join(" / ");
}

function catalogResultRowHtml(item, already) {
  const id = escapeAttr(item.catalogId || item.id || "");
  const performance = item.category === "weapon" ? catalogWeaponSummary(item) : catalogArmorSummary(item);
  return `<tr>
    <td><button type="button" class="catalogNameButton" data-catalog-open="${id}" aria-pressed="false">${escapeHtml(item.name || "-")}</button>
      <div class="catalogRowSub">${escapeHtml(catalogCategoryLabel(item.category))}${item.catalogQuality === "HG_MG" ? " · HG/MG" : ""}${item.catalogEnhancement ? ` · +${item.catalogEnhancement}` : ""}</div></td>
    <td>${escapeHtml((item.slot || "-").replace(/^(武器|防具|装飾):\s*/, ""))}</td>
    <td><div class="catalogRowSummary">${escapeHtml(performance)}</div><div class="catalogRowSummary catalogRowSub">${escapeHtml(catalogStatusSummary(item))}</div></td>
    <td><div class="catalogRowSummary">${escapeHtml(catalogBuffSummary(item))}</div></td>
    <td><button type="button" class="miniBtn" data-catalog-add="${id}" ${already ? "disabled" : ""}>${already ? "登録済み" : "＋ 登録"}</button></td>
  </tr>`;
}
