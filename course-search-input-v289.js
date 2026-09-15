/* ParFolio v289 — mobile-safe editable course search input.
   Keeps the existing smart ranking/autocomplete logic, but removes the nested
   label/button interaction that can prevent iOS Safari/PWA users from typing. */
(function(){
  const SELECTOR='.course-library-search input[type="search"]';
  let queued=false;

  function ensureStyle(){
    if(document.getElementById('pf-course-search-input-v289-style'))return;
    const style=document.createElement('style');
    style.id='pf-course-search-input-v289-style';
    style.textContent=`
      .course-library-search{position:relative}
      .course-library-search input[type="search"]{position:relative;z-index:3;pointer-events:auto!important;touch-action:manipulation;-webkit-user-select:text!important;user-select:text!important;cursor:text}
      .course-library-search>button{position:relative;z-index:4}
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

    const filterButton=shell.querySelector('button');
    if(filterButton&&!filterButton.getAttribute('type'))filterButton.type='button';

    if(input.dataset.pfEditableSearch==='1')return;
    input.dataset.pfEditableSearch='1';

    // Own the input event once so an inline handler cannot be lost or doubled
    // when later course-search scripts decorate the same control.
    input.removeAttribute('oninput');
    input.oninput=null;
    input.addEventListener('input',()=>{
      const value=input.value;
      const start=input.selectionStart;
      const end=input.selectionEnd;
      try{
        if(typeof window.filterSharedCourses==='function')window.filterSharedCourses(value);
        else if(typeof filterSharedCourses==='function')filterSharedCourses(value);
      }catch(error){
        console.warn('ParFolio course search input failed',error);
      }
      requestAnimationFrame(()=>{
        const current=document.querySelector(SELECTOR);
        if(!current)return;
        // Preserve caret position when results/autocomplete update below it.
        if(document.activeElement===current){
          try{current.setSelectionRange(start??value.length,end??value.length)}catch{}
        }
      });
    });
  }

  function schedule(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(bindSearch);
  }

  ensureStyle();
  new MutationObserver(schedule).observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
  bindSearch();
  setTimeout(bindSearch,250);
  setTimeout(bindSearch,900);
})();
