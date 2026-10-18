(function(root) {
  'use strict';
  // Presentation only: stored evidence and calculation inputs retain their values.
  function text(value) {
    return String(value ?? '')
      .replace(/クライアント式の基準値/g, '変動を含まない基準値')
      .replace(/クライアント式の入力範囲外/g, '入力範囲外')
      .replace(/クライアント確率加算/g, 'クリティカル確率加算')
      .replace(/クライアント定義の補完[：:]/g, '追加効果：')
      .replace(/その他の効果は従来の設定/g, 'その他の効果は個別の設定を使用')
      .replace(/その他の効果は従来値/g, 'その他の効果は登録値')
      .replace(/効果時間は従来値/g, '効果時間は登録値')
      .replace(/：定義値（固定値側・単位未確認、計算未対応）/g, '（単位未確認・計算対象外）')
      .replace(/定義値・計算未対応/g, '計算対象外')
      .replace(/(?:2026-\d{2}-\d{2}ディレイ操作監査: )?(攻撃|魔法)ディレイの定義値 [^\n]+/g, (_, name) => name + 'ディレイは計算対象外です。単位は未確認です。WarAgeでは適用されません。')
      .replace(/\s*\[__technic-\d+\]/g, '')
      .replace(/(?:\s*\/\s*)?候補精度:\s*[^/\n]+/g, '');
  }
  function source(value) {
    return text(value).split('\n').filter(line => !/クライアント(?:照合|定義|解析)|元kind|\bkind\s*\d+|\bselector\s*\d+|numeric_float|client-fields|native-|サーバー最終|元条件|元のgetter|2026-\d{2}-\d{2}(?:固定加算投入|追加照合|夜間条件監査)/.test(line)).join('\n').trim();
  }
  // Split status lists without splitting HP/MP, units, or a reason's parentheses.
  function statusParts(value, splitComma=true) {
    const parts=[];let start=0,depth=0;
    for(let i=0;i<value.length;i++) {
      if('（('.includes(value[i]))depth++;
      else if('）)'.includes(value[i]))depth=Math.max(0,depth-1);
      else if(!depth&&(splitComma&&value[i]==='、'||value[i]==='/'&&/\s/.test(value[i-1]||'')&&/\s/.test(value[i+1]||''))){parts.push(value.slice(start,i));start=i+1;}
    }
    parts.push(value.slice(start));return parts;
  }
  function effect(value) {
    const raw=String(value??'');
    if (/戦闘試行対応[：:]|能力補正は変動を含まない基準値|クライアント式の基準値|その他の効果は(?:従来|登録)値|計算タブの|状態ハンドラ|内部ID|元kind|numeric_float|未接続|攻撃のダメージは「攻撃の種類」で/.test(raw)) return '';
    if (/^(?:計算未対応|計算対象外)[：:]/.test(raw)) {
      const names=statusParts(raw.replace(/^[^：:]+[：:]/,''))
        .filter(part=>!/適用対象をプレイヤー|対象への適用|戦闘試行で対象へ/.test(part))
        .map(part=>part.replace(/（[^）]*）|\([^)]*\)/g,'').trim())
        .filter(part=>part&&!/発動|詠唱|再使用|消費|競合|上書き|成功|失敗|適用|状態更新|追加ST|^効果時間$/.test(part))
        .filter(part=>!['召喚','設置','動作・外見効果'].includes(part)&&!/^通常攻撃不可。専用技/.test(part))
        .map(part=>/is not defined|Error|undefined|\bkind\b|selector|0x[0-9a-f]+/i.test(part)?'効果量（入力条件を確認してください）':part
          .replace(/^軽減・反射$/,'ダメージ軽減量').replace(/HP変化/g,'HP回復・ダメージ').replace(/ST変化/g,'ST回復・消費').replace(/MP変化/g,'MP回復・消費').replace(/付随効果/g,'追加効果')
          .replace(/。効果量は未対応。?|。数値は説明のみで計算未対応。?|。行動制限は計算未対応。?/g,''));
      return names.length?'この登録に含まれない効果：'+[...new Set(names)].join('、'):'';
    }
    return text(raw).replace(/^効果量\s*/, '').replace(/（対象への適用は計算未対応）/g,'')
      .replace(/（既存説明、計算未対応）/g,'（効果量は計算できません）').trim();
  }
  function info(value) {
    const cleaned=source(value).replace(/数値は説明のみで計算未対応。?|行動制限は計算未対応。?/g,'')
      .replace(/(?:発動\s*\/\s*詠唱|発動|詠唱|Delay)\s*[\d.]+（wiki表値・秒換算未対応）\s*(?:\/\s*)?/g,'')
      .replace(/(?:^|\s\/\s)射程\s*-(?=\s*$|\s\/)/gm,'')
      .replace(/(?:^|\s\/\s)発動(?=\s*$|\s\/)/gm,'');
    return cleaned.split('\n').map(line=>statusParts(line,false).map(part=>part.trim()).filter(part=>!/wiki表値|秒換算未対応|クライアント(?:式|定義|解析)|内部ID|元kind|numeric_float|ハンドラ/.test(part)).join(' / ').trim())
      .map(line=>line.replace(/\s*\/\s*$/,'').trim()).filter((line,index,lines)=>line&&lines.indexOf(line)===index).join('\n').trim();
  }
  function extra(entry, row) {
    if (entry?.key !== 'custom') return entry;
    let name=effect(entry.name);
    if(name.startsWith('この登録に含まれない効果：')) {
      const represented={'攻撃力':['flatAttack','attackPct'],'魔力':['flatMagic','magicPct'],'命中':['extraHit'],'回避':['extraAvoid'],'防御力':['extraAC'],'攻撃ディレイ':['extraAttackDelay','extraAttackDelayPct'],'クリティカル':['extraCritRatePct']};
      const missing=name.slice('この登録に含まれない効果：'.length).split('、').filter(label=>!(represented[label]||[]).some(field=>Number.isFinite(row[field])&&row[field]!==0));
      name=missing.length?'この登録に含まれない効果：'+missing.join('、'):'';
    }
    if(name.startsWith('この登録に含まれない効果：')) {
      const renames=root.MOE_CATALOG_EFFECT_NAMES?.rows?.[row.catalogRuleId||row.id]?.renames;
      if(renames)name='この登録に含まれない効果：'+name.slice('この登録に含まれない効果：'.length).split('、').map(label=>renames[label]||label).join('、');
    }
    if(name.startsWith('この登録に含まれない効果：')&&name.includes('追加効果')) {
      const id=row.catalogRuleId||row.id;
      const details=root.MOE_CATALOG_EFFECT_NAMES?.rows?.[id];
      if(details){
        const labels=details.labels.filter(label=>!(label==='MP自然回復量の増加'&&Number.isFinite(row.mpRegenPerMinute))&&!(label==='クリティカル率の変化'&&details.criticalContributions?.every(value=>Math.abs(value-row.extraCritRatePct)<0.05)));
        const list=name.slice('この登録に含まれない効果：'.length).split('、').flatMap(label=>label==='追加効果'?labels:[label]).filter(Boolean);
        name=list.length?'この登録に含まれない効果：'+[...new Set(list)].join('、'):'';
      }
    }
    if(!name)return null;
    const fields={'攻撃力':'flatAttack','魔力':'flatMagic','命中':'extraHit','回避':'extraAvoid','防御力':'extraAC','最大HP':'extraHP','最大MP':'extraMP','最大ST':'extraST','移動速度':'flatSpeed'};
    const field=entry.unit==='%'?({'攻撃力':'attackPct','魔力':'magicPct','移動速度':'speedPct','防御力':'extraACPct','攻撃ディレイ':'extraAttackDelayPct','クリティカル':'extraCritRatePct'})[name]:fields[name];
    if(field&&row[field]!=null&&Math.abs(Number(row[field])-Number(entry.value))<0.05)return null;
    if(/単位未確認|単位は未確認/.test(name))return {...entry,name:name.replace(/（[^）]*）/g,'')+'（効果量は計算できません）',value:undefined,unit:''};
    return {...entry,name};
  }
  const techniqueVisible = name => !/^(?:GG_\d+|(?:FIRE|ICE|SHOCK|HOLY|POISON|EXPLOSION|DARK FLAME)用\s*二刀流|霊撃用\s*二刀流|紫電ダメージ用\s*二刀流)$/.test(name);
  root.MOE_EFFECT_DISPLAY_TEXT = Object.freeze({text, source, effect, extra, info, techniqueVisible});
})(globalThis);
