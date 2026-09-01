/* Version 120: place Clear All Markers and Save Shared Course with the marker controls. */
(function(){
  function groupEditorActions(){
    if(!draft||s?.v!=='mapCourse')return;
    const groups=app.querySelector('.marker-groups');
    if(!groups||groups.querySelector('.editor-hole-actions'))return;

    const clearAll=app.querySelector('.marker-clear-actions .clear-all-markers');
    const save=app.querySelector('#saveCourseButton');
    if(!clearAll&&!save)return;

    const section=document.createElement('section');
    section.className='editor-hole-actions';
    section.innerHTML='<small>HOLE / COURSE ACTIONS</small><div class="course-editor-action-buttons"></div>';
    const buttons=section.querySelector('.course-editor-action-buttons');

    if(clearAll){
      clearAll.textContent=`Clear All Markers · Hole ${draft.mapHole}`;
      buttons.appendChild(clearAll);
      const oldWrap=app.querySelector('.marker-clear-actions');
      if(oldWrap)oldWrap.classList.add('editor-selected-clear-only');
    }
    if(save){
      save.textContent='Save Shared Course';
      buttons.appendChild(save);
    }
    groups.appendChild(section);
  }

  const priorMapCourse120=mapCourse;
  mapCourse=function(){
    priorMapCourse120();
    groupEditorActions();
  };
})();
