/* ParFolio v171 — startup recovery guard for GitHub Pages/PWA cache failures. */
(()=>{
  const errors=[];
  const remember=value=>{const text=String(value?.message||value?.reason?.message||value?.reason||value||'Unknown startup error');if(text&&!errors.includes(text))errors.push(text.slice(0,240));};
  window.addEventListener('error',event=>remember(event.error||event.message));
  window.addEventListener('unhandledrejection',event=>remember(event.reason));

  window.parfolioHardRefresh=async function(){
    try{
      if('serviceWorker' in navigator){
        const registrations=await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(reg=>reg.unregister()));
      }
      if('caches' in window){
        const names=await caches.keys();
        await Promise.all(names.filter(name=>name.startsWith('parfolio-')).map(name=>caches.delete(name)));
      }
    }catch(error){console.warn('ParFolio cache reset warning',error)}
    const url=new URL(window.location.href);url.searchParams.set('fresh',Date.now());window.location.replace(url.href);
  };

  setTimeout(()=>{
    const app=document.getElementById('app');
    if(!app||app.children.length||app.textContent.trim())return;
    const detail=errors.length?`<p style="font-size:12px;opacity:.72;word-break:break-word">${errors.map(x=>x.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))).join('<br>')}</p>`:'';
    app.innerHTML=`<section style="max-width:520px;margin:12vh auto 0;padding:24px;border-radius:22px;background:#f7faf8;color:#173126;box-shadow:0 18px 50px rgba(0,0,0,.18);font-family:system-ui,-apple-system,sans-serif"><h1 style="margin-top:0;color:#145c3d">ParFolio needs a fresh start</h1><p>The site reached GitHub Pages, but this browser did not finish starting the app. This is usually an old PWA/service-worker cache.</p>${detail}<button onclick="parfolioHardRefresh()" style="width:100%;border:0;border-radius:14px;padding:14px 18px;background:#176b45;color:white;font-weight:750;font-size:16px">Clear ParFolio Cache & Reload</button><p style="font-size:12px;opacity:.72;margin-bottom:0">Your server-side golfer account and saved shared rounds are not deleted by this cache reset.</p></section>`;
  },3500);
})();
