/* ParFolio v155 compatibility layer.
   1) TO GO planner line always anchors directly to Green Center.
   2) Every home feature pill opens the matching App Guide & About section. */
(function(){
  remainingRoutePoints=function(origin,aim,green){
    if(!aim||!green?.center)return [];
    return [aim,green.center];
  };

  if(s?.v==='round'&&!s?.done){
    setTimeout(()=>{
      const green=selectedRoundCourse()?.greens?.[s.hole-1];
      if(green)try{updateShotPlanner(green)}catch{}
    },0);
  }

  const featureLinks=[
    {key:'sharedCourses',icon:'⛳',fallback:'Shared Courses',section:6},
    {key:'liveGps',icon:'◎',fallback:'Live GPS',section:2},
    {key:'protectedScoring',icon:'＋',fallback:'Protected Scoring',section:4},
    {key:'liveChat',icon:'💬',fallback:'Live Chat',section:5},
    {key:'shotPlanner',icon:'◎',fallback:'Shot Planner',section:3},
    {key:'joinCodeQr',icon:'▣',fallback:'Join Code / QR',section:1}
  ];

  function featureLabel(feature){
    let text=feature.fallback;
    try{text=t(feature.key)||text}catch{}
    return `${feature.icon} ${text}`;
  }

  function openFeatureAbout(sectionIndex){
    const guide=document.querySelector('.app-guide');
    if(!guide)return;
    guide.open=true;
    requestAnimationFrame(()=>{
      const heading=[...guide.querySelectorAll('.guide-body h3')][sectionIndex];
      (heading||guide.querySelector('.guide-body'))?.scrollIntoView({behavior:'smooth',block:'start'});
    });
  }
  window.openParFolioFeatureAbout=openFeatureAbout;

  function wireFeaturePills(){
    const wrap=document.querySelector('.home-page .feature-pills');
    if(!wrap||wrap.dataset.aboutLinked==='1')return;
    wrap.dataset.aboutLinked='1';
    const existing=[...wrap.children];
    featureLinks.forEach((feature,index)=>{
      let pill=existing[index];
      if(!pill){pill=document.createElement('span');wrap.appendChild(pill)}
      pill.textContent=featureLabel(feature);
      pill.style.cursor='pointer';
      pill.style.webkitTapHighlightColor='transparent';
      pill.setAttribute('role','button');
      pill.setAttribute('tabindex','0');
      pill.setAttribute('aria-label',`${pill.textContent} — open App Guide & About`);
      pill.onclick=()=>openFeatureAbout(feature.section);
      pill.onkeydown=event=>{
        if(event.key==='Enter'||event.key===' '){event.preventDefault();openFeatureAbout(feature.section)}
      };
    });
  }

  new MutationObserver(wireFeaturePills).observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wireFeaturePills);
  else wireFeaturePills();
})();
