/* Version 146: expose shared OSM draft status in Courses and preload public OSM draft geometry into the admin editor. */
(function(){
  const URL='https://qziemwgcjkohjchxdvnv.supabase.co';
  const KEY='sb_publishable_vod_BeAVzOLwjbCwLLeUBw_i8Bfv5wh';
  let client=null;
  function db(){return client||(client=supabase.createClient(URL,KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}));}
  function p(v){return v&&Number.isFinite(Number(v.lat))&&Number.isFinite(Number(v.lng))?{lat:Number(v.lat),lng:Number(v.lng)}:null;}
  function clean(g={}){const black=p(g.tees?.black)||p(g.tee);return{tee:black,tees:{black},aim1:p(g.aim1),aim2:p(g.aim2),front:p(g.front),center:p(g.center),back:p(g.back),_review:'osm-draft-review',_sharedOsmDraft:true};}

  if(typeof courseLibraryCard==='function'){
    const priorCard146=courseLibraryCard;
    courseLibraryCard=function(course,index,distance=null){
      let html=priorCard146(course,index,distance);
      if(String(course?.sharedMappingStatus||'')==='gps_draft')html=html.replace('APPROVED · GPS MAPPING PENDING','GPS DRAFT · REVIEW NEEDED');
      return html;
    };
  }

  if(typeof mapCatalogCourse==='function'){
    const priorMapCatalog146=mapCatalogCourse;
    mapCatalogCourse=async function(i){
      const source=courses?.[i];
      priorMapCatalog146(i);
      if(!source?.sharedCourseId||String(source.sharedMappingStatus||'')!=='gps_draft'||!draft)return;
      const expectedDraft=draft;
      try{
        const {data,error}=await db().rpc('shared_osm_draft_payload',{p_course_id:source.sharedCourseId});
        if(error)throw error;
        if(!data||draft!==expectedDraft||!Array.isArray(data.greens)||!data.greens.length)return;
        const greens=Array.from({length:draft.holes},(_,idx)=>clean(data.greens[idx]||{}));
        const pars=Array.isArray(data.pars)?data.pars.map(Number):[];
        draft.greens=greens;
        if(pars.length===draft.holes)draft.pars=pars.map((v,idx)=>Number.isFinite(v)&&v>=3&&v<=6?v:(draft.pars[idx]||4));
        draft._sharedOsmDraft={holes:Number(data.draft_holes)||greens.filter(g=>g.tee&&g.center).length,loadedAt:new Date().toISOString()};
        draft.mapStyle='satellite';
        const first=greens.find(g=>g.tee||g.center);if(first){const c=first.center||first.tee;draft.mapView={lat:c.lat,lng:c.lng,zoom:17};}
        render();
        setTimeout(()=>{const msg=document.getElementById('mapMessage');if(msg)msg.textContent=`OSM GPS Draft loaded for ${draft._sharedOsmDraft.holes} hole${draft._sharedOsmDraft.holes===1?'':'s'}. Verify tee, green edges and route on satellite before approval.`;},0);
      }catch(error){console.warn('Shared OSM draft could not be preloaded.',error);}
    };
  }
})();
