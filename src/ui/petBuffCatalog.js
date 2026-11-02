let petBuffCatalogSelectedId='';
function ensurePetBuffCatalog() {
  const table=byId('compositeBuffTable');
  if(!table||!globalThis.MOE_PET_BUFF_CATALOG||byId('petBuffCatalogOpen'))return;
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
  petBuffCatalogSelectedId=globalThis.MOE_PET_BUFF_CATALOG.catalogs[0]?.id||'';
  const overlay=document.createElement('div');overlay.id='petBuffCatalogOverlay';overlay.className='reviewedBuffCatalogOverlay';
  overlay.innerHTML=`<div class="reviewedBuffCatalogDialog reviewedBuffCatalogDialogScalable" role="dialog" aria-modal="true" aria-labelledby="petBuffCatalogTitle">
    <div class="reviewedBuffCatalogHeader"><div><h3 id="petBuffCatalogTitle">ペットBuffカタログ</h3><div class="small mutedText">ペットとレベルを選び、飼い主に付くBuffをまとめて登録します。</div></div><button type="button" id="petBuffCatalogClose">閉じる</button></div>
    <div class="reviewedBuffCatalogSearchBar"><input id="petBuffSearch" type="search" aria-label="ペット名・Buff名・効果を検索" placeholder="ペット名・Buff名・効果を検索"><span id="petBuffCount" class="small mutedText" aria-live="polite"></span></div>
    <div class="reviewedBuffCatalogBody"><div id="petBuffList" class="reviewedBuffCatalogList" aria-label="ペット一覧"></div><div class="reviewedBuffCatalogRight">
      <div class="reviewedBuffCatalogControls"><label id="petBuffLevelWrap">ペットのレベル<input id="petBuffLevel" type="number" step="0.1" min="30" max="150" value="150"></label></div>
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
  byId('petBuffRegister').onclick=()=>{
    if(!petBuffCatalogSelectedId)return;
    try{state.composite=globalThis.MOE_PET_BUFF_CATALOG.replace(state.composite,petBuffCatalogSelectedId,byId('petBuffLevel').value);}
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
  byId('petBuffCount').textContent=pets.length+' / '+api.catalogs.length+'種';
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
  byId('petBuffLevelWrap').hidden=!pet||!!pet.levelIndependent;
  byId('petBuffRegister').disabled=true;
  if(!pet){preview.textContent='ペットを選んでください。';return;}
  level.min=pet.minLevel;level.max=pet.maxLevel;level.disabled=!!pet.levelIndependent;
  try{
    const rows=api.build(pet.id,level.value);byId('petBuffRegister').disabled=!rows.length;
    preview.innerHTML='<h4>'+escapeHtml(pet.name)+'</h4><div class="small mutedText">'+escapeHtml(pet.mode)+'</div><div class="buffDurationBadge">使用Buff枠：'+rows.length+'枠（競合前）</div>'+
      '<p class="small">'+escapeHtml(pet.condition||(pet.levelIndependent?'レベルに依存しないサポート効果です。':'選んだモードのBuffが飼い主に付いている場合の効果です。'))+'</p>'+
      rows.map(r=>'<section class="petBuffEffect"><b>'+escapeHtml(r.name.slice(pet.name.length+1))+'</b><div class="reviewedBuffCatalogEffect">'+(r.catalogNumeric.estimatedFields.length?'<span class="reviewedBuffCatalogBaseline">参考値を含む</span>':'')+escapeHtml(reviewedBuffCatalogEffectSummary(r))+'</div></section>').join('')+
      '<p class="small">同じペットの再登録は更新になります。解除はペット単位です。</p><details class="compactCompositeInfo"><summary>参考値・重複について</summary><p class="small">参考値はwiki実測の目安です。実測点の間は直線補間し、範囲外は未計算とします。'+(pet.firstWins?'先に登録した競合Buffが優先されます。':'他のBuffとの重複可否は未確認です。')+'<a target="_blank" rel="noopener" href="'+escapeAttr(pet.url)+'">出典を見る</a></p></details>';
  }catch(e){preview.textContent=e.message;}
}
function makePetBuffTableRow(row){
  const tr=document.createElement('tr');tr.className='compactCompositeMainRow fixedRow';
  for(const value of [true,true,true,false]){const td=document.createElement('td'),cb=document.createElement('input');cb.type='checkbox';cb.checked=value;cb.disabled=true;cb.title='ペット単位で登録・解除します';td.appendChild(cb);tr.appendChild(td);}
  const summary=document.createElement('td');summary.innerHTML='<b>'+escapeHtml(row.name)+'</b><div>'+escapeHtml(reviewedBuffCatalogEffectSummary(row))+'</div><div class="small">'+escapeHtml(row.note)+'</div>';tr.appendChild(summary);
  const source=document.createElement('td');source.textContent='ペット一括';tr.appendChild(source);
  const level=document.createElement('td');level.textContent=apiPetLevelLabel(row);tr.appendChild(level);
  const action=document.createElement('td'),button=document.createElement('button');button.type='button';button.textContent='このペットを外す';button.onclick=()=>{
    state.composite=state.composite.filter(r=>!globalThis.MOE_PET_BUFF_CATALOG.isPet(r)||r.catalogInputs?.petId!==row.catalogInputs.petId);renderCompositeTable();calc();
  };action.appendChild(button);tr.appendChild(action);return tr;
}
function apiPetLevelLabel(row){return globalThis.MOE_PET_BUFF_CATALOG.catalogs.find(p=>p.id===row.catalogInputs.petId)?.levelIndependent?'固定効果':'Lv'+fmt(row.catalogInputs.petLevel,1);}
