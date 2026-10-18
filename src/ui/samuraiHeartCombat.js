(function(root){
  'use strict';
  const api=root.MOE_SAMURAI_HEART_COMBAT;
  function mount(){
    const panel=document.getElementById('samuraiHeartCombat');if(!panel||!api)return;
    const el=id=>document.getElementById('samurai'+id),numeric=id=>{
      if(el(id).value.trim()==='')throw new RangeError('数値欄を入力してください');
      return Number(el(id).value);
    };
    let session=api.create(),message='初期STを指定して「試行を初期化」を押してください。';
    const input=()=>({skill:numeric('Skill'),world:numeric('World'),caster:el('Caster').value,targetEligible:el('Eligible').checked});
    function render(){
      try{
        const p=api.plan(input()),cfg=collectConfig(),st=expandSkillSimMasteryBuffState(cfg.state);
        const before=computeMetrics(st,cfg.inputs),after=computeMetrics(st,{...cfg.inputs,samuraiHeartScenario:session});
        const def=api.defense(before.effectiveTargetAC,session),fmt=x=>Number(x).toFixed(3).replace(/\.?0+$/,'');
        const damage=m=>m.damagePrediction?.supported===false?'計算未対応':fmt(m.finalDamage)+(m.unsupportedBuffs?.length?'（対応分）':'');
        el('Preview').textContent=`次の使用：防御力 ${p.defensePct}% / ${fmt(p.durationSeconds)}秒 / 消費ST ${fmt(p.costST)}。入力変更は次回の使用から反映します。`;
        const details=api.attemptDetails(input());
        el('AttemptInfo').textContent=`表示成功率 ${details.displaySuccess.rate}%（実際の成否判定には未使用）。発動基値 ${details.activationRaw}・再使用基値 ${details.reuseRaw} は内部単位です。成否試行の使用前確認は資源を消費せず、不足情報を表示します。発動・再使用の秒換算は未確認です。`;
        el('Result').textContent=`経過 ${fmt(session.tick/60)}秒 / ST A ${fmt(session.casters.A.st)}・B ${fmt(session.casters.B.st)} / ${def.active?'有効（残り '+fmt(def.remainingSeconds)+'秒）':'効果なし'} / 対象防御力 ${fmt(def.before)} → ${fmt(def.after)} / 選択中の攻撃のダメージ ${damage(before)} → ${damage(after)}`;
        el('Message').textContent=message;
        el('History').textContent=session.events.slice(-8).map(e=>`${fmt(e.tick/60)}秒: ${e.caster} ${({applied:'適用',replaced:'更新',expired:'終了'})[e.type]}${e.costST!=null?' / ST消費 '+fmt(e.costST):''}`).join('\n');
      }catch(error){el('Message').textContent=error.message;el('Preview').textContent='入力を確認してください';el('Result').textContent='計算できません';}
    }
    function act(fn){try{fn();}catch(error){message=error.message;}render();}
    el('Reset').addEventListener('click',()=>act(()=>{session=api.create({stA:numeric('StA'),stB:numeric('StB')});message='試行を初期化しました';}));
    el('Use').addEventListener('click',()=>act(()=>{const r=api.use(session,input());session=r.state;message=r.reason;}));
    el('Attempt').addEventListener('click',()=>act(()=>{const r=api.use(session,{...input(),mode:'attempt'});session=r.state;message=r.reason;}));
    el('Advance').addEventListener('click',()=>act(()=>{session=api.advance(session,numeric('Seconds'));message='指定した時間を進めました';}));
    document.addEventListener('change',render);
    panel.addEventListener('input',render);
    render();
  }
  if(typeof document!=='undefined'){
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
  }
})(globalThis);
