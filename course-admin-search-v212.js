/* ParFolio v212 — clearer course admin editing and non-sticky search suggestions. */
(function(){
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');

  function searchInput(){return document.querySelector('.course-library-search input')}
  function suggestionBox(){return document.querySelector('.smart-course-suggestions')}
  function hideSuggestions(){const box=suggestionBox();if(box)box.classList.add('hidden')}
  function exactCourse(value){const q=norm(value);if(!q)return null;return (Array.isArray(window.courses)?window.courses:typeof courses!=='undefined'&&Array.isArray(courses)?courses:[]).find(c=>norm(c?.name)===q)||null}
  function focusResults(){const grid=document.getElementById('courseLibraryGrid');if(grid)grid.scrollIntoView({behavior:'smooth',block:'start'})}

  /* Keep the existing search engine, but once a suggestion is chosen the
     dropdown must get out of the way and the actual course result remains. */
  const priorChoose=window.smartCourseChoose;
  if(typeof priorChoose==='function'){
    window.smartCourseChoose=function(value){
      const out=priorChoose.apply(this,arguments);
      hideSuggestions();
      const input=searchInput();if(input)input.blur();
      setTimeout(()=>{hideSuggestions();focusResults()},0);
      return out;
    };
  }

  function bindSearchBehavior(){
    const input=searchInput();if(!input||input.dataset.v212Bound)return;
    input.dataset.v212Bound='1';
    input.addEventListener('input',()=>{if(exactCourse(input.value))setTimeout(hideSuggestions,0)});
    input.addEventListener('keydown',e=>{
      if(e.key==='Enter'){
        hideSuggestions();input.blur();setTimeout(focusResults,0);
      }
    });
    input.addEventListener('blur',()=>setTimeout(hideSuggestions,140));
  }

  document.addEventListener('pointerdown',e=>{
    if(!e.target.closest('.course-library-search'))hideSuggestions();
  },true);

  function normalizeAdminButtons(){
    if(!document.querySelector('#courseLibraryGrid'))return;
    document.querySelectorAll('.smart-row-admin').forEach(btn=>{
      btn.textContent='Edit';
      btn.setAttribute('aria-label','Edit course');
      btn.title='Edit course';
    });
    document.querySelectorAll('.course-map-admin-action').forEach(btn=>{
      btn.textContent='Edit';
      btn.setAttribute('aria-label','Edit course');
      btn.title='Edit course';
    });
  }

  /* Catalog-only courses still use mapCatalogCourse() internally because that
     is the correct draft-creation/editor entry point. User-facing wording is
     consistently Edit so an unmapped course never appears locked. */
  const observer=new MutationObserver(()=>{
    if(typeof s!=='undefined'&&s?.v==='coursesView'){
      bindSearchBehavior();normalizeAdminButtons();
      const input=searchInput();if(input&&exactCourse(input.value))hideSuggestions();
    }
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(()=>{bindSearchBehavior();normalizeAdminButtons()},250);
})();
