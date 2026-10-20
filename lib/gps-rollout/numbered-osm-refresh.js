/* Source-bound numbered-hole refresh. Reports only: no database or AI calls. */
const {createHash}=require('node:crypto');
const {finitePoint,validateTeeCenterCourse}=require('./gps-rollout-engine');
const {nameSimilarity}=require('./gps-rollout-processor');
const API='https://api.openstreetmap.org/api/0.6';
const MAX_BYTES=8*1024*1024;
function fail(reason){throw new Error(reason);}
function wayId(uri){const m=/^https:\/\/www\.openstreetmap\.org\/way\/([1-9]\d*)$/.exec(uri||'');if(!m)fail('explicit_osm_way_required');return m[1];}
function inside(p,ring){
  let yes=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const a=ring[i],b=ring[j];
    if((a.lat>p.lat)!==(b.lat>p.lat)&&p.lng<(b.lng-a.lng)*(p.lat-a.lat)/(b.lat-a.lat)+a.lng)yes=!yes;
  }
  return yes;
}
function unpack(data){
  if(!Array.isArray(data?.elements))fail('invalid_osm_response');
  const nodes=new Map(),ways=[];
  for(const e of data.elements){
    if(e.type==='node'){
      if(nodes.has(String(e.id))||!finitePoint(e.lat,e.lon))fail('invalid_or_duplicate_node');
      nodes.set(String(e.id),{lat:Number(e.lat),lng:Number(e.lon)});
    }else if(e.type==='way')ways.push(e);
  }
  return {ways,points(w){if(!Array.isArray(w.nodes)||w.nodes.length<2)fail('invalid_way_nodes');return w.nodes.map(id=>{const p=nodes.get(String(id));if(!p)fail('incomplete_way_nodes');return p;});}};
}
function context({course,existingRows,holeCountEvidence}){
  const id=wayId(course?.osm_course_uri);
  if(['gps_ready','verified_gps','published'].includes(String(course.mapping_class).toLowerCase()))fail('protected_course');
  if(!finitePoint(course.latitude,course.longitude))fail('invalid_course_center');
  let count=Number(course.holes);
  if(course.holes==null){
    if(holeCountEvidence?.course_id!==course.id||holeCountEvidence?.verified!==true||!/^https:\/\//.test(holeCountEvidence?.source_url||''))fail('verified_hole_count_required');
    count=Number(holeCountEvidence.holes);
  }
  if(![9,18].includes(count))fail('invalid_hole_count');
  if(!Array.isArray(existingRows))fail('existing_rows_required');
  const seen=new Set();
  for(const r of existingRows){const n=Number(r.hole_number);if(!Number.isInteger(n)||n<1||n>count||seen.has(n))fail('ambiguous_existing_rows');seen.add(n);}
  const complete=existingRows.filter(r=>finitePoint(r.tee_lat,r.tee_lng)&&finitePoint(r.green_center_lat,r.green_center_lng));
  const missing=Array.from({length:count},(_,i)=>i+1).filter(n=>!complete.some(r=>Number(r.hole_number)===n));
  return {id,count,missing};
}
function boundary(course,data,id){
  const parsed=unpack(data),matches=parsed.ways.filter(w=>String(w.id)===id);
  if(matches.length!==1)fail('ambiguous_course_boundary');
  const w=matches[0];
  if(w.tags?.leisure!=='golf_course'||nameSimilarity(course.name,w.tags?.name)<0.6)fail('course_identity_mismatch');
  const ring=parsed.points(w);
  if(ring.length<4||w.nodes[0]!==w.nodes.at(-1))fail('closed_course_boundary_required');
  const bbox=[Math.min(...ring.map(p=>p.lng)),Math.min(...ring.map(p=>p.lat)),Math.max(...ring.map(p=>p.lng)),Math.max(...ring.map(p=>p.lat))];
  if(bbox[2]-bbox[0]>.08||bbox[3]-bbox[1]>.08||!inside({lat:Number(course.latitude),lng:Number(course.longitude)},ring))fail('course_extent_requires_review');
  return {ring,bbox,source:{url:course.osm_course_uri,version:w.version,timestamp:w.timestamp}};
}
function buildNumberedRefreshReport(input){
  const base={report_only:true,promotable:false,armed:false,course_id:input.course?.id,proposals:[]};
  try{
    const {id,count,missing}=context(input);
    if(!missing.length)return {...base,status:'no_missing_holes'};
    const b=boundary(input.course,input.boundaryData,id),map=unpack(input.mapData);
    const groups=new Map(),rejected=[];
    for(const w of map.ways){
      if(w.tags?.golf!=='hole'||!/^\d+$/.test(w.tags.ref||''))continue;
      const n=Number(w.tags.ref);if(!missing.includes(n))continue;
      const pts=map.points(w);
      if(!pts.some(p=>inside(p,b.ring)))continue;
      if(!groups.has(n))groups.set(n,[]);groups.get(n).push({w,pts});
    }
    const polygons=map.ways.filter(w=>['tee','green'].includes(w.tags?.golf)&&w.nodes?.length>=4&&w.nodes[0]===w.nodes.at(-1)).map(w=>({type:w.tags.golf,ring:map.points(w)}));
    const proposals=[];
    for(const n of missing){
      const choices=groups.get(n)||[];
      if(choices.length!==1){rejected.push({hole_number:n,reason:choices.length?'duplicate_numbered_traces':'numbered_trace_missing'});continue;}
      const {w,pts}=choices[0],tee=pts[0],green=pts.at(-1);
      if(!pts.every(p=>inside(p,b.ring))){rejected.push({hole_number:n,reason:'route_nodes_outside_course'});continue;}
      if(!polygons.some(p=>p.type==='tee'&&inside(tee,p.ring))||!polygons.some(p=>p.type==='green'&&inside(green,p.ring))){rejected.push({hole_number:n,reason:'endpoint_features_unconfirmed'});continue;}
      proposals.push({hole_number:n,tee_lat:tee.lat,tee_lng:tee.lng,green_center_lat:green.lat,green_center_lng:green.lng,route_geojson:{type:'LineString',coordinates:pts.map(p=>[p.lng,p.lat])},osm_hole_uri:'https://www.openstreetmap.org/way/'+w.id,osm_version:w.version,osm_timestamp:w.timestamp,source:'openstreetmap_numbered_trace_refresh',accepted:false});
    }
    const combined=input.existingRows.filter(r=>!proposals.some(p=>p.hole_number===Number(r.hole_number))).concat(proposals).sort((a,b)=>a.hole_number-b.hole_number);
    const validation=validateTeeCenterCourse(combined,count);
    return {...base,status:validation.ok?'complete_candidate_requires_review':'incomplete',missing_before:missing,proposals,rejected,combined_rows:combined,whole_course_validation:validation,boundary_source:b.source,hole_count:count,hole_count_evidence:input.course.holes==null?input.holeCountEvidence:null,attribution:'© OpenStreetMap contributors, ODbL 1.0'};
  }catch(e){return {...base,status:'review',reason:e.message};}
}
async function fetchNumberedRefreshReport(input,{fetchImpl=globalThis.fetch}={}){
  const sources=[],base={report_only:true,promotable:false,armed:false,course_id:input.course?.id,proposals:[]};
  try{
    const {id,missing}=context(input);
    if(!missing.length)return {...base,status:'no_missing_holes',sources};
    const signal=AbortSignal.timeout(30000);
    async function get(url){
      const record={url,retrieved_at:new Date().toISOString()};sources.push(record);
      const r=await fetchImpl(url,{redirect:'error',signal,headers:{Accept:'application/json','User-Agent':'ParFolio-GPS-Recovery/1.0'}});
      record.http_status=r.status;if(!r.ok)fail('osm_http_'+r.status);
      if(Number(r.headers.get('content-length'))>MAX_BYTES)fail('osm_response_too_large');
      const reader=r.body.getReader(),chunks=[];let bytes=0;
      try{for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>MAX_BYTES)fail('osm_response_too_large');chunks.push(Buffer.from(value));}}finally{await reader.cancel().catch(()=>{});}
      const body=Buffer.concat(chunks);record.bytes=bytes;record.sha256=createHash('sha256').update(body).digest('hex');
      return JSON.parse(body.toString('utf8'));
    }
    const boundaryData=await get(`${API}/way/${id}/full.json`);
    const b=boundary(input.course,boundaryData,id);
    const mapData=await get(`${API}/map.json?bbox=${b.bbox.join(',')}`);
    return {...buildNumberedRefreshReport({...input,boundaryData,mapData}),sources};
  }catch(e){return {...base,status:'review',reason:/^(osm_|explicit_|protected_|invalid_|verified_|existing_|ambiguous_|closed_|course_)/.test(e.message)?e.message:'osm_refresh_failed',sources};}
}
module.exports={buildNumberedRefreshReport,fetchNumberedRefreshReport};
