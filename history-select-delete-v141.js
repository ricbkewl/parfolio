/* Version 141: selectable Previous Rounds with Select All and bulk delete-from-my-history. */
(function(){
  const selected=new Set();
  let deleting=false;

  function availableIds(){return (historyRounds||[]).map(match=>String(match.id));}
  function selectedCount(){return availableIds().filter(id=>selected.has(id)).length;}
  function allSelected(){const ids=availableIds();return ids.length>0&&ids.every(id=>selected.has(id));}
  function pruneSelection(){const allowed=new Set(availableIds());[...selected].forEach(id=>{if(!allowed.has(id))selected.delete(id)});}

  window.toggleHistoryMatchSelection=function(roundId,checked){
    const id=String(roundId);
    if(checked)selected.add(id);else selected.delete(id);
    updateSelectionUI();
  };

  window.toggleAllHistoryMatches=function(checked){
    availableIds().forEach(id=>checked?selected.add(id):selected.delete(id));
    historyView();
  };

  window.clearHistorySelection=function(){selected.clear();historyView();};

  window.deleteSelectedHistoryMatches=async function(){
    if(deleting)return;
    if(!historyControlsReady){alert('Install the History Controls SQL update in Supabase first.');return;}
    const ids=availableIds().filter(id=>selected.has(id));
    if(!ids.length){alert('Select at least one match first.');return;}
    const label=ids.length===1?'this match':`these ${ids.length} matches`;
    if(!confirm(`Delete ${label} from your Previous Rounds? This removes them only from your account history; other golfers keep their records.`))return;
    deleting=true;updateSelectionUI();
    const failed=[];
    for(const id of ids){
      try{
        const {error}=await db.rpc('hide_round_from_my_history',{p_round_id:id});
        if(error)failed.push(id);
        else selected.delete(id);
      }catch{failed.push(id)}
    }
    deleting=false;
    if(failed.length)alert(`${failed.length} ${failed.length===1?'match':'matches'} could not be deleted from your history.`);
    await openHistory();
  };

  function updateSelectionUI(){
    const count=selectedCount();
    document.querySelectorAll('.history-select-checkbox').forEach(input=>{input.checked=selected.has(String(input.dataset.id));});
    const all=document.getElementById('historySelectAll');if(all){all.checked=allSelected();all.indeterminate=count>0&&!allSelected();}
    const countNode=document.getElementById('historySelectionCount');if(countNode)countNode.textContent=count?`${count} selected`:'Select matches';
    const deleteButton=document.getElementById('historyBulkDelete');if(deleteButton){deleteButton.disabled=!count||deleting;deleteButton.textContent=deleting?'Deleting…':count?`Delete Selected (${count})`:'Delete Selected';}
    const clearButton=document.getElementById('historyClearSelection');if(clearButton)clearButton.hidden=!count;
  }

  const priorHistoryView=historyView;
  historyView=function(){
    if(!currentUser){priorHistoryView();return;}
    pruneSelection();
    const count=selectedCount(),all=allSelected();
    app.innerHTML=`<button class="back" onclick="accountAction()">← Account</button>
      <div class="row"><div><h1>Previous Rounds</h1><p class="muted">Every round played with this login is saved here.</p></div>${!historyLoading?'<button class="locate" onclick="openHistory()">Refresh</button>':''}</div>
      ${!historyLoading&&!historyError&&historyRounds.length?`<section class="history-bulk-toolbar">
        <label class="history-select-all"><input id="historySelectAll" type="checkbox" ${all?'checked':''} onchange="toggleAllHistoryMatches(this.checked)"><span><b>Select All</b><small id="historySelectionCount">${count?`${count} selected`:'Select matches'}</small></span></label>
        <div class="history-bulk-actions"><button id="historyClearSelection" type="button" class="history-clear-selection" onclick="clearHistorySelection()" ${count?'':'hidden'}>Clear</button><button id="historyBulkDelete" type="button" class="history-delete-selected" onclick="deleteSelectedHistoryMatches()" ${count&&!deleting?'':'disabled'}>${deleting?'Deleting…':count?`Delete Selected (${count})`:'Delete Selected'}</button></div>
      </section>`:''}
      ${!historyControlsReady?'<div class="notice">Install the History Controls SQL update to remove or permanently delete matches.</div>':''}
      ${historyLoading?'<div class="history-loading">Loading your matches…</div>':''}${historyError?`<div class="error-notice">${esc(historyError)}</div>`:''}${!historyLoading&&!historyError&&!historyRounds.length?'<div class="empty history-empty"><b>No matches yet</b><span>Your completed and in-progress rounds will appear here.</span></div>':''}
      <div class="history-select-list">${historyRounds.map(match=>{const id=String(match.id),checked=selected.has(id);return`<article class="history-card history-selectable ${checked?'selected':''}">
        <label class="history-match-selector" aria-label="Select ${esc(match.course_name)}"><input class="history-select-checkbox" data-id="${esc(id)}" type="checkbox" ${checked?'checked':''} onchange="toggleHistoryMatchSelection('${esc(id)}',this.checked)"><span aria-hidden="true"></span></label>
        <div class="history-select-content"><div class="history-top"><div><span class="history-date">${esc(formatMatchDate(match.created_at))}</span><h2>${esc(match.course_name)}</h2><span class="small muted">${match.holes} holes · ${esc(match.displayName)}</span></div><div class="history-score"><b>${match.score||'–'}</b><span>${match.complete?rel(match.relative):`${match.scoreCount}/${match.holes}`}</span></div></div><div class="history-bottom"><span class="status-chip ${match.complete?'complete':'progress'}">${match.complete?'Complete':'In progress'}</span><span class="history-card-actions"><button class="back remove-history-link" onclick="hideMatchFromHistory('${esc(id)}')">Remove</button><button class="back" onclick="openHistoryRound('${esc(id)}')">View →</button></span></div></div>
      </article>`}).join('')}</div>`;
    updateSelectionUI();
  };
})();
