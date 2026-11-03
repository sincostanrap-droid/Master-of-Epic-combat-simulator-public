// Ownership is separate from Buff slots. Only reviewed area supports can be external.
(function(root){'use strict';
 const areaPets=new Set(['tuxedo-dog','harmonica-panda','yukata-finyu','idol-finyu-area','summer-fish','dearstage','blazermates','elemental-plulume']);
 const isPet=r=>r?.catalogSource==='pet-owner-buff-v1'&&!!r.catalogInputs?.petId;
 const canReceive=id=>areaPets.has(id);
 const source=r=>isPet(r)&&canReceive(r.catalogInputs.petId)&&r.catalogInputs.petSource==='external'?'external':'own';
 function normalize(value){const n=Number(value?.otherPets??0);return {otherPets:Number.isFinite(n)?Math.max(0,Math.min(3,Math.trunc(n))):0};}
 function usage(state){
  const own=new Set(),external=new Set();
  for(const r of state?.composite||[]){if(!isPet(r)||!r.enabled||r.excluded)continue;
   // Count before Buff competition: a present pet still occupies a pet slot.
   (source(r)==='external'?external:own).add(r.catalogInputs.petFamily||r.catalogInputs.petId);
  }
  const other=normalize(state?.petParty).otherPets,total=own.size+other;
  return {own:own.size,external:external.size,other,total,limit:3,excess:Math.max(0,total-3)};
 }
 function withSource(rows,id,value){
  if(!['own','external'].includes(value)||value==='external'&&!canReceive(id))throw Error('他人から受ける指定は、確認済みの範囲Buffだけで使用できます');
  return rows.map(r=>isPet(r)&&r.catalogInputs.petId===id?{...r,catalogInputs:{...r.catalogInputs,petSource:value}}:r);
 }
 const api={isPet,canReceive,source,normalize,usage,withSource};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MOE_PET_PARTY=api;
})(globalThis);
