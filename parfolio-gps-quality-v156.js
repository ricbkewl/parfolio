/* ParFolio v156: shared GPS quality guard.
   A course remains searchable, but a shared GPS payload is not allowed into live play
   when independent mapping evidence shows hole numbering/layout mismatch. */
(function(){
  const normalize=value=>String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const KNOWN_BAD_SHARED_GPS=new Set([
    'cresta verde golf club','cresta verde golf course',
    'mission trails golf course','river view golf course','riverview golf course',
    'shorecliffs golf club','corral de tierra country club','aviara golf club',
    'arrowhead country club','william land park municipal golf course',
    'los altos golf country club','los altos golf and country club','victoria club',
    'arnold palmer at mission hills country club','santa ana country club',
    'del norte golf club','del norte golf course','enagic golf club at eastlake',
    'boundary oak golf course','los feliz 3 par golf course','los feliz 3 par golf course',
    'the ranch at laguna beach','the bridges at rancho santa fe'
  ]);

  function isQuarantined(course){return course?.sharedLibrarySource==='shared_golf_course_library'&&KNOWN_BAD_SHARED_GPS.has(normalize(course.name));}

  function quarantineSharedGps(){
    if(!Array.isArray(window.courses)&&typeof courses==='undefined')return 0;
    let changed=0;
    for(const course of courses||[]){
      if(!isQuarantined(course))continue;
      const hadGps=Array.isArray(course.greens)&&course.greens.some(g=>g?.tee&&g?.center);
      course.greens=[];
      course.catalogOnly=true;
      course.sharedLibraryGpsActive=false;
      course.mappingQualityIssue='hole_numbering_or_layout_mismatch';
      course.mappingQualityStatus='correction_required';
      if(hadGps)changed++;
    }
    if(changed){
      try{localStorage.parfolioCourses=JSON.stringify(courses)}catch{}
      window.PARFOLIO_GPS_QUALITY={version:156,quarantined:changed,checkedAt:new Date().toISOString()};
    }
    return changed;
  }
  window.parfolioQuarantineSharedGps=quarantineSharedGps;

  if(typeof loadSharedCourseLibrary==='function'){
    const prior=loadSharedCourseLibrary;
    loadSharedCourseLibrary=async function(options){const result=await prior(options);quarantineSharedGps();return result;};
  }

  if(typeof courseLibraryCard==='function'){
    const priorCard=courseLibraryCard;
    courseLibraryCard=function(course,index,distance=null){
      let html=priorCard(course,index,distance);
      if(isQuarantined(course)){
        html=html.replace(/GPS REVIEW|VERIFIED GPS|MAPPED COURSE|PUBLISHED/gi,'GPS CORRECTION NEEDED');
      }
      return html;
    };
  }

  [0,350,900,1800,4000].forEach(ms=>setTimeout(()=>{
    const changed=quarantineSharedGps();
    if(changed&&typeof render==='function'&&s?.v!=='round')try{render()}catch{}
  },ms));
})();
