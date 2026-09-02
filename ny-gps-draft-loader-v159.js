/* ParFolio v183: load verified-source New York OSM geometry into the public catalog.
   Complete 9/18-hole maps may be activated by regional-auto-publish-v160. Partial
   geometry stays visibly partial and never overwrites existing GPS. */
(function(){
  const URL='data/ny-osm-gps-drafts-v159.json?v=159';
  let cache=null,pending=null;

  function point(value){
    const lat=Number(value?.lat),lng=Number(value?.lng);
    return Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180&&!(lat===0&&lng===0)?{lat,lng}:null;
  }
  function hasExistingGps(course){
    return Array.isArray(course?.greens)&&course.greens.some(g=>(point(g?.tee)||point(g?.tees?.black))&&point(g?.center));
  }
  function nyCourse(course){
    return String(course?.state||'').toUpperCase()==='NY' || String(course?.id||'').startsWith('opengolf-ny-');
  }
  function sourceId(course){
    return String(course?.openGolfApiId||String(course?.id||'').replace(/^opengolf-ny-/,''));
  }
  async function data(){
    if(cache)return cache;
    if(pending)return pending;
    pending=fetch(URL,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(`NY GPS draft file returned ${r.status}`);return r.json();}).then(v=>(cache=v)).finally(()=>pending=null);
    return pending;
  }
  function emptyGreen(){return{tee:null,tees:{black:null,blue:null,white:null,red:null},aim1:null,aim2:null,front:null,center:null,back:null,_review:'osm-draft-review'};}

  function applyMapping(course,mapping){
    if(!course||!mapping||hasExistingGps(course))return false;
    const numbered=(mapping.numberedHoles||[]).map(Number).filter(n=>Number.isInteger(n)&&n>0);
    const mappedMaximum=Math.max(0,...numbered);
    const declared=Number(mapping.playableHoles)||Number(course.holes)||mappedMaximum||18;
    const holeCount=[9,18].includes(declared)?declared:(mappedMaximum<=9?9:18);
    const greens=Array.from({length:holeCount},emptyGreen),priorPars=Array.isArray(course.pars)?course.pars:[];
    const pars=Array.from({length:holeCount},(_,index)=>Number(priorPars[index])||4);
    for(const row of mapping.greens||[]){
      const n=Number(row.hole);if(!Number.isInteger(n)||n<1||n>holeCount)continue;
      const tee=point(row.tee),center=point(row.center);
      if(!tee||!center)continue;
      greens[n-1]={tee,tees:{black:tee,blue:null,white:null,red:null},aim1:point(row.aim1),aim2:point(row.aim2),front:point(row.front),center,back:point(row.back),_review:'osm-draft-review',_nyAutoMapped:true};
      if(Number(row.par)>=3&&Number(row.par)<=6)pars[n-1]=Number(row.par);
    }
    const mappedHoleCount=greens.filter(g=>g.tee&&g.center).length;
    if(!mappedHoleCount)return false;
    course.greens=greens;
    course.pars=pars;
    course.holes=holeCount;
    course.catalogOnly=true;
    course.sharedLibraryGpsActive=false;
    course.sharedMappingStatus='gps_draft';
    course.mappingStatus='gps_draft';
    course._nyAutoMap={version:183,reviewReady:Boolean(mapping.reviewReady),confidence:mapping.confidence||'partial',mappedHoleCount,boundaryMatch:mapping.boundaryMatch||null,issues:mapping.issues||[]};
    return true;
  }

  async function hydrateAll(){
    try{
      const payload=await data(),mappings=payload?.courses||{};
      if(typeof courses==='undefined'||!Array.isArray(courses))return 0;
      let newlyLoaded=0;
      for(const course of courses){
        if(!nyCourse(course)||hasExistingGps(course))continue;
        const mapping=mappings[sourceId(course)];
        if(!mapping||!applyMapping(course,mapping))continue;
        newlyLoaded++;
      }
      const nyCourses=courses.filter(nyCourse),geometryCourses=nyCourses.filter(course=>course?._nyAutoMap?.mappedHoleCount>0);
      const complete=geometryCourses.filter(course=>course._nyAutoMap.mappedHoleCount===course.holes).length,partial=geometryCourses.length-complete;
      const loaded=geometryCourses.length;
      window.PARFOLIO_NY_GPS_GEOMETRY={version:183,sourceCourses:Object.keys(mappings).length,loaded,complete,partial,locationOnly:Math.max(0,(courses.filter(nyCourse).length-loaded)),loadedAt:new Date().toISOString()};
      if(newlyLoaded&&typeof window.autoPublishRegionalGps==='function')window.autoPublishRegionalGps();
      if(newlyLoaded&&typeof render==='function'&&typeof s!=='undefined'&&s?.v!=='round')try{render()}catch{}
      return loaded;
    }catch(error){console.warn('NY GPS geometry could not be loaded',error);return 0;}
  }

  window.hydrateAllNyGpsGeometry=hydrateAll;

  window.loadNyGpsDraftForCourse=async function(course){
    if(!nyCourse(course)||hasExistingGps(course))return false;
    try{
      const payload=await data(),mapping=payload?.courses?.[sourceId(course)];
      return mapping?applyMapping(course,mapping):false;
    }catch(error){console.warn('NY GPS draft unavailable',error);return false;}
  };

  if(typeof loadSharedCourseLibrary==='function'){
    const priorLoadSharedCourseLibrary=loadSharedCourseLibrary;
    loadSharedCourseLibrary=async function(options){const result=await priorLoadSharedCourseLibrary(options);await hydrateAll();return result;};
  }
  [600,1800,4000].forEach(delay=>setTimeout(()=>hydrateAll(),delay));

  if(typeof mapCourse==='function'){
    const prior=mapCourse;
    mapCourse=function(){
      prior();
      const active=typeof draft!=='undefined'?draft:null;
      if(!active||!nyCourse(active)||hasExistingGps(active)||active?._nyDraftLoading)return;
      active._nyDraftLoading=true;
      window.loadNyGpsDraftForCourse(active).then(changed=>{
        delete active._nyDraftLoading;
        if(changed){
          try{prior();}catch{}
          const editor=document.querySelector('.course-editor,.editor-shell,#courseEditor');
          if(editor){
            const note=document.createElement('div');
            note.className='ny-gps-draft-note';
            note.textContent=`NY automated GPS draft loaded · ${active._nyAutoMap.mappedHoleCount} holes · ${active._nyAutoMap.reviewReady?'Review-ready':'Manual review needed'}`;
            editor.prepend(note);
          }
        }
      });
    };
  }
})();
