(function(root) {
  'use strict';
  const presets = Object.freeze([1, 50, 100].map(level => Object.freeze({
    key: `scarecrow-${level}`,
    label: `仮想対象（AC ${level}・回避 ${level}）`,
    inputs: Object.freeze({targetAC: String(level), targetEvasion: String(level), targetRace: ''})
  })));

  function matchingKey(inputs) {
    const preset = presets.find(row =>
      Number(inputs?.targetAC) === Number(row.inputs.targetAC) &&
      Number(inputs?.targetEvasion) === Number(row.inputs.targetEvasion) &&
      String(inputs?.targetRace || '') === row.inputs.targetRace);
    return preset?.key || '';
  }

  const api = Object.freeze({presets, matchingKey});
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.MOE_TARGET_PRESETS = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
