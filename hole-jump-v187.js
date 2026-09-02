/* ParFolio v192 — hole jump + recovery navigation for unmapped holes. */
(function(){
  function closeHoleJump(){document.querySelector('.pf-hole-jump-overlay')?.remove()}
  window.closeParFolioHoleJump=closeHoleJump;

  function holeHasScore(hole){
    try{
      const name=myRoundPlayerName?.();
      if(!name)return false;
      const value=s?.scores?.[name]?.[hole-1];
      return Number.isFinite(Number(value))&&Number(value)>0;
    }catch{return false}
  }

  window.showParFolioHoleJump=function(){
    if(typeof s==='undefined'||!Number(s.holes))return;
    closeHoleJump();
    const overlay=document.createElement('div');overlay.className='pf-hole-jump-overlay';
    overlay.addEventListener('click',e=>{if(e.target===overlay)closeHoleJump()});
    const count=Math.max(1,Number(s.holes)||18);
    const buttons=Array.from({length:count},(_,i)=>{
      const hole=i+1,current=hole===Number(s.hole),scored=holeHasScore(hole);
      return `<button type="button" class="${current?'current ':''}${scored?'scored':''}" onclick="jumpParFolioToHole(${hole})" aria-label="Go to Hole ${hole}${current?', current hole':''}">${hole}</button>`;
    }).join('');
    overlay.innerHTML=`<section class="pf-hole-jump-sheet" role="dialog" aria-modal="true" aria-label="Jump to a hole"><header><div><small>ROUND NAVIGATION</small><b>Jump to Hole</b></div><button type="button" onclick="closeParFolioHoleJump()" aria-label="Close">×</button></header><div class="pf-hole-jump-grid">${buttons}</div><p class="pf-hole-jump-note">Choose any hole to inspect the fairway or edit your score. Your existing scores are preserved.</p></section>`;
    document.body.appendChild(overlay);
  };

  window.jumpParFolioToHole=async function(target){
    target=Number(target);if(!Number.isInteger(target)||target<1||target>Number(s?.holes||0))return;
    const current=Number(s.hole)||1;closeHoleJump();if(target===current)return;
    try{
      if(target>current){s.hole=target-1;await next();}
      else{s.hole=target+1;await prev();}
    }catch(error){
      console.warn('Hole jump transition failed; using direct hole render',error);
      s.hole=target;try{showRoundHole()}catch{render()}
    }
  };

  function decorateHoleNumber(){
    const hole=document.getElementById('roundMapHole');if(!hole)return;
    const trigger=hole.parentElement;if(!trigger||trigger.classList.contains('pf-hole-jump-trigger'))return;
    trigger.classList.add('pf-hole-jump-trigger');trigger.setAttribute('role','button');trigger.setAttribute('tabindex','0');
    trigger.setAttribute('aria-label','Choose a hole');trigger.title='Tap to jump to any hole';
    trigger.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();showParFolioHoleJump()});
    trigger.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();showParFolioHoleJump()}});
  }

  function ensureMissingMapStyles(){
    if(document.getElementById('pfMissingMapRecoveryStyles'))return;
    const style=document.createElement('style');style.id='pfMissingMapRecoveryStyles';
    style.textContent=`
      .missing-hole-map{position:relative;min-height:100dvh;padding:calc(env(safe-area-inset-top,0px) + 88px) 24px calc(env(safe-area-inset-bottom,0px) + 120px)!important;box-sizing:border-box;display:flex!important;flex-direction:column;align-items:center;justify-content:center;text-align:center}
      .pf-missing-map-topbar{position:absolute;z-index:20;top:calc(env(safe-area-inset-top,0px) + 12px);left:16px;right:16px;display:flex;align-items:center;justify-content:space-between;gap:12px}
      .pf-missing-map-topbar button,.pf-missing-map-actions button,.pf-missing-map-hole-nav button{border:1px solid rgba(255,255,255,.28);background:rgba(255,255,255,.12);color:#fff;border-radius:999px;font:600 15px/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;min-height:46px;padding:0 18px;box-shadow:0 5px 18px rgba(0,0,0,.16);backdrop-filter:blur(10px)}
      .pf-missing-map-topbar .pf-menu-button{width:46px;padding:0;font-size:22px}
      .pf-missing-map-actions{position:absolute;left:20px;right:20px;bottom:calc(env(safe-area-inset-bottom,0px) + 28px);display:grid;grid-template-columns:1fr 1fr;gap:10px;z-index:20}
      .pf-missing-map-actions button{border-radius:14px;background:#fff;color:#123f31;border-color:#fff;font-weight:700}
      .pf-missing-map-actions button.secondary{background:rgba(255,255,255,.12);color:#fff;border-color:rgba(255,255,255,.28)}
      .pf-missing-map-hole-nav{display:flex;gap:12px;margin-top:26px;z-index:20}
      .pf-missing-map-hole-nav button:disabled{opacity:.35}
      .missing-hole-map>span{max-width:340px;line-height:1.45}
      @media(max-width:430px){.pf-missing-map-actions{grid-template-columns:1fr}.missing-hole-map{padding-bottom:calc(env(safe-area-inset-bottom,0px) + 170px)!important}}
    `;
    document.head.appendChild(style);
  }

  function decorateMissingMap(){
    ensureMissingMapStyles();
    const panel=document.querySelector('.missing-hole-map');
    if(!panel||panel.dataset.parfolioRecovery==='1')return;
    panel.dataset.parfolioRecovery='1';
    const hole=Math.max(1,Number(s?.hole)||1),holes=Math.max(hole,Number(s?.holes)||18);

    const top=document.createElement('div');top.className='pf-missing-map-topbar';
    top.innerHTML='<button type="button" onclick="goHome()" aria-label="Return to home">← Home</button><button type="button" class="pf-menu-button" onclick="showAppMenu()" aria-label="Open menu">☰</button>';
    panel.prepend(top);

    const holeNav=document.createElement('div');holeNav.className='pf-missing-map-hole-nav';
    holeNav.innerHTML=`<button type="button" onclick="prev()" ${hole<=1?'disabled':''}>‹ Previous</button><button type="button" onclick="showParFolioHoleJump()">Hole ${hole}</button><button type="button" onclick="next()" ${hole>=holes?'disabled':''}>Next ›</button>`;
    panel.append(holeNav);

    const actions=document.createElement('div');actions.className='pf-missing-map-actions';
    actions.innerHTML='<button type="button" onclick="openCoursesFromNav()">Choose Another Course</button><button type="button" class="secondary" onclick="goHome()">Exit to Main Menu</button>';
    panel.append(actions);
  }

  function decorate(){decorateHoleNumber();decorateMissingMap()}
  new MutationObserver(decorate).observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(decorate,0);setTimeout(decorate,250);
})();
