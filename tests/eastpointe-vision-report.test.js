const test=require('node:test');
const assert=require('node:assert/strict');
const {createEastpointeReport}=require('../lib/gps-rollout/eastpointe-vision-report');
const handler=require('../api/gps-rollout-runner');
const course={id:'test-course',name:'Eastpointe East Course',country_code:'US',state_code:'FL',holes:18,latitude:26.8,longitude:-80.1,mapping_class:'incomplete'};
const settings={MAPTILER_API_KEY:'test-map',AI_GATEWAY_API_KEY:'test-ai',PARFOLIO_VISION_MODEL:'test/model'};
Object.assign(process.env,settings,{PARFOLIO_ROLLOUT_SECRET:'test-secret'});
function invoke(body,secret='test-secret'){
  const res={setHeader(){},status(n){this.code=n;return this;},json(data){this.data=data;return this;}};
  return handler({method:'POST',headers:{'x-parfolio-rollout-secret':secret},body},res).then(()=>res);
}
const body={mode:'vision_report',country_code:'US',state_code:'FL',report_only:true,test_course:'eastpointe_east',batch_size:1};
test('authentication and single-course restrictions run before external requests',async()=>{
  assert.equal((await invoke(body,'wrong')).code,401);
  for(const change of [{report_only:false},{state_code:'CA'},{batch_size:2},{test_course:'other'}])assert.equal((await invoke({...body,...change})).code,400);
});
test('missing configuration prevents database or provider requests',async()=>{
  await assert.rejects(createEastpointeReport({settings:{},read:()=>assert.fail('unexpected DB read')})(),{code:'vision_configuration_missing'});
});
test('ambiguous identity and protected courses stop before imagery',async()=>{
  for(const [matches,code] of [[[course,course],'eastpointe_east_identity_requires_review'],[[{...course,name:'Eastpointe West Course'}],'eastpointe_east_identity_requires_review'],[[{...course,mapping_class:'gps_ready'}],'course_already_protected']]){
    await assert.rejects(createEastpointeReport({settings,read:async()=>matches,fetchImpl:()=>assert.fail('unexpected imagery')})(),{code});
  }
});
test('full report pipeline reads DB only and never accepts model coordinates',async()=>{
  const reads=[],calls=[];
  const read=async(table,params)=>{reads.push({table,params});return table==='course_catalog'?[course]:[{hole_number:1,tee_lat:26.8,tee_lng:-80.1,green_center_lat:26.81,green_center_lng:-80.1}];};
  const fetchImpl=async(url,options)=>{
    calls.push({url,options});
    if(url.startsWith('https://imagery.nationalmap.gov/'))return{ok:true,headers:new Headers({'content-type':'image/jpeg'}),arrayBuffer:async()=>Buffer.alloc(12000)};
    assert.equal(url,'https://ai-gateway.vercel.sh/v1/chat/completions');
    const request=JSON.parse(options.body);
    assert.equal(request.model,'test/model');
    return{ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({holes:[{hole_number:2,points:[{type:'tee',lat:26.8,lng:-80.1,confidence:0.99,evidence:'fixture only'}]}]})}}]})};
  };
  const result=await createEastpointeReport({settings,read,fetchImpl})();
  assert.equal(reads.length,2);assert.equal(calls.length,2);
  assert.equal(calls[0].options.method,undefined);assert.equal(calls[1].options.method,'POST');
  assert.ok(calls.every(c=>c.options.signal&&c.options.redirect==='error'));
  assert.ok(!result.missing_holes.includes(1));assert.equal(result.missing_holes.length,17);
  assert.equal(result.promotable,false);assert.equal(result.armed,false);assert.equal(result.report_only,true);
  assert.equal(result.holes[0].points[0].accepted,false);assert.equal(result.holes[0].points[0].evidence,'fixture only');
});
test('provider errors are redacted by endpoint',async()=>{
  const old=global.fetch;global.fetch=async()=>{throw new Error('private-key-in-error')};
  process.env.SUPABASE_URL='https://example.invalid';process.env.SUPABASE_SERVICE_ROLE_KEY='test-service';
  try{const response=await invoke(body);assert.equal(response.code,503);assert.equal(response.data.error,'vision_report_failed');assert.ok(!JSON.stringify(response.data).includes('private-key'));}
  finally{global.fetch=old;}
});

test('AI errors do not retry analysis with a second imagery source',async()=>{
  let calls=0;
  const read=async table=>table==='course_catalog'?[course]:[];
  const fetchImpl=async url=>{
    calls++;
    if(url.startsWith('https://imagery.nationalmap.gov/'))return {ok:true,headers:new Headers({'content-type':'image/jpeg'}),arrayBuffer:async()=>Buffer.alloc(12000)};
    return {ok:false,status:429};
  };
  await assert.rejects(createEastpointeReport({settings,read,fetchImpl})(),{code:'ai_gateway_http_429'});
  assert.equal(calls,2);
});
test('explicit model is required even when AI credentials exist',async()=>{
  await assert.rejects(createEastpointeReport({settings:{AI_GATEWAY_API_KEY:'test'},read:()=>assert.fail('unexpected DB read')})(),{code:'vision_configuration_missing'});
});
test('new diagnostic target is ID-bound and rejects the wrong identity',async()=>{
  const treviso={...course,id:'4d58741c-12f9-4e3d-8947-cf4d7f2c4190',name:'Tpc Treviso Bay',city:'Naples'};
  for(const wrong of [{id:'wrong'},{name:'Other course'},{city:'Miami'},{holes:9}]){
    await assert.rejects(createEastpointeReport({testCourse:'tpc_treviso_bay',settings,read:async()=>[{...treviso,...wrong}],fetchImpl:()=>assert.fail('no imagery for mismatched course')})());
  }
  await assert.rejects(createEastpointeReport({testCourse:'anything',settings,read:()=>assert.fail('no query for unknown test')})(),{code:'test_course_not_allowed'});
  const reads=[];
  const report=await createEastpointeReport({testCourse:'tpc_treviso_bay',settings,read:async(table,params)=>{
    reads.push(params);
    return table==='course_catalog'?[treviso]:Array.from({length:18},(_,i)=>({hole_number:i+1,tee_lat:26,tee_lng:-81,green_center_lat:26.002,green_center_lng:-81}));
  },fetchImpl:()=>assert.fail('complete geometry needs no AI')})();
  assert.equal(reads[0].id,'eq.'+treviso.id);
  assert.equal(report.promotable,false);
});
