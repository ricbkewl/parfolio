/* ParFolio v155: make every home feature pill open its matching About/Guide section. */
(function(){
  const features=[
    {key:'sharedCourses',fallback:'⛳ Shared Courses',section:6},
    {key:'liveGps',fallback:'◎ Live GPS',section:2},
    {key:'protectedScoring',fallback:'＋ Protected Scoring',section:4},
    {key:'liveChat',fallback:'💬 Live Chat',section:5},
    {key:'shotPlanner',fallback:'◎ Shot Planner',section:3},
    {key:'joinCodeQr',fallback:'▣ Join Code / QR',section:1}
  ];

  function labelFor(feature){
    try{return `${feature.fallback.split(' ')[0]} ${t(feature.key)}`;}catch{return feature.fallback}
  }

  function openFeatureAbout(sectionIndex){
    const guide=document.querySelector('.app-guide');
    if(!guide)return;
    guide.open=true;
    requestAnimationFrame(()=>{
      const headings=[...guide.querySelectorAll('.guide-body h3')];
      const heading=headings[sectionIndex];
      if(heading)heading.scrollIntoView({behavior:'smooth',block:'start'});
      else guide.querySelector('.guide-body')?.scrollIntoView({behavior:'smooth',block:'start'});
    });
  }
  window.openParFolioFeatureAbout=openFeatureAbout;

  function wireFeaturePills(){
    const wrap=document.querySelector('.home-page .feature-pills');
    if(!wrap||wrap.dataset.aboutLinked==='1')return;
    wrap.dataset.aboutLinked='1';
    const existing=[...wrap.children];
    features.forEach((feature,index)=>{
      let pill=existing[index];
      if(!pill){pill=document.createElement('span');wrap.appendChild(pill)}
      pill.textContent=labelFor(feature);
      pill.classList.add('feature-about-link');
      pill.setAttribute('role','button');
      pill.setAttribute('tabindex','0');
      pill.setAttribute('aria-label',`${pill.textContent} — open About`);
      pill.onclick=()=>openFeatureAbout(feature.section);
      pill.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();openFeatureAbout(feature.section)}};
    });
  }

  const observer=new MutationObserver(wireFeaturePills);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wireFeaturePills);
  else wireFeaturePills();
})();
