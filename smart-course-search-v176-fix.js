/* ParFolio v176 search interaction hardening. */
(function(){
  const priorQuick=window.smartQuickFilter;
  if(typeof priorQuick==='function')window.smartQuickFilter=function(name,value=true){
    if(name==='holes')value=Number(value)||null;
    return priorQuick(name,value);
  };

  // Autocomplete names may contain apostrophes. Handle suggestion selection in
  // capture phase so text is read from the DOM instead of interpolated JS.
  document.addEventListener('click',event=>{
    const button=event.target.closest?.('.smart-course-suggestions button');
    if(!button)return;
    const name=button.querySelector('b')?.textContent?.trim();
    if(!name)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    window.smartCourseChoose?.(name);
  },true);
})();