/* ParFolio Swing Auto UI v234 — automatic pose, phases, club trace, analytics and coach. */
(function(){
 function load(src,key){if(document.querySelector('script[data-'+key+']'))return;var s=document.createElement('script');s.src=src;s.setAttribute('data-'+key,'1');document.head.appendChild(s)}
 function ensureTools(){
  if(!window.ParFolioPoseTrace)load('parfolio-pose-trace-v229.js?v=234','pf-pose234');
  if(!window.ParFolioHandPath)load('parfolio-hand-path-v230.js?v=234','pf-path234');
  if(!window.ParFolioSwingAnalytics)load('parfolio-swing-analytics-v231.js?v=234','pf-analytics234');
  if(!window.ParFolioClubTrack)load('parfolio-club-track-v232.js?v=234','pf-club234');
  if(!window.ParFolioSwingPhases)load('parfolio-phase-motion-v233.js?v=234','pf-phase234');
  if(!window.ParFolioAICoach)load('parfolio-ai-coach-v234.js?v=234','pf-coach234');
 }
 function attach(){var root=document.querySelector('.pf-ai-shell');if(!root)return;ensureTools();['pf-ai-swing-record','pf-ai-swing-choose'].forEach(function(id){var input=root.querySelector('#'+id);if(!input||input.dataset.auto234)return;input.dataset.auto234='1';input.addEventListener('change',function(){var video=root.querySelector('#pf-ai-swing-video'),status=root.querySelector('#pf-ai-swing-phase'),panel=root.querySelector('#pf-ai-analysis-panel');if(!video)return;video.addEventListener('loadedmetadata',function run(){video.removeEventListener('loadedmetadata',run);setTimeout(function(){if(window.ParFolioPoseTrace)window.ParFolioPoseTrace.start();if(window.ParFolioHandPath)window.ParFolioHandPath.reset();if(window.ParFolioClubTrack)window.ParFolioClubTrack.reset();if(window.ParFolioSwingPhases)window.ParFolioSwingPhases.reset();if(status)status.textContent='Analyzing body motion and swing sequence…';if(panel)panel.innerHTML='<strong>Automatic analysis</strong><span>Play or scrub through the swing. ParFolio will collect pose frames, detect swing phases, build analytics, refine the club trace and prepare measurement-backed coaching.</span>'},120)},{once:true})})})}
 new MutationObserver(attach).observe(document.body,{childList:true,subtree:true});attach()
})();
