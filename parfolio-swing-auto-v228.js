/* ParFolio Swing Auto v228 — automatic-first phase preview. */
(function(){
 var phases=['Address','Takeaway','Top','Downswing','Impact','Release','Finish'];
 function analyze(video){var d=video&&isFinite(video.duration)?video.duration:0,impact=d*.58,t=[Math.max(0,impact-d*.25),Math.max(0,impact-d*.18),Math.max(0,impact-d*.08),Math.max(0,impact-d*.035),impact,Math.min(d,impact+d*.035),Math.min(d,impact+d*.16)],r={version:228,duration:d,phases:{},confidence:.25,needsReview:true};phases.forEach(function(p,i){r.phases[p]={time:+t[i].toFixed(3),confidence:.25,source:'automatic-timing-proposal'}});return Promise.resolve(r)}
 window.ParFolioSwingAuto={version:228,phases:phases,analyze:analyze};
})();
