/* ParFolio v175 — premium homepage behavior. */
(function(){
  function ensureBackgroundLayer(){
    let layer=document.querySelector('.parfolio-fixed-home-bg');
    if(!layer){
      layer=document.createElement('div');
      layer.className='parfolio-fixed-home-bg';
      layer.setAttribute('aria-hidden','true');
      document.body.prepend(layer);
    }
  }

  function polishHome(){
    const isHome=document.getElementById('app')?.classList.contains('home-page');
    document.body.classList.toggle('parfolio-home-active',!!isHome);
    if(!isHome)return;

    ensureBackgroundLayer();

    const summary=document.querySelector('#app.home-page .app-guide summary span');
    if(summary&&summary.textContent!=='Readme')summary.textContent='Readme';
  }

  const existingRender=typeof render==='function'?render:null;
  if(existingRender){
    render=function(){
      const result=existingRender.apply(this,arguments);
      requestAnimationFrame(polishHome);
      return result;
    };
  }

  const appNode=document.getElementById('app');
  if(appNode){
    const observer=new MutationObserver(polishHome);
    observer.observe(appNode,{childList:true,subtree:true,attributes:true,attributeFilter:['class','open']});
  }

  polishHome();
})();
