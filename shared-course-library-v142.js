/* Version 142: read-through pilot from the shared Golf Course Library.
   Sierra Lakes is loaded from the neutral shared Supabase library while ATG keeps
   its existing local course ID as a compatibility/fallback identity. */
(function(){
  const SHARED_LIBRARY_URL='https://qziemwgcjkohjchxdvnv.supabase.co';
  const SHARED_LIBRARY_PUBLISHABLE_KEY='sb_publishable_vod_BeAVzOLwjbCwLLeUBw_i8Bfv5wh';
  const SIERRA_LEGACY_ID='0a4f8d85-153e-421e-8b4a-1dedee34e724';
  const SIERRA_NORMALIZED='sierra lakes golf club';
  let sharedLibraryClient=null,sharedLoadBusy=false;

  function client(){
    if(!sharedLibraryClient)sharedLibraryClient=supabase.createClient(SHARED_LIBRARY_URL,SHARED_LIBRARY_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
    return sharedLibraryClient;
  }
  function normalize(value=''){return String(value).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}
  function validPoint(p){return p&&Number.isFinite(Number(p.lat))&&Number.isFinite(Number(p.lng))}
  function cleanGreen(g={}){
    const tees={};
    for(const color of ['black','blue','white','red'])if(validPoint(g.tees?.[color]))tees[color]={lat:Number(g.tees[color].lat),lng:Number(g.tees[color].lng)};
    const black=tees.black||validPoint(g.tee)&&{lat:Number(g.tee.lat),lng:Number(g.tee.lng)}||null;
    return {
      tee:black,
      tees,
      aim1:validPoint(g.aim1)?{lat:Number(g.aim1.lat),lng:Number(g.aim1.lng)}:null,
      aim2:validPoint(g.aim2)?{lat:Number(g.aim2.lat),lng:Number(g.aim2.lng)}:null,
      front:validPoint(g.front)?{lat:Number(g.front.lat),lng:Number(g.front.lng)}:null,
      center:validPoint(g.center)?{lat:Number(g.center.lat),lng:Number(g.center.lng)}:null,
      back:validPoint(g.back)?{lat:Number(g.back.lat),lng:Number(g.back.lng)}:null,
      _review:g._review||'shared-library-gps-review',
      _sharedLibrary:true
    };
  }
  function patchSierra(payload){
    if(!payload||!Array.isArray(payload.greens)||payload.greens.length!==18)return false;
    const sharedGreens=payload.greens.map(cleanGreen);
    if(sharedGreens.some(g=>!g.tee||!g.center))return false;
    const pars=(payload.pars||[]).map(Number);
    const idx=courses.findIndex(c=>c.id===SIERRA_LEGACY_ID||normalize(c.name)===SIERRA_NORMALIZED);
    if(idx<0)return false;
    const prior=courses[idx];
    courses[idx]={
      ...prior,
      name:payload.name||prior.name,
      holes:Number(payload.holes)||prior.holes||18,
      pars:pars.length===18?pars:prior.pars,
      greens:sharedGreens,
      city:payload.city||prior.city||'Fontana',
      state:payload.state_code||payload.state||prior.state||'CA',
      address:payload.address||prior.address,
      postal_code:payload.postal_code||prior.postal_code,
      sharedCourseId:payload.shared_course_id,
      sharedLibrarySource:payload.source,
      sharedMappingStatus:payload.mapping_status,
      sharedLibraryLoadedAt:new Date().toISOString()
    };
    try{localStorage.atgCourses=JSON.stringify(courses)}catch{}
    try{
      const listed=LISTED_COURSE_CATALOG.find(c=>normalize(c.name)===SIERRA_NORMALIZED);
      if(listed){listed.sharedCourseId=payload.shared_course_id;listed.sharedMappingStatus=payload.mapping_status;listed.greens=sharedGreens;listed.pars=pars.length===18?pars:listed.pars;}
    }catch{}
    window.ATG_SHARED_LIBRARY_PILOT={course:'Sierra Lakes Golf Club',sharedCourseId:payload.shared_course_id,status:payload.mapping_status,holes:sharedGreens.length,loaded:true};
    return true;
  }
  async function loadSharedSierraPilot({rerender=true,retries=6}={}){
    if(sharedLoadBusy)return false;sharedLoadBusy=true;
    try{
      const {data,error}=await client().rpc('shared_course_payload',{p_normalized_name:SIERRA_NORMALIZED});
      if(error)throw error;
      for(let attempt=0;attempt<=retries;attempt++){
        if(patchSierra(data)){
          if(rerender&&typeof render==='function')render();
          return true;
        }
        if(attempt<retries)await new Promise(resolve=>setTimeout(resolve,180));
      }
      console.warn('Shared library Sierra pilot loaded, but the ATG course list was not ready to patch.');
      return false;
    }catch(error){
      console.warn('Shared Golf Course Library unavailable; ATG is retaining its existing Sierra Lakes data.',error);
      window.ATG_SHARED_LIBRARY_PILOT={course:'Sierra Lakes Golf Club',loaded:false,error:String(error?.message||error)};
      return false;
    }finally{sharedLoadBusy=false;}
  }
  window.loadSharedSierraPilot=loadSharedSierraPilot;

  /* Future course reloads also refresh the shared pilot. */
  if(typeof loadCourses==='function'){
    const priorLoadCourses142=loadCourses;
    loadCourses=async function(){
      await priorLoadCourses142();
      await loadSharedSierraPilot({rerender:false,retries:0});
    };
  }

  /* Also cover an initializeCloud() call that began before this enhancement loaded. */
  setTimeout(()=>loadSharedSierraPilot({rerender:true}),0);
})();
