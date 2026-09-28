/*
 * Report-only validator for the first zero-cost authoritative recovery candidate.
 * No persistence or promotion imports.
 */
const {select}=require('./read-only-supabase');
const {validateTeeCenterCourse}=require('./gps-rollout-engine');

function parseLine(wkt){
  const m=String(wkt||'').match(/^LINESTRING\((.+)\)$/i);
  if(!m)return [];
  return m[1].split(',').map(s=>s.trim().split(/\s+/).map(Number)).filter(a=>a.length>=2&&a.every(Number.isFinite)).map(([lng,lat])=>({lat,lng}));
}
function parsePoly(wkt){
  const m=String(wkt||'').match(/^POLYGON\(\((.+)\)\)$/i);
  if(!m)return [];
  return m[1].split(',').map(s=>s.trim().split(/\s+/).map(Number)).filter(a=>a.length>=2&&a.every(Number.isFinite)).map(([lng,lat])=>({lat,lng}));
}
function inside(p,poly){
  if(!p||poly.length<3)return false;
  let hit=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const a=poly[i],b=poly[j];
    const cross=((a.lat>p.lat)!==(b.lat>p.lat))&&(p.lng<(b.lng-a.lng)*(p.lat-a.lat)/((b.lat-a.lat)||1e-15)+a.lng);
    if(cross)hit=!hit;
  }
  return hit;
}
function lineTouchesPoly(line,poly){return line.some(p=>inside(p,poly));}
function newest(a,b){
  const ta=Date.parse(a?.osm_timestamp||0)||0,tb=Date.parse(b?.osm_timestamp||0)||0;
  if(ta!==tb)return ta>tb?a:b;
  return Number(a?.osm_version||0)>=Number(b?.osm_version||0)?a:b;
}
async function createAmeliaAuthoritativeReport(){
  const id='0122f028-908a-4667-a72c-445fe5981e74';
  const [courses,polys,holes]=await Promise.all([
    select('course_catalog',{select:'id,name,city,state_code,country_code,latitude,longitude,holes,mapping_class',id:'eq.'+id,limit:'1'}),
    select('fl_osm_course_stage',{select:'osm_course_uri,name,geometry_wkt,latitude,longitude,osm_version,osm_timestamp',geometry_wkt:'not.is.null',limit:'100'}),
    select('fl_osm_hole_stage',{select:'osm_hole_uri,hole_number,geometry_wkt,osm_version,osm_timestamp',osm_course_uri:'eq.candidate:'+id,valid_number:'eq.true',geometry_wkt:'not.is.null',limit:'100'})
  ]);
  const course=courses?.[0];
  if(!course)return{ok:false,report_only:true,promotable:false,error:'amelia_course_missing'};
  if(String(course.mapping_class).toLowerCase()==='gps_ready')return{ok:false,report_only:true,promotable:false,error:'amelia_already_gps_ready'};
  const parsedPolys=(polys||[]).map(p=>({...p,poly:parsePoly(p.geometry_wkt)})).filter(p=>p.poly.length>=3);
  const parsedHoles=(holes||[]).map(h=>({...h,line:parseLine(h.geometry_wkt)})).filter(h=>h.line.length>=2);

  // Keep only polygons that actually contain at least one numbered Amelia candidate hole trace.
  const facilityPolys=parsedPolys.filter(p=>parsedHoles.some(h=>lineTouchesPoly(h.line,p.poly)));
  const facilityUris=facilityPolys.map(p=>p.osm_course_uri);
  if(!facilityPolys.length)return{ok:false,report_only:true,promotable:false,error:'amelia_facility_boundary_missing'};
  const catalogInside=facilityPolys.some(p=>inside({lat:Number(course.latitude),lng:Number(course.longitude)},p.poly));
  if(!catalogInside)return{ok:false,report_only:true,promotable:false,error:'amelia_catalog_outside_facility'};

  const byHole=new Map();
  for(const h of parsedHoles){
    if(!facilityPolys.some(p=>lineTouchesPoly(h.line,p.poly)))continue;
    const n=Number(h.hole_number);
    if(!Number.isInteger(n)||n<1||n>Number(course.holes))continue;
    byHole.set(n,byHole.has(n)?newest(byHole.get(n),h):h);
  }
  const rows=[];
  for(let n=1;n<=Number(course.holes);n++){
    const h=byHole.get(n);
    if(!h)return{ok:false,report_only:true,promotable:false,error:'amelia_missing_hole_'+n,facility_osm_course_uris:facilityUris};
    const tee=h.line[0],green=h.line[h.line.length-1];
    rows.push({hole_number:n,tee_lat:tee.lat,tee_lng:tee.lng,green_center_lat:green.lat,green_center_lng:green.lng,osm_hole_uri:h.osm_hole_uri,osm_version:h.osm_version,osm_timestamp:h.osm_timestamp,source:'openstreetmap_hole_trace_endpoints'});
  }
  const validation=validateTeeCenterCourse(rows,course.holes);
  return {
    ok:Boolean(validation.ok),
    armed:false,
    read_only:true,
    report_only:true,
    promotable:false,
    candidate_ready_for_controlled_promotion:Boolean(validation.ok),
    course:{id:course.id,name:course.name,holes:course.holes,mapping_class:course.mapping_class},
    facility_osm_course_uris:facilityUris,
    facility_polygon_count:facilityUris.length,
    recovered_holes:rows.length,
    validator:validation,
    rows
  };
}
module.exports={createAmeliaAuthoritativeReport};
