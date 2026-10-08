/* Single-course diagnostic only. No persistence or promotion imports. */
const {select}=require('./read-only-supabase');
const {createUsgsImageryProvider}=require('./usgs-imagery-provider');
const {createMapTilerImageryProvider}=require('./maptiler-imagery-provider');
const {createSatelliteAnalyzer}=require('./satellite-vision-analyzer');
const {createGatewayAnalyzeImage}=require('./vercel-ai-gateway-analyzer');

function failure(code){const err=new Error(code);err.code=code;throw err;}
function coordinate(value,max){return value!==null&&value!==''&&value!==undefined&&Number.isFinite(Number(value))&&Math.abs(Number(value))<=max;}
function pair(row){return coordinate(row.tee_lat,90)&&coordinate(row.tee_lng,180)&&coordinate(row.green_center_lat,90)&&coordinate(row.green_center_lng,180);}
const TEST_COURSES={
  eastpointe_east:{name:'ilike.*Eastpointe*',matches:c=>/eastpointe/i.test(c.name)&&/\beast\b/i.test(c.name)},
  tpc_treviso_bay:{id:'4d58741c-12f9-4e3d-8947-cf4d7f2c4190',name:'ilike.Tpc Treviso Bay',matches:c=>c.id==='4d58741c-12f9-4e3d-8947-cf4d7f2c4190'&&/^tpc treviso bay$/i.test(c.name)&&c.city==='Naples'&&Number(c.holes)===18}
};
function createEastpointeReport({read=select,fetchImpl=globalThis.fetch,settings=process.env,testCourse='eastpointe_east'}={}){
  return async function report(){
    const target=TEST_COURSES[testCourse];
    if(!target)failure('test_course_not_allowed');
    if(['AI_GATEWAY_API_KEY','PARFOLIO_VISION_MODEL'].some(k=>!String(settings[k]||'').trim()))failure('vision_configuration_missing');
    let matches; try{ matches=await read('course_catalog',{
      select:'id,name,city,state_code,country_code,latitude,longitude,holes,mapping_class',
      country_code:'eq.US',state_code:'eq.FL',is_active:'eq.true',name:target.name,...(target.id?{id:'eq.'+target.id}:{}),limit:'10'
    }); }catch(err){
      if(err?.code==='SUPABASE_CONFIG_MISSING')failure('supabase_configuration_missing');
      if(err?.code==='SUPABASE_HTTP_ERROR'&&Number.isInteger(err.status))failure('supabase_course_read_http_'+err.status);
      failure('supabase_course_read_failed');
    }
    if(!Array.isArray(matches))failure('invalid_course_response');
    const candidates=matches.filter(target.matches);
    if(candidates.length!==1)failure('eastpointe_east_identity_requires_review');
    const course=candidates[0];
    if(course.country_code!=='US'||course.state_code!=='FL')failure('course_outside_test_region');
    if(['gps_ready','verified_gps','published'].includes(course.mapping_class))failure('course_already_protected');
    if(![9,18].includes(Number(course.holes))||!coordinate(course.latitude,90)||!coordinate(course.longitude,180))failure('invalid_course_geometry_context');
    let rows; try{ rows=await read('course_hole_geometry',{
      select:'hole_number,tee_lat,tee_lng,green_center_lat,green_center_lng',course_id:'eq.'+course.id,order:'hole_number',limit:'100'
    }); }catch(err){
      if(err?.code==='SUPABASE_CONFIG_MISSING')failure('supabase_configuration_missing');
      if(err?.code==='SUPABASE_HTTP_ERROR'&&Number.isInteger(err.status))failure('supabase_geometry_read_http_'+err.status);
      failure('supabase_geometry_read_failed');
    }
    if(!Array.isArray(rows)||rows.length>Number(course.holes))failure('geometry_rows_require_review');
    const seen=new Set();
    for(const row of rows){
      const n=Number(row.hole_number);
      if(!Number.isInteger(n)||n<1||n>Number(course.holes)||seen.has(n))failure('geometry_rows_require_review');
      seen.add(n);
    }
    const complete=new Set(rows.filter(pair).map(r=>Number(r.hole_number)));
    const missing=Array.from({length:Number(course.holes)},(_,i)=>i+1).filter(n=>!complete.has(n));
    const base={ok:true,armed:false,read_only:true,report_only:true,promotable:false,course,missing_holes:missing};
    if(!missing.length)return {...base,status:'no_missing_tee_center_pairs',holes:[]};
    // Bound each external request and prevent credential-bearing redirects.
    const boundedFetch=(url,options={})=>fetchImpl(url,{...options,redirect:'error',signal:AbortSignal.timeout(url.startsWith('https://ai-gateway.vercel.sh/')?45000:20000)});
    const analyze=createSatelliteAnalyzer({analyzeImage:createGatewayAnalyzeImage({fetchImpl:boundedFetch,settings})});
    const observer={observe:args=>analyze({...args,report_only:true})};
    const usgs=createUsgsImageryProvider({fetchImpl:boundedFetch,observer});
    let raw;
    try{
      raw=await usgs.observeMissingHoles({course,missing_holes:missing,authoritative_rows:rows});
    }catch(usgsErr){
      if(usgsErr?.code==='AI_GATEWAY_HTTP_ERROR'&&Number.isInteger(usgsErr.status))failure('ai_gateway_http_'+usgsErr.status);
      // An AI failure is not an imagery failure: do not pay for a second
      // analysis or silently switch source after the image was fetched.
      if(!['USGS_IMAGERY_HTTP_ERROR','USGS_IMAGERY_INVALID_RESPONSE','USGS_IMAGERY_FETCH_ERROR'].includes(usgsErr?.code))failure('ai_gateway_analysis_failed');
      // Optional MapTiler fallback only when configured; US rollout no longer depends on it.
      if(String(settings.MAPTILER_API_KEY||'').trim()){
        try{
          const maptiler=createMapTilerImageryProvider({fetchImpl:boundedFetch,observer});
          raw=await maptiler.observeMissingHoles({course,missing_holes:missing,authoritative_rows:rows});
        }catch(err){
          if(err?.code==='AI_GATEWAY_HTTP_ERROR'&&Number.isInteger(err.status))failure('ai_gateway_http_'+err.status);
          if(err?.code==='MAPTILER_HTTP_ERROR'&&Number.isInteger(err.status))failure('maptiler_http_'+err.status);
          if(/gateway|model|completion|anthropic|openai|vision|json/i.test(String(err?.message||err||'')))failure('ai_gateway_analysis_failed');
          failure('imagery_provider_failed');
        }
      }else{
        if(usgsErr?.code==='USGS_IMAGERY_HTTP_ERROR'&&Number.isInteger(usgsErr.status))failure('usgs_imagery_http_'+usgsErr.status);
        if(usgsErr?.code==='USGS_IMAGERY_INVALID_RESPONSE')failure('usgs_imagery_invalid_response');
        if(/gateway|model|completion|anthropic|openai|vision|json/i.test(String(usgsErr?.message||usgsErr||'')))failure('ai_gateway_analysis_failed');
        failure('usgs_imagery_failed');
      }
    }
    const allowed=new Set(['tee','aim1','aim2','green_front','green_center','green_back']);
    const reported=new Set();
    const holes=[];
    for(const h of raw.holes||[]){
      const n=Number(h.hole_number);
      if(!missing.includes(n)||reported.has(n))failure('vision_returned_unrequested_or_duplicate_hole');
      reported.add(n);
      const types=new Set();
      const points=[];
      for(const p of h.points||[]){
        if(!allowed.has(p.type)||types.has(p.type)||!coordinate(p.lat,90)||!coordinate(p.lng,180)||!Number.isFinite(p.confidence)||p.confidence<0||p.confidence>1)failure('invalid_vision_point');
        types.add(p.type);
        points.push({...p,evidence:String(p.evidence||'').slice(0,2000),accepted:false,confidence_threshold_met:p.confidence>=0.85});
      }
      holes.push({hole_number:n,points});
    }
    return {...base,status:'requires_manual_review',holes,warnings:[
      'Single course-center image may not cover every missing hole.',
      'Model coordinates are unverified; confidence is not positional accuracy.',
      'Source reuse permissions and independent hole identification remain unverified.'
    ]};
  };
}
module.exports={createEastpointeReport};
