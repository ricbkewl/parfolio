/* ParFolio v332 — Watch bridge browser test console.
   Loads only when ?watchdebug=1 is present. No production UI is rendered otherwise. */
(function(){
  const params=new URLSearchParams(location.search);
  if(params.get('watchdebug')!=='1')return;

  function esc(v){return String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
  function pretty(state){
    if(!state?.available)return '<div class="pf-watch-empty">No active round.</div>';
    const d=state.distances||{},h=state.hole||{},s=state.suggestion||{},g=state.gps||{};
    return `
      <div class="pf-watch-top"><b>HOLE ${h.number||'–'}</b><span>PAR ${h.par||'–'}</span></div>
      <div class="pf-watch-yardage"><strong>${d.toPlanner??d.center??'–'}</strong><small>YD TO TARGET</small></div>
      <div class="pf-watch-fcb"><span>F <b>${d.front??'–'}</b></span><span>C <b>${d.center??'–'}</b></span><span>B <b>${d.back??'–'}</b></span></div>
      <div class="pf-watch-club"><small>SUGGESTED CLUB</small><b>${esc(s.club||'Set up My Clubs')}</b></div>
      <div class="pf-watch-score"><button data-a="minus">−</button><span><small>SCORE</small><b>${h.score??'–'}</b></span><button data-a="plus">+</button></div>
      <div class="pf-watch-meta"><span>Total <b>${h.roundTotal??'–'}</b></span><span>To par <b>${h.toPar===null||h.toPar===undefined?'–':(h.toPar>0?'+':'')+h.toPar}</b></span><span>GPS <b>${g.accuracyYards??'–'} yd</b></span></div>
      <div class="pf-watch-nav"><button data-a="prev">‹ Prev</button><button data-a="refresh">Refresh</button><button data-a="next">Next ›</button></div>
      <details><summary>Protocol state</summary><pre>${esc(JSON.stringify(state,null,2))}</pre></details>`;
  }

  function mount(){
    if(document.getElementById('pf-watch-debug'))return;
    const style=document.createElement('style');style.id='pf-watch-debug-style';style.textContent=`
      #pf-watch-debug{position:fixed;right:12px;top:max(12px,env(safe-area-inset-top));z-index:999999;width:min(330px,calc(100vw - 24px));max-height:calc(100vh - 24px);overflow:auto;padding:12px;border-radius:24px;background:#070b09;color:#fff;border:1px solid #44534d;box-shadow:0 18px 50px rgba(0,0,0,.45);font:13px system-ui,-apple-system,sans-serif}
      #pf-watch-debug *{box-sizing:border-box}#pf-watch-debug header{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}#pf-watch-debug header span{color:#e6c56f;font-weight:800;letter-spacing:.08em}#pf-watch-debug header button{background:#222;color:#fff;border:0;border-radius:50%;width:28px;height:28px}
      .pf-watch-top,.pf-watch-fcb,.pf-watch-score,.pf-watch-meta,.pf-watch-nav{display:flex;align-items:center;justify-content:space-between;gap:8px}.pf-watch-top{padding:6px 3px}.pf-watch-top b{font-size:18px}.pf-watch-yardage{text-align:center;padding:18px 8px 12px;border-radius:18px;background:linear-gradient(180deg,#173f30,#0e271f)}.pf-watch-yardage strong{display:block;font-size:56px;line-height:.95}.pf-watch-yardage small,.pf-watch-club small{display:block;margin-top:6px;color:#c3d3cc;font-size:9px;letter-spacing:.12em}
      .pf-watch-fcb{padding:12px 6px}.pf-watch-fcb span{flex:1;text-align:center;color:#aebbb5}.pf-watch-fcb b{display:block;color:#fff;font-size:18px}.pf-watch-club{text-align:center;padding:11px;border-top:1px solid #29332f;border-bottom:1px solid #29332f}.pf-watch-club b{display:block;margin-top:3px;color:#e6c56f;font-size:18px}
      .pf-watch-score{padding:12px 0}.pf-watch-score button,.pf-watch-nav button{border:1px solid #44534d;background:#17201c;color:#fff;border-radius:12px;min-height:40px;font-weight:800}.pf-watch-score button{width:62px;font-size:28px}.pf-watch-score span{text-align:center}.pf-watch-score small{display:block;color:#aebbb5;font-size:9px}.pf-watch-score b{font-size:28px}.pf-watch-meta{font-size:11px;color:#aebbb5}.pf-watch-meta b{color:#fff}.pf-watch-nav{margin-top:12px}.pf-watch-nav button{flex:1;font-size:11px}.pf-watch-empty{padding:30px;text-align:center;color:#aebbb5}#pf-watch-debug details{margin-top:10px}#pf-watch-debug pre{font-size:9px;white-space:pre-wrap;word-break:break-word;color:#b8c7c0}
    `;document.head.appendChild(style);
    const panel=document.createElement('aside');panel.id='pf-watch-debug';
    panel.innerHTML='<header><span>PARFOLIO WATCH LAB</span><button aria-label="Close watch lab">×</button></header><div class="pf-watch-body">Waiting for bridge…</div>';
    document.body.appendChild(panel);
    panel.querySelector('header button').onclick=()=>panel.remove();
    panel.addEventListener('click',async event=>{
      const action=event.target?.dataset?.a;if(!action||!window.ParFolioWatchBridge)return;
      const map={minus:{type:'score_delta',delta:-1},plus:{type:'score_delta',delta:1},prev:{type:'previous_hole'},next:{type:'next_hole'},refresh:{type:'refresh'}};
      const result=await window.ParFolioWatchBridge.perform(map[action]);
      render(result.state);
    });
  }
  function render(state){mount();const body=document.querySelector('#pf-watch-debug .pf-watch-body');if(body)body.innerHTML=pretty(state)}

  const wait=setInterval(()=>{
    if(!window.ParFolioWatchBridge)return;
    clearInterval(wait);
    window.ParFolioWatchBridge.subscribe(render);
  },100);
  setTimeout(()=>clearInterval(wait),15000);
})();