/* Attack selection is backed only by the skill simulator's public name list. */
function damageValueText(m) {
  return m.damagePrediction?.supported===false ? '計算未対応'
    : fmt(Math.floor(m.finalDamage),0)+(m.unsupportedBuffs?.length?'（対応分）':'');
}

function ensureAttackTechniqueOptions() {
  const select=byId('attackType');
  if(!select||select.dataset.techniquesReady)return;
  const api=globalThis.MOE_TECHNIQUE_DAMAGE;
  if(!api)return;
  const groups=new Map();
  const heavy=Array.from(select.options).find(o=>o.value==='heavy')||document.createElement('option');
  heavy.value='heavy';heavy.textContent='ヘビー クラッシュ（重量で自動計算）';
  for(const entry of api.selectionRecords||api.records) {
    const label=`${entry.family==='magic'?'魔法':'技'} / ${entry.skillName}`;
    if(!groups.has(label))groups.set(label,[]);
    groups.get(label).push(entry);
  }
  for(const [label,entries] of groups) {
    const group=document.createElement('optgroup');group.label=label;
    let heavyAdded=false;
    for(const entry of entries) {
      if(label==='技 / こんぼう'&&!heavyAdded&&entry.requirements.some(r=>r.skill==='こんぼう'&&r.min>=70)){
        group.append(heavy);heavyAdded=true;
      }
      const option=document.createElement('option');option.value=entry.key;option.textContent=api.optionLabel(entry);group.append(option);
    }
    if(label==='技 / こんぼう'&&!heavyAdded)group.append(heavy);
    select.append(group);
  }
  select.dataset.techniquesReady='1';
}

function syncAttackTechniqueAvailability() {
  const select=byId('attackType'),api=globalThis.MOE_TECHNIQUE_DAMAGE;
  if(!select||!api)return;
  const skills=state?.skillSim?.skills||{};
  for(const option of select.options) {
    const requirements=option.value==='heavy'?[{skill:'こんぼう',min:70},{skill:'戦闘技術',min:70}]:api.get(option.value)?.requirements||[];
    const missing=requirements.filter(r=>(+skills[r.skill]||0)<(r.min||0)||(r.max!=null&&(+skills[r.skill]||0)>r.max));
    const mastery=techniqueMasteryCondition(api.get(option.value));
    option.disabled=missing.length>0||!mastery.ok;
    option.title=[missing.length?`必要スキル未達: ${missing.map(r=>`${r.skill} ${r.min??0}${r.max!=null?`〜${r.max}`:''}（現在 ${+skills[r.skill]||0}）`).join(' / ')}`:'',!mastery.ok?`必要Buff未達: ${mastery.text}`:''].filter(Boolean).join(' / ');
  }
  if(Array.from(select.options).some(o=>o.value===select.value&&o.disabled))select.value='attack';
}

