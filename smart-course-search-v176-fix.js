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

  // The map browser's original filter expects one literal substring. Convert
  // smart multi-field or typo searches to the strongest useful map context.
  const priorOpenMap=window.openCourseMapBrowser;
  if(typeof priorOpenMap==='function')window.openCourseMapBrowser=function(){
    const original=String(typeof courseLibraryQuery!=='undefined'?courseLibraryQuery:'').trim();
    if(!original)return priorOpenMap();
    const literal=(Array.isArray(courses)?courses:[]).some(c=>[c?.name,c?.city,c?.state,c?.country].some(v=>String(v||'').toLowerCase().includes(original.toLowerCase())));
    if(literal)return priorOpenMap();
    const ranked=(Array.isArray(courses)?courses:[]).map(c=>({c,score:window.smartCourseSearchScore?.(c,original)||0})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
    const top=ranked[0]?.c;
    if(!top)return priorOpenMap();
    const q=original.toLowerCase();
    const context=[top.city,top.state,top.postal_code,top.country].find(v=>v&&q.includes(String(v).toLowerCase()))||top.city||top.name;
    try{courseLibraryQuery=String(context||original).toLowerCase();return priorOpenMap();}
    finally{courseLibraryQuery=original.toLowerCase();}
  };
})();