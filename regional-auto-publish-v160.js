/* ParFolio v160: auto-publish complete automated GPS mappings in CA, NY, and Indonesia.
   Users report bad geometry through Suggest a Course Correction; no manual review gate. */
(function(){
  const TARGETS=new Set(['CA','NY','ID','INDONESIA']);
  const regionOf=c=>{
    const state=String(c?.state||'').toUpperCase();
    const country=String(c?.country_code||c?.country||'').toUpperCase();
    if(state==='CA')return'CA';
    if(state==='NY')return'NY';
    if(country==='ID'||country==='IDN'||country.includes('INDONESIA'))return'ID';
    return'';
  };
  const completeCount=c=>Array.isArray(c?.greens)?c.greens.filter(g=>g?.tee&&g?.center).length:0;
  function publish(course){
    const region=regionOf(course);if(!TARGETS.has(region))return false;
    const holes=Number(course?.holes)||18,mapped=completeCount(course);
    const complete=(holes===9&&mapped>=9)||(holes!==9&&mapped>=18);
    if(!complete)return false;
    course.catalogOnly=false;
    course.catalogApproved=true;
    course.sharedLibraryGpsActive=true;
    course.sharedMappingStatus='published';
    course.mappingStatus='published';
    course.gpsStatus='published';
    course.greens.forEach(g=>{if(g?.tee&&g?.center)g._review='published-gps';});
    course._autoPublished={version:160,region,mappedHoles:mapped,policy:'complete-map-auto-publish',corrections:'Suggest a Course Correction'};
    return true;
  }
  function sweep(){
    if(typeof courses==='undefined'||!Array.isArray(courses))return 0;
    let changed=0;for(const c of courses)if(publish(c))changed++;
    if(changed)try{localStorage.parfolioCourses=JSON.stringify(courses)}catch{}
    window.PARFOLIO_AUTO_PUBLISH={version:160,changed,regions:['CA','NY','ID'],at:new Date().toISOString()};
    return changed;
  }
  window.autoPublishRegionalGps=sweep;
  if(typeof loadSharedCourseLibrary==='function'){
    const prior=loadSharedCourseLibrary;
    loadSharedCourseLibrary=async function(options){const result=await prior(options);sweep();return result;};
  }
  const observer=new MutationObserver(()=>sweep());
  observer.observe(document.documentElement,{childList:true,subtree:true});
  [0,500,1500,3500].forEach(ms=>setTimeout(sweep,ms));
})();
