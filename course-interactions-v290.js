/* ParFolio v290 — stable course search + course-card interaction layer.
   Replaces the self-triggering Recent Searches observer from v274 and keeps
   mobile/iOS interaction deterministic. */
(function(){
  const norm=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();

  function parseCourseIndex(el){
    const attr=el?.getAttribute?.('onclick')||'';
    const match=attr.match(/startCourseFromLibrary\((\d+)\)/);
    return match?Number(match[1]):null;
  }

  function isExcludedTarget(target){
    return !!target.closest?.('.course-favorite,.smart-row-favorite,.smart-row-admin,.course-correction-trigger,a,[data-clear-recent-courses],[onclick*="editCourse"],[onclick*="mapCatalogCourse"]');
  }

  // One capture-phase handler makes course selection reliable even when map
  // previews or nested controls exist inside the course card.
  document.addEventListener('click',event=>{
    const target=event.target;
    if(!target?.closest||isExcludedTarget(target))return;

    const suggestion=target.closest('.smart-course-suggestions button');
    if(suggestion){
      const name=suggestion.querySelector('b')?.textContent?.trim();
      if(name){event.preventDefault();event.stopImmediatePropagation();window.smartCourseChoose?.(name);}
      return;
    }

    const start=target.closest('.course-name-start,.course-start-target,.smart-course-main');
    if(!start)return;
    const index=parseCourseIndex(start);
    if(!Number.isInteger(index))return;
    event.preventDefault();
    event.stopImmediatePropagation();
    try{window.startCourseFromLibrary?.(index);}catch(error){console.warn('ParFolio course selection failed',error);}
  },true);

  // Prevent map preview internals from becoming an accidental dead tap zone.
  function normalizeCards(){
    document.querySelectorAll('.course-start-target,.smart-course-main,.course-name-start').forEach(el=>{
      el.style.pointerEvents='auto';
      el.style.touchAction='manipulation';
      if(el.tagName==='BUTTON'&&!el.type)el.type='button';
    });
    document.querySelectorAll('.course-preview-map').forEach(map=>{
      map.style.pointerEvents='none';
    });
  }

  // Keep the search field native and focusable. No observer mutates the search
  // result DOM on every animation frame.
  function normalizeSearch(){
    const input=document.querySelector('.course-library-search input[type="search"]');
    if(!input)return;
    input.disabled=false;input.readOnly=false;
    input.removeAttribute('disabled');input.removeAttribute('readonly');
    input.style.pointerEvents='auto';input.style.touchAction='manipulation';
    input.setAttribute('autocomplete','off');input.setAttribute('autocapitalize','none');input.setAttribute('spellcheck','false');
  }

  // Recent Searches v274 is intentionally disabled by removing any stale section.
  // This feature can be reintroduced later with an idempotent renderer.
  function removeLegacyRecent(){
    document.querySelector('.pf-recent-searches')?.remove();
  }

  let scheduled=false;
  function stabilize(){
    scheduled=false;
    normalizeSearch();normalizeCards();removeLegacyRecent();
  }
  function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(stabilize);}

  // Observe app replacement only; do not rewrite observed content.
  const app=document.getElementById('app')||document.body;
  new MutationObserver(schedule).observe(app,{childList:true,subtree:false});
  stabilize();
  setTimeout(stabilize,250);
  setTimeout(stabilize,900);
})();
