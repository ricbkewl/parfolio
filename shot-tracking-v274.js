/* ParFolio v274 — GPS shot tracking without modifying the stable map renderer. */
(function(){
  const STORE='parfolioShotHistoryV274';
  let watchId=null,lastFix=null,origin=null,originHole=null,shotNumber=1,busy=false;

  const valid=p=>p&&Number.isFinite(Number(p.lat))&&Number.isFinite(Number(p.lng));
  const yardsBetween=(a,b)=>{
    const R=6371008.8,toRad=v=>Number(v)*Math.PI/180;
    const dLat=toRad(b.lat-a.lat),dLng=toRad(b.lng-a.lng);
    const q=Math.sin(dLat/2)**2+Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLng/2)**2;
    return 2*R*Math.asin(Math.sqrt(q))*1.0936133;
  };
  const currentHole=()=>Math.max(1,Number(typeof s!=='undefined'&&s?.hole)||1);
  const inRound=()=>typeof s!=='undefined'&&s?.v==='round'&&!s?.done;
  const escHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clubList=()=>{
    try{
      const names=Array.isArray(CLUBS)?CLUBS.filter(Boolean):[];
      return [...new Set(names)];
    }catch{return[];}
  };
  const courseName=()=>{
    try{return String(s?.courseName||s?.course?.name||s?.name||document.querySelector('.round-course-name,h1')?.textContent||'Round').trim();}catch{return'Round';}
  };
  const accuracyYards=()=>Number.isFinite(lastFix?.accuracy)?Math.round(lastFix.accuracy*1.0936133):null;
  const liveYards=()=>valid(origin)&&valid(lastFix)?Math.round(yardsBetween(origin,lastFix)):0;

  function readHistory(){try{const value=JSON.parse(localStorage.getItem(STORE)||'[]');return Array.isArray(value)?value:[];}catch{return[];}}
  function saveRecord(record){try{const rows=readHistory();rows.push(record);localStorage.setItem(STORE,JSON.stringify(rows.slice(-500)));}catch{}}
  window.getParFolioShotHistory=readHistory;

  async function syncRecord(record){
    try{
      if(typeof db==='undefined'||!db||typeof currentUser==='undefined'||!currentUser?.id)return;
      const cloud={
        id:record.id,user_id:currentUser.id,round_id:typeof s!=='undefined'&&s?.sharedRoundId?s.sharedRoundId:null,
        course_name:record.course||'',hole:record.hole,shot_number:record.shot,club:record.club||null,distance_yards:record.distance_yards,
        origin_lat:record.origin?.lat??null,origin_lng:record.origin?.lng??null,landing_lat:record.landing?.lat??null,landing_lng:record.landing?.lng??null,
        origin_accuracy_m:record.origin?.accuracy??null,landing_accuracy_m:record.landing?.accuracy??null,created_at:record.saved_at
      };
      const {error}=await db.from('golfer_shots').upsert(cloud,{onConflict:'id'});
      if(error)console.warn('[ParFolio Shot Tracking] cloud sync:',error.message||error);
    }catch(error){console.warn('[ParFolio Shot Tracking] cloud sync:',error?.message||error)}
  }

  function positionObject(pos){return{lat:Number(pos.coords.latitude),lng:Number(pos.coords.longitude),accuracy:Number(pos.coords.accuracy)||null,time:new Date(pos.timestamp||Date.now()).toISOString()};}
  function updatePosition(pos){lastFix=positionObject(pos);updateUi();}
  function positionError(error){const status=document.querySelector('.pf-shot-status');if(status)status.textContent=error?.message||'GPS unavailable';}
  function ensureWatch(){
    if(watchId!==null||!navigator.geolocation)return;
    watchId=navigator.geolocation.watchPosition(updatePosition,positionError,{enableHighAccuracy:true,maximumAge:1500,timeout:15000});
  }
  function stopWatch(){if(watchId!==null&&navigator.geolocation){navigator.geolocation.clearWatch(watchId);watchId=null;}}
  function getFix(){
    return new Promise((resolve,reject)=>{
      if(valid(lastFix)&&Date.now()-Date.parse(lastFix.time)<10000)return resolve(lastFix);
      if(!navigator.geolocation)return reject(new Error('Location is not available on this device.'));
      navigator.geolocation.getCurrentPosition(pos=>{updatePosition(pos);resolve(lastFix);},reject,{enableHighAccuracy:true,maximumAge:0,timeout:15000});
    });
  }

  function selectedClub(){return document.querySelector('.pf-shot-club')?.value||'';}
  async function markShot(){
    if(busy)return;busy=true;updateUi();
    try{
      const fix=await getFix();origin={...fix};originHole=currentHole();shotNumber=Math.max(1,shotNumber);updateUi();
    }catch(error){alert(error?.message||'Could not mark your current GPS position.');}
    finally{busy=false;updateUi();}
  }
  async function saveLanding(){
    if(busy||!valid(origin))return;busy=true;updateUi();
    try{
      const landing=await getFix(),yards=Math.round(yardsBetween(origin,landing)),hole=currentHole(),club=selectedClub(),savedAt=new Date().toISOString();
      const record={id:(crypto?.randomUUID?.()||String(Date.now())),course:courseName(),hole,shot:shotNumber,club:club||null,distance_yards:yards,origin:{lat:origin.lat,lng:origin.lng,accuracy:origin.accuracy||null,time:origin.time},landing:{lat:landing.lat,lng:landing.lng,accuracy:landing.accuracy||null,time:landing.time},saved_at:savedAt};
      saveRecord(record);syncRecord(record);
      origin={...landing};originHole=hole;shotNumber+=1;
      const status=document.querySelector('.pf-shot-status');if(status)status.textContent=`Saved ${yards} yd${club?` · ${club}`:''}. Next shot starts here.`;
      updateUi();
    }catch(error){alert(error?.message||'Could not save the landing position.');}
    finally{busy=false;updateUi();}
  }
  function resetShot(){origin=null;originHole=null;shotNumber=1;updateUi();}

  function injectStyle(){
    if(document.getElementById('pf-shot-v274-style'))return;
    const style=document.createElement('style');style.id='pf-shot-v274-style';style.textContent=`
      .pf-shot-tracker{position:fixed;left:max(12px,env(safe-area-inset-left));right:max(12px,env(safe-area-inset-right));bottom:calc(78px + env(safe-area-inset-bottom));z-index:9500;background:rgba(14,34,27,.94);color:#fff;border:1px solid rgba(255,255,255,.18);border-radius:18px;padding:10px 11px;box-shadow:0 8px 28px rgba(0,0,0,.28);backdrop-filter:blur(12px);font-family:inherit}
      .pf-shot-top{display:flex;align-items:center;gap:8px}.pf-shot-copy{min-width:0;flex:1}.pf-shot-copy b{display:block;font-size:13px}.pf-shot-copy small{display:block;opacity:.78;font-size:10px;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .pf-shot-distance{font-size:22px;font-weight:900;letter-spacing:-.5px;min-width:72px;text-align:right}.pf-shot-distance small{font-size:10px;font-weight:700;opacity:.72;margin-left:2px}
      .pf-shot-actions{display:flex;gap:7px;margin-top:8px}.pf-shot-actions select,.pf-shot-actions button{min-height:34px;border-radius:11px;border:0;font:700 11px/1 inherit}.pf-shot-actions select{flex:1;min-width:0;padding:0 8px;background:#fff;color:#143a2d}.pf-shot-actions button{padding:0 12px;background:#f4c86b;color:#173b2e}.pf-shot-actions button.secondary{background:rgba(255,255,255,.13);color:#fff}.pf-shot-actions button:disabled{opacity:.55}.pf-shot-status{margin-top:6px;font-size:9px;opacity:.75;text-align:center}
    `;document.head.appendChild(style);
  }

  function shell(){
    const el=document.createElement('section');el.className='pf-shot-tracker';el.setAttribute('aria-label','Shot Tracking');
    el.innerHTML=`<div class="pf-shot-top"><div class="pf-shot-copy"><b>📍 Shot Tracking</b><small class="pf-shot-line">Mark your ball position before you hit.</small></div><div class="pf-shot-distance">—<small>yd</small></div></div><div class="pf-shot-actions"><select class="pf-shot-club" aria-label="Club used"><option value="">Club (optional)</option>${clubList().map(c=>`<option value="${escHtml(c)}">${escHtml(c)}</option>`).join('')}</select><button type="button" class="pf-shot-primary">Mark Shot</button><button type="button" class="secondary pf-shot-reset" aria-label="Reset shot tracking">Reset</button></div><div class="pf-shot-status">Waiting for GPS…</div>`;
    el.querySelector('.pf-shot-primary').addEventListener('click',()=>valid(origin)?saveLanding():markShot());
    el.querySelector('.pf-shot-reset').addEventListener('click',resetShot);
    document.body.appendChild(el);return el;
  }

  function updateUi(){
    const el=document.querySelector('.pf-shot-tracker');if(!el)return;
    const hole=currentHole();
    if(origin&&originHole!==hole){origin=null;originHole=null;shotNumber=1;}
    const distance=el.querySelector('.pf-shot-distance'),line=el.querySelector('.pf-shot-line'),primary=el.querySelector('.pf-shot-primary'),status=el.querySelector('.pf-shot-status');
    if(valid(origin)){
      distance.innerHTML=`${liveYards()}<small>yd</small>`;
      line.textContent=`Hole ${hole} · Shot ${shotNumber} · distance from marked position`;
      primary.textContent=busy?'Locating…':'Save Landing';
    }else{
      distance.innerHTML='—<small>yd</small>';
      line.textContent=`Hole ${hole} · mark the ball before your shot`;
      primary.textContent=busy?'Locating…':'Mark Shot';
    }
    primary.disabled=busy;
    const accuracy=accuracyYards();
    if(status&&!busy)status.textContent=accuracy===null?'Waiting for GPS…':`GPS accuracy ±${accuracy} yd${accuracy>25?' · wait for a stronger fix if possible':''}`;
  }

  function sync(){
    injectStyle();
    if(inRound()){
      if(!document.querySelector('.pf-shot-tracker'))shell();
      ensureWatch();updateUi();
    }else{
      document.querySelector('.pf-shot-tracker')?.remove();
      stopWatch();origin=null;originHole=null;shotNumber=1;
    }
  }
  let pending=false;
  new MutationObserver(()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;sync();});}).observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')sync();else stopWatch();});
  window.addEventListener('pagehide',stopWatch);
  setTimeout(sync,250);
})();
