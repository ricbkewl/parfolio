/* Version 143: shared Golf Course Library read-through for eligible ATG courses.
   Shared data is primary when its publication state is safe for normal ATG use.
   Existing ATG course objects remain in place as per-course compatibility/fallback data.
   Legacy ATG IDs are never replaced by shared UUIDs. */
(function(){
  const SHARED_LIBRARY_URL='https://qziemwgcjkohjchxdvny.supabase.co';
  const SHARED_LIBRARY_PUBLISHABLE_KEY='sb_publishable_vod_BeAVzOLwjbCwLLeUBw_i8Bfv5wh';
  const READABLE_STATUSES=new Set(['scorecard_ready','gps_review','verified_gps','published']);
  const GPS_STATUSES=new Set(['gps_review','verified_gps','published']);
  const NEVER_SHARED_GPS_NAMES=new Set(['jurupa hills country club']);
  const EXCLUDED_FACILITY_NAMES=['royale jakarta golf club'];
  let sharedLibraryClient=null;
  let sharedLoadBusy=false;
  let sharedLoadPromise=null;

  function client(){
    if(!sharedLibraryClient){
      sharedLibraryClient=supabase.createClient(SHARED_LIBRARY_URL,SHARED_LIBRARY_PUBLISHABLE_KEY,{
        auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
      });
    }
    return sharedLibraryClient;
  }
  function normalize(value=''){
    return String(value).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  }
  function validPoint(p){
    return p&&Number.isFinite(Number(p.lat))&&Number.isFinite(Number(p.lng));
  }
  function point(p){
    return validPoint(p)?{lat:Number(p.lat),lng:Number(p.lng)}:null;
  }
  function isExcludedCourse(course){
    const n=normalize(course?.name);
    return EXCLUDED_FACILITY_NAMES.some(prefix=>n===prefix||n.startsWith(prefix+' '));
  }
  function cleanGreen(g={}){
    const tees={};
    for(const color of ['black','blue','white','red']){
      const p=point(g.tees?.[color]);
      if(p)tees[color]=p;
    }
    const black=tees.black||point(g.tee);
    if(black&&!tees.black)tees.black=black;
    return {
      tee:black||null,
      tees,
      aim1:point(g.aim1),
      aim2:point(g.aim2),
      front:point(g.front),
      center:point(g.center),
      back:point(g.back),
      _review:g._review||'shared-library',
      _sharedLibrary:true
    };
  }
  function usableGps(payload,course){
    if(!GPS_STATUSES.has(String(payload?.mapping_status||'')))return false;
    if(NEVER_SHARED_GPS_NAMES.has(normalize(course?.name)))return false;
    const holeCount=Number(payload?.holes)||Number(course?.holes)||18;
    if(!Array.isArray(payload?.greens)||payload.greens.length!==holeCount)return false;
    const cleaned=payload.greens.map(cleanGreen);
    if(cleaned.some(g=>!g.tee||!g.center))return false;
    return cleaned;
  }
  function patchListedCatalog(course,payload,sharedGreens,pars){
    try{
      if(!Array.isArray(LISTED_COURSE_CATALOG))return;
      const legacyId=course.id;
      const n=normalize(course.name);
      const listed=LISTED_COURSE_CATALOG.find(c=>c.id===legacyId||normalize(c.name)===n);
      if(!listed)return;
      listed.sharedCourseId=payload.shared_course_id||listed.sharedCourseId;
      listed.sharedMappingStatus=payload.mapping_status||listed.sharedMappingStatus;
      listed.sharedLibrarySource=payload.source||listed.sharedLibrarySource;
      if(pars)listed.pars=pars;
      if(sharedGreens)listed.greens=sharedGreens;
      if(payload.city)listed.city=payload.city;
      if(payload.state_code||payload.state)listed.state=payload.state_code||payload.state;
      if(payload.address)listed.address=payload.address;
      if(payload.postal_code)listed.postal_code=payload.postal_code;
    }catch{}
  }
  function patchCourseAtIndex(idx,payload){
    if(!payload||idx<0||!courses?.[idx])return {patched:false,gps:false};
    const prior=courses[idx];
    const status=String(payload.mapping_status||'');
    if(!READABLE_STATUSES.has(status))return {patched:false,gps:false,status};

    const holeCount=Number(payload.holes)||Number(prior.holes)||18;
    const incomingPars=Array.isArray(payload.pars)?payload.pars.map(Number):[];
    const pars=incomingPars.length===holeCount&&incomingPars.every(Number.isFinite)?incomingPars:null;
    const sharedGreens=usableGps(payload,prior);

    courses[idx]={
      ...prior,
      name:payload.name||prior.name,
      holes:holeCount,
      pars:pars||prior.pars,
      greens:sharedGreens||prior.greens,
      city:payload.city||prior.city,
      state:payload.state_code||payload.state||prior.state,
      address:payload.address||prior.address,
      postal_code:payload.postal_code||prior.postal_code,
      sharedCourseId:payload.shared_course_id||prior.sharedCourseId,
      sharedLibrarySource:payload.source||prior.sharedLibrarySource,
      sharedMappingStatus:status,
      sharedLibraryGpsActive:Boolean(sharedGreens),
      sharedLibraryLoadedAt:new Date().toISOString()
    };
    patchListedCatalog(courses[idx],payload,sharedGreens,pars);
    return {patched:true,gps:Boolean(sharedGreens),status};
  }
  async function fetchPayload(course){
    const queryName=normalize(course?.name);
    if(!queryName||isExcludedCourse(course))return {course,skipped:true};
    try{
      const {data,error}=await client().rpc('shared_course_payload',{p_normalized_name:queryName});
      if(error)throw error;
      return {course,data};
    }catch(error){
      return {course,error};
    }
  }
  async function mapInBatches(items,batchSize,fn){
    const out=[];
    for(let i=0;i<items.length;i+=batchSize){
      const batch=items.slice(i,i+batchSize);
      out.push(...await Promise.all(batch.map(fn)));
    }
    return out;
  }
  async function loadSharedCourseLibrary({rerender=true,retries=6}={}){
    if(sharedLoadBusy)return sharedLoadPromise||false;
    sharedLoadBusy=true;
    sharedLoadPromise=(async()=>{
      const stats={version:143,loaded:false,requested:0,patched:0,gpsActive:0,scorecardOnly:0,skipped:0,unavailable:0,rejectedDraft:0,errors:[],loadedAt:null};
      try{
        let sourceCourses=[];
        for(let attempt=0;attempt<=retries;attempt++){
          if(Array.isArray(courses)&&courses.length){sourceCourses=courses.slice();break;}
          if(attempt<retries)await new Promise(resolve=>setTimeout(resolve,180));
        }
        if(!sourceCourses.length)throw new Error('ATG course list is not ready.');

        const eligibleTargets=sourceCourses.filter(c=>!isExcludedCourse(c));
        stats.requested=eligibleTargets.length;
        stats.skipped=sourceCourses.length-eligibleTargets.length;
        const results=await mapInBatches(eligibleTargets,6,fetchPayload);

        for(const result of results){
          const course=result.course;
          if(result.error){
            stats.unavailable++;
            stats.errors.push({course:course?.name||'',message:String(result.error?.message||result.error)});
            continue;
          }
          if(!result.data){stats.unavailable++;continue;}
          const status=String(result.data.mapping_status||'');
          if(!READABLE_STATUSES.has(status)){
            if(status==='gps_draft')stats.rejectedDraft++;
            continue;
          }
          const idx=courses.findIndex(c=>c.id===course.id||normalize(c.name)===normalize(course.name));
          const outcome=patchCourseAtIndex(idx,result.data);
          if(outcome.patched){
            stats.patched++;
            if(outcome.gps)stats.gpsActive++;
            else stats.scorecardOnly++;
          }
        }

        try{localStorage.atgCourses=JSON.stringify(courses)}catch{}
        stats.loaded=true;
        stats.loadedAt=new Date().toISOString();
        window.ATG_SHARED_LIBRARY=stats;
        window.ATG_SHARED_LIBRARY_PILOT=stats;
        if(rerender&&typeof render==='function')render();
        return true;
      }catch(error){
        stats.loaded=false;
        stats.errors.push({course:'',message:String(error?.message||error)});
        stats.loadedAt=new Date().toISOString();
        window.ATG_SHARED_LIBRARY=stats;
        window.ATG_SHARED_LIBRARY_PILOT=stats;
        console.warn('Shared Golf Course Library unavailable; ATG is retaining its existing course data.',error);
        return false;
      }finally{
        sharedLoadBusy=false;
      }
    })();
    return sharedLoadPromise;
  }

  window.loadSharedCourseLibrary=loadSharedCourseLibrary;
  window.loadSharedSierraPilot=loadSharedCourseLibrary;

  /* Every ATG course reload refreshes eligible shared-library records once afterward. */
  if(typeof loadCourses==='function'){
    const priorLoadCourses143=loadCourses;
    loadCourses=async function(){
      await priorLoadCourses143();
      await loadSharedCourseLibrary({rerender:false,retries:0});
    };
  }

  /* Cover initializeCloud()/loadCourses work that may already be in flight. */
  setTimeout(()=>loadSharedCourseLibrary({rerender:true}),0);
})();
