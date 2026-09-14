/* ParFolio v277 — compact glass GPS shot tracker; isolated from the stable v271 map renderer. */
(function(){
  const STORE='parfolioShotHistoryV274';
  let watchId=null,lastFix=null,origin=null,originHole=null,shotNumber=1,busy=false,open=false;

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
  const clubList=()=>{try{return [...new Set(Array.isArray(CLUBS)?CLUBS.filter(Boolean):[])];}catch{return[];}};
  const courseName=()=>{try{return String(s?.courseName||s?.course?.name||s?.name||document.querySelector('.round-course-name,h1')?.textContent||'Round').trim();}catch{return'Round';}};
  const accuracyYards=()=>Number.isFinite(lastFix?.accuracy)?Math.round(lastFix.accuracy*1.0936133):null;
  const liveYards=()=>valid(origin)&&valid(lastFix)?Math.round(yardsBetween(origin,lastFix)):0;

  function readHistory(){try{const value=JSON.parse(localStorage.getItem(STORE)||'[]');return Array.isArray(value)?value:[];}catch{return[];}}
  function saveRecord(record){try{const rows=readHistory();rows.push(record);localStorage.setItem(STORE,JSON.stringify(rows.slice(-500)));}catch{}}
  window.getParFolioShotHistory=readHistory;

  async function syncRecord(record){
    try{
      if(typeof db==='undefined'||!db||typeof currentUser==='undefined'||!currentUser?.id)return;
      const cloud={id:record.id,user_id:currentUser.id,round_id:typeof s!=='undefined'&&s?.sharedRoundId?s.sharedRoundId:null,course_name:record.course||'',hole:record.hole,shot_number:record.shot,club:record.club||null,distance_yards:record.distance_yards,origin_lat:record.origin?.lat??null,origin_lng:record.origin?.lng??null,landing_lat:record.landing?.lat??null,landing_lng:record.landing?.lng??null,origin_accuracy_m:record.origin?.accuracy??null,landing_accuracy_m:record.landing?.accuracy??null,created_at:record.saved_at};
      const {error}=await db.from('golfer_shots').upsert(cloud,{onConflict:'id'});
      if(error)console.warn('[ParFolio Shot Tracking] cloud sync:',error.message||error);
    }catch(error){console.warn('[ParFolio Shot Tracking] cloud sync:',error?.message||error)}
  }

  function positionObject(pos){return{lat:Number(pos.coords.latitude),lng:Number(pos.coords.longitude),accuracy:Number(pos.coords.accuracy)||null,time:new Date(pos.timestamp||Date.now()).toISOString()};}
  function updatePosition(pos){lastFix=positionObject(pos);updateUi();}
  function positionError(error){const status=document.querySelector('.pf-shot-status');if(status)status.textContent=error?.message||'GPS unavailable';}
  function ensureWatch(){if(watchId!==null||!navigator.geolocation)return;watchId=navigator.geolocation.watchPosition(updatePosition,positionError,{enableHighAccuracy:true,maximumAge:1500,timeout:15000});}
  function stopWatch(){if(watchId!==null&&navigator.geolocation){navigator.geolocation.clearWatch(watchId);watchId=null;}}
  function getFix(){return new Promise((resolve,reject)=>{if(valid(lastFix)&&Date.now()-Date.parse(lastFix.time)<10000)return resolve(lastFix);if(!navigator.geolocation)return reject(new Error('Location is not available on this device.'));navigator.geolocation.getCurrentPosition(pos=>{updatePosition(pos);resolve(lastFix);},reject,{enableHighAccuracy:true,maximumAge:0,timeout:15000});});}

  function selectedClub(){return document.querySelector('.pf-shot-club')?.value||'';}
  async function markShot(){
    if(busy)return;busy=true;open=true;updateUi();
    try{const fix=await getFix();origin={...fix};originHole=currentHole();shotNumber=Math.max(1,shotNumber);}
    catch(error){alert(error?.message||'Could not mark your current GPS position.');}
    finally{busy=false;updateUi();}
  }
  async function saveLanding(){
    if(busy||!valid(origin))return;busy=true;open=true;updateUi();
    try{
      const landing=await getFix(),yards=Math.round(yardsBetween(origin,landing)),hole=currentHole(),club=selectedClub(),savedAt=new Date().toISOString();
      const record={id:(crypto?.randomUUID?.()||String(Date.now())),course:courseName(),hole,shot:shotNumber,club:club||null,distance_yards:yards,origin:{lat:origin.lat,lng:origin.lng,accuracy:origin.accuracy||null,time:origin.time},landing:{lat:landing.lat,lng:landing.lng,accuracy:landing.accuracy||null,time:landing.time},saved_at:savedAt};
      saveRecord(record);syncRecord(record);origin={...landing};originHole=hole;shotNumber+=1;
      const status=document.querySelector('.pf-shot-status');if(status)status.textContent=`Saved ${yards} yd${club?` · ${club}`:''}. Next shot starts here.`;
      setTimeout(()=>{open=false;updateUi();},900);
    }catch(error){alert(error?.message||'Could not save the landing position.');}
    finally{busy=false;updateUi();}
  }
  function resetShot(){origin=null;originHole=null;shotNumber=1;updateUi();}
  function toggleOpen(){open=!open;updateUi();}

  function injectStyle(){
    if(document.getElementById('pf-shot-v277-style'))return;
    document.getElementById('pf-shot-v274-style')?.remove();
    const style=document.createElement('style');style.id='pf-shot-v277-style';style.textContent=`
      .pf-shot-tracker{position:fixed;left:max(10px,env(safe-area-inset-left));bottom:calc(86px + env(safe-area-inset-bottom));z-index:9500;display:flex;align-items:stretch;width:58px;max-width:calc(100vw - 20px);height:74px;color:#fff;font-family:inherit;transition:width .22s ease,height .22s ease,transform .22s ease;filter:drop-shadow(0 10px 24px rgba(0,0,0,.22))}
      .pf-shot-tracker.is-open{width:min(242px,calc(100vw - 20px));height:196px}
      .pf-shot-toggle,.pf-shot-panel{background:linear-gradient(155deg,rgba(25,53,43,.58),rgba(9,26,21,.72));border:1px solid rgba(255,255,255,.25);box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 8px 26px rgba(0,0,0,.18);-webkit-backdrop-filter:blur(18px) saturate(145%);backdrop-filter:blur(18px) saturate(145%)}
      .pf-shot-toggle{width:58px;min-width:58px;height:74px;align-self:flex-end;border-radius:18px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;color:#fff;padding:0;border-color:rgba(255,255,255,.28);font:800 11px/1 inherit;text-shadow:0 1px 5px rgba(0,0,0,.35)}
      .pf-shot-toggle .pf-shot-pin{font-size:16px;line-height:1}.pf-shot-toggle .pf-shot-mini{font-size:12px;line-height:1.05}.pf-shot-toggle .pf-shot-chev{font-size:15px;opacity:.86;line-height:1;margin-top:2px}
      .pf-shot-tracker.is-open .pf-shot-toggle{height:196px;border-radius:18px 0 0 18px;border-right-color:rgba(255,255,255,.08)}
      .pf-shot-panel{display:none;min-width:0;flex:1;border-left:0;border-radius:0 18px 18px 0;padding:12px 12px 10px;overflow:hidden}
      .pf-shot-tracker.is-open .pf-shot-panel{display:flex;flex-direction:column}
      .pf-shot-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}.pf-shot-copy{min-width:0}.pf-shot-copy b{display:block;font-size:13px;letter-spacing:.1px}.pf-shot-copy small{display:block;font-size:9px;opacity:.72;margin-top:2px}
      .pf-shot-distance{margin-top:8px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.07);border-radius:12px;min-height:48px;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:900;letter-spacing:-.5px}.pf-shot-distance small{font-size:11px;font-weight:700;opacity:.76;margin-left:3px}
      .pf-shot-club{margin-top:7px;width:100%;min-height:30px;border-radius:10px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.10);color:#fff;padding:0 8px;font:700 10px/1 inherit;outline:none}.pf-shot-club option{color:#173b2e;background:#fff}
      .pf-shot-actions{display:grid;grid-template-columns:1.45fr .9fr;gap:7px;margin-top:7px}.pf-shot-actions button{min-height:34px;border-radius:11px;border:1px solid rgba(255,255,255,.18);font:800 11px/1 inherit}.pf-shot-primary{background:linear-gradient(180deg,#f7d37e,#eebc55);color:#173b2e;border-color:rgba(255,225,145,.72)!important;box-shadow:0 4px 12px rgba(222,171,62,.18)}.pf-shot-reset{background:rgba(255,255,255,.09);color:#fff}.pf-shot-actions button:disabled{opacity:.55}
      .pf-shot-status{margin-top:auto;padding-top:6px;font-size:8.5px;opacity:.72;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      @media(max-width:430px){.pf-shot-tracker{bottom:calc(82px + env(safe-area-inset-bottom))}.pf-shot-tracker.is-open{width:min(226px,calc(100vw - 20px));height:188px}.pf-shot-tracker.is-open .pf-shot-toggle{height:188px}.pf-shot-panel{padding:10px}.pf-shot-distance{min-height:44px;font-size:22px}}
    `;document.head.appendChild(style);
  }

  function shell(){
    const el=document.createElement('section');el.className='pf-shot-tracker';el.setAttribute('aria-label','Shot Tracking');
    el.innerHTML=`<button type="button" class="pf-shot-toggle" aria-label="Open shot tracking" aria-expanded="false"><span class="pf-shot-pin">📍</span><span class="pf-shot-mini">SHOT</span><span class="pf-shot-chev">⌃</span></button><div class="pf-shot-panel"><div class="pf-shot-head"><div class="pf-shot-copy"><b>Shot Tracking</b><small class="pf-shot-line">Hole ${currentHole()}</small></div></div><div class="pf-shot-distance">—<small>yd</small></div><select class="pf-shot-club" aria-label="Club used"><option value="">Club (optional)</option>${clubList().map(c=>`<option value="${escHtml(c)}">${escHtml(c)}</option>`).join('')}</select><div class="pf-shot-actions"><button type="button" class="pf-shot-primary">Mark Shot</button><button type="button" class="pf-shot-reset">Reset</button></div><div class="pf-shot-status">Waiting for GPS…</div></div>`;
    el.querySelector('.pf-shot-toggle').addEventListener('click',toggleOpen);
    el.querySelector('.pf-shot-primary').addEventListener('click',()=>valid(origin)?saveLanding():markShot());
    el.querySelector('.pf-shot-reset').addEventListener('click',resetShot);
    document.body.appendChild(el);return el;
  }

  function updateUi(){
    const el=document.querySelector('.pf-shot-tracker');if(!el)return;
    const hole=currentHole();if(origin&&originHole!==hole){origin=null;originHole=null;shotNumber=1;}
    el.classList.toggle('is-open',open);
    const toggle=el.querySelector('.pf-shot-toggle'),chev=el.querySelector('.pf-shot-chev'),mini=el.querySelector('.pf-shot-mini'),distance=el.querySelector('.pf-shot-distance'),line=el.querySelector('.pf-shot-line'),primary=el.querySelector('.pf-shot-primary'),status=el.querySelector('.pf-shot-status');
    toggle?.setAttribute('aria-expanded',open?'true':'false');toggle?.setAttribute('aria-label',open?'Collapse shot tracking':'Open shot tracking');if(chev)chev.textContent=open?'⌄':'⌃';
    if(valid(origin)){
      const yards=liveYards();distance.innerHTML=`${yards}<small>yd</small>`;if(mini)mini.textContent=`${yards} yd`;line.textContent=`Hole ${hole} · Shot ${shotNumber}`;primary.textContent=busy?'Locating…':'Save Landing';
    }else{
      distance.innerHTML='—<small>yd</small>';if(mini)mini.textContent='SHOT';line.textContent=`Hole ${hole} · mark your ball`;primary.textContent=busy?'Locating…':'Mark Shot';
    }
    primary.disabled=busy;const accuracy=accuracyYards();if(status&&!busy)status.textContent=accuracy===null?'Waiting for GPS…':`GPS ±${accuracy} yd${accuracy>25?' · weak fix':''}`;
  }

  function sync(){
    injectStyle();
    if(inRound()){if(!document.querySelector('.pf-shot-tracker'))shell();ensureWatch();updateUi();}
    else{document.querySelector('.pf-shot-tracker')?.remove();stopWatch();origin=null;originHole=null;shotNumber=1;open=false;}
  }
  let pending=false;new MutationObserver(()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;sync();});}).observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')sync();else stopWatch();});window.addEventListener('pagehide',stopWatch);setTimeout(sync,250);
})();
