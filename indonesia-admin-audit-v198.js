/* ParFolio v198 — super-admin-only Indonesia catalog audit filter. */
(function(){
  let enabled=false;
  const isSuper=()=>typeof adminRole!=='undefined'&&adminRole==='super_admin';
  const isIndonesia=course=>Boolean(course?.parfolioIndonesiaAudit)||String(course?.country_code||'').toUpperCase()==='ID'||String(course?.country||'').toLowerCase()==='indonesia';

  const priorRanked=typeof rankedSharedCourses==='function'?rankedSharedCourses:null;
  if(priorRanked){
    rankedSharedCourses=function(){
      const rows=priorRanked.apply(this,arguments);
      if(!enabled||!isSuper())return rows;
      return rows.filter(item=>isIndonesia(item?.course));
    };
  }

  const priorMatches=typeof courseMatchesFilters==='function'?courseMatchesFilters:null;
  if(priorMatches){
    courseMatchesFilters=function(course){
      if(enabled&&isSuper())return isIndonesia(course);
      return priorMatches.apply(this,arguments);
    };
  }

  function decorate(){
    const row=document.querySelector('.smart-course-quick-filters');
    if(!row)return;
    let chip=row.querySelector('[data-indonesia-audit]');
    if(!isSuper()){
      chip?.remove();
      if(enabled){enabled=false;window.PARFOLIO_INDONESIA_AUDIT=false;}
      return;
    }
    if(!chip){
      chip=document.createElement('button');
      chip.type='button';
      chip.className='smart-quick-chip';
      chip.dataset.indonesiaAudit='1';
      chip.textContent='Indonesia Audit';
      chip.onclick=()=>window.toggleIndonesiaAuditFilter();
      row.appendChild(chip);
    }
    chip.classList.toggle('on',enabled);
    chip.setAttribute('aria-pressed',enabled?'true':'false');
  }

  window.toggleIndonesiaAuditFilter=async function(){
    if(!isSuper())return false;
    enabled=!enabled;
    window.PARFOLIO_INDONESIA_AUDIT=enabled;
    if(enabled){
      if(typeof window.loadParFolioIndonesiaCatalog==='function')await window.loadParFolioIndonesiaCatalog();
      if(typeof courseLibraryQuery!=='undefined')courseLibraryQuery='';
      const input=document.querySelector('.course-library-search input');
      if(input)input.value='';
    }
    decorate();
    if(typeof refreshCourseLibrary==='function')refreshCourseLibrary();
    const heading=document.getElementById('courseResultsHeading');
    if(heading&&enabled)heading.textContent='Indonesia Audit — Active Courses';
    return enabled;
  };

  const priorCourses=typeof coursesView==='function'?coursesView:null;
  if(priorCourses){
    window.coursesView=coursesView=function(){
      const out=priorCourses.apply(this,arguments);
      setTimeout(decorate,0);
      setTimeout(decorate,350);
      return out;
    };
  }

  const observer=new MutationObserver(()=>decorate());
  const start=()=>{if(document.body)observer.observe(document.body,{childList:true,subtree:true});decorate();};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  [250,750,1600,3000].forEach(ms=>setTimeout(decorate,ms));
})();