function syncAttackTechniqueFields(entry) {
  const api=globalThis.MOE_TECHNIQUE_DAMAGE;
  const d=entry?.definition,has=k=>d?.effects?.some(e=>e.kind===k);
  const show=(id,visible)=>{const el=byId(id);if(el)el.hidden=!visible;};
  const additionalElement=entry?.hits?.find(h=>h.additional&&h.additional.element!==1)?.additional?.element;
  show('targetResistanceRow',(entry?.family==='magic'&&d&&d.resistance_ordinal!==4)||!!additionalElement);
  const target=d?.effects?.find(e=>e.kind===239),targetRace=api.targetRaces[target?.selector];
  show('techniqueHpRow',has(258));show('techniqueRandomRow',has(205));show('techniqueSpecialRow',!!target&&!targetRace);
  show('rotationTargetRow',api.isRotation(entry));
  const count=entry?.hits?.length||1,routingMissing=entry?.damageIssues?.includes('weapon-routing');
  show('techniqueHitCountRow',count>1&&!routingMissing);
  const hitInput=byId('techniqueHitCount');
  if(hitInput){hitInput.max=count;hitInput.placeholder=`全${count}段`;}
  const resistance=byId('targetResistanceLabel');
  if(resistance&&entry?.family==='magic'&&d)resistance.textContent=`対象の${api.resistanceNames[d.resistance_ordinal]||'属性'}耐性`;
  else if(resistance&&additionalElement)resistance.textContent=`対象の${{2:'無',3:'火',4:'水',5:'風',6:'地'}[additionalElement]||'属性'}耐性`;
  const random=d?.effects?.find(e=>e.kind===205),input=byId('techniqueRandomPower');
  if(random&&input) {
    const low=Math.min(random.value,random.selector),high=Math.max(random.value,random.selector);
    input.min=low;input.max=high;input.placeholder=String(Math.round((low+high)*50)/100);
    byId('techniqueRandomLabel').textContent=`技の変動倍率（${fmt(low,1)}〜${fmt(high,1)}・空欄は中央値）`;
  }
  const detail=byId('attackTechniqueDetails');
  if(detail) {
    detail.hidden=!entry;
    const powers=entry?(entry.hits||[entry]).map((hit,i)=>{const label=api.powerLabel(hit);return label?`${count>1?`${i+1}段目 `:''}${label}`:'';}).filter(Boolean):[];
    detail.textContent=entry?`${entry.calculationSupported===false?'計算未対応。':''}必要スキル: ${entry.requirements.map(r=>`${r.skill} ${r.min}`).join(' / ')}。${powers.length?`威力: ${powers.join(' → ')}。`:''}${targetRace?`技の特攻対象: ${api.targetNames[targetRace]}（対象種族で判定）。`:''}${api.techniqueSpeciesNote(entry)}${entry.description}`:'';
  }
}

function attackTechniqueHint(entry){
  if(entry.calculationSupported===false)return `${entry.name}: 計算未対応。${entry.calculationReason}必要スキル・使用条件は技の説明で確認してください。`;
  const issues=entry.damageIssues||[],count=entry.hits?.length||1;
  const notes=[];
  if(issues.includes('weapon-routing'))notes.push('左右の武器を使う後続攻撃は未対応のため、1段目のみ表示します。');
  if(issues.includes('additional-damage'))notes.push('追加・継続ダメージは未対応のため、表示は計算できる攻撃分の小計です。');
  if(issues.includes('damage-formula'))notes.push('未対応の後続攻撃があるため、表示は計算できる攻撃分の小計です。');
  const extra=entry.hits?.some(h=>h.additional)?'追加・継続ダメージは最後まで入った場合の合計を含みます。':'';
  return `${entry.name}: ${count>1?'各段を個別に計算して合算します。スキルや条件で途中までしか出ない場合は段数を指定してください。':'発動・命中したときの1発分を表示します。'}${extra}${notes.join('')}${globalThis.MOE_TECHNIQUE_DAMAGE.techniqueSpeciesNote(entry)}発動成功率・途中のミスや中断は含みません。装備・習得条件は技の説明に合わせてください。`;
}

function syncHeavyTechniqueLabel(m,inputs){
  const multiplier=heavyTechniqueMultiplier(m.weaponWeight);
  const option=Array.from(byId('attackType')?.options||[]).find(o=>o.value==='heavy');
  const description=`必要スキル: こんぼう 70 / 戦闘技術 70。威力: ${fmt(multiplier,1)}倍。${m.selectedWeapon?.name||'選択武器'} / 重量 ${fmt(m.weaponWeight,1)}。`;
  if(option){option.textContent=`ヘビー クラッシュ（${fmt(multiplier,1)}倍・重量で自動計算）`;option.dataset.heavyDetails=description;}
  const detail=byId('attackTechniqueDetails');
  if(detail&&inputs.attackType==='heavy')detail.textContent=description;
}

