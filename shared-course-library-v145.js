/* Version 145: populate ATG search from the shared Golf Course Library.
   The shared catalog is merged into ATG's in-memory course list. Existing ATG course IDs
   are preserved. Catalog-only and GPS-draft rows are searchable but do not activate GPS. */
(function(){
  const SHARED_LIBRARY_URL='https://qziemwgcjkohjchxdvnv.supabase.co';
  const SHARED_LIBRARY_PUBLISHABLE_KEY='sb_publishable_vod_BeAVzOLwjbCwLLeUBw_i8Bfv5wh';
  const GPS_STATUSES=new Set(['gps_review','verified_gps','published']);
  const PAYLOAD_STATUSES=new Set(['scorecard_ready','gps_review','verified_gps','published']);
  const NEVER_SHARED_GPS_NAMES=new Set(['jurupa hills country club']);
  let sharedLibraryClient=null,sharedLoadBusy=false,sharedLoadPromise=null;

  function client(){
    if(!sharedLibraryClient)sharedLibraryClient=supabase.createClient(SHARED_LIBRARY_URL,SHARED_LIBRARY_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
    return sharedLibraryClient;
  }
  function normalize(value=''){return String(value).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}
  function validPoint(p){return p&&Number.isFinite(Number(p.lat))&&Number.isFinite(Number(p.lng))}
  function point(p){return validPoint(p)?{lat:Number(p.lat),lng:Number(p.lng)}:null}
  function cleanGreen(g={}){
    const tees={};
    for(const color of ['black','blue','white','red']){const p=point(g.tees?.[color]);if(p)tees[color]=p;}
    const black=tees.black||point(g.tee);if(black&&!tees.black)tees.black=black;
    return{tee:black||null,tees,aim1:point(g.aim1),aim2:point(g.aim2),front:point(g.front),center:point(g.center),back:point(g.back),_review:g._review||'shared-library',_sharedLibrary:true};
  }
  function safeGps(payload,course){
    if(!GPS_STATUSES.has(String(payload?.mapping_status||'')))return null;
    if(NEVER_SHARED_GPS_NAMES.has(normalize(course?.name)))return null;
    const holes=Number(payload?.holes)||Number(course?.holes)||18;
    if(!Array.isArray(payload?.greens)||payload.greens.length!==holes)return null;
    const greens=payload.greens.map(cleanGreen);
    return greens.every(g=>g.tee&&g.center)?greens:null;
  }
  async function fetchCatalog(){
    const all=[];
    for(let offset=0;;offset+=500){
      const {data,error}=await client().rpc('shared_course_catalog_page',{p_offset:offset,p_limit:500});
      if(error)throw error;
      const page=Array.isArray(data)?data:[];all.push(...page);
      if(page.length<500)break;
      if(offset>10000)throw new Error('Shared course catalog pagination exceeded safety limit.');
    }
    return all;
  }
  function mergeCatalog(rows){
    const byName=new Map();
    const byShared=new Map();
    for(let i=0;i<courses.length;i++){
      const c=courses[i];byName.set(normalize(c.name),i);if(c.sharedCourseId)byShared.set(String(c.sharedCourseId),i);
    }
    let added=0,matched=0;
    for(const row of rows){
      if(!row?.shared_course_id||!row?.name)continue;
      let idx=byShared.get(String(row.shared_course_id));
      if(idx===undefined)idx=byName.get(normalize(row.name));
      const catalogPoint=Number.isFinite(Number(row.lat))&&Number.isFinite(Number(row.lng))?{lat:Number(row.lat),lng:Number(row.lng)}:null;
      if(idx!==undefined){
        const prior=courses[idx];
        courses[idx]={...prior,
          city:row.city||prior.city,
          state:row.state_code||row.state||prior.state,
          country:row.country||prior.country,
          country_code:row.country_code||prior.country_code,
          par_total:Number(row.par)||prior.par_total,
          catalog_point:catalogPoint||prior.catalog_point,
          sharedCourseId:row.shared_course_id,
          sharedMappingStatus:row.mapping_status||prior.sharedMappingStatus,
          openGolfApiId:row.open_golf_api_id||prior.openGolfApiId,
          osmId:row.osm_id||prior.osmId,
          sharedLibrarySource:'shared_golf_course_library'
        };
        matched++;continue;
      }
      const holes=Number(row.holes)||18;
      const item={
        id:`shared-${row.shared_course_id}`,
        sharedCourseId:row.shared_course_id,
        name:row.name,
        city:row.city||'',state:row.state_code||row.state||'',country:row.country||'',country_code:row.country_code||'',
        holes,pars:[],greens:[],par_total:Number(row.par)||null,
        catalog_point:catalogPoint,
        catalogOnly:true,catalogApproved:true,
        catalogHoleCountKnown:Boolean(Number(row.holes)),
        sharedMappingStatus:row.mapping_status||'catalog_only',
        sharedLibrarySource:'shared_golf_course_library',
        openGolfApiId:row.open_golf_api_id||null,osmId:row.osm_id||null,
        course_type:'Shared Course Library'
      };
      courses.push(item);byName.set(normalize(item.name),courses.length-1);byShared.set(String(row.shared_course_id),courses.length-1);added++;
    }
    courses.sort((a,b)=>String(a.name||'').localeCompare(String(b.name||'')));
    return{added,matched};
  }
  async function hydrateSafeSharedCourses(rows){
    const wanted=rows.filter(r=>PAYLOAD_STATUSES.has(String(r.mapping_status||'')));
    let hydrated=0,gpsActive=0;
    for(let i=0;i<wanted.length;i+=6){
      const batch=wanted.slice(i,i+6);
      const results=await Promise.all(batch.map(async row=>{
        try{const{data,error}=await client().rpc('shared_course_payload_by_id',{p_course_id:row.shared_course_id});if(error)throw error;return{row,data}}catch(error){return{row,error}};
      }));
      for(const result of results){
        if(!result.data)continue;
        const idx=courses.findIndex(c=>String(c.sharedCourseId||'')===String(result.row.shared_course_id)||normalize(c.name)===normalize(result.row.name));
        if(idx<0)continue;
        const prior=courses[idx],payload=result.data,holeCount=Number(payload.holes)||Number(prior.holes)||18;
        const incomingPars=Array.isArray(payload.pars)?payload.pars.map(Number):[];
        const pars=incomingPars.length===holeCount&&incomingPars.every(Number.isFinite)?incomingPars:null;
        const greens=safeGps(payload,prior);
        courses[idx]={...prior,holes:holeCount,pars:pars||prior.pars,greens:greens||prior.greens,
          city:payload.city||prior.city,state:payload.state_code||payload.state||prior.state,country:payload.country||prior.country,
          address:payload.address||prior.address,postal_code:payload.postal_code||prior.postal_code,
          sharedMappingStatus:payload.mapping_status,sharedLibraryGpsActive:Boolean(greens)};
        if(greens){courses[idx].catalogOnly=false;gpsActive++;}
        hydrated++;
      }
    }
    return{hydrated,gpsActive};
  }
  async function loadSharedCourseLibrary({rerender=true,retries=6}={}){
    if(sharedLoadBusy)return sharedLoadPromise||false;
    sharedLoadBusy=true;
    sharedLoadPromise=(async()=>{
      const stats={version:145,loaded:false,catalogRows:0,added:0,matched:0,hydrated:0,gpsActive:0,error:null,loadedAt:null};
      try{
        for(let attempt=0;attempt<=retries;attempt++){
          if(Array.isArray(courses)&&courses.length)break;
          if(attempt<retries)await new Promise(r=>setTimeout(r,180));
        }
        if(!Array.isArray(courses))throw new Error('ATG course list is not ready.');
        const rows=await fetchCatalog();stats.catalogRows=rows.length;
        const merged=mergeCatalog(rows);stats.added=merged.added;stats.matched=merged.matched;
        const hydrated=await hydrateSafeSharedCourses(rows);stats.hydrated=hydrated.hydrated;stats.gpsActive=hydrated.gpsActive;
        try{localStorage.atgCourses=JSON.stringify(courses)}catch{}
        stats.loaded=true;stats.loadedAt=new Date().toISOString();window.ATG_SHARED_LIBRARY=stats;window.ATG_SHARED_LIBRARY_PILOT=stats;
        if(rerender&&typeof render==='function')render();return true;
      }catch(error){
        stats.error=String(error?.message||error);stats.loadedAt=new Date().toISOString();window.ATG_SHARED_LIBRARY=stats;window.ATG_SHARED_LIBRARY_PILOT=stats;
        console.warn('Shared Golf Course Library catalog unavailable; ATG is retaining its existing course data.',error);return false;
      }finally{sharedLoadBusy=false;}
    })();
    return sharedLoadPromise;
  }
  window.loadSharedCourseLibrary=loadSharedCourseLibrary;window.loadSharedSierraPilot=loadSharedCourseLibrary;
  if(typeof loadCourses==='function'){
    const priorLoadCourses145=loadCourses;
    loadCourses=async function(){await priorLoadCourses145();await loadSharedCourseLibrary({rerender:false,retries:0});};
  }
  setTimeout(()=>loadSharedCourseLibrary({rerender:true}),0);
})();
