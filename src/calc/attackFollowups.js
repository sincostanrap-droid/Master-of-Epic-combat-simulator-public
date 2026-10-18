(function(root){
  'use strict';
  const common=typeof module!=='undefined'&&module.exports;
  const extra=common?require('./additionalTechniqueDamage.js'):root.MOE_ADDITIONAL_TECHNIQUE_DAMAGE;
  const timing=common?require('./effectTiming.js'):root.MOE_EFFECT_TIMING;
  const number=(v,d=0)=>v!==''&&v!=null&&Number.isFinite(+v)?+v:d;
  const id=v=>String(v||'').replace(/^technic-/, '');
  const norm=v=>String(v||'').replace(/\s/g,'');
  // Receiver59dfa0 submits M=1/A=0. These are enemy periodic effects,
  // not persistent player Buffs. Weapon +30 stores the percent proc rate.
  const periodic=(key,name,base,count,interval,element)=>({id:key,name,required:0,
    counter:count,interval,element,duration_coefficient:0,duration_extra:0,
    duration_limit:0,duration_extra_limit:0,effects:[{kind:12,value:base,flags:48}]});
  const unverifiedDps={dpsSupported:false,dpsReason:'DoTの実際の着弾間隔・再発動時の上書きが未確認'};
  const weapons=Object.freeze({
    'official-weapon-8681':{...unverifiedDps,id:'2399',name:'灼熱の炎',probability:.3,definition:periodic(2399,'灼熱の炎',8,3,30,3)},
    'official-weapon-14336':{...unverifiedDps,id:'2399',name:'灼熱の炎',probability:.3,definition:periodic(2399,'灼熱の炎',8,3,30,3)},
    'official-weapon-16103':{...unverifiedDps,id:'6698',name:'龍の牙',probability:.4,definition:periodic(6698,'龍の牙',12,2,10,5)}
  });
  const buffs=Object.freeze({
    // Existing reviewed bounds, conditional on all eight hitting this target.
    // Neither random distribution nor target selection is established.
    '9594':{id:'9594',name:'八岐大蛇',probability:1,minimum:5,maximum:10,count:8,
      trigger:'main-hit',rangeOnly:true,dpsSupported:false,note:'対象1体に8回すべて命中した場合の範囲。乱数分布・範囲内での対象選択が未確認のため平均・期待値・DPSは未対応。'},
    '3274':{id:'3274',name:'邪気払い',reason:'神秘魔法依存の追撃式・対象への適用経路が未確認'},
    '1577':{id:'1577',name:'エンチャント ファイアー',reason:'追撃式・参照能力が未確認'},
    '1579':{id:'1579',name:'エンチャント サンダー',reason:'追撃式・参照能力が未確認'},
    '5855':{id:'5855',name:'竜の力',reason:'対象レベルに依存する追撃式が未確認'},
    '12621':{id:'12621',name:'始高・煌月',reason:'MP50条件・破壊魔法/魔力依存の追撃式が未確認'},
    '12132':{id:'12132',name:'ボルケーノ クラッシャー',reason:'棍棒依存の範囲追撃式が未確認'}
  });
  const procOnlyRefs=new Set(['2399','6698']);
  function weaponKey(w){return w?.catalogId||(/^[0-9]+$/.test(String(w?.officialId||''))?`official-weapon-${w.officialId}`:'');}
  function buffId(row){return id(row?.clientBuffDefinitionId||row?.equipBuffTechnicId||row?.equipBuffCatalogId||row?.catalogRuleId);}
  function isProcOnly(row){return procOnlyRefs.has(buffId(row));}
  function buffRule(row){return buffs[buffId(row)]||Object.values(buffs).find(b=>norm(b.name)===norm(row.name));}
  function hasBuffFollowup(row){
    return !isProcOnly(row)&&(!!buffRule(row)||(row.extraEffects||[]).some(e=>/追撃|追加ダメージ|ブレイド相当/.test(e.name||'')));
  }
  function persistentCatalogBuff(item){
    const ownId=item?.equipBuff?.id||item?.equipBuff?.catalogId||item?.equipBuff?.officialTechnicId;
    const refs=[...(item?.buffRefs||[]),ownId].filter(Boolean);
    const unclassifiedName=item?.equipBuff?.name&&!ownId&&!Object.values(weapons).some(w=>norm(w.name)===norm(item.equipBuff.name));
    // Unknown/mixed references keep their persistent-Buff classification.
    return !!unclassifiedName||refs.some(ref=>!procOnlyRefs.has(id(ref)))||(!refs.length&&!!item?.equipBuff?.name);
  }
  function persistentEquipmentBuff(row){
    if(!isProcOnly(row))return true;
    const name=weapons[weaponKey(row)]?.name||({'2399':'灼熱の炎','6698':'龍の牙'}[buffId(row)]);
    const scalar=['AttackPct','MagicPct','SpeedPct','FlatAttack','FlatMagic','FlatSpeed','ConvMagicRate','ConvMagicSpeedRate','ConvSpeedRate','DmgPct'];
    const custom=scalar.some(k=>number(row['equipBuff'+k])!==0)||number(row.equipBuffSpecial,1)!==1
      ||(row.equipBuffForcedEvasion!=null&&row.equipBuffForcedEvasion!==''&&Number.isFinite(+row.equipBuffForcedEvasion))
      ||Object.keys(row).some(k=>/^equipBuff(?:Extra.+|(?:Hp|St|Mp)(?:RegenPerMinute|ChangePerSecond))$/.test(k)&&number(row[k])!==0);
    return custom||!!(row.equipBuffName&&norm(row.equipBuffName)!==norm(name));
  }
  function collect(weapon,rows){
    const found=[],known=weapons[weaponKey(weapon)];
    if(known)found.push({...known,source:weapon.name||'武器',kind:'weapon',trigger:'weapon-hit'});
    else if(weapon&&procOnlyRefs.has(buffId(weapon))){
      const fixed=Object.values(weapons).find(rule=>rule.id===buffId(weapon));
      found.push({id:buffId(weapon),name:weapon.equipBuffName||fixed.name,definition:fixed.definition,source:weapon.name,kind:'weapon',trigger:'weapon-hit',reason:'この武器の発動率が未確認'});
    }
    for(const row of rows||[]){
      if(!row.enabled||row.excluded)continue;
      const key=buffId(row),rule=buffRule(row);
      if(rule)found.push({...rule,source:row.name||rule.name,kind:'buff',trigger:rule.trigger||'main-hit'});
      else if(hasBuffFollowup(row))
        found.push({id:key||norm(row.name),name:row.name,source:row.name,kind:'buff',trigger:'main-hit',reason:'発動率・追撃式・成立回数が未確認'});
    }
    return found;
  }
  function eligible(attackType){
    // Equipment/Buff follow-ups occur after a normal Attack hits. Technique
    // additional damage is evaluated separately from this proc collection.
    if(attackType==='attack')return 'supported';
    return 'out-of-scope';
  }
  function calculate(effects,{attackType='attack',finalCap=0}={}){
    const rows=[],seen=new Set();
    for(const effect of effects||[]){
      // One receiver per effect ID, even when equipment and Buff both supply it.
      const key=id(effect.id);
      if(seen.has(key))continue;seen.add(key);
      const applies=eligible(attackType);
      const probability=effect.probability==null||effect.probability===''||!Number.isFinite(+effect.probability)?null:Math.max(0,Math.min(1,+effect.probability));
      const status=applies==='out-of-scope'?'out-of-scope':effect.reason||applies==='unsupported'||probability===null?'unsupported':effect.rangeOnly?'range-only':'supported';
      let average=null,minimum=null,maximum=null,count=null,durationSeconds=0;
      if(status==='supported'||status==='range-only'||status==='unsupported'&&applies==='supported'&&effect.definition){
        const packets=effect.definition?extra.fixedPackets(effect.definition):[{minimum:effect.minimum,maximum:effect.maximum,count:effect.count}];
        const cap=n=>Math.max(0,finalCap>0?Math.min(n,finalCap):n);
        average=0;minimum=0;maximum=0;count=0;
        for(const p of packets){
          const lo=p.minimum??p.amount,hi=p.maximum??p.amount;
          const mean=status==='range-only'?0:lo===hi?cap(lo):Array.from({length:hi-lo+1},(_,i)=>cap(lo+i)).reduce((s,n)=>s+n,0)/(hi-lo+1);
          average+=mean*p.count;minimum+=cap(lo)*p.count;maximum+=cap(hi)*p.count;count+=p.count;
        }
        if(effect.definition)durationSeconds=timing.counter(effect.definition,0)*effect.definition.interval/60;
        if(status==='range-only')average=null;
      }
      rows.push({id:key,name:effect.name,source:effect.source,kind:effect.kind,status,probability,element:effect.definition?.element??null,
        average,minimum,maximum,count,durationSeconds,
        expected:status==='supported'&&probability!==null?average*probability:status==='out-of-scope'?0:null,
        dpsSupported:status==='supported'&&effect.dpsSupported!==false,
        dpsReason:effect.dpsReason||'',
        note:status==='out-of-scope'?'通常アタック命中後のみ発生する追撃のため、この攻撃は対象外':status==='unsupported'?(effect.reason||(probability===null?'発動率が未確認':'発動条件・成立回数が未確認')):effect.note||`${({3:'火属性',5:'風属性'})[effect.definition?.element]||'追撃'}。通常アタックの命中1回につき1回判定。DoTが解除・中断されず最後まで成立した場合。AC・属性耐性、参照能力、本体倍率・特攻による増減なし。`});
    }
    return {rows,expected:rows.reduce((s,r)=>s+(r.expected??0),0),
      complete:!rows.some(r=>r.status==='unsupported'||r.status==='range-only'),
      dpsComplete:!rows.some(r=>r.status==='unsupported'||r.status==='range-only'||r.status==='supported'&&!r.dpsSupported)};
  }
  const api=Object.freeze({weapons,buffs,isProcOnly,hasBuffFollowup,persistentCatalogBuff,persistentEquipmentBuff,collect,calculate});
  if(common)module.exports=api;else root.MOE_ATTACK_FOLLOWUPS=api;
})(globalThis);
