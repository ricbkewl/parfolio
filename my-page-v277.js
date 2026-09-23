/* ParFolio v276 — premium My Page golfer journey dashboard. */
(function(){
  let loadSequence=0;
  const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num=v=>Number.isFinite(Number(v))?Number(v):null;
  const mean=values=>values.length?values.reduce((a,b)=>a+b,0)/values.length:null;
  const pct=(yes,total)=>total?Math.round(yes/total*100):null;
  const fmtDate=value=>{try{return new Date(value).toLocaleDateString([],{month:'short',day:'numeric',year:'numeric'})}catch{return''}};
  const uid=()=>typeof currentUser!=='undefined'?currentUser?.id:null;

  function fullName(){return [golferProfile?.first_name,golferProfile?.last_name].filter(Boolean).join(' ').trim()||'Golfer'}
  function avatar(){const name=fullName();try{return typeof avatarMarkup==='function'?avatarMarkup(golferProfile?.avatar_path,name):safe(name[0]||'G')}catch{return safe(name[0]||'G')}}
  function setText(id,value){const el=document.getElementById(id);if(el){el.textContent=String(value);el.classList.remove('pf-page-loading')}}
  window.pfMyPageScroll=id=>document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'});

  function kpi(label,id,detail){return `<div class="pf-page-kpi"><span>${safe(label)}</span><strong id="${id}" class="pf-page-loading">—</strong><em>${safe(detail)}</em></div>`}
  function tile(icon,title,subtitle,action){return `<button class="pf-page-tile" type="button" onclick="${action}"><span class="pf-page-tile-icon">${icon}</span><b>${safe(title)}</b><small>${safe(subtitle)}</small></button>`}
  function record(label,id,detail,detailId='',extra=''){return `<div class="pf-record-card ${extra}"><span>${safe(label)}</span><strong id="${id}" class="pf-page-loading">—</strong><small${detailId?` id="${detailId}"`:''}>${safe(detail)}</small></div>`}

  accountView=function(){
    if(!currentUser){s.v='home';render();return}
    app.innerHTML=`<div class="pf-my-page">
      <section class="pf-page-hero">
        <div class="pf-page-top"><button class="pf-page-back" onclick="goHome()">‹ Home</button><div class="pf-page-brand">ParFolio<small>YOUR GAME · YOUR STORY</small></div><button class="pf-page-edit" onclick="openProfile()">Edit Profile</button></div>
        <div class="pf-page-profile"><div class="pf-page-avatar">${avatar()}</div><div class="pf-page-profile-copy"><small>My Page</small><h1>${safe(fullName())}</h1><b>A record of your golf journey</b><p>“More rounds. More memories. Better golf.”</p></div></div>
      </section>
      <section class="pf-page-kpis">${kpi('Rounds','pfPageRounds','completed')}${kpi('Avg Score','pfPageAverage','full rounds')}${kpi('Best Score','pfPageBest','personal best')}${kpi('Courses','pfPageCourses','unique')}${kpi('Hole in Ones','pfPageHio','career')}</section>
      <div class="pf-page-body">
        ${!golferProfile?'<div class="pf-page-empty">Complete your golfer profile to personalize My Page.</div>':''}
        <div class="pf-page-section-head"><h2>Your Golf</h2><small>PLAY · TRACK · IMPROVE</small></div>
        <div class="pf-page-grid">
          ${tile('▦','Round History','Past rounds, scores and memories','openHistory()')}
          ${tile('↗','Stats & Progress','See how your game is changing',"pfMyPageScroll('pfProgress')")}
          ${tile('⌖','Course History','Courses played and repeat visits',"pfMyPageScroll('pfCourses')")}
          ${tile('♛','Personal Records','Longest drive, best round and more',"pfMyPageScroll('pfRecords')")}
          ${tile('◎','Friends','Connect, message and play together','openMyPageFriends()')}
          ${tile('★','Achievements','Hole in one and career milestones',"pfMyPageScroll('pfRecords')")}
          ${tile('♧','My Clubs','Your clubs and carry distances','openClubs()')}
          ${tile('⚙','Settings','Profile, password and account',"pfMyPageScroll('pfMyPageSettings')")}
        </div>

        <section id="pfProgress"><div class="pf-page-section-head"><h2>Stats & Progress</h2><small>YOUR TREND</small></div><div class="pf-progress-card">
          <div class="pf-progress-main"><div><span id="pfProgressTitle">Building your history…</span><small id="pfProgressDetail">Completed scorecards power your trend.</small></div><strong id="pfProgressValue">—</strong></div>
          <div class="pf-progress-stats"><div><b id="pfFairways">—</b><small>Fairways</small></div><div><b id="pfGir">—</b><small>GIR</small></div><div><b id="pfPutts">—</b><small>Putts / hole</small></div></div>
        </div></section>

        <section id="pfRecords"><div class="pf-page-section-head"><h2>Career Highlights</h2><small>PERSONAL RECORDS</small></div><div class="pf-page-highlights">
          ${record('Longest Drive','pfLongestDrive','GPS tracked','pfLongestDriveDetail')}
          ${record('Longest Putt','pfLongestPutt','Short-putt GPS is not precise enough')}
          ${record('Hole in One','pfHioRecord','No recorded ace yet','pfHioDetail','hole-one')}
          ${record('Best Round','pfBestRecord','Completed scorecards','pfBestDetail')}
          ${record('Total Rounds','pfTotalRecord','And counting')}
        </div></section>

        <section id="pfCourses"><div class="pf-page-section-head"><h2>Course History</h2><small id="pfCourseSummary">LOADING</small></div><div id="pfCourseList" class="pf-page-course-list"><div class="pf-page-empty pf-page-loading">Loading your course history…</div></div></section>
        <section id="pfRecentRounds"><div class="pf-page-section-head"><h2>Recent Rounds</h2><button onclick="openHistory()">View all →</button></div><div id="pfRoundList" class="pf-page-round-list"><div class="pf-page-empty pf-page-loading">Loading your rounds…</div></div></section>
        <section id="pfMyPageSettings"><div class="pf-page-section-head"><h2>Account & Settings</h2><small>PRIVATE</small></div><div class="pf-page-settings"><button onclick="openProfile()">Profile & Picture ›</button><button onclick="openClubs()">My Clubs & Distances ›</button><button onclick="changePassword()">Change Password ›</button>${adminRole==='super_admin'?'<button onclick="promoteCourseAdmin()">Add Course Admin ›</button><button class="pf-native-business-center" onclick="openSponsorBusinessCenter()">Sponsor Business Center ›</button>':''}<button class="danger" onclick="signOutAdmin()">Sign Out</button></div></section>
      </div>
    </div>`;
    loadMyPageData(++loadSequence);
  };

  async function loadMyPageData(seq){
    const userId=uid();if(!userId||typeof db==='undefined')return;
    try{
      const playerRes=await db.from('round_players').select('round_id,joined_at').eq('user_id',userId);
      if(seq!==loadSequence||s.v!=='accountView')return;
      if(playerRes.error)throw playerRes.error;
      const ids=[...new Set((playerRes.data||[]).map(r=>r.round_id).filter(Boolean))];
      const empty=Promise.resolve({data:[],error:null});
      const roundQ=ids.length?db.from('shared_rounds').select('id,course_name,holes,pars,status,created_at,updated_at').in('id',ids).eq('status','complete'):empty;
      const scoreQ=ids.length?db.from('round_scores').select('round_id,hole,strokes').eq('user_id',userId).in('round_id',ids):empty;
      const statsQ=ids.length?db.from('round_hole_stats').select('round_id,hole,putts,fairway_hit,green_in_regulation,chip_shots,sand_shots,penalties').eq('user_id',userId).in('round_id',ids):empty;
      const shotQ=db.from('golfer_shots').select('id,round_id,course_name,hole,shot_number,club,distance_yards,origin_accuracy_m,landing_accuracy_m,created_at').eq('user_id',userId).order('created_at',{ascending:false}).limit(1000);
      const friendQ=db.from('friendships').select('user_a,user_b').or(`user_a.eq.${userId},user_b.eq.${userId}`);
      const [roundRes,scoreRes,statsRes,shotRes,friendRes]=await Promise.all([roundQ,scoreQ,statsQ,shotQ,friendQ]);
      if(seq!==loadSequence||s.v!=='accountView')return;
      renderData(roundRes.data||[],scoreRes.data||[],statsRes.data||[],shotRes.data||[],friendRes.data||[]);
    }catch(error){console.warn('[ParFolio My Page]',error?.message||error);const host=document.getElementById('pfCourseList');if(host)host.innerHTML='<div class="pf-page-empty">Your golf history could not be refreshed right now.</div>'}
  }

  function renderData(rounds,scores,holeStats,cloudShots,friends){
    const roundMap=new Map(rounds.map(r=>[r.id,r]));
    const scoreByRound=new Map();
    for(const row of scores){if(!roundMap.has(row.round_id))continue;const list=scoreByRound.get(row.round_id)||[];list.push(row);scoreByRound.set(row.round_id,list)}
    const complete=[];
    for(const round of rounds){
      const rows=scoreByRound.get(round.id)||[],holes=Number(round.holes)||18;if(rows.length<holes)continue;
      const total=rows.reduce((sum,r)=>sum+(Number(r.strokes)||0),0),pars=Array.isArray(round.pars)?round.pars:[],parTotal=pars.slice(0,holes).reduce((a,b)=>a+(Number(b)||0),0)||null;
      complete.push({round,total,parTotal,relative:parTotal?total-parTotal:null});
    }
    rounds.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));complete.sort((a,b)=>new Date(b.round.created_at)-new Date(a.round.created_at));
    const totals=complete.map(x=>x.total),avg=mean(totals),best=totals.length?Math.min(...totals):null,courses=[...new Set(rounds.map(r=>String(r.course_name||'').trim()).filter(Boolean))];
    const aces=scores.filter(r=>roundMap.has(r.round_id)&&Number(r.strokes)===1).sort((a,b)=>new Date(roundMap.get(b.round_id)?.created_at)-new Date(roundMap.get(a.round_id)?.created_at));
    setText('pfPageRounds',rounds.length);setText('pfPageAverage',avg===null?'—':avg.toFixed(1));setText('pfPageBest',best??'—');setText('pfPageCourses',courses.length);setText('pfPageHio',aces.length);setText('pfTotalRecord',rounds.length);setText('pfBestRecord',best??'—');
    const bestCard=best===null?null:complete.find(x=>x.total===best);setText('pfBestDetail',bestCard?`${bestCard.round.course_name||'Course'}${bestCard.relative===null?'':` · ${bestCard.relative===0?'E':bestCard.relative>0?'+'+bestCard.relative:bestCard.relative}`}`:'No completed scorecard yet');

    const local=typeof window.getParFolioShotHistory==='function'?window.getParFolioShotHistory():[],shotMap=new Map();
    for(const row of cloudShots)shotMap.set(String(row.id),row);
    for(const row of local)if(!shotMap.has(String(row.id)))shotMap.set(String(row.id),{id:row.id,course_name:row.course,hole:row.hole,shot_number:row.shot,club:row.club,distance_yards:row.distance_yards,origin_accuracy_m:row.origin?.accuracy,landing_accuracy_m:row.landing?.accuracy,created_at:row.saved_at});
    const drivers=[...shotMap.values()].filter(x=>/(^|\b)(driver|1\s*wood)(\b|$)/i.test(String(x.club||''))&&num(x.distance_yards)!==null&&Number(x.distance_yards)>=50&&Number(x.distance_yards)<=450&&(num(x.origin_accuracy_m)===null||Number(x.origin_accuracy_m)<=20)&&(num(x.landing_accuracy_m)===null||Number(x.landing_accuracy_m)<=20)).sort((a,b)=>Number(b.distance_yards)-Number(a.distance_yards));
    const longest=drivers[0];setText('pfLongestDrive',longest?`${longest.distance_yards} yd`:'—');setText('pfLongestDriveDetail',longest?`${longest.club||'Driver'} · ${longest.course_name||'Tracked shot'}${longest.hole?` · Hole ${longest.hole}`:''}`:'Track a Driver shot to set this record');setText('pfLongestPutt','Not tracked');
    const ace=aces[0],aceRound=ace?roundMap.get(ace.round_id):null;setText('pfHioRecord',aces.length||'0');setText('pfHioDetail',ace?`${aceRound?.course_name||'Course'} · Hole ${ace.hole} · ${fmtDate(aceRound?.created_at)}`:'No recorded ace yet');
    renderProgress(complete,holeStats);renderCourses(rounds,complete);renderRecent(complete,rounds);
    const friendCount=friends.length;for(const button of document.querySelectorAll('.pf-page-tile'))if(button.querySelector('b')?.textContent==='Friends'){const small=button.querySelector('small');if(small)small.textContent=friendCount?`${friendCount} friend${friendCount===1?'':'s'} · connect and play together`:'Connect, message and play together'}
    document.querySelectorAll('.pf-page-loading').forEach(el=>el.classList.remove('pf-page-loading'));
  }

  function renderProgress(cards,stats){
    const recent=cards.slice(0,5).map(x=>x.total),previous=cards.slice(5,10).map(x=>x.total),ra=mean(recent),pa=mean(previous);let title='Keep building your history',detail='Complete scored rounds to unlock a trend.',value='—';
    if(ra!==null&&pa!==null){const delta=ra-pa;title=delta<0?'Scoring average improving':delta>0?'Room to gain strokes':'Scoring average holding steady';detail=`Last ${recent.length} rounds: ${ra.toFixed(1)} · previous ${previous.length}: ${pa.toFixed(1)}`;value=delta<0?`↓ ${Math.abs(delta).toFixed(1)}`:delta>0?`↑ ${delta.toFixed(1)}`:'0.0'}else if(ra!==null){title='Current scoring average';detail=`Based on ${recent.length} completed scorecard${recent.length===1?'':'s'}.`;value=ra.toFixed(1)}
    setText('pfProgressTitle',title);setText('pfProgressDetail',detail);setText('pfProgressValue',value);
    const fair=stats.filter(x=>typeof x.fairway_hit==='boolean'),gir=stats.filter(x=>typeof x.green_in_regulation==='boolean'),putts=stats.filter(x=>Number.isInteger(x.putts));
    const fp=pct(fair.filter(x=>x.fairway_hit).length,fair.length),gp=pct(gir.filter(x=>x.green_in_regulation).length,gir.length),pp=putts.length?mean(putts.map(x=>Number(x.putts))):null;
    setText('pfFairways',fp===null?'—':fp+'%');setText('pfGir',gp===null?'—':gp+'%');setText('pfPutts',pp===null?'—':pp.toFixed(1));
  }

  function renderCourses(rounds,cards){
    const host=document.getElementById('pfCourseList');if(!host)return;const groups=new Map();
    for(const r of rounds){const name=String(r.course_name||'Unknown Course').trim()||'Unknown Course',g=groups.get(name)||{name,count:0,last:r.created_at,scores:[]};g.count++;if(new Date(r.created_at)>new Date(g.last))g.last=r.created_at;groups.set(name,g)}
    for(const c of cards){const name=String(c.round.course_name||'Unknown Course').trim()||'Unknown Course';groups.get(name)?.scores.push(c.total)}
    const list=[...groups.values()].sort((a,b)=>b.count-a.count||new Date(b.last)-new Date(a.last));setText('pfCourseSummary',`${list.length} COURSE${list.length===1?'':'S'} · ${rounds.length} ROUND${rounds.length===1?'':'S'}`);
    host.innerHTML=list.length?list.slice(0,8).map(g=>{const av=mean(g.scores),best=g.scores.length?Math.min(...g.scores):null;return `<div class="pf-page-row"><div><b>${safe(g.name)}</b><small>${g.count} round${g.count===1?'':'s'} · last played ${safe(fmtDate(g.last))}</small></div><strong>${best??'—'}<small>${av===null?'No full score':`best · ${av.toFixed(1)} avg`}</small></strong></div>`}).join(''):'<div class="pf-page-empty">Your course history will appear after you complete a round.</div>';
  }

  function renderRecent(cards,rounds){
    const host=document.getElementById('pfRoundList');if(!host)return;
    const cardMap=new Map(cards.map(c=>[c.round.id,c]));
    host.innerHTML=rounds.length?rounds.slice(0,5).map(r=>{const c=cardMap.get(r.id),rel=c?.relative,relText=rel===null||rel===undefined?'':rel===0?'E':rel>0?'+'+rel:String(rel);return `<button type="button" class="pf-page-row" onclick="openHistory()"><div><b>${safe(r.course_name||'Golf Round')}</b><small>${safe(fmtDate(r.created_at))} · ${Number(r.holes)||18} holes</small></div><strong>${c?.total??'—'}<small>${c?`${relText||'score'} · completed`:'scorecard incomplete'}</small></strong></button>`}).join(''):'<div class="pf-page-empty">Complete a round and it will become part of your story here.</div>';
  }

  function loadStyle(href){if([...document.styleSheets].some(s=>String(s.href||'').includes(href.split('?')[0])))return;const l=document.createElement('link');l.rel='stylesheet';l.href=href;document.head.appendChild(l)}
  function loadScript(src){return new Promise((resolve,reject)=>{if(typeof window.openParFolioSocial==='function')return resolve();const existing=[...document.scripts].find(s=>String(s.src||'').includes(src.split('?')[0]));if(existing){existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',reject,{once:true});return}const script=document.createElement('script');script.src=src;script.onload=resolve;script.onerror=reject;document.body.appendChild(script)})}
  window.openMyPageFriends=async function(){try{if(typeof window.openParFolioSocial!=='function'){loadStyle('social-v208.css?v=276');loadStyle('social-v211.css?v=276');await loadScript('social-v208.js?v=276');await loadScript('social-v211.js?v=276')}if(typeof window.openParFolioSocial==='function')window.openParFolioSocial('friends');else throw new Error('Friends is unavailable right now.')}catch(error){alert(error?.message||'Friends could not be opened.')}};
})();