function attackTechniqueSummaryHtml(m, inputs) {
  const p=m.damagePrediction,c=m.techniqueContext,entry=globalThis.MOE_TECHNIQUE_DAMAGE.get(inputs.attackType);
  if(!entry)return '';
  if(p.supported===false)return `<div class="damageAuditFormula"><b>${escapeHtml(entry.name)} — 計算未対応</b><p>${escapeHtml(p.reason)}</p><p>${escapeHtml(entry.description)}</p></div>`;
  const missing=entry.requirements.filter(r=>(+state?.skillSim?.skills?.[r.skill]||0)<r.min);
  const formula=entry.family==='magic'
    ? `魔力 ${fmt(c.magic,1)} / ${p.skillName} ${fmt(c.skill,1)} / 対象${globalThis.MOE_TECHNIQUE_DAMAGE.resistanceNames[entry.definition.resistance_ordinal]||'耐性'} ${fmt(entry.definition.resistance_ordinal===4?c.targetDefense:c.resistance,1)}。耐性による減衰・半減を含む平均。魔法与ダメージ補正 ${fmt(c.magicPct,1)}% / 属性強化 ${fmt(c.elementPct,1)}%。`
    : [globalThis.MOE_TECHNIQUE_DAMAGE.powerLabel(entry),`${p.skillName} ${fmt(c.skill,1)}`,entry.definition.effects.some(e=>e.kind===164)?'防御無視':`対象AC ${fmt(c.targetDefense,1)}`].filter(Boolean).join(' / ')+'。';
  const showPower=p.hits.some(h=>h.powerLabel);
  const rows=p.hits.map(h=>`<tr><td>${h.index}段目</td>${showPower?`<td>${escapeHtml(h.powerLabel||'—')}</td>`:''}<td>${escapeHtml(h.skillName)} ${fmt(h.skill,1)}</td><td>${fmt(h.average,1)}</td><td>${h.hitRatePct==null?'耐性で計算':`${fmt(h.hitRatePct,1)}%`}</td></tr>`).join('');
  const table=p.hitCount>1?`<div class="techniqueHitBreakdown"><table><thead><tr><th>段</th>${showPower?'<th>技の威力</th>':''}<th>スキル</th><th>平均ダメージ</th><th>命中率の目安</th></tr></thead><tbody>${rows}</tbody></table></div>`:'';
  const below=missing.length||p.hits.some(h=>h.skill<h.required);
  const extra=p.additionalCount?`<p>技本体 ${fmt(p.baseAverage,1)} ＋ 追加・継続 ${fmt(p.additionalAverage,1)}（${p.additionalCount}回の合計）</p>`:'';
  const self=p.selfDamageAverage?`<p>使用者へのダメージ ${fmt(p.selfDamageAverage,1)}</p>`:'';
  const target=entry.definition.effects?.find(e=>e.kind===239),race=globalThis.MOE_TECHNIQUE_DAMAGE.targetRaces[target?.selector];
  const species=race?`技の${globalThis.MOE_TECHNIQUE_DAMAGE.targetNames[race]}特攻: ${c.targetRace===race?'適用（通常倍率を置換）':'対象外'}。`
    :globalThis.MOE_TECHNIQUE_DAMAGE.techniqueSpeciesNote(entry,c);
  const weapon=p.hits.some(h=>h.power?.route==='weapon')?globalThis.MOE_TECHNIQUE_DAMAGE.speciesNote(m.selectedWeapon,m.targetRace):'';
  return `<div class="damageAuditFormula"><b>${escapeHtml(entry.name)} — ${escapeHtml(globalThis.MOE_TECHNIQUE_DAMAGE.resultLabel(p))} ${fmt(m.finalDamage,1)}</b><p>${escapeHtml(formula+species+weapon)}</p>${extra}${self}${table}<p>${escapeHtml(attackTechniqueHint(entry))}</p><p>装備/Buffは登録済みの対応効果を反映します。${c.finalCap>0?'ダメージ上限は各段に適用します。':''}</p>${below?'<p class="warn">必要スキルに満たない段があります。発動できた場合のダメージを表示しています。</p>':''}</div>`;
}
