/* ParFolio v168: canonical support/contact email. */
(function(){
  const SUPPORT_EMAIL='parfolioproject@gmail.com';
  function applyContactEmail(root=document){
    root.querySelectorAll?.('a[href^="mailto:"]').forEach(a=>{
      const subject=(a.getAttribute('href')||'').split('?')[1]||'subject=ParFolio%20App%20Suggestion';
      a.setAttribute('href',`mailto:${SUPPORT_EMAIL}?${subject}`);
      if((a.textContent||'').includes('@')) a.textContent=`✉ ${SUPPORT_EMAIL}`;
    });
  }
  applyContactEmail();
  const observer=new MutationObserver(()=>applyContactEmail());
  observer.observe(document.documentElement,{childList:true,subtree:true});
  window.PARFOLIO_SUPPORT_EMAIL=SUPPORT_EMAIL;
})();
