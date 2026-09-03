/* ParFolio v213 — course admin/search UX without per-mutation catalog rescans. */
(function(){
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
  let exactTimer=null,decorateQueued=false;

  function searchInput(){return document.querySelector('.course-library-search input')}
  function suggestionBox(){return document.querySelector('.smart-course-suggestions')}
  function hideSuggestions(){const box=suggestionBox();if(box)box.classList.add('hidden')}
  function courseList(){return Array.isArray(window.courses)?window.courses:(typeof courses!=='undefined'&&Array.isArray(courses)?courses:[])}
  function exactCourse(value){const q=norm(value);if(!q)return null;for(const c of courseList()){if(norm(c?.name)===q)return c}return null}
  function focusResults(){const grid=document.getElementById('courseLibraryGrid');if(grid)grid.scrollIntoView({behavior:'smooth',block:'start'})}

  const priorChoose=window.smartCourseChoose;
  if(typeof priorChoose==='function'){
    window.smartCourseChoose=function(value){
      const out=priorChoose.apply(this,arguments);
      hideSuggestions();
      const input=searchInput();if(input)input.blur();
      requestAnimationFrame(()=>{hideSuggestions();focusResults()});
      return out;
    };
  }

  function bindSearchBehavior(){
    const input=searchInput();if(!input||input.dataset.v213Bound)return;
    input.dataset.v213Bound='1';
    input.addEventListener('input',()=>{
      clearTimeout(exactTimer);
      const value=input.value;
      if(String(value||'').trim().length<3)return;
      exactTimer=setTimeout(()=>{if(exactCourse(value))hideSuggestions()},220);
    });
    input.addEventListener('keydown',e=>{
      if(e.key==='Enter'){
        hideSuggestions();input.blur();requestAnimationFrame(focusResults);
      }
    });
    input.addEventListener('blur',()=>setTimeout(hideSuggestions,120));
  }

  document.addEventListener('pointerdown',e=>{
    if(!e.target.closest('.course-library-search'))hideSuggestions();
  },true);

  function normalizeAdminButtons(){
    if(!document.querySelector('#courseLibraryGrid'))return;
    document.querySelectorAll('.smart-row-admin,.course-map-admin-action').forEach(btn=>{
      if(btn.textContent!=='Edit')btn.textContent='Edit';
      btn.setAttribute('aria-label','Edit course');
      btn.title='Edit course';
    });
  }

  function queueDecorate(){
    if(decorateQueued)return;
    decorateQueued=true;
    requestAnimationFrame(()=>{
      decorateQueued=false;
      if(typeof s!=='undefined'&&s?.v==='coursesView'){
        bindSearchBehavior();
        normalizeAdminButtons();
      }
    });
  }

  /* Observe only to decorate newly rendered buttons/inputs. Never search the
     course catalog from this observer: search result rendering itself mutates
     the DOM heavily on every keystroke. */
  const observer=new MutationObserver(queueDecorate);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(queueDecorate,250);
})();
