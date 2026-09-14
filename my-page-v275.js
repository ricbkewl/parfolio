/* ParFolio v275 — premium My Page golfer journey dashboard. */
(function(){
  let loadSequence=0;
  const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num=v=>Number.isFinite(Number(v))?Number(v):null;
  const fmtDate=value=>{try{return new Date(value).toLocaleDateString([],{month:'short',day:'numeric',year:'numeric'})}catch{return''}};
  const mean=values=>values.length?values.reduce((a,b)=>a+b,0)/values.length:null;
  const pct=(yes,total)=>total?Math.round(yes/total*100):null;
  const currentUid=()=>typeof currentUser!=='undefined'?currentUser?.id:null;

  function avatar(){
    const full=[golferProfile?.first_name,golferProfile?.last_name].filter(Boolean).join(' ').trim()||'Golfer';
    try{return typeof avatarMarkup==='function'?avatarMarkup(golferProfile?.avatar_path,full):safe((full[0]||'G').toUpperCase())}catch{return safe((full[0]||'G').toUpperCase())}
  }
  function fullName(){return [golferProfile?.first_name,golferProfile?.last_name].filter(Boolean).join(' ').trim()||'Golfer'}
  function scrollToPage(id){document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'})}
  window.pfMyPageScroll=scrollToPage;

  function statKpi(label,id,detail=''){
    return `<div class="pf-page-kpi"><span>${safe(label)}</span><strong id="${id}" class="pf-page-loading">—</strong>${detail?`<em>${safe(detail)}</em>`:''}</div>`;
  }
  function tile(icon,title,subtitle,action){return `<button class="pf-page-tile" type="button" onclick="${action}"><span class="pf-page-tile-icon">${icon}</span><b>${safe(title)}</b><small>${safe(subtitle)}</small></button>`}
  function record(label,id,detail,idDetail='',extra=''){return `<div class="pf-record-card ${extra}"><span>${safe(label)}</span><strong id="${id}" class="pf-page-loading">—</strong><small ${idDetail?`id="${idDetail}"`:''}>${safe(detail)}</small></div>`}

  accountView=function(){
    if(!currentUser){s.v='home';render();return}
    const name=fullName();
    app.innerHTML=`<div class="pf-my-page">
      <section class="pf-page-hero">
        <div class="pf-page-top"><button class="pf-page-back" onclick="goHome()">‹ Home</button><div class="pf-page-brand">ParFolio<small>YOUR GAME · YOUR STORY</small></div><button class="pf-page-edit" onclick="openProfile()">Edit Profile</button></div>
        <div class="pf-page-profile"><div class="pf-page-avatar">${avatar()}</div><div class="pf-page-profile-copy"><small>My Page</small><h1>${safe(name)}</h1><b>A record of your golf journey</b><p>“More rounds. More memories. Better golf.”</p></div></div>
      </section>
      <section class="pf-page-kpis">
        ${statKpi('Rounds','pfPageRounds','completed')}${statKpi('Avg Score','pfPageAverage','full rounds')}${statKpi('Best Score','pfPageBest','personal best')}${statKpi('Courses','pfPageCourses','unique')}${statKpi('Hole in Ones','pfPageHio','career')}
      </section>
      <div class="pf-page-body">
        ${!golferProfile?'<div class="pf-page-empty">Complete your golfer profile to personalize My Page.</div>':''}
        <div class="pf-page-section-head"><h2>Your Golf</h2><small>PLAY · TRACK · IMPROVE</small></div>
        <div class="pf-page-grid">
          ${tile('▦','Round History','Past rounds, scores and memories',"openHistory()")}
          ${tile('↗','Stats & Progress','See how your game is changing',"pfMyPageScroll('pfProgress')")}
          ${tile('⌖','Course History','Courses played and repeat visits',"pfMyPageScroll('pfCourses')")}
          ${tile('♛','Personal Records','Longest drive, best round and more',"pfMyPageScroll('pfRecords')")}
          ${tile('◎','Friends','Connect, message and play together',"openMyPageFriends()")}
          ${tile('★','Achievements','Hole in one and career milestones',"pfMyPageScroll('pfRecords')")}
          ${tile('♧','My Clubs','Your clubs and carry distances',"openClubs()")}
          ${tile('⚙','Settings','Profile, password and account',"pfMyPageScroll('pfMyPageSettings')")}
        </div>

        <section id="pfProgress">
          <div class="pf-page-section-head"><h2>Stats & Progress</h2><small>YOUR TREND</small></div>
          <div class="pf-progress-card">
            <div class="pf-progress-main"><div><span id="pfProgressTitle">Building your history…</span><small id="pfProgressDetail">Completed scorecards power your trend.</small></div><strong id="pfProgressValue">—</strong></div>
            <div class="pf-progress-stats"><div><b id="pfFairways">—</b><small>Fairways</small></div><div><b id="pfGir">—</b><small>GIR</small></div><div><b id="pfPutts">—</b><small>Putts / hole</small></div></div>
          </div>
        </section>

        <section id="pfRecords">
          <div class="pf-page-section-head"><h2>Career Highlights</h2><small>PERSONAL RECORDS</small></div>
          <div class="pf-page-highlights">
            ${record('Longest Drive','pfLongestDrive','GPS tracked','pfLongestDriveDetail')}
            ${record('Longest Putt','pfLongestPutt','Short-putt GPS is not precise enough')}
            ${record('Hole in One','pfHioRecord','No recorded ace yet','pfHioDetail','hole-one')}
            ${record('Best Round','pfBestRecord','Completed scorecards','pfBestDetail')}
            ${record('Total Rounds','pfTotalRecord','And counting')}
          </div>
        </section>

        <section id="pfCourses">
          <div class="pf-page-section-head"><h2>Course History</h2><small id="pfCourseSummary">LOADING</small></div>
          <div id="pfCourseList" class="pf-page-course-list"><div class="pf-page-empty pf-page-loading">Loading your course history…</div></div>
        </section>

        <section id="pfRecentRounds">
          <div class="pf-page-section-head"><h2>Recent Rounds</h2><button onclick="openHistory()">View all →</button></div>
          <div id="pfRoundList" class="pf-page-round-list"><div class="pf-page-empty pf-page-loading">Loading your rounds…</div></div>
        </section>

        <section id="pfMyPageSettings">
          <div class="pf-page-section-head"><h2>Account & Settings</h2><small>PRIVATE</small></div>
          <div class="pf-page-settings">
            <button onclick="openProfile()">Profile & Picture ›</button><button onclick="openClubs()">My Clubs & Distances ›</button><button onclick="changePassword()">Change Password ›</button>${adminRole==='super_admin'?'<button onclick="promoteCourseAdmin()">Add Course Admin ›</button>':''}<button class="danger" onclick="signOutAdmin()">Sign Out</button>
          </div>
        </section>
      </div>
    </div>`;
    const seq=++loadSequence;loadMyPageData(seq);
  };

  async function loadMyPageData(seq){
    const uid=currentUid();if(!uid||typeof db==='undefined')return;
    try{
      const playerRes=await db.from('round_players').select('round_id,joined_at').eq('user_id',uid);
      if(seq!==loadSequence||s.v!=='accountView')return;
      if(playerRes.error)throw playerRes.error;
      const ids=[...new Set((playerRes.data||[]).map(r=>r.round_id).filter(Boolean))];
      let rounds=[],scores=[],holeStats=[],cloudShots=[],friends=[];
      const queries=[];
      if(ids.length){
        queries.push(db.from('shared_rounds').select('id,course_name,holes,pars,status,created_at,updated_at').in('id',ids).eq('status','complete'));
        queries.push(db.from('round_scores').select('round_id,hole,strokes').eq('user_id',uid).in('round_id',ids));
        queries.push(db.from('round_hole_stats').select('round_id,hole,putts,fairway_hit,green_in_regulation,chip_shots,sand_shots,penalties').eq('user_id',uid).in('round_id',ids));
      }else queries.push(Promise.resolve({data:[]}),Promise.resolve({data:[]}),Promise.resolve({data:[]}));
      queries.push(db.from('golfer_shots').select('id,round_id,course_name,hole,shot_number,club,distance_yards,origin_accuracy_m,landing_accuracy_m,created_at').eq('user_id',uid).order('created_at',{ascending:false}).limit(1000));
      queries.push(db.from('friendships').select('user_a,user_b').or(`user_a.eq.${uid},user_b.eq.${uid}`));
      const [rRes,sRes,hRes,shotRes,friendRes]=await Promise.all(queries);
      rounds=rRes.data||[];scores=sRes.data||[];holeStats=hRes.data||[];cloudShots=shotRes.data||[];friends=friendRes.data||[];
      if(seq!==loadSequence||s.v!=='accountView')return;
      renderData(rounds,scores,holeStats,cloudShots,friends);
    }catch(error){
      console.warn('[ParFolio My Page]',error?.message||error);
      document.getElementById('pfCourseList')?.replaceChildren(Object.assign(document.createElement('div'),{className:'pf-page-empty',textContent:'Your golf history could not be refreshed right now.'}));
    }
  }

  function renderData(rounds,scores,holeStats,cloudShots,friends){
    const roundMap=new Map(rounds.map(r=>[r.id,r]));
    const scoreByRound=new Map();for(const row of scores){if(!roundMap.has(row.round_id))continue;const list=scoreByRound.get(row.round_id)||[];list.push(row);scoreByRound.set(row.round_id,list)}
    const completedScorecards=[];
    for(const round of rounds){const rows=scoreByRound.get(round.id)||[],holes=Number(round.holes)||18;if(rows.length<holes)continue;const total=rows.reduce((sum,r)=>sum+(Number(r.strokes)||0),0);const pars=Array.isArray(round.pars)?round.pars:[];const parTotal=pars.slice(0,holes).reduce((a,b)=>a+(Number(b)||0),0)||null;completedScorecards.push({round,total,parTotal,relative:parTotal?total-parTotal:null})}
    completedScorecards.sort((a,b)=>new Date(b.round.created_at)-new Date(a.round.created_at));
    rounds.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));

    const totals=completedScorecards.map(x=>x.total),avg=mean(totals),best=totals.length?Math.min(...totals):null,courseNames=[...new Set(rounds.map(r=>String(r.course_name||'').trim()).filter(Boolean))];
    const hioRows=scores.filter(r=>roundMap.has(r.round_id)&&Number(r.strokes)===1).sort((a,b)=>new Date(roundMap.get(b.round_id)?.created_at)-new Date(roundMap.get(a.round_id)?.created_at));
    setText('pfPageRounds',rounds.length);setText('pfPageAverage',avg===null?'—':avg.toFixed(1));setText('pfPageBest',best??'—');setText('pfPageCourses',courseNames.length);setText('pfPageHio',hioRows.length);
    setText('pfTotalRecord',rounds.length);
    setText('pfBestRecord',best??'—');
    const bestCard=best===null?null:completedScorecards.find(x=>x.total===best);setText('pfBestDetail',bestCard?`${bestCard.round.course_name||'Course'}${bestCard.relative===null?'':` · ${bestCard.relative===0?'E':bestCard.relative>0?'+'+bestCard.relative:bestCard.relative}`}`:'No completed scorecard yet');

    const local=typeof window.getParFolioShotHistory==='function'?window.getParFolioShotHistory():[];
    const shotMap=new Map();for(const row of cloudShots)shotMap.set(String(row.id),row);for(const row of local){if(!shotMap.has(String(row.id)))shotMap.set(String(row.id),{id:row.id,course_name:row.course,hole:row.hole,shot_number:row.shot,club:row.club,distance_yards:row.distance_yards,origin_accuracy_m:row.origin?.accuracy,landing_accuracy_m:row.landing?.accuracy,created_at:row.saved_at})}
    const drivers=[...shotMap.values()].filter(x=>/(^|\b)(driver|1\s*wood)(\b|$)/i.test(String(x.club||''))&&num(x.distance_yards)!==null&&Number(x.distance_yards)>=50&&Number(x.distance_yards)<=450&&(!num(x.origin_accuracy_m)||Number(x.origin_accuracy_m)<=20)&&(!num(x.landing_accuracy_m)||Number(x.landing_accuracy_m)<=20)).sort((a,b)=>Number(b.distance_yards)-Number(a.distance_yards));
    const longest=drivers[0];setText('pfLongestDrive',longest?`${longest.distance_yards} yd`:'—');setText('pfLongestDriveDetail',longest?`${longest.club||'Driver'} · ${longest.course_name||'Tracked shot'}${longest.hole?` · Hole ${longest.hole}`:''}`:'Track a Driver shot to set this record');
    setText('pfLongestPutt','Not tracked');

    setText('pfHioRecord',hioRows.length||'0');const latestAce=hioRows[0],aceRound=latestAce?roundMap.get(latestAce.round_id):null;setText('pfHioDetail',latestAce?`${aceRound?.course_name||'Course'} · Hole ${latestAce.hole} · ${fmtDate(aceRound?.created_at)}`:'No recorded ace yet');
    renderProgress(completedScorecards,holeStats);
    renderCourses(rounds,completedScorecards);
    renderRecent(completedScorecards,rounds);
    const friendCount=friends.length;document.querySelectorAll('.pf-page-tile').forEach(button=>{if(button.querySelector('b')?.textContent==='Friends'){const small=button.querySelector('small');if(small)small.textContent=friendCount?`${friendCount} friend${friendCount===1?'':'s'} · connect and play together`:'Connect, message and play together'}});
    document.querySelectorAll('.pf-page-loading').forEach(el=>el.classList.remove('pf-page-loading'));
  }

  function renderProgress(cards,stats){
    const recent=cards.slice(0,5).map(x=>x.total),previous=cards.slice(5,10).map(x=>x.total),recentAvg=mean(recent),previousAvg=mean(previous);
    let title='Keep building your history',detail='Complete scored rounds to unlock a trend.',value='—';
    if(recentAvg!==null&&previousAvg!==null){const delta=recentAvg-previousAvg;value=`${Math.abs(delta).toFixed(1)}`;title=delta<0?'Scoring average improving':delta>0?'Room to gain strokes':'Scoring average holding steady';detail=`Last ${recent.length} rounds: ${recentAvg.toFixed(1)} · previous ${previous.length}: ${previousAvg.toFixed(1)}`;if(delta<0)value=`↓ ${Math.abs(delta).toFixed(1)}`;else if(delta>0)value=`↑ ${delta.toFixed(1)}`;else value='0.0'}else if(recentAvg!==null){title='Current scoring average';detail=`Based on ${recent.length} completed scorecard${recent.length===1?'':'s'}.`;value=recentAvg.toFixed(1)}
    setText('pfProgressTitle',title);setText('pfProgressDetail',detail);setText('pfProgressValue',value);
    const fair=stats.filter(x=>typeof x.fairway_hit==='boolean'),gir=stats.filter(x=>typeof x.green_in_regulation==='boolean'),putts=stats.filter(x=>Number.isInteger(x.putts));
    const fairP=pct(fair.filter(x=>x.fairway_hit).length,fair.length),girP=pct(gir.filter(x=>x.green_in_regulation).length,gir.length),puttAvg=putts.length?mean(putts.map(x=>Number(x.putts))):null;
    setText('pfFairways',fairP===null?'—':fairP+'%');setText('pfGir',girP===null?'—':girP+'%');setText('pfPutts',puttAvg===null?'—':puttAvg.toFixed(1));
  }

  function renderCourses(rounds,cards){
    const host=document.getElementById('pfCourseList');if(!host)return;const groups=new Map();
    for(const r of rounds){const name=String(r.course_name||'Unknown Course').trim()||'Unknown Course';const g=groups.get(name)||{name,count:0,last:r.created_at,scores:[]};g.count++;if(new Date(r.created_at)>new Date(g.last))g.last=r.created_at;groups.set(name,g)}
    for(const c of cards){const name=String(c.round.course_name||'Unknown Course').trim()||'Unknown Course';groups.get(name)?.scores.push(c.total)}
    const list=[...groups.values()].sort((a,b)=>b.count-a.count||new Date(b.last)-new Date(a.last));setText('pfCourseSummary',`${list.length} COURSE${list.length===1?'':'S'} · ${rounds.length} ROUND${rounds.length===1?'':'S'}`);
    host.innerHTML=list.length?list.slice(0,8).map(g=>{const av=mean(g.scores),best=g.scores.length?Math.min(...g.scores):null;return `<div class="pf-page-row"><div><b>${safe(g.name)}</b><small>${g.count} round${g.count===1?'':'s'} · last played ${safe(fmtDate(g.last))}</small></div><strong>${best??'—'}<small>${av===null?'No full score':`best · ${av.toFixed(1)} avg`}</small></strong></div>`}).join(''):'<div class="pf-page-empty">Your course history will appear after you complete a round.</div>';
  }

  function renderRecent(cards,rounds){
    const host=document.getElementById('pfRoundList');if(!host)return,cardMap=new Map(cards.map(c=>[c.round.id,c]));
    host.innerHTML=rounds.length?rounds.slice(0,5).map(r=>{const c=cardMap.get(r.id),rel=c?.relative;const relText=rel===null||rel===undefined?'':rel===0?'E':rel>0?'+'+rel:String(rel);return `<button type="button" class="pf-page-row" onclick="openHistory()"><div><b>${safe(r.course_name||'Golf Round')}</b><small>${safe(fmtDate(r.created_at))} · ${Number(r.holes)||18} holes</small></div><strong>${c?.total??'—'}<small>${c?`${relText||'score'} · completed`:'scorecard incomplete'}</small></strong></button>`}).join(''):'<div class="pf-page-empty">Complete a round and it will become part of your story here.</div>';
  }
  function setText(id,value){const el=document.getElementById(id);if(el){el.textContent=String(value);el.classList.remove('pf-page-loading')}}

  function loadScript(src){return new Promise((resolve,reject)=>{const existing=[...document.scripts].find(s=>s.src.includes(src));if(existing){if(existing.dataset.pfLoaded==='1'||typeof window.openParFolioSocial==='function')return resolve();existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',reject,{once:true});return}const script=document.createElement('script');script.src=src;script.dataset.pfLoaded='1';script.onload=resolve;script.onerror=reject;document.body.appendChild(script)})}
  function loadStyle(href){if([...document.styleSheets].some(s=>String(s.href||'').includes(href)))return;const link=document.createElement('link');link.rel='stylesheet';link.href=href;document.head.appendChild(link)}
  window.openMyPageFriends=async function(){
    try{
      if(typeof window.openParFolioSocial!=='function'){
        loadStyle('social-v208.css?v=275');loadStyle('social-v211.css?v=275');await loadScript('social-v208.js?v=275');await loadScript('social-v211.js?v=275');
      }
      if(typeof window.openParFolioSocial==='function')window.openParFolioSocial('friends');else throw new Error('Friends is unavailable right now.');
    }catch(error){alert(error?.message||'Friends could not be opened.')}
  };
})();
