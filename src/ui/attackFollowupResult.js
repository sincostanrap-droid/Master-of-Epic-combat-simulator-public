/* Keep per-hit base damage and conditional follow-up estimates distinct. */
function attackFollowupSummaryHtml(m){
  const result=m?.attackFollowups;
  if(!result?.rows?.length)return '';
  if(m.damagePrediction?.supported===false)return '<div class="damageAuditFormula">攻撃本体は計算未対応。武器・Buffの通常アタック追撃はこの攻撃では対象外です。</div>';
  const rows=result.rows.map(r=>{
    const label=r.status==='unsupported'?'未対応':r.status==='out-of-scope'?'対象外':`${fmt(r.probability*100,1)}%`;
    const amount=r.status==='range-only'?`${fmt(r.minimum,1)}～${fmt(r.maximum,1)}（${r.count}回すべて命中）`:r.average==null?'—':`${fmt(r.average,1)}（${r.count}回合計）`;
    const expected=r.expected==null?'未対応':fmt(r.expected,1);
    return `<tr><td>${escapeHtml(r.name)}</td><td>${escapeHtml(label)}</td><td>${escapeHtml(amount)}</td><td>${escapeHtml(expected)}</td></tr><tr><td colspan="4">${escapeHtml(r.note)}</td></tr>`;
  }).join('');
  return `<div class="damageAuditFormula"><b>攻撃本体 ${fmt(m.finalDamage,1)} / 追撃を含む命中時期待値${result.complete?'':'（対応分）'} ${fmt(m.attackExpectedDamage,1)}</b><table><thead><tr><th>追撃</th><th>発動率</th><th>発動時の追加ダメージ</th><th>確率込み追加期待値</th></tr></thead><tbody>${rows}</tbody></table><p>期待値は本体が命中した条件での値です。継続効果の完走・再付与による上書き、範囲追撃の成立条件は各効果の注記を確認してください。</p></div>`;
}
