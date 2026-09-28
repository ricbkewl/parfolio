const test=require('node:test');
const assert=require('node:assert/strict');
const handler=require('../api/gps-rollout-runner');
const shadow=require('../lib/gps-rollout/gold-standard-shadow');
const body={mode:'gold_standard_shadow',country_code:'US',state_code:'CA',report_only:true,test_course:'sierra_lakes',batch_size:1};
async function invoke(changes={},secret='fixture-secret',method='POST'){
  const response={headers:{},setHeader(k,v){this.headers[k]=v;},status(code){this.code=code;return this;},json(data){this.data=data;return this;}};
  await handler({method,headers:{'x-parfolio-rollout-secret':secret},body:{...body,...changes}},response);
  return response;
}
test('Preview-only, authenticated, exact single-course request required before recovery',async()=>{
  const old=shadow.runSierraShadow;
  process.env.PARFOLIO_ROLLOUT_SECRET='fixture-secret';process.env.VERCEL_ENV='preview';
  shadow.runSierraShadow=()=>assert.fail('recovery must not run');
  try{
    assert.equal((await invoke({},'wrong')).code,401);
    assert.equal((await invoke({},'fixture-secret','GET')).code,405);
    for(const env of ['production','development','']){process.env.VERCEL_ENV=env;assert.equal((await invoke()).code,404);}
    process.env.VERCEL_ENV='preview';
    for(const change of [{country_code:'CA'},{state_code:'FL'},{report_only:false},{test_course:'other'},{batch_size:2},{promote:true},{course_id:'other'},{rows:[]}])assert.equal((await invoke(change)).code,400);
    delete process.env.PARFOLIO_ROLLOUT_SECRET;assert.equal((await invoke()).code,401);
  }finally{shadow.runSierraShadow=old;}
});
test('successful report preserves safety fields, omits raw source and disables caching',async()=>{
  const old=shadow.runSierraShadow;
  process.env.PARFOLIO_ROLLOUT_SECRET='fixture-secret';process.env.VERCEL_ENV='preview';
  shadow.runSierraShadow=async()=>({status:'compared_requires_review',read_only:true,report_only:true,armed:false,promotable:false,promoted:0,source:{sha256:'fixture'},source_snapshot:{elements:['bulky']}});
  try{const r=await invoke();assert.equal(r.code,200);assert.equal(r.data.execution,'live_read_only');assert.equal(r.data.source_snapshot,undefined);assert.equal(r.data.promotable,false);assert.equal(r.data.promoted,0);assert.match(r.headers['Cache-Control'],/no-store/);assert.equal(r.headers['X-Content-Type-Options'],'nosniff');}
  finally{shadow.runSierraShadow=old;}
});
test('source failure and changed answer key fail safely without leaking internal errors',async()=>{
  const old=shadow.runSierraShadow;
  process.env.PARFOLIO_ROLLOUT_SECRET='fixture-secret';process.env.VERCEL_ENV='preview';
  try{
    shadow.runSierraShadow=async()=>({status:'failed',report_only:true,armed:false,promotable:false,promoted:0});assert.equal((await invoke()).code,503);
    shadow.runSierraShadow=async()=>{throw new Error('private credential');};const redacted=await invoke();assert.equal(redacted.code,503);assert.equal(redacted.data.error,'shadow_test_failed');assert.ok(!JSON.stringify(redacted).includes('private credential'));
    shadow.runSierraShadow=async()=>{throw Object.assign(new Error('changed'),{code:'benchmark_changed_during_run'});};assert.equal((await invoke()).data.error,'benchmark_changed_during_run');
  }finally{shadow.runSierraShadow=old;}
});
