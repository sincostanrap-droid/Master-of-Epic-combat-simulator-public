// Confirmed scalar sent to the view effect, independent of NPC perception.
(function(root){'use strict';
 function fogSetting(amount,admitted){
  if(!Number.isFinite(amount)||Math.abs(amount)>100000)throw Error('視界描画の設定値が未確定です');
  amount=Math.fround(amount);
  if(amount<0)return {supported:false,value:null,reason:'負の指定値は通常描画値を採用する。通常描画値が未取得なので0で代用しない'};
  return {supported:true,value:Math.max(0,Math.min(100,amount)),requested:amount,admitted:admitted===true?true:null,
   consumerProved:true,scope:'PC区分bit1の対象で、他の視界モードがなくこの要求が受理される場合。Bを直接設定し0～100へ制限、技能・魔力・保持倍率は掛けない。NPCの対象見失い・感知距離・画面の実視認距離は別',
   evidence:'dist/client-numeric-gaps17-20261015/fog-setting-native-oracle.json'};
 }
 const api=Object.freeze({fogSetting});if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MOE_COMBAT_VISUAL_NUMERICS=api;
})(globalThis);
