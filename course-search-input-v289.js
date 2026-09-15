/* ParFolio v291 — stable mobile course search interaction.
   Prevents iOS form-field auto zoom, keeps focus stable, and throttles expensive
   course-grid repaints while preserving smart search/autocomplete behavior. */
(function(){
  const SELECTOR='.course-library-search input[type="search"]';
  let queued=false;
  let searchTimer=null;

  function ensureStyle(){
    let style=document.getElementById('pf-course-search-input-v291-style');
    if(style)return;
    style=document.createElement('style');
    style.id='pf-course-search-input-v291-style';
    style.textContent=`
      .course-library-search{position:relative}
      .course-library-search input[type="search"]{
        position:relative;z-index:3;pointer-events:auto!important;touch-action:manipulation;
        -webkit-user-select:text!important;user-select:text!important;cursor:text;
        font-size:16px!important;line-height:1.25!important;
        -webkit-text-size-adjust:100%;text-size-adjust:100%;
      }
      .course-library-search>button{position:relative;z-index:4}
      html.pf-course-search-focused,html.pf-course-search-focused body{scroll-behavior:auto!important}
      html.pf-course-search-focused .course-library-search{transform:none!important}
      @media(max-width:420px){.course-library-search input[type="search"]{font-size:16px!important}}
    `;
    document.head.appendChild(style);
  }

  function upgradeContainer(){
    const label=document.querySelector('label.course-library-search');
    if(!label)return document.querySelector('.course-library-search');
    const shell=document.createElement('div');
    shell.className=label.className;
    for(const attr of [...label.attributes]){
      if(attr.name!=='class'&&attr.name!=='for')shell.setAttribute(attr.name,attr.value);
    }
    while(label.firstChild)shell.appendChild(label.firstChild);
    label.replaceWith(shell);
    return shell;
  }

  function runSearch(value,input,start,end){
    try{
      if(typeof window.filterSharedCourses==='function')window.filterSharedCourses(value);
      else if(typeof filterSharedCourses==='function')filterSharedCourses(value);
    }catch(error){
      console.warn('ParFolio course search input failed',error);
    }
    requestAnimationFrame(()=>{
      const current=document.querySelector(SELECTOR);
      if(!current||document.activeElement!==current)return;
      try{current.setSelectionRange(start??value.length,end??value.length)}catch{}
    });
  }

  function bindSearch(){
    queued=false;
    ensureStyle();
    const shell=upgradeContainer();
    const input=shell?.querySelector('input[type="search"]');
    if(!input)return;

    input.disabled=false;
    input.readOnly=false;
    input.removeAttribute('disabled');
    input.removeAttribute('readonly');
    input.setAttribute('autocomplete','off');
    input.setAttribute('autocapitalize','none');
    input.setAttribute('spellcheck','false');
    input.style.pointerEvents='auto';
    input.style.fontSize='16px';

    const filterButton=shell.querySelector('button');
    if(filterButton&&!filterButton.getAttribute('type'))filterButton.type='button';

    if(input.dataset.pfEditableSearch==='291')return;
    input.dataset.pfEditableSearch='291';
    input.removeAttribute('oninput');
    input.oninput=null;

    input.addEventListener('focus',()=>{
      document.documentElement.classList.add('pf-course-search-focused');
    },{passive:true});
    input.addEventListener('blur',()=>{
      document.documentElement.classList.remove('pf-course-search-focused');
    },{passive:true});

    input.addEventListener('input',()=>{
      const value=input.value;
      const start=input.selectionStart;
      const end=input.selectionEnd;
      clearTimeout(searchTimer);
      searchTimer=setTimeout(()=>runSearch(value,input,start,end),70);
    });
  }

  function schedule(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(bindSearch);
  }

  ensureStyle();
  const app=document.getElementById('app')||document.body;
  new MutationObserver(mutations=>{
    if(mutations.some(m=>[...m.addedNodes].some(n=>n.nodeType===1&&(n.matches?.('.course-library-search')||n.querySelector?.('.course-library-search')))))schedule();
  }).observe(app,{childList:true,subtree:true});
  bindSearch();
  setTimeout(bindSearch,250);
})();
