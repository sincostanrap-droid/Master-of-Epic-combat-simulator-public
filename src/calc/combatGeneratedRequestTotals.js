// Explicit accepted-request counts are scenario inputs, never inferred AI rates.
(function(root){'use strict';
 function calculate(effects,{counts={},completeNonOverlapping=false}={}){
  const groups=new Map();
  for(const parent of effects.filter(e=>e.generatedActionBinding))for(const c of [parent.selectedChild,...parent.additionalChildren||[]].filter(Boolean)){
   // A child appearing on two generation edges is one selected action ID.
   // Its explicit count is the total across those edges, not a count per edge.
   if(!groups.has(c.id))groups.set(c.id,c);
   else if(!groups.get(c.id).ambiguous){const signature=q=>JSON.stringify([q.durationSeconds,q.physicalResult?.value,q.effects.filter(e=>['HP','MP','ST'].includes(e.unit)).map(e=>[e.id,e.supported,e.partial,e.recipient,e.value,e.count,e.total])]);if(signature(groups.get(c.id))!==signature(c))groups.set(c.id,{id:c.id,name:c.name,ambiguous:true});}
  }
  const parts=[],missing=[],totals=new Map();
  for(const [id,c] of groups){
   if(c.ambiguous){missing.push({id,name:c.name,reason:'同じ子行動が別の生成参照で異なる量になっています。参照ごとの回数対応が必要です'});continue;}
   const n=counts[id];if(n==null){missing.push({id,name:c.name,reason:'全生成参照を通じた、この子行動の受理回数が未指定です'});continue;}
   if(!Number.isInteger(n)||n<0||n>10000){missing.push({id,name:c.name,reason:'子行動の受理回数は0～10000の整数で指定してください'});continue;}
   if(Number.isInteger(c.maximumRequests)&&n>c.maximumRequests){missing.push({id,name:c.name,reason:'この生成作用はwikiの上限'+c.maximumRequests+'回を超える条件では合計できません'});continue;}
   if(n===0){parts.push({id,name:c.name,requests:0,quantities:[],scope:'この行動は起きないと明示した条件。未指定を0に置換したものではありません'});continue;}
   const q=[];let pending=false;
   if(c.physicalResult?.supported)q.push({effectId:id+':physical',name:'物理本体',operation:'損傷要求',recipient:'行動対象',value:c.physicalResult.value,unit:'HP',perActionCount:1});
   else if(c.physicalResult){pending=true;missing.push({id,name:c.name,reason:c.physicalResult.reason});}
   for(const e of c.effects){
    if(!e.supported||e.partial||!['HP','MP','ST'].includes(e.unit)||!Number.isFinite(e.value))continue;
    if(e.count>1||e.modeInfo?.update){
     if(completeNonOverlapping!==true){pending=true;missing.push({id,effectId:e.id,name:c.name,reason:'継続効果の全周期成立・途中更新/解除なし・行動間の保持重複なしの条件を指定してください'});continue;}
     if(!Number.isInteger(e.count)||!Number.isFinite(e.total)){pending=true;missing.push({id,effectId:e.id,name:c.name,reason:'この継続作用の有効周期数または初回込みの1行動小計が未確定です'});continue;}
    }
    if(n>1&&c.durationSeconds>0&&!(e.modeInfo?.initial&&!e.modeInfo.update)&&completeNonOverlapping!==true){pending=true;missing.push({id,effectId:e.id,name:c.name,reason:'保持が重ならず、各要求が同じ条件で成立する条件を指定してください'});continue;}
    q.push({effectId:e.id,name:e.name,operation:e.unit==='HP'&&[2,12,180].includes(e.kind)&&Number.isFinite(e.signedMessage)?e.signedMessage<0?'回復要求':'損傷要求':e.name,recipient:e.recipient==='使用者'?'生成体自身':'行動対象',value:e.count>1?e.total:e.value,unit:e.unit,perActionCount:e.count||1});
   }
   if(!q.length&&!pending)missing.push({id,name:c.name,reason:'この行動の加算可能な資源要求量は未確定です。能力補正・持続時間・生成レベルを足しません'});
   for(const e of q){e.requests=n;e.total=e.value*n;const key=e.recipient+'\0'+e.name+'\0'+e.unit,prior=totals.get(key);if(prior)prior.value+=e.total;else totals.set(key,{name:e.name,recipient:e.recipient,unit:e.unit,value:e.total});}
   parts.push({id,name:c.name,requests:n,quantities:q});
  }
  const recipientTotals=new Map();for(const part of parts)for(const q of part.quantities){const key=q.recipient+'\0'+q.operation+'\0'+q.unit,prior=recipientTotals.get(key);if(prior)prior.value+=q.total;else recipientTotals.set(key,{recipient:q.recipient,operation:q.operation,unit:q.unit,value:q.total});}
  return {supported:totals.size>0,partial:missing.length>0,parts,totals:[...totals.values()],recipientTotals:[...recipientTotals.values()],missing,automaticCountKnown:false,
   scope:'子行動ごとの指定受理回数を全生成参照で共有し、既知の資源要求だけを集計した条件付き小計。同じ対象条件と入力を維持。継続効果は全周期成立・途中更新/解除なし・行動間の保持重複なしを別途指定。自動発動回数・親の自動総量・実HP変化ではありません。能力補正や保持時間を加算しません。'};
 }
 const api=Object.freeze({calculate});if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MOE_COMBAT_GENERATED_REQUEST_TOTALS=api;
})(globalThis);
