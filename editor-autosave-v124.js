/* Version 124: auto-save course mapping whenever the editor moves between holes. */
(function(){
  let autoSaveBusy=false;

  function editorSavePayload(){
    return {
      id:draft.id,
      name:draft.name,
      holes:draft.holes,
      pars:draft.pars,
      greens:draft.greens,
      updated_by:currentUser.id,
      updated_at:new Date().toISOString()
    };
  }

  function showAutoSaveStatus(text,isError=false){
    const message=document.getElementById('mapMessage');
    if(message){
      message.dataset.autosave=isError?'error':'ok';
      message.textContent=text;
    }
  }

  async function autoSaveEditorHole(){
    if(!draft||!currentUser||!adminRole)return true;
    if(autoSaveBusy)return false;
    autoSaveBusy=true;
    const hole=draft.mapHole;
    showAutoSaveStatus(`Saving Hole ${hole}…`);
    try{
      const payload=editorSavePayload();
      let result;
      if(draft.isNew){
        result=await db.from('courses').insert({...payload,created_by:currentUser.id});
      }else{
        result=await db.from('courses').update(payload).eq('id',draft.id);
      }
      if(result.error)throw result.error;
      draft.isNew=false;
      showAutoSaveStatus(`Hole ${hole} auto-saved ✓`);
      return true;
    }catch(error){
      console.error('Course editor auto-save failed',error);
      showAutoSaveStatus(`Hole ${hole} was not saved. Please try again before leaving this hole.`,true);
      alert(`Hole ${hole} could not be auto-saved: ${error.message||error}`);
      return false;
    }finally{
      autoSaveBusy=false;
    }
  }

  async function saveThenMove(move){
    if(!draft){move();return;}
    const ok=await autoSaveEditorHole();
    if(ok)move();
  }

  if(typeof mapNext==='function'){
    const priorMapNext124=mapNext;
    mapNext=function(){return saveThenMove(()=>priorMapNext124());};
  }
  if(typeof mapPrev==='function'){
    const priorMapPrev124=mapPrev;
    mapPrev=function(){return saveThenMove(()=>priorMapPrev124());};
  }

  window.autoSaveCurrentCourseHole=autoSaveEditorHole;
})();
