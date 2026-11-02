function ensurePetBuffCatalog() {
  const table=byId('compositeBuffTable'),api=globalThis.MOE_PET_BUFF_CATALOG;
  if(!table||!api||byId('petBuffCatalog'))return;
  const panel=document.createElement('details');panel.id='petBuffCatalog';panel.className='buffAddPanel';
  panel.innerHTML='<summary>ペットBuffをまとめて登録</summary><p class="small">支援モードで、習得済みのBuffがすべて付与された構成です。個別のON/OFFは行わず、ペット単位で取り外します。回復魔法など一時的な行動は含めません。</p>'+
    '<label>ペット <select id="petBuffChoice">'+api.catalogs.map(p=>'<option value="'+escapeAttr(p.id)+'">'+escapeHtml(p.name+'（'+p.mode+'）')+'</option>').join('')+'</select></label> '+
    '<label>レベル <input id="petBuffLevel" type="number" step="0.1" min="30" max="150" value="150"></label> '+
    '<button type="button" id="petBuffRegister">まとめて登録・更新</button><div id="petBuffPreview"></div>';
  table.before(panel);
  const preview=()=>{
    const pet=api.catalogs.find(p=>p.id===byId('petBuffChoice').value),level=byId('petBuffLevel');level.min=pet.minLevel;level.max=pet.maxLevel;
    try{const rows=api.build(pet.id,level.value);byId('petBuffRegister').disabled=!rows.length;
      byId('petBuffPreview').innerHTML='<p>'+rows.length+'枠（競合前）。同じペットの再登録は更新になります。</p>'+rows.map(r=>'<p><b>'+escapeHtml(r.name)+'</b>：'+escapeHtml(reviewedBuffCatalogEffectSummary(r))+'</p>').join('')+
       '<p class="small">効果量はwiki実測の参考値。実測点の間は直線補間、範囲外は未計算です。先に登録した競合Buffが優先されます。<a target="_blank" rel="noopener" href="'+escapeAttr(pet.url)+'">出典</a></p>';
    }catch(e){byId('petBuffPreview').textContent=e.message;byId('petBuffRegister').disabled=true;}
  };
  byId('petBuffChoice').onchange=preview;byId('petBuffLevel').oninput=preview;
  byId('petBuffRegister').onclick=()=>{
    state.composite=api.replace(state.composite,byId('petBuffChoice').value,byId('petBuffLevel').value);
    renderCompositeTable();calc();
  };preview();
}
function makePetBuffTableRow(row){
  const tr=document.createElement('tr');tr.className='compactCompositeMainRow fixedRow';
  for(const value of [true,true,true,false]){const td=document.createElement('td'),cb=document.createElement('input');cb.type='checkbox';cb.checked=value;cb.disabled=true;cb.title='ペット単位で登録・解除します';td.appendChild(cb);tr.appendChild(td);}
  const summary=document.createElement('td');summary.innerHTML='<b>'+escapeHtml(row.name)+'</b><div>'+escapeHtml(reviewedBuffCatalogEffectSummary(row))+'</div><div class="small">'+escapeHtml(row.note)+'</div>';tr.appendChild(summary);
  const source=document.createElement('td');source.textContent='ペット一括';tr.appendChild(source);
  const level=document.createElement('td');level.textContent='Lv'+fmt(row.catalogInputs.petLevel,1);tr.appendChild(level);
  const action=document.createElement('td'),button=document.createElement('button');button.type='button';button.textContent='このペットを外す';button.onclick=()=>{
    state.composite=state.composite.filter(r=>!globalThis.MOE_PET_BUFF_CATALOG.isPet(r)||r.catalogInputs?.petId!==row.catalogInputs.petId);renderCompositeTable();calc();
  };action.appendChild(button);tr.appendChild(action);return tr;
}
