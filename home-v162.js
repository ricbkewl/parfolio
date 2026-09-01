/* ParFolio v162 — homepage wordmark refresh. */
(function(){
  function decorateParFolioHome(){
    const hero=document.querySelector('#app.home-page .home-hero');
    if(!hero)return;

    const logoWrap=hero.querySelector('.logo-wrap');
    if(!logoWrap)return;

    hero.querySelector(':scope > .home-brand')?.setAttribute('aria-hidden','true');
    hero.querySelector(':scope > h1')?.setAttribute('aria-hidden','true');

    if(!hero.querySelector('.parfolio-home-wordmark')){
      const wordmark=document.createElement('div');
      wordmark.className='parfolio-home-wordmark';
      wordmark.setAttribute('aria-label','ParFolio');
      wordmark.innerHTML='<span class="parfolio-par">Par</span><span class="parfolio-folio">Folio</span>';

      const tagline=document.createElement('div');
      tagline.className='parfolio-home-tagline';
      tagline.textContent='Play. Connect. Improve';

      logoWrap.insertAdjacentElement('afterend',wordmark);
      wordmark.insertAdjacentElement('afterend',tagline);
    }
  }

  const existingRender=typeof render==='function'?render:null;
  if(existingRender){
    render=function(){
      const result=existingRender.apply(this,arguments);
      requestAnimationFrame(decorateParFolioHome);
      return result;
    };
  }

  const observer=new MutationObserver(()=>decorateParFolioHome());
  const appNode=document.getElementById('app');
  if(appNode)observer.observe(appNode,{childList:true,subtree:true});

  decorateParFolioHome();
})();
