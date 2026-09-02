/* ParFolio v187 — tap the live Hole number to inspect/edit any hole. */
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
      /* Use the already-wrapped next/prev navigation so Google-camera flyover,
         map redraw, weather, GPS and score controls all follow the same path. */
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

  new MutationObserver(decorateHoleNumber).observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(decorateHoleNumber,250);
})();
