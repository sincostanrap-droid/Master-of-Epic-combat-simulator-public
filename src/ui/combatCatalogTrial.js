(function(root){'use strict';
 function mount(){
  const index=root.MOE_COMBAT_CATALOG_INDEX,api=root.MOE_COMBAT_CATALOG_ENGINE;if(!index||!api||!document.getElementById('combatCatalogTrial'))return;
  let basicRelevant=null;
  const basicDefaults={Skill:100,Magic:100,Attack:100,World:0,Defense:100,Resistance:50};
  const el=key=>document.getElementById('combatCatalog'+key),num=key=>{if(basicRelevant&&Object.hasOwn(basicDefaults,key)&&!basicRelevant.has(key))return basicDefaults[key];const text=el(key).value.trim();if(!text)throw Error('数値を入力してください');const n=Number(text);if(!Number.isFinite(n))throw Error('有限の数値を入力してください');return n;};
  let latestNumericInputs=null;
  let state=api.create(),compiled=null,version=0,loading=null,skillNames={},renderTimer=null;
  const cache=new Map(),skillInputs=new Map(),bladeOnlySkills=new Set(),generatedSkillInputs=new Map(),generatedRequestCountInputs=new Map(),metricCache=new Map(),workspace=el('Trial');
  const normalize=s=>s.normalize('NFKC').replace(/\s/g,'').toLowerCase();
  const selectableEntries=index.entries.filter(row=>!row.scopeExcluded&&!root.MOE_COMBAT_SCOPE_EXCLUSIONS?.exclusion(row));
  const outcomeCoverageByKey=new Map(selectableEntries.filter(row=>row.outcomeCoverage).map(row=>[row.key,row.outcomeCoverage]));
  const searchEntries=selectableEntries.map(row=>({row,searchName:normalize([row.name,...(row.aliases||[])].join(' '))}));
  const filterData=root.MOE_COMBAT_CATALOG_FILTERS||{skills:[],types:{},rows:{}};
  for(const name of filterData.skills){const option=document.createElement('option');option.value=name;option.textContent=name;el('PickerSkill')?.append(option);}
  for(const [key,name]of Object.entries(filterData.types)){const option=document.createElement('option');option.value=key;option.textContent=name;el('PickerType')?.append(option);}

  for(const d of Object.values(root.MOE_COMBAT_NUMERICS?.guardIncomingActions||{})){
   const option=document.createElement('option');option.value=String(d.id);option.textContent=d.name+' / '+(d.actionType===1?'魔法':d.near?'近接物理':'遠隔物理');el('GuardIncomingAction').append(option);
  }
  for(const d of Object.values(root.MOE_COMBAT_NUMERICS?.guardShields||{})){
   const option=document.createElement('option');option.value=String(d.id);option.textContent=d.name+'（盾 '+d.required+'）';el('GuardShield').append(option);const reverseOption=document.createElement('option');reverseOption.value=String(d.id);reverseOption.textContent=option.textContent;el('ReverseReferenceNpcShield').append(reverseOption);
  }
  for(const d of Object.values(root.MOE_COMBAT_NUMERICS?.targetPhysicalReductions||{})){const option=document.createElement('option');option.value=String(d.id);option.textContent=d.name+'（'+Number(d.effects[0].value.toFixed(1))+'%）';el('TargetPhysicalReduction').append(option);}
  for(const d of Object.values(root.MOE_COMBAT_NUMERICS?.targetMagicReductions||{})){const option=document.createElement('option');option.value=String(d.id);option.textContent=d.name+'（'+Number(d.effects[0].value.toFixed(1))+'%）';el('TargetMagicReduction').append(option);}
  for(const d of Object.values(root.MOE_COMBAT_NUMERICS?.magicRanges||{})){const option=document.createElement('option');option.value=String(d.id);option.textContent=d.name;el('RangeAction').append(option);}
  for(const d of root.MOE_COMBAT_RECOGNITION_NUMERICS?.npcOptions||[]){const option=document.createElement('option');option.value=d.value;option.textContent=d.name+'（標準設定）';el('RecognitionProfile').append(option);}
  for(const d of Object.values(root.MOE_COMBAT_NUMERICS?.npcInterruptionProfiles||{})){const option=document.createElement('option');option.value=d.key;option.textContent=d.name+'（標準設定）';el('InterruptNpcProfile').append(option);}
  for(const d of Object.values(root.MOE_COMBAT_NUMERICS?.replacementOptions||{})){const option=document.createElement('option');option.value=String(d.id);option.textContent=d.name;el('ReplacementBuff').append(option);}
  const fmt=v=>String(Number(v));
  const display=(value,resource=false)=>root.MOE_COMBAT_CONDITION_INPUTS?.displayText(value,resource)??String(value??'');
  const utilityTime=t=>!t.supported?'不明（'+(t.reason||'時間を確定する情報が不足')+'）':t.nonPersistent?'持続Buff指定なし（動作時間とは別）':t.finiteDuration===false?'固定秒数なし':(t.seconds===0?'即時（本体）':fmt(t.seconds)+'秒')+(t.partial?'（本体のみ。付随時間は不明）':'')+(t.kind?' / '+t.kind:'');
  const conditionDefaults=new Map();
  for(const node of document.querySelectorAll?.('#combatCatalogTrial .combatTrialExtras input, #combatCatalogTrial .combatTrialExtras select, #combatCatalogTrial .combatTrialExtras textarea')||[]){
   if(node.id)conditionDefaults.set(node.id,{value:node.value,checked:node.checked});
  }
  let relevantConditions=null;
  function resetAdditionalInputs(){
   for(const [id,initial]of conditionDefaults){const node=document.getElementById(id);node.value=initial.value;if(node.type==='checkbox')node.checked=initial.checked;}
  }
  function filterAdditionalInputs(){
   if(!root.MOE_COMBAT_CONDITION_INPUTS)return;
   basicRelevant=root.MOE_COMBAT_CONDITION_INPUTS.basicForBundle(compiled?.bundle);
   for(const key of Object.keys(basicDefaults)){const label=el(key).closest?.('label');if(label)label.hidden=!basicRelevant.has(key);}
   for(const key of ['Attack','Magic'])if(el('UseCurrent'+key)){el(key).disabled=el('UseCurrent'+key).checked;if(el(key+'CurrentValue')){const m=calculationMetrics().value;el(key+'CurrentValue').textContent='現在ステータス：'+root.MOE_COMBAT_CONDITION_INPUTS.displayNumber(key==='Attack'?m.atk:m.stats.magic);}}
   if(el('RegisterCurrent'))el('RegisterCurrent').hidden=!(compiled&&root.MOE_COMBAT_BUFF_CATALOG_BRIDGE?.availability(compiled.bundle.row.key).available);
   el('SkillEvidence').hidden=!basicRelevant.has('Skill');
   if(compiled&&basicRelevant.has('Skill'))el('SkillEvidence').textContent='計算に使うスキル：'+(skillNames[compiled.bundle.row.definition?.primary_raw]||'未確認')+(basicRelevant.has('Magic')?'。魔力も入力してください。':'。');
   const bladeDefinitions=compiled?root.MOE_COMBAT_NUMERICS.bladeInputs(compiled.bundle,el('BladeMode').value):[];
   const selectedBladeSkills=new Set(bladeDefinitions.map(d=>skillNames[d.primary_raw]));
   for(const name of bladeOnlySkills){const label=skillInputs.get(name)?.closest?.('label');if(label)label.hidden=!selectedBladeSkills.has(name);}
   for(const key of ['BladeWeaponAttack','BladeWeaponHit']){const label=el(key)?.closest?.('label');if(label)label.hidden=!bladeDefinitions.some(d=>d.action_type===2);}
   relevantConditions=root.MOE_COMBAT_CONDITION_INPUTS.forBundle(compiled?.bundle,root.MOE_COMBAT_NUMERICS,{guardIncomingAction:el('GuardIncomingAction').value,guardShieldId:el('GuardShield').value,summonSelected:el('SummonBaseVariant').checked,bladeMode:el('BladeMode').value});
   const extras=document.querySelector?.('#combatCatalogTrial .combatTrialExtras');if(!extras)return;if(!compiled){extras.hidden=true;return;}
   // Restore only visibility that this filter owns. Existing route-specific
   // containers retain their own visibility decisions.
   for(const group of extras.querySelectorAll('[data-condition-auto-hidden]')){group.hidden=false;group.removeAttribute('data-condition-auto-hidden');}
   const generated=root.MOE_COMBAT_NUMERICS.generatedInputChildren(compiled.bundle),showGenerated=generated.length>0&&el('SummonBaseVariant').checked;
   el('GeneratedInputConditions').hidden=!showGenerated;
   el('GeneratedPhysicalFields').hidden=!showGenerated||!el('GeneratedUnmodified').checked||!generated.some(d=>d.action_type===2);
   el('GeneratedMagicLabel').hidden=!showGenerated||!el('GeneratedUnmodified').checked||!generated.some(d=>d.action_type===1);
   el('GeneratedSkills').hidden=!showGenerated||!el('GeneratedUnmodified').checked||(!el('GeneratedTrapLevelLabel').hidden&&el('GeneratedTrapLevel').checked);

   for(const label of extras.querySelectorAll('label')){
    const controls=[...label.querySelectorAll('input,select,textarea')];
    if(!controls.length)continue;
    if(['combatCatalogGeneratedTrapLevelLabel','combatCatalogGeneratedMagicLabel'].includes(label.id))continue;
    label.hidden=!controls.some(n=>relevantConditions.has(n.id.replace('combatCatalog',''))||!conditionDefaults.has(n.id));
   }
   const visibleControl=node=>{for(let p=node.parentElement;p&&p!==extras;p=p.parentElement)if(p.hidden)return false;return true;};
   for(const group of [...extras.querySelectorAll('details,fieldset')].reverse()){
    if(group.hidden)continue;
    if(![...group.querySelectorAll('input,select,textarea')].some(visibleControl)){group.hidden=true;group.setAttribute('data-condition-auto-hidden','');}
   }
   for(const note of extras.querySelectorAll('p,small')){
    const previous=note.previousElementSibling;
    if(previous?.tagName==='LABEL')note.hidden=previous.hidden;
   }
   extras.hidden=![...extras.querySelectorAll('input,select,textarea')].some(visibleControl);
  }
  // Present already-computed values; keep the complete native-derived text in
  // Numbers. Cards do not recalculate quantities or turn unknowns into zero.
  // Presentation only: retain full evidence in Numbers for offline diagnostics.
  function playerText(value){
   let text=String(value??'');
   // Explain unsupported implementation details as limitations, never as zero.
   text=text.replace(/[^。\n]*?(?:0x[0-9a-f]+|actor\s*\+|world\s*\+|NPC\s*\+|\bM\s*\/\s*A\b|未mark)[^。\n]*(?:。|$)/gi,
    'この計算に必要な状態・補正には未確認の部分があります。');
   const words=[
    [/このブレイドが最初の有効候補として選ばれ、追撃が成立する条件を指定してください/g,'「ブレイドの追撃」で、追撃が発生・命中する条件を指定してください'],
    [/子候補（親未照合）ID\d+\s*\/\s*/g,'爆発候補：'],
    [/kind\s*[:=：]?\s*\d+|効果番号?\s*\d+|効果\d+/gi,'追加効果'],
    [/参照キー\s*[:=：]?\s*\d+/g,'追加効果の種類（未確認）'],[/selector\s*[:=：]?\s*\d+/gi,'対象区分（名称未確認）'],
    [/flags\s*[:=：]?\s*\d+/gi,'適用条件'],[/mode\s*[:=：]?\s*\d+/gi,'適用条件'],
    [/interval\s*[:=：]?\s*1\b/g,'通常の時間経過'],[/elapsed/g,'経過値（秒換算前）'],
    [/内部定義|保存定義/g,'設定'],[/内部カウンタ/g,'経過値（秒換算前）'],[/内部整数/g,'計算値（単位換算なし）'],
    [/内部値/g,'計算値（単位換算なし）'],[/参照先/g,'追加効果'],[/参照連鎖/g,'一連の追加効果'],
    [/参照小計/g,'追加効果の小計'],[/参照合計/g,'追加効果の合計'],[/参照総量/g,'追加効果の合計'],
    [/親全体の総量|親の総量/g,'技全体の合計'],[/親と子/g,'本体と追加効果'],[/子行動|子要求|持続子/g,'追加効果'],
    [/生成体/g,'召喚・設置物'],[/生成行動/g,'召喚・設置物の攻撃'],[/HP要求量/g,'HP変化量'],
    [/損傷要求/g,'ダメージ'],[/受理/g,'適用'],[/1要求|成立した1要求/g,'1回'],[/要求合計/g,'効果の合計'],
    [/指定種値/g,'指定したばらつき'],[/15bit/g,'乱数'],[/未照合|照合待ち/g,'未確認'],
    [/wikiと設定を照合/g,'確認できている効果'],[/保存初期設定|第0亜種・保存初期設定/g,'標準状態'],
    [/基底定義/g,'標準設定'],[/発行/g,'発生'],[/実ID|爆発ID/g,'実際に発生する効果の種類'],
    [/HP受信更新は未接続/g,'実際のHP残量は更新しません'],[/状態ハンドラ未実装/g,'状態への適用は未対応'],[/適用未接続/g,'状態への反映なし'],[/残件[：:]/g,'計算できない効果：'],
    [/元レコードを保持した移送要求件数/g,'効果量・残り時間を引き継ぐ件数'],[/元レコード/g,'移す前の効果'],[/受信可否/g,'対象への適用条件'],[/分類適合/g,'移せる効果の種類'],[/既存攻撃計算・平均/g,'攻撃ダメージ・平均'],[/残存時間/g,'残り時間'],[/内部elapsed/g,'経過値（秒換算前）'],[/単独成立/g,'単独で発生'],[/公称/g,'設定上の'],
   ];
   for(const [pattern,replacement]of words)text=text.replace(pattern,replacement);text=text.replace(/技能/g,'スキル');
   return text;
  }
  function readTransferEffects(raw){
   if(raw.trim().startsWith('[')){
    try{return JSON.parse(raw);}catch(_){throw Error('移す効果の入力形式を確認してください');}
   }
   const records=raw.split(/\r?\n/).filter(line=>line.trim());
   if(records.length>24)throw Error('移す効果は24件以内で入力してください');
   return records.map((line,i)=>{
    const fields=line.split(/[|｜]/).map(v=>v.trim());
    if(fields.length!==6)throw Error((i+1)+'行目：効果名｜分類｜残り秒｜能力名｜効果量｜単位 の順に入力してください');
    const [name,category,remaining,quantity,value,unit]=fields;
    const type={Buff:'buff',buff:'buff',Debuff:'debuff',debuff:'debuff',DoT:'dot',dot:'dot','継続ダメージ':'dot'}[category];
    if(!name||!type||!remaining||!quantity||!value||!unit||!Number.isFinite(Number(remaining))||Number(remaining)<0||!Number.isFinite(Number(value)))throw Error((i+1)+'行目：分類・残り時間・効果量を確認してください');
    return {key:name+'-'+i,category:type,eligible:true,remainingSeconds:Number(remaining),quantities:[{name:quantity,value:Number(value),unit}]};
   });
  }
  function showSummary(result,scoped,operations=[],error='',status='入力を確認'){
   const host=el('Summary'),badge=el('NumericStatus');if(!host||!badge)return;host.replaceChildren();
   const text=(className,value)=>{const node=document.createElement('div');node.className=className;node.textContent=display(playerText(value));return node;};
   const sections={};for(const [key,title]of [['damage','ダメージ'],['recovery','回復・吸収'],['stats','Buff／Debuff'],['time','持続時間'],['other','その他の効果']]){
    const section=document.createElement('section');section.className='combatTrialResultGroup combatTrialResultGroup-'+key;section.hidden=true;
    const heading=document.createElement('h4');heading.textContent=title;const grid=document.createElement('div');grid.className='combatTrialResultGrid';section.append(heading);section.append(grid);host.append(section);sections[key]={section,grid};
   }
   const notice=value=>host.append(text('combatTrialNotice',value));let cards=0;
   for(const note of compiled?.bundle?.row.numericConditions||[])notice(note);
   const card=(name,value,note)=>{const node=document.createElement('div');node.className='combatTrialValueCard';
    const resource=/(?:HP|MP|ST|ダメージ|回復量|損傷量|消費量)/i.test(name)&&!/(?:倍率|割合|確率|威力補正)/.test(name)&&!/(?:%|％|倍|ポイント)/.test(String(value));
    const damage=/(?:ダメージ|損傷|物理本体|子攻撃)/.test(name)&&!/(?:回復|吸収)/.test(name);
    const recovery=/(?:回復|吸収)/.test(name),resourceUnit=String(value).match(/(?:HP|MP|ST)/)?.[0];
    const label=recovery&&resourceUnit&&!/(?:HP|MP|ST)/.test(name)?resourceUnit+name:name;
    const resultValue=display(value,resource),resultNote=display(note,resource);
    node.append(text('combatTrialValueLabel',damage?name.replace(/^HP/, ''):label));node.append(text('combatTrialValue',damage?resultValue.replace(/HP/g,''):recovery?resultValue.replace(/(?:HP|MP|ST)/g,''):resultValue));if(note)node.append(text('combatTrialValueNote',damage?resultNote.replace(/HP/g,''):resultNote));const category=/(?:時間|寿命|終了|保持区間|持続指定)/.test(name)?'time':/(?:回復|吸収)/.test(name)?'recovery':/(?:ダメージ|損傷|物理本体|子攻撃)/.test(name)?'damage':/(?:魔力|攻撃力|防御|命中|回避|耐性|速度|威力|補正|倍率|最大HP|最大MP|最大ST|重量|クリティカル)/.test(name)?'stats':'other';
    sections[category].section.hidden=false;sections[category].grid.append(node);cards++;};
   if(error){badge.textContent=status;notice(error);return;}
   const unresolvedOutcomes=(outcomeCoverageByKey.get(compiled?.bundle?.row.key)||[]).filter(q=>['一部対応','計算未対応'].includes(q.amount));
   if(unresolvedOutcomes.length)notice('表示値は選択した結果・対象条件での値です。技全体には未確定の条件が残ります：'+unresolvedOutcomes.map(q=>q.name||String(q.id)).join('、'));
   badge.textContent=scoped?.utilityScope?(scoped.utilityScope.whole?'効果説明・判明時間':'数値計算＋用途説明'):scoped?.existingCalculation?'既存計算を利用':scoped?.descriptionOnly?'説明対応':scoped?.conditionalRequestSupported?'効果量：対応（条件付き・1回）':scoped?.amountStatus?'効果量：'+scoped.amountStatus:'指定条件の値';
   if(scoped?.conditionalNumerics?.length){
    notice('数値計算の範囲：指定条件で成立した1回分。実際の成否・状態更新・自動発動する全期間の総量は別です。');
    for(const condition of new Set(scoped.conditionalNumerics.map(q=>q.conditions)))notice('計算条件：'+condition);
   }
   if(result&&scoped?.utilityScope?.whole&&result.effects.some(e=>e.generatedActionBinding&&e.selectedChild?.inputCondition)){badge.textContent='参考・生成行動の条件付き計算';notice('この技の標準の対応範囲は効果説明・判明時間です。追加表示は生成体自身の指定入力による1要求で、召喚能力や親の総量の完成ではありません。');}
   if(result?.effects.some(e=>e.generatedActionBinding?.semanticSource&&e.selectedChild?.inputCondition&&!e.selectedChild.inputCondition.independent))notice('発生元が通常NPCで、入力した現在のスキル・攻撃力・命中を持つ条件の計算です。使用者のスキルを引き継ぐ経路や、実際の召喚・設置物の能力値は未確定です。生成レベルや使用者の数値を自動代入していません。');
   if(!result){for(const operation of operations.filter(o=>o.accepted)){card({summon:'召喚・生成',motion:'動作',reflection:'反射'}[operation.type]||'作用',operation.name,scoped?.utilityScope?'効果の説明と判明済みの時間を表示':'数量の計算は不要');host.append(text('combatTrialDescription',operation.description));}
    if(scoped?.utilityScope?.timeNote)notice(scoped.utilityScope.timeNote);
    for(const t of scoped?.knownTimes||[])card(t.conditional?'追加効果の持続時間：'+t.name:'効果時間',utilityTime(t),t.conditional?'参照先が単独で成立した場合。親全体の時間とは別':t.scope);
    return;}
   if(result.effects.some(e=>e.generatedActionBinding?.candidateOnly))notice('子候補の単独計算です。親から発行される実IDは未照合で、技全体は一部対応のままです。候補の選択で付与元を確定した扱いにはしません。');
   const received=result.receivedDefinition;
   if(received){notice(received.scope);if(received.supported)card('受理済みの段階',received.name,'この段階だけの単独値。ほかの段階の能力値を合算しません。');else notice(received.reason);}
   const rootId=received?.supported?received.id:compiled.bundle.row.internalId,body=received?.supported?received.time:result.times.find(t=>t.definitionId===rootId);
   for(const e of result.effects.filter(e=>e.definitionId===rootId)){
    if(e.generationNotRequested)notice(e.meaning);
    const q=e.hpUpperPredicate||e.facingRequirement;
    if(q)notice((e.hpUpperPredicate?'使用者HP条件':'向き差の条件')+'：'+(q.allowed==null?'入力不足':q.allowed?'この条件を通過':'この条件は不成立')+'。損傷値は、この条件を含めて発動・命中した場合の参考です。');
    if(e.recoverySuppression?.hpMpProducerSuppressed)notice('基礎HP/MP自然回復の更新を抑止。ST回復とBuffによる継続増減は別です。');
   }
   if(body?.supported&&(body.finiteDuration===false||Number.isFinite(body.seconds)))card(body.conditionalClock?'防御受付幅（通常更新条件）':scoped?.durationOnly?'変身時間（内部定義）':'持続時間',body.finiteDuration===false?'固定秒数なし':body.seconds===0?'即時':fmt(body.seconds)+'秒',body.partial?'本体の時間です。付随効果の時間は別に表示します':body.kind);
   else if(body)notice(scoped?.childDurationCoverage?'設置物自体の寿命：未確認。付随作用の保持指定は下記へ表示します。':'持続時間：計算未対応\n'+(body.reason||'有限の時間が未確定'));
   if(scoped?.timeNote)notice(scoped.timeNote);
   if(result.referenceLifetime?.supported)card('参照連鎖・条件付き終了',fmt(result.referenceLifetime.seconds)+'秒',result.referenceLifetime.receiptOrder?(result.referenceLifetime.receiptOrder==='parent-first'?'親→子':'子→親')+'の受理順 / 競合後に残る効果の公称終了':'指定条件での公称終了');
   for(const q of result.referenceLifetime?.parts||[])if(q.sameSourceRefresh)card('更新される子Buffの保持区間',fmt(q.coverageSeconds)+'秒',q.requests+'回受理・同時保持1個 / 量や周期回数の合計とは別');
   const physical=result.physicalResults.find(e=>e.definitionId===rootId);
   if(physical&&Number.isFinite(physical.value))card(physical.targetReduction?.applies?'1回分の物理ダメージ（属性軽減後）':'1回分の物理ダメージ',fmt(physical.value),'指定したばらつきでの1回分。平均値とは異なります');
   for(const child of result.physicalResults.filter(e=>e.definitionId!==rootId).slice(0,3))if(Number.isFinite(child.value))card(child.targetReduction?.applies?'子攻撃・1回量（属性軽減後）':'子攻撃・1回量',fmt(child.value)+'HP',child.name+' / NPC・盾なし・命中済み。親の合計とは別');
   if(result.attack&&Number.isFinite(result.attack.average))card('平均ダメージ',fmt(result.attack.average)+'HP','ばらつきを平均した予測値。最小 '+fmt(result.attack.minimum)+'HP・最大 '+fmt(result.attack.maximum)+'HP');
   for(const parent of result.effects.filter(e=>e.bladeFollowup)){
    const child=parent.bladeFollowup;
    for(const hit of child.physicalResults||[])if(Number.isFinite(hit.value))card('追撃ダメージ・1回分',fmt(hit.value),child.name+'。追撃が命中した場合。通常攻撃のダメージは含みません');
    for(const effect of child.effects||[])if(effect.supported&&!effect.timeOnly&&!effect.coveredByAttack&&Number.isFinite(effect.value)){
     const poison=child.poisonSingleHit&&effect.kind===11;
     card('追撃・'+effect.name+'・1回分',fmt(effect.value)+(effect.unit||''),child.name+'。'+(poison?'毒の1周期分。再付与による更新があるため全期間の合計は表示しません':'追撃が成立した場合。通常攻撃のダメージは含みません'));
     if(!poison&&effect.count>1&&Number.isFinite(effect.total))card('追撃・'+effect.name+'・条件付き合計',fmt(effect.total)+(effect.unit||''),'1回量×'+effect.count+'回。途中で更新・解除されない場合');
    }
   }
   for(const q of result.rangeProjection||[])if(Number.isFinite(q.after))card('成功時Buffの既知加算後の'+(q.kind===245?'範囲半径':'射程'),fmt(q.after),'指定した元値 '+fmt(q.before)+' / 内部距離。対応する範囲・射撃の条件');
   for(const e of result.effects.filter(e=>e.npcArmorProjection?.supported&&e.active!==false)){const q=e.npcArmorProjection;
    card('NPC物理に対する有効防御力',fmt(q.before.effectiveDefense)+' → '+fmt(q.after.effectiveDefense),(e.definitionId===rootId?'本体':'参照先が受理された場合')+' / '+e.name+'の単独比較');
    if(q.hit)card('同じNPC攻撃1回のHP要求量',fmt(q.hit.before)+' → '+fmt(q.hit.after)+'HP','指定した威力・種値。盾・反射なし。実HP更新とは別');
   }
   const shownMagicGuards=new Set();
   for(const e of result.effects){const m=e.guard?.magic;if(!m?.supported||shownMagicGuards.has(e.definitionId))continue;shownMagicGuards.add(e.definitionId);
    const guardName=[compiled.bundle.row.definition,...compiled.bundle.row.dependencies].find(d=>d?.id===e.definitionId)?.name||'防御行動';
    card('魔法本体抑止・一次割合',fmt(m.uniformBytePercent)+'%','抽選byte均等の仮定 / '+(m.passed?'指定種値では抑止':'指定種値では通過')+' / '+guardName);
    if(Number.isFinite(m.blocked))card('魔法本体・抑止量',fmt(m.blocked)+'HP','指定した無防御本体量との条件計算。最終HP・反射と別');
    if(Number.isFinite(m.remaining))card('魔法本体・残る量',fmt(m.remaining)+'HP','受付・装備消費成立の条件。追加作用・別補正と別');
    if(m.refund?.supported)card('魔法防御・MP回復要求',fmt(m.refund.amount)+'MP','防御成立時は保存基礎消費 '+fmt(m.refund.whenSuppressed)+'MP。実回復上限と別');
   }
   const shownPhysicalGuards=new Set();
   for(const e of result.effects){const q=e.guard?.outcome;if(!q||shownPhysicalGuards.has(e.definitionId))continue;shownPhysicalGuards.add(e.definitionId);
    if(Number.isFinite(q.blocked))card('物理防御・軽減量',fmt(q.blocked)+'HP','選択した盾と指定種値・受付条件での1回分');
    if(Number.isFinite(q.remaining))card('物理防御後・残る量',fmt(q.remaining)+'HP','実HP保存や別の防御効果との合成は別');
   }
   for(const e of result.effects){const c=e.guardChild;if(!c)continue;
    if(Number.isFinite(c.durationSeconds))card('防御の付随効果・持続',fmt(c.durationSeconds)+'秒',c.name+'が受理された1回分。発動回数や実際の終了時点と別');
    for(const q of c.effects)if(q.supported&&!q.timeOnly&&Number.isFinite(q.value))card('付随効果・'+q.name,fmt(q.value)+(q.unit||''),c.name+' / 受付・受理条件成立時の値');
   }
   for(const e of result.effects){
    if(e.carnivalDamage)card('置換後の攻撃・1回量',fmt(e.carnivalDamage.amount)+'HP','武器区分・対象と外部倍率を反映。自動発動回数とは別');
    if(e.interruption?.supported&&Number.isFinite(e.interruption.percent))card('条件付き中断・1要求の割合',fmt(e.interruption.percent)+'%',e.interruption.interrupted?'指定乱数では中断':'指定乱数では中断しない');
    if(e.restoration&&Number.isFinite(e.restoration.assigned))card('復帰時のHP指定',fmt(e.restoration.assigned)+'HP / 最大HPの'+fmt(e.restoration.percent)+'%','加算回復ではありません。死亡から復帰までの待ち時間・状態再現と別');
   }
   const optional=new Set(scoped?.effectIds||[]);
   for(const e of result.effects.filter(e=>e.definitionId===rootId&&e.equipmentCurse?.clearedCount!=null))if(cards<Infinity)card('装備の呪い解除',e.equipmentCurse.clearedCount+'枠',e.equipmentCurse.selectedSlot==null?'指定した状態に適合枠なし':'選択スロット '+e.equipmentCurse.selectedSlot);
   for(const e of result.effects.filter(e=>e.definitionId===rootId&&!optional.has(e.id)&&e.supported&&!e.timeOnly&&!e.coveredByAttack&&Number.isFinite(e.value))){
    
    if(e.movement){card('吹き飛ばし・初期値',fmt(e.movement.initialMagnitude),'単位なし / 1要求分');card('吹き飛ばし・減衰累計',fmt(e.movement.totalMagnitude),'衝突・再付与なし / '+e.movement.updates+'更新');continue;}
    if(e.theft)card('盗取・補助入力',fmt(e.theft.requestInput),'補正前 '+fmt(e.theft.basis)+' / 成功率・盗む数量ではありません');
    card(e.name+(['HP','MP','ST'].includes(e.unit)?'・1回分':''),fmt(e.value)+(e.unit||''),(e.estimated?'推定値 / ':'')+([8,9,89,169].includes(e.kind)?'生成入力の補助値 / ':'')+(e.active===false?'世界・時間帯条件で無効':e.count>1?'1回量 / '+e.count+'回の成立条件':result.attack&&e.unit==='HP'?'入力したばらつきでの1回分。平均値とは異なります':'指定条件の値'));
    if(Number.isFinite(e.range?.after))card('既知加算後の'+(e.kind===245?'範囲半径':'射程'),fmt(e.range.after),'指定した元値 '+fmt(e.range.before)+' / 内部距離。別の未対応効果を含む技全体の結果とは区別');
    if(Number.isFinite(e.jump?.initial))card('ジャンプ1回の初期鉛直値',fmt(e.jump.initial),'単位なしの移動入力 / 高さ・飛距離とは別');
    if(Number.isFinite(e.itemDelay?.counter))card('アイテム使用の補正後待ち値',fmt(e.itemDelay.counter),'補正前 '+fmt(e.itemDelay.baseCounter)+' / 内部カウンタ。秒・再使用可能時刻とは別');
    if(e.stConsumption?.projection)card('補正後のST消費要求',fmt(e.stConsumption.projection.request)+'ST','基礎 '+fmt(e.stConsumption.projection.baseST)+'ST / スキル軽減・他の消費補正が1の比較');
    if(e.resourceCostProjection)card('補正後のST消費要求',fmt(e.resourceCostProjection.request)+'ST','基礎 '+fmt(e.resourceCostProjection.baseST)+'ST / この倍率のみを適用。実消費の確定とは別');
    if(e.dirt?.after!=null)card('髪・顔の汚れ（条件付き適用）',fmt(e.dirt.before)+' → '+fmt(e.dirt.after),'通常PCの能力補正1回。毎秒量とは別');
    if(e.critical?.after!=null)card('クリティカル割合（条件付き合成）',fmt(e.critical.before*100)+' → '+fmt(e.critical.after*100)+'%','剰余均等時 '+fmt(e.critical.uniformResiduePercent)+'% / '+(e.critical.passed==null?'抽選値は未指定':e.critical.passed?'指定値では成立':'指定値では不成立'));
    if(e.petExperience?.after!=null)card('ペット経験値倍率の変更',fmt(e.petExperience.before)+' → '+fmt(e.petExperience.after)+'倍','解除後 '+fmt(e.petExperience.afterRemoval)+'倍 / 指定した対象条件');
    if(e.petExperience?.request!=null)card('補正後の経験値要求',fmt(e.petExperience.request),'最終レベル増分への変換前');
    if(e.actionWait?.after!=null)card('AI行動待機・補正後',fmt(e.actionWait.after),'内部整数 / 実秒・PC一般のディレイとは別');
    if(e.kind===72&&e.wear?.after!=null)card('使用武器の残り耐久',fmt(e.wear.after),'内部耐久 / 通常表示 '+fmt(e.wear.displayBefore)+' → '+fmt(e.wear.displayAfter)+'。損傷要求1回分');
    if(e.gaugeSlip?.supported){const q=e.gaugeSlip;card('停止時の滑り',q.slip+'マス','範囲 '+q.minimum+'～'+q.maximum+'マス / 均等15bit値での平均 '+fmt(q.uniformMean)+'マス。指定値の1回分と平均は別');}
    if(e.gaugeSpeed?.supported){const q=e.gaugeSpeed;card('生産ゲージ速度の有効倍率',fmt(q.factor)+'倍','上下限後 '+fmt(q.limitedBefore)+' → '+fmt(q.limitedAfter)+' / 秒数・生産成功率とは別');}
    if(e.count>1&&Number.isFinite(e.total))card(e.name+'・条件付き合計',fmt(e.total)+e.unit,'1回量×'+e.count+'回。自動発動の保証とは別');
   }
   for(const parent of result.effects.filter(e=>e.generatedActionBinding))for(const child of [parent.selectedChild,...parent.additionalChildren||[]].filter(Boolean)){const childLabel=child.candidateOnly?'爆発候補：'+child.name:child.name;if(Number.isFinite(child.durationSeconds))card(childLabel+'の持続指定',child.durationSeconds===0?'持続指定なし':fmt(child.durationSeconds)+'秒','受理1回分。動作時間や設置寿命とは別');if(child.physicalResult?.supported)card('生成行動 '+childLabel+'・物理本体1回',fmt(child.physicalResult.value)+'HP',child.physicalResult.scope);for(const e of child.effects){
     if(e.supported&&e.unit==='HP')card('生成行動 '+childLabel+'・'+(e.recipient==='使用者'?'生成体自身':'行動対象'),fmt(e.value)+'HP',(child.inputCondition?.derivedTrap?'罠の生成レベルから計算したスキルを使う条件':child.inputCondition?'生成体自身のスキル・魔力を指定した条件':'生成体入力と独立した確定分')+'。'+(Number.isFinite(e.initialValue)||e.modeInfo?.initial===false?'保持中の更新1回分':'初回の成立1要求分')+'。自動発動の回数・親の総量は未確定');
     if(Number.isFinite(e.initialValue)&&e.initialValue!==e.value)card(childLabel+'・初回1回分',fmt(e.initialValue)+e.unit,'保持後の1回値とは量子化が異なります');
     if(e.count>1&&Number.isFinite(e.total))card(childLabel+'・'+e.count+'回の条件付き合計',fmt(e.total)+e.unit,'単一の保持効果が更新・途中解除されず満了する条件。生成体が行動を自動反復する総量とは別');
    if(e.supported&&e.kind===41)card('生成行動 '+childLabel+'・能力補正',fmt(e.value)+e.unit,'召喚・設置物の行動が受理された対象への1効果。親の総量とは別');
     if(e.supported&&!e.timeOnly&&Number.isFinite(e.value)&&e.unit!=='HP'&&e.kind!==41)card(childLabel+'・'+e.name,fmt(e.value)+e.unit,(e.estimated?'推定値 / ':'')+'成立した1要求。自動発動回数・親の総量とは別');
     if(e.resolved&&e.nonNumerical&&!e.supported)notice(childLabel+'：'+e.meaning);
    if(e.movement)card('生成行動の吹き飛ばし',fmt(e.movement.initialMagnitude)+' → 累計 '+fmt(e.movement.totalMagnitude),'単位なし・1要求分。衝突/途中再付与なし。自動発動の総量とは別');
   }
   }
   for(const parent of result.effects.filter(e=>[8,9,94,169].includes(e.kind)&&!e.generatedActionBinding&&e.selectedChild)){
    const candidates=[parent.selectedChild,...parent.additionalChildren||[]];
    if(!parent.areaBindingConfirmed)notice('付与元の照合待ち：以下は表示したBuff自身の単独値です。この技から必ず付与されると確認できた値や、親全体の効果量とは区別します。');
    for(const child of candidates){
     for(const q of child.effects.filter(q=>q.resolved&&q.nonNumerical&&!q.supported))notice(child.name+'：'+q.meaning);
     for(const q of child.effects.filter(q=>q.movement))if(cards<Infinity)card(child.name+'・吹き飛ばし初期値',fmt(q.movement.initialMagnitude)+' → 累計 '+fmt(q.movement.totalMagnitude),'単位なし・受理1回分。衝突や途中再付与、親全期間の総量とは別');
      if(Number.isFinite(child.durationSeconds))card((parent.areaBindingConfirmed?'付随Buff・':'付随Buff単独・')+child.name,fmt(child.durationSeconds)+'秒',parent.areaBindingConfirmed?'対象への受理1回分。親の設置寿命とは別':'付与元の照合待ち。Buff自身の持続指定');
     for(const q of child.effects)if(q.supported&&!q.timeOnly&&Number.isFinite(q.value)){
       card((parent.areaBindingConfirmed?'付随効果・':'Buff単独・')+q.name,fmt(q.value)+(q.unit||''),(q.estimated?'推定値 / ':'')+child.name+' / '+(parent.areaBindingConfirmed?'wikiと内部定義を照合・対象に受理された1回分':'親との結合は照合待ち'));
       if(q.buffReflection?.outcome)card((parent.areaBindingConfirmed?'付随効果・':'Buff単独・')+'物理軽減後',fmt(q.buffReflection.outcome.remaining)+'HP','指定した損傷量・このBuffのみの条件。生成元の自動発動とは別');
     }
    }
   }
   if(result.generatedRequestTotals?.missing.length&&Object.values(result.controls.generatedRequestCounts||{}).some(v=>v!=null))notice('指定回数の合計は未完了：'+result.generatedRequestTotals.missing[0].reason);
   for(const q of result.generatedRequestTotals?.recipientTotals||[]){card('指定回数による'+q.operation+(result.generatedRequestTotals.partial?'・既知分小計':'合計'),fmt(q.value)+q.unit,q.recipient+'。自動発動する親の総量・実HP変化とは別');}
   for(const q of result.referenceAggregate?.totals||[]){if(Number.isFinite(q.value))card(q.name+(result.referenceAggregate.partial?'・参照小計':result.referenceAggregate.effectiveConflictCounts?'・条件付き要求合計':'・参照合計'),fmt(q.value)+q.unit,(result.referenceAggregate.conflictUnresolved?'各定義が単独で成立した量。競合後の有効合計は未確定':result.referenceAggregate.effectiveConflictCounts?'指定受理順・周期成立時の要求量。自動発動総量とは別':'親と参照先の成立条件付き')+' / '+q.recipient);}
   for(const o of operations.filter(o=>o.accepted)){card({summon:'召喚・生成',motion:'動作',reflection:'反射'}[o.type]||'作用',o.name,'効果の説明');}
   const recognition=result.effects.find(e=>e.recognitionRule)?.recognitionRule.condition;
   if(recognition)card('敵認識回避・候補選別',!recognition.supported?'条件未指定':recognition.excludedBy208?'この効果で敵対対象から除外':recognition.candidateAccepted?'この条件では効果なし':'先行条件で候補から除外',(recognition.npcInitial?recognition.npcInitial.name+' / 保存初期設定 / ':'')+recognition.reason+' / 最終索敵・ヘイトとは別');
   const lightSettings=[...new Set(result.effects.filter(e=>e.lightSetting).map(e=>e.lightSetting.label))];
   if(lightSettings.length)card('光源・視界の指定',lightSettings.join(' / '),'参照先の候補を含みます。受理済みの設定は番号の最大値を採用します。スキル別の実際の受理Lv・照射距離は別です');
   const pending=scoped?.pending||result.pending,unknownTimes=result.times.filter(t=>t.definitionId!==rootId&&(!t.supported||t.partial));
   if(pending.length||unknownTimes.length){
    const needsInput=pending.length>0&&pending.every(e=>e.category==='入力不足')&&!unknownTimes.length;
    if(needsInput)badge.textContent='追加条件を入力してください';
    notice((needsInput?'計算に必要な条件：':'計算できない効果：')+'\n'+pending.map(e=>(e.name||'効果')+'：'+(e.reason||e.remaining)).join('\n')+(unknownTimes.length?'\n追加効果の持続時間 '+unknownTimes.length+'件は計算できません。':'')+'\n表示した数値には、計算できない効果を含めていません。');
   }
   if(!cards&&!pending.length){const resolved=result.effects.find(e=>e.resolved&&e.meaning);host.append(text('combatTrialDescription',resolved?.meaning||'この条件で表示できる数量はありません。効果の説明と入力条件を確認してください。'));}

  }
  function clearSelection(message,status){
   ++version;loading?.abort();compiled=null;clearTimeout(renderTimer);renderTimer=null;
   filterAdditionalInputs();el('Numbers').textContent=message;el('Preview').textContent='';el('Info').textContent='';el('Message').textContent=message;
   el('Skills').replaceChildren();skillInputs.clear();el('BladeConditions').hidden=true;el('WikiConditions').hidden=true;
   el('NpcArmorConditions').hidden=true;el('NpcArmorConfirmed').checked=false;
   el('TargetPhysicalReductionConditions').hidden=true;
   el('ObservedRestLabel').hidden=true;
   el('GeneratedInputConditions').hidden=true;el('GeneratedRequestCounts').replaceChildren();generatedRequestCountInputs.clear();el('GeneratedRequestsNonOverlapping').checked=false;el('GeneratedSkills').replaceChildren();generatedSkillInputs.clear();el('GeneratedUnmodified').checked=false;el('GeneratedMagic').value='';el('GeneratedAttack').value='';el('GeneratedHit').value='';el('GeneratedNormalNpc').checked=false;el('GeneratedUseFixedBase').checked=false;
   el('PrimarySkillLabel').textContent='計算に使うスキル（技を選択）';el('SkillEvidence').textContent='技を選ぶと、計算に使うスキルと必要な追加スキルを表示します。';
   showSummary(null,null,[],message,status);
  }
  function registrationHandoff(key){
   if(!compiled||compiled.bundle.row.key!==key)return null;
   clearTimeout(renderTimer);renderTimer=null;renderNumbers();
   const inputs={...input(),world:num('World')};
   if(latestNumericInputs)for(const [name,value]of Object.entries(latestNumericInputs))if(value!==undefined&&typeof value!=='function')inputs[name]=structuredClone(value);
   const aliases={Skill:'skill',Magic:'magic',World:'world',Defense:'targetDefense',Resistance:'resistance',Seed:'seed',TimePeriod:'timePeriod',Amplification:'targetAmplificationAllowed',MaxHP:'targetMaxHP',MaxMP:'targetMaxMP'};
   const conditions=[];
   for(const field of new Set([...(basicRelevant||[]),...(relevantConditions||[])])){
    const node=el(field);if(!node||node.closest?.('[hidden]'))continue;
    const value=node.type==='checkbox'?node.checked:node.value;if(value==='')continue;
    const label=node.closest?.('label');const parts=[...(label?.childNodes||[])].filter(n=>n.nodeType===3||n.nodeName==='SPAN').map(n=>n.textContent).join(' ').trim();
    const inputKey=aliases[field]||field[0].toLowerCase()+field.slice(1);
    const initial=conditionDefaults.get('combatCatalog'+field);
    if(!Object.hasOwn(basicDefaults,field)&&initial&&(node.type==='checkbox'?value===initial.checked:String(value)===String(initial.value)))continue;
    conditions.push({key:field,inputKey,label:playerText(parts||field),value,displayValue:node.selectedOptions?.[0]?.textContent||String(value)});
   }
   for(const [name,node]of skillInputs)conditions.push({key:'skill:'+name,inputKey:'skills',label:name,value:node.value,displayValue:node.value});
   return {key,inputs,conditions};
  }
  function openRegistration(key){const transfer=registrationHandoff(key);root.MOE_COMBAT_BUFF_CATALOG_BRIDGE.open(key,transfer);}
  let pickerLimit=60;
  function populate(){const q=normalize(el('Search').value),previous=el('Select').value;el('Select').replaceChildren();
   const matches=searchEntries.filter(r=>{const meta=filterData.rows[r.row.key];return r.searchName.includes(q)&&(!el('PickerSkill')?.value||(el('PickerSkillMode')?.value==='calculation'?meta?.calculationSkills:meta?.requiredSkills)?.includes(el('PickerSkill').value))&&(!el('PickerType')?.value||meta?.types.includes(el('PickerType').value));});
   if(el('PickerSort')?.value==='required-asc')matches.sort((a,b)=>root.MOE_COMBAT_CONDITION_INPUTS.compareRequired(filterData.rows[a.row.key],filterData.rows[b.row.key],el('PickerSkill')?.value||'')||a.row.name.localeCompare(b.row.name,'ja'));
   if(el('PickerSkillModeHelp'))el('PickerSkillModeHelp').textContent=el('PickerSkillMode')?.value==='calculation'?'効果量または持続時間の計算に使うスキルで絞ります。必要スキルにないものも含み、変動条件が未確認の作用は含めません。':'技・魔法を使うための必要スキルで絞ります。';
   if(el('PickerSortHelp'))el('PickerSortHelp').textContent=el('PickerSort')?.value==='original'?'元の掲載順で表示しています。':el('PickerSkill')?.value?el('PickerSkill').value+'の必要値で並べます。必要値が不明・上限のみの技は最後に表示します。':'複合技は最も高い必要値を基準にします。必要値が不明・上限のみの技は最後に表示します。';
   const found=matches.slice(0,pickerLimit).map(r=>r.row);
   const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent=matches.length?'技を選択（'+matches.length+'件一致'+(matches.length>60?'・先頭60件表示':'')+'）':'一致する技がありません';el('Select').append(placeholder);
   for(const r of found){const option=document.createElement('option');option.value=r.key;option.textContent=r.name+(r.utilityDescriptionScope?(r.descriptionOnly?'（効果説明・判明時間）':'（数値計算＋用途説明）'):r.existingCalculation?'（既存の通常攻撃計算）':r.descriptionOnly?'（説明対応・数値計算不要）':r.conditionalNumericAvailable?'（条件付き数値対応）':r.numericAvailable?'（数値あり・'+(r.calculationScopeStatus||r.numericAmountStatus)+'）':r.applicationCount?'（効果適用あり）':'');el('Select').append(option);}
   const list=el('PickerList');if(list){list.replaceChildren();el('PickerCount').textContent=matches.length+'件中 '+found.length+'件を表示';el('PickerMore').hidden=found.length>=matches.length;
    for(const r of found){const button=document.createElement('article');button.className='combatTrialPickerItem';
     const meta=filterData.rows[r.key],name=document.createElement('strong');name.textContent=r.name;
     const requirements=document.createElement('span');requirements.className='combatTrialPickerRequirements';requirements.textContent=meta?.requirementsText||'必要スキル値：未確認';
     const description=document.createElement('span');description.className='combatTrialPickerDescription';description.textContent=(root.MOE_EFFECT_DISPLAY_TEXT?.info(meta?.description)??meta?.description)||'効果の説明は未確認です。';
     const detail=document.createElement('span');detail.className='combatTrialPickerStatus';detail.textContent=r.descriptionOnly?'効果の説明・判明している時間':r.calculationScopeStatus==='一部対応'?'計算できない効果あり':r.conditionalNumericAvailable?'条件を指定して計算':'効果量・時間を確認';
     const variation=document.createElement('span');variation.className='combatTrialPickerVariation';variation.textContent=(meta?.variationAmount||'効果量：変動条件は未確認')+'\n'+(meta?.variationDuration||'持続時間：変動条件は未確認');
     button.append(name);button.append(requirements);button.append(description);button.append(variation);button.append(detail);
     const actions=document.createElement('div');actions.className='combatTrialPickerActions';
     const calculate=document.createElement('button');calculate.type='button';calculate.textContent='計算する';calculate.setAttribute?.('aria-label',r.name+'を計算する');
     const register=document.createElement('button');register.type='button';register.textContent='Buff登録で確認';register.setAttribute?.('aria-label',r.name+'をBuff登録で確認');
     const destination=root.MOE_COMBAT_BUFF_CATALOG_BRIDGE?.availability(r.key);register.disabled=!destination?.available;if(register.disabled)register.textContent='Buff登録は未対応';
     register.addEventListener('click',event=>{event.stopPropagation();try{el('Picker').close?.();openRegistration(r.key);}catch(error){el('Message').textContent=playerText(error.message);}});
     actions.append(calculate);actions.append(register);button.append(actions);
     button.addEventListener('click',()=>{el('Select').value=r.key;el('Picker').close?.();el('ChosenName').textContent=r.name;select();});list.append(button);}
   }
   // Searching the catalogue never discards the active calculation.
   const retained=selectableEntries.some(r=>r.key===previous);if(retained&&!found.some(r=>r.key===previous)){const option=document.createElement('option');option.value=previous;option.textContent=selectableEntries.find(r=>r.key===previous).name;el('Select').append(option);}el('Select').value=retained?previous:'';
   if(!retained&&!compiled)clearSelection(found.length?'候補から対象技を選択してください':'一致する技がありません',found.length?'技を選択':'該当なし');
   return found.length;
  }
  async function select(){clearTimeout(renderTimer);renderTimer=null;if(el('RegistrationStatus'))el('RegistrationStatus').textContent='';const token=++version;compiled=null;metricCache.clear();const selected=selectableEntries.find(r=>r.key===el('Select').value);if(el('ChosenName'))el('ChosenName').textContent=selected?.name||'技・魔法を選択してください';loading?.abort();loading=new AbortController();if(!selected){clearSelection('候補から対象技を選択してください','技を選択');return;}
   el('Message').textContent='対象データを読み込み中';el('Numbers').textContent='読込み中';
   showSummary(null,null,[],'対象データを読み込み中','読込み中');
   try{let page=cache.get(selected.page);if(!page){const response=await fetch('src/data/generated/combatNumericPages/'+String(selected.page).padStart(3,'0')+'.json?v='+encodeURIComponent(index.numericRevision||index.gameUpdateDate||index.date)+'-numerics',{signal:loading.signal});if(!response.ok)throw Error('対象データの読込みに失敗しました');page=await response.json();if(token!==version)return;cache.set(selected.page,page);while(cache.size>2)cache.delete(cache.keys().next().value);}
    if(token!==version)return;resetAdditionalInputs();const bundle=page.rows.find(r=>r.row.key===selected.key);compiled=api.compile(bundle,page.skillNames);skillNames=page.skillNames;
    skillInputs.clear();bladeOnlySkills.clear();el('Skills').replaceChildren();el('ReuseSkill').replaceChildren();
    for(const [raw,name] of Object.entries(skillNames)){const option=document.createElement('option');option.value=raw;option.textContent=name;el('ReuseSkill').append(option);}el('ReuseSkill').value='56';
    el('BuffActionSkill').replaceChildren();{const empty=document.createElement('option');empty.value='';empty.textContent='未指定';el('BuffActionSkill').append(empty);}
    for(const [raw,name] of Object.entries(skillNames)){const option=document.createElement('option');option.value=raw;option.textContent=name;el('BuffActionSkill').append(option);}el('BuffActionSkill').value='';
    const ref=bundle.definitions[String(compiled.id)],primary=bundle.row.definition?.primary_raw;
    const release=bundle.row.releaseConditions;
    el('ReleaseConditions').hidden=!release;el('ReleaseTargetType').value='npc';el('ReleaseBuff').replaceChildren();
    if(release){
     el('ReleaseTargetReason').textContent=playerText(release.targetReason);el('ReleaseBuffLabel').hidden=!release.requiredBuffs.length;
     const blank=document.createElement('option');blank.value='';blank.textContent='未指定（必要なBuffを選択）';el('ReleaseBuff').append(blank);
     for(const name of release.requiredBuffs){const option=document.createElement('option');option.value=name;option.textContent=name;el('ReleaseBuff').append(option);}
    }
    const primaryName=skillNames[primary];
    {const choices=root.MOE_COMBAT_NUMERICS.areaBuffOptions(bundle);el('AreaChoiceConditions').hidden=!choices.length;el('AreaBuffChoice').replaceChildren();const blank=document.createElement('option');blank.value='';blank.textContent=[215,4784].includes(bundle.row.internalId)?'爆発候補3種類を比較（実際の種類は未確認）':'未指定（計算する効果・段階を選択）';el('AreaBuffChoice').append(blank);for(const c of choices){const option=document.createElement('option');option.value=String(c.id);option.textContent=c.name;el('AreaBuffChoice').append(option);}el('AreaBuffChoice').value='';}
    el('ObservedRestLabel').hidden=![6773,8825,12564].includes(bundle.row.internalId);
    {const trapLevelKnown=[215,4784].includes(bundle.row.internalId);el('GeneratedTrapLevelLabel').hidden=!trapLevelKnown;el('GeneratedTrapLevel').checked=trapLevelKnown;el('GeneratedSkills').hidden=trapLevelKnown;const children=root.MOE_COMBAT_NUMERICS.generatedInputChildren(bundle);generatedRequestCountInputs.clear();el('GeneratedRequestCounts').replaceChildren();el('GeneratedRequestsNonOverlapping').checked=false;for(const d of children){const label=document.createElement('label'),node=document.createElement('input');label.textContent=d.name+'の発生回数（全体の合計）';node.type='number';node.min='0';node.max=String(d.wikiMaxRequests||10000);node.step='1';node.value='';node.placeholder='未指定なら小計未計算';label.append(node);el('GeneratedRequestCounts').append(label);generatedRequestCountInputs.set(d.id,node);}generatedSkillInputs.clear();el('GeneratedSkills').replaceChildren();el('GeneratedInputConditions').hidden=!children.length;el('GeneratedUnmodified').checked=false;el('GeneratedMagic').value='';el('GeneratedMagicLabel').hidden=!children.some(d=>d.action_type===1);el('GeneratedPhysicalFields').hidden=!children.some(d=>d.action_type===2);el('GeneratedAttack').value='';el('GeneratedHit').value='';el('GeneratedNormalNpc').checked=false;el('GeneratedUseFixedBase').checked=false;
     for(const raw of new Set(children.filter(d=>root.MOE_COMBAT_NUMERICS.generatedInputNeedsSkill(d)).map(d=>d.primary_raw))){const label=document.createElement('label'),input=document.createElement('input');label.textContent='召喚・設置物の'+(skillNames[raw]||'スキル'+raw)+'（'+children.filter(d=>d.primary_raw===raw).map(d=>d.name).join('・')+'）';input.type='number';input.min='0';input.max=String(root.MOE_COMBAT_RESOURCE_FORMULA.skillMax);input.step='any';input.value='';input.placeholder='生成体自身の現在値を指定';label.append(input);el('GeneratedSkills').append(label);generatedSkillInputs.set(raw,input);}}
    el('PrimarySkillLabel').textContent=primaryName?primaryName:'計算スキル：未確認';
    el('SkillEvidence').textContent=primaryName?'計算に使うスキル：'+primaryName+(bundle.row.definition?.action_type===1?'。魔力も入力してください。':'。'):'計算に使うスキルは未確認です。';
    for(const req of ref?.requirements||[]){if(req.rawSkill===primary)continue;const label=document.createElement('label'),input=document.createElement('input');label.textContent=(req.name||'未照合スキル')+'（必要スキル：'+req.required+'）';input.type='number';input.value='100';input.min='0';input.max=String(root.MOE_COMBAT_RESOURCE_FORMULA.skillMax);input.step='any';label.append(input);el('Skills').append(label);skillInputs.set(req.name,input);}
    for(const d of bundle.row.dependencies){const name=skillNames[d.primary_raw];if(bundle.row.sameCasterPhysicalChildren?.includes(d.id)&&d.primary_raw===primary)continue;if(!name||skillInputs.has(name))continue;const label=document.createElement('label'),input=document.createElement('input');label.textContent=name+'（追加効果を使う人物のスキル）';input.type='number';input.value='100';input.min='0';input.max=String(root.MOE_COMBAT_RESOURCE_FORMULA.skillMax);input.step='any';label.append(input);el('Skills').append(label);skillInputs.set(name,input);}
    const bladeDefs=root.MOE_COMBAT_NUMERICS.bladeInputs(bundle);el('BladeConditions').hidden=!bladeDefs.length;
    for(const d of bladeDefs){const name=skillNames[d.primary_raw];if(!name||skillInputs.has(name))continue;bladeOnlySkills.add(name);const label=document.createElement('label'),input=document.createElement('input');label.textContent=name+'（追撃する人物のスキル）';input.type='number';input.value='100';input.min='0';input.max=String(root.MOE_COMBAT_RESOURCE_FORMULA.skillMax);input.step='any';label.append(input);el('Skills').append(label);skillInputs.set(name,input);}
    el('BladeSelected').checked=false;el('BladeMode').value='normal';
    el('RecognitionConditions').hidden=![bundle.row.definition,...bundle.row.dependencies].filter(Boolean).some(d=>d.effects.some(e=>e.kind===208));el('RecognitionProfile').value='unknown';
    el('LightConditions').hidden=![bundle.row.definition,...bundle.row.dependencies].filter(Boolean).some(d=>d.effects.some(e=>e.kind===65));el('OtherLightProfile').value='';
    el('ReverseReferenceConditions').hidden=true;el('ReverseReferenceNormalPc').checked=false;el('ReverseReferenceNpcUnarmed').checked=false;el('ReverseReferenceNpcWeapon').checked=false;el('ReverseReferenceNpcShield').value='';el('ReverseReferenceNpcShieldSkill').value='';el('ReverseReferenceGearDefense').value='';el('ReverseReferenceWearSkill').value='';el('ReverseReferenceDamage').checked=false;el('ReverseReferenceCritical').checked=false;
    {const edge=bundle.row.definition?.effects.find(e=>e.kind===86&&e.flags===50),child=bundle.row.dependencies.find(d=>d.id===edge?.selector);el('ReverseReferenceSkillLabel').textContent='元の対象PC／NPCの'+(skillNames[child?.primary_raw]||'子行動の主スキル');}
    el('CraftingConditions').hidden=![bundle.row.definition,...bundle.row.dependencies].filter(Boolean).some(d=>d.effects.some(e=>[41,147].includes(e.kind)&&(Object.hasOwn(root.MOE_COMBAT_NUMERICS.craftingSelectors,e.selector)||Object.hasOwn(root.MOE_COMBAT_NUMERICS.craftingSpeedSelectors,e.selector))));
    el('CraftingSelector').value='';el('CraftingSlipBefore').value='';el('CraftingSpeedBefore').value='';
    el('VisualFogConditions').hidden=![bundle.row.definition,...bundle.row.dependencies].filter(Boolean).some(d=>d.effects.some(e=>e.kind===127));el('VisualFogAdmitted').checked=false;
    {const effects=[bundle.row.definition,...bundle.row.dependencies].filter(Boolean).flatMap(d=>d.effects);
     el('DirtConditions').hidden=!effects.some(e=>e.kind===41&&e.selector===72);el('CurseConditions').hidden=!effects.some(e=>e.kind===191);el('PetCommandConditions').hidden=!effects.some(e=>e.kind===28&&e.selector===7);}
    el('TrapConditions').hidden=![bundle.row.definition,...bundle.row.dependencies].filter(Boolean).some(d=>d.effects.some(e=>e.kind===74));
    el('CriticalConditions').hidden=!root.MOE_COMBAT_NUMERICS.conditionalInputKinds(bundle).has(112);
    el('PetExperienceConditions').hidden=![bundle.row.definition,...bundle.row.dependencies].filter(Boolean).some(d=>d.effects.some(e=>e.kind===149));
    el('AppearanceConditions').hidden=![bundle.row.definition,...bundle.row.dependencies].filter(Boolean).some(d=>d.effects.some(e=>e.kind===218));
    el('IndependentShotConditions').hidden=!bundle.row.independentPhysicalChildren?.includes(13576);el('IndependentShotSelected').checked=false;
    el('DualWeaponConditions').hidden=![5387,6699].includes(bundle.row.internalId);el('DualWeaponConfirmed').checked=false;el('DualWeaponLeft').value='';
    el('GuardTimingConditions').hidden=![bundle.row.definition,...bundle.row.dependencies].some(d=>d&&root.MOE_COMBAT_GUARD_WINDOW_NUMERICS?.rules[d.id]);el('GuardGroundTiming').checked=false;el('GuardRegularClock').checked=false;el('GuardDelayedStart').checked=false;el('GuardCurrentCounter').value='';el('GuardClockMode').value='counter';el('GuardScheduledMilliseconds').value='';
    el('PassiveReceiptConditions').hidden=bundle.row.definition?.action_type!==5;el('PassiveLearnedConfirmed').checked=false;
    el('NormalPcPhysicalConditions').hidden=![bundle.row.definition,...bundle.row.dependencies].some(d=>root.MOE_COMBAT_NORMAL_PC_NUMERICS?.compatible(d));el('NormalPcPhysical').checked=false;el('NormalPcPhysicalCritical').checked=false;
    el('TargetPhysicalReductionConditions').hidden=!Object.values(bundle.numericReferences||{}).some(r=>r.physical)&&![bundle.row.definition,...bundle.row.dependencies].some(d=>d&&([2,3].includes(d.effect_class)||d.effect_class===1&&root.MOE_COMBAT_NUMERICS.targetReductionEligibility(d).eligible||d.effects.some(e=>e.kind===45)));el('TargetPhysicalReduction').value='';
    el('TargetMagicReduction').value='';
    el('NpcArmorConditions').hidden=![bundle.row.definition,...bundle.row.dependencies].some(d=>d?.effects.some(e=>[41,147].includes(e.kind)&&e.selector===5));el('NpcArmorConfirmed').checked=false;el('NpcArmorCritical').checked=false;
    if([bundle.row.definition,...bundle.row.dependencies].some(d=>d?.effects.some(e=>e.kind===8))&&!skillInputs.has('暗黒命令')&&skillNames[primary]!=='暗黒命令'){
     const label=document.createElement('label'),input=document.createElement('input');label.textContent='暗黒命令（召喚寿命）';input.type='number';input.value='0';input.min='0';input.max=String(root.MOE_COMBAT_RESOURCE_FORMULA.skillMax);input.step='any';label.append(input);el('Skills').append(label);skillInputs.set('暗黒命令',input);
    }
    el('Conditions').checked=false;el('Partial').checked=false;el('ReferenceChain').checked=false;el('ReferenceSimultaneous').checked=false;el('PeriodicReference').checked=false;el('SinglePositiveUpdate').checked=false;el('TargetCategory').checked=false;el('CarnivalUnopposed').checked=false;el('AbsorptionSelected').checked=false;
    el('ReferenceReceiptOrder').value='';el('FixedUpdateElapsed').value='';el('GuardReplayUnmodified').checked=false;el('GuardAmmoCondition').checked=false;el('GuardReplayResistance').value='';el('GuardReplayDefense').value='';
    el('ReferenceSelfCenterTarget').checked=false;
    el('WeatherChildAccepted').checked=false;
    const wikiDefs=[bundle.row.definition,...bundle.row.dependencies].filter(Boolean),area=bundle.row.internalId===5825,lifetime=wikiDefs.some(d=>d.effects.some(e=>e.kind===96)),transfer=wikiDefs.some(d=>d.effects.some(e=>e.kind===177));
    el('WikiConditions').hidden=!(area||lifetime||transfer);el('AreaConditions').hidden=!area;el('LifetimeConditions').hidden=!lifetime;el('TransferConditions').hidden=!transfer;
    for(const k of ['AreaBuffRemaining','LifetimeInitial','LifetimeRemaining','TransferRecords'])el(k).value='';
    el('AreaElapsed').value='0';el('LifetimeElapsed').value='0';el('LifetimeCategory').value='buff';el('LifetimePresent').value='yes';el('AreaTargetType').value='';el('AreaInside').value='';
    el('Info').textContent=playerText(bundle.row.info)+'\n必要スキル：'+(bundle.row.definition?.requirements||[]).map(q=>q.skill+' '+q.min).join('・')+'\n触媒：'+(bundle.row.metadata?.catalyst||'未確認')+(ref?.materialId?'（'+ref.materialCount+'個）':'');

    el('Message').textContent='効果・対象条件を確認してください';render();
   }catch(e){if(token===version){el('Message').textContent=e.message+'。自動再試行は行いません';el('Numbers').textContent='対象データを読み込めませんでした';showSummary(null,null,[],e.message,'読込み失敗');}}
  }
  function sourceStat(key){
   if(basicRelevant&&!basicRelevant.has(key))return basicDefaults[key];
   const value=el('UseCurrent'+key)?.checked?(()=>{const m=calculationMetrics().value;return key==='Attack'?m.atk:m.stats.magic;})():num(key);
   if(!Number.isFinite(value)||value<0)throw Error((key==='Attack'?'攻撃力':'魔力')+'は0以上の数値を指定してください');
   return value;
  }
  function input(mode='effect-only'){
   const bladeSkills=new Set(compiled?root.MOE_COMBAT_NUMERICS.bladeInputs(compiled.bundle,el('BladeMode').value).map(d=>skillNames[d.primary_raw]):[]);
   const skills=Object.fromEntries([...skillInputs].filter(([name])=>!bladeOnlySkills.has(name)||bladeSkills.has(name)).map(([name,node])=>{if(node.value.trim()==='')throw Error(name+'を入力してください');return [name,Number(node.value)];}));
   return {skill:num('Skill'),magic:sourceStat('Magic'),world:num('World'),skills,caster:el('Caster').value,target:el('Target').value,mode,
    conditionsConfirmed:el('Conditions').checked,acknowledgePartial:el('Partial').checked,recognitionProfile:el('RecognitionProfile').value||'unknown'};
  }
  // Trial conditions do not change the equipment/Buff configuration. Cache its
  // derived metrics until an external configuration input changes; keep at most
  // two attack contexts. This avoids recomputing the entire build per keystroke.
  function calculationMetrics(attackType){
   const world=num('World'),key=(attackType||'base')+':'+world;if(metricCache.has(key))return metricCache.get(key);
   const cfg=collectConfig(),st=expandSkillSimMasteryBuffState(cfg.state),capture={},value=computeMetrics(st,{...cfg.inputs,...(attackType?{attackType}:{}),equipmentBuffWorld:world},capture),result={cfg,st,value,capture};
   metricCache.set(key,result);while(metricCache.size>2)metricCache.delete(metricCache.keys().next().value);return result;
  }
  function metrics(){const {cfg,st,value:base}=calculationMetrics();return {cfg,st,base,after:state.active.length?computeMetrics(st,{...cfg.inputs,combatCatalogScenario:state,combatCatalogTarget:el('Target').value}):base};}
  function guardExtraLines(r,lines){
     if(r.magicReplay){const q=r.magicReplay;
      lines.push('  魔法反射1要求：'+(!q.supported?'未計算 / '+q.reason:!q.emitted?'今回の防御条件では要求なし':q.name+' / 元入力 '+fmt(q.x)+'・種値 '+q.seed+' を保持'));
      if(q.emitted){for(const e of q.effects)if(e.supported&&!e.timeOnly)lines.push('    '+e.name+'：'+fmt(e.value)+(e.unit||'')+(e.count!=null?' × '+e.count+'回 / 条件付き小計 '+fmt(e.total)+(e.unit||''):'')+(e.partial?' / 未確定：'+e.remaining:''));
       for(const t of q.times)lines.push('    反射先の保持指定：'+(t.supported?(t.seconds==null?t.kind:fmt(t.seconds)+'秒'):'未計算 / '+t.reason));lines.push('    '+q.scope);}
     }
     if(r.ammunitionRecovery){const q=r.ammunitionRecovery;lines.push('  弾回収：'+(q.supported?(q.requested?q.count+'個の取得要求（所持品への追加は別）':'今回の条件では取得要求なし'):'未計算 / '+q.reason));if(q.scope)lines.push('    '+q.scope);}
  }
  function renderNumbers(){latestNumericInputs=null;if(!root.MOE_COMBAT_NUMERICS)return;try{
   const actionScope=root.MOE_COMBAT_CALCULATION_SCOPE?.describe(compiled.bundle);
   const optionalGenerated=el('SummonBaseVariant').checked&&root.MOE_COMBAT_NUMERICS.generatedInputChildren(compiled.bundle).length>0;
   const optionalSummon=el('SummonBaseVariant').checked&&(actionScope?.operations.some(e=>e.type==='summon')||optionalGenerated);
    const actionLines=actionScope?.operations.map(e=>({summon:'召喚・生成：',motion:'動作：',reflection:'反射：',presentation:'表示・演出：',appearance:'変身：',inspection:'鑑定：',theft:'窃盗：','existing-attack':'既存の通常攻撃：','item-bundle':'セットアイテム：'}[e.type]||'作用：')+e.name+' / '+e.description+(e.accepted?'\n'+(e.mode==='description-known-time'?'効果説明・判明時間を表示':e.mode==='existing-calculation'?'既存計算を利用':e.mode==='meaning-only'?'用途確認（数値計算は未対応）':e.mode==='duration-only'?'変身量の計算は不要。時間を別表示':'説明対応（数値計算不要）'):'\n'+e.remaining)+(e.scope?'\n'+e.scope:'')+(e.timeNote?'\n'+e.timeNote:'')+(e.identityStatus?'\n'+e.identityStatus:''))||[];
    actionLines.push(...(compiled.bundle.row.numericConditions||[]).map(note=>'計算条件：'+note));
    if(actionScope?.utilityScope?.whole&&!optionalGenerated){
     const value=key=>{const text=el(key).value.trim();return text!==''&&Number.isFinite(+text)?+text:undefined;};
     const p={skill:value('Skill'),magic:sourceStat('Magic'),world:value('World'),resistance:value('Resistance'),targetDefense:value('Defense'),seed:value('Seed'),targetAmplificationAllowed:el('Amplification').value==='yes',skills:Object.fromEntries([...skillInputs].map(([name,node])=>[name,node.value.trim()===''?undefined:Number(node.value)]))};
     const knownTimes=root.MOE_COMBAT_CALCULATION_SCOPE.knownUtilityTimes(compiled.bundle,p,skillNames,root.MOE_COMBAT_NUMERICS.duration);
     el('Numbers').textContent=actionLines.join('\n')+'\n'+knownTimes.map(t=>(t.conditional?'参照先（単独成立時）：'+t.name+' / ':'')+'効果時間：'+utilityTime(t)+(t.scope?'\n'+t.scope:'')).join('\n');
     showSummary(null,{...actionScope,knownTimes},actionScope.operations);return;
    }
    if(actionScope?.descriptionOnly&&!optionalSummon){el('Numbers').textContent=actionLines.join('\n')+(actionScope.existingCalculation?'':'\nスキル・魔力による量や時間の計算は、この作用の完成条件に含めません。');showSummary(null,actionScope,actionScope.operations);return;}
   const condition=key=>{if(conditionDefaults.has('combatCatalog'+key)&&relevantConditions&&!relevantConditions.has(key))return undefined;const text=el(key).value.trim();return text!==''&&Number.isFinite(+text)?+text:undefined;};
   const p={...input(),referenceChainConfirmed:el('ReferenceChain').checked,periodicReferenceConfirmed:el('PeriodicReference').checked,targetCategoryMatched:el('TargetCategory').checked,targetDefense:num('Defense'),resistance:num('Resistance'),seed:num('Seed'),random15:num('Random15'),itemClass:num('ItemClass'),targetAmplificationAllowed:el('Amplification').value==='yes',timePeriod:el('TimePeriod').value};
   p.releaseTargetType=el('ReleaseTargetType').value;p.releaseBuff=el('ReleaseBuff').value;
   p.singlePositiveUpdateConfirmed=el('SinglePositiveUpdate').checked;p.fixedUpdateElapsed=condition('FixedUpdateElapsed');
   p.targetMaxHP=condition('MaxHP');p.targetMaxMP=condition('MaxMP');p.percentHpGateClear=el('PercentHpGate').checked;
   p.bladeMode=el('BladeMode').value;p.bladeSelected=el('BladeSelected').checked;p.bladeWeaponAttack=condition('BladeWeaponAttack');p.bladeWeaponHit=condition('BladeWeaponHit');
   p.petLevel=condition('PetLevel');p.castingMovementFactor=condition('CastingMovementFactor');
   p.dirtBefore=condition('DirtBefore');p.petSpecialReady=el('PetSpecialReady').value?el('PetSpecialReady').value==='yes':null;
   p.removableObject=el('RemovableObject').value?el('RemovableObject').value==='yes':null;
   p.criticalCondition={basePercent:condition('CriticalBase'),attackerPoints:condition('CriticalAttacker'),targetPoints:condition('CriticalTarget'),residue:condition('CriticalResidue')};
   p.petExperienceCondition={before:condition('PetExperienceBefore')??null,eligible:el('PetExperienceEligible').value?el('PetExperienceEligible').value==='yes':null,baseRequest:condition('PetExperienceBase')??null,ownerMultiplier:el('PetExperienceNoOwnerBuff').checked?1:null};
   if(!el('CurseConditions').hidden){const text=el('CursedSlots').value.trim();if(text){
    if(text==='なし')p.cursedEquipment=[];
    else{if(text.length>128||!/^\d+(\s*[,、]\s*\d+)*$/.test(text))throw Error('呪い装備の枠を1,5の形式、または「なし」で指定してください');
     const slots=text.split(/[,、]/).map(Number);if(slots.some(s=>s<1||s>17)||new Set(slots).size!==slots.length)throw Error('呪い装備は重複のない1～17の枠で指定してください');p.cursedEquipment=slots.map(slot=>({slot,kind:1,flags:0x400000,empty:false}));}
   }}
   p.summonBaseVariant=el('SummonBaseVariant').checked;
   p.areaBuffChoice=el('AreaBuffChoice').value?Number(el('AreaBuffChoice').value):undefined;
   p.generatedRequestCounts=Object.fromEntries([...generatedRequestCountInputs].map(([id,node])=>[id,node.value.trim()===''?null:Number(node.value)]));p.generatedRequestsNonOverlapping=el('GeneratedRequestsNonOverlapping').checked;
   el('GeneratedSkills').hidden=!el('GeneratedTrapLevelLabel').hidden&&el('GeneratedTrapLevel').checked;
   if(el('GeneratedUnmodified').checked)p.generatedActorCondition={unmodified:true,useTrapLevel:!el('GeneratedTrapLevelLabel').hidden&&el('GeneratedTrapLevel').checked,magic:condition('GeneratedMagic'),attack:condition('GeneratedAttack'),hit:condition('GeneratedHit'),normalNpcTarget:el('GeneratedNormalNpc').checked,useKnownBaseStats:el('GeneratedUseFixedBase').checked,skills:Object.fromEntries([...generatedSkillInputs].map(([raw,node])=>[raw,node.value.trim()===''?undefined:Number(node.value)]))};
   p.fallDamageFactor=condition('FallDamageFactor');p.fallSpeedFactor=condition('FallSpeedFactor');p.fallDamageBefore=condition('FallDamageBefore');p.fallVelocityBefore=condition('FallVelocityBefore');
   p.fallHeight=condition('FallHeight');p.fallSkill=condition('FallSkill');p.fallOverload=condition('FallOverload');p.weatherIndex=condition('WeatherIndex');p.weatherChildAccepted=el('WeatherChildAccepted').checked;
   p.transferEligibleCount=condition('TransferEligibleCount');
   p.areaCondition={elapsedSeconds:condition('AreaElapsed'),existingBuffSeconds:condition('AreaBuffRemaining'),targetType:el('AreaTargetType').value,inside:el('AreaInside').value?el('AreaInside').value==='yes':undefined};
   p.lifetimeCondition={initialSeconds:condition('LifetimeInitial'),remainingSeconds:condition('LifetimeRemaining'),elapsedSeconds:condition('LifetimeElapsed'),category:el('LifetimeCategory').value,present:el('LifetimePresent').value==='yes'};
   if(!el('TransferConditions').hidden&&el('TransferRecords').value.trim()){
    const raw=el('TransferRecords').value;if(raw.length>16384)throw Error('移す効果の入力が長すぎます');
    p.transferRecords=readTransferEffects(raw);
   }
   {const v=['MovementX','MovementY','MovementZ'].map(condition);p.movementDelta=v.every(x=>x!=null)?v:undefined;}
   p.rangeAction=condition('RangeAction');
   p.areaRadiusBase=condition('AreaRadiusBase');p.rangedRangeBase=condition('RangedRangeBase');
   p.normalJumpConfirmed=el('NormalJumpConfirmed')?.checked===true;
   p.itemDelayBaseCounter=condition('ItemDelayBaseCounter');
   p.affectedBaseST=condition('AffectedBaseST');
   p.aiWaitBaseCounter=condition('AiWaitBaseCounter');p.aiWaitExempt=el('AiWaitExempt').checked;p.aiWaitGroup=+el('AiWaitGroup').value;
   p.generatedActionElapsedSeconds=condition('GeneratedActionElapsed');
   p.sourceYaw=condition('SourceYaw');p.targetYaw=condition('TargetYaw');
   p.restrictionActionId=condition('RestrictionAction');
   p.weaponWearConfirmed=el('WeaponWearConfirmed')?.checked===true;p.weaponDurabilityRaw=condition('WeaponDurability');p.weaponKeepsOne=el('WeaponWearFloor')?.value==='1';
   p.shotDistance=condition('ShotDistance');
   p.activeRangeRecords=state.active.filter(r=>r.target===p.caster).map(r=>({id:r.definitionId,conflictGroup:r.reference.conflict.conflictGroup,effects:r.rows.filter(e=>e.active&&[245,248].includes(e.kind)&&!((e.flags&0x100)&&!(e.flags&0x200)&&p.world===1||(e.flags&0x200)&&!(e.flags&0x100)&&p.world!==1))}));
   p.hostilityBefore=condition('HostilityBefore');p.facingBefore=condition('FacingBefore');p.floatHeight=condition('FloatHeight');p.sinkingBefore=condition('SinkingBefore');
   p.hostilityPromoted=el('HostilityPromotion')?.value==='yes'?true:el('HostilityPromotion')?.value==='no'?false:undefined;
   p.elementalReflectionSelected=!!el('ElementalReflectionSelected')?.checked;
   p.magicBodyBranch=el('MagicBodyBranch')?.value==='yes'?true:el('MagicBodyBranch')?.value==='no'?false:undefined;
   p.tamePetLevelSum=condition('TamePetLevelSum');p.tameTargetLevel=condition('TameTargetLevel');
   p.barrierHitsBefore=condition('BarrierHitsBefore');p.damageReactionBranch=!!el('DamageReactionBranch')?.checked;p.weaponWeight=condition('WeaponMass');
   p.carnivalUnopposed=el('CarnivalUnopposed').checked;p.carnivalResetAttackCount=condition('CarnivalResetAttackCount');p.carnivalCategory=condition('CarnivalCategory');p.carnivalTarget=el('CarnivalTarget').value;p.swimAbilityBefore=condition('SwimAbility');
   p.perceptionRaw=condition('PerceptionRaw');p.perceptionDistance=condition('PerceptionDistance');
   p.craftingSelector=condition('CraftingSelector');p.craftingSlipBefore=condition('CraftingSlipBefore');p.craftingSpeedBefore=condition('CraftingSpeedBefore');
   p.visualFogAdmitted=el('VisualFogAdmitted').checked?true:undefined;
   p.equipmentDurabilityRaw=condition('EquipmentDurability');p.equipmentKeepsOne=el('EquipmentFloor').value==='1';
   p.targetCurrentHP=condition('CurrentHP');p.absorptionBasis=condition('AbsorptionBasis');p.absorptionSelected=el('AbsorptionSelected').checked;
   p.casterCurrentMP=condition('CasterCurrentMP');
   p.targetCurrentMP=condition('TargetCurrentMP');p.receivedHpAmount=condition('ReceivedHpAmount');
   p.targetMaxST=condition('TargetMaxST');
   p.numericTargetType=el('NumericTargetType').value||undefined;
   if(compiled?.bundle.row.internalId===4675&&!p.numericTargetType)p.numericTargetType='npc';
   p.incomingElementMatched=el('IncomingElement').value===''?undefined:el('IncomingElement').value==='yes';
   p.casterMaxHP=condition('CasterMaxHP');p.casterCurrentHP=condition('CasterCurrentHP');p.interruptCondition=el('InterruptCondition').value;
   p.interruptNpcProfile=el('InterruptNpcProfile').value;p.interruptNpcLevel=condition('InterruptNpcLevel');p.interruptNpcRandom15=condition('InterruptNpcRandom15');
   p.replacementBuffId=condition('ReplacementBuff');p.replacementMarked=el('ReplacementState').value?el('ReplacementState').value==='marked':null;p.replacementSameSource=el('ReplacementSource').value?el('ReplacementSource').value==='same':null;
   p.appearanceSpecies=condition('AppearanceSpecies');p.appearanceSex=condition('AppearanceSex');
   p.evasionHolder=el('EvasionHolder').value;p.incomingHit=condition('IncomingHit');p.holderEvasion=condition('HolderEvasion');p.incomingBypassesEvasion=el('IncomingBypass').value===''?undefined:el('IncomingBypass').value==='yes';
   p.guardBranchConfirmed=el('GuardBranch').checked;p.preGuardDamage=condition('PreGuardDamage');
   p.guardGroundTimingConfirmed=el('GuardGroundTiming').checked;p.guardRegularClockConfirmed=el('GuardRegularClock').checked;p.guardDelayedStart=el('GuardDelayedStart').checked;const scheduledGuard=el('GuardClockMode').value==='scheduled';el('GuardCurrentCounter').disabled=scheduledGuard;el('GuardScheduledMilliseconds').disabled=!scheduledGuard;p.guardCurrentCounter=scheduledGuard?null:condition('GuardCurrentCounter');p.guardScheduledMilliseconds=scheduledGuard?condition('GuardScheduledMilliseconds'):null;
   p.passiveLearnedConfirmed=el('PassiveLearnedConfirmed').checked;
   p.normalPcPhysicalConfirmed=el('NormalPcPhysical').checked;p.normalPcPhysicalDefense=condition('NormalPcPhysicalDefense');p.normalPcPhysicalCritical=el('NormalPcPhysicalCritical').checked;
   p.targetPhysicalReductionId=condition('TargetPhysicalReduction');
   p.targetMagicReductionId=condition('TargetMagicReduction');
   p.npcArmorConfirmed=el('NpcArmorConfirmed').checked;p.npcArmorDefense=condition('NpcArmorDefense');p.npcArmorGearDefense=condition('NpcArmorGearDefense');p.npcArmorWearSkill=condition('NpcArmorWearSkill');p.npcArmorPower=condition('NpcArmorPower');p.npcArmorCritical=el('NpcArmorCritical').checked;
   p.guardIncomingAction=condition('GuardIncomingAction');p.guardRandom31=condition('GuardRandom31');p.guardFullBlockConfirmed=el('GuardFullBlock').checked;
   p.guardShieldId=condition('GuardShield');p.guardShieldSkill=condition('GuardShieldSkill');p.guardShieldRegionAllowed=el('GuardShieldRegion').value===''?undefined:el('GuardShieldRegion').value==='yes';
   p.guardReplayUnmodified=el('GuardReplayUnmodified').checked;p.guardReplayResistance=condition('GuardReplayResistance');p.guardReplayDefense=condition('GuardReplayDefense');p.guardAmmoCondition=el('GuardAmmoCondition').checked;
   p.guardIncomingSkill=condition('GuardIncomingSkill');p.guardIncomingMagic=condition('GuardIncomingMagic');p.guardIncomingSkillAdjustment=condition('GuardIncomingSkillAdjustment');p.guardMagicBranchConfirmed=el('GuardMagicBranch').checked;
   const guardMagic=root.MOE_COMBAT_NUMERICS.guardMagicInputs?.[p.guardIncomingAction];el('GuardIncomingSkillLabel').textContent=guardMagic?.primaryName?'相手魔法の'+guardMagic.primaryName+'（'+guardMagic.name+'）':'相手魔法の主スキル（選択した魔法の主スキル値）';
   p.buffReflectionDamage=condition('BuffReflectionDamage');p.buffReflectionOnly=el('BuffReflectionOnly').checked;
   p.physicalCategoryMatched=el('PhysicalCategory').value===''?undefined:el('PhysicalCategory').value==='yes';
   p.buffActionSkill=condition('BuffActionSkill');p.buffHitBefore=condition('BuffHitBefore');p.protectionDistance=condition('ProtectionDistance');
   p.reactionSelected=el('ReactionSelected').checked;
   p.reactionLastAcceptedSeconds=condition('ReactionLastAcceptedSeconds');
   p.referenceSimultaneous=el('ReferenceSimultaneous').checked;
   p.referenceReceiptOrder=el('ReferenceReceiptOrder').value;
   p.otherLightProfile=condition('OtherLightProfile');
   p.reverseReferenceNormalPc=el('ReverseReferenceNormalPc').checked;p.reverseReferenceNpcUnarmed=el('ReverseReferenceNpcUnarmed').checked;p.reverseReferenceNpcWeapon=el('ReverseReferenceNpcWeapon').checked;p.reverseReferenceNpcShieldId=condition('ReverseReferenceNpcShield');p.reverseReferenceNpcShieldSkill=condition('ReverseReferenceNpcShieldSkill');p.reverseReferenceGearDefense=condition('ReverseReferenceGearDefense');p.reverseReferenceWearSkill=condition('ReverseReferenceWearSkill');p.reverseReferenceSkill=condition('ReverseReferenceSkill');p.reverseReferenceAttack=condition('ReverseReferenceAttack');p.reverseReferenceHit=condition('ReverseReferenceHit');p.reverseReferenceDamageConfirmed=el('ReverseReferenceDamage').checked;p.reverseReferenceDefense=condition('ReverseReferenceDefense');p.reverseReferenceCritical=el('ReverseReferenceCritical').checked;
   p.referenceSelfCenterTargetConfirmed=el('ReferenceSelfCenterTarget').checked;
   p.theftInputBefore=condition('TheftInputBefore');p.theftRequestSelector=condition('TheftRequestSelector');
   const guardWindow=el('GuardWindow').value;p.guardInWindow=guardWindow?guardWindow!=='outside':undefined;p.guardBlocked=guardWindow?guardWindow==='blocked':undefined;
   p.reuseRequest={actionType:condition('ReuseType'),rawSkill:condition('ReuseSkill'),weaponEligible:condition('ReuseType')===2,concentration:condition('Concentration')};
   p.reuseMagicPercent=condition('ReuseMagicPercent');p.reuseWeaponPercent=condition('ReuseWeaponPercent');
   let attackContextError='';
   try{
    const {cfg,value:m,capture}=calculationMetrics(compiled.bundle.attack?.calculationSupported!==false&&compiled.bundle.row.attackKey?compiled.bundle.row.attackKey:'attack');
    // The configured build is actor A. No equipment has been supplied for B.
    p.equipmentBuffRows=p.caster==='A'?(capture.resolvedBuffState?.composite||[]):[];
    p.casterResistances=['fireRes','waterRes','windRes','earthRes'].map(k=>m.totalStats?.[k]);
    p.drunk=cfg.inputs.drunk;p.damageContext=m.techniqueContext||{attack:m.atk,hit:m.playerHit,defense:m.defense,powerMultiplier:m.dmgMultiplier,incoming:m.basePostMultiplier,targetMultiplier:m.npcDamageTakenMultiplier,
     hpPercent:cfg.inputs.techniqueHpPercent??100,statCache:{91:0,89:m.extraStats.extraKickHit,90:m.extraStats.extraFangHit,94:m.extraStats.extraKickAttack,95:m.extraStats.extraFangAttack}};p.attack=m.atk;
   }catch(e){attackContextError=e.message;}
   if(basicRelevant?.has('Attack')??true){p.attack=sourceStat('Attack');if(p.damageContext)p.damageContext={...p.damageContext,attack:p.attack};}
   if(compiled.bundle.row.independentPhysicalChildren?.includes(13576)&&el('IndependentShotSelected').checked)p.physicalChildContexts={13576:{...p.damageContext,attack:condition('LeftShotAttack'),hit:condition('LeftShotHit')}};
   p.dualWeaponConfirmed=el('DualWeaponConfirmed').checked;p.dualWeaponLeft=el('DualWeaponLeft').value;p.dualWeaponLeftAttack=condition('DualWeaponLeftAttack');p.dualWeaponLeftHit=condition('DualWeaponLeftHit');
   latestNumericInputs=p;
   const result=root.MOE_COMBAT_NUMERICS.evaluate(compiled.bundle,p,skillNames),nodes=[compiled.bundle.row.definition,...compiled.bundle.row.dependencies].filter(Boolean),lines=[...actionLines];
   if(result.receivedDefinition){const q=result.receivedDefinition;lines.push('受理済み段階の条件付き計算：'+(q.supported?q.name:q.reason));lines.push(q.scope);if(q.time?.supported)lines.push('選択段階の保持指定：'+fmt(q.time.seconds)+'秒');for(const e of q.effects.filter(e=>e.supported&&!e.timeOnly&&Number.isFinite(e.value)))lines.push('  選択段階 / '+e.name+' '+fmt(e.value)+(e.unit||''));lines.push('以下の本体・参照先は各定義の単独内訳です。段階をまたいで加算しません。');}
   if(p.fixedUpdateElapsed!=null)lines.push('更新の計算条件：毎更新の効果カウンタ減少 '+p.fixedUpdateElapsed+'（内部elapsed）。秒への換算・実際の更新頻度は未確定。条件付き回数と要求小計を表示します。');
   el('ReverseReferenceConditions').hidden=!result.effects.some(e=>e.reverseReferencePower);
   const equipment=root.MOE_EQUIPMENT_BUFF_NUMERICS?.collect(p.equipmentBuffRows,p.world);
   const firePanel=el('EquipmentFire');if(firePanel)firePanel.hidden=!(equipment?.reductions[3]>0);
   if(equipment?.names.length){
    lines.push('装備Buff（通常世界・有効な選択を1回ずつ適用）：'+equipment.names.join(' / '));
    if(Object.keys(equipment.skills).length)lines.push('効果計算専用のスキル加算：'+Object.entries(equipment.skills).map(([k,v])=>k+' +'+fmt(v)).join(' / ')+'。入力した必要スキル・成功率には加算しません。');
    if(equipment.elements[4])lines.push('装備Buffの水属性効果補正：+'+fmt(equipment.elements[4]*100)+'%（倍率Mに適用。最終ダメージ全体の倍率とは別）');
    const fireInput=el('EquipmentFireDamage')?.value;
    if(equipment.reductions[3]>0){
     lines.push('火属性要求量の軽減：'+fmt(equipment.reductions[3])+'%（このkind273を選択した条件）');
     if(fireInput?.trim()){const q=root.MOE_EQUIPMENT_BUFF_NUMERICS.incomingFire(p.equipmentBuffRows,fireInput,p.world);lines.push('軽減前の火属性要求量 '+fmt(q.before)+' → '+fmt(q.after)+'。'+q.scope);}
    }
   }
   const scoped=root.MOE_COMBAT_CALCULATION_SCOPE?.assess(compiled.bundle,result),optionalIds=new Set(scoped?.effectIds||[]),stateOnlyIds=new Set((scoped?.deferredState||[]).map(e=>e.id)),conditionalById=new Map((scoped?.conditionalNumerics||[]).map(q=>[q.id,q]));
   showSummary(result,scoped,actionScope?.operations||[]);
   if(result.dualWeaponRoute){const q=result.dualWeaponRoute;lines.push('左右武器の条件付き連続攻撃：'+q.steps.map(s=>(s.side==='right'?'右手':'左手')+'（'+s.id+'）').join(' → '));lines.push('  '+q.scope);}
   if(result.generatedRequestTotals?.parts.length){const q=result.generatedRequestTotals;lines.push('生成行動の指定回数による資源要求小計：'+q.scope);for(const c of q.parts)lines.push('  '+c.name+' / 全生成参照で '+c.requests+'回'+c.quantities.map(e=>' / '+e.recipient+' '+e.name+' '+fmt(e.value)+e.unit+'×'+e.requests+' = '+fmt(e.total)+e.unit+'（1行動内 '+e.perActionCount+'要求）').join(''));for(const m of q.missing)lines.push('  子行動小計の未計算：'+m.name+' / '+m.reason);}
   if(result.dualWeaponReason)lines.push('左右武器の計算：'+result.dualWeaponReason);
   if(result.effects.some(e=>e.weatherRequest?.accepted))lines.push('天候子：親1使用につき選択した子を1回要求。持続終了 '+fmt(result.referenceLifetime.seconds)+'秒（解除・更新・延長なし）。晴は持続Buffを作らず、動作時間とは別です。');
   for(const q of result.guardWindows||[])if(q.supported)lines.push(q.name+'の防御受付：開始 '+fmt(q.start)+'以上 ～ 終了 '+fmt(q.end)+'未満 / 受付幅 '+fmt(q.width)+' / 動作全体 '+fmt(q.total)+'（内部カウンタ）'+(q.current===null?' / 現在値は未指定':' / 現在 '+fmt(q.current)+'：'+(q.inWindow?'受付中':'受付時間外')+' / 終了まで '+fmt(q.remaining))+'。'+q.scope);else lines.push('防御受付カウンタ：'+q.reason);
   for(const q of result.guardWindows||[])if(q.scheduledClock){const t=q.scheduledClock;lines.push('  防御受付の基準予定時間：'+fmt(t.startSeconds)+'秒以上 ～ '+fmt(t.endSeconds)+'秒未満 / 受付幅 '+fmt(t.acceptedSeconds)+'秒 / 動作全体 '+fmt(t.actionSeconds)+'秒。'+t.scope);}
   if(result.effects.some(e=>e.channels?.receipt))lines.push('パッシブ登録：習得済み・必要スキルなどの発動条件を満たし、通常PCに受理された条件。倍率1・加算0の保持値を使用。スキルや魔力で増幅せず、条件が失われた後の保持は保証しません。');
   for(const q of result.rangeProjection||[])lines.push('有効な成功時Buffの'+(q.kind===245?'攻撃範囲半径':'銃・弓・投げ射程')+'：'+(q.after==null?'加算 '+fmt(q.addition)+' / '+q.reason:fmt(q.before)+' → '+fmt(q.after)+' / '+q.scope));
   for(const d of nodes){const rows=result.effects.filter(e=>e.definitionId===d.id&&e.supported),time=result.times.find(t=>t.definitionId===d.id);
    lines.push((d.id===compiled.id?'本体：':'参照先（個別成立時）：')+d.name);
    for(const note of root.MOE_COMBAT_NUMERICS.wikiNotes?.[d.id]||[])lines.push('wiki・観測との照合：'+note);
    lines.push(scoped?.timeIds.includes(d.id)?'持続時間：計算不要（召喚・動作の説明対応）'+(optionalSummon&&time?.supported?' / 参考：'+fmt(time.seconds)+'秒 / '+time.kind:''):'持続時間：'+(time?.supported?(time.finiteDuration===false?'固定秒数なし / ':fmt(time.seconds)+'秒 / ')+time.kind+(time.partial?'（'+time.reason+'）':''):'計算未対応：'+time?.reason));
    if(time?.bodySeconds!=null)lines.push('本体の持続：'+fmt(time.bodySeconds)+'秒（'+(d.effects.some(e=>e.kind===96)?'自己延長前の元時間':'召喚・設置物の寿命と別')+'）');
    if(time?.scope)lines.push('  時間の条件：'+time.scope);
    const physical=result.physicalResults.find(v=>v.definitionId===d.id);if(physical){lines.push('物理ダメージ '+fmt(physical.value)+' / '+physical.scope);
     if(physical.targetReduction){const q=physical.targetReduction;lines.push('受け手の属性軽減：'+(q.supported?q.name+' / '+(q.applies?fmt(q.before)+' → '+fmt(q.after)+'HP（軽減後の本体1回量へ反映）':q.reason):'未計算：'+q.reason));if(q.scope)lines.push('  '+q.scope);}
     if(physical.normalPcProjection){const q=physical.normalPcProjection;lines.push('通常PCへの物理ダメージ比較：'+(q.supported?fmt(q.value)+'HP / '+q.scope:'計算未対応：'+q.reason));}
     for(const q of physical.secondaryMessages)lines.push('物理付随・使用者 '+({1:'ST',2:'HP',4:'MP'}[q.messageType])+'回復要求 '+fmt(Math.abs(q.amount))+'（命中した本体1回から生成。実減少HP基準ではありません）');}
    else if(result.constructorErrors[d.id])lines.push('物理入力：'+result.constructorErrors[d.id]);
    for(const r of result.effects.filter(e=>e.definitionId===d.id&&(e.magicReplay||e.ammunitionRecovery)&&!e.supported))guardExtraLines(r,lines);
    for(const r of rows){if(optionalIds.has(r.id)&&!optionalSummon)continue;lines.push((optionalIds.has(r.id)?'参考（完成条件外）：':'')+r.recipient+' / '+r.name+' '+fmt(r.value)+r.unit+(r.active===false?'（世界・時間帯条件で無効）':'')+(r.count>1?(r.initialValue!=null?' / 初回1回＋更新'+(r.count-1)+'回':' ×'+r.count+'回')+' / 合計 '+fmt(r.total)+r.unit+(r.intervalSeconds==null?' / 初回・更新の受理回数（実頻度は未確定）':' / 公称間隔 '+fmt(r.intervalSeconds)+'秒'):''));if(r.remaining&&(![8,9,89,94,169].includes(r.kind)||optionalSummon))lines.push((optionalIds.has(r.id)?'  参考情報の未確定範囲：':stateOnlyIds.has(r.id)?'  状態再現の残件：':'  計算未対応：')+(conditionalById.get(r.id)?.remaining||r.remaining));
     if(r.valuePhase)lines.push('  1回分の入力：'+r.valuePhase);
     if(r.channels?.targetReduction){const q=r.channels.targetReduction;lines.push('  効果量の属性軽減：'+q.name+' / '+(q.applies?fmt(q.percent)+'%を量の生成へ反映':q.reason)+'。'+q.scope);}
     if(r.channels?.magicReduction){const q=r.channels.magicReduction;lines.push('  効果量の魔法軽減：'+q.name+' / '+(q.applies?fmt(q.percent)+'%を量の生成へ反映':q.reason)+'。'+q.scope);}
     if(r.npcArmorProjection){const q=r.npcArmorProjection;
      if(!q.supported)lines.push('  NPCからの被ダメージ比較：未計算 / '+q.reason);
      else {lines.push('  NPC物理に対する防御比較：防御力 '+fmt(q.before.defense)+' → '+fmt(q.after.defense)+' / 装備由来の寄与 '+fmt(q.before.contribution)+' → '+fmt(q.after.contribution)+' / 有効防御力 '+fmt(q.before.effectiveDefense)+' → '+fmt(q.after.effectiveDefense));
       lines.push(q.hit?'  同じ威力のNPC攻撃1回：'+fmt(q.hit.before)+' → '+fmt(q.hit.after)+'HP（'+(q.hit.critical?'クリティカル':'通常命中')+'・指定種値）':'  NPC攻撃の損傷量：未計算 / '+(q.damageReason||'威力入力が未指定です。有効防御力だけを比較します'));
       lines.push('  '+q.scope+' '+q.damageInputNote);
      }
     }
     if(r.jump)lines.push('  ジャンプ1回の初期鉛直値：'+(r.jump.initial==null?r.jump.conditionReason:fmt(r.jump.initial)+' / '+r.jump.scope));
     if(r.itemDelay)lines.push('  アイテム使用の待ち補正：'+fmt(r.itemDelay.percent)+'% / '+(r.itemDelay.counter==null?'補正前待ち値が未指定。倍率だけを表示':fmt(r.itemDelay.baseCounter)+' → '+fmt(r.itemDelay.counter)+'（内部カウンタ）')+'。秒数・再使用時刻とは別。複数の補正は登録表の後方の該当定義が優先され、重ね掛けではありません');
     if(r.stConsumption){const q=r.stConsumption;lines.push('  ST消費補正：'+q.multiplier+'倍 / '+(q.projection?'基礎 '+fmt(q.projection.baseST)+'ST → 消費要求 '+fmt(q.projection.request)+'ST（スキル軽減・他の消費補正は1）':'基礎STが未指定。消費要求量を0にはしません')+'。同じフラグは重ねて4倍になりません。'+q.scope);}
     if(r.resourceCostProjection){const q=r.resourceCostProjection;lines.push('  ST消費要求：基礎 '+fmt(q.baseST)+'ST → '+fmt(q.request)+'ST（この倍率だけを適用し、スキル軽減・他の補正は1。Buff自身のコスト・成否時の実消費とは別）');}
     if(r.reverseReferencePower){const q=r.reverseReferencePower;lines.push('  元の対象'+(q.npcSource?'NPC':'PC')+'が生成する子：'+q.childName+' / '+q.skillName+' '+fmt(q.inputs.skill)+(q.power.shield?'（NPCの盾装備枝）':q.npcSource&&!q.power.weapon?'（装備なし固定枝）':' / 攻撃 '+fmt(q.inputs.attack)+' / 命中 '+fmt(q.inputs.hit))+' → 防御前威力 '+fmt(q.power.preSpecialPower)+'（格納威力 '+q.power.encodedPower+'）。'+q.scope);}
     if(r.reverseReferencePower?.normalPcDamage){const q=r.reverseReferencePower.normalPcDamage;lines.push('  反転した子の通常PCへの1回HP要求量：'+fmt(q.value)+'HP。同じ1要求を子として重複加算しません。'+q.scope);}
     if(r.reverseReferencePower?.normalPcDamage?.targetReduction){const q=r.reverseReferencePower.normalPcDamage.targetReduction;lines.push('  反転した子と属性軽減：'+q.reason+'。PCへの1回量をNPC向けへ置換しません');}
     if(r.reverseReferencePower?.damageReason)lines.push('  反転した子のHP要求量：'+r.reverseReferencePower.damageReason+'。防御前威力だけを表示し、未指定を0にしません');
     if(r.actionWait){const q=r.actionWait;lines.push('  AI行動待機：加算 '+fmt(q.additionSeconds)+'秒（'+q.addition+'ms） / '+(q.after==null?'補正前の待ち値が未指定。合成待ちは未計算':q.waitingDisabled?'この共通待ち枝を省略':q.baseCounter+' → '+q.after+'ms / 公称基準 '+fmt(q.timer.nominalSeconds)+'秒 / 抽選補正後 '+(q.seconds==null?'整数未指定':fmt(q.seconds)+'秒')+' / 範囲 '+fmt(q.timer.minimumSeconds)+'～'+fmt(q.timer.maximumSeconds)+'秒')+'。'+q.scope);}
     if(r.hpUpperPredicate){const q=r.hpUpperPredicate;lines.push('  使用者HP条件：'+(q.allowed==null?q.reason:q.current+' / '+q.maximum+' → '+(q.allowed?'この条件を通過':'この条件は不成立'))+'。等号を含めて上限'+fmt(q.percent)+'%。他の発動条件・成否とは別で、損傷値は条件成立時の参考です。');}
     if(r.range)lines.push('  範囲補正：'+(r.range.after==null?r.range.reason:fmt(r.range.before)+' → '+fmt(r.range.after)+' / '+r.range.scope));
     else if(r.rangeReason)lines.push('  合成値：'+r.rangeReason+'。加算値だけは計算済み');
     if(r.theft){const q=r.theft;lines.push('  盗取・補助入力：補正前 '+fmt(q.basis)+' → 加算後 '+fmt(q.uncapped)+' → 上限適用後 '+fmt(q.requestInput)+'（成功率・数量ではありません）。'+q.scope);}
     else if(r.theftReason)lines.push('  盗取・補助入力は未計算：'+r.theftReason+'。未指定値を0にしません');
     if(r.singlePositiveUpdate)lines.push('  条件付き1更新分（残りカウンタ1）。更新間隔の秒数・毎秒量ではありません。');
     if(r.unresolvedMetadata)lines.push('  判明した要求量と別の残件：'+r.unresolvedMetadata);
     if(r.initialValue!=null)lines.push('  初回 '+fmt(r.initialValue)+r.unit+' / 更新1回 '+fmt(r.value)+r.unit+'（初回と更新を区別して合計）');
     if(r.modeInfo)lines.push('  発生区分：'+r.modeInfo.scope);
     if(r.scope)lines.push('  範囲：'+r.scope);
     if(r.lifetimeExtension){const q=r.lifetimeExtension;lines.push('  延長：元の残り '+fmt(q.originalRemaining)+'秒 / 内部カウンタ上の残り '+fmt(q.counterRemaining)+'秒 / 延長の終了を含む公称残り '+fmt(q.remainingSeconds)+'秒 / 延長開始からの終了境界 '+fmt(q.endSeconds)+'秒。'+(q.expired?'既に終了':q.eligible?'有限Buffに適用':'この分類は延長対象外')+'。'+q.scope);}
     else if(r.lifetimeExtensionReason)lines.push('  対象Buffの終了計算：'+r.lifetimeExtensionReason+'（未指定値を0にしません）');
     if(r.transferredRecords){const q=r.transferredRecords;lines.push('  最新からの移送要求 '+q.count+'件。'+q.scope);for(const x of q.records)lines.push('    '+x.key+' / 元の残り '+fmt(x.remainingSeconds)+'秒（リセットなし） / '+x.quantities.map(v=>v.name+' '+fmt(v.value)+v.unit).join('、'));}
     if(r.transferCopyReason)lines.push('  元レコードの移送計算：'+r.transferCopyReason);
     if(r.hpAmplification){const q=r.hpAmplification;lines.push('  HP要求量：'+fmt(q.before)+' → '+fmt(q.amount)+' HP（正の損傷のみ '+fmt(q.multiplier)+'倍・上限10000）。回復量・実HP更新とは別。');}
     if(r.naturalRecovery){const q=r.naturalRecovery;lines.push('  秒換算 '+fmt(r.active===false?0:q.perSecond)+q.resource+'/秒（参考）。分間値は速度換算で、技の実総量ではありません。');lines.push('  推定根拠：ジェネレイト ボディの公開実測 通常60HP/秒・WarAge24HP/秒と内部係数1・0.4を比較。内部elapsed 60単位≒1秒。誤差幅は未確定。添付wiki本文との直接照合は未完了。');lines.push('  推定出典：'+q.calibration.url);}
     if(r.equipmentRestriction){const q=r.equipmentRestriction;lines.push('  装備制限：内部索引 '+(q.restrictedIndices.join(', ')||'なし')+' / '+q.scope);}
     if(r.fallResult){const q=r.fallResult;lines.push('  '+(r.kind===113?'軽減前 '+fmt(q.before)+'HP → 落下損傷要求 '+fmt(q.amount)+'HP':'鉛直移動値 '+fmt(q.before)+' → 1更新後 '+fmt(q.after)+' / 下降限界 '+fmt(q.limit))+'。'+q.scope);}
     if(r.movement){const q=r.movement,v=a=>'('+a.map(fmt).join(', ')+')';lines.push('  吹き飛ばし初期値（大きさ） '+fmt(q.initialMagnitude)+' / 減衰累計（大きさ） '+fmt(q.totalMagnitude)+'（単位なし・1要求分）');lines.push('  初期加算 '+v(q.initial)+' / 1更新後の残留 '+v(q.first.after)+' / 減衰累計 '+v(q.total)+'（X, Y, Z・単位なし）');lines.push('  累計は他の移動・途中の再付与・衝突なしの条件。持続する技の全発動分を足した値とは区別します。');}
     if(r.magicRange?.selected){const q=r.magicRange;lines.push('  '+q.selected.name+'の定義射程 '+fmt(q.selected.base)+' → '+fmt(q.after)+'（体格などの補正前）');}
     if(r.hold){const q=r.hold;lines.push('  中断抵抗の加算 '+fmt(q.addition)+' / 整数閾値 '+q.threshold+' / 剰余 '+q.roll+' → '+(q.blocked?'抵抗成立':'中断処理へ進む')+'。'+q.scope);}
     if(r.elementalReflection){const q=r.elementalReflection;lines.push('  反射一次閾値 '+q.threshold+' / 指定乱数の下位byte '+q.roll+' / '+(q.requested==null?'候補選択・属性条件が未指定':q.requested?'反射処理を1回要求':'反射要求なし')+'。最終HP量とは別');}
     if(r.magicBodyGate)lines.push('  '+(r.magicBodyGate.blocked?'この魔法本体の効果要求を遮断（本体からの数量0）':'この状態による遮断なし（後段の最終量は別計算）'));
     if(r.swim)lines.push('  水中移動倍率への寄与 '+fmt(r.swim.contribution)+'倍'+(r.swim.factor==null?' / 補正前能力が未指定':' / 能力 '+fmt(r.swim.before)+' → '+fmt(r.swim.after)+' / 適用倍率 '+fmt(r.swim.factor)+'倍')+'。最終移動速度・秒換算は別');
     if(r.castingMovement){const q=r.castingMovement;lines.push('  集中力からの係数 '+fmt(q.base)+' × 採用倍率 '+fmt(q.held)+' → 移動入力倍率 '+fmt(q.factor)+'倍。'+q.scope);}
     if(r.tameCapacity?.remaining!=null)lines.push('  指定対象を含むレベル余裕 '+fmt(r.tameCapacity.remaining)+' / レベル条件'+(r.tameCapacity.levelEligible?'成立':'不成立')+'（手懐けの最終成功とは別）');
     if(r.barrierHits?.after!=null)lines.push('  受信回数 '+r.barrierHits.before+' → '+r.barrierHits.after+' / 残り '+r.barrierHits.remaining+'回 / '+(r.barrierHits.expires?'この機会で終了カウンタ0':'回数終了に未到達'));
     if(r.barrierAbsorb){const q=r.barrierAbsorb;lines.push('  整数HP要求 '+fmt(q.damage)+' / 吸収 '+fmt(q.absorbed)+' / 容量残り '+fmt(q.after)+' / 未吸収 '+fmt(q.unabsorbed)+'HP（この障壁だけを適用）');}
     if(r.damageRecovery)lines.push('  元の整数HP要求 '+fmt(r.damageRecovery.damage)+' から '+(r.damageRecovery.requested?'自己回復要求1回':'回復要求なし')+'。実減少HPを基準にした値ではありません');
     if(r.hostility?.after!=null){const q=r.hostility;lines.push('  '+(q.reset?'関係先NPCの':'対象NPCの')+'既存敵対値 '+fmt(q.before)+' → 通常加算後 '+fmt(q.after)+'（順位変更時の追加量前）');}
     if(r.hostility?.final!=null)lines.push('  指定した順位条件の反映後 '+fmt(r.hostility.final)+'（'+(r.hostility.promoted?'元順位1以降から先頭へ昇格・要求2倍を追加':'追加なし')+'、上限10000）');
     if(r.turn?.after!=null)lines.push('  向き '+fmt(p.facingBefore)+' → '+fmt(r.turn.after)+'ラジアン（正規化前）');
     if(r.launch)lines.push('  初速 '+fmt(r.launch.initial)+' → 通常空中1更新後 '+fmt(r.launch.after)+'（鉛直内部値）');
     if(r.floating?.increment!=null)lines.push('  指定相対高さ '+fmt(p.floatHeight)+' / 1更新鉛直加算 '+fmt(r.floating.increment)+'（内部値）');
     if(r.sinking)lines.push('  合成した鉛直補正 '+fmt(r.sinking.combined)+' / 条件付き1更新 '+fmt(r.sinking.velocity));
     if(r.carnivalDamage){const q=r.carnivalDamage;lines.push('  カーニバル・条件付き1回要求 '+fmt(q.amount)+'HP / 基準 '+fmt(q.base)+' → 外部倍率後 '+fmt(q.scaled)+' → 対象補正後 '+fmt(q.amount)+'。'+q.scope);if(r.carnivalReset){const t=r.carnivalReset;lines.push('  カーニバル置換：通常リセットまで最大1回 / '+(t.count===null?'条件付き回数は未指定':t.count+'回の条件付き合計 '+fmt(t.conditionalTotal)+'HP')+'。'+t.scope);}}
     if(r.carnivalDamage?.targetReduction)lines.push('  カーニバルと属性軽減：'+r.carnivalDamage.targetReduction.scope);
     if(r.absorption){const q=r.absorption;lines.push('  使用者 '+q.resource+'吸収回復要求 '+fmt(q.amount)+' / 制限前の要求 '+fmt(q.basis)+' × 保存吸収率 → 未制限の回復 '+fmt(q.raw)+'。'+q.scope);}
     else if(r.kind===234)lines.push('  吸収回復量は未計算：'+(r.absorptionReason||'このBuffが選択済み・固有吸収なしの条件と、kind2の制限前HP要求量を指定してください'));
     if(r.perception){const q=r.perception;lines.push('  NPC定義補正 '+q.raw+' → 整数補正 '+q.adjusted+' / 範囲倍率 '+fmt(q.multiplier)+(q.after==null?'（範囲値未指定）':' / 補正前範囲 '+fmt(q.distance)+' → '+fmt(q.after))+'。敵対量や最終発見可否とは別');}
     if(r.hitAddition)lines.push('  指定スキルの行動命中入力 '+fmt(r.hitAddition.before)+' → '+fmt(r.hitAddition.after)+'（格納上限前、最終命中率と別）');
     if(r.protection)lines.push('  指定距離 '+fmt(r.protection.distance)+' / 距離条件'+(r.protection.within?'成立':'不成立')+'（等号は不成立。対象切替後の最終損傷量と別）');
     if(r.mpBurst)lines.push('  別要求：使用者のMPを '+fmt(r.mpBurst.mpRequest)+' 減少（効果発生時。技開始時の基本消費とは別）');
     if(r.thresholdDefense)lines.push('  受信HP要求 '+fmt(r.thresholdDefense.before)+' → '+fmt(r.thresholdDefense.after)+'（最終HP保存より前）');
     if(r.resourceDefense){const q=r.resourceDefense;lines.push('  整数化した損傷入力 '+fmt(q.damage)+'HP');
      if(q.mpBefore!=null)lines.push('  MP '+fmt(q.mpBefore)+' → 保存要求 '+fmt(q.mpRequested)+'（下限0でMP減少 '+fmt(q.mpDecrease)+'）。不足分HP損傷 '+fmt(q.hpDamage));
      if(q.hpBefore!=null)lines.push('  HP '+fmt(q.hpBefore)+' → 保存要求 '+fmt(q.hpRequested)+' / 効果を消費する条件 '+(q.consumed?'成立':'不成立')+'（損傷が現在HP+1を超える）');}
     if(r.hpCondition)lines.push('  残HP条件：現在 '+fmt(r.hpCondition.current)+' / 上限 '+fmt(r.hpCondition.threshold)+'（最大HP '+fmt(r.hpCondition.maximum)+'） / '+(r.active!==false&&r.hpCondition.eligible?'成立':'不成立'));
     if(r.wear?.after!=null)lines.push('  '+(r.kind===72?'使用武器':'指定装備')+'の内部耐久 '+fmt(r.wear.before)+' → '+fmt(r.wear.after)+' / 通常の表示耐久 '+fmt(r.wear.displayBefore)+' → '+fmt(r.wear.displayAfter)+'（1要求。別の装備枠の行とは合算しません）');
     if(r.requestGate)lines.push('  指定15bit値の一次抽選：'+(r.active!==false&&r.requestGate.passed?'要求する':'要求しない')+' / 抽選閾値 '+fmt(r.requestGate.threshold)+' / 抽選値 '+fmt(r.requestGate.draw)+'。最終中断判定は別');
     if(r.interruption?.supported){const q=r.interruption;lines.push('  指定条件の中断マーク到達率 '+(q.percent==null?'未計算（別乱数の合成分布が不足）':fmt(q.percent)+'%（15bit均等時）')+' / 今回の指定整数：'+(q.interrupted==null?'NPC抵抗の抽選値が未指定':q.interrupted?'中断マークへ到達':'到達しない')+'。'+q.scope);
     if(q.probabilityBounds)lines.push('  1要求の条件付き中断率の上下限 '+fmt(q.probabilityBounds.lower)+'～'+fmt(q.probabilityBounds.upper)+'%。'+q.probabilityBounds.scope);
      if(q.npcResistance){const n=q.npcResistance;lines.push('  NPC初期設定：'+n.profile.name+' / 第0亜種 / 抵抗閾値 '+n.threshold+' / 抵抗側15bit均等率 '+fmt(n.uniformResistancePercent)+'%'+(n.levelEliminated?' / レベル係数0のためレベル入力不要':' / 対象レベル '+fmt(n.level))+'。'+n.scope);}}
     else if(r.interruption)lines.push('  条件付き中断結果は未計算：'+r.interruption.reason);
     if(r.interruptionOpportunities?.supported)lines.push((r.interruptionOpportunities.fixedUpdateElapsed!=null?'  指定した更新条件での中断要求機会 ':'  未中断・未更新時の公称中断要求機会 ')+r.interruptionOpportunities.count+'回（初回 '+r.interruptionOpportunities.initialCount+'・周期 '+r.interruptionOpportunities.periodicCount+'）。毎回の中断成立や全期間の確率を保証しません');
     if(r.interruptionOpportunities?.fixedUpdateElapsed!=null)lines.push('  '+r.interruptionOpportunities.scope);
     if(r.hpAssignment)lines.push('  '+r.recipient+'の現在HP '+fmt(r.hpAssignment.current)+' / 指定HP '+fmt(r.hpAssignment.desired)+'（最大 '+fmt(r.hpAssignment.maximum)+'）。これは差分要求で、最終HPの保証ではありません');
     if(r.petRestoration){const q=r.petRestoration;lines.push(q.accepted?'  ペット蘇生時の設定指定：HP '+fmt(q.hp)+' / MP '+fmt(q.mp)+'。'+q.scope:'  ペット蘇生の設定指定：この条件では要求なし。');}
     if(r.restoration){const q=r.restoration;lines.push('  自動蘇生時のHP指定 '+fmt(q.assigned)+' / 最大HP比 '+fmt(q.percent)+'%。加算回復量ではありません。子の保持指定 '+fmt(q.childHoldingSeconds)+'秒（復活待ち時間とは別）。'+q.scope);lines.push('  保持子の詠唱中断要求：1要求の一次抽選率 '+fmt(q.interruption.uniformPercent)+'% / 指定乱数では'+(q.interruption.passed?'要求する':'要求しない')+'。最終中断・有効回数・全期間の結果は未計算');}
     if(r.restoration?.interruptionOpportunities){const q=r.restoration.interruptionOpportunities;lines.push('  蘇生後の保持子：指定更新条件で '+q.count+'回の中断要求機会。'+q.scope);}
      if(r.guard){const q=r.guard;lines.push('  物理の部分軽減基礎能力 '+fmt(q.defense)+' / 一次閾値 '+q.threshold+'（256段階）。魔法の部分軽減へ流用しない。基礎能力と最終軽減量は別');
      if(q.shieldId)lines.push('  盾 '+q.shieldName+' / スキル適合倍率 '+fmt(q.fitness)+' / 完全軽減の一次割合 '+fmt(q.uniformBytePercent)+'%（byte均等時）。保存基礎性能を使用し、個体の消耗・強化補正は未接続');
      if(q.skillOverride)lines.push('  装備盾 '+q.skillOverride.shieldName+' により計算スキルを盾 '+fmt(q.skillOverride.skillInteger/10000)+' に切替。技固有の必要スキル '+fmt(q.skillOverride.required)+'・基礎係数 '+fmt(q.skillOverride.base)+' を保持（盾性能による軽減式とは別）');
      if(q.magic){const m=q.magic;lines.push(m.supported?'  魔法本体の条件付き抑止：'+(m.passed?'今回の種値では抑止':'今回の種値では通過')+' / 一次割合 '+fmt(m.uniformBytePercent)+'%（byte均等時）'+(m.encodedInput!=null?' / 相手の格納入力 '+m.encodedInput+'（正規化 '+fmt(m.normalizedInput)+'） / 抽選byte '+m.roll:''):'  魔法本体の抑止は計算未対応：'+m.reason);
       if(m.before!=null)lines.push('  指定した無防御本体量 '+fmt(m.before)+'HP / 抑止量 '+fmt(m.blocked)+'HP / 残る本体量 '+fmt(m.remaining)+'HP（反射・追加作用・最終HPと別）');
       if(m.scope)lines.push('  '+m.scope);}
      if(q.outcome){const v=q.outcome;lines.push('  指定種値の抽選byte '+v.roll+' / 一次抽選は'+(v.complete?'完全軽減枝':'部分軽減枝')+' / 防御直前損傷（切上げ後） '+fmt(v.before)+' / 条件反映後の軽減量 '+fmt(v.blocked)+' / 残る損傷 '+fmt(v.remaining)+'（反射・付随効果・最終HPとは別）');}}
     if(r.reverseReferencePower?.power?.shield){const s=r.reverseReferencePower.power.shield;lines.push('  反転NPCの盾 '+s.name+' / 盾スキル '+fmt(s.skill)+' / 適合 '+fmt(s.fitness)+' / 基礎性能 '+fmt(s.base));}
     if(r.magicReplay||r.ammunitionRecovery)guardExtraLines(r,lines);
     if(r.guardFeedback){const q=r.guardFeedback;lines.push(q.magicGate?'  魔法防御の追加作用：'+(q.emitted?'MP回復を1要求':'今回の条件ではMP回復要求なし')+' / 防御成立時 '+fmt(q.whenSuppressed)+'MP（相手の保存基礎消費）':'  追加作用：'+(q.emitted?'1要求を生成':'軽減量が0の通常枝では追加要求なし')+' / 基準軽減量 '+fmt(r.guardBlockedAmount));
      if(q.mean!=null)lines.push('  指定31bit値の1回要求 '+fmt(q.amount)+' / 31bit全整数が均等の場合の平均 '+fmt(q.mean)+'（最終HPの平均ではありません）');}
     if(r.buffReflection){const q=r.buffReflection;lines.push('  反射率 '+fmt(q.reflectRate*100)+'% / 軽減率 '+fmt(q.reduceRate*100)+'%（保持倍率を反映、別々に上限100%）');
      if(q.outcome){const v=q.outcome;lines.push('  処理前損傷 '+fmt(v.before)+' / 相手への反射要求 '+fmt(v.reflectRequest)+'HP / 切上げ軽減要求 '+fmt(v.reductionRequest)+'HP / 軽減後の本体要求 '+fmt(v.remaining)+'HP（最終HPと別）');}}
     if(r.reactionGate){lines.push('  指定15bit値：'+(r.reactionRequested===null?'反応候補の選択条件が未指定':r.reactionRequested?'子を1回要求':'子を要求しない')+'。技自体の成功率とは別');
      for(const q of r.reactionOpportunity?.requests||[])lines.push('  反応1機会：'+q.name+' / 抽選通過・受理時 '+fmt(q.whenSelected)+q.resource+' / 指定乱数 '+(q.specifiedDraw==null?'候補選択条件未指定':fmt(q.specifiedDraw)+q.resource)+' / 15bit均等の条件付き要求平均 '+fmt(q.conditionalUniformMean)+q.resource+'（子受理を仮定。最終結果・全期間総量とは別）');
      const c=r.reactionChild;if(c){lines.push('  反応子 '+c.name+' → '+c.recipient+' / 受理1回の持続指定 '+fmt(c.durationSeconds)+'秒。'+c.scope);
       for(const e of c.effects){lines.push('    '+e.name+'：'+(e.supported?fmt(e.value)+e.unit:e.resolved?'数量なし：'+e.meaning:'計算未対応：'+(e.reason||e.remaining))+(e.partial?'（部分対応）':''));
        if(e.critical?.after!=null)lines.push('      条件付きクリティカル割合 '+fmt(e.critical.before*100)+' → '+fmt(e.critical.after*100)+'% / 剰余均等時 '+fmt(e.critical.uniformResiduePercent)+'%');}}}
     if(r.omen)lines.push('  今回の対象：'+r.recipient+' / 剰余 '+r.omen.roll+' / 対象選択閾値 '+r.omen.threshold+' / 15bit均等時の対象選択率 '+fmt(r.omen.uniformPercent)+'%（最終ダメージの平均値ではありません）');
     if(r.percentage!=null)lines.push('  割合要求 '+fmt(r.percentage)+'%（正は減少、負は回復）');
     if(r.petRevive)lines.push('  既定減少 '+fmt(r.petRevive.nominal)+'レベル / 対象レベル '+fmt(r.petRevive.before)+' → '+fmt(r.petRevive.after)+'（下限1・元float32丸め）');
     if(r.dirt){const q=r.dirt;lines.push('  汚れ能力への条件付き適用：'+(q.after===null?'補正前の汚れが未指定。適用後を0にはしません':fmt(q.before)+' → '+fmt(q.after)+'（0～100）')+'。'+q.scope);}
     if(r.critical){const q=r.critical;lines.push('  クリティカルの条件付き合成：'+(q.after===null?q.reason:fmt(q.before*100)+' → '+fmt(q.after*100)+'% / 剰余均等時 '+fmt(q.uniformResiduePercent)+'% / '+(q.passed==null?'抽選値は未指定':q.passed?'指定抽選値では成立':'指定抽選値では不成立'))+'。'+q.scope);}
     if(r.petExperience){const q=r.petExperience;lines.push('  ペット経験値倍率：'+(q.after===null?'適用前倍率・対象条件が未指定。適用後は未計算':fmt(q.before)+' → '+fmt(q.after)+'倍 / 解除後 '+fmt(q.afterRemoval)+'倍')+'。'+q.scope);lines.push('  補正後の経験値要求：'+(q.request===null?'補正前要求・使用者側倍率などが未指定（最終レベル増分は未計算）':fmt(q.request)+' / 経験値→最終レベル増分への変換前'));}
     if(r.theftPacket){const q=r.theftPacket;lines.push('  盗取要求のスキル入力 '+fmt(q.skillInput)+' / 別欄の補助入力 '+(q.auxiliaryInput===null?'未指定・未計算':fmt(q.auxiliaryInput))+'。'+q.scope);}
     if(r.reuse?.applied!=null)lines.push('  指定行動の再使用係数 '+fmt(r.reuse.without)+' → '+fmt(r.reuse.applied)+'（集中力・主スキル・行動分類を反映。秒数ではありません）');
     if(r.reusePercent)lines.push('  再使用能力値 '+fmt(r.reusePercent.before)+'% → '+fmt(r.reusePercent.after)+'% / 基礎再使用値への倍率 '+fmt(r.reusePercent.factor));
     for(const s of r.secondaryMessages||[])lines.push((s.recipient||'使用者')+' / '+(s.name||({1:'ST',2:'HP',4:'MP'}[s.messageType])+'吸収量')+' '+fmt(Math.abs(s.amount)));}
    for(const r of result.effects.filter(e=>e.definitionId===d.id&&e.generatedInitialWait)){const q=r.generatedInitialWait;lines.push((q.referenceOnly?'生成候補の基底定義：':'召喚・設置物の基底定義：')+'共通AI待ち基準 '+q.baseCounter+'ms'+(q.timer.waitEnabled?' / '+fmt(q.seconds)+'秒 / 抽選補正後 '+fmt(q.timer.selectedSeconds)+'秒 / 範囲 '+fmt(q.timer.minimumSeconds)+'～'+fmt(q.timer.maximumSeconds)+'秒':'。この共通待ち枝を省略する値であり、0秒間隔で攻撃し続ける意味ではありません')+' / '+q.scope);}
    for(const r of result.effects.filter(e=>e.definitionId===d.id))for(const q of r.generatedActionTimings||[])lines.push('生成行動 '+q.name+' / 個別AI行動の待ち指定：基準 '+fmt(q.baseSeconds)+'秒 / 抽選補正後 '+(q.seconds==null?'整数未指定':fmt(q.seconds)+'秒')+' / 範囲 '+fmt(q.minimumSeconds)+'～'+fmt(q.maximumSeconds)+'秒'+(q.remainingSeconds==null?' / 経過後の残りは未計算':' / 指定経過後の残り '+fmt(q.remainingSeconds)+'秒')+'。'+q.scope);
    for(const r of result.effects.filter(e=>e.definitionId===d.id&&e.replacementOperation)){const q=r.replacementOperation;lines.push('置換対象の候補：'+q.knownTargets.map(d=>d.name).join('、'));lines.push('条件付き置換：'+(q.removedCount==null?q.reason:(q.existing.name+' / 旧Buffの除去 '+q.removedCount+'件 / '+(q.accepted?'新しい定義を受理できる':'新しい定義は拒否')+(q.existingRemains?' / 旧Buffは残る':' / 旧Buffは残らない')))+'。'+q.scope);}
    for(const r of result.effects.filter(e=>e.definitionId===d.id&&e.bladeFollowup)){const c=r.bladeFollowup;lines.push('追撃：'+c.name+' / '+({normal:'通常',dual:'二刀流',twin:'双棍'}[c.mode])+'枝。'+c.scope);
     for(const def of c.definitions){const t=c.times.find(t=>t.definitionId===def.id),phys=c.physicalResults.find(x=>x.definitionId===def.id);lines.push('  '+def.name+' / 追撃側の持続 '+(t?.supported?fmt(t.seconds)+'秒':'未対応：'+t?.reason));
      if(phys)lines.push('    追撃物理ダメージ '+fmt(phys.value)+'HP / '+phys.scope);
      if(c.constructorErrors[def.id])lines.push('    追撃物理入力：'+c.constructorErrors[def.id]);
      for(const e of c.effects.filter(e=>e.definitionId===def.id&&e.supported)){const singlePoison=c.poisonSingleHit&&e.kind===11;
       lines.push('    '+e.recipient+' / '+e.name+' '+fmt(e.value)+e.unit+(singlePoison?' / 毒1発分（1周期）。再付与による更新があるため、攻撃回数倍・Buff全期間合計は表示しません':e.count!=null?' / 条件付き'+e.count+'回 / 小計 '+fmt(e.total)+e.unit+(e.intervalSeconds==null?' / 指定更新条件の要求回数（実頻度は未確定）':' / 公称間隔 '+fmt(e.intervalSeconds)+'秒'):''));
       if(e.unresolvedMetadata)lines.push('      判明した要求量と別の残件：'+e.unresolvedMetadata);
       for(const s of e.secondaryMessages||[])lines.push('      '+(s.recipient==='caster'?'使用者':s.recipient)+' / '+({1:'ST',2:'HP',4:'MP'}[s.messageType])+'回復要求 '+fmt(Math.abs(s.amount)));
      }
     }
     if(c.aggregate&&!c.poisonSingleHit)for(const q of c.aggregate.totals)lines.push('  追撃の条件付き'+(c.aggregate.partial?'小計':'合計')+'：'+q.recipient+' / '+q.name+' '+fmt(q.value)+q.unit+'（攻撃本体を含まない）');
     else if(c.graph.supported)lines.push('  追撃の参照連鎖は、初回の全要求成立条件を指定すると条件付き合計を計算します');
     for(const e of c.pending)lines.push('  追撃の残件：'+(e.reason||e.remaining));
     lines.push('  '+c.remaining);
    }
    for(const r of result.effects.filter(e=>e.definitionId===d.id&&e.summonAbilities&&optionalSummon)){const a=r.summonAbilities;lines.push('  参考・召喚能力の条件：'+a.candidate.name+'（基底・第0亜種） / '+a.scope);
     for(const v of a.values)lines.push('    '+v.name+' '+fmt(v.value)+'（'+v.formula+'）');
     lines.push('  参考情報の未確定範囲（通常召喚の完成条件外）：'+(a.remaining||a.reason));}
    if(d.id===4675)lines.push('対応範囲（ユーザー指定）：対NPC。対PCは減少係数・適用順が未解析のため計算未対応。NPCの値を流用しません。');
    for(const r of result.effects.filter(e=>e.definitionId===d.id&&e.generatedActionReason))lines.push('  生成体 '+r.generatedActionBinding.entityName+' / 行動 '+r.generatedActionNames.join('、')+'。'+r.generatedActionReason);
    for(const r of result.effects.filter(e=>e.definitionId===d.id&&(e.guardChild||e.selectedChild)))for(const c of [r.guardChild||r.selectedChild,...r.additionalChildren||[]]){lines.push('  '+(r.generatedActionBinding?.candidateOnly?'子候補（親未照合） ID'+c.id+' / ':r.guardChild?'防御子 ':r.generatedActionBinding?'生成行動 ':r.kind===9?'領域子 ':'天候子 ')+c.name+' → '+c.recipient+' / 受理1回の持続指定 '+(c.durationSeconds==null?'未確定':r.generatedActionBinding&&c.durationSeconds===0?'持続Buff指定なし（動作時間とは別）':fmt(c.durationSeconds)+'秒')+'。'+c.scope);
     if(c.inputCondition?.observedReceipt)lines.push('    '+(c.inputCondition.observedReceipt.adoptedByUser?'採用した共通計算モデル：':'実付与記録の条件：')+c.inputCondition.scope);
     else if(c.inputCondition?.independent)lines.push('    計算条件：スキル・魔力を使わない独立した量と時間。'+c.inputCondition.scope);
     else if(c.inputCondition?.derivedTrap){const q=c.inputCondition,t=q.derivedTrap;lines.push('    生成レベル '+fmt(t.level)+' → スキルテンプレート '+t.template+'（係数 '+t.coefficient+'）→ 罠スキル '+fmt(q.skill)+' → 爆発の技入力 '+fmt(q.x)+'。追加補正なし。候補IDの選択条件は未確定。');}
     else if(c.inputCondition){const q=c.inputCondition;lines.push('    計算条件：召喚・設置物の'+(q.physical?'攻撃力 '+fmt(q.attack)+' / 命中 '+fmt(q.hit)+' / 格納威力 '+fmt(q.encodedPower)+' / 格納命中 '+fmt(q.encodedHit):'スキル '+fmt(q.skill)+(q.magic==null?'':' / 魔力 '+fmt(q.magic)))+' / 追加補正なし。生成レベルからの能力算出ではありません。');}
     if(c.inputCondition?.fixedBase)lines.push('    入力元：'+c.inputCondition.fixedBase.source+' / 生成参照 '+c.inputCondition.fixedBase.referenceKey+'。スキルや生成レベルからの推定ではありません。');
     if(c.physicalResult){const q=c.physicalResult;lines.push('    物理本体1要求：'+(q.supported?fmt(q.value)+'HP / '+q.scope:'計算未対応：'+q.reason));}
     else if(r.generatedActionBinding&&c.inputReason)lines.push('    生成行動の入力：'+c.inputReason);
     if(c.knownNonAmplified){const q=c.knownNonAmplified;lines.push('    '+q.condition+'：'+q.quantities.map(v=>v.resource+' '+fmt(v.perMinute)+'/分（推定）').join(' / '));lines.push('      '+q.scope);}
     if(c.durationReason)lines.push('    子の持続入力：'+c.durationReason);
     if(c.conditionNote)lines.push('    成立条件：'+c.conditionNote);
     if(c.durationNote)lines.push('    時間の範囲：'+c.durationNote);
     if(c.actionTiming){const q=c.actionTiming;lines.push('  個別AI行動の待ち指定：基準 '+fmt(q.baseSeconds)+'秒 / 抽選補正後 '+(q.seconds==null?'整数未指定':fmt(q.seconds)+'秒')+' / 範囲 '+fmt(q.minimumSeconds)+'～'+fmt(q.maximumSeconds)+'秒'+(q.remainingSeconds==null?' / 経過後の残りは未計算':' / 指定経過後の残り '+fmt(q.remainingSeconds)+'秒')+'。'+q.scope);}
     for(const e of c.effects){lines.push('    '+e.name+'：'+(e.supported?fmt(e.value)+e.unit:e.resolved?'数量なし：'+e.meaning:'計算未対応：'+(e.reason||e.remaining))+(e.partial?'（部分対応）':'')+(r.kind===9?(r.areaBindingConfirmed===false?'（付与候補の単独値。親とのID対応は未確定）':'（この子Buffの受理1回分の定義値）'):''));
      if(r.generatedActionBinding&&e.supported)lines.push('      数値の範囲：'+(e.naturalRecovery?'条件成立中のBuffによる自然回復速度の分間換算（推定）':e.modeInfo?.initial===false?'保持中の更新1回分':'初回の成立1要求分')+'。同じ行動IDが別の生成参照にも現れる場合も、自動的に足しません。');
      if(e.floating)lines.push('      浮遊：基準からの境界 '+fmt(e.floating.heightOffset)+' / '+(e.floating.increment==null?'相対高さ未指定。1更新の加算は未計算':'指定相対高さ '+fmt(p.floatHeight)+' / 1更新鉛直加算 '+fmt(e.floating.increment)+'（内部値）')+'。最終高度・毎秒の上昇量とは別です。');
      if(r.generatedActionBinding)lines.push('      適用先：'+(e.recipient==='使用者'?'生成体自身':e.recipient)+' / '+(e.scope||'選択・受理された1要求。自動発動の総量とは別'));
      if(e.movement)lines.push('      吹き飛ばし初期値 '+fmt(e.movement.initialMagnitude)+' / 減衰累計 '+fmt(e.movement.totalMagnitude)+'（単位なし・1要求分。衝突/途中再付与なし）');
      if(e.count>1&&Number.isFinite(e.total))lines.push('      1回量 '+fmt(e.value)+e.unit+' ×'+e.count+'回 / 条件付き合計 '+fmt(e.total)+e.unit+(e.intervalSeconds==null?' / 指定更新条件（秒間隔は未確定）':' / 公称間隔 '+fmt(e.intervalSeconds)+'秒')+'。未更新・未中断・各周期成立時。親全期間の自動総量とは別');
      if(e.critical?.after!=null)lines.push('      条件付きクリティカル割合 '+fmt(e.critical.before*100)+' → '+fmt(e.critical.after*100)+'% / 剰余均等時 '+fmt(e.critical.uniformResiduePercent)+'%');
      if(e.buffReflection?.outcome){const q=e.buffReflection;lines.push('      子だけを適用：反射率 '+fmt(q.reflectRate*100)+'% / 軽減率 '+fmt(q.reduceRate*100)+'% / 軽減後要求 '+fmt(q.outcome.remaining)+'HP（親全期間の合計ではない）');}
      if(e.naturalRecovery)lines.push('      分間速度の推定値 '+fmt(e.naturalRecovery.perMinute)+e.naturalRecovery.resource+'/分。'+(c.id===5826?'wikiの約7は測定単位未記載のため、この値へ係数合わせはしません。':'実期間の自動総量や資源の巻戻し量とは区別します。'));
     }
     if(r.areaApplication){const q=r.areaApplication;lines.push('  領域条件：'+q.status+' / 陣の公称残り '+fmt(q.areaRemainingSeconds)+'秒 / 対象Buffの残り '+(q.remainingSeconds==null?'なし':fmt(q.remainingSeconds)+'秒')+'。'+q.scope);}
     else if(r.areaApplicationReason)lines.push('  領域条件：'+r.areaApplicationReason+'（入力不足を付与量0として扱いません）');
     if(c.remaining)lines.push('  条件未確定：'+c.remaining);}
    for(const r of result.effects.filter(e=>e.definitionId===d.id&&e.recoverySuppression))lines.push('基礎HP/MP回復の更新：'+(r.recoverySuppression.hpMpProducerSuppressed?'抑止':'この効果による抑止なし')+'。'+r.recoverySuppression.scope);
    for(const r of result.effects.filter(e=>e.definitionId===d.id&&e.facingRequirement)){const q=r.facingRequirement;lines.push('向き差の条件：'+(q.allowed==null?q.reason:fmt(q.normalizedDifference)+' → '+(q.allowed?'この条件を通過':'この条件は不成立'))+'。'+q.scope+' 損傷値は条件成立時の参考です。');}
    for(const r of result.effects.filter(e=>e.definitionId===d.id&&e.diagnostic)){const v=r.diagnostic;lines.push('参考：'+v.name+' '+fmt(v.value)+v.unit+'（'+v.scope+'）');}
    for(const r of result.effects.filter(e=>e.definitionId===d.id&&e.lightSetting)){const q=r.lightSetting;lines.push('光源・視界指定：'+q.label+' / '+(q.selected===null?'他の設定が未指定のため最終採用値は未計算':'同時に有効な他設定 '+q.otherProfile+' → 採用設定 '+q.selected)+'。'+q.scope);}
    for(const r of result.effects.filter(e=>e.definitionId===d.id&&e.visualFog)){const q=r.visualFog;lines.push('視界描画：'+fmt(q.value)+'（内部描画値） / '+(q.admitted?'PC受理条件成立':'PC受理条件は未指定・値はその条件下のもの')+'。0も定義にある有効な設定値です。NPC感知距離・0ダメージとは別です。');}
    for(const r of result.effects.filter(e=>e.definitionId===d.id&&e.gaugeSlip)){
     const q=r.gaugeSlip;
     if(q.supported){lines.push('生産・停止時の滑り：'+r.name+' / 能力 '+fmt(q.before)+' → '+fmt(q.after)+' / 指定15bit値 '+q.random15+'：'+q.slip+'マス');lines.push('  滑り範囲 '+q.minimum+'～'+q.maximum+'マス / 均等15bit値での平均 '+fmt(q.uniformMean)+'マス / 滑りなし '+fmt(q.uniformNoSlipPercent)+'%。'+q.scope);}
     else if(p.craftingSelector===r.selector||p.craftingSelector==null)lines.push('生産・滑り計算の条件：'+q.reason+'。能力補正の量とは別に、停止時のマス数を計算します');
    }
    for(const r of result.effects.filter(e=>e.definitionId===d.id&&e.gaugeSpeed)){
     const q=r.gaugeSpeed;
     if(q.supported)lines.push('生産・ゲージ速度：'+r.name+' / 能力 '+fmt(q.before)+' → '+fmt(q.after)+' / 上下限後 '+fmt(q.limitedBefore)+' → '+fmt(q.limitedAfter)+' / 有効倍率 '+fmt(q.factor)+'倍。'+q.scope);
     else if(p.craftingSelector===r.selector-1||p.craftingSelector==null)lines.push('生産・速度計算の条件：'+q.reason);
    }
    const items=new Map();for(const r of rows.filter(e=>e.kind===19&&!e.partial)){const key=r.recipient+' / 物品参照ID '+r.itemReference;items.set(key,(items.get(key)||0)+r.value);}
    if(items.size)lines.push('物品生成数（各効果行が1回成立する条件）：'+[...items].map(([key,count])=>key+' '+count+'個').join(' / '));
    for(const r of result.effects.filter(e=>e.definitionId===d.id&&e.nonNumerical&&(!scoped?.utilityScope||!optionalIds.has(e.id)))){lines.push((r.theftRequest?'窃盗の用途確認（成功率は未対応）：':'数量を持たない作用：')+r.meaning+(r.active===false?'（現在の条件では無効）':'')+(Number.isFinite(r.presentation?.durationMs)?' / 表示時間 '+fmt(r.presentation.durationMs/1000)+'秒':''));
     if(r.motionReference?.namespaceProved)lines.push('  モーション参照：保存番号 '+r.motionReference.raw+' → 内部 '+r.motionReference.runtime+'（威力係数ではありません）。起動条件・対象の伝播は別の状態条件です。');
     if(r.appearanceOperation){const q=r.appearanceOperation;lines.push('  外見条件：'+(q.eligible===null?'種族・性別を指定してください':q.eligible?'一致':'不一致')+(q.requiredSpecies!=null?' / 必要種族値 '+q.requiredSpecies+'・性別値 '+q.requiredSex:'（種族・性別指定なし）')+'。'+q.scope);}
     if(r.requestOperation)lines.push('  '+r.requestOperation.scope);
     if(r.petCommand){const q=r.petCommand;lines.push('  ペット特殊攻撃の使用条件：'+(q.ready===null?'未指定':q.ready?'使用可能（攻撃の成否とは別）':'使用不可')+' / 攻撃威力・回数は未計算。'+q.scope);}
     if(r.trapRemoval){const q=r.trapRemoval;lines.push('  設置物の解除条件：'+(q.eligible===null?'未指定':q.eligible?'適合する条件':'この条件は不成立')+' / ダメージ量・解除件数は持たない要求。'+q.scope);}
     if(r.equipmentCurse){const q=r.equipmentCurse;lines.push('  装備の呪い解除：'+(q.clearedCount===null?q.reason:q.clearedCount?'1枠 / 選択スロット '+q.selectedSlot:'指定した状態に適合枠なし（0枠）')+'。'+q.scope);}
     if(r.actionRestriction){const q=r.actionRestriction;lines.push('  行動制限：'+(q.result?q.selectedActionName+' → '+(q.result.allowed?'この制限を通過':'この制限で拒否')+'（'+q.result.reason+'）':'判定する行動が未指定')+'。'+r.scope);}
     if(r.recognitionRule){const q=r.recognitionRule.condition;lines.push('  敵認識の候補判定：'+(q.supported?(q.excludedBy208?'この効果で敵対対象から除外':q.candidateAccepted?'この条件では効果なし':'先行条件で候補から除外'):q.reason));if(q.npcInitial)lines.push('  NPC：'+q.npcInitial.name+' / '+q.assumption+'。現在のゲーム内状態を取得した結果ではありません。');lines.push('  208保持中の対象を前提とした条件付き判定。未取得NPC・別亜種・実行中の設定変更、既存ヘイト、感知範囲、最終ターゲット選択は別です。');}
     if(r.displayPlacement)lines.push('  表示の配置指定です。効果量欄をダメージ・倍率・発動回数として計算しません。別行の戦闘量と持続時間は独立して計算します');
     if(r.equipmentRestriction){const q=r.equipmentRestriction;lines.push('  装備制限：内部索引 '+(q.restrictedIndices.join(', ')||'なし')+' / '+q.scope);}
     if(r.guardBypass){const q=r.guardBypass;lines.push('  防御接触が成立する条件：通常防御の軽減率 '+fmt(q.normal.fraction*100)+'%・追加作用なし / 反転する防御（selector8）の軽減率 '+fmt(q.counter.fraction*100)+'%。'+q.scope);}
     if(r.trapSuppression)lines.push('  宝箱の罠の一時停止です。設置された種系の罠の解除量・ダメージ量として加算しません');
    }
    for(const r of result.effects.filter(e=>e.definitionId===d.id&&e.kind===197&&e.resolved)){
     const q=r.evasionCheck;
     if(!q)lines.push('条件付き回避計算：'+r.evasionReason+'（入力不足を0にはしません）');
     else if(q.bypassed)lines.push('相手行動は回避判定を省略。強制回避・通常比率は適用されず、最終ダメージは別計算');
     else lines.push('相手の通常物理命中割合 '+fmt(q.hitFractionIfUniformResidues*100)+'%（剰余均等の仮定） / 指定種値：'+(q.evaded?'回避':'命中')+' / '+(q.forced?'有効効果による強制回避。この判定で本体損傷要求は0、付随作用は別':'通常比率。最終ダメージは別計算'));
    }
   }
   if(result.attack){const a=result.attack;lines.push('既存攻撃計算：'+fmt(a.average)+'（均等変動の平均） / 最小 '+fmt(a.minimum)+' / 最大 '+fmt(a.maximum));
    if(a.additionalCount)lines.push('追加・継続 '+a.additionalCount+'回 / '+fmt(a.additionalAverage));if(a.selfDamageAverage)lines.push('自傷 '+fmt(a.selfDamageAverage));
    if(a.partial)lines.push('攻撃の残件：'+a.damageIssues.join(' / '));}
   else if(result.attackReason)lines.push('攻撃計算：'+(attackContextError||result.attackReason));
   if(result.referenceLifetime?.supported)lines.push((result.referenceLifetime.reaction?'反応子の条件付き最終終了 ':result.referenceLifetime.periodic?'周期参照の条件付き公称終了 ':'初回参照連鎖の条件付き終了 ')+fmt(result.referenceLifetime.seconds)+'秒 / '+result.referenceLifetime.scope);
   else if(p.reactionLastAcceptedSeconds!=null)lines.push('反応子の終了：計算未対応 / '+result.referenceLifetime.reason);
   else if(result.referenceGraph.supported&&p.referenceSimultaneous&&p.referenceChainConfirmed)lines.push('参照連鎖の終了：計算未対応 / '+result.referenceLifetime.reason);
   for(const q of result.referenceLifetime?.parts||[])if(q.sameSourceRefresh)lines.push('更新される子Buff：'+(nodes.find(d=>d.id===q.definitionId)?.name||q.definitionId)+' / '+q.requests+'回の受理 / 初回 '+fmt(q.firstStartSeconds)+'秒 / 最終受理 '+fmt(q.lastStartSeconds)+'秒 / 最終終了 '+fmt(q.endSeconds)+'秒 / 保持区間の合計 '+fmt(q.coverageSeconds)+'秒（同時保持1個。損傷・回復の総量ではありません）');
   for(const q of result.referenceLifetime?.conflictTrace||[])lines.push('  参照内の競合：'+(nodes.find(d=>d.id===q.definitionId)?.name||q.definitionId)+' / '+(q.accepted?'受理':'弱い効果のため拒否')+(q.removedDefinitionId!=null?' / '+(nodes.find(d=>d.id===q.removedDefinitionId)?.name||q.removedDefinitionId)+'を解除':'')+' / 単独持続 '+fmt(q.seconds)+'秒');
   if(result.referenceAggregate?.effectiveConflictCounts)lines.push('競合後の条件付き要求数：初回要求は独立に発行。指定受理順で周期前に終了した定義 '+result.referenceAggregate.stoppedBeforePeriodic.join(', ')+' は、以後の周期を加算しません。');
   if(result.referenceAggregate){const a=result.referenceAggregate;lines.push((a.totals.length?'親と参照先の'+(a.partial?'既知数量の小計':'条件付き総量'):'参照要求の回数のみ確認（合計数量は未算出）')+'：'+a.scope);for(const q of a.totals){lines.push(q.recipient+' / '+q.name+' '+fmt(q.value)+q.unit+'（'+q.parts.length+'行動成分）');for(const part of q.parts)lines.push('  内訳 '+(nodes.find(d=>d.id===Number(part.id.split(':')[0]))?.name||part.id)+'：'+(part.totalPerAction!=null?fmt(part.totalPerAction)+q.unit+' / 1行動 ×'+part.actionCount+'行動':fmt(part.value)+q.unit+' ×'+part.count+'回'));}}
   else if(result.referenceGraph.supported)lines.push('参照総量：'+(result.referenceGraph.periodic?'周期の自己保持・未中断条件':'初回連鎖の成立条件')+'を指定すると、親と子を分けた内訳と総量を計算します');
   for(const q of result.referenceAggregate?.refreshes||[]){const knownEnd=result.referenceLifetime?.parts?.some(t=>t.definitionId===q.definitionId&&t.sameSourceRefresh);lines.push('持続子の更新：'+(nodes.find(d=>d.id===q.definitionId)?.name||q.definitionId)+' / '+q.requests+'回の受理要求 / 同時保持は最大1個 / 子の公称持続 '+fmt(q.seconds)+'秒 / 親の公称発動間隔 '+fmt(q.parentIntervalSeconds)+'秒。'+(q.nonOverlapping?'次回発動前に子が終了。確定した1回分を足し合わせます。'+q.remaining:q.rule+'。周期量を要求回数倍しません。'+(knownEnd?'最終終了と保持区間の時間は上記の条件で計算済み。子の周期要求回数・回復/損傷の総量は別の未確定項目です。':'計算未対応：'+q.remaining)));}
   for(const r of result.effects.filter(e=>e.guardCondition)){const q=r.guardCondition;lines.push('防御適合：'+q.incoming.name+' / '+(q.accepted?'受付可能':'受付不可')+' / '+(q.incoming.ignoreHard?'軽減と追加作用を無効化する指定あり':q.incoming.ignoreSoft?'軽減を無効化する指定あり':'防御無視指定なし')+' / 保存基礎消費 '+fmt(q.incoming.baseCost)+(q.incoming.actionType===1?'MP':'ST'));}
   for(const r of scoped?.pending||result.pending)lines.push('計算未対応：'+(nodes.find(d=>d.id===r.definitionId)?.name||result.name)+' / '+(r.name||'効果')+'：'+(r.reason||r.remaining));
   for(const q of scoped?.conditionalNumerics||[])lines.push((q.mode==='user-reference-only'?'参考表示の扱い：':'条件付き数値の対応範囲：')+(q.name||'参照効果')+' / '+q.conditions+' / '+q.scope);
   for(const r of scoped?.deferredState||[]){const q=scoped?.conditionalNumerics?.find(q=>q.id===r.id);lines.push((q?.mode==='user-reference-only'?'未解明の仕様（今回の完成条件外）：':'状態再現の残件（数量不足とは別）：')+(r.name||'効果')+' / '+(q?.remaining||r.reason||r.remaining));}
   el('Numbers').textContent=lines.join('\n');
  }catch(e){el('Numbers').textContent='数値計算：'+e.message;showSummary(null,null,[],e.message);}}
  function render(includeState=false){if(!compiled)return;filterAdditionalInputs();renderNumbers();filterAdditionalInputs();if(includeState||el('StatePanel').open)renderState();for(const key of ['Info','Preview','State','Message'])el(key).textContent=display(playerText(el(key).textContent));if(!pendingSettings&&root.localStorage&&root.MOE_COMBAT_TRIAL_SETTINGS)root.localStorage.setItem('moeDamageSimShortShareUrlShowcase',JSON.stringify(collectConfig()));}
  function renderState(){if(!compiled)return;try{
   if(root.MOE_COMBAT_CALCULATION_SCOPE?.describe(compiled.bundle).descriptionOnly){el('Preview').textContent='説明対応。召喚対象・動作内容を確認できます。状態への適用試行は、この作用の完成条件に含めません。';return;}
   const p=input(),ctx=metrics();
   if(compiled.bundle.attack?.calculationSupported!==false&&compiled.bundle.row.attackKey){const m=computeMetrics(ctx.st,{...ctx.cfg.inputs,attackType:compiled.bundle.row.attackKey,combatCatalogScenario:state,combatCatalogTarget:p.target});p.damageContext=m.techniqueContext;}
   const plan=api.plan(compiled,p),labels=compiled.math.labels;
   const amount=plan.rows.map(r=>(([247,275].includes(r.kind)?(r.kind===247?'物理威力':'属性'+r.selector+'強化'):labels[r.selector]||r.skillName)||'効果')+' '+fmt([247,275].includes(r.kind)?r.value*100:r.value)+([147,247,275].includes(r.kind)?'%':'')+(r.active?'':'（世界条件で無効）')).join(' / ');
   const expense=plan.cost?plan.cost.costs.map(c=>c.resource==='material'?'触媒 '+c.id+' '+c.amount+'個':c.resource.toUpperCase()+' '+fmt(c.amount)).join(' / '):'消費未対応：'+plan.costReason;
   el('Preview').textContent='適用可能：'+(amount||'なし')+'\n持続：'+(plan.durationSeconds===null?'未対応':fmt(plan.durationSeconds)+'秒')+'\n成功時消費：'+expense+
    (plan.displayOnlyRows.length?'\n量のみ（適用未接続）：'+plan.displayOnlyRows.filter(r=>r.active).map(r=>(r.skillName||labels[r.selector]||'効果')+' '+fmt(r.value)).join(' / '):'')+
    (plan.damage?'\n攻撃ダメージ：'+display(plan.damage.average,true)+'（発動・命中時の平均。HP受信更新は未接続）':'')+'\n残件：'+[...new Set(plan.pending.map(r=>r.reason))].join(' / ')+'\n使用の成否・発動時間・再使用待ち・失敗時の消費は未対応です';
   const stats=['defense','avoid','magic','hp','mp','st','speed','fireRes','waterRes','windRes','earthRes','neutralRes'];
   el('State').textContent='経過 '+fmt(state.tick/60)+'秒 / 対象'+p.target+'\n攻撃力 '+fmt(ctx.base.atk)+' → '+fmt(ctx.after.atk)+' / 命中 '+fmt(ctx.base.playerHit)+' → '+fmt(ctx.after.playerHit)+' / ダメージ平均 '+display(ctx.base.finalDamage,true)+' → '+display(ctx.after.finalDamage,true)+'\n'+stats.map(k=>k+': '+fmt(ctx.base.totalStats[k])+' → '+fmt(ctx.after.totalStats[k])).join(' / ')+
    '\n有効効果：'+state.active.map(r=>r.name+'→'+r.target+' 残り'+fmt((r.endsAt-state.tick)/60)+'秒').join(' / ')+
    '\n資源：'+['A','B'].map(k=>k+' ST'+display(state.actors[k].st,true)+' MP'+display(state.actors[k].mp,true)+' 触媒'+JSON.stringify(state.actors[k].materials)).join(' / ')+
    '\n履歴：'+state.events.slice(-8).map(e=>e.name+' '+e.type+' '+fmt(e.tick/60)+'秒').join(' / ');
  }catch(e){el('Message').textContent=playerText(e.message);}}
  function act(fn){try{clearTimeout(renderTimer);renderTimer=null;fn();render(true);}catch(e){el('Message').textContent=playerText(e.message);}}
  function scheduleRender(){clearTimeout(renderTimer);renderTimer=setTimeout(()=>{renderTimer=null;render();},120);}
  el('RegisterCurrent')?.addEventListener('click',()=>{try{if(compiled)openRegistration(compiled.bundle.row.key);}catch(error){el('Message').textContent=playerText(error.message);}});
  el('OpenPicker')?.addEventListener('click',()=>{pickerLimit=60;populate();el('Picker').showModal?.();el('Search').focus?.();});
  el('ClosePicker')?.addEventListener('click',()=>el('Picker').close?.());
  el('PickerMore')?.addEventListener('click',()=>{pickerLimit+=60;populate();});
  for(const key of ['PickerSkill','PickerSkillMode','PickerType','PickerSort'])el(key)?.addEventListener('change',()=>{pickerLimit=60;populate();});
  el('PickerClear')?.addEventListener('click',()=>{el('Search').value='';el('PickerSkill').value='';el('PickerSkillMode').value='required';el('PickerType').value='';pickerLimit=60;populate();});

  el('Search').addEventListener('input',event=>{if(!event?.isComposing){pickerLimit=60;populate();}});el('Search').addEventListener('compositionend',()=>{pickerLimit=60;populate();});el('Select').addEventListener('change',select);
  el('Resources').addEventListener('click',()=>act(()=>{if(!compiled)throw Error('対象データ未読込み');const actor=el('Caster').value,ref=compiled.bundle.definitions[String(compiled.id)],st=num('ST'),mp=num('MP'),material=num('Material');
   if(st<0||st>500||mp<0||mp>1000||!Number.isInteger(material)||material<0)throw Error('資源入力範囲外');state=structuredClone(state);state.actors[actor]={st,mp,materials:{...state.actors[actor].materials,...(ref?.materialId?{[ref.materialId]:material}:{})}};el('Message').textContent='使用者'+actor+'の資源を設定しました';}));
  for(const [button,mode]of [['Use','successful-use'],['Effect','effect-only']])el(button).addEventListener('click',()=>act(()=>{if(!compiled)throw Error('対象データ未読込み');const ctx=metrics(),p=input(mode),r=api.use(compiled,state,p);if(r.applied)api.project(ctx.st,r.state,p.target);state=r.state;el('Message').textContent=r.reason||r.status;}));
  el('Advance').addEventListener('click',()=>act(()=>{state=api.advance(state,num('Seconds'));el('Message').textContent='時間を進めました';}));
  el('Reset').addEventListener('click',()=>act(()=>{state=api.create();el('Message').textContent='試行を初期化しました';}));
  workspace.addEventListener('input',event=>{if(event.target?.id!=='combatCatalogSearch'&&!event.target?.closest?.('#combatCatalogPicker')&&!event.isComposing)scheduleRender();});
  workspace.addEventListener('change',event=>{if(!['combatCatalogSearch','combatCatalogSelect'].includes(event.target?.id)&&!event.target?.closest?.('#combatCatalogPicker'))scheduleRender();});
  workspace.addEventListener('compositionend',event=>{if(event.target?.id!=='combatCatalogSearch')scheduleRender();});
  el('StatePanel').addEventListener('toggle',()=>{if(el('StatePanel').open)renderState();});
  const externalChange=event=>{
   if(event?.target?.closest?.('#combatCatalogTrial'))return;
   metricCache.clear();if(!workspace.closest?.('[data-tab-panel]')?.hidden)scheduleRender();
  };
  document.addEventListener('input',externalChange);document.addEventListener('change',externalChange);
  // Registration/import buttons can change the build without an input event.
  // Returning from another tab must therefore discard the prior build cache.
  document.addEventListener('moe:main-tab-activated',event=>{if(event.detail?.id==='combatTrial'){metricCache.clear();if(compiled)scheduleRender();}});
  // Persist calculation inputs, not the transient battle timeline or catalogue filters.
  const storedBeforeMount=typeof collectConfig==='function'?collectConfig().state.combatTrial:null;
  const controls=()=>[...(workspace.querySelectorAll?.('input,select,textarea')||[])].filter(n=>n.id&&!n.closest?.('#combatCatalogPicker')&&!['button','submit','file'].includes(n.type));
  const readControls=()=>Object.fromEntries(controls().map(n=>[n.id,n.type==='checkbox'?n.checked:n.value]));
  const initialControls=readControls();
  const readMap=m=>Object.fromEntries([...m].map(([k,n])=>[k,n.value]));
  let pendingSettings=null;
  function captureSettings(){return pendingSettings||{version:1,selected:el('Select').value,fields:readControls(),skills:readMap(skillInputs),generatedSkills:readMap(generatedSkillInputs),requestCounts:readMap(generatedRequestCountInputs)};}
  function writeControls(fields){for(const n of controls()){if(!Object.hasOwn(fields,n.id)||n===el('Select'))continue;const v=fields[n.id];if(n.type==='checkbox'){if(typeof v==='boolean')n.checked=v;}else if(typeof v==='string'||typeof v==='number'){if(n.tagName!=='SELECT'||[...n.options].some(o=>o.value===String(v)))n.value=String(v);}}}
  function writeMap(map,values){for(const [k,n]of map)if(Object.hasOwn(values||{},k))n.value=String(values[k]);}
  async function restoreSettings(raw){
   const saved=raw?.version===1?structuredClone(raw):null;
   pendingSettings=saved;state=api.create();writeControls(initialControls);
   const savedEntry=selectableEntries.find(r=>r.key===saved?.selected);
   if(savedEntry&&![...(el('Select').options||el('Select').children)].some(o=>o.value===savedEntry.key)){
    const option=document.createElement('option');option.value=savedEntry.key;option.textContent=savedEntry.name;el('Select').append(option);
   }
   el('Select').value=savedEntry?savedEntry.key:'';
   const selected=el('Select').value;
   const task=select();const token=version;await task;
   if(token!==version){if(pendingSettings===saved)pendingSettings=null;return;}
   if(saved&&selected&&compiled){writeControls(saved.fields||{});writeMap(skillInputs,saved.skills);writeMap(generatedSkillInputs,saved.generatedSkills);writeMap(generatedRequestCountInputs,saved.requestCounts);metricCache.clear();render();}
   pendingSettings=null;
  }
  populate();
  root.MOE_COMBAT_TRIAL_SETTINGS={capture:captureSettings,restore:restoreSettings};
  if(storedBeforeMount)restoreSettings(storedBeforeMount);
 }
 if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();}
})(globalThis);
