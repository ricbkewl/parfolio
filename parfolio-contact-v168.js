/* ParFolio contact: canonical support email, idempotent DOM updates. */
(function(){
  const SUPPORT_EMAIL='parfolioproject@gmail.com';
  function applyContactEmail(root=document){
    root.querySelectorAll?.('a[href^="mailto:"]').forEach(a=>{
      const subject=(a.getAttribute('href')||'').split('?')[1]||'subject=ParFolio%20App%20Suggestion';
      const desiredHref=`mailto:${SUPPORT_EMAIL}?${subject}`;
      const desiredText=`✉ ${SUPPORT_EMAIL}`;
      if(a.getAttribute('href')!==desiredHref)a.setAttribute('href',desiredHref);
      if((a.textContent||'').includes('@')&&a.textContent!==desiredText)a.textContent=desiredText;
    });
  }
  applyContactEmail();
  let scheduled=false;
  const observer=new MutationObserver(()=>{
    if(scheduled)return;
    scheduled=true;
    queueMicrotask(()=>{scheduled=false;applyContactEmail();});
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
  window.PARFOLIO_SUPPORT_EMAIL=SUPPORT_EMAIL;
})();
