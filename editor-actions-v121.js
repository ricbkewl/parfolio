/* Version 121: move the selected-marker clear button into the grouped editor actions. */
(function(){
  function regroupSelectedClear(){
    if(!draft||s?.v!=='mapCourse')return;
    const target=app.querySelector('.course-editor-action-buttons');
    if(!target)return;
    const wrapper=app.querySelector('.marker-clear-actions');
    if(!wrapper)return;
    const selected=[...wrapper.querySelectorAll('button')].find(button=>!button.classList.contains('clear-all-markers'));
    if(selected){
      selected.classList.add('clear-selected-marker');
      selected.textContent=`Clear ${markerName(draft.target)}`;
      target.insertBefore(selected,target.firstChild);
    }
    if(!wrapper.querySelector('button'))wrapper.remove();
  }
  const priorMapCourse121Actions=mapCourse;
  mapCourse=function(){priorMapCourse121Actions();regroupSelectedClear();};
})();
