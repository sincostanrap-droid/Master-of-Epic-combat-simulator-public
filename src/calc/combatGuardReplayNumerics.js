// Reflection retains the original spell input. Inventory requests are not acquisitions.
(function(root){'use strict';
 const common=typeof module!=='undefined'&&module.exports;
 const data=common?require('../data/generated/combatGuardReplay.generated.js'):root.MOE_COMBAT_GUARD_REPLAY;
 const resources=common?require('./combatResourceFormula.js'):root.MOE_COMBAT_RESOURCE_FORMULA;
 function magicInput(id,p){
  const definition=data.definitions[id];if(!definition)throw Error('この相手魔法の反射用効果定義は未接続です。元入力の複製と効果量の対応を分けて扱います');
  if(p.guardReplayUnmodified!==true)throw Error('反射元の魔法が追加威力補正なし・対象への通常適合を満たす条件を指定してください');
  const {guardIncomingSkill:skill,guardIncomingMagic:magic,guardIncomingSkillAdjustment:adjustment}=p;
  if(!Number.isFinite(skill)||skill<0||skill>resources.skillMax||!Number.isFinite(magic)||magic<0||magic>1000||!Number.isFinite(adjustment))throw Error('反射元魔法の主技能・魔力・技能補正を指定してください');
  const x=resources.magicActionInput(Math.round(skill*10000),adjustment,magic);
  return {definition,x,y:x,skill,magic,seed:p.seed,evidence:data.evidence,
   scope:'元の魔法の格納入力と種値を複製して、元の使用者を対象に再要求する条件。防御使用者の技能・魔力で作り直さず、乱数を引き直さない。反射先の通常耐性と防御を別入力する。命中・受理・HP保存、再反射は別'};
 }
 function ammunition(id,p){
  const header=data.ammunition[id];if(!header)throw Error('相手の弾回収用ヘッダが未照合です');
  if(header.near||!header.zeroArea)return {supported:true,requested:false,count:0,reason:'元命令の非近接・範囲0の条件に該当しないため弾の取得要求なし',evidence:data.evidence};
  if(p.guardAmmoCondition!==true)throw Error('追加作用フラグ成立・回収禁止のない弾・通常PC・取得要求の作成可能という条件を指定してください');
  return {supported:true,requested:true,count:1,unit:'個',evidence:data.evidence,
   scope:'相手の格納弾IDが有効、禁止bit0x100000なし、保持者type1/state1、追加作用フラグ成立、取得レコードの作成可能という条件で1個の取得要求。所持品へ実際に追加された個数・自動回収総量ではない'};
 }
 const api=Object.freeze({magicInput,ammunition,definitions:data.definitions,evidence:data.evidence});
 if(common)module.exports=api;else root.MOE_COMBAT_GUARD_REPLAY_NUMERICS=api;
})(globalThis);
