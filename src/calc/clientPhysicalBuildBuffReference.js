(function(root) {
  'use strict';
  const f = Math.fround;
  function collect(rows, data, element, world = 0, contextMark = 0) {
    if (!Number.isInteger(element) || !Number.isInteger(world) || world < 0 ||
        !Number.isInteger(contextMark) || contextMark < 0) throw new RangeError('Invalid collector context');
    const definitions = new Map(data.records.map(d => [d.id,d]));
    const sources = new Map(data.sources.map(s => [s.sourceId,s.definitionIds[0]]));
    let physical = 0, attribute = 0;
    const contributions = [], omitted = [];
    for (const row of rows || []) {
      if (!row.enabled || row.excluded) continue;
      // Provenance survives the same calculation's equipment/group resolution.
      // Names and legacy aggregate percentages are never used to guess an ID.
      const id = Number(row.clientBuffDefinitionId) || sources.get(row.catalogRuleId);
      const d = definitions.get(id);
      if (!d) {
        if (row.nativeComparisonOmitted || row.dmgPct || row.special !== undefined && row.special !== 1 ||
            (row.extraEffects || []).some(e => /[Dd]amage|[Ee]lement/.test(e.key || '')))
          omitted.push({name:row.name || '手動Buff',reason:'対応する物理威力・属性強化の定義なし'});
        continue;
      }
      let nextPhysical = physical, nextAttribute = attribute;
      const entries = [];
      for (const e of d.effects) {
        if (e.kind !== 247 && e.kind !== 275) continue;
        const a = !!(e.flags & 0x100), b = !!(e.flags & 0x200);
        const allowed = !(a !== b && (a && world === 1 || b && world !== 1)) &&
          !(e.flags & 0x1000 && !(contextMark & 4));
        if (!allowed || e.kind === 275 && e.selector !== 0 && e.selector !== element) continue;
        if (e.kind === 247) nextPhysical += e.value;
        if (e.kind === 275) nextAttribute += e.value;
        entries.push({...e});
      }
      // Original x87 subtotal is stored to float32 after EACH active definition.
      physical = f(nextPhysical); attribute = f(nextAttribute);
      if (d.effects.some(e => e.kind === 247 || e.kind === 275)) contributions.push({definitionId:id,name:d.name,entries});
    }
    return {physicalFraction:physical,elementFraction:attribute,contributions,omitted,
      scope:'UI-resolved active rows; original247/275 only',liveActivationVerified:false};
  }
  function candidates(rows,data,kind) {
    const defs=new Map(data.records.map(d => [d.id,d]));
    const sources=new Map(data.sources.map(s => [s.sourceId,s.definitionIds[0]]));
    const found=new Map();
    for (const row of rows || []) {
      if (!row.enabled || row.excluded) continue;
      const id=Number(row.clientBuffDefinitionId) || sources.get(row.catalogRuleId);
      const d=defs.get(id), effect=d?.effects.find(e => e.kind === kind);
      // Original774280 selects the FIRST raw entry; it does not filter its
      // world/context flags. Active-record eligibility precedes this lookup.
      if (effect && !found.has(id)) found.set(id,{definitionId:id,name:d.name,effect});
    }
    return [...found.values()];
  }
  function select(rows,data,kind,choice,label) {
    const list=candidates(rows,data,kind);
    if (choice === 0 || choice === '0') return null;
    if (choice == null || choice === '') {
      if(list.length > 1) throw new Error(label + 'が複数あります。先頭として比較するBuffを指定してください');
      return list[0] || null;
    }
    const chosen=list.find(c => c.definitionId === Number(choice));
    if(!chosen) throw new Error(label + 'の指定が現在の有効なBuffにありません');
    return chosen;
  }
  const api=Object.freeze({collect,candidates,select});
  if(typeof module!=='undefined'&&module.exports) module.exports=api;
  else root.MOE_CLIENT_PHYSICAL_BUILD_BUFF_REFERENCE=api;
})(globalThis);
