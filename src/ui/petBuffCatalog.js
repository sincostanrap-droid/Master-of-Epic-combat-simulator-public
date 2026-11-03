let petBuffCatalogSelectedId='';
function ensurePetBuffCatalog() {
  const table=byId('compositeBuffTable');
  if(!table||!globalThis.MOE_PET_BUFF_CATALOG)return;
  ensurePetPartyControls(table);
  if(byId('petBuffCatalogOpen'))return;
  installReviewedBuffCatalogStyles();
  const button=document.createElement('button');button.id='petBuffCatalogOpen';button.type='button';button.className='buffCatalogPrimaryButton';
  button.setAttribute('aria-haspopup','dialog');
  button.innerHTML='<span class="buffCatalogPrimaryIcon">＋</span><span><b>ペットBuff</b><small>ペットを選んで支援効果をまとめて追加</small></span>';
  button.onclick=openPetBuffCatalog;
  const toolbar=byId('reviewedBuffCatalogOpen')?.parentElement||byId('reviewedBuffCatalogOpenHost');
  if(toolbar)toolbar.appendChild(button);else table.before(button);
}
function closePetBuffCatalog(){
  byId('petBuffCatalogOverlay')?.remove();
  byId('petBuffCatalogOpen')?.focus();
}
function openPetBuffCatalog(){
  closePetBuffCatalog();closeReviewedBuffCatalog();
  petBuffCatalogSelectedId=globalThis.MOE_PET_BUFF_CATALOG.catalogs.find(p=>p.id==='magia-bit')?.id||globalThis.MOE_PET_BUFF_CATALOG.catalogs[0]?.id||'';
  const overlay=document.createElement('div');overlay.id='petBuffCatalogOverlay';overlay.className='reviewedBuffCatalogOverlay';
  overlay.innerHTML=`<div class="reviewedBuffCatalogDialog reviewedBuffCatalogDialogScalable" role="dialog" aria-modal="true" aria-labelledby="petBuffCatalogTitle">
    <div class="reviewedBuffCatalogHeader"><div><h3 id="petBuffCatalogTitle">ペットBuffカタログ</h3><div class="small mutedText">ペットとレベルを選び、受けるBuffをまとめて登録します。</div></div><button type="button" id="petBuffCatalogClose">閉じる</button></div>
    <div class="reviewedBuffCatalogSearchBar"><input id="petBuffSearch" type="search" aria-label="ペット名・Buff名・効果を検索" placeholder="ペット名・Buff名・効果を検索"><span id="petBuffCount" class="small mutedText" aria-live="polite"></span></div>
    <div class="reviewedBuffCatalogBody"><div id="petBuffList" class="reviewedBuffCatalogList" aria-label="ペット一覧"></div><div class="reviewedBuffCatalogRight">
      <div class="reviewedBuffCatalogControls"><label id="petBuffLevelWrap">ペットのレベル<input id="petBuffLevel" type="number" step="0.1" min="30" max="150" value="150"></label><label id="petBuffExternalWrap"><input id="petBuffExternal" type="checkbox">他人のペットから範囲Buffを受ける（自分の3匹に含めない）</label></div>
      <div id="petBuffPreview" class="reviewedBuffCatalogPreview" aria-live="polite"></div>
      <div class="reviewedBuffCatalogActions"><button type="button" id="petBuffRegister">まとめて登録・更新</button><button type="button" id="petBuffCatalogCancel">キャンセル</button></div>
    </div></div></div>`;
  overlay.addEventListener('mousedown',event=>{if(event.target===overlay)closePetBuffCatalog();});
  overlay.addEventListener('keydown',event=>{
    if(event.key==='Escape'){event.preventDefault();closePetBuffCatalog();}
    if(event.key==='Tab'){
      const controls=[...overlay.querySelectorAll('button,input,a[href]')].filter(el=>!el.disabled&&!el.closest('[hidden]'));
      const first=controls[0],last=controls.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
    }
  });
  document.body.appendChild(overlay);
  byId('petBuffCatalogClose').onclick=closePetBuffCatalog;byId('petBuffCatalogCancel').onclick=closePetBuffCatalog;
  byId('petBuffSearch').oninput=renderPetBuffCatalogList;
  byId('petBuffLevel').oninput=renderPetBuffCatalogPreview;
  byId('petBuffExternal').onchange=()=>{byId('petBuffExternal').dataset.petId=petBuffCatalogSelectedId;renderPetBuffCatalogPreview();};
  byId('petBuffRegister').onclick=()=>{
    if(!petBuffCatalogSelectedId)return;
    try{const next=globalThis.MOE_PET_BUFF_CATALOG.replace(state.composite,petBuffCatalogSelectedId,byId('petBuffLevel').value,byId('petBuffExternal').checked?'external':'own');if(!acceptPetPartyRows(next)){byId('petBuffPreview').textContent='自分のペットはBuff目的以外も含めて3匹までです。先に使用中のペットを減らしてください。';return;}state.composite=next;}
    catch(e){byId('petBuffPreview').textContent=e.message;byId('petBuffRegister').disabled=true;return;}
    renderCompositeTable();calc();closePetBuffCatalog();
  };
  renderPetBuffCatalogList();byId('petBuffSearch').focus();
}
function renderPetBuffCatalogList(){
  const normalize=value=>String(value).normalize('NFKC').toLocaleLowerCase().replace(/\s+/g,'');
  const query=normalize(byId('petBuffSearch').value),api=globalThis.MOE_PET_BUFF_CATALOG;
  const pets=api.catalogs.filter(p=>normalize([p.name,p.mode,...p.buffs.flatMap(b=>[b.name,b.description])].join(' ')).includes(query));
  if(!pets.some(p=>p.id===petBuffCatalogSelectedId))petBuffCatalogSelectedId=pets[0]?.id||'';
  byId('petBuffCount').textContent=pets.length+' / '+api.catalogs.length+'件（モード別）';
  const list=byId('petBuffList');
  list.innerHTML=pets.length?pets.map(p=>`<button type="button" class="reviewedBuffCatalogCard${p.id===petBuffCatalogSelectedId?' selected':''}" data-pet-catalog-id="${escapeAttr(p.id)}" aria-pressed="${p.id===petBuffCatalogSelectedId}">
    <span class="reviewedBuffCatalogCardTitle">${escapeHtml(p.name)}</span><span class="reviewedBuffCatalogCardMeta">${escapeHtml(p.mode)} · ${p.levelIndependent?'レベル非依存':'Lv'+p.buffs[0].level+'から'} · 最大${p.buffs.length}枠</span>
    <span class="reviewedBuffCatalogCardEffect">${escapeHtml([...new Set(p.buffs.map(b=>b.description))].join('／'))}</span></button>`).join(''):'<p class="reviewedBuffCatalogEmpty">該当するペットがありません。検索語を変えてください。</p>';
  list.querySelectorAll('[data-pet-catalog-id]').forEach(button=>button.onclick=()=>{
    petBuffCatalogSelectedId=button.dataset.petCatalogId;
    for(const card of list.querySelectorAll('[data-pet-catalog-id]')){
      const selected=card.dataset.petCatalogId===petBuffCatalogSelectedId;card.classList.toggle('selected',selected);card.setAttribute('aria-pressed',String(selected));
    }
    renderPetBuffCatalogPreview();
  });
  renderPetBuffCatalogPreview();
}
function renderPetBuffCatalogPreview(){
  const api=globalThis.MOE_PET_BUFF_CATALOG,pet=api.catalogs.find(p=>p.id===petBuffCatalogSelectedId),level=byId('petBuffLevel'),preview=byId('petBuffPreview');
  const external=byId('petBuffExternal'),allowed=!!pet&&MOE_PET_PARTY.canReceive(pet.id);
  byId('petBuffExternalWrap').hidden=!allowed;external.disabled=!allowed;
  if(external.dataset.petId!==pet?.id){
    external.checked=allowed&&(state.composite||[]).some(r=>r.catalogInputs?.petId===pet.id&&MOE_PET_PARTY.source(r)==='external');
    external.dataset.petId=pet?.id||'';
  }
  if(!allowed)external.checked=false;
  byId('petBuffLevelWrap').hidden=!pet||!!pet.levelIndependent;
  byId('petBuffRegister').disabled=true;
  if(!pet){preview.textContent='ペットを選んでください。';return;}
  level.min=pet.minLevel;level.max=pet.maxLevel;level.disabled=!!pet.levelIndependent;
  try{
    const rows=api.build(pet.id,level.value),actor=rows.find(r=>r.catalogNumeric.inputs.petActor)?.catalogNumeric.inputs.petActor;byId('petBuffRegister').disabled=!rows.length;
    preview.innerHTML='<h4>'+escapeHtml(pet.name)+'</h4><div class="small mutedText">'+escapeHtml(pet.mode)+'</div><div class="buffDurationBadge">使用Buff枠：'+rows.length+'枠（競合前）</div>'+
      '<p class="small">'+escapeHtml(pet.condition||(pet.levelIndependent?'レベルに依存しないサポート効果です。':'選んだモードのBuffが飼い主に付いている場合の効果です。'))+'</p>'+
      (actor?'<p class="small">ペットのスキル '+escapeHtml(actor.skill.toFixed(1))+'・魔力 '+escapeHtml(actor.magic.toFixed(1))+' から計算（追加Buffなし）。効果量は変動の基準値です。</p>':'')+
      rows.map(r=>'<section class="petBuffEffect"><b>'+escapeHtml(r.name.slice(pet.name.length+1))+'</b><div class="reviewedBuffCatalogEffect">'+(r.catalogNumeric.values.some(v=>v.estimated)||r.catalogNumeric.times.some(t=>t.estimated)?'<span class="reviewedBuffCatalogBaseline">参考値を含む</span>':'')+escapeHtml(reviewedBuffCatalogEffectSummary(r))+'</div></section>').join('')+
      '<p class="small">'+(external.checked?'他人のペットから受ける範囲Buffです。自分のペット数には含めず、Buff枠は使います。':'採用時は自分のペット1匹分を使います。Buff以外のペットと合わせて3匹までです。')+'</p>'+
      '<p class="small">未使用・固定なしの候補として追加します。最適化で採用すると、このペットのBuffはすべて連動します。未使用の候補も探す設定で検索してください。同じペットの更新時は使用・固定・除外の指定を保持します。</p><details class="compactCompositeInfo"><summary>計算値・参考値・重複について</summary><p class="small">式が確認できた効果はレベルから計算します。自然回復の分間量には時間換算の推定を含みます。その他の参考値はwiki実測の目安です。実測点の間は直線補間し、範囲外は未計算とします。'+escapeHtml(pet.competition||(pet.firstWins?'先に登録した競合Buffが優先されます。':'他のBuffとの重複可否は未確認です。'))+'<a target="_blank" rel="noopener" href="'+escapeAttr(pet.url)+'">出典を見る</a></p></details>';
  }catch(e){preview.textContent=e.message;}
}
function makePetBuffTableRow(row){
  const tr=document.createElement('tr');tr.className='compactCompositeMainRow'+(row.fixed?' fixedRow':'')+(row.excluded?' excludedRow':'');
  for(const [prop,label] of [['enabled','使用'],['slot','枠使用'],['fixed','固定'],['excluded','除外']]){
    const td=document.createElement('td'),cb=document.createElement('input');cb.type='checkbox';cb.checked=prop==='slot'||!!row[prop];cb.disabled=prop==='slot';
    cb.title=prop==='slot'?'採用時は付与されるBuffすべての枠を使います':'同じペットのBuffをまとめて'+label;cb.setAttribute('aria-label',row.name+'：'+label);
    cb.onchange=()=>{
      const next=globalThis.MOE_PET_BUFF_CATALOG.setControls(state.composite,row.catalogInputs.petId,prop,cb.checked);
      if(!acceptPetPartyRows(next)){cb.checked=!!row[prop];return;}
      state.composite=next;renderCompositeTable();calc();
    };
    td.appendChild(cb);tr.appendChild(td);
  }
  const summary=document.createElement('td');summary.innerHTML='<b>'+escapeHtml(row.name)+'</b><div>'+escapeHtml(reviewedBuffCatalogEffectSummary(row))+'</div><div class="small">'+escapeHtml(row.note)+'</div>';tr.appendChild(summary);
  const source=document.createElement('td');
  if(MOE_PET_PARTY.canReceive(row.catalogInputs.petId)){
    const label=document.createElement('label'),external=document.createElement('input');external.type='checkbox';external.checked=MOE_PET_PARTY.source(row)==='external';
    external.setAttribute('aria-label',row.name+'：他人のペットから受ける範囲Buff');
    external.onchange=()=>{
      const next=MOE_PET_PARTY.withSource(state.composite,row.catalogInputs.petId,external.checked?'external':'own');
      if(!acceptPetPartyRows(next)){external.checked=MOE_PET_PARTY.source(row)==='external';return;}
      state.composite=next;renderCompositeTable();calc();
    };
    label.appendChild(external);const text=document.createElement('span');text.textContent='他人から受ける';label.appendChild(text);source.appendChild(label);
  }else source.textContent='自分のペット';
  tr.appendChild(source);
  const level=document.createElement('td');level.textContent=apiPetLevelLabel(row);tr.appendChild(level);
  const action=document.createElement('td'),button=document.createElement('button');button.type='button';button.textContent='このペットを外す';button.onclick=()=>{
    state.composite=state.composite.filter(r=>!globalThis.MOE_PET_BUFF_CATALOG.isPet(r)||r.catalogInputs?.petId!==row.catalogInputs.petId);renderCompositeTable();calc();
  };action.appendChild(button);tr.appendChild(action);return tr;
}
function apiPetLevelLabel(row){return globalThis.MOE_PET_BUFF_CATALOG.catalogs.find(p=>p.id===row.catalogInputs.petId)?.levelIndependent?'固定効果':'Lv'+fmt(row.catalogInputs.petLevel,1);}

