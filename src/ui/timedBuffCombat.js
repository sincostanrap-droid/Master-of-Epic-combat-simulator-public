(function(root){
  'use strict';
  function mount(){
    const api=root.MOE_TIMED_BUFF_COMBAT,panel=document.getElementById('timedBuffCombat');if(!api||!panel)return;
    const el=id=>document.getElementById('timedBuff'+id);
    const number=id=>{if(el(id).value.trim()==='')throw Error('数値欄を入力してください');return Number(el(id).value);};
    const materialLabels={1671:'ND',1672:'NP',1673:'NQ',1674:'PNQ'};
    let session=api.create({A:{materials:{1672:30,1673:30,1674:30}},B:{materials:{1672:30,1673:30,1674:30}}}),message='成功した場合の試行です。対象プレイヤーAへ適用します。';
    const input=()=>({definitionId:number('Technique'),skill:number('Skill'),magic:number('Magic'),world:number('World'),caster:el('Caster').value,targetEligible:el('Eligible').checked,mode:el('Mode').value});
    function current(){const cfg=collectConfig(),st=expandSkillSimMasteryBuffState(cfg.state),capture={};return {cfg,st,before:computeMetrics(st,cfg.inputs,capture),capture};}
    const fmt=x=>Number(x).toFixed(3).replace(/\.?0+$/,'');
    function render(){try{
      const p=api.plan(input()),ctx=current(),after=computeMetrics(ctx.st,{...ctx.cfg.inputs,timedBuffScenario:session});
      el('Magic').disabled=p.definitionId===324;
      const costs=p.costs.map(c=>c.resource==='material'?`${materialLabels[c.id]} ${c.amount}個`:`${c.resource.toUpperCase()} ${fmt(c.amount)}`).join(' / ');
      const effect=Object.entries({flatAttack:'攻撃力',extraHit:'命中',extraAvoid:'回避',extraAC:'防御力',extraNeutralRes:'無耐性',extraFireRes:'火耐性',extraWaterRes:'水耐性',extraWindRes:'風耐性',extraEarthRes:'地耐性'}).filter(([key])=>p[key]!=null).map(([key,label])=>`${label} +${fmt(p[key])}`).join(' / ');
      el('Preview').textContent=`次の使用：${p.name} / ${effect}（変動なし基準値・属性強化なし） / ${fmt(p.durationSeconds)}秒 / ${costs} / ${p.definitionId===114?'範囲・対象条件が成立したプレイヤーAの1受信分':'対象プレイヤーA'}。変更は次の使用から反映。`;
      const details=api.attemptDetails(input());
      el('AttemptInfo').textContent=`表示成功率 ${details.displaySuccess.rate}%（実際の成否判定には未使用）。発動基値 ${details.activationRaw}・再使用基値 ${details.reuseRaw} は内部単位です。成否試行の使用前確認は資源を消費せず、不足情報を表示します。発動・再使用の秒換算は未確認です。`;
      const status=session.active.length?session.active.map(active=>`${active.name}・使用者${active.caster}・残り${fmt((active.endsAt-session.tick)/60)}秒`).join(' / '):'有効な試行Buffなし';
      const hitRate=m=>m.hitRatePct==null?'計算未対応':fmt(m.hitRatePct)+'%';
      const damage=m=>m.finalDamage==null?'計算未対応':fmt(m.finalDamage)+(m.unsupportedBuffs?.length?'（対応分）':'');
      const defenses=Object.entries({defense:'防御力',neutralRes:'無耐性',fireRes:'火耐性',waterRes:'水耐性',windRes:'風耐性',earthRes:'地耐性'}).map(([key,label])=>`${label} ${fmt(ctx.before.totalStats[key])} → ${fmt(after.totalStats[key])}`).join(' / ');
      el('Result').textContent=`経過 ${fmt(session.tick/60)}秒 / ${status} / プレイヤーAの攻撃力 ${fmt(ctx.before.atk)} → ${fmt(after.atk)} / 回避 ${fmt(ctx.before.totalStats.avoid)} → ${fmt(after.totalStats.avoid)} / 命中 ${fmt(ctx.before.playerHit)} → ${fmt(after.playerHit)} / ${defenses} / 選択中の攻撃のダメージ ${damage(ctx.before)} → ${damage(after)} / 命中率 ${hitRate(ctx.before)} → ${hitRate(after)}`;
      el('Resources').textContent=['A','B'].map(k=>`${k}: ST ${fmt(session.casters[k].st)} / MP ${fmt(session.casters[k].mp)} / `+Object.entries(materialLabels).map(([id,label])=>`${label} ${session.casters[k].materials[id]??'未指定'}個`).join(' / ')).join('　');
      el('Message').textContent=message;
      el('History').textContent=session.events.slice(-8).map(e=>`${fmt(e.tick/60)}秒 ${{114:'ホーリー ガード',158:'エレメンタル アーマー',131:'ヴィガー',142:'クイックニング',153:'エンライテン',324:'ナイト マインド'}[e.definitionId]} ${e.type==='expired'?'終了':e.type==='replaced'?'更新':'開始'}（使用者${e.caster}）`).join('\n');
    }catch(error){el('Message').textContent=error.message;el('Result').textContent='計算未対応／入力確認が必要です';}}
    function act(fn){try{fn();}catch(error){message=error.message;}render();}
    el('Use').addEventListener('click',()=>act(()=>{
      const ctx=current();api.assertCompatible(ctx.capture.resolvedBuffState,[...session.active.map(r=>r.definitionId),input().definitionId]);
      const r=api.use(session,input());session=r.state;message=r.reason;
    }));
    el('Attempt').addEventListener('click',()=>act(()=>{const r=api.use(session,{...input(),mode:'attempt'});session=r.state;message=r.reason;}));
    el('Advance').addEventListener('click',()=>act(()=>{session=api.advance(session,number('Seconds'));message='時間を進めました';}));
    el('Reset').addEventListener('click',()=>act(()=>{const initial={};for(const k of ['A','B'])initial[k]={st:number('St'+k),mp:number('Mp'+k),materials:{1671:number('Nd'+k),1672:number('Np'+k),1673:number('Nq'+k),1674:number('Pnq'+k)}};session=api.create(initial);message='試行を初期化しました';}));
    document.addEventListener('change',render);panel.addEventListener('input',render);render();
  }
  if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();}
})(globalThis);
