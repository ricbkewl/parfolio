const test=require('node:test');const assert=require('node:assert/strict');
const {lookupOfficialLayout}=require('../lib/gps-rollout/official-course-layout');
const {createEastpointeReport}=require('../lib/gps-rollout/eastpointe-vision-report');
const {createGatewayAnalyzeImage}=require('../lib/gps-rollout/vercel-ai-gateway-analyzer');
const pageUrl='https://www.tpctrevisobay.com/course-tour';
test('official 403 records provenance and stops before imagery or AI',async()=>{
 const calls=[];
 const report=await createEastpointeReport({testCourse:'tpc_treviso_bay',settings:{AI_GATEWAY_API_KEY:'test',PARFOLIO_VISION_MODEL:'test'},read:async table=>table==='course_catalog'?[{id:'4d58741c-12f9-4e3d-8947-cf4d7f2c4190',name:'Tpc Treviso Bay',city:'Naples',country_code:'US',state_code:'FL',holes:18,latitude:26.0717667,longitude:-81.7335389,mapping_class:'location_pending'}]:[],fetchImpl:async(url,opts)=>{calls.push(url);assert.equal(opts.redirect,'error');return new Response('',{status:403});}})();
 assert.deepEqual(calls,[pageUrl]);assert.equal(report.status,'requires_source_review');assert.equal(report.layout.sources[0].http_status,403);assert.equal(report.promotable,false);assert.deepEqual(report.holes,[]);
});
test('discovery restricts requests to official origin and records hashes; PDF document paths supported',async()=>{
 const calls=[];
 const result=await lookupOfficialLayout({pageUrl,fetchImpl:async url=>{calls.push(url);
 if(url===pageUrl)return new Response('<img alt="course layout" src="/layout.png"><img alt="layout" src="http://127.0.0.1/layout.png"><img alt="layout" src="https://evil.test/layout.png"><a href="/scorecard.pdf/document-id">PDF</a>',{headers:{'content-type':'text/html'}});
 return new Response('fixture',{headers:{'content-type':url.includes('.pdf/')?'application/pdf':'image/png'}});
 }});
 assert.equal(calls.length,3);assert.equal(result.assets.length,2);assert.equal(result.sources[1].sha256.length,64);assert.equal(result.sources[2].status,'retrieved');
});
test('oversized pages and redirects fail closed',async()=>{
 for(const fetchImpl of [async()=>new Response('x',{headers:{'content-length':'9000000','content-type':'text/html'}}),async()=>{throw new TypeError('redirect');}]){
 const result=await lookupOfficialLayout({pageUrl,fetchImpl});assert.equal(result.status,'requires_source_review');assert.equal(result.assets.length,0);
 }
});
test('gateway supplies labeled layout image separately from georeferenced aerial',async()=>{
 let request;
 const analyze=createGatewayAnalyzeImage({settings:{AI_GATEWAY_API_KEY:'test',PARFOLIO_VISION_MODEL:'test'},fetchImpl:async(url,opts)=>{request=JSON.parse(opts.body);return {ok:true,json:async()=>({choices:[{message:{content:'{"holes":[]}'}}]})};}});
 await analyze({system_instructions:'report only',image_bytes:Buffer.from('aerial'),layout_assets:[{source_url:pageUrl+'/layout.png',mime_type:'image/png',bytes:Buffer.from('layout')}],context:{},response_contract:{}});
 const content=request.messages[0].content;assert.equal(content.filter(x=>x.type==='image_url').length,2);assert.ok(content.some(x=>x.text?.includes('not georeferenced')));assert.ok(content.some(x=>x.image_url?.url==='data:image/png;base64,bGF5b3V0'));
});

test('gateway sends PDF reference as a file with inline data',async()=>{
 let content;
 const analyze=createGatewayAnalyzeImage({settings:{AI_GATEWAY_API_KEY:'test',PARFOLIO_VISION_MODEL:'test'},fetchImpl:async(url,opts)=>{content=JSON.parse(opts.body).messages[0].content;return {ok:true,json:async()=>({choices:[{message:{content:'{"holes":[]}'}}]})};}});
 await analyze({system_instructions:'report only',image_bytes:Buffer.from('aerial'),layout_assets:[{source_url:pageUrl,mime_type:'application/pdf',bytes:Buffer.from('%PDF-1.7')}],context:{},response_contract:{}});
 assert.equal(content.find(x=>x.type==='file').file.file_data,'data:application/pdf;base64,JVBERi0xLjc=');
});
