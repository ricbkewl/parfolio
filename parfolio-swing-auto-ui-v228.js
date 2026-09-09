/* ParFolio Swing Auto UI v228 */
(function(){
  function attach(){
    var root=document.querySelector('.pf-ai-shell'); if(!root)return;
    ['pf-ai-swing-record','pf-ai-swing-choose'].forEach(function(id){var input=root.querySelector('#'+id);if(!input||input.dataset.auto228)return;input.dataset.auto228='1';input.addEventListener('change',function(){
      var video=root.querySelector('#pf-ai-swing-video'),status=root.querySelector('#pf-ai-swing-phase'),panel=root.querySelector('#pf-ai-analysis-panel');
      if(!video)return;
      video.addEventListener('loadedmetadata',function run(){video.removeEventListener('loadedmetadata',run);if(!window.ParFolioSwingAuto)return;if(status)status.textContent='Analyzing swing automatically…';window.ParFolioSwingAuto.analyze(video).then(function(r){
        if(window.ParFolioAI&&window.ParFolioAI.setAutoAnalysis)window.ParFolioAI.setAutoAnalysis(r);
        var rows=Object.keys(r.phases).map(function(k){var p=r.phases[k];return '<span>'+k+' <b>'+p.time.toFixed(2)+'s · review</b></span>';}).join('');
        if(panel)panel.innerHTML='<strong>Automatic phase proposals</strong><div class="pf-ai-metrics">'+rows+'</div><span>These are low-confidence timing proposals until body and club computer vision is enabled. Tap a phase only to correct it.</span>';
        if(status)status.textContent='Automatic first pass complete — review/correct only if needed.';
      });},{once:true});
    });});
  }
  new MutationObserver(attach).observe(document.body,{childList:true,subtree:true});attach();
})();
