/* Version 125: visible per-hole save/readiness status in course editor. */
(function(){
  function missingForHole(g){
    const missing=[];
    if(!(g?.tees?.black||g?.tee))missing.push('Black Tee');
    if(!g?.front)missing.push('Front');
    if(!g?.center)missing.push('Center');
    if(!g?.back)missing.push('Back');
    return missing;
  }

  function readinessMarkup(){
    if(!draft?.greens?.length)return '';
    const hole=draft.mapHole||1,g=draft.greens[hole-1]||{},missing=missingForHole(g),ready=!missing.length;
    const saved=draft.isNew?'Not yet saved':'Saved';
    return `<div class="editor-readiness ${ready?'ready':'incomplete'}" id="editorReadiness">
      <b>Hole ${hole}</b><span>${saved}${draft._lastAutoSavedHole===hole?' ✓':''}</span><span>${ready?'GPS Ready ✓':`Missing: ${missing.join(', ')}`}</span>
    </div>`;
  }

  const priorMapCourse125=mapCourse;
  mapCourse=function(){
    priorMapCourse125();
    const toolbar=app.querySelector('.map-toolbar');
    if(toolbar&&!app.querySelector('#editorReadiness'))toolbar.insertAdjacentHTML('afterend',readinessMarkup());
  };

  if(typeof autoSaveCurrentCourseHole==='function'){
    const priorAutoSave125=autoSaveCurrentCourseHole;
    window.autoSaveCurrentCourseHole=async function(){
      const hole=draft?.mapHole;
      const ok=await priorAutoSave125();
      if(ok&&draft&&hole){draft._lastAutoSavedHole=hole;const status=document.getElementById('editorReadiness');if(status)status.outerHTML=readinessMarkup();}
      return ok;
    };
  }
})();
