/* ParFolio Swing Auto v228 */
(function(){
  var phases=['Address','Takeaway','Top','Downswing','Impact','Release','Finish'];
  function analyze(video){
    var d=video && isFinite(video.duration) ? video.duration : 0;
    var impact=d*0.58;
    var times=[Math.max(0,impact-d*.25),Math.max(0,impact-d*.18),Math.max(0,impact-d*.08),Math.max(0,impact-d*.035),impact,Math.min(d,impact+d*.035),Math.min(d,impact+d*.16)];
    var result={version:228,duration:d,phases:{},body:{status:'automatic-pose-detector-next',landmarks:[]},club:{status:'automatic-club-detector-next',path:[]},needsReview:true};
    phases.forEach(function(p,i){result.phases[p]={time:Number(times[i].toFixed(3)),confidence:0.25,source:'automatic-timing-proposal'};});
    return Promise.resolve(result);
  }
  window.ParFolioSwingAuto={version:228,phases:phases,analyze:analyze};
})();
