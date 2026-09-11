/* ParFolio v272 — advanced per-hole scoring and golfer performance stats */
(function(){
  const FIELDS=['putts','fairway_hit','green_in_regulation','chip_shots','sand_shots','penalties'];

  function statsRoot(){
    s.holeStats??={};
    return s.holeStats;
  }
  function playerStats(name){
    const root=statsRoot();
    root[name]??={};
    return root[name];
  }
  function holeStats(name,hole=s.hole){
    const player=playerStats(name);
    player[hole]??={};
    return player[hole];
  }
  function mergeHoleStats(name,hole,row){
    const target=holeStats(name,hole);
    for(const field of FIELDS){
      if(Object.prototype.hasOwnProperty.call(row,field))target[field]=row[field];
    }
    if(Number.isInteger(row.putts)){
      s.putts??={};s.putts[name]??={};s.putts[name][hole]=row.putts;
    }
    save();
    return target;
  }
  function boolChoice(field,value,label){
    const name=myRoundPlayerName(),stat=holeStats(name),selected=stat[field];
    const cls=selected===value?' selected':'';
    return `<button class="advanced-yesno${cls}" onclick="setAdvancedHoleStat('${field}',${value})"><span>${value?'✓':'×'}</span><b>${label}</b></button>`;
  }
  function countChoices(field){
    const name=myRoundPlayerName(),stat=holeStats(name),current=stat[field];
    return [0,1,2,3,4].map(value=>`<button class="advanced-count ${current===value?'selected':''}" onclick="setAdvancedHoleStat('${field}',${value})">${value===4?'≥4':value}</button>`).join('');
  }
  function scoreButtonsMarkup(par,score){
    return Array.from({length:9},(_,index)=>index+1).map(value=>`<button class="score-choice ${scoreChoiceClass(value,par)} ${value===score?'selected':''}" onclick="setExactHoleScore(${value})"><b>${value}</b><small>${scoreName(value,par)}</small></button>`).join('');
  }
  function puttButtonsMarkup(current){
    return [0,1,2,3,4].map(value=>`<button class="putt-choice ${value===current?'selected':''}" onclick="setHolePutts(${value})">${value===4?'≥4':value}</button>`).join('');
  }

  scoreEntryMarkup=function(){
    const name=myRoundPlayerName(),par=Number(s.pars[s.hole-1])||4,score=scoreValue(name)||par,stat=holeStats(name),putts=Number.isInteger(stat.putts)?stat.putts:s.putts?.[name]?.[s.hole];
    const fairway=par>=4?`<section class="advanced-stat-section"><h3>Fairway Hit</h3><div class="advanced-yesno-grid">${boolChoice('fairway_hit',true,'Yes')}${boolChoice('fairway_hit',false,'No')}</div></section>`:'';
    return`<section class="score-entry-sheet advanced-score-sheet" role="dialog" aria-modal="true" aria-label="Score Hole ${s.hole}">
      <header><div><small>HOLE ${s.hole}</small><h2>Score & Stats</h2><span>PAR ${par}</span></div><button onclick="closeScoreEntry()" aria-label="Close score entry">×</button></header>
      <section class="advanced-stat-section"><div class="advanced-section-heading"><h3>Score</h3><small>Tap your total strokes</small></div><div class="score-choice-grid">${scoreButtonsMarkup(par,score)}<button class="score-choice more-score" onclick="chooseExtendedScore()"><b>0</b><small>10–20</small></button></div></section>
      <section class="advanced-stat-section"><div class="advanced-section-heading"><h3>Putts</h3><small>Optional</small></div><div class="putt-choice-grid">${puttButtonsMarkup(putts)}</div></section>
      ${fairway}
      <section class="advanced-stat-section"><h3>Green in Regulation</h3><div class="advanced-yesno-grid">${boolChoice('green_in_regulation',true,'Yes')}${boolChoice('green_in_regulation',false,'No')}</div></section>
      <section class="advanced-stat-section"><h3>Chip Shots</h3><div class="advanced-count-grid">${countChoices('chip_shots')}</div></section>
      <section class="advanced-stat-section"><h3>Greenside Sand Shots</h3><div class="advanced-count-grid">${countChoices('sand_shots')}</div></section>
      <section class="advanced-stat-section"><h3>Penalties</h3><div class="advanced-count-grid">${countChoices('penalties')}</div></section>
      <p class="advanced-stats-note">These details power your Fairways, GIR, putting, scrambling and penalty trends.</p>
      <footer><button onclick="scoreEntryPrevious()" ${s.hole===1?'disabled':''}>‹</button><button class="save-score-button" onclick="closeScoreEntry()">Finish Hole ${s.hole}</button><button onclick="scoreEntryNext()">›</button></footer>
    </section>`;
  };

  async function loadCurrentHoleStats(){
    if(!s.sharedRoundId||!currentUser)return false;
    const name=myRoundPlayerName();if(!name)return false;
    const {data,error}=await db.from('round_hole_stats').select('putts,fairway_hit,green_in_regulation,chip_shots,sand_shots,penalties').eq('round_id',s.sharedRoundId).eq('user_id',currentUser.id).eq('hole',s.hole).maybeSingle();
    if(error||!data)return false;
    mergeHoleStats(name,s.hole,data);
    return true;
  }

  openScoreEntry=async function(){
    if(!await ensureMyRoundPlayerName())return;
    document.querySelector('.score-entry-overlay')?.remove();
    const overlay=document.createElement('div');overlay.className='score-entry-overlay';overlay.onclick=event=>{if(event.target===overlay)closeScoreEntry()};overlay.innerHTML=scoreEntryMarkup();document.body.appendChild(overlay);
    if(await loadCurrentHoleStats())refreshScoreEntry();
  };

  function queueAdvancedStats(name){
    if(!s.sharedRoundId||!currentUser)return;
    const stat=holeStats(name),item={round_id:s.sharedRoundId,user_id:currentUser.id,hole:s.hole,updated_at:new Date().toISOString()};
    for(const field of FIELDS)if(Object.prototype.hasOwnProperty.call(stat,field))item[field]=stat[field];
    pendingHoleStats[pendingHoleStatKey(item)]=item;persistPendingHoleStats();syncPendingHoleStats();
  }

  window.setAdvancedHoleStat=function(field,value){
    if(!FIELDS.includes(field)||field==='putts')return;
    const name=myRoundPlayerName();if(!name)return;
    const stat=holeStats(name);
    if(['fairway_hit','green_in_regulation'].includes(field))stat[field]=Boolean(value);
    else stat[field]=Math.max(0,Math.min(4,Number(value)||0));
    save();queueAdvancedStats(name);refreshScoreEntry();
  };

  setHolePutts=function(putts){
    const name=myRoundPlayerName(),value=Math.max(0,Math.min(4,Number(putts)||0));if(!name)return;
    const stat=holeStats(name);stat.putts=value;
    s.putts??={};s.putts[name]??={};s.putts[name][s.hole]=value;
    save();queueAdvancedStats(name);refreshScoreEntry();
  };

  async function loadAllMyAdvancedStats(){
    if(!s.sharedRoundId||!currentUser)return;
    const name=myRoundPlayerName();if(!name)return;
    const {data,error}=await db.from('round_hole_stats').select('hole,putts,fairway_hit,green_in_regulation,chip_shots,sand_shots,penalties').eq('round_id',s.sharedRoundId).eq('user_id',currentUser.id).order('hole');
    if(error)return;
    for(const row of data||[])mergeHoleStats(name,row.hole,row);
  }

  function percent(n,d){return d?Math.round((n/d)*100):null}
  function advancedRoundSummary(){
    const name=myRoundPlayerName();if(!name)return null;
    const byHole=playerStats(name),rows=Object.entries(byHole).map(([hole,stat])=>({hole:Number(hole),...stat})).filter(row=>row.hole>=1&&row.hole<=s.holes);
    if(!rows.length)return null;
    const fairwayRows=rows.filter(r=>typeof r.fairway_hit==='boolean');
    const girRows=rows.filter(r=>typeof r.green_in_regulation==='boolean');
    const puttRows=rows.filter(r=>Number.isInteger(r.putts));
    const chips=rows.reduce((sum,r)=>sum+(Number.isInteger(r.chip_shots)?r.chip_shots:0),0);
    const sands=rows.reduce((sum,r)=>sum+(Number.isInteger(r.sand_shots)?r.sand_shots:0),0);
    const penalties=rows.reduce((sum,r)=>sum+(Number.isInteger(r.penalties)?r.penalties:0),0);
    const scrambling=rows.filter(r=>r.green_in_regulation===false).map(r=>({r,score:Number(s.scores?.[name]?.[r.hole]),par:Number(s.pars?.[r.hole-1])})).filter(x=>x.score&&x.par);
    return{
      fairways:percent(fairwayRows.filter(r=>r.fairway_hit).length,fairwayRows.length),fairwayN:fairwayRows.length,
      gir:percent(girRows.filter(r=>r.green_in_regulation).length,girRows.length),girN:girRows.length,
      putts:puttRows.reduce((sum,r)=>sum+r.putts,0),puttN:puttRows.length,
      puttsPerHole:puttRows.length?(puttRows.reduce((sum,r)=>sum+r.putts,0)/puttRows.length).toFixed(1):null,
      chips,sands,penalties,
      scrambling:percent(scrambling.filter(x=>x.score<=x.par).length,scrambling.length),scrambleN:scrambling.length
    };
  }

  function renderAdvancedStatsCard(){
    document.querySelector('.parfolio-advanced-round-stats')?.remove();
    const summary=advancedRoundSummary();if(!summary)return;
    const anchor=document.querySelector('.scorecard-overview');if(!anchor)return;
    const card=document.createElement('section');card.className='parfolio-advanced-round-stats';
    const metric=(label,value,detail='')=>`<div><small>${label}</small><b>${value}</b>${detail?`<span>${detail}</span>`:''}</div>`;
    card.innerHTML=`<header><div><small>YOUR PERFORMANCE</small><h2>Round Stats</h2></div><span>${esc(myRoundPlayerName())}</span></header><div class="advanced-round-grid">
      ${metric('Fairways',summary.fairways===null?'–':summary.fairways+'%',summary.fairwayN?`${summary.fairwayN} tracked`:'' )}
      ${metric('GIR',summary.gir===null?'–':summary.gir+'%',summary.girN?`${summary.girN} tracked`:'' )}
      ${metric('Putts',summary.putts||'–',summary.puttsPerHole?`${summary.puttsPerHole}/hole`:'' )}
      ${metric('Scrambling',summary.scrambling===null?'–':summary.scrambling+'%',summary.scrambleN?`${summary.scrambleN} chances`:'' )}
      ${metric('Chips',summary.chips)}${metric('Sand',summary.sands)}${metric('Penalties',summary.penalties)}
    </div></section>`;
    anchor.insertAdjacentElement('afterend',card);
  }

  const baseRecap=recap;
  recap=function(){
    baseRecap();
    renderAdvancedStatsCard();
    loadAllMyAdvancedStats().then(renderAdvancedStatsCard);
  };

  window.ParFolioAdvancedScoring={version:272,summary:advancedRoundSummary,load:loadAllMyAdvancedStats};
})();
