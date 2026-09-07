const {chromium,webkit}=require('playwright');
const fs=require('fs');
const BASE='https://ricbkewl.github.io/parfolio/';
fs.mkdirSync('audit-results',{recursive:true});
const results=[],evidence={};
const add=(area,test,ok,detail)=>{results.push({area,test,ok:!!ok,detail});console.log(JSON.stringify(results.at(-1)))};
const scrub=s=>String(s).replace(/([?&](?:key|apikey|token|access_token)=)[^&\s]+/gi,'$1[redacted]');
async function check(engine,label,viewport){
 const browser=await engine.launch();const context=await browser.newContext({viewport});
 const page=await context.newPage();page.setDefaultTimeout(15000);
 const errors=[],bad=[],failed=[],consoleErrors=[];
 page.on('pageerror',e=>errors.push(scrub(e.message)));
 page.on('console',m=>{if(m.type()==='error')consoleErrors.push(scrub(m.text()))});
 page.on('requestfailed',r=>{if(!/ERR_ABORTED|cancelled/i.test(r.failure()?.errorText||''))failed.push(scrub(r.url()+' '+r.failure()?.errorText))});
 page.on('response',r=>{if(r.status()>=400)bad.push(scrub(r.status()+' '+r.url()))});
 try{
 const response=await page.goto(BASE,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>typeof cloudLoading!=='undefined'&&!cloudLoading,{timeout:45000});
 await page.waitForFunction(()=>typeof courses!=='undefined'&&courses.length>1000,{timeout:60000});
 add(label,'page load',response.status()===200);
 add(label,'home overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+3));
 const home=await page.locator('body').innerText();
 add(label,'home branding',/Par[\s\n]*Folio/.test(home)&&!/Agape Tumou|Faith.*Fellowship|Saved to Serve|2 Timothy/i.test(home));
 add(label,'home background',await page.evaluate(()=>[document.body,...document.querySelectorAll('#app,.home-screen,.home-premium')].some(n=>/url\(/.test(getComputedStyle(n).backgroundImage))||!!document.querySelector('img[alt="ParFolio logo"]')));
 await page.screenshot({path:'audit-results/'+label+'-home.png',fullPage:true});
 const scripts=await page.evaluate(()=>Array.from(document.scripts,s=>s.src).filter(Boolean).map(s=>s.split('?')[0]));
 add(label,'scripts load once',new Set(scripts).size===scripts.length);
 const manifest=await page.request.get(BASE+'manifest.webmanifest');const mf=await manifest.json();
 add(label,'PWA manifest',manifest.status()===200&&mf.name==='ParFolio'&&!!mf.icons?.length,mf);
 const auth=await page.evaluate(async()=>{const r=await fetch(SUPABASE_URL+'/auth/v1/settings',{headers:{apikey:SUPABASE_PUBLISHABLE_KEY}});return {status:r.status,settings:await r.json()}});
 add(label,'Supabase Auth',auth.status===200,{status:auth.status,emailEnabled:auth.settings.external?.email});
 const catalog=await page.evaluate(()=>({total:courses.length,shared:window.PARFOLIO_SHARED_LIBRARY,states:['CA','NY','TX'].map(state=>({state,count:courses.filter(c=>String(c.state||c.state_code).toUpperCase()===state).length})),indonesia:courses.filter(c=>/indonesia/i.test(c.country||'')||c.country_code==='ID').length}));
 add(label,'catalog populated',catalog.total>1000,catalog);
 add(label,'shared library pagination',catalog.shared?.loaded&&catalog.shared.catalogRows>500,catalog.shared);
 for(const state of catalog.states)add(label,state.state+' courses',state.count>100,state.count);
 add(label,'Indonesia courses',catalog.indonesia>25,catalog.indonesia);
 await page.getByRole('button',{name:'⛳ Courses',exact:true}).click();
 await page.locator('.course-map-launch').waitFor();
 const position=await page.locator('.course-map-launch').boundingBox();
 add(label,'floating Map at 6 o’clock',position&&Math.abs(position.x+position.width/2-viewport.width/2)<25&&position.y>viewport.height*.65,position);
 add(label,'course layout overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+3));
 const input=page.getByRole('searchbox',{name:'Search shared courses'});
 for(const [query,pattern] of [['Siera Lakes','Sierra Lakes'],['Cortland NY','Cortland'],['92336','Fontana'],['Jakarta','Jakarta']]){
   await input.fill(query);await page.waitForTimeout(650);
   const text=await page.locator('#courseLibraryGrid').innerText();
   add(label,'search '+query,text.toLowerCase().includes(pattern.toLowerCase()),text.slice(0,700));
 }
 await input.fill('');
 await page.getByRole('button',{name:/Filter courses/}).click();
 await page.getByRole('button',{name:'🟡 Partial GPS',exact:true}).click();
 const show=page.locator('[data-apply]');const count=await show.innerText();
 add(label,'Partial GPS filter',/Show [1-9][0-9]* Course/.test(count),count);
 await page.locator('[data-clear]').click();await page.locator('[data-apply]').click();
 await page.getByRole('button',{name:'Show courses on map'}).click();
 add(label,'floating course map opens',await page.getByRole('generic',{name:'Map of golf courses'}).count()>0||await page.locator('.course-map-browser').count()>0);
 await page.screenshot({path:'audit-results/'+label+'-course-map.png',fullPage:true});
 await page.getByRole('button',{name:'Back to course list'}).click();
 const guard=await page.evaluate(()=>{if(typeof authorizedView!=='function')return false;return ['round','mapCourse','usersView','historyView','chatView'].every(v=>authorizedView(v)==='home')});
 add(label,'signed-out protected routes',guard);
 const editor=await page.evaluate(()=>{const d=window.parfolioNormalizeCourseForEditor({holes:18,greens:[],mapHole:7,target:'back'});return {hole:d.mapHole,target:d.target,greens:d.greens.length}});
 add(label,'editor preserves hole and marker',editor.hole===7&&editor.target==='back'&&editor.greens===18,editor);
 for(const [region,lat,lng] of [['California',34.14,-117.46],['New York',42.60,-76.18],['Indonesia',-6.27,106.90]]){
   const gm=await page.evaluate(async({lat,lng})=>{
     try{
       await Promise.race([loadGoogleMaps(),new Promise((_,r)=>setTimeout(()=>r(Error('loader timeout')),12000))]);
       const d=document.createElement('div');d.style.cssText='position:fixed;inset:60px 10px 60px 10px;z-index:999999;background:white';document.body.appendChild(d);
       const m=new google.maps.Map(d,{center:{lat,lng},zoom:16,mapTypeId:'satellite'});
       const tiles=await Promise.race([new Promise(r=>google.maps.event.addListenerOnce(m,'tilesloaded',()=>r(true))),new Promise(r=>setTimeout(()=>r(false),10000))]);
       await new Promise(r=>setTimeout(r,1000));
       const error=!!window.PARFOLIO_GOOGLE_MAPS_UNHEALTHY||/development purposes|oops|can't load/i.test(d.innerText);
       d.remove();return {tiles,error};
     }catch(e){return {tiles:false,error:String(e.message)}}
   },{lat,lng});
   add(label,'Google Satellite '+region,gm.tiles&&!gm.error,gm);
 }
 add(label,'no JavaScript exceptions',errors.length===0,errors);
 add(label,'no HTTP errors',bad.length===0,[...new Set(bad)]);
 add(label,'no failed requests',failed.length===0,[...new Set(failed)]);
 add(label,'no console errors',consoleErrors.length===0,[...new Set(consoleErrors)]);
 const sw=await page.evaluate(async()=>{const r=await Promise.race([navigator.serviceWorker.ready,new Promise(r=>setTimeout(()=>r(null),12000))]);return !!r?.active});
 add(label,'service worker active',sw);
 if(sw){await context.setOffline(true);await page.reload({waitUntil:'domcontentloaded'});await page.waitForTimeout(2000);add(label,'offline shell',await page.locator('#app').innerText().then(t=>t.length>100));}
 evidence[label]={errors,bad,failed,consoleErrors};
 }catch(e){add(label,'audit completion',false,scrub(e.stack));}
 await context.close();await browser.close();
}
(async()=>{
 await check(chromium,'android-mobile',{width:390,height:844});
 await check(chromium,'desktop',{width:1440,height:900});
 await check(webkit,'iphone-webkit',{width:390,height:844});
 const report={url:BASE,generated:new Date().toISOString(),total:results.length,passed:results.filter(r=>r.ok).length,failed:results.filter(r=>!r.ok).length,results,evidence};
 fs.writeFileSync('audit-results/report.json',JSON.stringify(report,null,2));
 console.log('AUDIT_TOTALS',JSON.stringify({total:report.total,passed:report.passed,failed:report.failed}));
 if(report.failed)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
