/* ParFolio v287 — one catalog and one GPS hydration contract for every region. */
(function(){
  const VERSION=287,PAGE_SIZE=500,hydrated=new Set(),pending=new Map();let catalogLoading=null;
  const norm=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const validPoint=value=>value&&Number.isFinite(Number(value.lat))&&Number.isFinite(Number(value.lng))&&Math.abs(Number(value.lat))<=90&&Math.abs(Number(value.lng))<=180&&!(Number(value.lat)===0&&Number(value.lng)===0);
  const point=value=>validPoint(value)?{lat:Number(value.lat),lng:Number(value.lng)}:null;
  const radians=value=>Number(value)*Math.PI/180;
  function yardsBetween(a,b){const lat1=radians(a.lat),lat2=radians(b.lat),dLat=lat2-lat1,dLng=radians(b.lng)-radians(a.lng),h=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;return 6371008.8*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h))*1.0936133}
  const GPS_STATUSES=new Set(['gps_ready','gps_review','verified_gps','published']);
  function claimsGps(course){return GPS_STATUSES.has(String(course?.parfolioMappingClass||course?.sharedMappingStatus||'').toLowerCase())}
  function validate(course,greens=course?.greens,declared=course?.holes){
    const holes=Number(declared),rows=Array.isArray(greens)?greens:[];
    if(![9,18].includes(holes)||rows.length!==holes)return{ok:false,reason:`expected 9 or 18 holes; received ${rows.length} of ${holes||0}`};
    const numbers=[];
    for(let index=0;index<rows.length;index++){
      const hole=rows[index],tee=point(hole?.tee||hole?.tees?.black),center=point(hole?.center),number=Number(hole?._hole??hole?.hole??index+1);
      if(!tee||!center)return{ok:false,reason:`hole ${index+1} is missing a valid tee or green center`};
      const yards=yardsBetween(tee,center);if(yards<20||yards>1000)return{ok:false,reason:`hole ${index+1} has an implausible tee-to-green distance`};numbers.push(number);
    }
    if(new Set(numbers).size!==holes||numbers.some((number,index)=>number!==index+1))return{ok:false,reason:'hole numbers must be unique and sequential'};
    return{ok:true,holes};
  }
  function normalizeGreens(rows){return rows.slice().sort((a,b)=>Number(a?.hole)-Number(b?.hole)).map((hole,index)=>{const tee=point(hole?.tee);return{tee,tees:{black:tee},aim1:point(hole?.aim1),aim2:point(hole?.aim2),front:point(hole?.front),center:point(hole?.center),back:point(hole?.back),route:hole?.route||null,_review:'parfolio-universal-gps-validated',_source:hole?.source||'parfolio_course_payload',_hole:Number(hole?.hole)||index+1}})}
  function persist(){try{localStorage.parfolioCourses=JSON.stringify(courses)}catch{}}
  function applyPayload(course,payload){
    const holes=Number(payload?.holes)||Number(course?.holes)||0,greens=normalizeGreens(Array.isArray(payload?.greens)?payload.greens:[]),result=validate(course,greens,holes);
    if(!result.ok)throw new Error(result.reason);
    Object.assign(course,{holes,greens,catalogOnly:false,parfolioMappedHoleCount:holes,parfolioPreferCatalogGeometry:false,parfolioPreservedVerifiedGeometry:true,parfolioGeometryVersion:VERSION,parfolioGeometrySource:'parfolio_course_payload',parfolioGeometryHydratedAt:new Date().toISOString()});
    const pars=payload.greens.map(hole=>Number(hole?.par));if(pars.length===holes&&pars.every(par=>Number.isFinite(par)&&par>=2&&par<=7))course.pars=pars;persist();return true;
  }
  async function ensureReady(course){
    if(!claimsGps(course))return true;
    const catalogId=String(course?.parfolioCatalogId||''),local=validate(course);
    if(!catalogId){if(!local.ok)throw new Error(`GPS Ready geometry failed validation: ${local.reason}`);course.parfolioGeometryVersion=VERSION;course.parfolioGeometrySource=course.parfolioGeometrySource||'approved_shared_course_library';return true}
    if(hydrated.has(catalogId)&&local.ok&&Number(course.parfolioGeometryVersion)===VERSION)return true;
    if(pending.has(catalogId))return pending.get(catalogId);
    const request=(async()=>{try{
      let response;
      try{response=await db.rpc('parfolio_course_payload',{p_course_id:catalogId})}
      catch(networkError){response={error:networkError}}
      if(response.error){
        const offline=validate(course);
        if(Number(course.parfolioGeometryVersion)===VERSION&&offline.ok){hydrated.add(catalogId);return true}
        throw response.error;
      }
      const data=response.data;
      if(!data||String(data.mapping_class||'')!=='gps_ready')throw new Error('the authoritative catalog no longer marks this course GPS Ready');
      if(String(data.catalog_id||'')!==catalogId)throw new Error('the authoritative catalog payload belongs to a different course');
      applyPayload(course,data);hydrated.add(catalogId);return true;
    }finally{pending.delete(catalogId)}})();
    pending.set(catalogId,request);return request;
  }
  function findCourse(row){
    let found=(courses||[]).find(course=>String(course?.parfolioCatalogId||'')===String(row.catalog_id||''));if(found)return found;
    found=(courses||[]).find(course=>row.source_id&&String(course?.openGolfApiId||'')===String(row.source_id)&&norm(course?.state)===norm(row.state_code)&&String(course?.country_code||'US').toUpperCase()===String(row.country_code||'US').toUpperCase());if(found)return found;
    const name=norm(row.name),city=norm(row.city),region=norm(row.state_code);return(courses||[]).find(course=>norm(course?.name)===name&&(!city||norm(course?.city)===city)&&(!region||norm(course?.state)===region));
  }
  function mergeRow(row){
    let course=findCourse(row);const mapping=String(row.mapping_class||'location_pending'),holes=Number(row.holes)||18;
    if(!course){course={id:`parfolio-catalog-${row.catalog_id}`,name:row.name||'Golf Course',city:row.city||'',state:row.state_code||'',postal_code:row.postal_code||'',country_code:row.country_code||'US',country:String(row.country_code||'US').toUpperCase()==='US'?'United States':row.country_code||'',address:row.address||'',holes,pars:[],greens:[],course_type:row.course_type||'Golf Course'};courses.push(course)}
    Object.assign(course,{parfolioCatalogId:row.catalog_id,parfolioMappingClass:mapping,parfolioMappedHoleCount:Number(row.mapped_holes)||0,catalogApproved:mapping!=='quarantined',catalogOnly:mapping!=='gps_ready',sourceLicense:row.source_license||course.sourceLicense||'',sourceAttribution:row.source_attribution||course.sourceAttribution||'',osmCourseUri:row.osm_course_uri||course.osmCourseUri||null});
    if(validPoint({lat:row.lat,lng:row.lng}))course.catalog_point={lat:Number(row.lat),lng:Number(row.lng)};return course;
  }
  async function loadCatalog(){
    if(catalogLoading)return catalogLoading;
    catalogLoading=(async()=>{const stats={version:VERSION,loaded:false,rows:0,gpsReady:0,error:null,loadedAt:null};try{
      const rows=[];for(let offset=0;;offset+=PAGE_SIZE){const{data,error}=await db.rpc('parfolio_course_catalog_page',{p_state_code:null,p_offset:offset,p_limit:PAGE_SIZE});if(error)throw error;const page=Array.isArray(data)?data:[];rows.push(...page);if(page.length<PAGE_SIZE)break;if(offset>10000)throw new Error('Universal course catalog pagination exceeded safety limit')}
      for(const row of rows){mergeRow(row);if(row.mapping_class==='gps_ready')stats.gpsReady++}courses.sort((a,b)=>String(a?.name||'').localeCompare(String(b?.name||'')));stats.rows=rows.length;stats.loaded=true;stats.loadedAt=new Date().toISOString();if(typeof render==='function')render();window.normalizeParFolioGpsIndicators?.(document);
    }catch(error){stats.error=String(error?.message||error);stats.loadedAt=new Date().toISOString();console.warn('Universal course catalog load failed',error)}window.PARFOLIO_UNIVERSAL_GPS=stats;return stats.loaded})();return catalogLoading;
  }
  window.parfolioCourseClaimsGpsReady=claimsGps;window.parfolioValidateCourseGeometry=validate;window.ensureParFolioGpsCourseReady=ensureReady;window.loadParFolioUniversalCatalog=loadCatalog;window.PARFOLIO_GPS_GEOMETRY_VERSION=VERSION;setTimeout(loadCatalog,0);
})();