function ensurePetPartyControls(table){
  if(!byId('petPartyControls')){
    const panel=document.createElement('div');panel.id='petPartyControls';panel.className='small';
    panel.innerHTML='<label>Buff目的以外のペット <input id="petPartyOtherPets" type="number" min="0" max="3" step="1" value="0" style="width:5em"> 匹</label><p id="petPartyStatus" role="status" aria-live="polite"></p><p>自分のペットは合計3匹まで。ペットBuffの候補は複数登録でき、最適化で使うペットを選びます。他人から受ける範囲BuffもBuff枠を使います。手入力で追加したペットBuffは自動では数えないため、そのペット数も上の欄に含めてください。</p>';
    table.before(panel);
    byId('petPartyOtherPets').onchange=()=>{
      const input=byId('petPartyOtherPets'),n=Number(input.value);
      if(input.value===''||!Number.isInteger(n)||n<0||n>3){updatePetPartyControls();byId('petPartyStatus').textContent='ペット数は0〜3の整数で入力してください。';return;}
      state.petParty={otherPets:n};calc();updatePetPartyControls();
    };
  }
  updatePetPartyControls();
}
function updatePetPartyControls(){
  const input=byId('petPartyOtherPets'),status=byId('petPartyStatus');if(!input||!status)return;
  const u=MOE_PET_PARTY.usage(state);input.value=String(u.other);
  status.textContent=`自分のペット：${u.total}/3匹（Buff用 ${u.own}匹 ＋ その他 ${u.other}匹）／他人から受ける：${u.external}組`+(u.excess?'。3匹を超えています。登録は保持していますが、この構成は最適化結果として採用できません。':'');
  status.style&&(status.style.color=u.excess?'#b42318':'');
}
function acceptPetPartyRows(rows){
  const before=MOE_PET_PARTY.usage(state),after=MOE_PET_PARTY.usage({...state,composite:rows});
  if(after.excess>before.excess){
    updatePetPartyControls();const status=byId('petPartyStatus');
    if(status)status.textContent='自分のペットはBuff目的以外も含めて3匹までです。使用中のペットを減らすか、範囲Buffを他人から受ける指定にしてください。';
    return false;
  }
  return true;
}
